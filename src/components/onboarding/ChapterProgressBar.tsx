import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

// Define chapters that group steps together
export const ONBOARDING_CHAPTERS = [
  {
    id: 'basics',
    labelKey: 'chapters.basics',
    fallback: 'The Basics',
    steps: ['welcome', 'city', 'cuisine'],
  },
  {
    id: 'contact',
    labelKey: 'chapters.contact',
    fallback: 'Contact Info',
    steps: ['contact', 'address'],
  },
  {
    id: 'brand',
    labelKey: 'chapters.brand',
    fallback: 'Your Brand',
    steps: ['business-name', 'logo'],
  },
  {
    id: 'operations',
    labelKey: 'chapters.operations',
    fallback: 'Operations',
    steps: ['service-type', 'availability', 'dish-types'],
  },
  {
    id: 'compliance',
    labelKey: 'chapters.compliance',
    fallback: 'Getting Ready',
    steps: ['food-safety-status', 'kvk-nvwa-status', 'plan'],
  },
];

interface ChapterProgressBarProps {
  progress: number;
  currentStep: string;
}

export function ChapterProgressBar({ progress, currentStep }: ChapterProgressBarProps) {
  const { t } = useTranslation();
  
  // Find current chapter based on step
  const currentChapterIndex = ONBOARDING_CHAPTERS.findIndex(chapter => 
    chapter.steps.includes(currentStep)
  );
  
  const currentChapter = ONBOARDING_CHAPTERS[currentChapterIndex] || ONBOARDING_CHAPTERS[0];
  const totalChapters = ONBOARDING_CHAPTERS.length;
  const displayChapter = Math.max(1, currentChapterIndex + 1);

  return (
    <div className="w-full space-y-3">
      {/* Chapter indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">
            {displayChapter}/{totalChapters}
          </span>
          <span className="font-medium text-foreground">
            {t(currentChapter.labelKey, currentChapter.fallback)}
          </span>
        </div>
        <span className="text-sm text-muted-foreground">
          {Math.round(progress)}%
        </span>
      </div>
      
      {/* Chapter dots */}
      <div className="flex items-center gap-2">
        {ONBOARDING_CHAPTERS.map((chapter, index) => {
          const isCompleted = index < currentChapterIndex;
          const isCurrent = index === currentChapterIndex;
          
          return (
            <div
              key={chapter.id}
              className={cn(
                "flex-1 h-2 rounded-full transition-all duration-300",
                isCompleted && "bg-primary",
                isCurrent && "bg-primary/50",
                !isCompleted && !isCurrent && "bg-secondary"
              )}
            />
          );
        })}
      </div>
    </div>
  );
}

// Helper to get step count for admin display
export function getStepCountForAdmin(currentStepIndex: number, totalSteps: number) {
  return {
    current: currentStepIndex + 1,
    total: totalSteps,
  };
}
