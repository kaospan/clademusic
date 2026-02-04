// Supabase Edge Function: Stripe webhook handler
// Verifies signature, logs events, updates subscriptions and credits

import { serve } from 'https://deno.land/std@0.223.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')!;
const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2024-12-18.acacia' });
const service = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const CREDIT_ALLOWANCE: Record<string, number> = {
  free: 50,
  starter: 500,
  pro: 2000,
};

serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const signature = req.headers.get('stripe-signature');
  if (!signature) return new Response('Missing signature', { status: 400 });

  const rawBody = await req.arrayBuffer();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed', err);
    return new Response('Invalid signature', { status: 400 });
  }

  // idempotent logging
  await logEvent(null, event.type, event.id, event);

  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
      break;
    case 'invoice.paid':
      await handleInvoicePaid(event.data.object as Stripe.Invoice);
      break;
    case 'invoice.payment_failed':
      await handlePaymentFailed(event.data.object as Stripe.Invoice);
      break;
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
      break;
    default:
      console.log('Unhandled event', event.type);
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.user_id;
  const plan = (session.metadata?.plan as string) || 'starter';
  const subscriptionId = session.subscription as string | undefined;
  const customerId = session.customer as string | undefined;

  if (!userId || !subscriptionId || !customerId) {
    console.warn('Missing metadata on checkout.session.completed');
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  await upsertSubscription(userId, customerId, subscription, plan);
  await grantSubscriptionAllowance({
    userId,
    plan,
    subscription,
    providerReference: session.id,
  });
  await logEvent(userId, 'checkout.session.completed', session.id, session);
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string | undefined;
  if (!subscriptionId) return;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const userId = subscription.metadata?.user_id as string | undefined;
  const plan = (subscription.metadata?.plan as string) || 'starter';
  const customerId = subscription.customer as string | undefined;

  if (!userId || !customerId) return;

  await upsertSubscription(userId, customerId, subscription, plan);
  await grantSubscriptionAllowance({
    userId,
    plan,
    subscription,
    providerReference: invoice.id,
  });
  await awardReferralConversion(userId, invoice.id);
  await logEvent(userId, 'invoice.paid', invoice.id, invoice);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string | undefined;
  if (!subscriptionId) return;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const userId = subscription.metadata?.user_id as string | undefined;
  const customerId = subscription.customer as string | undefined;

  if (!userId || !customerId) return;

  await upsertSubscription(userId, customerId, subscription, subscription.metadata?.plan || 'starter', 'past_due');
  await logEvent(userId, 'invoice.payment_failed', invoice.id, invoice);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.user_id as string | undefined;
  const customerId = subscription.customer as string | undefined;
  if (!userId || !customerId) return;

  await upsertSubscription(userId, customerId, subscription, subscription.metadata?.plan || 'starter', 'canceled');
  await logEvent(userId, 'customer.subscription.deleted', subscription.id, subscription);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.user_id as string | undefined;
  const customerId = subscription.customer as string | undefined;
  if (!userId || !customerId) return;

  await upsertSubscription(userId, customerId, subscription, subscription.metadata?.plan || 'starter');
  await logEvent(userId, 'customer.subscription.updated', subscription.id, subscription);
}

async function upsertSubscription(
  userId: string,
  customerId: string,
  subscription: Stripe.Subscription,
  plan: string,
  overrideStatus?: string,
) {
  const status = overrideStatus || subscription.status;
  await service
    .from('subscriptions')
    .upsert({
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      plan,
      status,
      current_period_start: subscription.current_period_start
        ? new Date(subscription.current_period_start * 1000).toISOString()
        : null,
      current_period_end: subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000).toISOString()
        : null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
}

async function grantSubscriptionAllowance(params: {
  userId: string;
  plan: string;
  subscription: Stripe.Subscription;
  providerReference: string;
}) {
  const { userId, plan, subscription, providerReference } = params;

  const amount = CREDIT_ALLOWANCE[plan] ?? CREDIT_ALLOWANCE.free;
  const periodStart = subscription.current_period_start ?? null;
  const periodEnd = subscription.current_period_end ?? null;
  const expiresAt = periodEnd ? new Date(periodEnd * 1000).toISOString() : null;

  const idempotencyKey = periodStart
    ? `sub_allowance:${subscription.id}:${periodStart}`
    : `sub_allowance:${subscription.id}:${providerReference}`;

  const { error } = await service.rpc('grant_credits', {
    p_user_id: userId,
    p_amount: amount,
    p_bucket: 'allowance',
    p_source: 'subscription_allowance',
    p_expires_at: expiresAt,
    p_idempotency_key: idempotencyKey,
    p_metadata: {
      plan,
      stripe_subscription_id: subscription.id,
      current_period_start: periodStart,
      current_period_end: periodEnd,
      provider_reference: providerReference,
    },
    p_provider: 'stripe',
    p_provider_reference: providerReference,
  });

  if (error) {
    throw error;
  }
}

async function awardReferralConversion(refereeUserId: string, providerReference: string) {
  const { error } = await service.rpc('award_referral_conversion', {
    p_referee_user_id: refereeUserId,
    p_provider_reference: providerReference,
  });

  if (error) {
    // Never fail billing because referral reward failed.
    console.warn('Referral conversion award failed', error);
  }
}

async function logEvent(userId: string | null, type: string, providerId: string, payload: unknown) {
  try {
    await service.from('billing_events').insert({
      user_id: userId,
      type,
      provider_event_id: providerId,
      payload,
    });
  } catch (err) {
    // ignore duplicate provider_event_id
    console.warn('Log event failed (possibly duplicate)', err);
  }
}
