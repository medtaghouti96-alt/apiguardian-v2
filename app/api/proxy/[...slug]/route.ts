// File: app/api/proxy/[...slug]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '../../_lib/auth';
import { getProviderAdapter } from '../../_lib/provider-factory';
import { forwardRequestToProvider } from '../../_lib/forwarder';
import { processAnalyticsInBackground } from '../../_lib/analytics'; // <-- IMPORT

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    const requestStartTime = Date.now(); // <-- CAPTURE START TIME
    try {
        const authResult = await authenticateRequest(req);

        if (!authResult.isValid) {
            return NextResponse.json({ error: authResult.errorMessage }, { status: authResult.status });
        }
        if (!authResult.project || !authResult.decryptedKey) {
            return NextResponse.json({ error: "Auth successful but data missing." }, { status: 500 });
        }
        
        const { project, decryptedKey } = authResult;
        const adapter = getProviderAdapter(req);

        if (!adapter) {
            return NextResponse.json({ error: "Invalid provider in URL." }, { status: 400 });
        }

        const upstreamResponse = await forwardRequestToProvider({
            request: req.clone(),
            decryptedKey: decryptedKey,
            adapter: adapter
        });
        const requestEndTime = Date.now(); // <-- CAPTURE END TIME

        // --- THE CRITICAL STEP: ASYNCHRONOUS ANALYTICS CALL ---
        // We do NOT `await` this. This lets the user's response return immediately,
        // while our logging runs in the background.
        processAnalyticsInBackground({
          response: upstreamResponse.clone(),
          adapter,
          projectId: project.id,
          latency: requestEndTime - requestStartTime
        });
        
        return upstreamResponse;

    } catch (error) {
        console.error("CRITICAL ERROR in proxy handler:", error);
        const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}