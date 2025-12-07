import { StepLayout } from '../StepLayout';
import { Truck, Store, Package, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ServiceType } from '@/types/onboarding';

interface ServiceTypeStepProps {
  value: ServiceType;
  onChange: (type: ServiceType) => void;
  onNext: () => void;
  onPrevious: () => void;
}

const SERVICE_OPTIONS: { value: ServiceType; label: string; description: string; icon: React.ReactNode }[] = [
  {
    value: 'delivery',
    label: 'Delivery only',
    description: 'Customers order online, you deliver',
    icon: <Truck className="w-6 h-6" />,
  },
  {
    value: 'pickup',
    label: 'Pickup only',
    description: 'Customers come to collect their order',
    icon: <Store className="w-6 h-6" />,
  },
  {
    value: 'both',
    label: 'Delivery & pickup',
    description: 'Offer both options to your customers',
    icon: <Package className="w-6 h-6" />,
  },
  {
    value: 'unsure',
    label: "I'm not sure yet",
    description: "We'll help you decide later",
    icon: <HelpCircle className="w-6 h-6" />,
  },
];

export function ServiceTypeStep({ value, onChange, onNext, onPrevious }: ServiceTypeStepProps) {
  return (
    <StepLayout
      title="How do you want to sell?"
      subtitle="You can always change this later in your dashboard."
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
                <h3 className="font-display font-semibold text-foreground">{option.label}</h3>
                <p className="text-sm text-muted-foreground">{option.description}</p>
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
