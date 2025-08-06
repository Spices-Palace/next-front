"use client";
import React, { useState, useRef, useEffect } from "react";
import { useGetProductsQuery, useGetSalesmenQuery, useCreateBillMutation } from '../../../store/api';
import type { Product } from "../../../store/productsSlice";
import Cookies from 'js-cookie';
import { skipToken } from '@reduxjs/toolkit/query';



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
// Create a Map for faster product lookup
const createProductMap = (products: Product[]) => {
  const productMap = new Map<string, Product>();
  const originalBarcodeMap = new Map<string, Product>();
  
  products.forEach(product => {
    productMap.set(product.barcode, product);
    
    // Also store products that could be original barcodes for modified barcodes
    if (product.barcode.endsWith('A')) {
      originalBarcodeMap.set(product.barcode, product);
    }
  });
  
  return { productMap, originalBarcodeMap };
};

function parseBarcodeAndGetProduct(barcode: string, products: Product[]) {
  // Create optimized lookup maps
  const { productMap, originalBarcodeMap } = createProductMap(products);
  
  // First, check for exact match (normal barcode) - O(1) lookup
  const exactProduct = productMap.get(barcode);
  if (exactProduct) {
    console.log(`Exact match found for barcode: ${barcode}`);
    return {
      ...exactProduct,
      originalPrice: Math.round(exactProduct.price),
      priceIncrease: 0,
      modifiedBarcode: null
    };
  }
  
  // If no exact match, check if it's a modified barcode (has 3 digits after A)
  const match = barcode.match(/^(.+A)(\d{3})$/);
  
  if (match) {
    // Modified barcode with price increase
    const originalBarcode = match[1]; // e.g., "1000A"
    const priceCode = match[2]; // e.g., "001", "010", "100"
    
    // Find the original product using optimized lookup
    const product = originalBarcodeMap.get(originalBarcode);
    
    if (product) {
      // Calculate price increase based on the 3-digit code
      const priceMultiplier = parseInt(priceCode, 10); // 001 = 1, 010 = 10, 100 = 100
      const priceIncrease = priceMultiplier * 100; // 1*100=100, 10*100=1000, 100*100=10000
      
      // Ensure we're working with integers to avoid floating point issues
      const originalPrice = Math.round(product.price);
      const finalPrice = originalPrice + priceIncrease;
      
      console.log(`Modified barcode: ${barcode}, Original: ${originalBarcode}, PriceCode: ${priceCode}, Multiplier: ${priceMultiplier}, Increase: ${priceIncrease}, OriginalPrice: ${originalPrice}, FinalPrice: ${finalPrice}`);
      
      return {
        ...product,
        price: finalPrice,
        originalPrice: originalPrice,
        priceIncrease: priceIncrease,
        modifiedBarcode: barcode
      };
    }
  }
  
  console.log(`No product found for barcode: ${barcode}`);
  return null;
}

// Helper function to get base price from tax-inclusive price
function getBasePrice(productType: string, taxInclusivePrice: number) {
  const rates = TAX_RATES[productType as keyof typeof TAX_RATES] || TAX_RATES['Saree'];
  const totalTaxRate = rates.cgst + rates.sgst;
  return Math.round((taxInclusivePrice / (1 + totalTaxRate / 100)));
}

export default function CashierBillingPage() {
  const rawCompanyId = Cookies.get('companyId') || (typeof window !== 'undefined' ? localStorage.getItem('companyId') : '');
  const companyId = rawCompanyId || '';
  
  // Try to get cached data first for instant loading
  const [cachedProducts, setCachedProducts] = useState<any[]>([]);
  const [cachedSalesmen, setCachedSalesmen] = useState<any[]>([]);
  const [isUsingCache, setIsUsingCache] = useState(false);
  
  // Load cached data on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const cachedProductsData = localStorage.getItem('cached_products');
      const cachedSalesmenData = localStorage.getItem('cached_salesmen');
      
      if (cachedProductsData) {
        try {
          const products = JSON.parse(cachedProductsData);
          setCachedProducts(products);
          setIsUsingCache(true);
        } catch (error) {
          console.log('Failed to parse cached products');
        }
      }
      
      if (cachedSalesmenData) {
        try {
          const salesmen = JSON.parse(cachedSalesmenData);
          setCachedSalesmen(salesmen);
        } catch (error) {
          console.log('Failed to parse cached salesmen');
        }
      }
    }
  }, []);
  
  // Use cached data if available, otherwise fetch from API
  const { data: apiProducts = [] } = useGetProductsQuery(companyId ? { companyId } : skipToken);
  const { data: apiSalesmen = [] } = useGetSalesmenQuery(companyId ? { companyId } : skipToken);
  
  // Use cached data first, fallback to API data
  const products = isUsingCache && cachedProducts.length > 0 ? cachedProducts : apiProducts;
  const salesmen = isUsingCache && cachedSalesmen.length > 0 ? cachedSalesmen : apiSalesmen;
  
  const [createBill, { isLoading: isCreating }] = useCreateBillMutation();
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
  
  // Performance indicator
  const dataSource = isUsingCache ? 'cached' : 'api';

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
      setErrorModal('Product not found. Please check the barcode.');
      setIsSubmitting(false);
      return;
    }
    
    // Enhanced availability checking
    if (productWithPrice.quantity !== undefined && productWithPrice.quantity <= 0) {
      setErrorModal(`Item "${productWithPrice.name}" is out of stock (Quantity: 0)`);
      setIsSubmitting(false);
      return;
    }
    
    // Check if quantity is low (less than 5)
    if (productWithPrice.quantity !== undefined && productWithPrice.quantity <= 5) {
      console.log(`Low stock warning: ${productWithPrice.name} has ${productWithPrice.quantity} items left`);
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
  // Function to refresh cached data after billing
  const refreshCachedData = async () => {
    try {
      const token = localStorage.getItem('token');
      const companyId = localStorage.getItem('companyId');
      
      if (!token || !companyId) return;
      
      // Fetch fresh products data
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://nest-back-hfgh.onrender.com'}/v1/products?companyId=${companyId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const freshProducts = await response.json();
        localStorage.setItem('cached_products', JSON.stringify(freshProducts));
        setCachedProducts(freshProducts);
        console.log('Cached products refreshed after billing');
      }
    } catch (error) {
      console.log('Failed to refresh cached data:', error);
    }
  };

  // Function to update product quantities in cache after billing
  const updateCacheQuantities = (billedItems: BillingItem[]) => {
    try {
      const currentProducts = [...cachedProducts];
      
      billedItems.forEach(billedItem => {
        const productIndex = currentProducts.findIndex(p => p.id === billedItem.id);
        if (productIndex !== -1 && currentProducts[productIndex].quantity !== undefined) {
          // Update quantity in cache
          currentProducts[productIndex].quantity = Math.max(0, currentProducts[productIndex].quantity - billedItem.quantity);
          console.log(`Updated ${billedItem.name} quantity from ${currentProducts[productIndex].quantity + billedItem.quantity} to ${currentProducts[productIndex].quantity}`);
        }
      });
      
      // Update cache with new quantities
      localStorage.setItem('cached_products', JSON.stringify(currentProducts));
      setCachedProducts(currentProducts);
      console.log('Cache quantities updated after billing');
    } catch (error) {
      console.log('Failed to update cache quantities:', error);
    }
  };

  const saveBill = async (): Promise<any> => {
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
      
      const billData: any = {
        billNo: billNo,
        date: new Date().toISOString(),
        customerName: customer || 'Walk-in Customer',
        salesmanName: selectedSalesman,
        companyId: companyId,
        items: billItems,
        totalCGST: Number(taxes.totalCGST),
        totalSGST: Number(taxes.totalSGST),
        grandTotal: Number(grandTotal),
        discountType: discount > 0 ? (discountType === 'percentage' ? 'percentage' : 'custom') : 'percentage',
        discountValue: discount > 0 ? (Number(discountValue) || 0) : 0,
        discountAmount: discount > 0 ? (Number(discount) || 0) : 0,
        finalTotal: Number(finalTotal),
        payments: payments.map(p => ({
          method: p.method,
          amount: Number(p.amount)
        })),
        status: 'completed'
      };

      // Only add salesmanId if it exists
      if (salesmanObj?.id) {
        billData.salesmanId = salesmanObj.id;
      }

      // Clean up any undefined or null values
      Object.keys(billData).forEach(key => {
        if (billData[key] === undefined || billData[key] === null) {
          delete billData[key];
        }
      });

      // Validate required fields
      const requiredFields = ['billNo', 'date', 'customerName', 'salesmanName', 'companyId', 'items', 'totalCGST', 'totalSGST', 'grandTotal', 'finalTotal', 'payments', 'status'];
      const missingFields = requiredFields.filter(field => !billData[field]);
      if (missingFields.length > 0) {
        console.error('Missing required fields:', missingFields);
        setErrorModal(`Missing required fields: ${missingFields.join(', ')}`);
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }

      // Optimized: Remove excessive logging for faster performance
      console.log('Saving bill with', items.length, 'items, total:', finalTotal);

      const savedBill = await createBill(billData).unwrap();
      console.log('Bill saved successfully');
      
      // Update cache quantities immediately for faster availability checking
      updateCacheQuantities(items);
      
      // Also refresh from server in background for complete accuracy
      refreshCachedData();
      
      return savedBill;
    } catch (error: any) {
      console.error('Error saving bill:', error);
      console.error('Error details:', {
        status: error?.status,
        statusText: error?.statusText,
        data: error?.data,
        message: error?.message,
        originalError: error
      });
      
      let errorMsg = 'Failed to save bill. Please try again.';
      if (error?.data?.message) {
        errorMsg = error.data.message;
      } else if (error?.data?.error) {
        errorMsg = error.data.error;
      } else if (error?.message) {
        errorMsg = error.message;
      } else if (error?.status) {
        errorMsg = `Server error: ${error.status} ${error.statusText || ''}`;
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
      // Show loading state immediately
      setShowPrint(true);
      
      // Save bill first
      await saveBill();
      
      // Optimized print with shorter timeout
      setTimeout(() => {
        if (printRef.current) {
          try {
            window.print();
          } catch (error) {
            console.error('Print failed:', error);
            setErrorModal('Print failed. Please use Ctrl+P to print manually.');
          }
        } else {
          setErrorModal('Print element not found. Please try again.');
        }
        setShowPrint(false);
      }, 200); // Reduced timeout for faster response
      
    } catch (error: unknown) {
      console.error('Error in save and print:', error);
      setShowPrint(false);
      setErrorModal('Failed to save bill. Please try again.');
    }
  };

  return (
    <div className="p-4 w-full max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-extrabold text-blue-700">Billing</h1>
        {isUsingCache && (
          <div className="flex items-center gap-2 text-sm">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-green-600 font-medium">Fast Mode (Cached Data)</span>
          </div>
        )}
      </div>
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
              className="bg-gradient-to-r from-blue-500 to-blue-700 text-white px-8 py-3 rounded-lg shadow hover:from-blue-600 hover:to-blue-800 font-semibold text-lg transition disabled:opacity-50"
              onClick={handlePrint}
              disabled={items.length === 0 || !selectedSalesman || paymentError || isCreating}
            >
              {isCreating ? 'Saving...' : 'Save & Print'}
            </button>
          </div>
        </div>
      </div>
      {/* Print-friendly bill layout (Full A4) */}
      {showPrint && (
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
                  <div className="company-name">{companyName}</div>
                  <div className="company-details">
                    <div>123 Main Street, City, State - 123456</div>
                    <div>Phone: +91 98765 43210 | Email: info@{companyName.toLowerCase().replace(/\s+/g, '')}.com</div>
                    <div>GST No: {companyGstNo} | PAN: ABCDE1234F</div>
                    <div>Website: www.{companyName.toLowerCase().replace(/\s+/g, '')}.com</div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Billed To Section */}
            <div className="billed-to-section">
              <div className="billed-to-left">
                <div className="billed-to-title">Billed To:</div>
                <div className="billed-to-content">
                  <div>{customer || 'Walk-in Customer'}</div>
                </div>
              </div>
              <div className="invoice-details">
                <div>Invoice No. {billNo}</div>
                <div>{today}</div>
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
                  {items.map((item, idx) => {
                    const basePrice = getBasePrice(item.type, item.price);
                    return (
                      <tr key={idx}>
                        <td>{item.name}</td>
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
                <span>₹{grandTotal}</span>
              </div>
              {discount > 0 && (
                <div className="summary-row">
                  <span>Discount</span>
                  <span>-₹{discount}</span>
                </div>
              )}
              <div className="summary-row">
                <span>Tax (0%)</span>
                <span>₹0</span>
              </div>
              <div className="summary-row total">
                <span>Total</span>
                <span>₹{finalTotal}</span>
              </div>
            </div>
            
            {/* Footer Section */}
            <div className="footer-section">
              <div className="thank-you">Thank you!</div>
              <div className="payment-info">
                <div className="payment-info-title">Payment Information</div>
                <div>Briard Bank</div>
                <div>Account Name: {companyName}</div>
                <div>Account No.: 123-456-7890</div>
                <div>Pay by: {new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toLocaleDateString()}</div>
              </div>
              <div className="signature-section">
                <div className="signature-name">{companyName}</div>
                <div>123 Anywhere St., Any City, ST 12345</div>
              </div>
            </div>
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