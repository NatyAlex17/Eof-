import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Refresh session so it doesn't expire mid-session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isMana = path.startsWith('/mana');
  const isPortal = path.startsWith('/portal');
  const isVendor = path.startsWith('/vendor') && !path.startsWith('/vendor-signup');

  // Unauthenticated users can't reach any protected area — each area has its
  // own sign-in door.
  if (!user && (isMana || isPortal || isVendor)) {
    const url = request.nextUrl.clone();
    url.pathname = isPortal ? '/login/customer' : isVendor ? '/login/vendor' : '/login';
    return NextResponse.redirect(url);
  }

  // Role isolation: customer -> /portal only, vendor -> /vendor only,
  // staff -> /mana only. Each role is bounced to its own home.
  if (user && (isMana || isPortal || isVendor)) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    const role = profile?.role;
    const home =
      role === 'customer' ? '/portal' : role === 'vendor' ? '/vendor' : '/mana/allocation-board';
    const allowed =
      (role === 'customer' && isPortal) ||
      (role === 'vendor' && isVendor) ||
      (role !== 'customer' && role !== 'vendor' && isMana);

    if (!allowed) {
      const url = request.nextUrl.clone();
      url.pathname = home;
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/mana/:path*', '/portal/:path*', '/vendor/:path*'],
};
