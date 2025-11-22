import React, { useEffect, useMemo, useState } from "react";
import { usePage } from "@inertiajs/react";
import AuditorLayout from "@/Layouts/AuditorLayout";
import { CreditCard, Gift, Package, Wallet } from "lucide-react";

const StatCard = ({ icon, label, value, accent }) => (
  <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
    <div className="flex items-center gap-3">
      <span className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${accent}`}>
        {icon}
      </span>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{label}</p>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
      </div>
    </div>
  </div>
);

const SummaryText = ({ total, start, end }) => (
  <p className="text-center text-sm text-slate-500">
    {total === 0
      ? "Showing 0 records"
      : `Showing ${start} to ${end} of ${total} record${total === 1 ? "" : "s"}`}
  </p>
);

const Pagination = ({ page, totalPages, onPageChange }) => (
  <div className="flex items-center justify-center gap-2 pt-3">
    <button
      type="button"
      onClick={() => onPageChange(page - 1)}
      disabled={page <= 1}
      className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
    >
      ‹
    </button>
    <span className="inline-flex h-10 min-w-[2.5rem] items-center justify-center rounded-2xl bg-blue-600 px-4 text-sm font-semibold text-white shadow">
      {page}
    </span>
    <button
      type="button"
      onClick={() => onPageChange(page + 1)}
      disabled={page >= totalPages}
      className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
    >
      ›
    </button>
  </div>
);

const formatCurrency = (value) =>
  `₱${Number(value || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const options = {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  };
  try {
    return new Intl.DateTimeFormat("en-PH", options).format(date);
  } catch (error) {
    return date.toLocaleString("en-PH", options);
  }
};

export default function Funds() {
  const { payments = [], donations = [], totals = {} } = usePage().props;

  const [activeTab, setActiveTab] = useState("payments");
  const [paymentPage, setPaymentPage] = useState(1);
  const [donationPage, setDonationPage] = useState(1);
  const [donationFilter, setDonationFilter] = useState("cash");
  const pageSize = 10;

  const safeTotals = {
    payments: totals?.payments ?? 0,
    donationsCash: totals?.donationsCash ?? 0,
    donationsInKind: totals?.donationsInKind ?? 0,
    overall:
      totals?.overall ?? (totals?.payments ?? 0) + (totals?.donationsCash ?? 0),
  };

  const paymentTotalPages = Math.max(1, Math.ceil(payments.length / pageSize));
  const filteredDonations = useMemo(() => {
    return donations.filter((donation) => {
      const type = (donation.donation_type || "").toLowerCase();
      return donationFilter === "cash" ? type !== "in-kind" : type === "in-kind";
    });
  }, [donations, donationFilter]);

  const donationTotalPages = Math.max(1, Math.ceil(filteredDonations.length / pageSize));

  const paginatedPayments = useMemo(() => {
    const start = (paymentPage - 1) * pageSize;
    return payments.slice(start, start + pageSize);
  }, [payments, paymentPage]);

  const paginatedDonations = useMemo(() => {
    const start = (donationPage - 1) * pageSize;
    return filteredDonations.slice(start, start + pageSize);
  }, [filteredDonations, donationPage]);

  useEffect(() => {
    setDonationPage(1);
  }, [donationFilter]);

  const handleTabClick = (tab) => {
    setActiveTab(tab);
    if (tab === "payments") {
      setPaymentPage(1);
    } else {
      setDonationPage(1);
    }
  };

  const tabList = [
    { id: "payments", label: "Payments" },
    { id: "donations", label: "Donations" },
  ];

  const renderPayments = () => (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.2em] text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">Student</th>
              <th className="px-4 py-3 text-left">Contribution</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3 text-right">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedPayments.length > 0 ? (
              paginatedPayments.map((payment) => (
                <tr key={payment.id} className="bg-white">
                  <td className="px-4 py-3 font-semibold text-slate-800">
                    {payment.student_name || "N/A"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {payment.contribution_type || "-"}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-emerald-600">
                    {formatCurrency(payment.amount)}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-500">
                    {formatDateTime(payment.payment_date)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                  No payment records available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <SummaryText
        total={payments.length}
        start={payments.length === 0 ? 0 : (paymentPage - 1) * pageSize + 1}
        end={Math.min(paymentPage * pageSize, payments.length)}
      />
      {payments.length > 0 && (
        <Pagination
          page={paymentPage}
          totalPages={paymentTotalPages}
          onPageChange={(value) =>
            setPaymentPage(Math.min(Math.max(value, 1), paymentTotalPages))
          }
        />
      )}
    </div>
  );

  const renderDonations = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-center gap-1 rounded-full bg-slate-100 p-1 text-sm font-semibold text-slate-500">
        {["cash", "in-kind"].map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => setDonationFilter(filter)}
            className={`rounded-full px-4 py-1.5 transition ${
              donationFilter === filter ? "bg-white text-blue-600 shadow" : "hover:text-blue-600"
            }`}
          >
            {filter === "cash" ? "Cash" : "In-Kind"}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.2em] text-slate-500">
            {donationFilter === "cash" ? (
              <tr>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Donated By</th>
                <th className="px-4 py-3 text-left">Details</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-right">Received By</th>
              </tr>
            ) : (
              <tr>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Donated By</th>
                <th className="px-4 py-3 text-left">Item Type</th>
                <th className="px-4 py-3 text-left">Details</th>
                <th className="px-4 py-3 text-right">Qty Donated</th>
                <th className="px-4 py-3 text-right">Qty Remaining</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Received By</th>
              </tr>
            )}
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedDonations.length > 0 ? (
              paginatedDonations.map((donation) => {
                if (donationFilter === "cash") {
                  return (
                    <tr key={donation.id} className="bg-white">
                      <td className="px-4 py-3 text-slate-600">
                        {formatDateTime(donation.donation_date)}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        {donation.donated_by || "Anonymous"}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {donation.donation_description || "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-blue-600">
                        {formatCurrency(donation.donation_amount)}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-500">
                        {donation.received_by || "—"}
                      </td>
                    </tr>
                  );
                }

                const donatedQty = Number(donation.donation_quantity ?? 0);
                const usableQty = donation.usable_quantity ?? donation.donation_quantity;
                const damagedQty = Number(donation.damaged_quantity ?? 0);
                const unusableQty = Number(donation.unusable_quantity ?? 0);
                const remainingQty = usableQty ?? Math.max(donatedQty - damagedQty - unusableQty, 0);

                return (
                  <tr key={donation.id} className="bg-white">
                    <td className="px-4 py-3 text-slate-600">
                      {formatDateTime(donation.donation_date)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      {donation.donated_by || "Anonymous"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{donation.item_type || "—"}</td>
                    <td className="px-4 py-3 text-slate-500">{donation.donation_description || "—"}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-800">
                      {donatedQty.toLocaleString("en-PH", { maximumFractionDigits: 0 })}
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-600 font-semibold">
                      {Number(remainingQty ?? 0).toLocaleString("en-PH", { maximumFractionDigits: 0 })}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {donation.usage_status || "Available"}
                      {damagedQty > 0 || unusableQty > 0 ? (
                        <span className="block text-xs text-slate-400">
                          Damaged: {damagedQty.toLocaleString("en-PH", { maximumFractionDigits: 0 })} · Unusable: {unusableQty.toLocaleString("en-PH", { maximumFractionDigits: 0 })}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-500">{donation.received_by || "—"}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={donationFilter === "cash" ? 5 : 8} className="px-4 py-8 text-center text-slate-400">
                  No {donationFilter === "cash" ? "cash" : "in-kind"} donation records available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <SummaryText
        total={filteredDonations.length}
        start={filteredDonations.length === 0 ? 0 : (donationPage - 1) * pageSize + 1}
        end={Math.min(donationPage * pageSize, filteredDonations.length)}
      />
      {filteredDonations.length > 0 && (
        <Pagination
          page={donationPage}
          totalPages={donationTotalPages}
          onPageChange={(value) =>
            setDonationPage(Math.min(Math.max(value, 1), donationTotalPages))
          }
        />
      )}
    </div>
  );

  return (
    <AuditorLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
            Funds Overview
          </h1>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={<CreditCard className="text-blue-600" size={22} />}
            label="Total Payments"
            value={formatCurrency(safeTotals.payments)}
            accent="bg-blue-50"
          />
          <StatCard
            icon={<Gift className="text-emerald-600" size={22} />}
            label="Cash Donations"
            value={formatCurrency(safeTotals.donationsCash)}
            accent="bg-emerald-50"
          />
          <StatCard
            icon={<Package className="text-amber-600" size={22} />}
            label="In-Kind Donations"
            value={formatCurrency(safeTotals.donationsInKind)}
            accent="bg-amber-50"
          />
          <StatCard
            icon={<Wallet className="text-slate-900" size={22} />}
            label="Overall Funds"
            value={formatCurrency(safeTotals.overall)}
            accent="bg-slate-100"
          />
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Fund Movements
              </p>
              <h2 className="text-xl font-semibold text-slate-900">Payments & Donations</h2>
            </div>
            <div className="flex items-center gap-1 rounded-full bg-slate-100 p-1 text-sm font-semibold text-slate-500">
              {tabList.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabClick(tab.id)}
                  className={`rounded-full px-4 py-1.5 transition ${
                    activeTab === tab.id
                      ? "bg-white text-blue-600 shadow"
                      : "hover:text-blue-600"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="px-4 py-6 sm:px-6">
            {activeTab === "payments" ? renderPayments() : renderDonations()}
          </div>
        </div>
      </div>
    </AuditorLayout>
  );
}
