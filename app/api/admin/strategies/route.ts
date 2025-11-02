// File: app/api/admin/strategies/route.ts
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

        const { strategyData, modelIds } = await req.json();
        if (!strategyData || !modelIds || !Array.isArray(modelIds)) {
            return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
        }

        const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
        
        // We use a Supabase RPC function to perform this as a single, atomic transaction.
        const { error } = await supabase.rpc('create_routing_strategy', {
            p_strategy_data: strategyData,
            p_model_ids: modelIds
        });

        if (error) { throw error; }

        return NextResponse.json({ message: "Strategy created successfully." }, { status: 201 });

    } catch (error: any) {
        console.error("Admin Create Strategy Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}