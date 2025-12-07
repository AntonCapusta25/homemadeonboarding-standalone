import { StepLayout } from '../StepLayout';
import { Check, Star, Sparkles, Building } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PlanType } from '@/types/onboarding';

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
    recommended: true,
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
    ],
    icon: <Building className="w-6 h-6" />,
  },
];

export function PlanStep({ value, onChange, onNext, onPrevious }: PlanStepProps) {
  return (
    <StepLayout
      title="Choose your plan"
      subtitle="You only pay commission on orders – no fixed monthly fees."
      onNext={onNext}
      onPrevious={onPrevious}
      nextLabel="Complete"
    >
      <div className="max-w-4xl mx-auto">
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          {PLANS.map((plan) => (
            <label
              key={plan.value}
              className={cn(
                "relative block p-6 rounded-2xl border-2 cursor-pointer transition-all h-full",
                value === plan.value
                  ? "border-primary bg-terracotta-light shadow-soft"
                  : "border-border bg-card hover:border-primary/50",
                plan.recommended && "ring-2 ring-primary ring-offset-2"
              )}
            >
              {plan.recommended && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-semibold">
                  Recommended
                </div>
              )}

              <input
                type="radio"
                name="plan"
                value={plan.value}
                checked={value === plan.value}
                onChange={() => onChange(plan.value)}
                className="sr-only"
              />
              
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors",
                value === plan.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground"
              )}>
                {plan.icon}
              </div>

              <h3 className="font-display font-bold text-xl text-foreground mb-1">
                {plan.name}
              </h3>
              <p className="text-2xl font-bold text-primary mb-4">
                {plan.commission} <span className="text-sm font-normal text-muted-foreground">commission</span>
              </p>

              <ul className="space-y-2">
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

        <label
          className={cn(
            "flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all max-w-md mx-auto",
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
