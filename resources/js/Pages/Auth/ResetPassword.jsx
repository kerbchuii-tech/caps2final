import { Head, router, useForm } from '@inertiajs/react';
import React, { useEffect, useMemo, useState } from 'react';

const resetContexts = {
  treasurer: {
    roleLabel: 'Treasurer',
    loginPath: '/treasurer/login',
    formSubtitle: 'Confirm your email and set a strong new password to secure your account.',
    sideSubtitle: 'Reset your treasurer credentials in a secure space managed by the School PTA.',
    sideHelp: 'Need assistance with this reset? Contact your SPTA administrator.',
    confirmMessage: 'Are you sure you want to change your treasurer password?',
    successMessage: 'Your treasurer password has been changed successfully.',
    successButton: 'Go to Treasurer Login',
  },
  guardian: {
    roleLabel: 'Guardian',
    loginPath: '/guardian/login',
    formSubtitle: 'Use your registered email to create a new password for guardian access.',
    sideSubtitle: 'Reset your guardian credentials and keep track of student updates with confidence.',
    sideHelp: 'Need help? Reach out to the school registrar or SPTA desk.',
    confirmMessage: 'Are you sure you want to change your guardian password?',
    successMessage: 'Your guardian password has been changed successfully.',
    successButton: 'Go to Guardian Login',
  },
  admin: {
    roleLabel: 'Admin',
    loginPath: '/admin/login',
    formSubtitle: 'Provide your admin email and new password to regain management access.',
    sideSubtitle: 'Reset your admin credentials and continue managing the SPTA platform securely.',
    sideHelp: 'Need help? Contact the system maintainer.',
    confirmMessage: 'Are you sure you want to change your admin password?',
    successMessage: 'Your admin password has been changed successfully.',
    successButton: 'Go to Admin Login',
  },
  auditor: {
    roleLabel: 'Auditor',
    loginPath: '/auditor/login',
    formSubtitle: 'Enter your email and create a new password to audit financial records securely.',
    sideSubtitle: 'Reset your auditor credentials and continue monitoring reports with confidence.',
    sideHelp: 'Need help? Contact the system maintainer or SPTA administrator.',
    confirmMessage: 'Are you sure you want to change your auditor password?',
    successMessage: 'Your auditor password has been changed successfully.',
    successButton: 'Go to Auditor Login',
  },
};

export default function ResetPassword({ token, email, redirect = 'treasurer' }) {
  const redirectKey = redirect || 'treasurer';
  const context = resetContexts[redirectKey] ?? resetContexts.treasurer;

  const { data, setData, post, processing, errors, reset } = useForm({
    token: token,
    email: email || '',
    password: '',
    password_confirmation: '',
    redirect: redirectKey,
  });

  const [touched, setTouched] = useState({ email: false, password: false, confirm: false });
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [successCountdown, setSuccessCountdown] = useState(5);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const emailError = useMemo(() => {
    if (!touched.email) return '';
    if (!data.email?.trim()) return 'Email is required';
    const re = /[^\s@]+@[^\s@]+\.[^\s@]+/;
    return re.test(data.email) ? '' : 'Please enter a valid email address';
  }, [data.email, touched.email]);

  const passMatch = useMemo(() => {
    if (!data.password && !data.password_confirmation) return null;
    return data.password === data.password_confirmation;
  }, [data.password, data.password_confirmation]);

  const passwordHints = useMemo(() => {
    const hints = [];
    if (!data.password) return hints;
    if (data.password.length < 8) hints.push('At least 8 characters');
    if (!/[A-Z]/.test(data.password)) hints.push('One uppercase letter');
    if (!/[a-z]/.test(data.password)) hints.push('One lowercase letter');
    if (!/[0-9]/.test(data.password)) hints.push('One number');
    return hints;
  }, [data.password]);

  useEffect(() => {
    setData('redirect', redirectKey);
  }, [redirectKey, setData]);

  const submit = (e) => {
    e.preventDefault();
    const confirmed = window.confirm(context.confirmMessage);
    if (!confirmed) {
      return;
    }
    post(route('password.store'), {
      onSuccess: () => {
        setHasSubmitted(true);
      },
      onFinish: () => reset('password', 'password_confirmation'),
    });
  };

  const baseInput = 'w-full px-4 py-3 rounded-xl border transition focus:outline-none focus:ring-2';
  const neutral = ' border-gray-300 focus:ring-blue-500';
  const danger = ' border-red-500 focus:ring-red-500';
  const success = ' border-green-500 focus:ring-green-500';

  const emailClass = baseInput + (emailError || errors.email ? danger : touched.email ? success : neutral);
  const passwordClass = baseInput + (errors.password ? danger : neutral);
  const confirmClass =
    baseInput + (errors.password_confirmation ? danger : passMatch === null ? neutral : passMatch ? success : danger);

  useEffect(() => {
    if (!hasSubmitted) return;
    const interval = setInterval(() => {
      setSuccessCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          router.visit(context.loginPath);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [hasSubmitted, context.loginPath]);

  return (
    <>
      <Head title={`Change Password of ${context.roleLabel}`} />

      <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-gradient-to-br from-slate-100 via-slate-200 to-slate-100">
        <div className="flex flex-col lg:flex-row max-w-5xl w-full gap-6 lg:gap-0 backdrop-blur-sm">
          <div className="lg:w-2/5 bg-gradient-to-br from-blue-700 via-blue-600 to-blue-500 flex flex-col items-center justify-center p-10 text-white rounded-3xl lg:rounded-r-none shadow-xl">
            <div className="w-28 h-28 rounded-3xl bg-white/10 backdrop-blur-sm flex items-center justify-center mb-5 shadow-lg">
              <img src="/images/ANCHS.png" alt="School Logo" className="w-20 h-20 object-contain drop-shadow" />
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-center leading-snug">
              Alubijid Comprehensive <br /> National Highschool
            </h1>
            <p className="mt-4 text-blue-100 text-sm text-center max-w-xs leading-relaxed">
              {context.sideSubtitle}
            </p>
            <div className="mt-6 text-xs text-blue-100/80 text-center">
              <p>{context.sideHelp}</p>
            </div>
          </div>

          <div className="lg:w-3/5 bg-white rounded-3xl lg:rounded-l-none shadow-xl p-8 md:p-10 flex flex-col">
            {!hasSubmitted ? (
              <>
                <h2 className="text-3xl font-extrabold text-gray-800 mb-2">Change Password of {context.roleLabel}</h2>
                <p className="text-gray-500 mb-6 text-sm">{context.formSubtitle}</p>

                <form onSubmit={submit} className="space-y-6 lg:space-y-5" noValidate>
                  <div>
                    <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                    <input
                      id="email"
                      type="email"
                      name="email"
                      value={data.email}
                      onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                      onChange={(e) => setData('email', e.target.value)}
                      autoComplete="username"
                      className={emailClass}
                      placeholder="you@example.com"
                    />
                    {(emailError || errors.email) && (
                      <p className="text-red-600 text-sm mt-2">{emailError || errors.email}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
                    <div className="relative">
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={data.password}
                        onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                        onChange={(e) => setData('password', e.target.value)}
                        autoComplete="new-password"
                        className={`${passwordClass} pr-16`}
                        placeholder="Enter new password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute inset-y-0 right-3 text-sm font-medium text-blue-600 hover:text-blue-800"
                      >
                        {showPassword ? 'Hide' : 'Show'}
                      </button>
                    </div>
                    {errors.password && <p className="text-red-600 text-sm mt-2">{errors.password}</p>}
                    {passwordHints.length > 0 && (
                      <ul className="mt-2 text-xs text-gray-600 list-disc pl-5">
                        {passwordHints.map((h, idx) => (
                          <li key={idx}>{h}</li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div>
                    <label htmlFor="password_confirmation" className="block text-sm font-semibold text-gray-700 mb-2">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <input
                        id="password_confirmation"
                        type={showConfirmPassword ? 'text' : 'password'}
                        name="password_confirmation"
                        value={data.password_confirmation}
                        onBlur={() => setTouched((t) => ({ ...t, confirm: true }))}
                        onChange={(e) => setData('password_confirmation', e.target.value)}
                        autoComplete="new-password"
                        className={`${confirmClass} pr-16`}
                        placeholder="Re-enter new password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        className="absolute inset-y-0 right-3 text-sm font-medium text-blue-600 hover:text-blue-800"
                      >
                        {showConfirmPassword ? 'Hide' : 'Show'}
                      </button>
                    </div>
                    {passMatch !== null && (
                      <p className={`mt-2 text-sm ${passMatch ? 'text-green-600' : 'text-red-600'}`}>
                        {passMatch ? 'Passwords match' : 'Passwords do not match'}
                      </p>
                    )}
                    {errors.password_confirmation && (
                      <p className="text-red-600 text-sm mt-2">{errors.password_confirmation}</p>
                    )}
                  </div>

                  <div className="pt-1 flex items-center justify-end">
                    <button
                      type="submit"
                      disabled={processing}
                      className={`px-6 py-3 rounded-xl text-white font-semibold shadow-md transition transform ${
                        processing ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 hover:scale-[1.01]'
                      }`}
                    >
                      {processing ? 'Saving...' : 'Change Password'}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center text-center flex-1 space-y-6">
                <div className="w-20 h-20 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-4xl font-bold">
                  ✓
                </div>
                <div>
                  <h2 className="text-3xl font-extrabold text-gray-800">Password Updated!</h2>
                  <p className="text-gray-500 mt-2 max-w-sm">
                    {context.successMessage} You will be redirected to the login page in {successCountdown}{' '}
                    second{successCountdown === 1 ? '' : 's'}.
                  </p>
                </div>
                <button
                  onClick={() => router.visit(context.loginPath)}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-md transition"
                >
                  {context.successButton}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}