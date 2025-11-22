import React, { useState, useEffect } from "react";
import TreasurerLayout from "@/Layouts/TreasurerLayout";
import { useForm, usePage, router } from "@inertiajs/react";
import { Lock, X, User, Eye, EyeOff, LogOut } from "lucide-react";
import Swal from "sweetalert2";

const PasswordInput = ({ label, valueKey, show, setShow, form, onChange }) => (
  <div className="mt-4">
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <div className="relative w-full">
      <input
        type={show ? "text" : "password"}
        name={valueKey}
        value={form.data[valueKey]}
        onChange={onChange}
        className={`block w-full border rounded-xl px-4 py-2 pr-11 bg-white shadow-sm focus:outline-none focus:ring-2 transition ${
          form.errors[valueKey] ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-blue-500"
        }`}
      />
      <div
        onClick={() => setShow(!show)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 cursor-pointer select-none"
        aria-label={show ? "Hide password" : "Show password"}
        title={show ? "Hide password" : "Show password"}
      >
        {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
      </div>
    </div>
    {form.errors[valueKey] && (
      <p className="text-red-500 text-sm mt-1">{form.errors[valueKey]}</p>
    )}
  </div>
);

export default function TreasurerProfile() {
  const { auth } = usePage().props;
  const user = auth.user;

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordMismatch, setPasswordMismatch] = useState(false);

  const passwordForm = useForm({
    current_password: "",
    new_password: "",
    new_password_confirmation: "",
  });

  const strengthScore = (pwd) => {
    let score = 0;
    if (!pwd) return 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[a-z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return Math.min(score, 5);
  };
  const pwdStrength = strengthScore(passwordForm.data.new_password);

  useEffect(() => {
    if (
      passwordForm.data.new_password_confirmation &&
      passwordForm.data.new_password !== passwordForm.data.new_password_confirmation
    ) {
      setPasswordMismatch(true);
    } else {
      setPasswordMismatch(false);
    }
  }, [passwordForm.data.new_password, passwordForm.data.new_password_confirmation]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (passwordMismatch) return;

    passwordForm.put("/treasurer/profile/password", {
      onSuccess: () => {
        setShowPasswordModal(false);
        passwordForm.reset();
        Swal.fire({
          icon: "success",
          title: "Password Updated",
          text: "Your password has been updated successfully.",
          timer: 2000,
          showConfirmButton: false,
        });
      },
      onError: () => {
        Swal.fire({
          icon: "error",
          title: "Update Failed",
          text: "Failed to update password. Please check your inputs.",
        });
      },
    });
  };

  const handleLogout = () => {
    router.post("/treasurer/logout");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 flex flex-col items-center justify-start py-16 px-4">
      <div className="bg-white/80 backdrop-blur rounded-3xl shadow-xl w-full max-w-sm flex flex-col items-center p-8 space-y-4 border border-gray-100">
        <div className="w-32 h-32 flex items-center justify-center rounded-full border-4 border-gray-200 shadow-lg bg-gradient-to-br from-gray-100 to-white">
          <User className="w-16 h-16 text-gray-400" />
        </div>
        <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">
          {user.first_name} {user.last_name}
        </h2>
        <p className="text-gray-500 text-sm mb-2">Treasurer</p>

        <button
          onClick={() => setShowPasswordModal(true)}
          className="w-full bg-blue-600 text-white py-2 rounded-xl hover:bg-blue-700 transition flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
        >
          <Lock className="w-4 h-4" /> Change Password
        </button>

        <button
          onClick={handleLogout}
          className="w-full bg-gray-200 text-gray-700 py-2 rounded-xl hover:bg-gray-300 transition flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2"
        >
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </div>

      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 relative border border-gray-100">
            <button
              onClick={() => setShowPasswordModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition"
            >
              <X className="w-6 h-6" />
            </button>

            <h3 className="text-2xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
              <Lock className="text-blue-600 w-6 h-6" /> Change Password
            </h3>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <PasswordInput
                label="Current Password"
                valueKey="current_password"
                show={showCurrent}
                setShow={setShowCurrent}
                form={passwordForm}
                onChange={(e) => passwordForm.setData("current_password", e.target.value)}
              />
              <PasswordInput
                label="New Password"
                valueKey="new_password"
                show={showNew}
                setShow={setShowNew}
                form={passwordForm}
                onChange={(e) => passwordForm.setData("new_password", e.target.value)}
              />
              <div className="mt-1">
                <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      pwdStrength <= 1
                        ? "bg-red-500 w-1/5"
                        : pwdStrength === 2
                        ? "bg-orange-500 w-2/5"
                        : pwdStrength === 3
                        ? "bg-yellow-500 w-3/5"
                        : pwdStrength === 4
                        ? "bg-green-500 w-4/5"
                        : "bg-emerald-600 w-full"
                    }`}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Use at least 8 characters, mixing uppercase, lowercase, numbers, and symbols.
                </p>
              </div>
              <PasswordInput
                label="Confirm New Password"
                valueKey="new_password_confirmation"
                show={showConfirm}
                setShow={setShowConfirm}
                form={passwordForm}
                onChange={(e) => passwordForm.setData("new_password_confirmation", e.target.value)}
              />

              {passwordMismatch && (
                <p className="text-red-500 text-sm mt-1">Password does not match.</p>
              )}

              {passwordForm.errors.current_password && (
                <p className="text-red-500 text-sm mt-1">{passwordForm.errors.current_password}</p>
              )}

              <button
                type="submit"
                disabled={passwordForm.processing || passwordMismatch}
                className="w-full bg-blue-600 text-white py-2 rounded-xl hover:bg-blue-700 transition disabled:opacity-50 mt-4 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
              >
                Update Password
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

TreasurerProfile.layout = (page) => <TreasurerLayout children={page} />;
