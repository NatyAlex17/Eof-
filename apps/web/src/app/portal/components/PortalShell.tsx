'use client';

import { useState } from 'react';
import PortalNav from './PortalNav';

/**
 * Responsive shell: desktop shows the fixed sidebar; mobile (≤768px) shows a
 * top bar with a hamburger that opens the same nav as a slide-in drawer.
 * Visibility is CSS-driven (portals-responsive.css) so there is no hydration flash.
 */
export default function PortalShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rshell">
      <aside className="rshell-side">
        <PortalNav />
      </aside>

      <div className="rshell-body">
        <div className="rshell-topbar">
          <button className="rshell-burger" onClick={() => setOpen(true)} aria-label="Open menu">
            <svg
              width="19"
              height="19"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <line x1="3.5" y1="6" x2="20.5" y2="6" />
              <line x1="3.5" y1="12" x2="20.5" y2="12" />
              <line x1="3.5" y1="18" x2="20.5" y2="18" />
            </svg>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '33px', borderRadius: '5px', overflow: 'hidden' }}>
              <img
                src="/logo.png"
                alt="MANA"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transform: 'scale(1.2)',
                }}
              />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, lineHeight: 1 }}>MANA</div>
              <div
                style={{
                  fontSize: '8px',
                  fontWeight: 600,
                  letterSpacing: '0.16em',
                  color: '#8A99A3',
                  marginTop: '3px',
                }}
              >
                CUSTOMER PORTAL
              </div>
            </div>
          </div>
        </div>

        {children}
      </div>

      {open && (
        <div className="rshell-overlay" onClick={() => setOpen(false)}>
          <div className="rshell-drawer" onClick={(e) => e.stopPropagation()}>
            <PortalNav onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
