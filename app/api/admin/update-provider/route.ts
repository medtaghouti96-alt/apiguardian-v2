// File: app/api/admin/update-provider/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

export async function PATCH(req: Request) {
  try {
    const { userId } = await auth();
    if (userId !== process.env.ADMIN_USER_ID) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // We expect the full provider object to be sent for an update
    const providerData = await req.json();
    if (!providerData.id) {
      return NextResponse.json({ error: "Provider ID is required." }, { status: 400 });
    }

    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
    const { data, error } = await supabase
      .from('providers')
      .update({
        name: providerData.name,
        base_url: providerData.base_url,
        auth_header: providerData.auth_header,
        auth_scheme: providerData.auth_scheme,
        message_format_style: providerData.message_format_style,
      })
      .eq('id', providerData.id)
      .select()
      .single();

    if (error) { throw error; }

    console.log(`Admin user ${userId} updated provider ${data.name}.`);
    return NextResponse.json({ message: `Provider ${data.name} updated successfully.` });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Admin Update Provider Error:", errorMessage);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}