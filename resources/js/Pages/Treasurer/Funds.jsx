import React, { useMemo, useState } from "react";
import TreasurerLayout from "@/Layouts/TreasurerLayout";
import { PiggyBank, Gift, Wallet, HandCoins, Loader2 } from "lucide-react";
import { usePage } from "@inertiajs/react";

export default function Funds() {
  const { funds = [] } = usePage().props;

  const [page, setPage] = useState(1);
  const pageSize = 10;

  const totalRows = funds.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));

  const paginatedFunds = useMemo(() => {
    const start = (page - 1) * pageSize;
    return funds.slice(start, start + pageSize);
  }, [funds, page]);

  const showingStart = totalRows === 0 ? 0 : (page - 1) * pageSize + 1;
  const showingEnd = Math.min(page * pageSize, totalRows);

  const gotoPage = (target) => {
    const clamped = Math.min(Math.max(target, 1), totalPages);
    if (clamped !== page) setPage(clamped);
  };

  // 🔹 Compute Totals (safe check)
  const totalPayments = funds.reduce(
    (sum, f) => sum + parseFloat(f.total_payments || 0),
    0
  );
  const totalDonations = funds.reduce(
    (sum, f) => sum + parseFloat(f.total_donations || 0),
    0
  );
  const totalInKind = funds.reduce(
    (sum, f) => sum + parseFloat(f.total_in_kind || 0),
    0
  );
  // Overall funds should only reflect liquid cash (payments + cash donations)
  const totalFunds = totalPayments + totalDonations;

  // Utils
  const formatCurrency = (value) => {
    const n = Number(value || 0);
    return n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <TreasurerLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div>
              <h1 className="text-3xl font-extrabold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                Funds Overview
              </h1>
            </div>
          </div>
        </div>

        {funds.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-100 bg-white py-16 text-slate-500 shadow">
            <Loader2 className="w-8 h-8 animate-spin mb-3 text-blue-500" />
            <p>Loading funds data...</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <FundsStatCard icon={<PiggyBank className="w-5 h-5" />} label="Total Payments" value={`₱${formatCurrency(totalPayments)}`} accent="bg-green-50 text-green-700" />
              <FundsStatCard icon={<Gift className="w-5 h-5" />} label="Cash Donations" value={`₱${formatCurrency(totalDonations)}`} accent="bg-purple-50 text-purple-700" />
              <FundsStatCard icon={<Gift className="w-5 h-5" />} label="In-Kind Donations" value={`₱${formatCurrency(totalInKind)}`} accent="bg-pink-50 text-pink-700" />
              <FundsStatCard icon={<Wallet className="w-5 h-5" />} label="Overall Funds" value={`₱${formatCurrency(totalFunds)}`} accent="bg-blue-50 text-blue-700" large />
            </div>

            <div className="rounded-3xl border border-slate-100 bg-white shadow-sm overflow-hidden">
              <table className="w-full text-sm text-left text-slate-700">
                <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3">Month</th>
                    <th className="px-4 py-3">Payments</th>
                    <th className="px-4 py-3">Cash Donations</th>
                    <th className="px-4 py-3">In-Kind</th>
                    <th className="px-4 py-3">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {paginatedFunds.map((f, idx) => {
                    const monthlyTotal =
                      parseFloat(f.total_payments || 0) +
                      parseFloat(f.total_donations || 0);

                    return (
                      <tr key={`${f.month}-${idx}`} className="hover:bg-blue-50/60 transition">
                        <td className="px-4 py-3 font-medium text-gray-800">
                          {f.month
                            ? new Date(f.month + "-01").toLocaleDateString("en-PH", {
                                year: "numeric",
                                month: "long",
                              })
                            : "N/A"}
                        </td>
                        <td className="px-4 py-3 text-green-700 font-semibold">
                          ₱{formatCurrency(f.total_payments)}
                        </td>
                        <td className="px-4 py-3 text-purple-700 font-semibold">
                          ₱{formatCurrency(f.total_donations)}
                        </td>
                        <td className="px-4 py-3 text-pink-700 font-semibold">
                          ₱{formatCurrency(f.total_in_kind)}
                        </td>
                        <td className="px-4 py-3 text-blue-800 font-bold">
                          ₱{formatCurrency(monthlyTotal)}
                        </td>
                      </tr>
                    );
                  })}
                  {paginatedFunds.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                        No funds data available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex flex-col items-center gap-3 text-sm text-slate-600">
              <span className="text-center">
                {totalRows === 0
                  ? "Showing 0 records"
                  : `Showing ${showingStart} to ${showingEnd} of ${totalRows} record${totalRows === 1 ? "" : "s"}`}
              </span>
              <div className="flex items-center gap-2">
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
          </>
        )}
      </div>
    </TreasurerLayout>
  );
}

const FundsStatCard = ({ icon, label, value, accent, large }) => (
  <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
    <div className="flex items-center gap-3 mb-2">
      <span className={`inline-flex items-center justify-center w-10 h-10 rounded-2xl ${accent}`}>{icon}</span>
      <p className="text-sm font-medium text-slate-600">{label}</p>
    </div>
    <p className={`font-semibold text-slate-900 ${large ? "text-4xl" : "text-3xl"}`}>{value}</p>
  </div>
);
