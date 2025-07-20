import { db } from "@/lib/prisma";

export default async function Debug() {
  const tx = await db.transaction.findUnique({
    where: { id: "cmdbiu2h90001k004hokqzf50" },
  });

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Transaction Debug</h2>
      <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
        {JSON.stringify(tx, null, 2)}
      </pre>
    </div>
  );
}
