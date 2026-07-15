'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

/**
 * Shared sign-in card, one variant per audience. Each variant only admits its
 * own role: signing into the wrong door signs the session back out and points
 * the person to the right one.
 */
export type LoginVariant = 'staff' | 'customer' | 'vendor';

const VARIANTS: Record<
  LoginVariant,
  {
    tag: string;
    title: string;
    subtitle: string;
    accent: string;
    dest: string;
    emailPlaceholder: string;
  }
> = {
  staff: {
    tag: 'OPERATIONS',
    title: 'Staff sign in',
    subtitle: 'Essential Ocean Foods · Mana Operations',
    accent: '#3F6F86',
    dest: '/mana/allocation-board',
    emailPlaceholder: 'you@eof.com',
  },
  customer: {
    tag: 'CUSTOMER PORTAL',
    title: 'Customer sign in',
    subtitle: 'Order fresh fish · track orders, invoices & claims',
    accent: '#5A3E6B',
    dest: '/portal',
    emailPlaceholder: 'you@restaurant.com',
  },
  vendor: {
    tag: 'VENDOR PORTAL',
    title: 'Supplier sign in',
    subtitle: 'Submit packing lists · track shipments & settlements',
    accent: '#B7791F',
    dest: '/vendor',
    emailPlaceholder: 'you@supplier.com',
  },
};

export default function RoleLogin({ variant }: { variant: LoginVariant }) {
  const v = VARIANTS[variant];
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
    const { data: auth, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (authError || !auth.user) {
      setLoading(false);
      setError('Invalid email or password.');
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', auth.user.id)
      .single();
    const role = profile?.role as string | undefined;

    // Each door only admits its own audience.
    const matches =
      variant === 'customer'
        ? role === 'customer'
        : variant === 'vendor'
          ? role === 'vendor'
          : role !== 'customer' && role !== 'vendor';

    if (!matches) {
      // Wrong door for this account. Don't reveal that the account exists or
      // which area it belongs to — show the same generic message as a bad
      // password so this page can't be used to probe for accounts.
      await supabase.auth.signOut();
      setLoading(false);
      setError('Invalid email or password.');
      return;
    }

    setLoading(false);
    router.push(v.dest);
  };

  const inputStyle: React.CSSProperties = {
    fontFamily: "'Archivo', sans-serif",
    fontSize: '14px',
    border: `1px solid ${error ? '#C2453A' : '#D6DCE0'}`,
    borderRadius: '7px',
    padding: '12px 14px',
    width: '100%',
    boxSizing: 'border-box',
    color: '#222A30',
    background: '#fff',
    outline: 'none',
    transition: 'border-color 0.12s',
  };

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
        position: 'relative',
      }}
    >
      <Link
        href="/"
        style={{
          position: 'absolute',
          top: '24px',
          left: '24px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '13px',
          fontWeight: 600,
          color: '#5A6670',
        }}
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        Home
      </Link>

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
          <Link href="/">
            <img
              src="/logo.png"
              alt="MANA Seafood"
              style={{ width: '240px', height: 'auto', display: 'block' }}
            />
          </Link>
          <div
            style={{
              fontSize: '10px',
              fontWeight: 600,
              letterSpacing: '0.22em',
              color: v.accent,
            }}
          >
            {v.tag}
          </div>
        </div>

        {/* Card */}
        <div
          style={{
            background: '#fff',
            border: '1px solid #E2E6E9',
            borderTop: `3px solid ${v.accent}`,
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
              {v.title}
            </h1>
            <p style={{ fontSize: '13px', color: '#8A99A3', margin: '6px 0 0' }}>{v.subtitle}</p>
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
                placeholder={v.emailPlaceholder}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                style={inputStyle}
              />
            </div>

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
                PASSWORD
              </label>
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
                  style={{ ...inputStyle, paddingRight: '42px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
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
                  lineHeight: 1.5,
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

          {variant === 'customer' && (
            <p
              style={{
                textAlign: 'center',
                fontSize: '13px',
                color: '#5A6670',
                marginTop: '18px',
                marginBottom: 0,
              }}
            >
              New here?{' '}
              <Link
                href="/signup"
                style={{ color: v.accent, fontWeight: 600, textDecoration: 'none' }}
              >
                Create a customer account
              </Link>
            </p>
          )}
          {variant === 'vendor' && (
            <p
              style={{
                textAlign: 'center',
                fontSize: '13px',
                color: '#5A6670',
                marginTop: '18px',
                marginBottom: 0,
              }}
            >
              New supplier?{' '}
              <Link
                href="/vendor-signup"
                style={{ color: v.accent, fontWeight: 600, textDecoration: 'none' }}
              >
                Apply for an account
              </Link>
            </p>
          )}
        </div>

        <p style={{ textAlign: 'center', fontSize: '12px', color: '#8A99A3', marginTop: '20px' }}>
          Essential Ocean Foods · Mana ERP
        </p>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
