import React, { useEffect, useMemo, useState } from "react";
import { usePage } from "@inertiajs/react";
import TreasurerLayout from "@/Layouts/TreasurerLayout";
import { CreditCard, Gift, TrendingDown, Wallet } from "lucide-react";

export default function FundsHistory() {
  const { fundsHistories = [], totals = {} } = usePage().props;

  const formatCurrency = (value) =>
    `₱${parseFloat(value || 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const formatQuantity = (value) => {
    if (value === null || value === undefined) return "0";
    const num = Number(value);
    if (Number.isNaN(num)) return String(value);
    const options = Number.isInteger(num)
      ? { minimumFractionDigits: 0, maximumFractionDigits: 0 }
      : { minimumFractionDigits: 2, maximumFractionDigits: 2 };
    return num.toLocaleString("en-PH", options);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-PH", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  // Sort ascending (oldest first, so new entries go to the bottom)
  const sortedHistories = useMemo(() => {
    return [...fundsHistories].sort((a, b) => {
      const dateA = new Date(a.fund_date);
      const dateB = new Date(b.fund_date);
      if (dateA > dateB) return 1;
      if (dateA < dateB) return -1;
      return (a.id || 0) - (b.id || 0);
    });
  }, [fundsHistories]);

  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    setPage(1);
  }, [search, activeTab]);

  const searchedHistories = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return sortedHistories;
    return sortedHistories.filter((history) => {
      const composed = [
        history.fund_date,
        history.fund_description,
        history.donation_type,
        history.amount,
      ]
        .join(" ")
        .toLowerCase();
      return composed.includes(term);
    });
  }, [sortedHistories, search]);

  const tabFilteredHistories = useMemo(() => {
    if (activeTab === "payments") {
      return searchedHistories.filter((history) => history.payment_id);
    }
    if (activeTab === "donations") {
      return searchedHistories.filter((history) => history.donation_id);
    }
    return searchedHistories;
  }, [searchedHistories, activeTab]);

  const filteredTotals = useMemo(() => {
    return tabFilteredHistories.reduce(
      (acc, history) => {
        const amount = parseFloat(history.amount || 0) || 0;
        if (history.payment_id) {
          acc.payments += amount;
        } else if (history.donation_id) {
          if (history.donation_type === "in-kind") {
            acc.inKind += amount;
          } else {
            acc.donations += amount;
          }
        } else {
          acc.expenses += amount;
        }
        return acc;
      },
      { payments: 0, donations: 0, expenses: 0, inKind: 0 }
    );
  }, [tabFilteredHistories]);

  const totalRows = tabFilteredHistories.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));

  const paginatedHistories = useMemo(() => {
    const start = (page - 1) * pageSize;
    return tabFilteredHistories.slice(start, start + pageSize);
  }, [tabFilteredHistories, page]);

  const showingStart = totalRows === 0 ? 0 : (page - 1) * pageSize + 1;
  const showingEnd = Math.min(page * pageSize, totalRows);

  const gotoPage = (target) => {
    const clamped = Math.min(Math.max(target, 1), totalPages);
    if (clamped !== page) setPage(clamped);
  };

  const getDetailsBadge = (history) => {
    if (history.payment_id)
      return (
        <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-medium">
          Payment
        </span>
      );

    if (history.donation_id) {
      return (
        <span
          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${history.donation_type === "in-kind"
              ? "bg-green-50 text-green-700"
              : "bg-purple-50 text-purple-700"
            }`}
        >
          Donation {history.donation_type === "in-kind" ? "In-Kind" : "Cash"}
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 px-3 py-1 rounded-full text-xs font-medium">
        Expense
      </span>
    );
  };

  return (
    <TreasurerLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
              Treasurer Funds History</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-1 xl:grid-cols-4">
          <MetricCard label="Total Payments" value={formatCurrency(totals.payments)} icon={<CreditCard className="w-5 h-5" />} accent="text-blue-600" />
          <MetricCard label="Total Donations (Cash)" value={formatCurrency(totals.donations)} icon={<Gift className="w-5 h-5" />} accent="text-purple-600" helper={`In-Kind: ${totals.inKind} items`} />
          <MetricCard label="Total Expenses" value={`-${formatCurrency(totals.expenses)}`} icon={<TrendingDown className="w-5 h-5" />} accent="text-rose-600" />
          <MetricCard label="Available Funds" value={formatCurrency(totals.available)} icon={<Wallet className="w-5 h-5" />} accent="text-emerald-600" />
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Transaction History</p>
              </div>
              <div className="relative w-full sm:w-80">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search date, detail, or amount..."
                  className="w-full rounded-2xl border border-slate-200 pl-10 pr-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { id: "all", label: "All" },
                { id: "payments", label: "Payments" },
                { id: "donations", label: "Donations" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${activeTab === tab.id
                      ? "border border-blue-600 bg-blue-50 text-blue-600 shadow"
                      : "text-slate-500 hover:text-blue-600"
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-700">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.2em] text-slate-500">
                <tr>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3 text-right">Payments</th>
                  <th className="px-5 py-3 text-right">Donations</th>
                  <th className="px-5 py-3 text-right">Expenses</th>
                  <th className="px-5 py-3 text-right">Funds Before</th>
                  <th className="px-5 py-3 text-right">Funds After</th>
                  <th className="px-5 py-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedHistories.length > 0 ? (
                  paginatedHistories.map((history, idx) => {
                    const payment = history.payment_id
                      ? parseFloat(history.amount)
                      : 0;
                    const donation =
                      history.donation_id &&
                        history.donation_type !== "in-kind"
                        ? parseFloat(history.amount)
                        : 0;
                    const inKindDonation =
                      history.donation_id &&
                        history.donation_type === "in-kind"
                        ? parseFloat(history.amount)
                        : 0;
                    const expense =
                      !history.payment_id && !history.donation_id
                        ? parseFloat(history.amount)
                        : 0;
                    const expenseUsesInKind = history.expense_in_kind;
                    const inKindUsed = expenseUsesInKind
                      ? formatQuantity(
                        history.expense_in_kind_used ?? history.amount ?? 0
                      )
                      : null;

                    return (
                      <tr
                        key={`${history.id || idx}-${page}`}
                        className="transition hover:bg-blue-50/60"
                      >
                        <td className="px-5 py-3 font-medium text-gray-800">
                          {formatDate(history.timestamp || history.fund_date)}
                        </td>
                        <td className="px-5 py-3 text-right text-blue-700 font-semibold">
                          {payment ? formatCurrency(payment) : "—"}
                        </td>
                        <td className="px-5 py-3 text-right text-purple-700 font-semibold">
                          {donation
                            ? formatCurrency(donation)
                            : inKindDonation
                              ? formatCurrency(inKindDonation) + " (In-Kind)"
                              : expenseUsesInKind
                                ? "In-Kind"
                                : "—"}
                        </td>
                        <td className="px-5 py-3 text-right text-red-700 font-semibold">
                          {expense ? formatCurrency(expense) : "—"}
                        </td>
                        <td className="px-5 py-3 text-right">
                          {formatCurrency(history.balance_before)}
                        </td>
                        <td className="px-5 py-3 text-right">
                          {formatCurrency(history.balance_after)}
                        </td>
                        <td className="px-5 py-3">
                          {getDetailsBadge(history)}
                          {history.donation_id && (
                            <p className="text-xs text-gray-500 mt-1">
                              Donated By:{" "}
                              <span className="font-medium">
                                {history.fund_description.replace(
                                  /Donation from\s*/,
                                  ""
                                )}
                              </span>
                            </p>
                          )}
                          {expenseUsesInKind && (
                            <div className="text-xs text-gray-600 mt-1 space-y-1">
                              {history.expense_in_kind_item_type && (
                                <p>
                                  <span className="font-semibold">Item Type:</span> {history.expense_in_kind_item_type}
                                </p>
                              )}
                              <p>
                                <span className="font-semibold">Used:</span> {inKindUsed}
                              </p>
                              {history.expense_description && (
                                <p>
                                  <span className="font-semibold">Expense Description:</span> {history.expense_description}
                                </p>
                              )}
                              {(history.expense_in_kind_donor || history.expense_in_kind_notes) && (
                                <p className="text-gray-500">
                                  {history.expense_in_kind_donor && `From ${history.expense_in_kind_donor}`}
                                  {history.expense_in_kind_notes
                                    ? `${history.expense_in_kind_donor ? ' – ' : ''}${history.expense_in_kind_notes}`
                                    : ""}
                                </p>
                              )}
                            </div>
                          )}
                          {!expenseUsesInKind && history.expense_source_label && (
                            <div className="text-xs text-gray-600 mt-1">
                              {history.expense_source_type === "contribution" ? (
                                <p>
                                  <span className="font-semibold">Contribution:</span> {history.expense_source_label}
                                </p>
                              ) : (
                                <p>{history.expense_source_label}</p>
                              )}
                            </div>
                          )}
                          {/* Removed Expense For section */}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan="7"
                      className="px-5 py-10 text-center text-gray-500"
                    >
                      No fund history available.
                    </td>
                  </tr>
                )}
              </tbody>
              {totalRows > 0 && (
                <tfoot className="bg-slate-50 font-semibold text-slate-700 border-t">
                  <tr>
                    <td className="px-5 py-3">Total</td>
                    <td className="px-5 py-3 text-right text-blue-700">
                      {formatCurrency(filteredTotals.payments)}
                    </td>
                    <td className="px-5 py-3 text-right text-purple-700">
                      {formatCurrency(filteredTotals.donations)}{" "}
                      <span className="text-xs text-slate-400">(+ {formatQuantity(filteredTotals.inKind)} in-kind)</span>
                    </td>
                    <td className="px-5 py-3 text-right text-red-700">
                      {formatCurrency(filteredTotals.expenses)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {formatCurrency(totals.payments + totals.donations)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {formatCurrency(totals.available)}
                    </td>
                    <td className="px-5 py-3" />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          <div className="flex flex-col items-center gap-2 border-t border-slate-100 px-6 py-4 text-sm text-slate-500">
            <span>
              Showing {showingStart} to {showingEnd} of {totalRows} record{totalRows === 1 ? "" : "s"}
            </span>
            <div className="flex items-center gap-2">
              <PagerButton disabled={page === 1} onClick={() => gotoPage(page - 1)}>
                ‹
              </PagerButton>
              <span className="inline-flex h-9 min-w-[2.5rem] items-center justify-center rounded-full bg-blue-600 px-3 text-sm font-semibold text-white shadow-sm">
                {page}
              </span>
              <PagerButton disabled={page === totalPages} onClick={() => gotoPage(page + 1)}>
                ›
              </PagerButton>
            </div>
          </div>
        </div>
      </div>
    </TreasurerLayout>
  );
}

const MetricCard = ({ label, value, icon, helper, accent = "text-slate-900" }) => (
  <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
    <div className="flex items-center gap-3">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-50 text-slate-500">{icon}</span>
      <div>
        <p className="text-[11px] uppercase tracking-[0.25em] text-slate-400">{label}</p>
        <p className={`text-xl font-semibold ${accent}`}>{value}</p>
        {helper && <p className="text-[11px] text-slate-400">{helper}</p>}
      </div>
    </div>
  </div>
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
