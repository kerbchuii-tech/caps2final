import React, { useState } from "react";
import AdminLayout from "@/Layouts/AdminLayout";
import { router, useForm, usePage } from "@inertiajs/react";
import Swal from "sweetalert2";

export default function SchoolYearContributions() {
  const {
    schoolYears = [],
    gradeLevels = [],
    contributions = [],
    schoolYearContributions = [],
  } = usePage().props;

  const [showModal, setShowModal] = useState(false);
  const [activeTabs, setActiveTabs] = useState({});
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const { data, setData, post, processing, reset } = useForm({
    school_year_id: "",
    grade_level_ids: [],  // ⬅️ changed to array
    contribution_ids: [],
    total_amount: 0,
  });

  const {
    data: editData,
    setData: setEditData,
    put: updateContribution,
    processing: updating,
    reset: resetEdit,
  } = useForm({
    total_amount: 0,
  });

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

  const handleCancel = () => {
    Swal.fire({
      title: "Discard changes?",
      text: "Your selections for this assignment will be lost.",
      icon: "warning",
      showCancelButton: true,
      cancelButtonText: "Keep editing",
      confirmButtonText: "Discard",
      reverseButtons: true,
      customClass: {
        popup: swalBaseClasses.popup,
        title: swalBaseClasses.title,
        htmlContainer: swalBaseClasses.html,
        confirmButton: swalBaseClasses.warnBtn,
        cancelButton: swalBaseClasses.secondaryBtn,
      },
      buttonsStyling: false,
    }).then((result) => {
      if (result.isConfirmed) {
        reset();
        setShowModal(false);
        Toast.fire({ icon: "info", title: "Draft discarded", text: "Form closed." });
      }
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!data.school_year_id || data.grade_level_ids.length === 0 || data.contribution_ids.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "Incomplete details",
        text: "Select a school year, at least one grade level, and at least one contribution.",
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

    const schoolYearName = schoolYears.find((sy) => String(sy.id) === String(data.school_year_id))?.name || "—";
    const summaryHtml = `
      <div class="space-y-3 text-left">
        <p class="text-xs uppercase tracking-[0.3em] text-slate-400">Summary</p>
        <div class="space-y-2 rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3">
          <div class="flex items-center justify-between gap-4">
            <div>
              <p class="text-[11px] uppercase tracking-[0.2em] text-slate-400">School Year</p>
              <p class="text-base font-semibold text-slate-900">${schoolYearName}</p>
            </div>
            <div class="text-right">
              <p class="text-[11px] uppercase tracking-[0.2em] text-slate-400">Total Amount</p>
              <p class="text-xl font-semibold text-emerald-600">₱${Number(data.total_amount || 0).toFixed(2)}</p>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p class="text-[11px] uppercase tracking-[0.2em] text-slate-400">Grades</p>
              <p class="font-semibold text-slate-800">${data.grade_level_ids.length} selected</p>
            </div>
            <div class="text-right">
              <p class="text-[11px] uppercase tracking-[0.2em] text-slate-400">Contributions</p>
              <p class="font-semibold text-slate-800">${data.contribution_ids.length} selected</p>
            </div>
          </div>
        </div>
      </div>
    `;

    Swal.fire({
      title: "Assign these contributions?",
      html: summaryHtml,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, assign",
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
    }).then((result) => {
      if (!result.isConfirmed) {
        return;
      }

      post("/admin/schoolyearcontributions/store", {
        preserveScroll: true,
        data: {
          school_year_id: data.school_year_id,
          grade_level_ids: data.grade_level_ids,
          contribution_ids: data.contribution_ids,
          total_amount: data.total_amount,
        },
        onSuccess: () => {
          reset();
          setShowModal(false);
          router.reload({ only: ["schoolYearContributions"], preserveScroll: true });
          Toast.fire({ icon: "success", title: "Contributions assigned!" });
        },
        onError: () => {
          Swal.fire({
            icon: "error",
            title: "Failed",
            text: "Unable to assign contributions. Try again.",
            customClass: {
              popup: swalBaseClasses.popup,
              title: swalBaseClasses.title,
              htmlContainer: swalBaseClasses.html,
              confirmButton: swalBaseClasses.primaryBtn,
            },
            buttonsStyling: false,
          });
        },
      });
    });
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setShowEditModal(true);
    setEditData("total_amount", item.total_amount ?? item.contribution?.amount ?? 0);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingItem(null);
    resetEdit();
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();

    if (!editingItem) {
      return;
    }

    const parsedAmount = parseFloat(editData.total_amount);
    if (Number.isNaN(parsedAmount) || parsedAmount < 0) {
      Swal.fire({
        icon: "warning",
        title: "Invalid amount",
        text: "Enter a value greater than or equal to zero.",
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

    const reviewHtml = `
      <div class="space-y-3 text-left">
        <p class="text-xs uppercase tracking-[0.3em] text-slate-400">Summary</p>
        <div class="space-y-1">
          <p class="text-sm font-semibold text-slate-900">${editingItem.contribution?.contribution_type || "Contribution"}</p>
          <p class="text-xs text-slate-500">${editingItem.grade_level?.name || "Grade"}</p>
        </div>
        <div class="rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3 text-right">
          <p class="text-[11px] uppercase tracking-[0.2em] text-slate-400">New Amount</p>
          <p class="text-2xl font-semibold text-emerald-600">₱${parsedAmount.toFixed(2)}</p>
        </div>
      </div>
    `;

    Swal.fire({
      title: "Save updated amount?",
      html: reviewHtml,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, update",
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
    }).then((result) => {
      if (!result.isConfirmed) {
        return;
      }

      updateContribution(`/admin/schoolyearcontributions/${editingItem.id}`, {
        preserveScroll: true,
        data: {
          total_amount: parsedAmount,
        },
        onSuccess: () => {
          closeEditModal();
          router.reload({ only: ["schoolYearContributions"], preserveScroll: true });
          Toast.fire({ icon: "success", title: "Contribution updated!" });
        },
        onError: () => {
          Swal.fire({
            icon: "error",
            title: "Failed",
            text: "Unable to update contribution amount.",
            customClass: {
              popup: swalBaseClasses.popup,
              title: swalBaseClasses.title,
              htmlContainer: swalBaseClasses.html,
              confirmButton: swalBaseClasses.primaryBtn,
            },
            buttonsStyling: false,
          });
        },
      });
    });
  };

  const handleDelete = (item) => {
    Swal.fire({
      title: "Remove this contribution?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      cancelButtonText: "Keep",
      reverseButtons: true,
      customClass: {
        popup: swalBaseClasses.popup,
        title: swalBaseClasses.title,
        htmlContainer: swalBaseClasses.html,
        confirmButton: swalBaseClasses.warnBtn,
        cancelButton: swalBaseClasses.secondaryBtn,
      },
      buttonsStyling: false,
    }).then((result) => {
      if (!result.isConfirmed) {
        return;
      }

      router.delete(`/admin/schoolyearcontributions/${item.id}`, {
        preserveScroll: true,
        onSuccess: () => {
          Toast.fire({ icon: "success", title: "Contribution removed" });
        },
        onError: () => {
          Swal.fire({
            icon: "error",
            title: "Failed",
            text: "Unable to delete contribution.",
            customClass: {
              popup: swalBaseClasses.popup,
              title: swalBaseClasses.title,
              htmlContainer: swalBaseClasses.html,
              confirmButton: swalBaseClasses.primaryBtn,
            },
            buttonsStyling: false,
          });
        },
      });
    });
  };

  const handleContributionChange = (e, contribution) => {
    const updated = e.target.checked
      ? [...data.contribution_ids, contribution.id]
      : data.contribution_ids.filter((id) => id !== contribution.id);

    const total = contributions
      .filter((c) => updated.includes(c.id))
      .reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);

    setData({ ...data, contribution_ids: updated, total_amount: total });
  };

  const groupedData = schoolYears
    .filter((sy) => sy.is_active)
    .map((sy) => {
      const syItems = schoolYearContributions.filter((item) => item.school_year_id === sy.id);
      const gradeMap = {};
      syItems.forEach((item) => {
        const gradeName = item.grade_level?.name || "Unknown Grade";
        if (!gradeMap[gradeName]) gradeMap[gradeName] = [];
        gradeMap[gradeName].push(item);
      });
      gradeLevels.forEach((gl) => {
        const name = gl.name;
        if (!gradeMap[name]) gradeMap[name] = [];
      });
      return { schoolYear: sy.name, schoolYearId: sy.id, gradeMap };
    });

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400"></p>
            <div>
              <h1 className="text-3xl font-extrabold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                School Year Contributions</h1>
            </div>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="rounded-2xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500"
          >
            Assign Contribution
          </button>
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 py-6">
            <div className="relative w-full max-w-2xl rounded-3xl border border-slate-200 bg-white shadow-xl">
              <button
                onClick={handleCancel}
                className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100"
                aria-label="Close assign contribution modal"
              >
                ×
              </button>

              <div className="p-6 space-y-6">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Create Assignment</p>
                  <h2 className="text-xl font-semibold text-slate-900">Assign Contributions</h2>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid gap-5 md:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-slate-600">School Year</label>
                      <select
                        value={data.school_year_id}
                        onChange={(e) => setData("school_year_id", e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40"
                      >
                        <option value="">Select school year</option>
                        {schoolYears.filter((sy) => sy.is_active).map((sy) => (
                          <option key={sy.id} value={sy.id}>{sy.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-sm font-medium text-slate-600">Total Amount (₱)</label>
                      <input
                        type="number"
                        value={data.total_amount}
                        readOnly
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900"
                      />
                    </div>
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-600">Grade Levels</label>
                      <div className="max-h-48 overflow-y-auto rounded-2xl border border-slate-200 p-3 space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700">
                          <input
                            type="checkbox"
                            checked={data.grade_level_ids?.length === gradeLevels.length && gradeLevels.length > 0}
                            onChange={() => {
                              if (data.grade_level_ids?.length === gradeLevels.length) {
                                setData({ ...data, grade_level_ids: [] });
                              } else {
                                setData({ ...data, grade_level_ids: gradeLevels.map((gl) => gl.id) });
                              }
                            }}
                            className="accent-blue-600 h-4 w-4"
                          />
                          Select all
                        </label>
                        {gradeLevels.map((gl) => (
                          <label key={gl.id} className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
                            <input
                              type="checkbox"
                              checked={data.grade_level_ids?.includes(gl.id)}
                              onChange={(e) => {
                                const updated = e.target.checked
                                  ? [...(data.grade_level_ids || []), gl.id]
                                  : data.grade_level_ids.filter((id) => id !== gl.id);
                                setData({ ...data, grade_level_ids: updated });
                              }}
                              className="accent-blue-600 h-4 w-4"
                            />
                            {gl.name}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-600">Contributions</label>
                      <div className="max-h-48 overflow-y-auto rounded-2xl border border-slate-200 p-3 space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700">
                          <input
                            type="checkbox"
                            checked={data.contribution_ids.length === contributions.length && contributions.length > 0}
                            onChange={() => {
                              if (data.contribution_ids.length === contributions.length) {
                                setData({ ...data, contribution_ids: [], total_amount: 0 });
                              } else {
                                const allIds = contributions.map((c) => c.id);
                                const total = contributions.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);
                                setData({ ...data, contribution_ids: allIds, total_amount: total });
                              }
                            }}
                            className="accent-blue-600 h-4 w-4"
                          />
                          Select all
                        </label>
                        {contributions.map((c) => (
                          <label key={c.id} className="flex items-center justify-between gap-2 cursor-pointer text-sm text-slate-700">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={data.contribution_ids.includes(c.id)}
                                onChange={(e) => handleContributionChange(e, c)}
                                className="accent-blue-600 h-4 w-4"
                              />
                              {c.contribution_type}
                            </div>
                            <span className="text-xs font-semibold text-emerald-600">₱{parseFloat(c.amount || 0).toFixed(2)}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="inline-flex h-11 min-w-[130px] items-center justify-center rounded-full border border-slate-200 px-5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={processing}
                      className="inline-flex h-11 min-w-[130px] items-center justify-center rounded-full bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-60"
                    >
                      {processing ? "Assigning..." : "Assign"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {showEditModal && editingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 py-6">
            <div className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white shadow-xl">
              <button
                onClick={closeEditModal}
                type="button"
                className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100"
                aria-label="Close edit contribution modal"
              >
                ×
              </button>

              <div className="p-6 space-y-6">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Update Entry</p>
                  <h2 className="text-xl font-semibold text-slate-900">Update Contribution</h2>
                  <p className="text-sm text-slate-500">
                    {editingItem.contribution?.contribution_type} — {editingItem.grade_level?.name}
                  </p>
                </div>

                <form onSubmit={handleEditSubmit} className="space-y-5">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-600">Amount (₱)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editData.total_amount}
                      onChange={(e) => setEditData("total_amount", e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40"
                    />
                  </div>

                  <div className="flex flex-wrap justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={closeEditModal}
                      className="inline-flex h-11 min-w-[120px] items-center justify-center rounded-full border border-slate-200 px-5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={updating}
                      className="inline-flex h-11 min-w-[140px] items-center justify-center rounded-full bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-60"
                    >
                      {updating ? "Saving..." : "Save changes"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Display Contributions */}
        <div className="space-y-6">
          {groupedData.map(({ schoolYear, schoolYearId, gradeMap }) => {
            const orderedGradeNames = gradeLevels.map((gl) => gl.name);
            const extraGrades = Object.keys(gradeMap).filter((g) => !orderedGradeNames.includes(g));
            const grades = [...orderedGradeNames, ...extraGrades];
            const activeGrade = (activeTabs[schoolYearId] && grades.includes(activeTabs[schoolYearId])) ? activeTabs[schoolYearId] : grades[0];
            const items = activeGrade ? (gradeMap[activeGrade] || []) : [];
            const gradeTotal = items.reduce((sum, item) => sum + parseFloat(item.total_amount || 0), 0);

            return (
              <div key={schoolYearId} className="rounded-3xl border border-blue-100 bg-white shadow-sm">
                <div className="border-b border-blue-50 bg-blue-50 px-5 py-3 rounded-t-3xl">
                  <h2 className="text-lg font-semibold text-blue-900">{schoolYear}</h2>
                </div>
                <div className="p-5 space-y-4">
                  <div className="flex gap-2 overflow-x-auto p-1 rounded-xl bg-slate-100">
                    {grades.map((grade) => {
                      const isActive = activeGrade === grade;
                      const totalForTab = (gradeMap[grade] || []).reduce((sum, item) => sum + parseFloat(item.total_amount || 0), 0);
                      return (
                        <button
                          key={grade}
                          type="button"
                          onClick={() => setActiveTabs((prev) => ({ ...prev, [schoolYearId]: grade }))}
                          className={
                            `whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition border ` +
                            (isActive
                              ? "bg-white text-blue-700 shadow border-blue-200"
                              : "bg-transparent text-gray-600 hover:text-gray-800 hover:bg-white/60 border-transparent")
                          }
                        >
                          {grade}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-2 rounded-2xl border border-slate-100 bg-white">
                    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 rounded-t-2xl bg-slate-50">
                      <div className="flex items-center gap-3">
                        <span className="text-base font-semibold text-gray-800">{activeGrade || ""}</span>
                        <span className="inline-flex items-center text-xs font-semibold px-2 py-1 rounded-full bg-green-100 text-green-700">Total: ₱{gradeTotal.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="px-4 py-3 space-y-2">
                      {grades.length === 0 ? (
                        <p className="text-gray-500 italic">No grades available.</p>
                      ) : items.length > 0 ? (
                        <>
                          <div className="grid grid-cols-12 gap-2 border-b pb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                            <div className="col-span-7">Contribution</div>
                            <div className="col-span-2">Assigned Amount</div>
                            <div className="col-span-3 text-right">Actions</div>
                          </div>
                          {items.map((item) => {
                            const amt = parseFloat(item.total_amount ?? item.contribution?.amount ?? 0);
                            return (
                              <div key={item.id} className="grid grid-cols-12 items-center gap-2 py-2 text-slate-700">
                                <div className="col-span-7">
                                  <p className="font-medium text-gray-800">{item.contribution?.contribution_type}</p>
                                </div>
                                <div className="col-span-2">
                                  <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-800">₱{amt.toFixed(2)}</span>
                                </div>
                                <div className="col-span-3">
                                  <div className="flex items-center justify-end gap-2 text-sm">
                                    <button
                                      type="button"
                                      onClick={() => openEditModal(item)}
                                      className="rounded-full bg-amber-500 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-amber-600"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDelete(item)}
                                      className="rounded-full bg-red-500 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-red-600"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </>
                      ) : (
                        <p className="text-gray-500 italic">No contributions assigned yet.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AdminLayout>
  );
}
