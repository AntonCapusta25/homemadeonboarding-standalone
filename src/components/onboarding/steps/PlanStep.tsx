import { useState, useEffect } from 'react';
import { StepLayout } from '../StepLayout';
import { Check, Star, Sparkles, Building, ChevronDown, ChevronUp, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PlanType } from '@/types/onboarding';
import { Button } from '@/components/ui/button';

interface PlanStepProps {
  value: PlanType;
  onChange: (plan: PlanType) => void;
  onNext: () => void;
  onPrevious: () => void;
}

const PLANS: { 
  value: PlanType; 
  name: string; 
  commission: string; 
  features: string[]; 
  recommended?: boolean;
  icon: React.ReactNode;
}[] = [
  {
    value: 'basic',
    name: 'Basic Chef',
    commission: '10%',
    features: [
      'Online restaurant on Homemade',
      'Order management system',
      'KVK & NVWA guidance',
    ],
    icon: <Star className="w-6 h-6" />,
  },
  {
    value: 'pro',
    name: 'Pro Chef',
    commission: '12%',
    features: [
      'Everything in Basic',
      'Menu & pricing support',
      'Extra marketing & promo',
    ],
    icon: <Sparkles className="w-6 h-6" />,
  },
  {
    value: 'advanced',
    name: 'Advanced Chef',
    commission: '14%',
    features: [
      'Everything in Pro',
      'B2B catering & corporate orders',
      'Priority support',
      'Featured placement',
    ],
    recommended: true,
    icon: <Building className="w-6 h-6" />,
  },
];

export function PlanStep({ value, onChange, onNext, onPrevious }: PlanStepProps) {
  const [showAllPlans, setShowAllPlans] = useState(false);
  
  const advancedPlan = PLANS.find(p => p.value === 'advanced')!;
  const otherPlans = PLANS.filter(p => p.value !== 'advanced');

  // Auto-advance when Advanced is selected
  useEffect(() => {
    if (value === 'advanced' && !showAllPlans) {
      const timer = setTimeout(() => {
        onNext();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [value, showAllPlans, onNext]);

  return (
    <StepLayout
      title="You're almost there!"
      subtitle="Choose how you want to grow with Homemade."
      onNext={onNext}
      onPrevious={onPrevious}
      nextLabel="Complete"
      showNext={showAllPlans || value !== 'advanced'}
    >
      <div className="max-w-2xl mx-auto">
        {/* No upfront fees banner */}
        <div className="bg-forest-light rounded-2xl p-4 mb-6 flex items-center gap-3">
          <Shield className="w-6 h-6 text-forest flex-shrink-0" />
          <div>
            <p className="font-medium text-forest">No upfront fees – ever</p>
            <p className="text-sm text-forest/80">You only pay commission when you get orders. Start for free!</p>
          </div>
        </div>

        {/* Featured Advanced Plan */}
        <label
          className={cn(
            "relative block p-6 rounded-2xl border-2 cursor-pointer transition-all mb-4",
            value === 'advanced'
              ? "border-primary bg-terracotta-light shadow-glow"
              : "border-primary/50 bg-card hover:border-primary",
            "ring-2 ring-primary ring-offset-2"
          )}
        >
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold">
            Most Popular
          </div>

          <input
            type="radio"
            name="plan"
            value={advancedPlan.value}
            checked={value === advancedPlan.value}
            onChange={() => onChange(advancedPlan.value)}
            className="sr-only"
          />
          
          <div className="flex items-start gap-4">
            <div className={cn(
              "w-14 h-14 rounded-xl flex items-center justify-center transition-colors",
              value === advancedPlan.value
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground"
            )}>
              {advancedPlan.icon}
            </div>

            <div className="flex-1">
              <h3 className="font-display font-bold text-xl text-foreground mb-1">
                {advancedPlan.name}
              </h3>
              <p className="text-2xl font-bold text-primary mb-3">
                {advancedPlan.commission} <span className="text-sm font-normal text-muted-foreground">commission per order</span>
              </p>

              <ul className="grid md:grid-cols-2 gap-2">
                {advancedPlan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-foreground">
                    <Check className="w-4 h-4 text-forest flex-shrink-0 mt-0.5" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            <div className={cn(
              "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0",
              value === advancedPlan.value ? "border-primary bg-primary" : "border-muted-foreground"
            )}>
              {value === advancedPlan.value && (
                <div className="w-2.5 h-2.5 rounded-full bg-primary-foreground" />
              )}
            </div>
          </div>
        </label>

        {/* Toggle for other plans */}
        <button
          onClick={() => setShowAllPlans(!showAllPlans)}
          className="w-full flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {showAllPlans ? (
            <>
              <ChevronUp className="w-4 h-4" />
              Hide other plans
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              View other plans
            </>
          )}
        </button>

        {/* Other Plans */}
        {showAllPlans && (
          <div className="grid md:grid-cols-2 gap-4 mt-4 animate-slide-up">
            {otherPlans.map((plan) => (
              <label
                key={plan.value}
                className={cn(
                  "relative block p-5 rounded-2xl border-2 cursor-pointer transition-all",
                  value === plan.value
                    ? "border-primary bg-terracotta-light shadow-soft"
                    : "border-border bg-card hover:border-primary/50"
                )}
              >
                <input
                  type="radio"
                  name="plan"
                  value={plan.value}
                  checked={value === plan.value}
                  onChange={() => onChange(plan.value)}
                  className="sr-only"
                />
                
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-colors",
                  value === plan.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground"
                )}>
                  {plan.icon}
                </div>

                <h3 className="font-display font-bold text-lg text-foreground mb-1">
                  {plan.name}
                </h3>
                <p className="text-xl font-bold text-primary mb-3">
                  {plan.commission} <span className="text-xs font-normal text-muted-foreground">commission</span>
                </p>

                <ul className="space-y-1.5">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-foreground">
                      <Check className="w-4 h-4 text-forest flex-shrink-0 mt-0.5" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </label>
            ))}
          </div>
        )}

        {/* Let Homemade recommend */}
        <label
          className={cn(
            "flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all mt-4",
            value === 'auto_recommend'
              ? "border-primary bg-terracotta-light"
              : "border-border bg-card hover:border-primary/50"
          )}
        >
          <input
            type="radio"
            name="plan"
            value="auto_recommend"
            checked={value === 'auto_recommend'}
            onChange={() => onChange('auto_recommend')}
            className="sr-only"
          />
          
          <div className={cn(
            "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0",
            value === 'auto_recommend' ? "border-primary bg-primary" : "border-muted-foreground"
          )}>
            {value === 'auto_recommend' && (
              <div className="w-2 h-2 rounded-full bg-primary-foreground" />
            )}
          </div>
          
          <span className="text-foreground font-medium">
            Let Homemade recommend the best plan for me
          </span>
        </label>
      </div>
    </StepLayout>
  );
}
