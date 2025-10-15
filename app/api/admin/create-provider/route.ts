import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (userId !== process.env.ADMIN_USER_ID) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const newProviderData = await req.json();
    if (!newProviderData.id || !newProviderData.name || !newProviderData.base_url || !newProviderData.auth_header) {
      return NextResponse.json({ error: "Provider ID, Name, Base URL, and Auth Header are required." }, { status: 400 });
    }

    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
    const { data, error } = await supabase.from('providers').insert(newProviderData).select().single();

    if (error) { throw error; }

    console.log(`Admin user ${userId} created new provider ${data.name}.`);
    return NextResponse.json({ message: `Provider ${data.name} created successfully.` }, { status: 201 });

  } catch (error) {
    // --- THIS IS THE CORRECTED, TYPE-SAFE CATCH BLOCK ---
    if (typeof error === 'object' && error !== null && 'code' in error) {
      if (error.code === '23505') {
        // We use a generic but helpful message to avoid the complexity of re-parsing the body.
        return NextResponse.json({ error: `This Provider ID already exists.` }, { status: 409 });
      }
    }
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Admin Create Provider Error:", errorMessage);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}