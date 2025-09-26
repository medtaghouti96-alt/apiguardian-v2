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
        const authResult = await authenticateRequest(req);

        if (!authResult.isValid) {
            return NextResponse.json({ error: authResult.errorMessage }, { status: authResult.status });
        }
        if (!authResult.project || !authResult.decryptedKey || authResult.currentSpend === undefined) {
            return NextResponse.json({ error: "Authentication successful but critical data is missing." }, { status: 500 });
        }
        
        const { project, decryptedKey, currentSpend } = authResult;
        
        const budget = Number(project.monthly_budget);
        if (budget > 0 && currentSpend >= budget) {
            console.log(`Project ${project.id} blocked. Spend: ${currentSpend}, Budget: ${budget}`);
            return NextResponse.json({ error: "Monthly budget exceeded." }, { status: 429 });
        }
        
        // --- THE FIX IS HERE ---
        const { adapter, slug } = getProviderAdapter(req);
        if (!adapter) {
            return NextResponse.json({ error: "Invalid provider in URL." }, { status: 400 });
        }
        // --- END OF FIX ---

        const upstreamResponse = await forwardRequestToProvider({
            request: req.clone(),
            decryptedKey: decryptedKey,
            adapter: adapter, // <-- Now we correctly pass the adapter
            slug: slug
        });
        const requestEndTime = Date.now();

        processAnalyticsInBackground({
          response: upstreamResponse.clone(),
          adapter: adapter, // <-- And we correctly pass the adapter here too
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

// You can remove the GET handler if you have a middleware, or keep it. Let's keep it for clarity.
export async function GET(req: NextRequest) {
    return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405, headers: { 'Allow': 'POST' } });
}