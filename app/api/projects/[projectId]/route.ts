import { NextResponse, NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

export async function PATCH(req: NextRequest) {
  try {
    const { userId } = await auth();
    const pathname = req.nextUrl.pathname;
    const projectId = pathname.split('/').pop();
    
    // --- THE FIX: Remove `perUserBudget` from the body parsing ---
    const { budget, webhookUrl, cachingEnabled, cacheTtl } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!projectId) {
      return NextResponse.json({ error: "Project ID is required." }, { status: 400 });
    }
    // Basic validation
    if (typeof budget !== 'number' || budget < 0) {
        return NextResponse.json({ error: "Invalid budget amount." }, { status: 400 });
    }
    
    // --- THE FIX: Removed the validation block for the non-existent perUserBudget ---

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    // --- THE FIX: Remove `per_user_budget` from the update statement ---
    const { data, error } = await supabase
      .from('projects')
      .update({ 
        monthly_budget: budget,
        webhook_url: webhookUrl,
        caching_enabled: cachingEnabled,
        caching_ttl_seconds: cacheTtl
      })
      .eq('id', projectId)
      .eq('user_id', userId) // Security check
      .select()
      .single();

    if (error) {
      console.error("Error updating project settings:", error);
      return NextResponse.json({ error: "Could not update project settings." }, { status: 500 });
    }
    
    return NextResponse.json(data);

  } catch (error) {
    console.error("Error in PATCH handler:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}