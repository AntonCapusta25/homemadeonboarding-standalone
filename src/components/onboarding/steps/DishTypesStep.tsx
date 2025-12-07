import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StepLayout } from '../StepLayout';
import { DISH_TYPES } from '@/types/onboarding';
import { cn } from '@/lib/utils';

interface DishTypesStepProps {
  value: string[];
  onChange: (dishTypes: string[]) => void;
  onNext: () => void;
  onPrevious: () => void;
}

export function DishTypesStep({ value, onChange, onNext, onPrevious }: DishTypesStepProps) {
  const [otherDish, setOtherDish] = useState('');
  const [showOtherInput, setShowOtherInput] = useState(false);

  const toggleDish = (dish: string) => {
    if (dish === 'Other') {
      setShowOtherInput(!showOtherInput);
      if (showOtherInput) {
        // Remove "Other" related items
        onChange(value.filter(v => DISH_TYPES.includes(v as typeof DISH_TYPES[number])));
        setOtherDish('');
      }
      return;
    }

    if (value.includes(dish)) {
      onChange(value.filter(v => v !== dish));
    } else if (value.length < 5) {
      onChange([...value, dish]);
    }
  };

  const handleNext = () => {
    if (otherDish.trim() && !value.includes(otherDish.trim())) {
      onChange([...value.filter(v => DISH_TYPES.includes(v as typeof DISH_TYPES[number])), otherDish.trim()]);
    }
    onNext();
  };

  const isValid = value.length > 0 || otherDish.trim().length > 0;
  const isMaxSelected = value.length >= 5;

  return (
    <StepLayout
      title="What kind of dishes will you sell?"
      subtitle="This helps us generate a menu suggestion for you."
      onNext={handleNext}
      onPrevious={onPrevious}
      isNextDisabled={!isValid}
    >
      <div className="max-w-2xl mx-auto">
        <div className="flex flex-wrap gap-3 justify-center mb-6">
          {DISH_TYPES.map((dish) => {
            const isSelected = dish === 'Other' ? showOtherInput : value.includes(dish);
            const isDisabled = dish !== 'Other' && isMaxSelected && !value.includes(dish);
            
            return (
              <Button
                key={dish}
                variant="chip"
                size="chip"
                data-selected={isSelected}
                onClick={() => toggleDish(dish)}
                disabled={isDisabled}
                className={cn(
                  "transition-all duration-200",
                  isDisabled && "opacity-50 cursor-not-allowed"
                )}
              >
                {dish}
              </Button>
            );
          })}
        </div>

        {isMaxSelected && (
          <p className="text-sm text-muted-foreground mb-4 text-center">
            You can select up to 5 dish types.
          </p>
        )}

        {showOtherInput && (
          <div className="animate-slide-up max-w-sm mx-auto">
            <label className="block text-sm font-medium text-foreground mb-2">
              Describe other dish types
            </label>
            <Input
              type="text"
              placeholder="e.g. Vegan bowls, Sushi"
              value={otherDish}
              onChange={(e) => setOtherDish(e.target.value)}
              autoFocus
            />
          </div>
        )}

        {value.length > 0 && (
          <div className="mt-6 p-4 bg-terracotta-light rounded-xl text-center">
            <p className="text-sm font-medium text-foreground mb-2">Your dishes:</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {value.map(d => (
                <span key={d} className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm">
                  {d}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </StepLayout>
  );
}
