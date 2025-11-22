const monthLabel = (k) => {
  if (!k) return "";
  const [y, m] = String(k).split("-");
  try {
    const dt = new Date(Number(y), Number(m) - 1, 1);
    return dt.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  } catch { return k; }
};

const gradeOrderValue = (grade = "") => {
  const match = String(grade).match(/\d+/);
  return match ? parseInt(match[0], 10) : Number.MAX_SAFE_INTEGER;
};

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Gift, PiggyBank, Receipt, Search, Users, Wallet } from "lucide-react";
import AdminLayout from "@/Layouts/AdminLayout";
import { usePage } from "@inertiajs/react";

export default function Reports() {
  const {
    payments = { data: [] },
    donations = { data: [] },
    expenses = { data: [] },
    fundsHistories = [],
    totals = {},
    financial = {},
  } = usePage().props || {};

  const formatCurrency = (n) =>
    typeof n === "number" && !isNaN(n) ? `₱${n.toFixed(2)}` : "₱0.00";

  const formatQty = (value) => {
    const num = Number(value ?? 0);
    if (Number.isNaN(num)) return "0";
    const options = Number.isInteger(num)
      ? { minimumFractionDigits: 0, maximumFractionDigits: 0 }
      : { minimumFractionDigits: 0, maximumFractionDigits: 2 };
    return num.toLocaleString("en-PH", options);
  };
  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "-";
  const formatDateLong = (d) => {
    if (!d) return "-";
    const parsed = new Date(d);
    if (Number.isNaN(parsed.valueOf())) return "-";
    try {
      return parsed.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    } catch (err) {
      return "-";
    }
  };
  const formatDateTime = (d) => {
    if (!d) return "-";
    try {
      return new Date(d).toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch (err) {
      return d;
    }
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

  const exportCSV = (rows, headers, filename) => {
    const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => JSON.stringify(r[h] ?? "")).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const ITEMS_PER_PAGE = 10;
  const DETAIL_PAGE_SIZE = 10;

  const getDetailPagination = (rows = [], rawPage = 1) => {
    const totalPages = Math.max(1, Math.ceil((rows.length || 0) / DETAIL_PAGE_SIZE));
    const page = Math.min(Math.max(rawPage || 1, 1), totalPages);
    const start = (page - 1) * DETAIL_PAGE_SIZE;
    const paginated = rows.slice(start, start + DETAIL_PAGE_SIZE);
    const startIndex = rows.length ? start + 1 : 0;
    const endIndex = rows.length ? Math.min(start + paginated.length, rows.length) : 0;
    return {
      page,
      totalPages,
      paginated,
      startIndex,
      endIndex,
    };
  };

  const buildPaginationRange = (totalPages, currentPage) => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, idx) => idx + 1);
    }

    const range = [];
    const delta = 1;
    const left = Math.max(2, currentPage - delta);
    const right = Math.min(totalPages - 1, currentPage + delta);

    range.push(1);

    if (left > 2) {
      range.push("ellipsis-left");
    }

    for (let page = left; page <= right; page += 1) {
      range.push(page);
    }

    if (right < totalPages - 1) {
      range.push("ellipsis-right");
    }

    range.push(totalPages);
    return range;
  };

  const normalizeSearchValue = (value) => String(value ?? "").toLowerCase();

  const useSearchPagination = (data, searchTerm, getFields, deps = []) => {
    const [page, setPage] = useState(1);

    useEffect(() => {
      setPage(1);
    }, [searchTerm, ...deps]);

    const searched = useMemo(() => {
      const term = searchTerm.trim().toLowerCase();
      if (!term) return data;
      return data.filter((item) => {
        const fields = getFields(item) || [];
        return fields.some((field) => normalizeSearchValue(field).includes(term));
      });
    }, [data, searchTerm, getFields]);

    const total = searched.length;
    const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));

    useEffect(() => {
      if (page > totalPages) {
        setPage(totalPages);
      }
    }, [page, totalPages]);

    const paginated = useMemo(() => {
      const start = (page - 1) * ITEMS_PER_PAGE;
      return searched.slice(start, start + ITEMS_PER_PAGE);
    }, [searched, page]);

    const startIndex = total ? (page - 1) * ITEMS_PER_PAGE + 1 : 0;
    const endIndex = total ? Math.min(startIndex + paginated.length - 1, total) : 0;

    return {
      page,
      setPage,
      paginated,
      total,
      totalPages,
      startIndex,
      endIndex,
      searched,
    };
  };

  const PaginationControls = ({ currentPage, totalPages, onPageChange }) => {
    const range = buildPaginationRange(totalPages, currentPage);

    return (
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="w-9 h-9 flex items-center justify-center rounded-md border border-gray-200 text-gray-500 bg-white hover:bg-gray-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={16} aria-hidden />
          <span className="sr-only">Previous page</span>
        </button>
        <div className="flex items-center gap-1">
          {range.map((entry, idx) => {
            if (typeof entry === "string") {
              return (
                <span key={`${entry}-${idx}`} className="w-9 h-9 flex items-center justify-center text-sm rounded-md text-gray-400">
                  …
                </span>
              );
            }
            const isActive = entry === currentPage;
            return (
              <button
                key={entry}
                onClick={() => onPageChange(entry)}
                className={`w-9 h-9 flex items-center justify-center text-sm font-medium rounded-md border transition ${isActive
                  ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                  : "bg-white text-blue-500 border-blue-200 hover:bg-blue-50"
                  }`}
              >
                {entry}
              </button>
            );
          })}
        </div>
        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="w-9 h-9 flex items-center justify-center rounded-md border border-gray-200 text-gray-500 bg-white hover:bg-gray-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronRight size={16} aria-hidden />
          <span className="sr-only">Next page</span>
        </button>
      </div>
    );
  };

  const MinimalPager = ({ currentPage, totalPages, onPageChange }) => (
    <div className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="w-8 h-8 rounded-full border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 transition disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
        aria-label="Previous page"
      >
        <ChevronLeft size={16} />
      </button>
      <span className="w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-semibold flex items-center justify-center">
        {currentPage}
      </span>
      <button
        type="button"
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="w-8 h-8 rounded-full border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 transition disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
        aria-label="Next page"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );

  const CanvasBar = ({ data, valueKey, labelKey, color = "#2563eb", height = 220 }) => {
    const canvasRef = useRef(null);
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      // padding
      const pad = { l: 40, r: 10, t: 10, b: 40 };
      const plotW = W - pad.l - pad.r;
      const plotH = H - pad.t - pad.b;
      // axis
      ctx.strokeStyle = "#e5e7eb";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pad.l, pad.t);
      ctx.lineTo(pad.l, pad.t + plotH);
      ctx.lineTo(pad.l + plotW, pad.t + plotH);
      ctx.stroke();
      const values = data.map((d) => Number(d[valueKey] || 0));
      const labels = data.map((d) => String(d[labelKey] || ""));
      const max = Math.max(1, ...values);
      const n = data.length || 1;
      const barW = Math.max(12, plotW / Math.max(n * 1.5, 1));
      const gap = (plotW - barW * n) / Math.max(n + 1, 1);
      ctx.fillStyle = color;
      values.forEach((v, i) => {
        const x = pad.l + gap * (i + 1) + barW * i;
        const h = (v / max) * plotH;
        const y = pad.t + plotH - h;
        ctx.fillRect(x, y, barW, h);
        // label
        ctx.fillStyle = "#6b7280";
        ctx.font = "10px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(labels[i].length > 8 ? labels[i].slice(0, 8) + "…" : labels[i], x + barW / 2, pad.t + plotH + 12);
        ctx.fillStyle = color;
      });
      // y ticks
      ctx.fillStyle = "#6b7280";
      ctx.textAlign = "right";
      ctx.font = "10px sans-serif";
      for (let t = 0; t <= 4; t++) {
        const ty = pad.t + plotH - (t / 4) * plotH;
        const tv = Math.round((t / 4) * max);
        ctx.fillText(tv.toString(), pad.l - 6, ty + 3);
      }
    }, [data, valueKey, labelKey, color]);
    return <canvas ref={canvasRef} className="w-full bg-white rounded border border-gray-100" height={height} width={640} />;
  };

  const CanvasLine = ({ points, color = "#16a34a", height = 220 }) => {
    const canvasRef = useRef(null);
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      const pad = { l: 40, r: 10, t: 10, b: 30 };
      const plotW = W - pad.l - pad.r;
      const plotH = H - pad.t - pad.b;
      // axis
      ctx.strokeStyle = "#e5e7eb";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pad.l, pad.t);
      ctx.lineTo(pad.l, pad.t + plotH);
      ctx.lineTo(pad.l + plotW, pad.t + plotH);
      ctx.stroke();
      if (!points || points.length === 0) return;
      const ys = points.map((p) => Number(p.y || 0));
      const xs = points.map((p) => String(p.x || ""));
      const max = Math.max(1, ...ys);
      const n = points.length;
      const stepX = n > 1 ? plotW / (n - 1) : 0;
      // grid + labels
      ctx.fillStyle = "#6b7280";
      ctx.font = "10px sans-serif";
      ctx.textAlign = "center";
      xs.forEach((lbl, i) => {
        const x = pad.l + (n > 1 ? i * stepX : plotW / 2);
        ctx.fillText(lbl.length > 8 ? lbl.slice(0, 8) + "…" : lbl, x, pad.t + plotH + 12);
      });
      // line
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const x = pad.l + (n > 1 ? i * stepX : plotW / 2);
        const y = pad.t + plotH - (ys[i] / max) * plotH;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      // points (ensure visible when single)
      ctx.fillStyle = color;
      for (let i = 0; i < n; i++) {
        const x = pad.l + (n > 1 ? i * stepX : plotW / 2);
        const y = pad.t + plotH - (ys[i] / max) * plotH;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      // y ticks
      ctx.fillStyle = "#6b7280";
      ctx.textAlign = "right";
      for (let t = 0; t <= 4; t++) {
        const ty = pad.t + plotH - (t / 4) * plotH;
        const tv = Math.round((t / 4) * max);
        ctx.fillText(tv.toString(), pad.l - 6, ty + 3);
      }
    }, [points, color]);
    return <canvas ref={canvasRef} className="w-full bg-white rounded border border-gray-100" height={height} width={640} />;
  };

  const monthKey = (d) => {
    if (!d) return "";
    const dt = new Date(d);
    const m = String(dt.getMonth() + 1).padStart(2, "0");
    return `${dt.getFullYear()}-${m}`;
  };
  const yearKey = (d) => {
    if (!d) return "";
    const dt = new Date(d);
    return String(dt.getFullYear());
  };

  const paymentsList = payments?.data || [];
  const donationsList = donations?.data || [];
  const expensesList = expenses?.data || [];
  const cashDonationsList = donationsList.filter((d) => (d.type || d.donation_type) !== "in-kind");

  const monthlyMap = {};
  paymentsList.forEach((p) => {
    const k = monthKey(p.date || p.payment_date);
    if (!k) return;
    monthlyMap[k] = monthlyMap[k] || { income: 0, expenses: 0 };
    monthlyMap[k].income += Number(p.amount ?? (p.amount_paid || 0)) || 0;
  });
  cashDonationsList.forEach((d) => {
    const k = monthKey(d.date || d.donation_date);
    if (!k) return;
    monthlyMap[k] = monthlyMap[k] || { income: 0, expenses: 0 };
    monthlyMap[k].income += Number(d.amount ?? (d.donation_amount || 0)) || 0;
  });
  expensesList.forEach((e) => {
    const k = monthKey(e.date || e.expense_date);
    if (!k) return;
    monthlyMap[k] = monthlyMap[k] || { income: 0, expenses: 0 };
    monthlyMap[k].expenses += Number(e.amount || 0) || 0;
  });
  const monthlyRows = Object.keys(monthlyMap)
    .sort()
    .map((k) => ({ month: k, income: monthlyMap[k].income, expenses: monthlyMap[k].expenses, net: monthlyMap[k].income - monthlyMap[k].expenses }));

  const monthlyDetails = useMemo(() => {
    const map = {};
    const ensureMonth = (key) => {
      if (!key) return null;
      if (!map[key]) {
        map[key] = {
          payments: [],
          cashDonations: [],
          inKindDonations: [],
          expenses: [],
        };
      }
      return map[key];
    };

    paymentsList.forEach((p) => {
      const key = monthKey(p.date || p.payment_date || p.created_at);
      const bucket = ensureMonth(key);
      if (!bucket) return;
      const timestamp = p.date || p.payment_date || p.updated_at || p.created_at;
      bucket.payments.push({
        student: p.student_name || p.student?.name || "—",
        contribution: p.contribution_name || p.contribution?.contribution_type || "—",
        amount: Number(p.amount ?? (p.amount_paid || 0)) || 0,
        timestamp,
      });
    });

    donationsList.forEach((d) => {
      const key = monthKey(d.date || d.donation_date || d.created_at);
      const bucket = ensureMonth(key);
      if (!bucket) return;
      const timestamp = d.date || d.donation_date || d.updated_at || d.created_at;
      const entry = {
        donor: d.donated_by || d.donor_name || "—",
        details: d.details || d.donation_description || "—",
        amount: Number(d.amount ?? d.donation_amount ?? 0) || 0,
        timestamp,
        type: (d.type || d.donation_type || "cash").toLowerCase(),
      };
      if (entry.type === "in-kind") {
        bucket.inKindDonations.push(entry);
      } else {
        bucket.cashDonations.push(entry);
      }
    });

    expensesList.forEach((e) => {
      const key = monthKey(e.date || e.expense_date || e.created_at);
      const bucket = ensureMonth(key);
      if (!bucket) return;
      const timestamp = e.date || e.expense_date || e.updated_at || e.created_at;
      bucket.expenses.push({
        type: e.expense_type || "—",
        contribution: e.contribution?.contribution_type || "—",
        description: e.description || "—",
        amount: Number(e.amount || 0) || 0,
        timestamp,
      });
    });

    return map;
  }, [paymentsList, donationsList, expensesList]);

  const activeMonthMetrics = useMemo(() => {
    if (!monthlyRows.length) {
      return { key: null, label: "", donors: 0, donationTotal: 0, inKindTotal: 0, net: 0, income: 0, expenses: 0 };
    }
    const key = monthlyRows[monthlyRows.length - 1].month;
    const label = monthLabel(key);
    const monthRow = monthlyRows.find((row) => row.month === key) || null;
    const donationsForMonth = donationsList.filter(
      (d) => monthKey(d.date || d.donation_date) === key
    );
    const donorSet = new Set(
      donationsForMonth
        .map((d) => d.donated_by || d.donor_name || d.donor || d.id)
        .filter(Boolean)
    );
    const donationTotal = donationsForMonth.reduce(
      (sum, d) => sum + (Number(d.amount ?? d.donation_amount ?? 0) || 0),
      0
    );
    const inKindTotal = donationsForMonth.reduce(
      (sum, d) =>
        (d.type || d.donation_type) === "in-kind"
          ? sum + (Number(d.amount ?? d.donation_amount ?? 0) || 0)
          : sum,
      0
    );
    return {
      key,
      label,
      donors: donorSet.size,
      donationTotal,
      inKindTotal,
      net: monthRow ? monthRow.net : 0,
      income: monthRow ? monthRow.income : 0,
      expenses: monthRow ? monthRow.expenses : 0,
    };
  }, [monthlyRows, donationsList]);

  const overallEndingBalance = Number(financial?.totalFundsAvailable ?? totals?.available ?? 0);

  const monthlySummaryCards = useMemo(() => {
    const hasActiveMonth = Boolean(activeMonthMetrics.key);
    const monthDescriptor = hasActiveMonth ? activeMonthMetrics.label : "Awaiting monthly data";

    return [
      {
        key: "donors",
        label: "Total Donors",
        value: hasActiveMonth ? formatQty(activeMonthMetrics.donors) : "—",
        description: hasActiveMonth ? activeMonthMetrics.label : monthDescriptor,
      },
      {
        key: "monetary",
        label: "Total Monetary Contributions Received",
        value: hasActiveMonth ? formatCurrency(Number(activeMonthMetrics.income || 0)) : "—",
        description: hasActiveMonth ? `Collected in ${activeMonthMetrics.label}` : monthDescriptor,
      },
      {
        key: "inkind",
        label: "Total In-Kind Donations (Estimated Value)",
        value: hasActiveMonth ? formatCurrency(Number(activeMonthMetrics.inKindTotal || 0)) : "—",
        description: hasActiveMonth ? `In-kind support for ${activeMonthMetrics.label}` : monthDescriptor,
      },
      {
        key: "expenses",
        label: "Total Expenses",
        value: hasActiveMonth ? formatCurrency(Number(activeMonthMetrics.expenses || 0)) : "—",
        description: hasActiveMonth ? `Spent in ${activeMonthMetrics.label}` : monthDescriptor,
      },
      {
        key: "net",
        label: "Total Monthly Net (Income – Expenses)",
        value: hasActiveMonth ? formatCurrency(Number(activeMonthMetrics.net || 0)) : "—",
        description: hasActiveMonth ? `Net result for ${activeMonthMetrics.label}` : monthDescriptor,
      },
      {
        key: "ending",
        label: "Ending Balance",
        value: formatCurrency(overallEndingBalance),
        description: hasActiveMonth ? `After ${activeMonthMetrics.label}` : "Latest recorded balance",
      },
    ];
  }, [activeMonthMetrics, overallEndingBalance]);

  const studentBalances = (usePage().props && usePage().props.studentBalances) || [];

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "payments", label: "Payments" },
    { key: "donations", label: "Donations" },
    { key: "expenses", label: "Expenses" },
    { key: "funds", label: "Funds History" },
    { key: "students", label: "Student Balances" },
    { key: "monthly", label: "Monthly Reports" },
  ];

  const [activeTab, setActiveTab] = useState("overview");
  const [syFilter, setSyFilter] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [studentTableSearch, setStudentTableSearch] = useState("");
  const [studentGradeTab, setStudentGradeTab] = useState("");
  const [fundMonthFilter, setFundMonthFilter] = useState("");
  const [fundYearFilter, setFundYearFilter] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");
  const [contribFilter, setContribFilter] = useState("");
  const [paymentSearch, setPaymentSearch] = useState("");
  const [donationSearch, setDonationSearch] = useState("");
  const [donationTypeTab, setDonationTypeTab] = useState("cash");
  const [expensesSearch, setExpensesSearch] = useState("");
  const [fundSearch, setFundSearch] = useState("");
  const [monthlySearch, setMonthlySearch] = useState("");
  const [monthlyIncomePages, setMonthlyIncomePages] = useState({});
  const [monthlyExpensePages, setMonthlyExpensePages] = useState({});
  const [paymentMonth, setPaymentMonth] = useState("");

  const paymentFiltersActive = Boolean(paymentMonth || syFilter || gradeFilter || sectionFilter || contribFilter);

  const handleClearPaymentFilters = useCallback(() => {
    setPaymentMonth("");
    setSyFilter("");
    setGradeFilter("");
    setSectionFilter("");
    setContribFilter("");
  }, []);

  const handleClearPaymentSearch = useCallback(() => {
    setPaymentSearch("");
  }, []);

  const handleClearMonthlySearch = useCallback(() => setMonthlySearch(""), []);
  const updateMonthlyIncomePage = useCallback((monthKey, nextPage) => {
    setMonthlyIncomePages((prev) => ({
      ...prev,
      [monthKey]: nextPage,
    }));
  }, []);
  const updateMonthlyExpensePage = useCallback((monthKey, nextPage) => {
    setMonthlyExpensePages((prev) => ({
      ...prev,
      [monthKey]: nextPage,
    }));
  }, []);
  const handleClearDonationSearch = useCallback(() => setDonationSearch(""), []);
  const handleClearExpensesSearch = useCallback(() => setExpensesSearch(""), []);
  const handleClearFundSearch = useCallback(() => setFundSearch(""), []);
  const handleClearStudentSearch = useCallback(() => setStudentTableSearch(""), []);
  const handleExportMonthlySection = useCallback((monthKey) => {
    const detailSet = monthlyDetails[monthKey];
    if (!detailSet) return;
    const incomes = [
      ...detailSet.payments.map((item) => ({
        type: "Payment",
        date: item.timestamp,
        source: item.student,
        category: item.contribution,
        amount: Number(item.amount || 0) || 0,
      })),
      ...detailSet.cashDonations.map((item) => ({
        type: "Cash Donation",
        date: item.timestamp,
        source: item.donor,
        category: item.details || "Cash Donation",
        amount: Number(item.amount || 0) || 0,
      })),
    ];
    const expensesExport = detailSet.expenses.map((item) => ({
      type: item.type || "Expense",
      date: item.timestamp,
      source: item.contribution || item.expense_type || "—",
      category: item.description || "—",
      amount: Number(item.amount || 0) || 0,
    }));
    const csvRows = [...incomes, ...expensesExport].map((entry) => ({
      Category: entry.type,
      Date: entry.date ? new Date(entry.date).toLocaleString("en-PH", { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—",
      Source: entry.source || "—",
      Details: entry.category || "—",
      Amount: entry.amount,
    }));
    exportCSV(csvRows, ["Category", "Date", "Source", "Details", "Amount"], `${monthKey}-monthly-report.csv`);
  }, [monthlyDetails]);
  const handlePrintMonthlySection = useCallback((monthKey) => {
    if (typeof window === "undefined") return;
    const target = document.getElementById(`monthly-report-${monthKey}`);
    if (!target) {
      window.print?.();
      return;
    }
    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) return;
    const inlineStyles = Array.from(document.querySelectorAll("style, link[rel='stylesheet']"))
      .map((node) => node.outerHTML)
      .join("\n");
    printWindow.document.write(`<!doctype html><html><head><title>${monthLabel(monthKey)} Monthly Report</title>${inlineStyles}<style>body{font-family:'Inter','Segoe UI',sans-serif;padding:32px;background:#f8fafc;color:#0f172a;} .print-card{max-width:960px;margin:0 auto;border:1px solid #e2e8f0;border-radius:24px;background:#fff;padding:24px;box-shadow:0 20px 45px rgba(15,23,42,0.1);} .print-card table{width:100%;border-collapse:collapse;} .print-card th,.print-card td{padding:8px 12px;text-align:left;} .print-card th{text-transform:uppercase;font-size:11px;letter-spacing:0.08em;color:#475569;}</style></head><body><div class="print-card">${target.outerHTML}</div></body></html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }, []);

  const filteredPayments = useMemo(() => {
    const monthStart = paymentMonth ? new Date(`${paymentMonth}-01T00:00:00`) : null;
    const monthEnd = monthStart ? new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0, 23, 59, 59, 999) : null;
    const extractTimestamp = (record) => record.timestamp || record.date || record.payment_date || record.created_at || null;
    return [...paymentsList]
      .filter((p) => {
        const yr = (p.school_year_name || p.school_year || yearKey(p.date || p.payment_date));
        const grade = p.grade_level_name || p.student?.grade_level?.name;
        const section = p.section_name || p.student?.section?.name;
        const contrib = p.contribution_name || p.contribution?.contribution_type;
        const paymentDateValue = extractTimestamp(p);
        const paymentDate = paymentDateValue ? new Date(paymentDateValue) : null;
        if (syFilter && String(yr) !== String(syFilter)) return false;
        if (gradeFilter && String(grade) !== String(gradeFilter)) return false;
        if (sectionFilter && String(section) !== String(sectionFilter)) return false;
        if (contribFilter && String(contrib) !== String(contribFilter)) return false;
        if (monthStart && monthEnd) {
          if (!paymentDate || Number.isNaN(paymentDate.getTime()) || paymentDate < monthStart || paymentDate > monthEnd) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const tsA = extractTimestamp(a);
        const tsB = extractTimestamp(b);
        const aValue = tsA ? new Date(tsA).getTime() : 0;
        const bValue = tsB ? new Date(tsB).getTime() : 0;
        return bValue - aValue;
      });
  }, [paymentsList, syFilter, gradeFilter, sectionFilter, contribFilter, paymentMonth]);

  const paymentsPagination = useSearchPagination(
    filteredPayments,
    paymentSearch,
    useCallback(
      (p) => [
        p.student_name || p.student?.name,
        p.grade_level_name || p.student?.grade_level?.name,
        p.section_name || p.student?.section?.name,
        p.contribution_name || p.contribution?.contribution_type,
        formatDate(p.date || p.payment_date),
      ],
      []
    ),
    [filteredPayments]
  );

  const handleExportPayments = () => {
    if (!paymentsPagination.searched.length) return;
    const rows = paymentsPagination.searched.map((p) => ({
      DateTime: formatDateTime(p.timestamp || p.date || p.payment_date),
      Student: p.student_name || p.student?.name || "-",
      Grade: p.grade_level_name || p.student?.grade_level?.name || "",
      Section: p.section_name || p.student?.section?.name || "",
      Contribution: p.contribution_name || p.contribution?.contribution_type || "-",
      Amount: Number(p.amount ?? (p.amount_paid || 0)) || 0,
    }));
    exportCSV(rows, ["DateTime", "Student", "Grade", "Section", "Contribution", "Amount"], "payments-report.csv");
  };

  const donationsByTab = useMemo(() => {
    const tabIsInKind = donationTypeTab === "in-kind";
    return donationsList.filter((d) => {
      const type = (d.type || d.donation_type || "").toLowerCase();
      return tabIsInKind ? type === "in-kind" : type !== "in-kind";
    });
  }, [donationTypeTab, donationsList]);

  const donationsPagination = useSearchPagination(
    donationsByTab,
    donationSearch,
    useCallback(
      (d) => [
        d.donated_by,
        d.type || d.donation_type,
        d.details || d.donation_description,
        d.date || d.donation_date,
        d.id,
        d.amount ?? d.donation_amount,
      ],
      []
    ),
    [donationsByTab]
  );

  const handleExportDonations = () => {
    if (!donationsPagination.searched.length) return;
    if (donationTypeTab === "in-kind") {
      const rows = donationsPagination.searched.map((d) => {
        const totalQty = Number(d.donation_quantity ?? 0) || 0;
        const usedQty = Number(d.used_quantity ?? 0) || 0;
        const usableQty = Number(d.usable_quantity ?? 0) || 0;
        const damagedQty = Number(d.damaged_quantity ?? 0) || 0;
        const unusableQty = Number(d.unusable_quantity ?? 0) || 0;
        const computedRemaining = usableQty || Math.max(totalQty - usedQty - damagedQty - unusableQty, 0);
        const status = d.usage_status || "Available";
        return {
          Date: formatDateTime(d.timestamp || d.date || d.donation_date),
          Donor: d.donated_by || "-",
          ItemType: d.item_type || "-",
          Details: d.details || d.donation_description || "-",
          QtyUsed: formatQty(usedQty),
          QtyRemaining: formatQty(computedRemaining),
          Status: status,
          StatusNotes: d.usage_notes || "",
          ReceivedBy: d.received_by || "-",
        };
      });
      exportCSV(
        rows,
        ["Date", "Donor", "ItemType", "Details", "QtyUsed", "QtyRemaining", "Status", "StatusNotes", "ReceivedBy"],
        "donations-in-kind.csv"
      );
      return;
    }
    const rows = donationsPagination.searched.map((d) => ({
      Date: formatDateTime(d.timestamp || d.date || d.donation_date),
      Donor: d.donated_by || "-",
      Amount: Number(d.amount ?? d.donation_amount ?? 0) || 0,
      ReceivedBy: d.received_by || "-",
    }));
    exportCSV(rows, ["Date", "Donor", "Amount", "ReceivedBy"], "donations-cash.csv");
  };

  const [expensesTab, setExpensesTab] = useState("all");

  const expensesByTab = useMemo(() => {
    const normalizeDonationType = (expense) =>
      (expense?.donation?.donation_type || "").toString().trim().toLowerCase();

    if (expensesTab === "funds") {
      return expensesList.filter((expense) => normalizeDonationType(expense) !== "in-kind");
    }
    if (expensesTab === "in-kind") {
      return expensesList.filter((expense) => normalizeDonationType(expense) === "in-kind");
    }
    return expensesList;
  }, [expensesList, expensesTab]);

  const expensesPagination = useSearchPagination(
    expensesByTab,
    expensesSearch,
    useCallback(
      (expense) => [
        expense.expense_type,
        expense.contribution?.contribution_type,
        expense.description,
        expense.donation?.donation_type,
        expense.donation?.donated_by,
        expense.donation?.usage_status,
        expense.date || expense.expense_date,
        expense.id,
        expense.amount,
      ],
      []
    ),
    [expensesByTab]
  );

  const handleExportExpenses = () => {
    if (!expensesPagination.searched.length) return;
    if (expensesTab === "in-kind") {
      const rows = expensesPagination.searched.map((expense) => {
        const rawDescription = expense.description || "-";
        const qtyMatch = rawDescription.match(/\(Qty\s*Used:\s*([0-9]+(?:\.[0-9]+)?)\)/i);
        const cleanedDescription = rawDescription
          .replace(/\(Qty\s*Used:[^)]*\)/i, "")
          .replace(/\(Estimated:[^)]*\)/i, "")
          .trim() || "-";
        return {
          DonationType: expense.donation?.donation_type ? expense.donation.donation_type.replace(/\b\w/g, (c) => c.toUpperCase()) : "In-Kind",
          ItemType: expense.donation?.item_type || "-",
          ExpenseCategory: expense.expense_type || "-",
          DateTime: formatDateTime(expense.timestamp || expense.date || expense.expense_date),
          QuantityUsed: qtyMatch ? qtyMatch[1] : "-",
          Description: cleanedDescription,
        };
      });
      exportCSV(
        rows,
        ["DonationType", "ItemType", "ExpenseCategory", "DateTime", "QuantityUsed", "Description"],
        "expenses-in-kind.csv"
      );
      return;
    }
    const rows = expensesPagination.searched.map((expense) => ({
      ExpenseCategory: expense.expense_type || "-",
      Amount: Number(expense.amount || 0) || 0,
      DateTime: formatDateTime(expense.timestamp || expense.date || expense.expense_date),
      Source: expense.contribution?.contribution_type || (expense.donation ? "Donation" : "Cash Pool"),
      Description: expense.description || expense.donation?.donation_description || "-",
    }));
    exportCSV(rows, ["ExpenseCategory", "Amount", "DateTime", "Source", "Description"], "expenses.csv");
  };

  const enrichedStudentBalances = useMemo(() => {
    return studentBalances.map((s) => {
      const grade = s.grade_level_name || s.grade || s.student?.grade || s.student?.grade_level?.name || "Unassigned";
      const section = s.section_name || s.section || s.student?.section || s.student?.section_name || "—";
      const guardian = s.guardian_name || s.student?.guardian || s.student?.guardian_name || "—";
      const schoolYearId =
        s.school_year_id ??
        s.current_school_year_id ??
        s.student?.school_year_id ??
        s.student?.school_year?.id ??
        s.school_year?.id ??
        null;
      const schoolYearName = s.school_year_name || s.school_year || s.student?.school_year?.name || s.school_year?.name || "";
      return {
        ...s,
        grade,
        section,
        guardian,
        schoolYearId,
        schoolYearName,
        student_name: s.student_name || s.student?.name || `${s.student?.first_name || ""} ${s.student?.last_name || ""}`.trim() || "Unnamed",
        totalPaymentsValue: Number(s.total_payments ?? s.payments ?? 0) || 0,
        balanceValue: Number(s.balance ?? 0) || 0,
      };
    });
  }, [studentBalances]);

  const studentPagination = useSearchPagination(
    enrichedStudentBalances,
    studentTableSearch,
    useCallback(
      (s) => [
        s.student_name,
        s.grade,
        s.section,
        s.guardian,
        formatCurrency(s.totalPaymentsValue),
        formatCurrency(s.balanceValue),
      ],
      []
    ),
    [enrichedStudentBalances]
  );

  const handleExportStudents = () => {
    if (!studentPagination.searched.length) return;
    const rows = studentPagination.searched.map((s) => ({
      Student: s.student_name,
      Grade: s.grade,
      Section: s.section,
      Guardian: s.guardian,
      TotalPayments: Number(s.totalPaymentsValue || 0) || 0,
      Balance: Number(s.balanceValue || 0) || 0,
    }));
    exportCSV(rows, ["Student", "Grade", "Section", "Guardian", "TotalPayments", "Balance"], "student-balances.csv");
  };

  const groupedStudentBalances = useMemo(() => {
    const map = new Map();
    studentPagination.searched.forEach((s) => {
      if (!map.has(s.grade)) {
        map.set(s.grade, new Map());
      }
      const sectionMap = map.get(s.grade);
      if (!sectionMap.has(s.section)) {
        sectionMap.set(s.section, []);
      }
      sectionMap.get(s.section).push(s);
    });
    // sort grades numerically if possible
    return Array.from(map.entries())
      .sort((a, b) => gradeOrderValue(a[0]) - gradeOrderValue(b[0]) || String(a[0]).localeCompare(String(b[0])))
      .map(([grade, sections]) => ({
        grade,
        sections: Array.from(sections.entries()).sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
      }));
  }, [studentPagination.searched]);

  const studentGradeOptions = useMemo(() => {
    const uniqueGrades = Array.from(new Set(groupedStudentBalances.map((group) => group.grade))).filter(Boolean);
    return uniqueGrades.sort((a, b) => gradeOrderValue(a) - gradeOrderValue(b) || String(a).localeCompare(String(b)));
  }, [groupedStudentBalances]);

  const filteredStudentGroups = useMemo(() => {
    if (!studentGradeTab) return groupedStudentBalances;
    return groupedStudentBalances.filter(({ grade }) => grade === studentGradeTab);
  }, [groupedStudentBalances, studentGradeTab]);

  const monthlyPagination = useSearchPagination(
    monthlyRows,
    monthlySearch,
    useCallback(
      (r) => [
        monthLabel(r.month),
        r.month,
        r.income,
        r.expenses,
        r.net,
      ],
      []
    ),
    [monthlyRows]
  );

  const handleExportMonthlySummary = () => {
    if (!monthlyPagination.searched.length) return;
    const rows = monthlyPagination.searched.map((row) => ({
      Month: monthLabel(row.month),
      MonthKey: row.month,
      Income: Number(row.income || 0),
      Expenses: Number(row.expenses || 0),
      Net: Number(row.net || 0),
    }));
    exportCSV(rows, ["Month", "MonthKey", "Income", "Expenses", "Net"], "monthly-summary.csv");
  };

  const paymentYears = useMemo(() => Array.from(new Set(paymentsList.map((p) => p.school_year_name || p.school_year || yearKey(p.date || p.payment_date)))).filter(Boolean), [paymentsList]);
  const paymentGrades = useMemo(() => Array.from(new Set(paymentsList.map((p) => p.grade_level_name || p.student?.grade_level?.name))).filter(Boolean), [paymentsList]);
  const paymentSections = useMemo(() => Array.from(new Set(paymentsList.map((p) => p.section_name || p.student?.section?.name))).filter(Boolean), [paymentsList]);
  const paymentContribs = useMemo(() => Array.from(new Set(paymentsList.map((p) => p.contribution_name || p.contribution?.contribution_type))).filter(Boolean), [paymentsList]);
  const paymentMonths = useMemo(
    () =>
      Array.from(new Set(paymentsList.map((p) => monthKey(p.date || p.payment_date))))
        .filter(Boolean)
        .sort(),
    [paymentsList]
  );

  const fundList = useMemo(() => (Array.isArray(fundsHistories) ? fundsHistories : []), [fundsHistories]);

  const fundTotals = useMemo(() => {
    return fundList.reduce(
      (acc, entry) => {
        const amount = Number(entry?.amount || 0) || 0;
        if (entry?.payment_id) {
          acc.payments += amount;
        } else if (entry?.donation_id) {
          if ((entry?.donation_type || '').toLowerCase() === 'in-kind') {
            acc.inKind += amount;
          } else {
            acc.donations += amount;
          }
        } else {
          acc.expenses += amount;
        }
        acc.available = acc.payments + acc.donations - acc.expenses;
        return acc;
      },
      { payments: 0, donations: 0, inKind: 0, expenses: 0, available: 0 }
    );
  }, [fundList]);

  const fundYears = useMemo(
    () =>
      Array.from(new Set(fundList.map((h) => yearKey(h.fund_date || h.date))))
        .filter(Boolean)
        .sort(),
    [fundList]
  );

  const MONTH_OPTIONS = [
    { value: "01", label: "January" },
    { value: "02", label: "February" },
    { value: "03", label: "March" },
    { value: "04", label: "April" },
    { value: "05", label: "May" },
    { value: "06", label: "June" },
    { value: "07", label: "July" },
    { value: "08", label: "August" },
    { value: "09", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ];

  const filteredFundList = useMemo(() => {
    return fundList.filter((h) => {
      const date = h.date || h.fund_date;
      const month = monthKey(date);
      const year = yearKey(date);
      if (fundMonthFilter && month.slice(5, 7) !== fundMonthFilter) return false;
      if (fundYearFilter && year !== fundYearFilter) return false;
      return true;
    });
  }, [fundList, fundMonthFilter, fundYearFilter]);

  const fundsPagination = useSearchPagination(
    filteredFundList,
    fundSearch,
    useCallback(
      (h) => [
        h.payment_id ? 'payment' : h.donation_id ? 'donation' : 'expense',
        h.donation_type,
        h.fund_description,
        h.fund_date,
        h.amount,
        h.balance_before,
        h.balance_after,
      ],
      []
    ),
    [filteredFundList]
  );

  const fundsSearchTotals = useMemo(() => {
    return fundsPagination.searched.reduce(
      (acc, entry) => {
        const amount = Number(entry?.amount || 0) || 0;
        if (entry?.payment_id) {
          acc.payments += amount;
        } else if (entry?.donation_id) {
          if ((entry?.donation_type || '').toLowerCase() === 'in-kind') {
            acc.inKind += amount;
          } else {
            acc.donations += amount;
          }
        } else {
          acc.expenses += amount;
        }
        acc.available = acc.payments + acc.donations - acc.expenses;
        return acc;
      },
      { payments: 0, donations: 0, expenses: 0, inKind: 0, available: 0 }
    );
  }, [fundsPagination.searched]);

  const handleExportFunds = () => {
    if (!fundsPagination.searched.length) return;
    const rows = fundsPagination.searched.map((history) => {
      const amount = Number(history?.amount || 0) || 0;
      const isPayment = Boolean(history?.payment_id);
      const isDonation = Boolean(history?.donation_id);
      const donationType = (history?.donation_type || "").toLowerCase();
      const usesInKind = Boolean(history?.expense_in_kind);
      const fundDate = history?.timestamp || history?.date || history?.fund_date;
      const entryType = isPayment
        ? "Payment"
        : isDonation
          ? `Donation (${donationType === "in-kind" ? "In-Kind" : "Cash"})`
          : usesInKind
            ? "Expense (In-Kind)"
            : "Expense";
      const detailParts = [];
      if (history?.student_name) detailParts.push(`Student: ${history.student_name}`);
      if (history?.donated_by) detailParts.push(`Donor: ${history.donated_by}`);
      if (history?.expense_type) detailParts.push(`Expense Type: ${history.expense_type}`);
      if (history?.expense_description) detailParts.push(`Description: ${history.expense_description}`);
      if (usesInKind && history?.expense_in_kind_item_type) detailParts.push(`In-Kind Item: ${history.expense_in_kind_item_type}`);
      const details = detailParts.join(" | ");
      return {
        DateTime: formatDateTime(fundDate),
        EntryType: entryType,
        Amount: amount,
        BalanceBefore: Number(history?.balance_before || history?.fund_before || 0) || 0,
        BalanceAfter: Number(history?.balance_after || history?.fund_after || 0) || 0,
        Details: details || history?.fund_description || "",
      };
    });
    exportCSV(rows, ["DateTime", "EntryType", "Amount", "BalanceBefore", "BalanceAfter", "Details"], "fund-history.csv");
  };

  const paymentStats = useMemo(() => {
    const totalAmount = paymentsPagination.searched.reduce((sum, p) => sum + (Number(p.amount ?? (p.amount_paid || 0)) || 0), 0);
    const studentsPaid = new Set(
      paymentsPagination.searched.map((p) => p.student_name || p.student?.name || "-")
    ).size;
    const unpaidBalance = enrichedStudentBalances.reduce(
      (sum, student) => sum + (student.balanceValue > 0 ? student.balanceValue : 0),
      0
    );
    return {
      totalAmount,
      recordCount: paymentsPagination.searched.length,
      studentsPaid,
      unpaidBalance,
    };
  }, [paymentsPagination.searched, enrichedStudentBalances]);

  const expenseStats = useMemo(() => {
    const bucket = expensesPagination.searched.reduce(
      (acc, e) => {
        const amount = Number(e.amount || 0) || 0;
        acc.totalAmount += amount;
        acc.categories.add(e.expense_type || "Uncategorized");
        acc.recordCount += 1;
        return acc;
      },
      { totalAmount: 0, categories: new Set(), recordCount: 0 }
    );
    return {
      totalAmount: bucket.totalAmount,
      recordCount: bucket.recordCount,
      categoryCount: bucket.categories.size,
    };
  }, [expensesPagination.searched]);

  const studentStats = useMemo(() => {
    const totals = studentPagination.searched.reduce(
      (acc, s) => {
        acc.totalPaid += Number(s.total_payments ?? (s.payments || 0)) || 0;
        acc.totalBalance += Number(s.balance ?? 0) || 0;
        return acc;
      },
      { totalPaid: 0, totalBalance: 0 }
    );
    return {
      ...totals,
      recordCount: studentPagination.searched.length,
    };
  }, [studentPagination.searched]);

  const monthlyStats = useMemo(() => {
    if (!monthlyPagination.searched.length) {
      return { best: null, worst: null, avgNet: 0 };
    }
    const sorted = [...monthlyPagination.searched].sort((a, b) => b.net - a.net);
    const totalNet = monthlyPagination.searched.reduce((sum, m) => sum + (Number(m.net || 0) || 0), 0);
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];
    return {
      best,
      worst,
      avgNet: totalNet / monthlyPagination.searched.length,
    };
  }, [monthlyPagination.searched]);

  const paymentFilterBadges = useMemo(() => {
    const badges = [];
    if (paymentMonth) badges.push({ label: "Month", value: monthLabel(paymentMonth) });
    if (syFilter) badges.push({ label: "SY", value: syFilter });
    if (gradeFilter) badges.push({ label: "Grade", value: gradeFilter });
    if (sectionFilter) badges.push({ label: "Section", value: sectionFilter });
    if (contribFilter) badges.push({ label: "Contribution", value: contribFilter });
    return badges;
  }, [paymentMonth, syFilter, gradeFilter, sectionFilter, contribFilter]);

  const activeSchoolYearId =
    financial?.activeSchoolYear?.id ??
    financial?.activeSchoolYear?.school_year_id ??
    financial?.activeSchoolYear?.school_year?.id ??
    null;
  const activeSchoolYearName =
    financial?.activeSchoolYear?.name ??
    financial?.activeSchoolYear?.school_year?.name ??
    "";

  const registeredStudentsCount = useMemo(() => {
    if (!enrichedStudentBalances.length) return 0;
    return enrichedStudentBalances.filter((s) => {
      const rowId = s.schoolYearId ?? s.school_year_id ?? null;
      const rowName = s.schoolYearName || s.school_year_name || "";
      if (activeSchoolYearId) {
        return String(rowId ?? "") === String(activeSchoolYearId);
      }
      if (activeSchoolYearName && rowName) {
        return String(rowName).toLowerCase() === String(activeSchoolYearName).toLowerCase();
      }
      return true;
    }).length;
  }, [enrichedStudentBalances, activeSchoolYearId, activeSchoolYearName]);

  const overviewHighlights = [
    {
      label: "Total Funds Available",
      value: formatCurrency(Number(financial.totalFundsAvailable ?? totals.available ?? 0)),
      icon: PiggyBank,
      accent: "from-emerald-300/70 via-emerald-200/30 to-transparent",
    },
    {
      label: "Total Students",
      value: formatQty(registeredStudentsCount || Number(financial.studentsCount ?? 0)),
      icon: Users,
      accent: "from-sky-300/70 via-blue-200/30 to-transparent",
      iconTint: "bg-sky-50 text-sky-600",
    },
    {
      label: "Active School Year",
      value: financial.activeSchoolYear?.name || "-",
      icon: CalendarDays,
      accent: "from-indigo-300/70 via-indigo-200/30 to-transparent",
      iconTint: "bg-indigo-50 text-indigo-600",
    },
    {
      label: "Collected Payments (Active SY)",
      value: formatCurrency(Number(financial.totalCollectedActiveSchoolYear ?? 0)),
      icon: Wallet,
      accent: "from-teal-300/70 via-teal-200/30 to-transparent",
      iconTint: "bg-teal-50 text-teal-600",
    },
    {
      label: "Total Donations (Cash)",
      value: formatCurrency(Number(totals.donationsCash || 0)),
      icon: Gift,
      accent: "from-emerald-300/70 via-lime-200/30 to-transparent",
      iconTint: "bg-lime-50 text-emerald-600",
    },
    {
      label: "Total Expenses",
      value: formatCurrency(Number(totals.expenses || 0)),
      icon: Receipt,
      accent: "from-rose-300/70 via-rose-200/30 to-transparent",
      iconTint: "bg-rose-50 text-rose-600",
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-extrabold mb-6 bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
          Reports
        </h1>
        <div className="mb-6 flex flex-wrap gap-3">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2 rounded-full text-sm font-semibold border transition ${activeTab === t.key
                ? "bg-blue-600 text-white border-blue-600 shadow"
                : "bg-white text-slate-600 border-slate-200 hover:text-blue-600"
                }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {activeTab === "overview" && (
          <section className="relative overflow-hidden rounded-3xl border border-slate-100 bg-white text-slate-900 shadow-xl">
            <div className="px-6 py-6 md:px-10">
              <div className="flex flex-wrap items-start gap-4">
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.1em] text-slate-500">Overview</p>
                </div>
              </div>
              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {overviewHighlights.map(({ label, value, detail, icon: Icon, accent, iconTint }) => (
                  <div
                    key={label}
                    className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_15px_45px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5"
                  >
                    <span className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r ${accent}`} aria-hidden />
                    <div className="flex items-center gap-3">
                      <span className={`flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-100 ${iconTint}`}>
                        <Icon size={22} />
                      </span>
                      <p className="text-xs uppercase tracking-[0.1em] text-slate-500">{label}</p>
                    </div>
                    <div className="mt-4 space-y-1">
                      <p className="text-3xl font-semibold text-slate-900">{value}</p>
                      <p className="text-sm text-slate-600">{detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        <div className="space-y-8">
          {activeTab === "monthly" && (
            <section className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b bg-gradient-to-r from-gray-50 via-white to-transparent">
                <div className="flex flex-wrap gap-2 items-center">
                  <h2 className="text-lg font-semibold">Monthly Financial Report</h2>
                  <div className="ml-auto flex flex-wrap gap-2 items-center">
                    <button
                      type="button"
                      onClick={handleExportMonthlySummary}
                      disabled={!monthlyPagination.searched.length}
                      className="px-4 py-2 text-sm border border-blue-200 rounded-xl bg-blue-50 text-blue-600 shadow-sm hover:bg-blue-100 transition disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      Export Summary
                    </button>
                    <input
                      type="text"
                      value={monthlySearch}
                      onChange={(e) => setMonthlySearch(e.target.value)}
                      placeholder="Search months..."
                      className="w-full md:w-64 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                    <button
                      type="button"
                      onClick={handleClearMonthlySearch}
                      disabled={!monthlySearch}
                      className="px-4 py-2 text-sm border border-blue-200 rounded-xl bg-white/90 shadow-sm hover:bg-blue-50 hover:text-blue-700 transition disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      Clear Search
                    </button>
                  </div>
                </div>
              </div>
              {monthlyRows.length > 0 && (
                <div className="px-6 py-5 border-b bg-white">
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {monthlySummaryCards.map((card) => (
                      <div
                        key={card.key}
                        className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 shadow-sm"
                      >
                        <p className="text-[13px] font-semibold text-slate-600">{card.label}</p>
                        <p className="mt-2 text-2xl font-bold text-slate-900">{card.value}</p>
                        <p className="mt-1 text-sm text-slate-500">{card.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="px-6 py-5">
                {monthlyPagination.total ? (
                  <div className="space-y-5">
                    {monthlyPagination.paginated.map((r) => {
                      const details = monthlyDetails[r.month] || { payments: [], cashDonations: [], inKindDonations: [], expenses: [] };
                      const getTimeValue = (value) => {
                        const time = value ? new Date(value).getTime() : 0;
                        return Number.isNaN(time) ? 0 : time;
                      };
                      const incomeRows = [
                        ...details.payments.map((item) => ({
                          date: item.timestamp,
                          contributor: item.student,
                          category: item.contribution,
                          amount: Number(item.amount || 0) || 0,
                        })),
                        ...details.cashDonations.map((item) => ({
                          date: item.timestamp,
                          contributor: item.donor,
                          category: item.details || "Cash Donation",
                          amount: Number(item.amount || 0) || 0,
                        })),
                      ].sort((a, b) => getTimeValue(b.date) - getTimeValue(a.date));
                      const incomeTotal = incomeRows.reduce((sum, entry) => sum + entry.amount, 0);

                      const expenseRows = details.expenses.map((item) => {
                        const rawDescription = item.description || "";
                        const qtyMatch = rawDescription.match(/\(Qty\s*Used:\s*([0-9]+(?:\.[0-9]+)?)\)/i);
                        const cleanedDescription = rawDescription
                          .replace(/\(Qty\s*Used:[^)]*\)/i, "")
                          .replace(/\(Estimated:[^)]*\)/i, "")
                          .trim();
                        return {
                          item: item.type || "Expense",
                          quantity: qtyMatch ? qtyMatch[1] : "—",
                          description: cleanedDescription || item.contribution || "—",
                          amount: Number(item.amount || 0) || 0,
                          timestamp: item.timestamp,
                        };
                      }).sort((a, b) => getTimeValue(b.timestamp) - getTimeValue(a.timestamp));
                      const expenseTotal = expenseRows.reduce((sum, entry) => sum + entry.amount, 0);

                      const incomePagination = getDetailPagination(incomeRows, monthlyIncomePages[r.month]);
                      const expensePagination = getDetailPagination(expenseRows, monthlyExpensePages[r.month]);

                      const donorCount = new Set([
                        ...details.cashDonations.map((entry) => entry.donor),
                        ...details.inKindDonations.map((entry) => entry.donor),
                      ].filter(Boolean)).size;
                      const topIncome = incomeRows
                        .filter((entry) => entry.amount > 0)
                        .sort((a, b) => b.amount - a.amount)[0];
                      const topExpense = expenseRows
                        .filter((entry) => entry.amount > 0)
                        .sort((a, b) => b.amount - a.amount)[0];
                      const impactNotes = [];
                      if (donorCount) {
                        impactNotes.push(`${formatQty(donorCount)} donor${donorCount === 1 ? "" : "s"} supported this month.`);
                      }
                      if (topIncome) {
                        impactNotes.push(`Largest income: ${(topIncome.contributor || "—")} · ${topIncome.category || "—"} (${formatCurrency(topIncome.amount)})`);
                      }
                      if (topExpense) {
                        impactNotes.push(`Highest expense: ${topExpense.item || "—"} (${formatCurrency(topExpense.amount)})`);
                      }
                      if (!impactNotes.length) {
                        impactNotes.push("No additional beneficiary notes recorded.");
                      }
                      const monthlyNotes = [];
                      monthlyNotes.push(`Net balance closed at ${formatCurrency(Number(r.net || 0))}.`);
                      if (incomeRows.length) {
                        monthlyNotes.push(`${formatQty(incomeRows.length)} income entr${incomeRows.length === 1 ? "y" : "ies"} logged for ${monthLabel(r.month)}.`);
                      }
                      if (expenseRows.length) {
                        monthlyNotes.push(`${formatQty(expenseRows.length)} expense entr${expenseRows.length === 1 ? "y" : "ies"} recorded.`);
                      }
                      if (!monthlyNotes.length) {
                        monthlyNotes.push("No remarks were recorded for this month.");
                      }

                      return (
                        <article
                          id={`monthly-report-${r.month}`}
                          key={`m-${r.month}`}
                          className="rounded-3xl border border-slate-100 bg-gradient-to-br from-white via-white to-slate-50 p-5 shadow-sm"
                        >
                          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div>
                              <p className="text-xs uppercase text-slate-400">Month</p>
                              <h3 className="text-2xl font-semibold text-slate-900">{monthLabel(r.month)}</h3>
                              <p className="text-sm text-slate-500">Income {formatCurrency(Number(r.income || 0))}</p>
                            </div>
                            <div className="flex flex-wrap justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => handlePrintMonthlySection(r.month)}
                                className="inline-flex items-center justify-center rounded-full border border-slate-200 px-4 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-blue-300 hover:text-blue-600"
                              >
                                Print Summary
                              </button>
                              <button
                                type="button"
                                onClick={() => handleExportMonthlySection(r.month)}
                                className="inline-flex items-center justify-center rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-xs font-semibold text-blue-600 transition hover:bg-blue-100"
                              >
                                Export CSV
                              </button>
                            </div>
                          </div>

                          <div className="mt-5 grid gap-5 lg:grid-cols-2">
                            <section className="rounded-2xl border border-slate-100 bg-white/80 p-4 shadow-sm">
                              <div className="flex items-center justify-between">
                                <h4 className="text-sm font-semibold text-slate-900">Income Breakdown</h4>
                                <span className="text-xs font-semibold text-slate-500">Total {formatCurrency(incomeTotal)}</span>
                              </div>
                              <div className="mt-3 overflow-x-auto">
                                <table className="w-full text-xs">
                                  <thead className="text-slate-400 uppercase">
                                    <tr>
                                      <th className="py-2 pr-3 text-left">Date</th>
                                      <th className="py-2 pr-3 text-left">Contributor</th>
                                      <th className="py-2 pr-3 text-left">Category</th>
                                      <th className="py-2 pl-3 text-right">Amount</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {incomeRows.length ? (
                                      incomePagination.paginated.map((entry, idx) => (
                                        <tr key={`income-${r.month}-${idx}`} className="text-slate-600">
                                          <td className="py-2 pr-2 font-semibold text-slate-900">{formatDateTime(entry.date)}</td>
                                          <td className="py-2 pr-2">{entry.contributor || "—"}</td>
                                          <td className="py-2 pr-2">{entry.category || "—"}</td>
                                          <td className="py-2 text-right font-semibold text-blue-700">{formatCurrency(entry.amount)}</td>
                                        </tr>
                                      ))
                                    ) : (
                                      <tr>
                                        <td colSpan={4} className="py-4 text-center text-slate-400">No income records for this month.</td>
                                      </tr>
                                    )}
                                  </tbody>
                                  {incomeRows.length > 0 && (
                                    <tfoot>
                                      <tr>
                                        <td colSpan={3} className="py-2 pr-2 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                                          Total Income
                                        </td>
                                        <td className="py-2 text-right font-semibold text-slate-900">{formatCurrency(incomeTotal)}</td>
                                      </tr>
                                    </tfoot>
                                  )}
                                </table>
                              </div>
                              {incomeRows.length > 0 && (
                                <div className="mt-4 flex flex-col items-center gap-2 border-t border-slate-100 pt-3 text-center text-[11px] text-slate-500 sm:text-xs">
                                  <MinimalPager
                                    currentPage={incomePagination.page}
                                    totalPages={incomePagination.totalPages}
                                    onPageChange={(nextPage) => updateMonthlyIncomePage(r.month, nextPage)}
                                  />
                                  <span className="w-full">
                                    Showing <strong>{incomePagination.startIndex}</strong> to <strong>{incomePagination.endIndex}</strong> of <strong>{incomeRows.length}</strong> income entr{incomeRows.length === 1 ? "y" : "ies"}
                                  </span>
                                </div>
                              )}
                            </section>

                            <div className="space-y-5">
                              <section className="rounded-2xl border border-slate-100 bg-white/80 p-4 shadow-sm">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-sm font-semibold text-slate-900">Expense Breakdown</h4>
                                  <span className="text-xs font-semibold text-slate-500">Total {formatCurrency(expenseTotal)}</span>
                                </div>
                                <div className="mt-3 overflow-x-auto">
                                  <table className="w-full text-xs">
                                    <thead className="text-slate-400 uppercase">
                                      <tr>
                                        <th className="py-2 pr-3 text-left">Item</th>
                                        <th className="py-2 pr-3 text-left">Quantity</th>
                                        <th className="py-2 pr-3 text-left">Details</th>
                                        <th className="py-2 pl-3 text-right">Amount</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {expenseRows.length ? (
                                        expensePagination.paginated.map((entry, idx) => (
                                          <tr key={`expense-${r.month}-${idx}`} className="text-slate-600">
                                            <td className="py-2 pr-2 font-semibold text-slate-900">{entry.item}</td>
                                            <td className="py-2 pr-2">{entry.quantity}</td>
                                            <td className="py-2 pr-2">{entry.description}</td>
                                            <td className="py-2 text-right font-semibold text-rose-600">{formatCurrency(entry.amount)}</td>
                                          </tr>
                                        ))
                                      ) : (
                                        <tr>
                                          <td colSpan={4} className="py-4 text-center text-slate-400">No expenses recorded.</td>
                                        </tr>
                                      )}
                                    </tbody>
                                    {expenseRows.length ? (
                                      <tfoot>
                                        <tr>
                                          <td colSpan={3} className="py-2 pr-2 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                                            Total Expenses
                                          </td>
                                          <td className="py-2 text-right font-semibold text-slate-900">{formatCurrency(expenseTotal)}</td>
                                        </tr>
                                      </tfoot>
                                    ) : null}
                                  </table>
                                </div>
                                {expenseRows.length > 0 && (
                                  <div className="mt-4 flex flex-col items-center gap-2 border-t border-slate-100 pt-3 text-center text-[11px] text-slate-500 sm:text-xs">
                                    <MinimalPager
                                      currentPage={expensePagination.page}
                                      totalPages={expensePagination.totalPages}
                                      onPageChange={(nextPage) => updateMonthlyExpensePage(r.month, nextPage)}
                                    />
                                    <span className="w-full">
                                      Showing <strong>{expensePagination.startIndex}</strong> to <strong>{expensePagination.endIndex}</strong> of <strong>{expenseRows.length}</strong> expense entr{expenseRows.length === 1 ? "y" : "ies"}
                                    </span>
                                  </div>
                                )}
                              </section>

                              <section className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4 shadow-sm">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-sm font-semibold text-slate-900">Beneficiaries / Impact Section</h4>
                                  <span className="text-xs font-semibold text-blue-600">Insights</span>
                                </div>
                                <ul className="mt-3 space-y-2 text-sm text-slate-600">
                                  {impactNotes.map((note, idx) => (
                                    <li key={`impact-${r.month}-${idx}`} className="flex gap-2">
                                      <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-blue-500" aria-hidden />
                                      <span>{note}</span>
                                    </li>
                                  ))}
                                </ul>
                              </section>

                              <section className="rounded-2xl border border-slate-100 bg-white/70 p-4 shadow-sm">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-sm font-semibold text-slate-900">Monthly Notes / Remarks</h4>
                                  <span className="text-xs font-semibold text-slate-500">Summary</span>
                                </div>
                                <ul className="mt-3 space-y-2 text-sm text-slate-600">
                                  {monthlyNotes.map((note, idx) => (
                                    <li key={`remark-${r.month}-${idx}`} className="flex gap-2">
                                      <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-slate-400" aria-hidden />
                                      <span>{note}</span>
                                    </li>
                                  ))}
                                </ul>
                              </section>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-3xl border border-dashed border-slate-200 bg-white/70 py-10 text-center text-sm text-slate-500">
                    {monthlySearch ? "No months match your search." : "No monthly financial data to display yet."}
                  </div>
                )}
              </div>
              {monthlyPagination.total > 0 && (
                <div className="flex flex-col items-center gap-3 px-6 py-4 border-t bg-white">
                  <span className="text-sm text-gray-600">
                    Showing <strong>{monthlyPagination.startIndex}</strong> to <strong>{monthlyPagination.endIndex}</strong> of <strong>{monthlyPagination.total}</strong> months
                  </span>
                  <PaginationControls
                    currentPage={monthlyPagination.page}
                    totalPages={monthlyPagination.totalPages}
                    onPageChange={monthlyPagination.setPage}
                  />
                </div>
              )}
            </section>
          )}
          {activeTab === "payments" && (
            <section className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b bg-gradient-to-r from-gray-50 via-white to-transparent">
                <h2 className="text-lg font-semibold">Payment Report</h2>
                <div className="mt-3 flex flex-wrap gap-3 md:gap-4 items-center">
                  <select
                    className="w-36 border rounded-xl px-3 py-2 text-sm bg-white/90 shadow-sm"
                    value={paymentMonth}
                    onChange={(e) => setPaymentMonth(e.target.value)}
                  >
                    <option value="">All Months</option>
                    {paymentMonths.map((m) => (
                      <option key={m} value={m}>{monthLabel(m)}</option>
                    ))}
                  </select>
                  <select className="w-40 border rounded-xl px-3 py-2 text-sm bg-white/90 shadow-sm" value={syFilter} onChange={(e) => setSyFilter(e.target.value)}>
                    <option value="">All School Years</option>
                    {paymentYears.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                  <select className="w-32 border rounded-xl px-3 py-2 text-sm bg-white/90 shadow-sm" value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)}>
                    <option value="">All Grades</option>
                    {paymentGrades.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                  <select className="w-40 border rounded-xl px-3 py-2 text-sm bg-white/90 shadow-sm" value={sectionFilter} onChange={(e) => setSectionFilter(e.target.value)}>
                    <option value="">All Sections</option>
                    {paymentSections.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <select className="w-48 border rounded-xl px-3 py-2 text-sm bg-white/90 shadow-sm" value={contribFilter} onChange={(e) => setContribFilter(e.target.value)}>
                    <option value="">All Contributions</option>
                    {paymentContribs.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleClearPaymentFilters}
                    disabled={!paymentFiltersActive}
                    className="px-3 py-2 text-xs font-semibold text-blue-600 hover:text-blue-800 transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Clear Filters
                  </button>
                  <div className="ml-auto flex flex-wrap gap-5 items-center">
                    <input
                      type="text"
                      value={paymentSearch}
                      onChange={(e) => setPaymentSearch(e.target.value)}
                      placeholder="Search payments..."
                      className="w-full md:w-64 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                    <button
                      type="button"
                      onClick={handleClearPaymentSearch}
                      disabled={!paymentSearch}
                      className="px-4 py-2 text-sm border border-blue-200 rounded-xl bg-white/90 shadow-sm hover:bg-blue-50 hover:text-blue-700 transition disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      Clear Search
                    </button>
                    <button
                      className="px-4 py-2 text-sm border border-blue-200 rounded-xl bg-white/90 shadow-sm hover:bg-blue-50 hover:text-blue-700 transition disabled:opacity-30 disabled:cursor-not-allowed"
                      onClick={handleExportPayments}
                      disabled={!paymentsPagination.searched.length}
                    >
                      Export CSV
                    </button>
                    <button className="px-4 py-2 text-sm border border-blue-200 rounded-xl bg-white/90 shadow-sm hover:bg-blue-50 hover:text-blue-700 transition" onClick={() => window.print()}>Print</button>
                  </div>
                </div>
              </div>
              {(paymentFilterBadges.length > 0 || paymentStats.recordCount > 0) && (
                <div className="px-6 py-4 border-b bg-white space-y-3">
                  {paymentFilterBadges.length > 0 && (
                    <div className="flex flex-wrap gap-2 text-xs">
                      {paymentFilterBadges.map((badge) => (
                        <span key={`${badge.label}-${badge.value}`} className="inline-flex items-center gap-1 rounded-full border border-blue-100 bg-blue-50/80 px-3 py-1 text-blue-600">
                          <span className="font-semibold">{badge.label}:</span> {badge.value}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div className="rounded-2xl border border-slate-100 p-4 bg-slate-50/60">
                      <p className="text-xs text-slate-500">Collected Payment</p>
                      <p className="text-base font-semibold text-slate-900">{formatCurrency(paymentStats.totalAmount)}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-100 p-4 bg-slate-50/60">
                      <p className="text-xs text-slate-500">Total No. of Students Paid</p>
                      <p className="text-base font-semibold text-slate-900">{paymentStats.studentsPaid}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-100 p-4 bg-slate-50/60">
                      <p className="text-xs text-slate-500">Unpaid Payment Balance</p>
                      <p className="text-base font-semibold text-slate-900">{formatCurrency(paymentStats.unpaidBalance)}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-100 p-4 bg-slate-50/60">
                      <p className="text-xs text-slate-500">Record Count</p>
                      <p className="text-base font-semibold text-slate-900">{paymentStats.recordCount}</p>
                    </div>
                  </div>
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-gray-500 uppercase tracking-wide text-xs bg-gradient-to-r from-gray-50 via-white to-gray-50">
                      <th className="p-3">Date & Time</th>
                      <th className="p-3">Student</th>
                      <th className="p-3">Grade</th>
                      <th className="p-3">Section</th>
                      <th className="p-3">Contribution Type</th>
                      <th className="p-3">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentsPagination.total ? (
                      paymentsPagination.paginated.map((p) => (
                        <tr key={`pay-${p.id}`} className="odd:bg-white even:bg-gray-50 hover:bg-blue-50/60 transition-colors">
                          <td className="p-3 text-sm font-semibold text-slate-700">
                            {formatDateTime(p.timestamp || p.date || p.payment_date)}
                          </td>
                          <td className="p-3 text-sm text-gray-700">{p.student_name || p.student?.name || "-"}</td>
                          <td className="p-3 text-sm text-gray-600">{p.grade_level_name || p.student?.grade_level?.name || ""}</td>
                          <td className="p-3 text-sm text-gray-600">{p.section_name || p.student?.section?.name || ""}</td>
                          <td className="p-3 text-sm text-gray-600">{p.contribution_name || p.contribution?.contribution_type || "-"}</td>
                          <td className="p-3 text-sm font-semibold text-blue-700">{formatCurrency(Number(p.amount ?? (p.amount_paid || 0)))}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="p-3 text-center text-sm text-gray-500" colSpan={6}>{paymentSearch ? "No payments match your search." : "No payments found."}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {paymentsPagination.total > 0 && (
                <div className="flex flex-col items-center gap-3 px-6 py-4 border-t bg-white">
                  <span className="text-sm text-gray-600">
                    Showing <strong>{paymentsPagination.startIndex}</strong> to <strong>{paymentsPagination.endIndex}</strong> of <strong>{paymentsPagination.total}</strong> payments
                  </span>
                  <PaginationControls
                    currentPage={paymentsPagination.page}
                    totalPages={paymentsPagination.totalPages}
                    onPageChange={paymentsPagination.setPage}
                  />
                </div>
              )}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 px-6 pb-6">
                <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
                  <div className="text-sm font-semibold mb-2">Total payments per month</div>
                  <CanvasLine
                    points={Object.entries(paymentsPagination.searched.reduce((acc, p) => {
                      const k = monthKey(p.date || p.payment_date);
                      acc[k] = (acc[k] || 0) + (Number(p.amount ?? (p.amount_paid || 0)) || 0);
                      return acc;
                    }, {})).sort().map(([k, v]) => ({ x: monthLabel(k), y: Number(v) }))}
                  />
                </div>
                <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
                  <div className="text-sm font-semibold mb-2">Total payments by grade level</div>
                  <CanvasBar
                    data={Object.entries(paymentsPagination.searched.reduce((acc, p) => {
                      const g = p.grade_level_name || p.student?.grade_level?.name || "-";
                      acc[g] = (acc[g] || 0) + (Number(p.amount ?? (p.amount_paid || 0)) || 0);
                      return acc;
                    }, {})).map(([label, value]) => ({ label, value }))}
                    valueKey="value"
                    labelKey="label"
                    color="#0ea5e9"
                  />
                </div>
              </div>
            </section>
          )}
          {activeTab === "donations" && (
            <section className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
              <div className="flex flex-wrap gap-4 items-center px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-white/40">
                <div>
                  <h2 className="text-2xl font-semibold text-slate-900">Donation Records</h2>
                </div>
                <div className="ml-auto flex flex-wrap items-center gap-3">
                  <div className="inline-flex items-center rounded-full border border-slate-200 bg-white/80 p-1 shadow-sm">
                    {[
                      { key: "cash", label: "Cash" },
                      { key: "in-kind", label: "In-Kind" },
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setDonationTypeTab(tab.key)}
                        className={`px-4 py-1.5 text-sm font-semibold rounded-full transition ${donationTypeTab === tab.key
                          ? "bg-blue-600 text-white shadow"
                          : "text-slate-500 hover:text-blue-600"
                          }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleExportDonations}
                      disabled={!donationsPagination.searched.length}
                      className="px-4 py-2 text-sm border border-blue-200 rounded-full bg-blue-50 text-blue-600 shadow-sm hover:bg-blue-100 transition disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      Export CSV
                    </button>
                    <div className="relative w-full md:w-72">
                      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={donationSearch}
                        onChange={(e) => setDonationSearch(e.target.value)}
                        placeholder="Search donor, type, amount..."
                        className="w-full rounded-full border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleClearDonationSearch}
                      disabled={!donationSearch}
                      className="px-4 py-2 text-sm border border-blue-200 rounded-full bg-white/90 shadow-sm hover:bg-blue-50 hover:text-blue-700 transition disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      Clear Search
                    </button>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wide text-[11px]">
                    {donationTypeTab === "in-kind" ? (
                      <tr>
                        <th className="px-4 py-3 text-left">Date</th>
                        <th className="px-4 py-3 text-left">Donated By</th>
                        <th className="px-4 py-3 text-left">Item Type</th>
                        <th className="px-4 py-3 text-left">Details</th>
                        <th className="px-4 py-3 text-center">Quantity Used</th>
                        <th className="px-4 py-3 text-center">Qty Remaining</th>
                        <th className="px-4 py-3 text-left">Status & Notes</th>
                        <th className="px-4 py-3 text-left">Received By</th>
                      </tr>
                    ) : (
                      <tr>
                        <th className="px-4 py-3 text-left">Date & Time</th>
                        <th className="px-4 py-3 text-left">Donated By</th>
                        <th className="px-4 py-3 text-left">Amount</th>
                        <th className="px-4 py-3 text-left">Received By</th>
                      </tr>
                    )}
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {donationsPagination.total > 0 && donationsPagination.paginated.length ? (
                      donationsPagination.paginated.map((d) => {
                        const preciseDonationDate = d.timestamp || d.date || d.donation_date;

                        if (donationTypeTab === "in-kind") {
                          const status = d.usage_status || "Available";
                          const statusTone = donationStatusTone(status);
                          const statusDotTone = donationStatusDot(status);
                          const totalQty = Number(d.donation_quantity ?? 0) || 0;
                          const usedQty = Number(d.used_quantity ?? 0) || 0;
                          const usableQty = Number(d.usable_quantity ?? 0) || 0;
                          const damagedQty = Number(d.damaged_quantity ?? 0) || 0;
                          const unusableQty = Number(d.unusable_quantity ?? 0) || 0;
                          const computedRemaining = usableQty || Math.max(totalQty - usedQty - damagedQty - unusableQty, 0);
                          return (
                            <tr key={`don-${d.id}`} className="bg-white hover:bg-slate-50">
                              <td className="px-4 py-3 text-slate-700 font-semibold">
                                {formatDateTime(preciseDonationDate)}
                              </td>
                              <td className="px-4 py-3 font-medium text-slate-900">{d.donated_by || "-"}</td>
                              <td className="px-4 py-3 text-slate-600">{d.item_type || "—"}</td>
                              <td className="px-4 py-3 text-slate-600">{d.details || d.donation_description || "-"}</td>
                              <td className="px-4 py-3 text-center text-amber-600 font-semibold">{formatQty(usedQty)}</td>
                              <td className="px-4 py-3 text-center text-emerald-600 font-semibold">{formatQty(computedRemaining)}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <span className={`h-2.5 w-2.5 rounded-full ${statusDotTone}`} aria-hidden />
                                  <p className={`text-sm font-semibold ${statusTone}`}>{status}</p>
                                </div>
                                <div className="mt-2 text-xs text-slate-500 space-y-0.5">
                                  <p><span className="font-semibold text-emerald-600">Usable:</span> {formatQty(usableQty)}</p>
                                  <p><span className="font-semibold text-amber-600">Damaged:</span> {formatQty(damagedQty)}</p>
                                  <p><span className="font-semibold text-rose-600">Unusable:</span> {formatQty(unusableQty)}</p>
                                </div>
                                {d.usage_notes && <p className="mt-2 text-xs text-slate-400 italic">{d.usage_notes}</p>}
                              </td>
                              <td className="px-4 py-3 text-slate-500">{d.received_by || "-"}</td>
                            </tr>
                          );
                        }

                        return (
                          <tr key={`don-${d.id}`} className="bg-white hover:bg-slate-50">
                            <td className="px-4 py-3 text-slate-700 font-semibold text-slate-900">
                              {formatDateTime(preciseDonationDate)}
                            </td>
                            <td className="px-4 py-3 font-medium text-slate-900">{d.donated_by || "-"}</td>
                            <td className="px-4 py-3 font-semibold text-violet-600">{formatCurrency(Number(d.amount ?? (d.donation_amount || 0)))}</td>
                            <td className="px-4 py-3 text-slate-500">{d.received_by || "-"}</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td className="px-4 py-6 text-center text-slate-500" colSpan={donationTypeTab === "in-kind" ? 11 : 4}>
                          {donationSearch
                            ? "No donations match your search."
                            : donationTypeTab === "cash"
                              ? "No cash donations found."
                              : "No in-kind donations found."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {donationsPagination.total > 0 && (
                <div className="flex flex-col items-center gap-2 border-t border-slate-100 px-6 py-4 bg-white text-center">
                  <p className="text-sm text-slate-500">
                    {donationsPagination.total === 1
                      ? "Showing 1 to 1 of 1 record"
                      : `Showing ${donationsPagination.startIndex} to ${donationsPagination.endIndex} of ${donationsPagination.total} records`}
                  </p>
                  <MinimalPager
                    currentPage={donationsPagination.page}
                    totalPages={donationsPagination.totalPages}
                    onPageChange={donationsPagination.setPage}
                  />
                </div>
              )}
            </section>
          )}
          {activeTab === "expenses" && (
            <section className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-white/60">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-lg font-semibold text-slate-900">Expenses Report</h2>
                    <div className="flex flex-wrap gap-2 items-center ml-auto">
                      <button
                        type="button"
                        onClick={handleExportExpenses}
                        disabled={!expensesPagination.searched.length}
                        className="px-4 py-2 text-sm border border-blue-200 rounded-full bg-blue-50 text-blue-600 shadow-sm hover:bg-blue-100 transition disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        Export CSV
                      </button>
                      <div className="relative w-full md:w-64">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={expensesSearch}
                          onChange={(e) => setExpensesSearch(e.target.value)}
                          placeholder="Search expense, source, or description..."
                          className="w-full rounded-full border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleClearExpensesSearch}
                        disabled={!expensesSearch}
                        className="px-4 py-2 text-sm border border-blue-200 rounded-full bg-white/90 shadow-sm hover:bg-blue-50 hover:text-blue-700 transition disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        Clear Search
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <div className="inline-flex items-center rounded-full border border-slate-200 bg-white/80 p-1 shadow-sm">
                      {["all", "funds", "in-kind"].map((tabKey) => {
                        const isActive = expensesTab === tabKey;
                        const labels = { all: "All", funds: "Funds", "in-kind": "In-Kind" };
                        return (
                          <button
                            key={tabKey}
                            type="button"
                            onClick={() => setExpensesTab(tabKey)}
                            className={`px-4 py-1.5 text-sm font-semibold rounded-full transition ${isActive
                              ? "bg-blue-600 text-white shadow"
                              : "text-slate-500 hover:text-blue-600"
                              }`}
                          >
                            {labels[tabKey]}
                          </button>
                        );
                      })}
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full border border-blue-100 bg-blue-50/90 px-3 py-1 text-xs font-semibold text-blue-600">
                      {expensesPagination.total} item{expensesPagination.total === 1 ? "" : "s"} shown
                    </span>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wide text-[11px]">
                    {expensesTab === "in-kind" ? (
                      <tr>
                        <th className="px-4 py-3 text-left">Donation Type</th>
                        <th className="px-4 py-3 text-left">Item Type</th>
                        <th className="px-4 py-3 text-left">Expense Category</th>
                        <th className="px-4 py-3 text-left">Date & Time</th>
                        <th className="px-4 py-3 text-left">Used</th>
                        <th className="px-4 py-3 text-left">Expense Description</th>
                      </tr>
                    ) : (
                      <tr>
                        <th className="px-4 py-3 text-left">Expense Category</th>
                        <th className="px-4 py-3 text-left">Amount</th>
                        <th className="px-4 py-3 text-left">Date & Time</th>
                        <th className="px-4 py-3 text-left">Contribution / Source</th>
                        <th className="px-4 py-3 text-left">Expense Description</th>
                      </tr>
                    )}
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {expensesPagination.total ? (
                      expensesPagination.paginated.map((expense) => {
                        const preciseExpenseDate = expense.timestamp || expense.date || expense.expense_date;

                        if (expensesTab === "in-kind") {
                          const rawDescription = expense.description || "-";
                          const qtyMatch = rawDescription.match(/\(Qty\s*Used:\s*([0-9]+(?:\.[0-9]+)?)\)/i);
                          const cleanedDescription = rawDescription
                            .replace(/\(Qty\s*Used:[^)]*\)/i, "")
                            .replace(/\(Estimated:[^)]*\)/i, "")
                            .trim() || "-";
                          return (
                            <tr key={`expense-${expense.id}`} className="bg-white hover:bg-slate-50">
                              <td className="px-4 py-3 text-slate-700">{expense.donation?.donation_type ? expense.donation.donation_type.replace(/\b\w/g, (c) => c.toUpperCase()) : "In-Kind"}</td>
                              <td className="px-4 py-3 text-slate-700">{expense.donation?.item_type || "-"}</td>
                              <td className="px-4 py-3 text-slate-700">{expense.expense_type || "-"}</td>
                              <td className="px-4 py-3 text-slate-600 font-semibold text-slate-900">
                                {formatDateTime(preciseExpenseDate)}
                              </td>
                              <td className="px-4 py-3 font-semibold text-slate-800">{qtyMatch ? qtyMatch[1] : "-"}</td>
                              <td className="px-4 py-3 text-slate-600">{cleanedDescription}</td>
                            </tr>
                          );
                        }

                        return (
                          <tr key={`expense-${expense.id}`} className="bg-white hover:bg-slate-50">
                            <td className="px-4 py-3 text-slate-700">{expense.expense_type || "-"}</td>
                            <td className="px-4 py-3 font-semibold text-emerald-600">{formatCurrency(Number(expense.amount || 0))}</td>
                            <td className="px-4 py-3 text-slate-600 font-semibold text-slate-900">
                              {formatDateTime(preciseExpenseDate)}
                            </td>
                            <td className="px-4 py-3 text-slate-600">{expense.contribution?.contribution_type || (expense.donation ? "Donation" : "Cash Pool")}</td>
                            <td className="px-4 py-3 text-slate-600">{expense.description || expense.donation?.donation_description || "-"}</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td
                          className="px-4 py-6 text-center text-slate-500"
                          colSpan={expensesTab === "in-kind" ? 6 : 5}
                        >
                          {expensesSearch ? "No expenses match your search." : "No expenses found."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {expensesPagination.total > 0 && (
                <div className="flex flex-col items-center gap-2 border-t border-slate-100 px-6 py-4 bg-white text-center">
                  <p className="text-sm text-slate-500">
                    Showing {expensesPagination.startIndex} to {expensesPagination.endIndex} of {expensesPagination.total}
                  </p>
                  <MinimalPager
                    currentPage={expensesPagination.page}
                    totalPages={expensesPagination.totalPages}
                    onPageChange={expensesPagination.setPage}
                  />
                </div>
              )}
            </section>
          )}
          {activeTab === "funds" && (
            <section className="relative overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
              <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-800">Fund History</h2>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleExportFunds}
                    disabled={!fundsPagination.searched.length}
                    className="px-4 py-2 text-sm border border-blue-200 rounded-xl bg-blue-50 text-blue-600 shadow-sm hover:bg-blue-100 transition disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Export CSV
                  </button>
                  <div>
                    <label className="text-[11px] uppercase tracking-[0.1em] text-slate-400">Year</label>
                    <select
                      value={fundYearFilter}
                      onChange={(e) => setFundYearFilter(e.target.value)}
                      className="mt-1 w-28 min-w-[110px] rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    >
                      <option value="">All</option>
                      {Array.from(new Set(fundList.map((f) => yearKey(f.date || f.fund_date)))).map((yearOption) => (
                        <option key={yearOption} value={yearOption}>{yearOption}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] uppercase tracking-[0.1em] text-slate-400">Month</label>
                    <select
                      value={fundMonthFilter}
                      onChange={(e) => setFundMonthFilter(e.target.value)}
                      className="mt-1 w-32 min-w-[130px] rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    >
                      <option value="">All</option>
                      {MONTH_OPTIONS.map((month) => (
                        <option key={month.value} value={month.value}>{month.label}</option>
                      ))}
                    </select>
                  </div>
                  {(fundMonthFilter || fundYearFilter) && (
                    <button
                      type="button"
                      onClick={() => {
                        setFundMonthFilter("");
                        setFundYearFilter("");
                      }}
                      className="text-sm font-medium text-blue-600 transition hover:text-blue-700"
                    >
                      Clear
                    </button>
                  )}
                  <div className="flex flex-wrap items-center gap-1">
                    <div className="relative w-full min-w-[200px] sm:w-64">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></span>
                      <input
                        type="text"
                        value={fundSearch}
                        onChange={(e) => setFundSearch(e.target.value)}
                        placeholder="Search year or month..."
                        className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleClearFundSearch}
                      disabled={!fundSearch}
                      className="px-4 py-2 text-sm border border-blue-200 rounded-xl bg-white/90 shadow-sm hover:bg-blue-50 hover:text-blue-700 transition disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      Clear Search
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 border-b border-slate-100 px-6 py-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-slate-100 bg-white/80 p-4 shadow-sm">
                  <p className="text-xs text-slate-500">Total Payments</p>
                  <p className="text-xl font-semibold text-blue-700">{formatCurrency(fundsSearchTotals.payments)}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-white/80 p-4 shadow-sm">
                  <p className="text-xs text-slate-500">Total Donations (Cash)</p>
                  <p className="text-xl font-semibold text-purple-700">{formatCurrency(fundsSearchTotals.donations)}</p>
                  <p className="text-xs text-slate-400">(+ {formatQty(fundsSearchTotals.inKind)} in-kind)</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-white/80 p-4 shadow-sm">
                  <p className="text-xs text-slate-500">Total Expenses</p>
                  <p className="text-xl font-semibold text-rose-600">{formatCurrency(fundsSearchTotals.expenses)}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-white/80 p-4 shadow-sm">
                  <p className="text-xs text-slate-500">Available Funds</p>
                  <p className="text-xl font-semibold text-emerald-600">{formatCurrency(fundsSearchTotals.available)}</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm text-slate-700">
                  <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.2em] text-slate-500">
                    <tr>
                      <th className="px-5 py-3 text-left">Date & Time</th>
                      <th className="px-5 py-3 text-right">Payments</th>
                      <th className="px-5 py-3 text-right">Donations</th>
                      <th className="px-5 py-3 text-right">Expenses</th>
                      <th className="px-5 py-3 text-right">Funds Before</th>
                      <th className="px-5 py-3 text-right">Funds After</th>
                      <th className="px-5 py-3 text-left">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {fundsPagination.total ? (
                      <>
                        {fundsPagination.paginated.map((history, idx) => {
                          const amount = Number(history?.amount || 0) || 0;
                          const isPayment = Boolean(history?.payment_id);
                          const isDonation = Boolean(history?.donation_id);
                          const donationType = (history?.donation_type || '').toLowerCase();
                          const isInKindDonation = isDonation && donationType === 'in-kind';
                          const isExpense = !isPayment && !isDonation;
                          const usesInKind = Boolean(history?.expense_in_kind);
                          const inKindUsed = usesInKind
                            ? formatQty(history?.expense_in_kind_used ?? history?.amount ?? 0)
                            : null;
                          const fundDate = history?.timestamp || history?.date || history?.fund_date;

                          return (
                            <tr key={`fund-${history?.id}-${idx}`} className="transition hover:bg-blue-50/60">
                              <td className="px-5 py-3 font-semibold text-slate-800">
                                {formatDateTime(fundDate)}
                              </td>
                              <td className="px-5 py-3 text-right font-semibold text-blue-700">{isPayment ? formatCurrency(amount) : '—'}</td>
                              <td className="px-5 py-3 text-right font-semibold text-purple-700">
                                {isDonation
                                  ? isInKindDonation
                                    ? `${formatCurrency(amount)} (In-Kind)`
                                    : formatCurrency(amount)
                                  : usesInKind
                                    ? 'In-Kind'
                                    : '—'}
                              </td>
                              <td className="px-5 py-3 text-right font-semibold text-rose-600">{isExpense ? formatCurrency(amount) : '—'}</td>
                              <td className="px-5 py-3 text-right text-slate-600">{formatCurrency(Number(history?.balance_before || history?.fund_before || 0))}</td>
                              <td className="px-5 py-3 text-right text-slate-600">{formatCurrency(Number(history?.balance_after || history?.fund_after || 0))}</td>
                              <td className="px-5 py-3">
                                <div className="flex flex-col gap-1 text-xs text-slate-500">
                                  {isPayment && (
                                    <span className="inline-flex items-center gap-2 text-blue-600">
                                      <span className="inline-flex h-6 items-center rounded-full bg-blue-50 px-3 text-[11px] font-semibold uppercase tracking-wide">Payment</span>
                                      {history?.student_name && <span className="text-slate-500">{history.student_name}</span>}
                                    </span>
                                  )}

                                  {isDonation && (
                                    <span className="inline-flex flex-wrap items-center gap-2 text-purple-600">
                                      <span className="inline-flex h-6 items-center rounded-full bg-purple-50 px-3 text-[11px] font-semibold uppercase tracking-wide">
                                        Donation {isInKindDonation ? 'In-Kind' : 'Cash'}
                                      </span>
                                      {history?.donated_by && (
                                        <span className="text-slate-500">
                                          Donated by: <span className="font-medium text-slate-700">{history.donated_by}</span>
                                        </span>
                                      )}
                                    </span>
                                  )}

                                  {isExpense && (
                                    <span className="inline-flex flex-col gap-1 text-rose-600">
                                      <span className="inline-flex h-6 items-center self-start rounded-full bg-rose-50 px-3 text-[11px] font-semibold uppercase tracking-wide">Expense</span>
                                      {history?.expense_type && <span className="text-slate-500">{history.expense_type}</span>}
                                      {history?.expense_description && (
                                        <span className="text-slate-500">
                                          <span className="font-medium text-slate-700">Expense Description:</span> {history.expense_description}
                                        </span>
                                      )}
                                      {usesInKind && (
                                        <div className="space-y-1 text-slate-500">
                                          {history?.expense_in_kind_item_type && (
                                            <p>
                                              <span className="font-medium text-slate-700">Item Type:</span> {history.expense_in_kind_item_type}
                                            </p>
                                          )}
                                          <p>
                                            <span className="font-medium text-slate-700">Used:</span> {inKindUsed}
                                          </p>
                                          {(history?.expense_in_kind_donor || history?.expense_in_kind_notes) && (
                                            <p>
                                              {history?.expense_in_kind_donor && `From ${history.expense_in_kind_donor}`}
                                              {history?.expense_in_kind_notes ? `${history?.expense_in_kind_donor ? ' – ' : ''}${history.expense_in_kind_notes}` : ''}
                                            </p>
                                          )}
                                        </div>
                                      )}
                                      {!usesInKind && history?.expense_source_label && (
                                        <span className="text-slate-500">
                                          {history?.expense_source_type === 'contribution'
                                            ? (
                                              <>
                                                <span className="font-medium text-slate-700">Contribution:</span> {history.expense_source_label}
                                              </>
                                            )
                                            : history.expense_source_label}
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
                          <td className="px-5 py-3 text-right font-semibold text-blue-700">{formatCurrency(fundsSearchTotals.payments)}</td>
                          <td className="px-5 py-3 text-right font-semibold text-purple-700">
                            {formatCurrency(fundsSearchTotals.donations)}
                            {fundsSearchTotals.inKind > 0 && (
                              <span className="ml-1 text-[11px] text-slate-400">
                                (+ {formatQty(fundsSearchTotals.inKind)} in-kind)
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3 text-right font-semibold text-rose-600">{formatCurrency(fundsSearchTotals.expenses)}</td>
                          <td className="px-5 py-3 text-right text-slate-600">{formatCurrency(Number((fundsPagination.paginated.at(-1)?.balance_before) || 0))}</td>
                          <td className="px-5 py-3 text-right text-slate-600">{formatCurrency(Number((fundsPagination.paginated.at(-1)?.balance_after) || 0))}</td>
                          <td className="px-5 py-3" />
                        </tr>
                      </>
                    ) : (
                      <tr>
                        <td colSpan={7} className="px-5 py-10 text-center text-slate-400">
                          No fund history recorded.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {fundsPagination.total > 0 && (
                <div className="flex flex-col items-center gap-2 border-t border-slate-100 px-6 py-4 text-sm text-slate-500">
                  <span>
                    {fundsPagination.total === 0
                      ? 'Showing 0 records'
                      : `Showing ${fundsPagination.startIndex} to ${fundsPagination.endIndex} of ${fundsPagination.total} records`}
                  </span>
                  <PaginationControls
                    currentPage={fundsPagination.page}
                    totalPages={fundsPagination.totalPages}
                    onPageChange={fundsPagination.setPage}
                  />
                </div>
              )}
            </section>
          )}
          {activeTab === "students" && (
            <section className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b bg-gray-50">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">Student Balance Report</h2>
                  </div>
                  <div className="flex flex-wrap gap-3 items-center">
                    <button
                      type="button"
                      onClick={handleExportStudents}
                      disabled={!studentPagination.searched.length}
                      className="px-4 py-2 text-sm border border-blue-200 rounded-full bg-blue-50 text-blue-600 shadow-sm hover:bg-blue-100 transition disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      Export CSV
                    </button>
                    {[
                      {
                        label: "Records",
                        value: formatQty(studentPagination.searched.length),
                        accent: "text-blue-600",
                        border: "border-blue-100",
                        bg: "bg-blue-50",
                      },
                      {
                        label: "Total Paid",
                        value: formatCurrency(studentStats.totalPaid),
                        accent: "text-emerald-600",
                        border: "border-emerald-100",
                        bg: "bg-emerald-50",
                      },
                      {
                        label: "Total Balance",
                        value: formatCurrency(studentStats.totalBalance),
                        accent: "text-rose-600",
                        border: "border-rose-100",
                        bg: "bg-rose-50",
                      },
                    ].map(({ label, value, accent, border, bg }) => (
                      <div
                        key={label}
                        className={`flex flex-col rounded-2xl border ${border} ${bg}/60 px-5 py-3 shadow-[0_12px_30px_rgba(15,23,42,0.05)] min-w-[170px] sm:min-w-[190px]`}
                      >
                        <span className="text-xs uppercase tracking-[0.15em] text-slate-400">{label}</span>
                        <span className={`text-lg font-semibold ${accent}`}>{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {studentGradeOptions.length > 0 && (
                <div className="px-5 py-3 border-b border-slate-100 bg-white/70">
                  <div className="flex flex-wrap gap-2">
                    {[{ label: "All Grades", value: "" }, ...studentGradeOptions.map((grade) => ({ label: grade, value: grade }))].map((option) => {
                      const isActive = studentGradeTab === option.value;
                      return (
                        <button
                          key={option.value || "all"}
                          type="button"
                          onClick={() => setStudentGradeTab(option.value)}
                          className={`px-4 py-1.5 text-sm font-semibold rounded-full border transition ${isActive
                            ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm"
                            : "border-slate-200 bg-slate-50 text-slate-500 hover:text-blue-600"
                            }`}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className="divide-y divide-slate-100">
                {filteredStudentGroups.length ? (
                  filteredStudentGroups.map(({ grade, sections }) => (
                    <div key={grade} className="px-5 py-4">
                      <div className="flex items-center gap-3 pb-3">
                        <h3 className="text-lg font-semibold text-slate-900">{grade}</h3>
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
                          {sections.reduce((count, [, students]) => count + students.length, 0)} students
                        </span>
                      </div>
                      <div className="grid gap-4">
                        {sections.map(([section, students]) => (
                          <div key={`${grade}-${section}`} className="rounded-2xl border border-slate-100 bg-white shadow-sm">
                            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                              <div>
                                <p className="text-sm font-semibold text-slate-900">
                                  Section: {section}
                                </p>
                                <p className="text-xs text-slate-500">{students.length} student{students.length === 1 ? "" : "s"}</p>
                              </div>
                              <div className="text-right text-xs text-slate-500">
                                <p>
                                  Paid {formatCurrency(students.reduce((sum, s) => sum + s.totalPaymentsValue, 0))}
                                </p>
                                <p className="text-rose-600 font-semibold">
                                  Balance {formatCurrency(students.reduce((sum, s) => sum + s.balanceValue, 0))}
                                </p>
                              </div>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wide text-[11px]">
                                  <tr>
                                    <th className="p-3 text-left">Student</th>
                                    <th className="p-3 text-left">Guardian</th>
                                    <th className="p-3 text-right">Payments</th>
                                    <th className="p-3 text-right">Balance</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {students.map((s) => (
                                    <tr key={`${s.student_name}-${s.section}`} className="odd:bg-white even:bg-slate-50">
                                      <td className="p-3 font-medium text-slate-900">{s.student_name}</td>
                                      <td className="p-3 text-slate-500">{s.guardian}</td>
                                      <td className="p-3 text-right text-blue-700 font-semibold">{formatCurrency(s.totalPaymentsValue)}</td>
                                      <td className={`p-3 text-right font-semibold ${s.balanceValue > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                                        {formatCurrency(s.balanceValue)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-5 text-center text-sm text-slate-500">
                    {studentTableSearch || studentGradeTab
                      ? "No students match your filters."
                      : "No student balance data available."}
                  </div>
                )}
              </div>
              {studentPagination.total > 0 && (
                <div className="flex flex-col items-center gap-3 px-5 py-4 border-t bg-white">
                  <span className="text-sm text-gray-600">
                    Showing <strong>{studentPagination.startIndex}</strong> to <strong>{studentPagination.endIndex}</strong> of <strong>{studentPagination.total}</strong> students
                  </span>
                  <PaginationControls
                    currentPage={studentPagination.page}
                    totalPages={studentPagination.totalPages}
                    onPageChange={studentPagination.setPage}
                  />
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}