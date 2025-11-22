import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePage, router } from "@inertiajs/react";
import TreasurerLayout from "@/Layouts/TreasurerLayout";
import {
  Gift,
  DollarSign,
  FileText,
  TrendingUp,
  TrendingDown,
  Folder,
  Download,
  Printer,
  CalendarDays,
} from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";

/**
 * Detailed (Overall) Reports
 * Receives already-filtered donations, payments, fundsHistories
 */
const DetailedReport = ({ donations, payments, fundsHistories }) => {
  const reportRef = useRef();
  const toolbarRef = useRef(null); // top action buttons

  const formatCurrency = (value) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(value || 0);

  const formatDateTime = (dateString) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleDateString("en-PH", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const donationStatusTone = (status = "") => {
    const normalized = status.toLowerCase();
    if (!normalized) return "text-emerald-600";
    if (normalized.includes("unusable")) return "text-rose-600";
    if (normalized.includes("damage")) return "text-amber-600";
    return "text-emerald-600";
  };

  const donationStatusDot = (status = "") => {
    const normalized = status.toLowerCase();
    if (!normalized) return "bg-emerald-500";
    if (normalized.includes("unusable")) return "bg-rose-500";
    if (normalized.includes("damage")) return "bg-amber-500";
    return "bg-emerald-500";
  };

  const resolveTimestamp = (record) => record?.timestamp || record?.payment_date || record?.donation_date || record?.fund_date;

  const pageSize = 10;

  const [paymentSearch, setPaymentSearch] = useState("");
  const [paymentPage, setPaymentPage] = useState(1);
  const [donationSearch, setDonationSearch] = useState("");
  const [donationPage, setDonationPage] = useState(1);
  const [donationTab, setDonationTab] = useState("cash");
  const [fundSearch, setFundSearch] = useState("");
  const [fundPage, setFundPage] = useState(1);
  const [fundFilterYear, setFundFilterYear] = useState(() => String(new Date().getFullYear()));
  const [fundFilterMonth, setFundFilterMonth] = useState(() => String(new Date().getMonth()));

  useEffect(() => setPaymentPage(1), [paymentSearch, payments]);
  useEffect(() => setDonationPage(1), [donationSearch, donations, donationTab]);
  useEffect(() => setFundPage(1), [fundSearch, fundsHistories]);
  useEffect(() => setFundPage(1), [fundFilterYear, fundFilterMonth]);

  const monthNames = useMemo(
    () => [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ],
    []
  );

  const availableFundYears = useMemo(() => {
    const years = new Set();
    fundsHistories.forEach((entry) => {
      const timestamp = resolveTimestamp(entry);
      if (!timestamp) return;
      const date = new Date(timestamp);
      if (!Number.isNaN(date.getTime())) years.add(date.getFullYear());
    });
    if (years.size === 0) years.add(new Date().getFullYear());
    return Array.from(years).sort((a, b) => b - a);
  }, [fundsHistories]);

  useEffect(() => {
    if (availableFundYears.length === 0) return;
    const numericYear = Number(fundFilterYear);
    if (!availableFundYears.includes(numericYear)) {
      setFundFilterYear(String(availableFundYears[0]));
    }
  }, [availableFundYears, fundFilterYear]);

  const resetFundFilters = () => {
    const now = new Date();
    setFundFilterYear(String(now.getFullYear()));
    setFundFilterMonth(String(now.getMonth()));
  };
  const filteredPayments = useMemo(() => {
    const term = paymentSearch.trim().toLowerCase();
    if (!term) return payments;
    return payments.filter((p) =>
      [
        p.student_name,
        p.contribution_name,
        p.amount_paid,
        p.payment_date,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [payments, paymentSearch]);

  const filteredDonations = useMemo(() => {
    const term = donationSearch.trim().toLowerCase();
    const matchesSearch = (donation) => {
      if (!term) return true;
      return [
        donation.donated_by,
        donation.donation_type,
        donation.donation_description,
        donation.received_by,
        donation.donation_date,
        donation.donation_amount,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term);
    };

    const matchesTab = (donation) => {
      const isInKind = donation.donation_type?.toLowerCase() === "in-kind";
      return donationTab === "cash" ? !isInKind : isInKind;
    };

    return donations.filter((d) => matchesTab(d) && matchesSearch(d));
  }, [donations, donationSearch, donationTab]);

  const fundsWithinPeriod = useMemo(() => {
    return fundsHistories.filter((h) => {
      const timestamp = resolveTimestamp(h);
      if (!timestamp) return false;
      const date = new Date(timestamp);
      if (Number.isNaN(date.getTime())) return false;
      if (date.getFullYear().toString() !== fundFilterYear) return false;
      if (date.getMonth().toString() !== fundFilterMonth) return false;
      return true;
    });
  }, [fundsHistories, fundFilterMonth, fundFilterYear]);

  const filteredFunds = useMemo(() => {
    const term = fundSearch.trim().toLowerCase();
    if (!term) return fundsWithinPeriod;
    return fundsWithinPeriod.filter((h) =>
      [
        h.fund_date,
        h.fund_description,
        h.donation_type,
        h.amount,
        h.donated_by,
        h.student_name,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [fundsWithinPeriod, fundSearch]);

  const paginate = (data, page) => {
    const start = (page - 1) * pageSize;
    return data.slice(start, start + pageSize);
  };

  const paymentsPageTotal = Math.max(1, Math.ceil(filteredPayments.length / pageSize));
  const donationsPageTotal = Math.max(1, Math.ceil(filteredDonations.length / pageSize));
  const fundComputed = useMemo(() => {
    const totals = {
      payments: 0,
      donations: 0,
      inKind: 0,
      expenses: 0,
      endingFund: 0,
    };

    const rows = filteredFunds.map((h, idx) => {
      const amount = parseFloat(h.amount ?? 0) || 0;
      const isPayment = Boolean(h.payment_id);
      const isDonation = Boolean(h.donation_id);
      const donationType = (h.donation_type || "").toLowerCase();
      const isInKind = donationType === "in-kind";
      const isExpense = Boolean(h.expense_id) || (!isPayment && !isDonation);

      const payment = isPayment ? amount : 0;
      const donation = isDonation && !isInKind ? amount : 0;
      const inKind = isDonation && isInKind ? amount : 0;
      const expense = isExpense ? amount : 0;

      const fundBefore = parseFloat(h.balance_before ?? 0) || 0;
      const fundAfter = parseFloat(h.balance_after ?? 0) || 0;

      totals.payments += payment;
      totals.donations += donation;
      totals.inKind += inKind;
      totals.expenses += expense;
      totals.endingFund = fundAfter;

      return {
        key: h.id ?? idx,
        record: h,
        payment,
        donation,
        inKind,
        expense,
        fundBefore,
        fundAfter,
        isPayment,
        isDonation,
        isInKind,
        isExpense,
      };
    });

    const finalRow = rows.length > 0 ? rows[rows.length - 1] : null;

    return {
      rows,
      totals,
      finalFundBefore: finalRow ? finalRow.fundBefore : 0,
      finalFundAfter: finalRow ? finalRow.fundAfter : 0,
    };
  }, [filteredFunds]);

  const fundsPageTotal = Math.max(1, Math.ceil(fundComputed.rows.length / pageSize));

  const paginatedPayments = useMemo(
    () => paginate(filteredPayments, paymentPage),
    [filteredPayments, paymentPage]
  );
  const paginatedDonations = useMemo(
    () => paginate(filteredDonations, donationPage),
    [filteredDonations, donationPage]
  );
  const paginatedFunds = useMemo(
    () => paginate(fundComputed.rows, fundPage),
    [fundComputed.rows, fundPage]
  );

  const summaryText = (total, page) =>
    total === 0
      ? "Showing 0 records"
      : `Showing ${(page - 1) * pageSize + 1} to ${Math.min(
          page * pageSize,
          total
        )} of ${total} record${total === 1 ? "" : "s"}`;

  // Totals based on filtered datasets
  const totalPayments = payments.reduce(
    (sum, p) => sum + parseFloat(p.amount_paid || 0),
    0
  );
  const paymentBreakdown = useMemo(() => {
    const map = new Map();
    payments.forEach((p) => {
      const key = p.contribution_name || "Uncategorized";
      const amount = parseFloat(p.amount_paid || 0) || 0;
      map.set(key, (map.get(key) || 0) + amount);
    });

    return Array.from(map.entries())
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [payments]);
  const hasPaymentBreakdown = paymentBreakdown.length > 0;
  const totalCashDonations = donations
    .filter((d) => d.donation_type !== "in-kind")
    .reduce((sum, d) => sum + parseFloat(d.donation_amount || 0), 0);
  const totalIncome = totalPayments + totalCashDonations;
  const totalExpenses = fundsHistories
    .filter((h) => !h.payment_id && !h.donation_id)
    .reduce((sum, h) => sum + parseFloat(h.amount || 0), 0);
  const netIncome = totalIncome - totalExpenses;

  const summaryCards = [
    {
      label: "Total Payments",
      value: formatCurrency(totalPayments),
      icon: DollarSign,
      accent: "from-blue-200/70 via-blue-100/50 to-transparent",
      iconTint: "bg-blue-50 text-blue-600",
      textColor: "text-blue-700",
    },
    {
      label: "Total Donations (Cash)",
      value: formatCurrency(totalCashDonations),
      icon: Gift,
      accent: "from-purple-200/70 via-purple-100/50 to-transparent",
      iconTint: "bg-purple-50 text-purple-600",
      textColor: "text-purple-700",
    },
    {
      label: "Total Expenses",
      value: `-${formatCurrency(totalExpenses)}`,
      icon: TrendingDown,
      accent: "from-rose-200/70 via-rose-100/50 to-transparent",
      iconTint: "bg-rose-50 text-rose-600",
      textColor: "text-rose-700",
    },
    {
      label: "Available Funds",
      value: formatCurrency(totalPayments + totalCashDonations - totalExpenses),
      icon: TrendingUp,
      accent: "from-emerald-200/70 via-emerald-100/50 to-transparent",
      iconTint: "bg-emerald-50 text-emerald-600",
      textColor: "text-emerald-700",
    },
  ];

  // PDF: capture the styled Income Statement card
  const handleDownloadPDF = async () => {
    const element = reportRef.current;
    if (!element) return;

    // Hide toolbar (buttons) during capture
    const toolbar = toolbarRef.current;
    let prevVisibility;
    if (toolbar) {
      prevVisibility = toolbar.style.visibility;
      toolbar.style.visibility = "hidden";
    }

    const canvas = await html2canvas(element, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
    });
    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 8; // mm
    const imgWidth = pageWidth - margin * 2;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    pdf.addImage(imgData, "PNG", margin, margin, imgWidth, imgHeight, undefined, "FAST");
    pdf.save("Income_Statement.pdf");

    // Restore toolbar visibility
    if (toolbar) toolbar.style.visibility = prevVisibility || "visible";
  };

  // Excel: export Income Statement figures
  const handleDownloadExcel = () => {
    const wb = XLSX.utils.book_new();
    const rows = [
      ["Alubijid National Comprehensive High School, SPTA Inc."],
      ["Income Statement"],
      [
        "Generated",
        new Date().toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        }),
      ],
      [],
      ["Payments (Contributions)", parseFloat(totalPayments || 0)],
      ["Cash Donations", parseFloat(totalCashDonations || 0)],
      ["Total Income", parseFloat(totalIncome || 0)],
      ["Less: Expenses", -parseFloat(totalExpenses || 0)],
      ["Net Income / Surplus", parseFloat(netIncome || 0)],
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [{ wch: 45 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, ws, "Income Statement");
    XLSX.writeFile(wb, "Income_Statement.xlsx");
  };
  const [activeTab, setActiveTab] = useState("summary");

  const formatQty = (value) => {
    const num = Number(value ?? 0);
    return Number.isNaN(num) ? "0" : num.toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  };

  const isInKind = (donation) => donation.donation_type?.toLowerCase() === "in-kind";

  return (
    <>
      {/* Tabs */}
      <div className="flex gap-2 border-b pb-2">
        {[
          { id: "summary", label: "Summary", icon: <Folder size={16} /> },
          { id: "payments", label: "Payments", icon: <Folder size={16} /> },
          { id: "donations", label: "Donations", icon: <Folder size={16} /> },
          { id: "fundHistory", label: "Fund History", icon: <Folder size={16} /> },
          { id: "incomeStatement", label: "Income Statement", icon: <Folder size={16} /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-t-lg font-medium flex items-center gap-2 transition duration-300 ease-in-out ${
              activeTab === tab.id
                ? "bg-blue-50 text-blue-700 border-b-2 border-blue-600 shadow-md"
                : "text-gray-600 hover:text-blue-700 hover:bg-gray-50 hover:shadow-md"
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {/* Summary */}
        {activeTab === "summary" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {summaryCards.map(({ label, value, icon: Icon, accent, iconTint, textColor }) => (
              <div
                key={label}
                className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5"
              >
                <span className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accent}`} aria-hidden />
                <div className="flex items-center gap-3">
                  <span className={`flex h-11 w-11 items-center justify-center rounded-xl border border-white shadow ${iconTint}`}>
                    <Icon size={22} />
                  </span>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
                </div>
                <p className={`mt-4 text-2xl font-bold ${textColor}`}>{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Payments Tab */}
        {activeTab === "payments" && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <h2 className="text-lg font-semibold text-gray-700 px-6 py-4 border-b bg-gray-50">
              Payment Records
            </h2>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-6 pt-4">
              <p className="text-sm text-gray-500">Filtered payments</p>
              <div className="relative w-full sm:w-80">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                <input
                  type="text"
                  value={paymentSearch}
                  onChange={(e) => setPaymentSearch(e.target.value)}
                  placeholder="Search name, contribution, amount..."
                  className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-gray-700">
                <thead className="bg-gray-100 text-gray-600 text-xs uppercase">
                  <tr>
                    <th className="px-5 py-3 text-left">Student</th>
                    <th className="px-5 py-3 text-left">Contribution</th>
                    <th className="px-5 py-3 text-right">Amount</th>
                    <th className="px-5 py-3 text-left">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedPayments.length > 0 ? (
                    paginatedPayments.map((p) => (
                      <tr
                        key={p.id}
                        className="hover:bg-gray-50 odd:bg-gray-50/40"
                      >
                        <td className="px-5 py-3">{p.student_name}</td>
                        <td className="px-5 py-3">{p.contribution_name}</td>
                        <td className="px-5 py-3 text-right font-medium text-blue-700">
                          {formatCurrency(p.amount_paid)}
                        </td>
                        <td className="px-5 py-3">{formatDateTime(resolveTimestamp(p))}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="4"
                        className="px-5 py-6 text-center text-gray-400"
                      >
                        No payments recorded.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-6 pb-5">
              <div className="mt-4 flex flex-col items-center gap-3 text-sm text-gray-600">
                <span className="text-center">{summaryText(filteredPayments.length, paymentPage)}</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={paymentPage === 1}
                    className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    className="w-9 h-9 rounded-lg bg-blue-600 text-white font-semibold flex items-center justify-center shadow"
                  >
                    {paymentPage}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setPaymentPage((prev) => Math.min(prev + 1, paymentsPageTotal))
                    }
                    disabled={paymentPage === paymentsPageTotal}
                    className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50"
                  >
                    ›
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Donations Tab */}
        {activeTab === "donations" && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <h2 className="text-lg font-semibold text-gray-700 px-6 py-4 border-b bg-gray-50">
              Donation Records
            </h2>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-6 pt-4">
              <p className="text-sm text-gray-500">Filtered donations</p>
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <div className="inline-flex rounded-full border border-gray-200 bg-gray-100 p-1 self-start">
                  {[
                    { key: "cash", label: "Cash" },
                    { key: "in-kind", label: "In-Kind" },
                  ].map((tab) => {
                    const active = donationTab === tab.key;
                    return (
                      <button
                        key={tab.key}
                        onClick={() => setDonationTab(tab.key)}
                        className={`px-4 py-1.5 text-xs font-semibold rounded-full transition ${
                          active ? "bg-white text-blue-600 shadow" : "text-gray-500 hover:text-blue-600"
                        }`}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
                <div className="relative w-full sm:w-72">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                  <input
                    type="text"
                    value={donationSearch}
                    onChange={(e) => setDonationSearch(e.target.value)}
                    placeholder="Search donor, type, amount..."
                    className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-gray-700">
                <thead className="bg-gray-100 text-gray-600 text-xs uppercase">
                  {donationTab === "cash" ? (
                    <tr>
                      <th className="px-5 py-3 text-left">Date</th>
                      <th className="px-5 py-3 text-left">Donated By</th>
                      <th className="px-5 py-3 text-right">Amount</th>
                      <th className="px-5 py-3 text-left">Details</th>
                      <th className="px-5 py-3 text-left">Received By</th>
                    </tr>
                  ) : (
                    <tr>
                      <th className="px-5 py-3 text-left">Date</th>
                      <th className="px-5 py-3 text-left">Donated By</th>
                      <th className="px-5 py-3 text-left">Item Type</th>
                      <th className="px-5 py-3 text-left">Details</th>
                      <th className="px-5 py-3 text-center">Quantity Used</th>
                      <th className="px-5 py-3 text-center">Qty Remaining</th>
                      <th className="px-5 py-3 text-left">Status & Notes</th>
                      <th className="px-5 py-3 text-left">Received By</th>
                    </tr>
                  )}
                </thead>
                <tbody>
                  {paginatedDonations.length > 0 ? (
                    paginatedDonations.map((d) => {
                      const rowClasses = "hover:bg-gray-50 odd:bg-gray-50/40";
                      if (donationTab === "cash") {
                        return (
                          <tr key={d.id} className={rowClasses}>
                            <td className="px-5 py-3">{formatDateTime(resolveTimestamp(d))}</td>
                            <td className="px-5 py-3">{d.donated_by}</td>
                            <td className="px-5 py-3 text-right font-medium text-purple-700">
                              {formatCurrency(d.donation_amount)}
                            </td>
                            <td className="px-5 py-3">{d.donation_description || "-"}</td>
                            <td className="px-5 py-3">{d.received_by}</td>
                          </tr>
                        );
                      }

                      return (
                        <tr key={d.id} className={rowClasses}>
                          <td className="px-5 py-3">{formatDateTime(resolveTimestamp(d))}</td>
                          <td className="px-5 py-3">{d.donated_by}</td>
                          <td className="px-5 py-3 font-medium text-gray-800">{d.item_type || "—"}</td>
                          <td className="px-5 py-3">{d.donation_description || "—"}</td>
                          <td className="px-5 py-3 text-center text-amber-600 font-semibold">{formatQty(d.used_quantity)}</td>
                          <td className="px-5 py-3 text-center text-emerald-600 font-semibold">
                            {formatQty(
                              d.usable_quantity || Math.max((Number(d.donation_quantity) || 0) - (Number(d.used_quantity) || 0) - (Number(d.damaged_quantity) || 0) - (Number(d.unusable_quantity) || 0), 0)
                            )}
                          </td>
                          <td className="px-5 py-3 text-xs text-slate-600">
                            <div className="flex flex-col gap-2">
                              <span className="inline-flex items-center gap-2 font-medium">
                                <span className={`inline-flex h-2.5 w-2.5 rounded-full ${donationStatusDot(d.usage_status || "")}`} />
                                <span className={donationStatusTone(d.usage_status || "")}>{d.usage_status || "Available"}</span>
                              </span>
                              <div className="space-y-0.5 text-[11px]">
                                <p><span className="font-semibold text-emerald-600">Usable:</span> {formatQty(d.usable_quantity)}</p>
                                <p><span className="font-semibold text-amber-600">Damaged:</span> {formatQty(d.damaged_quantity)}</p>
                                <p><span className="font-semibold text-rose-600">Unusable:</span> {formatQty(d.unusable_quantity)}</p>
                              </div>
                              {d.usage_notes && (
                                <span className="text-[11px] text-slate-500 italic">{d.usage_notes}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-3">{d.received_by}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={donationTab === "cash" ? 5 : 8} className="px-5 py-6 text-center text-gray-400">
                        No donations recorded.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-6 pb-5">
              <div className="mt-4 flex flex-col items-center gap-3 text-sm text-gray-600">
                <span className="text-center">{summaryText(filteredDonations.length, donationPage)}</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDonationPage((prev) => Math.max(prev - 1, 1))}
                    disabled={donationPage === 1}
                    className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    className="w-9 h-9 rounded-lg bg-blue-600 text-white font-semibold flex items-center justify-center shadow"
                  >
                    {donationPage}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setDonationPage((prev) => Math.min(prev + 1, donationsPageTotal))
                    }
                    disabled={donationPage === donationsPageTotal}
                    className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50"
                  >
                    ›
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Fund History Tab */}
        {activeTab === "fundHistory" && (
          <div className="relative overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">Fund History</h2>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">All transactions</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div>
                  <label className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Year</label>
                  <select
                    value={fundFilterYear}
                    onChange={(e) => setFundFilterYear(e.target.value)}
                    className="mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    {availableFundYears.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Month</label>
                  <select
                    value={fundFilterMonth}
                    onChange={(e) => setFundFilterMonth(e.target.value)}
                    className="mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    {monthNames.map((name, index) => (
                      <option key={name} value={String(index)}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={resetFundFilters}
                  className="text-sm font-medium text-blue-600 transition hover:text-blue-700"
                >
                  Clear
                </button>
                <div className="relative w-full min-w-[200px] sm:w-64">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
                  <input
                    type="text"
                    value={fundSearch}
                    onChange={(e) => setFundSearch(e.target.value)}
                    placeholder="Search date, detail, or amount..."
                    className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-slate-700">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.2em] text-slate-500">
                  <tr>
                    <th className="px-5 py-3 text-left">Date</th>
                    <th className="px-5 py-3 text-right">Payments</th>
                    <th className="px-5 py-3 text-right">Donations</th>
                    <th className="px-5 py-3 text-right">Expenses</th>
                    <th className="px-5 py-3 text-right">Funds Before</th>
                    <th className="px-5 py-3 text-right">Funds After</th>
                    <th className="px-5 py-3 text-left">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedFunds.length > 0 ? (
                    <>
                      {paginatedFunds.map((row) => {
                        const { record: h } = row;

                        const expenseUsesInKind = Boolean(h.expense_in_kind);
                        const inKindUsed = expenseUsesInKind
                          ? formatQty(h.expense_in_kind_used ?? h.amount ?? 0)
                          : null;

                        return (
                          <tr
                            key={`${row.key}-${fundPage}`}
                            className="transition hover:bg-blue-50/60"
                          >
                            <td className="px-5 py-3 font-medium text-slate-800">
                              {formatDateTime(resolveTimestamp(h))}
                            </td>
                            <td className="px-5 py-3 text-right font-semibold text-blue-700">
                              {row.payment ? formatCurrency(row.payment) : "—"}
                            </td>
                            <td className="px-5 py-3 text-right font-semibold text-purple-700">
                              {row.donation
                                ? formatCurrency(row.donation)
                                : row.inKind
                                  ? `${formatCurrency(row.inKind)} (In-Kind)`
                                  : expenseUsesInKind
                                    ? "In-Kind"
                                    : "—"}
                            </td>
                            <td className="px-5 py-3 text-right font-semibold text-rose-600">
                              {row.expense ? formatCurrency(row.expense) : "—"}
                            </td>
                            <td className="px-5 py-3 text-right text-slate-600">
                              {formatCurrency(row.fundBefore)}
                            </td>
                            <td className="px-5 py-3 text-right text-slate-600">
                              {formatCurrency(row.fundAfter)}
                            </td>
                            <td className="px-5 py-3">
                              <div className="flex flex-col gap-1 text-xs text-slate-500">
                                {row.isPayment && (
                                  <span className="inline-flex items-center gap-2 text-blue-600">
                                    <span className="inline-flex h-6 items-center rounded-full bg-blue-50 px-3 text-[11px] font-semibold uppercase tracking-wide">Payment</span>
                                    {h.student_name && <span className="text-slate-500">{h.student_name}</span>}
                                  </span>
                                )}

                                {row.isDonation && (
                                  <span className="inline-flex flex-wrap items-center gap-2 text-purple-600">
                                    <span className="inline-flex h-6 items-center rounded-full bg-purple-50 px-3 text-[11px] font-semibold uppercase tracking-wide">
                                      Donation {row.isInKind ? "In-Kind" : "Cash"}
                                    </span>
                                    {h.donated_by && (
                                      <span className="text-slate-500">Donated by: <span className="font-medium text-slate-700">{h.donated_by}</span></span>
                                    )}
                                  </span>
                                )}

                                {row.isExpense && (
                                  <span className="inline-flex flex-col gap-1 text-rose-600">
                                    <span className="inline-flex h-6 items-center self-start rounded-full bg-rose-50 px-3 text-[11px] font-semibold uppercase tracking-wide">Expense</span>
                                    {h.expense_type && <span className="text-slate-500">{h.expense_type}</span>}
                                    {h.expense_description && (
                                      <span className="text-slate-500">
                                        <span className="font-medium text-slate-700">Expense Description:</span> {h.expense_description}
                                      </span>
                                    )}
                                    {expenseUsesInKind && (
                                      <div className="space-y-1 text-slate-500">
                                        {h.expense_in_kind_item_type && (
                                          <p>
                                            <span className="font-medium text-slate-700">Item Type:</span> {h.expense_in_kind_item_type}
                                          </p>
                                        )}
                                        <p>
                                          <span className="font-medium text-slate-700">Used:</span> {inKindUsed}
                                        </p>
                                        {(h.expense_in_kind_donor || h.expense_in_kind_notes) && (
                                          <p>
                                            {h.expense_in_kind_donor && `From ${h.expense_in_kind_donor}`}
                                            {h.expense_in_kind_notes ? `${h.expense_in_kind_donor ? " – " : ""}${h.expense_in_kind_notes}` : ""}
                                          </p>
                                        )}
                                      </div>
                                    )}
                                    {!expenseUsesInKind && h.expense_source_label && (
                                      <span className="text-slate-500">
                                        {h.expense_source_type === "contribution"
                                          ? (
                                            <>
                                              <span className="font-medium text-slate-700">Contribution:</span> {h.expense_source_label}
                                            </>
                                          )
                                          : h.expense_source_label}
                                      </span>
                                    )}
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}

                      <tr className="bg-slate-50 text-slate-700">
                        <td className="px-5 py-3 text-right font-semibold">Total</td>
                        <td className="px-5 py-3 text-right font-semibold text-blue-700">
                          {formatCurrency(fundComputed.totals.payments)}
                        </td>
                        <td className="px-5 py-3 text-right font-semibold text-purple-700">
                          {formatCurrency(fundComputed.totals.donations)}
                          {fundComputed.totals.inKind > 0 && (
                            <span className="ml-1 text-[11px] text-slate-400">
                              (+ {formatQty(fundComputed.totals.inKind)} in-kind)
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-right font-semibold text-rose-600">
                          {formatCurrency(fundComputed.totals.expenses)}
                        </td>
                        <td className="px-5 py-3 text-right text-slate-600">
                          {formatCurrency(fundComputed.finalFundBefore ?? 0)}
                        </td>
                        <td className="px-5 py-3 text-right text-slate-600">
                          {formatCurrency(fundComputed.finalFundAfter ?? 0)}
                        </td>
                        <td className="px-5 py-3" />
                      </tr>
                    </>
                  ) : (
                    <tr>
                      <td
                        colSpan="7"
                        className="px-5 py-10 text-center text-slate-400"
                      >
                        No fund history recorded.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col items-center gap-2 border-t border-slate-100 px-6 py-4 text-sm text-slate-500">
              <span>
                Showing {summaryText(fundComputed.rows.length, fundPage)}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFundPage((prev) => Math.max(prev - 1, 1))}
                  disabled={fundPage === 1}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ‹
                </button>
                <span className="inline-flex h-9 min-w-[2.5rem] items-center justify-center rounded-full bg-blue-600 px-3 text-sm font-semibold text-white shadow-sm">
                  {fundPage}
                </span>
                <button
                  type="button"
                  onClick={() => setFundPage((prev) => Math.min(prev + 1, fundsPageTotal))}
                  disabled={fundPage === fundsPageTotal}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ›
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Income Statement Tab */}
        {activeTab === "incomeStatement" && (
          <div
            ref={reportRef}
            className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200"
          >
            <div className="flex justify-between items-center px-6 py-4 border-b bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-700">
                Income Statement
              </h2>
              <div ref={toolbarRef} className="flex gap-2">
                <button
                  onClick={handleDownloadPDF}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700"
                >
                  <Download size={16} /> PDF
                </button>
                <button
                  onClick={handleDownloadExcel}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-600 text-white text-sm hover:bg-green-700"
                >
                  <Download size={16} /> Excel
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-600 text-white text-sm hover:bg-gray-700"
                >
                  <Printer size={16} /> Print
                </button>
              </div>
            </div>

            <div className="px-8 py-8">
              {/* Logos row (left and right), same style as Monthly Report */}
              <div className="flex items-center justify-between mb-4">
                <img
                  src="/images/ChatGPT Image Sep 15, 2025, 10_37_25 AM.png"
                  className="h-16 w-16 object-contain"
                />
                <img src="/images/ANCHS.png" className="h-16 w-16 object-contain" />
              </div>

              {/* Branded header */}
              <div className="text-center space-y-1 border-b pb-6 mb-6">
                <h3 className="text-xl font-extrabold text-gray-800">
                  Alubijid National Comprehensive High School, SPTA Inc.
                </h3>
                <p className="text-sm text-gray-600">
                  Barangay Poblacion, Alubijid Misamis Oriental
                </p>
                <h4 className="mt-2 text-lg font-semibold underline">
                  Income Statement
                </h4>
                <p className="text-xs text-gray-500">
                  Generated on {new Date().toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>

              {/* Figures */}
              <table className="w-full text-sm text-gray-700 max-w-xl mx-auto">
                <tbody>
                  <tr>
                    <td className="py-2">Payments (Contributions)</td>
                    <td className="py-2 text-right font-medium text-blue-700">
                      {formatCurrency(totalPayments)}
                    </td>
                  </tr>
                  {hasPaymentBreakdown && (
                    <tr className="bg-blue-50/50">
                      <td colSpan="2" className="px-5 pb-4">
                        <div className="text-xs uppercase tracking-[0.2em] text-blue-500 font-semibold mb-2">
                          Contribution Breakdown
                        </div>
                        <table className="w-full text-sm text-slate-700 border border-blue-100 rounded-xl overflow-hidden">
                          <tbody>
                            {paymentBreakdown.map((item) => (
                              <tr key={item.name} className="bg-white odd:bg-blue-50/30">
                                <td className="px-4 py-2">
                                  <span className="font-medium text-slate-800">{item.name}</span>
                                </td>
                                  <td className="px-4 py-2 text-right font-semibold text-blue-700">
                                    {formatCurrency(item.amount)}
                                  </td>
                                </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td className="py-2">Cash Donations</td>
                    <td className="py-2 text-right font-medium text-purple-700">
                      {formatCurrency(totalCashDonations)}
                    </td>
                  </tr>
                  <tr className="border-t">
                    <td className="py-2 font-semibold">Total Income</td>
                    <td className="py-2 text-right font-semibold">
                      {formatCurrency(totalIncome)}
                    </td>
                  </tr>
                  <tr className="border-t">
                    <td className="py-2 text-red-700">Less: Expenses</td>
                    <td className="py-2 text-right font-medium text-red-700">
                      -{formatCurrency(totalExpenses)}
                    </td>
                  </tr>
                  <tr className="border-t bg-gray-50">
                    <td className="py-2 font-bold">Net Income / Surplus</td>
                    <td
                      className={`py-2 text-right font-bold ${
                        netIncome >= 0 ? "text-green-700" : "text-red-700"
                      }`}
                    >
                      {formatCurrency(netIncome)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

/**
 * Monthly Report (unchanged)
 */
const MonthlyReport = ({ summary, contributions, expenses }) => {
  const beginningBalance = parseFloat(summary.beginningBalance || 0);
  const totalCollections = parseFloat(summary.totalPayments || 0);
  const totalExpenses = parseFloat(summary.totalExpenses || 0);
  const totalDonations = parseFloat(summary.totalDonations || 0);
  const totalBalance =
    beginningBalance + totalCollections + totalDonations - totalExpenses;
  const reportRef = useRef(null);

  const formatCurrency = (val) =>
    `₱${parseFloat(val || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  // PH month name
  const currentDate = new Date();
  const monthName = currentDate.toLocaleString("en-PH", {
    month: "long",
    year: "numeric",
  });

  const exportPDF = async () => {
    const element = reportRef.current;
    const canvas = await html2canvas(element, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save("Monthly_Report.pdf");
  };

  return (
    <>
      <div className="flex justify-end mb-4">
        <button
          onClick={exportPDF}
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm shadow"
        >
          📄 Export to PDF
        </button>
      </div>
      <div
        ref={reportRef}
        className="bg-white rounded-2xl shadow-xl border border-gray-300 p-10 print:p-0"
      >
        <div className="border-b pb-6">
          <div className="flex items-center justify-between mb-4">
            <img
              src="/images/ChatGPT Image Sep 15, 2025, 10_37_25 AM.png"
              className="h-20 w-20 object-contain"
            />
            <img src="/images/ANCHS.png" className="h-20 w-20 object-contain" />
          </div>

          <div className="text-center space-y-2">
            <h2 className="text-2xl font-extrabold uppercase text-gray-800">
              Alubijid National Comprehensive High School, SPTA Inc.
            </h2>
            <p className="text-sm text-gray-600">
              Barangay Poblacion, Alubijid Misamis Oriental | TIN: 009-884-107-000
            </p>
            <h3 className="text-lg font-semibold mt-6 underline text-gray-700">
              Financial Monthly Report
            </h3>
            <p className="text-sm">
              For the Month{" "}
              <strong>
                {monthName} S.Y. {summary.schoolYear || "2025-2026"}
              </strong>
            </p>
            <p className="text-sm">
              Beginning Balance (End of Previous Month):{" "}
              <span className="font-bold text-gray-900">
                {formatCurrency(beginningBalance)}
              </span>
            </p>
          </div>
        </div>

        <div className="mt-8 border rounded-xl overflow-hidden">
          <div className="bg-blue-50 px-6 py-3 border-b">
            <h4 className="font-bold text-gray-800">Voluntary Collection Fee</h4>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="p-3 text-left">Contribution Type</th>
                <th className="p-3 text-right">Amount Collected</th>
              </tr>
            </thead>
            <tbody>
              {contributions.length > 0 ? (
                contributions.map((c, i) => (
                  <tr key={i} className={`${i % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                    <td className="p-3">{c.contribution_type}</td>
                    <td className="p-3 text-right">{formatCurrency(c.totalPaid || 0)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="2" className="p-4 text-center text-gray-500 italic">
                    No contributions recorded for this month.
                  </td>
                </tr>
              )}
              <tr className="font-bold border-t bg-gray-50">
                <td className="p-3 text-right">Total Collection</td>
                <td className="p-3 text-right">{formatCurrency(totalCollections)}</td>
              </tr>
              <tr className="font-bold border-t bg-gray-50">
                <td className="p-3 text-right">Total Donations</td>
                <td className="p-3 text-right">{formatCurrency(totalDonations)}</td>
              </tr>
              <tr className="font-bold">
                <td className="p-3 text-right">TOTAL BALANCE</td>
                <td className="p-3 text-right">
                  {formatCurrency(beginningBalance + totalCollections + totalDonations)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-10 border rounded-xl overflow-hidden">
          <div className="bg-red-50 px-6 py-3 border-b">
            <h4 className="font-bold text-gray-800">Expenses</h4>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="p-3 text-left w-28">Date</th>
                <th className="p-3 text-left">Expenses / Disbursement</th>
                <th className="p-3 text-right w-32">Amount</th>
                <th className="p-3 text-left w-32">Charge</th>
              </tr>
            </thead>
            <tbody>
              {expenses.length > 0 ? (
                expenses.map((e, i) => (
                  <tr key={i} className={`${i % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                    <td className="p-3">
                      {new Date(e.expense_date).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>

                    <td className="p-3">
                      {e.expense_type} {e.description ? `- ${e.description}` : ""}
                    </td>
                    <td className="p-3 text-right">{formatCurrency(e.amount)}</td>
                    <td className="p-3">{e.contribution?.contribution_type || "-"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="p-4 text-center text-gray-500 italic">
                    No expenses recorded for this month.
                  </td>
                </tr>
              )}
              <tr className="font-bold border-t bg-gray-50">
                <td colSpan="2" className="p-3 text-right">
                  Total Expenses
                </td>
                <td className="p-3 text-right">{formatCurrency(totalExpenses)}</td>
                <td></td>
              </tr>
              <tr className="font-bold">
                <td colSpan="2" className="p-3 text-right">
                  Total Fund Balance
                </td>
                <td className="p-3 text-right">{formatCurrency(totalBalance)}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-sm text-gray-700 pt-10 border-t mt-10">
          <div>
            <p className="font-bold underline">NIELSE G. JAMIS</p>
            <p>ANCS-SPTA Treasurer</p>
          </div>
          <div>
            <p className="font-bold underline">ROSELEE NARCS R. FERNANDEZ</p>
            <p>ANCS-SPTA President</p>
          </div>
          <div>
            <p className="font-bold underline">CHRISTOPHER BAYLOCES</p>
            <p>ANCS-SPTA Auditor</p>
          </div>
          <div>
            <p className="font-bold underline">ANTHONY Y. PACMALAN</p>
            <p>Principal II (Adviser)</p>
          </div>
        </div>
      </div>
    </>
  );
};

// Top-level By-Section report component for use in main Report
const SectionReport = ({
  sections = [],
  sectionSummaries = [],
  sectionStudentDetails = {},
  selectedSectionId = null,
}) => {
  const formatCurrency = (value) =>
    new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(parseFloat(value || 0));

  const [activeGrade, setActiveGrade] = useState(null);
  const [sectionQuery, setSectionQuery] = useState("");
  const [localSelected, setLocalSelected] = useState(() =>
    selectedSectionId ? String(selectedSectionId) : ""
  );
  const [breakdownQuery, setBreakdownQuery] = useState("");
  const [expandedStudentRows, setExpandedStudentRows] = useState({});

  useEffect(() => {
    if (!selectedSectionId) return;
    setLocalSelected(String(selectedSectionId));
  }, [selectedSectionId]);

  const gradeTabs = [7, 8, 9, 10, 11, 12];
  const extractGradeNumber = (name) => {
    const m = String(name || "").match(/\d+/);
    return m ? parseInt(m[0], 10) : null;
  };
  const matchesActiveGrade = (gradeName) => {
    if (activeGrade == null) return true;
    return extractGradeNumber(gradeName) === activeGrade;
  };
  const sectionsByGrade = useMemo(
    () => sections.filter((s) => matchesActiveGrade(s.grade_level_name)),
    [sections, activeGrade]
  );
  const summariesByGrade = useMemo(
    () => sectionSummaries.filter((s) => matchesActiveGrade(s.grade_level_name)),
    [sectionSummaries, activeGrade]
  );

  const sectionSummariesMap = useMemo(() => {
    const map = {};
    (sectionSummaries || []).forEach((row) => {
      if (!row?.id) return;
      map[row.id] = row;
    });
    return map;
  }, [sectionSummaries]);

  const normalize = (value) => (value || "").toLowerCase();

  const sectionsFiltered = useMemo(() => {
    const query = sectionQuery.trim().toLowerCase();
    if (!query) return sectionsByGrade;

    return sectionsByGrade.filter((section) => {
      const basic = `${section.grade_level_name || ""} ${section.name || ""}`
        .toLowerCase()
        .includes(query);
      if (basic) return true;

      const details = sectionStudentDetails?.[section.id] || {
        paid: [],
        partial: [],
        unpaid: [],
      };
      const combined = [
        ...(details.paid || []),
        ...(details.partial || []),
        ...(details.unpaid || []),
      ];
      return combined.some((student) =>
        normalize(student.student_name).includes(query)
      );
    });
  }, [sectionQuery, sectionsByGrade, sectionStudentDetails]);

  const summariesFiltered = useMemo(() => {
    const ids = new Set(sectionsFiltered.map((s) => s.id));
    return summariesByGrade.filter((row) => ids.has(row.id));
  }, [sectionsFiltered, summariesByGrade]);

  const breakdownSections = useMemo(() => {
    const query = breakdownQuery.trim().toLowerCase();
    if (!query) return sectionsFiltered;

    return sectionsFiltered.filter((section) => {
      const gradeName = section.grade_level_name || "";
      const sectionName = section.name || "";
      return `${gradeName} ${sectionName}`.toLowerCase().includes(query);
    });
  }, [breakdownQuery, sectionsFiltered]);

  useEffect(() => {
    if (localSelected && sectionsFiltered.some((s) => String(s.id) === localSelected)) {
      return;
    }
    setLocalSelected(sectionsFiltered[0] ? String(sectionsFiltered[0].id) : "");
  }, [sectionsFiltered, localSelected]);

  const currentSection = localSelected;
  const currentDetails = currentSection
    ? sectionStudentDetails?.[currentSection] || { paid: [], partial: [], unpaid: [] }
    : { paid: [], partial: [], unpaid: [] };

  const STATUS_CONFIG = {
    paid: {
      title: "Paid",
      headerClass: "bg-green-50 text-green-700",
      valueClass: "text-green-700",
      emptyText: "No paid students.",
      detailLines: (student) => [
        `Required ${formatCurrency(student.required)}`,
      ],
      valueText: (student) => `Paid ${formatCurrency(student.paid)}`,
    },
    partial: {
      title: "Partial",
      headerClass: "bg-yellow-50 text-yellow-800",
      valueClass: "text-orange-700",
      emptyText: "No partial students.",
      detailLines: (student) => [
        `Required ${formatCurrency(student.required)}`,
        `Paid ${formatCurrency(student.paid)}`,
      ],
      valueText: (student) => `Balance ${formatCurrency(student.balance)}`,
    },
    unpaid: {
      title: "Unpaid",
      headerClass: "bg-red-50 text-red-700",
      valueClass: "text-red-700",
      emptyText: "No unpaid students.",
      detailLines: (student) => [
        `Required ${formatCurrency(student.required)}`,
      ],
      valueText: (student) => `Balance ${formatCurrency(student.balance)}`,
    },
  };

  const ContributionRow = ({ contribution }) => {
    if (!contribution) return null;

    const required = parseFloat(contribution.required ?? 0);
    const paidDisplay = parseFloat(contribution.paid_display ?? contribution.paid ?? 0);
    const paid = parseFloat(contribution.paid ?? 0);
    const balance = parseFloat(contribution.balance ?? 0);
    const hasPaid = paidDisplay > 0;
    const hasBalance = balance > 0;

    return (
      <div className="flex justify-between text-[11px] text-gray-500">
        <span className="truncate max-w-[150px]">{contribution.name}</span>
        <div className="text-right">
          <div>Req {formatCurrency(required)}</div>
          {hasPaid && (
            <div className="text-blue-600">Paid {formatCurrency(paidDisplay)}</div>
          )}
          {!hasPaid && hasBalance && (
            <div className="text-blue-600">No payments yet</div>
          )}
          {hasBalance && (
            <div className="text-orange-600 font-semibold">Bal {formatCurrency(balance)}</div>
          )}
        </div>
      </div>
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleDateString("en-PH", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const getInitials = (name = "") => {
    const parts = String(name).trim().split(/\s+/).slice(0, 2);
    return parts.map((part) => part[0]?.toUpperCase() || "").join("");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveGrade(null)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
            activeGrade == null ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          All Grades
        </button>
        {gradeTabs.map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => setActiveGrade(g)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
              activeGrade === g ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            {`Grade ${g}`}
          </button>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Search section / student</label>
          <input
            type="text"
            value={sectionQuery}
            onChange={(e) => setSectionQuery(e.target.value)}
            placeholder="Type section or student name..."
            className="mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 w-full"
          />
        </div>
        <div className="w-full sm:w-56">
          <label className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Section</label>
          <select
            value={currentSection}
            onChange={(e) => setLocalSelected(e.target.value)}
            className="mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 w-full"
          >
            <option value="">All sections</option>
            {sectionsFiltered.map((s) => (
              <option key={s.id} value={String(s.id)}>
                {s.grade_level_name ? `${s.grade_level_name} - ` : ""}
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <h2 className="text-lg font-semibold text-gray-700 px-6 py-4 border-b bg-gray-50">Sections Summary</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-gray-700">
            <thead className="bg-gray-100 text-gray-600 text-xs uppercase">
              <tr>
                <th className="px-5 py-3 text-left">Grade</th>
                <th className="px-5 py-3 text-left">Section</th>
                <th className="px-5 py-3 text-right">Students</th>
                <th className="px-5 py-3 text-right">Paid</th>
                <th className="px-5 py-3 text-right">Unpaid</th>
                <th className="px-5 py-3 text-right">Carry Over</th>
                <th className="px-5 py-3 text-right">Required</th>
                <th className="px-5 py-3 text-right">Collected</th>
                <th className="px-5 py-3 text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              {summariesFiltered.length > 0 ? (
                summariesFiltered.map((row) => (
                  <tr
                    key={row.id}
                    className={`hover:bg-blue-50/50 odd:bg-gray-50/40 cursor-pointer ${currentSection === String(row.id) ? "bg-blue-50" : ""}`}
                    onClick={() => setLocalSelected(String(row.id))}
                  >
                    <td className="px-5 py-3">{row.grade_level_name || "-"}</td>
                    <td className="px-5 py-3">{row.name}</td>
                    <td className="px-5 py-3 text-right">{row.total_students}</td>
                    <td className="px-5 py-3 text-right text-green-700 font-medium">{row.paid_students}</td>
                    <td className="px-5 py-3 text-right text-red-700 font-medium">{row.unpaid_students}</td>
                    <td className="px-5 py-3 text-right">{formatCurrency(row.carry_over_total || 0)}</td>
                    <td className="px-5 py-3 text-right">{formatCurrency(row.total_required)}</td>
                    <td className="px-5 py-3 text-right text-blue-700 font-medium">{formatCurrency(row.total_paid)}</td>
                    <td className="px-5 py-3 text-right text-orange-700 font-semibold">{formatCurrency(row.total_balance)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" className="px-5 py-6 text-center text-gray-400">No sections found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="flex flex-col gap-4 border-b bg-gray-50 px-6 py-4 md:flex-row md:items-center md:justify-between">
          <h2 className="text-lg font-semibold text-gray-700">Grade &amp; Section Breakdown</h2>
          <div className="w-full md:w-72">
            <label className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Search grade / section</label>
            <input
              type="text"
              value={breakdownQuery}
              onChange={(e) => setBreakdownQuery(e.target.value)}
              placeholder="Type grade or section name..."
              className="mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 w-full"
            />
          </div>
        </div>
        {breakdownSections.length > 0 ? (
          <div className="divide-y">
            {breakdownSections.map((section) => {
              const summary = sectionSummariesMap[section.id] || {};
              const details = sectionStudentDetails?.[section.id] || {
                paid: [],
                partial: [],
                unpaid: [],
              };
              const paidCount = summary?.paid_students ?? (details.paid?.length || 0);
              const partialCount = details.partial?.length || 0;
              const unpaidCount = summary?.unpaid_students ?? (details.unpaid?.length || 0);
              const totalStudents = summary?.total_students ?? paidCount + partialCount + unpaidCount;
              const totalRequired = summary?.total_required ?? 0;
              const totalPaidAmount = summary?.total_paid ?? 0;
              const totalBalance = summary?.total_balance ?? Math.max(0, totalRequired - totalPaidAmount);
              const carryOverTotal = summary?.carry_over_total ?? 0;

              const stats = [
                { label: "Students", value: totalStudents },
                { label: "Paid", value: paidCount, accent: "text-green-700" },
                { label: "Partial", value: partialCount, accent: "text-yellow-700" },
                { label: "Unpaid", value: unpaidCount, accent: "text-red-700" },
                { label: "Carry Over", value: formatCurrency(carryOverTotal), accent: "text-slate-700" },
                { label: "Required", value: formatCurrency(totalRequired) },
                { label: "Collected", value: formatCurrency(totalPaidAmount), accent: "text-blue-700" },
                { label: "Balance", value: formatCurrency(totalBalance), accent: "text-orange-700" },
              ];

              const combinedStudents = [
                ...(details.paid || []).map((student) => ({ ...student, status: "paid" })),
                ...(details.partial || []).map((student) => ({ ...student, status: "partial" })),
                ...(details.unpaid || []).map((student) => ({ ...student, status: "unpaid" })),
              ].sort((a, b) => (a.student_name || "").localeCompare(b.student_name || ""));

              const statusBadge = {
                paid: "bg-emerald-50 text-emerald-700",
                partial: "bg-amber-50 text-amber-700",
                unpaid: "bg-rose-50 text-rose-700",
              };

              const statusLabel = {
                paid: "Paid",
                partial: "Partial",
                unpaid: "Unpaid",
              };

              return (
                <div
                  key={section.id}
                  className={`p-6 space-y-4 transition cursor-pointer ${currentSection === String(section.id) ? "bg-blue-50/40" : "bg-white"}`}
                  onClick={() => setLocalSelected(String(section.id))}
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-500">{section.grade_level_name || "No grade"}</p>
                      <h3 className="text-xl font-semibold text-gray-800">{section.name}</h3>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm">
                      {stats.map((stat, idx) => (
                        <div key={idx} className="min-w-[80px]">
                          <p className="text-[11px] uppercase tracking-wide text-gray-500">{stat.label}</p>
                          <p className={`text-base font-semibold ${stat.accent || "text-gray-800"}`}>{stat.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-100 overflow-hidden">
                    <table className="w-full text-sm text-slate-700">
                      <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-6 py-3 text-left">Student</th>
                          <th className="px-6 py-3 text-left">Section</th>
                          <th className="px-6 py-3 text-right">Total Paid</th>
                          <th className="px-6 py-3 text-right">Balance Before</th>
                          <th className="px-6 py-3 text-right">Balance After</th>
                          <th className="px-6 py-3 text-right">Last Payment Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {combinedStudents.length > 0 ? (
                          combinedStudents.map((student, idx) => {
                            const baseContributions = Array.isArray(student.paid_contributions) && student.paid_contributions.length > 0
                              ? student.paid_contributions
                              : student.contributions;
                            const contributions = Array.isArray(baseContributions)
                              ? baseContributions.filter((c) => {
                                  const paidDisplay = parseFloat(c.paid_display ?? c.paid ?? 0);
                                  return paidDisplay > 0;
                                })
                              : [];
                            const carryOver = student.previous_school_year?.carry_over ?? student.previous_balance ?? 0;
                            const currentRequired = student.current_school_year?.required ?? student.required ?? 0;
                            const currentPaid = student.current_school_year?.paid ?? student.paid ?? 0;
                            const currentBalance = student.current_school_year?.balance ?? student.balance ?? 0;
                            const balanceBefore = carryOver + currentRequired;
                            const balanceAfter = carryOver + currentBalance;
                            const key = `${section.id}-${student.student_id ?? idx}`;
                            const isExpanded = !!expandedStudentRows[key];

                            const toggleRow = () => {
                              setExpandedStudentRows((prev) => ({
                                ...prev,
                                [key]: !prev[key],
                              }));
                            };

                            return (
                              <React.Fragment key={key}>
                                <tr
                                  className={`transition ${idx % 2 === 0 ? "bg-white" : "bg-slate-50"} hover:bg-blue-50/60 cursor-pointer`}
                                  onClick={toggleRow}
                                >
                                  <td className="px-6 py-3">
                                    <div className="flex items-center gap-3">
                                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-sm font-semibold">
                                        {getInitials(student.student_name)}
                                      </span>
                                      <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                          <span className="font-semibold text-slate-800">{student.student_name || "Unnamed"}</span>
                                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${statusBadge[student.status] || "bg-slate-100 text-slate-600"}`}>
                                            {statusLabel[student.status] || "N/A"}
                                          </span>
                                        </div>
                                        <p className="text-xs text-slate-500">ID #{student.student_id}</p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-3">{student.section_name || section.name}</td>
                                  <td className="px-6 py-3 text-right font-semibold text-emerald-600">{formatCurrency(currentPaid)}</td>
                                  <td className="px-6 py-3 text-right">{formatCurrency(balanceBefore)}</td>
                                  <td className="px-6 py-3 text-right">
                                    <span
                                      className={`inline-flex min-w-[90px] items-center justify-end rounded-full px-3 py-1 text-xs font-semibold ${
                                        balanceAfter > 0 ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"
                                      }`}
                                    >
                                      {formatCurrency(balanceAfter)}
                                    </span>
                                  </td>
                                  <td className="px-6 py-3 text-right text-slate-600 flex items-center justify-end gap-2">
                                    <span>{formatDate(student.last_payment_date)}</span>
                                    <span className="text-xs text-blue-500">{isExpanded ? "▲" : "▼"}</span>
                                  </td>
                                </tr>
                                {isExpanded && (
                                  <tr className="bg-white/70">
                                    <td colSpan="6" className="px-6 pb-6">
                                      <div className="pt-4 space-y-4">
                                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                                            <p className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">Previous School Year</p>
                                            <p className="text-sm font-semibold text-slate-700 mt-1">{student.previous_school_year?.name || "—"}</p>
                                            <p className="text-xs text-slate-500">Carry Over</p>
                                            <p className="text-lg font-bold text-rose-600">{formatCurrency(carryOver)}</p>
                                          </div>
                                          <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                                            <p className="text-[11px] uppercase tracking-wide text-blue-600 font-semibold">Current School Year</p>
                                            <p className="text-sm font-semibold text-slate-700 mt-1">{student.current_school_year?.name || "—"}</p>
                                            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                                              <div className="rounded-xl bg-white border border-slate-100 p-2">
                                                <p className="uppercase text-[10px] text-slate-400">Required</p>
                                                <p className="font-semibold text-slate-700">{formatCurrency(currentRequired)}</p>
                                              </div>
                                              <div className="rounded-xl bg-white border border-slate-100 p-2">
                                                <p className="uppercase text-[10px] text-slate-400">Paid</p>
                                                <p className="font-semibold text-emerald-600">{formatCurrency(currentPaid)}</p>
                                              </div>
                                              <div className="rounded-xl bg-white border border-slate-100 p-2">
                                                <p className="uppercase text-[10px] text-slate-400">Balance</p>
                                                <p className="font-semibold text-orange-600">{formatCurrency(currentBalance)}</p>
                                              </div>
                                            </div>
                                          </div>
                                          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
                                            <p className="text-[11px] uppercase tracking-wide text-emerald-600 font-semibold">Status &amp; Timeline</p>
                                            <p className="text-xs text-slate-500 mt-1">Last Payment</p>
                                            <p className="text-lg font-semibold text-slate-800">{formatDate(student.last_payment_date)}</p>
                                            <p className="text-xs text-slate-500 mt-3">Balance After</p>
                                            <p className={`text-lg font-bold ${balanceAfter > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                                              {formatCurrency(balanceAfter)}
                                            </p>
                                          </div>
                                        </div>

                                        <div className="rounded-2xl border border-slate-100 bg-white p-4">
                                          <div className="flex items-center justify-between">
                                            <p className="text-sm font-semibold text-slate-700">Contribution Breakdown</p>
                                            <p className="text-xs text-slate-400">{contributions.length} item{contributions.length === 1 ? "" : "s"}</p>
                                          </div>
                                          <div className="mt-3 space-y-2">
                                            {contributions.length > 0 ? (
                                              contributions.map((contribution) => (
                                                <ContributionRow
                                                  key={`${student.student_id}-${contribution.id}`}
                                                  contribution={contribution}
                                                />
                                              ))
                                            ) : (
                                              <p className="text-xs text-slate-400 text-center">No contribution records.</p>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan="6" className="px-6 py-6 text-center text-slate-400 text-sm">
                              No students found for this section.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-6 text-center text-gray-500">No sections match the current grade/search filters.</div>
        )}
      </div>
    </div>
  );
};

/**
 * Main Report
 * Adds date range filter and passes filtered data into DetailedReport.
 */
export default function Report() {
  const {
    donations = [],
    payments = [],
    fundsHistories = [],
    totals = {},
    summary = {},
    contributions = [],
    expenses = [],
    sections = [],
    sectionSummaries = [],
    sectionStudentDetails = {},
    selectedSectionId = null,
  } = usePage().props;

  const [activeReport, setActiveReport] = useState(() => (selectedSectionId ? "bySection" : "detailed"));
  const [filterType, setFilterType] = useState("month");
  const [reportMonth, setReportMonth] = useState(() => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    return `${now.getFullYear()}-${month}`;
  });
  const [reportYear, setReportYear] = useState(() => String(new Date().getFullYear()));
  const [reportStart, setReportStart] = useState("");
  const [reportEnd, setReportEnd] = useState("");

  const clearReportFilters = () => {
    const now = new Date();
    setFilterType("month");
    setReportYear(String(now.getFullYear()));
    setReportMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
    setReportStart("");
    setReportEnd("");
  };

  const applyReportFilter = useCallback(
    (dateStr) => {
      if (!dateStr) return false;
      const date = new Date(dateStr);
      if (Number.isNaN(date.getTime())) return false;

      switch (filterType) {
        case "year":
          return date.getFullYear().toString() === reportYear;
        case "dateRange": {
          if (!reportStart && !reportEnd) return true;
          const start = reportStart ? new Date(reportStart) : null;
          const end = reportEnd ? new Date(reportEnd) : null;
          if (start && date < start) return false;
          if (end) {
            end.setHours(23, 59, 59, 999);
            if (date > end) return false;
          }
          return true;
        }
        case "month":
        default: {
          if (!reportMonth) return true;
          const [year, month] = reportMonth.split("-").map(Number);
          return (
            date.getFullYear() === year && date.getMonth() + 1 === month
          );
        }
      }
    },
    [filterType, reportEnd, reportMonth, reportStart, reportYear]
  );

  const paymentsFiltered = useMemo(
    () => payments.filter((p) => applyReportFilter(p.payment_date)),
    [payments, applyReportFilter]
  );
  const donationsFiltered = useMemo(
    () => donations.filter((d) => applyReportFilter(d.donation_date)),
    [donations, applyReportFilter]
  );
  const fundsHistoriesFiltered = useMemo(
    () => fundsHistories.filter((f) => applyReportFilter(f.fund_date)),
    [fundsHistories, applyReportFilter]
  );

  const totalsFiltered = useMemo(() => {
    const paymentsTotal = paymentsFiltered.reduce(
      (sum, p) => sum + parseFloat(p.amount_paid || 0),
      0
    );
    const donationsCash = donationsFiltered
      .filter((d) => d.donation_type !== "in-kind")
      .reduce((sum, d) => sum + parseFloat(d.donation_amount || 0), 0);
    const donationsInKind = donationsFiltered
      .filter((d) => d.donation_type === "in-kind")
      .reduce((sum, d) => sum + parseFloat(d.donation_amount || 0), 0);
    const expensesTotal = fundsHistoriesFiltered
      .filter((f) => !f.payment_id && !f.donation_id)
      .reduce((sum, f) => sum + parseFloat(f.amount || 0), 0);

    return {
      payments: paymentsTotal,
      donations: donationsCash,
      inKind: donationsInKind,
      expenses: expensesTotal,
      available: paymentsTotal + donationsCash - expensesTotal,
    };
  }, [paymentsFiltered, donationsFiltered, fundsHistoriesFiltered]);

  return (
    <TreasurerLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="space-y-1">
              <h1 className="text-3xl font-extrabold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
               Treasurer’s Financial Reports
            </h1>
          </div>
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="inline-flex flex-wrap gap-2 rounded-full border border-slate-200 bg-white/70 p-1">
            <button
              onClick={() => setActiveReport("detailed")}
              className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                activeReport === "detailed"
                  ? "bg-blue-600 text-white shadow"
                  : "text-slate-500 hover:text-blue-600"
              }`}
            >
              <FileText size={16} /> Overall Reports
            </button>
            <button
              onClick={() => setActiveReport("monthly")}
              className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                activeReport === "monthly"
                  ? "bg-blue-600 text-white shadow"
                  : "text-slate-500 hover:text-blue-600"
              }`}
            >
              <CalendarDays size={16} /> Monthly Report
            </button>
            <button
              onClick={() => setActiveReport("bySection")}
              className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                activeReport === "bySection"
                  ? "bg-blue-600 text-white shadow"
                  : "text-slate-500 hover:text-blue-600"
              }`}
            >
              <Folder size={16} /> By Section
            </button>
          </div>

          {activeReport === "detailed" && (
            <div className="flex flex-wrap items-center gap-4 text-sm lg:pr-8">
              <div className="flex flex-col">
                <label className="text-[11px] uppercase tracking-[0.2em] text-slate-500 font-semibold">Filter type</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <option value="month">By Month</option>
                  <option value="dateRange">By Date Range</option>
                  <option value="year">By Year</option>
                </select>
              </div>

              {filterType === "month" && (
                <div className="flex flex-col">
                  <label className="text-[11px] uppercase tracking-[0.2em] text-slate-500 font-semibold">Month</label>
                  <input
                    type="month"
                    value={reportMonth}
                    onChange={(e) => setReportMonth(e.target.value)}
                    className="mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm"
                  />
                </div>
              )}

              {filterType === "year" && (
                <div className="flex flex-col">
                  <label className="text-[11px] uppercase tracking-[0.2em] text-slate-500 font-semibold">Year</label>
                  <input
                    type="number"
                    min="2000"
                    max="2100"
                    value={reportYear}
                    onChange={(e) => setReportYear(e.target.value)}
                    className="mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm"
                  />
                </div>
              )}

              {filterType === "dateRange" && (
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex flex-col">
                    <label className="text-[11px] uppercase tracking-[0.2em] text-slate-500 font-semibold">Start date</label>
                    <input
                      type="date"
                      value={reportStart}
                      onChange={(e) => setReportStart(e.target.value)}
                      className="mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-[11px] uppercase tracking-[0.2em] text-slate-500 font-semibold">End date</label>
                    <input
                      type="date"
                      value={reportEnd}
                      onChange={(e) => setReportEnd(e.target.value)}
                      className="mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-col justify-end">
                <span className="text-[11px] uppercase tracking-[0.2em] text-slate-500 font-semibold">Actions</span>
                <div className="mt-1 flex flex-wrap items-center gap-3">
                  <button
                    onClick={clearReportFilters}
                    className="h-10 px-4 rounded-2xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div>
          {activeReport === "detailed" ? (
            <DetailedReport
              donations={donationsFiltered}
              payments={paymentsFiltered}
              fundsHistories={fundsHistoriesFiltered}
            />
          ) : activeReport === "monthly" ? (
            <MonthlyReport
              summary={summary}
              contributions={contributions}
              expenses={expenses}
            />
          ) : (
            <SectionReport
              sections={sections}
              sectionSummaries={sectionSummaries}
              sectionStudentDetails={sectionStudentDetails}
              selectedSectionId={selectedSectionId}
            />
          )}
        </div>
      </div>
    </TreasurerLayout>
  );
}