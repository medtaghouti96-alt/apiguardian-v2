import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '../../_lib/auth';
import { getProviderAdapter } from '../../_lib/provider-factory';
import { forwardRequestToProvider } from '../../_lib/forwarder';
import { processAnalyticsInBackground } from '../../_lib/analytics';
import { checkBudgetAndSendNotification } from '../../_lib/notifier';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    // --- START OF DEBUGGING BLOCK ---
    // This logs the key we receive before anything else happens.
    const authHeaderForDebug = req.headers.get('Authorization');
    let agKeyForDebug = null;
    if (authHeaderForDebug && authHeaderForDebug.startsWith('Bearer ag-')) {
      agKeyForDebug = authHeaderForDebug.split(' ')[1];
    }
    console.log(`--- PROXY START ---`);
    console.log(`DEBUG: Key received in header is [${agKeyForDebug || 'NULL'}]`);
    // --- END OF DEBUGGING BLOCK ---

    const requestStartTime = Date.now();
    try {
        const authResult = await authenticateRequest(req);
        
        // This logs the outcome of the authentication attempt.
        console.log(`DEBUG: Auth result isValid = ${authResult.isValid}`);
        if(!authResult.isValid) {
            console.log(`DEBUG: Auth failed with message: ${authResult.errorMessage}`);
        }

        if (!authResult.isValid) {
            return NextResponse.json({ error: authResult.errorMessage }, { status: authResult.status });
        }

        // This check is important for type safety in the rest of the function.
        if (!authResult.project || !authResult.decryptedKey || authResult.currentSpend === undefined) {
            return NextResponse.json({ error: "Auth successful but critical data is missing." }, { status: 500 });
        }
        
        console.log("DEBUG: Authentication was successful! Proceeding to budget check...");
        const { project, decryptedKey, currentSpend } = authResult;
        
        const budget = Number(project.monthly_budget);
        if (budget > 0 && currentSpend >= budget) {
            checkBudgetAndSendNotification(project.id, currentSpend); // <-- THE FI);
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

        processAnalyticsInBackground({
          response: upstreamResponse.clone(),
          adapter,
          projectId: project.id,
          userId: project.user_id,
          endUserId: req.headers.get('x-apiguardian-user-id'),
          latency: requestEndTime - requestStartTime
        });
        
        return upstreamResponse;

    } catch (error) {
        console.error("CRITICAL ERROR in proxy handler:", error);
        const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}

// Keep the GET handler to gracefully handle incorrect request methods.
export async function GET(req: NextRequest) {
    return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405, headers: { 'Allow': 'POST' } });
}