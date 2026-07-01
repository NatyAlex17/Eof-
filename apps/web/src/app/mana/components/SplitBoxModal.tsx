'use client';

import React, { useEffect, useState } from 'react';

interface OrderLite {
  id: string;
  code: string;
  customer: string;
  color: string;
}

interface SplitBoxModalProps {
  isOpen: boolean;
  boxLabel: string;
  totalWeight: number;
  orders: OrderLite[];
  defaultOrderA: string | null;
  onConfirm: (weightA: number, orderA: string | null, orderB: string | null) => void;
  onCancel: () => void;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export default function SplitBoxModal({
  isOpen,
  boxLabel,
  totalWeight,
  orders,
  defaultOrderA,
  onConfirm,
  onCancel,
}: SplitBoxModalProps) {
  const [weightA, setWeightA] = useState(0);
  const [orderA, setOrderA] = useState<string | null>(null);
  const [orderB, setOrderB] = useState<string | null>(null);

  // Reset the form each time the modal opens for a new box
  useEffect(() => {
    if (isOpen) {
      setWeightA(round1(totalWeight / 2));
      setOrderA(defaultOrderA ?? null);
      setOrderB(null);
    }
  }, [isOpen, totalWeight, defaultOrderA]);

  if (!isOpen) return null;

  const min = 0.1;
  const max = round1(Math.max(min, totalWeight - 0.1));
  const wA = round1(Math.min(Math.max(weightA, min), max));
  const wB = round1(totalWeight - wA);

  const colorFor = (id: string | null) =>
    (id && orders.find((o) => o.id === id)?.color) || '#8A99A3';
  const labelFor = (id: string | null) =>
    (id && orders.find((o) => o.id === id)?.code) || 'Available';

  const selectStyle: React.CSSProperties = {
    width: '100%',
    fontFamily: "'Archivo', sans-serif",
    fontSize: '13px',
    fontWeight: 600,
    color: '#222A30',
    background: '#fff',
    border: '1px solid #D6DCE0',
    borderRadius: '5px',
    padding: '9px 10px',
    cursor: 'pointer',
    outline: 'none',
  };

  const PartCard = ({
    title,
    weight,
    value,
    onChange,
  }: {
    title: string;
    weight: number;
    value: string | null;
    onChange: (v: string | null) => void;
  }) => (
    <div
      style={{
        flex: 1,
        background: '#F4F5F6',
        border: '1px solid #E2E6E9',
        borderLeft: `3px solid ${colorFor(value)}`,
        borderRadius: '6px',
        padding: '14px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span
          style={{
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.07em',
            color: '#8A99A3',
          }}
        >
          {title}
        </span>
        <span
          style={{
            fontSize: '9px',
            fontWeight: 700,
            color: '#fff',
            background: colorFor(value),
            borderRadius: '2px',
            padding: '2px 6px',
          }}
        >
          {labelFor(value)}
        </span>
      </div>
      <div
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '24px',
          fontWeight: 700,
          margin: '8px 0 12px',
        }}
      >
        {weight.toFixed(1)}
        <span style={{ fontSize: '13px', color: '#8A99A3', fontWeight: 600, marginLeft: '4px' }}>
          lb
        </span>
      </div>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
        style={selectStyle}
      >
        <option value="">Leave available</option>
        {orders.map((o) => (
          <option key={o.id} value={o.id}>
            {o.code} — {o.customer}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(34, 42, 48, 0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        fontFamily: "'Archivo', sans-serif",
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: '8px',
          boxShadow: '0 20px 60px rgba(34, 42, 48, 0.15)',
          maxWidth: '480px',
          width: '90%',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div style={{ padding: '24px 28px 18px', borderBottom: '1px solid #E2E6E9' }}>
          <div
            style={{
              fontSize: '18px',
              fontWeight: 700,
              letterSpacing: '-0.01em',
              color: '#222A30',
            }}
          >
            Split box {boxLabel}
          </div>
          <div style={{ fontSize: '13px', color: '#5A6670', marginTop: '6px' }}>
            Divide{' '}
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 }}>
              {totalWeight.toFixed(1)} lb
            </span>{' '}
            into two pieces by weight, then assign each piece.
          </div>
        </div>

        {/* CONTENT */}
        <div style={{ padding: '24px 28px' }}>
          {/* Slider */}
          <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.06em',
                color: '#5A6670',
              }}
            >
              PIECE A WEIGHT
            </span>
            <span
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '12px',
                fontWeight: 600,
                color: '#222A30',
              }}
            >
              {wA.toFixed(1)} / {totalWeight.toFixed(1)} lb
            </span>
          </div>
          <input
            type="range"
            min={min}
            max={max}
            step={0.1}
            value={wA}
            onChange={(e) => setWeightA(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: '#3F6F86', cursor: 'pointer' }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '6px 0 20px' }}>
            <span style={{ fontSize: '12px', color: '#8A99A3' }}>
              Or type exact lb for Piece A:
            </span>
            <input
              type="number"
              min={min}
              max={max}
              step={0.1}
              value={wA}
              onChange={(e) => setWeightA(parseFloat(e.target.value) || min)}
              style={{
                width: '80px',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '13px',
                fontWeight: 600,
                padding: '6px 8px',
                border: '1px solid #D6DCE0',
                borderRadius: '5px',
                outline: 'none',
              }}
            />
          </div>

          {/* Two pieces */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <PartCard title="PIECE A" weight={wA} value={orderA} onChange={setOrderA} />
            <PartCard title="PIECE B" weight={wB} value={orderB} onChange={setOrderB} />
          </div>
        </div>

        {/* FOOTER */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            padding: '18px 28px',
            borderTop: '1px solid #E2E6E9',
            background: '#F4F5F6',
          }}
        >
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              fontFamily: "'Archivo', sans-serif",
              fontSize: '13px',
              fontWeight: 600,
              background: '#fff',
              color: '#222A30',
              border: '1px solid #D6DCE0',
              borderRadius: '5px',
              padding: '12px 16px',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(wA, orderA, orderB)}
            style={{
              flex: 1,
              fontFamily: "'Archivo', sans-serif",
              fontSize: '13px',
              fontWeight: 600,
              background: '#222A30',
              color: '#fff',
              border: 'none',
              borderRadius: '5px',
              padding: '12px 16px',
              cursor: 'pointer',
            }}
          >
            Split box
          </button>
        </div>
      </div>
    </div>
  );
}
