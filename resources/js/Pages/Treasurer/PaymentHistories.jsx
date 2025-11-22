import React, { useEffect, useState } from "react";
import TreasurerLayout from "@/Layouts/TreasurerLayout";
import { usePage } from "@inertiajs/react";
import { motion, AnimatePresence } from "framer-motion";
import { Receipt } from "lucide-react";

export default function PaymentHistories() {
  const {
    students: initialStudents = [],
    paymentHistories = {},
    schoolYearContributions = [],
  } = usePage().props;

  // Get unique grade levels
  const gradeLevels = [
    ...new Set(initialStudents.map((s) => s.grade_level?.name || "-")),
  ];

  const [openStudentId, setOpenStudentId] = useState(null);
  const [activeGrade, setActiveGrade] = useState(() => gradeLevels[0] || null);
  const [gradeSearch, setGradeSearch] = useState("");

  useEffect(() => {
    if (gradeLevels.length === 0) {
      if (activeGrade !== null) setActiveGrade(null);
      return;
    }
    if (!activeGrade || !gradeLevels.includes(activeGrade)) {
      setActiveGrade(gradeLevels[0]);
    }
  }, [gradeLevels, activeGrade]);

  useEffect(() => {
    setGradeSearch("");
    setOpenStudentId(null);
  }, [activeGrade]);

  const activeGradeStudents = activeGrade
    ? initialStudents.filter((s) => (s.grade_level?.name || "-") === activeGrade)
    : [];

  const activeGradeStudentsCount = activeGradeStudents.length;
  const activeGradeTotalPaid = activeGradeStudents.reduce(
    (sum, s) => sum + (paymentHistories[s.id]?.totals?.total_paid || 0),
    0
  );

  const getFirstStudentOfGuardian = (guardianId) =>
    initialStudents.find((s) => s.guardian_id === guardianId);

  const getAllowedContributionsForStudent = (student) => {
    if (!student) return [];

    const guardianStudents = initialStudents.filter(
      (s) => s.guardian_id === student.guardian_id
    );
    const firstStudent = guardianStudents[0];

    return schoolYearContributions
      .filter((syc) => syc.grade_level_id === student.grade_level_id)
      .filter((syc) => {
        if (student.id === firstStudent.id) return true;
        return syc.contribution.mandatory === 1; // second+ child only mandatory
      })
      .map((syc) => syc.contribution);
  };

  // Date helpers
  const formatFullTimestamp = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  // UI helpers
  const getInitials = (name = "-") => {
    const parts = String(name).trim().split(/\s+/).slice(0, 2);
    return parts.map((p) => p[0]?.toUpperCase() || "").join("");
  };

  const totalStudents = initialStudents.length;
  const totalPayments = initialStudents.reduce(
    (sum, s) => sum + (paymentHistories[s.id]?.totals?.total_paid || 0),
    0
  );
  const totalTransactions = Object.values(paymentHistories).reduce(
    (sum, stu) => sum + (stu?.histories?.length || 0),
    0
  );
  const avgPerStudent = totalStudents ? totalPayments / totalStudents : 0;

  return (
    <TreasurerLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div>
              <h1 className="text-3xl font-extrabold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                Payment Histories
              </h1>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Students" value={totalStudents} helper="Unique profiles" />
          <SummaryCard label="Total Paid" value={`₱${totalPayments.toFixed(2)}`} accent="text-emerald-600" helper="All grades" />
          <SummaryCard label="Average Per Student" value={`₱${avgPerStudent.toFixed(2)}`} accent="text-blue-600" helper="Collected so far" />
          <SummaryCard label="Grade Levels" value={gradeLevels.length} accent="text-purple-600" helper="Active groups" />
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {gradeLevels.length ? (
                gradeLevels.map((gl) => (
                  <button
                    key={gl}
                    onClick={() => setActiveGrade(gl)}
                    className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                      gl === activeGrade
                        ? "border border-slate-900 bg-white text-blue-600 shadow-sm"
                        : "text-slate-500 hover:text-blue-600"
                    }`}
                  >
                    Grade {gl}
                  </button>
                ))
              ) : (
                <span className="text-sm text-slate-400">No grade levels available.</span>
              )}
            </div>

            {activeGrade && (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
                  <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-slate-600">
                    Current: <span className="text-slate-900"> {activeGrade}</span>
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-slate-600">
                    {activeGradeStudentsCount} student{activeGradeStudentsCount === 1 ? "" : "s"}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-600">
                    Total Paid: ₱{activeGradeTotalPaid.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative w-full sm:w-64">
                    <input
                      type="text"
                      value={gradeSearch}
                      onChange={(e) => setGradeSearch(e.target.value)}
                      placeholder="Search by name or section..."
                      className="w-full rounded-2xl border border-slate-200 pl-9 pr-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                  {gradeSearch ? (
                    <button
                      type="button"
                      onClick={() => setGradeSearch("")}
                      className="text-xs px-3 py-2 border border-slate-200 rounded-2xl text-slate-600 hover:bg-slate-50"
                    >
                      Clear
                    </button>
                  ) : null}
                </div>
              </div>
            )}
          </div>

          {activeGrade ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-slate-700">
                <thead className="bg-slate-50 text-slate-500 uppercase text-xs sticky top-0 shadow-sm">
                  <tr>
                    <th className="px-6 py-3">Student</th>
                    <th className="px-6 py-3">Section</th>
                    <th className="px-6 py-3 text-right">Total Paid</th>
                    <th className="px-6 py-3 text-right">Total Balance Before</th>
                    <th className="px-6 py-3 text-right">Total Balance After</th>
                    <th className="px-6 py-3 text-right">Last Payment Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(() => {
                    const term = gradeSearch.toLowerCase().trim();
                    const filteredStudents = activeGradeStudents.filter((s) => {
                      if (!term) return true;
                      const stu = paymentHistories[s.id];
                      const name = (stu?.student_name || `${s.first_name || ""} ${s.last_name || ""}`).toLowerCase();
                      const section = (stu?.section || s.section?.name || "").toLowerCase();
                      return name.includes(term) || section.includes(term);
                    });

                    const studentsWithData = filteredStudents.filter((s) => paymentHistories[s.id]);

                    if (studentsWithData.length === 0) {
                      return (
                        <tr key="empty">
                          <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                            No students found. Try a different search.
                          </td>
                        </tr>
                      );
                    }

                    return studentsWithData.map((s, i) => {
                      const studentData = paymentHistories[s.id];
                      const allowedContributions = getAllowedContributionsForStudent(s);
                      const totalBalanceBefore = allowedContributions.reduce(
                        (sum, c) => sum + parseFloat(c.amount || 0),
                        0
                      );

                      const totalPaid = parseFloat(studentData.totals.total_paid || 0);
                      const totalBalanceAfter = totalBalanceBefore - totalPaid;

                      return (
                        <React.Fragment key={s.id}>
                          <tr
                            className={`transition ${
                              i % 2 === 0 ? "bg-white" : "bg-slate-50"
                            } hover:bg-blue-50/40 cursor-pointer`}
                            onClick={() =>
                              setOpenStudentId(
                                openStudentId === s.id ? null : s.id
                              )
                            }
                          >
                            <td className="px-6 py-3 font-medium text-blue-700">
                              <div className="flex items-center gap-3">
                                <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-700 text-xs">
                                  {getInitials(studentData.student_name)}
                                </span>
                                <span>{studentData.student_name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-3">{studentData.section}</td>
                            <td className="px-6 py-3 text-right font-semibold text-emerald-600">
                              ₱{totalPaid.toFixed(2)}
                            </td>
                            <td className="px-6 py-3 text-right">₱{totalBalanceBefore.toFixed(2)}</td>
                            <td className="px-6 py-3 text-right">
                              <span
                                className={`px-2 py-1 rounded-full text-xs ${
                                  totalBalanceAfter > 0
                                    ? "bg-rose-100 text-rose-700"
                                    : "bg-emerald-100 text-emerald-700"
                                }`}
                              >
                                ₱{totalBalanceAfter.toFixed(2)}
                              </span>
                            </td>
                            <td className="px-6 py-3 text-right">
                              {formatFullTimestamp(studentData.totals.last_payment_date)}
                            </td>
                          </tr>

                          <tr>
                            <td colSpan={6} className="p-0">
                              <AnimatePresence initial={false}>
                                {openStudentId === s.id && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="bg-white/80"
                                  >
                                    <div className="px-6 pb-6">
                                      <div className="mt-2 mb-3 text-sm font-semibold text-slate-600">
                                        Payment Breakdown
                                      </div>
                                      <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                                        <table className="min-w-full text-xs sm:text-sm">
                                          <thead className="bg-slate-50 text-slate-500 uppercase">
                                            <tr>
                                              <th className="px-4 py-2 text-left">Date</th>
                                              <th className="px-4 py-2 text-left">Contribution</th>
                                              <th className="px-4 py-2 text-right">Required</th>
                                              <th className="px-4 py-2 text-right">Amount Paid</th>
                                              <th className="px-4 py-2 text-right">Balance Before</th>
                                              <th className="px-4 py-2 text-right">Balance After</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y">
                                            {studentData.histories.length === 0 ? (
                                              <tr>
                                                <td colSpan={6} className="px-4 py-3 text-center text-slate-400">
                                                  No payments yet.
                                                </td>
                                              </tr>
                                            ) : (
                                              studentData.histories.map((h) => (
                                                <tr key={h.id} className="bg-white hover:bg-blue-50/30">
                                                  <td className="px-4 py-2">{formatFullTimestamp(h.payment_date)}</td>
                                                  <td className="px-4 py-2">{h.contribution}</td>
                                                  <td className="px-4 py-2 text-right">₱{Number(h.required || 0).toFixed(2)}</td>
                                                  <td className="px-4 py-2 text-right text-emerald-600 font-medium">₱{Number(h.amount_paid || 0).toFixed(2)}</td>
                                                  <td className="px-4 py-2 text-right">₱{Number(h.balance_before || 0).toFixed(2)}</td>
                                                  <td className="px-4 py-2 text-right">₱{Number(h.balance_after || 0).toFixed(2)}</td>
                                                </tr>
                                              ))
                                            )}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </td>
                          </tr>
                        </React.Fragment>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-6 py-12 text-center text-sm text-slate-400">
              Add students to view payment histories.
            </div>
          )}
        </div>
      </div>
    </TreasurerLayout>
  );
}

const SummaryCard = ({ label, value, helper, accent = "text-slate-900" }) => (
  <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
    <p className="text-[11px] uppercase tracking-[0.25em] text-slate-400">{label}</p>
    <p className={`text-2xl font-semibold ${accent}`}>{value}</p>
    {helper && <p className="text-xs text-slate-400 mt-1">{helper}</p>}
  </div>
);