import { useTranslation } from "react-i18next";
import homemadeLogo from "@/assets/homemade-logo.jpg";

interface LogoProps {
  chefLogo?: string;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  showDisclaimer?: boolean;
}

export function Logo({ chefLogo, size = "md", showText = false, showDisclaimer = false }: LogoProps) {
  const { t } = useTranslation();

  const sizes = {
    sm: { container: "h-10", text: "text-lg" },
    md: { container: "h-14", text: "text-xl" },
    lg: { container: "h-20", text: "text-2xl" },
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-3">
        {chefLogo ? (
          <img
            src={chefLogo}
            alt="Your logo"
            className={`${sizes[size].container} rounded-xl object-cover shadow-soft border-2 border-primary/20`}
          />
        ) : (
          <img
            src={homemadeLogo}
            alt="Homemade"
            className={`${sizes[size].container} object-contain`}
          />
        )}
        {showText && <span className={`font-display font-bold ${sizes[size].text} text-foreground`}>Homemade</span>}
      </div>
      {showDisclaimer && (
        <p className="text-[10px] text-muted-foreground/70 mt-1 max-w-xs leading-tight">{t("disclaimer.ip")}</p>
      )}
    </div>
  );
}
