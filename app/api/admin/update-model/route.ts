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

    const { modelId, inputCost, outputCost, contextWindow, qualityTier } = await req.json();
    if (!modelId || inputCost === undefined || outputCost === undefined) {
      return NextResponse.json({ error: "Model ID and costs are required." }, { status: 400 });
    }

    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
    const { data, error } = await supabase
      .from('models')
      .update({
        input_cost_per_million_tokens: inputCost,
        output_cost_per_million_tokens: outputCost,
        context_window: contextWindow,
        quality_tier: qualityTier,
      })
      .eq('id', modelId)
      .select()
      .single();

    if (error) { throw error; }

    console.log(`Admin user ${userId} updated model ${data.model_name}.`);
    return NextResponse.json({ message: `Model ${data.model_name} updated successfully.` });

  } catch (error) {
    // --- APPLYING THE SAME TYPE-SAFE CATCH BLOCK HERE ---
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Admin Update Model Error:", errorMessage);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}