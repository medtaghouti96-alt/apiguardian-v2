// File: app/api/projects/[projectId]/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

export async function PATCH(req: NextRequest) {
  try {
    const { userId } = await auth();
    const pathname = req.nextUrl.pathname;
    const projectId = pathname.split('/').pop();
    
    // 1. Get both budget and webhookUrl from the request body
    const { budget, webhookUrl } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!projectId) {
      return NextResponse.json({ error: "Project ID is required." }, { status: 400 });
    }
    if (typeof budget !== 'number' || budget < 0) {
        return NextResponse.json({ error: "Invalid budget amount." }, { status: 400 });
    }

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    // 2. Add webhook_url to the update statement
    const { data, error } = await supabase
      .from('projects')
      .update({ 
        monthly_budget: budget,
        webhook_url: webhookUrl 
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