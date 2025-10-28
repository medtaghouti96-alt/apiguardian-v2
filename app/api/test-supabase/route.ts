// File: app/api/test-supabase/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

export async function GET() {
    console.log("--- Supabase Connection Test START ---");

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !serviceKey) {
        console.error("CRITICAL: Supabase environment variables are missing!");
        return NextResponse.json({ error: "Server is missing Supabase credentials." }, { status: 500 });
    }
    
    console.log("Found Supabase credentials. Attempting to create client...");

    try {
        const supabase = createClient(supabaseUrl, serviceKey);
        console.log("Supabase client created. Attempting to query 'projects' table...");

        const { data: projects, error } = await supabase
            .from('projects')
            .select('id, name, apiguardian_api_key')
            .limit(1); // Just get one row to test

        if (error) {
            console.error("Supabase query FAILED.");
            console.error(error);
            return NextResponse.json({ error: `Supabase query failed: ${error.message}` }, { status: 500 });
        }

        console.log("Supabase query SUCCEEDED.");
        console.log("Data received:", projects);
        
        return NextResponse.json({ success: true, data: projects });

    } catch (e) {
        console.error("A critical error occurred during the test:", e);
        return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
    }
}