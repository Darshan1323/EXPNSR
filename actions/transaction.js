"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { GoogleGenerativeAI } from "@google/generative-ai";
import aj from "@/lib/arcjet";
import { request } from "@arcjet/next";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const serializeAmount = (obj) => ({
  ...obj,
  amount: obj.amount.toNumber(),
});



export async function createTransaction(data) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const req = await request();
    const decision = await aj.protect(req, { userId, requested: 1 });

    if (decision.isDenied()) {
      if (decision.reason.isRateLimit()) {
        const { remaining, reset } = decision.reason;
        console.error({
          code: "RATE_LIMIT_EXCEEDED",
          details: { remaining, resetInSeconds: reset },
        });
        throw new Error("Too many requests. Please try again later.");
      }
      throw new Error("Request blocked");
    }

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });
    if (!user) throw new Error("User not found");

    const account = await db.account.findUnique({
      where: { id: data.accountId, userId: user.id },
    });
    if (!account) throw new Error("Account not found");

    // 🧹 Sanitize `recurringInterval`
    const isRecurring = data.isRecurring === true;
    let recurringInterval = isRecurring ? data.recurringInterval : null;

    // Handle empty string edge case from scanner UI
    if (!recurringInterval || recurringInterval === "") {
      recurringInterval = null;
    }

    // ✅ Validate recurringInterval if it's provided
    const validIntervals = ["DAILY", "WEEKLY", "MONTHLY", "YEARLY"];
    if (recurringInterval && !validIntervals.includes(recurringInterval)) {
      throw new Error("Invalid recurring interval value.");
    }

    // 💵 Duplicate detection
    const existing = await db.transaction.findFirst({
      where: {
        userId: user.id,
        accountId: data.accountId,
        type: data.type,
        amount: data.amount,
        description: data.description,
        date: {
          gte: new Date(new Date(data.date).setHours(0, 0, 0, 0)),
          lte: new Date(new Date(data.date).setHours(23, 59, 59, 999)),
        },
      },
    });

    if (existing) {
      console.warn("⚠️ Duplicate transaction detected:", existing);
      throw new Error("Duplicate transaction already exists for this day.");
    }

    const balanceChange = data.type === "EXPENSE" ? -data.amount : data.amount;
    const newBalance = account.balance.toNumber() + balanceChange;

    const transaction = await db.$transaction(async (tx) => {
      const newTransaction = await tx.transaction.create({
        data: {
          ...data,
          userId: user.id,
          recurringInterval,
          nextRecurringDate:
            isRecurring && recurringInterval
              ? calculateNextRecurringDate(data.date, recurringInterval)
              : null,
        },
      });

      await tx.account.update({
        where: { id: data.accountId },
        data: { balance: newBalance },
      });

      return newTransaction;
    });

    revalidatePath("/dashboard");
    revalidatePath(`/account/${transaction.accountId}`);

    return { success: true, data: serializeAmount(transaction) };
  } catch (error) {
    console.error("❌ createTransaction error:", error);
    return { success: false, error: error.message || "Unknown error" };
  }
}

export async function getTransaction(id) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  const transaction = await db.transaction.findUnique({
    where: {
      id,
      userId: user.id,
    },
  });

  if (!transaction) throw new Error("Transaction not found");

  return serializeAmount(transaction);
}

export async function updateTransaction(id, data) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) throw new Error("User not found");

    const originalTransaction = await db.transaction.findUnique({
      where: {
        id,
        userId: user.id,
      },
      include: {
        account: true,
      },
    });

    if (!originalTransaction) throw new Error("Transaction not found");

    const oldBalanceChange =
      originalTransaction.type === "EXPENSE"
        ? -originalTransaction.amount.toNumber()
        : originalTransaction.amount.toNumber();

    const newBalanceChange =
      data.type === "EXPENSE" ? -data.amount : data.amount;

    const netBalanceChange = newBalanceChange - oldBalanceChange;

    const transaction = await db.$transaction(async (tx) => {
      const updated = await tx.transaction.update({
        where: {
          id,
          userId: user.id,
        },
        data: {
          ...data,
          nextRecurringDate:
            data.isRecurring && data.recurringInterval
              ? calculateNextRecurringDate(data.date, data.recurringInterval)
              : null,
        },
      });

      await tx.account.update({
        where: { id: data.accountId },
        data: {
          balance: {
            increment: netBalanceChange,
          },
        },
      });

      return updated;
    });

    revalidatePath("/dashboard");
    revalidatePath(`/account/${data.accountId}`);

    return { success: true, data: serializeAmount(transaction) };
  } catch (error) {
    throw new Error(error.message);
  }
}

export async function getUserTransactions(query = {}) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const transactions = await db.transaction.findMany({
      where: {
        userId: user.id,
        ...query,
      },
      include: {
        account: true,
      },
      orderBy: {
        date: "desc",
      },
    });

    return { success: true, data: transactions };
  } catch (error) {
    throw new Error(error.message);
  }
}

export async function scanReceipt(base64String) {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `Extract the total amount, date (YYYY-MM-DD), description, and category from this receipt image.
Respond strictly in this JSON format:

{
  "amount": number,
  "date": "YYYY-MM-DD",
  "description": "short summary of the purchase (e.g. 'Grocery at DMart')",
  "category": "single lowercase word like groceries, food, travel, shopping, etc."
}`;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const result = await model.generateContent([
        {
          inlineData: {
            mimeType: "image/png",
            data: base64String,
          },
        },
        { text: prompt },
      ]);

      const text = await result.response.text();
      const cleaned = text.replace(/```(?:json)?/g, "").trim();

      console.log("Gemini scanned result:", cleaned); // ✅ For debugging

      return JSON.parse(cleaned);
    } catch (error) {
      console.error("Gemini error:", error.message);
      if (
        error.message.includes("503") ||
        error.message.includes("overloaded")
      ) {
        await new Promise((res) => setTimeout(res, 1000 * (attempt + 1)));
      } else {
        break;
      }
    }
  }

  throw new Error("Failed to scan receipt after retries.");
}


function calculateNextRecurringDate(startDate, interval) {
  const date = new Date(startDate);
  switch (interval) {
    case "DAILY":
      date.setDate(date.getDate() + 1);
      break;
    case "WEEKLY":
      date.setDate(date.getDate() + 7);
      break;
    case "MONTHLY":
      date.setMonth(date.getMonth() + 1);
      break;
    case "YEARLY":
      date.setFullYear(date.getFullYear() + 1);
      break;
  }
  return date;
}
