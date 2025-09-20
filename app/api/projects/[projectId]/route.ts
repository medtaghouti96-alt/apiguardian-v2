// File: app/api/projects/[projectId]/route.ts
import { NextResponse, NextRequest } from 'next/server'; // <-- Import NextRequest
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

// We will use the NextRequest type for the first argument, and no type for the second.
export async function PATCH(
  req: NextRequest
) {
  try {
    const { userId } = await auth();
    
    // --- THE FIX ---
    // Instead of using the context object, we will parse the projectId
    // directly from the URL pathname. This is a more robust method.
    const pathname = req.nextUrl.pathname; // e.g., "/api/projects/xxxxxxxx-xxxx..."
    const projectId = pathname.split('/').pop(); // Gets the last part of the URL
    // --- END OF FIX ---
    
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

    const { data, error } = await supabase
      .from('projects')
      .update({ monthly_budget: budget })
      .eq('id', projectId)
      .eq('user_id', userId)
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