import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { BottomNav } from "@/components/BottomNav";
import { LogoDropdown } from "@/components/LogoDropdown";
import { useNavigate } from "react-router";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageCircle, Bookmark, MoreHorizontal } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";

export default function Reels() {
  const navigate = useNavigate();
  const reels = useQuery(api.posts.listReels, { limit: 20 });
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const scrollTop = containerRef.current.scrollTop;
    const height = containerRef.current.clientHeight;
    const index = Math.round(scrollTop / height);
    setCurrentIndex(Math.min(index, (reels?.length ?? 1) - 1));
  }, [reels?.length]);

  if (!reels || reels.length === 0) {
    return (
      <div className="min-h-screen bg-background pb-16 md:pb-0 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-secondary mx-auto mb-4 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth="1.5">
              <polygon points="23 7 16 12 23 17 23 7" />
              <rect x="1" y="5" width="15" height="14" rx="2" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-1">No reels yet</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Create short videos to share with the community.
          </p>
          <Button
            onClick={() => navigate("/create")}
            variant="outline"
            className="rounded-md"
          >
            Create a reel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-16 md:pb-0">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-30">
        <div className="px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-[4px] bg-white flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-3 h-3 text-black" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="4 12 8 12 11 6 14 18 17 12 20 12" />
              </svg>
            </div>
            <span className="text-base font-semibold tracking-tight text-white">Reels</span>
          </div>
          <button onClick={() => navigate("/create")} className="text-white">
            <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>
      </header>

      {/* Vertical Scroll Reels */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-screen snap-y snap-mandatory overflow-y-scroll scrollbar-none"
      >
        {reels.map((reel: any, index: number) => (
          <div key={reel._id} className="h-screen snap-start relative flex items-center justify-center">
            {reel.videoUrl ? (
              <video
                src={reel.videoUrl}
                className="w-full h-full object-cover"
                autoPlay={index === currentIndex}
                muted
                loop
                playsInline
              />
            ) : reel.imageUrl ? (
              <img
                src={reel.imageUrl}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-foreground/10 flex items-center justify-center text-white">
                <p className="text-sm">Reel</p>
              </div>
            )}

            {/* Overlay Info */}
            <div className="absolute bottom-20 left-4 right-20 text-white">
              <div
                className="flex items-center gap-3 mb-3 cursor-pointer"
                onClick={() => navigate(`/profile/${reel.userId}`)}
              >
                <Avatar className="h-8 w-8 ring-2 ring-white/50">
                  <AvatarImage src={reel.user?.image} />
                  <AvatarFallback className="text-[10px]">
                    {reel.user?.name?.slice(0, 2).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-semibold">{reel.user?.name || "Anonymous"}</span>
              </div>
              {reel.caption && (
                <p className="text-sm text-white/90">{reel.caption}</p>
              )}
            </div>

            {/* Actions Sidebar */}
            <div className="absolute bottom-20 right-4 flex flex-col items-center gap-5 text-white">
              <button className="flex flex-col items-center gap-1">
                <Heart className={`h-7 w-7 ${reel.isLiked ? "fill-white" : ""}`} />
                <span className="text-xs">{reel.likesCount}</span>
              </button>
              <button className="flex flex-col items-center gap-1">
                <MessageCircle className="h-7 w-7" />
                <span className="text-xs">{reel.commentsCount}</span>
              </button>
              <button className="flex flex-col items-center gap-1">
                <Bookmark className="h-7 w-7" />
              </button>
              <button>
                <MoreHorizontal className="h-7 w-7" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
