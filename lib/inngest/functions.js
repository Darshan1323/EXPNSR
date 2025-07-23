import { inngest } from "./client";
import { db } from "@/lib/prisma";
import EmailTemplate from "@/emails/template";
import { sendEmail } from "@/actions/send-email";
import { GoogleGenerativeAI } from "@google/generative-ai";

// === 1. Recurring Transaction Processor ===
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
    const { transactionId, userId } = event?.data || {};

    if (!transactionId || !userId) {
      console.error("Invalid event data:", event);
      throw new Error("Missing required event data");
    }

    await step.run("process-transaction", async () => {
      const transaction = await db.transaction.findUnique({
        where: { id: transactionId, userId },
        include: { account: true },
      });

      if (!transaction || !isTransactionDue(transaction)) return;

      await db.$transaction(async (tx) => {
        await tx.transaction.create({
          data: {
            type: transaction.type,
            amount: transaction.amount,
            description: `${transaction.description} (Recurring)`,
            date: new Date(),
            category: transaction.category,
            userId: transaction.userId,
            accountId: transaction.accountId,
            isRecurring: false,
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
            lastProcessedDate: new Date(), // ✅ Fixed
            nextRecurringDate: calculateNextRecurringDate(
              new Date(),
              transaction.recurringInterval
            ),
          },
        });
      });

      return {
        status: "success",
        message: "Recurring transaction processed.",
      };
    });
  }
);

// === 2. Trigger Recurring Transactions ===
export const triggerRecurringTransactions = inngest.createFunction(
  {
    id: "trigger-recurring-transactions",
    name: "Trigger Recurring Transactions",
  },
  { cron: "0 0 * * *" },
  async ({ step }) => {
    const recurringTransactions = await step.run(
      "fetch-recurring-transactions",
      async () => {
        return await db.transaction.findMany({
          where: {
            isRecurring: true,
            status: "COMPLETED",
            description: { not: { contains: "(Recurring)" } },
            OR: [
              { lastProcessedDate: null }, // ✅ uses correct field
              { nextRecurringDate: { lte: new Date() } },
            ],
          },
        });
      }
    );

    if (recurringTransactions.length > 0) {
      const events = recurringTransactions.map((transaction) => ({
        name: "transaction.recurring.process",
        data: {
          transactionId: transaction.id,
          userId: transaction.userId,
        },
      }));
      await inngest.send(events);
    }

    return { triggered: recurringTransactions.length };
  }
);


// === 3. Generate Monthly Reports ===
export const generateMonthlyReports = inngest.createFunction(
  {
    id: "generate-monthly-reports",
    name: "Generate Monthly Reports",
  },
  { cron: "0 0 1 * *" },
  async ({ step }) => {
    const users = await step.run("fetch-users", async () => {
      return await db.user.findMany({ include: { accounts: true } });
    });

    for (const user of users) {
      await step.run(`generate-report-${user.id}`, async () => {
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        const stats = await getMonthlyStats(user.id, lastMonth);
        const monthName = lastMonth.toLocaleString("default", { month: "long" });
        const insights = await generateFinancialInsights(stats, monthName);

        await sendEmail({
          to: user.email,
          subject: `Your Monthly Financial Report - ${monthName}`,
          react: EmailTemplate({
            userName: user.name,
            type: "monthly-report",
            data: { stats, month: monthName, insights },
          }),
        });
      });
    }

    return { processed: users.length };
  }
);

// === 4. Budget Alert Emails ===
export const checkBudgetAlert = inngest.createFunction(
  {
    id: "check-budget-alert",
    name: "Check Budget Alerts",
  },
  { cron: "0 */6 * * *" },
  async ({ step }) => {
    const budgets = await step.run("fetch-budgets", async () => {
      return await db.budget.findMany({
        include: {
          user: {
            include: {
              accounts: { where: { isDefault: true } },
            },
          },
        },
      });
    });

    for (const budget of budgets) {
      const defaultAccount = budget.user.accounts[0];
      if (!defaultAccount) continue;

      await step.run(`check-budget-${budget.id}`, async () => {
        const startDate = new Date();
        startDate.setDate(1);

        const expenses = await db.transaction.aggregate({
          where: {
            userId: budget.userId,
            accountId: defaultAccount.id,
            type: "EXPENSE",
            date: { gte: startDate },
          },
          _sum: { amount: true },
        });

        const totalExpenses = expenses._sum.amount?.toNumber() || 0;
        const percentageUsed = (totalExpenses / budget.amount) * 100;

        const isNew =
          !budget.lastAlertSent ||
          isNewMonth(new Date(budget.lastAlertSent), new Date());

        if (percentageUsed >= 80 && isNew) {
          await sendEmail({
            to: budget.user.email,
            subject: `Budget Alert for ${defaultAccount.name}`,
            react: EmailTemplate({
              userName: budget.user.name,
              type: "budget-alert",
              data: {
                percentageUsed,
                budgetAmount: parseFloat(budget.amount).toFixed(1),
                totalExpenses: totalExpenses.toFixed(1),
                accountName: defaultAccount.name,
              },
            }),
          });

          await db.budget.update({
            where: { id: budget.id },
            data: { lastAlertSent: new Date() },
          });
        }
      });
    }
  }
);

// === Shared Utilities ===
function isTransactionDue(transaction) {
  if (!transaction.lastProcessed) return true;
  return new Date(transaction.nextRecurringDate) <= new Date();
}

function calculateNextRecurringDate(date, interval) {
  const next = new Date(date);
  switch (interval) {
    case "DAILY": next.setDate(next.getDate() + 1); break;
    case "WEEKLY": next.setDate(next.getDate() + 7); break;
    case "MONTHLY": next.setMonth(next.getMonth() + 1); break;
    case "YEARLY": next.setFullYear(next.getFullYear() + 1); break;
  }
  return next;
}

function isNewMonth(lastDate, currentDate) {
  return (
    lastDate.getMonth() !== currentDate.getMonth() ||
    lastDate.getFullYear() !== currentDate.getFullYear()
  );
}

async function getMonthlyStats(userId, month) {
  const start = new Date(month.getFullYear(), month.getMonth(), 1);
  const end = new Date(month.getFullYear(), month.getMonth() + 1, 0);

  const transactions = await db.transaction.findMany({
    where: { userId, date: { gte: start, lte: end } },
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

async function generateFinancialInsights(stats, month) {
  const prompt = `
Analyze this financial data and provide 3 concise, actionable insights.
Month: ${month}
Income: ${stats.totalIncome}
Expenses: ${stats.totalExpenses}
Net: ${stats.totalIncome - stats.totalExpenses}
Categories: ${JSON.stringify(stats.byCategory)}
  `;

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return JSON.parse(text.replace(/```(?:json)?/g, "").trim());
  } catch (e) {
    console.error("Gemini error:", e.message);
    return [
      "You spent heavily in some categories. Consider optimizing.",
      "Set a clearer budget target for next month.",
      "Recurring expenses might be growing—review them.",
    ];
  }
}
