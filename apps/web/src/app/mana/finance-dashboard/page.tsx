'use client';

import Nav from '../components/Nav';
import DateRangeFilter from '../components/DateRangeFilter';

const KPIS = [
  {
    label: 'INVOICED THIS WEEK',
    value: '$48.2k',
    sub: '34 invoices · 31 synced',
    accent: '#2E6347',
    border: '#3F7D5B',
  },
  {
    label: 'AR OUTSTANDING',
    value: '$92.6k',
    sub: 'across 18 customers',
    accent: '#2D5365',
    border: '#3F6F86',
  },
  {
    label: 'FAILED SYNCS',
    value: '1',
    sub: 'INV-2205 · needs mapping',
    accent: '#A5362C',
    border: '#C2453A',
  },
  {
    label: 'OPEN CREDITS',
    value: '$525',
    sub: '2 claims pending approval',
    accent: '#8A5A14',
    border: '#B7791F',
  },
];

const AR_AGING = [
  { bucket: 'Current', amount: 41200, color: '#3F7D5B' },
  { bucket: '1–30 days', amount: 28400, color: '#3F6F86' },
  { bucket: '31–60 days', amount: 14800, color: '#B7791F' },
  { bucket: '61–90 days', amount: 5600, color: '#C77B3A' },
  { bucket: '90+ days', amount: 2600, color: '#C2453A' },
];

const MARGIN_BY_SPECIES = [
  { species: 'Ahi Tuna', revenue: 18400, marginPct: 32 },
  { species: 'Salmon', revenue: 11200, marginPct: 28 },
  { species: 'Ono', revenue: 7600, marginPct: 24 },
  { species: 'Hamachi', revenue: 6100, marginPct: 30 },
];

const RECENT_CREDITS = [
  {
    id: 'CM-118',
    customer: 'Nobu',
    amount: -59.8,
    note: 'Short weight — synced to QBO',
    status: 'issued',
  },
  {
    id: 'CR-041',
    customer: "Roy's",
    amount: -380.0,
    note: 'Temp abuse — awaiting approval',
    status: 'pending',
  },
  {
    id: 'CR-040',
    customer: 'Morimoto',
    amount: -145.0,
    note: 'Color downgrade — awaiting approval',
    status: 'pending',
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

const money = (n: number) => {
  const v = Math.abs(n).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return (n < 0 ? '−$' : '$') + v;
};

const moneyK = (n: number) => '$' + (n / 1000).toFixed(1) + 'k';

export default function FinanceDashboardPage() {
  const arTotal = AR_AGING.reduce((a, b) => a + b.amount, 0);
  const maxRev = Math.max(...MARGIN_BY_SPECIES.map((m) => m.revenue));

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
              Finance Dashboard
            </span>
            <span
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '12px',
                color: '#8A99A3',
              }}
            >
              QBO connected · last sync 06:02
            </span>
          </div>
          <DateRangeFilter defaultKey="last7" />
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
                    fontSize: '26px',
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
              gridTemplateColumns: '1fr 1fr',
              gap: '14px',
              marginBottom: '14px',
            }}
          >
            {/* AR AGING */}
            <div style={card}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  marginBottom: '16px',
                }}
              >
                <span style={sectionTitle}>AR AGING</span>
                <span
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '14px',
                    fontWeight: 600,
                  }}
                >
                  {moneyK(arTotal)}
                </span>
              </div>
              {/* stacked bar */}
              <div
                style={{
                  display: 'flex',
                  height: '20px',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  marginBottom: '16px',
                }}
              >
                {AR_AGING.map((b) => (
                  <div
                    key={b.bucket}
                    style={{ width: `${(b.amount / arTotal) * 100}%`, background: b.color }}
                    title={b.bucket}
                  />
                ))}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
                {AR_AGING.map((b) => (
                  <div
                    key={b.bucket}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '13px',
                      }}
                    >
                      <span
                        style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '2px',
                          background: b.color,
                        }}
                      />
                      {b.bucket}
                    </span>
                    <span
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: '13px',
                        fontWeight: 600,
                      }}
                    >
                      {money(b.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* MARGIN BY SPECIES */}
            <div style={card}>
              <div style={sectionTitle}>REVENUE & MARGIN BY SPECIES (this week)</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {MARGIN_BY_SPECIES.map((m) => (
                  <div key={m.species}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: '5px',
                      }}
                    >
                      <span style={{ fontSize: '13px', fontWeight: 600 }}>{m.species}</span>
                      <span
                        style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: '12px',
                          color: '#5A6670',
                        }}
                      >
                        {moneyK(m.revenue)} · {m.marginPct}%
                      </span>
                    </div>
                    <div
                      style={{
                        height: '12px',
                        borderRadius: '3px',
                        background: '#EDEFF1',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${(m.revenue / maxRev) * 100}%`,
                          height: '100%',
                          background: '#3F6F86',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RECENT CREDITS */}
          <div style={card}>
            <div style={sectionTitle}>RECENT CREDIT ACTIVITY</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
              {RECENT_CREDITS.map((c) => {
                const pending = c.status === 'pending';
                return (
                  <div
                    key={c.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      background: pending ? '#FDFBF6' : '#FAFBFB',
                      border: `1px solid ${pending ? '#E8D5B0' : '#EDEFF1'}`,
                      borderRadius: '6px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span
                        style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: '12px',
                          fontWeight: 600,
                        }}
                      >
                        {c.id}
                      </span>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600 }}>{c.customer}</div>
                        <div style={{ fontSize: '11px', color: '#8A99A3', marginTop: '1px' }}>
                          {c.note}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          color: pending ? '#8A5A14' : '#2E6347',
                          background: pending ? '#F4EEE2' : '#EAF1ED',
                          borderRadius: '3px',
                          padding: '3px 9px',
                        }}
                      >
                        {pending ? 'Pending' : 'Issued'}
                      </span>
                      <span
                        style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: '14px',
                          fontWeight: 600,
                          color: '#A5362C',
                          width: '80px',
                          textAlign: 'right',
                        }}
                      >
                        {money(c.amount)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
