import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StepLayout } from '../StepLayout';
import { CUISINES } from '@/types/onboarding';
import { cn } from '@/lib/utils';

interface CuisineStepProps {
  value: string[];
  onChange: (cuisines: string[]) => void;
  onNext: () => void;
  onPrevious: () => void;
}

export function CuisineStep({ value, onChange, onNext, onPrevious }: CuisineStepProps) {
  const [otherCuisine, setOtherCuisine] = useState('');

  const toggleCuisine = (cuisine: string) => {
    if (value.includes(cuisine)) {
      onChange(value.filter(c => c !== cuisine));
    } else if (value.length < 3) {
      onChange([...value, cuisine]);
    }
  };

  const isValid = value.length > 0 || otherCuisine.trim().length > 0;
  const isMaxSelected = value.length >= 3;

  const handleNext = () => {
    if (otherCuisine.trim() && !value.includes(otherCuisine.trim())) {
      onChange([...value.slice(0, 2), otherCuisine.trim()]);
    }
    onNext();
  };

  return (
    <StepLayout
      title="What kind of food do you cook?"
      subtitle="Choose 1–3 cuisines that describe your food best."
      onNext={handleNext}
      onPrevious={onPrevious}
      isNextDisabled={!isValid}
    >
      <div className="max-w-2xl mx-auto">
        <div className="flex flex-wrap gap-3 mb-6">
          {CUISINES.map((cuisine) => {
            const isSelected = value.includes(cuisine);
            const isDisabled = isMaxSelected && !isSelected;
            
            return (
              <Button
                key={cuisine}
                variant="chip"
                size="chip"
                data-selected={isSelected}
                onClick={() => toggleCuisine(cuisine)}
                disabled={isDisabled}
                className={cn(
                  "transition-all duration-200",
                  isDisabled && "opacity-50 cursor-not-allowed"
                )}
              >
                {cuisine}
              </Button>
            );
          })}
        </div>

        {isMaxSelected && (
          <p className="text-sm text-muted-foreground mb-4 text-center">
            You can select up to 3 cuisines.
          </p>
        )}

        <div className="border-t border-border pt-6">
          <label className="block text-sm font-medium text-foreground mb-2">
            Other cuisine (optional)
          </label>
          <Input
            type="text"
            placeholder="Describe your cuisine"
            value={otherCuisine}
            onChange={(e) => setOtherCuisine(e.target.value)}
            className="max-w-sm"
          />
        </div>

        {value.length > 0 && (
          <div className="mt-6 p-4 bg-terracotta-light rounded-xl">
            <p className="text-sm font-medium text-foreground mb-2">Selected cuisines:</p>
            <div className="flex flex-wrap gap-2">
              {value.map(c => (
                <span key={c} className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm">
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </StepLayout>
  );
}
