"use client";

import React, { useState } from 'react';
import { useGetBuyersQuery } from '../../../store/api';

interface BankDetail {
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  accountHolderName: string;
}

interface Buyer {
  id?: string;
  name: string;
  address: string;
  bankDetails: BankDetail[];
}

export default function BuyersPage() {
  const { data: buyers = [], error, isLoading } = useGetBuyersQuery();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Buyer>({ name: '', address: '', bankDetails: [{ bankName: '', accountNumber: '', ifscCode: '', accountHolderName: '' }] });
  const [errorMsg, setErrorMsg] = useState('');
  const [search, setSearch] = useState('');

  // Fetch buyers from backend
  // useEffect(() => {
  //   fetchBuyers();
  // }, []);

  // const fetchBuyers = async () => {
  //   setLoading(true);
  //   try {
  //     const res = await fetch(BUYERS_API_URL);
  //     const data = await res.json();
  //     setBuyers(Array.isArray(data) ? data : []);
  //   } catch {
  //     setBuyers([]);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const openModal = (buyer?: Buyer) => {
    setErrorMsg('');
    if (buyer) {
      setEditingId(buyer.id || null);
      setForm({
        name: buyer.name,
        address: buyer.address,
        bankDetails: buyer.bankDetails.length > 0 ? buyer.bankDetails : [{ bankName: '', accountNumber: '', ifscCode: '', accountHolderName: '' }],
      });
    } else {
      setEditingId(null);
      setForm({ name: '', address: '', bankDetails: [{ bankName: '', accountNumber: '', ifscCode: '', accountHolderName: '' }] });
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setErrorMsg('');
  };

  const handleAddOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!form.name.trim() || !form.address.trim() || form.bankDetails.some(b => !b.bankName || !b.accountNumber || !b.ifscCode || !b.accountHolderName)) {
      setErrorMsg('All fields are required.');
      return;
    }
    try {
      // const method = editingId ? 'PUT' : 'POST';
      // const url = editingId ? `${BUYERS_API_URL}/${editingId}` : BUYERS_API_URL;
      // const res = await fetch(url, {
      //   method,
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(form),
      // });
      // if (!res.ok) throw new Error('Failed to save buyer');
      // fetchBuyers();
      closeModal();
    } catch {
      setErrorMsg('Failed to save buyer.');
    }
  };

  const handleDelete = async (id?: string) => {
    if (!id) return;
    try {
      // await fetch(`${BUYERS_API_URL}/${id}`, { method: 'DELETE' });
      // fetchBuyers();
      closeModal();
    } catch {}
  };

  // Search filter
  const filteredBuyers = buyers.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    b.address.toLowerCase().includes(search.toLowerCase())
  );

  // Bank details handlers
  const handleBankChange = (idx: number, field: keyof BankDetail, value: string) => {
    setForm(f => ({
      ...f,
      bankDetails: f.bankDetails.map((b, i) => i === idx ? { ...b, [field]: value } : b),
    }));
  };
  const addBankDetail = () => {
    setForm(f => ({ ...f, bankDetails: [...f.bankDetails, { bankName: '', accountNumber: '', ifscCode: '', accountHolderName: '' }] }));
  };
  const removeBankDetail = (idx: number) => {
    setForm(f => ({ ...f, bankDetails: f.bankDetails.filter((_, i) => i !== idx) }));
  };

  return (
    <div className="p-4 pb-20 w-full">
      <div className="mb-6 flex flex-col gap-4 w-full">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-extrabold text-blue-700 tracking-tight">Buyers</h1>
          <button
            onClick={() => openModal()}
            className="bg-gradient-to-r from-blue-500 to-blue-700 text-white px-5 py-2 rounded-lg shadow hover:from-blue-600 hover:to-blue-800 font-semibold text-lg transition"
          >
            + Add Buyer
          </button>
        </div>
        <input
          className="w-full border rounded px-4 py-3 text-lg text-gray-900 placeholder-gray-400"
          placeholder="Search by name or address..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>
      <div className="overflow-x-auto rounded-2xl shadow-lg border border-blue-100 bg-white p-10 mb-10 w-full">
        <table className="min-w-full text-base text-left">
          <thead className="bg-blue-100">
            <tr>
              <th className="px-5 py-3 text-gray-800 font-bold text-lg">Name</th>
              <th className="px-5 py-3 text-gray-800 font-bold text-lg">Address</th>
              <th className="px-5 py-3 text-gray-800 font-bold text-lg">Bank Details</th>
              <th className="px-5 py-3 text-gray-800 font-bold text-lg">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={4} className="text-center py-8 text-gray-400 text-lg">Loading...</td></tr>
            ) : filteredBuyers.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-8 text-gray-400 text-lg">No buyers found.</td>
              </tr>
            ) : (
              filteredBuyers.map(buyer => (
                <tr key={buyer.id} className="border-t hover:bg-blue-50 transition">
                  <td className="px-5 py-3 font-semibold text-gray-900 text-lg">{buyer.name}</td>
                  <td className="px-5 py-3 text-gray-800 text-lg">{buyer.address}</td>
                  <td className="px-5 py-3 text-gray-800 text-base">
                    <ul className="list-disc ml-4">
                      {buyer.bankDetails.map((b, i) => (
                        <li key={i} className="mb-2">
                          <span className="font-semibold">{b.bankName}</span> - {b.accountNumber} <br/>
                          <span className="text-xs">IFSC: {b.ifscCode}, Holder: {b.accountHolderName}</span>
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className="px-5 py-3">
                    <button
                      className="text-blue-600 hover:text-blue-800 font-bold mr-2 text-xl"
                      onClick={() => openModal(buyer)}
                      title="Edit"
                    >
                      <span className="material-icons">edit</span>
                    </button>
                    <button
                      className="text-red-600 hover:text-red-800 font-bold text-xl"
                      onClick={() => handleDelete(buyer.id)}
                      title="Delete"
                    >
                      <span className="material-icons">delete</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {/* Modal for Add/Edit */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-2xl shadow-2xl p-10 w-full max-w-lg relative animate-fadeIn">
            <button
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-3xl"
              onClick={closeModal}
              title="Close"
            >
              ×
            </button>
            <h2 className="text-2xl font-bold mb-6 text-blue-700">{editingId ? 'Edit Buyer' : 'Add Buyer'}</h2>
            <form onSubmit={handleAddOrUpdate} className="flex flex-col gap-6">
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">Buyer Name</label>
                <input
                  className="border rounded px-3 py-2 w-full text-base text-gray-900 placeholder-gray-400"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Alice"
                  required
                />
              </div>
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">Address</label>
                <input
                  className="border rounded px-3 py-2 w-full text-base text-gray-900 placeholder-gray-400"
                  value={form.address}
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  placeholder="e.g. 123 Main St"
                  required
                />
              </div>
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">Bank Details</label>
                {form.bankDetails.map((b, idx) => (
                  <div key={idx} className="mb-4 border rounded p-3 bg-gray-50 relative">
                    <button
                      type="button"
                      className="absolute top-2 right-2 text-red-500 hover:text-red-700 text-lg"
                      onClick={() => removeBankDetail(idx)}
                      title="Remove Bank"
                      disabled={form.bankDetails.length === 1}
                    >
                      ×
                    </button>
                    <input
                      className="border rounded px-2 py-1 w-full text-base text-gray-900 mb-2"
                      value={b.bankName}
                      onChange={e => handleBankChange(idx, 'bankName', e.target.value)}
                      placeholder="Bank Name"
                      required
                    />
                    <input
                      className="border rounded px-2 py-1 w-full text-base text-gray-900 mb-2"
                      value={b.accountNumber}
                      onChange={e => handleBankChange(idx, 'accountNumber', e.target.value)}
                      placeholder="Account Number"
                      required
                    />
                    <input
                      className="border rounded px-2 py-1 w-full text-base text-gray-900 mb-2"
                      value={b.ifscCode}
                      onChange={e => handleBankChange(idx, 'ifscCode', e.target.value)}
                      placeholder="IFSC Code"
                      required
                    />
                    <input
                      className="border rounded px-2 py-1 w-full text-base text-gray-900"
                      value={b.accountHolderName}
                      onChange={e => handleBankChange(idx, 'accountHolderName', e.target.value)}
                      placeholder="Account Holder Name"
                      required
                    />
                  </div>
                ))}
                <button
                  type="button"
                  className="bg-blue-100 text-blue-700 px-3 py-2 rounded hover:bg-blue-200 font-semibold mt-2"
                  onClick={addBankDetail}
                >
                  + Add Bank
                </button>
              </div>
              {errorMsg && <div className="text-red-600 text-base">{errorMsg}</div>}
              <button
                type="submit"
                className="bg-gradient-to-r from-blue-500 to-blue-700 text-white px-6 py-3 rounded-lg shadow hover:from-blue-600 hover:to-blue-800 font-semibold text-lg transition"
              >
                {editingId ? 'Update Buyer' : 'Add Buyer'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 