'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type NavPage =
  | 'board'
  | 'intake'
  | 'inbox'
  | 'orders'
  | 'inventory'
  | 'customers'
  | 'pickslip'
  | 'pricesheet'
  | 'po'
  | 'finance'
  | 'credits'
  | 'vendor'
  | 'opsdash'
  | 'findash'
  | 'dashboard'
  | 'notifications'
  | 'settings'
  | 'admin';

interface NavUser {
  name: string;
  role: string;
  location: string | null;
}

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<NavUser | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, role, location')
        .eq('id', user.id)
        .single();
      setMe({
        name: profile?.name || (user.user_metadata?.name as string) || user.email || 'User',
        role: profile?.role || 'viewer',
        location: profile?.location ?? null,
      });
    })();
  }, []);

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  // Determine active page from pathname
  const getActivePage = (): NavPage => {
    if (pathname.includes('/allocation-board')) return 'board';
    if (pathname.includes('/order-inbox')) return 'inbox';
    if (pathname.includes('/order-intake')) return 'intake';
    if (pathname.includes('/orders')) return 'orders';
    if (pathname.includes('/inventory')) return 'inventory';
    if (pathname.includes('/customers')) return 'customers';
    if (pathname.includes('/pick-slips')) return 'pickslip';
    if (pathname.includes('/price-sheet')) return 'pricesheet';
    if (pathname.includes('/purchase-orders')) return 'po';
    if (pathname.includes('/finance-queue')) return 'finance';
    if (pathname.includes('/credits')) return 'credits';
    if (pathname.includes('/vendor-reconciliation')) return 'vendor';
    if (pathname.includes('/operations-dashboard')) return 'opsdash';
    if (pathname.includes('/finance-dashboard')) return 'findash';
    if (pathname.includes('/ceo-dashboard')) return 'dashboard';
    if (pathname.includes('/notifications')) return 'notifications';
    if (pathname.includes('/settings')) return 'settings';
    if (pathname.includes('/admin')) return 'admin';
    return 'board';
  };

  const active = getActivePage();

  const getLinkStyle = (key: NavPage) => {
    const on = active === key;
    return {
      display: 'flex',
      alignItems: 'center',
      gap: '11px',
      padding: '9px 14px 9px 13px',
      borderLeft: `3px solid ${on ? '#3F6F86' : 'transparent'}`,
      background: on ? '#EEF3F6' : 'transparent',
      color: on ? '#222A30' : '#5A6670',
      textDecoration: 'none',
      fontSize: '13px',
      fontWeight: on ? 600 : 500,
      letterSpacing: '-0.01em',
    };
  };

  return (
    <div
      style={{
        width: '218px',
        flex: 'none',
        height: '100vh',
        background: '#FFFFFF',
        borderRight: '1px solid #E2E6E9',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Archivo', sans-serif",
        color: '#222A30',
        WebkitFontSmoothing: 'antialiased',
      }}
    >
      {/* brand */}
      <div
        style={{
          flex: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '18px',
          padding: '18px 18px 16px',
          borderBottom: '1px solid #E2E6E9',
        }}
      >
        <div
          style={{
            width: '60px',
            height: '56px',
            borderRadius: '6px',
            overflow: 'hidden',
            flex: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <img
            src="/logo.png"
            alt="MANA"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center',
              transform: 'scale(1.2)',
            }}
          />
        </div>
        <div>
          <div
            style={{
              fontSize: '16px',
              fontWeight: 700,
              letterSpacing: '0.01em',
              lineHeight: 1,
            }}
          >
            MANA
          </div>
          <div
            style={{
              fontSize: '9px',
              fontWeight: 600,
              letterSpacing: '0.16em',
              color: '#8A99A3',
              marginTop: '4px',
            }}
          >
            OPERATIONS
          </div>
        </div>
      </div>

      {/* nav */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '14px 0' }}>
        <div
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '9px',
            letterSpacing: '0.14em',
            color: '#8A99A3',
            padding: '0 18px',
            marginBottom: '8px',
          }}
        >
          OPERATIONS
        </div>

        <Link href="/mana/allocation-board" style={getLinkStyle('board')}>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
          >
            <rect x="3" y="4.5" width="18" height="15" rx="1.5" />
            <line x1="12" y1="4.5" x2="12" y2="19.5" />
          </svg>
          <span>Allocation Board</span>
        </Link>
        <Link href="/mana/order-intake" style={getLinkStyle('intake')}>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          >
            <circle cx="12" cy="12" r="9" />
            <line x1="12" y1="8" x2="12" y2="16" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
          <span>Order Intake</span>
        </Link>
        <Link href="/mana/order-inbox" style={getLinkStyle('inbox')}>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 5h18v10H3z" opacity="0" />
            <path d="M3 13h5l1.5 3h5L21 13" />
            <path d="M3 13V6a2 2 0 012-2h14a2 2 0 012 2v7" />
            <path d="M3 13v3a2 2 0 002 2h14a2 2 0 002-2v-3" />
          </svg>
          <span>Order Inbox</span>
        </Link>
        <Link href="/mana/orders" style={getLinkStyle('orders')}>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 4h16v16H4z" opacity="0" />
            <line x1="4" y1="6" x2="14" y2="6" />
            <line x1="4" y1="12" x2="14" y2="12" />
            <line x1="4" y1="18" x2="14" y2="18" />
            <circle cx="19" cy="6" r="1.4" />
            <circle cx="19" cy="12" r="1.4" />
            <circle cx="19" cy="18" r="1.4" />
          </svg>
          <span>Orders</span>
        </Link>
        <Link href="/mana/inventory" style={getLinkStyle('inventory')}>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
          >
            <path d="M3 7.5l9-4.5 9 4.5v9l-9 4.5-9-4.5z" />
            <path d="M3 7.5l9 4.5 9-4.5M12 12v9" />
          </svg>
          <span>Lots &amp; Inventory</span>
        </Link>
        <Link href="/mana/customers" style={getLinkStyle('customers')}>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="9" cy="8" r="3.2" />
            <path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
            <path d="M16 5.2a3 3 0 010 5.6" />
            <path d="M17.5 14c2.2.5 3.5 2.3 3.5 5" />
          </svg>
          <span>Customers</span>
        </Link>
        <Link href="/mana/pick-slips" style={getLinkStyle('pickslip')}>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          >
            <rect x="5" y="4" width="14" height="17" rx="1.5" />
            <rect x="9" y="2.5" width="6" height="3.5" rx="1" />
            <line x1="8.5" y1="11" x2="15.5" y2="11" />
            <line x1="8.5" y1="15" x2="13" y2="15" />
          </svg>
          <span>Pick Slips</span>
        </Link>

        <div
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '9px',
            letterSpacing: '0.14em',
            color: '#8A99A3',
            padding: '0 18px',
            margin: '18px 0 8px',
          }}
        >
          FINANCE
        </div>

        <Link href="/mana/price-sheet" style={getLinkStyle('pricesheet')}>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20.6 13.4l-7.2 7.2a2 2 0 01-2.8 0L3 13V3h10l7.6 7.6a2 2 0 010 2.8z" />
            <circle cx="7.5" cy="7.5" r="1.5" />
          </svg>
          <span>Price Sheet</span>
        </Link>
        <Link href="/mana/purchase-orders" style={getLinkStyle('po')}>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 2.5h9l4 4V21.5H6z" />
            <path d="M15 2.5v4h4" />
            <line x1="9" y1="12" x2="16" y2="12" />
            <line x1="9" y1="16" x2="13.5" y2="16" />
            <line x1="9" y1="8" x2="12" y2="8" />
          </svg>
          <span>Purchase Orders</span>
        </Link>
        <Link href="/mana/finance-queue" style={getLinkStyle('finance')}>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 3h14v18l-2.5-1.6L14 21l-2-1.6L10 21l-2.5-1.6L5 21z" />
            <line x1="8.5" y1="9" x2="15.5" y2="9" />
            <line x1="8.5" y1="13" x2="13" y2="13" />
          </svg>
          <span>Finance Queue</span>
        </Link>
        <Link href="/mana/credits" style={getLinkStyle('credits')}>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="8" width="18" height="13" rx="1.5" />
            <path d="M7 8V6a5 5 0 0110 0v2" />
            <line x1="12" y1="13" x2="12" y2="16" />
          </svg>
          <span>Credits &amp; Downgrades</span>
        </Link>
        <Link href="/mana/vendor-reconciliation" style={getLinkStyle('vendor')}>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 2.5h8l4 4V21.5H6z" />
            <path d="M14 2.5v4h4" />
            <path d="M9 14l2 2 4-4" />
          </svg>
          <span>Vendor Recon</span>
        </Link>

        <div
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '9px',
            letterSpacing: '0.14em',
            color: '#8A99A3',
            padding: '0 18px',
            margin: '18px 0 8px',
          }}
        >
          OVERVIEW
        </div>

        <Link href="/mana/operations-dashboard" style={getLinkStyle('opsdash')}>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 13a9 9 0 0118 0" />
            <line x1="12" y1="13" x2="15.5" y2="9.5" />
            <line x1="3" y1="13" x2="5" y2="13" />
            <line x1="19" y1="13" x2="21" y2="13" />
            <line x1="12" y1="4" x2="12" y2="6" />
          </svg>
          <span>Operations</span>
        </Link>
        <Link href="/mana/finance-dashboard" style={getLinkStyle('findash')}>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="4" y1="20" x2="20" y2="20" />
            <rect x="5.5" y="11" width="3.5" height="7" rx="0.5" />
            <rect x="10.5" y="7" width="3.5" height="11" rx="0.5" />
            <rect x="15.5" y="13" width="3.5" height="5" rx="0.5" />
          </svg>
          <span>Finance</span>
        </Link>
        <Link href="/mana/ceo-dashboard" style={getLinkStyle('dashboard')}>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
          >
            <rect x="3" y="3" width="7.5" height="7.5" rx="1" />
            <rect x="13.5" y="3" width="7.5" height="7.5" rx="1" />
            <rect x="3" y="13.5" width="7.5" height="7.5" rx="1" />
            <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1" />
          </svg>
          <span>Executive</span>
        </Link>

        <div
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '9px',
            letterSpacing: '0.14em',
            color: '#8A99A3',
            padding: '0 18px',
            margin: '18px 0 8px',
          }}
        >
          SYSTEM
        </div>

        <Link href="/mana/notifications" style={getLinkStyle('notifications')}>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.7 21a2 2 0 01-3.4 0" />
          </svg>
          <span>Notifications</span>
        </Link>
        <Link href="/mana/settings" style={getLinkStyle('settings')}>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
          <span>Settings</span>
        </Link>
        <Link href="/mana/admin" style={getLinkStyle('admin')}>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="8" r="4" />
            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
            <circle cx="19" cy="8" r="2" />
            <line x1="19" y1="6" x2="19" y2="10" />
          </svg>
          <span>Admin</span>
        </Link>
      </nav>

      {/* user */}
      <div
        style={{
          flex: 'none',
          borderTop: '1px solid #E2E6E9',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '11px',
        }}
      >
        <span
          style={{
            width: '30px',
            height: '30px',
            borderRadius: '50%',
            background: '#3F6F86',
            color: '#fff',
            fontSize: '11px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 'none',
          }}
        >
          {me
            ? me.name
                .split(' ')
                .map((p) => p[0])
                .filter(Boolean)
                .slice(0, 2)
                .join('')
                .toUpperCase() || '?'
            : '·'}
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontSize: '13px',
              fontWeight: 600,
              lineHeight: 1.1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {me ? me.name : 'Loading…'}
          </div>
          <div
            style={{
              fontSize: '11px',
              color: '#8A99A3',
              marginTop: '2px',
              textTransform: 'capitalize',
            }}
          >
            {me ? `${me.role}${me.location ? ` · ${me.location}` : ''}` : ''}
          </div>
        </div>
      </div>

      {/* logout */}
      <div style={{ flex: 'none', padding: '0 10px 12px' }}>
        <button
          onClick={signOut}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '9px',
            width: '100%',
            padding: '8px 10px',
            border: 'none',
            borderRadius: '6px',
            background: 'transparent',
            color: '#8A99A3',
            fontFamily: "'Archivo', sans-serif",
            fontSize: '12px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'background 0.12s, color 0.12s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#FBF0EF';
            e.currentTarget.style.color = '#A5362C';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = '#8A99A3';
          }}
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Sign out
        </button>
      </div>
    </div>
  );
}
