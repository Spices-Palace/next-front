"use client";
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import Cookies from 'js-cookie';

const navLinks = [
  { href: '/cashier/products', label: 'Products' },
  { href: '/cashier/billing', label: 'Billing' },
  { href: '/cashier/bills', label: 'Bills' },
];

export default function CashierLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const role = typeof window !== 'undefined' ? localStorage.getItem('role') : null;
    if (!token || role !== 'cashier') {
      router.replace('/');
    } else {
      setAuthChecked(true);
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('companyId');
    localStorage.removeItem('companyName');
    Cookies.remove('companyId');
    Cookies.remove('companyName');
    router.replace('/');
  };

  if (!authChecked) {
    return <div className="flex items-center justify-center min-h-screen">Checking authorization...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow sticky top-0 z-30 w-full">
        <div className="max-w-5xl mx-auto px-4 py-3 flex gap-6 items-center">
          <span className="text-xl font-bold text-blue-700 tracking-wide">Cashier Dashboard</span>
          <div className="flex gap-4 ml-8">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-2 rounded text-base font-medium transition-colors ${pathname.startsWith(link.href) ? 'bg-blue-100 text-blue-700 font-bold' : 'text-gray-700 hover:bg-blue-50'}`}
              >
                {link.label}
              </Link>
            ))}
          </div>
          <button
            onClick={handleLogout}
            className="ml-auto bg-red-100 text-red-700 px-4 py-2 rounded font-semibold hover:bg-red-200 transition"
          >
            Log out
          </button>
        </div>
      </nav>
      <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
} 