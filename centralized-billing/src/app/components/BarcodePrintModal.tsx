import React, { useRef, useState } from 'react';
import Barcode from 'react-barcode';

interface BarcodePrintModalProps {
  barcodeToPrint: string;
  price: string;
  companyName: string;
  quantity: number;
  open: boolean;
  onClose: () => void;
}

const BarcodePrintModal: React.FC<BarcodePrintModalProps> = ({
  barcodeToPrint,
  price,
  companyName,
  quantity: initialQuantity,
  open,
  onClose,
}) => {
  const [quantityToPrint, setQuantityToPrint] = useState(initialQuantity);
  const [tab, setTab] = useState<'normal' | 'increased'>('normal');
  const [increasedPrice, setIncreasedPrice] = useState(price);
  const printRef = useRef<HTMLDivElement>(null);

  // Compute barcode and price to use
  const displayBarcode = tab === 'increased' 
    ? `${barcodeToPrint}${String(Math.floor(Number(increasedPrice) / 100)).padStart(3, '0')}`
    : barcodeToPrint;
  const displayPrice = tab === 'increased' ? String(Number(price) + Number(increasedPrice)) : price;

  const handlePrintBarcode = () => {
    if (!printRef.current) return;
    const printContents = printRef.current.innerHTML;
    const printWindow = window.open('', '', 'height=400,width=800');
    if (printWindow) {
      printWindow.document.write('<html><head><title>Print Barcode</title>');
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
      <div className="bg-white rounded-2xl shadow-2xl p-12 w-full max-w-lg relative animate-fadeIn mx-auto flex flex-col items-center">
        <button
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-3xl"
          onClick={onClose}
          title="Close"
        >
          ×
        </button>
        {/* Tab Switch */}
        <div className="flex gap-2 mb-6 mt-2 w-full justify-center">
          <button
            className={`px-4 py-2 rounded-t font-semibold text-base transition border-b-2 ${tab === 'normal' ? 'border-blue-600 text-blue-700 bg-blue-50' : 'border-transparent text-gray-700 bg-gray-100'}`}
            onClick={() => setTab('normal')}
          >
            Normal Barcode
          </button>
          <button
            className={`px-4 py-2 rounded-t font-semibold text-base transition border-b-2 ${tab === 'increased' ? 'border-blue-600 text-blue-700 bg-blue-50' : 'border-transparent text-gray-700 bg-gray-100'}`}
            onClick={() => setTab('increased')}
          >
            Increased Price Barcode
          </button>
        </div>
        {/* Increased price input */}
        {tab === 'increased' && (
          <div className="mb-4 w-full flex justify-center">
            <input
              type="number"
              min={1}
              className="border rounded px-4 py-2 w-40 text-lg text-gray-900"
              placeholder="Increased Price"
              value={increasedPrice}
              onChange={e => setIncreasedPrice(e.target.value)}
            />
          </div>
        )}
        {/* Preview: Only show 2 barcodes side by side */}
        <div className="barcode-print-area bg-white p-6 rounded shadow inline-block mb-6 text-black" style={{ width: '105mm', height: '25mm', padding: 0 }}>
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
        {/* Number of labels to print */}
        <div className="flex items-center gap-2 mt-4 mb-2">
          <label className="text-base font-medium text-gray-700">Number of labels to print:</label>
          <input
            type="number"
            min={1}
            max={999}
            value={quantityToPrint}
            onChange={e => setQuantityToPrint(Number(e.target.value))}
            className="border rounded px-3 py-2 w-20 text-lg text-gray-900"
          />
        </div>
        {/* Hidden print area: all barcodes for printing */}
        <div ref={printRef} style={{ display: 'none' }}>
          {Array.from({ length: Math.ceil(quantityToPrint / 2) }).map((_, rowIdx) => (
            <div className="barcode-row" key={rowIdx} style={{ display: 'flex', flexDirection: 'row', width: '105mm', height: '25mm', gap: '1mm' }}>
              <div className="barcode-label text-black" style={{ width: '50mm', height: '25mm', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div className="text-center text-xs font-bold mb-1 text-black">{companyName || 'COMPANY'}</div>
                <Barcode value={displayBarcode} width={2} height={30} fontSize={14} displayValue={false} format="CODE128" />
                <div className="text-center text-xs font-mono mt-1 text-black" style={{ fontSize: '12px' }}>{displayBarcode}</div>
                <div className="text-center text-xs mt-0.5 text-black">₹{displayPrice}</div>
              </div>
              {rowIdx * 2 + 1 < quantityToPrint && (
                <div className="barcode-label text-black" style={{ width: '50mm', height: '25mm', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div className="text-center text-xs font-bold mb-1 text-black">{companyName || 'COMPANY'}</div>
                  <Barcode value={displayBarcode} width={2} height={30} fontSize={14} displayValue={false} format="CODE128" />
                  <div className="text-center text-xs font-mono mt-1 text-black" style={{ fontSize: '12px' }}>{displayBarcode}</div>
                  <div className="text-center text-xs mt-0.5 text-black">₹{displayPrice}</div>
                </div>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={handlePrintBarcode}
          className="mt-6 bg-gradient-to-r from-blue-500 to-blue-700 text-white px-6 py-3 rounded shadow hover:from-blue-600 hover:to-blue-800 font-semibold text-lg transition"
        >
          Print Barcode
        </button>
      </div>
    </div>
  );
};

export default BarcodePrintModal; 