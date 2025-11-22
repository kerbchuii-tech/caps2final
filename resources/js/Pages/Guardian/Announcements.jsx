import React, { useEffect, useMemo, useState } from "react";
import { usePage, router } from "@inertiajs/react";
import GuardianLayout from "@/Layouts/GuardianLayout";
import { Megaphone, Calendar, User2, ArrowLeft, Newspaper, AlertTriangle, Sparkles } from "lucide-react";

const formatDate = (value, withTime = false) => {
  if (!value) return "--";
  const date = new Date(value);
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
    ...(withTime
      ? {
        hour: "2-digit",
        minute: "2-digit",
      }
      : {}),
  });
};

const createPreview = (message = "") => {
  const normalized = message.replace(/\s+/g, " ").trim();
  if (normalized.length <= 80) return normalized;
  return `${normalized.slice(0, 80)}...`;
};

const formatSchoolYearRange = (start, end) => {
  if (start && end) {
    return `${formatDate(start)} - ${formatDate(end)}`;
  }
  if (start) {
    return `${formatDate(start)} onwards`;
  }
  if (end) {
    return `Until ${formatDate(end)}`;
  }
  return "Schedule not set";
};

const AnnouncementListItem = ({ announcement, isActive, onSelect }) => {
  const accentClasses =
    announcement.type === "urgent"
      ? "border-rose-200 bg-rose-50/80 text-rose-600"
      : "border-indigo-200 bg-indigo-50/80 text-indigo-600";

  return (
    <button
      id={`announcement-${announcement.id}`}
      onClick={() => onSelect(announcement.id)}
      className={`w-full text-left rounded-3xl border px-5 py-4 transition ${isActive
          ? "border-blue-400 bg-white shadow-lg shadow-blue-100"
          : "border-slate-100 bg-white/90 shadow-sm hover:-translate-y-0.5 hover:shadow-md"
        }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className={`text-base font-semibold ${isActive ? "text-blue-700" : "text-slate-900"}`}>
            {announcement.title}
          </h3>
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
            {formatDate(announcement.displayTimestamp)}
          </p>
        </div>
        <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold capitalize ${accentClasses}`}>
          {announcement.type || "general"}
        </span>
      </div>
      <p className="mt-3 text-sm text-slate-600 line-clamp-2">{createPreview(announcement.message)}</p>
    </button>
  );
};

const AnnouncementDetail = ({ announcement, activeSchoolYearName }) => {
  if (!announcement) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-[32px] border border-dashed border-slate-200 bg-white/70 px-6 py-16 text-center text-sm text-slate-500">
        <Megaphone size={36} className="mb-4 text-blue-400" />
        Select an announcement to view the full details.
      </div>
    );
  }

  const tagAccent =
    announcement.type === "urgent"
      ? "bg-rose-100 text-rose-600 border-rose-200"
      : "bg-indigo-100 text-indigo-600 border-indigo-200";

  return (
    <article className="rounded-[32px] border border-slate-100 bg-white/95 shadow-md">
      <div className="rounded-t-[32px] bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-500 px-6 py-5 text-white">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/70">Announcement</p>
            <h2 className="text-2xl font-bold leading-tight">{announcement.title}</h2>
          </div>
          <span className={`inline-flex items-center gap-2 rounded-full border px-4 py-1 text-sm font-semibold capitalize ${tagAccent}`}>
            <Megaphone size={16} /> {announcement.type || "general"}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs font-medium text-white/80">
          <span className="flex items-center gap-1">
            <Calendar size={14} />
            {formatDate(announcement.displayTimestamp, true)}
          </span>
          {announcement.posted_by && (
            <span className="flex items-center gap-1">
              <User2 size={14} />
              {announcement.posted_by}
            </span>
          )}
        </div>
      </div>
      <div className="space-y-6 p-6 sm:p-8">
        <div className="whitespace-pre-line text-base leading-relaxed text-slate-700">
          {announcement.message}
        </div>
        <div className="rounded-2xl border border-blue-100 bg-blue-50/60 px-5 py-4 text-sm text-blue-700">
          Reminder: Please follow any instructions listed above by the specified schedule
          {activeSchoolYearName ? ` for ${activeSchoolYearName}.` : "."}
        </div>
        {activeSchoolYearName && (
          <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-2 text-sm text-slate-600">
            <Calendar size={16} className="text-blue-500" />
            Part of the {activeSchoolYearName} updates.
          </div>
        )}
      </div>
    </article>
  );
};

export default function Announcements() {
  const { announcements = [], highlight, activeSchoolYear } = usePage().props;

  const orderedAnnouncements = useMemo(() => {
    return announcements.map((announcement) => {
      const displayTimestamp =
        announcement.created_at || announcement.announcement_date || announcement.createdAt;
      return {
        ...announcement,
        displayTimestamp,
      };
    });
  }, [announcements]);

  const [selectedId, setSelectedId] = useState(() => {
    if (highlight) {
      return Number(highlight);
    }
    return orderedAnnouncements[0]?.id ?? null;
  });

  const hasAnnouncements = orderedAnnouncements.length > 0;
  const urgentCount = useMemo(
    () => orderedAnnouncements.filter((item) => item.type === "urgent").length,
    [orderedAnnouncements]
  );
  const latestUpdateLabel = hasAnnouncements && orderedAnnouncements[0]?.displayTimestamp
    ? formatDate(orderedAnnouncements[0].displayTimestamp, true)
    : "--";

  const heroSummaryCards = [
    {
      label: "Total Announcements",
      value: orderedAnnouncements.length,
      hint: "Across all categories",
      icon: Megaphone,
    },
    {
      label: "Urgent Alerts",
      value: urgentCount,
      hint: urgentCount > 0 ? "Needs quick attention" : "All clear",
      icon: AlertTriangle,
    },
    {
      label: "Latest Update",
      value: latestUpdateLabel,
      hint: hasAnnouncements ? "Most recent post" : "Awaiting updates",
      icon: Calendar,
    },
  ];

  useEffect(() => {
    if (!highlight) return;
    const numeric = Number(highlight);
    if (!Number.isNaN(numeric)) {
      setSelectedId(numeric);
      const element = document.getElementById(`announcement-${numeric}`);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 200);
      }
    }
  }, [highlight]);

  const selectedAnnouncement = orderedAnnouncements.find((item) => item.id === selectedId) || null;

  return (
    <GuardianLayout>
      <div className="space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div>
              <h1 className="text-3xl font-extrabold mb-1 bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                Latest School Announcements
              </h1>
            </div>
          </div>
          <button
            type="button"
            onClick={() => router.get("/guardian/dashboard")}
            className="inline-flex items-center gap-2 rounded-2xl border border-blue-100 bg-white px-4 py-2 text-sm font-semibold text-blue-600 shadow-sm transition hover:bg-blue-50"
          >
            <ArrowLeft size={18} /> Dashboard
          </button>
        </div>

        <div className="rounded-[36px] border border-blue-100 bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-500 p-6 text-white shadow-xl shadow-blue-500/20 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-4">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-white/70">
                 Active School Year
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-bold sm:text-3xl">
                  {activeSchoolYear?.name || "No school year selected"}
                </h2>
                {activeSchoolYear && (
                  <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${activeSchoolYear.is_active ? "border-emerald-200 bg-emerald-400/25 text-white" : "border-white/40 bg-white/10 text-white/80"}`}>
                    {activeSchoolYear.is_active ? "Active" : "Most Recent"}
                  </span>
                )}
              </div>
              <p className="text-sm text-white/85 max-w-2xl">
                {activeSchoolYear
                  ? `Announcements below are tailored for ${activeSchoolYear.name}.`
                  : "Once the school sets an active year, you'll see it highlighted here."}
              </p>
              <div className="flex flex-wrap items-center gap-3 text-sm text-white/85">
                {activeSchoolYear ? (
                  <>
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/25 px-3 py-1">
                      <Calendar size={14} className="text-white" />
                      {formatSchoolYearRange(activeSchoolYear.start_date, activeSchoolYear.end_date)}
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/25 px-3 py-1">
                      <Newspaper size={14} className="text-white" />
                      {orderedAnnouncements.length} announcement{orderedAnnouncements.length === 1 ? "" : "s"} published
                    </span>
                  </>
                ) : (
                  <span className="inline-flex items-center gap-2 rounded-full border border-amber-200/50 bg-amber-400/20 px-3 py-1 text-sm">
                    <AlertTriangle size={14} className="text-amber-200" /> Waiting for active school year information
                  </span>
                )}
              </div>
            </div>
            <div className="grid w-full max-w-xl grid-cols-1 gap-3 sm:grid-cols-3">
              {heroSummaryCards.map((card) => (
                <div
                  key={card.label}
                  className="rounded-3xl border border-white/30 bg-white/10 p-4 text-white shadow-inner shadow-black/10"
                >
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-white/70">
                    <card.icon size={14} /> {card.label}
                  </div>
                  <p className="mt-3 text-2xl font-bold">
                    {card.value}
                    {card.label === "Latest Update" && card.value === "--" ? "" : ""}
                  </p>
                  <p className="text-xs text-white/80">{card.hint}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr,2fr]">
          <aside className="space-y-4 rounded-[32px] border border-slate-100 bg-white/90 p-5 shadow-sm">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                Recent Announcements
              </h2>
              <p className="text-xs text-slate-500">
                {orderedAnnouncements.length} announcement{orderedAnnouncements.length === 1 ? "" : "s"} available
              </p>
            </div>
            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
              {orderedAnnouncements.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-center text-sm text-slate-500">
                  No announcements have been posted yet.
                </div>
              ) : (
                orderedAnnouncements.map((announcement) => (
                  <AnnouncementListItem
                    key={announcement.id}
                    announcement={announcement}
                    isActive={announcement.id === selectedId}
                    onSelect={setSelectedId}
                  />
                ))
              )}
            </div>
          </aside>

          <section>
            <AnnouncementDetail
              announcement={selectedAnnouncement}
              activeSchoolYearName={activeSchoolYear?.name}
            />
          </section>
        </div>
      </div>
    </GuardianLayout>
  );
}
