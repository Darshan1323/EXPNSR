import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import {
  checkBudgetAlert,
  triggerRecurringTransactions,
  processRecurringTransaction,
  generateMonthlyReports,
} from "@/lib/inngest/functions";

//  Export the HTTP methods for the API route
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    checkBudgetAlert,
    triggerRecurringTransactions,
    processRecurringTransaction,
    generateMonthlyReports,
  ],
});
