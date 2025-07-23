export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { getAccountWithTransactions } from "@/actions/account";
import { BarLoader } from "react-spinners";
import { TransactionTable } from "../_components/transaction-table";
import { notFound } from "next/navigation";
import { AccountChart } from "../_components/account-chart";

export default async function AccountPage({ params }) {
  const accountId = params?.id;

  if (!accountId) notFound();

  const accountData = await getAccountWithTransactions(accountId);

  if (!accountData) notFound();

  const { transactions, ...account } = accountData;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end justify-between">
        <div>
          <h1 className="text-4xl sm:text-6xl pb-4 bg-gradient-to-br from-blue-600 via-pink-500 to-purple-600 gradient font-extrabold trackin-tighter text-transparent bg-clip-text mb-3">
            {account.name}
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            {account.type.charAt(0) + account.type.slice(1).toLowerCase()} Account
          </p>
        </div>
        <div className="text-left sm:text-right">
          <div className="text-xl sm:text-2xl font-bold">
            ${parseFloat(account.balance).toFixed(2)}
          </div>
          <p className="text-sm text-muted-foreground">
            {account._count.transactions} Transactions
          </p>
        </div>
      </div>

      <Suspense fallback={<BarLoader className="mt-4" width={"100%"} color="#9333ea" />}>
        <AccountChart transactions={transactions} />
      </Suspense>

      <Suspense fallback={<BarLoader className="mt-4" width={"100%"} color="#9333ea" />}>
        <TransactionTable transactions={transactions} />
      </Suspense>
    </div>
  );
}
