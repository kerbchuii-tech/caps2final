import React, { useEffect, useState } from "react";
import { Link, usePage, router } from "@inertiajs/react";
import classNames from "classnames";
import {
  Home,
  ClipboardList,
  FileText,
  HeartHandshake,
  DollarSign,
  LogOut,
  Menu,
  X,
  BarChart2,
  User,
} from "lucide-react";

const TreasurerLayout = ({ children }) => {
  const { url } = usePage();
  const { auth } = usePage().props || {};
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("treasurer-sidebar-open") : null;
    return stored === null ? true : stored === "true";
  });
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const navLinks = [
    { name: "Dashboard", href: "/treasurer/dashboard", icon: <Home size={18} /> },
    { name: "Payments", href: "/treasurer/payments", icon: <ClipboardList size={18} /> },
    { name: "Payment Histories", href: "/treasurer/payment-histories", icon: <FileText size={18} /> },
    { name: "Donations", href: "/treasurer/donations", icon: <HeartHandshake size={18} /> },
    { name: "Funds", href: "/treasurer/funds", icon: <DollarSign size={18} /> },
    { name: "Funds History", href: "/treasurer/funds-histories", icon: <FileText size={18} /> },
    { name: "Reports", href: "/treasurer/reports", icon: <BarChart2 size={18} /> },
  ];

  const handleLogout = () => {
    router.post(
      "/treasurer/logout",
      {},
      {
        onSuccess: () => (window.location.href = "/treasurer/login"),
        onError: () => alert("Logout failed, please try again."),
      }
    );
  };

  const fullName =
    auth?.user?.first_name || auth?.user?.last_name
      ? `${auth?.user?.first_name || ""} ${auth?.user?.last_name || ""}`.trim()
      : auth?.user?.name || "User";

  const avatarUrl = auth?.user?.photo_url || auth?.user?.avatar || null;

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("treasurer-sidebar-open", String(isSidebarOpen));
    }
  }, [isSidebarOpen]);

  return (
    <div className="flex min-h-screen bg-blue-50 text-slate-900">
      {/* Sidebar */}
      <aside
        className={classNames(
          "transition-all duration-300 flex flex-col bg-white/80 backdrop-blur border-r border-blue-100/80 text-slate-800 shadow-[0_10px_30px_rgba(15,23,42,0.08)] h-screen sticky top-0 overflow-y-auto [&::-webkit-scrollbar]:hidden",
          isSidebarOpen ? "w-64" : "w-24"
        )}
        style={{ scrollbarWidth: "none" }}
      >
        {/* Sidebar content fixed */}
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
              alt="ANCHS Logo"
              className={classNames(
                "rounded-2xl border border-blue-100 shadow-lg shadow-blue-500/10 transition-all duration-300",
                isSidebarOpen ? "h-12 w-12" : "h-10 w-10"
              )}
            />
            {isSidebarOpen && <span className="text-lg font-semibold tracking-[0.2em] text-slate-700">TREASURER</span>}
          </div>

          {/* Navigation */}
          <nav className="flex-1 mt-0.5 flex flex-col gap-0.5 px-1.5 pb-3">
            {navLinks.map((link) => {
              const isActive = url === link.href || url?.startsWith?.(`${link.href}/`);
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

          {/* Logout */}
          {/* <div className="p-4 border-t border-blue-600">
            <button
              type="button"
              className={classNames(
                "flex items-center text-sm px-3 py-2 rounded-lg transition-all w-full relative group",
                "text-gray-200 hover:text-white hover:bg-red-600",
                isSidebarOpen ? "space-x-3 justify-start" : "justify-center"
              )}
              onClick={handleLogout}
            >
              <LogOut size={18} />
              {isSidebarOpen && <span>Logout</span>}
              {!isSidebarOpen && (
                <span className="absolute left-full ml-2 bg-black text-white text-xs px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition">
                  Logout
                </span>
              )}
            </button>
          </div> */}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header with Profile */}
        <header className="bg-white border-b border-blue-100 flex items-center justify-between sticky top-0 z-10 pr-5 pl-3 sm:pl-4 sm:pr-5 py-3">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="rounded-2xl bg-white p-2.5 text-slate-600 transition-colors duration-150 hover:border-blue-200"
            >
              {isSidebarOpen ? <Menu size={18} /> : <Menu size={18} />}
            </button>
            <div>
              <h1 className="text-lg font-semibold text-slate-800">TREASURER PANEL</h1>
            </div>
          </div>

          <div className="relative">
            <button
              onClick={() => setIsProfileOpen((v) => !v)}
              className="group flex items-center gap-3 rounded-2xl border border-blue-100 bg-white px-3 py-2 shadow-sm transition-colors duration-150 hover:border-blue-200"
            >
              <div className="h-9 w-9 rounded-2xl bg-blue-500 text-white flex items-center justify-center overflow-hidden">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover rounded-2xl" />
                ) : (
                  <User size={18} className="text-white" />
                )}
              </div>
              <div className="hidden text-left sm:block">
                <p className="text-sm font-semibold text-slate-700">{fullName}</p>
                <p className="text-xs text-slate-400">Treasurer</p>
              </div>
            </button>

            {isProfileOpen && (
              <div className="absolute right-0 mt-3 w-56 rounded-3xl border border-blue-50 bg-white p-4 text-slate-700 shadow-[0_15px_35px_rgba(15,23,42,0.15)] z-50">
                <div className="mb-3 border-b border-blue-50 pb-2">
                  <p className="text-sm font-semibold text-slate-900">{fullName}</p>
                  <p className="text-xs text-slate-500">Treasurer</p>
                </div>
                <Link
                  href="/treasurer/profile"
                  className="flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
                  onClick={() => setIsProfileOpen(false)}
                >
                  <User size={16} /> View Profile
                </Link>

                <button
                  className="mt-3 w-full flex items-center gap-2 justify-center rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500"
                  onClick={handleLogout}
                >
                  <LogOut size={16} /> Logout
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-auto px-1 py-1.5 sm:px-2 sm:py-2.5 lg:px-2.5 lg:py-3.5">
          <div className="min-h-[calc(100vh-110px)] rounded-xl border border-blue-100 bg-white p-3 shadow-[0_10px_24px_rgba(15,23,42,0.05)] sm:p-4">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default TreasurerLayout;