import React from "react";
import { usePage } from "@inertiajs/react";
import GuardianLayout from "@/Layouts/GuardianLayout";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const formatCurrency = (value) =>
  `₱${Number(value || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function Dashboard() {
  const {
    guardian,
    students = [],
    payments = [],
    schoolYear,
    totalBalance,
    totalContributions: totalContributionsProp,
  } = usePage().props;

  const totalStudents = students.length;
  const totalPayments = payments.reduce(
    (sum, p) => sum + parseFloat(p.amount_paid || 0),
    0
  );
  const totalContributions =
    typeof totalContributionsProp === "number"
      ? totalContributionsProp
      : paymentAndBalanceData.reduce((sum, item) => sum + item.totalPaid, 0);

  const paymentAndBalanceData = students.map((student) => {
    const fallbackPaid = payments
      .filter((payment) => payment.student_id === student.id)
      .reduce((sum, payment) => sum + parseFloat(payment.amount_paid || 0), 0);
    const totalPaid = parseFloat(student.total_paid ?? fallbackPaid ?? 0);

    const remainingBalance =
      parseFloat(student.balance || 0) + parseFloat(student.contribution_balance || 0);

    return {
      name: `${student.first_name || ""} ${student.last_name || ""}`.trim(),
      totalPaid,
      remainingBalance,
    };
  });

  return (
    <GuardianLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div>
              <h1 className="text-3xl font-extrabold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                Dashboard
              </h1>
            </div>
          </div>
        </div>


        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <GuardianMetric label="MY STUDENTS" value={totalStudents} />
          <GuardianMetric label="TOTAL CONTRIBUTIONS" value={formatCurrency(totalContributions)} accent="text-emerald-600" />
          <GuardianMetric label="TOTAL BALANCE" value={formatCurrency(totalBalance)} accent="text-rose-600" />

        </div>

        {/* Charts */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Payments & Balance by Student</h2>
              <p className="text-sm text-slate-500">Blue = total paid · Red = remaining balance</p>
            </div>
          </div>
          <div className="mt-4 h-[440px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={paymentAndBalanceData} margin={{ top: 10, right: 30, left: 0, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fill: "#475569", fontSize: 12 }} tickMargin={10} />
                <YAxis tick={{ fill: "#475569", fontSize: 12 }} allowDecimals={false} tickMargin={6} />
                <Tooltip
                  cursor={{ fill: "rgba(99,102,241,0.05)" }}
                  content={<GuardianChartTooltip />}
                />
                <Bar dataKey="totalPaid" fill="#3b82f6" radius={[8, 8, 0, 0]} name="Total Paid" barSize={48} />
                <Bar
                  dataKey="remainingBalance"
                  fill="#ef4444"
                  radius={[8, 8, 0, 0]}
                  name="Remaining Balance"
                  barSize={48}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </GuardianLayout>
  );
}

const GuardianChartTooltip = ({ active, payload = [], label }) => {
  if (!active || !payload.length) return null;

  const balanceEntry = payload.find((item) => item.dataKey === "remainingBalance");
  const paidEntry = payload.find((item) => item.dataKey === "totalPaid");

  return (
    <div className="min-w-[200px] rounded-xl border border-slate-200 bg-white p-3 shadow">
      <p className="text-sm font-semibold text-slate-900">{label}</p>
      <div className="mt-2 space-y-2 text-sm font-medium">
        {balanceEntry && (
          <div className="flex items-center gap-2 text-rose-600">
            <span className="h-2 w-2 rounded-full bg-rose-500" />
            <span>Remaining Balance: {formatCurrency(balanceEntry.value || 0)}</span>
          </div>
        )}
        {paidEntry && (
          <div className="flex items-center gap-2 text-blue-600">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            <span>Total Paid: {formatCurrency(paidEntry.value || 0)}</span>
          </div>
        )}
      </div>
    </div>
  );
};

const GuardianMetric = ({ label, value, accent = "text-slate-900" }) => (
  <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
    <p className="text-[11px] uppercase tracking-[0.1em] text-slate-400">{label}</p>
    <p className={`text-2xl font-semibold ${accent}`}>{value}</p>
  </div>
);
