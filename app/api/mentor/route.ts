import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Mentor route scaffold — not yet implemented" },
    { status: 501 }
  );
}
