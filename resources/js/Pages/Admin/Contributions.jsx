import React, { useState } from 'react';
import { usePage, router } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import Swal from 'sweetalert2';

export default function Contributions() {
  const { contributions = [] } = usePage().props;

  const [formData, setFormData] = useState({
    contribution_type: '',
    amount: '',
    mandatory: false,
  });

  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const swalBaseClasses = {
    popup: 'rounded-3xl shadow-2xl p-6 text-left',
    title: 'text-lg font-bold text-slate-900',
    html: 'text-slate-600',
    primaryBtn:
      '!px-6 !py-2.5 !text-sm !font-semibold !rounded-2xl !bg-blue-600 !text-white hover:!bg-blue-700 focus-visible:!ring-2 focus-visible:!ring-blue-300',
    secondaryBtn:
      '!px-6 !py-2.5 !text-sm !font-semibold !rounded-2xl !border !border-slate-200 !text-slate-600 hover:!bg-slate-50',
    warnBtn:
      '!px-6 !py-2.5 !text-sm !font-semibold !rounded-2xl !bg-red-500 !text-white hover:!bg-red-600 focus-visible:!ring-2 focus-visible:!ring-red-300',
  };

  const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 2800,
    timerProgressBar: true,
    customClass: {
      popup: 'rounded-2xl border border-blue-100 bg-white/95 px-4 py-3 shadow-lg text-sm text-slate-800',
      title: 'text-sm font-semibold text-slate-900',
    },
  });

  const openAddModal = () => {
    setFormData({ contribution_type: '', amount: '', mandatory: false });
    setIsEditing(false);
    setEditingId(null);
    setShowModal(true);
  };

  const openEditModal = (contribution) => {
    setFormData({
      contribution_type: contribution.contribution_type,
      amount: contribution.amount,
      mandatory: Boolean(contribution.mandatory),
    });
    setIsEditing(true);
    setEditingId(contribution.id);
    setShowModal(true);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const trimmedType = (formData.contribution_type || '').trim();
    const numericAmount = parseFloat(formData.amount);

    if (!trimmedType) {
      Swal.fire({
        icon: 'warning',
        title: 'Contribution type is required',
        text: 'Please provide a descriptive label so guardians know what they are paying for.',
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

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Invalid amount',
        text: 'Enter a value greater than zero to keep totals accurate.',
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

    const actionText = isEditing ? 'update this contribution' : 'add this contribution';
    const successTitle = isEditing ? 'Contribution Updated!' : 'Contribution Added!';
    const confirmText = isEditing ? 'Yes, Update it!' : 'Yes, Add it!';
    const reviewHtml = `
      <div class="space-y-3 text-left">
        <p class="text-xs uppercase tracking-[0.3em] text-slate-400">Summary</p>
        <div class="flex flex-wrap gap-4 rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3">
          <div class="flex-1 min-w-[160px]">
            <p class="text-[11px] uppercase tracking-[0.2em] text-slate-400">Contribution</p>
            <p class="text-base font-semibold text-slate-900">${trimmedType}</p>
          </div>
          <div class="flex-1 min-w-[140px] text-right">
            <p class="text-[11px] uppercase tracking-[0.2em] text-slate-400">Amount</p>
            <p class="text-xl font-semibold text-emerald-600">₱${numericAmount.toFixed(2)}</p>
          </div>
        </div>
      </div>
    `;

    Swal.fire({
      title: 'Review contribution',
      html: reviewHtml,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: confirmText,
      cancelButtonText: 'Go Back',
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
        const payload = {
          contribution_type: trimmedType,
          amount: numericAmount,
          mandatory: Boolean(formData.mandatory),
        };

        const callbacks = {
          onSuccess: () => {
            setFormData({ contribution_type: '', amount: '', mandatory: false });
            setShowModal(false);
            setIsEditing(false);
            setEditingId(null);
            Toast.fire({
              icon: 'success',
              title: successTitle,
              text: 'Saved successfully.',
            });
          },
          onError: () => {
            Toast.fire({
              icon: 'error',
              title: 'Action failed',
              text: 'Something went wrong.',
            });
          },
        };

        if (isEditing) {
          router.put(route('admin.contributions.update', editingId), payload, callbacks);
        } else {
          router.post(route('admin.contributions.store'), payload, callbacks);
        }
      }
    });
  };

  const handleCancel = () => {
    Swal.fire({
      title: 'Discard changes?',
      text: 'Your inputs for this contribution will be lost.',
      icon: 'warning',
      showCancelButton: true,
      cancelButtonText: 'Keep editing',
      confirmButtonText: 'Discard',
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
        setShowModal(false);
        setIsEditing(false);
        setEditingId(null);
        Toast.fire({
          icon: 'info',
          title: 'Draft discarded',
          text: 'Form closed.',
        });
      }
    });
  };

  // Totals calculation
  const totalMandatory = contributions
    .filter((c) => c.mandatory)
    .reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);

  const totalNotMandatory = contributions
    .filter((c) => !c.mandatory)
    .reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);

  const overallTotal = totalMandatory + totalNotMandatory;

  const summaryCards = [
    {
      label: 'Mandatory Total',
      value: `₱${totalMandatory.toFixed(2)}`,
      hint: 'Sum of all mandatory fees',
    },
    {
      label: 'Optional Total',
      value: `₱${totalNotMandatory.toFixed(2)}`,
      hint: 'Sum of non-mandatory fees',
    },
    {
      label: 'Overall Total',
      value: `₱${overallTotal.toFixed(2)}`,
      hint: 'Combined collection fees',
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400"></p>
            <div>
              <h1 className="text-3xl font-extrabold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                Contribution Types</h1>
            </div>
          </div>
          <button
            onClick={openAddModal}
            className="rounded-2xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500"
          >
            + Add Contribution
          </button>
        </div>

        {/* Totals Summary */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {summaryCards.map((card) => (
            <div key={card.label} className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.1em] text-slate-400">{card.label}</p>
              <div className="mt-2 text-2xl font-semibold text-slate-900">{card.value}</div>
              <p className="text-xs text-slate-500">{card.hint}</p>
            </div>
          ))}
        </div>

        {/* Contributions Table */}
        <div className="overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-sm">
          <table className="w-full text-sm text-slate-700">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Contribution</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Mandatory</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {contributions.length === 0 && (
                <tr>
                  <td colSpan="4" className="px-6 py-6 text-center text-slate-400 italic">
                    No contribution types recorded yet.
                  </td>
                </tr>
              )}
              {contributions.map((c, idx) => (
                <tr
                  key={c.id}
                  className={`${idx % 2 === 0 ? 'bg-white' : 'bg-blue-50/40'} transition hover:bg-blue-50`}
                >
                  <td className="px-6 py-4 text-slate-900 font-medium">{c.contribution_type}</td>
                  <td className="px-6 py-4 font-semibold text-emerald-600">₱{parseFloat(c.amount).toFixed(2)}</td>
                  <td className="px-6 py-4">
                    {c.mandatory ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                        Mandatory
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                        Non-Mandatory
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => openEditModal(c)}
                      className="rounded-full bg-amber-500 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-amber-600"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 py-6">
          <div className="relative w-full max-w-xl rounded-3xl border border-slate-200 bg-white shadow-xl">
            <button
              onClick={handleCancel}
              className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100"
              aria-label="Close contribution modal"
            >
              ×
            </button>

            <div className="p-6 space-y-6">
              <div>
                <p className="text-xs uppercase tracking-[0.1em] text-slate-400">{isEditing ? 'Update' : 'Create'} </p>
                <h2 className="text-xl font-semibold text-slate-900">{isEditing ? 'Edit Contribution' : 'Add Contribution'}</h2>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-600">Contribution Type</label>
                  <input
                    type="text"
                    name="contribution_type"
                    value={formData.contribution_type}
                    onChange={handleChange}
                    required
                    className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-600">Amount (₱)</label>
                  <input
                    type="number"
                    name="amount"
                    step="0.01"
                    value={formData.amount}
                    onChange={handleChange}
                    required
                    className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40"
                  />
                </div>
                <label className="flex items-center gap-3 text-sm font-medium text-slate-600">
                  <input
                    type="checkbox"
                    name="mandatory"
                    checked={formData.mandatory}
                    onChange={handleChange}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  Mandatory
                </label>

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
                    className="inline-flex h-11 min-w-[130px] items-center justify-center rounded-full bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-500"
                  >
                    {isEditing ? 'Save changes' : 'Save contribution'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

const StatCard = ({ label, value, hint }) => (
  <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
    <p className="text-xs uppercase tracking-[0.1em] text-slate-400">{label}</p>
    <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
    <p className="text-xs text-slate-500">{hint}</p>
  </div>
);
