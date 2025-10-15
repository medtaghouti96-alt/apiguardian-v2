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
    const { modelId } = await req.json();
    if (!modelId) {
      return NextResponse.json({ error: "Model ID is required." }, { status: 400 });
    }
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
    const { error } = await supabase.from('models').delete().eq('id', modelId);
    
    if (error) { throw error; }
    
    console.log(`Admin user ${userId} deleted model ${modelId}.`);
    return NextResponse.json({ message: "Model deleted successfully." });

  } catch (error) {
    // --- APPLYING THE SAME TYPE-SAFE CATCH BLOCK HERE ---
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Admin Delete Model Error:", errorMessage);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}