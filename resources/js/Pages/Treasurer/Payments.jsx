import React, { useState, useEffect, useMemo } from "react";
import TreasurerLayout from "@/Layouts/TreasurerLayout";
import { useForm, usePage, router } from "@inertiajs/react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, UserPlus, X, Download, Printer } from "lucide-react";
import * as XLSX from "xlsx";
import Swal from "sweetalert2";

export default function Payments() {
  const {
    students: initialStudents = [],
    payments = [],
    schoolYearContributions = [],
    guardians = [],
    studentBalances = {},
    schoolYears = [],
    activeSchoolYear = null,
  } = usePage().props;

  const [students, setStudents] = useState(initialStudents);
  const [selectedContributions, setSelectedContributions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [openGrade, setOpenGrade] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedGuardian, setSelectedGuardian] = useState(null);
  const [printing, setPrinting] = useState(false);
  const [sectionSearch, setSectionSearch] = useState("");
  const [sectionStudentQueries, setSectionStudentQueries] = useState({});
  const [openSection, setOpenSection] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [activeGrade, setActiveGrade] = useState("");
  const [activeSectionByGrade, setActiveSectionByGrade] = useState({});
  const gradeLevels = [...new Set(students.map((s) => s.grade_level?.name || "-"))];

  const { data, setData, post, processing, errors, reset } = useForm({
    student_id: "",
    payments: [], // Format: [{ contribution_id, school_year_id, amount_paid }, ...]
  });

  // Utils
  const formatCurrency = (value) => {
    const n = Number(value || 0);
    return n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const normalizeId = (value) => {
    if (value === null || value === undefined || value === "") return null;
    const cast = Number(value);
    return Number.isNaN(cast) ? null : cast;
  };

  const idsMatch = (a, b) => normalizeId(a) === normalizeId(b);

  const sumPaidForContribution = (student, contributionId, schoolYearId = null) => {
    if (!student) return 0;

    const linkedIds = Array.isArray(student.linked_student_ids) && student.linked_student_ids.length
      ? student.linked_student_ids
      : [student.id];

    const normalizedContributionId = normalizeId(contributionId);
    const normalizedSchoolYearId = normalizeId(schoolYearId);

    if (normalizedContributionId === null) {
      return 0;
    }

    return payments
      .filter((p) => {
        if (!linkedIds.some((id) => idsMatch(p.student_id, id))) return false;
        if (!idsMatch(p.contribution_id, normalizedContributionId)) return false;

        const paymentSchoolYearId = normalizeId(p.school_year_id);

        if (normalizedSchoolYearId !== null && paymentSchoolYearId !== null) {
          return paymentSchoolYearId === normalizedSchoolYearId;
        }

        if (normalizedSchoolYearId === null) {
          return true;
        }

        return paymentSchoolYearId === null;
      })
      .reduce((sum, p) => sum + Number(p.amount_paid || 0), 0);
  };

  const printSavedReceipt = (rd) => {
    if (!rd) return;
    const now = rd.generatedAt ? new Date(rd.generatedAt) : new Date();
    const formattedDate = now.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const rows = rd.items
      .map(
        (it) => `
          <tr>
            <td>${it.schoolYear}</td>
            <td>${it.contribution}</td>
            <td style="text-align:right;color:#dc2626">₱${Number(it.prevBalance).toFixed(2)}</td>
            <td style="text-align:right">₱${Number(it.amountPaid).toFixed(2)}</td>
            <td style="text-align:right;color:#dc2626">₱${Number(it.newBalance).toFixed(2)}</td>
          </tr>
        `
      )
      .join("");
    const html = `
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Payment Receipt - ${rd.studentName}</title>
          <style>
            :root { --gray:#6b7280; --border:#e5e7eb; --muted:#374151; --brand:#0ea5e9; }
            body{ font-family: Arial, Helvetica, sans-serif; margin:28px; color:#111827; }
            .header{ display:flex; align-items:center; justify-content:space-between; margin-bottom:6px; }
            .brand{ display:flex; align-items:center; gap:12px; font-weight:800; color:#111827; }
            .brand img{ height:36px; width:36px; object-fit:contain; }
            .subtitle{ font-size:12px; color:var(--gray); margin-bottom:14px; }
            h1{ font-size:18px; margin:0; }
            .card{ border:1px solid var(--border); border-radius:10px; padding:14px; }
            table{ width:100%; border-collapse:collapse; font-size:12px; margin-top:12px; }
            th,td{ border:1px solid var(--border); padding:8px; text-align:left; }
            th{ background:#f8fafc; text-transform:uppercase; font-weight:700; color:#0f172a; }
            tfoot td{ font-weight:700; background:#f9fafb; }
            .right{ text-align:right; }
            .totals{ margin-top:12px; font-size:12px; color:#111827; }
            .totals strong{ color:#0f172a; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="brand">
              <img src="/images/ANCHS.png" alt="Logo" />
              <div>
                <h1>Official Payment Receipt</h1>
                <div class="subtitle">Generated: ${formattedDate}</div>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="subtitle" style="margin:0 0 8px 0;">
              <strong>Student:</strong> ${rd.studentName} &nbsp;•&nbsp; <strong>Grade:</strong> ${rd.gradeName} &nbsp;•&nbsp; <strong>Section:</strong> ${rd.sectionName}
            </div>
            <table>
              <thead>
                <tr>
                  <th>School Year</th>
                  <th>Contribution</th>
                  <th class="right">Balance Before</th>
                  <th class="right">Amount Paid</th>
                  <th class="right">Balance After</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
              <tfoot>
                <tr>
                  <td colspan="4">Total Paid This Transaction</td>
                  <td class="right">₱${Number(rd.totalPaid).toFixed(2)}</td>
                </tr>
                <tr>
                  <td colspan="4">Remaining Balance After This Payment</td>
                  <td class="right" style="color:#dc2626">₱${Number(rd.totalBalanceAfter || 0).toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <script>window.onload = function(){ window.print(); };</script>
        </body>
      </html>
    `;
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow || iframe.contentDocument;
    const idoc = doc.document || doc;
    idoc.open();
    idoc.write(html);
    idoc.close();
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1500);
  };

  useEffect(() => {
    setStudents(initialStudents || []);
  }, [initialStudents]);

  useEffect(() => {
    if (!activeGrade && gradeLevels.length) {
      setActiveGrade(gradeLevels[0]);
    }
  }, [gradeLevels, activeGrade]);

  useEffect(() => {
    if (!activeGrade) return;
    const gradeStudents = students.filter((s) => s.grade_level?.name === activeGrade);
    const sectionSet = new Set();
    gradeStudents.forEach((s) => sectionSet.add(s.section?.name || 'No Section'));
    const firstSection = Array.from(sectionSet)[0];
    if (firstSection && !activeSectionByGrade[activeGrade]) {
      setActiveSectionByGrade((prev) => ({ ...prev, [activeGrade]: firstSection }));
    }
  }, [activeGrade, students, activeSectionByGrade]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const confirmation = await fireTreasurerConfirm({
      title: "Save payment?",
      html: '<p class="text-sm text-slate-600">Please confirm the payment details before saving.</p>',
      iconHtml:
        '<div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-600 text-3xl">?</div>',
      showCancelButton: true,
      reverseButtons: true,
      confirmButtonText: "Yes, save it",
      cancelButtonText: "Review again",
      focusConfirm: false,
    });

    if (!confirmation.isConfirmed) {
      return;
    }

    const snapshotStudent = selectedStudent;
    const snapshotPayments = (data.payments || []).filter((p) => Number(p.amount_paid) > 0);
    const receiptItems = snapshotPayments.map((p) => {
      const syc = schoolYearContributions.find(
        (s) => s.contribution_id === p.contribution_id && s.school_year_id === p.school_year_id
      );
      const prevBalance = snapshotStudent
        ? computeBalance(snapshotStudent, p.contribution_id, p.school_year_id)
        : 0;
      const amountPaid = Number(p.amount_paid || 0);
      const newBalance = Math.max(0, Number((prevBalance - amountPaid).toFixed(2)));
      return {
        schoolYear: syc?.school_year?.name || "-",
        contribution: syc?.contribution?.contribution_type || `Contribution ${p.contribution_id}`,
        amountPaid,
        prevBalance,
        newBalance,
      };
    });
    const totalPaidNow = receiptItems.reduce((a, b) => a + Number(b.amountPaid || 0), 0);
    const totalBalanceBefore = snapshotStudent ? computeStudentTotalBalance(snapshotStudent) : 0;
    const totalBalanceAfter = Math.max(0, Number((totalBalanceBefore - totalPaidNow).toFixed(2)));
    const pendingReceipt =
      snapshotStudent && receiptItems.length
        ? {
            studentName: `${snapshotStudent.first_name} ${snapshotStudent.last_name}`,
            gradeName: snapshotStudent.grade_level?.name || "-",
            sectionName: snapshotStudent.section?.name || "-",
            items: receiptItems,
            totalPaid: Number(totalPaidNow.toFixed(2)),
            totalBalanceBefore,
            totalBalanceAfter,
            generatedAt: new Date(),
          }
        : null;

    post(route("treasurer.payments.store"), {
      onSuccess: () => {
        if (pendingReceipt) {
          setReceiptData(pendingReceipt);
          setShowReceiptModal(true);
        }
        reset();
        setSelectedContributions([]);
        setSelectedGuardian(null);
        setSelectedStudent(null);
        setShowModal(false);
        router.reload({ only: ["students", "payments", "schoolYearContributions"] });

        Swal.fire({
          title: "Payment saved",
          text: "The payment has been recorded successfully.",
          icon: "success",
          toast: true,
          position: "top-end",
          showConfirmButton: false,
          timer: 2500,
          timerProgressBar: true,
        });
      },
      onError: () => {
        Swal.fire({
          title: "Unable to save",
          text: "Please review the form fields and try again.",
          icon: "error",
          confirmButtonColor: "#ef4444",
        });
      },
    });
  };

  // -------- Section reporting (Active school year) --------
  const getGradeLevelByName = (gradeName) => {
    return schoolYearContributions.find((syc) => syc.grade_level?.name === gradeName)?.grade_level || null;
  };

  const buildActiveYearColumnsForGrade = (gradeName) => {
    const active = getActiveSchoolYear();
    const gradeLevel = getGradeLevelByName(gradeName);
    if (!active || !gradeLevel) return [];
    const sycs = schoolYearContributions.filter(
      (syc) => syc.school_year_id === active.id && syc.grade_level_id === gradeLevel.id
    );
    const unique = new Map();
    sycs.forEach((s) => unique.set(s.contribution_id, s.contribution.contribution_type));
    return Array.from(unique, ([id, name]) => ({ id, name }));
  };

  const getSectionReportData = (gradeName, sectionName) => {
    const active = getActiveSchoolYear();
    if (!active) return { columns: [], rows: [] };
    const columns = buildActiveYearColumnsForGrade(gradeName);
    const columnIds = columns.map((c) => c.id);

    const sectionStudents = students.filter(
      (s) => (s.grade_level?.name === gradeName) && ((s.section?.name || "No Section") === sectionName)
    );

    const rows = sectionStudents.map((s) => {
      const allowed = new Set(
        getAllowedContributionsForStudent(s, active.id).map((c) => c.id)
      );

      const values = columns.map((col) => {
        if (!allowed.has(col.id)) return 0;
        return computeBalance(s, col.id, active.id);
      });

      const total = values.reduce((a, b) => a + Number(b || 0), 0);
      return {
        studentName: `${s.first_name} ${s.last_name}`,
        values,
        total: Number(total.toFixed(2)),
      };
    });

    return { columns, rows };
  };

  const exportSectionToExcel = (gradeName, sectionName) => {
    const { columns, rows } = getSectionReportData(gradeName, sectionName);
    if (!columns.length) return;

    const header = ["Student Name", ...columns.map((c) => c.name), "Total"];
    const data = rows.map((r) => [r.studentName, ...r.values, r.total]);
    const aoa = [header, ...data];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${sectionName}`.slice(0, 31));
    const filename = `${gradeName}-${sectionName}-ActiveYear-SectionReport.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  const printSectionReport = (gradeName, sectionName) => {
    const active = getActiveSchoolYear();
    const { columns, rows } = getSectionReportData(gradeName, sectionName);
    if (!columns.length) return;

    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const thead = `<tr><th>Student Name</th>${columns
      .map((c) => `<th>${c.name}</th>`)
      .join("")}<th>Total</th></tr>`;
    const tbody = rows
      .map(
        (r) => `<tr><td>${r.studentName}</td>${r.values
          .map((v) => `<td style="text-align:right">₱${Number(v).toFixed(2)}</td>`)
          .join("")}<td style="text-align:right">₱${Number(r.total).toFixed(2)}</td></tr>`
      )
      .join("");

    const html = `
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>${gradeName} ${sectionName} - Active Year Section Report</title>
          <style>
            body{ font-family: Arial, sans-serif; margin:24px; color:#111827; }
            h1{ font-size:18px; margin:0 0 8px; }
            .meta{ font-size:12px; color:#374151; margin-bottom:12px; }
            table{ width:100%; border-collapse:collapse; font-size:12px; }
            th,td{ border:1px solid #e5e7eb; padding:6px; text-align:left; }
            th{ background:#f3f4f6; text-transform:uppercase; font-weight:600; }
          </style>
        </head>
        <body>
          <h1>Section Report - ${gradeName} / ${sectionName}</h1>
          <div class="meta">Active School Year: ${active?.name || '-'} • Generated: ${formattedDate}</div>
          <table>
            <thead>${thead}</thead>
            <tbody>${tbody}</tbody>
          </table>
          <script>window.onload = function(){ window.print(); }</script>
        </body>
      </html>
    `;

    const win = window.open('', '_blank');
    if (!win) return;
    win.document.open();
    win.document.write(html);
    win.document.close();
  };

  const printReceipt = ({
    student,
    yearName,
    gradeName,
    sectionName,
    items, // [{name, amount, paid, balance}]
    totals, // {actual, paid, balance}
  }) => {
    try {
      setPrinting(true);
      const win = window.open('', '_blank');
      if (!win) return;
      const now = new Date();
      const formattedDate = now.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      const html = `
        <html>
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <title>Payment Receipt - ${student.first_name} ${student.last_name}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 24px; color: #111827; }
              h1 { font-size: 20px; margin: 0 0 8px; }
              h2 { font-size: 16px; margin: 12px 0 8px; }
              .meta { font-size: 12px; color: #374151; margin-bottom: 12px; }
              table { width: 100%; border-collapse: collapse; font-size: 12px; }
              th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; }
              th { background: #f3f4f6; text-transform: uppercase; font-weight: 600; }
              tfoot td { font-weight: 700; background: #f9fafb; }
              .right { text-align: right; }
              .header { display:flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
              .brand { font-weight: 700; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="brand">School Payment Receipt</div>
              <div class="meta">Generated: ${formattedDate}</div>
            </div>
            <h1>Receipt for ${student.first_name} ${student.last_name}</h1>
            <div class="meta">
              Grade: ${gradeName} | Section: ${sectionName || '-'} | School Year: ${yearName}
            </div>
            <table>
              <thead>
                <tr>
                  <th>Contribution</th>
                  <th class="right">Actual</th>
                  <th class="right">Paid</th>
                  <th class="right">Balance</th>
                </tr>
              </thead>
              <tbody>
                ${items
                  .map(
                    (it) => `
                      <tr>
                        <td>${it.name}</td>
                        <td class="right">₱${Number(it.amount).toFixed(2)}</td>
                        <td class="right">₱${Number(it.paid).toFixed(2)}</td>
                        <td class="right">₱${Number(it.balance).toFixed(2)}</td>
                      </tr>
                    `
                  )
                  .join('')}
              </tbody>
              <tfoot>
                <tr>
                  <td>Total</td>
                  <td class="right">₱${Number(totals.actual).toFixed(2)}</td>
                  <td class="right">₱${Number(totals.paid).toFixed(2)}</td>
                  <td class="right">₱${Number(totals.balance).toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
            <script>
              window.onload = function(){ window.print(); };
            </script>
          </body>
        </html>
      `;
      win.document.open();
      win.document.write(html);
      win.document.close();
    } finally {
      setTimeout(() => setPrinting(false), 500);
    }
  };

  const toggleContribution = (contribution, schoolYearId) => {
    const exists = selectedContributions.some(
      (c) => c.id === contribution.id && c.school_year_id === schoolYearId
    );
    if (exists) {
      setSelectedContributions((prev) =>
        prev.filter((c) => !(c.id === contribution.id && c.school_year_id === schoolYearId))
      );
      setData(
        "payments",
        data.payments.filter(
          (p) => !(p.contribution_id === contribution.id && p.school_year_id === schoolYearId)
        )
      );
    } else {
      setSelectedContributions((prev) => [
        ...prev,
        { ...contribution, school_year_id: schoolYearId },
      ]);
      setData("payments", [
        ...data.payments.filter(
          (p) => !(p.contribution_id === contribution.id && p.school_year_id === schoolYearId)
        ),
        { contribution_id: contribution.id, school_year_id: schoolYearId, amount_paid: "" },
      ]);
    }
  };

  const handleAmountChange = (contributionId, schoolYearId, value) => {
    const updated = data.payments.map((p) =>
      p.contribution_id === contributionId && p.school_year_id === schoolYearId
        ? { ...p, amount_paid: value }
        : p
    );
    setData("payments", updated);
  };

  const getAllowedContributionsForStudent = (student, schoolYearId = null) => {
    if (!student) return [];

    const guardianStudents = students.filter((s) => s.guardian_id === student.guardian_id);
    const firstStudent = guardianStudents[0];

    const sycs = schoolYearContributions.filter(
      (syc) =>
        syc.grade_level_id === student.grade_level_id &&
        (schoolYearId ? syc.school_year_id === schoolYearId : true)
    );

    return Array.from(
      new Map(
        sycs
          .filter((syc) => {
            if (student.id === firstStudent.id) return true;
            return syc.contribution.mandatory === 1;
          })
          .map((syc) => [syc.contribution.id, syc.contribution])
      ).values()
    );
  };

  const getEffectiveContributionAmount = (student, contribution, options = {}) => {
    const { schoolYearId = null, overrideAmount = null } = options;

    if (!student || !contribution) return 0;

    const guardianStudents = students.filter((s) => s.guardian_id === student.guardian_id);
    const firstStudent = guardianStudents[0];

    let amount = overrideAmount != null ? parseFloat(overrideAmount) : parseFloat(contribution?.amount ?? 0);

    if ((overrideAmount == null || Number.isNaN(amount)) && schoolYearId) {
      const matchedSyc = schoolYearContributions.find(
        (syc) =>
          syc.contribution_id === contribution.id &&
          syc.school_year_id === schoolYearId &&
          syc.grade_level_id === student.grade_level_id
      );

      if (matchedSyc) {
        const override = parseFloat(matchedSyc.total_amount);
        if (!Number.isNaN(override)) {
          amount = override;
        }
      }
    }

    if (Number.isNaN(amount)) {
      amount = 0;
    }

    if (firstStudent && student.id !== firstStudent.id && contribution.mandatory !== 1) {
      amount *= 0.5;
    }

    return Number(amount.toFixed(2));
  };

  const computeBalance = (student, contributionId, schoolYearId = null) => {
    let targetGradeLevelId = student?.grade_level_id;

    if (student && schoolYearId) {
      const schoolYear = schoolYears.find((sy) => sy.id === schoolYearId);
      if (schoolYear) {
        const gradeNameForYear = getGradeForYear(student, schoolYear.name);
        const gradeLevelForYear = gradeNameForYear ? getGradeLevelByName(gradeNameForYear) : null;
        if (gradeLevelForYear?.id) {
          targetGradeLevelId = gradeLevelForYear.id;
        }
      }
    }

    const syc = schoolYearContributions.find((syc) => {
      return (
        syc.contribution_id === contributionId &&
        syc.grade_level_id === targetGradeLevelId &&
        (schoolYearId ? syc.school_year_id === schoolYearId : true)
      );
    });

    if (!syc) return 0;

    const contribution = syc.contribution;

    const totalPaid = sumPaidForContribution(student, contributionId, syc?.school_year_id);

    const effectiveAmount = getEffectiveContributionAmount(student, contribution, {
      schoolYearId: syc.school_year_id,
      overrideAmount: syc.total_amount,
    });

    return Number((effectiveAmount - totalPaid).toFixed(2));
  };

  const computeStudentTotalBalance = (student) => {
    if (!student) return 0;
    const carryOver = Number(student.balance || 0);
    const currentYear = Number(student.contribution_balance || 0);
    return Number((carryOver + currentYear).toFixed(2));
  };

  const getActiveSchoolYear = () => {
    return schoolYears.find((sy) => sy.is_active === 1) || null;
  };

  const getNextUnpaidSchoolYearForStudent = (student) => {
    if (!student) return null;

    const activeSchoolYear = getActiveSchoolYear();
    if (!activeSchoolYear) return null;

    return activeSchoolYear.name;
  };

  const selectedStudentPayments = selectedStudent
    ? payments.filter((p) => p.student_id == selectedStudent.id)
    : [];

  

  const filteredGuardians = (guardians || []).filter((g) => {
    const fullName = `${g.first_name} ${g.last_name}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase());
  });

  const getHistoryYearsForStudent = (student) => {
    if (!student) return [];

    // Only include:
    // - the active school year
    // - any school year where this student actually has a recorded payment
    const years = new Set();

    // Add any school year that has defined contributions for the student's
    // computed grade in that year (covers inactive years with balances).
    schoolYears.forEach((sy) => {
      const sycs = buildSYCForYearAndGrade(sy.name, student);
      if (sycs && sycs.length > 0) {
        years.add(sy.name);
      }
    });

    return Array.from(years).sort((a, b) => {
      const yearA = parseInt(a.split("-")[0]);
      const yearB = parseInt(b.split("-")[0]);
      return yearB - yearA; // Newest first
    });
  };

  const getGradeForYear = (student, yearName) => {
    const activeSchoolYear = getActiveSchoolYear();
    if (!activeSchoolYear) return student.grade_level.name;

    const currentStartYear = parseInt(activeSchoolYear.name.split("-")[0]);
    const yearStart = parseInt(yearName.split("-")[0]);
    const offset = currentStartYear - yearStart;
    const currentGradeNum = parseInt(student.grade_level.name.replace(/Grade /, ""));
    const gradeNum = currentGradeNum - offset;
    return gradeNum > 0 ? `Grade ${gradeNum}` : student.grade_level.name;
  };

  const buildSYCForYearAndGrade = (yearName, student) => {
    const gradeName = getGradeForYear(student, yearName);
    const gradeLevel = schoolYearContributions.find(
      (syc) => syc.grade_level.name === gradeName
    )?.grade_level;

    if (!gradeLevel) return [];

    return schoolYearContributions.filter(
      (syc) =>
        syc.school_year.name === yearName && syc.grade_level_id === gradeLevel.id
    );
  };

  // Get contributions for all relevant school years
  const getContributionsBySchoolYear = (student) => {
    if (!student) return [];

    const historyYears = getHistoryYearsForStudent(student);
    const result = [];

    historyYears.forEach((yearName) => {
      const sycs = buildSYCForYearAndGrade(yearName, student);
      if (sycs.length) {
        const gradeName = getGradeForYear(student, yearName);
        const schoolYear = schoolYears.find((sy) => sy.name === yearName);
        const isActive = schoolYear?.is_active === 1;
        // Filter sycs to only those allowed for this student (e.g., only mandatory for non-first sibling)
        const allowed = getAllowedContributionsForStudent(student, schoolYear?.id);
        const allowedIds = new Set(allowed.map((c) => c.id));
        const contributions = sycs
          .filter((syc) => allowedIds.has(syc.contribution_id))
          .map((syc) => ({
            ...syc,
            grade_name: gradeName,
            school_year_name: yearName,
            is_active: isActive,
            balance: computeBalance(student, syc.contribution_id, syc.school_year_id),
          }));
        result.push({ yearName, gradeName, contributions, isActive });
      }
    });

    // Keep newest first. Active year can appear first; otherwise by start year desc
    return result.sort((a, b) => {
      // Active year first
      if (a.isActive && !b.isActive) return -1;
      if (!a.isActive && b.isActive) return 1;
      // Newest first by start year
      return parseInt(b.yearName.split("-")[0]) - parseInt(a.yearName.split("-")[0]);
    });
  };

  const totalOutstandingBalance = useMemo(
    () => students.reduce((sum, student) => sum + computeStudentTotalBalance(student), 0),
    [students, payments, schoolYearContributions]
  );
  const totalPaymentsRecorded = payments.length;
  const totalGuardians = guardians.length;
  const totalStudentsCount = students.length;

  const fireTreasurerConfirm = (options = {}) =>
    Swal.fire({
      buttonsStyling: false,
      ...options,
      customClass: {
        popup: "rounded-[32px] shadow-2xl p-6 text-center",
        title: "text-2xl font-semibold text-slate-900 mt-3",
        htmlContainer: "text-sm text-slate-500",
        confirmButton:
          "!rounded-2xl !px-6 !py-2.5 !bg-blue-600 !text-white !font-semibold hover:!bg-blue-700 focus-visible:!ring-2 focus-visible:!ring-blue-300",
        cancelButton:
          "!rounded-2xl !px-6 !py-2.5 !bg-slate-100 !text-slate-600 !font-semibold hover:!bg-slate-200",
        icon: "hidden",
        ...options.customClass,
      },
    });

  return (
    <TreasurerLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div>
              <h1 className="text-3xl font-extrabold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                Payment Records
              </h1>
            </div>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 self-start md:self-auto rounded-2xl border border-blue-100 bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
          >
            <UserPlus className="w-5 h-5" /> Add Payment
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <PaymentStatCard label="Students" value={totalStudentsCount} helper="Active records" />
          <PaymentStatCard label="Guardians" value={totalGuardians} helper="Linked accounts" accent="text-indigo-600" />
          <PaymentStatCard label="Payments Logged" value={totalPaymentsRecorded} helper="All time" accent="text-blue-600" />
          <PaymentStatCard label="Outstanding Balance" value={`₱${formatCurrency(totalOutstandingBalance)}`} helper="Across all students" accent="text-rose-600" />
        </div>

        <div className="space-y-4 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Student Payments by Grade & Section</h3>
            <input
              type="text"
              value={sectionSearch}
              onChange={(e) => setSectionSearch(e.target.value)}
              placeholder="Search student name..."
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 sm:w-80"
            />
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50/50">
            <div className="flex gap-2 overflow-x-auto border-b border-slate-100 px-3 py-2">
              {gradeLevels.map((g) => {
                const isActive = g === activeGrade;
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setActiveGrade(g)}
                    className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition ${
                      isActive
                        ? "bg-white text-blue-700 shadow border border-blue-200"
                        : "text-slate-500 hover:text-slate-700 hover:bg-white/70 border border-transparent"
                    }`}
                  >
                    {g}
                  </button>
                );
              })}
            </div>

            {activeGrade && (
              <div className="space-y-4 p-4">
                {(() => {
                  const normalizedQuery = sectionSearch.trim().toLowerCase();
                  const gradeStudents = students.filter((s) => s.grade_level?.name === activeGrade);
                  const sections = {};
                  gradeStudents.forEach((student) => {
                    const sectionName = student.section?.name || "No Section";
                    if (!sections[sectionName]) sections[sectionName] = [];
                    sections[sectionName].push(student);
                  });
                  const sectionEntries = Object.entries(sections);
                  const filteredSections = sectionEntries.filter(([sectionName, studs]) => {
                    if (!normalizedQuery) return true;
                    return studs.some((student) => {
                      const fullName = `${student.first_name} ${student.last_name}`.toLowerCase();
                      return fullName.includes(normalizedQuery);
                    });
                  });

                  if (!filteredSections.length) {
                    return <div className="text-sm text-slate-500">No students found.</div>;
                  }

                  const activeSection =
                    activeSectionByGrade[activeGrade] && filteredSections.some(([name]) => name === activeSectionByGrade[activeGrade])
                      ? activeSectionByGrade[activeGrade]
                      : filteredSections[0][0];

                  return (
                    <>
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {filteredSections.map(([sectionName]) => {
                          const isActive = sectionName === activeSection;
                          return (
                            <button
                              key={sectionName}
                              type="button"
                              onClick={() =>
                                setActiveSectionByGrade((prev) => ({ ...prev, [activeGrade]: sectionName }))
                              }
                              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                                isActive
                                  ? "bg-blue-100 text-blue-700 border border-blue-200"
                                  : "text-slate-500 border border-transparent hover:bg-white"
                              }`}
                            >
                              {sectionName}
                            </button>
                          );
                        })}
                      </div>

                      <div className="divide-y divide-slate-100">
                        {filteredSections
                          .filter(([sectionName]) => sectionName === activeSection)
                          .map(([sectionName, sectionStudents]) => (
                            <div key={sectionName}>
                              {sectionStudents
                                .filter((student) => {
                                  if (!normalizedQuery) return true;
                                  const fullName = `${student.first_name} ${student.last_name}`.toLowerCase();
                                  return fullName.includes(normalizedQuery);
                                })
                                .map((student) => (
                                  <div
                                    key={student.id}
                                    className="flex items-center justify-between px-4 py-3 transition hover:bg-blue-50/60"
                                    onClick={() => {
                                      setSelectedStudent(student);
                                      setShowHistoryModal(true);
                                    }}
                                  >
                                    <div>
                                      <p className="font-semibold text-slate-900">
                                        {student.first_name} {student.last_name}
                                      </p>
                                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                                        {student.lrn ? `LRN ${student.lrn}` : "No LRN"}
                                      </p>
                                    </div>
                                    <span
                                      className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                                        computeStudentTotalBalance(student) > 0
                                          ? "bg-rose-50 text-rose-600"
                                          : "bg-emerald-50 text-emerald-600"
                                      }`}
                                    >
                                      ₱{formatCurrency(computeStudentTotalBalance(student))}
                                    </span>
                                  </div>
                                ))}
                            </div>
                          ))}
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        </div>

        <AnimatePresence>
          {showModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50 p-4"
            >
              <motion.div
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 40, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl p-6 md:p-8 relative border border-gray-100 max-h-[90vh] overflow-y-auto"
              >
                <button
                  onClick={() => setShowModal(false)}
                  className="absolute top-3 right-3 text-gray-500 hover:text-black text-xl font-bold"
                >
                  <X className="w-5 h-5" />
                </button>
                <h2 className="text-2xl font-bold mb-5 text-gray-800 flex items-center gap-2">
                  <UserPlus className="w-6 h-6" /> Add New Payment
                </h2>

                <form
                  onSubmit={handleSubmit}
                  className="space-y-6"
                >
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                    <label className="block font-semibold text-slate-700 mb-2">Guardian</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search guardian..."
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setShowDropdown(true);
                          setSelectedGuardian(null);
                          setSelectedStudent(null);
                        }}
                        onFocus={() => setShowDropdown(true)}
                        onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                        className="w-full border border-gray-200 rounded-2xl px-4 py-2.5 focus:ring-2 focus:ring-blue-400 outline-none text-gray-700 shadow-sm"
                      />
                      {showDropdown && searchQuery && (
                        <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-2xl shadow-lg max-h-60 overflow-y-auto">
                          {filteredGuardians.length > 0 ? (
                            filteredGuardians.map((g) => (
                              <div
                                key={g.id}
                                className="px-4 py-2 hover:bg-blue-50 cursor-pointer"
                                onMouseDown={() => {
                                  setSelectedGuardian(g);
                                  setSearchQuery(`${g.first_name} ${g.last_name}`);
                                  setShowDropdown(false);
                                }}
                              >
                                {g.first_name} {g.last_name}
                              </div>
                            ))
                          ) : (
                            <div className="px-4 py-2 text-gray-500">
                              No results found
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedGuardian && (
                    <div>
                      <label className="block font-medium mb-2 text-gray-600">
                        Students
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {students
                          .filter((s) => s.guardian_id === selectedGuardian.id)
                          .map((s) => (
                            <div
                              key={s.id}
                              className={`border rounded-xl px-4 py-2 cursor-pointer transition ${
                                selectedStudent?.id === s.id
                                  ? "bg-blue-100 border-blue-400"
                                  : "hover:bg-gray-100"
                              }`}
                              onClick={() => {
                                setSelectedStudent(s);
                                setData("student_id", s.id);
                                setSelectedContributions([]);
                                setData("payments", []);
                              }}
                            >
                              {s.first_name} {s.last_name} (
                              {s.grade_level?.name || "No Grade"})
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {selectedStudent && (
                    <div>
                      <label className="block font-medium mb-3 text-gray-600">
                        Contributions
                      </label>
                      {(() => {
                        const carryOver = Number(selectedStudent.balance || 0);
                        const currentYearCharges = Number(
                          selectedStudent.contribution_balance || 0
                        );
                        const outstanding = Number(
                          (carryOver + currentYearCharges).toFixed(2)
                        );
                        return (
                          <div className="grid gap-4 sm:grid-cols-3 mb-6">
                            <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
                              <p className="text-[11px] uppercase tracking-[0.2em] text-amber-500">
                                Carry-over Balance
                              </p>
                              <p className="mt-2 text-2xl font-semibold text-amber-700">
                                ₱{formatCurrency(carryOver)}
                              </p>
                              <p className="text-xs text-amber-600/80 mt-1">
                                From previous school years
                              </p>
                            </div>
                            <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
                              <p className="text-[11px] uppercase tracking-[0.2em] text-blue-500">
                                Current Year Charges
                              </p>
                              <p className="mt-2 text-2xl font-semibold text-blue-700">
                                ₱{formatCurrency(currentYearCharges)}
                              </p>
                              <p className="text-xs text-blue-600/80 mt-1">
                                Based on assigned contributions
                              </p>
                            </div>
                            <div className="rounded-2xl border border-rose-100 bg-rose-50/70 p-4">
                              <p className="text-[11px] uppercase tracking-[0.2em] text-rose-500">
                                Outstanding (All Years)
                              </p>
                              <p className="mt-2 text-2xl font-semibold text-rose-700">
                                ₱{formatCurrency(outstanding)}
                              </p>
                              <p className="text-xs text-rose-600/80 mt-1">
                                Carry-over + unpaid contributions
                              </p>
                            </div>
                          </div>
                        );
                      })()}
                      <div className="space-y-6">
                        {getContributionsBySchoolYear(selectedStudent).map(
                          ({ yearName, gradeName, contributions, isActive }) => (
                            <div key={yearName}>
                              <h3 className="font-semibold text-gray-800">
                                {gradeName} - {yearName} {isActive ? "(Active)" : "(Inactive)"}
                              </h3>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-80 overflow-y-auto mt-2">
                                {contributions.map((syc) => {
                                  const c = syc.contribution;
                                  const checked = selectedContributions.some(
                                    (sc) =>
                                      sc.id === c.id && sc.school_year_id === syc.school_year_id
                                  );
                                  const amountEntry = data.payments.find(
                                    (p) =>
                                      p.contribution_id === c.id &&
                                      p.school_year_id === syc.school_year_id
                                  );
                                  const balance = syc.balance;
                                  return (
                                    <div
                                      key={`${syc.school_year_id}-${c.id}`}
                                      className={`flex flex-col sm:flex-row items-start sm:items-center justify-between border border-gray-200 rounded-xl p-4 transition hover:shadow ${
                                        checked ? "bg-blue-50 border-blue-400" : "bg-gray-50"
                                      }`}
                                    >
                                      <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-3">
                                          <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={() => toggleContribution(c, syc.school_year_id)}
                                            className="w-5 h-5 accent-blue-600"
                                            disabled={balance === 0 && !isActive} // Disable if fully paid and inactive
                                          />
                                          <span className="font-medium text-gray-700">
                                            {c.contribution_type}{" "}
                                            <span className="text-sm text-gray-500">
                                              (₱
                                              {formatCurrency(
                                                getEffectiveContributionAmount(selectedStudent, c, {
                                                  schoolYearId: syc.school_year_id,
                                                  overrideAmount: syc.total_amount,
                                                })
                                              )}
                                              )
                                            </span>
                                          </span>
                                        </div>
                                        <span
                                          className={`text-sm font-medium ${
                                            balance > 0 ? "text-red-600" : "text-green-600"
                                          }`}
                                        >
                                          Balance: ₱{formatCurrency(balance)}
                                        </span>
                                      </div>
                                      {checked && (
                                        <input
                                          type="number"
                                          className="border border-gray-300 rounded-xl px-3 py-1 w-full sm:w-36 mt-2 sm:mt-0 text-gray-700 focus:ring-2 focus:ring-blue-400 outline-none shadow-sm"
                                          value={amountEntry?.amount_paid || ""}
                                          onChange={(e) =>
                                            handleAmountChange(c.id, syc.school_year_id, e.target.value)
                                          }
                                          min="0"
                                          max={balance}
                                          step="0.01"
                                          placeholder="0.00"
                                        />
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="px-5 py-2 rounded-xl border text-gray-700 hover:bg-gray-100 w-full sm:w-auto transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={processing}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-semibold w-full sm:w-auto transition disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
                    >
                      {processing ? "Saving..." : "Save Payment"}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showReceiptModal && receiptData && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50 p-4"
            >
              <motion.div
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 40, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 relative border border-gray-100"
              >
                <button
                  onClick={() => setShowReceiptModal(false)}
                  className="absolute top-3 right-3 text-gray-500 hover:text-black text-xl font-bold"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <img src="/images/ANCHS.png" alt="Logo" className="w-8 h-8" />
                    <h2 className="text-2xl font-bold text-gray-800">Official Payment Receipt</h2>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  {new Date(receiptData.generatedAt || new Date()).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                </p>
                <div className="text-sm text-gray-700 mb-4">
                  <div><span className="font-semibold">Student:</span> {receiptData.studentName}</div>
                  <div><span className="font-semibold">Grade:</span> {receiptData.gradeName} <span className="font-semibold ml-2">Section:</span> {receiptData.sectionName}</div>
                </div>
                <div className="overflow-x-auto border border-gray-100 rounded-xl shadow-sm mb-4">
                  <table className="w-full text-sm text-left text-gray-700">
                    <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                      <tr>
                        <th className="px-4 py-2">School Year</th>
                        <th className="px-4 py-2">Contribution</th>
                        <th className="px-4 py-2 text-right">Balance Before</th>
                        <th className="px-4 py-2 text-right">Amount Paid</th>
                        <th className="px-4 py-2 text-right">Balance After</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {receiptData.items.map((it, idx) => (
                        <tr key={idx} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                          <td className="px-4 py-2">{it.schoolYear}</td>
                          <td className="px-4 py-2">{it.contribution}</td>
                          <td className="px-4 py-2 text-right text-red-600">₱{Number(it.prevBalance).toFixed(2)}</td>
                          <td className="px-4 py-2 text-right">₱{Number(it.amountPaid).toFixed(2)}</td>
                          <td className="px-4 py-2 text-right text-red-600">₱{Number(it.newBalance).toFixed(2)}</td>
                        </tr>
                      ))}
                      <tr className="bg-gray-50 font-semibold">
                        <td className="px-4 py-2" colSpan={4}>Total Paid This Transaction</td>
                        <td className="px-4 py-2 text-right">₱{Number(receiptData.totalPaid).toFixed(2)}</td>
                      </tr>
                      <tr className="bg-gray-50 font-semibold">
                        <td className="px-4 py-2" colSpan={4}>Remaining Balance After This Payment</td>
                        <td className="px-4 py-2 text-right text-red-600">₱{Number(receiptData.totalBalanceAfter || 0).toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowReceiptModal(false)}
                    className="px-5 py-2 rounded-xl border text-gray-700 hover:bg-gray-100 transition"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => printSavedReceipt(receiptData)}
                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl font-semibold"
                  >
                    <Printer className="w-4 h-4" /> Print Receipt
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showHistoryModal && selectedStudent && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50 p-4"
            >
              <motion.div
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 40, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl p-6 relative overflow-y-auto max-h-[80vh] border border-gray-100"
              >
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="absolute top-3 right-3 text-gray-500 hover:text-black text-xl font-bold"
                >
                  <X className="w-5 h-5" />
                </button>
                <h3 className="font-bold text-xl text-gray-800 mb-2">
                  📜 Payment History: {selectedStudent.first_name}{" "}
                  {selectedStudent.last_name}
                </h3>

                {getHistoryYearsForStudent(selectedStudent).length === 0 && (
                  <p className="text-gray-600">
                    No history / school year contributions found.
                  </p>
                )}

                {getHistoryYearsForStudent(selectedStudent).map((yearName) => {
                  const gradeName = getGradeForYear(selectedStudent, yearName);
                  const gradeLevel = schoolYearContributions.find(
                    (syc) => syc.grade_level.name === gradeName
                  )?.grade_level;

                  if (!gradeLevel) return null;

                  const sycs = buildSYCForYearAndGrade(yearName, selectedStudent);

                  if (!sycs.length) return null;

                  // Filter to only allowed contributions for this student in this school year
                  const schoolYear = schoolYears.find((sy) => sy.name === yearName);
                  const allowed = getAllowedContributionsForStudent(selectedStudent, schoolYear?.id);
                  const allowedIds = new Set(allowed.map((c) => c.id));
                  const filteredSycs = sycs.filter((s) =>
                    allowedIds.has(s.contribution_id)
                  );

                  let totalActual = 0;
                  let totalPaid = 0;
                  filteredSycs.forEach((syc) => {
                    const c = syc.contribution;
                    const effective = getEffectiveContributionAmount(selectedStudent, c, {
                      schoolYearId: syc.school_year_id,
                      overrideAmount: syc.total_amount,
                    });
                    totalActual += effective;

                    const paid = sumPaidForContribution(
                      selectedStudent,
                      c.id,
                      syc.school_year_id
                    );

                    totalPaid += paid;
                  });

                  const totalBalance = Number((totalActual - totalPaid).toFixed(2));

                  // Build printable items array
                  const printableItems = filteredSycs.map((syc) => {
                    const c = syc.contribution;
                    const effective = getEffectiveContributionAmount(selectedStudent, c);
                    const paid = payments
                      .filter((p) => {
                        if (p.student_id !== selectedStudent.id) return false;
                        if (p.contribution_id !== c.id) return false;
                        if (p.school_year_id && syc.school_year_id) {
                          return p.school_year_id === syc.school_year_id;
                        }
                        return true;
                      })
                      .reduce((s, p) => s + parseFloat(p.amount_paid || 0), 0);
                    const balance = Number((effective - paid).toFixed(2));
                    return {
                      name: c.contribution_type,
                      amount: effective,
                      paid,
                      balance,
                    };
                  });

                  const activeSchoolYear = getActiveSchoolYear();
                  const isActive = yearName === activeSchoolYear?.name;

                  return (
                    <div key={yearName} className="mb-6">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                        <p className="text-gray-600">
                          <span className="font-semibold">Grade:</span> {gradeName}{" | "}
                          <span className="font-semibold">Section:</span>{" "}
                          {selectedStudent.section?.name || "-"} {" | "}
                          <span className="font-semibold">School Year:</span>{" "}
                          {yearName} {isActive ? "(Active)" : "(Inactive)"}
                        </p>
                        <button
                          type="button"
                          disabled={printing}
                          onClick={() =>
                            printReceipt({
                              student: selectedStudent,
                              yearName,
                              gradeName,
                              sectionName: selectedStudent.section?.name,
                              items: printableItems,
                              totals: { actual: totalActual, paid: totalPaid, balance: totalBalance },
                            })
                          }
                          className="self-start sm:self-auto inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-xl text-sm font-semibold disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
                        >
                          {printing ? "Preparing..." : "Generate Receipt"}
                        </button>
                      </div>

                      <div className="overflow-x-auto border border-gray-100 rounded-xl shadow-sm">
                        <table className="w-full text-sm text-left text-gray-700">
                          <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                            <tr>
                              <th className="px-4 py-2">Contribution</th>
                              <th className="px-4 py-2">Actual Contribution</th>
                              <th className="px-4 py-2">Paid Contribution</th>
                              <th className="px-4 py-2">Balance</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {filteredSycs.map((syc, idx) => {
                              const c = syc.contribution;
                              const effective = getEffectiveContributionAmount(selectedStudent, c, {
                                schoolYearId: syc.school_year_id,
                                overrideAmount: syc.total_amount,
                              });
                              const paid = sumPaidForContribution(
                                selectedStudent,
                                c.id,
                                syc.school_year_id
                              );
                              const balance = Number((effective - paid).toFixed(2));
                              return (
                                <tr
                                  key={`${yearName}-${c.id}-${idx}`}
                                  className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-gray-100 transition`}
                                >
                                  <td className="px-4 py-2">
                                    {c.contribution_type}
                                  </td>
                                  <td className="px-4 py-2">
                                    ₱{formatCurrency(effective)}
                                  </td>
                                  <td className="px-4 py-2 text-blue-700 font-semibold">
                                    ₱{formatCurrency(paid)}
                                  </td>
                                  <td
                                    className={`px-4 py-2 font-medium ${
                                      balance > 0 ? "text-red-600" : "text-green-600"
                                    }`}
                                  >
                                    ₱{formatCurrency(balance)}
                                  </td>
                                </tr>
                              );
                            })}

                            <tr className="bg-gray-50 font-semibold">
                              <td className="px-4 py-2">Total</td>
                              <td className="px-4 py-2">
                                ₱{formatCurrency(totalActual)}
                              </td>
                              <td className="px-4 py-2 text-blue-700">
                                ₱{formatCurrency(totalPaid)}
                              </td>
                              <td
                                className={`px-4 py-2 ${
                                  totalBalance > 0 ? "text-red-600" : "text-green-600"
                                }`}
                              >
                                ₱{formatCurrency(totalBalance)}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </TreasurerLayout>
  );
}

const PaymentStatCard = ({ label, value, helper, accent = "text-slate-900" }) => (
  <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
    <p className="text-[11px] uppercase tracking-[0.25em] text-slate-400">{label}</p>
    <p className={`text-2xl font-semibold ${accent}`}>{value}</p>
    {helper && <p className="text-xs text-slate-400 mt-1">{helper}</p>}
  </div>
);  