import { createClient as createServiceClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Public self-service signup for customers. Creates the auth user, a customers
// record (default tier T2 / active), and links the profile as role 'customer'.
// Uses the service role because RLS + the profile guard block a self-service
// user from setting their own role or inserting a customers row.
export async function POST(request: Request) {
  const { businessName, contact, email, phone, password } = await request.json();

  if (!businessName || !email || !password) {
    return NextResponse.json(
      { error: 'Business name, email, and password are required.' },
      { status: 400 }
    );
  }
  if (String(password).length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
  }

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1. Create the auth user (email confirmed so they can sign in immediately).
  const { data: created, error: authErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: businessName, role: 'customer' },
  });
  if (authErr || !created.user) {
    const msg = authErr?.message || 'Could not create the account.';
    const already = /already|registered|exists/i.test(msg);
    return NextResponse.json(
      { error: already ? 'An account with that email already exists. Try signing in.' : msg },
      { status: already ? 409 : 500 }
    );
  }
  const userId = created.user.id;

  // 2. Create (or reuse) the customer record.
  const { data: customer, error: custErr } = await admin
    .from('customers')
    .insert({
      name: businessName.trim(),
      contact: contact || null,
      email,
      phone: phone || null,
      // No tier yet — staff assign it, and only then does pricing show in the
      // portal. No default warehouse either (chosen per order).
      tier: null,
      channel_pref: 'Portal',
      status: 'active',
    })
    .select()
    .single();

  if (custErr || !customer) {
    // Roll back the auth user so they can retry with the same email.
    await admin.auth.admin.deleteUser(userId);
    const dup = /duplicate|unique/i.test(custErr?.message || '');
    return NextResponse.json(
      {
        error: dup
          ? 'A business with that name already exists. Please contact us to link your account.'
          : custErr?.message || 'Could not create the customer record.',
      },
      { status: dup ? 409 : 500 }
    );
  }

  // 3. Link the auto-provisioned profile to the customer as role 'customer'.
  await admin
    .from('profiles')
    .update({
      name: businessName.trim(),
      role: 'customer',
      status: 'active',
      customer_id: customer.id,
    })
    .eq('id', userId);

  return NextResponse.json({ ok: true });
}
