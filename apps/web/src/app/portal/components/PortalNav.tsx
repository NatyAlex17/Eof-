'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type PortalPage =
  | 'dashboard'
  | 'order'
  | 'orders'
  | 'pricesheet'
  | 'invoices'
  | 'claims'
  | 'settings';

export default function PortalNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<{ name: string } | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      // RLS scopes this to the signed-in customer's own row.
      const { data } = await supabase.from('customers').select('name').limit(1).single();
      if (data) setMe({ name: data.name });
    })();
  }, []);

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  const active = (): PortalPage => {
    if (pathname.includes('/portal/order') && !pathname.includes('/orders')) return 'order';
    if (pathname.includes('/portal/orders')) return 'orders';
    if (pathname.includes('/portal/price-sheet')) return 'pricesheet';
    if (pathname.includes('/portal/invoices')) return 'invoices';
    if (pathname.includes('/portal/claims')) return 'claims';
    if (pathname.includes('/portal/settings')) return 'settings';
    return 'dashboard';
  };
  const on = active();

  const linkStyle = (key: PortalPage): React.CSSProperties => {
    const sel = on === key;
    return {
      display: 'flex',
      alignItems: 'center',
      gap: '11px',
      padding: '10px 14px 10px 13px',
      borderLeft: `3px solid ${sel ? '#3F6F86' : 'transparent'}`,
      background: sel ? '#EEF3F6' : 'transparent',
      color: sel ? '#222A30' : '#5A6670',
      textDecoration: 'none',
      fontSize: '13px',
      fontWeight: sel ? 600 : 500,
      letterSpacing: '-0.01em',
    };
  };

  const items: { key: PortalPage; href: string; label: string; icon: React.ReactNode }[] = [
    {
      key: 'dashboard',
      href: '/portal',
      label: 'Dashboard',
      icon: (
        <>
          <rect x="3" y="3" width="7.5" height="7.5" rx="1" />
          <rect x="13.5" y="3" width="7.5" height="7.5" rx="1" />
          <rect x="3" y="13.5" width="7.5" height="7.5" rx="1" />
          <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1" />
        </>
      ),
    },
    {
      key: 'order',
      href: '/portal/order',
      label: 'Place an Order',
      icon: (
        <>
          <circle cx="12" cy="12" r="9" />
          <line x1="12" y1="8" x2="12" y2="16" />
          <line x1="8" y1="12" x2="16" y2="12" />
        </>
      ),
    },
    {
      key: 'orders',
      href: '/portal/orders',
      label: 'My Orders',
      icon: (
        <>
          <line x1="4" y1="6" x2="14" y2="6" />
          <line x1="4" y1="12" x2="14" y2="12" />
          <line x1="4" y1="18" x2="14" y2="18" />
          <circle cx="19" cy="6" r="1.4" />
          <circle cx="19" cy="12" r="1.4" />
          <circle cx="19" cy="18" r="1.4" />
        </>
      ),
    },
    {
      key: 'pricesheet',
      href: '/portal/price-sheet',
      label: 'Price Sheet',
      icon: (
        <>
          <path d="M20.6 13.4l-7.2 7.2a2 2 0 01-2.8 0L3 13V3h10l7.6 7.6a2 2 0 010 2.8z" />
          <circle cx="7.5" cy="7.5" r="1.5" />
        </>
      ),
    },
    {
      key: 'invoices',
      href: '/portal/invoices',
      label: 'Invoices',
      icon: (
        <>
          <path d="M6 2.5h9l4 4V21.5H6z" />
          <path d="M15 2.5v4h4" />
          <line x1="9" y1="12" x2="16" y2="12" />
          <line x1="9" y1="16" x2="13.5" y2="16" />
        </>
      ),
    },
    {
      key: 'claims',
      href: '/portal/claims',
      label: 'Quality Claims',
      icon: (
        <>
          <path d="M12 3l9 16H3z" />
          <line x1="12" y1="10" x2="12" y2="14" />
          <line x1="12" y1="17" x2="12" y2="17" />
        </>
      ),
    },
    {
      key: 'settings',
      href: '/portal/settings',
      label: 'Settings',
      icon: (
        <>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
        </>
      ),
    },
  ];

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '248px',
        minWidth: '224px',
        flex: 'none',
        height: '100%',
        background: '#FFFFFF',
        borderRight: '1px solid #E2E6E9',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Archivo', sans-serif",
        color: '#222A30',
        WebkitFontSmoothing: 'antialiased',
      }}
    >
      <div
        style={{
          flex: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          padding: '18px 18px 16px',
          borderBottom: '1px solid #E2E6E9',
        }}
      >
        <div
          style={{
            width: '54px',
            height: '50px',
            borderRadius: '6px',
            overflow: 'hidden',
            flex: 'none',
          }}
        >
          <img
            src="/logo.png"
            alt="MANA"
            style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scale(1.2)' }}
          />
        </div>
        <div>
          <div
            style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '0.01em', lineHeight: 1 }}
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
            SEAFOOD
          </div>
        </div>
      </div>

      <nav style={{ flex: 1, overflowY: 'auto', padding: '14px 0' }}>
        {items.map((it) => (
          <Link key={it.key} href={it.href} style={linkStyle(it.key)} onClick={onNavigate}>
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
              {it.icon}
            </svg>
            <span>{it.label}</span>
          </Link>
        ))}
      </nav>

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
            background: '#5A3E6B',
            color: '#fff',
            fontSize: '11px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 'none',
          }}
        >
          {me ? me.name.slice(0, 2).toUpperCase() : '·'}
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
          <div style={{ fontSize: '11px', color: '#8A99A3', marginTop: '2px' }}>
            {me ? 'Customer account' : ''}
          </div>
        </div>
      </div>

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
