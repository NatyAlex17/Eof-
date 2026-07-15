'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { fetchAccess, pageKeyForPath, PAGE_REGISTRY, type Access } from '@/lib/access';

/**
 * Blocks direct URL access to /mana pages the signed-in role wasn't granted.
 * The owner passes everywhere. Unknown /mana paths (e.g. print sub-pages)
 * inherit their parent page's key via the longest-prefix match.
 */
export default function AccessGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [access, setAccess] = useState<Access | null>(null);

  useEffect(() => {
    (async () => setAccess(await fetchAccess()))();
  }, []);

  // Resolve before painting protected content — avoids flashing a page the
  // user isn't allowed to see.
  if (!access) {
    return (
      <div
        style={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#F4F5F6',
          fontFamily: "'Archivo', sans-serif",
          fontSize: '13px',
          color: '#8A99A3',
        }}
      >
        Loading…
      </div>
    );
  }

  const key = pageKeyForPath(pathname);
  const ok = !key || access.allowed.has(key);
  if (ok) return <>{children}</>;

  const firstAllowed =
    PAGE_REGISTRY.find((p) => p.key !== 'settings' && access.allowed.has(p.key)) ??
    PAGE_REGISTRY.find((p) => access.allowed.has(p.key));

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#F4F5F6',
        fontFamily: "'Archivo', sans-serif",
        color: '#222A30',
        padding: '20px',
      }}
    >
      <div
        style={{
          background: '#fff',
          border: '1px solid #E2E6E9',
          borderRadius: '10px',
          padding: '34px 38px',
          maxWidth: '440px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: '46px',
            height: '46px',
            borderRadius: '50%',
            background: '#FBF0EF',
            color: '#A5362C',
            fontSize: '20px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 14px',
          }}
        >
          ✕
        </div>
        <div style={{ fontSize: '17px', fontWeight: 700 }}>No access to this page</div>
        <div style={{ fontSize: '13px', color: '#5A6670', margin: '8px 0 20px', lineHeight: 1.55 }}>
          Your role (
          <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{access.role}</span>)
          hasn&apos;t been given access to this page. Ask the owner to grant it in Admin → Page
          access.
        </div>
        {firstAllowed && (
          <Link
            href={firstAllowed.href}
            style={{
              display: 'inline-block',
              fontSize: '13px',
              fontWeight: 600,
              background: '#222A30',
              color: '#fff',
              borderRadius: '5px',
              padding: '10px 18px',
              textDecoration: 'none',
            }}
          >
            Go to {firstAllowed.label}
          </Link>
        )}
      </div>
    </div>
  );
}
