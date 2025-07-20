"use server";


import { db } from "@/lib/prisma";
import { cookies } from "next/headers";
import { auth, auth as getAuth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { revalidatePath } from "next/cache";
import { transactionSchema } from "@/lib/schema";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

function serializeTransaction(tx) {
  return {
    ...tx,
    amount: tx.amount.toNumber(),
    nextRecurringDate: tx.nextRecurringDate?.toISOString() ?? null,
    lastProcessedDate: tx.lastProcessedDate?.toISOString() ?? null,
    createdAt: tx.createdAt.toISOString(),
    updatedAt: tx.updatedAt.toISOString(),
  };
}

function calculateNextRecurringDate(startDate, interval) {
  const date = new Date(startDate);
  switch (interval) {
    case "DAILY": date.setDate(date.getDate() + 1); break;
    case "WEEKLY": date.setDate(date.getDate() + 7); break;
    case "MONTHLY": date.setMonth(date.getMonth() + 1); break;
    case "YEARLY": date.setFullYear(date.getFullYear() + 1); break;
  }
  return date;
}

function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function createTransaction(rawData) {
  const { userId } = await auth();
const user = await db.user.findUnique({ where: { clerkUserId: userId } });

  try {
    cookies().getAll(); // touch cookies to ensure dynamic behavior

    const { userId: clerkUserId } = await getAuth();
    if (!clerkUserId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({ where: { clerkUserId } });
    if (!user) throw new Error("User not found");

    const validated = transactionSchema.parse(rawData);

    const data = {
      ...validated,
      userId: user.id,
      RecurringInterval: validated.isRecurring ? validated.recurringInterval : null,
    };

   const result = await db.transaction.create({
  data: {
    type: data.type,
    amount: parseFloat(data.amount),
    description: data.description || "",
    date: data.date,
    accountId: data.accountId,
    category: data.category,
    isRecurring: data.isRecurring,
    RecurringInterval: data.RecurringInterval,
    nextRecurringDate:
      data.isRecurring && data.RecurringInterval
        ? calculateNextRecurringDate(data.date, data.RecurringInterval)
        : null,
    userId: data.userId,
  },
});


    return { success: true, data: serializeTransaction(result) };
  } catch (err) {
    console.error("❌ Create Transaction Error:", err);
    if (err.name === "ZodError") {
      return { success: false, errors: err.flatten().fieldErrors };
    }
    return { success: false, message: err.message || "Internal server error" };
  }
}

export async function updateTransaction(data) {
  const { userId } = await getAuth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) throw new Error("User not found");

  const original = await db.transaction.findUnique({
    where: { id: data.id, userId: user.id },
    include: { account: true },
  });

  if (!original) throw new Error("Transaction not found");

  const oldBalance = original.type === "EXPENSE" ? -original.amount.toNumber() : original.amount.toNumber();
  const newBalance = data.type === "EXPENSE" ? -data.amount : data.amount;
  const netChange = newBalance - oldBalance;

  const updated = await db.$transaction(async (tx) => {
    const updatedTransaction = await tx.transaction.update({
      where: { id: data.id, userId: user.id },
      data: {
  ...data,
  RecurringInterval: data.isRecurring ? data.recurringInterval : null,
  nextRecurringDate: data.isRecurring && data.recurringInterval
    ? calculateNextRecurringDate(data.date, data.recurringInterval)
    : null,
},
    });

    await tx.account.update({
      where: { id: data.accountId },
      data: { balance: { increment: netChange } },
    });

    return updatedTransaction;
  });

  revalidatePath("/dashboard");
  revalidatePath(`/account/${data.accountId}`);

  return { success: true, data: serializeTransaction(updated) };
}



export async function getTransaction(id) {


  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({ where: { clerkUserId } });
  if (!user) throw new Error("User not found");

  const tx = await db.transaction.findFirst({
    where: { id, userId: user.id },
  });

  if (!tx) {

    return null;
  }


return {
  ...serializeTransaction(tx),
  category: tx.category ?? "other-expense",
  categoryLabel:
    defaultCategories.find((c) => c.id === tx.category)?.name ?? "Other",
};

}




export async function getLastTransaction() {
  const { userId } = await getAuth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) throw new Error("User not found");

  const tx = await db.transaction.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  if (!tx) return null;

  return { ...serializeTransaction(tx), category: tx.category || "other-expense" };
}

export async function scanReceipt(file) {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const arrayBuffer = await file.arrayBuffer();
  const base64 = arrayBufferToBase64(arrayBuffer);

  const prompt = `
Analyze this receipt and return:
{
  "amount": number,
  "date": "ISO date",
  "description": "string",
  "merchantName": "string",
  "category": "string"
}
If invalid, return an empty object.
`;

  const result = await model.generateContent([
    { inlineData: { data: base64, mimeType: file.type } },
    prompt,
  ]);

  const response = await result.response;
  const text = response.text().replace(/```json|```/g, "").trim();

  try {
    const data = JSON.parse(text);
    return {
      amount: parseFloat(data.amount),
      date: new Date(data.date),
      description: data.description || "No description",
      category: data.category || "other-expense",
      merchantName: data.merchantName || "Unknown",
    };
  } catch {
    throw new Error("Invalid receipt format");
  }
}
