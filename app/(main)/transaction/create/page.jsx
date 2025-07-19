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

  if (editId) {
    initialData = await getTransaction(editId);
    if (!initialData) redirect("/not-found");
  } else {
    initialData = await getLastTransaction();
  }

  return (
     <div className="max-w-4xl mx-auto px-6 lg:px-12">
    <div className="flex justify-center md:justify-normal mb-8">
      <h1 className="text-5xl bg-gradient-to-br from-blue-600 via-pink-500 to-purple-600 gradient font-extrabold tracking-tighter pr-2 text-transparent bg-clip-text mb-2">
        {editId ? "Edit Transaction" : "Add Transaction"}
      </h1>
    </div>

    <AddTransactionForm
      accounts={accounts}
      categories={categories}
      editMode={!!editId}
      initialData={initialData}
    />
  </div>
  );
}
