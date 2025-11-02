import { NextResponse, NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

/**
 * Helper function to reliably extract the strategyId from the URL pathname.
 * e.g., /api/admin/strategies/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
 */
function getStrategyId(req: NextRequest): string | undefined {
    // .split('/') will turn the path into an array of segments.
    // .pop() gets the very last segment, which is our dynamic ID.
    return req.nextUrl.pathname.split('/').pop();
}

// NOTE: For the MVP Admin Panel, we are only implementing the DELETE functionality
// for individual strategies, as updating a strategy (especially its linked models)
// is a more complex UI/API interaction. It's simpler to delete and recreate.
// A PATCH handler can be added here in the future.


/**
 * Handles the deletion of a specific routing strategy.
 */
export async function DELETE(req: NextRequest) {
    try {
        // 1. Authenticate and authorize the admin user.
        const { userId } = await auth();
        if (userId !== process.env.ADMIN_USER_ID) {
            return new Response("Forbidden: You do not have permission to perform this action.", { status: 403 });
        }
        
        // 2. Get the strategy ID from the URL.
        const strategyId = getStrategyId(req);
        if (!strategyId) {
            return NextResponse.json({ error: "Strategy ID missing from URL." }, { status: 400 });
        }

        // 3. Create a Supabase client.
        const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
        
        // 4. Perform the delete operation.
        // Because we set up "ON DELETE CASCADE" in our database schema, when this
        // strategy is deleted, all its corresponding rows in the `strategy_models`
        // table will be automatically deleted as well. This keeps our data clean.
        const { error } = await supabase.from('routing_strategies').delete().eq('id', strategyId);
        
        if (error) { 
            // If the database operation fails, throw the error to be caught below.
            throw error;
        }
        
        console.log(`Admin user ${userId} deleted strategy ${strategyId}.`);
        
        // 5. Return a "204 No Content" response, which is the standard for a successful DELETE.
        return new Response(null, { status: 204 });

    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        console.error("Admin Delete Strategy Error:", errorMessage);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}