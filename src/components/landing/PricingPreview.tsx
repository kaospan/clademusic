import { motion } from 'framer-motion';
import { Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export function PricingPreview() {
  const navigate = useNavigate();

  const plans = [
    {
      name: 'Free Trial',
      price: '₪0',
      period: '7 days',
      description: 'Try all premium features',
      color: '#90EE90',
      features: [
        'Full access to all features',
        'Unlimited track analysis',
        'Chord progression library',
        'Community access',
        'No credit card required',
      ],
      cta: 'Start Free Trial',
      popular: false,
    },
    {
      name: 'Solo QA',
      price: '₪149',
      period: 'per month',
      description: 'Perfect for individuals',
      color: '#00F5FF',
      features: [
        'Unlimited track analysis',
        'Advanced visualizations',
        'Chord progression library',
        'Priority support',
        'Export capabilities',
        'Custom playlists',
      ],
      cta: 'Get Started',
      popular: true,
    },
    {
      name: 'Small Team',
      price: '₪399',
      period: 'per month',
      description: 'Up to 5 team members',
      color: '#FF00FF',
      features: [
        'Everything in Solo QA',
        'Team collaboration',
        'Shared playlists',
        'Analytics dashboard',
        'API access',
        'Priority support',
      ],
      cta: 'Get Started',
      popular: false,
    },
    {
      name: 'Team',
      price: '₪799',
      period: 'per month',
      description: 'Unlimited users',
      color: '#FFD700',
      features: [
        'Everything in Small Team',
        'Unlimited team members',
        'Advanced analytics',
        'Custom integrations',
        'Dedicated support',
        'SLA guarantee',
      ],
      cta: 'Contact Sales',
      popular: false,
    },
  ];

  return (
    <section className="relative py-24 bg-gradient-to-b from-[#1A1A2E] to-[#0A0A0F]">
      <div className="container mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-5xl font-bold text-white mb-4">
            Choose Your <span className="bg-gradient-to-r from-[#00F5FF] to-[#FF00FF] bg-clip-text text-transparent">Plan</span>
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Transparent pricing for Israeli automation market
          </p>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              whileHover={{ y: -10, scale: 1.02 }}
              className="relative"
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                  <div className="px-4 py-1 bg-gradient-to-r from-[#00F5FF] to-[#FF00FF] rounded-full text-white text-sm font-semibold flex items-center space-x-1">
                    <Sparkles className="w-4 h-4" />
                    <span>Most Popular</span>
                  </div>
                </div>
              )}

              {/* Card */}
              <div
                className={`relative p-8 rounded-2xl bg-gradient-to-br from-[#1A1A2E] to-[#0F0F1A] border-2 h-full flex flex-col ${
                  plan.popular ? 'border-[#00F5FF]' : 'border-gray-800'
                }`}
              >
                {/* Glow effect */}
                {plan.popular && (
                  <div
                    className="absolute inset-0 rounded-2xl opacity-20 blur-xl"
                    style={{
                      background: `linear-gradient(135deg, ${plan.color}, transparent)`,
                    }}
                  />
                )}

                {/* Header */}
                <div className="relative z-10 mb-6">
                  <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                  <p className="text-gray-400 text-sm">{plan.description}</p>
                </div>

                {/* Price */}
                <div className="relative z-10 mb-6">
                  <div className="flex items-baseline">
                    <span
                      className="text-5xl font-extrabold"
                      style={{ color: plan.color }}
                    >
                      {plan.price}
                    </span>
                    <span className="ml-2 text-gray-400">/ {plan.period}</span>
                  </div>
                </div>

                {/* Features */}
                <ul className="relative z-10 space-y-4 mb-8 flex-1">
                  {plan.features.map((feature, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: 0.5 + i * 0.1 }}
                      className="flex items-start space-x-3"
                    >
                      <Check
                        className="w-5 h-5 flex-shrink-0 mt-0.5"
                        style={{ color: plan.color }}
                      />
                      <span className="text-gray-300 text-sm">{feature}</span>
                    </motion.li>
                  ))}
                </ul>

                {/* CTA Button */}
                <Button
                  onClick={() => navigate('/auth')}
                  className={`relative z-10 w-full py-6 font-semibold text-lg transition-all duration-300 ${
                    plan.popular
                      ? 'bg-gradient-to-r from-[#00F5FF] to-[#FF00FF] hover:shadow-lg hover:shadow-[#00F5FF]/50'
                      : 'bg-[#1A1A2E] border-2 hover:bg-[#252538]'
                  }`}
                  style={
                    !plan.popular
                      ? { borderColor: plan.color, color: plan.color }
                      : {}
                  }
                >
                  {plan.cta}
                </Button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom Note */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-12 text-center text-gray-400"
        >
          <p>All plans include a 7-day free trial. No credit card required.</p>
          <p className="mt-2">Need a custom plan? <a href="/contact" className="text-[#00F5FF] hover:underline">Contact us</a></p>
        </motion.div>
      </div>
    </section>
  );
}
