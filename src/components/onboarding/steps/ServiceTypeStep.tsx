import { StepLayout } from '../StepLayout';
import { Truck, Store, Package, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ServiceType } from '@/types/onboarding';
import { useTranslation } from 'react-i18next';

interface ServiceTypeStepProps {
  value: ServiceType;
  onChange: (type: ServiceType) => void;
  onNext: () => void;
  onPrevious: () => void;
}

export function ServiceTypeStep({ value, onChange, onNext, onPrevious }: ServiceTypeStepProps) {
  const { t } = useTranslation();

  const SERVICE_OPTIONS: { value: ServiceType; labelKey: string; descKey: string; icon: React.ReactNode }[] = [
    {
      value: 'delivery',
      labelKey: 'serviceType.delivery',
      descKey: 'serviceType.deliveryDesc',
      icon: <Truck className="w-6 h-6" />,
    },
    {
      value: 'pickup',
      labelKey: 'serviceType.pickup',
      descKey: 'serviceType.pickupDesc',
      icon: <Store className="w-6 h-6" />,
    },
    {
      value: 'both',
      labelKey: 'serviceType.both',
      descKey: 'serviceType.bothDesc',
      icon: <Package className="w-6 h-6" />,
    },
    {
      value: 'unsure',
      labelKey: 'serviceType.unsure',
      descKey: 'serviceType.unsureDesc',
      icon: <HelpCircle className="w-6 h-6" />,
    },
  ];

  return (
    <StepLayout
      title={t('serviceType.title')}
      subtitle={t('serviceType.subtitle')}
      onNext={onNext}
      onPrevious={onPrevious}
    >
      <div className="max-w-xl mx-auto">
        <div className="grid gap-4">
          {SERVICE_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={cn(
                "flex items-center gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all",
                value === option.value
                  ? "border-primary bg-terracotta-light shadow-soft"
                  : "border-border bg-card hover:border-primary/50"
              )}
            >
              <input
                type="radio"
                name="service-type"
                value={option.value}
                checked={value === option.value}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
                value === option.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground"
              )}>
                {option.icon}
              </div>
              
              <div className="flex-1">
                <h3 className="font-display font-semibold text-foreground">{t(option.labelKey)}</h3>
                <p className="text-sm text-muted-foreground mt-0.5">{t(option.descKey)}</p>
              </div>
              
              <div className={cn(
                "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                value === option.value ? "border-primary bg-primary" : "border-muted-foreground"
              )}>
                {value === option.value && (
                  <div className="w-2.5 h-2.5 rounded-full bg-primary-foreground" />
                )}
              </div>
            </label>
          ))}
        </div>
      </div>
    </StepLayout>
  );
}
