import React, { useEffect, useMemo, useState } from "react";
import AdminLayout from "@/Layouts/AdminLayout";
import { router, usePage } from "@inertiajs/react";
import axios from "axios";
import Swal from "sweetalert2";

export default function Enrollment() {
  const { schoolYears = [], gradeLevels = [], sections = [], students = [] } = usePage().props;

  const [schoolYearId, setSchoolYearId] = useState(() => {
    const active = schoolYears.find((s) => s.is_active);
    return active ? active.id : schoolYears[0]?.id;
  });

  const [rows, setRows] = useState(() =>
    students.map((s) => ({
      student_id: s.id,
      name: `${s.first_name} ${s.last_name}`,
      guardian: s.guardian ? `${s.guardian.first_name} ${s.guardian.last_name}` : "",
      grade_level_id: s.grade_level_id || "",
      section_id: s.section_id || "",
      school_year_id: s.school_year_id || schoolYearId || "",
      selected: true,
    }))
  );

  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const swalBaseClasses = {
    popup: "rounded-3xl shadow-2xl p-6 text-left",
    title: "text-lg font-bold text-slate-900",
    html: "text-slate-600",
    primaryBtn:
      "!px-6 !py-2.5 !text-sm !font-semibold !rounded-2xl !bg-blue-600 !text-white hover:!bg-blue-700 focus-visible:!ring-2 focus-visible:!ring-blue-300",
    secondaryBtn:
      "!px-6 !py-2.5 !text-sm !font-semibold !rounded-2xl !border !border-slate-200 !text-slate-600 hover:!bg-slate-50",
    warnBtn:
      "!px-6 !py-2.5 !text-sm !font-semibold !rounded-2xl !bg-red-500 !text-white hover:!bg-red-600 focus-visible:!ring-2 focus-visible:!ring-red-300",
  };

  const Toast = Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 2800,
    timerProgressBar: true,
    customClass: {
      popup: "rounded-2xl border border-blue-100 bg-white/95 px-4 py-3 shadow-lg text-sm text-slate-800",
      title: "text-sm font-semibold text-slate-900",
    },
  });

  useEffect(() => {
    if (!schoolYearId) return;
    axios
      .get(`/admin/enrollment/${schoolYearId}/data`)
      .then((res) => {
        const { students: list } = res.data || {};
        setRows(
          list.map((s) => ({
            student_id: s.id,
            name: `${s.first_name} ${s.last_name}`,
            guardian: s.guardian ? `${s.guardian.first_name} ${s.guardian.last_name}` : "",
            grade_level_id: s.grade_level_id || "",
            section_id: s.section_id || "",
            school_year_id: schoolYearId,
            selected: true,
          }))
        );
      })
      .catch(() => { });
  }, [schoolYearId]);

  const gradeNameMap = useMemo(() => {
    const m = new Map();
    gradeLevels.forEach((g) => {
      m.set(String(g.id), g.name);
    });
    return m;
  }, [gradeLevels]);

  const sectionNameMap = useMemo(() => {
    const m = new Map();
    sections.forEach((s) => {
      m.set(String(s.id), s.name);
    });
    return m;
  }, [sections]);

  const displayedRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.name, r.guardian].some((v) => String(v || "").toLowerCase().includes(q))
    );
  }, [rows, search]);

  // Pagination derived state
  useEffect(() => {
    setPage(1);
  }, [search, schoolYearId]);
  const pageCount = Math.max(1, Math.ceil(displayedRows.length / pageSize));
  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [pageCount]);
  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return displayedRows.slice(start, start + pageSize);
  }, [displayedRows, page]);

  // Selection-derived state (for button enable/disable)
  const selectedRows = React.useMemo(() => rows.filter((r) => r.selected), [rows]);
  const selectedCount = selectedRows.length;
  const allSelectedHaveGrade = selectedRows.every((r) => String(r.grade_level_id || "").length > 0);

  const toggleSelectAll = (checked) => {
    setRows((prev) => prev.map((r) => ({ ...r, selected: checked })));
  };

  const finalize = async () => {
    const assignments = rows
      .filter((r) => r.selected)
      .map((r) => ({
        student_id: r.student_id,
        grade_level_id: Number(r.grade_level_id),
        section_id: r.section_id ? Number(r.section_id) : null,
        school_year_id: Number(schoolYearId),
      }));

    if (assignments.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "Nothing selected",
        text: "Choose at least one student to save assignments.",
        customClass: {
          popup: swalBaseClasses.popup,
          title: swalBaseClasses.title,
          htmlContainer: swalBaseClasses.html,
          confirmButton: swalBaseClasses.primaryBtn,
        },
        buttonsStyling: false,
      });
      return;
    }

    if (assignments.some((a) => !a.grade_level_id)) {
      Swal.fire({
        icon: "warning",
        title: "Missing grade level",
        text: "Ensure each selected student has a grade level assigned.",
        customClass: {
          popup: swalBaseClasses.popup,
          title: swalBaseClasses.title,
          htmlContainer: swalBaseClasses.html,
          confirmButton: swalBaseClasses.primaryBtn,
        },
        buttonsStyling: false,
      });
      return;
    }

    const summaryHtml = `
      <div class="space-y-3 text-left">
        <p class="text-xs uppercase tracking-[0.3em] text-slate-400">Summary</p>
        <div class="rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3">
          <p class="text-sm text-slate-600">${assignments.length} student${assignments.length === 1 ? "" : "s"} selected</p>
        </div>
      </div>
    `;

    Swal.fire({
      title: "Save these assignments?",
      html: summaryHtml,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Save",
      cancelButtonText: "Go Back",
      reverseButtons: true,
      customClass: {
        popup: swalBaseClasses.popup,
        title: swalBaseClasses.title,
        htmlContainer: swalBaseClasses.html,
        confirmButton: swalBaseClasses.primaryBtn,
        cancelButton: swalBaseClasses.secondaryBtn,
      },
      buttonsStyling: false,
    }).then(async (result) => {
      if (!result.isConfirmed) return;

      try {
        setSaving(true);
        await axios.post("/admin/enrollment/finalize", { assignments });
        router.reload({ only: ["students"] });
        Toast.fire({ icon: "success", title: "Assignments saved" });
      } catch (e) {
        Swal.fire({
          icon: "error",
          title: "Failed",
          text: e?.response?.data?.message || "Unable to save assignments.",
          customClass: {
            popup: swalBaseClasses.popup,
            title: swalBaseClasses.title,
            htmlContainer: swalBaseClasses.html,
            confirmButton: swalBaseClasses.primaryBtn,
          },
          buttonsStyling: false,
        });
      } finally {
        setSaving(false);
      }
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400"></p>
              <h1 className="text-3xl font-extrabold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
              Enrollment Assignments</h1>
          </div>
        </div>

        <div className="rounded-3xl border border-blue-100 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-blue-50 p-5 md:flex-row md:items-center">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
              <label className="text-sm font-medium text-slate-600">School Year</label>
              <select
                className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40"
                value={schoolYearId || ""}
                onChange={(e) => setSchoolYearId(e.target.value)}
              >
                {schoolYears.map((sy) => (
                  <option key={sy.id} value={sy.id}>
                    {sy.name} {sy.is_active ? "(Active)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:ml-auto w-full md:w-80">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search student or guardian..."
                className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40"
              />
            </div>

            <div className="flex items-center gap-2 md:ml-2">
              <button
                onClick={finalize}
                disabled={saving || selectedCount === 0 || !allSelectedHaveGrade}
                className={`inline-flex h-11 min-w-[150px] items-center justify-center rounded-full px-5 text-sm font-semibold text-white shadow-sm transition ${saving || selectedCount === 0 || !allSelectedHaveGrade
                    ? "bg-blue-300 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-500"
                  }`}
              >
                {saving ? "Saving..." : "Save Assignments"}
              </button>
            </div>
          </div>

          <div className="overflow-auto rounded-3xl">
            <table className="min-w-full text-sm text-slate-700">
              <thead className="sticky top-0 z-10 bg-slate-50">
                <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="w-12 border px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={rows.length > 0 && rows.every((r) => r.selected)}
                      onChange={(e) => toggleSelectAll(e.target.checked)}
                      className="accent-blue-600"
                    />
                  </th>
                  <th className="border px-4 py-3 text-left">Student</th>
                  <th className="border px-4 py-3 text-left">Guardian</th>
                  <th className="border px-4 py-3 text-left">Grade Level</th>
                  <th className="border px-4 py-3 text-left">Section</th>
                </tr>
              </thead>
              <tbody>
                {displayedRows.length === 0 && (
                  <tr>
                    <td className="px-4 py-6 text-center text-slate-400" colSpan={5}>
                      No students found.
                    </td>
                  </tr>
                )}
                {pageRows.map((r) => {
                  return (
                    <tr key={r.student_id} className="border-b border-slate-100 bg-white hover:bg-blue-50/40">
                      <td className="border px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={r.selected}
                          onChange={(e) =>
                            setRows((prev) =>
                              prev.map((x) => (x.student_id === r.student_id ? { ...x, selected: e.target.checked } : x))
                            )
                          }
                          className="accent-blue-600"
                        />
                      </td>
                      <td className="border px-4 py-3 font-medium text-slate-900">{r.name}</td>
                      <td className="border px-4 py-3 text-slate-700">{r.guardian}</td>
                      <td className="border px-4 py-3 text-sm font-medium text-slate-800">
                        {gradeNameMap.get(String(r.grade_level_id)) || "—"}
                      </td>
                      <td className="border px-4 py-3 text-sm text-slate-600">
                        {sectionNameMap.get(String(r.section_id)) || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="border-t border-blue-50 px-5 py-4">
            <div className="text-center text-sm text-slate-500">
              Showing {displayedRows.length === 0 ? 0 : (page - 1) * pageSize + 1}-{Math.min(page * pageSize, displayedRows.length)} of {displayedRows.length} students
            </div>
            <div className="mt-3 flex justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                aria-label="Previous"
                className="rounded-full border border-slate-200 px-4 py-1 text-sm text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="inline-flex h-9 min-w-[40px] items-center justify-center rounded-full bg-blue-600 px-4 text-sm font-semibold text-white">
                {page}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                disabled={page === pageCount}
                aria-label="Next"
                className="rounded-full border border-slate-200 px-4 py-1 text-sm text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
