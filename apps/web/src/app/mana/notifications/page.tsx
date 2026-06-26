'use client';

import { useState } from 'react';
import Nav from '../components/Nav';

type NotifType = 'shortage' | 'sync' | 'approval' | 'credit' | 'receiving' | 'shipment';

interface Notification {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  time: string;
  read: boolean;
  channel: ('in-app' | 'email' | 'sms')[];
}

interface ChannelPref {
  key: NotifType;
  label: string;
  description: string;
  inApp: boolean;
  email: boolean;
  sms: boolean;
}

const TYPE_META: Record<NotifType, { label: string; color: string; bg: string }> = {
  shortage: { label: 'Shortage', color: '#A5362C', bg: '#FBF0EF' },
  sync: { label: 'Sync failure', color: '#A5362C', bg: '#FBF0EF' },
  approval: { label: 'Approval', color: '#8A5A14', bg: '#F4EEE2' },
  credit: { label: 'Credit', color: '#2D5365', bg: '#EEF3F6' },
  receiving: { label: 'Receiving', color: '#2E6347', bg: '#EAF1ED' },
  shipment: { label: 'Shipment', color: '#5A6670', bg: '#EEF0F2' },
};

const SEED: Notification[] = [
  {
    id: 'n1',
    type: 'sync',
    title: 'QBO invoice sync failed',
    body: 'INV-2205 (Roy’s) — customer not mapped in QuickBooks. Needs attention in Finance Queue.',
    time: '8 min ago',
    read: false,
    channel: ['in-app', 'email'],
  },
  {
    id: 'n2',
    type: 'shortage',
    title: 'Allocation shortage — Ahi Tuna A+',
    body: 'Order #2208 (Nobu) is 12 lb short. No available boxes in SFO for requested ship date.',
    time: '23 min ago',
    read: false,
    channel: ['in-app', 'sms'],
  },
  {
    id: 'n3',
    type: 'approval',
    title: 'Credit claim awaiting approval',
    body: 'CR-041 (Roy’s) — $380.00 temp-abuse claim submitted by Blanca. Needs review.',
    time: '1 hr ago',
    read: false,
    channel: ['in-app', 'email'],
  },
  {
    id: 'n4',
    type: 'receiving',
    title: 'Vendor file imported',
    body: 'LOT-2209 created from Island Seafood packing list — 4 boxes, 118.6 lb received.',
    time: '2 hr ago',
    read: true,
    channel: ['in-app'],
  },
  {
    id: 'n5',
    type: 'credit',
    title: 'QBO credit memo issued',
    body: 'CM-118 issued for Nobu short-weight claim — vendor recon updated for LOT-2207.',
    time: '4 hr ago',
    read: true,
    channel: ['in-app', 'email'],
  },
  {
    id: 'n6',
    type: 'shipment',
    title: 'Pick slip generated',
    body: 'PS-3391 generated for Morimoto order #2207 — routed to Main Freight (SFO).',
    time: 'Yesterday',
    read: true,
    channel: ['in-app'],
  },
];

const DEFAULT_PREFS: ChannelPref[] = [
  {
    key: 'shortage',
    label: 'Allocation shortages',
    description: 'When an order cannot be fully allocated',
    inApp: true,
    email: true,
    sms: true,
  },
  {
    key: 'sync',
    label: 'QBO sync failures',
    description: 'When an invoice or credit memo fails to sync',
    inApp: true,
    email: true,
    sms: false,
  },
  {
    key: 'approval',
    label: 'Approvals needed',
    description: 'Credit claims and overrides awaiting sign-off',
    inApp: true,
    email: true,
    sms: false,
  },
  {
    key: 'credit',
    label: 'Credit activity',
    description: 'Credit memos issued, claims resolved',
    inApp: true,
    email: false,
    sms: false,
  },
  {
    key: 'receiving',
    label: 'Receiving events',
    description: 'Vendor files imported, lots created',
    inApp: true,
    email: false,
    sms: false,
  },
  {
    key: 'shipment',
    label: 'Fulfillment & shipments',
    description: 'Pick slips generated, BOL updates',
    inApp: true,
    email: false,
    sms: false,
  },
];

export default function NotificationsPage() {
  const [tab, setTab] = useState<'inbox' | 'preferences'>('inbox');
  const [notifs, setNotifs] = useState<Notification[]>(SEED);
  const [prefs, setPrefs] = useState<ChannelPref[]>(DEFAULT_PREFS);
  const [filterUnread, setFilterUnread] = useState(false);

  const unreadCount = notifs.filter((n) => !n.read).length;
  const shown = filterUnread ? notifs.filter((n) => !n.read) : notifs;

  const markRead = (id: string) =>
    setNotifs((p) => p.map((n) => (n.id === id ? { ...n, read: true } : n)));
  const markAllRead = () => setNotifs((p) => p.map((n) => ({ ...n, read: true })));

  const togglePref = (key: NotifType, channel: 'inApp' | 'email' | 'sms') =>
    setPrefs((p) => p.map((pr) => (pr.key === key ? { ...pr, [channel]: !pr[channel] } : pr)));

  const tabStyle = (on: boolean): React.CSSProperties => ({
    fontFamily: "'Archivo', sans-serif",
    fontSize: '12px',
    fontWeight: 600,
    border: 'none',
    borderRadius: '4px',
    padding: '6px 13px',
    cursor: 'pointer',
    background: on ? '#3F6F86' : 'none',
    color: on ? '#fff' : '#5A6670',
  });

  const Toggle = ({ on, onClick }: { on: boolean; onClick: () => void }) => (
    <button
      onClick={onClick}
      style={{
        width: '38px',
        height: '22px',
        borderRadius: '11px',
        border: 'none',
        background: on ? '#3F6F86' : '#D6DCE0',
        position: 'relative',
        cursor: 'pointer',
        transition: 'background 0.15s',
        flex: 'none',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: '2px',
          left: on ? '18px' : '2px',
          width: '18px',
          height: '18px',
          borderRadius: '50%',
          background: '#fff',
          transition: 'left 0.15s',
          boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
        }}
      />
    </button>
  );

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
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '-0.01em' }}>
              Notifications
            </span>
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
              <button onClick={() => setTab('inbox')} style={tabStyle(tab === 'inbox')}>
                Inbox{unreadCount > 0 ? ` · ${unreadCount}` : ''}
              </button>
              <button onClick={() => setTab('preferences')} style={tabStyle(tab === 'preferences')}>
                Preferences
              </button>
            </div>
          </div>
          {tab === 'inbox' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                onClick={() => setFilterUnread((v) => !v)}
                style={{
                  fontFamily: "'Archivo', sans-serif",
                  fontSize: '12px',
                  fontWeight: 600,
                  background: filterUnread ? '#EEF3F6' : '#fff',
                  color: filterUnread ? '#2D5365' : '#5A6670',
                  border: '1px solid #D6DCE0',
                  borderRadius: '5px',
                  padding: '7px 13px',
                  cursor: 'pointer',
                }}
              >
                Unread only
              </button>
              <button
                onClick={markAllRead}
                style={{
                  fontFamily: "'Archivo', sans-serif",
                  fontSize: '12px',
                  fontWeight: 600,
                  background: '#fff',
                  color: '#5A6670',
                  border: '1px solid #D6DCE0',
                  borderRadius: '5px',
                  padding: '7px 13px',
                  cursor: 'pointer',
                }}
              >
                Mark all read
              </button>
            </div>
          )}
        </header>

        <div style={{ flex: 1, overflowY: 'auto', padding: '22px 28px' }}>
          {/* INBOX */}
          {tab === 'inbox' && (
            <div
              style={{ maxWidth: '760px', display: 'flex', flexDirection: 'column', gap: '10px' }}
            >
              {shown.length === 0 && (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '60px 20px',
                    color: '#8A99A3',
                    fontSize: '14px',
                  }}
                >
                  No notifications to show.
                </div>
              )}
              {shown.map((n) => {
                const m = TYPE_META[n.type];
                return (
                  <div
                    key={n.id}
                    onClick={() => markRead(n.id)}
                    style={{
                      background: n.read ? '#fff' : '#FCFDFE',
                      border: '1px solid #E2E6E9',
                      borderLeft: `3px solid ${n.read ? '#E2E6E9' : '#3F6F86'}`,
                      borderRadius: '8px',
                      padding: '15px 18px',
                      cursor: 'pointer',
                      display: 'flex',
                      gap: '14px',
                    }}
                  >
                    {!n.read && (
                      <span
                        style={{
                          flex: 'none',
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: '#3F6F86',
                          marginTop: '6px',
                        }}
                      />
                    )}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          flexWrap: 'wrap',
                        }}
                      >
                        <span style={{ fontSize: '14px', fontWeight: 700 }}>{n.title}</span>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            color: m.color,
                            background: m.bg,
                            borderRadius: '3px',
                            padding: '2px 8px',
                          }}
                        >
                          {m.label}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: '13px',
                          color: '#5A6670',
                          marginTop: '5px',
                          lineHeight: 1.5,
                        }}
                      >
                        {n.body}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          marginTop: '8px',
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "'IBM Plex Mono', monospace",
                            fontSize: '11px',
                            color: '#8A99A3',
                          }}
                        >
                          {n.time}
                        </span>
                        <span style={{ display: 'flex', gap: '6px' }}>
                          {n.channel.map((ch) => (
                            <span
                              key={ch}
                              style={{
                                fontSize: '10px',
                                fontWeight: 600,
                                color: '#8A99A3',
                                background: '#F4F5F6',
                                border: '1px solid #E2E6E9',
                                borderRadius: '3px',
                                padding: '1px 7px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.03em',
                              }}
                            >
                              {ch}
                            </span>
                          ))}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* PREFERENCES */}
          {tab === 'preferences' && (
            <div style={{ maxWidth: '760px' }}>
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
                    gridTemplateColumns: '1fr 90px 90px 90px',
                    gap: 0,
                    padding: '13px 20px',
                    background: '#FAFBFB',
                    borderBottom: '1px solid #E2E6E9',
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '0.07em',
                    color: '#8A99A3',
                  }}
                >
                  <span>EVENT TYPE</span>
                  <span style={{ textAlign: 'center' }}>IN-APP</span>
                  <span style={{ textAlign: 'center' }}>EMAIL</span>
                  <span style={{ textAlign: 'center' }}>SMS</span>
                </div>
                {prefs.map((pr) => (
                  <div
                    key={pr.key}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 90px 90px 90px',
                      gap: 0,
                      alignItems: 'center',
                      padding: '15px 20px',
                      borderBottom: '1px solid #EDEFF1',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600 }}>{pr.label}</div>
                      <div style={{ fontSize: '12px', color: '#8A99A3', marginTop: '2px' }}>
                        {pr.description}
                      </div>
                    </div>
                    <span style={{ display: 'flex', justifyContent: 'center' }}>
                      <Toggle on={pr.inApp} onClick={() => togglePref(pr.key, 'inApp')} />
                    </span>
                    <span style={{ display: 'flex', justifyContent: 'center' }}>
                      <Toggle on={pr.email} onClick={() => togglePref(pr.key, 'email')} />
                    </span>
                    <span style={{ display: 'flex', justifyContent: 'center' }}>
                      <Toggle on={pr.sms} onClick={() => togglePref(pr.key, 'sms')} />
                    </span>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: '12px', color: '#8A99A3', marginTop: '14px' }}>
                Email delivered via Resend · SMS via Twilio (where approved). Channel availability
                depends on integration setup in Admin.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
