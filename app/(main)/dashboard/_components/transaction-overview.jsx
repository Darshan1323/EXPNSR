"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import React, { useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { Cell, Legend, Pie, PieChart, Tooltip } from 'recharts';
import { ResponsiveContainer } from 'recharts';

const COLORS = [
    "#FF6B6B",
    "#4ECDC4",
    "#45B7D1",
    "#96CEB4",
    "#FFEEAD",
    "#D4A5A5",
    "#9FA8DA",
];

const DashboardOverview = ({ accounts, transactions }) => {

    const [selectedAccountId, setSelectedAccountId] = useState(
        accounts.find((a) => a.isDefault)?.id || accounts[0]?.id
    );


    // Filter the transactions for the selected account
    const filteredTransactions = transactions.filter(
        (t) => t.accountId === selectedAccountId
    );

    const recentTransactions = filteredTransactions.sort(
        (a, b) => new Date(b.date) - new Date(a.date)
    ).slice(0, 5);

    const currentDate = new Date();
    const currentMonthExpenses = filteredTransactions.filter((t) => {
        const transactionDate = new Date(t.date);
        return (
            t.type === "EXPENSE" &&
            transactionDate.getFullYear() === currentDate.getFullYear() &&
            transactionDate.getMonth() === currentDate.getMonth()
        )
    });

    const expensesByCategory = currentMonthExpenses.reduce((acc, transaction) => {
        const category = transaction.category || "Uncategorized";
        if (!acc[category]) {
            acc[category] = 0;
        }
        acc[category] += transaction.amount;
        return acc;
    }, {});

    const pieChartData = Object.entries(expensesByCategory).map(([category, amount]) => ({
        name: category,
        value: amount,
    }));

    return (
        <div className="grid gap-4 md:grid-cols-2">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <CardTitle className="text-base font-bold">
                        Recent Transaction
                    </CardTitle>
                    <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                        <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder="Select Account" />
                        </SelectTrigger>
                        <SelectContent>
                            {accounts.map((account) => (
                                <SelectItem
                                    key={account.id}
                                    value={account.id}
                                >
                                    {account.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </CardHeader>
                <CardContent>
                    <div className='space-y-4'>
                        {recentTransactions.length === 0 ? (
                            <p>No recent transactions</p>
                        ) : (
                            recentTransactions.map((transaction) => (
                                <div key={transaction.id} className="flex items-center justify-between space-y-1">
                                    <div className='space-y-1'>
                                        <p className="text-sm font-medium leading-none">{transaction.description || "Untitled Trnasaction"}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {format(new Date(transaction.date), "PP")}
                                        </p>
                                    </div>
                                    <div className='flex items-center space-x-2'>
                                        <div className={cn('flex items-center',
                                            transaction.type === "EXPENSE" ? "text-red-500" : "text-green-500"
                                        )}>
                                            {transaction.type === "EXPENSE" ? (
                                                <ArrowDownRight className="mr-1 h-4 w-4" />
                                            ) : (
                                                <ArrowUpRight className="mr-1 h-4 w-4" />
                                            )}
                                            ${transaction.amount.toFixed(2)}
                                        </div>
                                    </div>

                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>
<Card>
  <CardHeader>
    <CardTitle>Monthly Expense Breakdown</CardTitle>
  </CardHeader>
  <CardContent className="p-0">
    {pieChartData.length === 0 ? (
      <p className="text-center text-sm text-muted-foreground p-4">
        No expenses for this month
      </p>
    ) : (
      <div className="h-[350px] px-2">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieChartData}
              cx="50%"
              cy="50%"
              outerRadius={100}
              dataKey="value"
              labelLine={false}
              label={({ name, value }) => {
                const shortName = name.length > 14 ? `${name.slice(0, 12)}…` : name;
                return `${shortName}: $${value.toFixed(2)}`;
              }}
            >
              {pieChartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
            <Legend layout="horizontal" verticalAlign="bottom" align="center" />
          </PieChart>
        </ResponsiveContainer>
      </div>
    )}
  </CardContent>
</Card>

        </div>
    )
}

export default DashboardOverview