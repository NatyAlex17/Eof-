'use client';

import Nav from '../components/Nav';

interface Kpi {
  label: string;
  value: string;
  sub: string;
  accent: string;
  border: string;
}

const KPIS: Kpi[] = [
  {
    label: 'BOXES AVAILABLE',
    value: '47',
    sub: '1,842 lb across 4 lots',
    accent: '#2E6347',
    border: '#3F7D5B',
  },
  {
    label: 'OPEN ORDERS',
    value: '12',
    sub: '5 awaiting allocation',
    accent: '#2D5365',
    border: '#3F6F86',
  },
  {
    label: 'SHORTAGES',
    value: '3',
    sub: 'Ahi A+, Salmon A, Ono A',
    accent: '#A5362C',
    border: '#C2453A',
  },
  {
    label: 'PICK SLIPS PENDING',
    value: '4',
    sub: '2 SFO · 2 LAX',
    accent: '#8A5A14',
    border: '#B7791F',
  },
];

const ALLOC_BY_SPECIES = [
  { species: 'Ahi Tuna', allocated: 320, available: 180 },
  { species: 'Salmon', allocated: 210, available: 95 },
  { species: 'Ono', allocated: 140, available: 60 },
  { species: 'Hamachi', allocated: 90, available: 70 },
  { species: 'Mahi-Mahi', allocated: 40, available: 110 },
];

const SHORTAGES = [
  { order: '#2208', customer: 'Nobu', species: 'Ahi Tuna A+', short: '12 lb', shipDate: 'Jun 27' },
  { order: '#2207', customer: 'Morimoto', species: 'Salmon A', short: '8 lb', shipDate: 'Jun 27' },
  { order: '#2205', customer: "Roy's", species: 'Ono A', short: '24 lb', shipDate: 'Jun 28' },
];

const RECEIVING = [
  {
    lot: 'LOT-2209',
    vendor: 'Island Seafood',
    species: 'Ono',
    boxes: 4,
    weight: '118.6 lb',
    time: '06:05',
  },
  {
    lot: 'LOT-2208',
    vendor: 'Pacific Blue Co.',
    species: 'Salmon',
    boxes: 5,
    weight: '159.2 lb',
    time: '05:52',
  },
  {
    lot: 'LOT-2207',
    vendor: 'Kona Fresh Catch',
    species: 'Ahi Tuna',
    boxes: 6,
    weight: '246.2 lb',
    time: '05:40',
  },
];

const card: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #E2E6E9',
  borderRadius: '8px',
  padding: '20px 22px',
};

const sectionTitle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '0.06em',
  color: '#8A99A3',
  marginBottom: '16px',
};

export default function OperationsDashboardPage() {
  const maxBar = Math.max(...ALLOC_BY_SPECIES.map((s) => s.allocated + s.available));

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        background: '#F4F5F6',
        fontFamily: "'Archivo', sans-serif",
        color: '#222A30',
        WebkitFontSmoothing: 'antialiased',
        overflow: 'hidden',
      }}
    >
      <Nav />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
        <header
          style={{
            flex: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '20px',
            padding: '0 28px',
            height: '58px',
            borderBottom: '1px solid #E2E6E9',
            background: '#FFFFFF',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
            <span style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '-0.01em' }}>
              Operations Dashboard
            </span>
            <span
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '12px',
                color: '#8A99A3',
              }}
            >
              Live · all locations
            </span>
          </div>
        </header>

        <div style={{ flex: 1, overflowY: 'auto', padding: '22px 28px' }}>
          {/* KPI ROW */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4,1fr)',
              gap: '14px',
              marginBottom: '20px',
            }}
          >
            {KPIS.map((k) => (
              <div
                key={k.label}
                style={{ ...card, borderLeft: `3px solid ${k.border}`, padding: '16px 18px' }}
              >
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                    color: '#8A99A3',
                  }}
                >
                  {k.label}
                </div>
                <div
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '28px',
                    fontWeight: 600,
                    color: k.accent,
                    marginTop: '8px',
                  }}
                >
                  {k.value}
                </div>
                <div style={{ fontSize: '12px', color: '#5A6670', marginTop: '4px' }}>{k.sub}</div>
              </div>
            ))}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.4fr 1fr',
              gap: '14px',
              marginBottom: '14px',
            }}
          >
            {/* ALLOCATION BY SPECIES */}
            <div style={card}>
              <div style={sectionTitle}>INVENTORY BY SPECIES — ALLOCATED vs AVAILABLE (lb)</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {ALLOC_BY_SPECIES.map((s) => (
                  <div key={s.species}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: '5px',
                      }}
                    >
                      <span style={{ fontSize: '13px', fontWeight: 600 }}>{s.species}</span>
                      <span
                        style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: '12px',
                          color: '#8A99A3',
                        }}
                      >
                        {s.allocated} / {s.allocated + s.available}
                      </span>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        height: '14px',
                        borderRadius: '3px',
                        overflow: 'hidden',
                        background: '#EDEFF1',
                        width: `${((s.allocated + s.available) / maxBar) * 100}%`,
                      }}
                    >
                      <div
                        style={{
                          width: `${(s.allocated / (s.allocated + s.available)) * 100}%`,
                          background: '#3F6F86',
                        }}
                      />
                      <div style={{ flex: 1, background: '#BBD0DB' }} />
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '18px', marginTop: '16px' }}>
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '11px',
                    color: '#5A6670',
                  }}
                >
                  <span
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '2px',
                      background: '#3F6F86',
                    }}
                  />{' '}
                  Allocated
                </span>
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '11px',
                    color: '#5A6670',
                  }}
                >
                  <span
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '2px',
                      background: '#BBD0DB',
                    }}
                  />{' '}
                  Available
                </span>
              </div>
            </div>

            {/* SHORTAGES */}
            <div style={card}>
              <div style={sectionTitle}>OPEN SHORTAGES</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {SHORTAGES.map((s) => (
                  <div
                    key={s.order}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '11px 13px',
                      background: '#FDF7F6',
                      border: '1px solid #F0DAD7',
                      borderRadius: '6px',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600 }}>
                        {s.customer}{' '}
                        <span
                          style={{
                            fontFamily: "'IBM Plex Mono', monospace",
                            fontSize: '11px',
                            color: '#8A99A3',
                          }}
                        >
                          {s.order}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#8A99A3', marginTop: '2px' }}>
                        {s.species} · ship {s.shipDate}
                      </div>
                    </div>
                    <span
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: '14px',
                        fontWeight: 600,
                        color: '#A5362C',
                      }}
                    >
                      −{s.short}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RECEIVING TODAY */}
          <div style={card}>
            <div style={sectionTitle}>RECEIVED TODAY</div>
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
                  display: 'grid',
                  gridTemplateColumns: '120px 1fr 120px 80px 110px 90px',
                  gap: 0,
                  padding: '10px 16px',
                  background: '#FAFBFB',
                  borderBottom: '1px solid #E2E6E9',
                  fontSize: '10px',
                  fontWeight: 700,
                  letterSpacing: '0.07em',
                  color: '#8A99A3',
                }}
              >
                <span>LOT</span>
                <span>VENDOR</span>
                <span>SPECIES</span>
                <span style={{ textAlign: 'right' }}>BOXES</span>
                <span style={{ textAlign: 'right' }}>WEIGHT</span>
                <span style={{ textAlign: 'right' }}>TIME</span>
              </div>
              {RECEIVING.map((r) => (
                <div
                  key={r.lot}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '120px 1fr 120px 80px 110px 90px',
                    gap: 0,
                    alignItems: 'center',
                    padding: '12px 16px',
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
                    {r.lot}
                  </span>
                  <span style={{ fontSize: '13px' }}>{r.vendor}</span>
                  <span style={{ fontSize: '13px', color: '#5A6670' }}>{r.species}</span>
                  <span
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: '13px',
                      textAlign: 'right',
                    }}
                  >
                    {r.boxes}
                  </span>
                  <span
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: '13px',
                      fontWeight: 600,
                      textAlign: 'right',
                    }}
                  >
                    {r.weight}
                  </span>
                  <span
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: '12px',
                      color: '#8A99A3',
                      textAlign: 'right',
                    }}
                  >
                    {r.time}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
