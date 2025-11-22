import React, { useMemo, useState } from "react";
import GuardianLayout from "@/Layouts/GuardianLayout";
import { usePage } from "@inertiajs/react";

export default function MyStudents() {
  const {
    guardian,
    students = [],
    payments = [],
    previousGrade7 = [],
    schoolYear = null,
    schoolYearCards = [],
    appTimezone = "UTC",
  } = usePage().props;

  const [searchQuery, setSearchQuery] = useState("");
  const [activeStudentTabs, setActiveStudentTabs] = useState({});

  const computeStudentPaidAmount = (student) =>
    payments
      .filter((p) => p.student_id === student.id)
      .reduce((sum, p) => sum + parseFloat(p.amount_paid || 0), 0);

  const computeStudentTotalBalance = (student) =>
    parseFloat(student.balance || 0);

  const activeYearName = schoolYear?.name || "";

  const extractLeadingYear = (name = "") => {
    const match = name.match(/\d{4}/);
    return match ? parseInt(match[0], 10) : 0;
  };

  // FIXED: SEARCH WITHOUT HIDING ENTIRE GROUPS
  const groupedYearCards = useMemo(() => {
    const q = searchQuery.toLowerCase();

    const matchesQuery = (student, yearName) => {
      if (!q) return true;
      return (
        `${student.first_name} ${student.last_name}`.toLowerCase().includes(q) ||
        (student.grade || "").toLowerCase().includes(q) ||
        (student.section || "").toLowerCase().includes(q) ||
        (yearName || "").toLowerCase().includes(q)
      );
    };

    return (schoolYearCards || [])
      .map((group) => {
        const yearName = group.name || "Unlabeled Year";

        const enrichedStudents = (group.students || []).map((student) => ({
          ...student,
          yearName,
          isActiveYear: yearName === activeYearName,
        }));

        const filteredStudents = enrichedStudents.filter((student) =>
          matchesQuery(student, yearName)
        );

        return {
          yearName,
          isActiveYear: yearName === activeYearName,
          sortKey: extractLeadingYear(yearName),
          students: filteredStudents, // ALLOW EMPTY LIST
        };
      })
      .filter((group) => group.students.length > 0)
      .sort((a, b) => {
        if (b.sortKey !== a.sortKey)
          return (b.sortKey || 0) - (a.sortKey || 0);
        return (b.yearName || "").localeCompare(a.yearName || "");
      });
  }, [schoolYearCards, searchQuery, activeYearName]);

  const formatCurrency = (value = 0) =>
    `₱${Number(value || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const formatDateTime = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    const options = {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    };

    try {
      return new Intl.DateTimeFormat("en-PH", options).format(date);
    } catch (error) {
      return date.toLocaleString(undefined, options);
    }
  };

  const handleTabChange = (yearName, studentId) => {
    setActiveStudentTabs((prev) => ({
      ...prev,
      [yearName]: studentId,
    }));
  };

  const resolveActiveStudent = (group) => {
    if (!group.students?.length) return null;
    const preferredId = activeStudentTabs[group.yearName];
    return (
      group.students.find((student) => student.id === preferredId) ||
      group.students[0]
    );
  };

  return (
    <GuardianLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
              My Students
            </h1>
          </div>
        </div>

        {/* Student Cards */}
        <div className="space-y-8">
          {groupedYearCards.map((group) => (
            <section key={group.yearName}>
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.1em] text-slate-400">
                    School Year
                  </p>
                  <p className="text-2xl font-semibold text-slate-900">
                    {group.yearName}
                  </p>
                </div>

                {/* SEARCH UI (unchanged) */}
<div className="flex flex-col gap-2 w-full md:w-auto md:flex-row md:items-center md:gap-3 md:-ml-6">
                  <div className="relative w-full md:w-[280px]">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search student, grade, or section"
                      className="w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-2.5 text-sm text-slate-700 shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    />
                  </div>

                  <div className="text-xs text-slate-500 text-center md:text-right">
                    <p className="font-semibold text-slate-600">
                      {group.isActiveYear
                        ? "Active School Year"
                        : "Filter Students"}
                    </p>
                    <p>{group.isActiveYear ? group.yearName : ""}</p>
                  </div>
                </div>
              </div>

              {/* TAB VIEW PER STUDENT */}
              {group.students.length === 0 ? (
                <div className="mt-4 rounded-3xl border border-dashed border-slate-200 p-10 text-center text-slate-500">
                  No student records match your search.
                </div>
              ) : (
                (() => {
                  const activeStudent = resolveActiveStudent(group);
                  const paymentHistory = activeStudent?.payment_history || [];
                  const totalPaidAllTime = Number(activeStudent?.total_paid || 0);
                  const currentYearPaid = Number(activeStudent?.current_year_paid || 0);
                  const carryOverBalance = Math.max(
                    0,
                    Number(activeStudent?.carry_over_balance ?? activeStudent?.balance ?? 0)
                  );
                  const currentYearCharges = Number(
                    activeStudent?.current_year_charges ?? activeStudent?.contribution_balance ?? 0
                  );
                  const rawCurrentYearOutstanding = Number(
                    activeStudent?.current_year_balance ?? activeStudent?.contribution_balance ?? 0
                  );
                  const currentYearBalance = Math.max(0, rawCurrentYearOutstanding);
                  const outstandingBalance = carryOverBalance + currentYearBalance;
                  const remainingState = outstandingBalance === 0 ? "settled" : "due";
                  const cardBg =
                    remainingState === "due"
                      ? "bg-rose-50"
                      : "bg-slate-100";
                  const cardLabelColor =
                    remainingState === "due"
                      ? "text-rose-500"
                      : "text-slate-500";
                  const cardValueColor =
                    remainingState === "due"
                      ? "text-rose-600"
                      : "text-slate-600";

                  return (
                    <div className="mt-4 rounded-[32px] border border-slate-100 bg-white/95 p-5 shadow-sm">
                      <div className="flex w-full gap-2 overflow-x-auto pb-2 scrollbar-thin">
                        {group.students.map((student) => {
                          const isActive = activeStudent?.id === student.id;
                          const studentCarry = Number(student?.carry_over_balance ?? student?.balance ?? 0);
                          const studentCurrent = Number(student?.current_year_balance ?? student?.contribution_balance ?? 0);
                          const studentDue = Math.max(0, studentCarry + studentCurrent);
                          const hasStudentBalance = studentDue > 0;
                          return (
                            <button
                              key={`${group.yearName}-${student.id}`}
                              type="button"
                              onClick={() => handleTabChange(group.yearName, student.id)}
                              className={`shrink-0 rounded-2xl border px-4 py-2 text-left text-sm font-semibold transition focus:outline-none ${
                                isActive
                                  ? "border-transparent bg-gradient-to-r from-indigo-500 to-emerald-500 text-white shadow-md"
                                  : "border-slate-200 bg-white/80 text-slate-600 hover:text-slate-900"
                              }`}
                            >
                              <span className="block text-sm leading-tight">
                                {student.first_name} {student.last_name}
                              </span>
                              <span className="text-[11px] uppercase tracking-[0.2em] text-white/80">
                                {isActive
                                  ? group.isActiveYear
                                    ? "Active"
                                    : "Archive"
                                  : student.grade || "-"}
                              </span>
                              <span
                                className={`mt-1 block text-[11px] font-semibold ${isActive
                                    ? "text-white/90"
                                    : hasStudentBalance
                                    ? "text-rose-500"
                                    : "text-emerald-600"}`}
                              >
                                Balance: {hasStudentBalance
                                  ? formatCurrency(studentDue)
                                  : "Paid"}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {activeStudent ? (
                        <div className="mt-6 space-y-6">
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                                Selected Student
                              </p>
                              <h3 className="text-2xl font-semibold text-slate-900">
                                {activeStudent.first_name} {activeStudent.last_name}
                              </h3>
                              <p className="text-sm text-slate-500">
                                Grade {activeStudent.grade || "-"} • Section {activeStudent.section || "-"}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                                School Year
                              </p>
                              <p className="text-lg font-semibold text-slate-900">
                                {group.yearName}
                              </p>
                              <span
                                className={`mt-2 inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold ${group.isActiveYear
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-slate-100 text-slate-600"
                                  }`}
                              >
                                {group.isActiveYear ? "Active" : "Archived"}
                              </span>
                            </div>
                          </div>

                          <div className="grid gap-4 md:grid-cols-4">
                            <div className="rounded-2xl bg-amber-50 p-4 text-amber-900">
                              <p className="text-[11px] uppercase tracking-[0.3em] text-amber-500">
                                Carry-over Balance
                              </p>
                              <p className="mt-3 text-2xl font-semibold text-amber-900">
                                {formatCurrency(carryOverBalance)}
                              </p>
                              <p className="mt-1 text-xs text-amber-700">
                                From previous school years
                              </p>
                            </div>
                            <div className="rounded-2xl bg-blue-50 p-4 text-blue-900">
                              <p className="text-[11px] uppercase tracking-[0.2em] text-blue-500">
                                Current Year Balance
                              </p>
                              <p className="mt-3 text-2xl font-semibold text-blue-900">
                                {formatCurrency(currentYearBalance)}
                              </p>
                              <p className="mt-1 text-xs text-blue-700">
                                After {formatCurrency(currentYearPaid)} paid this year
                              </p>
                            </div>
                            <div className={`rounded-2xl p-4 ${cardBg}`}>
                              <p
                                className={`text-[11px] uppercase tracking-[0.2em] ${cardLabelColor}`}
                              >
                                Outstanding (All Years)
                              </p>
                              <p
                                className={`mt-3 text-2xl font-semibold ${cardValueColor}`}
                              >
                                {outstandingBalance === 0
                                  ? "Fully Paid"
                                  : formatCurrency(outstandingBalance)}
                              </p>
                              {outstandingBalance > 0 && (
                                <p className={`mt-1 text-xs ${cardLabelColor}`}>
                                  Remaining after payments: {formatCurrency(outstandingBalance)}
                                </p>
                              )}
                              <p className={`mt-1 text-xs ${cardLabelColor}`}>
                                Carry-over + current-year balance
                              </p>
                            </div>
                            <div className="rounded-2xl bg-emerald-50 p-4 text-emerald-900">
                              <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-500">
                                Total Paid
                              </p>
                              <p className="mt-3 text-2xl font-semibold text-emerald-900">
                                {formatCurrency(totalPaidAllTime)}
                              </p>
                              <p className="mt-1 text-xs text-emerald-700">
                                Lifetime payments recorded
                              </p>
                            </div>
                          </div>

                          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
                              <span className="font-semibold text-slate-800">
                                Payment History
                              </span>
                              <span>
                                {paymentHistory.length} record{paymentHistory.length === 1 ? "" : "s"}
                              </span>
                            </div>
                            {paymentHistory.length ? (
                              <div className="mt-4 overflow-x-auto">
                                <table className="min-w-full text-sm text-slate-600">
                                  <thead>
                                    <tr className="text-left text-[11px] uppercase tracking-[0.2em] text-slate-400">
                                      <th className="py-2 pr-4">Contribution</th>
                                      <th className="py-2 pr-4">School Year</th>
                                      <th className="py-2 pr-4">Payment Date & Time</th>
                                      <th className="py-2 text-right">Amount</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 bg-white">
                                    {paymentHistory.map((payment) => (
                                      <tr key={payment.id} className="text-slate-700">
                                        <td className="py-3 pr-4 font-semibold">
                                          {payment.contribution || "Payment"}
                                        </td>
                                        <td className="py-3 pr-4 text-sm text-slate-500">
                                          {payment.school_year_name || "-"}
                                        </td>
                                        <td className="py-3 pr-4 text-sm text-slate-500">
                                          {formatDateTime(payment.payment_date)}
                                        </td>
                                        <td className="py-3 text-right font-semibold text-slate-900">
                                          {formatCurrency(payment.amount)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <p className="mt-4 text-sm text-slate-400">
                                No payments recorded yet.
                              </p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <p className="mt-6 text-sm text-slate-500">
                          Select a student tab to view detailed payments.
                        </p>
                      )}
                    </div>
                  );
                })()
              )}
            </section>
          ))}
        </div>
      </div>
    </GuardianLayout>
  );
}
