import React, { useState, useEffect } from "react";
import AdminLayout from "@/Layouts/AdminLayout";
import { useForm, usePage } from "@inertiajs/react";
import Swal from "sweetalert2";
import axios from "axios";
import { X } from "lucide-react";

export default function GradeLevelAndSection() {
  const {
    gradeLevels: initialGradeLevels = [],
    sections: initialSections = [],
  } = usePage().props;

  const [gradeLevels, setGradeLevels] = useState(initialGradeLevels);
  const [sections, setSections] = useState(initialSections);
  const [showModal, setShowModal] = useState(false);
  const [addingType, setAddingType] = useState("grade");
  const [editingId, setEditingId] = useState(null);

  const gradeForm = useForm({ names: [], description: "" });
  const sectionForm = useForm({ name: "", grade_level_id: "" });
  const [gradeSearch, setGradeSearch] = useState("");
  const [sectionSearch, setSectionSearch] = useState("");
  const [sectionsPage, setSectionsPage] = useState(1);
  const sectionsPerPage = 5;

  const Toast = Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 2000,
    timerProgressBar: true,
  });

  // ✅ Sorting Helper (Grade 7 → 12)
  const gradeOrder = {
    "Grade 7": 7,
    "Grade 8": 8,
    "Grade 9": 9,
    "Grade 10": 10,
    "Grade 11": 11,
    "Grade 12": 12,
  };

  const normalizeGradeName = (value = "") => {
    if (!value) return "";
    let normalized = value.toString().trim().toLowerCase();
    normalized = normalized.replace(/^grade\s*/i, "");
    normalized = normalized.replace(/[^0-9.]/g, "");
    normalized = normalized.replace(/^\.+|\.+$/g, "");
    return normalized || value.toString().trim().toLowerCase();
  };

  const sortByGradeOrder = (arr) => {
    return [...arr].sort((a, b) => {
      return (gradeOrder[a.name] || 999) - (gradeOrder[b.name] || 999);
    });
  };

  const dedupeGradeLevels = (arr) => {
    const seen = new Set();
    return arr.filter((item) => {
      const key = normalizeGradeName(item.name);
      if (!key) return true;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  };

  const prepareGradeLevels = (arr) => dedupeGradeLevels(sortByGradeOrder(arr));

  const sortSectionsByGradeOrder = (arr) => {
    return [...arr].sort((a, b) => {
      const gradeA = a.grade_level?.name || "N/A";
      const gradeB = b.grade_level?.name || "N/A";
      if ((gradeOrder[gradeA] || 999) !== (gradeOrder[gradeB] || 999)) {
        return (gradeOrder[gradeA] || 999) - (gradeOrder[gradeB] || 999);
      }
      return a.name.localeCompare(b.name);
    });
  };

  // ✅ Initial Sorting
  useEffect(() => {
    setGradeLevels(prepareGradeLevels(initialGradeLevels));
    setSections(sortSectionsByGradeOrder(initialSections));
  }, [initialGradeLevels, initialSections]);

  // ✅ Stats
  const totalGrades = gradeLevels.length;
  const totalSections = sections.length;
  const juniorCount = gradeLevels.filter((g) => g.description === "Junior High School").length;
  const seniorCount = gradeLevels.filter((g) => g.description === "Senior High School").length;

  // ✅ Filters
  const filteredGrades = gradeLevels.filter((g) => {
    const q = gradeSearch.toLowerCase();
    return (
      g.name.toLowerCase().includes(q) ||
      (g.description || "").toLowerCase().includes(q)
    );
  });
  const filteredSections = sections.filter((s) => {
    const q = sectionSearch.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      (s.grade_level?.name || "").toLowerCase().includes(q)
    );
  });

  const buildPageRange = (totalPages, currentPage) => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, idx) => idx + 1);
    }

    const range = [];
    const delta = 1;
    const left = Math.max(2, currentPage - delta);
    const right = Math.min(totalPages - 1, currentPage + delta);

    range.push(1);

    if (left > 2) {
      range.push("ellipsis-left");
    }

    for (let page = left; page <= right; page += 1) {
      range.push(page);
    }

    if (right < totalPages - 1) {
      range.push("ellipsis-right");
    }

    range.push(totalPages);
    return range;
  };

  const sectionsTotalPages = Math.max(1, Math.ceil(filteredSections.length / sectionsPerPage));
  const sectionsStartIndex = (sectionsPage - 1) * sectionsPerPage;
  const paginatedSections = filteredSections.slice(sectionsStartIndex, sectionsStartIndex + sectionsPerPage);
  const sectionPageRange = buildPageRange(sectionsTotalPages, sectionsPage);

  useEffect(() => {
    setSectionsPage(1);
  }, [sectionSearch, sections.length]);

  // ✅ Reload Grade Levels
  const fetchGradeLevels = () => {
    axios.get("/admin/gradelevel/list").then((res) => {
      setGradeLevels(prepareGradeLevels(res.data.gradeLevels));
    });
  };

  // ✅ Reload Sections
  const fetchSections = () => {
    axios.get("/admin/section/list").then((res) => {
      setSections(sortSectionsByGradeOrder(res.data.sections));
    });
  };

  // ✅ Submit Handler
  const handleSubmit = (e) => {
    e.preventDefault();

    if (addingType === "grade") {
      if (!gradeForm.data.names.length || !gradeForm.data.description) {
        return Swal.fire("Error", "Please select grade(s) and category.", "error");
      }

      axios.post("/admin/gradelevel/store", {
        names: gradeForm.data.names,
        description: gradeForm.data.description,
      })
        .then((res) => {
          // Update grade levels in UI
          setGradeLevels(prepareGradeLevels(res.data.gradeLevels));

          // Reset form & close modal
          gradeForm.reset();
          setShowModal(false);

          Toast.fire({ icon: "success", title: "Grade Level(s) added!" });
        })
        .catch((err) => {
          if (err.response?.status === 422) {
            Swal.fire("Error", err.response.data.error || "Validation failed", "error");
          }
        });

      gradeForm.reset();
      setShowModal(false);
      Toast.fire({ icon: "success", title: "Grade Level(s) added!" });
    } else {
      if (!sectionForm.data.name || !sectionForm.data.grade_level_id) {
        return Swal.fire("Error", "Please fill all section fields.", "error");
      }

      const exists = sections.some(
        (s) =>
          s.name.toLowerCase() === sectionForm.data.name.toLowerCase() &&
          s.grade_level_id.toString() === sectionForm.data.grade_level_id.toString()
      );

      if (exists) {
        return Swal.fire(
          "Duplicate",
          "This section is already recorded for the selected grade level.",
          "warning"
        );
      }

      axios
        .post("/admin/section/store", sectionForm.data)
        .then((res) => {
          setSections((prev) =>
            sortSectionsByGradeOrder([res.data.section, ...prev])
          );
          sectionForm.reset();
          setShowModal(false);
          Toast.fire({ icon: "success", title: "Section added!" });
          fetchSections();
        })
        .catch((err) => {
          if (err.response?.status === 422) {
            const errors = err.response.data.errors;
            Swal.fire("Validation Error", Object.values(errors).join("\n"), "error");
          }
        });
    }
  };

  // ✅ Delete Section
  const handleDeleteSection = (id) => {
    Swal.fire({
      title: "Are you sure?",
      text: "This section will be permanently deleted.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
    }).then((result) => {
      if (result.isConfirmed) {
        axios.delete(`/admin/section/delete/${id}`).then(() => {
          setSections((prev) => prev.filter((s) => s.id !== id));
          Swal.fire("Deleted!", "Section has been deleted.", "success");
        });
      }
    });
  };

  // ✅ Update Section
  const handleUpdateSection = (id) => {
    if (!sectionForm.data.name) {
      return Swal.fire("Error", "Section name is required.", "error");
    }

    axios.put(`/admin/section/update/${id}`, sectionForm.data).then((res) => {
      const updated = res.data.section;
      setSections((prev) =>
        sortSectionsByGradeOrder(prev.map((s) => (s.id === updated.id ? updated : s)))
      );
      setEditingId(null);
      Toast.fire({ icon: "success", title: "Section updated!" });
    });
  };

  // ✅ Grade Helpers
  const juniorGrades = ["Grade 7", "Grade 8", "Grade 9", "Grade 10"];
  const seniorGrades = ["Grade 11", "Grade 12"];

  const toggleGrade = (grade) => {
    if (gradeForm.data.names.includes(grade)) {
      gradeForm.setData(
        "names",
        gradeForm.data.names.filter((g) => g !== grade)
      );
    } else {
      const normalizedGrade = normalizeGradeName(grade);
      const hasDuplicate = gradeLevels.some(
        (g) => normalizeGradeName(g.name) === normalizedGrade
      );
      if (hasDuplicate) {
        Toast.fire({ icon: "info", title: `${grade} already exists.` });
        return;
      }
      gradeForm.setData("names", [...gradeForm.data.names, grade]);
    }
  };

  const toggleSelectAll = () => {
    const grades =
      gradeForm.data.description === "Junior High School"
        ? juniorGrades
        : gradeForm.data.description === "Senior High School"
          ? seniorGrades
          : [];

    if (grades.every((g) => gradeForm.data.names.includes(g))) {
      gradeForm.setData(
        "names",
        gradeForm.data.names.filter((g) => !grades.includes(g))
      );
    } else {
      gradeForm.setData("names", [...new Set([...gradeForm.data.names, ...grades])]);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
              Grade Levels & Sections</h1>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500"
          >
            <span>+ Add Grade & Section</span>
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-100 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Grade Levels</h2>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={gradeSearch}
                  onChange={(e) => setGradeSearch(e.target.value)}
                  placeholder="Search grade or category..."
                  className="w-40 rounded-2xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                />
                <button
                  onClick={fetchGradeLevels}
                  className="rounded-2xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  Refresh
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-5 py-3 text-left font-semibold">Name</th>
                    <th className="px-5 py-3 text-left font-semibold">Category</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredGrades.length ? (
                    filteredGrades.map((gl) => (
                      <tr key={gl.id} className="hover:bg-slate-50/60">
                        <td className="px-5 py-3 font-medium text-slate-800">{gl.name}</td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex items-center rounded-full px-3 py-0.5 text-xs font-semibold ring-1 ring-inset ${gl.description === "Junior High School"
                            ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                            : "bg-indigo-50 text-indigo-700 ring-indigo-200"
                            }`}>
                            {gl.description === "Junior High School" ? "Junior High" : "Senior High"}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="2" className="px-5 py-6 text-center text-slate-500">
                        No grade levels found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-100 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Sections</h2>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={sectionSearch}
                  onChange={(e) => setSectionSearch(e.target.value)}
                  placeholder="Search section or grade..."
                  className="w-40 rounded-2xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                />
                <button
                  onClick={fetchSections}
                  className="rounded-2xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  Refresh
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-5 py-3 text-left font-semibold">Section Name</th>
                    <th className="px-5 py-3 text-left font-semibold">Grade Level</th>
                    <th className="px-5 py-3 text-center font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedSections.length ? (
                    paginatedSections.map((section) => (
                      <tr key={section.id} className="hover:bg-slate-50/60">
                        <td className="px-5 py-3">
                          {editingId === section.id ? (
                            <input
                              value={sectionForm.data.name}
                              onChange={(e) => sectionForm.setData("name", e.target.value)}
                              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/40"
                            />
                          ) : (
                            <span className="font-medium text-slate-800">{section.name}</span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          {section.grade_level?.name ? (
                            <span className="inline-flex items-center rounded-full bg-sky-50 px-3 py-0.5 text-xs font-semibold text-sky-700 ring-1 ring-inset ring-sky-200">
                              {section.grade_level.name}
                            </span>
                          ) : (
                            <span className="text-slate-400">N/A</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-center">
                          {editingId === section.id ? (
                            <div className="flex flex-wrap items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleUpdateSection(section.id)}
                                className="rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-500"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingId(null)}
                                className="rounded-full border border-slate-200 px-4 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-wrap items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingId(section.id);
                                  sectionForm.setData({
                                    name: section.name,
                                    grade_level_id: section.grade_level_id,
                                  });
                                }}
                                className="rounded-full bg-amber-500 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-amber-400"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteSection(section.id)}
                                className="rounded-full bg-red-500 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-red-400"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3" className="px-5 py-6 text-center text-slate-500">
                        No sections found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {filteredSections.length > 0 && (
              <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
                <span>
                  Showing <strong>{filteredSections.length === 0 ? 0 : sectionsStartIndex + 1}</strong> to {" "}
                  <strong>{Math.min(sectionsStartIndex + paginatedSections.length, filteredSections.length)}</strong> of {" "}
                  <strong>{filteredSections.length}</strong> sections
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSectionsPage((prev) => Math.max(1, prev - 1))}
                    disabled={sectionsPage === 1}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <span className="sr-only">Previous</span>
                    ‹
                  </button>
                  {sectionPageRange.map((entry, idx) => {
                    if (typeof entry === "string") {
                      return (
                        <span key={`${entry}-${idx}`} className="inline-flex h-9 w-9 items-center justify-center text-slate-400">
                          …
                        </span>
                      );
                    }

                    const isActive = entry === sectionsPage;
                    return (
                      <button
                        key={entry}
                        onClick={() => setSectionsPage(entry)}
                        className={`inline-flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold transition ${isActive
                          ? "border-blue-600 bg-blue-600 text-white shadow"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                          }`}
                      >
                        {entry}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setSectionsPage((prev) => Math.min(sectionsTotalPages, prev + 1))}
                    disabled={sectionsPage === sectionsTotalPages}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <span className="sr-only">Next</span>
                    ›
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 px-4 py-6">
            <div className="relative w-full max-w-lg rounded-3xl border border-slate-100 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.12)]">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50"
                aria-label="Close"
              >
                <X size={18} />
              </button>
              <div className="space-y-2 px-6 pt-6">
                <p className="text-[10px] uppercase tracking-[0.35em] text-slate-400"></p>
                <h2 className="text-2xl font-semibold text-slate-900">Add Grade / Section</h2>
                <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-1 text-sm font-semibold">
                  <button
                    type="button"
                    onClick={() => setAddingType("grade")}
                    className={`rounded-full px-4 py-1.5 transition ${addingType === "grade" ? "bg-white text-blue-600 shadow" : "text-slate-500"
                      }`}
                  >
                    Grade
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddingType("section")}
                    className={`rounded-full px-4 py-1.5 transition ${addingType === "section" ? "bg-white text-blue-600 shadow" : "text-slate-500"
                      }`}
                  >
                    Section
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5 px-6 pb-6 pt-4">
                {/* Add Grade */}
                {addingType === "grade" && (
                  <>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Category</label>
                    <select
                      value={gradeForm.data.description}
                      onChange={(e) =>
                        gradeForm.setData("description", e.target.value)
                      }
                      className="mb-4 block w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm placeholder-gray-400 outline-none ring-0 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Category</option>
                      <option value="Junior High School">Junior High</option>
                      <option value="Senior High School">Senior High</option>
                    </select>

                    {gradeForm.data.description && (
                      <div className="space-y-3">
                        <label className="flex items-center gap-2 text-sm text-gray-700">
                          <input
                            type="checkbox"
                            checked={
                              (gradeForm.data.description === "Junior High School" &&
                                juniorGrades.every((g) =>
                                  gradeForm.data.names.includes(g)
                                )) ||
                              (gradeForm.data.description === "Senior High School" &&
                                seniorGrades.every((g) =>
                                  gradeForm.data.names.includes(g)
                                ))
                            }
                            onChange={toggleSelectAll}
                          />
                          Select All
                        </label>

                        <div className="grid grid-cols-2 gap-2">
                          {(gradeForm.data.description === "Junior High School"
                            ? juniorGrades
                            : seniorGrades
                          ).map((g) => (
                            <label
                              key={g}
                              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-50"
                            >
                              <input
                                type="checkbox"
                                value={g}
                                checked={gradeForm.data.names.includes(g)}
                                onChange={() => toggleGrade(g)}
                              />
                              {g}
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Add Section */}
                {addingType === "section" && (
                  <>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Section Name</label>
                    <input
                      type="text"
                      value={sectionForm.data.name}
                      onChange={(e) =>
                        sectionForm.setData("name", e.target.value)
                      }
                      className="mb-4 block w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm placeholder-gray-400 outline-none ring-0 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                      placeholder="Section name"
                    />
                    <label className="mb-1 block text-sm font-medium text-gray-700">Grade Level</label>
                    <select
                      value={sectionForm.data.grade_level_id}
                      onChange={(e) =>
                        sectionForm.setData("grade_level_id", e.target.value)
                      }
                      className="block w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm placeholder-gray-400 outline-none ring-0 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Grade Level</option>
                      {prepareGradeLevels(gradeLevels).map((gl) => (
                        <option key={gl.id} value={gl.id}>
                          {gl.name}
                        </option>
                      ))}
                    </select>
                  </>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="rounded-full border border-gray-300 bg-white px-5 py-2.5 text-sm text-gray-700 transition hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-full bg-blue-600 px-5 py-2.5 text-sm text-white shadow hover:bg-blue-700"
                  >
                    Save
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
