"use client";
import React, { useState, useRef } from "react";
import Cookies from 'js-cookie';
import { useGetDailySalesReportQuery, useGetSalesmanCommissionReportQuery } from '../../../store/api';

export default function AdminReportPage() {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const rawCompanyId = Cookies.get('companyId') || (typeof window !== 'undefined' ? localStorage.getItem('companyId') : '');
  const companyId = rawCompanyId || '';

  // Fetch daily sales report
  const { data: dailyReport, error: dailyError, isLoading: dailyLoading } = useGetDailySalesReportQuery({ companyId, date: selectedDate }, { skip: !companyId });
  // Fetch salesman commission report
  const { data: commissionReport, error: commissionError, isLoading: commissionLoading } = useGetSalesmanCommissionReportQuery({ companyId, date: selectedDate }, { skip: !companyId });

  const printRef = useRef<HTMLDivElement>(null);
  const [expenses, setExpenses] = useState([{ label: '', amount: 0 }]);

  // Calculate total sales and payment breakdown
  const totalSales = dailyReport?.totalSales || 0;
  const paymentBreakdown = dailyReport?.paymentBreakdown || {};
  const cashBalance = paymentBreakdown.cash || 0;
  const upiBalance = paymentBreakdown.gpay || 0;
  const cardBalance = paymentBreakdown.card || 0;
  const otherBalance = paymentBreakdown.other || 0;

  // Expenses
  const totalExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const netCash = cashBalance - totalExpenses;

  // Salesman commissions
  const salesmanCommissions = Array.isArray(commissionReport) ? commissionReport : [];

  // Loading and error states
  const isLoading = dailyLoading || commissionLoading;
  const error = dailyError || commissionError;

  return (
    <div className="p-4 w-full max-w-5xl mx-auto">
      <h1 className="text-3xl font-extrabold text-blue-700 mb-8">Daily Report</h1>
      <div className="flex gap-4 mb-6">
        <input
          type="date"
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          className="border rounded px-4 py-2 text-lg text-black"
        />
      </div>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-report, .print-report * { visibility: visible; }
          .print-report { position: absolute; left: 0; top: 0; width: 100vw; background: white; }
          .print:hidden { display: none !important; }
        }
      `}</style>
      <div ref={printRef} className="print-report">
        {isLoading ? (
          <div className="text-center text-gray-500 py-8">Loading...</div>
        ) : error ? (
          <div className="text-center text-red-500 py-8">{String(error)}</div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-8 mb-8">
              <div className="bg-white rounded-xl shadow p-6 border border-blue-100">
                <div className="text-lg font-bold text-gray-700 mb-2">Total Sales</div>
                <div className="text-2xl font-extrabold text-green-700">₹{totalSales}</div>
              </div>
              <div className="bg-white rounded-xl shadow p-6 border border-blue-100">
                <div className="text-lg font-bold text-gray-700 mb-2">Cash Balance</div>
                <div className="text-2xl font-extrabold text-blue-700">₹{cashBalance}</div>
                <div className="text-lg font-bold text-gray-700 mt-2">UPI/GPay</div>
                <div className="text-xl font-bold text-blue-500">₹{upiBalance}</div>
                <div className="text-lg font-bold text-gray-700 mt-2">Card</div>
                <div className="text-xl font-bold text-blue-500">₹{cardBalance}</div>
                <div className="text-lg font-bold text-gray-700 mt-2">Other</div>
                <div className="text-xl font-bold text-blue-500">₹{otherBalance}</div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow p-6 border border-blue-100 mb-8">
              <div className="text-xl font-bold text-blue-700 mb-4">Salesman Commissions</div>
              <table className="min-w-full text-base text-left mb-4">
                <thead className="bg-blue-100">
                  <tr>
                    <th className="px-5 py-3 text-gray-800 font-bold">Salesman</th>
                    <th className="px-5 py-3 text-gray-800 font-bold">Commission Rate (%)</th>
                    <th className="px-5 py-3 text-gray-800 font-bold">Total Commission 1</th>
                    <th className="px-5 py-3 text-gray-800 font-bold">Total Commission 2</th>
                    <th className="px-5 py-3 text-gray-800 font-bold">Total Commission</th>
                  </tr>
                </thead>
                <tbody>
                  {salesmanCommissions.map((s, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="px-5 py-3">{s.salesman?.name}</td>
                      <td className="px-5 py-3">{s.salesman?.commissionRate}%</td>
                      <td className="px-5 py-3 text-green-700 font-bold">₹{s.totalCommission1}</td>
                      <td className="px-5 py-3 text-blue-700 font-bold">₹{s.totalCommission2}</td>
                      <td className="px-5 py-3 text-orange-700 font-bold">₹{s.totalCommission}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bg-white rounded-xl shadow p-6 border border-blue-100 mb-8">
              <div className="text-xl font-bold text-blue-700 mb-4">Expenses</div>
              {expenses.map((exp, idx) => (
                <div key={idx} className="flex gap-4 mb-2 items-center">
                  <input
                    className="border rounded px-4 py-2 text-lg text-black w-1/2"
                    placeholder="Expense label (e.g. Driver, Rent)"
                    value={exp.label}
                    onChange={e => {
                      const newExpenses = [...expenses];
                      newExpenses[idx].label = e.target.value;
                      setExpenses(newExpenses);
                    }}
                  />
                  <input
                    className="border rounded px-4 py-2 text-lg text-black w-1/3"
                    placeholder="Amount"
                    type="number"
                    value={exp.amount}
                    onChange={e => {
                      const newExpenses = [...expenses];
                      newExpenses[idx].amount = Number(e.target.value);
                      setExpenses(newExpenses);
                    }}
                  />
                  {expenses.length > 1 && (
                    <button
                      className="text-red-600 font-bold text-lg px-2"
                      onClick={() => setExpenses(expenses.filter((_, i) => i !== idx))}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              <button
                className="mt-2 bg-blue-600 hover:bg-blue-800 text-white px-4 py-2 rounded font-semibold"
                onClick={() => setExpenses([...expenses, { label: "", amount: 0 }])}
              >
                + Add Expense
              </button>
              <div className="text-lg font-bold text-black mt-4">Total Expenses: ₹{totalExpenses}</div>
              <div className="text-xl font-bold text-green-700 mt-2">Net Cash (Cash - Expenses): ₹{netCash}</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
} 