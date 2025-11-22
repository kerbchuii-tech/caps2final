import React, { useState } from "react";
import TreasurerLayout from "@/Layouts/TreasurerLayout";
import { usePage } from "@inertiajs/react";
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

  const [searchQuery, setSearchQuery] = useState("");

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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-2xl border border-slate-100 bg-white px-5 py-4 text-sm shadow-sm">
            <p className="text-[11px] uppercase tracking-[0.25em] text-slate-400">Students Tracked</p>
            <p className="text-2xl font-semibold text-slate-900">{totalStudents}</p>
          </div>
          <MetricCard label="Fully Paid" value={fullPaidStudents} accent="text-emerald-600" helper="Cleared balances" />
          <MetricCard label="Unpaid / Partial" value={notPaidStudents} accent="text-amber-600" helper="Need follow-up" />
          <MetricCard label="Total Collected" value={`₱${formatCurrency(totalCollected)}`} accent="text-blue-600" helper="Across all grades" />
          <MetricCard label="Outstanding Balance" value={`₱${formatCurrency(totalOutstandingBalance)}`} accent="text-rose-600" helper="Amount remaining" />
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Grade Breakdown</p>
              <h2 className="text-xl font-semibold text-slate-900">Payment Status</h2>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart
              data={gradeStats}
              margin={{ top: 20, right: 30, left: 0, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="grade" tick={{ fill: "#374151", fontSize: 14 }} />
              <YAxis
                allowDecimals={false}
                tick={{ fill: "#374151", fontSize: 14 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  borderRadius: "12px",
                  border: "1px solid #e5e7eb",
                }}
              />
              <Legend verticalAlign="top" wrapperStyle={{ paddingBottom: 20 }} />
              <Bar
                dataKey="fullPaid"
                stackId="a"
                fill="url(#greenGradient)"
                name="Fully Paid"
                radius={[8, 8, 0, 0]}
              />
              <Bar
                dataKey="partial"
                stackId="a"
                fill="url(#yellowGradient)"
                name="Partial"
                radius={[8, 8, 0, 0]}
              />
              <Bar
                dataKey="unpaid"
                stackId="a"
                fill="url(#redGradient)"
                name="Unpaid"
                radius={[8, 8, 0, 0]}
              />
              {/* Gradients */}
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
      </div>
    </TreasurerLayout>
  );
}

const MetricCard = ({ label, value, helper, accent = "text-slate-900" }) => (
  <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
    <p className="text-[11px] uppercase tracking-[0.25em] text-slate-400">{label}</p>
    <p className={`text-2xl font-semibold ${accent}`}>{value}</p>
    {helper && <p className="text-xs text-slate-400 mt-1">{helper}</p>}
  </div>
);


