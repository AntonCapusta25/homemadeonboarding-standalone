import { cn } from '@/lib/utils';

interface ProgressBarProps {
  progress: number;
  currentStep: number;
  totalSteps: number;
}

export function ProgressBar({ progress, currentStep, totalSteps }: ProgressBarProps) {
  // currentStep is 0-indexed, so add 1 for display
  const displayStep = currentStep + 1;
  
  return (
    <div className="w-full space-y-2">
      <div className="flex justify-between items-center text-sm">
        <span className="text-muted-foreground">
          Step {displayStep} of {totalSteps}
        </span>
        <span className="font-medium text-primary">
          {Math.round(progress)}% complete
        </span>
      </div>
      <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-warm rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
