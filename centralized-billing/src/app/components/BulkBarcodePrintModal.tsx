import React, { useRef, useState } from 'react';
import Barcode from 'react-barcode';

interface Product {
  id: number;
  name: string;
  barcode: string;
  price: number;
  quantity: number;
}

interface BulkBarcodePrintModalProps {
  products: Product[];
  companyName: string;
  open: boolean;
  onClose: () => void;
}

const BulkBarcodePrintModal: React.FC<BulkBarcodePrintModalProps> = ({
  products,
  companyName,
  open,
  onClose,
}) => {
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [tab, setTab] = useState<'normal' | 'increased'>('normal');
  const [increasedPrices, setIncreasedPrices] = useState<Record<number, number>>({});
  const printRef = useRef<HTMLDivElement>(null);

  // Initialize quantities and increased prices
  React.useEffect(() => {
    const initialQuantities: Record<number, number> = {};
    const initialIncreasedPrices: Record<number, number> = {};
    
    products.forEach(product => {
      initialQuantities[product.id] = product.quantity || 1;
      initialIncreasedPrices[product.id] = product.price;
    });
    
    setQuantities(initialQuantities);
    setIncreasedPrices(initialIncreasedPrices);
  }, [products]);

  const handleQuantityChange = (productId: number, quantity: number) => {
    setQuantities(prev => ({
      ...prev,
      [productId]: Math.max(1, quantity)
    }));
  };

  const handleIncreasedPriceChange = (productId: number, price: number) => {
    setIncreasedPrices(prev => ({
      ...prev,
      [productId]: Math.max(0, price)
    }));
  };

  const handlePrintBarcodes = () => {
    if (!printRef.current) return;
    const printContents = printRef.current.innerHTML;
    const printWindow = window.open('', '', 'height=400,width=800');
    if (printWindow) {
      printWindow.document.write('<html><head><title>Print Barcodes</title>');
      printWindow.document.write(`
        <style>
          @media print {
            @page { size: 105mm 25mm portrait; margin: 0; }
            body { margin: 0; padding: 0; background: white; color: #000; font-weight: bold; }
            .barcode-print-area {
              display: block;
              width: 105mm;
              height: 25mm;
              padding: 0;
              box-sizing: border-box;
              margin: 0 auto;
              background: #fff;
            }
            .barcode-row {
              display: flex;
              flex-direction: row;
              justify-content: space-between;
              align-items: center;
              width: 105mm;
              height: 25mm;
              gap: 1mm;
              margin-bottom: 0;
            }
            .barcode-label {
              width: 50mm;
              height: 25mm;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              color: #000;
              font-weight: bold;
              box-sizing: border-box;
              background: #fff;
              padding: 0;
            }
            .barcode-label svg {
              width: 48mm !important;
              height: 18mm !important;
              display: block;
              margin: 0 auto;
            }
          }
          body > *:not(.barcode-print-area) { display: none !important; }
          .barcode-print-area { display: block; color: #000; font-weight: bold; }
        </style>
      `);
      printWindow.document.write('</head><body>');
      printWindow.document.write(`<div class="barcode-print-area">${printContents}</div>`);
      printWindow.document.write('</body></html>');
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-4xl relative animate-fadeIn mx-auto max-h-[90vh] overflow-y-auto">
        <button
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-3xl"
          onClick={onClose}
          title="Close"
        >
          ×
        </button>
        
        <h2 className="text-2xl font-bold mb-6 text-blue-700">Bulk Print Barcodes</h2>
        
        {/* Tab Switch */}
        <div className="flex gap-2 mb-6 w-full justify-center">
          <button
            className={`px-4 py-2 rounded-t font-semibold text-base transition border-b-2 ${tab === 'normal' ? 'border-blue-600 text-blue-700 bg-blue-50' : 'border-transparent text-gray-700 bg-gray-100'}`}
            onClick={() => setTab('normal')}
          >
            Normal Barcodes
          </button>
          <button
            className={`px-4 py-2 rounded-t font-semibold text-base transition border-b-2 ${tab === 'increased' ? 'border-blue-600 text-blue-700 bg-blue-50' : 'border-transparent text-gray-700 bg-gray-100'}`}
            onClick={() => setTab('increased')}
          >
            Increased Price Barcodes
          </button>
        </div>

        {/* Product List */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Products to Print:</h3>
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {products.map(product => {
              const displayBarcode = tab === 'increased' 
                ? `${product.barcode}${String(Math.floor(increasedPrices[product.id] / 100)).padStart(3, '0')}`
                : product.barcode;
              const displayPrice = tab === 'increased' 
                ? product.price + increasedPrices[product.id]
                : product.price;

              return (
                <div key={product.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="font-semibold">{product.name}</div>
                    <div className="text-sm text-gray-600">Barcode: {displayBarcode}</div>
                    <div className="text-sm text-gray-600">Price: ₹{displayPrice}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">Quantity:</label>
                    <input
                      type="number"
                      min={1}
                      value={quantities[product.id] || 1}
                      onChange={(e) => handleQuantityChange(product.id, Number(e.target.value))}
                      className="w-16 border rounded px-2 py-1 text-center"
                    />
                  </div>
                  {tab === 'increased' && (
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium">Increase:</label>
                      <input
                        type="number"
                        min={0}
                        value={increasedPrices[product.id] || 0}
                        onChange={(e) => handleIncreasedPriceChange(product.id, Number(e.target.value))}
                        className="w-20 border rounded px-2 py-1 text-center"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Preview */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Preview:</h3>
          <div className="bg-white p-4 rounded shadow border">
            {products.slice(0, 2).map(product => {
              const displayBarcode = tab === 'increased' 
                ? `${product.barcode}${String(Math.floor(increasedPrices[product.id] / 100)).padStart(3, '0')}`
                : product.barcode;
              const displayPrice = tab === 'increased' 
                ? product.price + increasedPrices[product.id]
                : product.price;

              return (
                <div key={product.id} className="mb-4">
                  <div className="text-sm font-semibold mb-2">{product.name}</div>
                  <div className="barcode-print-area bg-white p-2 rounded border inline-block" style={{ width: '105mm', height: '25mm', padding: 0 }}>
                    <div className="barcode-row" style={{ display: 'flex', flexDirection: 'row', width: '105mm', height: '25mm', gap: '1mm' }}>
                      <div className="barcode-label text-black" style={{ width: '50mm', height: '25mm', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <div className="text-center text-xs font-bold mb-1 text-black">{companyName || 'COMPANY'}</div>
                        <Barcode value={displayBarcode} width={2} height={30} fontSize={14} displayValue={false} format="CODE128" />
                        <div className="text-center text-xs font-mono mt-1 text-black" style={{ fontSize: '12px' }}>{displayBarcode}</div>
                        <div className="text-center text-xs mt-0.5 text-black">₹{displayPrice}</div>
                      </div>
                      <div className="barcode-label text-black" style={{ width: '50mm', height: '25mm', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <div className="text-center text-xs font-bold mb-1 text-black">{companyName || 'COMPANY'}</div>
                        <Barcode value={displayBarcode} width={2} height={30} fontSize={14} displayValue={false} format="CODE128" />
                        <div className="text-center text-xs font-mono mt-1 text-black" style={{ fontSize: '12px' }}>{displayBarcode}</div>
                        <div className="text-center text-xs mt-0.5 text-black">₹{displayPrice}</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Hidden print area */}
        <div ref={printRef} style={{ display: 'none' }}>
          {products.map(product => {
            const displayBarcode = tab === 'increased' 
              ? `${product.barcode}${String(Math.floor(increasedPrices[product.id] / 100)).padStart(3, '0')}`
              : product.barcode;
            const displayPrice = tab === 'increased' 
              ? product.price + increasedPrices[product.id]
              : product.price;
            const quantity = quantities[product.id] || 1;

            return Array.from({ length: Math.ceil(quantity / 2) }).map((_, rowIdx) => (
              <div className="barcode-row" key={`${product.id}-${rowIdx}`} style={{ display: 'flex', flexDirection: 'row', width: '105mm', height: '25mm', gap: '1mm' }}>
                <div className="barcode-label text-black" style={{ width: '50mm', height: '25mm', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div className="text-center text-xs font-bold mb-1 text-black">{companyName || 'COMPANY'}</div>
                  <Barcode value={displayBarcode} width={2} height={30} fontSize={14} displayValue={false} format="CODE128" />
                  <div className="text-center text-xs font-mono mt-1 text-black" style={{ fontSize: '12px' }}>{displayBarcode}</div>
                  <div className="text-center text-xs mt-0.5 text-black">₹{displayPrice}</div>
                </div>
                {rowIdx * 2 + 1 < quantity && (
                  <div className="barcode-label text-black" style={{ width: '50mm', height: '25mm', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="text-center text-xs font-bold mb-1 text-black">{companyName || 'COMPANY'}</div>
                    <Barcode value={displayBarcode} width={2} height={30} fontSize={14} displayValue={false} format="CODE128" />
                    <div className="text-center text-xs font-mono mt-1 text-black" style={{ fontSize: '12px' }}>{displayBarcode}</div>
                    <div className="text-center text-xs mt-0.5 text-black">₹{displayPrice}</div>
                  </div>
                )}
              </div>
            ));
          })}
        </div>

        <button
          type="button"
          onClick={handlePrintBarcodes}
          className="w-full bg-gradient-to-r from-blue-500 to-blue-700 text-white px-6 py-3 rounded shadow hover:from-blue-600 hover:to-blue-800 font-semibold text-lg transition"
        >
          Print All Barcodes
        </button>
      </div>
    </div>
  );
};

export default BulkBarcodePrintModal; 