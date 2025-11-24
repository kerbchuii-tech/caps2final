import React, { useEffect, useMemo, useState } from "react";
import { usePage } from "@inertiajs/react";
import AuditorLayout from "@/Layouts/AuditorLayout";
import { CreditCard, Gift, TrendingDown, XCircle, Search } from "lucide-react";

const SummaryCard = ({ title, value, description, accent = "from-gray-50 via-white to-gray-100" }) => (
  <div className={`rounded-2xl border border-gray-100 bg-gradient-to-br ${accent} p-5 shadow-sm`}> 
    <p className="text-sm font-semibold text-gray-600">{title}</p>
    <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
    {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
  </div>
);

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

const exportCSV = (rows = [], headers = [], filename = "report.csv") => {
  if (!rows.length || typeof window === "undefined") return;
  const csv = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => JSON.stringify(row[header] ?? "")).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export default function Reports() {
  const { payments, donations, expenses, totals, fundsHistories = [], studentBalances = [], auditLogs = [], financial = {} } = usePage().props;

  const [selectedStudent, setSelectedStudent] = useState(null);
  const [activeTab, setActiveTab] = useState("overview"); // ✅ default tab
  const [filterType, setFilterType] = useState("month");
  const [filterMonth, setFilterMonth] = useState(() => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    return `${now.getFullYear()}-${month}`;
  });
  const [filterYear, setFilterYear] = useState(() => String(new Date().getFullYear()));
  const [filterStart, setFilterStart] = useState("");
  const [filterEnd, setFilterEnd] = useState("");

  const [paymentPage, setPaymentPage] = useState(1);
  const [donationPage, setDonationPage] = useState(1);
  const [expensePage, setExpensePage] = useState(1);
  const [expensesScope, setExpensesScope] = useState("all");
  const [paymentSearch, setPaymentSearch] = useState("");
  const [donationSearch, setDonationSearch] = useState("");
  const [expenseSearch, setExpenseSearch] = useState("");
  const [fundSearch, setFundSearch] = useState("");
  const [auditSearch, setAuditSearch] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [donationTypeTab, setDonationTypeTab] = useState("cash");
  const [fundPage, setFundPage] = useState(1);
  const [auditPage, setAuditPage] = useState(1);
  const [studentPage, setStudentPage] = useState(1);
  const pageSize = 10;

  const formatCurrency = (value) =>
    `₱${parseFloat(value || 0).toLocaleString("en-PH", {
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

  const sortedPayments = payments?.data || [];
  const sortedDonations = donations?.data || [];
  const sortedExpenses = expenses?.data || [];
  const fundList = Array.isArray(fundsHistories) ? fundsHistories : [];
  const auditList = Array.isArray(auditLogs) ? auditLogs : [];
  const studentList = Array.isArray(studentBalances) ? studentBalances : [];

  const matchesFilters = (dateStr) => {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return false;

    switch (filterType) {
      case "year":
        return date.getFullYear().toString() === filterYear;
      case "dateRange": {
        if (!filterStart && !filterEnd) return true;
        const start = filterStart ? new Date(filterStart) : null;
        const end = filterEnd ? new Date(filterEnd) : null;
        if (start && date < start) return false;
        if (end) {
          end.setHours(23, 59, 59, 999);
          if (date > end) return false;
        }
        return true;
      }
      case "month":
      default: {
        if (!filterMonth) return true;
        const [year, month] = filterMonth.split("-").map(Number);
        return date.getFullYear() === year && date.getMonth() + 1 === month;
      }
    }
  };

  const filteredFunds = useMemo(
    () =>
      fundList.filter((entry) =>
        matchesFilters(entry?.fund_timestamp || entry?.date || entry?.fund_date)
      ),
    [fundList, matchesFilters]
  );

  const filteredAuditLogs = useMemo(
    () => auditList.filter((entry) => matchesFilters(entry?.date)),
    [auditList, matchesFilters]
  );

  const studentPaymentsMap = useMemo(() => {
    const reference = new Map();
    sortedPayments.forEach((payment) => {
      const studentName = payment?.student?.name;
      if (!studentName) return;
      if (!reference.has(studentName)) {
        reference.set(studentName, []);
      }
      reference.get(studentName).push(payment);
    });
    return reference;
  }, [sortedPayments]);

  const filteredStudents = useMemo(() => {
    return studentList.filter((student) => {
      const paymentsForStudent = studentPaymentsMap.get(student.student_name) || [];
      return paymentsForStudent.some((payment) => matchesFilters(payment?.date));
    });
  }, [studentList, studentPaymentsMap, matchesFilters]);

  const basePayments = useMemo(
    () => sortedPayments.filter((p) => matchesFilters(p.date)),
    [sortedPayments, matchesFilters]
  );
  const filteredPayments = useMemo(() => {
    if (!selectedStudent) return basePayments;
    return basePayments.filter((p) => p.student?.name === selectedStudent);
  }, [basePayments, selectedStudent]);

  const filteredDonations = useMemo(
    () => sortedDonations.filter((d) => matchesFilters(d.donation_date)),
    [sortedDonations, matchesFilters]
  );

  const donationsByType = useMemo(() => {
    const tabIsInKind = donationTypeTab === "in-kind";
    return filteredDonations.filter((d) => {
      const type = (d.donation_type || "").toLowerCase();
      return tabIsInKind ? type === "in-kind" : type !== "in-kind";
    });
  }, [filteredDonations, donationTypeTab]);

  const expensesWithinFilters = useMemo(
    () => sortedExpenses.filter((e) => matchesFilters(e.date)),
    [sortedExpenses, matchesFilters]
  );

  const fundsExpenses = useMemo(
    () =>
      expensesWithinFilters.filter(
        (expense) =>
          !expense?.donation ||
          (expense.donation?.donation_type || "").toLowerCase() !== "in-kind"
      ),
    [expensesWithinFilters]
  );

  const inKindExpenses = useMemo(
    () =>
      expensesWithinFilters.filter(
        (expense) => (expense?.donation?.donation_type || "").toLowerCase() === "in-kind"
      ),
    [expensesWithinFilters]
  );

  const scopedExpenses = useMemo(() => {
    switch (expensesScope) {
      case "funds":
        return fundsExpenses;
      case "in-kind":
        return inKindExpenses;
      default:
        return expensesWithinFilters;
    }
  }, [expensesScope, expensesWithinFilters, fundsExpenses, inKindExpenses]);

  const searchedPayments = useMemo(() => {
    const term = paymentSearch.trim().toLowerCase();
    if (!term) return filteredPayments;
    return filteredPayments.filter((p) =>
      [
        p.student?.name,
        typeof p.contribution === "object"
          ? p.contribution?.contribution_type
          : p.contribution,
        p.amount,
        p.date,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [filteredPayments, paymentSearch]);

  const searchedDonations = useMemo(() => {
    const term = donationSearch.trim().toLowerCase();
    const base = donationsByType;
    if (!term) return base;
    return base.filter((d) =>
      [
        d.donated_by,
        d.donation_type,
        d.donation_amount,
        d.donation_description,
        d.received_by,
        d.donation_date,
        d.item_type,
        d.usage_status,
        d.usage_notes,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [donationsByType, donationSearch]);

  const searchedExpenses = useMemo(() => {
    const term = expenseSearch.trim().toLowerCase();
    if (!term) return scopedExpenses;
    return scopedExpenses.filter((e) =>
      [
        e.expense_type,
        e.amount,
        e.date,
        e.description,
        typeof e.contribution === "object"
          ? e.contribution?.contribution_type
          : e.contribution,
        e.donation?.donation_type,
        e.donation?.donated_by,
        e.donation?.item_type,
        e.donation?.donation_description,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [scopedExpenses, expenseSearch]);

  const searchedFunds = useMemo(() => {
    const term = fundSearch.trim().toLowerCase();
    const base = filteredFunds;
    if (!term) return base;
    return base.filter((h) => [
      h.type,
      h.donation_type,
      h.details,
      h.amount,
      h.fund_before,
      h.fund_after,
      h.date || h.fund_date,
    ].join(" ").toLowerCase().includes(term));
  }, [filteredFunds, fundSearch]);

  const searchedAudit = useMemo(() => {
    const term = auditSearch.trim().toLowerCase();
    const base = filteredAuditLogs;
    if (!term) return base;
    return base.filter((a) => [a.type, a.details, a.amount, a.date].join(" ").toLowerCase().includes(term));
  }, [filteredAuditLogs, auditSearch]);

  const searchedStudents = useMemo(() => {
    const term = studentSearch.trim().toLowerCase();
    const base = filteredStudents;
    if (!term) return base;
    return base.filter((s) => [s.student_name, s.total_payments, s.balance].join(" ").toLowerCase().includes(term));
  }, [filteredStudents, studentSearch]);

  const fundTotals = useMemo(() => {
    let paymentsSum = 0;
    let donationsSum = 0;
    let expensesSum = 0;
    let inKindCount = 0;
    filteredFunds.forEach((entry) => {
      const type = (entry?.type || '').toLowerCase();
      const donationType = (entry?.donation_type || '').toLowerCase();
      const amount = Number(entry?.amount || 0);
      if (type === 'payment') {
        paymentsSum += amount;
      } else if (type === 'donation') {
        if (donationType === 'in-kind') {
          inKindCount += 1;
        } else {
          donationsSum += amount;
        }
      } else if (type === 'expense') {
        expensesSum += amount;
      }
    });
    return {
      payments: paymentsSum,
      donations: donationsSum,
      expenses: expensesSum,
      inKind: inKindCount,
      available: paymentsSum + donationsSum - expensesSum,
    };
  }, [filteredFunds]);

  const fundsSearchTotals = useMemo(() => {
    let paymentsSum = 0;
    let donationsSum = 0;
    let expensesSum = 0;
    let inKindCount = 0;
    searchedFunds.forEach((entry) => {
      const type = (entry?.type || '').toLowerCase();
      const donationType = (entry?.donation_type || '').toLowerCase();
      const amount = Number(entry?.amount || 0);
      if (type === 'payment') {
        paymentsSum += amount;
      } else if (type === 'donation') {
        if (donationType === 'in-kind') {
          inKindCount += 1;
        } else {
          donationsSum += amount;
        }
      } else if (type === 'expense') {
        expensesSum += amount;
      }
    });
    return {
      payments: paymentsSum,
      donations: donationsSum,
      expenses: expensesSum,
      inKind: inKindCount,
      available: paymentsSum + donationsSum - expensesSum,
    };
  }, [searchedFunds]);

  const lastSearchedFund = searchedFunds.length ? searchedFunds[searchedFunds.length - 1] : null;

  const paymentsPageTotal = Math.max(1, Math.ceil(searchedPayments.length / pageSize));
  const donationsPageTotal = Math.max(1, Math.ceil(searchedDonations.length / pageSize));
  const expensesPageTotal = Math.max(1, Math.ceil(searchedExpenses.length / pageSize));
  const fundsPageTotal = Math.max(1, Math.ceil(searchedFunds.length / pageSize));
  const auditPageTotal = Math.max(1, Math.ceil(searchedAudit.length / pageSize));
  const studentsPageTotal = Math.max(1, Math.ceil(searchedStudents.length / pageSize));

  const paginate = (data, page) => {
    const start = (page - 1) * pageSize;
    return data.slice(start, start + pageSize);
  };

  const paginatedPayments = useMemo(
    () => paginate(searchedPayments, paymentPage),
    [searchedPayments, paymentPage]
  );
  const paginatedDonations = useMemo(
    () => paginate(searchedDonations, donationPage),
    [searchedDonations, donationPage]
  );
  const paginatedExpenses = useMemo(
    () => paginate(searchedExpenses, expensePage),
    [searchedExpenses, expensePage]
  );
  const paginatedFunds = useMemo(
    () => paginate(searchedFunds, fundPage),
    [searchedFunds, fundPage]
  );
  const paginatedAudit = useMemo(
    () => paginate(searchedAudit, auditPage),
    [searchedAudit, auditPage]
  );
  const paginatedStudents = useMemo(
    () => paginate(searchedStudents, studentPage),
    [searchedStudents, studentPage]
  );

  const summaryText = (total, page) =>
    total === 0
      ? "Showing 0 records"
      : `Showing ${(page - 1) * pageSize + 1} to ${Math.min(page * pageSize, total)} of ${total} record${
          total === 1 ? "" : "s"
        }`;

  const clearFilters = () => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    setFilterType("month");
    setFilterMonth(`${now.getFullYear()}-${month}`);
    setFilterYear(String(now.getFullYear()));
    setFilterStart("");
    setFilterEnd("");
    setSelectedStudent(null);
    setPaymentSearch("");
    setDonationSearch("");
    setExpenseSearch("");
    setFundSearch("");
    setAuditSearch("");
    setStudentSearch("");
    setPaymentPage(1);
    setDonationPage(1);
    setExpensePage(1);
    setFundPage(1);
    setAuditPage(1);
    setStudentPage(1);
  };

  const handleExportPayments = () => {
    if (!searchedPayments.length) return;
    const rows = searchedPayments.map((payment) => {
      const paymentDate = payment.payment_timestamp || payment.date || payment.payment_date || payment.timestamp;
      return {
        Date: formatDateTime(paymentDate),
        Student: payment.student?.name || "-",
        Contribution:
          typeof payment.contribution === "object"
            ? payment.contribution?.contribution_type || "-"
            : payment.contribution || "-",
        Amount: Number(payment.amount ?? 0) || 0,
      };
    });
    exportCSV(rows, ["Date", "Student", "Contribution", "Amount"], "auditor-payments.csv");
  };

  const handleExportDonations = () => {
    if (!searchedDonations.length) return;
    if (donationTypeTab === "in-kind") {
      const rows = searchedDonations.map((donation) => {
        const totalQty = Number(donation.donation_quantity ?? 0) || 0;
        const usedQty = Number(donation.used_quantity ?? 0) || 0;
        const damagedQty = Number(donation.damaged_quantity ?? 0) || 0;
        const unusableQty = Number(donation.unusable_quantity ?? 0) || 0;
        const usableQty = Number(donation.usable_quantity ?? totalQty - usedQty - damagedQty - unusableQty);
        const remaining = Number.isNaN(usableQty) ? Math.max(totalQty - usedQty - damagedQty - unusableQty, 0) : usableQty;
        return {
          Date: formatDateTime(donation.donation_timestamp || donation.donation_date || donation.date),
          Donor: donation.donated_by || "-",
          ItemType: donation.item_type || "-",
          Details: donation.donation_description || "-",
          QtyUsed: Number.isNaN(usedQty) ? 0 : usedQty,
          QtyRemaining: Number.isNaN(remaining) ? 0 : remaining,
          Status: donation.usage_status || "Available",
          StatusNotes: donation.usage_notes || "-",
          ReceivedBy: donation.received_by || "-",
        };
      });
      exportCSV(
        rows,
        ["Date", "Donor", "ItemType", "Details", "QtyUsed", "QtyRemaining", "Status", "StatusNotes", "ReceivedBy"],
        "auditor-donations-in-kind.csv"
      );
      return;
    }

    const rows = searchedDonations.map((donation) => ({
      Date: formatDateTime(donation.donation_timestamp || donation.donation_date || donation.date),
      Donor: donation.donated_by || "-",
      Amount: Number(donation.donation_amount ?? donation.amount ?? 0) || 0,
      Details: donation.donation_description || "-",
      ReceivedBy: donation.received_by || "-",
    }));
    exportCSV(rows, ["Date", "Donor", "Amount", "Details", "ReceivedBy"], "auditor-donations-cash.csv");
  };

  const handleExportExpenses = () => {
    if (!searchedExpenses.length) return;
    if (expensesScope === "in-kind") {
      const rows = searchedExpenses.map((expense) => {
        const rawDescription = expense.description || "-";
        const qtyMatch = rawDescription.match(/\(Qty\s*Used:\s*([0-9]+(?:\.[0-9]+)?)\)/i);
        const cleanedDescription = rawDescription
          .replace(/\(Qty\s*Used:[^)]*\)/i, "")
          .replace(/\(Estimated:[^)]*\)/i, "")
          .trim() || "-";
        return {
          DonationType: expense.donation?.donation_type || "In-Kind",
          ItemType: expense.donation?.item_type || "-",
          ExpenseCategory: expense.expense_type || "-",
          DateTime: formatDateTime(expense.expense_timestamp || expense.date || expense.expense_date),
          QuantityUsed: qtyMatch ? Number(qtyMatch[1]) || 0 : 0,
          Description: cleanedDescription,
        };
      });
      exportCSV(
        rows,
        ["DonationType", "ItemType", "ExpenseCategory", "DateTime", "QuantityUsed", "Description"],
        "auditor-expenses-in-kind.csv"
      );
      return;
    }

    const rows = searchedExpenses.map((expense) => {
      const isInKind = (expense?.donation?.donation_type || "").toLowerCase() === "in-kind";
      const source = expense.contribution?.contribution_type
        ? expense.contribution.contribution_type
        : isInKind
          ? "In-Kind"
          : "Cash Donations";
      return {
        ExpenseCategory: expense.expense_type || "-",
        Amount: Number(expense.amount ?? 0) || 0,
        DateTime: formatDateTime(expense.expense_timestamp || expense.date || expense.expense_date),
        Source: source,
        Description: expense.description || expense.donation?.donation_description || "-",
      };
    });
    exportCSV(
      rows,
      ["ExpenseCategory", "Amount", "DateTime", "Source", "Description"],
      "auditor-expenses.csv"
    );
  };

  const handleExportFunds = () => {
    if (!searchedFunds.length) return;
    const rows = searchedFunds.map((history) => ({
      DateTime: formatDateTime(history.fund_timestamp || history.date || history.fund_date),
      EntryType: history.type,
      Amount: Number(history.amount ?? 0) || 0,
      BalanceBefore: Number(history.fund_before ?? 0) || 0,
      BalanceAfter: Number(history.fund_after ?? 0) || 0,
      Details: history.details || "-",
    }));
    exportCSV(
      rows,
      ["DateTime", "EntryType", "Amount", "BalanceBefore", "BalanceAfter", "Details"],
      "auditor-funds-history.csv"
    );
  };

  const handleExportAudit = () => {
    if (!searchedAudit.length) return;
    const rows = searchedAudit.map((entry) => ({
      DateTime: formatDateTime(entry.date),
      Type: entry.type,
      Details: entry.details,
      Amount: Number(entry.amount ?? 0) || 0,
    }));
    exportCSV(rows, ["DateTime", "Type", "Details", "Amount"], "auditor-audit-log.csv");
  };

  const handleExportStudents = () => {
    if (!searchedStudents.length) return;
    const rows = searchedStudents.map((student) => ({
      Student: student.student_name,
      TotalPayments: Number(student.total_payments ?? 0) || 0,
      Balance: Number(student.balance ?? 0) || 0,
    }));
    exportCSV(rows, ["Student", "TotalPayments", "Balance"], "auditor-students.csv");
  };

  const getDonationBadge = (donation) => (
    <span
      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
        donation.donation_type === "cash"
          ? "bg-purple-50 text-purple-700"
          : "bg-green-50 text-green-700"
      }`}
    >
      {donation.donation_type === "cash" ? "Cash" : "In-Kind"}
    </span>
  );

  return (
    <AuditorLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div>
              <h1 className="text-3xl font-extrabold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                Auditor Reports
              </h1>
            </div>
          </div>
        </div>
      

        {/* Tabs */}
        <div className="flex flex-wrap gap-3 mb-6">
          <button
            onClick={() => setActiveTab("overview")}
            className={`inline-flex items-center rounded-full border px-5 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
              activeTab === "overview"
                ? "border-transparent bg-gradient-to-r from-blue-600 to-indigo-500 text-white shadow"
                : "border-slate-200 bg-white text-slate-500 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("payments")}
            className={`inline-flex items-center rounded-full border px-5 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
              activeTab === "payments"
                ? "border-transparent bg-gradient-to-r from-blue-600 to-indigo-500 text-white shadow"
                : "border-slate-200 bg-white text-slate-500 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
            }`}
          >
            Payments
          </button>
          <button
            onClick={() => setActiveTab("donations")}
            className={`inline-flex items-center rounded-full border px-5 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
              activeTab === "donations"
                ? "border-transparent bg-gradient-to-r from-blue-600 to-indigo-500 text-white shadow"
                : "border-slate-200 bg-white text-slate-500 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
            }`}
          >
            Donations
          </button>
          <button
            onClick={() => setActiveTab("expenses")}
            className={`inline-flex items-center rounded-full border px-5 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
              activeTab === "expenses"
                ? "border-transparent bg-gradient-to-r from-blue-600 to-indigo-500 text-white shadow"
                : "border-slate-200 bg-white text-slate-500 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
            }`}
          >
            Expenses
          </button>
          <button
            onClick={() => setActiveTab("funds")}
            className={`inline-flex items-center rounded-full border px-5 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
              activeTab === "funds"
                ? "border-transparent bg-gradient-to-r from-blue-600 to-indigo-500 text-white shadow"
                : "border-slate-200 bg-white text-slate-500 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
            }`}
          >
            Funds History
          </button>
          <button
            onClick={() => setActiveTab("students")}
            className={`inline-flex items-center rounded-full border px-5 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
              activeTab === "students"
                ? "border-transparent bg-gradient-to-r from-blue-600 to-indigo-500 text-white shadow"
                : "border-slate-200 bg-white text-slate-500 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
            }`}
          >
            Students
          </button>
          <button
            onClick={() => setActiveTab("audit")}
            className={`inline-flex items-center rounded-full border px-5 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
              activeTab === "audit"
                ? "border-transparent bg-gradient-to-r from-blue-600 to-indigo-500 text-white shadow"
                : "border-slate-200 bg-white text-slate-500 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
            }`}
          >
            Audit Log
          </button>
        </div>

        {/* Filters */}
        {activeTab !== "overview" && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-end gap-4">
            <div>
              <label className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Filter type</label>
              <select
                value={filterType}
                onChange={(e) => {
                  setFilterType(e.target.value);
                  setPaymentPage(1);
                  setDonationPage(1);
                  setExpensePage(1);
                }}
                className="mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="month">By Month</option>
                <option value="dateRange">By Date Range</option>
                <option value="year">By Year</option>
              </select>
            </div>

            {filterType === "month" && (
              <div className="flex flex-col">
                <label className="text-xs text-gray-500 font-medium">Month</label>
                <input
                  type="month"
                  value={filterMonth}
                  onChange={(e) => {
                    setFilterMonth(e.target.value);
                    setPaymentPage(1);
                    setDonationPage(1);
                    setExpensePage(1);
                  }}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            )}

            {filterType === "year" && (
              <div className="flex flex-col">
                <label className="text-xs text-gray-500 font-medium">Year</label>
                <input
                  type="number"
                  min="2000"
                  max="2100"
                  value={filterYear}
                  onChange={(e) => {
                    setFilterYear(e.target.value);
                    setPaymentPage(1);
                    setDonationPage(1);
                    setExpensePage(1);
                  }}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            )}

            {filterType === "dateRange" && (
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex flex-col">
                  <label className="text-xs text-gray-500 font-medium">Start date</label>
                  <input
                    type="date"
                    value={filterStart}
                    onChange={(e) => {
                      setFilterStart(e.target.value);
                      setPaymentPage(1);
                      setDonationPage(1);
                      setExpensePage(1);
                    }}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-xs text-gray-500 font-medium">End date</label>
                  <input
                    type="date"
                    value={filterEnd}
                    onChange={(e) => {
                      setFilterEnd(e.target.value);
                      setPaymentPage(1);
                      setDonationPage(1);
                      setExpensePage(1);
                    }}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={clearFilters}
                className="h-10 px-4 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-100"
              >
                Clear Filters
              </button>
              <div className="text-xs text-gray-500 self-center">
                {filterType === "month" && filterMonth
                  ? `Showing ${new Date(filterMonth + "-01").toLocaleString("en-US", {
                      month: "long",
                      year: "numeric",
                    })}`
                  : filterType === "dateRange" && (filterStart || filterEnd)
                  ? `Showing ${filterStart || "(start)"} – ${filterEnd || "(end)"}`
                  : filterType === "year" && filterYear
                  ? `Showing ${filterYear}`
                  : "No active filter"}
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Overview cards */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              title="Total Payments"
              value={formatCurrency(totals?.payments)}
              description="All recorded student contributions"
              accent="from-blue-50 via-white to-blue-100"
            />
            <SummaryCard
              title="Cash Donations"
              value={formatCurrency(totals?.donationsCash)}
              description="Monetary donations received"
              accent="from-purple-50 via-white to-purple-100"
            />
            <SummaryCard
              title="Expenses"
              value={formatCurrency(totals?.expenses)}
              description="Verified disbursements"
              accent="from-rose-50 via-white to-rose-100"
            />
            <SummaryCard
              title="Available Funds"
              value={formatCurrency((totals?.payments ?? 0) + (totals?.donationsCash ?? 0) - (totals?.expenses ?? 0))}
              description="Cash left after expenses"
              accent="from-emerald-50 via-white to-emerald-100"
            />
          </div>
        )}

        {/* Payments Table */}
        {activeTab === "payments" && (
          <div className="overflow-x-auto bg-white rounded-2xl shadow-md border border-gray-100">
            <div className="px-5 py-3 border-b">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-semibold text-blue-700">
                    Payments {selectedStudent && ` - ${selectedStudent}`}
                  </h2>
                  {selectedStudent && (
                    <button
                      onClick={() => setSelectedStudent(null)}
                      className="flex items-center gap-1 text-sm text-red-600 hover:text-red-800 transition"
                    >
                      <XCircle size={16} /> Clear Filter
                    </button>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                  <input
                    type="text"
                    value={paymentSearch}
                    onChange={(e) => {
                      setPaymentSearch(e.target.value);
                      setPaymentPage(1);
                    }}
                    placeholder="Search payments..."
                    className="w-full md:w-64 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                  <button
                    type="button"
                    onClick={handleExportPayments}
                    disabled={!searchedPayments.length}
                    className="px-4 py-2 text-sm rounded-lg border border-blue-200 text-blue-600 bg-blue-50 hover:bg-blue-100 transition disabled:opacity-40"
                  >
                    Export CSV
                  </button>
                </div>
              </div>
            </div>
            <table className="w-full text-sm text-gray-700 border-collapse">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide sticky top-0 z-10">
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
                    <tr key={p.id} className="hover:bg-blue-50 transition">
                      <td className="px-5 py-3">
                        <button
                          onClick={() => setSelectedStudent(p.student?.name)}
                          className="text-blue-600 hover:underline font-medium"
                        >
                          {p.student?.name || "-"}
                        </button>
                      </td>
                      <td className="px-5 py-3">
                        {typeof p.contribution === "object"
                          ? p.contribution?.contribution_type
                          : p.contribution || "-"}
                      </td>
                      <td className="px-5 py-3 text-right text-blue-700 font-semibold">
                        {formatCurrency(p.amount)}
                      </td>
                      <td className="px-5 py-3">
                        {formatDateTime(p.payment_timestamp || p.date)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="px-5 py-10 text-center text-gray-400">
                      No payments available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className="px-5 py-4 border-t">
              <div className="flex flex-col items-center gap-3 text-sm text-gray-600">
                <span>{summaryText(searchedPayments.length, paymentPage)}</span>
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

        {/* Donations Table */}
        {activeTab === "donations" && (
          <section className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
            <div className="flex flex-wrap gap-4 items-center px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-white/40">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400"> </p>
                <h2 className="text-2xl font-semibold text-slate-900"> Donation Records </h2>
                <p className="text-xs text-slate-500"> </p>
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
                      className={`inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 ${
                        donationTypeTab === tab.key
                          ? tab.key === "cash"
                            ? "border-transparent bg-gradient-to-r from-blue-600 to-indigo-500 text-white shadow focus-visible:ring-blue-400"
                            : "border-transparent bg-gradient-to-r from-emerald-500 to-teal-400 text-white shadow focus-visible:ring-emerald-400"
                          : tab.key === "cash"
                            ? "border-blue-200/70 bg-white text-blue-600 hover:bg-blue-50 focus-visible:ring-blue-200"
                            : "border-emerald-200/70 bg-white text-emerald-600 hover:bg-emerald-50 focus-visible:ring-emerald-200"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
                <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
                  <div className="relative w-full md:w-72">
                    <Search
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="text"
                      value={donationSearch}
                      onChange={(e) => {
                        setDonationSearch(e.target.value);
                        setDonationPage(1);
                      }}
                      placeholder="Search donor, type, amount..."
                      className="w-full rounded-full border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleExportDonations}
                    disabled={!searchedDonations.length}
                    className={`px-4 py-2 text-sm rounded-full border ${
                      donationTypeTab === "in-kind"
                        ? "border-emerald-200 text-emerald-600 bg-emerald-50"
                        : "border-purple-200 text-purple-600 bg-purple-50"
                    } hover:bg-white transition disabled:opacity-40`}
                  >
                    Export CSV
                  </button>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-gray-700">
                <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
                  {donationTypeTab === "in-kind" ? (
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
                  ) : (
                    <tr>
                      <th className="px-5 py-3 text-left">Date</th>
                      <th className="px-5 py-3 text-left">Donated By</th>
                      <th className="px-5 py-3 text-left">Amount</th>
                      <th className="px-5 py-3 text-left">Details</th>
                      <th className="px-5 py-3 text-left">Received By</th>
                    </tr>
                  )}
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedDonations.length > 0 ? (
                    paginatedDonations.map((d) => {
                      if (donationTypeTab === "in-kind") {
                        const status = d.usage_status || "Available";
                        const totalQty = Number(d.donation_quantity ?? 0);
                        const usedQty = Number(d.used_quantity ?? 0);
                        const damagedQty = Number(d.damaged_quantity ?? 0);
                        const unusableQty = Number(d.unusable_quantity ?? 0);
                        const usableQty = Number(d.usable_quantity ?? Math.max(totalQty - usedQty - damagedQty - unusableQty, 0));
                        const computedRemaining = usableQty || Math.max(totalQty - usedQty - damagedQty - unusableQty, 0);
                        return (
                          <tr key={d.id} className="bg-white hover:bg-slate-50">
                            <td className="px-5 py-3">
                              {formatDateTime(d.donation_timestamp || d.donation_date || d.date)}
                            </td>
                            <td className="px-5 py-3 font-medium text-gray-900">{d.donated_by || "-"}</td>
                            <td className="px-5 py-3 text-gray-600">{d.item_type || "—"}</td>
                            <td className="px-5 py-3 text-gray-600">{d.donation_description || "-"}</td>
                            <td className="px-5 py-3 text-center font-semibold text-amber-600">{Number.isNaN(usedQty) ? "-" : usedQty}</td>
                            <td className="px-5 py-3 text-center font-semibold text-emerald-600">{Number.isNaN(computedRemaining) ? "-" : computedRemaining}</td>
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2">
                                <span className={`inline-flex h-2.5 w-2.5 rounded-full ${donationStatusDot(status)}`} aria-hidden />
                                <p className={`text-sm font-semibold ${donationStatusTone(status)}`}>{status}</p>
                              </div>
                              <div className="mt-2 text-xs text-slate-500 space-y-0.5">
                                <p><span className="font-semibold text-emerald-600">Usable:</span> {Number.isNaN(usableQty) ? "-" : usableQty}</p>
                                <p><span className="font-semibold text-amber-600">Damaged:</span> {Number.isNaN(damagedQty) ? "-" : damagedQty}</p>
                                <p><span className="font-semibold text-rose-600">Unusable:</span> {Number.isNaN(unusableQty) ? "-" : unusableQty}</p>
                              </div>
                              {d.usage_notes && (
                                <p className="text-xs text-slate-400 mt-0.5">{d.usage_notes}</p>
                              )}
                            </td>
                            <td className="px-5 py-3 text-slate-500">{d.received_by || "-"}</td>
                          </tr>
                        );
                      }

                      return (
                        <tr key={d.id} className="bg-white hover:bg-slate-50">
                          <td className="px-5 py-3">
                            {formatDateTime(d.donation_timestamp || d.donation_date || d.date)}
                          </td>
                          <td className="px-5 py-3 font-medium text-gray-900">{d.donated_by || "-"}</td>
                          <td className="px-5 py-3 font-semibold text-purple-700">{formatCurrency(d.donation_amount)}</td>
                          <td className="px-5 py-3 text-gray-600">{d.donation_description || "-"}</td>
                          <td className="px-5 py-3 text-slate-500">{d.received_by || "-"}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        className="px-5 py-10 text-center text-gray-400"
                        colSpan={donationTypeTab === "in-kind" ? 10 : 5}
                      >
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
            <div className="px-5 py-4 border-t bg-white">
              <div className="flex flex-col items-center gap-3 text-sm text-gray-600">
                <span>{summaryText(searchedDonations.length, donationPage)}</span>
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
                    className="w-9 h-9 rounded-lg bg-purple-600 text-white font-semibold flex items-center justify-center shadow"
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
          </section>
        )}

        {/* Expenses Table */}
        {activeTab === "expenses" && (
          <section className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
            <div className="flex flex-wrap gap-4 items-center px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-white/40">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400"> </p>
                <h2 className="text-2xl font-semibold text-slate-900">Expense Records</h2>
                <p className="text-xs text-slate-500"></p>
              </div>
              <div className="ml-auto flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center rounded-full border border-slate-200 bg-white/80 p-1 shadow-sm">
                  {[
                    { key: "all", label: "All" },
                    { key: "funds", label: "Funds" },
                    { key: "in-kind", label: "In-Kind" },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => {
                        setExpensesScope(tab.key);
                        setExpensePage(1);
                      }}
                      className={`px-4 py-1.5 text-sm font-semibold rounded-full transition ${
                        expensesScope === tab.key
                          ? "bg-red-600 text-white shadow"
                          : "text-slate-500 hover:text-red-600"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
                <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
                  <div className="relative w-full md:w-72">
                    <Search
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="text"
                      value={expenseSearch}
                      onChange={(e) => {
                        setExpenseSearch(e.target.value);
                        setExpensePage(1);
                      }}
                      placeholder="Search category, source, or description..."
                      className="w-full rounded-full border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleExportExpenses}
                    disabled={!searchedExpenses.length}
                    className="px-4 py-2 text-sm rounded-full border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 transition disabled:opacity-40"
                  >
                    Export CSV
                  </button>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-gray-700">
                <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
                  {expensesScope === "in-kind" ? (
                    <tr>
                      <th className="px-5 py-3 text-left">Donation Type</th>
                      <th className="px-5 py-3 text-left">Item Type</th>
                      <th className="px-5 py-3 text-left">Expense Category</th>
                      <th className="px-5 py-3 text-left">Expense Date</th>
                      <th className="px-5 py-3 text-left">Used</th>
                      <th className="px-5 py-3 text-left">Expense Description</th>
                    </tr>
                  ) : (
                    <tr>
                      <th className="px-5 py-3 text-left">Expense Category</th>
                      <th className="px-5 py-3 text-left">Amount</th>
                      <th className="px-5 py-3 text-left">Expense Date</th>
                      <th className="px-5 py-3 text-left">Contribution / Source</th>
                      <th className="px-5 py-3 text-left">Expense Description</th>
                    </tr>
                  )}
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedExpenses.length > 0 ? (
                    paginatedExpenses.map((expense) => {
                      const isInKind = (expense?.donation?.donation_type || "").toLowerCase() === "in-kind";
                      const dateDisplay = formatDateTime(
                        expense?.expense_timestamp || expense?.date || expense?.expense_date
                      );
                      if (expensesScope === "in-kind") {
                        const rawDescription = expense.description || "-";
                        const qtyMatch = rawDescription.match(/\(Qty\s*Used:\s*([0-9]+(?:\.[0-9]+)?)\)/i);
                        const cleanedDescription = rawDescription
                          .replace(/\(Qty\s*Used:[^)]*\)/i, "")
                          .replace(/\(Estimated:[^)]*\)/i, "")
                          .trim() || "-";
                        return (
                          <tr key={`expense-${expense.id}`} className="bg-white hover:bg-slate-50">
                            <td className="px-5 py-3 text-slate-700">{expense.donation?.donation_type ? expense.donation.donation_type.replace(/\b\w/g, (c) => c.toUpperCase()) : "In-Kind"}</td>
                            <td className="px-5 py-3 text-slate-700">{expense.donation?.item_type || "-"}</td>
                            <td className="px-5 py-3 text-slate-700">{expense.expense_type || "-"}</td>
                            <td className="px-5 py-3 text-slate-600">{dateDisplay}</td>
                            <td className="px-5 py-3 font-semibold text-slate-800">{qtyMatch ? qtyMatch[1] : "-"}</td>
                            <td className="px-5 py-3 text-slate-600">{cleanedDescription}</td>
                          </tr>
                        );
                      }

                      const source = expense.contribution?.contribution_type
                        ? expense.contribution.contribution_type
                        : isInKind
                          ? "In-Kind"
                          : "Cash Donations";

                      return (
                        <tr key={`expense-${expense.id}`} className="bg-white hover:bg-slate-50">
                          <td className="px-5 py-3 text-slate-700">{expense.expense_type || "-"}</td>
                          <td className="px-5 py-3 font-semibold text-emerald-600">{formatCurrency(expense.amount)}</td>
                          <td className="px-5 py-3 text-slate-600">{dateDisplay}</td>
                          <td className="px-5 py-3 text-slate-600">{source}</td>
                          <td className="px-5 py-3 text-slate-600">{expense.description || expense.donation?.donation_description || "-"}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan={expensesScope === "in-kind" ? 6 : 5}
                        className="px-5 py-10 text-center text-gray-400"
                      >
                        {expenseSearch ? "No expenses match your search." : "No expenses found."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-4 border-t bg-white">
              <div className="flex flex-col items-center gap-3 text-sm text-gray-600">
                <span>{summaryText(searchedExpenses.length, expensePage)}</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setExpensePage((prev) => Math.max(prev - 1, 1))}
                    disabled={expensePage === 1}
                    className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    className="w-9 h-9 rounded-lg bg-red-600 text-white font-semibold flex items-center justify-center shadow"
                  >
                    {expensePage}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setExpensePage((prev) => Math.min(prev + 1, expensesPageTotal))
                    }
                    disabled={expensePage === expensesPageTotal}
                    className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50"
                  >
                    ›
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Funds History */}
        {activeTab === "funds" && (
          <div className="overflow-x-auto bg-white rounded-2xl shadow-md border border-gray-100">
            <div className="px-5 pt-5">
              <h2 className="text-xl font-semibold text-gray-800">Funds History</h2>
              <p className="text-sm text-gray-500">Overview of all payments, donations, and expenses</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-5">
              <div className="p-4 rounded-xl border bg-white">
                <div className="text-xs text-gray-500">Total Payments</div>
                <div className="text-2xl font-bold text-blue-700">{formatCurrency(fundTotals.payments)}</div>
              </div>
              <div className="p-4 rounded-xl border bg-white">
                <div className="text-xs text-gray-500">Total Donations (Cash)</div>
                <div className="text-2xl font-bold text-purple-700">{formatCurrency(fundTotals.donations)}</div>
                <div className="text-[11px] text-gray-500">In-Kind: {fundTotals.inKind} items</div>
              </div>
              <div className="p-4 rounded-xl border bg-white">
                <div className="text-xs text-gray-500">Total Expenses</div>
                <div className="text-2xl font-bold text-rose-700">{formatCurrency(fundTotals.expenses)}</div>
              </div>
              <div className="p-4 rounded-xl border bg-white">
                <div className="text-xs text-gray-500">Available Funds</div>
                <div className="text-2xl font-bold text-emerald-700">{formatCurrency(fundTotals.available)}</div>
              </div>
            </div>
            <div className="px-5 py-3 border-t flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="font-medium text-gray-700">Transaction History</div>
              <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
                <input
                  type="text"
                  value={fundSearch}
                  onChange={(e) => { setFundSearch(e.target.value); setFundPage(1); }}
                  placeholder="Search by date, description, or amount..."
                  className="w-full md:w-64 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
                <button
                  type="button"
                  onClick={handleExportFunds}
                  disabled={!searchedFunds.length}
                  className="px-4 py-2 text-sm rounded-lg border border-emerald-200 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 transition disabled:opacity-40"
                >
                  Export CSV
                </button>
              </div>
            </div>
            <table className="w-full text-sm text-gray-700 border-collapse">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide sticky top-0 z-10">
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
              <tbody>
                {paginatedFunds.length > 0 ? (
                  <>
                    {paginatedFunds.map((h, idx) => {
                      const isDonationCash = String(h.donation_type || '').toLowerCase() !== 'in-kind';
                      return (
                        <tr key={idx} className="hover:bg-emerald-50/40 transition">
                          <td className="px-5 py-3">
                            {formatDateTime(h.fund_timestamp || h.date || h.fund_date)}
                          </td>
                          <td className="px-5 py-3 text-right text-blue-700 font-semibold">{h.type === 'payment' ? formatCurrency(h.amount) : '—'}</td>
                          <td className="px-5 py-3 text-right text-purple-700 font-semibold">{h.type === 'donation' && isDonationCash ? formatCurrency(h.amount) : '—'}</td>
                          <td className="px-5 py-3 text-right text-rose-700 font-semibold">{h.type === 'expense' ? formatCurrency(h.amount) : '—'}</td>
                          <td className="px-5 py-3 text-right text-gray-600">{formatCurrency(h.fund_before)}</td>
                          <td className="px-5 py-3 text-right text-gray-800">{formatCurrency(h.fund_after)}</td>
                          <td className="px-5 py-3">{h.details}</td>
                        </tr>
                      );
                    })}
                    <tr className="bg-gray-50 font-semibold">
                      <td className="px-5 py-3">Total</td>
                      <td className="px-5 py-3 text-right text-blue-700">{formatCurrency(fundsSearchTotals.payments)}</td>
                      <td className="px-5 py-3 text-right text-purple-700">{formatCurrency(fundsSearchTotals.donations)} <span className="text-xs text-gray-500">(+ {fundsSearchTotals.inKind} in-kind)</span></td>
                      <td className="px-5 py-3 text-right text-rose-700">{formatCurrency(fundsSearchTotals.expenses)}</td>
                      <td className="px-5 py-3 text-right">{formatCurrency(lastSearchedFund?.fund_before || 0)}</td>
                      <td className="px-5 py-3 text-right">{formatCurrency(lastSearchedFund?.fund_after || 0)}</td>
                      <td className="px-5 py-3">—</td>
                    </tr>
                  </>
                ) : (
                  <tr>
                    <td colSpan="7" className="px-5 py-10 text-center text-gray-400">No history found.</td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className="px-5 py-4 border-t">
              <div className="flex flex-col items-center gap-3 text-sm text-gray-600">
                <span>{summaryText(searchedFunds.length, fundPage)}</span>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setFundPage((p) => Math.max(p - 1, 1))} disabled={fundPage === 1} className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50">‹</button>
                  <button type="button" className="w-9 h-9 rounded-lg bg-emerald-600 text-white font-semibold flex items-center justify-center shadow">{fundPage}</button>
                  <button type="button" onClick={() => setFundPage((p) => Math.min(p + 1, fundsPageTotal))} disabled={fundPage === fundsPageTotal} className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50">›</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Audit Log */}
        {activeTab === "audit" && (
          <div className="overflow-x-auto bg-white rounded-2xl shadow-md border border-gray-100">
            <div className="px-5 py-3 border-b flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <h2 className="text-lg font-semibold text-gray-700">Audit Log</h2>
              <div className="flex flex-col md:flex-row w-full md:w-auto gap-2">
                <input
                  type="text"
                  value={auditSearch}
                  onChange={(e) => { setAuditSearch(e.target.value); setAuditPage(1); }}
                  placeholder="Search audit..."
                  className="w-full md:w-64 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                />
                <button
                  type="button"
                  onClick={handleExportAudit}
                  disabled={!searchedAudit.length}
                  className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 bg-gray-100 hover:bg-gray-200 transition disabled:opacity-40"
                >
                  Export CSV
                </button>
              </div>
            </div>
            <table className="w-full text-sm text-gray-700 border-collapse">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide sticky top-0 z-10">
                <tr>
                  <th className="px-5 py-3 text-left">Date</th>
                  <th className="px-5 py-3 text-left">Type</th>
                  <th className="px-5 py-3 text-left">Details</th>
                  <th className="px-5 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {paginatedAudit.length > 0 ? (
                  paginatedAudit.map((a, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 transition">
                      <td className="px-5 py-3">{formatDateTime(a.date)}</td>
                      <td className="px-5 py-3 capitalize">{a.type}</td>
                      <td className="px-5 py-3">{a.details}</td>
                      <td className="px-5 py-3 text-right font-semibold">{formatCurrency(a.amount)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="px-5 py-10 text-center text-gray-400">No audit records.</td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className="px-5 py-4 border-t">
              <div className="flex flex-col items-center gap-3 text-sm text-gray-600">
                <span>{summaryText(searchedAudit.length, auditPage)}</span>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setAuditPage((p) => Math.max(p - 1, 1))} disabled={auditPage === 1} className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50">‹</button>
                  <button type="button" className="w-9 h-9 rounded-lg bg-gray-700 text-white font-semibold flex items-center justify-center shadow">{auditPage}</button>
                  <button type="button" onClick={() => setAuditPage((p) => Math.min(p + 1, auditPageTotal))} disabled={auditPage === auditPageTotal} className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50">›</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Students */}
        {activeTab === "students" && (
          <div className="overflow-x-auto bg-white rounded-2xl shadow-md border border-gray-100">
            <div className="px-5 py-3 border-b flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <h2 className="text-lg font-semibold text-indigo-700">Student Balances</h2>
              <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
                <input
                  type="text"
                  value={studentSearch}
                  onChange={(e) => { setStudentSearch(e.target.value); setStudentPage(1); }}
                  placeholder="Search students..."
                  className="w-full md:w-64 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
                <button
                  type="button"
                  onClick={handleExportStudents}
                  disabled={!searchedStudents.length}
                  className="px-4 py-2 text-sm rounded-lg border border-indigo-200 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition disabled:opacity-40"
                >
                  Export CSV
                </button>
              </div>
            </div>
            <table className="w-full text-sm text-gray-700 border-collapse">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide sticky top-0 z-10">
                <tr>
                  <th className="px-5 py-3 text-left">Student</th>
                  <th className="px-5 py-3 text-right">Total Payments</th>
                  <th className="px-5 py-3 text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {paginatedStudents.length > 0 ? (
                  paginatedStudents.map((s) => (
                    <tr key={s.student_id} className="hover:bg-indigo-50/40 transition">
                      <td className="px-5 py-3">{s.student_name}</td>
                      <td className="px-5 py-3 text-right text-gray-700 font-semibold">{formatCurrency(s.total_payments)}</td>
                      <td className="px-5 py-3 text-right font-semibold">{formatCurrency(s.balance)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="px-5 py-10 text-center text-gray-400">No students.</td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className="px-5 py-4 border-t">
              <div className="flex flex-col items-center gap-3 text-sm text-gray-600">
                <span>{summaryText(searchedStudents.length, studentPage)}</span>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setStudentPage((p) => Math.max(p - 1, 1))} disabled={studentPage === 1} className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50">‹</button>
                  <button type="button" className="w-9 h-9 rounded-lg bg-indigo-600 text-white font-semibold flex items-center justify-center shadow">{studentPage}</button>
                  <button type="button" onClick={() => setStudentPage((p) => Math.min(p + 1, studentsPageTotal))} disabled={studentPage === studentsPageTotal} className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50">›</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuditorLayout>
  );
}
