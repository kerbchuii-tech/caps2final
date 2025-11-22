import React from "react";
import { usePage } from "@inertiajs/react";
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

  const summaryCards = [
    {
      label: "Total Payments",
      value: formatCurrency(totals.payments),
      helper: "Collective students contribution",
      chip: "Paid",
      border: "border-blue-300",
      background: "bg-white",
      accent: "text-blue-600",
      subtleText: "text-slate-500",
      mutedText: "text-slate-400",
      chipClass: "bg-blue-50 text-blue-600",
      Icon: Wallet,
      iconClasses: "bg-blue-50 text-blue-600",
    },
    {
      label: "Cash Donations",
      value: formatCurrency(totals.donationsCash),
      helper: "Monetary gifts",
      chip: "Cash only",
      border: "border-sky-300",
      background: "bg-white",
      accent: "text-slate-900",
      subtleText: "text-slate-500",
      mutedText: "text-slate-400",
      chipClass: "bg-blue-50 text-blue-600",
      Icon: HandCoins,
      iconClasses: "bg-blue-50 text-blue-600",
    },
    {
      label: "In-Kind Donations",
      value: formatCurrency(totals.donationsInKind),
      helper: "Supplies",
      chip: "Supplies",
      border: "border-fuchsia-300",
      background: "bg-white",
      accent: "text-slate-900",
      subtleText: "text-slate-500",
      mutedText: "text-slate-400",
      chipClass: "bg-fuchsia-50 text-fuchsia-600",
      Icon: Gift,
      iconClasses: "bg-fuchsia-50 text-fuchsia-600",
    },
    {
      label: "Total Collected",
      value: formatCurrency(totalCollected),
      helper: "Payments + cash donations",
      chip: "Growth",
      border: "border-emerald-300",
      background: "bg-white",
      accent: "text-emerald-600",
      subtleText: "text-slate-500",
      mutedText: "text-slate-400",
      chipClass: "bg-emerald-50 text-emerald-600",
      Icon: PiggyBank,
      iconClasses: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "Total Expenses",
      value: formatCurrency(totals.expenses),
      helper: "Verified expenses",
      chip: "Outgoing",
      border: "border-rose-300",
      background: "bg-white",
      accent: "text-rose-600",
      subtleText: "text-slate-500",
      mutedText: "text-slate-400",
      chipClass: "bg-rose-50 text-rose-600",
      Icon: Receipt,
      iconClasses: "bg-rose-50 text-rose-600",
    },
    {
      label: "Available Funds",
      value: formatCurrency(availableFunds),
      helper: "Ready for allocation",
      chip: "Balance",
      border: "border-emerald-300",
      background: "bg-white",
      accent: availableFunds >= 0 ? "text-emerald-600" : "text-rose-600",
      subtleText: "text-slate-500",
      mutedText: "text-slate-400",
      chipClass: "bg-emerald-50 text-emerald-600",
      Icon: Coins,
      iconClasses: "bg-emerald-50 text-emerald-600",
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

  return (
    <AuditorLayout>
      <div className="space-y-6">
        <section className="rounded-3xl border border-indigo-100 bg-white p-8 text-slate-900 shadow-sm">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <h1 className="text-3xl font-extrabold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                Dashboard</h1>
              <div className="flex flex-wrap gap-3 text-sm text-slate-600">
                <span className="rounded-full border border-slate-200 px-3 py-1 bg-slate-50">
                  Active SY: {schoolYear ? schoolYear?.name : "None"}
                </span>
                <span className="rounded-full border border-slate-200 px-3 py-1 bg-slate-50">
                  Available Funds: {formatCurrency(availableFunds)}
                </span>
              </div>
            </div>  
          </div>
        </section>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {summaryCards.map((card) => (
            <StatCard key={card.label} {...card} />
          ))}
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Monthly Funds</p>
              <h2 className="text-xl font-semibold text-slate-900">Expenses vs. Total Collected vs. Available Funds</h2>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" tick={{ fill: "#94a3b8", fontSize: 12 }} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  borderRadius: "14px",
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 15px 45px rgba(15,23,42,0.08)",
                }}
                formatter={(value, name) => `₱${value.toLocaleString()} (${name === "collected" ? "Total Collected" : name === "available" ? "Available" : "Expenses"})`}
              />
              <Bar dataKey="expenses" name="Expenses" fill="#f97316" radius={[6, 6, 0, 0]} />
              <Bar dataKey="collected" name="Total Collected" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              <Bar dataKey="available" name="Available Funds" fill="#22c55e" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </AuditorLayout>
  );
}

const StatCard = ({
  label,
  value,
  helper,
  chip,
  Icon,
  accent = "text-slate-900",
  border = "border-slate-100",
  background = "bg-white",
  subtleText = "text-slate-500",
  mutedText = "text-slate-400",
  chipClass = "bg-slate-100 text-slate-600",
  iconClasses = "bg-slate-100 text-slate-600",
}) => (
  <div className={`rounded-2xl border ${border} ${background} p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md`}>
    <div className="flex items-center justify-between gap-3">
      <p className={`text-[11px] font-semibold uppercase tracking-[0.25em] ${mutedText}`}>{label}</p>
      {Icon && (
        <div className={`h-10 w-10 rounded-2xl flex items-center justify-center ${iconClasses}`}>
          <Icon className="h-5 w-5" />
        </div>
      )}
    </div>
    <p className={`text-2xl font-semibold mt-2 ${accent}`}>{value}</p>
    {chip && <span className={`mt-2 inline-flex items-center rounded-full px-3 py-1 text-[11px] font-medium ${chipClass}`}>{chip}</span>}
    {helper && <p className={`text-xs mt-3 ${subtleText}`}>{helper}</p>}
  </div>
);
