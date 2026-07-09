'use client';

import { useState } from 'react';
import Nav from '../components/Nav';

type Channel = 'email' | 'text' | 'voicemail' | 'pdf';
type Conf = 'high' | 'med' | 'low' | 'new';
type MsgStatus = 'needs_review' | 'accepted' | 'rejected';

interface ParsedLine {
  id: number;
  species: string;
  qty: number;
  conf: Conf;
  known: boolean; // species matches the SKU catalog
}

interface Msg {
  id: string;
  channel: Channel;
  from: string; // customer name as it appears
  contact: string; // email / phone
  received: string; // display
  subject: string;
  raw: string; // the message as it arrived
  customer: string | null; // matched customer, null = unknown/new
  customerConf: Conf;
  lines: ParsedLine[];
  shipDate: string; // display
  shipConf: Conf;
  overall: Conf;
  status: MsgStatus;
  orderCode?: string;
}

const KNOWN_CUSTOMERS = ['Nobu', 'Morimoto', "Roy's", "Alan Wong's", 'Blue Marine', "Tiki's Grill"];
const KNOWN_SPECIES = [
  'Ahi Tuna',
  'Ono',
  'Salmon',
  'Hamachi',
  'Kanpachi',
  'Mahi-Mahi',
  'Yellowfin Tuna',
  'Bigeye Tuna',
];

const SEED: Msg[] = [
  {
    id: 'm1',
    channel: 'email',
    from: 'Nobu',
    contact: 'orders@nobu-sf.com',
    received: 'Today · 07:41',
    subject: 'Thursday order',
    raw: `Hi team,\n\nFor Thursday delivery please send:\n- 300 lb ahi tuna A+\n- 100 lb ono\n\nSame air cargo as usual. Thanks!\n— Chef de cuisine, Nobu`,
    customer: 'Nobu',
    customerConf: 'high',
    lines: [
      { id: 1, species: 'Ahi Tuna', qty: 300, conf: 'high', known: true },
      { id: 2, species: 'Ono', qty: 100, conf: 'high', known: true },
    ],
    shipDate: 'Thu · Jul 9',
    shipConf: 'high',
    overall: 'high',
    status: 'needs_review',
  },
  {
    id: 'm2',
    channel: 'text',
    from: 'Blue Marine',
    contact: '(310) 555-0148',
    received: 'Today · 07:20',
    subject: 'SMS',
    raw: `2 boxes ono + 1 box salmon, pickup thurs am gold coast truck`,
    customer: 'Blue Marine',
    customerConf: 'high',
    lines: [
      { id: 1, species: 'Ono', qty: 2, conf: 'med', known: true }, // "boxes" not lb — needs confirm
      { id: 2, species: 'Salmon', qty: 1, conf: 'med', known: true },
    ],
    shipDate: 'Thu · Jul 9',
    shipConf: 'med',
    overall: 'med',
    status: 'needs_review',
  },
  {
    id: 'm3',
    channel: 'email',
    from: 'Kaz Bistro',
    contact: 'kaz.orders@gmail.com',
    received: 'Today · 06:58',
    subject: 'new account — first order',
    raw: `Hello, we're a new restaurant in the Mission. Would like to start ordering.\nThis week: 40 lbs of your best tuna and about 25 lbs hamachi if available.\nDelivery Friday. — Kaz`,
    customer: null, // not in the system
    customerConf: 'new',
    lines: [
      { id: 1, species: 'Ahi Tuna', qty: 40, conf: 'med', known: true },
      { id: 2, species: 'Hamachi', qty: 25, conf: 'high', known: true },
    ],
    shipDate: 'Fri · Jul 10',
    shipConf: 'high',
    overall: 'med',
    status: 'needs_review',
  },
  {
    id: 'm4',
    channel: 'voicemail',
    from: "Roy's",
    contact: '(650) 555-0190',
    received: 'Today · 06:30',
    subject: 'Voicemail transcript',
    raw: `"Hey it's the kitchen at Roy's, uh we need the usual ono, maybe 75 pounds, and can you throw in some kanbachi belly if you got it. Thursday's fine. Thanks."`,
    customer: "Roy's",
    customerConf: 'high',
    lines: [
      { id: 1, species: 'Ono', qty: 75, conf: 'high', known: true },
      { id: 2, species: 'Kanpachi', qty: 0, conf: 'low', known: true }, // "kanbachi belly" — qty unclear, spelling off
    ],
    shipDate: 'Thu · Jul 9',
    shipConf: 'med',
    overall: 'low',
    status: 'needs_review',
  },
  {
    id: 'm5',
    channel: 'email',
    from: 'Morimoto',
    contact: 'purchasing@morimoto.com',
    received: 'Today · 06:05',
    subject: 'Fri',
    raw: `Salmon 60 lb, hamachi 24 lb — Friday. Thanks`,
    customer: 'Morimoto',
    customerConf: 'high',
    lines: [
      { id: 1, species: 'Salmon', qty: 60, conf: 'high', known: true },
      { id: 2, species: 'Hamachi', qty: 24, conf: 'high', known: true },
    ],
    shipDate: 'Fri · Jul 10',
    shipConf: 'high',
    overall: 'high',
    status: 'accepted',
    orderCode: 'ORD-2214',
  },
];

const CHANNEL_META: Record<Channel, { label: string; icon: React.ReactNode }> = {
  email: {
    label: 'Email',
    icon: (
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M4 6l8 6 8-6" />
      </svg>
    ),
  },
  text: {
    label: 'Text',
    icon: (
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      </svg>
    ),
  },
  voicemail: {
    label: 'Voicemail',
    icon: (
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="6" cy="14" r="4" />
        <circle cx="18" cy="14" r="4" />
        <line x1="6" y1="18" x2="18" y2="18" />
      </svg>
    ),
  },
  pdf: {
    label: 'PDF',
    icon: (
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 2.5h9l4 4V21.5H6z" />
        <path d="M15 2.5v4h4" />
      </svg>
    ),
  },
};

const confMeta = (c: Conf) =>
  ({
    high: { label: 'High confidence', color: '#2E6347', bg: '#EAF1ED', dot: '#3F7D5B' },
    med: { label: 'Needs a look', color: '#8A5A14', bg: '#F4EEE2', dot: '#B7791F' },
    low: { label: 'Low — verify', color: '#A5362C', bg: '#FBF0EF', dot: '#C2453A' },
    new: { label: 'New customer', color: '#2D5365', bg: '#EEF3F6', dot: '#3F6F86' },
  })[c];

export default function OrderInboxPage() {
  const [messages, setMessages] = useState<Msg[]>(SEED);
  const [selectedId, setSelectedId] = useState<string>('m1');
  const [filter, setFilter] = useState<'inbox' | 'accepted' | 'rejected'>('inbox');
  const [customerEdit, setCustomerEdit] = useState(false);

  const sel = messages.find((m) => m.id === selectedId) || null;

  const visible = messages.filter((m) =>
    filter === 'inbox' ? m.status === 'needs_review' : m.status === filter
  );

  const needsReview = messages.filter((m) => m.status === 'needs_review');
  const attention = needsReview.filter((m) => m.overall !== 'high' || m.customerConf === 'new');
  const acceptedToday = messages.filter((m) => m.status === 'accepted');

  const patch = (id: string, p: Partial<Msg>) =>
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...p } : m)));

  const patchLine = (id: string, lineId: number, p: Partial<ParsedLine>) =>
    setMessages((prev) =>
      prev.map((m) =>
        m.id === id
          ? { ...m, lines: m.lines.map((l) => (l.id === lineId ? { ...l, ...p } : l)) }
          : m
      )
    );

  const removeLine = (id: string, lineId: number) =>
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, lines: m.lines.filter((l) => l.id !== lineId) } : m))
    );

  const addLine = (id: string) =>
    setMessages((prev) =>
      prev.map((m) =>
        m.id === id
          ? {
              ...m,
              lines: [
                ...m.lines,
                { id: Date.now(), species: '', qty: 0, conf: 'high', known: true },
              ],
            }
          : m
      )
    );

  const canAccept = (m: Msg) =>
    (m.customer !== null || m.customerConf === 'new') &&
    m.lines.some((l) => l.species && l.qty > 0);

  const accept = (m: Msg) => {
    if (!canAccept(m)) return;
    const code = 'ORD-' + (2214 + acceptedToday.length + 1);
    patch(m.id, { status: 'accepted', orderCode: code });
  };
  const reject = (m: Msg) => patch(m.id, { status: 'rejected' });

  // ---- styles ----
  const smallInput: React.CSSProperties = {
    fontFamily: "'Archivo', sans-serif",
    fontSize: '13px',
    border: '1px solid #D6DCE0',
    borderRadius: '5px',
    padding: '7px 9px',
    outline: 'none',
    background: '#fff',
    color: '#222A30',
    boxSizing: 'border-box',
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
              Order Inbox
            </span>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.06em',
                color: '#2D5365',
                background: '#EEF3F6',
                border: '1px solid #C5D8E2',
                borderRadius: '3px',
                padding: '3px 8px',
              }}
            >
              AI-PARSED · REVIEW BEFORE THE BOARD
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                color: '#2E6347',
                background: '#EAF1ED',
                borderRadius: '20px',
                padding: '5px 12px',
              }}
            >
              <span
                style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#3F7D5B' }}
              />
              Order Pilot · watching orders@essentialoceanfoods.com
            </span>
          </div>
        </header>

        {/* KPI STRIP */}
        <div
          style={{
            flex: 'none',
            display: 'grid',
            gridTemplateColumns: 'repeat(4,1fr)',
            gap: '14px',
            padding: '16px 28px',
            borderBottom: '1px solid #E2E6E9',
            background: '#FFFFFF',
          }}
        >
          {[
            {
              label: 'AWAITING REVIEW',
              value: String(needsReview.length),
              sub: 'parsed, not yet accepted',
              border: '#3F6F86',
              accent: '#222A30',
            },
            {
              label: 'NEEDS ATTENTION',
              value: String(attention.length),
              sub: 'low confidence or new customer',
              border: '#B7791F',
              accent: '#8A5A14',
            },
            {
              label: 'ACCEPTED TODAY',
              value: String(acceptedToday.length),
              sub: 'now on the board',
              border: '#3F7D5B',
              accent: '#2E6347',
            },
            {
              label: 'AUTO-PARSE RATE',
              value: '92%',
              sub: 'fields read without edits (30d)',
              border: '#8A99A3',
              accent: '#5A6670',
            },
          ].map((k) => (
            <div
              key={k.label}
              style={{
                background: '#fff',
                border: '1px solid #E2E6E9',
                borderLeft: `3px solid ${k.border}`,
                borderRadius: '8px',
                padding: '14px 16px',
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
                  fontSize: '22px',
                  fontWeight: 600,
                  color: k.accent,
                  marginTop: '6px',
                }}
              >
                {k.value}
              </div>
              <div style={{ fontSize: '11px', color: '#5A6670', marginTop: '3px' }}>{k.sub}</div>
            </div>
          ))}
        </div>

        {/* TWO-PANE */}
        <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>
          {/* LIST */}
          <div
            style={{
              width: '340px',
              flex: 'none',
              display: 'flex',
              flexDirection: 'column',
              borderRight: '1px solid #E2E6E9',
              background: '#fff',
              minHeight: 0,
            }}
          >
            <div
              style={{
                flex: 'none',
                display: 'flex',
                gap: '2px',
                padding: '10px 12px',
                borderBottom: '1px solid #E2E6E9',
              }}
            >
              {(['inbox', 'accepted', 'rejected'] as const).map((f) => (
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
                  {f === 'inbox'
                    ? `Inbox (${needsReview.length})`
                    : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {visible.map((m) => {
                const cm = confMeta(m.overall);
                const on = m.id === selectedId;
                return (
                  <div
                    key={m.id}
                    onClick={() => {
                      setSelectedId(m.id);
                      setCustomerEdit(false);
                    }}
                    style={{
                      padding: '12px 14px',
                      borderBottom: '1px solid #EDEFF1',
                      borderLeft: `3px solid ${on ? '#3F6F86' : 'transparent'}`,
                      background: on ? '#F4F8FA' : 'transparent',
                      cursor: 'pointer',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                      }}
                    >
                      <span
                        style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 }}
                      >
                        <span style={{ color: '#8A99A3', flex: 'none' }}>
                          {CHANNEL_META[m.channel].icon}
                        </span>
                        <span
                          style={{
                            fontSize: '14px',
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {m.customer ?? m.from}
                        </span>
                      </span>
                      <span
                        style={{
                          flex: 'none',
                          width: '7px',
                          height: '7px',
                          borderRadius: '50%',
                          background: cm.dot,
                        }}
                        title={cm.label}
                      />
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        color: '#5A6670',
                        marginTop: '4px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {m.lines.map((l) => `${l.qty || '?'} ${l.species || '—'}`).join(', ')}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginTop: '5px',
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: '10px',
                          color: '#8A99A3',
                        }}
                      >
                        {CHANNEL_META[m.channel].label} · {m.received}
                      </span>
                      {m.customerConf === 'new' && (
                        <span
                          style={{
                            fontSize: '9px',
                            fontWeight: 700,
                            color: '#2D5365',
                            background: '#EEF3F6',
                            border: '1px solid #C5D8E2',
                            borderRadius: '2px',
                            padding: '1px 5px',
                          }}
                        >
                          NEW
                        </span>
                      )}
                      {m.status === 'accepted' && (
                        <span style={{ fontSize: '9px', fontWeight: 700, color: '#2E6347' }}>
                          ✓ {m.orderCode}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              {visible.length === 0 && (
                <div
                  style={{
                    padding: '24px 14px',
                    fontSize: '13px',
                    color: '#8A99A3',
                    textAlign: 'center',
                  }}
                >
                  Nothing here.
                </div>
              )}
            </div>
          </div>

          {/* DETAIL */}
          <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', background: '#F4F5F6' }}>
            {!sel ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#8A99A3' }}>
                Select a message.
              </div>
            ) : (
              <div
                style={{
                  maxWidth: '900px',
                  margin: '0 auto',
                  padding: '24px 28px',
                  display: 'flex',
                  gap: '22px',
                  alignItems: 'flex-start',
                }}
              >
                {/* RAW MESSAGE */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                      color: '#8A99A3',
                      marginBottom: '8px',
                    }}
                  >
                    AS RECEIVED
                  </div>
                  <div
                    style={{
                      background: '#fff',
                      border: '1px solid #E2E6E9',
                      borderRadius: '8px',
                      padding: '16px 18px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        paddingBottom: '10px',
                        borderBottom: '1px solid #EDEFF1',
                        marginBottom: '12px',
                      }}
                    >
                      <span style={{ color: '#5A6670' }}>{CHANNEL_META[sel.channel].icon}</span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: 600 }}>{sel.from}</div>
                        <div
                          style={{
                            fontFamily: "'IBM Plex Mono', monospace",
                            fontSize: '11px',
                            color: '#8A99A3',
                          }}
                        >
                          {sel.contact} · {sel.received}
                        </div>
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        fontWeight: 700,
                        color: '#5A6670',
                        marginBottom: '6px',
                      }}
                    >
                      {sel.subject}
                    </div>
                    <pre
                      style={{
                        fontFamily: "'Archivo', sans-serif",
                        fontSize: '13px',
                        lineHeight: 1.55,
                        color: '#222A30',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        margin: 0,
                      }}
                    >
                      {sel.raw}
                    </pre>
                  </div>
                  <div
                    style={{
                      fontSize: '11px',
                      color: '#8A99A3',
                      marginTop: '10px',
                      lineHeight: 1.5,
                    }}
                  >
                    The parser reads this message and fills the draft on the right. Every field is
                    editable — accept only once it&apos;s right. Highlighted fields are
                    low-confidence and need a look.
                  </div>
                </div>

                {/* PARSED DRAFT */}
                <div style={{ width: '400px', flex: 'none' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '8px',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        letterSpacing: '0.06em',
                        color: '#8A99A3',
                      }}
                    >
                      PARSED DRAFT ORDER
                    </span>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        fontSize: '10px',
                        fontWeight: 700,
                        color: confMeta(sel.overall).color,
                        background: confMeta(sel.overall).bg,
                        borderRadius: '3px',
                        padding: '2px 8px',
                      }}
                    >
                      <span
                        style={{
                          width: '5px',
                          height: '5px',
                          borderRadius: '50%',
                          background: confMeta(sel.overall).dot,
                        }}
                      />
                      {confMeta(sel.overall).label}
                    </span>
                  </div>

                  <div
                    style={{
                      background: '#fff',
                      border: '1px solid #E2E6E9',
                      borderRadius: '8px',
                      padding: '16px 18px',
                    }}
                  >
                    {/* customer */}
                    <div style={{ marginBottom: '14px' }}>
                      <div
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          letterSpacing: '0.05em',
                          color: '#8A99A3',
                          marginBottom: '5px',
                        }}
                      >
                        CUSTOMER
                      </div>
                      {sel.customerConf === 'new' && !customerEdit ? (
                        <div
                          style={{
                            background: '#EEF3F6',
                            border: '1px solid #C5D8E2',
                            borderRadius: '6px',
                            padding: '10px 12px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                            <span style={{ fontSize: '14px', fontWeight: 600 }}>{sel.from}</span>
                            <span
                              style={{
                                fontSize: '9px',
                                fontWeight: 700,
                                color: '#2D5365',
                                background: '#fff',
                                border: '1px solid #C5D8E2',
                                borderRadius: '2px',
                                padding: '1px 6px',
                              }}
                            >
                              NOT IN SYSTEM
                            </span>
                          </div>
                          <div style={{ fontSize: '11px', color: '#5A7A8A', marginTop: '4px' }}>
                            Will be created with standard pricing on accept, or pick an existing
                            customer.
                          </div>
                          <button
                            onClick={() => setCustomerEdit(true)}
                            style={{
                              marginTop: '8px',
                              fontFamily: "'Archivo', sans-serif",
                              fontSize: '11px',
                              fontWeight: 600,
                              color: '#3F6F86',
                              background: '#fff',
                              border: '1px solid #C5D8E2',
                              borderRadius: '4px',
                              padding: '5px 10px',
                              cursor: 'pointer',
                            }}
                          >
                            Match to existing customer
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <select
                            value={sel.customer ?? ''}
                            onChange={(e) =>
                              patch(sel.id, {
                                customer: e.target.value || null,
                                customerConf: e.target.value ? 'high' : 'new',
                              })
                            }
                            style={{
                              ...smallInput,
                              flex: 1,
                              cursor: 'pointer',
                              fontWeight: 600,
                              fontSize: '14px',
                            }}
                          >
                            <option value="">— new / unmatched —</option>
                            {KNOWN_CUSTOMERS.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                          {sel.customerConf !== 'high' && sel.customer && (
                            <span
                              title="Matched with medium confidence"
                              style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                background: confMeta(sel.customerConf).dot,
                                flex: 'none',
                              }}
                            />
                          )}
                        </div>
                      )}
                    </div>

                    {/* lines */}
                    <div
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        letterSpacing: '0.05em',
                        color: '#8A99A3',
                        marginBottom: '6px',
                      }}
                    >
                      ITEMS
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                      {sel.lines.map((l) => {
                        const cm = confMeta(l.conf);
                        const flag = l.conf === 'low' || l.conf === 'med' || !l.known || l.qty <= 0;
                        return (
                          <div
                            key={l.id}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr 66px 24px',
                              gap: '7px',
                              alignItems: 'center',
                              padding: '7px 8px',
                              borderRadius: '6px',
                              border: `1px solid ${flag ? '#E4D2A8' : '#E2E6E9'}`,
                              background: flag ? '#FDFAF3' : '#fff',
                            }}
                          >
                            <span style={{ minWidth: 0 }}>
                              <select
                                value={KNOWN_SPECIES.includes(l.species) ? l.species : ''}
                                onChange={(e) =>
                                  patchLine(sel.id, l.id, {
                                    species: e.target.value,
                                    known: true,
                                    conf: 'high',
                                  })
                                }
                                style={{
                                  ...smallInput,
                                  width: '100%',
                                  padding: '5px 7px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                <option value="">{l.species || '— pick species —'}</option>
                                {KNOWN_SPECIES.map((s) => (
                                  <option key={s} value={s}>
                                    {s}
                                  </option>
                                ))}
                              </select>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  marginTop: '3px',
                                }}
                              >
                                <span
                                  style={{
                                    width: '5px',
                                    height: '5px',
                                    borderRadius: '50%',
                                    background: cm.dot,
                                  }}
                                />
                                <span style={{ fontSize: '9px', color: cm.color, fontWeight: 600 }}>
                                  {!l.known
                                    ? 'unknown species'
                                    : l.qty <= 0
                                      ? 'qty unclear'
                                      : cm.label}
                                </span>
                              </span>
                            </span>
                            <span>
                              <input
                                value={l.qty || ''}
                                onChange={(e) =>
                                  patchLine(sel.id, l.id, {
                                    qty: parseInt(e.target.value.replace(/\D/g, '') || '0', 10),
                                    conf: 'high',
                                  })
                                }
                                placeholder="lb"
                                style={{
                                  ...smallInput,
                                  width: '100%',
                                  fontFamily: "'IBM Plex Mono', monospace",
                                  textAlign: 'right',
                                  padding: '6px 7px',
                                }}
                              />
                              <span
                                style={{
                                  display: 'block',
                                  fontSize: '9px',
                                  color: '#8A99A3',
                                  textAlign: 'right',
                                  marginTop: '2px',
                                }}
                              >
                                lb
                              </span>
                            </span>
                            <button
                              onClick={() => removeLine(sel.id, l.id)}
                              style={{
                                width: '22px',
                                height: '30px',
                                border: '1px solid #E2E6E9',
                                borderRadius: '5px',
                                background: '#fff',
                                color: '#8A99A3',
                                cursor: 'pointer',
                                fontSize: '13px',
                                lineHeight: 1,
                              }}
                            >
                              ×
                            </button>
                          </div>
                        );
                      })}
                    </div>
                    <button
                      onClick={() => addLine(sel.id)}
                      style={{
                        marginTop: '8px',
                        fontFamily: "'Archivo', sans-serif",
                        fontSize: '11px',
                        fontWeight: 600,
                        color: '#3F6F86',
                        background: 'none',
                        border: '1px dashed #C5D8E2',
                        borderRadius: '5px',
                        padding: '6px 12px',
                        cursor: 'pointer',
                      }}
                    >
                      + Add item
                    </button>

                    {/* ship date */}
                    <div style={{ marginTop: '14px' }}>
                      <div
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          letterSpacing: '0.05em',
                          color: '#8A99A3',
                          marginBottom: '5px',
                        }}
                      >
                        SHIP / PICKUP
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          value={sel.shipDate}
                          onChange={(e) => patch(sel.id, { shipDate: e.target.value })}
                          style={{ ...smallInput, flex: 1 }}
                        />
                        {sel.shipConf !== 'high' && (
                          <span
                            title="Date parsed with medium confidence"
                            style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              background: confMeta(sel.shipConf).dot,
                              flex: 'none',
                            }}
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ACTIONS */}
                  {sel.status === 'needs_review' ? (
                    <div style={{ display: 'flex', gap: '9px', marginTop: '14px' }}>
                      <button
                        onClick={() => reject(sel)}
                        style={{
                          fontFamily: "'Archivo', sans-serif",
                          fontSize: '13px',
                          fontWeight: 600,
                          background: '#fff',
                          color: '#A5362C',
                          border: '1px solid #E3B6B1',
                          borderRadius: '6px',
                          padding: '11px 16px',
                          cursor: 'pointer',
                        }}
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => accept(sel)}
                        disabled={!canAccept(sel)}
                        style={{
                          flex: 1,
                          fontFamily: "'Archivo', sans-serif",
                          fontSize: '13px',
                          fontWeight: 700,
                          background: canAccept(sel) ? '#222A30' : '#E2E6E9',
                          color: canAccept(sel) ? '#fff' : '#A6AEB4',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '11px 16px',
                          cursor: canAccept(sel) ? 'pointer' : 'default',
                        }}
                      >
                        Accept → create order
                      </button>
                    </div>
                  ) : sel.status === 'accepted' ? (
                    <div
                      style={{
                        marginTop: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '9px',
                        background: '#EAF1ED',
                        border: '1px solid #BFD8C9',
                        borderRadius: '6px',
                        padding: '12px 14px',
                      }}
                    >
                      <span
                        style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          background: '#3F7D5B',
                          color: '#fff',
                          fontSize: '11px',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        ✓
                      </span>
                      <span style={{ fontSize: '13px', color: '#2E6347', fontWeight: 500 }}>
                        Accepted — {sel.orderCode} created and sent to the board.
                      </span>
                    </div>
                  ) : (
                    <div
                      style={{
                        marginTop: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '9px',
                        background: '#FBF0EF',
                        border: '1px solid #E3B6B1',
                        borderRadius: '6px',
                        padding: '12px 14px',
                      }}
                    >
                      <span style={{ fontSize: '13px', color: '#A5362C', fontWeight: 500 }}>
                        Rejected — not turned into an order.
                      </span>
                      <button
                        onClick={() =>
                          patch(sel.id, { status: 'needs_review', orderCode: undefined })
                        }
                        style={{
                          fontFamily: "'Archivo', sans-serif",
                          fontSize: '12px',
                          fontWeight: 600,
                          color: '#5A6670',
                          background: '#fff',
                          border: '1px solid #D6DCE0',
                          borderRadius: '5px',
                          padding: '6px 12px',
                          cursor: 'pointer',
                        }}
                      >
                        Restore
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
