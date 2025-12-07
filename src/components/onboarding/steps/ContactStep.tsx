import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { StepLayout } from '../StepLayout';
import { Mail, Phone, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ContactStepProps {
  email: string;
  phone: string;
  firstName?: string;
  lastName?: string;
  onChange: (field: 'email' | 'phone' | 'firstName' | 'lastName', value: string) => void;
  onNext: () => void;
  onPrevious: () => void;
}

export function ContactStep({ email, phone, firstName = '', lastName = '', onChange, onNext, onPrevious }: ContactStepProps) {
  const { t } = useTranslation();
  const [errors, setErrors] = useState<{ email?: string; phone?: string; firstName?: string }>({});

  const validateEmail = (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  };

  const validate = () => {
    const newErrors: { email?: string; phone?: string; firstName?: string } = {};
    
    if (!firstName.trim()) {
      newErrors.firstName = t('contact.firstName');
    }
    
    if (!email.trim()) {
      newErrors.email = t('contact.email');
    } else if (!validateEmail(email)) {
      newErrors.email = t('contact.email');
    }
    
    if (!phone.trim()) {
      newErrors.phone = t('contact.phone');
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validate()) {
      onNext();
    }
  };

  const isValid = email.trim().length > 0 && phone.trim().length > 0 && firstName.trim().length > 0;

  return (
    <StepLayout
      title={t('contact.title')}
      subtitle={t('contact.subtitle')}
      onNext={handleNext}
      onPrevious={onPrevious}
      isNextDisabled={!isValid}
    >
      <div className="max-w-md mx-auto space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              {t('contact.firstName')} <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder={t('contact.firstNamePlaceholder')}
                value={firstName}
                onChange={(e) => {
                  onChange('firstName', e.target.value);
                  if (errors.firstName) setErrors(prev => ({ ...prev, firstName: undefined }));
                }}
                className="pl-10"
              />
            </div>
            {errors.firstName && (
              <p className="text-sm text-destructive mt-1">{errors.firstName}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              {t('contact.lastName')}
            </label>
            <Input
              type="text"
              placeholder={t('contact.lastNamePlaceholder')}
              value={lastName}
              onChange={(e) => onChange('lastName', e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            {t('contact.email')} <span className="text-destructive">*</span>
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="email"
              placeholder={t('contact.emailPlaceholder')}
              value={email}
              onChange={(e) => {
                onChange('email', e.target.value);
                if (errors.email) setErrors(prev => ({ ...prev, email: undefined }));
              }}
              className="pl-10"
            />
          </div>
          {errors.email && (
            <p className="text-sm text-destructive mt-1">{errors.email}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            {t('contact.phone')} <span className="text-destructive">*</span>
          </label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="tel"
              placeholder={t('contact.phonePlaceholder')}
              value={phone}
              onChange={(e) => {
                onChange('phone', e.target.value);
                if (errors.phone) setErrors(prev => ({ ...prev, phone: undefined }));
              }}
              className="pl-10"
            />
          </div>
          {errors.phone && (
            <p className="text-sm text-destructive mt-1">{errors.phone}</p>
          )}
        </div>
      </div>
    </StepLayout>
  );
}
