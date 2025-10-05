// File: app/api/webhooks/stripe/route.ts
import Stripe from 'stripe';
import { headers } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
// 'NextResponse' is no longer needed, so we remove the import.

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  const body = await req.text();
  const signature = (await headers()).get('stripe-signature') as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) { // <-- FIX #2: Change 'err: any' to a more specific type
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error(`Webhook signature verification failed: ${errorMessage}`);
    return new Response(`Webhook Error: ${errorMessage}`, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    
    const userId = session.client_reference_id;
    const stripeCustomerId = session.customer;
    
    if (!userId || !stripeCustomerId) {
      console.error('Webhook Error: Missing userId or stripeCustomerId in session.');
      return new Response('Webhook Error: Missing user ID or customer ID', { status: 400 });
    }
    
    const plan = 'startup';
    
    const supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_KEY!
    );

    const { error } = await supabase
      .from('users')
      .update({ 
        plan: plan, 
        stripe_customer_id: stripeCustomerId as string 
      })
      .eq('id', userId);

    if (error) {
        console.error("Stripe webhook: Supabase update error:", error.message);
        return new Response('Error updating user plan', { status: 500 });
    }

    console.log(`Successfully upgraded user ${userId} to the ${plan} plan.`);
  }

  return new Response(null, { status: 200 });
}