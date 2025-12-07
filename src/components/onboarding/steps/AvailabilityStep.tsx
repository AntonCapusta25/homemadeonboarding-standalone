import { Button } from '@/components/ui/button';
import { StepLayout } from '../StepLayout';
import { AVAILABILITY_OPTIONS } from '@/types/onboarding';
import { cn } from '@/lib/utils';
import { Moon, Sun, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface AvailabilityStepProps {
  value: string[];
  onChange: (availability: string[]) => void;
  onNext: () => void;
  onPrevious: () => void;
}

const ICONS: Record<string, React.ReactNode> = {
  'Weekday evenings': <Moon className="w-4 h-4" />,
  'Weekend evenings': <Moon className="w-4 h-4" />,
  'Lunchtime': <Sun className="w-4 h-4" />,
  'Flexible / not sure yet': <Clock className="w-4 h-4" />,
};

export function AvailabilityStep({ value, onChange, onNext, onPrevious }: AvailabilityStepProps) {
  const { t } = useTranslation();
  
  const toggleOption = (option: string) => {
    if (value.includes(option)) {
      onChange(value.filter(v => v !== option));
    } else {
      onChange([...value, option]);
    }
  };

  const isValid = value.length > 0;

  return (
    <StepLayout
      title={t('availability.title')}
      subtitle={t('availability.subtitle')}
      onNext={onNext}
      onPrevious={onPrevious}
      isNextDisabled={!isValid}
    >
      <div className="max-w-md mx-auto">
        <div className="flex flex-wrap gap-3 justify-center">
          {AVAILABILITY_OPTIONS.map((option) => {
            const isSelected = value.includes(option);
            
            return (
              <Button
                key={option}
                variant="chip"
                size="chip"
                data-selected={isSelected}
                onClick={() => toggleOption(option)}
                className="gap-2"
              >
                {ICONS[option]}
                {option}
              </Button>
            );
          })}
        </div>

        {value.length === 0 && (
          <p className="text-sm text-muted-foreground text-center mt-6">
            {t('availability.subtitle')}
          </p>
        )}

        {value.length > 0 && (
          <div className="mt-8 p-4 bg-forest-light rounded-xl text-center">
            <p className="text-sm text-forest font-medium">
              ✓ {value.join(', ')}
            </p>
          </div>
        )}
      </div>
    </StepLayout>
  );
}
