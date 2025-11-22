import React, { useMemo, useState } from "react";
import GuardianLayout from "@/Layouts/GuardianLayout";
import { usePage } from "@inertiajs/react";

export default function Contributions() {
  const { students = [], payments = [], schoolYearCards = [] } = usePage().props;

  const [yearQuery, setYearQuery] = useState("");
  const [activeStudentId, setActiveStudentId] = useState(null);

  const dedupeStudents = (list = [], scope = "global") => {
    const byId = new Set();
    const byIdentity = new Set();
    const unique = [];

    list.forEach((student = {}) => {
      const idKey = student.id != null ? `${scope}::id::${String(student.id).toLowerCase()}` : null;
      const identityKey = `${scope}::identity::${[student.first_name, student.last_name, student.grade, student.section]
        .map((part) => String(part || "").trim().toLowerCase())
        .join("|")}`;

      if (idKey && byId.has(idKey)) return;
      if (byIdentity.has(identityKey)) return;

      if (idKey) byId.add(idKey);
      byIdentity.add(identityKey);
      unique.push(student);
    });

    return unique;
  };

  const formatCurrency = (value = 0) =>
    `₱${Number(value || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const extractLeadingYear = (name = "") => {
    const match = name.match(/\d{4}/);
    return match ? parseInt(match[0], 10) : 0;
  };

  const filteredCards = useMemo(() => {
    const query = yearQuery.toLowerCase().trim();
    return (schoolYearCards || [])
      .map((card) => ({
        ...card,
        name: card?.name || "Unnamed School Year",
        sortKey: extractLeadingYear(card?.name || ""),
      }))
      .sort((a, b) => {
        if ((b.sortKey || 0) !== (a.sortKey || 0)) {
          return (b.sortKey || 0) - (a.sortKey || 0);
        }
        return (b.name || "").localeCompare(a.name || "");
      });
  }, [schoolYearCards]);

  const contributionStats = useMemo(() => {
    const summary = { students: 0, totalDue: 0, totalPaid: 0 };
    (schoolYearCards || []).forEach((card) => {
      const uniqueStudents = dedupeStudents(card.students || [], card.id ?? "card");
      uniqueStudents.forEach((student) => {
        summary.students += 1;
        summary.totalDue += Number(student.total_contribution || 0);
        summary.totalPaid += Number(student.total_paid || 0);
      });
    });
    summary.balance = Math.max(0, summary.totalDue - summary.totalPaid);
    return summary;
  }, [schoolYearCards]);

  const getPaidForContributionByYear = (studentId, contribution, yearId) => {
    return payments
      .filter(
        (p) =>
          p.student_id === studentId &&
          p.school_year_id === yearId &&
          (p.school_year_contribution_id === contribution.id ||
            p.contribution_id === contribution.contribution_id)
      )
      .reduce((sum, p) => sum + parseFloat(p.amount_paid || 0), 0);
  };

  return (
    <GuardianLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400"></p>
          <h1 className="text-3xl font-black text-slate-900">Contributions Overview</h1>
          <p className="text-sm text-slate-500">
            
          </p>
        </div>

        {/* Contribution Summary Cards */}
        <div className="grid grid-cols-1 gap-4 text-center sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-white/60 bg-white/90 p-5 shadow-lg shadow-indigo-50">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Students Covered</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{contributionStats.students}</p>
          </div>
          <div className="rounded-2xl border border-white/60 bg-white/90 p-5 shadow-lg shadow-indigo-50">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Total Assigned</p>
            <p className="mt-2 text-3xl font-semibold text-indigo-600">{formatCurrency(contributionStats.totalDue)}</p>
          </div>
          <div className="rounded-2xl border border-white/60 bg-white/90 p-5 shadow-lg shadow-emerald-50">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Total Paid</p>
            <p className="mt-2 text-3xl font-semibold text-emerald-600">{formatCurrency(contributionStats.totalPaid)}</p>
          </div>
          <div className="rounded-2xl border border-white/60 bg-white/90 p-5 shadow-lg shadow-rose-50">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Outstanding</p>
            <p className="mt-2 text-3xl font-semibold text-rose-600">{formatCurrency(contributionStats.balance)}</p>
          </div>
        </div>

        {/* School Year Cards */}
        {schoolYearCards.length > 0 ? (
          filteredCards.map((card) => {
            const uniqueStudents = dedupeStudents(card.students || [], card.id ?? "card");
            // Filter students inside each school year based on search
            const filteredStudents = uniqueStudents.filter((student) =>
              `${student.first_name} ${student.last_name}`.toLowerCase().includes(yearQuery.toLowerCase().trim())
            );

            return (
              <section key={card.id} className="space-y-4">
                {/* School Year Header + Search */}
                <div className="flex flex-col gap-3 rounded-3xl border border-slate-100 bg-white/80 p-5 shadow-sm md:flex-row md:items-center md:justify-between">
                  <div className="flex flex-wrap items-center gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">School Year</p>
                      <p className="text-2xl font-semibold text-slate-900">{card.name}</p>
                    </div>
                    {card.is_active && (
                      <span className="rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 px-3 py-1 text-xs font-semibold text-white shadow-sm">
                        Active Year
                      </span>
                    )}
                  </div>

                  <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3 md:w-auto">
                    <div className="relative w-full sm:w-64">
                      <input
                        type="text"
                        className="w-full rounded-2xl border border-slate-200 bg-white/95 px-4 py-2 text-sm text-slate-700 shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-300"
                        placeholder="Search student"
                        value={yearQuery}
                        onChange={(e) => setYearQuery(e.target.value)}
                      />
                      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs uppercase tracking-[0.2em] text-slate-300">
                        🔍
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setYearQuery("")}
                      disabled={!yearQuery}
                      className="rounded-2xl border border-indigo-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* Students Tabs */}
                {filteredStudents.length > 0 ? (
                  <>
                    <div className="flex flex-wrap gap-2 border-b border-slate-100 pb-3">
                      {filteredStudents.map((student) => (
                        <button
                          key={student.id}
                          onClick={() => setActiveStudentId(student.id)}
                          className={`rounded-2xl px-4 py-2 text-sm font-semibold shadow-sm transition ${
                            activeStudentId === student.id
                              ? "bg-gradient-to-r from-indigo-600 to-emerald-500 text-white"
                              : "bg-white/80 text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          {student.first_name} {student.last_name}
                        </button>
                      ))}
                    </div>

                    {/* Student Table */}
                    {filteredStudents
                      .filter((student) => student.id === (activeStudentId || filteredStudents[0].id))
                      .map((student) => {
                        const totalAmount = Number(student.total_contribution || 0);
                        const totalPaid = Number(student.total_paid || 0);
                        const balance = Math.max(0, totalAmount - totalPaid);
                        const isFullPaid = balance <= 0;
                        const contributions = student.assigned_contributions || [];

                        return (
                          <div
                            key={student.id}
                            className="mt-4 overflow-x-auto rounded-3xl border border-slate-100 bg-white/95 p-6 shadow-lg"
                          >
                            <h3 className="mb-3 text-lg font-semibold text-slate-900">
                              {student.first_name} {student.last_name} | {student.grade || "-"} | Section{" "}
                              {student.section || "-"}
                            </h3>

                            <table className="min-w-full divide-y divide-slate-100 text-sm text-slate-600">
                              <thead>
                                <tr className="text-left text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">
                                  <th className="py-2 pr-4 text-center">Contribution</th>
                                  <th className="py-2 pr-4 text-center">Assigned</th>
                                  <th className="py-2 pr-4 text-center">Paid</th>
                                  <th className="py-2 pr-4 text-center">Balance</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {contributions.map((c) => {
                                  const amount = Number(c.amount ?? c.contribution?.amount ?? 0);
                                  const paid = getPaidForContributionByYear(student.id, c, card.id);
                                  const rowBal = Math.max(0, amount - paid);
                                  return (
                                    <tr key={c.id}>
                                      <td className="py-3 pr-4 font-medium text-slate-900">{c.contribution?.contribution_type || "Unnamed Contribution"}</td>
                                      <td className="py-3 pr-4 text-center">{formatCurrency(amount)}</td>
                                      <td className="py-3 pr-4 text-center text-emerald-600">{formatCurrency(paid)}</td>
                                      <td className={`py-3 pr-4 font-semibold text-center ${rowBal === 0 ? "text-emerald-600" : "text-rose-600"}`}>
                                        {formatCurrency(rowBal)}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                              <tfoot className="border-t border-slate-100">
                                <tr>
                                  <td className="py-3 pr-4 text-sm font-semibold text-slate-500">Totals</td>
                                  <td className="py-3 pr-4 font-semibold text-slate-900 text-center">{formatCurrency(totalAmount)}</td>
                                  <td className="py-3 pr-4 font-semibold text-emerald-600 text-center">{formatCurrency(totalPaid)}</td>
                                  <td className={`py-3 pr-4 font-semibold text-center ${isFullPaid ? "text-emerald-600" : "text-rose-600"}`}>
                                    {formatCurrency(balance)}
                                  </td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        );
                      })}
                  </>
                ) : (
                  <div className="p-4 text-center text-sm text-slate-500">No students matched your search.</div>
                )}
              </section>
            );
          })
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white/70 p-8 text-center text-sm text-slate-500">
            No school year cards available yet.
          </div>
        )}
      </div>
    </GuardianLayout>
  );
}
