'use client';

import React from 'react';

interface LockedBoardBannerProps {
  lockedAt: string;
  lockedBy: string;
  onUnlock?: () => void;
  showUnlockButton?: boolean;
}

export default function LockedBoardBanner({
  lockedAt,
  lockedBy,
  onUnlock,
  showUnlockButton = false,
}: LockedBoardBannerProps) {
  return (
    <div
      style={{
        background: '#EAF1ED',
        border: '1px solid #BBD0DB',
        borderRadius: '5px',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        fontFamily: "'Archivo', sans-serif",
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: '#3F7D5B',
          }}
        />
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#2E6347' }}>
            Allocation locked
          </span>
          <span style={{ fontSize: '12px', color: '#5A6670' }}>
            at {lockedAt} by {lockedBy}
          </span>
        </div>
      </div>

      {showUnlockButton && (
        <button
          onClick={onUnlock}
          style={{
            fontFamily: "'Archivo', sans-serif",
            fontSize: '12px',
            fontWeight: 600,
            background: 'transparent',
            color: '#2E6347',
            border: '1px solid #BBD0DB',
            borderRadius: '3px',
            padding: '6px 12px',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#D4E5DD';
            e.currentTarget.style.borderColor = '#9DBFAD';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.borderColor = '#BBD0DB';
          }}
        >
          Unlock
        </button>
      )}
    </div>
  );
}
