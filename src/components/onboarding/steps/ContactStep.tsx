import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { StepLayout } from '../StepLayout';
import { Mail, Phone, User, Loader2, ShieldCheck, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

interface ContactStepProps {
  email: string;
  phone: string;
  firstName?: string;
  lastName?: string;
  onChange: (field: 'email' | 'phone' | 'firstName' | 'lastName', value: string) => void;
  onNext: () => void;
  onPrevious: () => void;
  onAccountCreated?: (userId: string) => void;
  onLookupByEmail?: (email: string) => Promise<boolean>;
  onVerificationRequired?: (email: string) => void;
}

export function ContactStep({
  email,
  phone,
  firstName = '',
  lastName = '',
  onChange,
  onNext,
  onPrevious,
  onAccountCreated,
  onLookupByEmail,
  onVerificationRequired
}: ContactStepProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [errors, setErrors] = useState<{ email?: string; phone?: string; firstName?: string }>({});
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [hasLookedUp, setHasLookedUp] = useState(false);
  const [verificationRequired, setVerificationRequired] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [resending, setResending] = useState(false);
  const leadTrackedRef = useRef(false);
  const lookupTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check if user is already verified (came back from magic link)
  useEffect(() => {
    if (user && verificationRequired) {
      // User is now authenticated - they verified via magic link
      setVerificationRequired(false);
      setVerificationSent(false);
      toast.success(t('contact.verificationSuccess', 'Email verified! Restoring your progress...'));

      // Now restore the profile
      if (onLookupByEmail) {
        onLookupByEmail(email).then((found) => {
          if (found) {
            toast.success(t('contact.profileRestored', 'Welcome back! Your progress has been restored.'));
          }
        });
      }
    }
  }, [user, verificationRequired, email, onLookupByEmail, t]);

  const validateEmail = (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  };

  const validatePhone = (value: string) => {
    const cleaned = value.replace(/[\s\-\(\)\.]/g, '');
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
        let tracked = false;

        if (typeof window !== 'undefined' && (window as any).fbq) {
          (window as any).fbq('track', 'Lead', {
            content_name: 'Chef Onboarding Contact',
            content_category: 'Onboarding',
          });
          tracked = true;
        }

        if (typeof window !== 'undefined' && (window as any).ttq) {
          (window as any).ttq.track('SubmitForm', {
            content_name: 'Chef Onboarding Contact',
            content_category: 'Onboarding',
          });
          tracked = true;
        }

        if (tracked) {
          leadTrackedRef.current = true;
        }
        return tracked;
      };

      if (!fireLead()) {
        setTimeout(fireLead, 500);
      }
    }
  };

  const sendVerificationLink = async (emailToVerify: string): Promise<{ sent: boolean; rateLimited?: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.functions.invoke('send-magic-link', {
        body: {
          email: emailToVerify.trim().toLowerCase(),
          redirectTo: `${window.location.origin}/onboarding?verified=true`
        },
      });

      if (error) {
        console.error('Error sending verification link:', error);
        // Check if it's a rate limit error
        if (error.message?.includes('429') || error.message?.includes('Too many')) {
          return { sent: false, rateLimited: true, error: t('contact.rateLimitError', 'Too many requests. Please wait a minute before trying again.') };
        }
        return { sent: false, error: error.message };
      }

      // Check for rate limit in response data
      if (data?.error?.includes('Too many')) {
        return { sent: false, rateLimited: true, error: data.error };
      }

      return { sent: data?.sent || false };
    } catch (err: any) {
      console.error('Failed to send verification link:', err);
      return { sent: false, error: err?.message };
    }
  };

  const handleEmailLookup = async (emailValue: string) => {
    // No-op: Email lookup removed in favor of explicit magic link on Next click
  };

  const handleResendVerification = async () => {
    setResending(true);
    const result = await sendVerificationLink(email);
    setResending(false);

    if (result.sent) {
      toast.success(t('contact.verificationResent', 'Verification link sent again!'));
    } else if (result.rateLimited) {
      toast.error(result.error || t('contact.rateLimitError', 'Too many requests. Please wait a minute before trying again.'));
    } else {
      toast.error(t('contact.verificationFailed', 'Failed to send verification. Please try again.'));
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

  const [saving, setSaving] = useState(false);

  const handleNext = async () => {
    if (verificationRequired) {
      toast.error(t('contact.verificationRequired', 'Please verify your email first by clicking the link we sent.'));
      return;
    }

    if (!validate()) return;

    setSaving(true);

    try {
      // Use auto-create-account edge function (service role bypasses RLS)
      const { data: accountData, error: accountError } = await supabase.functions.invoke('auto-create-account', {
        body: {
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          chefName: `${firstName} ${lastName}`.trim(),
        },
      });

      if (accountError) {
        console.error('Error creating account:', accountError);
        toast.error(`Failed: ${accountError.message || 'Unknown error'}`);
        setSaving(false);
        return;
      }

      if (!accountData?.success) {
        console.error('Account creation failed:', accountData?.error);
        toast.error(accountData?.error || 'Failed to create account');
        setSaving(false);
        return;
      }

      // Auto-verify with token if available
      if (accountData.verifyToken) {
        try {
          await supabase.auth.verifyOtp({
            token_hash: accountData.verifyToken,
            type: accountData.tokenType || 'magiclink',
          });
        } catch (e) {
          console.log('Auto-verify will happen via email:', e);
        }
      }

      // Send magic link email
      const { data: magicLinkData, error: magicLinkError } = await supabase.functions.invoke('send-magic-link', {
        body: {
          email: email.trim().toLowerCase(),
          chefName: firstName,
        },
      });

      if (magicLinkError) {
        console.error('Error sending magic link:', magicLinkError);
        toast.error(`Failed to send magic link: ${magicLinkError.message || 'Unknown error'}`);
        setSaving(false);
        return;
      }

      if (!magicLinkData?.success) {
        const errorMsg = magicLinkData?.error || 'Failed to send magic link';
        console.error('Magic link failed:', errorMsg);
        toast.error(errorMsg);
        setSaving(false);
        return;
      }

      // Show verification required screen
      setVerificationRequired(true);
      setVerificationSent(true);
      toast.success(t('contact.magicLinkSent', 'Magic link sent! Check your email to continue.'));

      if (onVerificationRequired) {
        onVerificationRequired(email.trim().toLowerCase());
      }
    } catch (err: any) {
      console.error('Error in contact step:', err);
      toast.error(err?.message || t('contact.errorOccurred', 'An error occurred. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  const isValid = email.trim().length > 0 && phone.trim().length > 0 && firstName.trim().length > 0 && validatePhone(phone);

  // Show verification required screen
  if (verificationRequired && verificationSent) {
    return (
      <StepLayout
        title={t('contact.verifyEmailTitle', 'Verify Your Email')}
        subtitle={t('contact.verifyEmailSubtitle', 'We found your existing profile')}
        onNext={handleNext}
        onPrevious={onPrevious}
        isNextDisabled={true}
        showNext={false}
      >
        <div className="max-w-md mx-auto text-center space-y-6">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <ShieldCheck className="w-10 h-10 text-primary" />
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-foreground">
              {t('contact.checkYourEmail', 'Check Your Email')}
            </h3>
            <p className="text-muted-foreground">
              {t('contact.verificationInstructions', 'For security, we\'ve sent a verification link to:')}
            </p>
            <p className="font-medium text-primary">{email}</p>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
            <p>
              {t('contact.clickLinkToContinue', 'Click the link in your email to verify your identity and continue where you left off.')}
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Button
              variant="outline"
              onClick={handleResendVerification}
              disabled={resending}
              className="w-full"
            >
              {resending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('contact.sending', 'Sending...')}
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {t('contact.resendVerification', 'Resend Verification Link')}
                </>
              )}
            </Button>

            <Button
              variant="ghost"
              onClick={() => {
                setVerificationRequired(false);
                setVerificationSent(false);
                setHasLookedUp(false);
                onChange('email', '');
              }}
              className="w-full text-muted-foreground"
            >
              {t('contact.useDifferentEmail', 'Use a Different Email')}
            </Button>
          </div>
        </div>
      </StepLayout>
    );
  }

  return (
    <StepLayout
      title={t('contact.title')}
      subtitle={t('contact.subtitle')}
      onNext={handleNext}
      onPrevious={onPrevious}
      isNextDisabled={!isValid || verificationRequired || saving}
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
                const newEmail = e.target.value;
                onChange('email', newEmail);
                if (errors.email) setErrors(prev => ({ ...prev, email: undefined }));

                // Email validation only - no auto-lookup
              }}
              className="pl-10 pr-10"
            />
            {isLookingUp && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
            )}
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
