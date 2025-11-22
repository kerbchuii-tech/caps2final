import React, { useState } from 'react';
import { Head, useForm, Link } from '@inertiajs/react';
import { Eye, EyeOff } from 'lucide-react';

export default function AdminRegister() {
  const { data, setData, post, processing, errors } = useForm({
    first_name: '',
    last_name: '',
    username: '',
    password: '',
    password_confirmation: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const togglePassword = () => setShowPassword(!showPassword);
  const toggleConfirmPassword = () => setShowConfirmPassword(!showConfirmPassword);

  const handleSubmit = (e) => {
    e.preventDefault();
    post('/admin/register'); // Route you will define in web.php
  };

  return (
    <>
      <Head title="Admin Register" />
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-purple-200 to-blue-200">
        <div className="w-full max-w-lg bg-white p-10 rounded-2xl shadow-2xl">
          <h2 className="text-3xl font-extrabold text-center mb-8 text-gray-800">Admin Registration</h2>
          <form onSubmit={handleSubmit} className="space-y-5">

            <div>
              <label className="block mb-1 font-medium text-gray-700">First Name</label>
              <input
                type="text"
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={data.first_name}
                onChange={(e) => setData('first_name', e.target.value)}
              />
              {errors.first_name && <p className="text-red-500 text-sm mt-1">{errors.first_name}</p>}
            </div>

            <div>
              <label className="block mb-1 font-medium text-gray-700">Last Name</label>
              <input
                type="text"
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={data.last_name}
                onChange={(e) => setData('last_name', e.target.value)}
              />
              {errors.last_name && <p className="text-red-500 text-sm mt-1">{errors.last_name}</p>}
            </div>

            <div>
              <label className="block mb-1 font-medium text-gray-700">Username</label>
              <input
                type="text"
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={data.username}
                onChange={(e) => setData('username', e.target.value)}
              />
              {errors.username && <p className="text-red-500 text-sm mt-1">{errors.username}</p>}
            </div>

            <div className="relative">
              <label className="block mb-1 font-medium text-gray-700">Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                className="w-full px-4 py-2 border rounded-lg pr-10 focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={data.password}
                onChange={(e) => setData('password', e.target.value)}
              />
              <button
                type="button"
                onClick={togglePassword}
                className="absolute top-9 right-3 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
              {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
            </div>

            <div className="relative">
              <label className="block mb-1 font-medium text-gray-700">Confirm Password</label>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                className="w-full px-4 py-2 border rounded-lg pr-10 focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={data.password_confirmation}
                onChange={(e) => setData('password_confirmation', e.target.value)}
              />
              <button
                type="button"
                onClick={toggleConfirmPassword}
                className="absolute top-9 right-3 text-gray-500 hover:text-gray-700"
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
              {errors.password_confirmation && <p className="text-red-500 text-sm mt-1">{errors.password_confirmation}</p>}
            </div>

            <button
              type="submit"
              disabled={processing}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200"
            >
              Register
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">Already have an account?</p>
            <Link
              href="/admin/login"
              className="inline-block mt-2 text-blue-600 font-medium hover:underline"
            >
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
