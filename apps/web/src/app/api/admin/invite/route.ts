import { createServerClient } from '@supabase/ssr';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// Generate a readable but strong password: 4 blocks of 4 chars, ambiguous
// characters (0/O, 1/l/I) removed so it can be dictated or copied without error.
function generatePassword(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const bytes = randomBytes(16);
  let out = '';
  for (let i = 0; i < 16; i++) {
    out += alphabet[bytes[i] % alphabet.length];
    if (i % 4 === 3 && i < 15) out += '-';
  }
  return out; // e.g. "Kp9x-Tm4Q-Ab7d-Rs2N"
}

export async function POST(request: Request) {
  const cookieStore = await cookies();

  // Verify the calling user is an admin (anon key + RLS)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (list) =>
          list.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  const { name, email, role, location } = await request.json();
  if (!name || !email || !role) {
    return NextResponse.json({ error: 'name, email, and role are required' }, { status: 400 });
  }

  // Use service role to create the user directly — bypasses RLS and the guard
  // trigger (service role has auth.uid() = null).
  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Auto-generate the first password. The admin hands this to the new user,
  // who then changes it from Settings on first sign-in.
  const password = generatePassword();

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // no verification email — they can log in immediately
    user_metadata: { name, role, location: location || 'Remote' },
  });

  if (error || !data.user) {
    const msg = error?.message || 'Could not create user';
    const already = /already|registered|exists/i.test(msg);
    return NextResponse.json(
      { error: already ? 'A user with that email already exists.' : msg },
      { status: already ? 409 : 500 }
    );
  }

  // The on_auth_user_created trigger created the profile with a default role;
  // set the fields the trigger can't know. status='active' — they can sign in.
  await admin
    .from('profiles')
    .update({ name, role, location: location || 'Remote', status: 'active' })
    .eq('id', data.user.id);

  // Return the credentials once so the UI can display + copy them. The password
  // is never stored in plaintext anywhere — this response is the only time it
  // is visible.
  return NextResponse.json({ ok: true, email, password });
}
