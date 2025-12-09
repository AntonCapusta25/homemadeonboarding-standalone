import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { StepLayout } from '../StepLayout';
import { Mail, Phone, User, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
  const [creatingAccount, setCreatingAccount] = useState(false);

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

  const handleNext = async () => {
    if (!validate()) return;
    
    setCreatingAccount(true);
    try {
      // Call edge function to auto-create account
      const { data, error } = await supabase.functions.invoke('auto-create-account', {
        body: {
          email: email.trim(),
          chefName: `${firstName} ${lastName}`.trim(),
        },
      });

      if (error) {
        console.error('Auto-create account error:', error);
        toast.error('Failed to create account. Please try again.');
        setCreatingAccount(false);
        return;
      }

      console.log('Account created/found:', data);

      // If we got a verify token, use it to sign in
      if (data.verifyToken) {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: data.verifyToken,
          type: data.tokenType || 'magiclink',
        });

        if (verifyError) {
          console.error('OTP verification error:', verifyError);
          // Continue anyway - the account exists
        }
      }

      // Notify parent about account creation
      if (onAccountCreated && data.userId) {
        onAccountCreated(data.userId);
      }

      toast.success(data.isNewUser ? 'Account created!' : 'Welcome back!');
      onNext();
    } catch (err) {
      console.error('Error in handleNext:', err);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setCreatingAccount(false);
    }
  };

  const isValid = email.trim().length > 0 && phone.trim().length > 0 && firstName.trim().length > 0;

  return (
    <StepLayout
      title={t('contact.title')}
      subtitle={t('contact.subtitle')}
      onNext={handleNext}
      onPrevious={onPrevious}
      isNextDisabled={!isValid || creatingAccount}
      nextLabel={creatingAccount ? undefined : undefined}
    >
      {creatingAccount && (
        <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10 rounded-lg">
          <div className="flex items-center gap-2 text-primary">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Setting up your account...</span>
          </div>
        </div>
      )}
      
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
                disabled={creatingAccount}
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
              disabled={creatingAccount}
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
              disabled={creatingAccount}
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
              disabled={creatingAccount}
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
