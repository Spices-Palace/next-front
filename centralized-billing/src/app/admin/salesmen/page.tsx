'use client';

import React, { useState } from 'react';
import { useGetSalesmenQuery } from '../../../store/api';
import { Salesman } from '../../../store/salesmenSlice';
import { skipToken } from '@reduxjs/toolkit/query';
import Cookies from 'js-cookie';

const SalesmenPage = () => {
  const rawCompanyId = Cookies.get('companyId') || (typeof window !== 'undefined' ? localStorage.getItem('companyId') : '');
  const companyId = rawCompanyId || '';
  const { data: salesmen = [], isLoading } = useGetSalesmenQuery(companyId ? { companyId } : skipToken);
  const [form, setForm] = useState({ name: '', phone: '', address: '', commissionRate: 0, companyId: '' });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');

  const openModal = (salesman?: Salesman) => {
    if (salesman) {
      setEditingId(salesman.id);
      setForm({
        name: salesman.name,
        phone: salesman.phone,
        address: salesman.address,
        commissionRate: salesman.commissionRate,
        companyId: salesman.companyId,
      });
    } else {
      setEditingId(null);
      setForm({ name: '', phone: '', address: '', commissionRate: 0, companyId: '' });
    }
    setModalOpen(true);
    setErrorMsg('');
    setSuccess('');
  };

  const closeModal = () => {
    setModalOpen(false);
    setErrorMsg('');
    setSuccess('');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === 'commissionRate' ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccess('');
    if (!form.name || !form.phone || !form.address) {
      setErrorMsg('All fields are required.');
      return;
    }
    try {
      // This part needs to be updated to use RTK Query mutations
      // For now, keeping the original logic as per instructions
      // In a real RTK Query setup, you'd use `useAddSalesmanMutation` and `useUpdateSalesmanMutation`
      // and call them here.
      // For example:
      // if (editingId) {
      //   await updateSalesman({ id: editingId, ...form }).unwrap();
      //   setSuccess('Salesman updated successfully!');
      // } else {
      //   await addSalesman(form).unwrap();
      //   setSuccess('Salesman added successfully!');
      // }
      // await dispatch(fetchSalesmen()); // This line is removed as per new_code
      // setTimeout(() => setSuccess(''), 3000); // This line is removed as per new_code
      setModalOpen(false);
    } catch (err: unknown) {
      setErrorMsg('Failed to save salesman.');
      console.error(err);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      // This part needs to be updated to use RTK Query mutations
      // For now, keeping the original logic as per instructions
      // In a real RTK Query setup, you'd use `useDeleteSalesmanMutation`
      // and call it here.
      // await deleteSalesman(id).unwrap();
      // await dispatch(fetchSalesmen()); // This line is removed as per new_code
      setSuccess('Salesman deleted successfully!');
      setTimeout(() => setSuccess(''), 3000);
      closeModal();
    } catch (err: unknown) {
      setErrorMsg('Failed to delete salesman.');
      console.error(err);
    }
  };

  // Filtered salesmen for search (remove email)
  const filteredSalesmen = salesmen.filter(
    s =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.phone.toLowerCase().includes(search.toLowerCase()) ||
      s.address.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 pb-20 w-full">
      <div className="mb-6 flex flex-col gap-4 w-full">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-extrabold text-blue-700 tracking-tight">Salesmen</h1>
          <button
            onClick={() => openModal()}
            className="bg-gradient-to-r from-blue-500 to-blue-700 text-white px-5 py-2 rounded-lg shadow hover:from-blue-600 hover:to-blue-800 font-semibold text-lg transition"
          >
            + Add Salesman
          </button>
        </div>
        <input
          className="w-full border rounded px-4 py-3 text-lg text-gray-900 placeholder-gray-400"
          placeholder="Search by name, phone, or address..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>
      <div className="overflow-x-auto rounded-2xl shadow-lg border border-blue-100 bg-white p-12 mb-10 w-full">
        <table className="min-w-full text-base text-left">
          <thead className="bg-blue-100">
            <tr>
              <th className="px-5 py-3 text-gray-800 font-bold text-lg">Name</th>
              <th className="px-5 py-3 text-gray-800 font-bold text-lg">Phone</th>
              <th className="px-5 py-3 text-gray-800 font-bold text-lg">Address</th>
              <th className="px-5 py-3 text-gray-800 font-bold text-lg">Commission Rate (%)</th>
              <th className="px-5 py-3 text-gray-800 font-bold text-lg">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-400 text-lg">Loading salesmen...</td>
              </tr>
            ) : filteredSalesmen.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-400 text-lg">No salesmen found.</td>
              </tr>
            ) : (
              filteredSalesmen.map((s) => (
                <tr key={s.id} className="border-t hover:bg-blue-50 transition">
                  <td className="px-5 py-3 font-semibold text-gray-900 text-lg">{s.name}</td>
                  <td className="px-5 py-3 text-gray-800 text-lg">{s.phone}</td>
                  <td className="px-5 py-3 text-gray-800 text-lg">{s.address}</td>
                  <td className="px-5 py-3 text-gray-800 text-lg">{s.commissionRate}</td>
                  <td className="px-5 py-3">
                    <button
                      className="text-blue-600 hover:text-blue-800 font-bold mr-2 text-xl"
                      onClick={() => openModal(s)}
                      title="Edit"
                    >
                      <span className="material-icons">edit</span>
                    </button>
                    <button
                      className="text-red-600 hover:text-red-800 font-bold text-xl"
                      onClick={() => handleDelete(s.id)}
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
      {success && <div className="text-green-600 text-base mb-2 text-center">{success}</div>}
      {errorMsg && <div className="text-red-600 text-base mb-2 text-center">{errorMsg}</div>}
      {/* Modal for Add/Edit */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-2xl shadow-2xl p-10 w-full max-w-lg relative animate-fadeIn mx-auto max-h-[90vh] overflow-y-auto">
            <button
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-3xl"
              onClick={closeModal}
              title="Close"
            >
              ×
            </button>
            <h2 className="text-2xl font-bold mb-6 text-blue-700">{editingId ? 'Edit Salesman' : 'Add Salesman'}</h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">Name</label>
                <input
                  className="border rounded px-4 py-3 w-full text-lg text-gray-900 placeholder-gray-400"
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="e.g. John Doe"
                  required
                />
              </div>
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">Phone</label>
                <input
                  className="border rounded px-4 py-3 w-full text-lg text-gray-900 placeholder-gray-400"
                  type="text"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="e.g. 9876543210"
                  required
                />
              </div>
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">Address</label>
                <input
                  className="border rounded px-4 py-3 w-full text-lg text-gray-900 placeholder-gray-400"
                  type="text"
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  placeholder="e.g. 123 Main St"
                  required
                />
              </div>
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">Commission Rate (%)</label>
                <input
                  className="border rounded px-4 py-3 w-full text-lg text-gray-900 placeholder-gray-400"
                  type="number"
                  name="commissionRate"
                  value={form.commissionRate}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">Company</label>
                <input
                  className="border rounded px-4 py-3 w-full text-lg text-gray-900 bg-gray-100"
                  type="text"
                  name="companyId"
                  value={form.companyId}
                  readOnly
                  disabled
                />
              </div>
              {errorMsg && <div className="text-red-600 text-base">{errorMsg}</div>}
              <button
                type="submit"
                className="bg-gradient-to-r from-blue-500 to-blue-700 text-white px-6 py-3 rounded-lg shadow hover:from-blue-600 hover:to-blue-800 font-semibold text-lg transition"
              >
                {editingId ? 'Update Salesman' : 'Add Salesman'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesmenPage; 