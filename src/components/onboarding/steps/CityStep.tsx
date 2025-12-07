import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StepLayout } from '../StepLayout';
import { CITIES } from '@/types/onboarding';
import { MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CityStepProps {
  value: string;
  onChange: (city: string) => void;
  onNext: () => void;
  onPrevious: () => void;
}

export function CityStep({ value, onChange, onNext, onPrevious }: CityStepProps) {
  const [showOther, setShowOther] = useState(false);
  const [otherCity, setOtherCity] = useState('');

  const handleCitySelect = (city: string) => {
    setShowOther(false);
    onChange(city);
  };

  // Auto-advance when a predefined city is selected
  useEffect(() => {
    if (value && CITIES.includes(value as any) && !showOther) {
      const timer = setTimeout(() => {
        onNext();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [value, showOther, onNext]);

  const handleOtherClick = () => {
    setShowOther(true);
    onChange('');
  };

  const handleOtherChange = (val: string) => {
    setOtherCity(val);
    onChange(val);
  };

  const isValid = value.trim().length > 0;

  return (
    <StepLayout
      title="Where do you cook from?"
      subtitle="This helps us match you with nearby customers."
      onNext={onNext}
      onPrevious={onPrevious}
      isNextDisabled={!isValid}
      showNext={showOther}
    >
      <div className="max-w-2xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          {CITIES.map((city) => (
            <Button
              key={city}
              variant="city"
              size="city"
              data-selected={value === city}
              onClick={() => handleCitySelect(city)}
              className="flex items-center gap-2"
            >
              <MapPin className="w-4 h-4" />
              {city}
            </Button>
          ))}
          <Button
            variant="city"
            size="city"
            data-selected={showOther}
            onClick={handleOtherClick}
            className={cn(
              "col-span-2 md:col-span-3",
              showOther && "border-primary bg-terracotta-light"
            )}
          >
            Other city
          </Button>
        </div>

        {showOther && (
          <div className="animate-slide-up">
            <label className="block text-sm font-medium text-foreground mb-2">
              Enter your city
            </label>
            <Input
              type="text"
              placeholder="e.g. Utrecht"
              value={otherCity}
              onChange={(e) => handleOtherChange(e.target.value)}
              className="max-w-sm"
              autoFocus
            />
          </div>
        )}
      </div>
    </StepLayout>
  );
}
