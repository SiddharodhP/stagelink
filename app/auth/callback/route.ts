import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createClient();
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .maybeSingle();

      // Someone with no role has to pick one before anything else can make
      // sense, so `next` is deliberately dropped here rather than deferred.
      if (!profile?.role) {
        return NextResponse.redirect(`${origin}/auth/role-select`);
      }

      // Honour an explicit destination ahead of the role default. Without
      // this, clicking a project on the homepage and signing in dumped you
      // on a dashboard, having lost the thing you actually wanted to see.
      // Same-site paths only — see safeNext() in lib/services/auth.ts.
      if (next && next.startsWith('/') && !next.startsWith('//')) {
        return NextResponse.redirect(`${origin}${next}`);
      }

      if (profile.role === 'client') {
        return NextResponse.redirect(`${origin}/client/dashboard`);
      } else if (profile.role === 'freelancer') {
        return NextResponse.redirect(`${origin}/freelancer/dashboard`);
      } else if (profile.role === 'admin') {
        return NextResponse.redirect(`${origin}/admin`);
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth-callback-failed`);
}
