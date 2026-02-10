import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { CladeBrand, ProfileCircle } from '@/components/shared';

interface SubscriptionRow {
  plan: string;
  status: string;
  current_period_end: string | null;
}

interface CreditsRow {
  balance: number;
}

const PLAN_COPY = {
  free: {
    name: 'Free',
    price: '₪0',
    interval: 'month',
    credits: 50,
    features: ['Limited monthly credits', 'No card required', 'Basic access'],
  },
  starter: {
    name: 'Starter',
    price: '₪149',
    interval: 'month',
    credits: 500,
    features: ['Monthly subscription', 'Medium credit allowance', 'Email support'],
  },
  pro: {
    name: 'Pro',
    price: '₪349',
    interval: 'month',
    credits: 2000,
    features: ['Higher credit allowance', 'Priority features', 'Priority support'],
  },
} as const;

type PlanKey = keyof typeof PLAN_COPY;

export default function BillingPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState<SubscriptionRow | null>(null);
  const [credits, setCredits] = useState<CreditsRow | null>(null);
  const [busyPlan, setBusyPlan] = useState<PlanKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentPlan = useMemo<PlanKey>(() => {
    if (!subscription) return 'free';
    const planKey = subscription.plan as PlanKey;
    return PLAN_COPY[planKey] ? planKey : 'free';
  }, [subscription]);

  useEffect(() => {
    if (!user) return;
    const run = async () => {
      const [{ data: sub }, { data: credit }] = await Promise.all([
        supabase.from('subscriptions').select('plan,status,current_period_end').maybeSingle(),
        supabase.from('credits').select('balance').maybeSingle(),
      ]);
      if (sub) setSubscription(sub);
      if (credit) setCredits(credit);
    };
    run().catch((err) => {
      console.error(err);
      setError('Failed to load billing data');
    });
  }, [user]);

  const handleCheckout = async (plan: PlanKey) => {
    try {
      setError(null);
      setBusyPlan(plan);
      const successUrl = `${window.location.origin}/billing?success=1`;
      const cancelUrl = `${window.location.origin}/billing?canceled=1`;
      const { data, error: fnError } = await supabase.functions.invoke('billing-checkout', {
        body: { plan, successUrl, cancelUrl },
      });
      if (fnError) throw fnError;
      if (data?.url) {
        window.location.href = data.url as string;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Could not start checkout');
    } finally {
      setBusyPlan(null);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-white">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white flex-col gap-4">
        <p className="text-xl">Please sign in to manage billing.</p>
        <Button onClick={() => navigate('/auth')}>Go to Sign In</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <header className="mb-8">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <CladeBrand size="sm" />
              <h1 className="text-3xl font-bold">Billing</h1>
            </div>
            <ProfileCircle />
          </div>
          <p className="text-gray-400 mt-2">Manage your plan, credits, and renewals.</p>
        </header>

        {error && <div className="mb-4 rounded-md bg-red-500/10 border border-red-500/50 p-3 text-red-200">{error}</div>}

        <section className="grid gap-6 md:grid-cols-3">
          {(Object.keys(PLAN_COPY) as PlanKey[]).map((plan) => {
            const planData = PLAN_COPY[plan];
            const isCurrent = currentPlan === plan;
            return (
              <Card key={plan} className={`bg-[#11111A] border ${isCurrent ? 'border-cyan-500' : 'border-gray-800'} h-full`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl">{planData.name}</CardTitle>
                    {isCurrent && <Badge>Current</Badge>}
                  </div>
                  <CardDescription className="text-gray-300">
                    <span className="text-3xl font-bold mr-2">{planData.price}</span>
                    <span className="text-sm text-gray-400">/ {planData.interval}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-gray-300">Credits: {planData.credits.toLocaleString()} / month</p>
                  <ul className="space-y-2 text-sm text-gray-300">
                    {planData.features.map((f) => (
                      <li key={f}>• {f}</li>
                    ))}
                  </ul>
                  <Button
                    disabled={isCurrent || busyPlan === plan}
                    onClick={() => handleCheckout(plan)}
                    className="w-full"
                  >
                    {isCurrent ? 'Active plan' : busyPlan === plan ? 'Redirecting…' : 'Select'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </section>

        <section className="mt-10 grid md:grid-cols-2 gap-6">
          <Card className="bg-[#11111A] border border-gray-800">
            <CardHeader>
              <CardTitle>Current subscription</CardTitle>
              <CardDescription className="text-gray-300">Plan, status, and renewal</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-gray-200">
              <div>Plan: {PLAN_COPY[currentPlan].name}</div>
              <div>Status: {subscription?.status || 'free'}</div>
              <div>
                Renewal date:{' '}
                {subscription?.current_period_end
                  ? format(new Date(subscription.current_period_end), 'PPP')
                  : 'N/A'}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#11111A] border border-gray-800">
            <CardHeader>
              <CardTitle>Credits</CardTitle>
              <CardDescription className="text-gray-300">Usage resets each renewal</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-gray-200">
              <div>Balance: {credits?.balance ?? 0}</div>
              <div>Monthly allowance: {PLAN_COPY[currentPlan].credits}</div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
