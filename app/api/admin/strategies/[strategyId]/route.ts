// File: app/api/admin/strategies/[strategyId]/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

// --- DELETE a strategy ---
export async function DELETE(req: NextRequest, { params }: { params: { strategyId: string } }) {
    try {
        const { userId } = await auth();
        if (userId !== process.env.ADMIN_USER_ID) return new Response("Forbidden", { status: 403 });
        
        const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
        
        // Because of "ON DELETE CASCADE", deleting the strategy will automatically delete its model links.
        const { error } = await supabase.from('routing_strategies').delete().eq('id', params.strategyId);
        if (error) throw error;
        
        return new Response(null, { status: 204 });
    } catch (error) { /* ... error handling ... */ }
}

// --- PATCH: Update a strategy ---
// (This is more complex as it involves updating the strategy and its model links.
// For the MVP admin, we can keep it simple: just deleting and re-creating is easier.)