import { Button } from '@/components/ui/button';
import { ChefProfile } from '@/types/onboarding';
import { 
  Check, 
  Square, 
  ChefHat, 
  ArrowRight, 
  Phone,
  Sparkles,
  MapPin,
  Store
} from 'lucide-react';

interface SummaryStepProps {
  profile: ChefProfile;
  onGoToDashboard: () => void;
  onBookCall: () => void;
}

interface ChecklistItem {
  label: string;
  completed: boolean;
}

export function SummaryStep({ profile, onGoToDashboard, onBookCall }: SummaryStepProps) {
  const checklist: ChecklistItem[] = [
    { label: 'Location & contact', completed: true },
    { label: 'Basic branding (name & logo)', completed: true },
    { label: 'Food safety plan chosen', completed: true },
    { label: 'Complete training videos', completed: false },
    { label: 'Finalize menu & prices', completed: false },
    { label: 'Confirm opening hours', completed: false },
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center animate-fade-in px-4">
      <div className="mb-8 relative">
        <div className="w-24 h-24 bg-forest rounded-3xl flex items-center justify-center shadow-glow animate-scale-in">
          <ChefHat className="w-12 h-12 text-accent-foreground" />
        </div>
        <div className="absolute -top-2 -right-2 w-10 h-10 bg-gradient-warm rounded-full flex items-center justify-center animate-pulse-soft">
          <Check className="w-5 h-5 text-primary-foreground" />
        </div>
      </div>

      <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4 animate-slide-up">
        You're in!
      </h1>
      
      <p className="text-xl text-muted-foreground mb-8 max-w-lg animate-slide-up" style={{ animationDelay: '0.1s' }}>
        Your basic profile is set up. Next, we'll help you finish your menu and go live.
      </p>

      {/* Profile Summary */}
      <div className="bg-card border border-border rounded-2xl p-6 mb-8 max-w-md w-full shadow-soft animate-slide-up" style={{ animationDelay: '0.15s' }}>
        <div className="flex items-center gap-4 mb-4 pb-4 border-b border-border">
          {profile.logoUrl ? (
            <img 
              src={profile.logoUrl} 
              alt="Logo" 
              className="w-16 h-16 rounded-xl object-cover"
            />
          ) : (
            <div className="w-16 h-16 bg-gradient-warm rounded-xl flex items-center justify-center">
              <Store className="w-8 h-8 text-primary-foreground" />
            </div>
          )}
          <div className="text-left">
            <h3 className="font-display font-bold text-lg text-foreground">
              {profile.restaurantName || 'Your Restaurant'}
            </h3>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {profile.city}, {profile.country}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 justify-center">
          {profile.primaryCuisines.slice(0, 3).map(cuisine => (
            <span key={cuisine} className="bg-terracotta-light text-primary px-3 py-1 rounded-full text-sm font-medium">
              {cuisine}
            </span>
          ))}
        </div>
      </div>

      {/* Checklist */}
      <div className="bg-card border border-border rounded-2xl p-6 mb-8 max-w-md w-full shadow-soft animate-slide-up" style={{ animationDelay: '0.2s' }}>
        <h3 className="font-display font-semibold text-foreground mb-4 text-left">
          Your progress
        </h3>
        <ul className="space-y-3">
          {checklist.map((item, idx) => (
            <li key={idx} className="flex items-center gap-3 text-left">
              {item.completed ? (
                <div className="w-6 h-6 bg-forest rounded-md flex items-center justify-center">
                  <Check className="w-4 h-4 text-accent-foreground" />
                </div>
              ) : (
                <Square className="w-6 h-6 text-muted-foreground" />
              )}
              <span className={item.completed ? 'text-foreground' : 'text-muted-foreground'}>
                {item.label}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* CTAs */}
      <div className="flex flex-col sm:flex-row gap-4 animate-slide-up" style={{ animationDelay: '0.3s' }}>
        <Button
          size="xl"
          onClick={onGoToDashboard}
          className="shadow-glow"
        >
          Go to dashboard
          <ArrowRight className="w-5 h-5" />
        </Button>
        
        <Button
          size="lg"
          variant="outline"
          onClick={onBookCall}
          className="gap-2"
        >
          <Phone className="w-4 h-4" />
          Book a call with Homemade
        </Button>
      </div>
    </div>
  );
}
