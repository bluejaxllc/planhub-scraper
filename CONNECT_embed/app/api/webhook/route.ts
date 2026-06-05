import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

let _stripe: Stripe | null = null;
function getStripe() {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2023-10-16' as any,
    });
  }
  return _stripe;
}

// We must use the SERVICE ROLE key to bypass RLS and safely update the user's subscription
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  let event: Stripe.Event;

  try {
    if (!signature || !webhookSecret) {
      throw new Error('Missing stripe signature or webhook secret');
    }
    event = getStripe().webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error(`Webhook Error: ${err.message}`);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // Look for successful checkouts
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;
    const customerEmail = session.customer_details?.email;

    if (userId) {
      // 1. Update the local Supabase 'users' table
      const { error: dbError } = await getSupabaseAdmin()
        .from('users')
        .update({
          subscription_status: 'active',
          stripe_customer_id: session.customer as string
        })
        .eq('id', userId);

      if (dbError) {
        console.error('Error updating user in Supabase:', dbError);
      } else {
        console.log(`Successfully upgraded user ${userId} to Pro (Active).`);
      }

      // 2. BlueJax + GoHighLevel Integration
      // Fires contact data to the BlueJax GHL automation webhook
      try {
        const bluejaxGhlWebhookUrl = process.env.BLUEJAX_GHL_WEBHOOK_URL;
        if (bluejaxGhlWebhookUrl && customerEmail) {

          await fetch(bluejaxGhlWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: customerEmail,
              tags: ['pro_subscriber', 'connect_app', 'stripe_customer'],
              customFields: {
                subscription_status: 'active',
                stripe_customer_id: session.customer,
                app_user_id: userId
              },
              source: 'Connect App Stripe Integration'
            })
          });
          console.log(`Sent BlueJax GHL integration webhook for ${customerEmail}`);

        } else {
          console.warn('BLUEJAX_GHL_WEBHOOK_URL not configured. GHL integration skipped.');
        }
      } catch (ghlError) {
        console.error('Error sending data to BlueJax GHL webhook:', ghlError);
      }
    }
  }

  return new NextResponse('Webhook processed successfully', { status: 200 });
}
