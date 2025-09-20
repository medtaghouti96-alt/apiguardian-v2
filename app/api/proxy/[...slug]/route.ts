import { NextRequest, NextResponse } from 'next/server';

// Import all our _lib modules
import { authenticateRequest } from '../../_lib/auth';
import { getProviderAdapter } from '../../_lib/provider-factory';
import { forwardRequestToProvider } from '../../_lib/forwarder';
// We will use the analytics module in Sprint 3
// import { processAnalyticsInBackground } from '../../_lib/analytics';

// Use the Node.js runtime for the native crypto module
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    try {
        // --- Step 1: Authentication & Decryption ---
        // The authenticateRequest module now ALSO fetches the current spend.
        const authResult = await authenticateRequest(req);

        // --- TEMPORARY DEBUG LOG FOR SPRINT 4.2 VERIFICATION ---
        // This will print the full result, including the new `currentSpend`, to your Vercel logs.
        console.log("Auth Result with Spend:", JSON.stringify(authResult, null, 2));
        // --- END OF TEMPORARY LOG ---

        if (!authResult.isValid) {
            return NextResponse.json({ error: authResult.errorMessage }, { status: authResult.status });
        }
        if (!authResult.project || !authResult.decryptedKey || authResult.currentSpend === undefined) {
            return NextResponse.json({ error: "Authentication successful but critical data is missing." }, { status: 500 });
        }
        
        // We now de-structure `currentSpend` from the result as well.
        const { project, decryptedKey, currentSpend } = authResult;
        
        // The blocking logic will go here in the next step.
        // For now, we are just verifying that we receive the `currentSpend`.
        
        // --- Step 2: Provider Selection ---
        const adapter = getProviderAdapter(req);
        if (!adapter) {
            return NextResponse.json({ error: "Invalid AI provider specified in URL." }, { status: 400 });
        }

        // --- Step 3: Forward Request ---
        const upstreamResponse = await forwardRequestToProvider({
            request: req.clone(),
            decryptedKey: decryptedKey,
            adapter: adapter
        });
        
        // --- Step 4 (Future): Asynchronous Analytics will go here ---
        // processAnalyticsInBackground({ ... });
        
        // --- Step 5: Stream Response Back to User ---
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