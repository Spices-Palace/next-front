"use client";

import Link from 'next/link';
import React, { useState } from 'react';
import Cookies from 'js-cookie';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://nest-back-hfgh.onrender.com';
const API_URL = `${API_BASE_URL}/v1/companies`;

export default function SignupPage() {
  const [companyName, setCompanyName] = useState('');
  const [gmail, setGmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [cashierPassword, setCashierPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Email validation regex
  const emailRegex = /^[^\s@]+@gmail\.com$/i;

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Robust client-side validation
    if (!companyName.trim() || !gmail.trim() || !adminPassword.trim() || !cashierPassword.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    if (!emailRegex.test(gmail)) {
      setError('Please enter a valid Gmail address.');
      return;
    }
    if (adminPassword.length < 6 || cashierPassword.length < 6) {
      setError('Passwords must be at least 6 characters long.');
      return;
    }
    if (adminPassword === cashierPassword) {
      setError('Admin and Cashier passwords must be different.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: companyName.trim(),
          gmail: gmail.trim(),
          adminPassword,
          cashierPassword,
        }),
      });

      // Check for JSON response
      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      }

      if (!response.ok) {
        setError((data && data.message) || 'Registration failed.');
      } else {
        setSuccess('Signup successful! You can now log in.');
        if (data && data.companyId) {
          Cookies.set('companyId', data.companyId, { expires: 7 });
        }
        // Optionally, redirect to login after a short delay
        // setTimeout(() => router.push('/'), 2000);
      }
    } catch {
      setError('A network error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4 font-sans">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">Sign Up</h2>

        <form onSubmit={handleSignup} className="space-y-4" noValidate>
          <div>
            <label htmlFor="companyName" className="block text-base font-medium text-gray-800 mb-1">
              Company Name
            </label>
            <input
              type="text"
              id="companyName"
              className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-base text-gray-900"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              disabled={loading}
              required
              aria-required="true"
              autoComplete="organization"
            />
          </div>
          <div>
            <label htmlFor="gmail" className="block text-base font-medium text-gray-800 mb-1">
              Gmail
            </label>
            <input
              type="email"
              id="gmail"
              className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-base text-gray-900"
              value={gmail}
              onChange={(e) => setGmail(e.target.value)}
              disabled={loading}
              required
              aria-required="true"
              autoComplete="email"
              placeholder="example@gmail.com"
            />
          </div>
          <div>
            <label htmlFor="adminPassword" className="block text-base font-medium text-gray-800 mb-1">
              Admin Password
            </label>
            <input
              type="password"
              id="adminPassword"
              className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-base text-gray-900"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              disabled={loading}
              required
              aria-required="true"
              autoComplete="new-password"
              minLength={6}
            />
          </div>
          <div>
            <label htmlFor="cashierPassword" className="block text-base font-medium text-gray-800 mb-1">
              Cashier Password
            </label>
            <input
              type="password"
              id="cashierPassword"
              className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-base text-gray-900"
              value={cashierPassword}
              onChange={(e) => setCashierPassword(e.target.value)}
              disabled={loading}
              required
              aria-required="true"
              autoComplete="new-password"
              minLength={6}
            />
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md relative" role="alert" aria-live="assertive">
              <span className="block sm:inline">{error}</span>
            </div>
          )}

          {success && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-md relative" role="status" aria-live="polite">
              <span className="block sm:inline">{success}</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 ease-in-out disabled:opacity-50"
            disabled={loading}
            aria-disabled={loading}
          >
            {loading ? (
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              'Sign Up'
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-700">
          Already have an account?{' '}
          <Link href="/" className="font-medium text-blue-600 hover:text-blue-500">
            Login
          </Link>
        </div>
      </div>
    </div>
  );
}
