import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createClient();
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error && data.user) {
      // Check if user has a role assigned
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', data.user.id)
        .single();
        
      if (!userData?.role) {
        // New user without a role, redirect to role selection
        return NextResponse.redirect(`${origin}/auth/role-select`);
      } else if (userData.role === 'musician') {
        return NextResponse.redirect(`${origin}/musician/dashboard`);
      } else if (userData.role === 'organizer') {
        return NextResponse.redirect(`${origin}/organizer/dashboard`);
      }
      
      // Fallback
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth-callback-failed`);
}
