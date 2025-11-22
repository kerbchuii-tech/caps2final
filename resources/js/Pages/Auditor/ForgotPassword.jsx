import React, { useEffect, useState } from 'react';
import { useForm } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, PartyPopper } from 'lucide-react';

export default function ForgotPassword({ isOpen, onClose }) {
  const { data, setData, post, processing, errors, reset } = useForm({
    email: '',
    redirect: 'auditor',
  });

  const [clientError, setClientError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setData((prev) => ({ ...prev, redirect: 'auditor' }));
    }
  }, [isOpen, setData]);

  const validateEmail = (value) => {
    if (!value || !value.trim()) return 'Email is required';
    const re = /[^\s@]+@[^\s@]+\.[^\s@]+/;
    if (!re.test(value)) return 'Please enter a valid email address';
    return '';
  };

  const resetState = () => {
    setEmailSent(false);
    setSuccessMsg('');
    setClientError('');
    reset('email');
  };

  const submit = (e) => {
    e.preventDefault();
    const err = validateEmail(data.email);
    if (err) {
      setClientError(err);
      return;
    }

    setClientError('');
    setSuccessMsg('');

    post(route('password.email'), {
      preserveScroll: true,
      onSuccess: () => {
        setSuccessMsg('We have emailed your auditor password reset link.');
        setEmailSent(true);
        reset('email');
      },
      onError: () => {
        setEmailSent(false);
      },
    });
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="relative bg-white rounded-2xl shadow-2xl p-0 w-full max-w-xl overflow-hidden"
          >
            <div className="grid md:grid-cols-2">
              <div className="bg-gradient-to-br from-blue-700 via-blue-600 to-blue-500 text-white p-8 flex flex-col justify-between">
                <div>
                  <h2 className="text-3xl font-extrabold leading-tight">Need to reset your password?</h2>
                  <p className="mt-4 text-blue-100 text-sm leading-relaxed">
                    Enter the email tied to your auditor account and we’ll send a secure reset link straight to your inbox.
                  </p>
                </div>
                <div className="mt-6 text-xs text-blue-100">
                  <p>Tip: Check your spam folder if the email doesn’t arrive within a minute.</p>
                </div>
              </div>

              <div className="p-8 md:p-10">
                <div className="flex justify-between items-start">
                  <h3 className="text-2xl font-bold text-gray-800">Forgot Password</h3>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="text-sm font-semibold text-gray-400 hover:text-gray-600"
                  >
                    Close
                  </button>
                </div>

                {!emailSent ? (
                  <form onSubmit={submit} className="space-y-6 mt-6" noValidate>
                    <div>
                      <label htmlFor="auditor-reset-email" className="block text-sm font-semibold text-gray-700 mb-2">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3.5 text-gray-400" size={20} />
                        <input
                          id="auditor-reset-email"
                          type="email"
                          value={data.email}
                          onChange={(e) => setData('email', e.target.value)}
                          className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition ${
                            clientError || errors.email
                              ? 'border-red-500 focus:ring-red-500'
                              : 'border-gray-300 focus:ring-blue-500'
                          }`}
                          placeholder="you@example.com"
                          autoComplete="username"
                        />
                      </div>
                      {(clientError || errors.email) && (
                        <p className="text-red-600 text-sm mt-1">{clientError || errors.email}</p>
                      )}
                    </div>

                    {successMsg && (
                      <div className="text-green-600 text-sm bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
                        <span className="font-semibold">Success:</span>
                        <span>{successMsg}</span>
                      </div>
                    )}

                    <div className="flex flex-col gap-3 pt-2">
                      <button
                        type="submit"
                        disabled={processing}
                        className={`w-full py-3 rounded-xl text-white font-semibold shadow-md transition ${
                          processing ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                      >
                        {processing ? 'Sending...' : 'Send Reset Link'}
                      </button>
                      <button
                        type="button"
                        onClick={handleClose}
                        className="w-full py-3 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="mt-8 flex flex-col items-center text-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                      <PartyPopper size={30} />
                    </div>
                    <div>
                      <h4 className="text-xl font-semibold text-gray-800">Reset link sent!</h4>
                      <p className="mt-1 text-gray-500 text-sm leading-relaxed">
                        We’ve emailed instructions to reset your auditor password. Open your inbox and click the button inside to set a new password.
                      </p>
                    </div>

                    <div className="w-full space-y-3">
                      <a
                        href="https://mail.google.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full py-3 rounded-xl bg-blue-600 text-white font-semibold shadow hover:bg-blue-700"
                      >
                        Open Gmail
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          setEmailSent(false);
                          setSuccessMsg('');
                        }}
                        className="w-full py-3 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50"
                      >
                        Use a different email
                      </button>
                    </div>

                    <p className="text-xs text-gray-400">
                      Didn’t get the email? Wait a minute, then try sending again.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
