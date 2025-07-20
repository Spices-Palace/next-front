"use client";
import React from "react";
import { useGetBillsQuery } from '../../../store/api';

export default function AdminBillsPage() {
  const { data: bills = [], error, isLoading } = useGetBillsQuery();
  const [search, setSearch] = React.useState("");
  const [selectedBill, setSelectedBill] = React.useState<unknown | null>(null);
  const [showEditModal, setShowEditModal] = React.useState(false);
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [showCreateModal, setShowCreateModal] = React.useState(false);

  const handleDelete = async (billNo: string) => {
    if (!window.confirm('Are you sure you want to delete this bill?')) return;
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const res = await fetch(`${API_URL}/v1/bills/bill-no/${billNo}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete bill');
      // fetchBills(); // This line is removed as per the edit hint
    } catch (err: any) {
      alert(err.message || 'Failed to delete bill');
    }
  };

  const filteredBills = bills.filter(
    b =>
      (b.customerName || '').toLowerCase().includes(search.toLowerCase()) ||
      (b.billNo || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 w-full max-w-5xl mx-auto">
      <h1 className="text-3xl font-extrabold text-blue-700 mb-8">Admin Bills</h1>
      <div className="flex justify-between mb-8">
        <input
          className="w-1/2 border rounded px-4 py-3 text-lg text-gray-900 placeholder-gray-400"
          placeholder="Search by customer or bill number..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>
      <div className="overflow-x-auto rounded-2xl shadow-lg border border-blue-100 bg-white p-8 mb-10 w-full">
        {isLoading ? (
          <div className="text-center text-gray-500 py-8">Loading bills...</div>
        ) : error ? (
          <div className="text-center text-red-500 py-8">{error.message || 'Unknown error'}</div>
        ) : (
          <table className="min-w-full text-base text-left">
            <thead className="bg-blue-100">
              <tr>
                <th className="px-5 py-3 text-gray-800 font-bold text-lg">Bill No</th>
                <th className="px-5 py-3 text-gray-800 font-bold text-lg">Date</th>
                <th className="px-5 py-3 text-gray-800 font-bold text-lg">Customer Name</th>
                <th className="px-5 py-3 text-gray-800 font-bold text-lg">Total Amount (₹)</th>
                <th className="px-5 py-3 text-gray-800 font-bold text-lg">Actions</th>
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
                    <td className="px-5 py-3 flex gap-2">
                      <button className="bg-blue-600 hover:bg-blue-800 text-white px-4 py-2 rounded shadow font-semibold transition" onClick={() => { setSelectedBill(bill); setShowEditModal(false); }}>View</button>
                      <button className="bg-red-600 hover:bg-red-800 text-white px-4 py-2 rounded shadow font-semibold transition" onClick={() => handleDelete(bill.billNo)}>Delete</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
      {/* View Bill Modal */}
      {selectedBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-2xl w-full flex flex-col">
            <div className="text-xl font-bold mb-4 text-blue-700">Bill Details</div>
            <pre className="bg-gray-100 rounded p-4 text-sm text-black overflow-x-auto max-h-96">{JSON.stringify(selectedBill, null, 2)}</pre>
            <button
              className="mt-4 bg-blue-600 hover:bg-blue-800 text-white px-6 py-2 rounded font-semibold self-end"
              onClick={() => setSelectedBill(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 