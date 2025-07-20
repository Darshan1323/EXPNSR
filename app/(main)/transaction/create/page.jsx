import { headers } from "next/headers";
import { getUserAccounts } from "@/actions/dashboard";
import { getTransaction, getLastTransaction } from "@/actions/transaction";
import { defaultCategories } from "@/data/categories";
import { AddTransactionForm } from "@/app/(main)/transaction/_components/transaction-form";
import { redirect } from "next/navigation";

export default async function AddTransactionPage() {
  const headersList = await headers(); // ✅ Await this now

  const host = headersList.get("host") || "localhost:3000";
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  const path = headersList.get("x-next-url") || "/transaction/create";
  const fullUrl = `${protocol}://${host}${path}`;
  const url = new URL(fullUrl);

  const editId = url.searchParams.get("edit");

  const accounts = await getUserAccounts();
  const categories = defaultCategories;

let initialData = null;
let lastTransaction = null;

if (editId) {
  console.log("💡 editId present:", editId); // ✅ Add this
  initialData = await getTransaction(editId);
  console.log("🧩 initialData returned:", initialData); // ✅ Add this too
  if (!initialData) redirect("/not-found");
}
 else {
  lastTransaction = await getLastTransaction();
}


  return (
     <div className="max-w-4xl mx-auto px-6 lg:px-12">
    <div className="flex justify-center md:justify-normal mb-8">
      <h1 className="text-5xl bg-gradient-to-br from-blue-600 via-pink-500 to-purple-600 gradient font-extrabold tracking-tighter pr-2 text-transparent bg-clip-text mb-2">
        {editId ? "Edit Transaction" : "Add Transaction"}
      </h1>
    </div>

<AddTransactionForm
  key={initialData?.id || "create"} // force form re-mount on edit
  accounts={accounts}
  categories={categories}
  editMode={!!editId}
  initialData={initialData}
  lastTransaction={lastTransaction}
/>

  </div>
  );
}
