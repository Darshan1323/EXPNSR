export const dynamic = "force-dynamic";
import React, { Suspense } from 'react';
import { CreateAccountDrawer } from '@/components/create-account-drawer';
import { Card, CardContent } from '@/components/ui/card';
import { Plus } from 'lucide-react';
import { getDashboardData, getUserAccounts } from '@/actions/dashboard';
import AccountCard from './_components/account-card';
import { getCurrentBudget } from '@/actions/budget';
import { BudgetProgress } from './_components/budget-progress';
import DashboardOverview from './_components/transaction-overview';

const DashboardPage = async () => {
  const accounts = await getUserAccounts();
  const defaultAccount = accounts?.find((account) => account.isDefault);

  let budgetData = null;
  if (defaultAccount) {
    budgetData = await getCurrentBudget(defaultAccount.id);
  }

  const transactions = await getDashboardData();

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 space-y-8 py-6">
      {defaultAccount && (
        <BudgetProgress
          initialBudget={budgetData?.budget}
          currentExpenses={budgetData?.currentExpenses || 0}
        />
      )}

      <Suspense fallback={"Loading Overview..."}>
        <DashboardOverview accounts={accounts} transactions={transactions || []} />
      </Suspense>

      <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        <CreateAccountDrawer>
          <Card className="hover:shadow-md transition-shadow cursor-pointer border-dashed h-full">
            <CardContent className="flex flex-col items-center justify-center text-muted-foreground h-full">
              <Plus className="h-10 w-10 mb-2" />
              <p className="text-sm">Add New Account</p>
            </CardContent>
          </Card>
        </CreateAccountDrawer>

        {accounts.length > 0 &&
          accounts.map((account) => (
            <AccountCard key={account.id} account={account} />
          ))}
      </div>
    </div>
  );
};

export default DashboardPage;
