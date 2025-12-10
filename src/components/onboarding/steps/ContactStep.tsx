import { useState, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { StepLayout } from '../StepLayout';
import { Mail, Phone, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';

interface ContactStepProps {
  email: string;
  phone: string;
  firstName?: string;
  lastName?: string;
  onChange: (field: 'email' | 'phone' | 'firstName' | 'lastName', value: string) => void;
  onNext: () => void;
  onPrevious: () => void;
  onAccountCreated?: (userId: string) => void;
}

export function ContactStep({ email, phone, firstName = '', lastName = '', onChange, onNext, onPrevious, onAccountCreated }: ContactStepProps) {
  const { t } = useTranslation();
  const [errors, setErrors] = useState<{ email?: string; phone?: string; firstName?: string }>({});
  const leadTrackedRef = useRef(false);

  const validateEmail = (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  };

  const validatePhone = (value: string) => {
    // Remove spaces, dashes, parentheses for validation
    const cleaned = value.replace(/[\s\-\(\)\.]/g, '');
    // Must be at least 8 digits and contain only digits and optionally start with +
    const phoneRegex = /^\+?\d{8,15}$/;
    return phoneRegex.test(cleaned);
  };

  // Track Lead event when valid phone is entered
  const trackLeadEvent = (phoneValue: string) => {
    if (leadTrackedRef.current) return;
    
    const cleaned = phoneValue.replace(/[\s\-\(\)\.]/g, '');
    const isValidPhone = /^\+?\d{8,15}$/.test(cleaned);
    
    if (isValidPhone) {
      const fireLead = () => {
        if (typeof window !== 'undefined' && (window as any).fbq) {
          (window as any).fbq('track', 'Lead', {
            content_name: 'Chef Onboarding Contact',
            content_category: 'Onboarding',
          });
          leadTrackedRef.current = true;
          console.log('Meta Pixel Lead event tracked for phone:', cleaned);
          return true;
        }
        return false;
      };

      // Try immediately, then retry after a delay if fbq not ready
      if (!fireLead()) {
        setTimeout(fireLead, 500);
      }
    }
  };

  const validate = () => {
    const newErrors: { email?: string; phone?: string; firstName?: string } = {};
    
    if (!firstName.trim()) {
      newErrors.firstName = t('contact.firstNameRequired', 'First name is required');
    }
    
    if (!email.trim()) {
      newErrors.email = t('contact.emailRequired', 'Email is required');
    } else if (!validateEmail(email)) {
      newErrors.email = t('contact.emailInvalid', 'Please enter a valid email address');
    }
    
    if (!phone.trim()) {
      newErrors.phone = t('contact.phoneRequired', 'Phone number is required');
    } else if (!validatePhone(phone)) {
      newErrors.phone = t('contact.phoneInvalid', 'Please enter a valid phone number (8-15 digits)');
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = async () => {
    if (!validate()) return;
    
    // Silently create account in background - no UI feedback
    supabase.functions.invoke('auto-create-account', {
      body: {
        email: email.trim(),
        chefName: `${firstName} ${lastName}`.trim(),
      },
    }).then(({ data, error }) => {
      if (error) {
        console.error('Auto-create account error (background):', error);
        return;
      }

      console.log('Account created/found (background):', data);

      // If we got a verify token, use it to sign in silently
      if (data?.verifyToken) {
        supabase.auth.verifyOtp({
          token_hash: data.verifyToken,
          type: data.tokenType || 'magiclink',
        }).catch(err => console.error('OTP verification error (background):', err));
      }

      // Notify parent about account creation
      if (onAccountCreated && data?.userId) {
        onAccountCreated(data.userId);
      }
    }).catch(err => {
      console.error('Error in background account creation:', err);
    });

    // Continue immediately - don't wait for account creation
    onNext();
  };

  const isValid = email.trim().length > 0 && phone.trim().length > 0 && firstName.trim().length > 0 && validatePhone(phone);

  return (
    <StepLayout
      title={t('contact.title')}
      subtitle={t('contact.subtitle')}
      onNext={handleNext}
      onPrevious={onPrevious}
      isNextDisabled={!isValid}
    >
      <div className="max-w-md mx-auto space-y-6 relative">
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
                const newValue = e.target.value;
                onChange('phone', newValue);
                if (errors.phone) setErrors(prev => ({ ...prev, phone: undefined }));
                trackLeadEvent(newValue);
              }}
              onBlur={() => trackLeadEvent(phone)}
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
