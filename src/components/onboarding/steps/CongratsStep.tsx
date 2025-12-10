import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChefProfile } from '@/types/onboarding';
import { useTranslation } from 'react-i18next';
import { ChefHat, FileCheck, ShieldCheck, Zap, ClipboardCheck, ArrowRight, Clock, Calendar, CheckCircle } from 'lucide-react';
import { fireCelebration } from '@/components/confetti';
import { Logo } from '@/components/Logo';
import { supabase } from '@/integrations/supabase/client';
import { ContactButtons } from '@/components/onboarding/ContactButtons';

interface CongratsStepProps {
  profile: ChefProfile;
  onStartFastVerification: () => void;
  verificationComplete?: boolean;
}

export function CongratsStep({ profile, onStartFastVerification, verificationComplete = false }: CongratsStepProps) {
  const { t } = useTranslation();
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    // Track CompleteRegistration event in Meta Pixel
    if (typeof window !== 'undefined' && (window as any).fbq) {
      (window as any).fbq('track', 'CompleteRegistration', {
        content_name: 'Chef Onboarding Complete',
        status: verificationComplete ? 'verified' : 'pending_verification',
      });
    }
    
    // Trigger confetti celebration
    const timer = setTimeout(() => {
      fireCelebration();
      setShowContent(true);
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  // Send welcome emails when congrats page loads (profile just completed)
  // Use localStorage to prevent duplicate sends across re-renders and page refreshes
  useEffect(() => {
    const sendWelcomeEmails = async () => {
      // Check localStorage to prevent duplicate sends
      const emailSentKey = `welcome_emails_sent_${profile.email}`;
      if (localStorage.getItem(emailSentKey)) {
        console.log('Welcome emails already sent for this profile');
        return;
      }
      
      // Mark as sent immediately to prevent race conditions
      localStorage.setItem(emailSentKey, 'true');
      
      try {
        // Send welcome email to chef
        await supabase.functions.invoke('send-notification-email', {
          body: {
            type: 'welcome',
            chefName: `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'Chef',
            email: profile.email,
          },
        });

        // Send new signup notification to admin with full details
        await supabase.functions.invoke('send-notification-email', {
          body: {
            type: 'new_signup',
            chefName: `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'Chef',
            email: profile.email,
            phone: profile.phone,
            city: profile.city,
            address: profile.streetAddress,
            businessName: profile.restaurantName,
            cuisines: profile.primaryCuisines,
            dishTypes: profile.dishTypes,
            serviceType: profile.serviceType,
            availability: profile.availabilityBuckets,
            foodSafetyStatus: profile.foodSafetyStatus,
            kvkStatus: profile.kvkStatus,
            plan: profile.plan,
          },
        });

        console.log('Welcome emails sent successfully');
      } catch (error) {
        console.error('Failed to send welcome emails:', error);
        // Remove the flag so it can be retried
        localStorage.removeItem(emailSentKey);
      }
    };

    if (showContent && profile.email) {
      sendWelcomeEmails();
    }
  }, [showContent, profile]);

  const handleBookMeeting = () => {
    window.open('https://calendly.com/homemademeals-info/interview-with-homemade', '_blank');
  };

  const verificationItems = [
    {
      icon: ClipboardCheck,
      title: t('congrats.reviewMenu', 'Review Your Menu'),
      description: t('congrats.reviewMenuDesc', 'Check your AI-generated menu and make any adjustments'),
    },
    {
      icon: ShieldCheck,
      title: t('congrats.foodSafetyQuiz', 'Complete Food Safety Training'),
      description: t('congrats.foodSafetyDesc', 'Watch training videos and complete the quiz'),
    },
    {
      icon: FileCheck,
      title: t('congrats.uploadId', 'Upload Your ID'),
      description: t('congrats.uploadIdDesc', 'Upload your identification document for verification'),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-soft flex items-center justify-center">
      <div className="container max-w-2xl mx-auto px-4 py-8">
        <div className={`text-center transition-all duration-700 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <Logo chefLogo={profile.logoUrl} size="lg" showText={false} />
          </div>

          {/* Chef hat icon with animation */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center animate-bounce-slow">
              {verificationComplete ? (
                <CheckCircle className="w-10 h-10 text-primary" />
              ) : (
                <ChefHat className="w-10 h-10 text-primary" />
              )}
            </div>
          </div>

          {/* Congratulations message */}
          <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
            {verificationComplete 
              ? t('congrats.verificationComplete', 'Verification Complete!') 
              : t('congrats.profileComplete', 'Congratulations!')} 🎉
          </h1>

          <p className="text-xl text-muted-foreground mb-2">
            {verificationComplete
              ? t('congrats.allStepsComplete', 'You have completed all verification steps')
              : t('congrats.profileCreated', 'Your chef profile has been created')}
          </p>

          {/* Chef name */}
          {profile.firstName && (
            <p className="text-2xl font-semibold text-primary mb-6">
              {profile.firstName} {profile.lastName}
            </p>
          )}

          {/* Waiting for approval status */}
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-6 flex items-center gap-3 justify-center">
            <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <p className="text-amber-700 dark:text-amber-300 font-medium">
              {t('congrats.waitingApproval', 'You are currently waiting for approval to join the Homemade platform')}
            </p>
          </div>

          {/* Show verification steps or completion message */}
          {!verificationComplete ? (
            <>
              {/* CTA Buttons - Now at the top! */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                <Button 
                  size="xl" 
                  onClick={onStartFastVerification}
                  className="shadow-glow hover:shadow-medium"
                >
                  {t('congrats.startVerification', 'Complete Profile')}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <Button 
                  size="xl" 
                  variant="outline"
                  onClick={handleBookMeeting}
                >
                  <Calendar className="w-5 h-5 mr-2" />
                  {t('congrats.bookMeeting', 'Book a Meeting')}
                </Button>
              </div>

              {/* Speed up verification section */}
              <div className="bg-card rounded-xl border border-border p-6 text-left">
                <h2 className="font-semibold text-lg mb-2 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-500" />
                  {t('congrats.speedUpApproval', 'Speed up your approval!')}
                </h2>
                <p className="text-muted-foreground mb-6">
                  {t('congrats.completeFollowing', 'Complete the following steps to get approved faster:')}
                </p>
                
                <ul className="space-y-4">
                  {verificationItems.map((item, index) => (
                    <li key={index} className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <item.icon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {index + 1}. {item.title}
                        </p>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <>
              {/* All done message */}
              <div className="bg-primary/5 rounded-xl border border-primary/20 p-6 mb-8">
                <p className="text-lg text-foreground">
                  {t('congrats.allDoneMessage', 'Thank you for completing all the steps! Our team will review your profile and get back to you soon.')}
                </p>
              </div>

              {/* Book meeting button */}
              <div className="flex justify-center">
                <Button 
                  size="xl" 
                  onClick={handleBookMeeting}
                  className="shadow-glow hover:shadow-medium"
                >
                  <Calendar className="w-5 h-5 mr-2" />
                  {t('congrats.bookMeeting', 'Book a Meeting')}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
      
      {/* Contact buttons */}
      <ContactButtons />
    </div>
  );
}
