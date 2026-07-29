import { cn } from "@/lib/utils";

interface EngageLogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

const sizeMap = {
  sm: { container: "w-7 h-7", icon: "w-4 h-4", text: "text-lg" },
  md: { container: "w-10 h-10", icon: "w-5.5 h-5.5", text: "text-xl" },
  lg: { container: "w-14 h-14", icon: "w-8 h-8", text: "text-2xl" },
};

export function EngageLogo({ size = "sm", showText = false, className }: EngageLogoProps) {
  const s = sizeMap[size];

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      {/* Icon mark */}
      <div
        className={cn(
          "relative flex items-center justify-center rounded-lg bg-foreground",
          s.container,
        )}
      >
        {/* Connection nodes SVG - three interconnected circles representing community */}
        <svg
          viewBox="0 0 24 24"
          className={cn("text-background", s.icon)}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Connecting arcs */}
          <path d="M5 14.5a5.5 5.5 0 1 1 1.5-3.8" strokeWidth="1.2" />
          <path d="M19 14.5a5.5 5.5 0 1 0-1.5-3.8" strokeWidth="1.2" />
          <path d="M12 20.5a5.5 5.5 0 1 1 0-10.5" strokeWidth="1.2" />
          {/* Center node */}
          <circle cx="12" cy="10.5" r="2.5" fill="currentColor" stroke="none" />
          {/* Orbiting dots */}
          <circle cx="7" cy="16" r="1.8" fill="currentColor" stroke="none" opacity="0.7" />
          <circle cx="17" cy="16" r="1.8" fill="currentColor" stroke="none" opacity="0.7" />
        </svg>
      </div>

      {/* Text */}
      {showText && (
        <span className={cn("font-semibold tracking-tight", s.text)}>Engage</span>
      )}
    </div>
  );
}

/**
 * Standalone icon-only SVG for use in small UI elements like dropdowns.
 */
export function EngageLogoIcon({ className }: { className?: string }) {
  const s = "w-8 h-8";
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-lg bg-foreground",
        s,
        className,
      )}
    >
      <svg
        viewBox="0 0 24 24"
        className="w-4.5 h-4.5 text-background"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M5 14.5a5.5 5.5 0 1 1 1.5-3.8" strokeWidth="1.2" />
        <path d="M19 14.5a5.5 5.5 0 1 0-1.5-3.8" strokeWidth="1.2" />
        <path d="M12 20.5a5.5 5.5 0 1 1 0-10.5" strokeWidth="1.2" />
        <circle cx="12" cy="10.5" r="2.5" fill="currentColor" stroke="none" />
        <circle cx="7" cy="16" r="1.8" fill="currentColor" stroke="none" opacity="0.7" />
        <circle cx="17" cy="16" r="1.8" fill="currentColor" stroke="none" opacity="0.7" />
      </svg>
    </div>
  );
}
