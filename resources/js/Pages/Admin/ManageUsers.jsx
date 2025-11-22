import React, { useEffect, useState } from "react";
import AdminLayout from "@/Layouts/AdminLayout";
import { router, usePage } from "@inertiajs/react";
import classNames from "classnames";
import Swal from "sweetalert2";
import { PlusCircle } from "lucide-react";

export default function ManageUsers() {
  const { users = [] } = usePage().props;

  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showArchived, setShowArchived] = useState(false); // Toggle to view archives
  const [currentPage, setCurrentPage] = useState(1);
  const [userData, setUserData] = useState({
    last_name: "",
    first_name: "",
    username: "",
    email: "",
    role: "",
  });
  const [emailError, setEmailError] = useState("");

  const swalBaseClasses = {
    popup: "rounded-3xl shadow-2xl p-6 swal2-review-modal",
    title: "text-lg font-bold text-gray-900",
    html: "text-gray-700",
    primaryBtn:
      "!px-6 !py-2.5 !text-sm !font-semibold !rounded-2xl !bg-blue-600 !text-white hover:!bg-blue-700",
    secondaryBtn:
      "!px-6 !py-2.5 !text-sm !font-semibold !rounded-2xl !border !border-gray-200 !text-gray-700 hover:!bg-gray-100",
    warnBtn:
      "!px-6 !py-2.5 !text-sm !font-semibold !rounded-2xl !bg-red-500 !text-white hover:!bg-red-600",
  };

  const emailRegex = /^[\w.+-]+@(gmail\.com|yahoo\.com)$/i;

  const roles = ["admin", "treasurer", "auditor", "guardian"];

  const groupedUsers = roles.reduce((acc, role) => {
    acc[role] = users
      .filter((u) => u.role === role)
      .filter((u) => (showArchived ? u.archived === 0 : u.archived === 1));
    return acc;
  }, {});

  const totalActiveUsers = users.filter((u) => u.archived === 1).length;
  const totalArchivedUsers = users.filter((u) => u.archived === 0).length;
  const summaryCards = [
    { label: "Total Users", value: users.length, hint: "Across all roles" },
    { label: "Active Users", value: totalActiveUsers, hint: "Can access the system" },
    { label: "Archived Users", value: totalArchivedUsers, hint: "Stored for reference" },
  ];

  const [activeRole, setActiveRole] = useState("admin");

  const itemsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [activeRole, showArchived, users]);

  const filteredUsers = groupedUsers[activeRole] || [];
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + itemsPerPage);

  const pageNumbers = Array.from({ length: totalPages }, (_, idx) => idx + 1);

  const goToPage = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  const handleViewToggle = (archived) => {
    setShowArchived(archived);
    setCurrentPage(1);
  };

  const toggleUserStatus = (userId) => {
    Swal.fire({
      title: "Change Status?",
      text: "Active users can login. Inactive users cannot login.",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#2563eb",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, change it",
    }).then((result) => {
      if (result.isConfirmed) {
        router.post(
          `/admin/users/${userId}/toggle-status`,
          {},
          {
            preserveScroll: true,
            onSuccess: () =>
              Swal.fire("Success!", "User status updated.", "success"),
            onError: () =>
              Swal.fire("Error!", "Failed to update status.", "error"),
          }
        );
      }
    });
  };

  const archiveUser = (userId) => {
    Swal.fire({
      title: "Archive User?",
      text: "This user will be archived.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, archive",
    }).then((result) => {
      if (result.isConfirmed) {
        router.post(
          `/admin/users/${userId}/archive`,
          {},
          {
            preserveScroll: true,
            onSuccess: () => Swal.fire("Archived!", "User archived.", "success"),
            onError: () => Swal.fire("Error!", "Failed to archive user.", "error"),
          }
        );
      }
    });
  };

  const resetModal = () => {
    setShowModal(false);
    setUserData({
      last_name: "",
      first_name: "",
      username: "",
      email: "",
      role: "",
    });
    setEmailError("");
  };

  const handleModalDismiss = () => {
    const hasChanges = Object.values(userData).some(Boolean);
    if (!hasChanges) {
      resetModal();
      return;
    }

    Swal.fire({
      title: "Discard changes?",
      text: "Your entered data will be lost.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Discard",
      cancelButtonText: "Keep editing",
      reverseButtons: true,
      customClass: {
        popup: swalBaseClasses.popup,
        title: swalBaseClasses.title,
        htmlContainer: swalBaseClasses.html,
        confirmButton: swalBaseClasses.warnBtn,
        cancelButton: swalBaseClasses.secondaryBtn,
      },
      buttonsStyling: false,
    }).then((res) => {
      if (res.isConfirmed) resetModal();
    });
  };

  const handleSubmit = () => {
    if (
      !userData.first_name ||
      !userData.last_name ||
      !userData.username ||
      !userData.email ||
      !userData.role
    ) {
      Swal.fire({
        title: "Missing Info",
        html: `
          <div class="text-left space-y-2">
            <p class="text-xs text-gray-500 uppercase tracking-wide">Please fill all required fields:</p>
            <ul class="list-disc pl-4 text-sm text-gray-700">
              <li>First Name</li>
              <li>Last Name</li>
              <li>Username</li>
              <li>Email</li>
              <li>Role</li>
            </ul>
          </div>
        `,
        icon: "warning",
        customClass: {
          popup: swalBaseClasses.popup,
          title: swalBaseClasses.title,
          htmlContainer: swalBaseClasses.html,
          confirmButton: swalBaseClasses.primaryBtn,
        },
        buttonsStyling: false,
      });
      return;
    }

    if (!emailRegex.test(userData.email)) {
      setEmailError("Email must end with @gmail.com or @yahoo.com.");
      Swal.fire({
        title: "Invalid Email",
        html: `
          <div class="text-left space-y-2">
            <p class="text-xs text-gray-500 uppercase tracking-wide">Please use a valid email address:</p>
            <ul class="list-disc pl-4 text-sm text-gray-700">
              <li>Gmail (@gmail.com)</li>
              <li>Yahoo (@yahoo.com)</li>
            </ul>
          </div>
        `,
        icon: "warning",
        customClass: {
          popup: swalBaseClasses.popup,
          title: swalBaseClasses.title,
          htmlContainer: swalBaseClasses.html,
          confirmButton: swalBaseClasses.primaryBtn,
        },
        buttonsStyling: false,
      });
      return;
    }
    setEmailError("");

    const reviewHtml = `
      <div class="text-left space-y-5 text-sm text-gray-800">
        <div>
          <div class="grid grid-cols-2 text-xs uppercase tracking-wide text-gray-500">
            <span>Full name</span>
            <span>Email</span>
          </div>
          <div class="grid grid-cols-2 mt-1 font-semibold">
            <span class="text-base">${userData.first_name} ${userData.last_name}</span>
            <span>${userData.email}</span>
          </div>
        </div>
        <div>
          <div class="grid grid-cols-2 text-xs uppercase tracking-wide text-gray-500">
            <span>Username</span>
            <span>Role</span>
          </div>
          <div class="grid grid-cols-2 mt-1 font-semibold">
            <span>${userData.username}</span>
            <span>${userData.role}</span>
          </div>
        </div>
      </div>
    `;

    Swal.fire({
      title: "Review user account",
      html: reviewHtml,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, add",
      cancelButtonText: "Edit",
      confirmButtonColor: "#2563eb",
      customClass: {
        popup: swalBaseClasses.popup,
        title: swalBaseClasses.title,
        htmlContainer: swalBaseClasses.html,
        confirmButton: swalBaseClasses.primaryBtn,
        cancelButton: swalBaseClasses.secondaryBtn,
      },
      reverseButtons: true,
      buttonsStyling: false,
    }).then((res) => {
      if (res.isConfirmed) {
        setLoading(true);
        Swal.fire({
          html: `
            <div class="swal-loading-content">
              <div class="swal-loading-spinner"></div>
              <p class="swal-loading-text">Creating user...</p>
              <p class="swal-loading-subtext">We're setting things up for you.</p>
            </div>
          `,
          allowOutsideClick: false,
          showConfirmButton: false,
          customClass: {
            popup: `${swalBaseClasses.popup} swal2-loading-card`,
            htmlContainer: "w-full",
          },
        });

        router.post(route("admin.users.store"), { ...userData }, {
          preserveScroll: true,
          onSuccess: (page) => {
            setLoading(false);
            Swal.close();
            resetModal();

            const f = page.props.flash;
            if (f?.username && f?.password && f?.email) {
              Swal.fire({
                title: "Account Created!",
                html: `
                  User <strong>${f.username}</strong> has been created.<br>
                  Password: <strong>${f.password}</strong><br>
                  Login credentials sent to <strong>${f.email}</strong>.
                `,
                icon: "success",
                toast: true,
                position: "top-end",
                timer: 6000,
                showConfirmButton: false,
              });
            } else {
              Swal.fire({
                title: "User added",
                icon: "success",
                toast: true,
                position: "top-end",
                timer: 3500,
                showConfirmButton: false,
              });
            }
          },
          onError: (errors) => {
            setLoading(false);
            Swal.close();
            const getMessage = (field) => {
              const value = errors?.[field];
              if (!value) return null;
              return Array.isArray(value) ? value[0] : value;
            };

            const message =
              getMessage("email") ||
              getMessage("username") ||
              getMessage("mail") ||
              getMessage("first_name") ||
              getMessage("last_name") ||
              getMessage("role") ||
              "Failed to create user.";
            Swal.fire({
              title: "Error",
              text: message,
              icon: "error",
              toast: true,
              position: "top-end",
              timer: 4000,
              showConfirmButton: false,
            });
          },
        });
      }
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-4">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400"></p>
            <div>
              <h1 className="text-3xl font-extrabold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                Manage Users</h1>
            </div>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="self-start md:self-auto md:ml-2 rounded-2xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500"
          >
            <span className="inline-flex items-center gap-2">
              <PlusCircle size={16} /> Add User
            </span>
          </button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {summaryCards.map((card) => (
            <StatCard key={card.label} {...card} />
          ))}
        </div>

        {/* Tabs + Controls */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-2 flex-wrap">
            {roles.map((role) => (
              <button
                key={role}
                onClick={() => {
                  setActiveRole(role);
                  setCurrentPage(1);
                }}
                className={classNames(
                  "rounded-2xl border px-4 py-2 text-sm font-semibold transition",
                  activeRole === role
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                    : "bg-white text-slate-500 border-slate-200 hover:text-slate-900"
                )}
              >
                {role.charAt(0).toUpperCase() + role.slice(1)}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex rounded-full border border-slate-200 bg-white p-1 text-sm font-medium">
              <button
                onClick={() => handleViewToggle(false)}
                className={`rounded-full px-4 py-1.5 transition ${!showArchived ? "bg-blue-600 text-white shadow" : "text-slate-500"
                  }`}
              >
                Active
              </button>
              <button
                onClick={() => handleViewToggle(true)}
                className={`rounded-full px-4 py-1.5 transition ${showArchived ? "bg-blue-600 text-white shadow" : "text-slate-500"
                  }`}
              >
                Archived
              </button>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-sm">
          <table className="w-full text-sm text-gray-700">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 border text-left font-semibold">Full Name</th>
                <th className="px-4 py-3 border text-left font-semibold">Username</th>
                {!showArchived && <th className="px-4 py-3 border text-left font-semibold">Status</th>}
                <th className="px-4 py-3 border text-left font-semibold">{showArchived ? "Archive Status" : "Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 && (
                <tr>
                  <td
                    colSpan={showArchived ? 3 : 4}
                    className="text-center py-6 text-gray-500 italic"
                  >
                    {showArchived ? `No archived ${activeRole} users.` : `No ${activeRole} users found.`}
                  </td>
                </tr>
              )}
              {paginatedUsers.map((user, idx) => (
                <tr
                  key={user.id}
                  className={`${idx % 2 === 0 ? "bg-white" : "bg-blue-50/40"} hover:bg-blue-50`}
                >
                  <td className="px-4 py-2 border">
                    {user.first_name} {user.last_name}
                  </td>
                  <td className="px-4 py-2 border">{user.username}</td>
                  {!showArchived && (
                    <td className="px-4 py-2 border">
                      {user.archived === 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full bg-gray-200 text-gray-700">Archived</span>
                      ) : user.status === "active" ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full bg-green-100 text-green-700">Active</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full bg-yellow-100 text-yellow-700">Inactive</span>
                      )}
                    </td>
                  )}
                  <td className="px-4 py-2 border">
                    {showArchived ? (
                      <button
                        onClick={() => {
                          Swal.fire({
                            title: "Restore User?",
                            text: "Are you sure you want to restore this account?",
                            icon: "question",
                            showCancelButton: true,
                            confirmButtonColor: "#16a34a",
                            cancelButtonColor: "#6b7280",
                            confirmButtonText: "Yes, restore",
                          }).then((result) => {
                            if (!result.isConfirmed) return;

                            router.post(route("admin.users.restore", user.id), {}, {
                              preserveScroll: true,
                              onSuccess: () =>
                                Swal.fire("Restored!", "User has been moved back to active.", "success"),
                              onError: () =>
                                Swal.fire("Error!", "Failed to restore user.", "error"),
                            });
                          });
                        }}
                        className="px-3 py-1.5 rounded-full bg-green-600 text-white text-xs font-semibold shadow-md hover:bg-green-700 transition"
                      >
                        Restore
                      </button>
                    ) : user.archived === 1 ? (
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => toggleUserStatus(user.id)}
                          className={`px-3 py-1.5 rounded-full text-white text-xs font-semibold shadow-md transition-all ${user.status === "active"
                            ? "bg-yellow-500 hover:bg-yellow-600"
                            : "bg-green-600 hover:bg-green-700"
                            }`}
                          title={user.status === "active" ? "Deactivate (cannot login)" : "Activate (can login)"}
                        >
                          {user.status === "active" ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          onClick={() => archiveUser(user.id)}
                          className="px-3 py-1.5 rounded-full bg-red-500 text-white text-xs font-semibold shadow-md hover:bg-red-600 transition-all"
                          title="Move to Archives"
                        >
                          Archive
                        </button>
                      </div>
                    ) : (
                      <span className="text-gray-400 italic">Archived</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredUsers.length > 0 && (
            <div className="flex flex-col items-center gap-3 px-4 py-4 border-t bg-gradient-to-r from-white via-blue-50/40 to-white text-center">
              <span className="text-sm text-gray-600">
                Showing <strong>{filteredUsers.length === 0 ? 0 : startIndex + 1}</strong> to <strong>{Math.min(startIndex + paginatedUsers.length, filteredUsers.length)}</strong> of <strong>{filteredUsers.length}</strong> users
              </span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-4 py-1.5 text-sm rounded-full border border-blue-200 text-blue-500 bg-white hover:bg-blue-50 transition disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white"
                >
                  Previous
                </button>
                <div className="flex items-center gap-2">
                  {pageNumbers.map((page) => (
                    <button
                      key={page}
                      onClick={() => goToPage(page)}
                      className={`w-9 h-9 flex items-center justify-center text-sm rounded-full transition border ${page === currentPage
                        ? "bg-blue-600 text-white border-blue-600 shadow-md"
                        : "bg-white text-blue-500 border-blue-200 hover:bg-blue-50"
                        }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-4 py-1.5 text-sm rounded-full border border-blue-200 text-blue-500 bg-white hover:bg-blue-50 transition disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Add User Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 py-6">
            <div className="relative w-full max-w-xl rounded-3xl border border-slate-200 bg-white shadow-xl">
              <button
                onClick={handleModalDismiss}
                className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100"
                aria-label="Close add user modal"
              >
                𝘅
              </button>

              <div className="p-6 space-y-6">
                <div className="space-y-2">

                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">Add User</h2>
                  </div>
                </div>

                <div className="grid gap-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <input
                      type="text"
                      placeholder="Last name"
                      value={userData.last_name}
                      onChange={(e) =>
                        setUserData({ ...userData, last_name: e.target.value })
                      }
                      className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40"
                    />
                    <input
                      type="text"
                      placeholder="First name"
                      value={userData.first_name}
                      onChange={(e) =>
                        setUserData({ ...userData, first_name: e.target.value })
                      }
                      className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Username"
                    value={userData.username}
                    onChange={(e) =>
                      setUserData({ ...userData, username: e.target.value })
                    }
                    className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40"
                  />
                  <div className="space-y-1">
                    <input
                      type="email"
                      placeholder="Email address"
                      value={userData.email}
                      onChange={(e) => {
                        const value = e.target.value.trim();
                        setUserData({ ...userData, email: value });
                        if (!value) {
                          setEmailError("Email is required.");
                          return;
                        }
                        if (!emailRegex.test(value)) {
                          setEmailError("Email must end with @gmail.com or @yahoo.com.");
                          return;
                        }
                        setEmailError("");
                      }}
                      className={`w-full rounded-2xl border px-4 py-2.5 text-slate-800 focus:ring-2 ${emailError
                        ? "border-red-400 focus:ring-red-400/50"
                        : "border-slate-200 focus:border-blue-500 focus:ring-blue-500/40"
                        }`}
                    />
                    {emailError && (
                      <p className="text-xs font-semibold text-red-500">{emailError}</p>
                    )}
                  </div>
                  <select
                    value={userData.role}
                    onChange={(e) =>
                      setUserData({ ...userData, role: e.target.value })
                    }
                    className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40"
                  >
                    <option value="">Select role</option>
                    {/* <option value="admin">Admin</option> */}
                    <option value="treasurer">Treasurer</option>
                    <option value="auditor">Auditor</option>
                    {/* <option value="guardian">Guardian</option> */}
                  </select>
                </div>



                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={handleModalDismiss}
                    className="inline-flex h-11 min-w-[130px] items-center justify-center rounded-full border border-slate-200 px-5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    className="inline-flex h-11 min-w-[130px] items-center justify-center rounded-full bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-60"
                    disabled={loading}
                  >
                    {loading ? "Adding..." : "Add user"}
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

const StatCard = ({ label, value, hint }) => (
  <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
    <p className="text-xs uppercase tracking-[0.1em] text-slate-400">{label}</p>
    <div className="mt-2 text-3xl font-semibold text-slate-900">{value.toLocaleString()}</div>
    <p className="text-xs text-slate-500">{hint}</p>
  </div>
);
