import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    // 1. Authenticate and authorize the admin user
    const { userId } = await auth();
    if (userId !== process.env.ADMIN_USER_ID) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 2. Get and validate the data from the form
    const newProviderData = await req.json();
    if (!newProviderData.id || !newProviderData.name || !newProviderData.base_url || !newProviderData.auth_header) {
      return NextResponse.json({ error: "Provider ID, Name, Base URL, and Auth Header are required." }, { status: 400 });
    }

    // 3. Insert the new provider into the database
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
    const { data, error } = await supabase.from('providers').insert(newProviderData).select().single();

    if (error) { throw error; }

    // 4. Return a success message
    console.log(`Admin user ${userId} created new provider ${data.name}.`);
    return NextResponse.json({ message: `Provider ${data.name} created successfully.` }, { status: 201 });

  } catch (error) {
    // Handle potential errors, like a duplicate provider ID
    if (typeof error === 'object' && error !== null && 'code' in error) {
      if (error.code === '23505') {
        let providerId = 'Unknown';
        try {
            // This is a safe way to re-read the body for the error message
            const body = await (req as any).clone().json();
            providerId = body.id;
        } catch (parseError) { /* ignore */ }
        return NextResponse.json({ error: `Provider with ID '${providerId}' already exists.` }, { status: 409 });
      }
    }
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Admin Create Provider Error:", errorMessage);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}