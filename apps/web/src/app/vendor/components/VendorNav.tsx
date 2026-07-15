'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { verificationMeta } from '../vendorData';

type VendorPage = 'dashboard' | 'upload' | 'documents' | 'shipments' | 'settlements' | 'settings';

export default function VendorNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<{ name: string; status: string } | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      // RLS scopes this to the signed-in vendor's own row.
      const { data } = await supabase
        .from('vendors')
        .select('name, verification_status')
        .limit(1)
        .maybeSingle();
      if (data) setMe({ name: data.name, status: data.verification_status });
    })();
  }, []);

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login/vendor');
  };

  const active = (): VendorPage => {
    if (pathname.includes('/vendor/upload')) return 'upload';
    if (pathname.includes('/vendor/documents')) return 'documents';
    if (pathname.includes('/vendor/shipments')) return 'shipments';
    if (pathname.includes('/vendor/settlements')) return 'settlements';
    if (pathname.includes('/vendor/settings')) return 'settings';
    return 'dashboard';
  };
  const on = active();

  const linkStyle = (key: VendorPage): React.CSSProperties => {
    const sel = on === key;
    return {
      display: 'flex',
      alignItems: 'center',
      gap: '11px',
      padding: '10px 14px 10px 13px',
      borderLeft: `3px solid ${sel ? '#B7791F' : 'transparent'}`,
      background: sel ? '#F4EEE2' : 'transparent',
      color: sel ? '#222A30' : '#5A6670',
      textDecoration: 'none',
      fontSize: '13px',
      fontWeight: sel ? 600 : 500,
      letterSpacing: '-0.01em',
    };
  };

  const items: { key: VendorPage; href: string; label: string; icon: React.ReactNode }[] = [
    {
      key: 'dashboard',
      href: '/vendor',
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
      key: 'upload',
      href: '/vendor/upload',
      label: 'Submit Packing List',
      icon: (
        <>
          <path d="M12 16V4" />
          <path d="M7 9l5-5 5 5" />
          <path d="M4 20h16" />
        </>
      ),
    },
    {
      key: 'documents',
      href: '/vendor/documents',
      label: 'My Documents',
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
      key: 'shipments',
      href: '/vendor/shipments',
      label: 'Shipments & Lots',
      icon: (
        <>
          <path d="M3 7.5l9-4.5 9 4.5v9l-9 4.5-9-4.5z" />
          <path d="M3 7.5l9 4.5 9-4.5M12 12v9" />
        </>
      ),
    },
    {
      key: 'settlements',
      href: '/vendor/settlements',
      label: 'Settlements',
      icon: (
        <>
          <path d="M5 3h14v18l-2.5-1.6L14 21l-2-1.6L10 21l-2.5-1.6L5 21z" />
          <line x1="8.5" y1="9" x2="15.5" y2="9" />
          <line x1="8.5" y1="13" x2="13" y2="13" />
        </>
      ),
    },
    {
      key: 'settings',
      href: '/vendor/settings',
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
            SUPPLIERS
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
            background: '#B7791F',
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
          {me && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                marginTop: '3px',
                fontSize: '10px',
                fontWeight: 700,
                color: verificationMeta(me.status).color,
                background: verificationMeta(me.status).bg,
                borderRadius: '3px',
                padding: '2px 7px',
              }}
            >
              <span
                style={{
                  width: '5px',
                  height: '5px',
                  borderRadius: '50%',
                  background: verificationMeta(me.status).dot,
                }}
              />
              {verificationMeta(me.status).label}
            </span>
          )}
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
