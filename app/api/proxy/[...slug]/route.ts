// File: app/api/proxy/[...slug]/route.ts
import { NextRequest, NextResponse } from 'next/server';

// Import all our _lib modules
import { authenticateRequest } from '../../_lib/auth';
import { getProviderAdapter } from '../../_lib/provider-factory';
import { forwardRequestToProvider } from '../../_lib/forwarder';
import { processAnalyticsInBackground } from '../../_lib/analytics';
import { checkBudgetAndSendNotification } from '../../_lib/notifier'; // <-- IMPORT THE NOTIFIER

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
        
        // --- STEP 2: THE FINAL BLOCKING LOGIC ---
        const budget = Number(project.monthly_budget);
        if (budget > 0 && currentSpend >= budget) {
            console.log(`Project ${project.id} blocked. Spend: ${currentSpend}, Budget: ${budget}`);
            
            // THE FIX: Manually trigger the notifier one last time to ensure
            // the 100% alert is sent for the blocking event.
            // We do not await this, it runs in the background.
            checkBudgetAndSendNotification(project.id);
            
            return NextResponse.json({ error: "Monthly budget exceeded." }, { status: 429 });
        }
        // --- END OF BLOCKING LOGIC ---
        
        // If the request is not blocked, proceed as normal.
        const { adapter, slug } = getProviderAdapter(req);
        if (!adapter) {
            return NextResponse.json({ error: "Invalid provider in URL." }, { status: 400 });
        }

        const upstreamResponse = await forwardRequestToProvider({
            request: req.clone(),
            decryptedKey: decryptedKey,
            adapter: adapter,
            slug: slug
        });
        const requestEndTime = Date.now();

        // The normal analytics process (which also calls the notifier)
        // runs for successful, non-blocked requests.
        processAnalyticsInBackground({
          response: upstreamResponse.clone(),
          adapter,
          projectId: project.id,
          userId: project.user_id,
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