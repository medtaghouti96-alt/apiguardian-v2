import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '../../_lib/auth';
import { getProviderAdapter } from '../../_lib/provider-factory';
import { forwardRequestToProvider } from '../../_lib/forwarder';
import { processAnalyticsInBackground } from '../../_lib/analytics';
import { checkBudgetAndSendNotification } from '../../_lib/notifier';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    // --- START OF NEW DEBUGGING BLOCK ---
    // This will log every incoming header to help us find our custom one.
    console.log("--- RECEIVED REQUEST HEADERS ---");
    const headersObject: Record<string, string> = {};
    req.headers.forEach((value, key) => {
        headersObject[key] = value;
    });
    console.log(JSON.stringify(headersObject, null, 2));
    console.log("--- END OF HEADERS ---");
    // --- END OF NEW DEBUGGING BLOCK ---

    const requestStartTime = Date.now();
    try {
        const authResult = await authenticateRequest(req);
        if (!authResult.isValid) {
            return NextResponse.json({ error: authResult.errorMessage }, { status: authResult.status });
        }
        if (!authResult.project || !authResult.decryptedKey || authResult.currentSpend === undefined) {
            return NextResponse.json({ error: "Auth successful but data is missing." }, { status: 500 });
        }
        const { project, decryptedKey, currentSpend } = authResult;
        
        const budget = Number(project.monthly_budget);
        if (budget > 0 && currentSpend >= budget) {
            checkBudgetAndSendNotification(project.id);
            return NextResponse.json({ error: "Monthly budget exceeded." }, { status: 429 });
        }
        
        const { adapter, slug } = await getProviderAdapter(req);
        if (!adapter) {
            return NextResponse.json({ error: "Invalid or unsupported provider in URL." }, { status: 400 });
        }

        const upstreamResponse = await forwardRequestToProvider({
            request: req.clone(),
            decryptedKey: decryptedKey,
            adapter: adapter,
            slug: slug
        });
        const requestEndTime = Date.now();

        // Read the custom header from the original request.
        // We will try the lowercase version as our primary theory.
        const endUserId = req.headers.get('x-apiguardian-user-id');

        processAnalyticsInBackground({
          response: upstreamResponse.clone(),
          adapter,
          projectId: project.id,
          userId: project.user_id,
          endUserId: endUserId, // Pass the ID (or null) to the analytics function
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