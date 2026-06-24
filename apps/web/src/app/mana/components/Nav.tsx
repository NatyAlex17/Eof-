'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type NavPage =
  | 'board'
  | 'intake'
  | 'inventory'
  | 'pickslip'
  | 'finance'
  | 'vendor'
  | 'dashboard';

export default function Nav() {
  const pathname = usePathname();

  // Determine active page from pathname
  const getActivePage = (): NavPage => {
    if (pathname.includes('/allocation-board')) return 'board';
    if (pathname.includes('/order-intake')) return 'intake';
    if (pathname.includes('/inventory')) return 'inventory';
    if (pathname.includes('/pick-slips')) return 'pickslip';
    if (pathname.includes('/finance-queue')) return 'finance';
    if (pathname.includes('/vendor-reconciliation')) return 'vendor';
    if (pathname.includes('/ceo-dashboard')) return 'dashboard';
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
          gap: '12px',
          padding: '18px 18px 16px',
          borderBottom: '1px solid #E2E6E9',
        }}
      >
        <div
          style={{
            width: '32px',
            height: '32px',
            border: '2px solid #222A30',
            borderRadius: '3px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 'none',
          }}
        >
          <div
            style={{
              width: '12px',
              height: '12px',
              border: '2px solid #3F6F86',
              borderRadius: '1px',
            }}
          ></div>
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
        <Link
          href="/mana/vendor-reconciliation"
          style={getLinkStyle('vendor')}
        >
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
          <span>CEO Dashboard</span>
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
          BK
        </span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '13px', fontWeight: 600, lineHeight: 1.1 }}>
            Blake
          </div>
          <div style={{ fontSize: '11px', color: '#8A99A3', marginTop: '2px' }}>
            Owner · SFO
          </div>
        </div>
      </div>
    </div>
  );
}
