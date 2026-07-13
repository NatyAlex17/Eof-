'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { fmtDate, lotStatusMeta, shipmentStatusMeta } from '../vendorData';

interface Shipment {
  id: string;
  awb: string | null;
  origin: string | null;
  destination_code: string | null;
  routing: string;
  status: string;
  eta: string | null;
  arrived_at: string | null;
  created_at: string;
}

interface Lot {
  id: string;
  lot_code: string;
  status: string;
  location: string | null;
  received_at: string | null;
  created_at: string;
}

export default function VendorShipmentsPage() {
  const [ships, setShips] = useState<Shipment[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const [{ data: s }, { data: l }] = await Promise.all([
        supabase
          .from('shipments')
          .select('id, awb, origin, destination_code, routing, status, eta, arrived_at, created_at')
          .order('created_at', { ascending: false }),
        supabase
          .from('lots')
          .select('id, lot_code, status, location, received_at, created_at')
          .order('created_at', { ascending: false }),
      ]);
      setShips((s ?? []) as Shipment[]);
      setLots((l ?? []) as Lot[]);
      setLoading(false);
    })();
  }, []);

  const headStyle: React.CSSProperties = {
    padding: '11px 18px',
    background: '#FAFBFB',
    borderBottom: '1px solid #E2E6E9',
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.07em',
    color: '#8A99A3',
  };

  return (
    <>
      <header
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
          Shipments &amp; lots
        </span>
        <span style={{ fontSize: '12px', color: '#8A99A3' }}>Your product with us</span>
      </header>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
        <div style={{ maxWidth: '900px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
          {/* SHIPMENTS */}
          <div
            style={{
              background: '#fff',
              border: '1px solid #E2E6E9',
              borderRadius: '8px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                ...headStyle,
                display: 'grid',
                gridTemplateColumns: '140px 1fr 90px 100px 130px 120px',
              }}
            >
              <span>AWB</span>
              <span>ORIGIN</span>
              <span>DEST</span>
              <span>ROUTING</span>
              <span>ETA / ARRIVED</span>
              <span style={{ textAlign: 'right' }}>STATUS</span>
            </div>
            {loading ? (
              <div style={{ padding: '24px 18px', fontSize: '13px', color: '#8A99A3' }}>
                Loading…
              </div>
            ) : ships.length === 0 ? (
              <div style={{ padding: '24px 18px', fontSize: '13px', color: '#8A99A3' }}>
                No shipments on record yet — they appear once your documents are processed.
              </div>
            ) : (
              ships.map((s) => {
                const sm = shipmentStatusMeta(s.status);
                return (
                  <div
                    key={s.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '140px 1fr 90px 100px 130px 120px',
                      alignItems: 'center',
                      padding: '13px 18px',
                      borderBottom: '1px solid #EDEFF1',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: '12px',
                        fontWeight: 600,
                      }}
                    >
                      {s.awb || '—'}
                    </span>
                    <span style={{ fontSize: '13px' }}>{s.origin || '—'}</span>
                    <span
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: '12px',
                        color: '#5A6670',
                      }}
                    >
                      {s.destination_code || '—'}
                    </span>
                    <span style={{ fontSize: '12px', color: '#5A6670' }}>
                      {s.routing === 'direct' ? 'Direct' : 'Warehouse'}
                    </span>
                    <span style={{ fontSize: '11px', color: '#8A99A3' }}>
                      {s.arrived_at ? fmtDate(s.arrived_at) : s.eta ? `ETA ${fmtDate(s.eta)}` : '—'}
                    </span>
                    <span style={{ textAlign: 'right' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          color: sm.color,
                          background: sm.bg,
                          borderRadius: '3px',
                          padding: '3px 9px',
                        }}
                      >
                        {sm.label}
                      </span>
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* LOTS */}
          <div
            style={{
              background: '#fff',
              border: '1px solid #E2E6E9',
              borderRadius: '8px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                ...headStyle,
                display: 'grid',
                gridTemplateColumns: '160px 1fr 120px 120px',
              }}
            >
              <span>LOT</span>
              <span>LOCATION</span>
              <span>RECEIVED</span>
              <span style={{ textAlign: 'right' }}>STATUS</span>
            </div>
            {loading ? (
              <div style={{ padding: '24px 18px', fontSize: '13px', color: '#8A99A3' }}>
                Loading…
              </div>
            ) : lots.length === 0 ? (
              <div style={{ padding: '24px 18px', fontSize: '13px', color: '#8A99A3' }}>
                No lots on record yet.
              </div>
            ) : (
              lots.map((l) => {
                const sm = lotStatusMeta(l.status);
                return (
                  <div
                    key={l.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '160px 1fr 120px 120px',
                      alignItems: 'center',
                      padding: '13px 18px',
                      borderBottom: '1px solid #EDEFF1',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: '13px',
                        fontWeight: 600,
                      }}
                    >
                      {l.lot_code}
                    </span>
                    <span style={{ fontSize: '13px' }}>{l.location || '—'}</span>
                    <span style={{ fontSize: '11px', color: '#8A99A3' }}>
                      {fmtDate(l.received_at)}
                    </span>
                    <span style={{ textAlign: 'right' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          color: sm.color,
                          background: sm.bg,
                          borderRadius: '3px',
                          padding: '3px 9px',
                        }}
                      >
                        {sm.label}
                      </span>
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </>
  );
}
