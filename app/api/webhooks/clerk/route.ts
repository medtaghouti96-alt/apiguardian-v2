// File: app/api/webhooks/clerk/route.ts
import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

    if (!WEBHOOK_SECRET) {
        throw new Error('Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to your environment')
    }

    // --- FIX #1: Add 'await' to the headers() call ---
    const headerPayload = await headers();
    const svix_id = headerPayload.get("svix-id");
    const svix_timestamp = headerPayload.get("svix-timestamp");
    const svix_signature = headerPayload.get("svix-signature");

    if (!svix_id || !svix_timestamp || !svix_signature) {
        return new Response('Error occured -- no svix headers', { status: 400 });
    }

    const payload = await req.json();
    const body = JSON.stringify(payload);

    const wh = new Webhook(WEBHOOK_SECRET);
    let evt: WebhookEvent;

    try {
        evt = wh.verify(body, {
            "svix-id": svix_id,
            "svix-timestamp": svix_timestamp,
            "svix-signature": svix_signature,
        }) as WebhookEvent;
    } catch (err) {
        console.error('Error verifying webhook:', err);
        return new Response('Error occured during verification', { status: 400 });
    }

    const eventType = evt.type;
    
    if (eventType === 'user.created') {
        const { id, email_addresses } = evt.data;
        
        // --- FIX #2: Correctly access the first email from the array ---
        const primaryEmail = email_addresses[0]?.email_address;
        
        if (!id || !primaryEmail) {
            return new Response('Error: Missing user ID or email in webhook payload', { status: 400 });
        }

        const supabase = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_KEY!
        );

        const { error } = await supabase
            .from('users')
            .insert({ id: id, email: primaryEmail });
        
        if (error) {
            console.error('Error inserting user into Supabase:', error);
            return new Response('Error occured while creating user in database', { status: 500 });
        }
        
        console.log(`Successfully synced new user ${id} to Supabase.`);
    }
    
    return new Response('Webhook processed successfully', { status: 200 });
}