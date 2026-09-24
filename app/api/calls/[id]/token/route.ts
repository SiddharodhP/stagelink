import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { mintJaasToken, isJaasConfigured, getJaasAppId } from "@/lib/jaas";

// jose needs Node crypto for RS256.
export const runtime = "nodejs";
// A cached token would hand one user's identity to the next caller.
export const dynamic = "force-dynamic";

/**
 * Issues a JaaS token for one call session.
 *
 * This is the only thing standing between a signed-in user and every
 * meeting on the account, so it re-derives everything from the database
 * rather than trusting anything the client sends. The client passes a call
 * id and nothing else: the room name, the display name and the moderator
 * flag are all read server-side. A caller who asks for a call they are not
 * part of gets a 403 before any signing happens.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!isJaasConfigured()) {
    return NextResponse.json(
      { error: "Video calling is not configured on the server." },
      { status: 503 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  // RLS restricts call_sessions to the two people on the call, so a
  // stranger's id comes back empty rather than needing a separate check.
  const { data: call } = await supabase
    .from("call_sessions")
    .select("id, room_name, caller_id, callee_id, status")
    .eq("id", id)
    .maybeSingle();

  if (!call) {
    return NextResponse.json({ error: "Call not found." }, { status: 404 });
  }
  if (call.caller_id !== user.id && call.callee_id !== user.id) {
    return NextResponse.json({ error: "Not your call." }, { status: 403 });
  }
  if (!["ringing", "active"].includes(call.status)) {
    return NextResponse.json({ error: "This call has ended." }, { status: 409 });
  }

  // Display name comes from the profile, not the request body — otherwise
  // anyone could join a call posing as the other party.
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, company_name")
    .eq("id", user.id)
    .maybeSingle();

  const name =
    profile?.company_name?.trim() ||
    profile?.full_name?.trim() ||
    "Jayree user";

  try {
    const token = await mintJaasToken(call.room_name, {
      id: user.id,
      name,
      email: user.email,
      avatar: profile?.avatar_url || null,
      // Both parties moderate. With exactly two people there is nobody to
      // moderate, and a non-moderator would sit in a lobby waiting for a
      // host who never arrives.
      moderator: true,
    });

    return NextResponse.json({
      token,
      appId: getJaasAppId(),
      room: call.room_name,
    });
  } catch (err: unknown) {
    // The message can carry key details, so log it and return something flat.
    console.error("JaaS token minting failed:", err);
    return NextResponse.json(
      { error: "Could not start the call. Please try again." },
      { status: 500 }
    );
  }
}
