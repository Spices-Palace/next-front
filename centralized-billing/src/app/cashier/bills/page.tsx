"use client";
import React, { useState } from "react";
import { useGetBillsQuery } from '../../../store/api';

export default function CashierBillsPage() {
  const { data: bills = [], error, isLoading } = useGetBillsQuery();
  const [search, setSearch] = useState("");

  const filteredBills = bills.filter(
    b =>
      (b.customerName || '').toLowerCase().includes(search.toLowerCase()) ||
      (b.billNo || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 w-full max-w-3xl mx-auto">
      <h1 className="text-3xl font-extrabold text-blue-700 mb-8">Bills</h1>
      <input
        className="w-full border rounded px-4 py-3 text-lg text-gray-900 placeholder-gray-400 mb-8"
        placeholder="Search by customer or bill number..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />
      <div className="overflow-x-auto rounded-2xl shadow-lg border border-blue-100 bg-white p-8 mb-10 w-full">
        {isLoading ? (
          <div className="text-center text-gray-500 py-8">Loading bills...</div>
        ) : error ? (
          <div className="text-center text-red-500 py-8">
            {((): string | null => {
              if (!error) return null;
              if (typeof error === 'string') return error;
              if (typeof error === 'object' && 'message' in error && typeof error.message === 'string') return error.message;
              if (typeof error === 'object' && 'data' in error && typeof (error as any).data === 'string') return (error as any).data;
              return 'Unknown error';
            })()}
          </div>
        ) : (
        <table className="min-w-full text-base text-left">
          <thead className="bg-blue-100">
            <tr>
              <th className="px-5 py-3 text-gray-800 font-bold text-lg">Bill No</th>
              <th className="px-5 py-3 text-gray-800 font-bold text-lg">Date</th>
              <th className="px-5 py-3 text-gray-800 font-bold text-lg">Customer Name</th>
              <th className="px-5 py-3 text-gray-800 font-bold text-lg">Total Amount (₹)</th>
              <th className="px-5 py-3 text-gray-800 font-bold text-lg">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredBills.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-400 text-lg">No bills found.</td>
              </tr>
            ) : (
              filteredBills.map((bill, idx) => (
                <tr key={bill.billNo || idx} className="border-t hover:bg-blue-50 transition">
                  <td className="px-5 py-3 font-mono text-blue-700 font-bold">{bill.billNo}</td>
                  <td className="px-5 py-3">{bill.date ? bill.date.slice(0, 10) : ''}</td>
                  <td className="px-5 py-3">{bill.customerName}</td>
                  <td className="px-5 py-3 font-semibold text-green-700">₹{bill.grandTotal}</td>
                  <td className="px-5 py-3">
                    <button className="bg-blue-600 hover:bg-blue-800 text-white px-4 py-2 rounded shadow font-semibold transition">View</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        )}
      </div>
    </div>
  );
} 