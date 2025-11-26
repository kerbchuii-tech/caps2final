import React from "react";
import TreasurerLayout from "@/Layouts/TreasurerLayout";
import { Head, usePage } from "@inertiajs/react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  FaUsers,
  FaUserCheck,
  FaUserClock,
  FaMoneyBillWave,
  FaCoins,
  FaClipboardList,
  FaChartPie,
} from "react-icons/fa";

export default function Dashboard() {
  const {
    summary,
    students = [],
    payments = [],
    schoolYearContributions = [],
    guardians = [],
    contributions = [],
    totalCollected = 0,
    totalOutstandingBalance = 0,
  } = usePage().props;

  // -------------------------
  // Helpers
  // -------------------------
  const formatCurrency = (value) => {
    const n = Number(value || 0);
    return n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
  const getAllowedContributionsForStudent = (student) => {
    if (!student) return [];

    const guardianStudents = students.filter(
      (s) => s.guardian_id === student.guardian_id
    );
    const firstStudent = guardianStudents[0];

    return Array.from(
      new Map(
        schoolYearContributions
          .filter((syc) => syc.grade_level_id === student.grade_level_id)
          .filter((syc) => {
            if (student.id === firstStudent.id) return true;
            return syc.contribution.mandatory === 1;
          })
          .map((syc) => [syc.contribution.id, syc.contribution])
      ).values()
    );


  };

  const getEffectiveContributionAmount = (student, contribution) => {
    const guardianStudents = students.filter(
      (s) => s.guardian_id === student.guardian_id
    );
    const firstStudent = guardianStudents[0];


    if (student.id !== firstStudent.id && contribution.mandatory !== 1) {
      return contribution.amount * 0.5;
    }

    return contribution.amount;


  };

  const computeStudentTotalBalance = (student) => {
    if (!student) return 0;


    const allowedContributions = getAllowedContributionsForStudent(student);

    return allowedContributions.reduce((total, c) => {
      const totalPaid = payments
        .filter(
          (p) => p.student_id === student.id && p.contribution_id === c.id
        )
        .reduce((sum, p) => sum + parseFloat(p.amount_paid), 0);

      const effectiveAmount = getEffectiveContributionAmount(student, c);

      return total + (effectiveAmount - totalPaid);
    }, 0);


  };

  const computeStudentTotalPaid = (student) => {
    if (!student) return 0;


    return payments
      .filter((p) => p.student_id === student.id)
      .reduce((sum, p) => sum + parseFloat(p.amount_paid), 0);


  };

  // -------------------------
  // Dashboard totals
  // -------------------------
  const totalStudents = students.length;

  const fullPaidStudents = students.filter(
    (s) => computeStudentTotalBalance(s) <= 0
  ).length;

  const notPaidStudents = totalStudents - fullPaidStudents;
  const clearanceRate = totalStudents
    ? Math.round((fullPaidStudents / totalStudents) * 100)
    : 0;

  const heroBadges = [
    {
      icon: <FaMoneyBillWave />,
      label: "Total Collected",
      value: `₱ ${formatCurrency(totalCollected)}`,
      tone: "emerald",
    },
    {
      icon: <FaCoins />,
      label: "Outstanding",
      value: `₱ ${formatCurrency(totalOutstandingBalance)}`,
      tone: "rose",
    },
    {
      icon: <FaUsers />,
      label: "Students",
      value: totalStudents.toLocaleString(),
      tone: "sky",
    },
  ];

  const summaryCards = [
    {
      icon: <FaUsers />,
      label: "Students Tracked",
      value: totalStudents.toLocaleString(),
      subtext: "Active school year",
      accent: "from-sky-500/20 to-sky-600/25",
    },
    {
      icon: <FaUserCheck />,
      label: "Fully Paid",
      value: fullPaidStudents.toLocaleString(),
      subtext: "Cleared balances",
      accent: "from-emerald-500/20 to-emerald-600/25",
    },
    {
      icon: <FaUserClock />,
      label: "Needs Attention",
      value: notPaidStudents.toLocaleString(),
      subtext: "Unpaid or partial",
      accent: "from-amber-500/20 to-amber-600/25",
    },
    {
      icon: <FaMoneyBillWave />,
      label: "Payments Logged",
      value: (summary?.payments_count ?? payments.length).toLocaleString(),
      subtext: "Recorded remittances",
      accent: "from-indigo-500/20 to-indigo-600/25",
    },
  ];

  const opsSnapshot = [
    {
      icon: <FaClipboardList className="text-blue-500" />,
      label: "Contributions",
      value: (summary?.contributions_count ?? contributions.length).toLocaleString(),
      helper: "Configured for the year",
    },
    {
      icon: <FaUsers className="text-emerald-500" />,
      label: "Guardians",
      value: guardians.length.toLocaleString(),
      helper: "Linked to students",
    },
    {
      icon: <FaChartPie className="text-amber-500" />,
      label: "Average Balance",
      value:
        totalStudents === 0
          ? "₱ 0.00"
          : `₱ ${formatCurrency(totalOutstandingBalance / totalStudents)}`,
      helper: "Per student",
    },
  ];

  // -------------------------
  // Per Grade Level Stats (fixed from Grade 7 - 12)
  // -------------------------
  const gradeLevels = [
    "Grade 7",
    "Grade 8",
    "Grade 9",
    "Grade 10",
    "Grade 11",
    "Grade 12",
  ];

  const gradeStats = gradeLevels.map((grade) => {
    const gradeStudents = students.filter(
      (s) => s.grade_level?.name === grade
    );


    let fullPaid = 0;
    let partial = 0;
    let unpaid = 0;

    gradeStudents.forEach((s) => {
      const balance = computeStudentTotalBalance(s);
      const totalPaid = computeStudentTotalPaid(s);

      if (balance <= 0) {
        fullPaid++;
      } else if (totalPaid > 0) {
        partial++;
      } else {
        unpaid++;
      }
    });

    return { grade, fullPaid, partial, unpaid };


  });

  return (
    <TreasurerLayout>
      <Head title="Treasurer Dashboard" />
      <div className="space-y-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 via-sky-700 to-emerald-500 p-6 sm:p-8 text-white shadow-xl">
          <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.65),transparent_55%)]" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.35em] text-white/80">Treasurer Overview</p>
              <h1 className="text-3xl sm:text-4xl font-black leading-tight">Cash Flow & Collection Health</h1>
              <p className="max-w-2xl text-sm sm:text-base text-white/80">
                Monitor student balances, understand outstanding dues, and keep your collection momentum aligned with the admin dashboard aesthetics.
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
            icon={<FaChartPie className="text-sky-500" />}
            title="Grade-Level Breakdown"
            description="Fully paid, partial, and unpaid students across the high school levels."
          >
            {students.length === 0 ? (
              <EmptyState message="No students found for the active school year." />
            ) : (
              <>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-blue-100/70 bg-white/80 p-4 text-sm shadow-sm">
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Clearance Rate</p>
                    <p className="text-3xl font-semibold text-slate-900">{clearanceRate}%</p>
                    <p className="text-xs text-slate-500">{fullPaidStudents.toLocaleString()} students cleared</p>
                    <div className="mt-3 h-2.5 rounded-full bg-slate-200/80">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500"
                        style={{ width: `${clearanceRate}%` }}
                      />
                    </div>
                  </div>
                  <div className="rounded-2xl border border-blue-100/70 bg-white/80 p-4 text-sm shadow-sm">
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Outstanding Balance</p>
                    <p className="text-3xl font-semibold text-rose-600">₱ {formatCurrency(totalOutstandingBalance)}</p>
                    <p className="text-xs text-slate-500">Across all grade levels</p>
                  </div>
                </div>
                <div className="mt-6 h-[360px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={gradeStats} margin={{ top: 20, right: 30, left: 0, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
                      <XAxis dataKey="grade" stroke="#475569" tickLine={false} axisLine={false} />
                      <YAxis stroke="#475569" tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip
                        cursor={{ opacity: 0.1 }}
                        contentStyle={{
                          borderRadius: "16px",
                          border: "1px solid #e2e8f0",
                          boxShadow: "0 16px 30px rgba(15,23,42,0.12)",
                        }}
                      />
                      <Legend verticalAlign="top" wrapperStyle={{ paddingBottom: 20 }} />
                      <Bar dataKey="fullPaid" stackId="a" fill="url(#greenGradient)" name="Fully Paid" radius={[12, 12, 0, 0]} />
                      <Bar dataKey="partial" stackId="a" fill="url(#yellowGradient)" name="Partial" radius={[12, 12, 0, 0]} />
                      <Bar dataKey="unpaid" stackId="a" fill="url(#redGradient)" name="Unpaid" radius={[12, 12, 0, 0]} />
                      <defs>
                        <linearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#16a34a" stopOpacity={0.9} />
                          <stop offset="95%" stopColor="#4ade80" stopOpacity={0.7} />
                        </linearGradient>
                        <linearGradient id="yellowGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.9} />
                          <stop offset="95%" stopColor="#facc15" stopOpacity={0.7} />
                        </linearGradient>
                        <linearGradient id="redGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#dc2626" stopOpacity={0.9} />
                          <stop offset="95%" stopColor="#f87171" stopOpacity={0.7} />
                        </linearGradient>
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </SectionCard>

          <SectionCard
            icon={<FaClipboardList className="text-emerald-500" />}
            title="Operational Snapshot"
            description="Fast numbers pulled from live guardian and contribution records."
            className="flex flex-col"
          >
            <div className="mt-4 space-y-4">
              {opsSnapshot.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-2xl border border-blue-100/70 bg-white/70 p-4 text-sm shadow-sm backdrop-blur"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-lg text-blue-600">
                      {item.icon}
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-400">{item.label}</p>
                      <p className="text-lg font-semibold text-slate-900">{item.value}</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">{item.helper}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-2xl border border-dashed border-blue-200/70 bg-white/70 p-4 text-sm text-slate-500">
              Tip: sync these numbers with your admin dashboard for a unified view when presenting to stakeholders.
            </div>
          </SectionCard>
        </div>
      </div>
    </TreasurerLayout>
  );
}

const InfoCard = ({ icon, label, value, subtext, accent = "from-blue-500/20 to-blue-600/25" }) => (
  <div className="relative overflow-hidden rounded-3xl border border-white/50 bg-white/80 p-5 shadow-lg backdrop-blur-sm transition hover:shadow-xl">
    <div className={`absolute inset-0 bg-gradient-to-br ${accent} opacity-90`} />
    <div className="relative flex items-start gap-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/80 text-2xl text-blue-600 shadow-inner">
        {icon}
      </div>
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <h2 className="text-2xl font-semibold text-slate-900">{value}</h2>
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
