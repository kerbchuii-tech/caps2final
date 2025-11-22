import React, { useState, useMemo, useEffect } from "react";
import TreasurerLayout from "@/Layouts/TreasurerLayout";
import { useForm, usePage } from "@inertiajs/react";
import { motion, AnimatePresence } from "framer-motion";
import { PlusCircle, X, Gift, FileText, PiggyBank, AlertTriangle, Archive } from "lucide-react";
import Swal from "sweetalert2"; // ✅ SweetAlert2 import

export default function Donations() {
  const { donations, auth, inKindSummary = [] } = usePage().props;

  const today = new Date().toISOString().split("T")[0];

  const donationForm = useForm({
    donated_by: "",
    donation_type: "cash",
    donation_amount: "",
    donation_description: "",
    donation_quantity: "",
    item_type: "",
    donation_date: today,
  });
  const { data, setData, post, processing, reset } = donationForm;

  const statusForm = useForm({
    usage_status: "Usable",
    usable_quantity: "",
    damaged_quantity: "",
    unusable_quantity: "",
    status_notes: "",
  });
  const {
    data: statusData,
    setData: setStatusData,
    put: putStatus,
    processing: statusProcessing,
    reset: resetStatusForm,
  } = statusForm;

  const [isOpen, setIsOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [donationTab, setDonationTab] = useState("cash");
  const [statusModal, setStatusModal] = useState(null);
  const pageSize = 10;

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

  const filteredDonations = useMemo(() => {
    return donations.filter((donation) =>
      donationTab === "cash"
        ? donation.donation_type === "cash"
        : donation.donation_type === "in-kind"
    );
  }, [donations, donationTab]);

  const inKindMap = useMemo(() => {
    const map = new Map();
    (inKindSummary || []).forEach((entry) => map.set(entry.id, entry));
    return map;
  }, [inKindSummary]);

  const totalDonations = filteredDonations.length;
  const totalPages = Math.max(1, Math.ceil(totalDonations / pageSize));
  const totalCashAmount = donations
    .filter((d) => d.donation_type === "cash")
    .reduce((sum, d) => sum + Number(d.donation_amount || 0), 0);
  const totalInKindValue = donations
    .filter((d) => d.donation_type === "in-kind")
    .reduce((sum, d) => sum + Number(d.donation_amount || 0), 0);
  const inKindItems = donations.filter((d) => d.donation_type === "in-kind").length;
  const criticalInKind = (donations || []).filter((d) => (d.usage_status || "").toLowerCase().includes("damage") || (d.usage_status || "").toLowerCase().includes("unusable")).length;

  const paginatedDonations = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredDonations.slice(start, start + pageSize);
  }, [filteredDonations, page]);

  const showingStart = totalDonations === 0 ? 0 : (page - 1) * pageSize + 1;
  const showingEnd = Math.min(page * pageSize, totalDonations);

  useEffect(() => {
    setPage(1);
  }, [donationTab]);

  const gotoPage = (target) => {
    const clamped = Math.min(Math.max(target, 1), totalPages);
    if (clamped !== page) setPage(clamped);
  };

  const getInKindDetails = (donation) => {
    const summary = inKindMap.get(donation.id);
    const donated = Number(
      donation.donation_quantity ??
        summary?.donated_quantity ??
        0
    );

    const damaged = Number(donation.damaged_quantity ?? summary?.damaged_quantity ?? 0);
    const unusable = Number(donation.unusable_quantity ?? summary?.unusable_quantity ?? 0);
    const usedFromSummary = summary?.used_quantity != null ? Number(summary.used_quantity) : null;
    const storedRemaining = summary?.remaining_quantity ?? donation.usable_quantity;

    const baselineRemaining = storedRemaining != null
      ? Number(storedRemaining)
      : Math.max(donated - Number(donation.used_quantity ?? 0), 0);

    const adjustedRemaining = Math.max(baselineRemaining - damaged - unusable, 0);

    const used = usedFromSummary != null
      ? Number(usedFromSummary)
      : Math.max(donated - adjustedRemaining - damaged - unusable, 0);

    return {
      donated,
      used,
      remaining: adjustedRemaining,
      usable: adjustedRemaining,
      damaged,
      unusable,
      status: donation.usage_status || summary?.usage_status || "Available",
      notes: donation.usage_notes || summary?.usage_notes || "",
    };
  };

  const openStatusModal = (donation) => {
    const details = getInKindDetails(donation);
    resetStatusForm();
    setStatusData((prev) => ({
      ...prev,
      usage_status: details.status,
      usable_quantity: details.remaining ?? "",
      damaged_quantity: donation.damaged_quantity ?? "",
      unusable_quantity: donation.unusable_quantity ?? "",
      status_notes: details.notes,
    }));
    setStatusModal(donation);
  };

  const closeStatusModal = () => {
    setStatusModal(null);
    resetStatusForm();
  };

  const handleStatusChange = (field, value) => {
    setStatusData(field, value);
  };

  const submitStatusUpdate = (e) => {
    e.preventDefault();
    if (!statusModal) return;

    putStatus(`/treasurer/donations/${statusModal.id}/update-status`, {
      preserveScroll: true,
      onSuccess: () => {
        Swal.fire({
          icon: "success",
          title: "Status updated",
          timer: 1400,
          showConfirmButton: false,
        });
        closeStatusModal();
      },
      onError: (errors) => {
        const firstError = errors ? Object.values(errors)[0] : null;
        Swal.fire({
          icon: "error",
          title: "Unable to update",
          text: firstError || "Please review the inputs and try again.",
        });
      },
    });
  };

  const formatCurrency = (value) => {
    const n = Number(value || 0);
    return n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleTypeChange = (value) => {
    setData("donation_type", value);
    if (value !== "in-kind") {
      setData("donation_quantity", "");
      setData("item_type", "");
    } else if (!data.donation_quantity) {
      setData("donation_quantity", "1");
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    Swal.fire({
      title: "Confirm Donation",
      text: "Are you sure you want to save this donation?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#2563eb",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, save it!",
    }).then((result) => {
      if (result.isConfirmed) {
        post("/treasurer/donations/store", {
          onSuccess: () => {
            reset();
            setIsOpen(false);
            Swal.fire({
              title: "Success!",
              text: "Donation has been saved successfully.",
              icon: "success",
              toast: true,
              position: "top-end",
              showConfirmButton: false,
              timer: 2500,
              timerProgressBar: true,
            });
          },
          onError: () => {
            Swal.fire({
              title: "Error!",
              text: "Something went wrong. Please try again.",
              icon: "error",
              confirmButtonColor: "#2563eb",
            });
          },
        });
      }
    });
  };

  return (
    <TreasurerLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="space-y-1">
              <h1 className="text-3xl font-extrabold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
               Donations
            </h1>
          </div>
          <button
            onClick={() => setIsOpen(true)}
            className="inline-flex items-center gap-2 rounded-2xl border border-blue-100 bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
          >
            <PlusCircle size={18} />
            Add Donation
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <DonationStatCard icon={<PiggyBank className="text-blue-600" size={20} />} label="Cash Raised" value={`₱${formatCurrency(totalCashAmount)}`} helper="All-time recorded" />
          <DonationStatCard icon={<Gift className="text-indigo-600" size={20} />} label="In-Kind Value" value={`₱${formatCurrency(totalInKindValue)}`} helper={`${inKindItems} items logged`} />
          <DonationStatCard icon={<FileText className="text-emerald-600" size={20} />} label="Entries Logged" value={totalDonations} helper={`${donationTab === "cash" ? "Cash" : "In-Kind"} tab`} />
          <DonationStatCard icon={<AlertTriangle className="text-rose-500" size={20} />} label="Needs Attention" value={criticalInKind} helper="Damaged / unusable" />
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 mb-5 md:flex-row md:items-center md:justify-between">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <FileText className="text-slate-500" size={20} /> Donation Records
            </h2>
            <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-1">
              {[
                { key: "cash", label: "Cash" },
                { key: "in-kind", label: "In-Kind" },
              ].map((tab) => {
                const active = donationTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setDonationTab(tab.key)}
                    className={`px-4 py-1.5 text-sm font-semibold rounded-full transition ${
                      active ? "bg-white text-blue-600 shadow" : "text-slate-500 hover:text-blue-600"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="w-full text-sm text-left text-slate-700">
              <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                {donationTab === "cash" ? (
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Donated By</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Received By</th>
                  </tr>
                ) : (
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Donated By</th>
                    <th className="px-4 py-3">Item Type</th>
                    <th className="px-4 py-3">Details</th>
                    <th className="px-4 py-3 text-center">Quantity Used</th>
                    <th className="px-4 py-3 text-center">Qty Remaining</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Received By</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                )}
              </thead>
              <tbody className="divide-y">
                {paginatedDonations.length > 0 ? (
                  paginatedDonations.map((d, idx) => {
                    const inKindDetails = donationTab === "in-kind" ? getInKindDetails(d) : null;
                    const rowBaseClass = `${idx % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-blue-50/60 transition`;

                    if (donationTab === "cash") {
                      return (
                        <tr key={d.id} className={rowBaseClass}>
                          <td className="px-4 py-3 text-gray-600">
                            {formatFullTimestamp(d.timestamp || d.donation_date)}
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-800">{d.donated_by}</td>
                          <td className="px-4 py-3 font-semibold text-gray-900">₱{formatCurrency(d.donation_amount)}</td>
                          <td className="px-4 py-3 text-gray-800 font-medium">{d.received_by}</td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={d.id} className={rowBaseClass}>
                        <td className="px-4 py-3 text-gray-600">
                          {formatFullTimestamp(d.timestamp || d.donation_date)}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-800">{d.donated_by}</td>
                        <td className="px-4 py-3 text-gray-700 font-semibold">{d.item_type || "—"}</td>
                        <td className="px-4 py-3 text-gray-600">{d.donation_description || "—"}</td>
                        <td className="px-4 py-3 text-center font-semibold text-amber-600">{inKindDetails?.used ?? 0}</td>
                        <td className="px-4 py-3 text-center font-bold text-emerald-600">{inKindDetails?.remaining ?? 0}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          <div className="flex flex-col gap-1">
                            <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
                              <span className={`inline-flex h-2 w-2 rounded-full ${
                                inKindDetails?.status?.toLowerCase().includes("damage")
                                  ? "bg-amber-500"
                                  : inKindDetails?.status?.toLowerCase().includes("unusable")
                                  ? "bg-rose-500"
                                  : "bg-emerald-500"
                              }`} />
                              {inKindDetails?.status || "Available"}
                            </span>
                            <div className="flex flex-wrap gap-3 text-[11px] text-slate-500">
                              <span>Usable: <strong className="text-slate-700">{inKindDetails?.usable ?? 0}</strong></span>
                              <span>Damaged: <strong className="text-amber-600">{inKindDetails?.damaged ?? 0}</strong></span>
                              <span>Unusable: <strong className="text-rose-600">{inKindDetails?.unusable ?? 0}</strong></span>
                            </div>
                            {inKindDetails?.notes && (
                              <span className="text-xs text-slate-500">{inKindDetails.notes}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-800 font-medium">{d.received_by}</td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => openStatusModal(d)}
                            className="px-4 py-1.5 text-xs font-semibold rounded-full bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100"
                          >
                            Update Status
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={donationTab === "cash" ? 4 : 9} className="text-center py-8 text-gray-500">
                      No donations recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-col items-center gap-3 text-sm text-slate-600">
            <span className="text-center">
              {totalDonations === 0
                ? "Showing 0 donations"
                : `Showing ${showingStart} to ${showingEnd} of ${totalDonations} donation${totalDonations === 1 ? "" : "s"}`}
            </span>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => gotoPage(page - 1)}
                disabled={page === 1}
                className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-100 disabled:opacity-50"
              >
                ‹
              </button>
              <button
                type="button"
                className="w-9 h-9 rounded-xl bg-blue-600 text-white font-semibold flex items-center justify-center shadow"
              >
                {page}
              </button>
              <button
                type="button"
                onClick={() => gotoPage(page + 1)}
                disabled={page === totalPages}
                className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-100 disabled:opacity-50"
              >
                ›
              </button>
            </div>
          </div>
        </div>

        {/* Modal */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl p-8 relative border border-gray-100 max-h-[90vh] overflow-y-auto"
                initial={{ scale: 0.96, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.96, opacity: 0 }}
              >
                {/* Close Button */}
                <button
                  onClick={() => setIsOpen(false)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition"
                >
                  <X size={22} />
                </button>

                <h2 className="text-2xl font-bold mb-6 text-gray-900 flex items-center gap-2">
                  <FileText size={22} className="text-blue-600" />
                  Add Donation
                </h2>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid gap-5 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-700">Donated By</label>
                      <input
                        type="text"
                        value={data.donated_by}
                        onChange={(e) => setData("donated_by", e.target.value)}
                        placeholder="Full name of donor"
                        className="w-full border border-gray-300 rounded-2xl px-3 py-2 focus:ring-2 focus:ring-blue-400 outline-none shadow-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-700">Type of Donation</label>
                      <select
                        value={data.donation_type}
                        onChange={(e) => handleTypeChange(e.target.value)}
                        className="w-full border border-gray-300 rounded-2xl px-3 py-2 focus:ring-2 focus:ring-blue-400 outline-none shadow-sm"
                      >
                        <option value="cash">Cash</option>
                        <option value="in-kind">In-Kind</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-700">
                        {data.donation_type === "cash" ? "Cash Amount" : "Estimated Value"}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={data.donation_amount}
                        onChange={(e) => setData("donation_amount", e.target.value)}
                        placeholder={data.donation_type === "cash" ? "0.00" : "0.00 (estimated)"}
                        className="w-full border border-gray-300 rounded-2xl px-3 py-2 focus:ring-2 focus:ring-blue-400 outline-none shadow-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-700">Donation Date</label>
                      <input
                        type="text"
                        value={today}
                        readOnly
                        className="w-full border border-gray-200 rounded-2xl px-3 py-2 bg-gray-50 text-gray-700"
                      />
                    </div>
                  </div>

                  {data.donation_type === "in-kind" && (
                    <div className="grid gap-5 md:grid-cols-2">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-1 text-gray-700">Item Type</label>
                          <input
                            type="text"
                            value={data.item_type}
                            onChange={(e) => setData("item_type", e.target.value)}
                            className="w-full border border-gray-300 rounded-2xl px-3 py-2 focus:ring-2 focus:ring-blue-400 outline-none shadow-sm"
                            placeholder="e.g., Rice, School Supplies"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1 text-gray-700">Quantity</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={data.donation_quantity}
                            onChange={(e) => setData("donation_quantity", e.target.value)}
                            placeholder="0"
                            className="w-full border border-gray-300 rounded-2xl px-3 py-2 focus:ring-2 focus:ring-blue-400 outline-none shadow-sm"
                            required
                          />
                          <p className="mt-1 text-xs text-gray-500">Use decimals for partial items (e.g., 0.5 box).</p>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700">Item Details</label>
                        <textarea
                          value={data.donation_description}
                          onChange={(e) => setData("donation_description", e.target.value)}
                          className="w-full border border-gray-300 rounded-2xl px-3 py-2 focus:ring-2 focus:ring-blue-400 outline-none shadow-sm min-h-[120px]"
                          placeholder="Type of item, description, etc."
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="px-4 py-2 rounded-2xl border text-gray-700 hover:bg-gray-100 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={processing}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-2xl font-semibold shadow transition disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
                    >
                      {processing ? "Saving..." : "Save Donation"}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Status Modal */}
        <AnimatePresence>
          {statusModal && (
            <motion.div
              className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8 relative border border-gray-100"
                initial={{ scale: 0.96, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.96, opacity: 0 }}
              >
                <button
                  onClick={closeStatusModal}
                  className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition"
                >
                  <X size={22} />
                </button>

                <h2 className="text-2xl font-bold mb-6 text-gray-900">Update Donation Status</h2>

                <form onSubmit={submitStatusUpdate} className="space-y-5">
                  {statusModal && (
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700">Item Type</label>
                        <input
                          type="text"
                          value={statusModal.item_type || "—"}
                          readOnly
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 text-gray-600"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700">Item Details</label>
                        <input
                          type="text"
                          value={statusModal.donation_description || "—"}
                          readOnly
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 text-gray-600"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">Status</label>
                    <select
                      value={statusData.usage_status}
                      onChange={(e) => handleStatusChange("usage_status", e.target.value)}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-400 outline-none shadow-sm"
                    >
                      <option value="Usable">Usable</option>
                      <option value="Partially Used">Partially Used</option>
                      <option value="Damaged">Damaged</option>
                      <option value="Unusable">Completely Unusable</option>
                    </select>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-700">Usable Qty</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={statusData.usable_quantity}
                        onChange={(e) => handleStatusChange("usable_quantity", e.target.value)}
                        className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-400 outline-none shadow-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-700">Damaged Qty</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={statusData.damaged_quantity}
                        onChange={(e) => handleStatusChange("damaged_quantity", e.target.value)}
                        className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-400 outline-none shadow-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-700">Unusable Qty</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={statusData.unusable_quantity}
                        onChange={(e) => handleStatusChange("unusable_quantity", e.target.value)}
                        className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-400 outline-none shadow-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">Notes / Details</label>
                    <textarea
                      value={statusData.status_notes}
                      onChange={(e) => handleStatusChange("status_notes", e.target.value)}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-400 outline-none shadow-sm"
                      placeholder="Describe the item condition"
                    />
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={closeStatusModal}
                      className="px-4 py-2 rounded-xl border text-gray-700 hover:bg-gray-100 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={statusProcessing}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl font-semibold shadow transition disabled:opacity-60"
                    >
                      {statusProcessing ? "Saving..." : "Save"}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </TreasurerLayout>
  );
}

const DonationStatCard = ({ icon, label, value, helper }) => (
  <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
    <div className="flex items-center gap-3">
      <div className="rounded-2xl bg-slate-50 p-2">{icon}</div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{label}</p>
        <p className="text-xl font-semibold text-slate-900">{value}</p>
        {helper && <p className="text-xs text-slate-500 mt-0.5">{helper}</p>}
      </div>
    </div>
  </div>
);
