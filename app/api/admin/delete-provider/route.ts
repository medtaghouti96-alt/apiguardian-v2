// File: app/api/admin/delete-provider/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

export async function DELETE(req: Request) {
  try {
    const { userId } = await auth();
    if (userId !== process.env.ADMIN_USER_ID) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    
    const { providerId } = await req.json();
    if (!providerId) {
      return NextResponse.json({ error: "Provider ID is required." }, { status: 400 });
    }

    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
    
    // Deleting a provider will automatically delete all of its associated models
    // because we used "ON DELETE CASCADE" in our database schema.
    const { error } = await supabase
      .from('providers')
      .delete()
      .eq('id', providerId);
      
    if (error) { throw error; }
    
    console.log(`Admin user ${userId} deleted provider ${providerId}.`);
    return NextResponse.json({ message: "Provider and all its models deleted successfully." });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Admin Delete Provider Error:", errorMessage);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}