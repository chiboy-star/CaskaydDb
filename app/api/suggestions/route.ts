import { NextResponse } from "next/server";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://ykrjylzazcnfcexdvfaq.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || "";

export async function GET() {
  try {
    const url = `${SUPABASE_URL}/rest/v1/CreatorSuggestion?select=*&status=eq.PENDING&order=createdAt.desc&limit=50`;
    const res = await fetch(url, {
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json({ suggestions: [] });
    }

    const data = await res.json();
    return NextResponse.json({ suggestions: data });
  } catch (error: any) {
    console.error("Error fetching suggestions:", error);
    return NextResponse.json({ suggestions: [], error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing suggestion id" }, { status: 400 });
    }

    const url = `${SUPABASE_URL}/rest/v1/CreatorSuggestion?id=eq.${id}`;
    const res = await fetch(url, {
      method: "DELETE",
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
      },
    });

    if (!res.ok) {
      return NextResponse.json({ success: false, error: "Failed to delete suggestion" }, { status: 500 });
    }

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error: any) {
    console.error("Error deleting suggestion:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
