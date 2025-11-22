import { useEffect, useMemo, useState } from "react";
import { usePage } from "@inertiajs/react";
import GuardianLayout from "@/Layouts/GuardianLayout";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { DollarSign, Folder, Gift, TrendingDown, TrendingUp } from "lucide-react";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const months = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const PAGE_SIZE = 10;

const paginate = (items, page) => {
  const startIndex = (page - 1) * PAGE_SIZE;
  return items.slice(startIndex, startIndex + PAGE_SIZE);
};

const PaginationControls = ({
  currentPage,
  totalPages,
  totalItems,
  label,
  onPageChange,
}) => {
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const endItem = totalItems === 0 ? 0 : Math.min(startItem + PAGE_SIZE - 1, totalItems);
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);

  return (
    <div className="flex flex-col items-center gap-2 px-6 py-4 text-sm text-slate-500">
      <p className="text-center">
        {`Showing ${startItem} to ${endItem} of ${totalItems} ${label}`}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          className="rounded-full border border-slate-200 px-4 py-1.5 font-medium text-slate-600 transition hover:border-blue-400 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
          onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
          disabled={currentPage === 1}
        >
          Previous
        </button>
        {pages.map((page) => (
          <button
            key={page}
            type="button"
            onClick={() => onPageChange(page)}
            aria-current={page === currentPage ? "page" : undefined}
            className={`rounded-full border px-3 py-1.5 font-semibold transition ${
              page === currentPage
                ? "border-blue-600 bg-blue-600 text-white shadow"
                : "border-slate-200 bg-white text-slate-600 hover:border-blue-400 hover:text-blue-600"
            }`}
          >
            {page}
          </button>
        ))}
        <button
          type="button"
          className="rounded-full border border-slate-200 px-4 py-1.5 font-medium text-slate-600 transition hover:border-blue-400 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
          onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
          disabled={currentPage === totalPages}
        >
          Next
        </button>
      </div>
    </div>
  );
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(Number.isFinite(value) ? value : parseFloat(value || 0) || 0);

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const formatDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
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
    return new Intl.DateTimeFormat("en-PH", options).format(date);
  } catch (error) {
    return date.toLocaleString("en-PH", options);
  }
};

const formatShare = (value, total) => {
  if (!total) return "—";
  return `${((value / total) * 100).toFixed(1)}%`;
};

const donationStatusTone = (status = "") => {
  const normalized = status.toLowerCase();
  if (!normalized) return "text-emerald-600";
  if (normalized.includes("unusable")) return "text-rose-600";
  if (normalized.includes("damage")) return "text-amber-600";
  return "text-emerald-600";
};

const donationStatusDot = (status = "") => {
  const normalized = status.toLowerCase();
  if (!normalized) return "bg-emerald-500";
  if (normalized.includes("unusable")) return "bg-rose-500";
  if (normalized.includes("damage")) return "bg-amber-500";
  return "bg-emerald-500";
};

export default function Report() {
  const {
    reports,
    payments: paymentsProp = [],
    donations: donationsProp = [],
    fundsHistories: fundsHistoriesProp = [],
  } = usePage().props;

  const payments = Array.isArray(paymentsProp) ? paymentsProp : [];
  const donations = Array.isArray(donationsProp) ? donationsProp : [];
  const fundsHistories = Array.isArray(fundsHistoriesProp) ? fundsHistoriesProp : [];

  const [activeTab, setActiveTab] = useState("summary");
  const [paymentPage, setPaymentPage] = useState(1);
  const [donationPage, setDonationPage] = useState(1);
  const [fundHistoryPage, setFundHistoryPage] = useState(1);
  const [donationTypeTab, setDonationTypeTab] = useState("cash");
  const [donationSearch, setDonationSearch] = useState("");

  useEffect(() => {
    if (activeTab === "payments") {
      setPaymentPage(1);
    } else if (activeTab === "donations") {
      setDonationPage(1);
    } else if (activeTab === "fundHistory") {
      setFundHistoryPage(1);
    }
  }, [activeTab]);

  useEffect(() => {
    setDonationPage(1);
  }, [donationTypeTab, donationSearch]);

  if (!reports) {
    return (
      <GuardianLayout>
        <div className="p-10 text-center text-gray-500">
          No financial data available.
        </div>
      </GuardianLayout>
    );
  }

  const monthlyCollected = reports?.monthlyCollected ?? Array(12).fill(0);
  const monthlyExpenses = reports?.monthlyExpenses ?? Array(12).fill(0);
  const monthlyAvailable =
    reports?.monthlyAvailable ??
    monthlyCollected.map((value, index) => value - (monthlyExpenses[index] ?? 0));

  const totals = useMemo(() => {
    const payTotal = payments.reduce(
      (sum, item) => sum + parseFloat(item.amount_paid ?? item.amountPaid ?? 0),
      0
    );
    const donationCash = donations
      .filter((item) => (item.donation_type ?? "").toLowerCase() !== "in-kind")
      .reduce((sum, item) => sum + parseFloat(item.donation_amount ?? 0), 0);
    const donationInKind = donations
      .filter((item) => (item.donation_type ?? "").toLowerCase() === "in-kind")
      .reduce((sum, item) => sum + parseFloat(item.donation_amount ?? 0), 0);
    const expenseTotal = fundsHistories
      .filter((item) => !item.payment_id && !item.donation_id)
      .reduce((sum, item) => sum + parseFloat(item.amount ?? 0), 0);

    return {
      payments: payTotal,
      donations: donationCash,
      inKind: donationInKind,
      expenses: expenseTotal,
      available: payTotal + donationCash - expenseTotal,
    };
  }, [payments, donations, fundsHistories]);

  const paymentsTotalPages = Math.max(1, Math.ceil(payments.length / PAGE_SIZE));
  const paginatedPayments = useMemo(
    () => paginate(payments, paymentPage),
    [payments, paymentPage]
  );

  const filteredDonations = useMemo(() => {
    const tabIsInKind = donationTypeTab === "in-kind";
    const base = donations.filter((item) => {
      const type = (item.donation_type ?? "").toLowerCase();
      return tabIsInKind ? type === "in-kind" : type !== "in-kind";
    });

    const searchTerm = donationSearch.trim().toLowerCase();
    if (!searchTerm) return base;

    return base.filter((item) => {
      const fields = [
        item.donated_by,
        item.donation_type,
        item.donation_description,
        item.received_by,
        item.item_type,
        item.usage_status,
        item.usage_notes,
        item.donation_date,
        item.donation_amount,
      ];
      return fields.some((field) =>
        String(field ?? "").toLowerCase().includes(searchTerm)
      );
    });
  }, [donations, donationSearch, donationTypeTab]);

  const donationsTotalPages = Math.max(
    1,
    Math.ceil(filteredDonations.length / PAGE_SIZE)
  );
  const paginatedDonations = useMemo(
    () => paginate(filteredDonations, donationPage),
    [filteredDonations, donationPage]
  );

  const fundsBreakdown = useMemo(() => {
    let running = 0;
    const totalsAcc = {
      payments: 0,
      donations: 0,
      inKind: 0,
      expenses: 0,
      endingFund: 0,
    };

    const rows = fundsHistories.map((entry, index) => {
      const amount = parseFloat(entry.amount ?? 0);
      const isPayment = Boolean(entry.payment_id);
      const isDonation = Boolean(entry.donation_id);
      const donationType = (entry.donation_type ?? "").toLowerCase();
      const isInKind = isDonation && donationType === "in-kind";
      const isExpense = Boolean(entry.expense_id) || (!isPayment && !isDonation);

      const payment = isPayment ? amount : 0;
      const donation = isDonation && !isInKind ? amount : 0;
      const inKind = isInKind ? amount : 0;
      const expense = isExpense ? amount : 0;

      const before =
        entry.balance_before !== undefined && entry.balance_before !== null
          ? parseFloat(entry.balance_before)
          : running;
      const after =
        entry.balance_after !== undefined && entry.balance_after !== null
          ? parseFloat(entry.balance_after)
          : before + payment + donation - expense;

      running = after;

      totalsAcc.payments += payment;
      totalsAcc.donations += donation;
      totalsAcc.inKind += inKind;
      totalsAcc.expenses += expense;
      totalsAcc.endingFund = after;

      return {
        key: entry.id ?? index,
        fundDate: entry.fund_date,
        fundTimestamp: entry.fund_timestamp,
        payment,
        donation,
        inKind,
        expense,
        fundBefore: before,
        fundAfter: after,
        details: {
          description: entry.fund_description,
          donor: entry.donated_by,
          donationType: entry.donation_type,
          student: entry.student_name,
          expenseType: entry.expense_type,
        },
        nature: isPayment ? "payment" : isDonation ? "donation" : "expense",
      };
    });

    return { rows, totals: totalsAcc };
  }, [fundsHistories]);

  const fundHistoryTotalPages = Math.max(
    1,
    Math.ceil(fundsBreakdown.rows.length / PAGE_SIZE)
  );
  const paginatedFundHistory = useMemo(
    () => paginate(fundsBreakdown.rows, fundHistoryPage),
    [fundsBreakdown.rows, fundHistoryPage]
  );

  useEffect(() => {
    setPaymentPage((prev) => Math.min(prev, paymentsTotalPages));
  }, [paymentsTotalPages]);

  useEffect(() => {
    setDonationPage((prev) => Math.min(prev, donationsTotalPages));
  }, [donationsTotalPages]);

  useEffect(() => {
    setFundHistoryPage((prev) => Math.min(prev, fundHistoryTotalPages));
  }, [fundHistoryTotalPages]);

  const expenseBreakdown = useMemo(() => {
    const grouped = new Map();
    let total = 0;

    fundsHistories.forEach((entry) => {
      const amount = parseFloat(entry.amount ?? 0);
      const isPayment = Boolean(entry.payment_id);
      const isDonation = Boolean(entry.donation_id);
      const isExpense = Boolean(entry.expense_id) || (!isPayment && !isDonation);

      if (!isExpense || !Number.isFinite(amount) || amount <= 0) return;

      const key = (entry.expense_type ?? "Uncategorized").trim() || "Uncategorized";
      grouped.set(key, (grouped.get(key) ?? 0) + amount);
      total += amount;
    });

    const items = Array.from(grouped.entries())
      .map(([label, amount]) => ({ label, amount }))
      .sort((a, b) => b.amount - a.amount);

    return { items, total };
  }, [fundsHistories]);

  const sourceBreakdown = useMemo(() => {
    const items = [
      {
        label: "Student Contributions",
        amount: totals.payments,
        description: "Payments recorded from guardians and students.",
      },
      {
        label: "Cash Donations",
        amount: totals.donations,
        description: "Monetary donations received by the school.",
      },
    ];

    if (totals.inKind > 0) {
      items.push({
        label: "In-Kind Donations (Assessed Value)",
        amount: totals.inKind,
        description: "Goods and services donated, converted to their peso value.",
      });
    }

    const total = items.reduce((sum, item) => sum + item.amount, 0);

    return { items, total };
  }, [totals.payments, totals.donations, totals.inKind]);

  const summaryData = {
    totalCollected: reports.totalCollected ?? totals.payments + totals.donations,
    totalAvailable: reports.totalAvailable ?? totals.available,
    totalExpenses: reports.totalExpenses ?? totals.expenses,
    totalPayments: totals.payments,
    totalCashDonations: totals.donations,
  };

  const monthlySummary = useMemo(() => {
    const starting =
      fundsBreakdown.rows.length > 0 && Number.isFinite(fundsBreakdown.rows[0].fundBefore)
        ? fundsBreakdown.rows[0].fundBefore
        : 0;

    let running = starting;
    let totalCollected = 0;
    let totalExpenses = 0;

    const rows = months.map((label, index) => {
      const collected = Number(monthlyCollected[index] ?? 0) || 0;
      const expenses = Number(monthlyExpenses[index] ?? 0) || 0;
      const net = collected - expenses;

      totalCollected += collected;
      totalExpenses += expenses;
      running += net;

      return {
        label,
        collected,
        expenses,
        net,
        ending: running,
      };
    });

    const visibleRows = rows.filter(
      (row, index) => row.collected || row.expenses || index === rows.length - 1
    );

    return {
      starting,
      rows: visibleRows,
      totals: {
        collected: totalCollected,
        expenses: totalExpenses,
        net: totalCollected - totalExpenses,
        ending: running,
      },
    };
  }, [fundsBreakdown, monthlyCollected, monthlyExpenses]);

  const chartData = useMemo(
    () => ({
      labels: months,
      datasets: [
        {
          label: "Collected Funds (₱)",
          data: monthlyCollected,
          backgroundColor: "#2563EB",
          borderRadius: 6,
        },
        {
          label: "Total Expenses (₱)",
          data: monthlyExpenses,
          backgroundColor: "#EF4444",
          borderRadius: 6,
        },
        {
          label: "Available Funds (₱)",
          data: monthlyAvailable,
          backgroundColor: "#10B981",
          borderRadius: 6,
        },
      ],
    }),
    [monthlyCollected, monthlyExpenses, monthlyAvailable]
  );

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "top",
          labels: {
            font: { size: 12 },
          },
        },
        tooltip: {
          callbacks: {
            label: (context) => `₱${Number(context.raw ?? 0).toLocaleString()}`,
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            color: "#374151",
          },
          grid: {
            color: "#E5E7EB",
          },
        },
        x: {
          ticks: {
            color: "#374151",
          },
          grid: {
            display: false,
          },
        },
      },
    }),
    []
  );

  const tabItems = [
    { id: "summary", label: "Summary" },
    { id: "payments", label: "Payments" },
    { id: "donations", label: "Donations" },
    { id: "fundHistory", label: "Fund History" },
  ];

  return (
    <GuardianLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div>
              <h1 className="text-3xl font-extrabold mb-6 bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                Reports
              </h1>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {tabItems.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                  activeTab === tab.id
                    ? "border border-blue-600 bg-white text-blue-600 shadow"
                    : "text-slate-500 hover:text-blue-600"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === "summary" && (
          <div className="space-y-8">
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  label: "Total Payments",
                  value: formatCurrency(summaryData.totalPayments),
                  icon: <DollarSign className="text-blue-600" size={24} />,
                  gradient: "from-blue-50 to-blue-100 text-blue-800",
                },
                {
                  label: "Cash Donations",
                  value: formatCurrency(summaryData.totalCashDonations),
                  icon: <Gift className="text-purple-600" size={24} />,
                  gradient: "from-purple-50 to-purple-100 text-purple-800",
                },
                {
                  label: "Total Expenses",
                  value: `-${formatCurrency(summaryData.totalExpenses)}`,
                  icon: <TrendingDown className="text-red-600" size={24} />,
                  gradient: "from-red-50 to-red-100 text-red-800",
                },
                {
                  label: "Available Funds",
                  value: formatCurrency(summaryData.totalAvailable),
                  icon: <TrendingUp className="text-green-600" size={24} />,
                  gradient: "from-green-50 to-green-100 text-green-800",
                },
              ].map((card) => (
                <div
                  key={card.label}
                  className={`flex flex-col gap-2 rounded-[24px] border border-white/70 bg-gradient-to-tr p-6 shadow-sm ${card.gradient}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.1em] text-slate-400">{card.label}</p>
                      <p className="text-3xl font-extrabold">{card.value}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="h-full rounded-[28px] border border-slate-100 bg-white/95 p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-gray-700">
                  Monthly Funds Overview
                </h2>
                <div className="h-72">
                  <Bar data={chartData} options={chartOptions} />
                </div>
              </div>

              <div className="rounded-[28px] border border-slate-100 bg-white/95 p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-gray-700">
                  Income Statement Snapshot
                </h2>
                <table className="w-full text-sm text-gray-700">
                  <tbody>
                    <tr>
                      <td className="py-2">Payments (Contributions)</td>
                      <td className="py-2 text-right font-semibold text-blue-600">
                        {formatCurrency(summaryData.totalPayments)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2">Cash Donations</td>
                      <td className="py-2 text-right font-semibold text-purple-600">
                        {formatCurrency(summaryData.totalCashDonations)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2">Total Income</td>
                      <td className="py-2 text-right font-semibold">
                        {formatCurrency(
                          summaryData.totalPayments + summaryData.totalCashDonations
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 text-red-600">Less: Expenses</td>
                      <td className="py-2 text-right font-semibold text-red-600">
                        -{formatCurrency(summaryData.totalExpenses)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 font-bold">Net Funds Available</td>
                      <td
                        className={`py-2 text-right font-bold ${
                          summaryData.totalAvailable >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {formatCurrency(summaryData.totalAvailable)}
                      </td>
                    </tr>
                    {totals.inKind > 0 && (
                      <tr>
                        <td className="py-2 text-sm text-gray-500">In-Kind Donations</td>
                        <td className="py-2 text-right text-sm text-gray-500">
                          {formatCurrency(totals.inKind)}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-[28px] border border-slate-100 bg-white/95 p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-700">Sources of Funds</h2>
                <p className="mb-4 text-xs text-gray-500">
                  Breakdown of where the money was collected from during the period.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-gray-700">
                    <thead className="bg-gray-100 text-xs uppercase text-gray-500">
                      <tr>
                        <th className="px-5 py-3 text-left">Source</th>
                        <th className="px-5 py-3 text-right">Amount</th>
                        <th className="px-5 py-3 text-right">Share</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sourceBreakdown.items.map((item) => (
                        <tr key={item.label} className="odd:bg-gray-50/60 hover:bg-gray-50">
                          <td className="px-5 py-3">
                            <p className="font-medium text-gray-700">{item.label}</p>
                            {item.description && (
                              <p className="text-xs text-gray-500">{item.description}</p>
                            )}
                          </td>
                          <td className="px-5 py-3 text-right font-semibold text-blue-700">
                            {formatCurrency(item.amount)}
                          </td>
                          <td className="px-5 py-3 text-right text-gray-500">
                            {formatShare(item.amount, sourceBreakdown.total)}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-gray-100 font-semibold text-gray-700">
                        <td className="px-5 py-3 text-right">Total Funds Received</td>
                        <td className="px-5 py-3 text-right text-blue-700">
                          {formatCurrency(sourceBreakdown.total)}
                        </td>
                        <td className="px-5 py-3 text-right text-gray-500">
                          {sourceBreakdown.total ? "100%" : "—"}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-[28px] border border-slate-100 bg-white/95 p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-700">Funds Utilization</h2>
                <p className="mb-4 text-xs text-gray-500">
                  Expenses grouped by purpose to highlight where the funds were used.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-gray-700">
                    <thead className="bg-gray-100 text-xs uppercase text-gray-500">
                      <tr>
                        <th className="px-5 py-3 text-left">Expense Type</th>
                        <th className="px-5 py-3 text-right">Amount</th>
                        <th className="px-5 py-3 text-right">Share</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenseBreakdown.items.length > 0 ? (
                        <>
                          {expenseBreakdown.items.map((item) => (
                            <tr
                              key={item.label}
                              className="odd:bg-gray-50/60 hover:bg-gray-50"
                            >
                              <td className="px-5 py-3 font-medium text-gray-700">
                                {item.label}
                              </td>
                              <td className="px-5 py-3 text-right font-semibold text-red-700">
                                {formatCurrency(item.amount)}
                              </td>
                              <td className="px-5 py-3 text-right text-gray-500">
                                {formatShare(item.amount, expenseBreakdown.total)}
                              </td>
                            </tr>
                          ))}
                          <tr className="bg-gray-100 font-semibold text-gray-700">
                            <td className="px-5 py-3 text-right">Total Expenses</td>
                            <td className="px-5 py-3 text-right text-red-700">
                              {formatCurrency(expenseBreakdown.total)}
                            </td>
                            <td className="px-5 py-3 text-right text-gray-500">
                              {expenseBreakdown.total ? "100%" : "—"}
                            </td>
                          </tr>
                        </>
                      ) : (
                        <tr>
                          <td
                            colSpan={3}
                            className="px-5 py-6 text-center text-sm text-gray-400"
                          >
                            No expense records available yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-100 bg-white/95 shadow-sm">
              <div className="border-b border-slate-100 bg-slate-50 px-6 py-4 rounded-t-[28px]">
                <h2 className="text-lg font-semibold text-gray-700">
                  Monthly Collective Summary
                </h2>
                <p className="text-xs text-gray-500">
                  Running overview of money collected, used, and the remaining fund per month.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-gray-700">
                  <thead className="bg-gray-100 text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-5 py-3 text-left">Month</th>
                      <th className="px-5 py-3 text-right">Collected</th>
                      <th className="px-5 py-3 text-right">Expenses</th>
                      <th className="px-5 py-3 text-right">Net Change</th>
                      <th className="px-5 py-3 text-right">Ending Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-gray-50 text-gray-500">
                      <td className="px-5 py-3 font-medium">Starting Balance</td>
                      <td className="px-5 py-3 text-right">—</td>
                      <td className="px-5 py-3 text-right">—</td>
                      <td className="px-5 py-3 text-right">—</td>
                      <td className="px-5 py-3 text-right font-semibold text-gray-700">
                        {formatCurrency(monthlySummary.starting)}
                      </td>
                    </tr>
                    {monthlySummary.rows.length > 0 ? (
                      <>
                        {monthlySummary.rows.map((row) => (
                          <tr
                            key={row.label}
                            className="odd:bg-gray-50/60 hover:bg-gray-50"
                          >
                            <td className="px-5 py-3 font-medium text-gray-700">
                              {row.label}
                            </td>
                            <td className="px-5 py-3 text-right text-blue-700">
                              {row.collected ? formatCurrency(row.collected) : "—"}
                            </td>
                            <td className="px-5 py-3 text-right text-red-700">
                              {row.expenses ? formatCurrency(row.expenses) : "—"}
                            </td>
                            <td
                              className={`px-5 py-3 text-right font-semibold ${
                                row.net >= 0 ? "text-green-600" : "text-red-600"
                              }`}
                            >
                              {row.net ? formatCurrency(row.net) : formatCurrency(0)}
                            </td>
                            <td className="px-5 py-3 text-right font-semibold text-gray-700">
                              {formatCurrency(row.ending)}
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-gray-100 font-semibold text-gray-700">
                          <td className="px-5 py-3 text-right">Totals</td>
                          <td className="px-5 py-3 text-right text-blue-700">
                            {formatCurrency(monthlySummary.totals.collected)}
                          </td>
                          <td className="px-5 py-3 text-right text-red-700">
                            {formatCurrency(monthlySummary.totals.expenses)}
                          </td>
                          <td
                            className={`px-5 py-3 text-right ${
                              monthlySummary.totals.net >= 0
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {formatCurrency(monthlySummary.totals.net)}
                          </td>
                          <td className="px-5 py-3 text-right font-semibold text-gray-700">
                            {formatCurrency(monthlySummary.totals.ending)}
                          </td>
                        </tr>
                      </>
                    ) : (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-5 py-6 text-center text-sm text-gray-400"
                        >
                          No monthly activity recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "payments" && (
          <div className="rounded-[28px] border border-slate-100 bg-white/95 shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50 px-6 py-4 rounded-t-[28px]">
              <h2 className="text-lg font-semibold text-gray-700">Payment Records</h2>
              <p className="text-xs text-gray-500">
                Detailed list of all contributions recorded by the treasurer.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-gray-700">
                <thead className="bg-gray-100 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-5 py-3 text-left">Student</th>
                    <th className="px-5 py-3 text-left">Contribution</th>
                    <th className="px-5 py-3 text-right">Amount</th>
                    <th className="px-5 py-3 text-left">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.length > 0 ? (
                    paginatedPayments.map((payment) => (
                      <tr key={payment.id} className="odd:bg-gray-50/60 hover:bg-gray-50">
                        <td className="px-5 py-3">{payment.student_name ?? "—"}</td>
                        <td className="px-5 py-3">
                          {payment.contribution_name ?? "N/A"}
                        </td>
                        <td className="px-5 py-3 text-right font-semibold text-blue-700">
                          {formatCurrency(parseFloat(payment.amount_paid ?? 0))}
                        </td>
                        <td className="px-5 py-3">
                          {formatDateTime(payment.payment_date)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-5 py-6 text-center text-sm text-gray-400"
                      >
                        No payment records available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <PaginationControls
              currentPage={paymentPage}
              totalPages={paymentsTotalPages}
              totalItems={payments.length}
              label="payments"
              onPageChange={setPaymentPage}
            />
          </div>
        )}

        {activeTab === "donations" && (
          <div className="rounded-[28px] border border-slate-100 bg-white/95 shadow-sm">
            <div className="flex flex-wrap gap-4 items-center px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-white/40 rounded-t-[28px]">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
                  Donations
                </p>
                <h2 className="text-2xl font-semibold text-slate-900">
                  Guardian Donation Records
                </h2>
                <p className="text-xs text-slate-500">
                  Toggle between cash and in-kind donations, with smart search.
                </p>
              </div>
              <div className="ml-auto flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center rounded-full border border-slate-200 bg-white/80 p-1 shadow-sm">
                  {[
                    { key: "cash", label: "Cash" },
                    { key: "in-kind", label: "In-Kind" },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setDonationTypeTab(tab.key)}
                      className={`px-4 py-1.5 text-sm font-semibold rounded-full transition ${
                        donationTypeTab === tab.key
                          ? "bg-blue-600 text-white shadow"
                          : "text-slate-500 hover:text-blue-600"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
                <div className="relative w-full md:w-72">
                  <input
                    type="text"
                    value={donationSearch}
                    onChange={(e) => setDonationSearch(e.target.value)}
                    placeholder="Search donor, type, amount..."
                    className="w-full rounded-full border border-slate-200 bg-white py-2 pl-4 pr-4 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-gray-700">
                <thead className="bg-gray-100 text-xs uppercase text-gray-500">
                  {donationTypeTab === "in-kind" ? (
                    <tr>
                      <th className="px-5 py-3 text-left">Date</th>
                      <th className="px-5 py-3 text-left">Donated By</th>
                      <th className="px-5 py-3 text-left">Item Type</th>
                      <th className="px-5 py-3 text-left">Description</th>
                      <th className="px-5 py-3 text-center">Quantity Used</th>
                      <th className="px-5 py-3 text-center">Qty Remaining</th>
                      <th className="px-5 py-3 text-left">Status & Notes</th>
                      <th className="px-5 py-3 text-left">Received By</th>
                    </tr>
                  ) : (
                    <tr>
                      <th className="px-5 py-3 text-left">Date</th>
                      <th className="px-5 py-3 text-left">Donated By</th>
                      <th className="px-5 py-3 text-left">Amount</th>
                      <th className="px-5 py-3 text-left">Description</th>
                      <th className="px-5 py-3 text-left">Received By</th>
                    </tr>
                  )}
                </thead>
                <tbody>
                  {filteredDonations.length > 0 ? (
                    paginatedDonations.map((donation) => {
                      if (donationTypeTab === "in-kind") {
                        const status = donation.usage_status || "Available";
                        const usedQty = Number(donation.used_quantity ?? 0);
                        const totalQty = Number(donation.donation_quantity ?? 0);
                        const damagedQty = Number(donation.damaged_quantity ?? 0);
                        const unusableQty = Number(donation.unusable_quantity ?? 0);
                        const usableQty = Number(donation.usable_quantity ?? Math.max(totalQty - usedQty - damagedQty - unusableQty, 0));
                        const computedRemaining = usableQty || Math.max(totalQty - usedQty - damagedQty - unusableQty, 0);
                        return (
                          <tr
                            key={donation.id}
                            className="odd:bg-gray-50/60 hover:bg-gray-50"
                          >
                            <td className="px-5 py-3">
                              {formatDateTime(
                                donation.donation_timestamp || donation.donation_date
                              )}
                            </td>
                            <td className="px-5 py-3 font-medium text-gray-900">
                              {donation.donated_by ?? "—"}
                            </td>
                            <td className="px-5 py-3">
                              {donation.item_type ?? "—"}
                            </td>
                            <td className="px-5 py-3">
                              {donation.donation_description ?? "—"}
                            </td>
                            <td className="px-5 py-3 text-center text-amber-600 font-semibold">
                              {Number.isNaN(usedQty) ? "—" : usedQty}
                            </td>
                            <td className="px-5 py-3 text-center text-emerald-600 font-semibold">
                              {Number.isNaN(computedRemaining) ? "—" : computedRemaining}
                            </td>
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2">
                                <span className={`inline-flex h-2.5 w-2.5 rounded-full ${donationStatusDot(status)}`} aria-hidden />
                                <p className={`text-sm font-semibold ${donationStatusTone(status)}`}>
                                  {status}
                                </p>
                              </div>
                              <div className="mt-2 text-xs text-gray-500 space-y-0.5">
                                <p><span className="font-semibold text-emerald-600">Usable:</span> {Number.isNaN(usableQty) ? "—" : usableQty}</p>
                                <p><span className="font-semibold text-amber-600">Damaged:</span> {Number.isNaN(damagedQty) ? "—" : damagedQty}</p>
                                <p><span className="font-semibold text-rose-600">Unusable:</span> {Number.isNaN(unusableQty) ? "—" : unusableQty}</p>
                              </div>
                              {donation.usage_notes && (
                                <p className="text-xs text-gray-400 mt-1 italic">
                                  {donation.usage_notes}
                                </p>
                              )}
                            </td>
                            <td className="px-5 py-3">
                              {donation.received_by ?? "—"}
                            </td>
                          </tr>
                        );
                      }

                      return (
                        <tr
                          key={donation.id}
                          className="odd:bg-gray-50/60 hover:bg-gray-50"
                        >
                          <td className="px-5 py-3">
                            {formatDateTime(
                              donation.donation_timestamp || donation.donation_date
                            )}
                          </td>
                          <td className="px-5 py-3 font-medium text-gray-900">
                            {donation.donated_by ?? "—"}
                          </td>
                          <td className="px-5 py-3 font-semibold text-purple-700">
                            {formatCurrency(parseFloat(donation.donation_amount ?? 0))}
                          </td>
                          <td className="px-5 py-3">
                            {donation.donation_description ?? "—"}
                          </td>
                          <td className="px-5 py-3">
                            {donation.received_by ?? "—"}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan={donationTypeTab === "in-kind" ? 10 : 5}
                        className="px-5 py-6 text-center text-sm text-gray-400"
                      >
                        {donationSearch
                          ? "No donations match your search."
                          : donationTypeTab === "cash"
                          ? "No cash donations found."
                          : "No in-kind donations found."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <PaginationControls
              currentPage={donationPage}
              totalPages={donationsTotalPages}
              totalItems={filteredDonations.length}
              label="donations"
              onPageChange={setDonationPage}
            />
          </div>
        )}

        {activeTab === "fundHistory" && (
          <div className="rounded-[28px] border border-slate-100 bg-white/95 shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50 px-6 py-4 rounded-t-[28px]">
              <h2 className="text-lg font-semibold text-gray-700">Fund History</h2>
              <p className="text-xs text-gray-500">
                Running fund balance based on payments, donations, and expenses.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-gray-700">
                <thead className="bg-gray-100 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-5 py-3 text-left">Date</th>
                    <th className="px-5 py-3 text-right">Payments</th>
                    <th className="px-5 py-3 text-right">Donations</th>
                    <th className="px-5 py-3 text-right">Expenses</th>
                    <th className="px-5 py-3 text-right">Balance Before</th>
                    <th className="px-5 py-3 text-right">Balance After</th>
                    <th className="px-5 py-3 text-left">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {fundsBreakdown.rows.length > 0 ? (
                    <>
                      {paginatedFundHistory.map((row) => (
                        <tr key={row.key} className="odd:bg-gray-50/60 hover:bg-gray-50">
                          <td className="px-5 py-3">
                            {formatDateTime(row.fundTimestamp || row.fundDate)}
                          </td>
                          <td className="px-5 py-3 text-right text-blue-700">
                            {row.payment ? formatCurrency(row.payment) : "—"}
                          </td>
                          <td className="px-5 py-3 text-right text-purple-700">
                            {row.donation ? formatCurrency(row.donation) : "—"}
                            {row.inKind
                              ? ` + ${formatCurrency(row.inKind)} (In-Kind)`
                              : ""}
                          </td>
                          <td className="px-5 py-3 text-right text-red-700">
                            {row.expense ? formatCurrency(row.expense) : "—"}
                          </td>
                          <td className="px-5 py-3 text-right">
                            {formatCurrency(row.fundBefore)}
                          </td>
                          <td className="px-5 py-3 text-right">
                            {formatCurrency(row.fundAfter)}
                          </td>
                          <td className="px-5 py-3">
                            {row.nature === "payment" && (
                              <div>
                                <p className="font-semibold text-blue-600">Payment</p>
                                {row.details.student && (
                                  <p className="text-xs text-gray-500">
                                    Student: {row.details.student}
                                  </p>
                                )}
                              </div>
                            )}
                            {row.nature === "donation" && (
                              <div>
                                <p className="font-semibold text-purple-600">
                                  Donation
                                  {row.inKind ? " (In-Kind)" : " (Cash)"}
                                </p>
                                {row.details.donor && (
                                  <p className="text-xs text-gray-500">
                                    Donor: {row.details.donor}
                                  </p>
                                )}
                                {row.details.description && (
                                  <p className="text-xs text-gray-500">
                                    {row.details.description}
                                  </p>
                                )}
                              </div>
                            )}
                            {row.nature === "expense" && (
                              <div>
                                <p className="font-semibold text-red-600">Expense</p>
                                {row.details.expenseType && (
                                  <p className="text-xs text-gray-500">
                                    {row.details.expenseType}
                                  </p>
                                )}
                                {row.details.description && (
                                  <p className="text-xs text-gray-500">
                                    {row.details.description}
                                  </p>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-gray-100 font-semibold">
                        <td className="px-5 py-3 text-right">Total</td>
                        <td className="px-5 py-3 text-right text-blue-700">
                          {formatCurrency(fundsBreakdown.totals.payments)}
                        </td>
                        <td className="px-5 py-3 text-right text-purple-700">
                          {formatCurrency(fundsBreakdown.totals.donations)}
                          {fundsBreakdown.totals.inKind
                            ? ` + ${formatCurrency(fundsBreakdown.totals.inKind)} (In-Kind)`
                            : ""}
                        </td>
                        <td className="px-5 py-3 text-right text-red-700">
                          {formatCurrency(fundsBreakdown.totals.expenses)}
                        </td>
                        <td className="px-5 py-3 text-right">
                          {formatCurrency(
                            fundsBreakdown.totals.payments + fundsBreakdown.totals.donations
                          )}
                        </td>
                        <td className="px-5 py-3 text-right">
                          {formatCurrency(fundsBreakdown.totals.endingFund)}
                        </td>
                        <td />
                      </tr>
                    </>
                  ) : (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-5 py-6 text-center text-sm text-gray-400"
                      >
                        No fund history records available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <PaginationControls
              currentPage={fundHistoryPage}
              totalPages={fundHistoryTotalPages}
              totalItems={fundsBreakdown.rows.length}
              label="fund history records"
              onPageChange={setFundHistoryPage}
            />
          </div>
        )}
      </div>
    </GuardianLayout>
  );
}
