"use client";
import React, { useState, useRef } from "react";
import { useGetBillsQuery } from '../../../store/api';
import Cookies from 'js-cookie';
import { skipToken } from '@reduxjs/toolkit/query';

export default function CashierBillsPage() {
  const rawCompanyId = Cookies.get('companyId') || (typeof window !== 'undefined' ? localStorage.getItem('companyId') : '');
  const companyId = rawCompanyId || '';
  const { data: bills = [], error, isLoading } = useGetBillsQuery(companyId ? { companyId } : skipToken);
  const [search, setSearch] = useState("");
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [showPrint, setShowPrint] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const filteredBills = bills.filter(
    b =>
      (b.customerName || '').toLowerCase().includes(search.toLowerCase()) ||
      (b.billNo || '').toLowerCase().includes(search.toLowerCase())
  );

  const handlePrint = (bill: any) => {
    setSelectedBill(bill);
    setShowPrint(true);
    setTimeout(() => {
      if (printRef.current) {
        window.print();
      }
      setShowPrint(false);
    }, 200);
  };

  const calculateTaxes = (productType: string, amount: number) => {
    const TAX_RATES = {
      'Saree': { cgst: 2.5, sgst: 2.5 },
      'Dress': { cgst: 2.5, sgst: 2.5 },
      'Blouse': { cgst: 2.5, sgst: 2.5 },
      'Other': { cgst: 2.5, sgst: 2.5 }
    };
    const rates = TAX_RATES[productType as keyof typeof TAX_RATES] || TAX_RATES['Saree'];
    return {
      cgst: Math.round((amount * rates.cgst) / 100),
      sgst: Math.round((amount * rates.sgst) / 100)
    };
  };

  const getBasePrice = (productType: string, taxInclusivePrice: number) => {
    const rates = { cgst: 2.5, sgst: 2.5 };
    const totalTaxRate = rates.cgst + rates.sgst;
    return Math.round((taxInclusivePrice / (1 + totalTaxRate / 100)));
  };

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
                  <td className="px-5 py-3 font-semibold text-green-700">₹{bill.finalTotal || bill.grandTotal}</td>
                  <td className="px-5 py-3">
                    <div className="flex gap-2">
                      <button className="bg-blue-600 hover:bg-blue-800 text-white px-4 py-2 rounded shadow font-semibold transition">View</button>
                      <button 
                        onClick={() => handlePrint(bill)}
                        className="bg-green-600 hover:bg-green-800 text-white px-4 py-2 rounded shadow font-semibold transition"
                      >
                        Print
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        )}
      </div>

      {/* Print-friendly bill layout */}
      {showPrint && selectedBill && (
        <div
          ref={printRef}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "210mm",
            height: "297mm",
            background: "white",
            zIndex: 9999,
            padding: "0",
            fontFamily: "Arial, sans-serif",
            boxSizing: "border-box",
          }}
        >
          <style>{`
            @media print {
              @page { 
                size: A4; 
                margin: 0; 
              }
              body { 
                background: white !important; 
                margin: 0 !important; 
                padding: 0 !important; 
              }
              * { 
                -webkit-print-color-adjust: exact !important; 
                color-adjust: exact !important; 
              }
            }
            .bill-page {
              width: 210mm;
              height: 297mm;
              box-sizing: border-box;
              padding: 15mm;
              background: #faf9f6;
              display: flex;
              flex-direction: column;
              position: relative;
              font-family: 'Georgia', serif;
            }
            .header-section {
              display: flex;
              flex-direction: column;
              align-items: center;
              margin-bottom: 8mm;
            }
            .company-section {
              display: flex;
              align-items: center;
              gap: 6mm;
              margin-bottom: 6mm;
            }
            .silk-mark-logo {
              width: 20mm;
              height: 20mm;
              background-image: url('/silkmark.jpg');
              background-size: contain;
              background-repeat: no-repeat;
              background-position: center;
              flex-shrink: 0;
            }
            .company-info {
              text-align: center;
            }
            .company-name {
              font-size: 24px;
              font-weight: bold;
              color: #000;
              font-family: 'Georgia', serif;
              margin-bottom: 2mm;
            }
            .company-details {
              font-size: 12px;
              color: #000;
              line-height: 1.4;
            }
            .billed-to-section {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 8mm;
            }
            .billed-to-left {
              flex: 1;
            }
            .billed-to-title {
              font-size: 11px;
              font-weight: bold;
              color: #000;
              text-transform: uppercase;
              margin-bottom: 3mm;
              letter-spacing: 1.5px;
              font-family: 'Arial', sans-serif;
            }
            .billed-to-content {
              font-size: 13px;
              color: #000;
              line-height: 1.5;
              font-family: 'Arial', sans-serif;
            }
            .invoice-details {
              text-align: right;
              font-size: 13px;
              color: #000;
              line-height: 1.5;
              font-family: 'Arial', sans-serif;
            }
            .divider-line {
              border-top: 1px solid #000;
              margin: 6mm 0;
            }
            .products-section {
              flex: 1;
              margin-bottom: 8mm;
            }
            .bill-table {
              width: 100%;
              border-collapse: collapse;
              font-size: 14px;
              color: #000;
            }
            .bill-table th {
              background: transparent;
              color: #000;
              border: none;
              padding: 3mm 2mm;
              text-align: left;
              font-weight: bold;
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 1.5px;
              font-family: 'Arial', sans-serif;
            }
            .bill-table td {
              border: none;
              padding: 2mm 2mm;
              text-align: left;
              background: transparent;
              font-size: 13px;
              font-family: 'Arial', sans-serif;
            }
            .bill-table td:last-child {
              text-align: right;
            }
            .bill-table th:last-child {
              text-align: right;
            }
            .summary-section {
              text-align: right;
              margin-bottom: 8mm;
            }
            .summary-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 2mm;
              font-size: 13px;
              color: #000;
              min-width: 200px;
              font-family: 'Arial', sans-serif;
            }
            .summary-row.total {
              font-weight: bold;
              font-size: 16px;
              border-top: 1px solid #000;
              padding-top: 2mm;
              margin-top: 2mm;
              font-family: 'Arial', sans-serif;
            }
            .footer-section {
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              margin-top: auto;
            }
            .thank-you {
              font-size: 22px;
              font-weight: normal;
              color: #000;
              font-family: 'Georgia', serif;
            }
            .payment-info {
              text-align: left;
              font-size: 11px;
              color: #000;
              font-family: 'Arial', sans-serif;
            }
            .payment-info-title {
              font-weight: bold;
              text-transform: uppercase;
              letter-spacing: 1.5px;
              margin-bottom: 2mm;
              font-size: 10px;
            }
            .signature-section {
              text-align: right;
              font-size: 12px;
              color: #000;
              font-family: 'Arial', sans-serif;
            }
            .signature-name {
              font-family: 'Brush Script MT', cursive;
              font-size: 16px;
              margin-bottom: 2mm;
            }
            .print:hidden { display: none !important; }
          `}</style>
          
          <div className="bill-page">
            {/* Header Section */}
            <div className="header-section">
              <div className="company-section">
                <div className="silk-mark-logo"></div>
                <div className="company-info">
                  <div className="company-name">{typeof window !== 'undefined' ? (localStorage.getItem('companyName') || "COMPANY") : "COMPANY"}</div>
                  <div className="company-details">
                    <div>123 Main Street, City, State - 123456</div>
                    <div>Phone: +91 98765 43210 | Email: info@company.com</div>
                    <div>GST No: {typeof window !== 'undefined' ? (localStorage.getItem('companyGstNo') || '27AAAPL1234C1ZV') : '27AAAPL1234C1ZV'} | PAN: ABCDE1234F</div>
                    <div>Website: www.company.com</div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Billed To Section */}
            <div className="billed-to-section">
              <div className="billed-to-left">
                <div className="billed-to-title">Billed To:</div>
                <div className="billed-to-content">
                  <div>{selectedBill.customerName || 'Walk-in Customer'}</div>
                </div>
              </div>
              <div className="invoice-details">
                <div>Invoice No. {selectedBill.billNo}</div>
                <div>{selectedBill.date ? selectedBill.date.slice(0, 10) : new Date().toLocaleDateString()}</div>
              </div>
            </div>
            
            <div className="divider-line"></div>
            
            {/* Products Section */}
            <div className="products-section">
              <table className="bill-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Quantity</th>
                    <th>Unit Price</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedBill.items && selectedBill.items.map((item: any, idx: number) => {
                    const basePrice = getBasePrice(item.productType || 'Saree', item.salePrice || item.total);
                    return (
                      <tr key={idx}>
                        <td>{item.productName}</td>
                        <td>{item.quantity}</td>
                        <td>₹{basePrice}</td>
                        <td>₹{item.total}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            <div className="divider-line"></div>
            
            {/* Summary Section */}
            <div className="summary-section">
              <div className="summary-row">
                <span>Subtotal</span>
                <span>₹{selectedBill.grandTotal}</span>
              </div>
              {selectedBill.discountAmount && selectedBill.discountAmount > 0 && (
                <div className="summary-row">
                  <span>Discount</span>
                  <span>-₹{selectedBill.discountAmount}</span>
                </div>
              )}
              <div className="summary-row">
                <span>Tax (0%)</span>
                <span>₹0</span>
              </div>
              <div className="summary-row total">
                <span>Total</span>
                <span>₹{selectedBill.finalTotal || selectedBill.grandTotal}</span>
              </div>
            </div>
            
            {/* Footer Section */}
            <div className="footer-section">
              <div className="thank-you">Thank you!</div>
              <div className="payment-info">
                <div className="payment-info-title">Payment Information</div>
                <div>Briard Bank</div>
                <div>Account Name: {typeof window !== 'undefined' ? (localStorage.getItem('companyName') || "COMPANY") : "COMPANY"}</div>
                <div>Account No.: 123-456-7890</div>
                <div>Pay by: {new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toLocaleDateString()}</div>
              </div>
              <div className="signature-section">
                <div className="signature-name">{typeof window !== 'undefined' ? (localStorage.getItem('companyName') || "COMPANY") : "COMPANY"}</div>
                <div>123 Anywhere St., Any City, ST 12345</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 