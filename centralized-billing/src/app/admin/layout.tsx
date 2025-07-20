"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const role = typeof window !== 'undefined' ? localStorage.getItem('role') : null;
    if (!token || role !== 'admin') {
      router.replace('/');
    } else {
      setAuthChecked(true);
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('companyId');
    router.replace('/');
  };

  if (!authChecked) {
    return <div className="flex items-center justify-center min-h-screen">Checking authorization...</div>;
  }

  const navLinks = [
    { href: '/admin/products', label: 'Products' },
    { href: '/admin/buyers', label: 'Buyers' },
    { href: '/admin/salesmen', label: 'Salesmen' },
    { href: '/admin/bills', label: 'Bills' },
    { href: '/admin/report', label: 'Report' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <main className="flex-1 pb-20">{children}</main>
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg flex justify-around py-2 z-[100]">
        <Link href="/admin/products" className={`flex flex-col items-center hover:text-blue-600 ${pathname === '/admin/products' ? 'text-blue-700 font-bold' : 'text-gray-700'}`}>
          <span className="material-icons">inventory_2</span>
          <span className="text-xs">Products</span>
        </Link>
        <Link href="/admin/report" className={`flex flex-col items-center hover:text-blue-600 ${pathname === '/admin/report' ? 'text-blue-700 font-bold' : 'text-gray-700'}`}>
          <span className="material-icons">bar_chart</span>
          <span className="text-xs">Report</span>
        </Link>
        <Link href="/admin/bills" className={`flex flex-col items-center hover:text-blue-600 ${pathname === '/admin/bills' ? 'text-blue-700 font-bold' : 'text-gray-700'}`}>
          <span className="material-icons">receipt_long</span>
          <span className="text-xs">Bills</span>
        </Link>
        <Link href="/admin/salesmen" className={`flex flex-col items-center hover:text-blue-600 ${pathname === '/admin/salesmen' ? 'text-blue-700 font-bold' : 'text-gray-700'}`}>
          <span className="material-icons">people</span>
          <span className="text-xs">Salesmen</span>
        </Link>
        <Link href="/admin/buyers" className="flex flex-col items-center text-gray-700 hover:text-blue-600">
          <span className="material-icons">group</span>
          <span className="text-xs">Buyers</span>
        </Link>
        <button
          onClick={handleLogout}
          className="flex flex-col items-center text-red-600 hover:text-red-800 focus:outline-none"
        >
          <span className="material-icons">power_settings_new</span>
          <span className="text-xs">Logout</span>
        </button>
      </nav>
    </div>
  );
} 