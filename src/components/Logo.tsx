import { ChefHat } from 'lucide-react';

interface LogoProps {
  chefLogo?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export function Logo({ chefLogo, size = 'md', showText = true }: LogoProps) {
  const sizes = {
    sm: { container: 'w-10 h-10', icon: 'w-5 h-5', text: 'text-lg' },
    md: { container: 'w-14 h-14', icon: 'w-7 h-7', text: 'text-xl' },
    lg: { container: 'w-20 h-20', icon: 'w-10 h-10', text: 'text-2xl' },
  };

  return (
    <div className="flex items-center gap-3">
      {chefLogo ? (
        <img 
          src={chefLogo} 
          alt="Your logo" 
          className={`${sizes[size].container} rounded-xl object-cover shadow-soft border-2 border-primary/20`}
        />
      ) : (
        <div className={`${sizes[size].container} bg-gradient-warm rounded-xl flex items-center justify-center shadow-soft`}>
          <ChefHat className={`${sizes[size].icon} text-primary-foreground`} />
        </div>
      )}
      {showText && (
        <span className={`font-display font-bold ${sizes[size].text} text-foreground`}>
          Home-Made-Chef
        </span>
      )}
    </div>
  );
}
