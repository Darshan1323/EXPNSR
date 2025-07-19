export const dynamic = 'force-dynamic';

import { getUserAccountWithTransactions } from '@/actions/accounts';
import { notFound } from 'next/navigation';
import React, { Suspense } from 'react';
import { TransactionTable } from '../_components/transaction-table';
import { BarLoader } from 'react-spinners';
import AccountChart from '../_components/account-chart';

export default async function AccountPage({ params }) {
  params = await params; // ✅ Await just the params object
  const accountData = await getUserAccountWithTransactions(params.id);

  if (!accountData) return notFound();

  const { transactions, ...account } = accountData;

  return (
  <div className='space-y-8 px-6 lg:px-12'>

    <div className='flex gap-4 items-end justify-between'>
      <div>
        <h1 className='text-5xl sm:text-6xl capitalize bg-gradient-to-br from-blue-600 via-pink-500 to-purple-600 font-extrabold tracking-tighter pr-2 pb-2 text-transparent bg-clip-text'>
          {account.name}
        </h1>
        <p className='text-muted-foreground'>
          {account.type.charAt(0) + account.type.slice(1).toLowerCase()} Account
        </p>
      </div>

      <div className='text-right pb-2'>
        <div className='text-xl sm:text-2xl font-bold'>
          ${parseFloat(account.balance).toFixed(2)}
        </div>
        <p className='text-sm text-muted-foreground'>
          {account._count.transactions} Transactions
        </p>
      </div>
    </div>

    <Suspense fallback={<BarLoader className="mt-4" width={"100%"} color="#9333ea" />}>
      <AccountChart transactions={transactions} />
    </Suspense>

    <Suspense fallback={<BarLoader />}>
      <TransactionTable transactions={transactions} />
    </Suspense>
    
  </div>
);

}
