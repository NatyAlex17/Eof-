'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function VendorSignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ companyName: '', contact: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.companyName || !form.email || !form.password) {
      setError('Company name, email, and password are required.');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);

    const res = await fetch('/api/vendor/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setLoading(false);
      setError(body.error || 'Could not create your account.');
      return;
    }

    const supabase = createClient();
    const { error: authErr } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    });
    setLoading(false);
    if (authErr) {
      router.push('/login/vendor');
      return;
    }
    router.push('/vendor');
  };

  const label: React.CSSProperties = {
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.07em',
    color: '#8A99A3',
    display: 'block',
    marginBottom: '7px',
  };
  const input: React.CSSProperties = {
    fontFamily: "'Archivo', sans-serif",
    fontSize: '14px',
    border: '1px solid #D6DCE0',
    borderRadius: '7px',
    padding: '12px 14px',
    width: '100%',
    boxSizing: 'border-box',
    color: '#222A30',
    background: '#fff',
    outline: 'none',
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
      }}
    >
      <div style={{ width: '100%', maxWidth: '440px' }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '28px',
          }}
        >
          <img
            src="/logo.png"
            alt="MANA Seafood"
            style={{ width: '240px', height: 'auto', display: 'block' }}
          />
          <div
            style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.22em', color: '#8A99A3' }}
          >
            VENDOR PORTAL
          </div>
        </div>

        <div
          style={{
            background: '#fff',
            border: '1px solid #E2E6E9',
            borderRadius: '12px',
            padding: '32px',
            boxShadow: '0 4px 24px rgba(34,42,48,0.06)',
          }}
        >
          <div style={{ marginBottom: '24px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0, color: '#222A30' }}>
              Create your vendor account
            </h1>
            <p style={{ fontSize: '13px', color: '#8A99A3', margin: '6px 0 0' }}>
              Submit packing lists and invoices directly, and track your shipments and settlements.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}
          >
            <div>
              <label style={label}>COMPANY NAME *</label>
              <input
                style={input}
                placeholder="e.g. Pacific Fresh Catch"
                value={form.companyName}
                onChange={(e) => set('companyName', e.target.value)}
              />
            </div>
            <div>
              <label style={label}>CONTACT NAME</label>
              <input
                style={input}
                placeholder="Your name"
                value={form.contact}
                onChange={(e) => set('contact', e.target.value)}
              />
            </div>
            <div>
              <label style={label}>EMAIL *</label>
              <input
                style={input}
                type="email"
                autoComplete="email"
                placeholder="shipping@yourcompany.com"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
              />
            </div>
            <div>
              <label style={label}>PASSWORD *</label>
              <input
                style={input}
                type="password"
                autoComplete="new-password"
                placeholder="At least 8 characters"
                value={form.password}
                onChange={(e) => set('password', e.target.value)}
              />
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
              }}
            >
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: '13px', color: '#5A6670', marginTop: '20px' }}>
          Already have an account?{' '}
          <Link
            href="/login/vendor"
            style={{ color: '#3F6F86', fontWeight: 600, textDecoration: 'none' }}
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
