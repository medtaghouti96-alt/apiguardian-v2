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

    const newModelData = await req.json();
    if (!newModelData.provider_id || !newModelData.model_name) {
      return NextResponse.json({ error: "Provider and Model Name are required." }, { status: 400 });
    }

    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
    const { data, error } = await supabase.from('models').insert(newModelData).select().single();

    if (error) { throw error; }

    console.log(`Admin user ${userId} created new model ${data.model_name}.`);
    return NextResponse.json({ message: `Model ${data.model_name} created successfully.` }, { status: 201 });
  
  } catch (error) {
    // --- THIS IS THE CORRECTED, TYPE-SAFE CATCH BLOCK ---
    if (typeof error === 'object' && error !== null && 'code' in error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: `This model already exists for the selected provider.` }, { status: 409 });
      }
    }
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Admin Create Model Error:", errorMessage);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}