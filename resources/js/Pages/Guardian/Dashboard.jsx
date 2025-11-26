import React from "react";
import { Head, usePage } from "@inertiajs/react";
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
import {
  FaChild,
  FaUserShield,
  FaMoneyBillWave,
  FaReceipt,
  FaBell,
  FaChartLine,
  FaUsers,
} from "react-icons/fa";

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

  const totalContributions =
    typeof totalContributionsProp === "number"
      ? totalContributionsProp
      : paymentAndBalanceData.reduce((sum, item) => sum + item.totalPaid, 0);

  const heroBadges = [
    {
      icon: <FaMoneyBillWave />,
      label: "Contributions",
      value: formatCurrency(totalContributions),
      tone: "emerald",
    },
    {
      icon: <FaReceipt />,
      label: "Balance",
      value: formatCurrency(totalBalance),
      tone: "rose",
    },
    {
      icon: <FaChild />,
      label: "Students",
      value: totalStudents.toLocaleString(),
      tone: "sky",
    },
  ];

  const summaryCards = [
    {
      icon: <FaUserShield />,
      label: "Guardian",
      value: guardian?.first_name ? `${guardian.first_name} ${guardian.last_name ?? ""}`.trim() : guardian?.name ?? "N/A",
      subtext: schoolYear ? `SY ${schoolYear.start_date?.slice(0, 4)}-${schoolYear.end_date?.slice(0, 4)}` : "No school year",
    },
    {
      icon: <FaUsers />,
      label: "Linked Students",
      value: totalStudents.toLocaleString(),
      subtext: "Monitored in this account",
      accent: "from-sky-500/20 to-sky-600/25",
    },
    {
      icon: <FaMoneyBillWave />,
      label: "Total Paid",
      value: formatCurrency(totalContributions),
      subtext: "Across all dependents",
      accent: "from-emerald-500/20 to-emerald-600/25",
    },
    {
      icon: <FaReceipt />,
      label: "Remaining Balance",
      value: formatCurrency(totalBalance),
      subtext: "Still due",
      accent: "from-rose-500/20 to-rose-600/25",
    },
  ];

  const notices = guardian?.notifications ?? [];

  return (
    <GuardianLayout>
      <Head title="Guardian Dashboard" />
      <div className="space-y-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 via-indigo-700 to-emerald-500 p-6 sm:p-8 text-white shadow-xl">
          <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.65),transparent_55%)]" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.35em] text-white/80">Guardian Overview</p>
              <h1 className="text-3xl sm:text-4xl font-black leading-tight">
                Family Contributions & Balances
              </h1>
              <p className="max-w-2xl text-sm sm:text-base text-white/80">
                Track everything your students have paid, see what’s outstanding, and stay aligned with the modern admin and treasurer dashboards.
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              {heroBadges.map((badge) => (
                <HeroBadge key={badge.label} {...badge} />
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <InfoCard key={card.label} {...card} />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[3fr,2fr]">
          <SectionCard
            icon={<FaChartLine className="text-sky-500" />}
            title="Payments & Balances"
            description="Blue = total paid · Red = remaining balance"
          >
            {paymentAndBalanceData.length === 0 ? (
              <EmptyState message="Wala pay naka-enroll nga estudyante para motrack sa contributions." />
            ) : (
              <div className="mt-4 h-[380px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={paymentAndBalanceData} margin={{ top: 10, right: 30, left: 0, bottom: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.7} />
                    <XAxis dataKey="name" tick={{ fill: "#475569", fontSize: 12 }} tickMargin={10} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#475569", fontSize: 12 }} allowDecimals={false} tickMargin={6} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: "rgba(99,102,241,0.05)" }} content={<GuardianChartTooltip />} />
                    <Bar dataKey="totalPaid" fill="#3b82f6" radius={[12, 12, 0, 0]} name="Total Paid" maxBarSize={48} />
                    <Bar dataKey="remainingBalance" fill="#ef4444" radius={[12, 12, 0, 0]} name="Remaining Balance" maxBarSize={48} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </SectionCard>

          <SectionCard
            icon={<FaBell className="text-amber-500" />}
            title="Latest Announcements"
            description="Stay updated with reminders from the school."
            className="flex flex-col"
          >
            {Array.isArray(notices) && notices.length > 0 ? (
              <ul className="mt-4 space-y-3">
                {notices.slice(0, 4).map((notice) => (
                  <li
                    key={notice.id}
                    className="rounded-2xl border border-white/50 bg-white/80 p-4 text-sm shadow-sm backdrop-blur transition hover:border-blue-200"
                  >
                    <p className="font-semibold text-slate-800">{notice.title || notice.message || "Announcement"}</p>
                    <p className="text-xs text-slate-500">
                      {notice.created_at ? new Date(notice.created_at).toLocaleDateString("en-PH", { month: "short", day: "numeric" }) : ""}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState message="Wala pay bagong announcements karon." />
            )}
            <div className="mt-6 rounded-2xl border border-dashed border-blue-200/70 bg-white/60 p-4 text-xs text-slate-500">
              Tip: Mo-sync ni nga alerts kung nag log-in ka sa treasurer/admin dashboards para consistent ang info nimo.
            </div>
          </SectionCard>
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

const InfoCard = ({ icon, label, value, subtext, accent = "from-blue-500/20 to-blue-600/25" }) => (
  <div className="relative overflow-hidden rounded-3xl border border-white/50 bg-white/80 p-5 shadow-lg backdrop-blur-sm transition hover:shadow-xl">
    <div className={`absolute inset-0 bg-gradient-to-br ${accent} opacity-90`} />
    <div className="relative flex items-start gap-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/80 text-2xl text-blue-600 shadow-inner">
        {icon}
      </div>
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <h2 className="text-xl font-semibold text-slate-900">{value}</h2>
        {subtext && <p className="text-xs text-slate-500/90">{subtext}</p>}
      </div>
    </div>
  </div>
);

const SectionCard = ({ icon, title, description, children, className = "" }) => (
  <div className={`relative overflow-hidden rounded-3xl border border-blue-100/80 bg-white/90 p-6 shadow-lg shadow-blue-500/5 backdrop-blur ${className}`}>
    <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.15),transparent_60%)]" />
    <div className="flex items-start gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 text-lg">
        {icon}
      </div>
      <div className="flex-1">
        <div className="flex flex-col gap-1">
          <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
          {description && <p className="text-sm text-slate-500">{description}</p>}
        </div>
        {children}
      </div>
    </div>
  </div>
);

const HeroBadge = ({ icon, label, value, tone = "sky" }) => {
  const toneMap = {
    emerald: "from-emerald-400/20 via-emerald-500/20 to-emerald-600/30 text-emerald-100",
    rose: "from-rose-400/20 via-rose-500/20 to-rose-600/30 text-rose-100",
    sky: "from-sky-400/20 via-sky-500/20 to-sky-600/30 text-sky-100",
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

const EmptyState = ({ message }) => (
  <div className="mt-4 rounded-2xl border border-dashed border-blue-200/70 bg-white/60 p-6 text-center text-sm text-slate-500">
    {message}
  </div>
);
