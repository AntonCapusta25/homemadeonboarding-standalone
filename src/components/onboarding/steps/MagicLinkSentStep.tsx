import { Mail, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

interface MagicLinkSentStepProps {
  email: string;
  isNewUser: boolean;
  onResend: () => void;
  resending: boolean;
}

export function MagicLinkSentStep({ email, isNewUser, onResend, resending }: MagicLinkSentStepProps) {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gradient-soft flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6 animate-fade-in">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
          <Mail className="w-10 h-10 text-primary" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            {isNewUser ? '🎉 Check your email!' : '👋 Welcome back!'}
          </h1>
          <p className="text-muted-foreground">
            {isNewUser 
              ? "We've sent a magic link to activate your account and log you in."
              : "We noticed you already have an account. We've sent you a magic link to log in."
            }
          </p>
        </div>

        <div className="bg-card border border-border rounded-lg p-4 space-y-2">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span>Magic link sent to:</span>
          </div>
          <p className="font-medium text-foreground">{email}</p>
        </div>

        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Click the link in your email to access your dashboard.
          </p>
          
          <Button
            variant="outline"
            onClick={onResend}
            disabled={resending}
            className="w-full"
          >
            {resending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              "Didn't receive it? Resend"
            )}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Check your spam folder if you don't see the email within a few minutes.
        </p>
      </div>
    </div>
  );
}
