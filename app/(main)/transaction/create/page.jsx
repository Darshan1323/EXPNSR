export const dynamic = "force-dynamic";

import { getUserAccounts } from "@/actions/dashboard";
import { defaultCategories } from "@/data/categories";
import { AddTransactionForm } from "../_components/transaction-form";
import { getTransaction } from "@/actions/transaction";



export default async function AddTransactionPage(props) {
  const searchParams = await props.searchParams;
  const editId = searchParams?.edit ?? null;

  const accounts = await getUserAccounts();

  let initialData = null;
  if (editId) {
    initialData = await getTransaction(editId);
  }

  return (
    <div className="max-w-3xl mx-auto px-5">
      <div className="flex justify-center md:justify-normal mb-8">
        <h1 className="text-5xl pb-6 bg-gradient-to-br from-blue-600 via-pink-500 to-purple-600 font-extrabold tracking-tighter pr-2 text-transparent bg-clip-text mb-5">
          Add Transaction
        </h1>
      </div>
      <AddTransactionForm
        accounts={accounts}
        categories={defaultCategories}
        editMode={!!editId}
        initialData={initialData}
      />
    </div>
  );
}



