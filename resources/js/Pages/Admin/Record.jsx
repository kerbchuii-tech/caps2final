import AdminLayout from "@/Layouts/AdminLayout";
import { usePage } from "@inertiajs/react";
import { Fragment, useEffect, useMemo, useState } from "react";
import { FileText, Folder, DollarSign, Gift, Receipt, Users, ChevronDown, ChevronUp } from "lucide-react";

const tabs = [
  { id: "payments", label: "Payments", icon: DollarSign },
  { id: "donations", label: "Donations", icon: Gift },
  { id: "expenses", label: "Expenses", icon: Receipt },
  { id: "students", label: "Students", icon: Users },
];

const DEFAULT_PAGE_SIZE = 5;

const formatCurrency = (value = 0) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const formatDate = (value) => {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch (err) {
    return value;
  }
};

const SectionTable = ({ headers = [], rows = [], emptyText = "No records" }) => {
  if (!rows.length) {
    return <p className="text-sm italic text-slate-400">{emptyText}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-separate border-spacing-y-2 border-spacing-x-0 text-sm text-slate-700">
        <thead className="bg-slate-50/80 text-[11px] uppercase tracking-[0.2em] text-slate-400">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-5 py-3 text-left font-semibold">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx} className="bg-white shadow-sm">
              {row.map((cell, cellIdx) => (
                <td
                  key={cellIdx}
                  className="border border-slate-100 px-5 py-3 align-top first:rounded-l-2xl last:rounded-r-2xl"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const PillStat = ({ label, value, accent = "border-slate-100 text-slate-900" }) => (
  <div
    className={`rounded-2xl border bg-white px-4 py-3 text-xs font-semibold shadow-sm ${accent}`}
  >
    <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400">{label}</p>
    <p className="text-base text-slate-900">{value}</p>
  </div>
);

const YearPanel = ({ year, activeTab, onTabChange }) => {

  const paymentsRows = (year.paymentSummary || []).map((row) => [
    row.contribution_type,
    formatCurrency(row.actual),
    <span className="font-semibold text-blue-700" key="paid">
      {formatCurrency(row.paid)}
    </span>,
    <span
      className={`font-semibold ${Number(row.balance) <= 0 ? "text-emerald-600" : "text-rose-500"}`}
      key="balance"
    >
      {formatCurrency(row.balance)}
    </span>,
  ]);

  const donationRows = (year.donations || []).map((d) => [
    <span className="font-medium" key="donated_by">
      {d.donated_by || "—"}
    </span>,
    d.type,
    <span className="text-purple-700 font-semibold" key="amount">
      {formatCurrency(d.donation_amount)}
    </span>,
    d.details || "—",
    d.received_by || "—",
    formatDate(d.donation_date),
  ]);

  const donationTotal = (year.donations || []).reduce(
    (sum, d) => sum + (Number(d.donation_amount) || 0),
    0
  );

  const expenseRows = (year.expenses || []).map((e) => [
    e.expense_type,
    <span className="text-rose-600 font-semibold" key="amount">
      {formatCurrency(e.amount)}
    </span>,
    formatDate(e.expense_date),
    e.description || "—",
    e.contribution || "—",
  ]);

  const expenseTotal = (year.expenses || []).reduce(
    (sum, e) => sum + (Number(e.amount) || 0),
    0
  );

  const extractGradeOrder = (name = "") => {
    const match = name.match(/\d+/);
    return match ? parseInt(match[0], 10) : 999;
  };

  const sortedGradeSections = [...(year.gradeSectionSummary || [])].sort((a, b) => {
    const gradeCompare = extractGradeOrder(a.grade_name || "") - extractGradeOrder(b.grade_name || "");
    if (gradeCompare !== 0) return gradeCompare;
    return (a.section_name || "").localeCompare(b.section_name || "");
  });

  const gradeGroups = (() => {
    const map = new Map();
    sortedGradeSections.forEach((row) => {
      const gradeName = row.grade_name || "Grade";
      if (!map.has(gradeName)) {
        map.set(gradeName, []);
      }
      map.get(gradeName).push(row);
    });
    return Array.from(map.entries());
  })();

  const sortedStudents = [...(year.students || [])].sort((a, b) => {
    const gradeCompare = extractGradeOrder(a.grade || "") - extractGradeOrder(b.grade || "");
    if (gradeCompare !== 0) return gradeCompare;
    return ([a.last_name, a.first_name].join(" ") || "").localeCompare(
      [b.last_name, b.first_name].join(" ") || ""
    );
  });

  const gradeOptions = useMemo(() => {
    const uniqueGrades = Array.from(new Set(sortedStudents.map((s) => s.grade || "Unassigned")));
    return uniqueGrades.sort((a, b) => {
      const compare = extractGradeOrder(a) - extractGradeOrder(b);
      if (compare !== 0) return compare;
      return a.localeCompare(b);
    });
  }, [sortedStudents]);

  const [activeGradeFilter, setActiveGradeFilter] = useState(() => gradeOptions[0] ?? null);
  const [studentPage, setStudentPage] = useState(1);

  useEffect(() => {
    if (!gradeOptions.length) {
      setActiveGradeFilter(null);
      return;
    }
    setActiveGradeFilter((prev) => {
      if (prev === null) return prev;
      return gradeOptions.includes(prev) ? prev : gradeOptions[0];
    });
  }, [gradeOptions]);

  useEffect(() => {
    setActiveGradeFilter(gradeOptions[0] ?? null);
    setStudentPage(1);
  }, [year.school_year?.id]);

  useEffect(() => {
    setStudentPage(1);
  }, [activeTab, activeGradeFilter]);

  const filteredStudents = useMemo(() => {
    if (!activeGradeFilter) return sortedStudents;
    return sortedStudents.filter((student) => (student.grade || "Unassigned") === activeGradeFilter);
  }, [sortedStudents, activeGradeFilter]);

  const studentPageSize = DEFAULT_PAGE_SIZE;
  const studentTotalPages = Math.max(1, Math.ceil(filteredStudents.length / studentPageSize));
  const pagedStudents = filteredStudents.slice(
    (studentPage - 1) * studentPageSize,
    studentPage * studentPageSize
  );
  const pagedStudentGroups = (() => {
    const map = new Map();
    pagedStudents.forEach((student) => {
      const gradeName = student.grade || "Unassigned";
      if (!map.has(gradeName)) {
        map.set(gradeName, []);
      }
      map.get(gradeName).push(student);
    });
    return Array.from(map.entries());
  })();
  const studentRangeStart = filteredStudents.length ? (studentPage - 1) * studentPageSize + 1 : 0;
  const studentRangeEnd = Math.min(studentPage * studentPageSize, filteredStudents.length);

  const contributionDetails = year.contributionDetails || [];
  const contributionOverviewTotal = contributionDetails.reduce(
    (sum, detail) => sum + (Number(detail.per_student_amount) || 0),
    0
  );

  const renderContent = () => {
    switch (activeTab) {
      case "payments":
        return (
          <div className="space-y-10">
            <div>
              <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
                    Contribution Overview
                  </p>
                </div>
                {contributionDetails.length ? (
                  <p className="text-sm font-semibold text-slate-600">
                    Total <span className="text-slate-900">{formatCurrency(contributionOverviewTotal)}</span>
                  </p>
                ) : null}
              </div>

              {contributionDetails.length ? (
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-sm text-slate-700">
                    <thead>
                      <tr className="text-left text-[11px] uppercase tracking-[0.1em] text-slate-400">
                        <th className="pb-2">Contribution</th>
                        <th className="pb-2">Amount</th>
                        <th className="pb-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contributionDetails.map((detail) => (
                        <tr key={detail.contribution_id} className="align-top">
                          <td className="py-1 font-medium text-slate-900">{detail.contribution_type}</td>
                          <td className="py-1">{formatCurrency(detail.per_student_amount)}</td>
                          <td className="py-1" />
                        </tr>
                      ))}
                      <tr>
                        <td />
                        <td className="pt-2 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                          Total
                        </td>
                        <td className="pt-2 text-right text-sm font-semibold text-slate-900">
                          {formatCurrency(contributionOverviewTotal)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-400">No contribution records for this school year.</p>
              )}

              <div className="mt-6 border-t border-black" />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
                Grade & Section Collections
              </p>

              {gradeGroups.length ? (
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-sm text-slate-700">
                    <thead>
                      <tr className="text-left text-[11px] uppercase tracking-[0.1em] text-slate-400">
                        <th className="pb-2">
                          Grade & Section
                        </th>
                        <th className="pb-2 text-center">
                          <div className="flex flex-col items-center leading-tight">
                            <span>Count of Students</span>
                            <span className="text-[10px] uppercase tracking-[0.05em] text-slate-400">
                              (total students per section)
                            </span>
                          </div>
                        </th>
                        <th className="pb-2 text-center">
                          <div className="flex flex-col items-center leading-tight">
                            <span>Overall Payment</span>
                            <span className="text-[10px] uppercase tracking-[0.05em] text-slate-400">
                              (total of payments made per section)
                            </span>
                          </div>
                        </th>
                        <th className="pb-2 text-center">
                          <div className="flex flex-col items-center leading-tight">
                            <span>Overall Balance</span>
                            <span className="text-[10px] uppercase tracking-[0.05em] text-slate-400">
                              (total balance per section)
                            </span>
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {gradeGroups.map(([gradeName, sections]) => (
                        <Fragment key={`grade-${gradeName}`}>
                          <tr>
                            <td colSpan={4} className="pt-4 text-sm font-semibold text-slate-900">
                              {gradeName}
                            </td>
                          </tr>
                          {sections.map((row) => (
                            <tr key={`${row.grade_level_id}-${row.section_id}`} className="align-top">
                              <td className="py-1 pl-6 text-slate-900">{row.section_name}</td>
                              <td className="py-1 text-center">{`${row.student_count} student${row.student_count === 1 ? "" : "s"}`}</td>
                              <td className="py-1 text-center text-blue-700 font-semibold">{formatCurrency(row.paid_total)}</td>
                              <td className={`py-1 text-center font-semibold ${row.balance <= 0 ? "text-emerald-600" : "text-rose-500"}`}>
                                {formatCurrency(row.balance)}
                              </td>
                            </tr>
                          ))}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-400">No grade-level records yet.</p>
              )}
            </div>
          </div>
        );
      case "donations":
        return (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-3">
              <PillStat
                label="Total Donations"
                value={formatCurrency(donationTotal)}
                accent="border-purple-100 text-purple-700"
              />
              <PillStat
                label="Records"
                value={`${(year.donations || []).length} entries`}
              />
            </div>
            <SectionTable
              headers={["Donated By", "Type", "Amount", "Details", "Received By", "Date"]}
              rows={donationRows}
              emptyText="No donations recorded."
            />
          </div>
        );
      case "expenses":
        return (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-3">
              <PillStat
                label="Total Expenses"
                value={formatCurrency(expenseTotal)}
                accent="border-rose-100 text-rose-700"
              />
              <PillStat
                label="Records"
                value={`${(year.expenses || []).length} entries`}
              />
            </div>
            <SectionTable
              headers={["Expense Type", "Amount", "Date", "Description", "Contribution"]}
              rows={expenseRows}
              emptyText="No expenses recorded."
            />
          </div>
        );
      case "students":
        return (
          <div className="space-y-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                  Students
                </p>
                <p className="text-[13px] text-slate-500">
                  Showing {studentRangeStart || 0}-{studentRangeEnd || 0} of {filteredStudents.length} students
                  {activeGradeFilter ? ` • Grade ${activeGradeFilter.replace(/[^0-9]/g, "") || activeGradeFilter}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setActiveGradeFilter(null)}
                  className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
                    activeGradeFilter === null
                      ? "border-blue-200 bg-blue-50 text-blue-600 shadow-sm"
                      : "border-transparent text-slate-500 hover:text-blue-600"
                  }`}
                >
                  All Grades
                </button>
                {gradeOptions.map((grade) => (
                  <button
                    key={grade}
                    type="button"
                    onClick={() => setActiveGradeFilter(grade)}
                    className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
                      activeGradeFilter === grade
                        ? "border-blue-500 bg-white text-blue-600 shadow-sm"
                        : "border-slate-200 text-slate-500 hover:text-blue-600"
                    }`}
                  >
                    {grade}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setStudentPage((p) => Math.max(1, p - 1))}
                  disabled={studentPage === 1}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${studentPage === 1
                    ? "border-slate-100 text-slate-300"
                    : "border-slate-200 text-slate-600 hover:border-slate-300"}`}
                >
                  Prev
                </button>
                <span className="text-xs text-slate-500">
                  Page {studentPage} of {studentTotalPages}
                </span>
                <button
                  onClick={() => setStudentPage((p) => Math.min(studentTotalPages, p + 1))}
                  disabled={studentPage === studentTotalPages}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${studentPage === studentTotalPages
                    ? "border-slate-100 text-slate-300"
                    : "border-slate-200 text-slate-600 hover:border-slate-300"}`}
                >
                  Next
                </button>
              </div>
            </div>

            {pagedStudentGroups.length ? (
              <div className="space-y-4">
                {pagedStudentGroups.map(([gradeName, students]) => (
                  <div
                    key={`students-${gradeName}-${studentPage}`}
                    className="rounded-2xl border border-slate-100 bg-white shadow-sm"
                  >
                    <div className="border-b border-slate-100 px-5 py-3">
                      <p className="text-sm font-semibold text-slate-900">{gradeName}</p>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {students.map((student) => (
                        <div
                          key={student.id || student.lrn || `${student.first_name}-${student.section}`}
                          className="grid gap-4 px-5 py-3 text-sm text-slate-700 sm:grid-cols-3"
                        >
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Student</p>
                            <p className="font-semibold text-slate-900">
                              {[student.first_name, student.middle_name, student.last_name].filter(Boolean).join(" ") || "—"}
                            </p>
                            <p className="text-xs text-slate-400">LRN: {student.lrn || "—"}</p>
                          </div>
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Section</p>
                            <p className="font-semibold">{student.section || "—"}</p>
                          </div>
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Guardian</p>
                            <p className="font-semibold">{student.guardian || "—"}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">No students for this school year.</p>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  const activeTabLabel = tabs.find((tab) => tab.id === activeTab)?.label;

  return (
    <div className="rounded-[32px] bg-white p-2 ">
      <div className="flex flex-wrap items-center gap-1">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-cyan-600">
            School Year
          </p>
          <p className="text-lg font-bold text-slate-900">
            {year.school_year?.name || "Unnamed School Year"}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-[28px] bg-white/80 p-4">
        <div className="flex flex-wrap gap-2 pb-3">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${activeTab === tab.id
                  ? "bg-blue-600 text-white shadow"
                  : "text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                }`}
            >
              <span className="inline-flex items-center gap-2">
                <tab.icon size={15} /> {tab.label}
              </span>
            </button>
          ))}
        </div>
        <div className="rounded-2xl bg-white px-5 py-5 shadow-sm">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default function Record() {
  const { archivesData = [] } = usePage().props;
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedYearId, setExpandedYearId] = useState(
    archivesData[0]?.school_year?.id ?? null
  );
  const [tabState, setTabState] = useState(() => {
    const initial = {};
    archivesData.forEach((entry) => {
      const id = entry.school_year?.id;
      if (id) initial[id] = "payments";
    });
    return initial;
  });

  const filteredArchives = useMemo(() => {
    if (!searchTerm.trim()) return archivesData;
    const term = searchTerm.toLowerCase();
    return archivesData.filter((entry) =>
      entry.school_year?.name?.toLowerCase().includes(term)
    );
  }, [archivesData, searchTerm]);

  const pageSize = 5;
  const totalPages = Math.max(1, Math.ceil(filteredArchives.length / pageSize));
  const paginatedArchives = filteredArchives.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleTabChange = (yearId, tabId) => {
    setTabState((prev) => ({ ...prev, [yearId]: tabId }));
  };

  const goToPage = (page) => {
    setCurrentPage((prev) => {
      const next = Math.min(Math.max(page, 1), totalPages);
      if (next !== prev) {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      return next;
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400"></p>
            <h1 className="text-3xl font-extrabold mb-6 bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
              School Year Records
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search school year..."
              className="w-full md:w-64 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>

          {filteredArchives.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center">
              <p className="text-sm text-slate-400">
                No school year records found yet.
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-4">
              {paginatedArchives.map((year) => {
                const yearId = year.school_year?.id;
                if (!yearId) return null;
                const isExpanded = expandedYearId === yearId;

                return (
                  <div
                    key={yearId}
                    className={`rounded-2xl border border-blue-50 bg-white shadow-sm transition-all min-w-[320px] ${isExpanded ? "w-full" : "w-auto"}`}
                  >
                    <button
                      className="flex w-full items-center gap-3 px-5 py-4 text-left"
                      onClick={() =>
                        setExpandedYearId((prev) => (prev === yearId ? null : yearId))
                      }
                    >
                      <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-blue-50 p-1.5 text-blue-600">
                          <Folder size={18} />
                        </div>
                        <p className="text-lg font-semibold text-slate-900">
                          {year.school_year?.name || "Unnamed School Year"}
                        </p>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-blue-50 px-5 pb-6 pt-6">
                        <YearPanel
                          year={year}
                          activeTab={tabState[yearId] || "payments"}
                          onTabChange={(tabId) => handleTabChange(yearId, tabId)}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {filteredArchives.length > pageSize && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-xs text-slate-500">
                Showing {(currentPage - 1) * pageSize + 1} -
                {Math.min(currentPage * pageSize, filteredArchives.length)} of {filteredArchives.length}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`rounded-full border px-3 py-1 text-sm font-semibold ${currentPage === 1 ? "text-slate-300 border-slate-100" : "text-slate-600 border-slate-200 hover:border-slate-300"}`}
                >
                  Prev
                </button>
                <div className="text-xs text-slate-500">
                  Page {currentPage} of {totalPages}
                </div>
                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`rounded-full border px-3 py-1 text-sm font-semibold ${currentPage === totalPages ? "text-slate-300 border-slate-100" : "text-slate-600 border-slate-200 hover:border-slate-300"}`}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
    </AdminLayout>
  );
}
