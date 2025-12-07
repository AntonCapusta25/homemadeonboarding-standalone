import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { StepLayout } from '../StepLayout';
import { Home, MapPin } from 'lucide-react';

interface AddressStepProps {
  zipCode: string;
  streetAddress: string;
  city: string;
  country: string;
  onChange: (field: 'zipCode' | 'streetAddress' | 'city' | 'country', value: string) => void;
  onNext: () => void;
  onPrevious: () => void;
}

export function AddressStep({ 
  zipCode, 
  streetAddress, 
  city, 
  country, 
  onChange, 
  onNext, 
  onPrevious 
}: AddressStepProps) {
  const [errors, setErrors] = useState<{ streetAddress?: string; city?: string }>({});

  const validate = () => {
    const newErrors: { streetAddress?: string; city?: string } = {};
    
    if (!streetAddress.trim()) {
      newErrors.streetAddress = 'Please enter your street address.';
    }
    
    if (!city.trim()) {
      newErrors.city = 'Please enter your city.';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validate()) {
      onNext();
    }
  };

  const isValid = streetAddress.trim().length > 0 && city.trim().length > 0;

  return (
    <StepLayout
      title="Where is your kitchen?"
      subtitle="Required for deliveries and legal setup."
      onNext={handleNext}
      onPrevious={onPrevious}
      isNextDisabled={!isValid}
    >
      <div className="max-w-md mx-auto space-y-6">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Zip code (optional)
          </label>
          <Input
            type="text"
            placeholder="1234 AB"
            value={zipCode}
            onChange={(e) => onChange('zipCode', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Street & number <span className="text-destructive">*</span>
          </label>
          <div className="relative">
            <Home className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="e.g. Main Street 123"
              value={streetAddress}
              onChange={(e) => {
                onChange('streetAddress', e.target.value);
                if (errors.streetAddress) setErrors(prev => ({ ...prev, streetAddress: undefined }));
              }}
              className="pl-10"
            />
          </div>
          {errors.streetAddress && (
            <p className="text-sm text-destructive mt-1">{errors.streetAddress}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            City <span className="text-destructive">*</span>
          </label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Your city"
              value={city}
              onChange={(e) => {
                onChange('city', e.target.value);
                if (errors.city) setErrors(prev => ({ ...prev, city: undefined }));
              }}
              className="pl-10"
            />
          </div>
          {errors.city && (
            <p className="text-sm text-destructive mt-1">{errors.city}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Country
          </label>
          <Input
            type="text"
            value={country}
            onChange={(e) => onChange('country', e.target.value)}
            disabled
            className="bg-secondary"
          />
        </div>
      </div>
    </StepLayout>
  );
}
