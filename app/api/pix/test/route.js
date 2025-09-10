export const runtime = "nodejs"; // <— adicione esta linha

import { NextResponse } from "next/server";
import { getAccessToken } from "../../../../lib/efi.js";

export async function GET() {
  try {
    const token = await getAccessToken();
    return NextResponse.json({ ok: true, token_start: token?.slice(0, 10) });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e?.message || "falha" }, { status: 500 });
  }
}
