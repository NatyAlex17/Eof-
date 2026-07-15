'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { loadCatalog, money, type Catalog } from '../portalData';

export default function PortalPriceSheet() {
  const [cat, setCat] = useState<Catalog | null>(null);

  useEffect(() => {
    (async () => setCat(await loadCatalog()))();
  }, []);

  return (
    <>
      <header
        className="r-header"
        style={{
          flex: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '0 28px',
          height: '58px',
          borderBottom: '1px solid #E2E6E9',
          background: '#FFFFFF',
        }}
      >
        <span style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '-0.01em' }}>
          Price sheet
        </span>
        {cat?.hasPricing && (
          <span style={{ fontSize: '12px', color: '#8A99A3' }}>Your pricing</span>
        )}
      </header>

      <div className="r-pad" style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
        {cat && !cat.hasPricing ? (
          <div
            style={{
              maxWidth: '720px',
              background: '#fff',
              border: '1px solid #E2E6E9',
              borderRadius: '8px',
              padding: '40px 28px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                background: '#EEF3F6',
                color: '#3F6F86',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 14px',
              }}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" />
              </svg>
            </div>
            <div style={{ fontSize: '16px', fontWeight: 700 }}>Prices will be listed shortly</div>
            <div
              style={{
                fontSize: '13px',
                color: '#5A6670',
                margin: '8px auto 0',
                maxWidth: '380px',
                lineHeight: 1.5,
              }}
            >
              Our team is setting up your account. Your pricing will appear here as soon as
              it&apos;s ready — we&apos;ll be in touch.
            </div>
          </div>
        ) : (
          <div
            style={{
              maxWidth: '720px',
              background: '#fff',
              border: '1px solid #E2E6E9',
              borderRadius: '8px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 90px 130px',
                padding: '11px 18px',
                background: '#FAFBFB',
                borderBottom: '1px solid #E2E6E9',
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.07em',
                color: '#8A99A3',
              }}
            >
              <span>SPECIES</span>
              <span>GRADE</span>
              <span style={{ textAlign: 'right' }}>YOUR PRICE / LB</span>
            </div>
            {!cat ? (
              <div style={{ padding: '24px 18px', fontSize: '13px', color: '#8A99A3' }}>
                Loading…
              </div>
            ) : cat.skus.length === 0 ? (
              <div style={{ padding: '24px 18px', fontSize: '13px', color: '#8A99A3' }}>
                No products available yet.
              </div>
            ) : (
              cat.skus.map((s) => (
                <div
                  key={s.code}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 90px 130px',
                    alignItems: 'center',
                    padding: '13px 18px',
                    borderBottom: '1px solid #EDEFF1',
                  }}
                >
                  <span style={{ fontSize: '14px', fontWeight: 600 }}>{s.species}</span>
                  <span style={{ fontSize: '12px', color: '#5A6670', fontWeight: 600 }}>
                    {s.grade || '—'}
                  </span>
                  <span
                    style={{
                      textAlign: 'right',
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: '14px',
                      fontWeight: 700,
                    }}
                  >
                    {money(cat.priceOf(s.code))}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
        <div style={{ maxWidth: '720px', marginTop: '16px' }}>
          <Link
            href="/portal/order"
            style={{
              fontSize: '13px',
              fontWeight: 600,
              background: '#222A30',
              color: '#fff',
              borderRadius: '5px',
              padding: '10px 16px',
              textDecoration: 'none',
            }}
          >
            + Place an order
          </Link>
        </div>
      </div>
    </>
  );
}
