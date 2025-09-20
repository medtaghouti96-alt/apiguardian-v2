// File: app/api/projects/[projectId]/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

// The function signature is now corrected to the standard Next.js App Router format.
export async function PATCH(
  req: Request,
  context: { params: { projectId: string } }
) {
  try {
    const { userId } = await auth();
    // We now access the projectId from the 'context' object.
    const { projectId } = context.params;
    const { budget } = await req.json();

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

    // Update the project's budget, but only if the project belongs to the logged-in user.
    // This is a critical security check.
    const { data, error } = await supabase
      .from('projects')
      .update({ monthly_budget: budget })
      .eq('id', projectId)
      .eq('user_id', userId) // <-- SECURITY CHECK
      .select()
      .single();

    if (error) {
      console.error("Error updating budget:", error);
      return NextResponse.json({ error: "Could not update project budget." }, { status: 500 });
    }
    
    return NextResponse.json(data);

  } catch (error) {
    console.error("Error in PATCH handler:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}