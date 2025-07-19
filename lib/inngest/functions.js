import { inngest } from "@/lib/inngest/client";
import { sendEmail } from "@/actions/send-email";
import EmailTemplate from "@/emails/template";
import { db } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";

// === Function 2: Check Budget Alerts ===
export const checkBudgetAlert = inngest.createFunction(
  { id: "check-budget-alert", name: "Check Budget Alerts" },
  { cron: "0 */6 * * *" }, // Run 6 hours
  async ({ step }) => {
    console.log("✅ Budget alert triggered");

    const budgets = await step.run("fetch-budgets", () =>
      db.budget.findMany({
        include: {
          user: {
            include: {
              accounts: { where: { isDefault: true } },
            },
          },
        },
      })
    );

    for (const budget of budgets) {
      const defaultAccount = budget.user.accounts[0];
      if (!defaultAccount) continue;

      await step.run(`check-budget-${budget.id}`, async () => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const expenses = await db.transaction.aggregate({
          where: {
            userId: budget.userId,
            type: "EXPENSE",
            date: { gte: startOfMonth, lte: endOfMonth },
            accountId: defaultAccount.id,
          },
          _sum: { amount: true },
        });

        const totalExpenses = expenses._sum.amount?.toNumber() || 0;
        const percentageUsed = (totalExpenses / budget.amount) * 100;

        const lastSent = budget.lastAlertSent ? new Date(budget.lastAlertSent) : null;
        const alreadySentThisMonth =
          lastSent && lastSent >= startOfMonth && lastSent <= endOfMonth;

        if (percentageUsed >= 80 && !alreadySentThisMonth) {
          console.log("📧 Sending budget alert email to:", budget.user.email);

          const result = await sendEmail({
            to: budget.user.email,
            subject: `Budget Alert for ${defaultAccount.name}`,
            react: EmailTemplate({
              userName: budget.user.name,
              type: "budget-alert",
              data: {
                percentageUsed,
                budgetAmount: Number(budget.amount).toFixed(1),
                totalExpenses: totalExpenses.toFixed(1),
                accountName: defaultAccount.name,
              },
            }),
          });

          console.log("📬 Email result:", result);

          await db.budget.update({
            where: { id: budget.id },
            data: { lastAlertSent: now },
          });
        } else {
          console.log("⏭️ No alert sent. Conditions not met.");
        }
      });
    }
  }
);

// === Function 3: Trigger Recurring Transactions ===
export const triggerRecurringTransactions = inngest.createFunction(
  { id: "trigger-recurring-transactions", name: "Trigger Recurring Transactions" },
  { cron: "0 0 * * *" }, // Run daily at midnight
  async ({ step }) => {
    console.log("📅 Recurring transaction trigger fired");

    const recurring = await step.run("fetch-recurring-transactions", () =>
      db.transaction.findMany({
        where: {
          isRecurring: true,
          status: "COMPLETED",
          OR: [
            { lastProcessedDate: null },
            { nextRecurringDate: { lte: new Date() } },
          ],
        },
      })
    );

    if (recurring.length > 0) {
      const events = recurring.map((t) => ({
        name: "transaction.recurring.process",
        data: { transactionId: t.id, userId: t.userId },
      }));
      await inngest.send(events);
    }

    return { triggered: recurring.length };
  }
);

// === Function 4: Process Recurring Transaction ===
export const processRecurringTransaction = inngest.createFunction(
  {
    id: "process-recurring-transaction",
    name: "Process Recurring Transaction",
    throttle: {
      limit: 10,
      period: "1m",
      key: "event.data.userId",
    },
  },
  { event: "transaction.recurring.process" },
  async ({ event, step }) => {
    const { transactionId, userId } = event.data;
    if (!transactionId || !userId) return { error: "Missing data" };

    return step.run("process-recurring-transaction", async () => {
      try {
        const transaction = await db.transaction.findUnique({
          where: { id: transactionId, userId },
          include: { account: true },
        });

        if (!transaction) return;

        const isDue =
          !transaction.lastProcessedDate ||
          new Date(transaction.nextRecurringDate) <= new Date();

        if (!isDue) return;

        await db.$transaction(async (tx) => {
          await tx.transaction.create({
            data: {
              type: transaction.type,
              amount: transaction.amount,
              description: `${transaction.description} (Recurring)`,
              date: new Date(),
              accountId: transaction.accountId,
              category: transaction.category,
              isRecurring: false,
              userId: transaction.userId,
            },
          });

          const balanceChange =
            transaction.type === "EXPENSE"
              ? -transaction.amount.toNumber()
              : transaction.amount.toNumber();

          await tx.account.update({
            where: { id: transaction.accountId },
            data: { balance: { increment: balanceChange } },
          });

          await tx.transaction.update({
            where: { id: transaction.id },
            data: {
              lastProcessedDate: new Date(),
              nextRecurringDate: calculateNextRecurringDate(
                new Date(),
                transaction.RecurringInterval
              ),
            },
          });
        });

        console.log("✅ Transaction processed:", transactionId);
        return { success: true };
      } catch (err) {
        console.error("❌ Error processing recurring transaction:", err);
        return { error: err.message };
      }
    });
  }
);

// === Function 5: Generate Monthly Reports ===
export const generateMonthlyReports = inngest.createFunction(
  { id: "generate-monthly-reports", name: "Generate Monthly Reports" },
  { cron: "0 0 1 * *" }, // Run 1st of every month at midnight
  async ({ step }) => {
    const users = await step.run("fetch-users", () =>
      db.user.findMany({ include: { accounts: true } })
    );

    for (const user of users) {
      await step.run(`generate-report-${user.id}`, async () => {
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);

        const stats = await getMonthlyStats(user.id, lastMonth);
        const monthName = lastMonth.toLocaleString("default", { month: "long" });
        const insights = await generateInsights(stats, monthName);

        await sendEmail({
          to: user.email,
          subject: `Your Monthly Report for ${monthName}`,
          react: EmailTemplate({
            userName: user.name,
            type: "monthly-report",
            data: {
              stats: {
                totalIncome: stats.totalIncome.toFixed(2),
                totalExpenses: stats.totalExpenses.toFixed(2),
                transactionCount: stats.transactionCount,
                byCategory: Object.fromEntries(
                  Object.entries(stats.byCategory).map(([k, v]) => [k, v.toFixed(2)])
                ),
              },
              month: monthName,
              insights,
            },
          }),
        });
      });
    }

    return { processed: users.length };
  }
);

// === Helpers ===
function calculateNextRecurringDate(date, interval) {
  const d = new Date(date);
  switch (interval) {
    case "DAILY": d.setDate(d.getDate() + 1); break;
    case "WEEKLY": d.setDate(d.getDate() + 7); break;
    case "MONTHLY": d.setMonth(d.getMonth() + 1); break;
    case "YEARLY": d.setFullYear(d.getFullYear() + 1); break;
  }
  return d;
}

async function getMonthlyStats(userId, month) {
  const start = new Date(month.getFullYear(), month.getMonth(), 1);
  const end = new Date(month.getFullYear(), month.getMonth() + 1, 0);

  const transactions = await db.transaction.findMany({
    where: {
      userId,
      date: { gte: start, lte: end },
    },
  });

  return transactions.reduce(
    (acc, t) => {
      const amt = t.amount.toNumber();
      if (t.type === "EXPENSE") {
        acc.totalExpenses += amt;
        acc.byCategory[t.category] = (acc.byCategory[t.category] || 0) + amt;
      } else {
        acc.totalIncome += amt;
      }
      return acc;
    },
    {
      totalIncome: 0,
      totalExpenses: 0,
      transactionCount: transactions.length,
      byCategory: {},
    }
  );
}

async function generateInsights(stats, month) {
  const prompt = `
    Analyze the data and return 3 concise insights as a JSON array.
    Month: ${month}
    Income: ${stats.totalIncome}
    Expenses: ${stats.totalExpenses}
    Net: ${stats.totalIncome - stats.totalExpenses}
    Categories: ${JSON.stringify(stats.byCategory)}
  `;

  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

  for (let i = 0; i < 3; i++) {
    try {
      const result = await model.generateContent(prompt);
      const raw = await result.response.text();
      return JSON.parse(raw.replace(/```(?:json)?/g, "").trim());
    } catch (e) {
      if (e.message.includes("503") && i < 2) {
        await new Promise((res) => setTimeout(res, 1000 * (i + 1)));
        continue;
      }
      console.error("Gemini error:", e.message);
      return [
        "You spent heavily in some categories. Consider optimizing.",
        "Set a clearer budget target for next month.",
        "Recurring expenses might be growing—review them.",
      ];
    }
  }
}
