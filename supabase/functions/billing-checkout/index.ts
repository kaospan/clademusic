// Supabase Edge Function: Create Stripe Checkout Session for subscriptions
// Supports plans: free (no checkout), starter, pro

import { serve } from 'https://deno.land/std@0.223.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')!;
const PRICE_STARTER = Deno.env.get('STRIPE_PRICE_STARTER_ID')!;
const PRICE_PRO = Deno.env.get('STRIPE_PRICE_PRO_ID')!;

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2024-12-18.acacia' });

const PLAN_CONFIG = {
  starter: { priceId: PRICE_STARTER, plan: 'starter' },
  pro: { priceId: PRICE_PRO, plan: 'pro' },
} as const;

type PlanKey = keyof typeof PLAN_CONFIG;

serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response('Unauthorized', { status: 401 });

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const service = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: userRes } = await userClient.auth.getUser();
    const user = userRes?.user;
    if (!user) return new Response('Unauthorized', { status: 401 });

    const body = await req.json().catch(() => ({}));
    const plan = (body.plan as PlanKey) || 'starter';
    const successUrl = body.successUrl || `${req.headers.get('origin')}/billing?success=1`;
    const cancelUrl = body.cancelUrl || `${req.headers.get('origin')}/billing?canceled=1`;

    if (!PLAN_CONFIG[plan]) {
      return new Response('Invalid plan', { status: 400 });
    }

    // Fetch profile for email and stripe_customer_id
    const { data: profile, error: profileError } = await service
      .from('profiles')
      .select('id, email, full_name, stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('Profile fetch error', profileError);
      return new Response('Profile not found', { status: 400 });
    }

    let customerId = profile.stripe_customer_id as string | null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile.email,
        name: profile.full_name || undefined,
        metadata: { user_id: profile.id },
      });
      customerId = customer.id;
      await service.from('profiles').update({ stripe_customer_id: customerId }).eq('id', profile.id);
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [
        {
          price: PLAN_CONFIG[plan].priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        user_id: profile.id,
        plan: PLAN_CONFIG[plan].plan,
      },
      subscription_data: {
        metadata: {
          user_id: profile.id,
          plan: PLAN_CONFIG[plan].plan,
        },
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Checkout error', err);
    return new Response('Server error', { status: 500 });
  }
});
