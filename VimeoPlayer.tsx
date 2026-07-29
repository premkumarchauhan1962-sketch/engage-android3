import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface VimeoPlayerProps {
  vimeoId?: string;
  videoUrl?: string;
  className?: string;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  controls?: boolean;
  aspectRatio?: string;
}

/**
 * VimeoPlayer component - embeds a Vimeo video using the Vimeo Player API.
 * Supports both direct Vimeo IDs and any video URL (falls back to standard video element).
 */
export function VimeoPlayer({
  vimeoId,
  videoUrl,
  className,
  autoPlay = false,
  muted = true,
  loop = false,
  controls = true,
  aspectRatio = "16/9",
}: VimeoPlayerProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // If no vimeoId, check if videoUrl is a Vimeo URL
  const resolvedVimeoId = vimeoId || extractVimeoId(videoUrl);
  const isVimeo = !!resolvedVimeoId;

  // Handle Vimeo embed
  if (isVimeo) {
    const embedUrl = `https://player.vimeo.com/video/${resolvedVimeoId}?autoplay=${autoPlay ? 1 : 0}&loop=${loop ? 1 : 0}&muted=${muted ? 1 : 0}&title=0&byline=0&portrait=0&controls=${controls ? 1 : 0}`;

    return (
      <div
        className={cn("relative overflow-hidden bg-muted", className)}
        style={{ aspectRatio }}
      >
        {!isLoaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-muted-foreground/30 border-t-foreground rounded-full animate-spin" />
          </div>
        )}
        <iframe
          ref={iframeRef}
          src={embedUrl}
          className={cn(
            "w-full h-full transition-opacity duration-300",
            isLoaded ? "opacity-100" : "opacity-0"
          )}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
          title="Vimeo video player"
        />
        {hasError && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground text-sm">
            Failed to load video
          </div>
        )}
      </div>
    );
  }

  // Fallback to standard video element for non-Vimeo URLs
  if (videoUrl) {
    return (
      <div
        className={cn("relative overflow-hidden bg-muted", className)}
        style={{ aspectRatio }}
      >
        <video
          src={videoUrl}
          className="w-full h-full object-cover"
          autoPlay={autoPlay}
          muted={muted}
          loop={loop}
          controls={controls}
          playsInline
          onError={() => setHasError(true)}
        />
        {hasError && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground text-sm">
            Failed to load video
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn("flex items-center justify-center bg-muted text-muted-foreground", className)}
      style={{ aspectRatio, minHeight: 200 }}
    >
      <div className="text-center">
        <svg viewBox="0 0 24 24" className="w-10 h-10 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" strokeWidth="1.5">
          <polygon points="23 7 16 12 23 17 23 7" />
          <rect x="1" y="5" width="15" height="14" rx="2" />
        </svg>
        <p className="text-xs">No video</p>
      </div>
    </div>
  );
}

/**
 * Extract Vimeo video ID from various Vimeo URL formats.
 */
function extractVimeoId(url?: string): string | null {
  if (!url) return null;

  const patterns = [
    /vimeo\.com\/(\d+)/,
    /player\.vimeo\.com\/video\/(\d+)/,
    /vimeo\.com\/video\/(\d+)/,
    /vimeo\.com\/channels\/[^/]+\/(\d+)/,
    /vimeo\.com\/groups\/[^/]+\/videos\/(\d+)/,
    /vimeo\.com\/album\/[^/]+\/video\/(\d+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}
