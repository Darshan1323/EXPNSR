"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { toast } from "sonner";

import { createTransaction, updateTransaction } from "@/actions/transaction";
import { transactionSchema } from "@/lib/schema";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";
import { BarLoader } from "react-spinners";

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";

import CreateAccountDrawer from "@/components/create-account-drawer";
import { ReceiptScanner } from "./receipt-scanner";

import { CalendarHeartIcon, Loader2 } from "lucide-react";

export function AddTransactionForm({
  accounts,
  categories,
  editMode = false,
  initialData = null,
  lastTransaction = null,
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: "EXPENSE",
      amount: "",
      description: "",
      accountId: accounts.find((a) => a.isDefault)?.id || "",
      category: "",
      date: new Date(),
      isRecurring: false,
      recurringInterval: undefined,
    },
  });

  const watchedIsRecurring = watch("isRecurring");
  const watchedDate = watch("date");
  const watchedCategory = watch("category");

  const accountOptions = useMemo(
    () =>
      accounts.map((a) => ({
        id: a.id,
        label: `${a.name} ($${parseFloat(a.balance).toFixed(2)})`,
      })),
    [accounts]
  );

  const categoryOptions = useMemo(
    () => categories.map((c) => ({ id: c.id, label: c.name })),
    [categories]
  );

  // 🧠 Reset form if editing or copying
useEffect(() => {
  if (editMode && initialData) {

    const matchedCategory = categories.find(
      (c) =>
        c.id === initialData.category ||
        (initialData.category &&
          c.name.toLowerCase() === initialData.category.toLowerCase())
    );

    reset({
      type: initialData.type ?? "EXPENSE",
      amount: initialData.amount?.toString() ?? "",
      description: initialData.description ?? "",
      accountId: initialData.accountId ?? "",
      category: matchedCategory?.id ?? "",
      date: initialData.date ? new Date(initialData.date) : new Date(),
      isRecurring: initialData.isRecurring ?? false,
      recurringInterval: initialData.recurringInterval ?? undefined,
    });
  } else if (!editMode && lastTransaction) {
    const matchedCategory = categories.find(
      (c) =>
        c.id === lastTransaction.category ||
        (lastTransaction.category &&
          c.name.toLowerCase() === lastTransaction.category.toLowerCase())
    );

    reset({
      type: lastTransaction.type ?? "EXPENSE",
      amount: lastTransaction.amount?.toString() ?? "",
      description: lastTransaction.description ?? "",
      accountId: lastTransaction.accountId ?? "",
      category: matchedCategory?.id ?? "",
      date: new Date(), // fresh date for new transaction
      isRecurring: false,
      recurringInterval: undefined,
    });
  }
}, [editMode, initialData, lastTransaction, categories, reset]);




  const onSubmit = async (data) => {
    try {
      setLoading(true);
      const payload = {
        ...data,
        amount: parseFloat(data.amount),
        recurringInterval:
          data.isRecurring && data.recurringInterval !== ""
            ? data.recurringInterval
            : undefined,
      };

      const result = editMode
        ? await updateTransaction({ id: initialData.id, ...payload })
        : await createTransaction(payload);

      if (result.success) {
        toast.success(editMode ? "Transaction edited!" : "Transaction created!");
        router.push("/dashboard");
      } else {
        toast.error("Something went wrong");
        console.error(result.errors);
      }
    } catch (err) {
      toast.error("Failed to save transaction");
      console.error("Submit error:", err?.message || err);
    } finally {
      setLoading(false);
    }
  };

  const handleScanComplete = (scannedData) => {
    if (!scannedData || loading || hasScanned) return;
    setHasScanned(true);

    setValue("amount", scannedData.amount?.toString() || "");
    setValue("date", new Date(scannedData.date));
    if (scannedData.description)
      setValue("description", scannedData.description);

    if (scannedData.category) {
      const matched = categories.find(
        (c) => c.name.toLowerCase() === scannedData.category.toLowerCase()
      );
      if (matched) setValue("category", matched.id);
    }

    toast.success("Receipt scanned. You can now submit the form.");
  };

  useEffect(() => setHasScanned(false), [editMode, initialData, lastTransaction]);

  return (
    <form
      className="space-y-6 w-full max-w-2xl mx-auto px-4"
      onSubmit={handleSubmit(onSubmit)}
    >
      {loading && <BarLoader color="#9333ea" className="w-full mb-4" />}
      {!editMode && <ReceiptScanner onScanComplete={handleScanComplete} />}

      <pre className="text-red-500 text-xs whitespace-pre-wrap">
        {Object.entries(errors).map(([key, val]) => (
          <div key={key}>
            {key}: {val?.message}
          </div>
        ))}
      </pre>

      {/* Type */}
      <div className="space-y-2 w-full">
        <label className="text-sm font-medium">Type</label>
        <Controller
          name="type"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EXPENSE">Expense</SelectItem>
                <SelectItem value="INCOME">Income</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </div>

      {/* Amount & Account */}
      <div className="grid gap-6 md:grid-cols-2 w-full">
        <div className="space-y-2 w-full">
          <label className="text-sm font-medium">Amount</label>
          <Input
            type="number"
            step="0.01"
            placeholder="0.00"
            className="w-full"
            {...register("amount")}
          />
        </div>

        <div className="space-y-2 w-full">
          <label className="text-sm font-medium">Account</label>
          <Controller
            name="accountId"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accountOptions.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.label}
                    </SelectItem>
                  ))}
                  <div className="p-2 border-t">
                    <CreateAccountDrawer>
                      <Button
                        type="button"
                        variant="ghost"
                        className="w-full justify-start text-sm"
                      >
                        + Create Account
                      </Button>
                    </CreateAccountDrawer>
                  </div>
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      {/* Category */}
      <div className="space-y-2 w-full">
        <label className="text-sm font-medium">Category</label>
        <Controller
          name="category"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select category">
                  {
                    categoryOptions.find((c) => c.id === watchedCategory)
                      ?.label || "Select category"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      {/* Date */}
      <div className="space-y-2 w-full">
        <label className="text-sm font-medium">Date</label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              {watchedDate ? format(watchedDate, "PPP") : "Pick a date"}
              <CalendarHeartIcon className="h-4 w-4 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="p-0 w-full">
            <Controller
              name="date"
              control={control}
              render={({ field }) => (
                <Calendar
                  mode="single"
                  selected={field.value}
                  onSelect={field.onChange}
                  disabled={(d) =>
                    d > new Date() || d < new Date("1900-01-01")
                  }
                />
              )}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Description */}
      <div className="space-y-2 w-full">
        <label className="text-sm font-medium">Description</label>
        <Input
          placeholder="Enter description"
          className="w-full"
          {...register("description")}
        />
      </div>

      {/* Recurring Toggle */}
      <div className="flex items-center justify-between rounded-lg border p-3 w-full">
        <div className="space-y-1">
          <label className="text-sm font-medium">Recurring Transaction</label>
          <p className="text-sm text-muted-foreground">
            Set a recurring schedule
          </p>
        </div>
        <Controller
          name="isRecurring"
          control={control}
          render={({ field }) => (
            <Switch checked={field.value} onCheckedChange={field.onChange} />
          )}
        />
      </div>

      {/* Recurring Interval */}
      {watchedIsRecurring && (
        <div className="space-y-2 w-full">
          <label className="text-sm font-medium">Recurring Interval</label>
          <Controller
            name="recurringInterval"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select interval" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DAILY">Daily</SelectItem>
                  <SelectItem value="WEEKLY">Weekly</SelectItem>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                  <SelectItem value="YEARLY">Yearly</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
      )}

      {/* Buttons */}
      <div className="grid grid-cols-2 gap-4 w-full">
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {editMode ? "Updating..." : "Creating..."}
            </>
          ) : editMode ? "Update Transaction" : "Create Transaction"}
        </Button>
      </div>
    </form>
  );
}
