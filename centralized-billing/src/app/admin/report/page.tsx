"use client";
import React, { useState, useRef } from "react";
import Cookies from 'js-cookie';
import { useGetDailySalesReportQuery, useGetSalesmanCommissionReportQuery } from '../../../store/api';

export default function AdminReportPage() {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const rawCompanyId = Cookies.get('companyId') || (typeof window !== 'undefined' ? localStorage.getItem('companyId') : '');
  const companyId = rawCompanyId || '';

  // State to control when to fetch reports
  const [shouldFetchReports, setShouldFetchReports] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch daily sales report
  const { data: dailyReport, error: dailyError, isLoading: dailyLoading, refetch: refetchDailyReport } = useGetDailySalesReportQuery(
    { companyId, date: selectedDate }, 
    { skip: !companyId || !shouldFetchReports }
  );
  // Fetch salesman commission report
  const { data: commissionReport, error: commissionError, isLoading: commissionLoading, refetch: refetchCommissionReport } = useGetSalesmanCommissionReportQuery(
    { companyId, date: selectedDate }, 
    { skip: !companyId || !shouldFetchReports }
  );

  const printRef = useRef<HTMLDivElement>(null);
  const [expenses, setExpenses] = useState([{ label: '', amount: 0 }]);
  
  // Modal state for commission details
  const [showCommissionModal, setShowCommissionModal] = useState(false);
  const [selectedSalesman, setSelectedSalesman] = useState<any>(null);

  // Calculate total sales and payment breakdown
  const totalSales = dailyReport?.totalSales || 0;
  const paymentBreakdown = dailyReport?.paymentBreakdown || {};
  const allPayments = dailyReport?.allPayments || [];
  
  // Debug logging to verify data
  console.log('Daily Report Data:', {
    totalSales,
    paymentBreakdown,
    allPayments,
    rawDailyReport: dailyReport
  });
  
  // Payment breakdown amounts
  const cashBalance = paymentBreakdown.cash || 0;
  const upiBalance = paymentBreakdown.gpay || 0;
  const cardBalance = paymentBreakdown.card || 0;
  const otherBalance = paymentBreakdown.other || 0;

  // Expenses
  const totalExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const netCash = cashBalance - totalExpenses;

  // Salesman commissions
  const salesmanCommissions = Array.isArray(commissionReport) ? commissionReport : [];

  // Loading and error states
  const isLoading = dailyLoading || commissionLoading;
  const error = dailyError || commissionError;

  return (
    <div className="p-4 w-full max-w-5xl mx-auto">
      <h1 className="text-3xl font-extrabold text-blue-700 mb-8">Daily Report</h1>
      <div className="flex gap-4 mb-6 items-center">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700">Select Date</label>
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="border rounded px-4 py-2 text-lg text-black"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700">&nbsp;</label>
          <button
            onClick={() => {
              setShouldFetchReports(true);
              setIsRefreshing(true);
              // Force fresh fetch from backend
              setTimeout(() => {
                refetchDailyReport();
                refetchCommissionReport();
                setIsRefreshing(false);
              }, 100);
            }}
            disabled={!companyId || isRefreshing}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded font-semibold text-lg"
          >
            {isRefreshing ? 'Refreshing...' : 'Generate Report'}
          </button>
        </div>
      </div>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-report, .print-report * { visibility: visible; }
          .print-report { position: absolute; left: 0; top: 0; width: 100vw; background: white; }
          .print:hidden { display: none !important; }
        }
      `}</style>
      <div ref={printRef} className="print-report">
        {!shouldFetchReports ? (
          <div className="text-center text-gray-500 py-8">
            <div className="text-xl font-semibold mb-2">Select a date and click "Generate Report" to view the daily report</div>
            <div className="text-sm text-gray-400">Choose a date from the picker above and generate the report to see sales data and commission details.</div>
          </div>
        ) : isLoading ? (
          <div className="text-center text-gray-500 py-8">
            <div className="text-xl font-semibold mb-2">
              {isRefreshing ? 'Refreshing Report...' : 'Generating Report...'}
            </div>
            <div className="text-sm text-gray-400">Please wait while we fetch fresh data for {selectedDate}</div>
          </div>
        ) : error ? (
          <div className="text-center text-red-500 py-8">
            <div className="text-xl font-semibold mb-2">Error Loading Report</div>
            <div className="text-sm">{String(error)}</div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-8 mb-8">
              <div className="bg-white rounded-xl shadow p-6 border border-blue-100">
                <div className="text-lg font-bold text-gray-700 mb-2">Total Sales (After Discounts)</div>
                <div className="text-2xl font-extrabold text-green-700">₹{totalSales}</div>
                <div className="text-xs text-gray-500 mt-1">Based on final totals after discounts</div>
              </div>
              <div className="bg-white rounded-xl shadow p-6 border border-blue-100">
                <div className="text-xl font-bold text-gray-700 mb-4">Payment Breakdown</div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-gray-700">Cash</span>
                    <span className="text-xl font-bold text-green-600">₹{cashBalance}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-gray-700">UPI/GPay</span>
                    <span className="text-xl font-bold text-blue-600">₹{upiBalance}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-gray-700">Card</span>
                    <span className="text-xl font-bold text-purple-600">₹{cardBalance}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-gray-700">Other</span>
                    <span className="text-xl font-bold text-orange-600">₹{otherBalance}</span>
                  </div>
                  
                  <div className="border-t pt-3 mt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-gray-800">Total</span>
                      <span className="text-2xl font-extrabold text-blue-700">₹{totalSales}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Detailed Payment Transactions */}
            {allPayments.length > 0 && (
              <div className="bg-white rounded-xl shadow p-6 border border-blue-100 mb-8">
                <div className="text-xl font-bold text-blue-700 mb-4">Payment Transactions</div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-blue-50">
                      <tr>
                        <th className="px-4 py-2 text-left font-semibold text-gray-700">Bill No</th>
                        <th className="px-4 py-2 text-left font-semibold text-gray-700">Customer</th>
                        <th className="px-4 py-2 text-left font-semibold text-gray-700">Payment Method</th>
                        <th className="px-4 py-2 text-right font-semibold text-gray-700">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allPayments.map((payment: any, idx: number) => (
                        <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-4 py-2 text-gray-800 font-medium">{payment.billNo}</td>
                          <td className="px-4 py-2 text-gray-700">{payment.customerName}</td>
                          <td className="px-4 py-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              payment.method === 'Cash' ? 'bg-green-100 text-green-800' :
                              payment.method === 'UPI' ? 'bg-blue-100 text-blue-800' :
                              payment.method === 'Card' ? 'bg-purple-100 text-purple-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {payment.method}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-right font-semibold text-gray-800">₹{payment.amount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            <div className="bg-white rounded-xl shadow p-6 border border-blue-100 mb-8">
              <div className="text-xl font-bold text-blue-700 mb-4">Salesman Commissions</div>
              <table className="min-w-full text-base text-left mb-4">
                <thead className="bg-blue-100">
                  <tr>
                    <th className="px-5 py-3 text-gray-800 font-bold">Salesman</th>
                    <th className="px-5 py-3 text-gray-800 font-bold">Commission Rate (%)</th>
                    <th className="px-5 py-3 text-gray-800 font-bold">Total Commission 1</th>
                    <th className="px-5 py-3 text-gray-800 font-bold">Total Commission 2</th>
                    <th className="px-5 py-3 text-gray-800 font-bold">Total Commission</th>
                    <th className="px-5 py-3 text-gray-800 font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {salesmanCommissions.map((s: any, idx: number) => (
                    <tr key={idx} className="border-t">
                      <td className="px-5 py-3">{s.salesman?.name}</td>
                      <td className="px-5 py-3">{s.salesman?.commissionRate}%</td>
                      <td className="px-5 py-3 text-green-700 font-bold">₹{s.totalCommission1}</td>
                      <td className="px-5 py-3 text-blue-700 font-bold">₹{s.totalCommission2}</td>
                      <td className="px-5 py-3 text-orange-700 font-bold">₹{s.totalCommission}</td>
                      <td className="px-5 py-3">
                        <button
                          onClick={() => {
                            setSelectedSalesman(s);
                            setShowCommissionModal(true);
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm font-medium"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bg-white rounded-xl shadow p-6 border border-blue-100 mb-8">
              <div className="text-xl font-bold text-blue-700 mb-4">Expenses</div>
              {expenses.map((exp, idx) => (
                <div key={idx} className="flex gap-4 mb-2 items-center">
                  <input
                    className="border rounded px-4 py-2 text-lg text-black w-1/2"
                    placeholder="Expense label (e.g. Driver, Rent)"
                    value={exp.label}
                    onChange={e => {
                      const newExpenses = [...expenses];
                      newExpenses[idx].label = e.target.value;
                      setExpenses(newExpenses);
                    }}
                  />
                  <input
                    className="border rounded px-4 py-2 text-lg text-black w-1/3"
                    placeholder="Amount"
                    type="number"
                    value={exp.amount}
                    onChange={e => {
                      const newExpenses = [...expenses];
                      newExpenses[idx].amount = Number(e.target.value);
                      setExpenses(newExpenses);
                    }}
                  />
                  {expenses.length > 1 && (
                    <button
                      className="text-red-600 font-bold text-lg px-2"
                      onClick={() => setExpenses(expenses.filter((_, i) => i !== idx))}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              <button
                className="mt-2 bg-blue-600 hover:bg-blue-800 text-white px-4 py-2 rounded font-semibold"
                onClick={() => setExpenses([...expenses, { label: "", amount: 0 }])}
              >
                + Add Expense
              </button>
              <div className="text-lg font-bold text-black mt-4">Total Expenses: ₹{totalExpenses}</div>
              <div className="text-xl font-bold text-green-700 mt-2">Net Cash (Cash - Expenses): ₹{netCash}</div>
            </div>
          </>
        )}
      </div>
      
      {/* Commission Details Modal */}
      {showCommissionModal && selectedSalesman && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">
                  Commission Details - {selectedSalesman.salesman?.name}
                </h2>
                <button
                  onClick={() => setShowCommissionModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {/* Salesman Info */}
              <div className="bg-blue-50 rounded-lg p-4 mb-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm font-medium text-gray-600">Salesman Name:</span>
                    <p className="text-lg font-semibold text-gray-800">{selectedSalesman.salesman?.name}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600">Commission Rate:</span>
                    <p className="text-lg font-semibold text-blue-600">{selectedSalesman.salesman?.commissionRate}%</p>
                  </div>
                </div>
              </div>
              
              {/* Commission Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-sm font-medium text-gray-600">Commission 1</div>
                  <div className="text-2xl font-bold text-green-700">₹{selectedSalesman.totalCommission1}</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-sm font-medium text-gray-600">Commission 2</div>
                  <div className="text-2xl font-bold text-blue-700">₹{selectedSalesman.totalCommission2}</div>
                </div>
                <div className="bg-orange-50 rounded-lg p-4">
                  <div className="text-sm font-medium text-gray-600">Total Commission</div>
                  <div className="text-2xl font-bold text-orange-700">₹{selectedSalesman.totalCommission}</div>
                </div>
              </div>
              
              {/* Bill Details */}
              {selectedSalesman.bills && selectedSalesman.bills.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Bill Details</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left font-semibold text-gray-700">Bill No</th>
                          <th className="px-4 py-2 text-left font-semibold text-gray-700">Customer</th>
                          <th className="px-4 py-2 text-left font-semibold text-gray-700">Date</th>
                          <th className="px-4 py-2 text-right font-semibold text-gray-700">Amount</th>
                          <th className="px-4 py-2 text-right font-semibold text-gray-700">Commission</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedSalesman.bills.map((bill: any, idx: number) => (
                          <tr key={idx} className="border-b border-gray-100">
                            <td className="px-4 py-2 text-gray-800 font-medium">{bill.billNo}</td>
                            <td className="px-4 py-2 text-gray-700">{bill.customerName}</td>
                            <td className="px-4 py-2 text-gray-700">{new Date(bill.date).toLocaleDateString()}</td>
                            <td className="px-4 py-2 text-right font-semibold text-gray-800">₹{bill.finalTotal || bill.grandTotal}</td>
                            <td className="px-4 py-2 text-right font-semibold text-green-600">₹{bill.commissionAmount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
              {/* Commission Calculation Details */}
              <div className="mt-6 bg-gray-50 rounded-lg p-4">
                <h4 className="text-md font-bold text-gray-800 mb-3">Commission Calculation</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Sales Amount:</span>
                    <span className="font-semibold">₹{selectedSalesman.totalSalesAmount || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Commission Rate:</span>
                    <span className="font-semibold">{selectedSalesman.salesman?.commissionRate}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Commission 1 (Rate 1):</span>
                    <span className="font-semibold text-green-600">₹{selectedSalesman.totalCommission1}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Commission 2 (Rate 2):</span>
                    <span className="font-semibold text-blue-600">₹{selectedSalesman.totalCommission2}</span>
                  </div>
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between">
                      <span className="text-gray-800 font-bold">Total Commission:</span>
                      <span className="font-bold text-orange-600">₹{selectedSalesman.totalCommission}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200">
              <button
                onClick={() => setShowCommissionModal(false)}
                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 