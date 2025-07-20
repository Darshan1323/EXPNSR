// scripts/fixTransactionOwnership.js

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";

export async function fixTransactionOwnership(transactionId) {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({ where: { clerkUserId } });
  if (!user) throw new Error("User not found");

  const tx = await db.transaction.findUnique({
    where: { id: transactionId },
  });

  if (!tx) {
    console.log("❌ Transaction not found.");
    return;
  }

  console.log("⚠️ Transaction currently belongs to:", tx.userId);
  console.log("✅ Reassigning to:", user.id);

  await db.transaction.update({
    where: { id: transactionId },
    data: { userId: user.id },
  });

  console.log("🎉 Ownership updated successfully!");
}
