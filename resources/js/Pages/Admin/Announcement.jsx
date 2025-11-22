import React, { useMemo, useState } from "react";
import AdminLayout from "@/Layouts/AdminLayout";
import { usePage, router } from "@inertiajs/react";
import { PlusCircle, Edit, Archive, X, Megaphone, CalendarDays, UserRound } from "lucide-react";
import Swal from "sweetalert2";

const Announcement = () => {
  const { announcements = [], auth, activeSchoolYear } = usePage().props;

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [announcementDate, setAnnouncementDate] = useState('');
  const [type, setType] = useState('general');
  const [editingId, setEditingId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [viewingAnnouncement, setViewingAnnouncement] = useState(null);
  const [showingArchived, setShowingArchived] = useState(false);

  const activeAnnouncements = useMemo(
    () => announcements.filter((a) => !a.is_archived),
    [announcements]
  );

  const archivedAnnouncements = useMemo(
    () => announcements.filter((a) => a.is_archived),
    [announcements]
  );

  const displayedAnnouncements = showingArchived
    ? archivedAnnouncements
    : activeAnnouncements;

  const summaryCards = useMemo(
    () => [
      {
        label: 'Total Announcements',
        value: announcements.length,
        hint: 'Overall entries recorded',
      },
      {
        label: 'Active',
        value: activeAnnouncements.length,
        hint: 'Visible to guardians',
      },
      {
        label: 'Archived',
        value: archivedAnnouncements.length,
        hint: 'Hidden but retained',
      },
    ],
    [announcements.length, activeAnnouncements.length, archivedAnnouncements.length]
  );

  const resetModal = () => {
    setTitle('');
    setMessage('');
    setAnnouncementDate('');
    setType('general');
    setEditingId(null);
    setShowModal(false);
  };

  const extractYear = (dateStr) => {
    if (!dateStr) return "--";
    try {
      return new Date(dateStr).getFullYear();
    } catch (error) {
      return "--";
    }
  };

  const swalBaseClasses = {
    popup: 'rounded-3xl shadow-2xl p-6 text-left',
    title: 'text-lg font-semibold text-slate-900',
    htmlContainer: 'text-sm text-slate-600',
    confirmButton:
      '!px-6 !py-2.5 !text-sm !font-semibold !rounded-2xl !bg-blue-600 !text-white hover:!bg-blue-700 focus-visible:!ring-2 focus-visible:!ring-blue-300',
    cancelButton:
      '!px-6 !py-2.5 !text-sm !font-semibold !rounded-2xl !border !border-slate-200 !text-slate-600 hover:!bg-slate-50',
    denyButton:
      '!px-6 !py-2.5 !text-sm !font-semibold !rounded-2xl !bg-red-500 !text-white hover:!bg-red-600 focus-visible:!ring-2 focus-visible:!ring-red-300',
  };

  const swalFire = (options = {}) => {
    const mergedClasses = {
      ...swalBaseClasses,
      ...(options.customClass || {}),
    };

    return Swal.fire({
      buttonsStyling: false,
      ...options,
      customClass: mergedClasses,
      didOpen: (popup) => {
        popup.parentNode.style.zIndex = 100000;
      }
    });
  };

  const formatDate = (dateStr, withTime = false) => {
    if (!dateStr) return "--";
    const options = {
      year: "numeric",
      month: "long",
      day: "numeric",
      ...(withTime
        ? {
          hour: "2-digit",
          minute: "2-digit",
        }
        : {}),
    };
    try {
      return new Date(dateStr).toLocaleString(undefined, options);
    } catch (error) {
      return dateStr;
    }
  };

  const createPreview = (message = "") => {
    const normalized = message.replace(/\s+/g, " ").trim();
    if (normalized.length <= 120) return normalized;
    return `${normalized.slice(0, 120)}...`;
  };

  const submitAnnouncement = (payload) => {
    if (editingId) {
      router.put(`/admin/announcement/${editingId}`, payload, {
        onSuccess: () => {
          resetModal();
          swalFire({
            title: '✅ Updated!',
            text: 'Announcement has been updated successfully.',
            icon: 'success',
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 2500,
            timerProgressBar: true,
          });
        },
        onError: () => {
          swalFire({
            title: '❌ Error!',
            text: 'Something went wrong while updating.',
            icon: 'error',
          });
        },
      });
    } else {
      router.post('/admin/announcement', payload, {
        onSuccess: () => {
          resetModal();
          swalFire({
            title: '✅ Posted!',
            text: 'New announcement has been created.',
            icon: 'success',
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 2500,
            timerProgressBar: true,
          });
        },
        onError: () => {
          swalFire({
            title: '❌ Error!',
            text: 'Something went wrong while posting.',
            icon: 'error',
          });
        },
      });
    }
  };

  const handleSubmit = () => {
    if (!auth?.user?.id) return;

    if (!title.trim() || !message.trim() || !announcementDate) {
      swalFire({
        title: 'Missing details',
        text: 'Please complete the title, message, and date before saving.',
        icon: 'warning',
      });
      return;
    }

    const payload = {
      title: title.trim(),
      message: message.trim(),
      announcement_date: announcementDate,
      type,
    };

    const isUpdate = Boolean(editingId);

    swalFire({
      icon: 'question',
      title: isUpdate ? 'Update this announcement?' : 'Save this announcement?',
      html: `<p class="text-sm text-slate-600">${
        isUpdate
          ? 'Your changes will immediately reflect on the board.'
          : 'This will publish the announcement to everyone connected.'
      }</p>`,
      showCancelButton: true,
      confirmButtonText: isUpdate ? 'Yes, update it!' : 'Yes, save it!',
      cancelButtonText: 'Cancel',
      customClass: {
        popup: 'rounded-3xl p-8',
        confirmButton:
          '!px-6 !py-2.5 !text-sm !font-semibold !rounded-2xl !bg-blue-600 !text-white hover:!bg-blue-700',
        cancelButton:
          '!px-6 !py-2.5 !text-sm !font-semibold !rounded-2xl !bg-slate-100 !text-slate-600 hover:!bg-slate-200',
      },
    }).then((result) => {
      if (result.isConfirmed) {
        submitAnnouncement(payload);
      }
    });
  };

  const handleEdit = (announcement) => {
    swalFire({
      title: 'Are you sure?',
      text: 'Do you want to edit this announcement?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, edit it',
      cancelButtonText: 'No',
    }).then((res) => {
      if (res.isConfirmed) {
        setTitle(announcement.title);
        setMessage(announcement.message);
        setAnnouncementDate(announcement.announcement_date);
        setType(announcement.type);
        setEditingId(announcement.id);
        setShowModal(true);
      }
    });
  };

  const handleArchive = (id) => {
    swalFire({
      title: 'Are you sure?',
      text: 'This announcement will be archived!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, archive it!',
      cancelButtonText: 'Cancel',
    }).then((result) => {
      if (result.isConfirmed) {
        router.post(route('admin.announcement.archive', id), {}, {
          onSuccess: () => {
            router.reload({ only: ['announcements'] });
            swalFire({
              title: 'Archived!',
              text: 'The announcement has been archived.',
              icon: 'success',
              toast: true,
              position: 'top-end',
              showConfirmButton: false,
              timer: 2500,
              timerProgressBar: true,
            });
          },
          onError: () => {
            swalFire({
              title: 'Error!',
              text: 'Failed to archive announcement.',
              icon: 'error',
            });
          }
        });
      }
    });
  };

  const handleCancel = () => {
    swalFire({
      title: 'Discard announcement?',
      html: '<p class="text-sm text-slate-600">Any unsaved changes will be lost.</p>',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Discard',
      cancelButtonText: 'Back',
      reverseButtons: true,
      customClass: {
        confirmButton:
          '!px-6 !py-2.5 !text-sm !font-semibold !rounded-2xl !bg-red-500 !text-white hover:!bg-red-600 focus-visible:!ring-2 focus-visible:!ring-red-300',
      },
    }).then((res) => {
      if (res.isConfirmed) resetModal();
    });
  };

  const handleView = (announcement) => {
    setViewingAnnouncement(announcement); // Set announcement to view
  };

  const closeViewModal = () => {
    setViewingAnnouncement(null);
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-6xl mx-auto pb-10">
        <section className="rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-sky-400 text-white p-6 shadow-xl ring-1 ring-white/20">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em]">
                <Megaphone size={14} /> Broadcast Center
              </div>
              <div>
                <h1 className="text-3xl font-bold leading-tight">Announcement Board</h1>
                <p className="mt-2 text-sm md:text-base text-white/80">
                  Keep your community informed with timely updates, urgent advisories, and milestones for the school year.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="inline-flex items-center gap-2 rounded-2xl bg-white/15 px-4 py-1.5 font-semibold">
                  <CalendarDays size={16} />
                  {activeSchoolYear
                    ? `Active School Year: ${activeSchoolYear.name}`
                    : 'No active school year set'}
                </span>
                {activeSchoolYear && (
                  <span className="inline-flex items-center gap-2 rounded-2xl bg-white/15 px-4 py-1.5 text-xs font-semibold">
                    {activeSchoolYear.start_date && activeSchoolYear.end_date
                      ? `${formatDate(activeSchoolYear.start_date)} – ${formatDate(activeSchoolYear.end_date)}`
                      : 'Date range not set'}
                  </span>
                )}
              </div>
            </div>
            {auth?.user?.role === 'admin' && (
              <button
                onClick={() => setShowModal(true)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/90 px-6 py-3 text-sm font-semibold text-blue-700 shadow-lg shadow-blue-900/20 transition hover:bg-white"
              >
                <PlusCircle size={18} /> New Announcement
              </button>
            )}
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-3">
          {summaryCards.map((card) => (
            <div
              key={card.label}
              className="rounded-3xl border border-slate-100 bg-white/80 p-5 shadow-sm ring-1 ring-slate-100/60"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">{card.label}</p>
              <p className="mt-3 text-3xl font-bold text-slate-900">{card.value}</p>
              <p className="text-sm text-slate-500">{card.hint}</p>
            </div>
          ))}
        </div>

        <section className="rounded-3xl border border-slate-100 bg-white/90 shadow-lg shadow-slate-200/50">
          <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">{showingArchived ? 'Archived Announcements' : 'Active Announcements'}</h2>
              <p className="text-sm text-slate-500">
                {showingArchived
                  ? 'View previously posted messages kept for record.'
                  : 'Tap a card to review or manage announcement details.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-1 text-sm font-medium">
                <button
                  onClick={() => setShowingArchived(false)}
                  className={`rounded-full px-4 py-1.5 transition ${!showingArchived ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'
                    }`}
                >
                  Active
                </button>
                <button
                  onClick={() => setShowingArchived(true)}
                  className={`rounded-full px-4 py-1.5 transition ${showingArchived ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'
                    }`}
                >
                  Archived
                </button>
              </div>
              <span className="inline-flex items-center rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                Showing {displayedAnnouncements.length} {showingArchived ? 'archived' : 'active'} item{displayedAnnouncements.length === 1 ? '' : 's'}
              </span>
            </div>
          </div>

          <div className="p-5">
            {displayedAnnouncements.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/70 px-6 py-16 text-center text-slate-500">
                {showingArchived
                  ? 'No announcements have been archived yet.'
                  : 'No announcements posted yet. Use the button above to add the first update.'}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {displayedAnnouncements.map((a) => (
                  <article
                    key={a.id}
                    onClick={() => handleView(a)}
                    className="group relative overflow-hidden rounded-3xl border border-slate-100 bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-xl cursor-pointer"
                  >
                    <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-sky-400 to-indigo-500" />
                    <div className="flex items-start justify-between gap-3 pt-2">
                      <div className="space-y-1">
                        <h3 className="text-lg font-semibold text-slate-900 group-hover:text-blue-700">
                          {a.title}
                        </h3>
                        <p className="text-sm text-slate-600 line-clamp-3">
                          {createPreview(a.message)}
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full capitalize border ${a.type === 'urgent'
                            ? 'bg-red-50 text-red-600 border-red-100'
                            : 'bg-blue-50 text-blue-600 border-blue-100'
                          }`}
                      >
                        <Megaphone size={12} /> {a.type}
                      </span>
                    </div>
                    <div className="mt-4 space-y-2 text-xs text-slate-500">
                      <div className="flex items-center gap-1 text-slate-600 font-medium">
                        <CalendarDays size={14} /> {formatDate(a.announcement_date)}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400">Year:</span>
                        <strong className="text-slate-700">{extractYear(a.announcement_date || a.created_at)}</strong>
                      </div>
                      <div className="flex items-center gap-1">
                        <UserRound size={14} />
                        {a.user?.first_name} {a.user?.last_name} ({a.user?.role ?? 'Admin'})
                      </div>
                      <p className="text-[11px] text-slate-400">Created {formatDate(a.created_at, true)}</p>
                    </div>

                    {auth?.user?.role === 'admin' && !showingArchived && (
                      <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(a);
                          }}
                          className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                        >
                          <Edit size={14} /> Edit
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleArchive(a.id);
                          }}
                          className="inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-100"
                        >
                          <Archive size={14} /> Archive
                        </button>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Modal for Add/Edit */}
      {showModal && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center px-4 py-8 overflow-auto">
          <div className="w-full max-w-xl rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{editingId ? 'Update' : 'Create'}</p>
                <h2 className="text-2xl font-semibold text-slate-900">
                  {editingId ? 'Edit Announcement' : 'New Announcement'}
                </h2>
              </div>
              <button
                onClick={handleCancel}
                className="flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Title</label>
                <input
                  type="text"
                  placeholder="Enter title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Message</label>
                <textarea
                  placeholder="Write your message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  rows="4"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Date</label>
                <input
                  type="date"
                  value={announcementDate}
                  onChange={(e) => setAnnouncementDate(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="general">General</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                onClick={handleCancel}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500"
              >
                {editingId ? 'Update' : 'Post'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Viewing Announcement */}
      {viewingAnnouncement && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center px-4 py-8 overflow-auto">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Announcement</p>
                <h2 className="text-2xl font-semibold text-slate-900">Details</h2>
              </div>
              <button
                onClick={closeViewModal}
                className="flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-4 py-1 text-xs font-semibold text-blue-700">
                  <CalendarDays size={14} /> {formatDate(viewingAnnouncement.announcement_date, true)}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-1 text-xs font-semibold text-slate-600">
                  Year {extractYear(viewingAnnouncement.announcement_date || viewingAnnouncement.created_at)}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-1 text-xs font-semibold text-slate-600">
                  <UserRound size={14} /> {viewingAnnouncement.user?.first_name} {viewingAnnouncement.user?.last_name} ({viewingAnnouncement.user?.role ?? 'Admin'})
                </span>
                <span
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-1 text-xs font-semibold ${viewingAnnouncement.type === 'urgent'
                      ? 'bg-red-50 text-red-600 border-red-100'
                      : 'bg-blue-50 text-blue-600 border-blue-100'
                    }`}
                >
                  {viewingAnnouncement.type}
                </span>
              </div>
              <div className="space-y-3">
                <h3 className="text-2xl font-semibold text-slate-900">{viewingAnnouncement.title}</h3>
                <div className="rounded-3xl border border-slate-100 bg-slate-50/60 p-5 text-sm leading-relaxed text-slate-700 whitespace-pre-line">
                  {viewingAnnouncement.message}
                </div>
                <p className="text-xs text-slate-400">Created at {formatDate(viewingAnnouncement.created_at, true)}</p>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={closeViewModal}
                className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default Announcement;
