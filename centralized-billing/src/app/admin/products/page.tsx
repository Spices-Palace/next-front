"use client";

import React, { useState, useEffect } from 'react';
import Barcode from 'react-barcode';
import Cookies from 'js-cookie';
import { useGetProductsQuery, useGetBuyersQuery } from '../../../store/api';
import BarcodePrintModal from '../../components/BarcodePrintModal';

interface Buyer {
  id: number;
  name: string;
}

interface Product {
  id: number;
  name: string;
  type: string;
  unit: string;
  cost: number;
  price: number;
  quantity: number;
  barcode: string;
  buyerId: number;
  companyId: string;
  buyer?: { name: string };
}

type ProductType = 'Saree' | 'Cloth' | 'Handicraft';

const PRODUCT_TYPES: { label: ProductType; unit: string[] }[] = [
  { label: 'Saree', unit: ['pieces'] },
  { label: 'Cloth', unit: ['meters'] },
  { label: 'Handicraft', unit: ['pieces', 'grams'] },
];

function generateBarcode(products: Product[]) {
  // Get the next number (start from 1000) for all products
  const nextNum = 1000 + products.length;
  return `${nextNum}A`;
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://nest-back-hfgh.onrender.com';
const PRODUCTS_API_URL = BASE_URL + '/v1/products';
const BUYERS_API_URL = BASE_URL + '/v1/buyers';

export default function ProductsPage() {
  const { data: products = [], error: productsError, isLoading: productsLoading } = useGetProductsQuery();
  const { data: buyers = [], error: buyersError, isLoading: buyersLoading } = useGetBuyersQuery();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<{ name: string; type: string; unit: string; cost: string; price: string; quantity: string; buyerId: string; companyId: string; barcode: string }>(
    {
      name: '',
      type: 'Saree',
      unit: 'pieces',
      cost: '',
      price: '',
      quantity: '',
      buyerId: '',
      companyId: Cookies.get('companyId') || '',
      barcode: '',
    }
  );
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [buyerModalOpen, setBuyerModalOpen] = useState(false);
  const [newBuyerName, setNewBuyerName] = useState('');
  const [buyerError, setBuyerError] = useState('');
  const [success, setSuccess] = useState('');
  const [printBarcodeModalOpen, setPrintBarcodeModalOpen] = useState(false);
  const [barcodeToPrint, setBarcodeToPrint] = useState<string | null>(null);
  const [quantityToPrint, setQuantityToPrint] = useState<number>(1);
  const [companyName, setCompanyName] = useState('');

  // Update unit options when type changes
  const unitOptions = PRODUCT_TYPES.find(t => t.label === form.type)?.unit || ['pieces'];

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const name = localStorage.getItem('companyName') || Cookies.get('companyName') || '';
      setCompanyName(name);
    }
  }, []);

  const openModal = (product?: Product) => {
    setError('');
    const companyId = Cookies.get('companyId') || '';
    if (typeof window !== 'undefined') {
      const name = localStorage.getItem('companyName') || Cookies.get('companyName') || 'COMPANY';
      setCompanyName(name);
    }
    if (buyers.length === 0) {
      setError('Buyers are still loading. Please wait.');
      return;
    }
    if (product) {
      let buyerIdStr = String(product.buyerId);
      // If the buyer is not found in the buyers list, auto-select the first available buyer
      const buyerExists = buyers.some(b => String(b.id) === buyerIdStr);
      if (!buyerExists) {
        buyerIdStr = buyers[0]?.id ? String(buyers[0].id) : '';
      }
      setEditingId(product.id);
      setForm({
        name: product.name,
        type: product.type,
        unit: product.unit,
        cost: String(product.cost),
        price: String(product.price),
        quantity: String(product.quantity),
        buyerId: buyerIdStr,
        companyId,
        barcode: product.barcode,
      });
    } else {
      setEditingId(null);
      const buyer = buyers[0];
      const barcode = generateBarcode(products);
      setForm({ name: '', type: 'Saree', unit: 'pieces', cost: '', price: '', quantity: '', buyerId: buyer ? String(buyer.id) : '', companyId, barcode });
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setError('');
    setSuccess('');
  };

  const handleAddOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    console.log('buyers:', buyers);
    console.log('form.buyerId:', form.buyerId);
    const buyer = buyers.find(b => String(b.id) === String(form.buyerId));
    console.log('matched buyer:', buyer);
    if (!form.name.trim() || !form.cost || !form.price || !form.quantity || !form.buyerId) {
      setError('All fields are required.');
      return;
    }
    if (!buyer) {
      setForm(f => ({ ...f, buyerId: buyers[0]?.id ? String(buyers[0].id) : '' }));
      setError('Buyer not found for this product. Please select a valid buyer.');
      return;
    }
    let barcode = form.barcode;
    if (!editingId) {
      // If barcode is not set (shouldn't happen), generate it
      if (!barcode) {
        barcode = generateBarcode(products);
      }
    } else {
      // For updates, keep the existing barcode if available
      const existingProduct = products.find(p => p.id === editingId);
      barcode = existingProduct ? existingProduct.barcode : generateBarcode(products);
    }
    const payload = {
      name: form.name.trim(),
      type: form.type,
      unit: form.unit,
      cost: Number(form.cost),
      price: Number(form.price),
      quantity: Number(form.quantity),
      buyerId: String(form.buyerId),
      companyId: String(form.companyId),
      barcode,
    };
    try {
      if (editingId) {
        // This part needs to be updated to use RTK Query mutation
        // For now, keeping the original fetch logic
        await fetch(`${PRODUCTS_API_URL}/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        setSuccess('Product updated successfully!');
        // await dispatch(fetchProducts()); // This line is removed
        setTimeout(() => setSuccess(''), 3000);
        setModalOpen(false);
      } else {
        // This part needs to be updated to use RTK Query mutation
        // For now, keeping the original fetch logic
        await fetch(PRODUCTS_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        setSuccess('Product added successfully!');
        // await dispatch(fetchProducts()); // This line is removed
        setTimeout(() => setSuccess(''), 3000);
        setModalOpen(false);
        setBarcodeToPrint(barcode);
        setQuantityToPrint(Number(form.quantity) || 1);
        setPrintBarcodeModalOpen(true);
      }
    } catch {
      setError('Failed to save product.');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      // This part needs to be updated to use RTK Query mutation
      // For now, keeping the original fetch logic
      await fetch(`${PRODUCTS_API_URL}/${id}`, { method: 'DELETE' });
      // await dispatch(fetchProducts()); // This line is removed
      setSuccess('Product deleted successfully!');
      setTimeout(() => setSuccess(''), 3000);
      closeModal();
    } catch {
      setError('Failed to delete product.');
    }
  };

  // Filtered products for search
  const filteredProducts = products.filter(
    p =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.barcode.toLowerCase().includes(search.toLowerCase())
  );

  const getBuyerName = (buyerId: number) => buyers.find(b => b.id === buyerId)?.name || '';

  // Add new buyer from modal
  const handleAddBuyer = (e: React.FormEvent) => {
    e.preventDefault();
    setBuyerError('');
    if (!newBuyerName.trim()) {
      setBuyerError('Name is required.');
      return;
    }
    // This part needs to be updated to use RTK Query mutation
    // For now, keeping the original fetch logic
    fetch(BUYERS_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newBuyerName.trim() }),
    })
      .then(res => res.json())
      .then(data => {
        // setBuyers(prev => [...prev, { id: data.id, name: data.name }]); // This line was removed
        setForm(f => ({ ...f, buyerId: String(data.id) }));
        setNewBuyerName('');
        setBuyerModalOpen(false);
      })
      .catch(() => setBuyerError('Failed to add buyer.'));
  };

  return (
    <div className="p-4 pb-20 w-full">
      <div className="mb-6 flex flex-col gap-4 w-full">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-extrabold text-blue-700 tracking-tight">Products</h1>
          <button
            onClick={() => openModal()}
            className="bg-gradient-to-r from-blue-500 to-blue-700 text-white px-5 py-2 rounded-lg shadow hover:from-blue-600 hover:to-blue-800 font-semibold text-lg transition"
          >
            + Add Product
          </button>
        </div>
        <input
          className="w-full border rounded px-4 py-3 text-lg text-gray-900 placeholder-gray-400"
          placeholder="Search by name or barcode..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>
      {/* Table view only */}
      <div className="overflow-x-auto rounded-2xl shadow-lg border border-blue-100 bg-white p-12 mb-10 w-full">
        <table className="min-w-full text-base text-left">
          <thead className="bg-blue-100">
            <tr>
              <th className="px-5 py-3 text-gray-800 font-bold text-lg">Barcode</th>
              <th className="px-5 py-3 text-gray-800 font-bold text-lg">Name</th>
              <th className="px-5 py-3 text-gray-800 font-bold text-lg">Buyer</th>
              <th className="px-5 py-3 text-gray-800 font-bold text-lg">Type</th>
              <th className="px-5 py-3 text-gray-800 font-bold text-lg">Unit</th>
              <th className="px-5 py-3 text-gray-800 font-bold text-lg">Cost (₹)</th>
              <th className="px-5 py-3 text-gray-800 font-bold text-lg">Price (₹)</th>
              <th className="px-5 py-3 text-gray-800 font-bold text-lg">Qty</th>
              <th className="px-5 py-3 text-gray-800 font-bold text-lg">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-8 text-gray-400 text-lg">No products found.</td>
              </tr>
            ) : (
              filteredProducts.map(product => (
                <tr key={product.id} className="border-t hover:bg-blue-50 transition">
                  <td className="px-5 py-3">
                    <div className="flex flex-col items-center">
                      <Barcode value={product.barcode} width={2} height={40} fontSize={14} displayValue={false} format="CODE128" />
                      <span className="text-sm text-gray-700 mt-1 font-mono">{product.barcode}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 font-semibold text-gray-900 text-lg">{product.name}</td>
                  <td className="px-5 py-3 text-gray-800 text-lg">{product.buyer?.name || getBuyerName(product.buyerId)}</td>
                  <td className="px-5 py-3 text-gray-800 text-lg">{product.type}</td>
                  <td className="px-5 py-3 text-gray-800 text-lg">{product.unit}</td>
                  <td className="px-5 py-3 text-gray-900 text-lg">₹{product.cost}</td>
                  <td className="px-5 py-3 text-gray-900 text-lg">₹{product.price}</td>
                  <td className="px-5 py-3 text-gray-900 text-lg">{product.quantity}</td>
                  <td className="px-5 py-3">
                    <button
                      className="text-blue-600 hover:text-blue-800 font-bold mr-2 text-xl"
                      onClick={() => openModal(product)}
                      title="Edit"
                    >
                      <span className="material-icons">edit</span>
                    </button>
                    <button
                      className="text-red-600 hover:text-red-800 font-bold text-xl"
                      onClick={() => handleDelete(product.id)}
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
          <div className="bg-white rounded-2xl shadow-2xl p-10 w-full max-w-lg relative animate-fadeIn mx-auto max-h-[90vh] overflow-y-auto">
            <button
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-3xl"
              onClick={closeModal}
              title="Close"
            >
              ×
            </button>
            <h2 className="text-2xl font-bold mb-6 text-blue-700">{editingId ? 'Edit Product' : 'Add Product'}</h2>
            <form onSubmit={handleAddOrUpdate} className="flex flex-col gap-6">
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">Product Name</label>
                <input
                  className="border rounded px-4 py-3 w-full text-lg text-gray-900 placeholder-gray-400"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Silk Saree"
                  required
                />
              </div>
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">Buyer</label>
                <select
                  className="border rounded px-4 py-3 w-full text-lg text-gray-900"
                  value={form.buyerId}
                  onChange={e => setForm(f => ({ ...f, buyerId: e.target.value }))}
                  required
                >
                  {buyers.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">Type</label>
                <select
                  className="border rounded px-4 py-3 w-full text-lg text-gray-900"
                  value={form.type}
                  onChange={e => {
                    const newType = e.target.value as ProductType;
                    setForm(f => ({
                      ...f,
                      type: newType,
                      unit: PRODUCT_TYPES.find(t => t.label === newType)?.unit[0] || 'pieces',
                    }));
                  }}
                  required
                >
                  {PRODUCT_TYPES.map(t => (
                    <option key={t.label} value={t.label}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">Unit</label>
                <select
                  className="border rounded px-4 py-3 w-full text-lg text-gray-900"
                  value={form.unit}
                  onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                  required
                >
                  {unitOptions.map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-6">
                <div className="flex-1">
                  <label className="block text-base font-medium text-gray-700 mb-2">Cost (₹)</label>
                  <input
                    className="border rounded px-4 py-3 w-full text-lg text-gray-900"
                    type="number"
                    min={0}
                    value={form.cost}
                    onChange={e => setForm(f => ({ ...f, cost: e.target.value }))}
                    required
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-base font-medium text-gray-700 mb-2">Price (₹)</label>
                  <input
                    className="border rounded px-4 py-3 w-full text-lg text-gray-900"
                    type="number"
                    min={0}
                    value={form.price}
                    onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                    required
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-base font-medium text-gray-700 mb-2">Quantity</label>
                  <input
                    className="border rounded px-4 py-3 w-full text-lg text-gray-900"
                    type="number"
                    min={0}
                    value={form.quantity}
                    onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                    required
                  />
                </div>
              </div>
              {error && <div className="text-red-600 text-base">{error}</div>}
              {success && <div className="text-green-600 text-base mb-2">{success}</div>}
              <button
                type="submit"
                className="bg-gradient-to-r from-blue-500 to-blue-700 text-white px-6 py-3 rounded-lg shadow hover:from-blue-600 hover:to-blue-800 font-semibold text-lg transition"
              >
                {editingId ? 'Update Product' : 'Add Product'}
              </button>
            </form>
          </div>
        </div>
      )}
      {/* Modal for Add Buyer */}
      {buyerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md relative animate-fadeIn">
            <button
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-3xl"
              onClick={() => setBuyerModalOpen(false)}
              title="Close"
            >
              ×
            </button>
            <h2 className="text-2xl font-bold mb-6 text-blue-700">Add Buyer</h2>
            <form onSubmit={handleAddBuyer} className="flex flex-col gap-6">
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">Buyer Name</label>
                <input
                  className="border rounded px-4 py-3 w-full text-lg text-gray-900 placeholder-gray-400"
                  value={newBuyerName}
                  onChange={e => setNewBuyerName(e.target.value)}
                  placeholder="e.g. David"
                  required
                />
              </div>
              {buyerError && <div className="text-red-600 text-base">{buyerError}</div>}
              <button
                type="submit"
                className="bg-gradient-to-r from-blue-500 to-blue-700 text-white px-6 py-3 rounded-lg shadow hover:from-blue-600 hover:to-blue-800 font-semibold text-lg transition"
              >
                Add Buyer
              </button>
            </form>
          </div>
        </div>
      )}
      {/* Print Barcode Modal */}
      <BarcodePrintModal
        barcodeToPrint={barcodeToPrint || ''}
        price={form.price}
        companyName={companyName}
        quantity={quantityToPrint}
        open={printBarcodeModalOpen}
        onClose={() => setPrintBarcodeModalOpen(false)}
      />
    </div>
  );
} 