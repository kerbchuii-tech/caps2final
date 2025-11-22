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
  FaBullhorn
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
      <div className="space-y-6">

        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400"></p>
              <h1 className="text-3xl font-extrabold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                Dashboard</h1>
            </div>
          </div>
        </div>

        {/* <hr className="my-6 border-t-2 border-black" /> */}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
          <InfoCard
            icon={<FaUser className="text-blue-500" />}
            label="Total Students"
            value={totalStudents.toLocaleString()}
            subtext="Across all grade levels"
          />
          <InfoCard
            icon={<FaUsers className="text-blue-500" />}
            label="Total Guardians"
            value={totalGuardians.toLocaleString()}
            subtext="Active parent/guardian accounts"
          />
          <InfoCard
            icon={<FaMoneyBillWave />}
            label="Funds Collected"
            value={`₱ ${Number(totalFundsCollected).toLocaleString()}`}
            subtext="Year-to-date collections"
            tintClass="border-yellow-200 hover:border-yellow-300"
            iconBgClass="bg-yellow-50 text-yellow-500"
          />
          <InfoCard
            icon={<FaFileInvoiceDollar />}
            label="Expenses"
            value={`₱ ${Number(totalExpenses).toLocaleString()}`}
            subtext="Verified disbursements"
            tintClass="border-red-200 hover:border-red-300"
            iconBgClass="bg-red-50 text-red-500"
          />
          <InfoCard
            icon={<FaWallet />}
            label="Available Funds"
            value={`₱ ${Number(availableFunds).toLocaleString()}`}
            subtext="Ready for allocation"
            tintClass="border-green-200 hover:border-green-300"
            iconBgClass="bg-green-50 text-green-500"
          />
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-[3fr,2fr] gap-4 items-stretch">
          {/* Financial Overview */}
          <div className="bg-white border border-blue-100/50 rounded-3xl p-6 shadow-sm flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Financial Overview</h3>
                <p className="text-sm text-slate-500">Comparing collections, expenses, and remaining funds.</p>
              </div>
            </div>
            <div className="mt-6 w-full h-[340px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" stroke="#475569" />
                  <YAxis stroke="#475569" />
                  <Tooltip formatter={(value) => `₱ ${Number(value).toLocaleString()}`} />
                  <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${entry.name}`} fill={barColors[index] || '#4f46e5'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Activity Column */}
          <div className="space-y-4 flex flex-col">
            <div className="bg-white border border-blue-100/50 p-6 rounded-3xl shadow-sm">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FaBullhorn className="text-red-500" /> Latest Announcements
              </h3>
              {latestAnnouncements.length === 0 ? (
                <p className="text-gray-500">No announcements yet.</p>
              ) : (
                <ul className="space-y-3">
                  {latestAnnouncements.map((a) => (
                    <li key={a.id} className="p-4 bg-white border border-blue-100/40 rounded-2xl transition hover:border-blue-200">
                      <p className="text-sm font-semibold text-slate-800">{a.title}</p>
                      <p className="text-xs text-slate-500">{formatDate(a.announcement_date)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="bg-white border border-blue-100/50 p-6 rounded-3xl shadow-sm flex-1">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Recent Payments</h3>
                <span className="text-xs px-3 py-1 rounded-full bg-emerald-100 text-emerald-600 font-semibold">
                  {totalPayments} entries
                </span>
              </div>
              {payments.length === 0 ? (
                <p className="text-gray-500">No payments yet.</p>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border border-gray-100 rounded-xl overflow-hidden">
                      <thead className="bg-gray-50">
                        <tr className="text-gray-600 uppercase text-xs">
                          <th className="py-3 px-4">Student</th>
                          <th>Amount</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payments.map((p, index) => (
                          <tr
                            key={p.id ?? index}
                            className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-gray-100 transition`}
                          >
                            <td className="py-2 px-4">{p.student_name}</td>
                            <td>₱ {Number(p.amount).toLocaleString()}</td>
                            <td>{formatDate(p.contributed_date)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-5 flex flex-col items-center gap-3 text-sm text-slate-600">
                    <span>
                      {totalPayments === 0
                        ? 'Showing 0 entries'
                        : `Showing ${from} to ${to} of ${totalPayments} payments`}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={!canGoPrevious}
                        className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Previous page"
                      >
                        ‹
                      </button>
                      <span className="px-4 py-1.5 rounded-lg bg-blue-600 text-white font-semibold shadow">
                        Page {currentPage} of {lastPage}
                      </span>
                      <button
                        type="button"
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={!canGoNext}
                        className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Next page"
                      >
                        ›
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// InfoCard Component
const InfoCard = ({ icon, label, value, subtext, tintClass = 'border-blue-100 hover:border-blue-200', iconBgClass = 'bg-blue-50 text-blue-500' }) => (
  <div className={`rounded-2xl border bg-white p-4 shadow-sm transition flex items-start gap-3 ${tintClass}`}>
    <div className={`flex h-11 w-11 items-center justify-center rounded-2xl text-2xl ${iconBgClass}`}>
      {icon}
    </div>
    <div className="space-y-1">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <h2 className="text-2xl font-semibold text-slate-900">{value}</h2>
      {subtext && <p className="text-xs text-slate-500">{subtext}</p>}
    </div>
  </div>
);

Dashboard.layout = (page) => <AdminLayout children={page} />;

export default Dashboard;
