'use client';

import React, { useState, useEffect } from 'react';

export type RangeKey =
  | 'today'
  | 'yesterday'
  | 'last7'
  | 'last30'
  | 'thisMonth'
  | 'lastMonth'
  | 'custom';
export type CompareKey = 'none' | 'prevPeriod' | 'prevYear';

export interface DateSelection {
  key: RangeKey;
  start: string; // ISO yyyy-mm-dd
  end: string;
  compare: CompareKey;
}

interface Props {
  onChange?: (sel: DateSelection) => void;
  defaultKey?: RangeKey;
}

const PRESETS: { key: RangeKey; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'last7', label: 'Last 7 days' },
  { key: 'last30', label: 'Last 30 days' },
  { key: 'thisMonth', label: 'This month' },
  { key: 'lastMonth', label: 'Last month' },
];

const isoOf = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const parse = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

function computeRange(key: RangeKey, now: Date): { start: string; end: string } {
  switch (key) {
    case 'today':
      return { start: isoOf(now), end: isoOf(now) };
    case 'yesterday': {
      const y = addDays(now, -1);
      return { start: isoOf(y), end: isoOf(y) };
    }
    case 'last7':
      return { start: isoOf(addDays(now, -6)), end: isoOf(now) };
    case 'last30':
      return { start: isoOf(addDays(now, -29)), end: isoOf(now) };
    case 'thisMonth':
      return { start: isoOf(new Date(now.getFullYear(), now.getMonth(), 1)), end: isoOf(now) };
    case 'lastMonth':
      return {
        start: isoOf(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
        end: isoOf(new Date(now.getFullYear(), now.getMonth(), 0)),
      };
    default:
      return { start: isoOf(now), end: isoOf(now) };
  }
}

function comparePrev(
  start: string,
  end: string,
  mode: CompareKey
): { start: string; end: string } | null {
  if (mode === 'none') return null;
  const s = parse(start);
  const e = parse(end);
  if (mode === 'prevYear') {
    const ps = new Date(s);
    ps.setFullYear(ps.getFullYear() - 1);
    const pe = new Date(e);
    pe.setFullYear(pe.getFullYear() - 1);
    return { start: isoOf(ps), end: isoOf(pe) };
  }
  const days = Math.round((e.getTime() - s.getTime()) / 86400000) + 1;
  const pe = addDays(s, -1);
  const ps = addDays(pe, -(days - 1));
  return { start: isoOf(ps), end: isoOf(pe) };
}

/** Inclusive day count of a selection — dashboards scale their mock KPIs by this. */
export function daysInRange(sel: Pick<DateSelection, 'start' | 'end'> | null): number {
  if (!sel || !sel.start || !sel.end) return 1;
  return Math.max(
    1,
    Math.round((parse(sel.end).getTime() - parse(sel.start).getTime()) / 86400000) + 1
  );
}

/** Human label like "Jun 24 – Jul 1, 2026" for a selection. */
export function selectionLabel(sel: Pick<DateSelection, 'start' | 'end'> | null): string {
  if (!sel || !sel.start || !sel.end) return '';
  return rangeLabel(sel.start, sel.end);
}

const fmt = (iso: string, withYear = false) =>
  parse(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(withYear ? { year: 'numeric' } : {}),
  });

function rangeLabel(start: string, end: string): string {
  if (start === end) return fmt(start, true);
  const sameYear = start.slice(0, 4) === end.slice(0, 4);
  return `${fmt(start, !sameYear)} – ${fmt(end, true)}`;
}

export default function DateRangeFilter({ onChange, defaultKey = 'last7' }: Props) {
  const [now, setNow] = useState<Date | null>(null);
  const [open, setOpen] = useState(false);
  const [committed, setCommitted] = useState<DateSelection | null>(null);
  const [draft, setDraft] = useState<DateSelection | null>(null);

  // Compute defaults on the client to avoid SSR hydration mismatch
  useEffect(() => {
    const n = new Date();
    setNow(n);
    const { start, end } = computeRange(defaultKey, n);
    const sel: DateSelection = { key: defaultKey, start, end, compare: 'none' };
    setCommitted(sel);
  }, [defaultKey]);

  const openPanel = () => {
    setDraft(committed);
    setOpen(true);
  };

  const pickPreset = (key: RangeKey) => {
    if (!now || !draft) return;
    const { start, end } = computeRange(key, now);
    setDraft({ ...draft, key, start, end });
  };

  const setCustom = (field: 'start' | 'end', value: string) => {
    if (!draft) return;
    setDraft({ ...draft, key: 'custom', [field]: value });
  };

  const setCompare = (compare: CompareKey) => {
    if (!draft) return;
    setDraft({ ...draft, compare });
  };

  const apply = () => {
    if (!draft) return;
    setCommitted(draft);
    onChange?.(draft);
    setOpen(false);
  };

  const todayIso = now ? isoOf(now) : undefined;
  const cmp = committed ? comparePrev(committed.start, committed.end, committed.compare) : null;
  const draftCmp = draft ? comparePrev(draft.start, draft.end, draft.compare) : null;

  const chip = (active: boolean): React.CSSProperties => ({
    fontFamily: "'Archivo', sans-serif",
    fontSize: '12px',
    fontWeight: 600,
    borderRadius: '5px',
    padding: '7px 11px',
    cursor: 'pointer',
    textAlign: 'left',
    border: active ? '1.5px solid #3F6F86' : '1px solid #D6DCE0',
    background: active ? '#EEF3F6' : '#fff',
    color: active ? '#2D5365' : '#5A6670',
  });

  const compareBtn = (active: boolean): React.CSSProperties => ({
    fontFamily: "'Archivo', sans-serif",
    fontSize: '12px',
    fontWeight: 600,
    borderRadius: '5px',
    padding: '6px 10px',
    cursor: 'pointer',
    border: active ? '1.5px solid #3F6F86' : '1px solid #D6DCE0',
    background: active ? '#3F6F86' : '#fff',
    color: active ? '#fff' : '#5A6670',
  });

  return (
    <div style={{ position: 'relative', flex: 'none' }}>
      {/* TRIGGER */}
      <button
        onClick={openPanel}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '9px',
          fontFamily: "'Archivo', sans-serif",
          fontSize: '13px',
          fontWeight: 600,
          color: '#222A30',
          background: '#fff',
          border: '1px solid #D6DCE0',
          borderRadius: '6px',
          padding: '8px 12px',
          cursor: 'pointer',
        }}
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#5A6670"
          strokeWidth="1.8"
          strokeLinecap="round"
        >
          <rect x="3" y="4.5" width="18" height="17" rx="2" />
          <line x1="3" y1="9" x2="21" y2="9" />
          <line x1="8" y1="2.5" x2="8" y2="6.5" />
          <line x1="16" y1="2.5" x2="16" y2="6.5" />
        </svg>
        <span
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            lineHeight: 1.25,
          }}
        >
          <span>{committed ? rangeLabel(committed.start, committed.end) : '…'}</span>
          {cmp && (
            <span style={{ fontSize: '10px', fontWeight: 500, color: '#8A99A3' }}>
              vs {rangeLabel(cmp.start, cmp.end)}
            </span>
          )}
        </span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#8A99A3"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* POPOVER */}
      {open && draft && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 69 }} onClick={() => setOpen(false)} />
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              zIndex: 70,
              width: '340px',
              background: '#fff',
              border: '1px solid #E2E6E9',
              borderRadius: '10px',
              boxShadow: '0 16px 44px rgba(34,42,48,0.16)',
              padding: '16px',
              fontFamily: "'Archivo', sans-serif",
            }}
          >
            {/* Presets */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '7px' }}>
              {PRESETS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => pickPreset(p.key)}
                  style={chip(draft.key === p.key)}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Custom range */}
            <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid #EDEFF1' }}>
              <div
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  color: '#8A99A3',
                  marginBottom: '8px',
                }}
              >
                CUSTOM RANGE
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="date"
                  value={draft.start}
                  max={draft.end || todayIso}
                  onChange={(e) => setCustom('start', e.target.value)}
                  style={dateInput}
                />
                <span style={{ color: '#8A99A3', fontSize: '13px' }}>→</span>
                <input
                  type="date"
                  value={draft.end}
                  min={draft.start}
                  max={todayIso}
                  onChange={(e) => setCustom('end', e.target.value)}
                  style={dateInput}
                />
              </div>
            </div>

            {/* Comparison */}
            <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid #EDEFF1' }}>
              <div
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  color: '#8A99A3',
                  marginBottom: '8px',
                }}
              >
                COMPARE TO
              </div>
              <div style={{ display: 'flex', gap: '7px' }}>
                <button
                  onClick={() => setCompare('none')}
                  style={compareBtn(draft.compare === 'none')}
                >
                  Off
                </button>
                <button
                  onClick={() => setCompare('prevPeriod')}
                  style={compareBtn(draft.compare === 'prevPeriod')}
                >
                  Previous period
                </button>
                <button
                  onClick={() => setCompare('prevYear')}
                  style={compareBtn(draft.compare === 'prevYear')}
                >
                  Previous year
                </button>
              </div>
              {draftCmp && (
                <div style={{ fontSize: '11px', color: '#8A99A3', marginTop: '8px' }}>
                  vs {rangeLabel(draftCmp.start, draftCmp.end)}
                </div>
              )}
            </div>

            {/* Footer */}
            <div
              style={{ display: 'flex', justifyContent: 'flex-end', gap: '9px', marginTop: '16px' }}
            >
              <button
                onClick={() => setOpen(false)}
                style={{
                  fontFamily: "'Archivo', sans-serif",
                  fontSize: '12px',
                  fontWeight: 600,
                  background: '#fff',
                  color: '#5A6670',
                  border: '1px solid #D6DCE0',
                  borderRadius: '5px',
                  padding: '8px 14px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={apply}
                style={{
                  fontFamily: "'Archivo', sans-serif",
                  fontSize: '12px',
                  fontWeight: 600,
                  background: '#222A30',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '5px',
                  padding: '8px 16px',
                  cursor: 'pointer',
                }}
              >
                Apply
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const dateInput: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: '12px',
  fontWeight: 500,
  padding: '8px 10px',
  border: '1px solid #D6DCE0',
  borderRadius: '5px',
  outline: 'none',
  background: '#fff',
  color: '#222A30',
  cursor: 'pointer',
};
