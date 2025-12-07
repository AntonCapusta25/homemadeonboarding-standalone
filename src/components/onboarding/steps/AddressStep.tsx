import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { StepLayout } from '../StepLayout';
import { Home } from 'lucide-react';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
  const [errors, setErrors] = useState<{ streetAddress?: string }>({});

  const validate = () => {
    const newErrors: { streetAddress?: string } = {};
    
    if (!streetAddress.trim()) {
      newErrors.streetAddress = t('address.street');
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validate()) {
      onNext();
    }
  };

  const isValid = streetAddress.trim().length > 0;

  return (
    <StepLayout
      title={t('address.title')}
      subtitle={t('address.subtitle')}
      onNext={handleNext}
      onPrevious={onPrevious}
      isNextDisabled={!isValid}
    >
      <div className="max-w-md mx-auto space-y-6">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            {t('address.postalCode')} (optional)
          </label>
          <Input
            type="text"
            placeholder={t('address.postalCodePlaceholder')}
            value={zipCode}
            onChange={(e) => onChange('zipCode', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            {t('address.street')} <span className="text-destructive">*</span>
          </label>
          <div className="relative">
            <Home className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder={t('address.streetPlaceholder')}
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
            {t('address.city')}
          </label>
          <Input
            type="text"
            value={city}
            disabled
            className="bg-secondary"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Country
          </label>
          <Input
            type="text"
            value={country}
            disabled
            className="bg-secondary"
          />
        </div>
      </div>
    </StepLayout>
  );
}
