import { NextResponse, NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

export async function PATCH(req: NextRequest) {
  try {
    const { userId } = await auth();
    const pathname = req.nextUrl.pathname;
    const projectId = pathname.split('/').pop();
    
    const { budget, webhookUrl, perUserBudget } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!projectId) {
      return NextResponse.json({ error: "Project ID is required." }, { status: 400 });
    }
    if (typeof budget !== 'number' || budget < 0) {
        return NextResponse.json({ error: "Invalid budget amount." }, { status: 400 });
    }
    if (typeof perUserBudget !== 'number' || perUserBudget < 0) {
        return NextResponse.json({ error: "Invalid per-user budget amount." }, { status: 400 });
    }

    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

    const { data, error } = await supabase
      .from('projects')
      .update({ 
        monthly_budget: budget,
        webhook_url: webhookUrl,
        per_user_budget: perUserBudget
      })
      .eq('id', projectId)
      .eq('user_id', userId)
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