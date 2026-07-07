'use client';

import { useEffect, useState } from 'react';
import Nav from '../components/Nav';
import DateRangeFilter, { selectionLabel, type DateSelection } from '../components/DateRangeFilter';

type PoStatus = 'open' | 'received' | 'reconciled' | 'disputed';

interface PoLine {
  species: string;
  grade: string;
  orderedLb: number;
  rate: number; // PO rate $/lb
  receivedLb: number | null; // null until shipment recorded
  invLb: number | null; // null until invoice recorded
  invRate: number | null;
}

interface PO {
  id: string;
  po: string;
  vendor: string;
  orderRef: string; // linked sales order / internal ref
  orderDate: string; // ISO
  receivedDate: string | null;
  invoiceNo: string | null;
  invoiceDate: string | null;
  status: PoStatus;
  lines: PoLine[];
}

const VENDORS = ['Kona Fresh Catch', 'Pacific Blue Co.', 'Island Direct', 'Tahiti Imports'];

const SEED: PO[] = [
  {
    id: 'p1',
    po: 'PO-1044',
    vendor: 'Pacific Blue Co.',
    orderRef: 'ORD-2212',
    orderDate: '2026-07-07',
    receivedDate: '2026-07-07',
    invoiceNo: null,
    invoiceDate: null,
    status: 'received',
    lines: [
      {
        species: 'Mahi-Mahi',
        grade: 'A',
        orderedLb: 90,
        rate: 12.25,
        receivedLb: 91.0,
        invLb: null,
        invRate: null,
      },
    ],
  },
  {
    id: 'p2',
    po: 'PO-1043',
    vendor: 'Island Direct',
    orderRef: 'ORD-2211',
    orderDate: '2026-07-07',
    receivedDate: null,
    invoiceNo: null,
    invoiceDate: null,
    status: 'open',
    lines: [
      {
        species: 'Ono',
        grade: 'A',
        orderedLb: 120,
        rate: 14.0,
        receivedLb: null,
        invLb: null,
        invRate: null,
      },
    ],
  },
  {
    id: 'p3',
    po: 'PO-1042',
    vendor: 'Kona Fresh Catch',
    orderRef: 'ORD-2213',
    orderDate: '2026-07-06',
    receivedDate: '2026-07-07',
    invoiceNo: 'KFC-8812',
    invoiceDate: '2026-07-07',
    status: 'received',
    lines: [
      {
        species: 'Ahi Tuna',
        grade: 'A+',
        orderedLb: 250,
        rate: 18.5,
        receivedLb: 238.4,
        invLb: 238.4,
        invRate: 18.5,
      },
    ],
  },
  {
    id: 'p4',
    po: 'PO-1041',
    vendor: 'Pacific Blue Co.',
    orderRef: 'ORD-2207',
    orderDate: '2026-07-04',
    receivedDate: '2026-07-05',
    invoiceNo: 'PBC-2231',
    invoiceDate: '2026-07-05',
    status: 'disputed',
    lines: [
      {
        species: 'Salmon',
        grade: 'A',
        orderedLb: 160,
        rate: 11.5,
        receivedLb: 159.2,
        invLb: 159.2,
        invRate: 11.65,
      },
    ],
  },
  {
    id: 'p5',
    po: 'PO-1040',
    vendor: 'Kona Fresh Catch',
    orderRef: 'ORD-2206',
    orderDate: '2026-07-03',
    receivedDate: '2026-07-04',
    invoiceNo: 'KFC-8807',
    invoiceDate: '2026-07-04',
    status: 'reconciled',
    lines: [
      {
        species: 'Hamachi',
        grade: 'A+',
        orderedLb: 70,
        rate: 19.75,
        receivedLb: 70.3,
        invLb: 70.3,
        invRate: 19.75,
      },
    ],
  },
  {
    id: 'p6',
    po: 'PO-1039',
    vendor: 'Tahiti Imports',
    orderRef: 'ORD-2209',
    orderDate: '2026-06-29',
    receivedDate: '2026-07-01',
    invoiceNo: 'TI-00318',
    invoiceDate: '2026-07-02',
    status: 'reconciled',
    lines: [
      {
        species: 'Yellowfin Tuna',
        grade: 'A',
        orderedLb: 200,
        rate: 16.4,
        receivedLb: 198.7,
        invLb: 198.7,
        invRate: 16.4,
      },
      {
        species: 'Bigeye Tuna',
        grade: 'A',
        orderedLb: 150,
        rate: 18.1,
        receivedLb: 151.2,
        invLb: 151.2,
        invRate: 18.1,
      },
    ],
  },
];

const STATUS_META: Record<PoStatus, { label: string; color: string; bg: string; dot: string }> = {
  open: { label: 'Open', color: '#8A5A14', bg: '#F4EEE2', dot: '#B7791F' },
  received: { label: 'Received', color: '#2D5365', bg: '#EEF3F6', dot: '#3F6F86' },
  reconciled: { label: 'Reconciled', color: '#2E6347', bg: '#EAF1ED', dot: '#3F7D5B' },
  disputed: { label: 'Disputed', color: '#A5362C', bg: '#FBF0EF', dot: '#C2453A' },
};

// Variance tolerances — beyond these, a flag raises (mirrors the future 3-way match)
const lbTol = (ordered: number) => Math.max(1, ordered * 0.02);
const priceTol = (rate: number) => Math.max(0.05, rate * 0.02);

const money = (n: number) =>
  '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const signedMoney = (n: number) => (n < 0 ? '−' : '+') + money(n);
const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;

const fmtDate = (iso: string | null) => {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// ---- per-PO computed figures --------------------------------------------
const orderedLb = (p: PO) => p.lines.reduce((a, l) => a + l.orderedLb, 0);
const orderedValue = (p: PO) => p.lines.reduce((a, l) => a + l.orderedLb * l.rate, 0);
const receivedLb = (p: PO) => p.lines.reduce((a, l) => a + (l.receivedLb ?? 0), 0);
const hasReceived = (p: PO) => p.lines.some((l) => l.receivedLb != null);
const hasInvoice = (p: PO) => !!p.invoiceNo;
const billedAmount = (p: PO) => p.lines.reduce((a, l) => a + (l.invLb ?? 0) * (l.invRate ?? 0), 0);
// what the invoice SHOULD be for what actually arrived, at the PO rate
const expectedBill = (p: PO) => p.lines.reduce((a, l) => a + (l.receivedLb ?? 0) * l.rate, 0);

interface Flag {
  label: string;
  severity: 'warn' | 'error';
}

const flagsFor = (p: PO): Flag[] => {
  const flags: Flag[] = [];
  p.lines.forEach((l) => {
    if (l.receivedLb != null) {
      const dLb = round1(l.receivedLb - l.orderedLb);
      if (Math.abs(dLb) > lbTol(l.orderedLb)) {
        flags.push({
          label: `${l.species}: weight ${dLb > 0 ? '+' : ''}${dLb.toFixed(1)} lb vs PO`,
          severity: 'error',
        });
      }
    }
    if (l.invRate != null) {
      const dR = round2(l.invRate - l.rate);
      if (Math.abs(dR) > priceTol(l.rate)) {
        flags.push({
          label: `${l.species}: rate ${dR > 0 ? '+' : ''}$${Math.abs(dR).toFixed(2)}/lb vs PO`,
          severity: 'error',
        });
      }
    }
    if (
      l.invLb != null &&
      l.receivedLb != null &&
      Math.abs(l.invLb - l.receivedLb) > lbTol(l.receivedLb)
    ) {
      flags.push({
        label: `${l.species}: billed ${l.invLb.toFixed(1)} lb ≠ received ${l.receivedLb.toFixed(1)} lb`,
        severity: 'error',
      });
    }
  });
  return flags;
};

// ---- shared styles --------------------------------------------------------
const inputStyle: React.CSSProperties = {
  fontFamily: "'Archivo', sans-serif",
  fontSize: '13px',
  border: '1px solid #D6DCE0',
  borderRadius: '5px',
  padding: '9px 12px',
  width: '100%',
  boxSizing: 'border-box',
  color: '#222A30',
  background: '#fff',
  outline: 'none',
};

const monoInput: React.CSSProperties = {
  ...inputStyle,
  fontFamily: "'IBM Plex Mono', monospace",
  textAlign: 'right',
};

const labelStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '0.06em',
  color: '#8A99A3',
  display: 'block',
  marginBottom: '6px',
};

const btnPrimary: React.CSSProperties = {
  fontFamily: "'Archivo', sans-serif",
  fontSize: '13px',
  fontWeight: 600,
  background: '#222A30',
  color: '#fff',
  border: 'none',
  borderRadius: '5px',
  padding: '10px 18px',
  cursor: 'pointer',
};

const btnGhost: React.CSSProperties = {
  fontFamily: "'Archivo', sans-serif",
  fontSize: '13px',
  fontWeight: 600,
  background: '#fff',
  color: '#5A6670',
  border: '1px solid #D6DCE0',
  borderRadius: '5px',
  padding: '10px 16px',
  cursor: 'pointer',
};

const GRID = '22px 96px 1.1fr 1.15fr 120px 130px 130px 110px 108px';
const GRID_GAP = '14px';

export default function PurchaseOrdersPage() {
  const [pos, setPos] = useState<PO[]>(SEED);
  const [filter, setFilter] = useState<'all' | PoStatus>('all');
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ p3: true });
  const [sel, setSel] = useState<DateSelection | null>(null);
  const [todayIso, setTodayIso] = useState('');

  // modals
  const [newOpen, setNewOpen] = useState(false);
  const [newForm, setNewForm] = useState({
    vendor: VENDORS[0],
    po: '',
    orderRef: '',
    orderDate: '',
    lines: [{ species: '', grade: 'A', lb: '', rate: '' }],
  });
  const [receiveFor, setReceiveFor] = useState<PO | null>(null);
  const [receiveDraft, setReceiveDraft] = useState<string[]>([]);
  const [invoiceFor, setInvoiceFor] = useState<PO | null>(null);
  const [invoiceDraft, setInvoiceDraft] = useState<{ no: string; lb: string[]; rate: string[] }>({
    no: '',
    lb: [],
    rate: [],
  });

  useEffect(() => {
    const d = new Date();
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    setTodayIso(iso);
    setNewForm((f) => ({ ...f, orderDate: iso }));
  }, []);

  const inRange = (p: PO) => !sel || (p.orderDate >= sel.start && p.orderDate <= sel.end);
  const dateFiltered = pos.filter(inRange);
  const filtered = dateFiltered.filter((p) => {
    if (filter !== 'all' && p.status !== filter) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      p.po.toLowerCase().includes(q) ||
      p.vendor.toLowerCase().includes(q) ||
      p.orderRef.toLowerCase().includes(q) ||
      (p.invoiceNo ?? '').toLowerCase().includes(q) ||
      p.lines.some((l) => l.species.toLowerCase().includes(q))
    );
  });

  const rangeLbl = sel ? selectionLabel(sel) : 'Last 30 days';
  const openPos = dateFiltered.filter((p) => p.status === 'open');
  const awaitingInvoice = dateFiltered.filter((p) => p.status === 'received' && !hasInvoice(p));
  const flagged = dateFiltered.filter((p) => flagsFor(p).length > 0 && p.status !== 'reconciled');
  const flaggedDollar = flagged.reduce(
    (a, p) => a + Math.abs(billedAmount(p) - expectedBill(p)),
    0
  );
  const settled = dateFiltered.filter((p) => p.status === 'reconciled');

  const toggle = (id: string) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const setStatus = (id: string, status: PoStatus) =>
    setPos((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));

  // ---- new PO ------------------------------------------------------------
  const newValid =
    newForm.po.trim() &&
    newForm.lines.length > 0 &&
    newForm.lines.every((l) => l.species.trim() && parseFloat(l.lb) > 0 && parseFloat(l.rate) > 0);

  const saveNew = () => {
    if (!newValid) return;
    const p: PO = {
      id: 'p' + Date.now(),
      po: newForm.po.trim().toUpperCase(),
      vendor: newForm.vendor,
      orderRef: newForm.orderRef.trim() || '—',
      orderDate: newForm.orderDate || todayIso,
      receivedDate: null,
      invoiceNo: null,
      invoiceDate: null,
      status: 'open',
      lines: newForm.lines.map((l) => ({
        species: l.species.trim(),
        grade: l.grade.trim() || '—',
        orderedLb: round1(parseFloat(l.lb)),
        rate: round2(parseFloat(l.rate)),
        receivedLb: null,
        invLb: null,
        invRate: null,
      })),
    };
    setPos((prev) => [p, ...prev]);
    setExpanded((prev) => ({ ...prev, [p.id]: true }));
    setNewOpen(false);
    setNewForm({
      vendor: VENDORS[0],
      po: '',
      orderRef: '',
      orderDate: todayIso,
      lines: [{ species: '', grade: 'A', lb: '', rate: '' }],
    });
  };

  // ---- record received ----------------------------------------------------
  const openReceive = (p: PO) => {
    setReceiveFor(p);
    setReceiveDraft(p.lines.map((l) => String(l.receivedLb ?? l.orderedLb)));
  };

  const saveReceive = () => {
    if (!receiveFor) return;
    setPos((prev) =>
      prev.map((p) =>
        p.id !== receiveFor.id
          ? p
          : {
              ...p,
              status: 'received',
              receivedDate: todayIso,
              lines: p.lines.map((l, i) => ({
                ...l,
                receivedLb: round1(parseFloat(receiveDraft[i]) || 0),
              })),
            }
      )
    );
    setReceiveFor(null);
  };

  // ---- record vendor invoice ----------------------------------------------
  const openInvoice = (p: PO) => {
    setInvoiceFor(p);
    setInvoiceDraft({
      no: p.invoiceNo ?? '',
      lb: p.lines.map((l) => String(l.invLb ?? l.receivedLb ?? l.orderedLb)),
      rate: p.lines.map((l) => String(l.invRate ?? l.rate)),
    });
  };

  const saveInvoice = () => {
    if (!invoiceFor || !invoiceDraft.no.trim()) return;
    setPos((prev) =>
      prev.map((p) =>
        p.id !== invoiceFor.id
          ? p
          : {
              ...p,
              invoiceNo: invoiceDraft.no.trim().toUpperCase(),
              invoiceDate: todayIso,
              lines: p.lines.map((l, i) => ({
                ...l,
                invLb: round1(parseFloat(invoiceDraft.lb[i]) || 0),
                invRate: round2(parseFloat(invoiceDraft.rate[i]) || 0),
              })),
            }
      )
    );
    setInvoiceFor(null);
  };

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
        {/* HEADER */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '-0.01em' }}>
              Purchase Orders
            </span>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.06em',
                color: '#8A5A14',
                background: '#F4EEE2',
                border: '1px solid #E4D2A8',
                borderRadius: '3px',
                padding: '3px 8px',
              }}
            >
              INTERNAL — never sent to vendors
            </span>
            <span
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '12px',
                color: '#8A99A3',
              }}
            >
              ordered → received → billed → variance
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search PO, vendor, invoice #…"
              style={{
                fontFamily: "'Archivo', sans-serif",
                fontSize: '13px',
                border: '1px solid #D6DCE0',
                borderRadius: '5px',
                padding: '8px 12px',
                width: '220px',
                outline: 'none',
                background: '#fff',
              }}
            />
            <button
              onClick={() => setNewOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                ...btnPrimary,
                padding: '9px 15px',
              }}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              New PO
            </button>
          </div>
        </header>

        {/* FILTER BAR */}
        <div
          style={{
            flex: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            padding: '10px 28px',
            borderBottom: '1px solid #E2E6E9',
            background: '#FFFFFF',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
              background: '#F4F5F6',
              border: '1px solid #E2E6E9',
              borderRadius: '5px',
              padding: '3px',
            }}
          >
            {(['all', 'open', 'received', 'reconciled', 'disputed'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  fontFamily: "'Archivo', sans-serif",
                  fontSize: '12px',
                  fontWeight: 600,
                  border: 'none',
                  borderRadius: '4px',
                  padding: '6px 12px',
                  cursor: 'pointer',
                  background: filter === f ? '#3F6F86' : 'none',
                  color: filter === f ? '#fff' : '#5A6670',
                }}
              >
                {f === 'all' ? 'All' : STATUS_META[f].label}
                {f !== 'all' && (
                  <span style={{ marginLeft: '6px', opacity: 0.75 }}>
                    {dateFiltered.filter((p) => p.status === f).length}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '11px',
                color: '#8A99A3',
              }}
            >
              {filtered.length} of {dateFiltered.length} in range
            </span>
            <DateRangeFilter defaultKey="last30" onChange={setSel} />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '22px 28px' }}>
          {/* KPI STRIP */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4,1fr)',
              gap: '14px',
              marginBottom: '20px',
            }}
          >
            {[
              {
                label: 'OPEN POs',
                value: String(openPos.length),
                sub: openPos.reduce((a, p) => a + orderedLb(p), 0).toFixed(0) + ' lb on order',
                accent: '#8A5A14',
                border: '#B7791F',
              },
              {
                label: 'AWAITING INVOICE',
                value: String(awaitingInvoice.length),
                sub: 'received, vendor bill not in yet',
                accent: '#2D5365',
                border: '#3F6F86',
              },
              {
                label: 'VARIANCE FLAGGED',
                value: String(flagged.length),
                sub: money(flaggedDollar) + ' in dispute exposure',
                accent: '#A5362C',
                border: '#C2453A',
              },
              {
                label: `RECONCILED · ${rangeLbl.toUpperCase()}`,
                value: String(settled.length),
                sub: 'closed clean in range',
                accent: '#2E6347',
                border: '#3F7D5B',
              },
            ].map((k) => (
              <div
                key={k.label}
                style={{
                  background: '#fff',
                  border: '1px solid #E2E6E9',
                  borderLeft: `3px solid ${k.border}`,
                  borderRadius: '8px',
                  padding: '16px 18px',
                }}
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
                    fontSize: '24px',
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

          {/* PO TABLE */}
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
                gridTemplateColumns: GRID,
                columnGap: GRID_GAP,
                alignItems: 'center',
                padding: '11px 18px',
                background: '#FAFBFB',
                borderBottom: '1px solid #E2E6E9',
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.07em',
                color: '#8A99A3',
              }}
            >
              <span></span>
              <span>PO #</span>
              <span>VENDOR</span>
              <span>SPECIES</span>
              <span style={{ textAlign: 'right' }}>ORDERED</span>
              <span style={{ textAlign: 'right' }}>RECEIVED</span>
              <span style={{ textAlign: 'right' }}>BILLED</span>
              <span style={{ textAlign: 'right' }}>VARIANCE $</span>
              <span>STATUS</span>
            </div>

            {filtered.map((p) => {
              const sm = STATUS_META[p.status];
              const isOpen = !!expanded[p.id];
              const flags = flagsFor(p);
              const dLb = hasReceived(p) ? round1(receivedLb(p) - orderedLb(p)) : null;
              const varDollar = hasInvoice(p) ? round2(billedAmount(p) - expectedBill(p)) : null;
              return (
                <div key={p.id} style={{ borderBottom: '1px solid #EDEFF1' }}>
                  {/* ROW */}
                  <div
                    onClick={() => toggle(p.id)}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: GRID,
                      columnGap: GRID_GAP,
                      alignItems: 'center',
                      padding: '13px 18px',
                      cursor: 'pointer',
                      background: isOpen ? '#FAFBFB' : 'transparent',
                      borderLeft: `3px solid ${sm.dot}`,
                    }}
                    onMouseOver={(e) => {
                      (e.currentTarget as HTMLElement).style.background = '#FAFBFB';
                    }}
                    onMouseOut={(e) => {
                      (e.currentTarget as HTMLElement).style.background = isOpen
                        ? '#FAFBFB'
                        : 'transparent';
                    }}
                  >
                    <span
                      style={{
                        display: 'inline-block',
                        fontSize: '11px',
                        color: '#8A99A3',
                        transition: 'transform 0.12s',
                        transform: `rotate(${isOpen ? 90 : 0}deg)`,
                      }}
                    >
                      ▸
                    </span>
                    <span
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: '13px',
                        fontWeight: 600,
                      }}
                    >
                      {p.po}
                    </span>
                    <span style={{ minWidth: 0 }}>
                      <span
                        style={{
                          display: 'block',
                          fontSize: '14px',
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {p.vendor}
                      </span>
                      <span
                        style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: '10px',
                          color: '#8A99A3',
                        }}
                      >
                        {p.orderRef} · {fmtDate(p.orderDate)}
                      </span>
                    </span>
                    <span style={{ minWidth: 0, display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {p.lines.slice(0, 2).map((l, i) => (
                        <span
                          key={i}
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: '#2D5365',
                            background: '#EEF3F6',
                            border: '1px solid #C5D8E2',
                            borderRadius: '3px',
                            padding: '2px 7px',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {l.species}
                        </span>
                      ))}
                      {p.lines.length > 2 && (
                        <span style={{ fontSize: '11px', color: '#8A99A3', alignSelf: 'center' }}>
                          +{p.lines.length - 2}
                        </span>
                      )}
                    </span>
                    {/* ORDERED */}
                    <span style={{ textAlign: 'right' }}>
                      <span
                        style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: '13px',
                          fontWeight: 600,
                        }}
                      >
                        {orderedLb(p).toFixed(1)} lb
                      </span>
                      <span
                        style={{
                          display: 'block',
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: '10px',
                          color: '#8A99A3',
                        }}
                      >
                        {money(orderedValue(p))}
                      </span>
                    </span>
                    {/* RECEIVED */}
                    <span style={{ textAlign: 'right' }}>
                      {hasReceived(p) ? (
                        <>
                          <span
                            style={{
                              fontFamily: "'IBM Plex Mono', monospace",
                              fontSize: '13px',
                              fontWeight: 600,
                            }}
                          >
                            {receivedLb(p).toFixed(1)} lb
                          </span>
                          <span
                            style={{
                              display: 'block',
                              fontFamily: "'IBM Plex Mono', monospace",
                              fontSize: '10px',
                              color:
                                dLb !== null && Math.abs(dLb) > lbTol(orderedLb(p))
                                  ? '#A5362C'
                                  : '#8A99A3',
                            }}
                          >
                            {dLb !== null && (dLb > 0 ? '+' : '') + dLb.toFixed(1) + ' lb'} ·{' '}
                            {fmtDate(p.receivedDate)}
                          </span>
                        </>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#B6BEC4' }}>not landed</span>
                      )}
                    </span>
                    {/* BILLED */}
                    <span style={{ textAlign: 'right' }}>
                      {hasInvoice(p) ? (
                        <>
                          <span
                            style={{
                              fontFamily: "'IBM Plex Mono', monospace",
                              fontSize: '13px',
                              fontWeight: 600,
                            }}
                          >
                            {money(billedAmount(p))}
                          </span>
                          <span
                            style={{
                              display: 'block',
                              fontFamily: "'IBM Plex Mono', monospace",
                              fontSize: '10px',
                              color: '#8A99A3',
                            }}
                          >
                            {p.invoiceNo}
                          </span>
                        </>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#B6BEC4' }}>no invoice</span>
                      )}
                    </span>
                    {/* VARIANCE $ */}
                    <span style={{ textAlign: 'right' }}>
                      {varDollar !== null ? (
                        <span
                          style={{
                            fontFamily: "'IBM Plex Mono', monospace",
                            fontSize: '13px',
                            fontWeight: 700,
                            color:
                              Math.abs(varDollar) < 0.01
                                ? '#3F7D5B'
                                : varDollar > 0
                                  ? '#A5362C'
                                  : '#B7791F',
                          }}
                        >
                          {Math.abs(varDollar) < 0.01 ? '$0.00' : signedMoney(varDollar)}
                        </span>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#B6BEC4' }}>—</span>
                      )}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '11px',
                          fontWeight: 600,
                          color: sm.color,
                          background: sm.bg,
                          borderRadius: '3px',
                          padding: '3px 9px',
                        }}
                      >
                        <span
                          style={{
                            width: '5px',
                            height: '5px',
                            borderRadius: '50%',
                            background: sm.dot,
                          }}
                        />
                        {sm.label}
                      </span>
                      {flags.length > 0 && p.status !== 'reconciled' && (
                        <span
                          title={flags.map((f) => f.label).join('\n')}
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            color: '#A5362C',
                            background: '#FBF0EF',
                            border: '1px solid #E3B6B1',
                            borderRadius: '3px',
                            padding: '2px 6px',
                          }}
                        >
                          {flags.length} ⚑
                        </span>
                      )}
                    </span>
                  </div>

                  {/* EXPANDED — line-level 3-way compare + actions */}
                  {isOpen && (
                    <div style={{ padding: '4px 18px 16px 54px', background: '#FAFBFB' }}>
                      <div
                        style={{
                          background: '#fff',
                          border: '1px solid #E2E6E9',
                          borderRadius: '6px',
                          overflow: 'hidden',
                          maxWidth: '860px',
                        }}
                      >
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1.2fr 90px 90px 80px 90px 90px 110px',
                            columnGap: '12px',
                            padding: '8px 14px',
                            background: '#FAFBFB',
                            borderBottom: '1px solid #E2E6E9',
                            fontSize: '9px',
                            fontWeight: 700,
                            letterSpacing: '0.06em',
                            color: '#8A99A3',
                          }}
                        >
                          <span>SPECIES · GRADE</span>
                          <span style={{ textAlign: 'right' }}>ORDERED LB</span>
                          <span style={{ textAlign: 'right' }}>RECEIVED LB</span>
                          <span style={{ textAlign: 'right' }}>PO $/LB</span>
                          <span style={{ textAlign: 'right' }}>INV $/LB</span>
                          <span style={{ textAlign: 'right' }}>INV LB</span>
                          <span style={{ textAlign: 'right' }}>BILLED $</span>
                        </div>
                        {p.lines.map((l, i) => {
                          const wBad =
                            l.receivedLb != null &&
                            Math.abs(l.receivedLb - l.orderedLb) > lbTol(l.orderedLb);
                          const rBad =
                            l.invRate != null && Math.abs(l.invRate - l.rate) > priceTol(l.rate);
                          return (
                            <div
                              key={i}
                              style={{
                                display: 'grid',
                                gridTemplateColumns: '1.2fr 90px 90px 80px 90px 90px 110px',
                                columnGap: '12px',
                                alignItems: 'center',
                                padding: '9px 14px',
                                borderBottom: '1px solid #EDEFF1',
                              }}
                            >
                              <span style={{ fontSize: '13px', fontWeight: 500 }}>
                                {l.species}
                                <span style={{ fontSize: '10px', color: '#8A99A3' }}>
                                  {' '}
                                  · {l.grade}
                                </span>
                              </span>
                              <span
                                style={{
                                  fontFamily: "'IBM Plex Mono', monospace",
                                  fontSize: '12px',
                                  textAlign: 'right',
                                }}
                              >
                                {l.orderedLb.toFixed(1)}
                              </span>
                              <span
                                style={{
                                  fontFamily: "'IBM Plex Mono', monospace",
                                  fontSize: '12px',
                                  textAlign: 'right',
                                  fontWeight: wBad ? 700 : 400,
                                  color: wBad ? '#A5362C' : '#222A30',
                                }}
                              >
                                {l.receivedLb != null ? l.receivedLb.toFixed(1) : '—'}
                              </span>
                              <span
                                style={{
                                  fontFamily: "'IBM Plex Mono', monospace",
                                  fontSize: '12px',
                                  color: '#5A6670',
                                  textAlign: 'right',
                                }}
                              >
                                {money(l.rate)}
                              </span>
                              <span
                                style={{
                                  fontFamily: "'IBM Plex Mono', monospace",
                                  fontSize: '12px',
                                  textAlign: 'right',
                                  fontWeight: rBad ? 700 : 400,
                                  color: rBad ? '#A5362C' : '#5A6670',
                                }}
                              >
                                {l.invRate != null ? money(l.invRate) : '—'}
                              </span>
                              <span
                                style={{
                                  fontFamily: "'IBM Plex Mono', monospace",
                                  fontSize: '12px',
                                  textAlign: 'right',
                                }}
                              >
                                {l.invLb != null ? l.invLb.toFixed(1) : '—'}
                              </span>
                              <span
                                style={{
                                  fontFamily: "'IBM Plex Mono', monospace",
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  textAlign: 'right',
                                }}
                              >
                                {l.invLb != null && l.invRate != null
                                  ? money(l.invLb * l.invRate)
                                  : '—'}
                              </span>
                            </div>
                          );
                        })}
                        {/* totals + expected-vs-billed */}
                        {hasInvoice(p) && (
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '14px',
                              padding: '9px 14px',
                              background: '#FAFBFB',
                            }}
                          >
                            <span style={{ fontSize: '11px', fontWeight: 600, color: '#5A6670' }}>
                              Should be {money(expectedBill(p))} for what landed (PO rates) — billed{' '}
                              {money(billedAmount(p))}
                            </span>
                            <span
                              style={{
                                fontFamily: "'IBM Plex Mono', monospace",
                                fontSize: '13px',
                                fontWeight: 700,
                                color:
                                  Math.abs(billedAmount(p) - expectedBill(p)) < 0.01
                                    ? '#3F7D5B'
                                    : '#A5362C',
                              }}
                            >
                              Δ {signedMoney(round2(billedAmount(p) - expectedBill(p)))}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* flags */}
                      {flags.length > 0 && (
                        <div
                          style={{
                            display: 'flex',
                            gap: '8px',
                            flexWrap: 'wrap',
                            marginTop: '10px',
                            maxWidth: '860px',
                          }}
                        >
                          {flags.map((f, i) => (
                            <span
                              key={i}
                              style={{
                                fontSize: '11px',
                                fontWeight: 600,
                                color: '#A5362C',
                                background: '#FBF0EF',
                                border: '1px solid #E3B6B1',
                                borderRadius: '4px',
                                padding: '4px 10px',
                              }}
                            >
                              ⚑ {f.label}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* actions by lifecycle */}
                      <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                        {p.status === 'open' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openReceive(p);
                            }}
                            style={{ ...btnPrimary, padding: '8px 14px', fontSize: '12px' }}
                          >
                            Record received
                          </button>
                        )}
                        {p.status === 'received' && !hasInvoice(p) && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openInvoice(p);
                              }}
                              style={{ ...btnPrimary, padding: '8px 14px', fontSize: '12px' }}
                            >
                              Record vendor invoice
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openReceive(p);
                              }}
                              style={{ ...btnGhost, padding: '8px 14px', fontSize: '12px' }}
                            >
                              Edit received
                            </button>
                          </>
                        )}
                        {p.status === 'received' && hasInvoice(p) && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setStatus(p.id, 'reconciled');
                              }}
                              style={{
                                ...btnPrimary,
                                background: '#3F7D5B',
                                padding: '8px 14px',
                                fontSize: '12px',
                              }}
                            >
                              ✓ Mark reconciled
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setStatus(p.id, 'disputed');
                              }}
                              style={{
                                ...btnGhost,
                                color: '#A5362C',
                                border: '1px solid #E3B6B1',
                                padding: '8px 14px',
                                fontSize: '12px',
                              }}
                            >
                              Dispute with vendor
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openInvoice(p);
                              }}
                              style={{ ...btnGhost, padding: '8px 14px', fontSize: '12px' }}
                            >
                              Edit invoice
                            </button>
                          </>
                        )}
                        {p.status === 'disputed' && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setStatus(p.id, 'reconciled');
                              }}
                              style={{
                                ...btnPrimary,
                                background: '#3F7D5B',
                                padding: '8px 14px',
                                fontSize: '12px',
                              }}
                            >
                              ✓ Resolved — mark reconciled
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openInvoice(p);
                              }}
                              style={{ ...btnGhost, padding: '8px 14px', fontSize: '12px' }}
                            >
                              Edit invoice
                            </button>
                          </>
                        )}
                        {p.status === 'reconciled' && (
                          <span
                            style={{
                              fontSize: '12px',
                              color: '#2E6347',
                              fontWeight: 600,
                              alignSelf: 'center',
                            }}
                          >
                            ✓ Closed clean · {fmtDate(p.invoiceDate)}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {filtered.length === 0 && (
              <div
                style={{
                  padding: '28px 18px',
                  textAlign: 'center',
                  fontSize: '13px',
                  color: '#8A99A3',
                }}
              >
                No POs in this range. Widen the date filter or clear the search.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* NEW PO MODAL */}
      {newOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(34,42,48,0.40)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 60,
          }}
          onClick={() => setNewOpen(false)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '10px',
              padding: '26px',
              width: '560px',
              maxWidth: '94vw',
              maxHeight: '88vh',
              overflowY: 'auto',
              boxShadow: '0 16px 48px rgba(34,42,48,0.22)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                fontSize: '16px',
                fontWeight: 700,
                letterSpacing: '-0.01em',
                marginBottom: '4px',
              }}
            >
              New purchase order
            </div>
            <div style={{ fontSize: '12px', color: '#8A99A3', marginBottom: '18px' }}>
              Internal record of what we expect from the vendor — used to reconcile the shipment and
              invoice against.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={labelStyle}>VENDOR *</label>
                <select
                  style={{ ...inputStyle, cursor: 'pointer' }}
                  value={newForm.vendor}
                  onChange={(e) => setNewForm((f) => ({ ...f, vendor: e.target.value }))}
                >
                  {VENDORS.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>PO # *</label>
                <input
                  style={{
                    ...inputStyle,
                    fontFamily: "'IBM Plex Mono', monospace",
                    textTransform: 'uppercase',
                  }}
                  placeholder="PO-1045"
                  value={newForm.po}
                  onChange={(e) => setNewForm((f) => ({ ...f, po: e.target.value }))}
                />
              </div>
              <div>
                <label style={labelStyle}>LINKED ORDER (optional)</label>
                <input
                  style={{ ...inputStyle, fontFamily: "'IBM Plex Mono', monospace" }}
                  placeholder="ORD-2213"
                  value={newForm.orderRef}
                  onChange={(e) => setNewForm((f) => ({ ...f, orderRef: e.target.value }))}
                />
              </div>
              <div>
                <label style={labelStyle}>ORDER DATE</label>
                <input
                  type="date"
                  style={{ ...inputStyle, fontFamily: "'IBM Plex Mono', monospace" }}
                  value={newForm.orderDate}
                  onChange={(e) => setNewForm((f) => ({ ...f, orderDate: e.target.value }))}
                />
              </div>
            </div>

            <div style={{ marginTop: '16px' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 64px 84px 92px 28px',
                  gap: '8px',
                  fontSize: '10px',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  color: '#8A99A3',
                  marginBottom: '7px',
                }}
              >
                <span>SPECIES</span>
                <span>GRADE</span>
                <span>LB</span>
                <span>RATE $/LB</span>
                <span></span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                {newForm.lines.map((l, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 64px 84px 92px 28px',
                      gap: '8px',
                      alignItems: 'center',
                    }}
                  >
                    <input
                      style={{ ...inputStyle, padding: '8px 10px' }}
                      placeholder="Ahi Tuna"
                      value={l.species}
                      onChange={(e) =>
                        setNewForm((f) => ({
                          ...f,
                          lines: f.lines.map((x, j) =>
                            j === i ? { ...x, species: e.target.value } : x
                          ),
                        }))
                      }
                    />
                    <input
                      style={{ ...inputStyle, padding: '8px 9px' }}
                      placeholder="A+"
                      value={l.grade}
                      onChange={(e) =>
                        setNewForm((f) => ({
                          ...f,
                          lines: f.lines.map((x, j) =>
                            j === i ? { ...x, grade: e.target.value } : x
                          ),
                        }))
                      }
                    />
                    <input
                      style={{ ...monoInput, padding: '8px 9px' }}
                      placeholder="250"
                      value={l.lb}
                      onChange={(e) =>
                        setNewForm((f) => ({
                          ...f,
                          lines: f.lines.map((x, j) =>
                            j === i ? { ...x, lb: e.target.value.replace(/[^\d.]/g, '') } : x
                          ),
                        }))
                      }
                    />
                    <input
                      style={{ ...monoInput, padding: '8px 9px' }}
                      placeholder="18.50"
                      value={l.rate}
                      onChange={(e) =>
                        setNewForm((f) => ({
                          ...f,
                          lines: f.lines.map((x, j) =>
                            j === i ? { ...x, rate: e.target.value.replace(/[^\d.]/g, '') } : x
                          ),
                        }))
                      }
                    />
                    <button
                      onClick={() =>
                        setNewForm((f) => ({ ...f, lines: f.lines.filter((_, j) => j !== i) }))
                      }
                      disabled={newForm.lines.length === 1}
                      style={{
                        width: '26px',
                        height: '32px',
                        border: '1px solid #E2E6E9',
                        borderRadius: '5px',
                        background: '#fff',
                        color: newForm.lines.length === 1 ? '#D6DCE0' : '#8A99A3',
                        cursor: newForm.lines.length === 1 ? 'default' : 'pointer',
                        fontSize: '14px',
                        lineHeight: 1,
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={() =>
                  setNewForm((f) => ({
                    ...f,
                    lines: [...f.lines, { species: '', grade: 'A', lb: '', rate: '' }],
                  }))
                }
                style={{
                  marginTop: '9px',
                  fontFamily: "'Archivo', sans-serif",
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#3F6F86',
                  background: 'none',
                  border: '1px dashed #C5D8E2',
                  borderRadius: '5px',
                  padding: '8px 14px',
                  cursor: 'pointer',
                }}
              >
                + Add species line
              </button>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
                marginTop: '20px',
              }}
            >
              <button onClick={() => setNewOpen(false)} style={btnGhost}>
                Cancel
              </button>
              <button
                onClick={saveNew}
                disabled={!newValid}
                style={{
                  ...btnPrimary,
                  background: newValid ? '#222A30' : '#E2E6E9',
                  color: newValid ? '#fff' : '#A6AEB4',
                  cursor: newValid ? 'pointer' : 'default',
                }}
              >
                Create PO
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECORD RECEIVED MODAL */}
      {receiveFor && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(34,42,48,0.40)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 60,
          }}
          onClick={() => setReceiveFor(null)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '10px',
              padding: '26px',
              width: '440px',
              maxWidth: '94vw',
              boxShadow: '0 16px 48px rgba(34,42,48,0.22)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>
              Record received — {receiveFor.po}
            </div>
            <div style={{ fontSize: '12px', color: '#8A99A3', marginBottom: '16px' }}>
              Actual landed weight per line (from the packing list / scale).
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {receiveFor.lines.map((l, i) => (
                <div
                  key={i}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 110px',
                    gap: '10px',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: '13px', fontWeight: 500 }}>
                    {l.species}{' '}
                    <span style={{ fontSize: '10px', color: '#8A99A3' }}>
                      · ordered {l.orderedLb.toFixed(1)} lb
                    </span>
                  </span>
                  <input
                    style={monoInput}
                    value={receiveDraft[i] ?? ''}
                    onChange={(e) =>
                      setReceiveDraft((d) =>
                        d.map((v, j) => (j === i ? e.target.value.replace(/[^\d.]/g, '') : v))
                      )
                    }
                  />
                </div>
              ))}
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
                marginTop: '20px',
              }}
            >
              <button onClick={() => setReceiveFor(null)} style={btnGhost}>
                Cancel
              </button>
              <button onClick={saveReceive} style={btnPrimary}>
                Save received
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECORD INVOICE MODAL */}
      {invoiceFor && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(34,42,48,0.40)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 60,
          }}
          onClick={() => setInvoiceFor(null)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '10px',
              padding: '26px',
              width: '520px',
              maxWidth: '94vw',
              boxShadow: '0 16px 48px rgba(34,42,48,0.22)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>
              Record vendor invoice — {invoiceFor.po}
            </div>
            <div style={{ fontSize: '12px', color: '#8A99A3', marginBottom: '16px' }}>
              From the vendor&apos;s commercial invoice. Variances against the PO compute
              automatically.
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>VENDOR INVOICE # *</label>
              <input
                style={{
                  ...inputStyle,
                  fontFamily: "'IBM Plex Mono', monospace",
                  textTransform: 'uppercase',
                }}
                placeholder="KFC-8812"
                value={invoiceDraft.no}
                onChange={(e) => setInvoiceDraft((d) => ({ ...d, no: e.target.value }))}
              />
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 100px 100px',
                gap: '8px',
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.06em',
                color: '#8A99A3',
                marginBottom: '7px',
              }}
            >
              <span>SPECIES</span>
              <span style={{ textAlign: 'right' }}>INVOICE LB</span>
              <span style={{ textAlign: 'right' }}>INV $/LB</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {invoiceFor.lines.map((l, i) => (
                <div
                  key={i}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 100px 100px',
                    gap: '8px',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: '13px', fontWeight: 500 }}>
                    {l.species}{' '}
                    <span style={{ fontSize: '10px', color: '#8A99A3' }}>
                      · PO {money(l.rate)}/lb
                    </span>
                  </span>
                  <input
                    style={monoInput}
                    value={invoiceDraft.lb[i] ?? ''}
                    onChange={(e) =>
                      setInvoiceDraft((d) => ({
                        ...d,
                        lb: d.lb.map((v, j) =>
                          j === i ? e.target.value.replace(/[^\d.]/g, '') : v
                        ),
                      }))
                    }
                  />
                  <input
                    style={monoInput}
                    value={invoiceDraft.rate[i] ?? ''}
                    onChange={(e) =>
                      setInvoiceDraft((d) => ({
                        ...d,
                        rate: d.rate.map((v, j) =>
                          j === i ? e.target.value.replace(/[^\d.]/g, '') : v
                        ),
                      }))
                    }
                  />
                </div>
              ))}
            </div>
            {/* live total */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: '14px',
                background: '#F4F5F6',
                border: '1px solid #E2E6E9',
                borderRadius: '6px',
                padding: '10px 14px',
              }}
            >
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#5A6670' }}>
                Invoice total
              </span>
              <span
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '14px',
                  fontWeight: 700,
                }}
              >
                {money(
                  invoiceFor.lines.reduce(
                    (a, _, i) =>
                      a +
                      (parseFloat(invoiceDraft.lb[i]) || 0) *
                        (parseFloat(invoiceDraft.rate[i]) || 0),
                    0
                  )
                )}
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
                marginTop: '18px',
              }}
            >
              <button onClick={() => setInvoiceFor(null)} style={btnGhost}>
                Cancel
              </button>
              <button
                onClick={saveInvoice}
                disabled={!invoiceDraft.no.trim()}
                style={{
                  ...btnPrimary,
                  background: invoiceDraft.no.trim() ? '#222A30' : '#E2E6E9',
                  color: invoiceDraft.no.trim() ? '#fff' : '#A6AEB4',
                  cursor: invoiceDraft.no.trim() ? 'pointer' : 'default',
                }}
              >
                Save invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
