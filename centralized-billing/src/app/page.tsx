"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { useGetProductsQuery, useGetSalesmenQuery, useGetBillsQuery } from '../store/api';
import { skipToken } from '@reduxjs/toolkit/query';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://nest-back-hfgh.onrender.com';
const API_URL = `${API_BASE_URL}/v1/companies/login`;
const COMPANIES_API_URL = `${API_BASE_URL}/v1/companies`;
const roles = ['admin', 'cashier'];

export default function LoginPage() {
  const [companies, setCompanies] = useState<string[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState(true);
  const [companiesError, setCompaniesError] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedRole, setSelectedRole] = useState(roles[0]);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  useEffect(() => {
    async function fetchCompanies() {
      setCompaniesLoading(true);
      setCompaniesError('');
      try {
        const response = await fetch(COMPANIES_API_URL);
        if (!response.ok) throw new Error('Failed to fetch companies');
        const data = await response.json();
        const names = Array.isArray(data)
          ? data.map((c: { companyName?: string; name?: string }) => c.companyName || c.name || '')
          : [];
        setCompanies(names.filter(Boolean));
        setSelectedCompany(names[0] || '');
      } catch {
        setCompaniesError('Could not load companies. Please try again.');
      } finally {
        setCompaniesLoading(false);
      }
    }
    fetchCompanies();
  }, []);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedCompany || !selectedRole || !password) {
      setError('Please fill in all fields.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: selectedCompany,
          role: selectedRole,
          password,
        }),
      });
      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      }
      if (!response.ok) {
        setError((data && data.message) || 'Login failed.');
      } else {
        setSuccess('Login successful! Redirecting...');
        // Store token, role, and companyId for admin or cashier
        if (data && data.token && (data.role === 'admin' || data.role === 'cashier')) {
          localStorage.setItem('token', data.token);
          localStorage.setItem('role', data.role);
          localStorage.setItem('companyId', data.companyId);
          if (data.companyName) {
            localStorage.setItem('companyName', data.companyName);
            Cookies.set('companyName', data.companyName, { expires: 7 });
          }
          if (data.companyId) {
            Cookies.set('companyId', data.companyId, { expires: 7 });
          }
          // Prefetch all company data for fast loading
          const prefetchData = async () => {
            try {
              // Prefetch products, salesmen, and bills data
              const token = data.token;
              const companyId = data.companyId;
              
              // Store data in localStorage for immediate access
              const prefetchPromises = [
                fetch(`${API_BASE_URL}/v1/products?companyId=${companyId}`, {
                  headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`${API_BASE_URL}/v1/salesmen?companyId=${companyId}`, {
                  headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`${API_BASE_URL}/v1/bills?companyId=${companyId}`, {
                  headers: { 'Authorization': `Bearer ${token}` }
                })
              ];
              
              const [productsRes, salesmenRes, billsRes] = await Promise.allSettled(prefetchPromises);
              
              // Store successful responses in localStorage
              if (productsRes.status === 'fulfilled' && productsRes.value.ok) {
                const productsData = await productsRes.value.json();
                localStorage.setItem('cached_products', JSON.stringify(productsData));
              }
              
              if (salesmenRes.status === 'fulfilled' && salesmenRes.value.ok) {
                const salesmenData = await salesmenRes.value.json();
                localStorage.setItem('cached_salesmen', JSON.stringify(salesmenData));
              }
              
              if (billsRes.status === 'fulfilled' && billsRes.value.ok) {
                const billsData = await billsRes.value.json();
                localStorage.setItem('cached_bills', JSON.stringify(billsData));
              }
              
              console.log('Data prefetched successfully');
            } catch (error) {
              console.log('Prefetch failed, will load data normally:', error);
            }
          };
          
          // Start prefetching and navigate
          prefetchData();
          
          if (data.role === 'admin') {
            router.replace('/admin/products');
          } else if (data.role === 'cashier') {
            router.replace('/cashier/products');
          }
        }
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
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">Login</h2>

        <form onSubmit={handleLogin} className="space-y-6" noValidate>
          <div>
            <label htmlFor="company" className="block text-base font-medium text-gray-800 mb-1">
              Select Company
            </label>
            {companiesLoading ? (
              <select className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm sm:text-base text-gray-900 bg-gray-100" disabled>
                <option>Loading companies...</option>
              </select>
            ) : companiesError ? (
              <select className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm sm:text-base text-gray-900 bg-red-100" disabled>
                <option>{companiesError}</option>
              </select>
            ) : (
              <select
                id="company"
                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-base text-gray-900"
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                disabled={loading}
                required
                aria-required="true"
              >
                {companies.map((company) => (
                  <option key={company} value={company}>
                    {company}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label htmlFor="role" className="block text-base font-medium text-gray-800 mb-1">
              Select Role
            </label>
            <select
              id="role"
              className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-base text-gray-900"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              disabled={loading}
              required
              aria-required="true"
            >
              {roles.map((role) => (
                <option key={role} value={role}>
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="password" className="block text-base font-medium text-gray-800 mb-1">
              Password
            </label>
            <input
              type="password"
              id="password"
              className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-base text-gray-900"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
              aria-required="true"
              autoComplete="current-password"
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
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 ease-in-out disabled:opacity-50"
            disabled={loading || companiesLoading || !!companiesError}
            aria-disabled={loading || companiesLoading || !!companiesError}
          >
            {loading ? (
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              'Login'
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-700">
          Dont have an account?{' '}
          <Link href="/signup" className="font-medium text-blue-600 hover:text-blue-500">
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
