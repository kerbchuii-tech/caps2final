import React from 'react';
import { Head, router } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Cell
} from 'recharts';
import {
  FaUsers,
  FaUser,
  FaMoneyBillWave,
  FaFileInvoiceDollar,
  FaWallet,
  FaBullhorn,
  FaChartLine,
  FaClock,
  FaClipboardList
} from 'react-icons/fa';

const Dashboard = ({
  totalStudents = 0,
  totalGuardians = 0,
  totalFundsCollected = 0,
  totalExpenses = 0,
  availableFunds = 0,
  latestAnnouncements = [],
  recentPayments = [],
  userRole = 'guest'
}) => {

  const chartData = [
    { name: 'Funds Collected', amount: Number(totalFundsCollected) || 0 },
    { name: 'Expenses', amount: Number(totalExpenses) || 0 },
    { name: 'Available Funds', amount: Number(availableFunds) || 0 }
  ];

  const barColors = ['#FACC15', '#EF4444', '#22C55E'];

  const formatCurrency = (value) => `₱ ${Number(value ?? 0).toLocaleString()}`;

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateStr).toLocaleDateString(undefined, options);
  };

  const paymentsPaginator = React.useMemo(() => {
    if (Array.isArray(recentPayments)) {
      const count = recentPayments.length;
      const fallbackPerPage = count > 0 ? count : 10;
      return {
        data: recentPayments,
        total: count,
        per_page: fallbackPerPage,
        current_page: 1,
        last_page: 1,
        from: count ? 1 : 0,
        to: count,
      };
    }

    return recentPayments ?? { data: [] };
  }, [recentPayments]);

  const payments = paymentsPaginator.data ?? [];
  const totalPayments = paymentsPaginator.total ?? payments.length;
  const currentPage = paymentsPaginator.current_page ?? 1;
  const lastPage = paymentsPaginator.last_page ?? 1;
  const perPage = paymentsPaginator.per_page ?? (payments.length || 10);
  const from = paymentsPaginator.from ?? (payments.length ? (currentPage - 1) * perPage + 1 : 0);
  const to = paymentsPaginator.to ?? (payments.length ? from + payments.length - 1 : 0);

  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < lastPage;

  const goToPage = React.useCallback((page) => {
    if (!page || page === currentPage || page < 1 || page > lastPage) return;

    router.get(
      '/admin/dashboard',
      { recentPaymentsPage: page },
      {
        preserveState: true,
        preserveScroll: true,
        replace: true,
        only: ['recentPayments'],
      }
    );
  }, [currentPage, lastPage]);

  return (
    <>
      <Head title="Admin Dashboard" />
      <div className="space-y-8">

        {/* Hero */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 via-indigo-700 to-emerald-500 p-6 sm:p-8 text-white shadow-xl">
          <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.65),transparent_55%)]" />
          <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.35em] text-white/80">Welcome back</p>
              <h1 className="text-3xl sm:text-4xl font-black leading-tight">
                {userRole === 'super_admin' ? 'Super Admin' : 'Admin'} Overview
              </h1>
              <p className="max-w-xl text-sm sm:text-base text-white/80">
                Monitor contribution flows, approve requests faster, and keep parents informed with a refreshed analytics workspace.
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              <HeroBadge icon={<FaChartLine />} label="Funds Collected" value={formatCurrency(totalFundsCollected)} tone="emerald" />
              <HeroBadge icon={<FaFileInvoiceDollar />} label="Total Expenses" value={formatCurrency(totalExpenses)} tone="rose" />
              <HeroBadge icon={<FaWallet />} label="Available" value={formatCurrency(availableFunds)} tone="sky" />
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <InfoCard
            icon={<FaUser />}
            label="Total Students"
            value={totalStudents.toLocaleString()}
            subtext="Across all grade levels"
            accent="from-sky-500/20 to-sky-600/25"
          />
          <InfoCard
            icon={<FaUsers />}
            label="Total Guardians"
            value={totalGuardians.toLocaleString()}
            subtext="Active parent/guardian accounts"
            accent="from-indigo-500/20 to-indigo-600/25"
          />
          <InfoCard
            icon={<FaMoneyBillWave />}
            label="Funds Collected"
            value={formatCurrency(totalFundsCollected)}
            subtext="Year-to-date collections"
            accent="from-amber-500/20 to-amber-600/25"
          />
          <InfoCard
            icon={<FaWallet />}
            label="Available Funds"
            value={formatCurrency(availableFunds)}
            subtext="Ready for allocation"
            accent="from-emerald-500/20 to-emerald-600/25"
          />
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[3fr,2fr]">
          <SectionCard
            icon={<FaChartLine className="text-sky-500" />}
            title="Financial Overview"
            description="Collections versus disbursements at a glance."
          >
            <div className="mt-6 h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
                  <XAxis dataKey="name" stroke="#475569" tickLine={false} axisLine={false} />
                  <YAxis stroke="#475569" tickLine={false} axisLine={false} />
                  <Tooltip
                    cursor={{ opacity: 0.1 }}
                    contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 16px 30px rgba(15,23,42,0.12)' }}
                    formatter={(value) => formatCurrency(value)}
                  />
                  <Bar dataKey="amount" radius={[12, 12, 12, 12]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${entry.name}`} fill={barColors[index] || '#4f46e5'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>

          <div className="flex flex-col gap-5 xl:h-full">
            <SectionCard
              icon={<FaBullhorn className="text-rose-500" />}
              title="Latest Announcements"
              description="Keep the community in the loop."
              className="flex-1"
            >
              {latestAnnouncements.length === 0 ? (
                <EmptyState message="No announcements yet." />
              ) : (
                <ul className="mt-4 space-y-3">
                  {latestAnnouncements.map((a) => (
                    <li
                      key={a.id}
                      className="rounded-2xl border border-white/40 bg-white/70 p-4 shadow-sm backdrop-blur transition hover:border-blue-200/80"
                    >
                      <p className="text-sm font-semibold text-slate-800">{a.title}</p>
                      <p className="text-xs text-slate-500">{formatDate(a.announcement_date)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          </div>
        </div>

        <SectionCard
          icon={<FaClock className="text-emerald-500" />}
          title="Recent Payments"
          description="Latest remittances from guardians and students."
        >
          {payments.length === 0 ? (
            <EmptyState message="No payments recorded for now." />
          ) : (
            <div className="mt-4 space-y-5">
              <div className="overflow-x-auto rounded-3xl border border-blue-100/80 bg-white/80 backdrop-blur">
                <table className="w-full text-left">
                  <thead className="bg-gradient-to-r from-blue-50 via-indigo-50 to-emerald-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="py-3 pl-6">Student</th>
                      <th className="py-3">Amount</th>
                      <th className="py-3 pr-6 text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p, index) => (
                      <tr
                        key={p.id ?? index}
                        className="border-t border-blue-50/70 text-sm hover:bg-blue-50/40"
                      >
                        <td className="py-3 pl-6 font-medium text-slate-700">
                          <div className="flex items-center gap-3">
                            <Avatar name={p.student_name} />
                            <span>{p.student_name}</span>
                          </div>
                        </td>
                        <td className="py-3 font-semibold text-slate-800">{formatCurrency(p.amount)}</td>
                        <td className="py-3 pr-6 text-right text-slate-500">{formatDate(p.contributed_date)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col items-center gap-3 text-sm text-slate-600 sm:flex-row sm:justify-between">
                <span>
                  {totalPayments === 0
                    ? 'Showing 0 entries'
                    : `Showing ${from} to ${to} of ${totalPayments} payments`}
                </span>
                <div className="flex items-center gap-2">
                  <PagerButton
                    disabled={!canGoPrevious}
                    onClick={() => goToPage(currentPage - 1)}
                  >
                    Previous
                  </PagerButton>
                  <span className="rounded-full bg-blue-600 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-white shadow">
                    Page {currentPage} of {lastPage}
                  </span>
                  <PagerButton
                    disabled={!canGoNext}
                    onClick={() => goToPage(currentPage + 1)}
                  >
                    Next
                  </PagerButton>
                </div>
              </div>
            </div>
          )}
        </SectionCard>
      </div>
    </>
  );
};

const InfoCard = ({ icon, label, value, subtext, accent = 'from-blue-500/20 to-blue-600/25' }) => (
  <div className={`relative overflow-hidden rounded-3xl border border-white/50 bg-white/80 p-5 shadow-lg backdrop-blur-sm transition hover:shadow-xl`}> 
    <div className={`absolute inset-0 bg-gradient-to-br ${accent} opacity-90`} />
    <div className="relative flex items-start gap-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/80 text-2xl text-blue-600 shadow-inner">
        {icon}
      </div>
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <h2 className="text-2xl font-semibold text-slate-900">{value}</h2>
        {subtext && <p className="text-xs text-slate-500/90">{subtext}</p>}
      </div>
    </div>
  </div>
);

const SectionCard = ({ icon, title, description, children, className = '' }) => (
  <div className={`relative overflow-hidden rounded-3xl border border-blue-100/80 bg-white/90 p-6 shadow-lg shadow-blue-500/5 backdrop-blur ${className}`}>
    <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.15),transparent_60%)]" />
    <div className="flex items-start gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 text-lg">
        {icon}
      </div>
      <div className="flex-1">
        <div className="flex flex-col gap-1">
          <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
          {description && <p className="text-sm text-slate-500">{description}</p>}
        </div>
        {children}
      </div>
    </div>
  </div>
);

const StatusPill = ({ status }) => {
  const normalized = (status || '').toLowerCase();
  const styles = {
    approved: 'bg-emerald-100 text-emerald-600',
    completed: 'bg-emerald-100 text-emerald-600',
    pending: 'bg-amber-100 text-amber-600',
    rejected: 'bg-rose-100 text-rose-600'
  };

  const className = styles[normalized] || 'bg-slate-100 text-slate-600';

  return (
    <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${className}`}>
      {status ?? 'pending'}
    </span>
  );
};

const EmptyState = ({ message }) => (
  <div className="mt-4 rounded-2xl border border-dashed border-blue-200/70 bg-white/60 p-6 text-center text-sm text-slate-500">
    {message}
  </div>
);

const Avatar = ({ name }) => {
  const initials = React.useMemo(() => {
    if (!name) return '—';
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0]?.toUpperCase())
      .join('');
  }, [name]);

  return (
    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 text-sm font-semibold text-white shadow">
      {initials || '—'}
    </span>
  );
};

const PagerButton = ({ children, ...props }) => (
  <button
    type="button"
    className="rounded-full border border-blue-200 bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-blue-600 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
    {...props}
  >
    {children}
  </button>
);

const HeroBadge = ({ icon, label, value, tone = 'sky' }) => {
  const toneMap = {
    emerald: 'from-emerald-400/20 via-emerald-500/20 to-emerald-600/30 text-emerald-100',
    rose: 'from-rose-400/20 via-rose-500/20 to-rose-600/30 text-rose-100',
    sky: 'from-sky-400/20 via-sky-500/20 to-sky-600/30 text-sky-100'
  };

  return (
    <div className={`flex min-w-[160px] flex-col gap-1 rounded-3xl border border-white/40 bg-gradient-to-tr ${toneMap[tone] ?? toneMap.sky} px-4 py-3 shadow-lg backdrop-blur`}> 
      <span className="text-xs uppercase tracking-wide text-white/70">{label}</span>
      <div className="flex items-center gap-2 text-lg font-semibold">
        <span className="text-white/90">{value}</span>
        <span className="text-white/70 text-base">{icon}</span>
      </div>
    </div>
  );
};

Dashboard.layout = (page) => <AdminLayout children={page} />;

export default Dashboard;
