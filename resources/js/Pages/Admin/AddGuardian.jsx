import React, { useState, useEffect } from "react";
import AdminLayout from "@/Layouts/AdminLayout";
import { useForm, usePage, router } from "@inertiajs/react";
import Swal from "sweetalert2";
import axios from "axios";
import { X, PlusCircle, UserPlus, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

const swalBaseClasses = {
  popup: "rounded-3xl shadow-2xl p-6 text-left",
  title: "text-lg font-bold text-slate-900",
  html: "text-slate-600",
  primaryBtn:
    "!px-6 !py-2.5 !text-sm !font-semibold !rounded-2xl !bg-blue-600 !text-white hover:!bg-blue-700",
  secondaryBtn:
    "!px-6 !py-2.5 !text-sm !font-semibold !rounded-2xl !border !border-slate-200 !text-slate-600 hover:!bg-slate-50",
  warnBtn:
    "!px-6 !py-2.5 !text-sm !font-semibold !rounded-2xl !bg-red-500 !text-white hover:!bg-red-600",
};

const swalFire = (options = {}) =>
  Swal.fire({
    buttonsStyling: false,
    customClass: {
      popup: swalBaseClasses.popup,
      title: swalBaseClasses.title,
      htmlContainer: swalBaseClasses.html,
      confirmButton: swalBaseClasses.primaryBtn,
      cancelButton: swalBaseClasses.secondaryBtn,
      ...options.customClass,
    },
    ...options,
  });

const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 2500,
  timerProgressBar: true,
  customClass: {
    popup:
      "rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-xl text-sm text-slate-900",
    title: "text-sm font-semibold",
  },
});

export default function AddGuardian() {
  const { guardians = [], archivedGuardians = [], gradeLevels = [], sections = [], schoolYears = [], students = [] } =
    usePage().props;

  const formatFullName = (...parts) => parts.filter((part) => part && part.trim()).join(" ");

  const normalizeContactNumber = (value = "") => {
    const digits = value.replace(/\D/g, "");
    if (!digits) return "";
    if (digits.startsWith("63")) {
      const trimmed = digits.slice(2);
      if (trimmed.length === 10) {
        return `0${trimmed}`;
      }
    }
    if (digits.length === 10 && digits.startsWith("9")) {
      return `0${digits}`;
    }
    if (digits.length > 11) {
      return digits.slice(-11);
    }
    return digits;
  };

  const handleImport = async () => {
    if (!importFile || !importSchoolYear) {
      Swal.fire({
        icon: "warning",
        title: "Missing inputs",
        text: "Please choose a file and select a school year.",
      });
      return;
    }

    const fd = new FormData();
    fd.append("file", importFile);
    fd.append("school_year_id", importSchoolYear);

    try {
      setImporting(true);
      await axios.post("/admin/students/import", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      Swal.fire({ icon: "success", title: "Import complete", timer: 1500, showConfirmButton: false });
      // Switch to Students tab and refresh only students list
      setActiveTab("students");
      setStudentSchoolYearFilter(String(importSchoolYear));
      router.reload({ only: ["students", "sections", "gradeLevels"], preserveState: true });
      setImportFile(null);
    } catch (e) {
      Swal.fire({
        icon: "error",
        title: "Import failed",
        text: e.response?.data?.message || "Please check your file and try again.",
      });
    } finally {
      setImporting(false);
    }
  };

  const archiveGuardian = async (id, fullName) => {
    const confirm = await Swal.fire({
      title: `Archive ${fullName}?`,
      text: "This guardian will be moved to the archive list.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonText: "Cancel",
      confirmButtonText: "Archive",
    });

    if (!confirm.isConfirmed) return;

    try {
      Swal.fire({
        title: "Archiving guardian...",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });
      const res = await axios.post(`/admin/guardians/${id}/archive`);
      Swal.close();
      if (res.data?.success) {
        Swal.fire({ icon: "success", title: "Guardian archived!", confirmButtonColor: "#2563eb" });
        window.dispatchEvent(new Event("guardians:refresh"));
      } else {
        throw new Error("Failed to archive guardian");
      }
    } catch (error) {
      Swal.close();
      Swal.fire("Error", "Failed to archive guardian.", "error");
    }
  };

  const restoreGuardian = async (id, fullName) => {
    const confirm = await Swal.fire({
      title: `Restore ${fullName}?`,
      text: "This guardian will be moved back to the active list.",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#16a34a",
      cancelButtonText: "Cancel",
      confirmButtonText: "Restore",
    });

    if (!confirm.isConfirmed) return;

    try {
      Swal.fire({
        title: "Restoring guardian...",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });
      const res = await axios.post(`/admin/guardians/${id}/restore`);
      Swal.close();
      if (res.data?.success) {
        Swal.fire({ icon: "success", title: "Guardian restored!", confirmButtonColor: "#2563eb" });
        window.dispatchEvent(new Event("guardians:refresh"));
      } else {
        throw new Error("Failed to restore guardian");
      }
    } catch (error) {
      Swal.close();
      Swal.fire("Error", "Failed to restore guardian.", "error");
    }
  };

  const guardianForm = useForm({
    first_name: "",
    middle_name: "",
    last_name: "",
    contact_number: "",
    address: "",
    username: "",
    email: "",
  });

  const studentForm = useForm({
    guardian_id: "",
    lrn: "",
    first_name: "",
    middle_name: "",
    last_name: "",
    grade_level_id: "",
    section_id: "",
    school_year_id: "",
  });

  const [showGuardianModal, setShowGuardianModal] = useState(false);
  const [guardianModalMode, setGuardianModalMode] = useState("add");
  const [editingGuardianId, setEditingGuardianId] = useState(null);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [activeTab, setActiveTab] = useState("guardians");
  const [guardianSearch, setGuardianSearch] = useState("");
  const [guardianTableSearch, setGuardianTableSearch] = useState("");
  const [showArchivedGuardians, setShowArchivedGuardians] = useState(false);
  const [studentTableSearch, setStudentTableSearch] = useState("");
  const [guardianPage, setGuardianPage] = useState(1);
  const [studentPage, setStudentPage] = useState(1);
  const [guardianLoading, setGuardianLoading] = useState(false);
  const [studentModalMode, setStudentModalMode] = useState("add");
  const [editingStudentId, setEditingStudentId] = useState(null);
  const [studentLoading, setStudentLoading] = useState(false);
  const isStudentEdit = studentModalMode === "edit";
  const [guardianEmailError, setGuardianEmailError] = useState("");
  const guardianEmailRegex = /^[\w.+-]+@(gmail\.com|yahoo\.com)$/i;

  // Import state
  const [importFile, setImportFile] = useState(null);
  const [importSchoolYear, setImportSchoolYear] = useState("");
  const [importing, setImporting] = useState(false);
  const [studentSchoolYearFilter, setStudentSchoolYearFilter] = useState("");

  // Link Students state
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkGuardian, setLinkGuardian] = useState(null); // {id, name}
  const [linkSearch, setLinkSearch] = useState("");
  const [linkSelected, setLinkSelected] = useState([]);
  const [linkLoading, setLinkLoading] = useState(false);

  // Inline link (inside Add Guardian modal)
  const [inlineLinkSearch, setInlineLinkSearch] = useState("");
  const [inlineLinkSelected, setInlineLinkSelected] = useState([]);
  const [inlineLinking, setInlineLinking] = useState(false);

  const unlinkedStudents = React.useMemo(() => students.filter((s) => !s.guardian_id), [students]);
  const linkableStudents = React.useMemo(() => {
    const query = linkSearch.trim().toLowerCase();
    if (!query) return unlinkedStudents;
    return unlinkedStudents.filter((student) => {
      const name = `${student.first_name || ""} ${student.middle_name || ""} ${student.last_name || ""}`.toLowerCase();
      const lrn = (student.lrn || "").toLowerCase();
      const grade = gradeLevels.find((g) => g.id === student.grade_level_id)?.name?.toLowerCase() ?? "";
      const section = sections.find((sec) => sec.id === student.section_id)?.name?.toLowerCase() ?? "";
      const schoolYear = schoolYears.find((sy) => sy.id === student.school_year_id)?.name?.toLowerCase() ?? "";
      return [name, lrn, grade, section, schoolYear].some((field) => field.includes(query));
    });
  }, [linkSearch, unlinkedStudents, gradeLevels, sections, schoolYears]);

  const toggleLinkSelection = (studentId) => {
    setLinkSelected((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    );
  };

  const handleOpenLinkModal = (guardian) => {
    setLinkGuardian({
      id: guardian.id,
      name: formatFullName(guardian.first_name, guardian.middle_name, guardian.last_name),
    });
    setLinkSelected([]);
    setLinkSearch("");
    setShowLinkModal(true);
  };

  const closeLinkModal = () => {
    if (linkLoading) return;
    setShowLinkModal(false);
    setLinkGuardian(null);
    setLinkSelected([]);
    setLinkSearch("");
  };

  const submitLinkedStudents = async () => {
    if (!linkGuardian?.id) return;
    if (linkSelected.length === 0) {
      Toast.fire({ icon: "info", title: "Select at least one student to link." });
      return;
    }

    try {
      setLinkLoading(true);
      await axios.post(`/admin/guardians/${linkGuardian.id}/assign-students`, {
        student_ids: linkSelected,
      });
      Toast.fire({
        icon: "success",
        title: `Linked ${linkSelected.length} student${linkSelected.length === 1 ? "" : "s"}.`,
      });
      setShowLinkModal(false);
      setLinkGuardian(null);
      setLinkSelected([]);
      router.reload({ only: ["students"], preserveState: true });
    } catch (error) {
      swalFire({ icon: "error", title: "Failed to link students", text: error.response?.data?.message || "Please try again." });
    } finally {
      setLinkLoading(false);
    }
  };

  const guardiansPerPage = 10;
  const studentsPerPage = 10;

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

  useEffect(() => {
    setGuardianPage(1);
  }, [guardians.length, archivedGuardians.length, activeTab, guardianTableSearch, showArchivedGuardians]);

  useEffect(() => {
    setStudentPage(1);
  }, [students.length, activeTab, studentTableSearch, studentSchoolYearFilter]);

  useEffect(() => {
    const refreshGuardians = () => router.reload({ only: ["guardians", "archivedGuardians"], preserveState: true });
    const refreshStudents = () => router.reload({ only: ["students"], preserveState: true });

    window.addEventListener("guardians:refresh", refreshGuardians);
    window.addEventListener("students:refresh", refreshStudents);

    return () => {
      window.removeEventListener("guardians:refresh", refreshGuardians);
      window.removeEventListener("students:refresh", refreshStudents);
    };
  }, []);

  const sendSms = async (guardian) => {
    const loginLink = `${window.location.origin}/guardian/login`;
    const message = `Hello ${guardian.first_name}, your account has been created.
Username: ${guardian.username}
Password: ${guardian.password}
Login here: ${loginLink}`;

    try {
      const res = await axios.post("/admin/sms/send-textbelt", {
        number: guardian.contact_number,
        message,
      });

      if (res.data.success) {
        Swal.fire("Sent!", "SMS was sent successfully.", "success");
      } else {
        Swal.fire("Failed", res.data.message || "Something went wrong", "error");
      }
    } catch (error) {
      Swal.fire("Error", "SMS sending failed.", "error");
    }
  };

  const submitGuardian = async (e) => {
    e.preventDefault();

    const isEdit = guardianModalMode === "edit";
    if (!guardianEmailRegex.test((guardianForm.data.email || "").trim())) {
      setGuardianEmailError("Email must end with @gmail.com or @yahoo.com.");
      await swalFire({
        icon: "warning",
        title: "Invalid Email",
        text: "Guardian email must use Gmail or Yahoo.",
      });
      return;
    }

    const normalizedContact = normalizeContactNumber(guardianForm.data.contact_number || "");
    if (normalizedContact.length !== 11) {
      swalFire({
        icon: "warning",
        title: "Invalid Contact Number",
        text: "Contact number must be exactly 11 digits.",
      });
      return;
    }

    guardianForm.setData("contact_number", normalizedContact);

    const fullName = formatFullName(
      guardianForm.data.first_name,
      guardianForm.data.middle_name,
      guardianForm.data.last_name
    );

    const reviewHtml = `
      <div class="space-y-5 text-left text-sm text-slate-800">
        <div>
          <div class="grid grid-cols-2 text-xs uppercase tracking-wide text-slate-400">
            <span>Full name</span>
            <span>Email</span>
          </div>
          <div class="grid grid-cols-2 mt-1 font-semibold">
            <span class="text-base">${fullName || "—"}</span>
            <span>${guardianForm.data.email || "—"}</span>
          </div>
        </div>
        <div>
          <div class="grid grid-cols-2 text-xs uppercase tracking-wide text-slate-400">
            <span>Username</span>
            <span>Contact</span>
          </div>
          <div class="grid grid-cols-2 mt-1 font-semibold">
            <span>${guardianForm.data.username || "—"}</span>
            <span>${normalizedContact || "—"}</span>
          </div>
        </div>
        <div>
          <div class="text-xs uppercase tracking-wide text-slate-400">Address</div>
          <div class="mt-1 font-semibold">${guardianForm.data.address || "—"}</div>
        </div>
      </div>
    `;

    const result = await swalFire({
      title: isEdit ? "Review guardian account" : "Review guardian account",
      html: reviewHtml,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: isEdit ? "Save changes" : "Yes, add",
      cancelButtonText: "Edit",
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    try {
      setGuardianLoading(true);
      swalFire({
        title: isEdit ? "Updating guardian..." : "Saving guardian...",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });
      let response;
      if (isEdit && editingGuardianId) {
        const payload = {
          first_name: guardianForm.data.first_name,
          middle_name: guardianForm.data.middle_name,
          last_name: guardianForm.data.last_name,
          contact_number: normalizedContact,
          address: guardianForm.data.address,
        };
        response = await axios.put(`/admin/guardians/${editingGuardianId}`, payload);
      } else {
        response = await axios.post("/admin/guardians/store", {
          ...guardianForm.data,
          contact_number: normalizedContact,
        });
      }

      Swal.close();

      if (response.data.success) {
        // If created, optionally link selected students inline
        let linkedCount = 0;
        if (!isEdit && response.data.guardian && inlineLinkSelected.length > 0) {
          try {
            setInlineLinking(true);
            await axios.post(`/admin/guardians/${response.data.guardian.id}/assign-students`, {
              student_ids: inlineLinkSelected,
            });
            linkedCount = inlineLinkSelected.length;
            router.reload({ only: ["students"], preserveState: true });
          } catch (err) {
            // Non-fatal; proceed but show warning
            Swal.fire({ icon: "warning", title: "Some students may not have been linked.", text: err.response?.data?.message || "Please verify the selections." });
          } finally {
            setInlineLinking(false);
          }
        }

        if (!isEdit && response.data.guardian) {
          await sendSms(response.data.guardian);
        }

        guardianForm.reset();
        setGuardianEmailError("");
        setInlineLinkSelected([]);
        setInlineLinkSearch("");
        setShowGuardianModal(false);
        setGuardianModalMode("add");
        setEditingGuardianId(null);

        Toast.fire({
          icon: "success",
          title: isEdit ? "Guardian updated" : "Guardian added",
          text: linkedCount > 0 ? `Saved and linked ${linkedCount} student(s).` : "Saved successfully.",
        });

        window.dispatchEvent(new Event("guardians:refresh"));
      } else {
        swalFire({
          icon: "error",
          title: "Error",
          text: response.data.message || (isEdit ? "Failed to update guardian" : "Failed to add guardian"),
        });
      }
    } catch (err) {
      Swal.close();
      if (err.response?.status === 422) {
        const errors = err.response.data?.errors || {};
        const errorMessages = Object.values(errors).flat().filter(Boolean);
        const message = errorMessages[0] || err.response.data?.message || "Please review the form for errors.";

        if (errors.email?.length) {
          setGuardianEmailError(errors.email[0]);
        }

        swalFire({
          icon: "warning",
          title: "Validation Error",
          text: message,
        });
      } else {
        swalFire({ icon: "error", title: "Error", text: "Something went wrong" });
      }
    } finally {
      setGuardianLoading(false);
    }
  };

  const submitStudent = async (e) => {
    e.preventDefault();

    const isEdit = studentModalMode === "edit";
    const trimmedLRN = (studentForm.data.lrn || "").trim();
    const duplicateLRN = students.some((s) => s.lrn === trimmedLRN && (!isEdit || s.id !== editingStudentId));

    if (duplicateLRN) {
      Swal.fire({
        icon: "warning",
        title: "Duplicate LRN",
        text: "This LRN is already registered. Each student must have a unique LRN.",
        confirmButtonColor: "#dc2626",
      });
      return;
    }

    if (!studentForm.data.guardian_id) {
      Swal.fire({
        icon: "warning",
        title: "Select Guardian",
        text: "Please choose a guardian for the student.",
        confirmButtonColor: "#dc2626",
      });
      return;
    }

    const result = await Swal.fire({
      title: isEdit ? "Update Student?" : "Add Student?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: isEdit ? "Update" : "Yes",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#16a34a",
    });

    if (!result.isConfirmed) return;

    const payload = {
      guardian_id: studentForm.data.guardian_id,
      grade_level_id: studentForm.data.grade_level_id,
      section_id: studentForm.data.section_id || null,
      school_year_id: studentForm.data.school_year_id,
      lrn: trimmedLRN,
      first_name: studentForm.data.first_name,
      middle_name: studentForm.data.middle_name,
      last_name: studentForm.data.last_name,
    };

    try {
      setStudentLoading(true);
      Swal.fire({
        title: isEdit ? "Updating student..." : "Saving student...",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      let response;
      if (isEdit && editingStudentId) {
        response = await axios.put(`/admin/students/${editingStudentId}`, payload);
      } else {
        response = await axios.post("/admin/students/store", payload);
      }

      Swal.close();

      if (response.data?.success) {
        studentForm.reset();
        setGuardianSearch("");
        setShowStudentModal(false);
        setStudentModalMode("add");
        setEditingStudentId(null);

        await Swal.fire({
          icon: "success",
          title: isEdit ? "Student Updated!" : "Student Added!",
          text: "Saved successfully.",
          toast: true,
          position: "top-end",
          timer: 2500,
          showConfirmButton: false,
          timerProgressBar: true,
        });

        window.dispatchEvent(new Event("students:refresh"));
      } else {
        throw new Error("Request failed");
      }
    } catch (error) {
      Swal.close();
      const message =
        error.response?.data?.message ||
        (error.response?.data?.errors
          ? Object.values(error.response.data.errors)[0]?.[0]
          : "Something went wrong.");
      Swal.fire({ icon: "error", title: "Error", text: message, confirmButtonColor: "#dc2626" });
    } finally {
      setStudentLoading(false);
    }
  };

  // Filter Students UI to active school year only
  const activeSchoolYearId = (schoolYears.find((sy) => sy?.is_active)?.id) ?? null;
  const studentsForUI = studentSchoolYearFilter
    ? students.filter((s) => String(s.school_year_id) === String(studentSchoolYearFilter))
    : students;

  // Rank grades numerically so we can sort (e.g., Grade 7 < Grade 8 < ...)
  const gradeRankById = React.useMemo(() => {
    const m = new Map();
    gradeLevels.forEach((g) => {
      const match = String(g.name || "").match(/\d+/);
      const rank = match ? parseInt(match[0], 10) : 0; // fallback 0 for non-numeric like Kinder
      m.set(g.id, rank);
    });
    return m;
  }, [gradeLevels]);

  const groupedStudents = studentsForUI.reduce((acc, student) => {
    const guardianId = student.guardian_id || "no_guardian";
    if (!acc[guardianId]) acc[guardianId] = { guardian: student.guardian, students: [] };
    acc[guardianId].students.push(student);
    return acc;
  }, {});

  const studentEntries = Object.entries(groupedStudents);
  const flattenedStudents = studentEntries.flatMap(([guardianId, { guardian, students: studentList }]) =>
    // Keep guardian grouping intact, but order students within the group by ascending grade
    studentList
      .slice()
      .sort((a, b) => {
        const ra = gradeRankById.get(a.grade_level_id) ?? 0;
        const rb = gradeRankById.get(b.grade_level_id) ?? 0;
        if (ra !== rb) return ra - rb; // lower grade number first
        const sa = (sections.find((sec) => sec.id === a.section_id)?.name || "");
        const sb = (sections.find((sec) => sec.id === b.section_id)?.name || "");
        if (sa !== sb) return sa.localeCompare(sb);
        const na = `${a.last_name || ""}, ${a.first_name || ""} ${a.middle_name || ""}`.toLowerCase();
        const nb = `${b.last_name || ""}, ${b.first_name || ""} ${b.middle_name || ""}`.toLowerCase();
        return na.localeCompare(nb);
      })
      .map((student, idx) => ({
        guardianId,
        guardianName: guardian ? `${guardian.first_name} ${guardian.last_name}` : "No Guardian",
        student,
        indexWithinGuardian: idx,
        guardianTotal: studentList.length,
      }))
  );

  const normalizedStudentSearch = studentTableSearch.trim().toLowerCase();
  const filteredStudents = flattenedStudents.filter(({ guardianName, student }) => {
    if (!normalizedStudentSearch) return true;
    const name = `${student.first_name} ${student.middle_name ?? ""} ${student.last_name}`.toLowerCase();
    const guardian = (guardianName ?? "").toLowerCase();
    const lrn = (student.lrn ?? "").toLowerCase();
    const gradeName = gradeLevels.find((g) => g.id === student.grade_level_id)?.name?.toLowerCase() ?? "";
    const sectionName = sections.find((sec) => sec.id === student.section_id)?.name?.toLowerCase() ?? "";
    const schoolYearName = schoolYears.find((sy) => sy.id === student.school_year_id)?.name?.toLowerCase() ?? "";
    return [name, guardian, lrn, gradeName, sectionName, schoolYearName].some((field) => field.includes(normalizedStudentSearch));
  });

  const studentsTotalPages = Math.max(1, Math.ceil(filteredStudents.length / studentsPerPage));
  const studentStartIndex = (studentPage - 1) * studentsPerPage;
  const paginatedStudents = filteredStudents.slice(studentStartIndex, studentStartIndex + studentsPerPage);

  const guardianSpanWithinPage = paginatedStudents.reduce((acc, row) => {
    acc[row.guardianId] = (acc[row.guardianId] || 0) + 1;
    return acc;
  }, {});

  const studentPageNumbers = buildPaginationRange(studentsTotalPages, studentPage);

  const goToStudentPage = (page) => {
    if (page < 1 || page > studentsTotalPages) return;
    setStudentPage(page);
  };

  const filteredSections = sections.filter((s) => String(s.grade_level_id) === String(studentForm.data.grade_level_id || ""));

  const guardiansSourceAll = React.useMemo(() => {
    const map = new Map();
    [...guardians, ...archivedGuardians].forEach((g) => {
      if (!map.has(g.id)) map.set(g.id, g);
    });
    return Array.from(map.values());
  }, [guardians, archivedGuardians]);

  const normalizedGuardianSearch = guardianSearch.trim().toLowerCase();
  const guardianSearchResults = guardiansSourceAll.filter((g) => {
    if (!normalizedGuardianSearch) return true;
    const fullName = formatFullName(g.first_name, g.middle_name, g.last_name).toLowerCase();
    return fullName.includes(normalizedGuardianSearch);
  });

  const activeSchoolYears = schoolYears.filter((sy) => sy?.is_active);

  // Preselect active school year in import UI & student filter
  useEffect(() => {
    if (!importSchoolYear && activeSchoolYears.length > 0) {
      setImportSchoolYear(String(activeSchoolYears[0].id));
    }
  }, [activeSchoolYears.length]);

  useEffect(() => {
    if (!studentSchoolYearFilter && activeSchoolYearId) {
      setStudentSchoolYearFilter(String(activeSchoolYearId));
    }
  }, [activeSchoolYearId, studentSchoolYearFilter]);

  const normalizedGuardianTableSearch = guardianTableSearch.trim().toLowerCase();
  const guardiansSource = showArchivedGuardians ? archivedGuardians : guardians;
  const guardiansFiltered = guardiansSource.filter((g) => {
    if (!normalizedGuardianTableSearch) return true;
    const fullName = formatFullName(g.first_name, g.middle_name, g.last_name).toLowerCase();
    const contact = (g.contact_number ?? "").toLowerCase();
    const address = (g.address ?? "").toLowerCase();
    return (
      fullName.includes(normalizedGuardianTableSearch) ||
      contact.includes(normalizedGuardianTableSearch) ||
      address.includes(normalizedGuardianTableSearch)
    );
  });

  const guardianTotalPages = Math.max(1, Math.ceil(guardiansFiltered.length / guardiansPerPage));
  const guardianStartIndex = (guardianPage - 1) * guardiansPerPage;
  const paginatedGuardians = guardiansFiltered.slice(guardianStartIndex, guardianStartIndex + guardiansPerPage);

  const guardianPageNumbers = buildPaginationRange(guardianTotalPages, guardianPage);

  const goToGuardianPage = (page) => {
    if (page < 1 || page > guardianTotalPages) return;
    setGuardianPage(page);
  };

  return (
    <AdminLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400"></p>
            <div>
              <h1 className="text-3xl font-extrabold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                Guardians & Students</h1>
            </div>
          </div>
        </div>

        {/* Import Students */}
        <div className="rounded-3xl border border-blue-100 bg-white shadow-sm">
          <div className="space-y-4 px-5 py-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Import Students</h2>
                <p className="text-sm text-slate-500">Upload CSV file to import records.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    guardianForm.reset();
                    setGuardianModalMode("add");
                    setEditingGuardianId(null);
                    setShowGuardianModal(true);
                  }}
                  className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500"
                >
                  <span className="inline-flex items-center gap-2"><UserPlus size={16} /> Add Guardian</span>
                </button>
                <button
                  onClick={() => {
                    setStudentModalMode("add");
                    setEditingStudentId(null);
                    studentForm.reset();
                    setGuardianSearch("");
                    setShowStudentModal(true);
                  }}
                  className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500"
                >
                  <span className="inline-flex items-center gap-2"><PlusCircle size={16} /> Add Student</span>
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:gap-4">
              <div className="flex-1 space-y-1">
                <label className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">Choose File</label>
                <label className="flex w-full items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50/60 px-4 py-2 text-sm font-semibold text-blue-600 shadow-sm transition hover:border-blue-400 hover:bg-blue-50">
                  <span className="flex-1 truncate text-slate-600">
                    {importFile ? importFile.name : "Select CSV"}
                  </span>
                  <span className="rounded-full bg-white px-3 py-0.5 text-xs font-semibold text-blue-500">Upload</span>
                  <input
                    type="file"
                    accept=".xlsx,.csv"
                    className="hidden"
                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  />
                </label>
              </div>
              <div className="flex-1 space-y-1">
                <label className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">School Year</label>
                <select
                  value={importSchoolYear}
                  onChange={(e) => setImportSchoolYear(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40"
                >
                  <option value="">Select school year</option>
                  {schoolYears.map((sy) => (
                    <option key={sy.id} value={sy.id}>
                      {sy.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-start lg:justify-end">
                <button
                  onClick={handleImport}
                  disabled={importing}
                  className={`inline-flex items-center justify-center rounded-2xl px-6 py-2 text-sm font-semibold text-white shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${importing ? "bg-gradient-to-r from-blue-400 to-blue-500 animate-pulse" : "bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400"
                    }`}
                >
                  {importing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Processing CSV...
                    </>
                  ) : (
                    <>Import Students</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex justify-start">
          <div className="inline-flex rounded-full border border-slate-200 bg-white p-1 text-sm font-semibold">
            <button
              onClick={() => setActiveTab("guardians")}
              className={`rounded-full px-4 py-1.5 transition ${activeTab === "guardians" ? "bg-blue-600 text-white shadow" : "text-slate-500"
                }`}
            >
              Guardians
            </button>
            <button
              onClick={() => setActiveTab("students")}
              className={`rounded-full px-4 py-1.5 transition ${activeTab === "students" ? "bg-emerald-600 text-white shadow" : "text-slate-500"
                }`}
            >
              Students
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-sm">
          {activeTab === "guardians" && (
            <div className="space-y-4 px-5 pt-6 pb-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <h2 className="pl-1 text-xl font-semibold text-gray-800">Guardians</h2>
                <div className="relative w-full md:w-64">
                  <input
                    type="text"
                    value={guardianTableSearch}
                    onChange={(e) => setGuardianTableSearch(e.target.value)}
                    placeholder="Search guardians..."
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
              </div>
              <table className="min-w-full border text-sm rounded-lg overflow-hidden">
                <thead className="bg-gray-50 text-gray-700 sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="p-3 border text-left">Full Name</th>
                    <th className="p-3 border text-left">Contact</th>
                    <th className="p-3 border text-left">Address</th>
                    <th className="p-3 border text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {guardiansFiltered.length ? (
                    paginatedGuardians.map((g, idx) => (
                      <tr
                        key={g.id}
                        className={idx % 2 === 0 ? "bg-white hover:bg-gray-50" : "bg-gray-50 hover:bg-gray-100"}
                      >
                        <td className="p-3 border font-medium">
                          {formatFullName(g.first_name, g.middle_name, g.last_name)}
                        </td>
                        <td className="p-3 border">{g.contact_number}</td>
                        <td className="p-3 border">{g.address}</td>
                        <td className="p-3 border">
                          {showArchivedGuardians ? (
                            <button
                              className="px-3 py-1 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-semibold shadow"
                              onClick={() =>
                                restoreGuardian(
                                  g.id,
                                  formatFullName(g.first_name, g.middle_name, g.last_name)
                                )
                              }
                            >
                              Restore
                            </button>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              <button
                                className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold shadow"
                                onClick={() => {
                                  guardianForm.setData({
                                    first_name: g.first_name || "",
                                    middle_name: g.middle_name || "",
                                    last_name: g.last_name || "",
                                    contact_number: normalizeContactNumber(g.contact_number || ""),
                                    address: g.address || "",
                                    username: g.username || "",
                                    email: g.email || "",
                                  });
                                  setGuardianModalMode("edit");
                                  setEditingGuardianId(g.id);
                                  setShowGuardianModal(true);
                                }}
                              >
                                Edit
                              </button>
                              <button
                                className="px-3 py-1 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold shadow"
                                onClick={() => handleOpenLinkModal(g)}
                              >
                                Link
                              </button>
                              <button
                                className="px-3 py-1 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-semibold shadow"
                                onClick={() =>
                                  archiveGuardian(
                                    g.id,
                                    formatFullName(g.first_name, g.middle_name, g.last_name)
                                  )
                                }
                              >
                                Archive
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="text-center py-4 text-gray-500">
                        {guardianTableSearch
                          ? "No guardians match your search."
                          : showArchivedGuardians
                            ? "No archived guardians found."
                            : "No guardians found."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              {guardiansSource.length > 0 && (
                <div className="flex flex-col items-center gap-3 px-4 py-4 border-t bg-gradient-to-r from-white via-blue-50/40 to-white text-center">
                  <span className="text-sm text-gray-600">
                    Showing <strong>{guardiansFiltered.length === 0 ? 0 : guardianStartIndex + 1}</strong> to <strong>{Math.min(guardianStartIndex + paginatedGuardians.length, guardiansFiltered.length)}</strong> of <strong>{guardiansFiltered.length}</strong> guardians
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => goToGuardianPage(guardianPage - 1)}
                      disabled={guardianPage === 1}
                      className="w-9 h-9 flex items-center justify-center rounded-md border border-blue-200 text-blue-500 bg-white hover:bg-blue-50 transition disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white"
                    >
                      <ChevronLeft size={16} aria-hidden />
                      <span className="sr-only">Previous page</span>
                    </button>
                    <div className="flex items-center gap-1">
                      {guardianPageNumbers.map((entry) => {
                        if (typeof entry === "string") {
                          return (
                            <span
                              key={entry}
                              className="w-9 h-9 flex items-center justify-center text-sm rounded-md text-blue-400"
                            >
                              …
                            </span>
                          );
                        }

                        const isActive = entry === guardianPage;
                        return (
                          <button
                            key={entry}
                            onClick={() => goToGuardianPage(entry)}
                            className={`w-9 h-9 flex items-center justify-center text-sm rounded-md border transition ${isActive
                                ? "bg-blue-600 text-white border-blue-600 shadow"
                                : "bg-white text-blue-500 border-blue-200 hover:bg-blue-50"
                              }`}
                          >
                            {entry}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      onClick={() => goToGuardianPage(guardianPage + 1)}
                      disabled={guardianPage === guardianTotalPages}
                      className="w-9 h-9 flex items-center justify-center rounded-md border border-blue-200 text-blue-500 bg-white hover:bg-blue-50 transition disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white"
                    >
                      <ChevronRight size={16} aria-hidden />
                      <span className="sr-only">Next page</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "students" && (
            <div className="space-y-4 px-5 pt-6 pb-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <h2 className="text-xl font-semibold text-gray-800">Students</h2>
                <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                  <select
                    value={studentSchoolYearFilter}
                    onChange={(e) => setStudentSchoolYearFilter(e.target.value)}
                    className="w-full md:w-52 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                  >
                    <option value="">All School Years</option>
                    {schoolYears.map((sy) => (
                      <option key={sy.id} value={sy.id}>
                        {sy.name}
                      </option>
                    ))}
                  </select>
                  <div className="relative w-full md:w-72">
                    <input
                      type="text"
                      value={studentTableSearch}
                      onChange={(e) => setStudentTableSearch(e.target.value)}
                      placeholder="Search students, guardian, LRN..."
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                    />
                  </div>
                </div>
              </div>
              <table className="min-w-full border text-sm rounded-lg overflow-hidden">
                <thead className="bg-gray-50 text-gray-700">
                  <tr>
                    <th className="p-3 border">Guardian</th>
                    <th className="p-3 border">LRN</th>
                    <th className="p-3 border">Full Name</th>
                    <th className="p-3 border">Grade</th>
                    <th className="p-3 border">Section</th>
                    <th className="p-3 border">School Year</th>
                    <th className="p-3 border text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedStudents.length ? (
                    paginatedStudents.map((row, idx) => {
                      const { guardianId, guardianName, student: s } = row;

                      const previousRow = paginatedStudents[idx - 1];
                      const isFirstInPageForGuardian = !previousRow || previousRow.guardianId !== guardianId;
                      const spanForGuardian = guardianSpanWithinPage[guardianId];

                      return (
                        <tr
                          key={s.id}
                          className={idx % 2 === 0 ? "bg-white hover:bg-gray-50" : "bg-gray-50 hover:bg-gray-100"}
                        >
                          {isFirstInPageForGuardian && (
                            <td className="p-3 border" rowSpan={spanForGuardian}>
                              {guardianName}
                            </td>
                          )}
                          <td className="p-3 border">{s.lrn}</td>
                          <td className="p-3 border">{formatFullName(s.first_name, s.middle_name, s.last_name)}</td>
                          <td className="p-3 border">{gradeLevels.find((g) => g.id === s.grade_level_id)?.name ?? "-"}</td>
                          <td className="p-3 border">{sections.find((sec) => sec.id === s.section_id)?.name ?? "-"}</td>
                          <td className="p-3 border">{schoolYears.find((sy) => sy.id === s.school_year_id)?.name ?? "-"}</td>
                          <td className="p-3 border">
                            <button
                              className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold shadow"
                              onClick={() => {
                                studentForm.setData({
                                  guardian_id: (s.guardian_id ?? "").toString(),
                                  lrn: s.lrn || "",
                                  first_name: s.first_name || "",
                                  middle_name: s.middle_name || "",
                                  last_name: s.last_name || "",
                                  grade_level_id: (s.grade_level_id ?? "").toString(),
                                  section_id: (s.section_id ?? "").toString(),
                                  school_year_id: (s.school_year_id ?? "").toString(),
                                });
                                setGuardianSearch(
                                  s.guardian
                                    ? formatFullName(s.guardian.first_name, s.guardian.middle_name, s.guardian.last_name)
                                    : guardianName
                                );
                                setStudentModalMode("edit");
                                setEditingStudentId(s.id);
                                setShowStudentModal(true);
                              }}
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="7" className="text-center py-4 text-gray-500">
                        {studentTableSearch ? "No students match your search." : "No students found."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              {filteredStudents.length > 0 && (
                <div className="flex flex-col items-center gap-3 px-4 py-4 border-t bg-gradient-to-r from-white via-green-50/40 to-white text-center">
                  <span className="text-sm text-gray-600">
                    Showing <strong>{filteredStudents.length === 0 ? 0 : studentStartIndex + 1}</strong> to <strong>{Math.min(studentStartIndex + paginatedStudents.length, filteredStudents.length)}</strong> of <strong>{filteredStudents.length}</strong> students
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => goToStudentPage(studentPage - 1)}
                      disabled={studentPage === 1}
                      className="w-9 h-9 flex items-center justify-center rounded-md border border-green-200 text-green-600 bg-white hover:bg-green-50 transition disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white"
                    >
                      <ChevronLeft size={16} aria-hidden />
                      <span className="sr-only">Previous page</span>
                    </button>
                    <div className="flex items-center gap-1">
                      {studentPageNumbers.map((entry) => {
                        if (typeof entry === "string") {
                          return (
                            <span
                              key={entry}
                              className="w-9 h-9 flex items-center justify-center text-sm rounded-md text-green-400"
                            >
                              …
                            </span>
                          );
                        }

                        const isActive = entry === studentPage;
                        return (
                          <button
                            key={entry}
                            onClick={() => goToStudentPage(entry)}
                            className={`w-9 h-9 flex items-center justify-center text-sm rounded-md border transition ${isActive
                                ? "bg-green-600 text-white border-green-600 shadow"
                                : "bg-white text-green-600 border-green-200 hover:bg-green-50"
                              }`}
                          >
                            {entry}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      onClick={() => goToStudentPage(studentPage + 1)}
                      disabled={studentPage === studentsTotalPages}
                      className="w-9 h-9 flex items-center justify-center rounded-md border border-green-200 text-green-600 bg-white hover:bg-green-50 transition disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white"
                    >
                      <ChevronRight size={16} aria-hidden />
                      <span className="sr-only">Next page</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {(showGuardianModal || showStudentModal) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-6">
            <div className="w-full max-w-3xl overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-[0_25px_60px_rgba(15,23,42,0.12)]">
              <div className="flex flex-col gap-2 border-b border-blue-50 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-slate-900">
                    {showGuardianModal
                      ? guardianModalMode === "edit"
                        ? "Edit Guardian"
                        : "Add Guardian"
                      : studentModalMode === "edit"
                        ? "Edit Student"
                        : "Add Student"}
                  </h2>
                </div>
                <button
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-100"
                  onClick={() => {
                    if (showGuardianModal) {
                      guardianForm.reset();
                      setGuardianModalMode("add");
                      setEditingGuardianId(null);
                      setShowGuardianModal(false);
                    }
                    if (showStudentModal) {
                      studentForm.reset();
                      setGuardianSearch("");
                      setStudentModalMode("add");
                      setEditingStudentId(null);
                      setShowStudentModal(false);
                    }
                  }}
                  aria-label="Close modal"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="max-h-[75vh] overflow-y-auto px-6 py-6">
                {showGuardianModal && (
                  <form onSubmit={submitGuardian} className="space-y-2">
                    <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 ">
                      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">Personal Info</p>
                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        {["first_name", "middle_name", "last_name", "contact_number", "address"].map((field) => (
                          <div key={field} className="space-y-1">
                            <label className="text-sm font-medium text-slate-600">
                              {field === "middle_name" ? "Middle Name (optional)" : field.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                            </label>
                            <input
                              type={field === "contact_number" ? "tel" : "text"}
                              value={guardianForm.data[field]}
                              onChange={(e) => {
                                let value = e.target.value;
                                if (field === "contact_number") {
                                  value = value.replace(/\D/g, "").slice(0, 11);
                                }
                                guardianForm.setData(field, value);
                              }}
                              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40"
                              required={field !== "middle_name"}
                              maxLength={field === "contact_number" ? 11 : undefined}
                              inputMode={field === "contact_number" ? "numeric" : undefined}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-100 bg-white/80 p-4 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">Create Account</p>
                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <div className="space-y-1">
                          <label className="text-sm font-medium text-slate-600">Username</label>
                          <input
                            type="text"
                            value={guardianForm.data.username}
                            onChange={(e) => guardianForm.setData("username", e.target.value)}
                            disabled={guardianModalMode === "edit"}
                            className={`w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm shadow-sm ${guardianModalMode === "edit" ? "bg-slate-100 text-slate-400" : "bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40"
                              }`}
                            required
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-sm font-medium text-slate-600">Email</label>
                          <input
                            type="email"
                            value={guardianForm.data.email}
                            onChange={(e) => {
                              const value = e.target.value.trim();
                              guardianForm.setData("email", value);
                              if (!value) {
                                setGuardianEmailError("Email is required.");
                                return;
                              }
                              if (!guardianEmailRegex.test(value)) {
                                setGuardianEmailError("Email must end with @gmail.com or @yahoo.com.");
                                return;
                              }
                              setGuardianEmailError("");
                            }}
                            className={`w-full rounded-2xl border px-4 py-2.5 text-sm shadow-sm focus:ring-2 ${guardianEmailError
                                ? "border-red-300 focus:ring-red-400/60"
                                : "border-slate-200 focus:border-blue-500 focus:ring-blue-500/40"
                              }`}
                            required
                            disabled={guardianModalMode === "edit"}
                          />
                          {guardianEmailError && guardianModalMode !== "edit" && (
                            <p className="text-xs font-semibold text-red-500">{guardianEmailError}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {guardianModalMode === "add" && (
                      <div className="rounded-2xl border border-slate-100 bg-white/80 p-4 shadow-sm">
                        <div className="mb-3 flex items-center justify-between">
                          <p className="text-sm font-semibold text-slate-700">Link students (optional)</p>
                          <span className="text-xs text-slate-500">{inlineLinkSelected.length} selected</span>
                        </div>
                        <div className="grid gap-3 md:grid-cols-[2fr,1fr]">
                          <input
                            type="text"
                            value={inlineLinkSearch}
                            onChange={(e) => setInlineLinkSearch(e.target.value)}
                            placeholder="Search students by name or LRN"
                            className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                          />
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                            Tip: You can select multiple students in one guardian, only select if guardian has many students.
                          </div>
                        </div>
                        <div className="mt-4 max-h-56 overflow-auto rounded-2xl border border-slate-100 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                          <table className="w-full text-xs text-slate-600">
                            <thead className="bg-slate-50 text-slate-500">
                              <tr>
                                <th className="p-3 text-left">
                                  <input
                                    type="checkbox"
                                    checked={(() => {
                                      const q = inlineLinkSearch.trim().toLowerCase();
                                      const visible = studentsForUI
                                        .filter((s) => !s.guardian_id)
                                        .filter((s) => {
                                          if (!q) return true;
                                          const name = `${s.first_name} ${s.middle_name || ''} ${s.last_name}`.toLowerCase();
                                          const lrn = (s.lrn || '').toLowerCase();
                                          return name.includes(q) || lrn.includes(q);
                                        });
                                      return visible.length > 0 && visible.every((s) => inlineLinkSelected.includes(s.id));
                                    })()}
                                    onChange={(e) => {
                                      const q = inlineLinkSearch.trim().toLowerCase();
                                      const visible = studentsForUI
                                        .filter((s) => !s.guardian_id)
                                        .filter((s) => {
                                          if (!q) return true;
                                          const name = `${s.first_name} ${s.middle_name || ''} ${s.last_name}`.toLowerCase();
                                          const lrn = (s.lrn || '').toLowerCase();
                                          return name.includes(q) || lrn.includes(q);
                                        });
                                      if (e.target.checked) setInlineLinkSelected(visible.map((s) => s.id));
                                      else setInlineLinkSelected([]);
                                    }}
                                  />
                                </th>
                                <th className="p-3 text-left">LRN</th>
                                <th className="p-3 text-left">Student</th>
                                <th className="p-3 text-left">Grade</th>
                                <th className="p-3 text-left">Section</th>
                                <th className="p-3 text-left">SY</th>
                              </tr>
                            </thead>
                            <tbody>
                              {studentsForUI
                                .filter((s) => !s.guardian_id)
                                .filter((s) => {
                                  const q = inlineLinkSearch.trim().toLowerCase();
                                  if (!q) return true;
                                  const name = `${s.first_name} ${s.middle_name || ''} ${s.last_name}`.toLowerCase();
                                  const lrn = (s.lrn || '').toLowerCase();
                                  return name.includes(q) || lrn.includes(q);
                                })
                                .sort((a, b) => {
                                  const ra = gradeRankById.get(a.grade_level_id) ?? 0;
                                  const rb = gradeRankById.get(b.grade_level_id) ?? 0;
                                  if (ra !== rb) return ra - rb;
                                  const sa = sections.find((sec) => sec.id === a.section_id)?.name || "";
                                  const sb = sections.find((sec) => sec.id === b.section_id)?.name || "";
                                  if (sa !== sb) return sa.localeCompare(sb);
                                  const na = `${a.last_name || ''}, ${a.first_name || ''} ${a.middle_name || ''}`.toLowerCase();
                                  const nb = `${b.last_name || ''}, ${b.first_name || ''} ${b.middle_name || ''}`.toLowerCase();
                                  return na.localeCompare(nb);
                                })
                                .map((s, idx) => (
                                  <tr key={s.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                                    <td className="p-3">
                                      <input
                                        type="checkbox"
                                        checked={inlineLinkSelected.includes(s.id)}
                                        onChange={(e) => {
                                          setInlineLinkSelected((prev) => (e.target.checked ? [...prev, s.id] : prev.filter((id) => id !== s.id)));
                                        }}
                                      />
                                    </td>
                                    <td className="p-3">{s.lrn}</td>
                                    <td className="p-3">{formatFullName(s.first_name, s.middle_name, s.last_name)}</td>
                                    <td className="p-3">{gradeLevels.find((g) => g.id === s.grade_level_id)?.name ?? '-'}</td>
                                    <td className="p-3">{sections.find((sec) => sec.id === s.section_id)?.name ?? '-'}</td>
                                    <td className="p-3">{schoolYears.find((sy) => sy.id === s.school_year_id)?.name ?? '-'}</td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-4">
                      <button
                        type="button"
                        onClick={() => {
                          guardianForm.reset();
                          setGuardianModalMode("add");
                          setEditingGuardianId(null);
                          setInlineLinkSelected([]);
                          setInlineLinkSearch("");
                          setShowGuardianModal(false);
                        }}
                        className="inline-flex h-11 items-center rounded-full border border-slate-200 px-5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                        disabled={guardianLoading}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className={`inline-flex h-11 min-w-[120px] items-center justify-center rounded-full px-6 text-sm font-semibold text-white shadow-sm transition ${guardianLoading ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-500"
                          }`}
                        disabled={guardianLoading}
                      >
                        {guardianLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {guardianModalMode === "edit" ? "Updating" : "Saving"}
                          </>
                        ) : guardianModalMode === "edit" ? (
                          "Update Guardian"
                        ) : (
                          "Create Guardian"
                        )}
                      </button>
                    </div>
                  </form>
                )}

                {showStudentModal && (
                  <form onSubmit={submitStudent} className="space-y-6">
                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 shadow-inner">
                      <div className="mt-4 grid gap-3 md:grid-cols-[1.4fr,0.6fr]">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-600">Search Guardian</label>
                          <input
                            type="text"
                            value={guardianSearch}
                            onChange={(e) => setGuardianSearch(e.target.value)}
                            disabled={isStudentEdit}
                            placeholder="Type guardian name"
                            className={`w-full rounded-2xl border border-emerald-100 px-4 py-2.5 text-sm shadow-sm transition ${isStudentEdit
                                ? "bg-slate-100 text-slate-400"
                                : "bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/40"
                              }`}
                          />
                        </div>
                        <div className="rounded-2xl border border-emerald-100 bg-white/70 px-3 py-3 text-xs font-medium text-emerald-700">
                          {isStudentEdit
                            ? "Linked guardian cannot be changed while editing."
                            : "Type at least 2 characters to filter guardians."}
                        </div>
                      </div>
                      <div className={`mt-4 max-h-48 overflow-y-auto rounded-2xl border border-emerald-100 bg-white/80 p-2 text-sm ${isStudentEdit ? "opacity-70" : ""}`}>
                        {guardianSearch && !isStudentEdit && guardianSearchResults.length ? (
                          guardianSearchResults.map((g) => (
                            <button
                              type="button"
                              key={g.id}
                              className="w-full rounded-xl px-3 py-2 text-left text-slate-600 transition hover:bg-emerald-50"
                              onClick={() => {
                                if (isStudentEdit) return;
                                studentForm.setData("guardian_id", g.id);
                                setGuardianSearch(formatFullName(g.first_name, g.middle_name, g.last_name));
                              }}
                            >
                              {formatFullName(g.first_name, g.middle_name, g.last_name)}
                            </button>
                          ))
                        ) : guardianSearch && !isStudentEdit ? (
                          <div className="px-3 py-2 text-slate-400">No guardians found.</div>
                        ) : isStudentEdit ? (
                          <div className="px-3 py-2 text-slate-400">Editing existing record</div>
                        ) : (
                          <div className="px-3 py-2 text-slate-400">Start typing to search</div>
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-100 bg-white/80 p-4 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">Student Details</p>
                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <div className="space-y-1">
                          <label className="text-sm font-medium text-slate-600">LRN</label>
                          <input
                            type="text"
                            value={studentForm.data.lrn || ""}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, "").slice(0, 12);
                              studentForm.setData("lrn", value);
                            }}
                            placeholder="12-digit LRN"
                            className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm shadow-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/40"
                            required
                            inputMode="numeric"
                            maxLength={12}
                          />
                        </div>
                        {[
                          { key: "first_name", label: "First Name" },
                          { key: "middle_name", label: "Middle Name (optional)", optional: true },
                          { key: "last_name", label: "Last Name" },
                        ].map((field) => (
                          <div key={field.key} className="space-y-1">
                            <label className="text-sm font-medium text-slate-600">{field.label}</label>
                            <input
                              type="text"
                              value={studentForm.data[field.key] || ""}
                              onChange={(e) => studentForm.setData(field.key, e.target.value)}
                              className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm shadow-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/40"
                              required={!field.optional}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-100 bg-white/80 p-4 shadow-sm">
                      <div className="space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">Grade & School Year</p>
                      </div>
                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <div className="space-y-1">
                          <label className="text-sm font-medium text-slate-600">Grade Level</label>
                          <select
                            value={studentForm.data.grade_level_id}
                            onChange={(e) => {
                              studentForm.setData("grade_level_id", e.target.value);
                              studentForm.setData("section_id", "");
                            }}
                            className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm shadow-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/40"
                            required
                          >
                            <option value="">Select grade level</option>
                            {gradeLevels.map((g) => (
                              <option key={g.id} value={g.id}>
                                {g.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-sm font-medium text-slate-600">Section (optional)</label>
                          <select
                            value={studentForm.data.section_id || ""}
                            onChange={(e) => studentForm.setData("section_id", e.target.value)}
                            className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm shadow-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/40 disabled:bg-slate-50 disabled:text-slate-400"
                            disabled={!studentForm.data.grade_level_id}
                          >
                            <option value="">{studentForm.data.grade_level_id ? "Select section" : "Select grade first"}</option>
                            {filteredSections.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                          </select>
                          {!studentForm.data.grade_level_id && (
                            <p className="text-xs text-slate-500">Choose a grade to see available sections.</p>
                          )}
                        </div>
                        <div className="space-y-1 md:col-span-2">
                          <label className="text-sm font-medium text-slate-600">School Year</label>
                          <select
                            value={studentForm.data.school_year_id}
                            onChange={(e) => studentForm.setData("school_year_id", e.target.value)}
                            className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm shadow-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/40 disabled:bg-slate-50 disabled:text-slate-400"
                            required
                            disabled={activeSchoolYears.length === 0}
                          >
                            <option value="">Select school year</option>
                            {activeSchoolYears.map((sy) => (
                              <option key={sy.id} value={sy.id}>
                                {sy.name}
                              </option>
                            ))}
                          </select>
                          {activeSchoolYears.length === 0 && (
                            <p className="text-xs font-semibold text-red-500">No active school years available. Please activate one first.</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-4">
                      <button
                        type="button"
                        onClick={() => {
                          studentForm.reset();
                          setGuardianSearch("");
                          setStudentModalMode("add");
                          setEditingStudentId(null);
                          setShowStudentModal(false);
                        }}
                        className="inline-flex h-11 items-center rounded-full border border-slate-200 px-5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                        disabled={studentLoading}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className={`inline-flex h-11 min-w-[120px] items-center justify-center rounded-full px-6 text-sm font-semibold text-white shadow-sm transition ${studentLoading || activeSchoolYears.length === 0
                            ? "bg-blue-400"
                            : "bg-blue-600 hover:bg-blue-500"
                          }`}
                        disabled={studentLoading || activeSchoolYears.length === 0}
                      >
                        {studentLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {studentModalMode === "edit" ? "Updating" : "Saving"}
                          </>
                        ) : studentModalMode === "edit" ? (
                          "Update Student"
                        ) : (
                          "Create Student"
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}
        {showLinkModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl border border-slate-100">
              <div className="flex items-center justify-between border-b px-6 py-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Link Students</p>
                  <h3 className="text-xl font-semibold text-slate-800">{linkGuardian?.name || "Select Guardian"}</h3>
                </div>
                <button
                  onClick={closeLinkModal}
                  className="rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200"
                  disabled={linkLoading}
                >
                  <X size={16} />
                </button>
              </div>
              <div className="px-6 py-5 space-y-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <p className="text-sm text-slate-500">
                    Choose students without guardians to link to <span className="font-semibold text-slate-700">{linkGuardian?.name}</span>.
                  </p>
                  <div className="relative w-full md:w-64">
                    <input
                      type="text"
                      value={linkSearch}
                      onChange={(e) => setLinkSearch(e.target.value)}
                      placeholder="Search students..."
                      className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                </div>
                <div className="max-h-80 overflow-y-auto border border-slate-100 rounded-2xl divide-y divide-slate-100">
                  {linkableStudents.length ? (
                    linkableStudents.map((student) => {
                      const gradeName = gradeLevels.find((g) => g.id === student.grade_level_id)?.name || "—";
                      const sectionName = sections.find((sec) => sec.id === student.section_id)?.name || "—";
                      const schoolYearName = schoolYears.find((sy) => sy.id === student.school_year_id)?.name || "—";
                      const checked = linkSelected.includes(student.id);
                      return (
                        <label
                          key={student.id}
                          className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-blue-50/40"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleLinkSelection(student.id)}
                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <div>
                            <p className="font-semibold text-slate-800">
                              {student.first_name} {student.middle_name} {student.last_name}
                            </p>
                            <p className="text-xs text-slate-500">
                              LRN: {student.lrn || "—"} • {gradeName} {sectionName ? `- ${sectionName}` : ""} • {schoolYearName}
                            </p>
                          </div>
                        </label>
                      );
                    })
                  ) : (
                    <div className="px-4 py-10 text-center text-slate-400 text-sm">No available students to link.</div>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-3 border-t px-6 py-4 md:flex-row md:items-center md:justify-between">
                <p className="text-sm text-slate-500">
                  Selected: <span className="font-semibold text-slate-700">{linkSelected.length}</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={closeLinkModal}
                    className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                    disabled={linkLoading}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitLinkedStudents}
                    disabled={linkLoading || linkSelected.length === 0}
                    className={`rounded-2xl px-5 py-2 text-sm font-semibold text-white shadow-sm transition ${linkLoading ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-500"}`}
                  >
                    {linkLoading ? "Linking..." : "Link Selected"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}