import React, { useEffect, useState } from "react";
import { Link, usePage, router } from "@inertiajs/react";
import classNames from "classnames";
import {
  LayoutDashboard,
  Users,
  Megaphone,
  HandCoins,
  Receipt,
  Menu,
  X,
  CalendarClock,
  BookOpen,
  User,
  FileText,
  ClipboardList,
} from "lucide-react";

const AdminLayout = ({ children }) => {
  const { url: currentUrl, auth } = usePage();
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("admin-sidebar-open") : null;
    return stored === null ? true : stored === "true";
  });
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const navLinks = [
    { name: "Dashboard", href: "/admin/dashboard", icon: <LayoutDashboard size={18} /> },
    { name: "Manage Users", href: "/admin/manageusers", icon: <Users size={18} /> },
    { name: "School Year", href: "/admin/schoolyear", icon: <CalendarClock size={18} /> },    
    { name: "Add Guardian & Student", href: "/admin/addguardian", icon: <Users size={18} /> },
    { name: "Grade Level & Section", href: "/admin/gradelevel-section", icon: <BookOpen size={18} /> },
    { name: "Contributions", href: "/admin/contributions", icon: <HandCoins size={18} /> },
    { name: "School Year Contributions", href: "/admin/schoolyearcontributions", icon: <HandCoins size={18} /> },
    { name: "Assign Contributions", href: "/admin/enrollment", icon: <ClipboardList size={18} /> },
    { name: "Expenses", href: "/admin/expenses", icon: <Receipt size={18} /> },
    { name: "Announcements", href: "/admin/announcement", icon: <Megaphone size={18} /> },
    { name: "Reports", href: "/admin/reports", icon: <FileText size={18} /> },
    { name: "Records", href: "/admin/records", icon: <BookOpen size={18} /> },
  ];

  const handleLogout = () => {
    router.post("/admin/logout", {}, {
      onSuccess: () => window.location.href = "/admin/login",
      onError: () => alert("Logout failed, please try again."),
    });
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("admin-sidebar-open", String(isSidebarOpen));
    }
  }, [isSidebarOpen]);

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
          <div className="flex flex-col min-h-full">
            {/* Logo + Toggle */}
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
              {isSidebarOpen && (
                <div className="flex flex-col">
                  <span className="font-semibold text-lg tracking-[0.2em] text-slate-700">ADMIN</span>
                </div>
              )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 mt-0.5 flex flex-col gap-0.5 px-1.5 pb-3">
              {navLinks.map((link) => {
                const isActive = currentUrl === link.href || currentUrl?.startsWith(`${link.href}/`);
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
                    preserveScroll
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
          <header className="sticky top-0 z-20 flex items-center justify-between border-b border-blue-100 bg-white pr-5 pl-3 sm:pl-4 sm:pr-5 py-3">
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="rounded-2xl bg-white p-2.5 text-slate-600 transition-colors duration-150 hover:border-blue-200"
              >
                {isSidebarOpen ? <Menu size={18} /> : <Menu size={18} />}
              </button>
              <div>
                <h1 className="text-lg font-semibold text-slate-800">ADMIN PANEL</h1>
              </div>
            </div>
            <div className="relative">
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="group flex items-center gap-3 rounded-2xl border border-blue-100 bg-white px-3 py-2 shadow-sm transition-colors duration-150 hover:border-blue-200"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-500 text-white">
                  <User size={18} />
                </div>
                <div className="hidden text-left sm:block">
                  <p className="text-sm font-semibold text-slate-700">{auth?.user?.name || "Admin"}</p>
                  <p className="text-xs text-slate-400">Administrator</p>
                </div>
                <span className="hidden rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-600 sm:inline-flex">
                  Online
                </span>
              </button>
              {isProfileOpen && (
                <div className="absolute right-0 mt-3 w-64 rounded-3xl border border-blue-50 bg-white p-4 text-slate-700 shadow-[0_15px_35px_rgba(15,23,42,0.15)] z-50">
                  <div className="mb-4 border-b border-blue-50 pb-3">
                    <p className="text-sm font-semibold text-slate-900">{auth?.user?.name || "Admin"}</p>
                    <p className="text-xs text-slate-500">Administrator</p>
                  </div>
                  <Link
                    href="/admin/profile"
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
          </header>

          <main className="flex-1 overflow-auto px-1 py-1.5 sm:px-2 sm:py-2.5 lg:px-2.5 lg:py-3.5">
            <div className="min-h-[calc(100vh-110px)] rounded-xl border border-blue-100 bg-white p-3 shadow-[0_10px_24px_rgba(15,23,42,0.05)] sm:p-4 lg:p-5">
              {children}
            </div>
          </main>
        </div>
      </div>
  );
}

export default AdminLayout;
