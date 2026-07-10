'use client';

import { useState, useEffect } from 'react';
import Nav from '../components/Nav';
import { createClient } from '@/lib/supabase/client';

interface Me {
  name: string;
  email: string;
  role: string;
  location: string | null;
}

export default function SettingsPage() {
  const supabase = createClient();

  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, role, location')
        .eq('id', user.id)
        .single();
      setMe({
        name: profile?.name || (user.user_metadata?.name as string) || '—',
        email: user.email || '',
        role: profile?.role || 'viewer',
        location: profile?.location ?? null,
      });
      setLoading(false);
    })();
  }, []);

  const changePassword = async () => {
    setMsg(null);
    if (pw.length < 8) {
      setMsg({ kind: 'err', text: 'Password must be at least 8 characters.' });
      return;
    }
    if (pw !== pw2) {
      setMsg({ kind: 'err', text: 'The two passwords do not match.' });
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setSaving(false);
    if (error) {
      setMsg({ kind: 'err', text: error.message });
      return;
    }
    setPw('');
    setPw2('');
    setMsg({ kind: 'ok', text: 'Password updated. Use it the next time you sign in.' });
  };

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
  const labelStyle: React.CSSProperties = {
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.06em',
    color: '#8A99A3',
    display: 'block',
    marginBottom: '6px',
  };

  const initials = (me?.name || '?')
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

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
            gap: '14px',
            padding: '0 28px',
            height: '58px',
            borderBottom: '1px solid #E2E6E9',
            background: '#FFFFFF',
          }}
        >
          <span style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '-0.01em' }}>
            Settings
          </span>
        </header>

        <div style={{ flex: 1, overflowY: 'auto', padding: '26px 28px' }}>
          <div style={{ maxWidth: '560px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* PROFILE CARD */}
            <div
              style={{
                background: '#fff',
                border: '1px solid #E2E6E9',
                borderRadius: '8px',
                padding: '20px 22px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
              }}
            >
              <span
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: '#3F6F86',
                  color: '#fff',
                  fontSize: '16px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flex: 'none',
                }}
              >
                {loading ? '·' : initials}
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '16px', fontWeight: 700 }}>
                  {loading ? 'Loading…' : me?.name}
                </div>
                <div
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '12px',
                    color: '#5A6670',
                    marginTop: '3px',
                  }}
                >
                  {me?.email}
                </div>
                {me && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#2D5365',
                        background: '#EEF3F6',
                        borderRadius: '3px',
                        padding: '3px 9px',
                        textTransform: 'capitalize',
                      }}
                    >
                      {me.role}
                    </span>
                    {me.location && (
                      <span style={{ fontSize: '12px', color: '#8A99A3', alignSelf: 'center' }}>
                        {me.location}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* CHANGE PASSWORD CARD */}
            <div
              style={{
                background: '#fff',
                border: '1px solid #E2E6E9',
                borderRadius: '8px',
                padding: '22px',
              }}
            >
              <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '4px' }}>
                Change password
              </div>
              <div style={{ fontSize: '12px', color: '#8A99A3', marginBottom: '18px' }}>
                Set a new password for your account. If you were given a temporary password, change
                it here.
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={labelStyle}>NEW PASSWORD</label>
                  <input
                    style={inputStyle}
                    type={show ? 'text' : 'password'}
                    placeholder="At least 8 characters"
                    value={pw}
                    onChange={(e) => setPw(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>
                <div>
                  <label style={labelStyle}>CONFIRM NEW PASSWORD</label>
                  <input
                    style={inputStyle}
                    type={show ? 'text' : 'password'}
                    placeholder="Re-type the new password"
                    value={pw2}
                    onChange={(e) => setPw2(e.target.value)}
                    autoComplete="new-password"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') changePassword();
                    }}
                  />
                </div>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '12px',
                    color: '#5A6670',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={show}
                    onChange={(e) => setShow(e.target.checked)}
                  />
                  Show passwords
                </label>
              </div>

              {msg && (
                <div
                  style={{
                    marginTop: '16px',
                    background: msg.kind === 'ok' ? '#EAF1ED' : '#FBF0EF',
                    border: `1px solid ${msg.kind === 'ok' ? '#B4D2C0' : '#E3B6B1'}`,
                    borderRadius: '5px',
                    padding: '10px 13px',
                    fontSize: '12px',
                    color: msg.kind === 'ok' ? '#2E6347' : '#A5362C',
                  }}
                >
                  {msg.text}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button
                  onClick={changePassword}
                  disabled={saving || !pw || !pw2}
                  style={{
                    fontFamily: "'Archivo', sans-serif",
                    fontSize: '13px',
                    fontWeight: 600,
                    background: saving || !pw || !pw2 ? '#8A99A3' : '#222A30',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '5px',
                    padding: '10px 18px',
                    cursor: saving || !pw || !pw2 ? 'not-allowed' : 'pointer',
                  }}
                >
                  {saving ? 'Updating…' : 'Update password'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
