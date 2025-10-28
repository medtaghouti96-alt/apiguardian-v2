// File: app/api/proxy/[...slug]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '../../_lib/auth';
import { getProviderAdapter } from '../../_lib/provider-factory';
import { forwardRequestToProvider } from '../../_lib/forwarder';
import { processAnalyticsInBackground } from '../../_lib/analytics';
import { checkBudgetAndSendNotification } from '../../_lib/notifier';
import { redis } from '../../_lib/redis'; // Import Redis for our cache
import { createRequestHash } from '../../_lib/caching'; // Import our new hasher

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    const requestStartTime = Date.now();
    try {
        // 1. Auth and Budget Checks (No change)
        const authResult = await authenticateRequest(req);
        if (!authResult.isValid) { return NextResponse.json({ error: authResult.errorMessage }, { status: authResult.status }); }
        if (!authResult.project || !authResult.decryptedKey || authResult.currentSpend === undefined) {
            return NextResponse.json({ error: "Auth successful but data is missing." }, { status: 500 });
        }
        const { project, decryptedKey, currentSpend } = authResult;

        // --- 2. NEW REQUEST CACHING LAYER (THE "READ" PATH) ---
        if (project.caching_enabled) {
            const requestBody = await req.clone().json();
            const requestHash = createRequestHash(requestBody);
            const cacheKey = `req-cache:${project.id}:${requestHash}`;

            const cachedResponse = await redis.get(cacheKey);

            if (cachedResponse) {
                console.log(`[Caching] HIT for project ${project.id}`);
                // We found a valid, non-expired entry! Log this "free" request.
                // We can create a simplified analytics call for cached responses.
                // For now, we'll skip detailed logging for cache hits to keep it simple.
                
                // Return the cached response immediately with a special header
                return NextResponse.json(cachedResponse, { headers: { 'X-APIGuardian-Cache': 'HIT' } });
            }
            console.log(`[Caching] MISS for project ${project.id}`);
        }
        // --- END OF CACHING LAYER ---

        // 3. Global Budget Blocker (No change)
        const budget = Number(project.monthly_budget);
        if (budget > 0 && currentSpend >= budget) {
            checkBudgetAndSendNotification(project.id, currentSpend);
            return NextResponse.json({ error: "Monthly budget exceeded." }, { status: 429 });
        }
        
        // 4. Forward to Provider (No change)
        const { adapter, slug } = await getProviderAdapter(req);
        if (!adapter) { return NextResponse.json({ error: "Invalid provider in URL." }, { status: 400 }); }

        const upstreamResponse = await forwardRequestToProvider({
            request: req.clone(), decryptedKey: decryptedKey, adapter: adapter, slug: slug
        });
        const requestEndTime = Date.now();

        // --- 5. NEW: SAVE TO CACHE ON MISS (THE "WRITE" PATH) ---
        if (project.caching_enabled && upstreamResponse.ok) {
            // We need to clone the response to read it here and still be able to send it to the user.
            const responseToCache = await upstreamResponse.clone().json();
            const requestBodyForHash = await req.clone().json();
            const requestHash = createRequestHash(requestBodyForHash);
            const cacheKey = `req-cache:${project.id}:${requestHash}`;
            const ttl = project.caching_ttl_seconds || 3600;

            // Save the successful response to the Redis cache for next time.
            // We use `await` to ensure it's saved before we proceed in the background.
            await redis.set(cacheKey, responseToCache, { ex: ttl });
            console.log(`[Caching] SET for project ${project.id} with TTL ${ttl}s`);
        }

        // 6. Analytics and Return Response (No change)
        processAnalyticsInBackground({
            response: upstreamResponse.clone(), adapter, projectId: project.id,
            userId: project.user_id, endUserId: req.headers.get('x-apiguardian-user-id'),
            latency: requestEndTime - requestStartTime
        });
        
        return upstreamResponse;
    } catch (error) {
        console.error("CRITICAL ERROR in proxy handler:", error);
        const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}