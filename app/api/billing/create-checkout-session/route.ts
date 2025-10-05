// File: app/api/billing/create-checkout-session/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { priceId } = await req.json();
    const origin = req.headers.get('origin') || 'https://apiguardian-v2.vercel.app';

    // Create a Checkout Session on Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      // Pass the Clerk userId in the metadata so we know who to upgrade
      client_reference_id: userId,
      // Define the URLs Stripe will redirect to
      success_url: `${origin}/dashboard?payment=success`,
      cancel_url: `${origin}/dashboard/billing?payment=cancelled`,
    });

    if (!session.url) {
      throw new Error("Could not create Stripe session.");
    }
    
    // Return the URL for the user to be redirected to
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}