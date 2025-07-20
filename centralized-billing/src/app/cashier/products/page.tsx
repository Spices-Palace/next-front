"use client";
import React, { useEffect } from "react";
import { useDispatch } from "react-redux";
import { useGetProductsQuery } from '../../../store/api';
import type { AppDispatch } from "../../../store/store";
import Barcode from "react-barcode";
import BarcodePrintModal from '../../components/BarcodePrintModal';

export default function CashierProductsPage() {
  const { data: products = [] } = useGetProductsQuery();
  const dispatch: AppDispatch = useDispatch();
  const [search, setSearch] = React.useState("");
  const [printModalOpen, setPrintModalOpen] = React.useState(false);
  const [barcodeToPrint, setBarcodeToPrint] = React.useState("");
  const [priceToPrint, setPriceToPrint] = React.useState("");
  const [companyName, setCompanyName] = React.useState("");

  useEffect(() => {
    // The fetchProducts thunk is no longer needed as products are fetched via RTK Query
  }, [dispatch]);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      setCompanyName(localStorage.getItem('companyName') || "COMPANY");
    }
  }, []);

  // Filtered products for search
  const filteredProducts = search.trim() === ''
    ? []
    : products.filter(
        p =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.barcode.toLowerCase().includes(search.toLowerCase())
      );

  return (
    <div className="p-4 w-full">
      <h1 className="text-3xl font-extrabold text-blue-700 mb-8">Products</h1>
      <input
        className="w-full border rounded px-4 py-3 text-lg text-gray-900 placeholder-gray-400 mb-8"
        placeholder="Search by name or barcode..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />
      <div className="overflow-x-auto rounded-2xl shadow-lg border border-blue-100 bg-white p-12 mb-10 w-full">
        <table className="min-w-full text-base text-left">
          <thead className="bg-blue-100">
            <tr>
              <th className="px-5 py-3 text-gray-800 font-bold text-lg">Barcode</th>
              <th className="px-5 py-3 text-gray-800 font-bold text-lg">Name</th>
              <th className="px-5 py-3 text-gray-800 font-bold text-lg">Type</th>
              <th className="px-5 py-3 text-gray-800 font-bold text-lg">Unit</th>
              <th className="px-5 py-3 text-gray-800 font-bold text-lg">Price (₹)</th>
              <th className="px-5 py-3 text-gray-800 font-bold text-lg">Qty</th>
              <th className="px-5 py-3 text-gray-800 font-bold text-lg">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-400 text-lg">No products found.</td>
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
                  <td className="px-5 py-3 text-gray-800 text-lg">{product.type}</td>
                  <td className="px-5 py-3 text-gray-800 text-lg">{product.unit}</td>
                  <td className="px-5 py-3 text-gray-900 text-lg">₹{product.price}</td>
                  <td className="px-5 py-3 text-gray-900 text-lg">{product.quantity}</td>
                  <td className="px-5 py-3">
                    <button
                      className="bg-gradient-to-r from-blue-500 to-blue-700 text-white px-4 py-2 rounded shadow hover:from-blue-600 hover:to-blue-800 font-semibold text-base transition"
                      onClick={() => {
                        setBarcodeToPrint(product.barcode);
                        setPriceToPrint(product.price.toString());
                        setPrintModalOpen(true);
                      }}
                    >
                      Print Barcode
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <BarcodePrintModal
        barcodeToPrint={barcodeToPrint}
        price={priceToPrint}
        companyName={companyName}
        quantity={1}
        open={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
      />
    </div>
  );
} 