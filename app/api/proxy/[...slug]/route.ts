// File: app/api/proxy/[...slug]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '../../_lib/auth';
import { getProviderAdapter } from '../../_lib/provider-factory';
import { forwardRequestToProvider } from '../../_lib/forwarder';

// Use the Node.js runtime for the native crypto module
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
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
        
        // In Sprint 3, analytics logic will go here.
        
        return upstreamResponse;

    } catch (error) {
        console.error("CRITICAL ERROR in proxy handler:", error);
        const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}