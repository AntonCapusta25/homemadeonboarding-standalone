import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { StepLayout } from '../StepLayout';
import { Mail, Phone } from 'lucide-react';

interface ContactStepProps {
  email: string;
  phone: string;
  onChange: (field: 'email' | 'phone', value: string) => void;
  onNext: () => void;
  onPrevious: () => void;
}

export function ContactStep({ email, phone, onChange, onNext, onPrevious }: ContactStepProps) {
  const [errors, setErrors] = useState<{ email?: string; phone?: string }>({});

  const validateEmail = (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  };

  const validate = () => {
    const newErrors: { email?: string; phone?: string } = {};
    
    if (!email.trim()) {
      newErrors.email = 'Please enter your email.';
    } else if (!validateEmail(email)) {
      newErrors.email = 'Please enter a valid email address.';
    }
    
    if (!phone.trim()) {
      newErrors.phone = 'Please enter your phone number.';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validate()) {
      onNext();
    }
  };

  const isValid = email.trim().length > 0 && phone.trim().length > 0;

  return (
    <StepLayout
      title="How can we reach you?"
      subtitle="We'll only use this to help you get started and for important updates."
      onNext={handleNext}
      onPrevious={onPrevious}
      isNextDisabled={!isValid}
    >
      <div className="max-w-md mx-auto space-y-6">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="email"
              placeholder="name@example.com"
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
            Phone number
          </label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="tel"
              placeholder="e.g. +31 6 12345678"
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
