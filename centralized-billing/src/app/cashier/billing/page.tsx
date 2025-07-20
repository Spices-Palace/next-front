"use client";
import React, { useState, useRef, useEffect } from "react";
import { useGetProductsQuery, useGetSalesmenQuery } from '../../../store/api';
import type { Product } from "../../../store/productsSlice";
import Cookies from 'js-cookie';

const BILLS_API_URL = process.env.NEXT_PUBLIC_API_URL
  ? process.env.NEXT_PUBLIC_API_URL + '/v1/bills'
  : 'http://localhost:4000/v1/bills';

// Extend Product for billing items
type BillingItem = Product & {
  modifiedBarcode?: string;
  priceIncrease?: number;
  total: number;
  originalPrice?: number;
};

function generateBillNo() {
  return "BILL-" + (1000 + Math.floor(Math.random() * 9000));
}

// Tax rates for different product types
const TAX_RATES = {
  'Saree': { cgst: 2.5, sgst: 2.5 }, // 5% total GST for Sarees
  'Cloth': { cgst: 2.5, sgst: 2.5 }, // 5% total GST for Cloth
  'Handicraft': { cgst: 6, sgst: 6 }, // 12% total GST for Handicraft
};

// Function to calculate taxes for a product (extracted from tax-inclusive price)
function calculateTaxes(productType: string, amount: number) {
  const rates = TAX_RATES[productType as keyof typeof TAX_RATES] || TAX_RATES['Saree'];
  const totalTaxRate = rates.cgst + rates.sgst;
  // Extract CGST and SGST from the tax-inclusive price
  const cgst = Math.round((amount * rates.cgst) / (100 + totalTaxRate));
  const sgst = Math.round((amount * rates.sgst) / (100 + totalTaxRate));
  return { cgst, sgst, totalTax: cgst + sgst };
}

// Function to calculate total taxes for all items
function calculateTotalTaxes(items: BillingItem[]) {
  let totalCGST = 0;
  let totalSGST = 0;
  
  items.forEach(item => {
    const taxes = calculateTaxes(item.type, item.total);
    totalCGST += taxes.cgst;
    totalSGST += taxes.sgst;
  });
  
  return { totalCGST, totalSGST, totalTax: totalCGST + totalSGST };
}

// Function to parse barcode and get product with price adjustment
function parseBarcodeAndGetProduct(barcode: string, products: Product[]) {
  // Check if it's a modified barcode (has 3 digits after A)
  const match = barcode.match(/^(.+A)(\d{3})$/);
  
  if (match) {
    // Modified barcode with price increase
    const originalBarcode = match[1]; // e.g., "1000A"
    const priceCode = match[2]; // e.g., "001", "010", "100"
    
    // Find the original product
    const product = products.find(p => p.barcode === originalBarcode);
    
    if (product) {
      // Calculate price increase based on the 3-digit code
      const priceMultiplier = parseInt(priceCode, 10); // 001 = 1, 010 = 10, 100 = 100
      const priceIncrease = priceMultiplier * 100; // 1*100=100, 10*100=1000, 100*100=10000
      
      // Ensure we're working with integers to avoid floating point issues
      const originalPrice = Math.round(product.price);
      const finalPrice = originalPrice + priceIncrease;
      
      console.log(`Barcode: ${barcode}, Original: ${originalBarcode}, PriceCode: ${priceCode}, Multiplier: ${priceMultiplier}, Increase: ${priceIncrease}, OriginalPrice: ${originalPrice}, FinalPrice: ${finalPrice}`);
      
      return {
        ...product,
        price: finalPrice,
        originalPrice: originalPrice,
        priceIncrease: priceIncrease,
        modifiedBarcode: barcode
      };
    }
  } else {
    // Normal barcode
    const product = products.find(p => p.barcode === barcode);
    if (product) {
      return {
        ...product,
        originalPrice: Math.round(product.price),
        priceIncrease: 0,
        modifiedBarcode: null
      };
    }
  }
  
  return null;
}

// Helper function to get base price from tax-inclusive price
function getBasePrice(productType: string, taxInclusivePrice: number) {
  const rates = TAX_RATES[productType as keyof typeof TAX_RATES] || TAX_RATES['Saree'];
  const totalTaxRate = rates.cgst + rates.sgst;
  return Math.round((taxInclusivePrice / (1 + totalTaxRate / 100)));
}

export default function CashierBillingPage() {
  const { data: products = [], error: productsError, isLoading: productsLoading } = useGetProductsQuery();
  const { data: salesmen = [], error: salesmenError, isLoading: salesmenLoading } = useGetSalesmenQuery();
  const [customer, setCustomer] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [items, setItems] = useState<BillingItem[]>([]);
  const [showPrint, setShowPrint] = useState(false);
  const [selectedSalesman, setSelectedSalesman] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<BillingItem[]>([]);
  const [showSalesmanModal, setShowSalesmanModal] = useState(false);
  const [payments, setPayments] = useState([{ method: 'Cash', amount: 0 }]);
  const [discountType, setDiscountType] = useState<'percentage' | 'custom'>('percentage');
  const [discountValue, setDiscountValue] = useState(0);
  const [paymentMode, setPaymentMode] = useState<'single' | 'multiple'>('single');
  const [errorModal, setErrorModal] = useState<string | null>(null);
  
  // Keep ref in sync with state
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    // The Redux thunk for fetching products is removed, so this useEffect is no longer needed.
    // The products data is now managed by RTK Query.
  }, []);

  // Calculate grand total first
  const grandTotal = Math.round(items.reduce((sum, item) => sum + item.total, 0));

  // Calculate discount and final total
  let discount = 0;
  if (discountType === 'percentage') {
    discount = Math.round((grandTotal * discountValue) / 100);
  } else {
    discount = Math.round(discountValue);
  }
  const finalTotal = Math.max(grandTotal - discount, 0);

  // Keep single payment amount in sync with finalTotal
  useEffect(() => {
    if (paymentMode === 'single') {
      setPayments([{ method: payments[0]?.method || 'Cash', amount: finalTotal }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finalTotal, paymentMode]);

  // Calculate total paid and payment error
  const totalPaid = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const paymentError = totalPaid !== finalTotal;

  // Other bill info
  const taxes = calculateTotalTaxes(items);
  const billNo = generateBillNo();
  const today = new Date().toLocaleDateString();
  const companyName = typeof window !== 'undefined' ? (localStorage.getItem('companyName') || "COMPANY") : "COMPANY";
  const companyGstNo = typeof window !== 'undefined' ? (localStorage.getItem('companyGstNo') || '27AAAPL1234C1ZV') : '27AAAPL1234C1ZV'; // fallback GST number
  const companyId = Cookies.get('companyId') || '';

  // Add product by barcode (scan or type)
  const handleBarcodeAdd = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) {
      console.log('Already submitting, ignoring duplicate submission');
      return;
    }
    
    const code = barcodeInput.trim();
    if (!code) return;
    
    console.log('=== SCAN START ===');
    console.log('Scanning barcode:', code);
    setIsSubmitting(true);
    
    const productWithPrice = parseBarcodeAndGetProduct(code, products) as BillingItem | null;
    if (!productWithPrice) {
      console.log('Product not found for barcode:', code);
      setIsSubmitting(false);
      return;
    }
    // Check for availability
    if (productWithPrice.quantity !== undefined && productWithPrice.quantity <= 0) {
      setErrorModal('Item not available');
      setIsSubmitting(false);
      return;
    }
    
    console.log('Product found:', productWithPrice.name, 'Price:', productWithPrice.price);
    console.log('Product barcode:', productWithPrice.barcode);
    console.log('Product modifiedBarcode:', productWithPrice.modifiedBarcode);
    
    // Use ref to get current state and prevent double updates
    const currentItems = itemsRef.current;
    console.log('=== STATE UPDATE START ===');
    console.log('Current items count:', currentItems.length);
    
    // Use the actual scanned barcode (which could be modified) to find existing items
    const scannedBarcode = productWithPrice.modifiedBarcode || productWithPrice.barcode;
    console.log('Looking for existing item with barcode:', scannedBarcode);
    
    console.log('Current items in state:');
    currentItems.forEach((item, index) => {
      const itemBarcode = item.modifiedBarcode || item.barcode;
      console.log(`  Item ${index}: ${item.name} - Barcode: ${itemBarcode} - Qty: ${item.quantity}`);
    });
    
    const idx = currentItems.findIndex(item => {
      const itemBarcode = item.modifiedBarcode || item.barcode;
      const match = itemBarcode === scannedBarcode;
      console.log(`Comparing "${itemBarcode}" with "${scannedBarcode}": ${match}`);
      return match;
    });
    
    console.log('Found existing item at index:', idx);
    
    let newItems;
    if (idx !== -1) {
      // Increment quantity if already present
      console.log(`Item found at index ${idx}, incrementing quantity`);
      newItems = [...currentItems];
      const oldQuantity = newItems[idx].quantity;
      const newQuantity = oldQuantity + 1;
      newItems[idx].quantity = newQuantity;
      newItems[idx].total = Math.round(newQuantity * newItems[idx].price);
      console.log(`Quantity changed from ${oldQuantity} to ${newQuantity}`);
      console.log(`Total changed to ${newItems[idx].total}`);
    } else {
      console.log('No existing item found, adding new item');
      const newItem = { 
        ...productWithPrice, 
        quantity: 1, 
        total: Math.round(productWithPrice.price) 
      };
      console.log('New item:', newItem);
      newItems = [...currentItems, newItem];
    }
    
    // Update state once with the new items
    setItems(newItems);
    
    setBarcodeInput("");
    
    // Reset submission flag after a short delay
    setTimeout(() => {
      setIsSubmitting(false);
      console.log('=== SCAN END ===');
    }, 500);
  };

  // Function to save bill to backend
  const saveBill = async (): Promise<void> => {
    if (items.length === 0 || !selectedSalesman) {
      setErrorModal('Please add items and select salesman before saving.');
      return;
    }

    try {
      // Prepare bill items for backend (use original barcode, keep sale price)
      const billItems = items.map(item => {
        const salePrice = Number(item.price);
        const quantity = Number(item.quantity);
        const total = Number((salePrice * quantity).toFixed(2));
        return {
          productId: item.id,
          productName: item.name,
          originalBarcode: item.barcode, // Always use original barcode
          saleBarcode: item.modifiedBarcode || item.barcode, // The barcode that was scanned
          productType: item.type,
          unit: item.unit,
          originalPrice: item.originalPrice || item.price,
          salePrice: salePrice,
          total: total,
          quantity: quantity,
          cgst: calculateTaxes(item.type, total).cgst,
          sgst: calculateTaxes(item.type, total).sgst,
          priceIncrease: item.priceIncrease || 0
        };
      });

      const salesmanObj = salesmen.find(s => s.name === selectedSalesman);
      const billData = {
        billNo: billNo,
        date: new Date().toISOString(),
        customerName: customer || 'Walk-in Customer',
        salesmanName: selectedSalesman,
        salesmanId: salesmanObj ? salesmanObj.id : undefined,
        companyId: companyId,
        items: billItems,
        totalCGST: taxes.totalCGST,
        totalSGST: taxes.totalSGST,
        grandTotal: grandTotal,
        discountType: discountType,
        discountValue: discountValue,
        discountAmount: discount,
        finalTotal: finalTotal,
        payments: payments,
        status: 'completed'
      };

      console.log('Saving bill data:', JSON.stringify(billData, null, 2));

      const response = await fetch(BILLS_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(billData),
      });

      if (!response.ok) {
        let errorMsg = 'Failed to save bill';
        try {
          const errorData = await response.json();
          if (errorData && errorData.message) {
            errorMsg = errorData.message;
          } else if (typeof errorData === 'string') {
            errorMsg = errorData;
          }
        } catch {
          // Ignore JSON parse errors, use default message
        }
        setErrorModal(errorMsg);
        throw new Error(errorMsg);
      }

      const savedBill = await response.json();
      console.log('Bill saved successfully:', savedBill);
      
      // Show success message
      // Optionally, you can show a success modal here if desired
      
      return savedBill;
    } catch (error: unknown) {
      console.error('Error saving bill:', error);
      let errorMsg = 'Failed to save bill. Please try again.';
      if (typeof error === 'string') {
        errorMsg = error;
      } else if (error && typeof error === 'object' && 'message' in error && typeof (error as { message?: string }).message === 'string') {
        errorMsg = (error as { message?: string }).message as string;
      }
      setErrorModal(errorMsg);
      throw error;
    }
  };

  const handlePrint = async (): Promise<void> => {
    if (!selectedSalesman) {
      setShowSalesmanModal(true);
      return;
    }
    try {
      // First save the bill
      await saveBill();
      // Then print
      console.log('Print button clicked');
      setShowPrint(true);
      // Use a longer timeout to ensure the print element is rendered
      setTimeout(() => {
        if (printRef.current) {
          console.log('Print element found, attempting to print');
          try {
            // Try the primary print method
            window.print();
            console.log('Print dialog opened');
          } catch (error) {
            console.error('Primary print method failed:', error);
            // Fallback: Create a new window for printing
            try {
              const printWindow = window.open('', '_blank');
              if (printWindow) {
                printWindow.document.write(`
                  <html>
                    <head>
                      <title>Print Bill</title>
                      <style>
                        @media print {
                          @page { size: A4; margin: 0; }
                          body { background: white !important; margin: 0 !important; padding: 0 !important; }
                          * { -webkit-print-color-adjust: exact !important; color-adjust: exact !important; }
                        </style>
                      </head>
                      <body>
                        ${printRef.current.innerHTML}
                      </body>
                    </html>
                `);
                printWindow.document.close();
                printWindow.focus();
                printWindow.print();
                printWindow.close();
                console.log('Fallback print method successful');
              } else {
                throw new Error('Could not open print window');
              }
            } catch (fallbackError) {
              console.error('Fallback print method also failed:', fallbackError);
              setErrorModal('Print failed. Please try using Ctrl+P or Cmd+P to print manually.');
            }
          }
        } else {
          console.error('Print element not found');
          setErrorModal('Print element not found. Please try again.');
        }
        setShowPrint(false);
      }, 500); // Increased timeout to 500ms
    } catch (error: unknown) {
      console.error('Error in save and print:', error);
      // Don't proceed with printing if save failed
    }
  };

  return (
    <div className="p-4 w-full max-w-5xl mx-auto">
      <h1 className="text-3xl font-extrabold text-blue-700 mb-8">Billing</h1>
      <div className="bg-white p-8 rounded-2xl shadow-lg border border-blue-100 mb-10" style={{ maxWidth: '900px', padding: '48px' }}>
        <div className="flex flex-col gap-4 mb-6">
          <select
            className="border rounded px-4 py-3 text-lg text-gray-900"
            value={selectedSalesman}
            onChange={e => setSelectedSalesman(e.target.value)}
          >
            <option value="">Select Salesman</option>
            {salesmen.map(s => (
              <option key={s.id} value={s.name}>{s.name}</option>
            ))}
          </select>
          <input
            className="border rounded px-4 py-3 text-lg text-gray-900 placeholder-gray-400"
            placeholder="Customer Name"
            value={customer}
            onChange={e => setCustomer(e.target.value)}
          />
          <form onSubmit={handleBarcodeAdd} className="flex gap-4">
            <input
              className="border rounded px-4 py-3 text-lg text-gray-900"
              placeholder="Scan or type barcode"
              value={barcodeInput}
              onChange={e => setBarcodeInput(e.target.value)}
              autoFocus
            />
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-700 text-white px-6 py-3 rounded shadow font-semibold text-lg transition"
              disabled={!barcodeInput.trim()}
            >
              Add by Barcode
            </button>
          </form>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-base text-left mb-6">
            <thead className="bg-blue-100">
              <tr>
                <th className="px-5 py-3 text-gray-800 font-bold text-lg">Actions</th>
                <th className="px-5 py-3 text-gray-800 font-bold text-lg">Product</th>
                <th className="px-5 py-3 text-gray-800 font-bold text-lg">Barcode</th>
                <th className="px-5 py-3 text-gray-800 font-bold text-lg">Price (₹)</th>
                <th className="px-5 py-3 text-gray-800 font-bold text-lg">Qty</th>
                <th className="px-5 py-3 text-gray-800 font-bold text-lg">CGST (₹)</th>
                <th className="px-5 py-3 text-gray-800 font-bold text-lg">SGST (₹)</th>
                <th className="px-5 py-3 text-gray-800 font-bold text-lg">Total (₹)</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-gray-400 text-lg">No items added.</td>
                </tr>
              ) : (
                items.map((item, idx) => {
                  const taxes = calculateTaxes(item.type, item.total);
                  const basePrice = getBasePrice(item.type, item.price);
                  return (
                    <tr key={idx} className="border-t">
                      <td className="px-5 py-3">
                        <button
                          onClick={() => {
                            setItems(prev => prev.filter((_, index) => index !== idx));
                          }}
                          className="bg-red-500 hover:bg-red-700 text-white px-3 py-1 rounded text-sm font-semibold transition"
                          title="Delete item"
                        >
                          Delete
                        </button>
                      </td>
                      <td className="px-5 py-3 text-black">{item.name}</td>
                      <td className="px-5 py-3 font-mono text-black">
                        {item.modifiedBarcode || item.barcode}
                      </td>
                      <td className="px-5 py-3 text-black">₹{basePrice}</td>
                      <td className="px-5 py-3 text-black">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => {
                            const newQuantity = parseInt(e.target.value) || 1;
                            setItems(prev => {
                              const updated = [...prev];
                              updated[idx].quantity = newQuantity;
                              updated[idx].total = Math.round(newQuantity * updated[idx].price);
                              return updated;
                            });
                          }}
                          className="w-16 border rounded px-2 py-1 text-center text-black"
                        />
                      </td>
                      <td className="px-5 py-3 text-black">₹{taxes.cgst}</td>
                      <td className="px-5 py-3 text-black">₹{taxes.sgst}</td>
                      <td className="px-5 py-3 font-semibold text-black">₹{item.total}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-row items-end justify-between gap-8 mt-8 w-full">
          {/* Payment on the left */}
          <div className="flex flex-col gap-2 items-start w-1/2">
            <div className="flex flex-col gap-2 w-full max-w-xl">
              <label className="font-semibold text-lg text-black mb-1">Payments:</label>
              <div className="flex gap-2 mb-2">
                <button
                  type="button"
                  className={`px-4 py-2 rounded-l border border-black text-lg font-bold ${paymentMode === 'single' ? 'bg-black text-white' : 'bg-white text-black'}`}
                  onClick={() => {
                    setPaymentMode('single');
                  }}
                >
                  Single
                </button>
                <button
                  type="button"
                  className={`px-4 py-2 rounded-r border border-black text-lg font-bold ${paymentMode === 'multiple' ? 'bg-black text-white' : 'bg-white text-black'}`}
                  onClick={() => {
                    setPaymentMode('multiple');
                  }}
                >
                  Multiple
                </button>
              </div>
              {paymentMode === 'single' ? (
                <div className="flex gap-2 items-center">
                  <select
                    className="border rounded px-4 py-3 text-lg text-black"
                    value={payments[0]?.method || 'Cash'}
                    onChange={e => {
                      const newPayments = [...payments];
                      newPayments[0].method = e.target.value;
                      setPayments(newPayments);
                    }}
                  >
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                    <option value="UPI">UPI</option>
                  </select>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="border rounded px-4 text-lg text-black w-32"
                    style={{ height: '48px' }}
                    placeholder="Amount"
                    value={finalTotal}
                    readOnly
                  />
                </div>
              ) : (
                <>
                  {payments.map((p, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <select
                        className="border rounded px-4 py-3 text-lg text-black"
                        value={p.method}
                        onChange={e => {
                          const newPayments = [...payments];
                          newPayments[idx].method = e.target.value;
                          setPayments(newPayments);
                        }}
                      >
                        <option value="Cash">Cash</option>
                        <option value="Card">Card</option>
                        <option value="UPI">UPI</option>
                      </select>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        className="border rounded px-4 text-lg text-black w-32"
                        style={{ height: '48px' }}
                        placeholder="Amount"
                        value={p.amount}
                        onChange={e => {
                          const newPayments = [...payments];
                          newPayments[idx].amount = Number(e.target.value.replace(/[^0-9]/g, ''));
                          setPayments(newPayments);
                        }}
                      />
                      {payments.length > 1 && (
                        <button
                          type="button"
                          className="text-red-600 font-bold text-lg px-2"
                          onClick={() => setPayments(payments.filter((_, i) => i !== idx))}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    className="mt-2 bg-blue-600 hover:bg-blue-800 text-white px-4 py-2 rounded font-semibold"
                    onClick={() => setPayments([...payments, { method: 'Cash', amount: 0 }])}
                  >
                    + Add Payment Method
                  </button>
                  <div className="text-sm text-black mt-1">Total Paid: <span className={paymentError ? 'text-red-600 font-bold' : 'font-bold'}>₹{totalPaid}</span> / ₹{finalTotal}</div>
                  {paymentError && <div className="text-sm text-red-600 font-bold">Total paid must match the grand total.</div>}
                </>
              )}
            </div>
          </div>
          {/* Discount on the right above grand total */}
          <div className="flex flex-col items-end gap-2 w-1/2">
            <div className="flex gap-2 items-center mb-1 w-full justify-end">
              <label className="font-semibold text-lg text-black">Discount:</label>
              <div className="flex gap-1">
                <button
                  type="button"
                  className={`px-3 py-3 rounded-l border border-black text-lg font-bold ${discountType === 'percentage' ? 'bg-black text-white' : 'bg-white text-black'}`}
                  onClick={() => setDiscountType('percentage')}
                  style={{ height: '48px' }}
                >
                  %
                </button>
                <button
                  type="button"
                  className={`px-3 py-3 rounded-r border border-black text-lg font-bold ${discountType === 'custom' ? 'bg-black text-white' : 'bg-white text-black'}`}
                  onClick={() => setDiscountType('custom')}
                  style={{ height: '48px' }}
                >
                  ₹
                </button>
              </div>
              {discountType === 'percentage' ? (
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="border rounded px-4 text-lg text-black w-24 ml-2"
                  style={{ height: '48px' }}
                  placeholder="%"
                  value={discountValue}
                  onChange={e => setDiscountValue(Number(e.target.value.replace(/[^0-9]/g, '')))}
                />
              ) : (
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="border rounded px-4 text-lg text-black w-24 ml-2"
                  style={{ height: '48px' }}
                  placeholder="₹"
                  value={discountValue}
                  onChange={e => setDiscountValue(Number(e.target.value.replace(/[^0-9]/g, '')))}
                />
              )}
            </div>
            {discount > 0 && (
              <div className="text-lg font-bold text-black">Discount: <span className="text-black">-₹{discount}</span></div>
            )}
            <div className="text-xl font-bold border-t pt-2 text-black">Grand Total: ₹{finalTotal}</div>
            <button
              className="bg-gradient-to-r from-blue-500 to-blue-700 text-white px-8 py-3 rounded-lg shadow hover:from-blue-600 hover:to-blue-800 font-semibold text-lg transition"
              onClick={handlePrint}
              disabled={items.length === 0 || !selectedSalesman || paymentError}
            >
              Save & Print
            </button>
          </div>
        </div>
      </div>
      {/* Print-friendly bill layout (A4) */}
      {showPrint && (
        <div
          ref={printRef}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "210mm",
            background: "white",
            zIndex: 9999,
            padding: "0",
            fontFamily: "Arial, sans-serif",
            boxSizing: "border-box",
          }}
        >
          <style>{`
            @media print {
              @page { size: A4; margin: 0; }
              body { background: white !important; margin: 0 !important; padding: 0 !important; }
              * { -webkit-print-color-adjust: exact !important; color-adjust: exact !important; }
            }
            .bill-page {
              width: 100%;
              box-sizing: border-box;
              padding: 32px 32px 24px 32px;
              border: 2px solid #1e293b;
              border-radius: 16px;
              background: #f8fafc;
              box-shadow: 0 0 12px 2px #cbd5e1;
              margin-bottom: 24px;
              display: flex;
              flex-direction: column;
              justify-content: flex-start;
            }
            .bill-header { text-align: center; margin-bottom: 18px; }
            .bill-title { font-size: 32px; font-weight: 800; color: #0f172a; margin: 0; }
            .bill-subtitle { font-size: 18px; margin-top: 8px; color: #334155; }
            .bill-gst { font-size: 16px; color: #334155; margin-top: 2px; margin-bottom: 8px; font-weight: 600; }
            .bill-info { display: flex; justify-content: space-between; margin-bottom: 16px; color: #0f172a; font-size: 16px; }
            .bill-customer { margin-bottom: 16px; color: #0f172a; font-size: 16px; }
            .bill-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 4px #cbd5e1; }
            .bill-table th, .bill-table td { padding: 10px 8px; border: 1.5px solid #64748b; color: #0f172a; font-size: 16px; background: #fff; }
            .bill-table th { background: #e0e7ff; font-weight: 700; }
            .bill-table td { font-weight: 500; }
            .bill-total { text-align: right; font-size: 22px; font-weight: 800; color: #0f172a; margin-bottom: 32px; border-top: 2px solid #0f172a; padding-top: 8px; }
            .bill-footer { text-align: center; font-size: 18px; color: #0f172a; margin-top: 48px; }
          `}</style>
          {/* Only render the customer bill */}
          <div className="bill-page">
            <div className="bill-header">
              <h2 className="bill-title">{companyName}</h2>
              <div className="bill-subtitle">Tax Invoice</div>
              <div className="bill-gst">GST No: <b>{companyGstNo}</b></div>
            </div>
            <div className="bill-info">
              <div>Bill No: <b>{billNo}</b></div>
              <div>Date: <b>{today}</b></div>
            </div>
            <div className="bill-customer">Customer: <b>{customer || 'Walk-in Customer'}</b></div>
            <table className="bill-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Barcode</th>
                  <th>Price (₹)</th>
                  <th>Qty</th>
                  <th>CGST (₹)</th>
                  <th>SGST (₹)</th>
                  <th>Total (₹)</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const taxes = calculateTaxes(item.type, item.total);
                  const basePrice = getBasePrice(item.type, item.price);
                  return (
                    <tr key={idx}>
                      <td>{item.name}</td>
                      <td style={{ fontFamily: 'monospace' }}>{item.modifiedBarcode || item.barcode}</td>
                      <td>₹{basePrice}</td>
                      <td>{item.quantity}</td>
                      <td>₹{taxes.cgst}</td>
                      <td>₹{taxes.sgst}</td>
                      <td style={{ fontWeight: 700 }}>₹{item.total}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="bill-total">Grand Total: ₹{finalTotal}</div>
            <div className="bill-footer">Thank you for your purchase!</div>
          </div>
        </div>
      )}
      {/* Salesman selection modal */}
      {showSalesmanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-sm w-full flex flex-col items-center">
            <div className="text-lg font-bold mb-4 text-red-600">Please select a salesman before saving and printing the bill.</div>
            <button
              className="mt-2 bg-blue-600 hover:bg-blue-800 text-white px-6 py-2 rounded font-semibold"
              onClick={() => setShowSalesmanModal(false)}
            >
              OK
            </button>
          </div>
        </div>
      )}
      {/* Error Modal */}
      {errorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-sm w-full flex flex-col items-center">
            <div className="text-lg font-bold mb-4 text-red-600">{errorModal}</div>
            <button
              className="mt-2 bg-blue-600 hover:bg-blue-800 text-white px-6 py-2 rounded font-semibold"
              onClick={() => setErrorModal(null)}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 