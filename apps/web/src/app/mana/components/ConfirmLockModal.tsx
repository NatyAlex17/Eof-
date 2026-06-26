'use client';

import React from 'react';

interface ConfirmLockModalProps {
  isOpen: boolean;
  allocationCount: number;
  totalWeight: number;
  orderCount: number;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function ConfirmLockModal({
  isOpen,
  allocationCount,
  totalWeight,
  orderCount,
  onConfirm,
  onCancel,
  isLoading = false,
}: ConfirmLockModalProps) {
  if (!isOpen) return null;

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
          maxWidth: '460px',
          width: '90%',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div
          style={{
            padding: '28px 28px 20px',
            borderBottom: '1px solid #E2E6E9',
          }}
        >
          <div
            style={{
              fontSize: '18px',
              fontWeight: 700,
              letterSpacing: '-0.01em',
              color: '#222A30',
            }}
          >
            Lock Allocation?
          </div>
          <div
            style={{
              fontSize: '13px',
              color: '#5A6670',
              marginTop: '6px',
            }}
          >
            This will freeze the board and generate pick slips.
          </div>
        </div>

        {/* CONTENT */}
        <div style={{ padding: '28px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '20px',
              marginBottom: '28px',
            }}
          >
            {/* ALLOCATION SUMMARY */}
            <div
              style={{
                background: '#F4F5F6',
                border: '1px solid #E2E6E9',
                borderRadius: '6px',
                padding: '16px',
              }}
            >
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.07em',
                  color: '#8A99A3',
                  marginBottom: '8px',
                }}
              >
                ORDERS
              </div>
              <div
                style={{
                  fontSize: '24px',
                  fontWeight: 700,
                  color: '#222A30',
                }}
              >
                {orderCount}
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: '#8A99A3',
                  marginTop: '6px',
                }}
              >
                allocated
              </div>
            </div>

            <div
              style={{
                background: '#F4F5F6',
                border: '1px solid #E2E6E9',
                borderRadius: '6px',
                padding: '16px',
              }}
            >
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.07em',
                  color: '#8A99A3',
                  marginBottom: '8px',
                }}
              >
                BOXES
              </div>
              <div
                style={{
                  fontSize: '24px',
                  fontWeight: 700,
                  color: '#222A30',
                }}
              >
                {allocationCount}
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: '#8A99A3',
                  marginTop: '6px',
                }}
              >
                total
              </div>
            </div>

            <div
              style={{
                background: '#F4F5F6',
                border: '1px solid #E2E6E9',
                borderRadius: '6px',
                padding: '16px',
                gridColumn: '1 / -1',
              }}
            >
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.07em',
                  color: '#8A99A3',
                  marginBottom: '8px',
                }}
              >
                TOTAL WEIGHT
              </div>
              <div
                style={{
                  fontSize: '28px',
                  fontWeight: 700,
                  color: '#222A30',
                }}
              >
                {totalWeight.toFixed(1)}
                <span
                  style={{
                    fontSize: '16px',
                    fontWeight: 600,
                    color: '#8A99A3',
                    marginLeft: '6px',
                  }}
                >
                  lb
                </span>
              </div>
            </div>
          </div>

          {/* WARNING */}
          <div
            style={{
              background: '#FEF4E8',
              border: '1px solid #F0D8B8',
              borderRadius: '5px',
              padding: '12px 14px',
              marginBottom: '28px',
              display: 'flex',
              gap: '10px',
              alignItems: 'flex-start',
            }}
          >
            <div
              style={{
                fontSize: '14px',
                color: '#8A5A14',
                flexBasis: '14px',
                flexShrink: 0,
                marginTop: '1px',
              }}
            >
              ⚠
            </div>
            <div
              style={{
                fontSize: '12px',
                color: '#704A1C',
                lineHeight: 1.5,
              }}
            >
              Once locked, you cannot edit the board. Pick slips will be generated immediately.
              Unlock only if changes are absolutely necessary.
            </div>
          </div>

          {/* CONFIRMATION TEXT */}
          <div
            style={{
              fontSize: '13px',
              color: '#5A6670',
              lineHeight: 1.6,
              marginBottom: '28px',
            }}
          >
            After locking, you'll be taken to the pick slips page where you can review and print
            each slip.
          </div>
        </div>

        {/* FOOTER */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            padding: '20px 28px',
            borderTop: '1px solid #E2E6E9',
            background: '#F4F5F6',
          }}
        >
          <button
            onClick={onCancel}
            disabled={isLoading}
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
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.6 : 1,
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              if (!isLoading) e.currentTarget.style.background = '#F4F5F6';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#fff';
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
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
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.8 : 1,
              transition: 'all 0.15s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
            onMouseEnter={(e) => {
              if (!isLoading) e.currentTarget.style.background = '#000';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#222A30';
            }}
          >
            {isLoading ? (
              <>
                <span
                  style={{
                    width: '12px',
                    height: '12px',
                    border: '2px solid #fff',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 0.6s linear infinite',
                  }}
                />
                Locking...
              </>
            ) : (
              'Lock & Generate'
            )}
          </button>
        </div>

        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}
