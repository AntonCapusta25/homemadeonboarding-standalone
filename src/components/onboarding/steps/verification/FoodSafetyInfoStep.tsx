import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { ShieldCheck, ArrowLeft, ExternalLink, CheckCircle, Play, Clock } from "lucide-react";
import { TermsOfServiceModal, TosAcceptanceData } from "@/components/onboarding/TermsOfServiceModal";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FoodSafetyInfoStepProps {
  onComplete: (tosData?: TosAcceptanceData) => void;
  onPrevious: () => void;
  onSkip: () => void;
  chefProfileId: string | null;
  chefEmail?: string;
  chefName?: string;
  plan?: string;
}

const foodSafetyVideos = [
  {
    id: "basics",
    title: "Food Safety Basics",
    titleNl: "Basis Voedselveiligheid",
    url: "https://www.youtube.com/watch?v=fEsvLzajbxs",
  },
  {
    id: "hygiene",
    title: "Kitchen Hygiene",
    titleNl: "Keuken Hygiëne",
    url: "https://www.youtube.com/watch?v=NtTbLbHvNW8",
  },
  {
    id: "storage",
    title: "Food Storage",
    titleNl: "Voedsel Opslag",
    url: "https://www.youtube.com/watch?v=bAs70eIvttk",
  },
];

const foodSafetyQuizUrl = "https://zol4dc90rf4.typeform.com/to/fORAE4HR";

export function FoodSafetyInfoStep({ 
  onComplete, 
  onPrevious, 
  onSkip,
  chefProfileId,
  chefEmail,
  chefName,
  plan
}: FoodSafetyInfoStepProps) {
  const { t, i18n } = useTranslation();
  const [watchedVideos, setWatchedVideos] = useState<Set<string>>(new Set());
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [showTosModal, setShowTosModal] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);

  const handleWatchVideo = (videoId: string, url: string) => {
    window.open(url, "_blank");
    setWatchedVideos((prev) => new Set([...prev, videoId]));
  };

  const handleTakeQuiz = () => {
    window.open(foodSafetyQuizUrl, "_blank");
    setQuizCompleted(true);
  };

  const handleSkip = async () => {
    setIsSkipping(true);
    try {
      // Record skip timestamp in database
      if (chefProfileId) {
        await supabase
          .from('chef_verification')
          .update({ 
            food_safety_skipped_at: new Date().toISOString(),
            food_safety_followup_sent: false
          })
          .eq('chef_profile_id', chefProfileId);
      }

      // Send immediate follow-up email
      if (chefEmail) {
        await supabase.functions.invoke('send-notification-email', {
          body: {
            type: 'food_safety_skipped',
            chefName: chefName || 'Chef',
            email: chefEmail,
          }
        });
      }

      toast.info(t("verification.skippedFoodSafety", "We'll remind you to complete food safety training later."));
      onSkip();
    } catch (error) {
      console.error('Error handling skip:', error);
      onSkip();
    } finally {
      setIsSkipping(false);
    }
  };

  const handleCompleteClick = () => {
    setShowTosModal(true);
  };

  const handleTosAccept = (tosData: TosAcceptanceData) => {
    setShowTosModal(false);
    onComplete(tosData);
  };

  const allVideosWatched = watchedVideos.size === foodSafetyVideos.length;
  const canComplete = allVideosWatched && quizCompleted;

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <div className="mb-6 text-center">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-primary" />
          </div>
        </div>
        <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3">
          {t("verification.foodSafetyTitle", "Food Safety Training")}
        </h1>
        <p className="text-muted-foreground text-lg max-w-md mx-auto">
          {t("verification.foodSafetyDesc", "Watch the training videos and complete the quiz to continue.")}
        </p>
      </div>

      <div className="flex-1 space-y-4">
        {/* Video cards */}
        <div className="space-y-3">
          <h3 className="font-semibold text-foreground">{t("verification.trainingVideos", "Training Videos")}</h3>
          {foodSafetyVideos.map((video) => (
            <div
              key={video.id}
              className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${
                watchedVideos.has(video.id)
                  ? "bg-primary/5 border-primary/30"
                  : "bg-card border-border hover:border-primary/50"
              }`}
            >
              <div className="flex items-center gap-3">
                {watchedVideos.has(video.id) ? (
                  <CheckCircle className="w-5 h-5 text-primary" />
                ) : (
                  <Play className="w-5 h-5 text-muted-foreground" />
                )}
                <span className="font-medium text-foreground">
                  {i18n.language === "nl" ? video.titleNl : video.title}
                </span>
              </div>
              <Button
                variant={watchedVideos.has(video.id) ? "outline" : "default"}
                size="sm"
                onClick={() => handleWatchVideo(video.id, video.url)}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                {watchedVideos.has(video.id)
                  ? t("verification.watchAgain", "Watch Again")
                  : t("verification.watch", "Watch")}
              </Button>
            </div>
          ))}
        </div>

        {/* Quiz section */}
        <div className="mt-6">
          <h3 className="font-semibold text-foreground mb-3">{t("verification.foodSafetyQuiz", "Food Safety Quiz")}</h3>
          <div
            className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${
              quizCompleted ? "bg-primary/5 border-primary/30" : "bg-card border-border"
            }`}
          >
            <div className="flex items-center gap-3">
              {quizCompleted ? (
                <CheckCircle className="w-5 h-5 text-primary" />
              ) : (
                <ShieldCheck className="w-5 h-5 text-muted-foreground" />
              )}
              <span className="font-medium text-foreground">
                {t("verification.completeQuiz", "Complete the Food Safety Quiz")}
              </span>
            </div>
            <Button
              variant={quizCompleted ? "outline" : "default"}
              size="sm"
              onClick={handleTakeQuiz}
              disabled={!allVideosWatched}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              {quizCompleted ? t("verification.retakeQuiz", "Retake Quiz") : t("verification.takeQuiz", "Take Quiz")}
            </Button>
          </div>
          {!allVideosWatched && (
            <p className="text-sm text-muted-foreground mt-2">
              {t("verification.watchAllFirst", "Please watch all videos before taking the quiz.")}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 pt-8 mt-auto border-t border-border">
        <div className="flex justify-between">
          <Button variant="ghost" onClick={onPrevious}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("common.back", "Back")}
          </Button>
          <Button onClick={handleCompleteClick} size="lg" variant="default" disabled={!canComplete}>
            {t("verification.complete", "Complete")}
          </Button>
        </div>
        
        {/* Skip button */}
        <div className="flex justify-center">
          <Button 
            variant="link" 
            className="text-muted-foreground hover:text-foreground"
            onClick={handleSkip}
            disabled={isSkipping}
          >
            <Clock className="w-4 h-4 mr-2" />
            {isSkipping 
              ? t("common.loading", "Loading...") 
              : t("verification.skipForNow", "Skip for now, I'll do it later")}
          </Button>
        </div>
      </div>

      {/* TOS Modal */}
      <TermsOfServiceModal
        isOpen={showTosModal}
        onClose={() => setShowTosModal(false)}
        onAccept={handleTosAccept}
        plan={(plan as 'basic' | 'pro' | 'advanced') || 'basic'}
      />
    </div>
  );
}
