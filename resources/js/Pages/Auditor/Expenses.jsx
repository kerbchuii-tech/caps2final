// resources/js/Pages/Auditor/Expenses.jsx
import React, { useEffect, useMemo, useState } from "react";
import { usePage } from "@inertiajs/react";
import AuditorLayout from "@/Layouts/AuditorLayout";

const PAGE_SIZE = 10;

export default function Expenses() {
  const {
    expenses: rawExpenses = [],
    cashDonationsAvailable = 0,
    cashDonationExpenses = 0,
    cashDonationsTotal = 0,
    donorCount = 0,
  } = usePage().props;

  const [activeTab, setActiveTab] = useState("all");
  const [page, setPage] = useState(1);

  const expenses = useMemo(() => {
    if (Array.isArray(rawExpenses)) {
      return rawExpenses;
    }
    if (rawExpenses?.data && Array.isArray(rawExpenses.data)) {
      return rawExpenses.data;
    }
    return [];
  }, [rawExpenses]);

  const totalRecords = expenses.length;

  const fundsExpenses = useMemo(
    () =>
      expenses.filter(
        (expense) =>
          !expense?.donation ||
          (expense.donation?.donation_type || "").toLowerCase() !== "in-kind"
      ),
    [expenses]
  );

  const inKindExpenses = useMemo(
    () =>
      expenses.filter(
        (expense) =>
          (expense?.donation?.donation_type || "").toLowerCase() === "in-kind"
      ),
    [expenses]
  );

  const cashExpensesTotal = useMemo(
    () =>
      fundsExpenses.reduce((total, expense) => {
        const amount = Number(expense?.amount ?? 0);
        return total + (Number.isFinite(amount) ? amount : 0);
      }, 0),
    [fundsExpenses]
  );

  const activeSource = activeTab === "funds" ? fundsExpenses : activeTab === "in-kind" ? inKindExpenses : expenses;

  useEffect(() => {
    setPage(1);
  }, [activeTab]);

  const pageTotal = Math.max(1, Math.ceil(activeSource.length / PAGE_SIZE));
  const paginatedExpenses = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return activeSource.slice(start, start + PAGE_SIZE);
  }, [activeSource, page]);

  useEffect(() => {
    if (page > pageTotal) {
      setPage(pageTotal);
    }
  }, [page, pageTotal]);

  const summaryText = useMemo(() => {
    if (activeSource.length === 0) {
      return "Showing 0 records";
    }
    const start = (page - 1) * PAGE_SIZE + 1;
    const end = Math.min(page * PAGE_SIZE, activeSource.length);
    return `Showing ${start} - ${end} of ${activeSource.length}`;
  }, [activeSource.length, page]);

  const formatCurrency = (value) =>
    `₱ ${Number(value || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const formatDateTime = (dateString) => {
    if (!dateString) return "-";
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) {
      return "-";
    }
    const options = {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    };
    try {
      return new Intl.DateTimeFormat("en-PH", options).format(d);
    } catch (error) {
      return d.toLocaleString("en-PH", options);
    }
  };

  const parseInKindDescription = (description = "") => {
    const quantityMatch = description.match(/\(Qty\s*Used:\s*([0-9]+(?:\.[0-9]+)?)\)/i);
    const estimatedMatch = description.match(/\(Estimated:\s*₱?([0-9]+(?:\.[0-9]+)?)\)/i);
    const cleaned = description
      .replace(/\(Qty\s*Used:[^\)]+\)/i, "")
      .replace(/\(Estimated:[^\)]+\)/i, "")
      .trim();

    return {
      quantity: quantityMatch ? quantityMatch[1] : null,
      estimatedCost: estimatedMatch ? estimatedMatch[1] : null,
      baseDescription: cleaned || (description || "-") || "-",
    };
  };

  return (
    <AuditorLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
            Expenses
          </h1>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Cash Donations Available" value={formatCurrency(cashDonationsAvailable)} accent="bg-blue-50 text-blue-700 border-blue-100" />
          <MetricCard label="Cash Expenses" value={formatCurrency(cashExpensesTotal)} accent="bg-amber-50 text-amber-700 border-amber-100" />
          <MetricCard label="Total Records" value={totalRecords} accent="bg-slate-50 text-slate-700 border-slate-100" />
          <MetricCard label="Total Donors" value={donorCount} accent="bg-purple-50 text-purple-700 border-purple-100" />
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <FilterChip
                label="All"
                active={activeTab === "all"}
                onClick={() => setActiveTab("all")}
              />
              <FilterChip
                label="Funds"
                active={activeTab === "funds"}
                onClick={() => setActiveTab("funds")}
              />
              <FilterChip
                label="In-Kind"
                active={activeTab === "in-kind"}
                onClick={() => setActiveTab("in-kind")}
              />
            </div>
            <p className="text-sm font-medium text-slate-500">{summaryText}</p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.18em] text-slate-500">
                {activeTab === "in-kind" ? (
                  <tr>
                    <th className="px-6 py-3 text-left">Donation Type</th>
                    <th className="px-6 py-3 text-left">Item Type</th>
                    <th className="px-6 py-3 text-left">Expense Category</th>
                    <th className="px-6 py-3 text-left">Expense Date</th>
                    <th className="px-6 py-3 text-left">Used</th>
                    <th className="px-6 py-3 text-left">Expense Description</th>
                  </tr>
                ) : (
                  <tr>
                    <th className="px-6 py-3 text-left">Expense Category</th>
                    <th className="px-6 py-3 text-left">Amount</th>
                    <th className="px-6 py-3 text-left">Expense Date</th>
                    <th className="px-6 py-3 text-left">Contribution / Source</th>
                    <th className="px-6 py-3 text-left">Expense Description</th>
                  </tr>
                )}
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedExpenses.length === 0 && (
                  <tr>
                    <td colSpan={activeTab === "in-kind" ? 6 : 5} className="px-6 py-10 text-center text-slate-400">
                      No expenses found.
                    </td>
                  </tr>
                )}

                {paginatedExpenses.map((expense) => {
                  const isInKind = (expense?.donation?.donation_type || "").toLowerCase() === "in-kind";
                  const dateDisplay = formatDateTime(
                    expense?.expense_timestamp || expense?.created_at || expense?.expense_date
                  );

                  if (activeTab === "in-kind" && isInKind) {
                    const details = parseInKindDescription(expense?.description || "");
                    return (
                      <tr key={expense.id} className="bg-white">
                        <td className="px-6 py-4 font-medium text-slate-900">
                          {expense?.donation?.donation_type || "In-Kind"}
                        </td>
                        <td className="px-6 py-4 text-slate-600">{expense?.donation?.item_type || "-"}</td>
                        <td className="px-6 py-4 text-slate-600">{expense?.expense_type || "-"}</td>
                        <td className="px-6 py-4 text-slate-600">{dateDisplay}</td>
                        <td className="px-6 py-4 text-slate-600">{details.quantity || "-"}</td>
                        <td className="px-6 py-4 text-slate-600">{details.baseDescription}</td>
                      </tr>
                    );
                  }

                  if (activeTab === "in-kind" && !isInKind) {
                    return null;
                  }

                  const source = expense?.contribution?.contribution_type
                    ? expense.contribution.contribution_type
                    : isInKind
                      ? "In-Kind"
                      : "Cash Donations";

                  return (
                    <tr key={expense.id} className="bg-white">
                      <td className="px-6 py-4 font-medium text-slate-900">{expense?.expense_type || "-"}</td>
                      <td className="px-6 py-4 text-slate-600">{formatCurrency(expense?.amount || 0)}</td>
                      <td className="px-6 py-4 text-slate-600">{dateDisplay}</td>
                      <td className="px-6 py-4 text-slate-600">{source}</td>
                      <td className="px-6 py-4 text-slate-600">{expense?.description || "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col items-center gap-2 border-t border-slate-100 px-6 py-4 text-sm text-slate-500">
            <span>{summaryText}</span>
            <div className="flex items-center gap-2">
              <PagerButton disabled={page === 1} onClick={() => setPage((prev) => Math.max(prev - 1, 1))}>
                ‹
              </PagerButton>
              <span className="inline-flex h-9 min-w-[2.5rem] items-center justify-center rounded-full bg-blue-600 px-3 text-sm font-semibold text-white shadow-sm">
                {page}
              </span>
              <PagerButton disabled={page === pageTotal} onClick={() => setPage((prev) => Math.min(prev + 1, pageTotal))}>
                ›
              </PagerButton>
            </div>
          </div>
        </div>
      </div>
    </AuditorLayout>
  );
}

const MetricCard = ({ label, value, accent }) => (
  <div className={`rounded-2xl border bg-white p-5 shadow-sm ${accent}`}>
    <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">{label}</p>
    <p className="mt-2 text-2xl font-semibold">{value}</p>
  </div>
);

const FilterChip = ({ label, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold transition ${
      active
        ? "bg-blue-600 text-white shadow"
        : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
    }`}
  >
    <span>{label}</span>
  </button>
);

const PagerButton = ({ disabled, children, ...rest }) => (
  <button
    type="button"
    disabled={disabled}
    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
    {...rest}
  >
    {children}
  </button>
);
