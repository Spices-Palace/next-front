"use client";

import React, { useState, useEffect } from 'react';
import Barcode from 'react-barcode';
import Cookies from 'js-cookie';
import { useGetProductsQuery, useGetBuyersQuery, useAddProductMutation, useUpdateProductMutation, useDeleteProductMutation } from '../../../store/api';
import BarcodePrintModal from '../../components/BarcodePrintModal';
import BulkBarcodePrintModal from '../../components/BulkBarcodePrintModal';
import { skipToken } from '@reduxjs/toolkit/query';

interface Product {
  id: number;
  name: string;
  type: string;
  unit: string;
  cost: number;
  price: number;
  quantity: number;
  barcode: string;
  buyerId: string;
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
  // Get all existing barcodes
  const existingBarcodes = new Set(products.map(p => p.barcode));
  
  // Find the next available barcode starting from 1000A
  let nextNum = 1000;
  let barcode = `${nextNum}A`;
  
  // Keep incrementing until we find an unused barcode
  while (existingBarcodes.has(barcode)) {
    nextNum++;
    barcode = `${nextNum}A`;
  }
  
  return barcode;
}

// Function to find duplicate barcodes
function findDuplicateBarcodes(products: Product[]) {
  const barcodeCounts = new Map<string, Product[]>();
  
  products.forEach(product => {
    if (!barcodeCounts.has(product.barcode)) {
      barcodeCounts.set(product.barcode, []);
    }
    barcodeCounts.get(product.barcode)!.push(product);
  });
  
  return Array.from(barcodeCounts.entries())
    .filter(([barcode, products]) => products.length > 1)
    .map(([barcode, products]) => ({ barcode, products }));
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://nest-back-hfgh.onrender.com';
const PRODUCTS_API_URL = BASE_URL + '/v1/products';
const BUYERS_API_URL = BASE_URL + '/v1/buyers';

export default function ProductsPage() {
  const rawCompanyId = Cookies.get('companyId') || (typeof window !== 'undefined' ? localStorage.getItem('companyId') : '');
  const companyId = rawCompanyId || '';
  const { data: products = [] } = useGetProductsQuery(companyId ? { companyId } : skipToken);
  const { data: buyers = [] } = useGetBuyersQuery(); // If buyers should be company-specific, update to useGetBuyersQuery({ companyId }, { skip: !companyId }) and update the API definition accordingly.
  const [addProduct, { isLoading: isAdding }] = useAddProductMutation();
  const [updateProduct, { isLoading: isUpdating }] = useUpdateProductMutation();
  const [deleteProduct, { isLoading: isDeleting }] = useDeleteProductMutation();
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
  const [productToPrint, setProductToPrint] = useState<Product | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [fixingDuplicates, setFixingDuplicates] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());
  const [bulkPrintModalOpen, setBulkPrintModalOpen] = useState(false);
  
  // Check for duplicate barcodes
  const duplicateBarcodes = findDuplicateBarcodes(products);

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
      let buyerIdStr = product.buyerId;
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
    
    // Validate barcode format if provided
    if (form.barcode && !/^\d+A$/.test(form.barcode)) {
      setError('Barcode must be in format: numbers followed by "A" (e.g., 1000A)');
      return;
    }
    
    // Check for duplicate barcode
    const isDuplicateBarcode = products.some(p => 
      p.barcode === form.barcode && p.id !== editingId
    );
    if (isDuplicateBarcode) {
      setError('A product with this barcode already exists. Please use a different barcode.');
      return;
    }
    
    let barcode = form.barcode;
    if (!editingId) {
      // For new products, use provided barcode or generate one
      if (!barcode) {
        barcode = generateBarcode(products);
      }
    } else {
      // For updates, use provided barcode or keep existing one
      if (!barcode) {
        const existingProduct = products.find(p => p.id === editingId);
        barcode = existingProduct ? existingProduct.barcode : generateBarcode(products);
      }
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
        await updateProduct({
          id: editingId,
          name: payload.name,
          type: payload.type,
          unit: payload.unit,
          cost: payload.cost,
          price: payload.price,
          quantity: payload.quantity,
          barcode: payload.barcode,
          buyerId: payload.buyerId,
          companyId: payload.companyId,
        }).unwrap();
        setSuccess('Product updated successfully!');
        setTimeout(() => setSuccess(''), 3000);
        setModalOpen(false);
      } else {
        await addProduct(payload).unwrap();
        setSuccess('Product added successfully!');
        setTimeout(() => setSuccess(''), 3000);
        setModalOpen(false);
        setBarcodeToPrint(barcode);
        setQuantityToPrint(Number(form.quantity) || 1);
        setPrintBarcodeModalOpen(true);
      }
    } catch (err: any) {
      setError(err?.data?.message || 'Failed to save product.');
    }
  };

  const handleDeleteClick = (product: Product) => {
    setProductToDelete(product);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!productToDelete?.id) return;
    try {
      await deleteProduct(productToDelete.id).unwrap();
      setSuccess('Product deleted successfully!');
      setTimeout(() => setSuccess(''), 3000);
      setDeleteModalOpen(false);
      setProductToDelete(null);
    } catch (err: any) {
      setError(err?.data?.message || 'Failed to delete product.');
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModalOpen(false);
    setProductToDelete(null);
  };

  const handlePrintProduct = (product: Product) => {
    setProductToPrint(product);
    setBarcodeToPrint(product.barcode);
    setQuantityToPrint(product.quantity || 1);
    setPrintBarcodeModalOpen(true);
  };

  const handleSelectProduct = (productId: number) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedProducts.size === filteredProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(filteredProducts.map(p => p.id)));
    }
  };

  const handleBulkPrint = () => {
    if (selectedProducts.size === 0) return;
    setBulkPrintModalOpen(true);
  };

  const handleFixDuplicateBarcodes = async () => {
    setFixingDuplicates(true);
    try {
      // Get all products that need new barcodes
      const productsToUpdate = duplicateBarcodes.flatMap(({ products }) => 
        products.slice(1) // Keep the first product with the original barcode, update the rest
      );
      
      // Generate new barcodes for each duplicate
      for (const product of productsToUpdate) {
        const newBarcode = generateBarcode(products);
        
        // Update the product with new barcode
        await updateProduct({
          id: product.id,
          name: product.name,
          type: product.type,
          unit: product.unit,
          cost: product.cost,
          price: product.price,
          quantity: product.quantity,
          barcode: newBarcode,
          buyerId: product.buyerId,
          companyId: product.companyId,
        }).unwrap();
        
        // Update local products array to reflect the change
        const updatedProducts = products.map(p => 
          p.id === product.id ? { ...p, barcode: newBarcode } : p
        );
        // Note: The RTK Query cache will be automatically updated
      }
      
      setSuccess('Duplicate barcodes fixed successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err?.data?.message || 'Failed to fix duplicate barcodes.');
    } finally {
      setFixingDuplicates(false);
    }
  };

  // Filtered products for search
  const filteredProducts = products.filter(
    p =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.barcode.toLowerCase().includes(search.toLowerCase())
  );

  const getBuyerName = (buyerId: string) => buyers.find(b => String(b.id) === buyerId)?.name || '';

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
          <div className="flex gap-3">
            {selectedProducts.size > 0 && (
              <button
                onClick={handleBulkPrint}
                className="bg-gradient-to-r from-green-500 to-green-700 text-white px-5 py-2 rounded-lg shadow hover:from-green-600 hover:to-green-800 font-semibold text-lg transition"
              >
                Print Selected ({selectedProducts.size})
              </button>
            )}
            <button
              onClick={() => openModal()}
              className="bg-gradient-to-r from-blue-500 to-blue-700 text-white px-5 py-2 rounded-lg shadow hover:from-blue-600 hover:to-blue-800 font-semibold text-lg transition"
            >
              + Add Product
            </button>
          </div>
        </div>
        <input
          className="w-full border rounded px-4 py-3 text-lg text-gray-900 placeholder-gray-400"
          placeholder="Search by name or barcode..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="text-green-700 font-semibold">{success}</div>
          </div>
        )}
        {duplicateBarcodes.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-red-600 font-bold">⚠️ Duplicate Barcodes Detected</span>
            </div>
            <p className="text-red-700 text-sm mb-3">
              The following barcodes are used by multiple products. Please fix these duplicates to avoid billing issues:
            </p>
            {duplicateBarcodes.map(({ barcode, products }) => (
              <div key={barcode} className="mb-2 p-2 bg-red-100 rounded">
                <div className="font-semibold text-red-800">Barcode: {barcode}</div>
                <div className="text-sm text-red-700">
                  Products: {products.map(p => p.name).join(', ')}
                </div>
              </div>
            ))}
            <button
              onClick={handleFixDuplicateBarcodes}
              disabled={fixingDuplicates}
              className="mt-3 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-semibold transition disabled:opacity-50"
            >
              {fixingDuplicates ? 'Fixing...' : 'Fix Duplicate Barcodes'}
            </button>
          </div>
        )}
      </div>
      {/* Table view only */}
      <div className="overflow-x-auto rounded-2xl shadow-lg border border-blue-100 bg-white p-12 mb-10 w-full">
        <table className="min-w-full text-base text-left">
          <thead className="bg-blue-100">
            <tr>
              <th className="px-5 py-3 text-gray-800 font-bold text-lg">
                <input
                  type="checkbox"
                  checked={selectedProducts.size === filteredProducts.length && filteredProducts.length > 0}
                  onChange={handleSelectAll}
                  className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
              </th>
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
                <td colSpan={10} className="text-center py-8 text-gray-400 text-lg">No products found.</td>
              </tr>
            ) : (
              filteredProducts.map(product => (
                <tr key={product.id} className="border-t hover:bg-blue-50 transition">
                  <td className="px-5 py-3">
                    <input
                      type="checkbox"
                      checked={selectedProducts.has(product.id)}
                      onChange={() => handleSelectProduct(product.id)}
                      className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </td>
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
                      className="text-green-600 hover:text-green-800 font-bold mr-2 text-xl"
                      onClick={() => handlePrintProduct(product)}
                      title="Print Barcode"
                    >
                      <span className="material-icons">print</span>
                    </button>
                    <button
                      className="text-red-600 hover:text-red-800 font-bold text-xl"
                      onClick={() => handleDeleteClick(product)}
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
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">Barcode</label>
                <input
                  className="border rounded px-4 py-3 w-full text-lg text-gray-900 placeholder-gray-400"
                  value={form.barcode}
                  onChange={e => setForm(f => ({ ...f, barcode: e.target.value }))}
                  placeholder="e.g. 1000A (auto-generated if empty)"
                  pattern="[0-9]+A"
                  title="Barcode must be in format: numbers followed by 'A' (e.g., 1000A)"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Format: numbers followed by 'A' (e.g., 1000A). Leave empty for auto-generation.
                </p>
              </div>
              {error && <div className="text-red-600 text-base">{error}</div>}
              {success && <div className="text-green-600 text-base mb-2">{success}</div>}
              <button
                type="submit"
                className="bg-gradient-to-r from-blue-500 to-blue-700 text-white px-6 py-3 rounded-lg shadow hover:from-blue-600 hover:to-blue-800 font-semibold text-lg transition disabled:opacity-50"
                disabled={isAdding || isUpdating}
              >
                {isAdding || isUpdating ? 'Saving...' : (editingId ? 'Update Product' : 'Add Product')}
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
        price={productToPrint ? String(productToPrint.price) : form.price}
        companyName={companyName}
        quantity={quantityToPrint}
        open={printBarcodeModalOpen}
        onClose={() => {
          setPrintBarcodeModalOpen(false);
          setProductToPrint(null);
        }}
      />

      {/* Bulk Print Barcode Modal */}
      <BulkBarcodePrintModal
        products={filteredProducts.filter(p => selectedProducts.has(p.id))}
        companyName={companyName}
        open={bulkPrintModalOpen}
        onClose={() => {
          setBulkPrintModalOpen(false);
          setSelectedProducts(new Set());
        }}
      />

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
            <div className="text-xl font-bold mb-4 text-red-700">Confirm Delete</div>
            <p className="text-gray-700 mb-6">
              Are you sure you want to delete product <span className="font-bold">{productToDelete.name}</span>?
              <br />
              <span className="text-sm text-gray-500">This action cannot be undone.</span>
            </p>
            <div className="flex gap-4 justify-end">
              <button
                className="px-6 py-2 border border-gray-300 rounded font-semibold text-gray-700 hover:bg-gray-50 transition"
                onClick={handleDeleteCancel}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-semibold transition disabled:opacity-50"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 