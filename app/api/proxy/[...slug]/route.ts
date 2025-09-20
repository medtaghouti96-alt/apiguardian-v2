// File: app/api/proxy/[...slug]/route.ts
import { NextRequest, NextResponse } from 'next/server';

import { authenticateRequest } from '../../_lib/auth';
import { getProviderAdapter } from '../../_lib/provider-factory';
import { forwardRequestToProvider } from '../../_lib/forwarder';
import { processAnalyticsInBackground } from '../../_lib/analytics';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    const requestStartTime = Date.now();
    try {
        // Step 1: Authentication, Decryption, and Spend Fetching
        const authResult = await authenticateRequest(req);

        if (!authResult.isValid) {
            return NextResponse.json({ error: authResult.errorMessage }, { status: authResult.status });
        }
        if (!authResult.project || !authResult.decryptedKey || authResult.currentSpend === undefined) {
            return NextResponse.json({ error: "Authentication successful but critical data is missing." }, { status: 500 });
        }
        
        const { project, decryptedKey, currentSpend } = authResult;
        
        // --- STEP 2: THE BLOCKING LOGIC ---
        // This is the "Circuit Breaker".
        const budget = Number(project.monthly_budget);
        if (budget > 0 && currentSpend >= budget) {
            // If the budget is set (is greater than 0) and the current spend has
            // met or exceeded it, we block the request.
            console.log(`Project ${project.id} blocked. Spend: ${currentSpend}, Budget: ${budget}`);
            return NextResponse.json({ error: "Monthly budget exceeded." }, { status: 429 }); // 429 Too Many Requests
        }
        // --- END OF BLOCKING LOGIC ---
        
        // If the request is not blocked, proceed as normal.
        const adapter = getProviderAdapter(req);
        if (!adapter) {
            return NextResponse.json({ error: "Invalid AI provider in URL." }, { status: 400 });
        }

        const upstreamResponse = await forwardRequestToProvider({
            request: req.clone(),
            decryptedKey: decryptedKey,
            adapter: adapter
        });
        const requestEndTime = Date.now();

        processAnalyticsInBackground({
          response: upstreamResponse.clone(),
          adapter,
          projectId: project.id,
          userId: project.user_id, // We'll need this for alerts
          latency: requestEndTime - requestStartTime
        });
        
        return upstreamResponse;

    } catch (error) {
        console.error("CRITICAL ERROR in proxy handler:", error);
        const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405, headers: { 'Allow': 'POST' } });
}