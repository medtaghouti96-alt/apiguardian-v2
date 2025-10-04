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
            return NextResponse.json({ error: "Auth successful but data missing." }, { status: 500 });
        }
        const { project, decryptedKey, currentSpend } = authResult;
        
        const budget = Number(project.monthly_budget);
        if (budget > 0 && currentSpend >= budget) {
            return NextResponse.json({ error: "Monthly budget exceeded." }, { status: 429 });
        }
        
        const { adapter, slug } = getProviderAdapter(req);
        if (!adapter) {
            return NextResponse.json({ error: "Invalid provider in URL." }, { status: 400 });
        }
        const upstreamResponse = await forwardRequestToProvider({
            request: req.clone(), decryptedKey: decryptedKey, adapter: adapter, slug: slug
        });
        const requestEndTime = Date.now();
        processAnalyticsInBackground({
            response: upstreamResponse.clone(), adapter, projectId: project.id, userId: project.user_id, latency: requestEndTime - requestStartTime
        });
        
        return upstreamResponse;
    } catch (error) {
        console.error("CRITICAL ERROR in proxy handler:", error);
        const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}