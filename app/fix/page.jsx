import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

export default async function FixPage() {
  const { userId } = await auth();
  const user = await db.user.findUnique({ where: { clerkUserId: userId } });

  if (!user) return <p>No user found</p>;

  // Fix the ownership
  const fixed = await db.transaction.update({
    where: { id: "cmdbiu2h90001k004hokqzf50" },
    data: { userId: user.id },
  });

  

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold">Ownership Fixed</h1>
      <pre>{JSON.stringify(fixed, null, 2)}</pre>
    </div>
  );
}
