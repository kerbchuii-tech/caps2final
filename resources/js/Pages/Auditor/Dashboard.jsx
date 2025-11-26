import React from "react";
import { Head, usePage } from "@inertiajs/react";
import AuditorLayout from "@/Layouts/AuditorLayout";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  Wallet,
  PiggyBank,
  HandCoins,
  Gift,
  Receipt,
  Coins,
} from "lucide-react";

export default function Dashboard() {
  const {
    auditor,
    expenses = [],
    payments = [],
    donations = [],
    schoolYear,
    totals = {},
  } = usePage().props;

  const safeNumber = (value) => Number(value ?? 0);
  const formatCurrency = (value) =>
    `₱${safeNumber(value).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  // Total summaries
  const totalExpenses = expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
  const totalPayments = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

  const totalCollected = safeNumber(totals.payments) + safeNumber(totals.donationsCash);
  const availableFunds = totals.availableFunds ?? totalCollected - safeNumber(totals.expenses);

  const heroBadges = [
    {
      icon: <PiggyBank className="h-4 w-4" />,
      label: "Total Collected",
      value: formatCurrency(totalCollected),
      tone: "sky",
    },
    {
      icon: <Coins className="h-4 w-4" />,
      label: "Available Funds",
      value: formatCurrency(availableFunds),
      tone: "emerald",
    },
    {
      icon: <Receipt className="h-4 w-4" />,
      label: "Expenses",
      value: formatCurrency(totals.expenses),
      tone: "rose",
    },
  ];

  const summaryCards = [
    {
      icon: <Wallet className="h-5 w-5" />,
      label: "Total Payments",
      value: formatCurrency(totals.payments),
      subtext: "Collective student contributions",
      accent: "from-blue-500/20 to-blue-600/25",
    },
    {
      icon: <HandCoins className="h-5 w-5" />,
      label: "Cash Donations",
      value: formatCurrency(totals.donationsCash),
      subtext: "Monetary gifts",
      accent: "from-sky-500/20 to-sky-600/25",
    },
    {
      icon: <Gift className="h-5 w-5" />,
      label: "In-Kind Donations",
      value: formatCurrency(totals.donationsInKind),
      subtext: "Supplies & goods",
      accent: "from-fuchsia-500/20 to-fuchsia-600/25",
    },
    {
      icon: <Receipt className="h-5 w-5" />,
      label: "Total Expenses",
      value: formatCurrency(totals.expenses),
      subtext: "Audited disbursements",
      accent: "from-rose-500/20 to-rose-600/25",
    },
    {
      icon: <PiggyBank className="h-5 w-5" />,
      label: "Overall Funds",
      value: formatCurrency(totals.overall),
      subtext: "Payments + donations",
      accent: "from-indigo-500/20 to-indigo-600/25",
    },
    {
      icon: <Coins className="h-5 w-5" />,
      label: "Available Today",
      value: formatCurrency(availableFunds),
      subtext: "Ready for allocation",
      accent: "from-emerald-500/20 to-emerald-600/25",
    },
  ];

  const schoolYearStartMonth = 8; // September
  const months = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(2000, (schoolYearStartMonth + i) % 12);
    months.push(d.toLocaleString("default", { month: "long" }));
  }

  const groupByMonth = (data, amountKey = "amount", dateKey = "created_at") => {
    const grouped = {};
    data.forEach((item) => {
      const rawDate = item[dateKey] ?? item.created_at;
      if (!rawDate) return;
      const date = new Date(rawDate);
      if (Number.isNaN(date.getTime())) return;
      const monthName = date.toLocaleString("default", { month: "long" });
      if (!grouped[monthName]) grouped[monthName] = 0;
      grouped[monthName] += parseFloat(item[amountKey] || 0);
    });
    return months.map((m) => ({ month: m, value: grouped[m] || 0 }));
  };

  const expenseData = groupByMonth(expenses, "amount", "created_at");
  const paymentData = groupByMonth(payments, "amount", "created_at");
  const cashDonations = donations.filter(
    (donation) => (donation.donation_type || "").toLowerCase() !== "in-kind"
  );
  const donationData = groupByMonth(cashDonations, "donation_amount", "donation_date");

  const chartData = months.map((month, index) => {
    const monthlyExpenses = expenseData[index].value;
    const monthlyCollected = paymentData[index].value + donationData[index].value;
    const monthlyAvailable = monthlyCollected - monthlyExpenses;

    return {
      month,
      expenses: monthlyExpenses,
      collected: monthlyCollected,
      available: monthlyAvailable,
    };
  });

  const recentPayments = payments.slice(0, 5);
  const recentExpenses = expenses.slice(0, 5);

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <AuditorLayout>
      <Head title="Auditor Dashboard" />
      <div className="space-y-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 via-indigo-700 to-emerald-500 p-6 sm:p-8 text-white shadow-xl">
          <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.65),transparent_55%)]" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.35em] text-white/80">Auditor Overview</p>
              <h1 className="text-3xl sm:text-4xl font-black leading-tight">Funds Integrity & Compliance</h1>
              <p className="max-w-2xl text-sm sm:text-base text-white/80">
                Monitor collections, donations, and verified expenses to keep ledgers aligned with the admin, treasurer, and guardian dashboards.
              </p>
              <div className="flex flex-wrap gap-3 text-xs text-white/80">
                <span className="rounded-full border border-white/30 px-3 py-1">
                  Active SY: {schoolYear?.name ?? "None"}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-4">
              {heroBadges.map((badge) => (
                <HeroBadge key={badge.label} {...badge} />
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {summaryCards.map((card) => (
            <InfoCard key={card.label} {...card} />
          ))}
        </div>

        <SectionCard
          title="Monthly Funds Movement"
          description="Expenses vs. total collected vs. available funds"
        >
          <div className="mt-6 h-[360px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                <XAxis dataKey="month" stroke="#94a3b8" tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: "16px",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 20px 40px rgba(15,23,42,0.12)",
                  }}
                  formatter={(value, name) => [formatCurrency(value), name]}
                />
                <Bar dataKey="expenses" name="Expenses" fill="#f97316" radius={[12, 12, 0, 0]} />
                <Bar dataKey="collected" name="Total Collected" fill="#3b82f6" radius={[12, 12, 0, 0]} />
                <Bar dataKey="available" name="Available" fill="#22c55e" radius={[12, 12, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <SectionCard title="Recent Payments" description="Latest deposits from treasurer ledgers.">
            {recentPayments.length === 0 ? (
              <EmptyState message="No payment activity yet." />
            ) : (
              <RecordList
                records={recentPayments.map((payment) => ({
                  id: payment.id,
                  name: payment.description || payment.reference || "Payment",
                  amount: formatCurrency(payment.amount || payment.amount_paid || 0),
                  date: formatDate(payment.created_at || payment.payment_date),
                }))}
              />
            )}
          </SectionCard>

          <SectionCard title="Recent Expenses" description="Recently audited disbursements.">
            {recentExpenses.length === 0 ? (
              <EmptyState message="No expenses logged." />
            ) : (
              <RecordList
                records={recentExpenses.map((expense) => ({
                  id: expense.id,
                  name: expense.description || "Expense",
                  amount: formatCurrency(expense.amount || 0),
                  date: formatDate(expense.created_at || expense.expense_date),
                }))}
              />
            )}
          </SectionCard>
        </div>
      </div>
    </AuditorLayout>
  );
}

const InfoCard = ({ icon, label, value, subtext, accent = "from-blue-500/20 to-blue-600/25" }) => (
  <div className="relative overflow-hidden rounded-3xl border border-white/50 bg-white/80 p-5 shadow-lg backdrop-blur-sm transition hover:shadow-xl">
    <div className={`absolute inset-0 bg-gradient-to-br ${accent} opacity-90`} />
    <div className="relative flex items-start gap-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/80 text-blue-600 shadow-inner">
        {icon}
      </div>
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <h2 className="text-2xl font-semibold text-slate-900">{value}</h2>
        {subtext && <p className="text-xs text-slate-500/90">{subtext}</p>}
      </div>
    </div>
  </div>
);

const SectionCard = ({ title, description, children }) => (
  <div className="relative overflow-hidden rounded-3xl border border-blue-100/80 bg-white/90 p-6 shadow-lg shadow-blue-500/5 backdrop-blur">
    <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.1),transparent_60%)]" />
    <div className="flex flex-col gap-1 border-b border-blue-50 pb-4">
      <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
      {description && <p className="text-sm text-slate-500">{description}</p>}
    </div>
    {children}
  </div>
);

const HeroBadge = ({ icon, label, value, tone = "sky" }) => {
  const toneMap = {
    sky: "from-sky-400/20 via-sky-500/20 to-sky-600/30 text-sky-100",
    emerald: "from-emerald-400/20 via-emerald-500/20 to-emerald-600/30 text-emerald-100",
    rose: "from-rose-400/20 via-rose-500/20 to-rose-600/30 text-rose-100",
  };

  return (
    <div className={`flex min-w-[160px] flex-col gap-1 rounded-3xl border border-white/40 bg-gradient-to-tr ${toneMap[tone] ?? toneMap.sky} px-4 py-3 shadow-lg backdrop-blur`}>
      <span className="text-xs uppercase tracking-wide text-white/70">{label}</span>
      <div className="flex items-center gap-2 text-lg font-semibold">
        <span className="text-white/90">{value}</span>
        <span className="text-white/70 text-base">{icon}</span>
      </div>
    </div>
  );
};

const RecordList = ({ records = [] }) => (
  <ul className="mt-4 divide-y divide-blue-50 rounded-2xl border border-blue-50 bg-white/80">
    {records.map((record) => (
      <li key={record.id || record.name} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
        <div>
          <p className="font-semibold text-slate-800">{record.name}</p>
          <p className="text-xs text-slate-500">{record.date}</p>
        </div>
        <span className="text-sm font-semibold text-slate-900">{record.amount}</span>
      </li>
    ))}
  </ul>
);

const EmptyState = ({ message }) => (
  <div className="mt-4 rounded-2xl border border-dashed border-blue-200/70 bg-white/60 p-6 text-center text-sm text-slate-500">
    {message}
  </div>
);
