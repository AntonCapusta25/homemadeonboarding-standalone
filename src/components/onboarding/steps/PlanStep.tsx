import { useState } from 'react';
import { StepLayout } from '../StepLayout';
import { Check, Star, Sparkles, Building, ChevronDown, ChevronUp, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PlanType } from '@/types/onboarding';
import { useTranslation } from 'react-i18next';
import { TermsOfServiceModal } from '../TermsOfServiceModal';

interface PlanStepProps {
  value: PlanType;
  onChange: (plan: PlanType) => void;
  onNext: () => void;
  onPrevious: () => void;
  chefName?: string;
  saving?: boolean;
}

export function PlanStep({ value, onChange, onNext, onPrevious, chefName, saving = false }: PlanStepProps) {
  const { t } = useTranslation();
  const [showAllPlans, setShowAllPlans] = useState(false);
  const [showTosModal, setShowTosModal] = useState(false);

  const PLANS = [
    {
      value: 'basic' as PlanType,
      nameKey: 'plan.starter.name',
      commission: '10%',
      features: ['Online profile', 'Order system', 'Guidance'],
      icon: <Star className="w-6 h-6" />,
    },
    {
      value: 'pro' as PlanType,
      nameKey: 'plan.pro.name',
      commission: '12%',
      features: ['Everything in Basic', 'Menu support', 'Marketing'],
      icon: <Sparkles className="w-6 h-6" />,
    },
    {
      value: 'advanced' as PlanType,
      nameKey: 'plan.advanced.name',
      commission: '14%',
      features: ['Everything in Pro', 'B2B catering', 'Priority support', 'Featured'],
      recommended: true,
      icon: <Building className="w-6 h-6" />,
    },
  ];

  const advancedPlan = PLANS.find((p) => p.value === 'advanced')!;
  const otherPlans = PLANS.filter((p) => p.value !== 'advanced');

  const handleFinishClick = () => {
    // Show TOS modal before completing
    setShowTosModal(true);
  };

  const handleTosAccept = () => {
    setShowTosModal(false);
    onNext();
  };

  return (
    <>
      <StepLayout
        title={t('plan.title')}
        subtitle={t('plan.subtitle')}
        onNext={handleFinishClick}
        onPrevious={onPrevious}
        nextLabel={t('steps.finish')}
      >
        <div className="max-w-2xl mx-auto">
          {/* No upfront fees banner */}
          <div className="bg-forest-light rounded-2xl p-4 mb-6 flex items-center gap-3">
            <Shield className="w-6 h-6 text-forest flex-shrink-0" />
            <div>
              <p className="font-medium text-forest">{t('plan.noUpfrontFees')}</p>
            </div>
          </div>

          {/* Featured Plan - Advanced */}
          <label
            className={cn(
              "relative block p-6 rounded-2xl border-2 cursor-pointer transition-all mb-4 ring-2 ring-primary ring-offset-2",
              value === 'advanced'
                ? "border-primary bg-terracotta-light shadow-glow"
                : "border-primary/50 bg-card hover:border-primary"
            )}
          >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold">
              {t('plan.popular')}
            </div>
            <input
              type="radio"
              name="plan"
              checked={value === advancedPlan.value}
              onChange={() => onChange(advancedPlan.value)}
              className="sr-only"
            />
            <div className="flex items-start gap-4">
              <div
                className={cn(
                  "w-14 h-14 rounded-xl flex items-center justify-center transition-colors",
                  value === advancedPlan.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground"
                )}
              >
                {advancedPlan.icon}
              </div>
              <div className="flex-1">
                <h3 className="font-display font-bold text-xl text-foreground mb-1">
                  {t(advancedPlan.nameKey)}
                </h3>
                <p className="text-2xl font-bold text-primary mb-3">
                  {advancedPlan.commission}{' '}
                  <span className="text-sm font-normal text-muted-foreground">
                    {t('plan.advanced.commissionLabel')}
                  </span>
                </p>
                <ul className="grid md:grid-cols-2 gap-2">
                  {advancedPlan.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                      <Check className="w-4 h-4 text-forest flex-shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
              <div
                className={cn(
                  "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0",
                  value === advancedPlan.value
                    ? "border-primary bg-primary"
                    : "border-muted-foreground"
                )}
              >
                {value === advancedPlan.value && (
                  <div className="w-2.5 h-2.5 rounded-full bg-primary-foreground" />
                )}
              </div>
            </div>
          </label>

          {/* Toggle other plans */}
          <button
            onClick={() => setShowAllPlans(!showAllPlans)}
            className="w-full flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {showAllPlans ? (
              <>
                <ChevronUp className="w-4 h-4" />
                {t('plan.hidePlans')}
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                {t('plan.viewOtherPlans')}
              </>
            )}
          </button>

          {/* Other plans */}
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
                    checked={value === plan.value}
                    onChange={() => onChange(plan.value)}
                    className="sr-only"
                  />
                  <div
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-colors",
                      value === plan.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground"
                    )}
                  >
                    {plan.icon}
                  </div>
                  <h3 className="font-display font-bold text-lg text-foreground mb-1">
                    {t(plan.nameKey)}
                  </h3>
                  <p className="text-xl font-bold text-primary mb-3">{plan.commission}</p>
                  <ul className="space-y-1.5">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                        <Check className="w-4 h-4 text-forest flex-shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </label>
              ))}
            </div>
          )}
        </div>
      </StepLayout>

      {/* Terms of Service Modal */}
      <TermsOfServiceModal
        isOpen={showTosModal}
        onClose={() => setShowTosModal(false)}
        onAccept={handleTosAccept}
        plan={value}
        chefName={chefName}
        loading={saving}
      />
    </>
  );
}
