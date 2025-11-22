import React, { useState, useEffect } from "react";
import AdminLayout from "@/Layouts/AdminLayout";
import { useForm, usePage, router } from "@inertiajs/react";
import { PlusCircle } from "lucide-react";
import Swal from "sweetalert2";

const SchoolYear = () => {
  const { schoolYears: initialSchoolYears = [] } = usePage().props;

  const { data, setData, post, processing, reset } = useForm({
    name: "",
    start_date: "",
    end_date: "",
  });

  const [schoolYears, setSchoolYears] = useState(initialSchoolYears);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    setSchoolYears(initialSchoolYears);
  }, [initialSchoolYears]);

  const totalSchoolYears = schoolYears.length;

  const toast = Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    customClass: {
      popup: "rounded-2xl shadow-lg border border-slate-100",
      title: "text-sm font-semibold text-slate-800",
    },
  });

  const swalBaseClasses = {
    popup: "rounded-3xl shadow-2xl p-6",
    title: "text-lg font-bold text-slate-900",
    html: "text-slate-600",
    primaryBtn:
      "!px-6 !py-2.5 !text-sm !font-semibold !rounded-2xl !bg-blue-600 !text-white hover:!bg-blue-700",
    secondaryBtn:
      "!px-6 !py-2.5 !text-sm !font-semibold !rounded-2xl !border !border-slate-200 !text-slate-600 hover:!bg-slate-100",
  };

  // 📌 Format date as "Month Day, Year"
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  // Add new school year
  const handleSubmit = (e) => {
    e.preventDefault();

    if (!data.name || !data.start_date || !data.end_date) {
      toast.fire({ icon: "error", title: "Please fill all fields." });
      return;
    }

    if (new Date(data.start_date) > new Date(data.end_date)) {
      toast.fire({
        icon: "error",
        title: "Start date cannot be after end date.",
      });
      return;
    }

    Swal.fire({
      title: "Review details",
      html: `
       <div class="text-left text-sm text-slate-700">
  <div class="grid grid-cols-3 gap-6 items-start">
    <!-- School Year -->
    <div>
      <p class="text-xs uppercase tracking-wide text-slate-400">School Year</p>
      <p class="text-base font-semibold">${data.name}</p>
    </div>

    <!-- Start -->
    <div>
      <p class="text-xs uppercase tracking-wide text-slate-400">Start</p>
      <p class="font-semibold">${data.start_date}</p>
    </div>

    <!-- End -->
    <div>
      <p class="text-xs uppercase tracking-wide text-slate-400">End</p>
      <p class="font-semibold">${data.end_date}</p>
    </div>
  </div>
</div>
      `,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Save",
      cancelButtonText: "Edit",
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
      if (result.isConfirmed) {
        post("/admin/schoolyear", {
          preserveState: true,
          onSuccess: (page) => {
            if (page.props.schoolYears) setSchoolYears(page.props.schoolYears);
            reset();
            setShowModal(false);
            toast.fire({
              icon: "success",
              title: "School Year added (active)!",
            });
          },
          onError: () =>
            toast.fire({ icon: "error", title: "Failed to add school year." }),
        });
      }
    });
  };

  // Toggle active school year
  const toggleActive = (sy) => {
    router.put(
      `/admin/schoolyear/${sy.id}/toggle-active`,
      {},
      {
        preserveState: true,
        onSuccess: (page) => {
          setSchoolYears(page.props.schoolYears);
          toast.fire({
            icon: "success",
            title: `School year ${sy.is_active ? "deactivated" : "activated"}!`,
          });
        },
        onError: () =>
          toast.fire({
            icon: "error",
            title: "Failed to toggle school year.",
          }),
      }
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400"></p>
            <div>
              <h1 className="text-3xl font-extrabold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                School Year</h1>
            </div>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="rounded-2xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500"
          >
            <span className="inline-flex items-center gap-2">
              <PlusCircle size={16} /> Add School Year
            </span>
          </button>
        </div>

        {/* School Years Table */}
        <div className="overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-blue-50 px-5 py-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">School Years</h2>
              <p className="text-sm text-slate-500">Toggle the active year students will use.</p>
            </div>
            <span className="text-xs font-medium uppercase tracking-[0.3em] text-slate-400">{totalSchoolYears || 0} records</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-slate-700">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 border text-left font-semibold">Name</th>
                  <th className="px-4 py-3 border text-left font-semibold">Start Date</th>
                  <th className="px-4 py-3 border text-left font-semibold">End Date</th>
                  <th className="px-4 py-3 border text-center font-semibold">Active</th>
                </tr>
              </thead>
              <tbody>
                {schoolYears.length ? (
                  schoolYears.map((sy, idx) => (
                    <tr
                      key={sy.id}
                      className={`${idx % 2 === 0 ? "bg-white" : "bg-blue-50/40"} hover:bg-blue-50`}
                    >
                      <td className="border px-4 py-3 font-semibold text-slate-900">{sy.name}</td>
                      <td className="border px-4 py-3">{formatDate(sy.start_date)}</td>
                      <td className="border px-4 py-3">{formatDate(sy.end_date)}</td>
                      <td className="border px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-3">
                          <span
                            className={`inline-flex items-center text-xs font-semibold px-2 py-1 rounded-full ${sy.is_active
                              ? "bg-green-100 text-green-700"
                              : "bg-slate-200 text-slate-700"
                              }`}
                          >
                            {sy.is_active ? "Active" : "Inactive"}
                          </span>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={sy.is_active}
                              onChange={() => toggleActive(sy)}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 rounded-full bg-slate-200 transition peer-checked:bg-blue-500">
                              <div className="absolute top-[2px] left-[2px] h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
                            </div>
                          </label>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="py-6 text-center text-slate-500 italic">
                      No school years found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add School Year Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 py-6">
            <div className="relative w-full max-w-lg rounded-3xl border border-slate-200 bg-white shadow-2xl">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100"
                aria-label="Close add school year modal"
              >
                ×
              </button>

              <div className="p-6 space-y-6">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">School Year</p>
                  <h2 className="text-2xl font-semibold text-slate-900">Add School Year</h2>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Name</label>
                    <input
                      type="text"
                      value={data.name}
                      onChange={(e) => setData("name", e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40"
                      placeholder="e.g., 2024-2025"
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Start Date</label>
                      <input
                        type="date"
                        value={data.start_date}
                        onChange={(e) => setData("start_date", e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">End Date</label>
                      <input
                        type="date"
                        value={data.end_date}
                        onChange={(e) => setData("end_date", e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="inline-flex h-11 min-w-[120px] items-center justify-center rounded-full border border-slate-200 px-5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={processing}
                      className="inline-flex h-11 min-w-[120px] items-center justify-center rounded-full bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-60"
                    >
                      {processing ? "Saving..." : "Save"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

export default SchoolYear;
