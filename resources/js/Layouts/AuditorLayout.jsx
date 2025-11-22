import React, { useEffect, useState } from "react";
import { Link, usePage, router } from "@inertiajs/react";
import { LayoutDashboard, FileText, Receipt, Wallet, Menu, X, LogOut, User } from "lucide-react";
import classNames from "classnames";

export default function AuditorLayout({ children }) {
  const { url } = usePage();
  const { auth } = usePage().props || {};
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("auditor-sidebar-open") : null;
    return stored === null ? true : stored === "true";
  });
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const navigation = [
    { name: "Dashboard", href: "/auditor/dashboard", icon: <LayoutDashboard size={18} /> },
    { name: "Funds", href: "/auditor/funds", icon: <Wallet size={18} /> },
    { name: "Expenses", href: "/auditor/expenses", icon: <Receipt size={18} /> },
    { name: "Reports", href: "/auditor/reports", icon: <FileText size={18} /> },
  ];

  const fullName =
    auth?.user?.first_name || auth?.user?.last_name
      ? `${auth?.user?.first_name || ""} ${auth?.user?.last_name || ""}`.trim()
      : auth?.user?.name || "Auditor";

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("auditor-sidebar-open", String(sidebarOpen));
    }
  }, [sidebarOpen]);

  const handleLogout = () => {
    router.post("/auditor/logout");
  };

  return (
    <div className="flex min-h-screen bg-blue-50 text-slate-900">
      {/* Sidebar */}
      <aside
        className={classNames(
          "transition-all duration-300 flex flex-col bg-white/80 backdrop-blur border-r border-blue-100 text-slate-800 shadow-[0_10px_30px_rgba(15,23,42,0.08)] h-screen sticky top-0 overflow-y-auto [&::-webkit-scrollbar]:hidden",
          sidebarOpen ? "w-64" : "w-24"
        )}
        style={{ scrollbarWidth: "none" }}
      >
        {/* Logo & Toggle */}
        <div
          className={classNames(
            "flex items-center px-4 py-6 transition-all",
            sidebarOpen ? "justify-start gap-3" : "justify-center"
          )}
        >
          <img
            src="/images/ANCHS.png"
            alt="Logo"
            className={classNames(
              "rounded-2xl border border-blue-100 shadow-lg shadow-blue-500/10 transition-all duration-300",
              sidebarOpen ? "h-12 w-12" : "h-10 w-10"
            )}
          />
          {sidebarOpen && <span className="font-semibold text-lg tracking-[0.2em] text-slate-700">AUDITOR</span>}
        </div>

        {/* Navigation */}
        <nav className="flex-1 mt-0.5 flex flex-col gap-0.5 px-1.5 pb-3">
          {navigation.map((item) => {
            const isActive = url === item.href || url?.startsWith?.(`${item.href}/`);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={classNames(
                  "group relative flex items-center rounded-2xl px-1.5 py-1.5 text-sm font-medium transition-all duration-150",
                  isActive
                    ? "bg-blue-100 text-blue-900"
                    : "text-slate-500 hover:text-blue-900 hover:bg-blue-100/50",
                  sidebarOpen ? "gap-1.5" : "justify-center"
                )}
              >
                <span
                  className={classNames(
                    "flex h-8 w-8 items-center justify-center rounded-2xl border border-blue-100 bg-white/70 text-blue-600 transition-all duration-150",
                    isActive && "border-transparent bg-white text-blue-600"
                  )}
                >
                  {item.icon}
                </span>
                {sidebarOpen && <span className="truncate">{item.name}</span>}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between bg-white border-b border-blue-100 sticky top-0 z-30 pr-5 pl-3 sm:pl-4 sm:pr-5 py-3">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="rounded-2xl bg-white p-2.5 text-slate-600 transition-colors duration-150 hover:border-blue-200"
            >
              {sidebarOpen ? <Menu size={18} /> : <Menu size={18} />}
            </button>
            <div>
              <h2 className="text-lg font-semibold text-slate-800">AUDITOR PANEL</h2>
            </div>
          </div>

          <div className="relative">
            <button
              onClick={() => setIsProfileOpen((v) => !v)}
              className="group flex items-center gap-3 rounded-2xl border border-blue-100 bg-white px-3 py-2 shadow-sm transition-colors duration-150 hover:border-blue-200"
            >
              <div className="h-9 w-9 rounded-2xl bg-blue-500 text-white flex items-center justify-center">
                <User size={18} />
              </div>
              <div className="hidden text-left sm:block">
                <p className="text-sm font-semibold text-slate-700">{fullName}</p>
                <p className="text-xs text-slate-400">Auditor</p>
              </div>
            </button>
            {isProfileOpen && (
              <div className="absolute right-0 mt-3 w-56 rounded-3xl border border-blue-50 bg-white p-4 text-slate-700 shadow-[0_15px_35px_rgba(15,23,42,0.15)] z-50">
                <div className="mb-3 border-b border-blue-50 pb-2">
                  <p className="text-sm font-semibold text-slate-900">{fullName}</p>
                  <p className="text-xs text-slate-500">Auditor</p>
                </div>
                <Link
                  href="/auditor/profile"
                  className="block rounded-2xl px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
                  onClick={() => setIsProfileOpen(false)}
                >
                  View Profile
                </Link>
                <button
                  className="mt-3 w-full rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500"
                  onClick={handleLogout}
                >
                  <LogOut size={16} className="mr-1" /> Logout
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto px-1 py-1.5 sm:px-2 sm:py-2.5 lg:px-2.5 lg:py-3.5">
          <div className="min-h-[calc(100vh-110px)] rounded-xl border border-blue-100 bg-white p-3 shadow-[0_10px_24px_rgba(15,23,42,0.05)] sm:p-4">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
