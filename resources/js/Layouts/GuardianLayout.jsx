import React, { useEffect, useState } from "react";
import { Link, usePage, router } from "@inertiajs/react";
import classNames from "classnames";
import {
  LayoutDashboard,
  Users,
  HandCoins,
  BookOpen,
  CalendarClock,
  Menu,
  X,
  User,
  Bell,
} from "lucide-react";

const GuardianLayout = ({ children }) => {
  const { url, props } = usePage();
  const { guardian, notifications = [] } = props || {};
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("guardian-sidebar-open") : null;
    return stored === null ? true : stored === "true";
  });
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [readNotificationIds, setReadNotificationIds] = useState(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = JSON.parse(localStorage.getItem("guardian-notification-read") || "[]");
      if (Array.isArray(stored)) {
        return stored.map((id) => Number(id));
      }
      if (stored && typeof stored === "object") {
        return Object.entries(stored)
          .filter(([, value]) => value === true)
          .map(([key]) => Number(key));
      }
    } catch (error) {
      // ignore JSON errors
    }
    return [];
  });

  const navLinks = [
    { name: "Dashboard", href: "/guardian/dashboard", icon: <LayoutDashboard size={18} /> },
    { name: "My Students", href: "/guardian/mystudents", icon: <Users size={18} /> },
    { name: "Contributions", href: "/guardian/contributions", icon: <HandCoins size={18} /> },
    { name: "Announcements", href: "/guardian/announcements", icon: <CalendarClock size={18} /> },
    { name: "Reports", href: "/guardian/reports", icon: <BookOpen size={18} /> },
    // { name: "Grade & Section", href: "/guardian/gradelevel-section", icon: <BookOpen size={18} /> },
    // { name: "School Year", href: "/guardian/schoolyear", icon: <CalendarClock size={18} /> },
  ];

  const handleLogout = () => {
    router.post("/guardian/logout", {}, {
      onSuccess: () => window.location.href = "/guardian/login",
      onError: () => alert("Logout failed, please try again."),
    });
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("guardian-sidebar-open", String(isSidebarOpen));
    }
  }, [isSidebarOpen]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("guardian-notification-read", JSON.stringify(readNotificationIds));
      } catch (error) {
        // ignore storage errors
      }
    }
  }, [readNotificationIds]);

  useEffect(() => {
    setReadNotificationIds((prev) => prev.filter((id) => notifications.some((n) => n.id === id)));
  }, [notifications]);

  const unreadIds = notifications
    .map((notification) => notification.id)
    .filter((id) => !readNotificationIds.includes(id));

  const unreadCount = unreadIds.length;

  const handleSelectNotification = (notification) => {
    setReadNotificationIds((prev) =>
      prev.includes(notification.id) ? prev : [...prev, notification.id]
    );
    setIsNotificationOpen(false);
    router.visit(`/guardian/announcements?highlight=${notification.id}`);
  };

  return (
    <div className="flex min-h-screen bg-blue-50 text-slate-900">
      {/* Sidebar */}
      <aside
        className={classNames(
          "transition-all duration-300 flex flex-col bg-white/80 backdrop-blur border-r border-blue-100 text-slate-800 shadow-[0_10px_30px_rgba(15,23,42,0.08)] h-screen sticky top-0 overflow-y-auto [&::-webkit-scrollbar]:hidden",
          isSidebarOpen ? "w-64" : "w-24"
        )}
        style={{ scrollbarWidth: "none" }}
      >
        {/* Sidebar content stays visible */}
        <div className="flex flex-col min-h-full">
          {/* Logo and toggle */}
          <div
            className={classNames(
              "flex items-center px-4 py-6 transition-all",
              isSidebarOpen ? "justify-start gap-3" : "justify-center"
            )}
          >
            <img
              src="/images/ANCHS.png"
              alt="Logo"
              className={classNames(
                "rounded-2xl border border-blue-100 shadow-lg shadow-blue-500/10 transition-all duration-300",
                isSidebarOpen ? "h-12 w-12" : "h-10 w-10"
              )}
            />
            {isSidebarOpen && <span className="font-semibold text-lg tracking-[0.2em] text-slate-700">GUARDIAN</span>}
          </div>

          {/* Navigation */}
          <nav className="flex-1 mt-0.5 flex flex-col gap-0.5 px-1.5 pb-3">
            {navLinks.map((link) => {
              const isActive = url === link.href || url?.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={classNames(
                    "group relative flex items-center rounded-2xl px-1.5 py-1.5 text-sm font-medium transition-all duration-150",
                    isActive
                      ? "bg-blue-100 text-blue-900"
                      : "text-slate-500 hover:text-blue-900 hover:bg-blue-100/50",
                    isSidebarOpen ? "gap-1.5" : "justify-center"
                  )}
                >
                  <span
                    className={classNames(
                      "flex h-8 w-8 items-center justify-center rounded-2xl border border-blue-100 bg-white/70 text-blue-600 transition-all duration-150",
                      isActive && "border-transparent bg-white text-blue-600"
                    )}
                  >
                    {link.icon}
                  </span>
                  {isSidebarOpen && <span className="truncate">{link.name}</span>}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white flex items-center justify-between sticky top-0 z-10 pr-4 pl-1 sm:pl-2 sm:pr-5 py-3">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="rounded-2xl bg-white p-2.5 text-slate-600 transition-colors duration-150 hover:border-blue-200"
            >
              {isSidebarOpen ? <Menu size={18} /> : <Menu size={18} />}
            </button>
            <div>
              <h1 className="text-lg font-semibold text-slate-800"> GUARDIAN PANEL</h1>
            </div>
          </div>

          {/* User Profile Dropdown */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <button
                onClick={() => {
                  setIsNotificationOpen((prev) => !prev);
                  setIsProfileOpen(false);
                }}
                className="relative p-2.5 rounded-full border border-blue-100 bg-white shadow-sm transition-colors duration-150 hover:border-blue-200"
              >
                <Bell size={18} className="text-blue-600" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-[20px] text-xs bg-red-500 text-white rounded-full flex items-center justify-center px-1 font-semibold shadow">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {isNotificationOpen && (
                <div className="absolute right-0 mt-3 w-88 max-w-xs sm:max-w-sm bg-white rounded-3xl shadow-[0_20px_55px_rgba(15,23,42,0.18)] border border-blue-50 z-50 overflow-hidden">
                  <div className="bg-blue-600 px-4 py-3 text-white flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-semibold">Notifications</h2>
                      <p className="text-[11px] text-white/80">Announcements curated for guardians</p>
                    </div>
                    <span className="px-2 py-1 text-[11px] bg-white/20 rounded-full font-semibold">
                      {unreadCount} new
                    </span>
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-blue-50">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-8 text-sm text-gray-500 text-center">
                        You are all caught up! No announcements yet.
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <button
                          key={notification.id}
                          onClick={() => handleSelectNotification(notification)}
                          className={`w-full text-left px-4 py-3 transition ${
                            unreadIds.includes(notification.id)
                              ? "bg-white hover:bg-blue-50"
                              : "bg-blue-50/40 hover:bg-blue-100"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={`mt-1 h-2 w-2 rounded-full ${
                                unreadIds.includes(notification.id) ? "bg-blue-500" : "bg-gray-300"
                              }`}
                            />
                            <div className="flex-1">
                              <p
                                className={`text-sm font-semibold truncate ${
                                  unreadIds.includes(notification.id) ? "text-gray-800" : "text-gray-500"
                                }`}
                              >
                                {notification.title}
                              </p>
                              <p className="text-xs text-gray-500">
                                {new Date(
                                  notification.created_at ||
                                    notification.announcement_date ||
                                    notification.createdAt
                                ).toLocaleString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                              <p className="text-xs text-blue-600 mt-1">
                                {unreadIds.includes(notification.id) ? "Tap to read full announcement" : "Already viewed"}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                  <div className="px-4 py-2 bg-blue-50 text-xs text-blue-600 text-center border-t border-blue-100">
                    Go to the announcements page for the complete archive.
                  </div>
                </div>
              )}
            </div>

            <div className="relative">
              <button
                onClick={() => {
                  setIsProfileOpen(!isProfileOpen);
                  setIsNotificationOpen(false);
                }}
                className="group flex items-center gap-3 rounded-2xl border border-blue-100 bg-white px-3 py-2 shadow-sm transition-colors duration-150 hover:border-blue-200"
              >
                <div className="h-9 w-9 rounded-2xl bg-blue-500 text-white flex items-center justify-center">
                  <User size={18} />
                </div>
                <div className="hidden text-left sm:block">
                  <p className="text-sm font-semibold text-slate-700">{guardian?.name || "Guardian"}</p>
                  <p className="text-xs text-slate-400">Parent / Guardian</p>
                </div>
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 mt-3 w-56 rounded-3xl border border-blue-50 bg-white p-4 text-slate-700 shadow-[0_15px_35px_rgba(15,23,42,0.15)] z-50">
                  <div className="mb-3 border-b border-blue-50 pb-2">
                    <p className="text-sm font-semibold text-slate-900">{guardian?.name || "Guardian"}</p>
                    <p className="text-xs text-slate-500">Parent / Guardian</p>
                  </div>
                  <Link
                    href="/guardian/profile"
                    className="block rounded-2xl px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
                    onClick={() => setIsProfileOpen(false)}
                  >
                    View Profile
                  </Link>
                  <button
                    className="mt-3 w-full rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500"
                    onClick={handleLogout}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-auto px-1 py-1.5 sm:px-2 sm:py-2.5 lg:px-2.5 lg:py-3.5">
          <div className="min-h-[calc(100vh-110px)] rounded-xl border border-blue-100 bg-white p-3 shadow-[0_10px_24px_rgba(15,23,42,0.05)] sm:p-4">
            {children}
          </div>
        </main>
      </div>

    </div>
  );
};

export default GuardianLayout;
