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

      if (!profile?.role) {
        return NextResponse.redirect(`${origin}/auth/role-select`);
      } else if (profile.role === 'client') {
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
