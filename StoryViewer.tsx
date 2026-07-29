import { useState, useEffect, useCallback, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { X, Trash2, Music, Heart, Send, Share2, Eye, MessageCircle } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "react-router";

// Time ago helper
function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// Hook to play real audio preview from a song's audioUrl
function useStoryAudio(song: { name: string; artist?: string; audioUrl?: string } | null | undefined) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    if (!song?.audioUrl) return;

    try {
      const audio = new Audio(song.audioUrl);
      audio.volume = 0.3;
      audio.loop = false;
      audio.play().catch(() => {});
      audioRef.current = audio;
    } catch (e) {
      console.warn("Audio playback error:", e);
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [song?.audioUrl, song?.name]);
}

interface Song {
  name: string;
  artist?: string;
  audioUrl?: string;
  artwork?: string;
}

interface Story {
  _id: string;
  imageUrl?: string;
  videoUrl?: string;
  song?: Song;
  createdAt: number;
  viewedBy: string[];
  duration?: number;
}

interface StoryGroup {
  user: any;
  stories: Story[];
}

interface StoryViewerProps {
  storyGroup: StoryGroup;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  currentUserId?: string;
}

export function StoryViewer({ storyGroup, onClose, onNext, onPrev, currentUserId }: StoryViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [likedAnimating, setLikedAnimating] = useState(false);
  const [likedCount, setLikedCount] = useState<number | null>(null);
  const replyInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { supabaseId } = useAuth();
  const viewStory = useMutation(api.stories.viewStory);
  const deleteStory = useMutation(api.stories.deleteStory);
  const likeStory = useMutation(api.stories.likeStory);
  const unlikeStory = useMutation(api.stories.unlikeStory);
  const sendMessage = useMutation(api.messages.sendMessage);

  const currentStory = storyGroup.stories[currentIndex];
  const isOwn = currentUserId && storyGroup.user?._id === currentUserId;
  // Photo stories: 15 seconds, Video stories: use video duration or default 15s
  const duration = currentStory?.videoUrl
    ? ((currentStory as any).duration || 15000)
    : 15000;

  // Fetch like state
  const isLiked = useQuery(
    api.stories.hasUserLikedStory,
    currentStory ? { storyId: currentStory._id as any, supabaseId: supabaseId ?? undefined } : "skip",
  );
  const rawLikesCount = useQuery(
    api.stories.getStoryLikes,
    currentStory ? { storyId: currentStory._id as any, supabaseId: supabaseId ?? undefined } : "skip",
  );
  const likers = useQuery(
    api.stories.getStoryLikers,
    currentStory && isOwn ? { storyId: currentStory._id as any, supabaseId: supabaseId ?? undefined } : "skip",
  );
  const viewers = useQuery(
    api.stories.getStoryViewers,
    currentStory && isOwn ? { storyId: currentStory._id as any } : "skip",
  );

  const likesCount = likedCount !== null ? likedCount : (rawLikesCount ?? 0);
  const viewsCount = currentStory?.viewedBy?.length ?? 0;

  // Sync likedCount when data loads
  useEffect(() => {
    if (rawLikesCount !== undefined) {
      setLikedCount(rawLikesCount);
    }
  }, [rawLikesCount]);

  const handleLike = async () => {
    if (!currentStory) return;
    try {
      if (isLiked) {
        await unlikeStory({ storyId: currentStory._id as any, supabaseId: supabaseId ?? undefined });
        setLikedCount((p) => Math.max(0, (p ?? 0) - 1));
      } else {
        await likeStory({ storyId: currentStory._id as any, supabaseId: supabaseId ?? undefined });
        setLikedCount((p) => (p ?? 0) + 1);
        setLikedAnimating(true);
        setTimeout(() => setLikedAnimating(false), 600);
      }
    } catch (e) {
      console.error("Like error:", e);
    }
  };

  const handleReply = () => {
    setShowReplyInput(true);
    setTimeout(() => replyInputRef.current?.focus(), 100);
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !currentStory) return;
    try {
      await sendMessage({
        receiverId: storyGroup.user._id as any,
        content: replyText.trim(),
        supabaseId: supabaseId ?? undefined,
      });
      setReplyText("");
      setShowReplyInput(false);
    } catch (e) {
      console.error("Reply error:", e);
    }
  };

  const handleShare = async () => {
    if (!currentStory) return;
    const shareUrl = `${window.location.origin}/feed?story=${currentStory._id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Story by ${storyGroup.user?.name || "Anonymous"}`,
          url: shareUrl,
        });
      } catch {}
    } else {
      await navigator.clipboard.writeText(shareUrl);
    }
  };

  const handleDelete = async () => {
    if (!currentStory) return;
    try {
      await deleteStory({ storyId: currentStory._id as any, supabaseId: supabaseId ?? undefined });
      setShowDeleteConfirm(false);
      onClose();
    } catch (err) {
      console.error("Failed to delete story:", err);
    }
  };

  // Play audio
  useStoryAudio(currentStory?.song);

  // Mark as viewed
  useEffect(() => {
    if (currentStory) {
      viewStory({ storyId: currentStory._id as any, supabaseId: supabaseId ?? undefined });
    }
  }, [currentIndex, currentStory, viewStory, supabaseId]);

  // Progress timer
  useEffect(() => {
    setProgress(0);
    const interval = 50;
    const steps = duration / interval;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      setProgress((currentStep / steps) * 100);
      if (currentStep >= steps) {
        clearInterval(timer);
        if (currentIndex < storyGroup.stories.length - 1) {
          setCurrentIndex(currentIndex + 1);
        } else {
          onNext();
        }
      }
    }, interval);

    return () => clearInterval(timer);
  }, [currentIndex, storyGroup.stories.length, onNext]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") {
        if (currentIndex < storyGroup.stories.length - 1) {
          setCurrentIndex(currentIndex + 1);
        } else {
          onNext();
        }
      }
      if (e.key === "ArrowLeft") {
        if (currentIndex > 0) {
          setCurrentIndex(currentIndex - 1);
        } else {
          onPrev();
        }
      }
    },
    [currentIndex, storyGroup.stories.length, onClose, onNext, onPrev],
  );

  const userInitials = storyGroup.user?.name?.slice(0, 2).toUpperCase() || "U";

  // Pause progress timer when interacting with bottom bar
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (!paused) return;
    // When paused, keep progress where it is
    return () => {};
  }, [paused]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black flex items-center justify-center"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Progress bars */}
      <div className="absolute top-0 left-0 right-0 flex gap-1 p-2 z-10" style={{ pointerEvents: "none" }}>
        {storyGroup.stories.map((_, i) => (
          <div key={i} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-100 ease-linear"
              style={{
                width: i === currentIndex ? `${paused ? 0 : progress}%` : i < currentIndex ? "100%" : "0%",
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-4 left-0 right-0 flex items-center justify-between px-4 z-10">
        <div className="flex items-center gap-3">
          <Avatar
            className="h-8 w-8 ring-2 ring-white/50 cursor-pointer"
            onClick={() => { onClose(); navigate(`/profile/${storyGroup.user?._id}`); }}
          >
            <AvatarImage src={storyGroup.user?.image} />
            <AvatarFallback className="text-[10px]">{userInitials}</AvatarFallback>
          </Avatar>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white">
              {storyGroup.user?.name || "Anonymous"}
            </span>
            <span className="text-[11px] text-white/60">
              {currentStory?.createdAt ? timeAgo(currentStory.createdAt) : ""}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Viewers / Likes count badge (own story only) */}
          {isOwn && (
            <button
              onClick={() => setShowStats(!showStats)}
              className="text-white/80 hover:text-white transition-colors flex items-center gap-1.5 bg-white/10 rounded-full px-2.5 py-1 text-[11px]"
              title="Story insights"
            >
              <Eye className="w-3.5 h-3.5" />
              {viewsCount}
              <Heart className="w-3 h-3 ml-1" fill={likesCount > 0 ? "currentColor" : "none"} />
              {likesCount}
            </button>
          )}
          {isOwn && (
            <div className="relative">
              <button
                onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
                className="text-white/80 hover:text-white transition-colors p-1"
                title="More"
              >
                <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
                  <circle cx="12" cy="5" r="2" />
                  <circle cx="12" cy="12" r="2" />
                  <circle cx="12" cy="19" r="2" />
                </svg>
              </button>
              {showDeleteConfirm && (
                <div className="absolute right-0 top-full mt-2 w-44 bg-popover text-popover-foreground rounded-lg border border-border shadow-xl z-50 overflow-hidden">
                  <button
                    onClick={handleDelete}
                    className="w-full flex items-center gap-2.5 px-4 py-3 text-left text-sm text-red-500 hover:bg-secondary/80 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete story
                  </button>
                </div>
              )}
              {showDeleteConfirm && (
                <div className="fixed inset-0 z-[-1]" onClick={() => setShowDeleteConfirm(false)} />
              )}
            </div>
          )}
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Story Content */}
      <div
        className="relative w-full flex items-center justify-center"
        style={{ height: showReplyInput ? "calc(100% - 120px)" : showStats ? "calc(100% - 230px)" : "calc(100% - 80px)" }}
      >
        <div
          className="w-full h-full flex items-center justify-center cursor-pointer"
          onClick={(e) => {
            if (paused) { setPaused(false); return; }
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            if (x > rect.width / 2) {
              if (currentIndex < storyGroup.stories.length - 1) {
                setCurrentIndex(currentIndex + 1);
              } else {
                onNext();
              }
            } else {
              if (currentIndex > 0) {
                setCurrentIndex(currentIndex - 1);
              } else {
                onPrev();
              }
            }
          }}
        >
          {currentStory?.imageUrl && (
            <img
              src={currentStory.imageUrl}
              alt="Story"
              className="max-h-full max-w-full object-contain"
            />
          )}
          {currentStory?.videoUrl && (
            <video
              src={currentStory.videoUrl}
              className="max-h-full max-w-full"
              autoPlay
              muted
              loop
            />
          )}
        </div>

        {/* Song info on story */}
        {currentStory?.song && (
          <div className="absolute top-2 left-0 right-0 flex justify-center z-10 px-4">
            <div className="flex items-center gap-2 bg-black/40 backdrop-blur-sm rounded-full px-3 py-1.5">
              <Music className="w-3.5 h-3.5 text-white" />
              <span className="text-sm text-white font-medium truncate max-w-[200px]">
                {currentStory.song.name}
              </span>
              {currentStory.song.artist && (
                <span className="text-xs text-white/60 truncate max-w-[120px]">
                  &middot; {currentStory.song.artist}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ===== Stats Panel (own story only) ===== */}
      {showStats && isOwn && (
        <div className="absolute bottom-20 left-0 right-0 z-20 px-4 max-h-[230px] overflow-y-auto">
          <div className="bg-black/60 backdrop-blur-md rounded-xl p-4 border border-white/10">
            <div className="flex items-center gap-6 mb-3 text-white/80 text-xs">
              <div className="flex items-center gap-1.5">
                <Eye className="w-4 h-4" />
                <span className="font-medium">{viewsCount}</span> views
              </div>
              <div className="flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5" fill="currentColor" />
                <span className="font-medium">{likesCount}</span> likes
              </div>
            </div>

            {/* Viewers */}
            {viewers && viewers.length > 0 && (
              <div className="pt-2 border-t border-white/10">
                <p className="text-[11px] text-white/50 font-medium mb-2">
                  Seen by <span className="font-semibold">{viewers.length}</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {viewers.slice(0, 8).map((v: any) => (
                    <div key={v._id} className="flex items-center gap-1.5 bg-white/5 rounded-full pr-2 py-0.5 pl-0.5 cursor-pointer hover:bg-white/10 transition-colors"
                      onClick={() => { onClose(); navigate(`/profile/${v._id}`); }}
                    >
                      <Avatar className="w-6 h-6 ring-1 ring-white/20">
                        <AvatarImage src={v.image} />
                        <AvatarFallback className="text-[8px]">{v.name?.[0] || "U"}</AvatarFallback>
                      </Avatar>
                      <span className="text-[10px] text-white/70 truncate max-w-[60px]">{v.name || "User"}</span>
                    </div>
                  ))}
                  {viewers.length > 8 && (
                    <span className="text-[11px] text-white/40 flex items-center">+{viewers.length - 8} more</span>
                  )}
                </div>
              </div>
            )}

            {/* Likers */}
            {likers && likers.length > 0 && (
              <div className="pt-2 border-t border-white/10">
                <p className="text-[11px] text-white/50 font-medium mb-2">Liked by</p>
                <div className="flex flex-wrap gap-2">
                  {likers.slice(0, 8).map((l: any) => (
                    <div key={l._id} className="flex items-center gap-1.5 bg-white/5 rounded-full pr-2 py-0.5 pl-0.5 cursor-pointer hover:bg-white/10 transition-colors"
                      onClick={() => { onClose(); navigate(`/profile/${l._id}`); }}
                    >
                      <Avatar className="w-6 h-6 ring-1 ring-white/20">
                        <AvatarImage src={l.image} />
                        <AvatarFallback className="text-[8px]">{l.name?.[0] || "U"}</AvatarFallback>
                      </Avatar>
                      <span className="text-[10px] text-white/70 truncate max-w-[60px]">{l.name || "User"}</span>
                    </div>
                  ))}
                  {likers.length > 8 && (
                    <span className="text-[11px] text-white/40 flex items-center">+{likers.length - 8} more</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== Reply Input ===== */}
      {showReplyInput && (
        <div className="absolute bottom-20 left-0 right-0 z-20 px-4">
          <div className="bg-black/60 backdrop-blur-md rounded-xl p-3 border border-white/10 flex items-center gap-2">
            <input
              ref={replyInputRef}
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendReply()}
              placeholder={`Reply to ${storyGroup.user?.name || "this story"}...`}
              className="flex-1 bg-transparent text-white text-sm placeholder-white/40 outline-none"
            />
            <button
              onClick={handleSendReply}
              disabled={!replyText.trim()}
              className="text-white/80 hover:text-white disabled:opacity-30 transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* ===== Bottom Action Bar ===== */}
      <div className="absolute bottom-0 left-0 right-0 z-20 px-4 pb-6 pt-2 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
        <div className="flex items-center justify-around max-w-sm mx-auto">
          {/* Like */}
          <button
            onClick={handleLike}
            className="flex flex-col items-center gap-0.5 text-white/80 hover:text-white transition-all active:scale-110"
            title={isLiked ? "Unlike" : "Like"}
          >
            <div className="relative">
              <Heart
                className={`w-7 h-7 transition-all duration-200 ${isLiked ? "text-red-500 fill-red-500" : "text-white/80"} ${likedAnimating ? "animate-bounce scale-125" : ""}`}
              />
            </div>
            <span className="text-[10px] text-white/60">{likesCount > 0 ? likesCount : ""}</span>
          </button>

          {/* Reply / Message */}
          <button
            onClick={handleReply}
            className="flex flex-col items-center gap-0.5 text-white/80 hover:text-white transition-all"
            title="Reply to story"
          >
            <MessageCircle className="w-7 h-7" />
            <span className="text-[10px] text-white/60">Reply</span>
          </button>

          {/* Share */}
          <button
            onClick={handleShare}
            className="flex flex-col items-center gap-0.5 text-white/80 hover:text-white transition-all"
            title="Share"
          >
            <Share2 className="w-6 h-6" />
            <span className="text-[10px] text-white/60">Share</span>
          </button>
        </div>
      </div>
    </div>
  );
}
