import { useTranslation } from 'react-i18next';
import { CheckCircle, ExternalLink, PartyPopper, Home, HelpCircle, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import confetti from 'canvas-confetti';
import { useEffect } from 'react';

interface VerificationCongratsStepProps {
  onComplete: () => void;
  onAdjustApplication?: () => void;
}

export function VerificationCongratsStep({ onComplete, onAdjustApplication }: VerificationCongratsStepProps) {
  const { t } = useTranslation();

  useEffect(() => {
    // Fire confetti on mount
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#ff6b35', '#ffc107', '#4caf50'],
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#ff6b35', '#ffc107', '#4caf50'],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    frame();
  }, []);

  return (
    <div className="space-y-8 max-w-lg mx-auto text-center animate-fade-in">
      {/* Success Icon */}
      <div className="flex justify-center">
        <div className="relative">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-14 h-14 text-green-600" />
          </div>
          <div className="absolute -top-2 -right-2">
            <PartyPopper className="w-8 h-8 text-primary" />
          </div>
        </div>
      </div>

      {/* Title & Message */}
      <div className="space-y-3">
        <h1 className="text-3xl font-bold text-foreground">
          Congratulations! 🎉
        </h1>
        <p className="text-lg text-muted-foreground">
          You've completed all verification steps. Your kitchen is being reviewed and we'll get back to you soon!
        </p>
      </div>

      {/* Info Card */}
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-center gap-2 text-primary">
            <Home className="w-5 h-5" />
            <span className="font-semibold">What's Next?</span>
          </div>
          <ul className="text-left space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
              <span>Our team will review your kitchen photos and documents</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
              <span>You'll receive feedback within 24-48 hours</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
              <span>Once approved, you can start accepting orders!</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* CTA Buttons */}
      <div className="space-y-3">
        {onAdjustApplication && (
          <Button onClick={onAdjustApplication} variant="default" className="w-full gap-2" size="lg">
            <Settings className="w-4 h-4" />
            <span>Adjust My Application</span>
          </Button>
        )}
        
        <a
          href="https://www.homemadechefs.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          <Button variant="outline" className="w-full gap-2" size="lg">
            <HelpCircle className="w-4 h-4" />
            <span>Have Questions?</span>
            <ExternalLink className="w-4 h-4" />
          </Button>
        </a>
      </div>

      {/* Footer text */}
      <p className="text-xs text-muted-foreground">
        Need help? Contact us at{' '}
        <a href="mailto:Chefs@homemademeals.net" className="text-primary hover:underline">
          Chefs@homemademeals.net
        </a>
      </p>
    </div>
  );
}
