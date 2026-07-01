'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Email and password are required.');
      return;
    }
    setError('');
    setLoading(true);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (authError) {
      setError('Invalid email or password.');
      return;
    }
    router.push('/mana/allocation-board');
  };

  const inputStyle = (focused: boolean): React.CSSProperties => ({
    fontFamily: "'Archivo', sans-serif",
    fontSize: '14px',
    border: `1px solid ${focused ? '#3F6F86' : error ? '#C2453A' : '#D6DCE0'}`,
    borderRadius: '7px',
    padding: '12px 14px',
    width: '100%',
    boxSizing: 'border-box',
    color: '#222A30',
    background: '#fff',
    outline: 'none',
    transition: 'border-color 0.12s',
  });

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#F4F5F6',
        fontFamily: "'Archivo', sans-serif",
        WebkitFontSmoothing: 'antialiased',
        padding: '24px',
      }}
    >
      <div style={{ width: '100%', maxWidth: '400px' }}>
        {/* Brand */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '36px',
          }}
        >
          <img
            src="/logo.png"
            alt="MANA Seafood"
            style={{ width: '190px', height: 'auto', display: 'block' }}
          />
          <div
            style={{
              fontSize: '10px',
              fontWeight: 600,
              letterSpacing: '0.22em',
              color: '#8A99A3',
            }}
          >
            OPERATIONS
          </div>
        </div>

        {/* Card */}
        <div
          style={{
            background: '#fff',
            border: '1px solid #E2E6E9',
            borderRadius: '12px',
            padding: '36px 32px',
            boxShadow: '0 4px 24px rgba(34,42,48,0.06)',
          }}
        >
          <div style={{ marginBottom: '28px' }}>
            <h1
              style={{
                fontSize: '22px',
                fontWeight: 700,
                letterSpacing: '-0.01em',
                margin: 0,
                color: '#222A30',
              }}
            >
              Sign in
            </h1>
            <p style={{ fontSize: '13px', color: '#8A99A3', margin: '6px 0 0' }}>
              Essential Ocean Foods · Mana Operations
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
          >
            <div>
              <label
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.07em',
                  color: '#8A99A3',
                  display: 'block',
                  marginBottom: '7px',
                }}
              >
                EMAIL
              </label>
              <input
                type="email"
                autoComplete="email"
                placeholder="you@eof.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                style={inputStyle(false)}
              />
            </div>

            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '7px',
                }}
              >
                <label
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.07em',
                    color: '#8A99A3',
                  }}
                >
                  PASSWORD
                </label>
                <button
                  type="button"
                  style={{
                    fontFamily: "'Archivo', sans-serif",
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#3F6F86',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  Forgot password?
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  style={{ ...inputStyle(false), paddingRight: '42px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#8A99A3',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {showPassword ? (
                    <svg
                      width="17"
                      height="17"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    >
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg
                      width="17"
                      height="17"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    >
                      <path d="M1 12S5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div
                style={{
                  fontSize: '12px',
                  color: '#A5362C',
                  background: '#FBF0EF',
                  border: '1px solid #E3B6B1',
                  borderRadius: '5px',
                  padding: '9px 12px',
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                fontFamily: "'Archivo', sans-serif",
                fontSize: '14px',
                fontWeight: 700,
                background: loading ? '#8A99A3' : '#222A30',
                color: '#fff',
                border: 'none',
                borderRadius: '7px',
                padding: '13px',
                cursor: loading ? 'not-allowed' : 'pointer',
                marginTop: '4px',
                transition: 'background 0.15s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '9px',
              }}
            >
              {loading && (
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  style={{ animation: 'spin 0.8s linear infinite' }}
                >
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
              )}
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: '12px', color: '#8A99A3', marginTop: '24px' }}>
          Essential Ocean Foods · Mana ERP · Confidential
        </p>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
