// File: app/api/webhooks/stripe/route.ts
import Stripe from 'stripe';
import { headers } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  // We need the raw body for Stripe's verification, so we read it as text
  const body = await req.text();
  
  // --- THE FIX: Add 'await' to the headers() call ---
  const signature = (await headers()).get('stripe-signature') as string;

  let event: Stripe.Event;

  try {
    // Verify the event came from Stripe
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // Handle the checkout.session.completed event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    
    // Retrieve the userId and stripeCustomerId from the session
    const userId = session.client_reference_id;
    const stripeCustomerId = session.customer;
    
    if (!userId || !stripeCustomerId) {
      console.error('Webhook Error: Missing userId or stripeCustomerId in session.');
      return new Response('Webhook Error: Missing user ID or customer ID', { status: 400 });
    }
    
    // For now, we hard-code the plan. In a real app, you'd look this up.
    const plan = 'startup';
    
    const supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_KEY!
    );

    // Update the user's record in our database
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

  // Acknowledge receipt of the webhook
  return new Response(null, { status: 200 });
}