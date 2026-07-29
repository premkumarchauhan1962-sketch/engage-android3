import React, { StrictMode, useState, useCallback, useEffect, useRef, Component } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes, useNavigate, Navigate, useSearchParams, useParams } from "react-router";
import { ConvexReactClient, ConvexProvider, useQuery, useMutation } from "convex/react";
import { api } from "./convex/_generated/api";
import { StoryViewer } from "./components/StoryViewer";
import { useAuth } from "./hooks/use-auth";
import AuthPage from "./pages/Auth";
import ProfilePage from "./pages/Profile";
import CreatePostPage from "./pages/CreatePost";
import SearchPage from "./pages/Search";
import "./index.css";

// Error boundary to prevent white screen on runtime errors
class ErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean; message: string; stack: string }> {
  state = { hasError: false, message: "", stack: "" } as const;
  static getDerivedStateFromError(error: any) {
    return { hasError: true, message: error?.message || "Unknown error", stack: error?.stack || "" };
  }
  componentDidCatch(error: any) { console.error("[Engage] Runtime error:", error); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "system-ui, sans-serif", background: "#fafafa", color: "#1a1a1a" }}>
          <div style={{ maxWidth: 420, textAlign: "center" }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#e5e5e5", margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Something went wrong</p>
            <p style={{ fontSize: 12, color: "#888", marginBottom: 16, wordBreak: "break-word" }}>{this.state.message}</p>
            <button onClick={() => window.location.reload()} style={{ height: 36, padding: "0 20px", fontSize: 13, fontWeight: 500, borderRadius: 8, border: "1px solid #ccc", background: "white", cursor: "pointer" }}>Reload page</button>
            {this.state.stack && <pre style={{ marginTop: 16, fontSize: 10, textAlign: "left", color: "#aaa", maxHeight: 120, overflow: "auto", whiteSpace: "pre-wrap", lineHeight: 1.4 }}>{this.state.stack}</pre>}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const convexUrl = (import.meta as any).env.VITE_CONVEX_URL;
const hasConvex = !!convexUrl;
const convex = hasConvex ? new ConvexReactClient(convexUrl) : null;

/* ---- Follow Request Bell ---- */
function FollowRequestBell({ supabaseId: propId }: { supabaseId?: string | null }) {
  const nav = useNavigate();
  const pendingRequests = useQuery(api.follows.getPendingFollowRequests, {
    supabaseId: propId ?? undefined,
  });
  const count = pendingRequests?.length ?? 0;

  return (
    <div className="relative">
      <button
        onClick={() => nav("/notifications")}
        className="h-9 w-9 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary relative"
        title="Notifications"
      >
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-white text-[10px] font-bold flex items-center justify-center leading-none shadow-sm">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>
    </div>
  );
}

/* ---- LOGO ---- */
function Logo() {
  return (
    <div className="flex items-center gap-2">
      <div className="w-7 h-7 rounded-lg bg-foreground flex items-center justify-center">
        <svg viewBox="0 0 24 24" className="w-4 h-4 text-background" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <circle cx="12" cy="10.5" r="2.5" fill="currentColor" stroke="none"/>
          <path d="M5 14.5a5.5 5.5 0 1 1 1.5-3.8"/>
          <path d="M19 14.5a5.5 5.5 0 1 0-1.5-3.8"/>
          <path d="M12 20.5a5.5 5.5 0 1 1 0-10.5"/>
        </svg>
      </div>
      <span className="font-semibold tracking-tight text-base">Engage</span>
    </div>
  );
}

// cn utility for combining class names
function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

/* ---- UserAvatar ---- */
function UserAvatar({ user, className, onClick }: { user?: any; className?: string; onClick?: () => void }) {
  const name = user?.name || user?.email || "U";
  const initial = name[0]?.toUpperCase() || "U";
  return (
    <div
      className={cn("w-10 h-10 rounded-full overflow-hidden flex-shrink-0", className)}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {user?.image ? (
        <img src={user.image} alt={name} className="w-full h-full object-cover" onError={e => { 
          const img = e.target as HTMLImageElement;
          img.style.display = "none";
          const parent = img.parentElement!;
          parent.classList.add("bg-secondary", "flex", "items-center", "justify-center");
          // Add initial fallback
          const fallback = document.createElement("span");
          fallback.className = "text-sm font-medium";
          fallback.textContent = initial;
          if (!parent.querySelector("span")) parent.appendChild(fallback);
        }} />
      ) : (
        <div className="w-full h-full bg-secondary flex items-center justify-center text-sm font-medium">{initial}</div>
      )}
    </div>
  );
}

/* ---- BOTTOM NAV ---- */
function BottomNav({ current }: { current?: string }) {
  const nav = useNavigate();
  const { supabaseId } = useAuth();
  const unreadCount = useQuery(api.messages.getUnreadCount, { supabaseId: supabaseId ?? undefined });
  const msgCount = unreadCount ?? 0;

  const items = [
    { path: "/feed", label: "Home", icon: (active: boolean) => active
      ? "<path d='M3 10.5V21h7v-6h4v6h7V10.5L12 3z'/>"
      : "<path d='M3 10.5V21h7v-6h4v6h7V10.5L12 3z' fill='none' stroke='currentColor' stroke-width='1.5'/>" },
    { path: "/search", label: "Search", icon: () => "<circle cx='11' cy='11' r='7.5' fill='none' stroke='currentColor' stroke-width='1.5'/><path d='m16.5 16.5 4.5 4.5' fill='none' stroke='currentColor' stroke-width='1.5'/>" },
    { path: "/create", label: "Create", icon: () => "<rect x='2' y='2' width='20' height='20' rx='4' fill='none' stroke='currentColor' stroke-width='1.5'/><path d='M12 7.5v9M7.5 12h9' fill='none' stroke='currentColor' stroke-width='1.5'/>" },
    { path: "/messages", label: "Messages", icon: () => "<path d='M20 12.5a8.5 8.5 0 1 0-16 0 8.5 8.5 0 0 0 4.8 7.65L12 22l3.2-1.85A8.5 8.5 0 0 0 20 12.5Z' fill='none' stroke='currentColor' stroke-width='1.5'/>" },
    { path: "/profile", label: "Profile", icon: (active: boolean) => active
      ? "<circle cx='12' cy='7.5' r='4' fill='currentColor'/><path d='M4.5 21c0-4.5 3.5-8 7.5-8s7.5 3.5 7.5 8' fill='currentColor'/>"
      : "<circle cx='12' cy='7.5' r='4' fill='none' stroke='currentColor' stroke-width='1.5'/><path d='M4.5 21c0-4.5 3.5-8 7.5-8s7.5 3.5 7.5 8' fill='none' stroke='currentColor' stroke-width='1.5'/>" },
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 border-t border-border bg-background">
      <div className="max-w-xl mx-auto flex items-center justify-around h-14">
        {items.map((item) => {
          const active = current === item.path.split("/")[1];
          const isMessages = item.path === "/messages";
          return (
            <button key={item.path} onClick={() => nav(item.path)} className="flex flex-col items-center gap-0.5 relative">
              <div className="relative">
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill={active ? "currentColor" : "none"} stroke={active ? "none" : "currentColor"} strokeWidth="1.5">
                  <g dangerouslySetInnerHTML={{ __html: item.icon(active) }} />
                </svg>
                {isMessages && msgCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] px-0.5 rounded-full bg-destructive text-white text-[9px] font-bold flex items-center justify-center leading-none shadow-sm">
                    {msgCount > 9 ? "9+" : msgCount}
                  </span>
                )}
              </div>
              <span className={`text-[10px] ${active ? "text-foreground font-medium" : "text-muted-foreground"}`}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/* ---- LANDING ---- */
function LandingPage() {
  const nav = useNavigate();
  const auth = useAuth();

  // Check for persisted login state (quick check before auth hook resolves)
  const [checkedLocal, setCheckedLocal] = useState(false);
  useEffect(() => {
    const loggedIn = localStorage.getItem("engage_logged_in") === "true";
    if (loggedIn && !auth.isAuthenticated && !auth.isLoading) {
      // Local flag says logged in but auth says not — might be refresh issue, try hard reload
      setCheckedLocal(true);
    } else if (auth.isAuthenticated) {
      localStorage.setItem("engage_logged_in", "true");
      setCheckedLocal(true);
    } else if (!auth.isLoading && !auth.isAuthenticated) {
      localStorage.removeItem("engage_logged_in");
      setCheckedLocal(true);
    }
  }, [auth.isLoading, auth.isAuthenticated]);

  // Redirect if authenticated
  useEffect(() => {
    if (!auth.isLoading && auth.isAuthenticated) {
      nav("/feed", { replace: true });
    }
  }, [auth.isLoading, auth.isAuthenticated, nav]);

  if (auth.isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-sm text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (auth.isAuthenticated) {
    return <Navigate to="/feed" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 inset-x-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-3">
            <button onClick={() => nav("/auth")} className="h-9 px-5 rounded-md bg-foreground text-background text-sm font-medium hover:bg-foreground/90">Log in</button>
          </div>
        </div>
      </header>
      <main className="pt-40 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border text-xs text-muted-foreground mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-foreground" />Share your moments
          </div>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-6">
            Share life's<br /><span className="text-muted-foreground">moments</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-lg mx-auto mb-10 leading-relaxed">A minimalist space for sharing photos, videos, and stories with the people who matter most.</p>
          <button onClick={() => nav("/auth")} className="h-11 px-8 rounded-md bg-foreground text-background text-sm font-medium hover:bg-foreground/90">Get started</button>
        </div>
      </main>
    </div>
  );
}

/* ---- AUTH ---- */
// AuthPage is imported from ./pages/Auth (uses Supabase auth)

/* ---- Post Song Player ---- */
function PostSongPlayer({ song, isActive }: { song: any; isActive?: boolean }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  // Auto-play when post becomes visible, pause when not
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    if (isActive) {
      el.currentTime = 0;
      el.play().catch(() => {});
      setPlaying(true);
    } else {
      el.pause();
      el.currentTime = 0;
      setPlaying(false);
    }
  }, [isActive]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play().catch(() => {});
      setPlaying(true);
    }
  };

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onEnd = () => setPlaying(false);
    el.addEventListener("ended", onEnd);
    return () => el.removeEventListener("ended", onEnd);
  }, []);

  return (
    <div className="flex items-center gap-2 pt-1">
      <button
        onClick={togglePlay}
        className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${playing ? "bg-[#0095F6] text-white" : "bg-foreground/10 hover:bg-foreground/20"}`}
        title={playing ? "Pause" : "Play"}
      >
        {playing ? (
          <svg viewBox="0 0 24 24" className="w-3 h-3" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
        ) : (
          <svg viewBox="0 0 24 24" className="w-3 h-3" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        )}
      </button>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
        <svg viewBox="0 0 24 24" className={`w-3.5 h-3.5 flex-shrink-0 ${playing ? "text-[#0095F6]" : ""}`} fill="currentColor"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
        <span className="truncate max-w-[120px]">{song.name}</span>
        {song.artist && <span className="text-muted-foreground/60 shrink-0">· {song.artist}</span>}
      </div>
      {song.audioUrl && <audio ref={audioRef} src={song.audioUrl} preload="none" />}
    </div>
  );
}

/* ---- FEED ---- */
function FeedPage() {
  const nav = useNavigate();
  const auth = useAuth();
  const { user, supabaseId, signOut } = auth;
  const feed = useQuery(api.posts.getFeedPosts, { limit: 20, supabaseId: supabaseId ?? undefined });
  const posts = feed?.posts ?? [];
  const storyGroups = useQuery(api.stories.getActiveStories, { supabaseId: auth.supabaseId ?? undefined }) as any[] | undefined;
  const unreadMessagesCount = useQuery(api.messages.getUnreadCount, { supabaseId: auth.supabaseId ?? undefined }) ?? 0;
  const [viewingStory, setViewingStory] = useState<{ stories: any[]; user: any } | null>(null);
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const cleanupStories = useMutation(api.stories.cleanupExpiredStories);
  const toggleLike = useMutation(api.posts.toggleLike);
  const toggleSave = useMutation(api.posts.toggleSave);
  const addComment = useMutation(api.posts.addComment);
  const [commentPostId, setCommentPostId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const comments = useQuery(api.posts.getComments, commentPostId ? { postId: commentPostId as any, supabaseId: supabaseId ?? undefined } : "skip");

  // Optimistic local state for likes/saves to update instantly
  const [optimisticLikes, setOptimisticLikes] = useState<Record<string, { liked: boolean; count: number }>>({});
  const [optimisticSaves, setOptimisticSaves] = useState<Record<string, boolean>>({});

  // Clean up expired stories every 30 minutes
  useEffect(() => {
    cleanupStories({});
    const interval = setInterval(() => { cleanupStories({}); }, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [cleanupStories]);

  const handleLike = async (postId: string, currentLiked: boolean, currentCount: number) => {
    // Optimistic update
    setOptimisticLikes(p => ({ ...p, [postId]: { liked: !currentLiked, count: currentCount + (currentLiked ? -1 : 1) } }));
    try {
      await toggleLike({ postId: postId as any, supabaseId: supabaseId ?? undefined });
    } catch (e) {
      // Revert on error
      setOptimisticLikes(p => ({ ...p, [postId]: { liked: currentLiked, count: currentCount } }));
    }
  };

  const handleSave = async (postId: string, currentSaved: boolean) => {
    setOptimisticSaves(p => ({ ...p, [postId]: !currentSaved }));
    try {
      await toggleSave({ postId: postId as any, supabaseId: supabaseId ?? undefined });
    } catch (e) {
      setOptimisticSaves(p => ({ ...p, [postId]: currentSaved }));
    }
  };

  const handleAddComment = async (postId: string) => {
    if (!commentText.trim()) return;
    const text = commentText.trim();
    setCommentText("");
    try {
      await addComment({ postId: postId as any, content: text, supabaseId: supabaseId ?? undefined });
    } catch (e) { console.error(e); }
  };

  // Intersection Observer for auto-playing songs
  const postRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = entry.target.getAttribute("data-post-id");
          if (!id) continue;
          if (entry.isIntersecting && entry.intersectionRatio >= 0.4) {
            setActivePostId(id);
          } else if (activePostId === id) {
            setActivePostId(null);
          }
        }
      },
      { threshold: [0.4] }
    );
    return () => observerRef.current?.disconnect();
  }, []);

  // Observe/unobserve post elements as they mount/unmount
  const setPostRef = useCallback((el: HTMLDivElement | null, postId: string) => {
    if (el) {
      postRefs.current.set(postId, el);
      observerRef.current?.observe(el);
    } else {
      const prev = postRefs.current.get(postId);
      if (prev) observerRef.current?.unobserve(prev);
      postRefs.current.delete(postId);
    }
  }, []);

  if (!user && !auth.isLoading) return <Navigate to="/auth?returnTo=/feed" replace />;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-xl mx-auto px-4 h-14 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-2">
            <FollowRequestBell supabaseId={auth.supabaseId} />
            <button onClick={() => nav("/messages")} className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary relative" title="Messages">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20 12.5a8.5 8.5 0 1 0-16 0 8.5 8.5 0 0 0 4.8 7.65L12 22l3.2-1.85A8.5 8.5 0 0 0 20 12.5Z"/><path d="M8 10h8M8 14h5"/></svg>
              {unreadMessagesCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-0.5 rounded-full bg-destructive text-white text-[9px] font-bold flex items-center justify-center leading-none shadow-sm">
                  {unreadMessagesCount > 9 ? "9+" : unreadMessagesCount}
                </span>
              )}
            </button>
            <button onClick={() => nav("/create")} className="h-8 px-3 text-xs bg-foreground text-background rounded-md font-medium hover:bg-foreground/90">+ Post</button>
            <button onClick={signOut} className="h-8 px-3 text-xs border border-border rounded-md text-muted-foreground hover:text-foreground">Sign Out</button>
          </div>
        </div>
      </header>
      <main className="max-w-xl mx-auto px-4 pt-6 pb-24">
        <h1 className="text-lg font-bold mb-1">{user?.name ? `Hello, ${user.name}` : "Feed"}</h1>
        <p className="text-sm text-muted-foreground mb-6">Posts from people you follow appear here.</p>

        {/* Stories Bar */}
        {storyGroups && storyGroups.length > 0 && (
          <div className="flex items-center gap-3 overflow-x-auto pb-3 mb-4 -mx-4 px-4 scrollbar-none">
            {storyGroups.map((group: any) => {
              const hasStory = group.stories?.length > 0;
              return (
                <div
                  key={group.user?._id}
                  className="flex flex-col items-center gap-0.5 cursor-pointer flex-shrink-0"
                  onClick={() => { if (hasStory) setViewingStory({ stories: group.stories, user: group.user }); }}
                >
                  <div className={`rounded-full overflow-hidden ${hasStory ? "story-ring" : ""}`} style={{ width: 72, height: 72 }}>
                    <div className="w-[64px] h-[64px] rounded-full overflow-hidden border-2 border-background">
                      {group.user?.image ? (
                        <img src={group.user.image} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-secondary flex items-center justify-center text-xs font-medium">
                          {group.user?.name?.[0]?.toUpperCase() || "U"}
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground truncate max-w-[44px] text-center leading-[1.2]">
                    {group.user?.name?.split(" ")[0] || "User"}
                  </span>
                  {group.stories?.[0]?.createdAt && (
                    <span className="text-[9px] text-muted-foreground/50">
                      {(() => { const diff = Date.now() - group.stories[0].createdAt; const m = Math.floor(diff / 60000); if (m < 60) return `${m}m ago`; const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`; const d = Math.floor(h / 24); return `${d}d ago`; })()}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {posts.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-full bg-secondary mx-auto mb-4 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="2" width="20" height="20" rx="4"/><circle cx="12" cy="12" r="4"/></svg>
            </div>
            <p className="text-sm text-muted-foreground">No posts in your feed yet.</p>
            <p className="text-xs text-muted-foreground mt-1 mb-6">Search for people to follow and see their posts here!</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => nav("/search")} className="h-10 px-5 bg-foreground text-background rounded-md text-sm font-medium hover:bg-foreground/90">Find people</button>
              <button onClick={() => nav("/create")} className="h-10 px-5 border border-border rounded-md text-sm font-medium hover:bg-secondary">Create post</button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {posts.map((p: any) => (
              <div
                key={p._id}
                ref={(el) => setPostRef(el, p._id)}
                data-post-id={p._id}
                className="border border-border rounded-sm overflow-hidden"
              >
                <div className="flex items-center gap-3 p-3">
                  <UserAvatar user={p.user} className="w-8 h-8 text-xs" onClick={() => nav(`/profile/${p.userId}`)} />
                  <span className="text-sm font-semibold cursor-pointer hover:underline" onClick={() => nav(`/profile/${p.userId}`)}>{p.user?.name || "User"}</span>
                  {p.user?.username && <span className="text-xs text-muted-foreground ml-1.5">{p.user.username}</span>}
                </div>
                {p.imageUrl && <img src={p.imageUrl} alt="" className="w-full object-cover max-h-[500px]" onError={e => (e.target as HTMLImageElement).style.display="none"} />}
                <div className="p-3 space-y-1">
                  {/* Action buttons */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {/* Like */}
                      <button onClick={() => handleLike(p._id, optimisticLikes[p._id]?.liked ?? p.isLiked, optimisticLikes[p._id]?.count ?? p.likesCount)} className="hover:opacity-60 transition-opacity" title="Like">
                        <svg viewBox="0 0 24 24" className="w-6 h-6" fill={optimisticLikes[p._id]?.liked ?? p.isLiked ? "#ff3040" : "none"} stroke={optimisticLikes[p._id]?.liked ?? p.isLiked ? "#ff3040" : "currentColor"} strokeWidth="1.5">
                          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                        </svg>
                      </button>
                      {/* Comment */}
                      <button onClick={() => setCommentPostId(p._id)} className="hover:opacity-60 transition-opacity" title="Comment">
                        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                        </svg>
                      </button>
                      {/* Share */}
                      <button onClick={() => { if (navigator.share) { navigator.share({ title: p.caption || "Check this out", url: window.location.href }); } else { navigator.clipboard?.writeText(window.location.href); } }} className="hover:opacity-60 transition-opacity" title="Share">
                        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M22 4L8 10.5M22 4l-6 16-4-6.5M22 4L5.5 13"/>
                        </svg>
                      </button>
                    </div>
                    {/* Save */}
                    <button onClick={() => handleSave(p._id, optimisticSaves[p._id] ?? p.isSaved)} className="hover:opacity-60 transition-opacity" title="Save">
                      <svg viewBox="0 0 24 24" className="w-6 h-6" fill={optimisticSaves[p._id] ?? p.isSaved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5">
                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                      </svg>
                    </button>
                  </div>
                  {/* Like count */}
                  <p className="text-sm font-semibold pt-1">{(optimisticLikes[p._id]?.count ?? p.likesCount ?? 0).toLocaleString()} likes</p>
                  {/* Caption */}
                  {p.caption && <p className="text-sm"><span className="font-semibold mr-1.5">{p.user?.name || "User"}</span>{p.caption}</p>}
                  {/* View comments link */}
                  {(p.commentsCount ?? 0) > 0 && (
                    <button onClick={() => setCommentPostId(p._id)} className="text-xs text-muted-foreground hover:underline">
                      View all {p.commentsCount} comments
                    </button>
                  )}
                  {p.song && <PostSongPlayer song={p.song} isActive={p._id === activePostId} />}
                  {p.hashtags?.length > 0 && <div className="flex flex-wrap gap-1 pt-1">{p.hashtags.map((t: string) => <span key={t} className="text-xs text-muted-foreground">#{t}</span>)}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Comment Modal */}
      {commentPostId && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center" onClick={() => { setCommentPostId(null); setCommentText(""); }}>
          <div className="bg-background w-full max-w-md rounded-t-xl sm:rounded-xl max-h-[70vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="font-semibold text-sm">Comments</h3>
              <button onClick={() => { setCommentPostId(null); setCommentText(""); }} className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-secondary text-muted-foreground">
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
            <div className="overflow-y-auto flex-1 divide-y divide-border">
              {!comments || comments.length === 0 ? (
                <div className="px-4 py-12 text-center">
                  <p className="text-sm text-muted-foreground">No comments yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Be the first to comment!</p>
                </div>
              ) : (
                comments.map((c: any) => (
                  <div key={c._id} className="flex items-start gap-3 px-4 py-3">
                    <UserAvatar user={c.user} className="w-8 h-8 text-xs cursor-pointer" onClick={() => { setCommentPostId(null); nav(`/profile/${c.userId}`); }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-semibold cursor-pointer hover:underline mr-1.5" onClick={() => { setCommentPostId(null); nav(`/profile/${c.userId}`); }}>{c.user?.name || "User"}</span>
                        {c.content}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(c.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="border-t border-border px-4 py-3">
              <form onSubmit={(e) => { e.preventDefault(); handleAddComment(commentPostId); }} className="flex items-center gap-2">
                <input
                  type="text"
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 h-10 px-3 text-sm bg-secondary rounded-full outline-none focus:ring-1 focus:ring-ring"
                />
                <button
                  type="submit"
                  disabled={!commentText.trim()}
                  className="h-9 px-4 rounded-full text-xs font-semibold bg-[#0095F6] text-white hover:bg-[#1877F2] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Post
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Story Viewer Overlay */}
      {viewingStory && (
        <StoryViewer
          storyGroup={viewingStory as any}
          onClose={() => setViewingStory(null)}
          onNext={() => setViewingStory(null)}
          onPrev={() => setViewingStory(null)}
          currentUserId={auth.user?._id}
        />
      )}

      <div className="h-20" />
      <BottomNav current="home" />
    </div>
  );
}

/* ---- CHAT ---- */
function ChatPage() {
  const { userId } = useParams<{ userId: string }>();
  const nav = useNavigate();
  
  const auth = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const otherUser = useQuery(api.users.getUserById, { userId: userId as any });
  const messages = useQuery(api.messages.getMessages, { otherUserId: userId as any, limit: 50, supabaseId: auth.supabaseId ?? undefined });
  const sendMsg = useMutation(api.messages.sendMessage);
  const markAsRead = useMutation(api.messages.markAsRead);

  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  // Mark unread messages as read when the chat opens
  const markedRead = useRef(false);
  useEffect(() => {
    if (!messages || !auth.user || markedRead.current) return;
    const unreadIds = messages
      .filter((m: any) => m.senderId === userId && !m.readAt)
      .map((m: any) => m._id);
    if (unreadIds.length > 0) {
      markedRead.current = true;
      markAsRead({ messageIds: unreadIds });
    }
  }, [messages, auth.user, userId, markAsRead]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !userId || sending) return;
    setSending(true);
    try {
      await sendMsg({ receiverId: userId as any, content: text.trim(), supabaseId: auth.supabaseId ?? undefined });
      setText("");
      setTimeout(scrollToBottom, 50);
    } catch (err) { console.error(err); }
    finally { setSending(false); }
  };

  if (!auth.user && !auth.isLoading) return <Navigate to="/auth?returnTo=/chat" replace />;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => nav("/messages")} className="text-sm text-muted-foreground">&larr;</button>
          <div className="w-8 h-8 rounded-full flex-shrink-0 overflow-hidden">
            <UserAvatar user={otherUser} className="w-8 h-8 text-xs" onClick={() => nav(`/profile/${userId}`)} />
          </div>
          <div className="min-w-0 cursor-pointer" onClick={() => nav(`/profile/${userId}`)}>
            <p className="text-sm font-semibold truncate">{otherUser?.name || "User"}</p>
            {otherUser?.username && <p className="text-[10px] text-muted-foreground truncate">{otherUser.username}</p>}
          </div>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto px-4 py-4 max-w-xl mx-auto w-full">
        {!messages || messages.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-full bg-secondary mx-auto mb-3 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-7 h-7 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20 12.5a8.5 8.5 0 1 0-16 0 8.5 8.5 0 0 0 4.8 7.65L12 22l3.2-1.85A8.5 8.5 0 0 0 20 12.5Z"/></svg>
            </div>
            <p className="text-sm text-muted-foreground">No messages yet</p>
            <p className="text-xs text-muted-foreground mt-1">Say hello to start the conversation!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {messages.map((m: any) => {
              const isMine = m.senderId === auth.user?._id;
              return (
                <div key={m._id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] px-3.5 py-2 rounded-2xl text-sm ${
                    isMine ? "bg-foreground text-background rounded-br-md" : "bg-secondary text-foreground rounded-bl-md"
                  }`}>
                    <p className="break-words">{m.content}</p>
                    <p className={`text-[10px] mt-0.5 ${isMine ? "text-background/60" : "text-muted-foreground"}`}>
                      {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      {m.readAt && isMine && <span className="ml-1">✓✓</span>}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      <div className="border-t border-border bg-background">
        <div className="max-w-xl mx-auto px-4 py-3">
          <form onSubmit={handleSend} className="flex items-center gap-2">
            <input type="text" value={text} onChange={e => setText(e.target.value)} placeholder="Message..." className="flex-1 h-10 px-4 text-sm bg-secondary rounded-full outline-none focus:ring-1 focus:ring-ring" />
            <button type="submit" disabled={!text.trim() || sending} className="h-10 w-10 flex items-center justify-center rounded-full bg-foreground text-background hover:bg-foreground/90 disabled:opacity-30 disabled:cursor-not-allowed">
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor"><path d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z"/></svg>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ---- MESSAGES ---- */
function MessagesPage() {
  const nav = useNavigate();
  
  const auth = useAuth();
  const conversations = useQuery(api.messages.getConversations, { supabaseId: auth.supabaseId ?? undefined });

  if (!auth.user && !auth.isLoading) return <Navigate to="/auth?returnTo=/messages" replace />;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-xl mx-auto px-4 h-14 flex items-center justify-between">
          <button onClick={() => nav(-1)} className="text-sm text-muted-foreground">&larr;</button>
          <span className="font-semibold text-sm">{auth.user?.name || "Messages"}</span>
          <div className="flex items-center gap-2">
            <FollowRequestBell supabaseId={auth.supabaseId} />
            <button onClick={() => nav("/search")} className="text-sm text-muted-foreground">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="7.5"/><path d="m16.5 16.5 4.5 4.5"/></svg>
            </button>
          </div>
        </div>
      </header>
      <div className="max-w-xl mx-auto px-4 pt-4">
        {(!conversations || conversations.length === 0) ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-full bg-secondary mx-auto mb-4 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20 12.5a8.5 8.5 0 1 0-16 0 8.5 8.5 0 0 0 4.8 7.65L12 22l3.2-1.85A8.5 8.5 0 0 0 20 12.5Z"/></svg>
            </div>
            <p className="text-sm font-medium">No messages yet</p>
            <p className="text-xs text-muted-foreground mt-1 mb-6">Search for someone to message.</p>
            <button onClick={() => nav("/search")} className="h-9 px-4 bg-foreground text-background rounded-md text-xs font-medium hover:bg-foreground/90">Find people</button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {conversations.map((c: any) => {
              const other = c.otherUser;
              const otherId = c.participantIds?.find((id: string) => id !== auth.user?._id);
              return (
                <div key={c._id} onClick={() => otherId && nav(`/chat/${otherId}`)} className="flex items-center gap-3 py-3 px-2 hover:bg-secondary rounded-md cursor-pointer transition-colors">
                  <UserAvatar user={other} className="w-12 h-12 text-sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold truncate">{other?.name || "Unknown User"}</p>
                      {c.lastMessageAt && <span className="text-[10px] text-muted-foreground flex-shrink-0 ml-2">{new Date(c.lastMessageAt).toLocaleDateString([], { month: "short", day: "numeric" })}</span>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{c.lastSenderId === auth.user?._id ? "You: " : ""}{c.lastMessageContent || "No messages yet"}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---- EXPLORE ---- */
function ExplorePage() {
  const auth = useAuth();
  const nav = useNavigate();
  
  const explore = useQuery(api.search.explorePosts, { limit: 30, supabaseId: auth.supabaseId ?? undefined });
  const posts = explore ?? [];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-xl mx-auto px-4 h-14 flex items-center justify-between">
          <button onClick={() => nav(-1)} className="text-sm text-muted-foreground">&larr;</button>
          <span className="font-semibold text-sm">Explore</span>
          <FollowRequestBell supabaseId={auth.supabaseId} />
        </div>
      </header>
      <div className="max-w-xl mx-auto px-4 pt-6 pb-24">
        <h1 className="text-lg font-bold mb-4">Trending</h1>
        <div className="grid grid-cols-3 gap-1">
          {posts.map((p: any) => (
            <div key={p._id} className="aspect-square bg-secondary rounded-sm overflow-hidden cursor-pointer" onClick={() => nav("/feed")}>
              {p.imageUrl && <img src={p.imageUrl} alt="" className="w-full h-full object-cover" onError={e => (e.target as HTMLImageElement).style.display="none"} />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---- REELS ---- */
function ReelsPage() {
  const auth = useAuth();
  const nav = useNavigate();
  
  const reels = useQuery(api.posts.listReels, { limit: 10, supabaseId: auth.supabaseId ?? undefined });

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-xl mx-auto px-4 h-14 flex items-center justify-between">
          <button onClick={() => nav(-1)} className="text-sm text-muted-foreground">&larr;</button>
          <span className="font-semibold text-sm">Reels</span>
          <div className="w-8" />
        </div>
      </header>
      <div className="max-w-xl mx-auto px-4 pt-6 pb-24">
        {(!reels || reels.length === 0) ? <p className="text-sm text-muted-foreground text-center py-12">No reels yet. Create one!</p> : (
          <div className="space-y-4">
            {reels.map((r: any) => (
              <div key={r._id} className="aspect-[9/16] bg-secondary rounded-md overflow-hidden relative">
                {r.imageUrl && <img src={r.imageUrl} alt="" className="w-full h-full object-cover" />}
                <div className="absolute bottom-4 left-4 text-white"><p className="font-semibold text-sm">{r.user?.name || "User"}</p><p className="text-xs">{r.caption}</p></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---- NOTIFICATIONS (with follow request accept/decline) ---- */
function NotificationsPage() {
  const nav = useNavigate();
  const auth = useAuth();
  const notifs = useQuery(api.notifications.getNotifications, { limit: 30, supabaseId: auth.supabaseId ?? undefined });
  const pendingReqs = useQuery(api.follows.getPendingFollowRequests, { supabaseId: auth.supabaseId ?? undefined });
  const acceptReq = useMutation(api.follows.acceptFollowRequest);
  const rejectReq = useMutation(api.follows.rejectFollowRequest);
  const markAsRead = useMutation(api.notifications.markNotificationsAsRead);

  useEffect(() => {
    markAsRead({ supabaseId: auth.supabaseId ?? undefined });
  }, [markAsRead, auth.supabaseId]);

  const doConfirm = async (followerId: string) => {
    try {
      await acceptReq({ followerId: followerId as any, supabaseId: auth.supabaseId ?? undefined });
    } catch (e) { console.error("Confirm error:", e); }
  };

  const doDelete = async (followerId: string) => {
    try {
      await rejectReq({ followerId: followerId as any, supabaseId: auth.supabaseId ?? undefined });
    } catch (e) { console.error("Delete error:", e); }
  };

  if (!auth.user && !auth.isLoading) return <Navigate to="/auth?returnTo=/notifications" replace />;

  // Follow requests come from getPendingFollowRequests (auto-removes when resolved)
  // Regular notifications come from getNotifications (excludes follow_request type)
  const followRequests = pendingReqs ?? [];
  const otherNotifs = notifs ?? [];

  return (
    <div className="min-h-screen bg-background pb-16">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-xl mx-auto px-4 h-14 flex items-center justify-between">
          <button onClick={() => nav(-1)} className="text-sm text-muted-foreground">&larr;</button>
          <span className="font-semibold text-sm">Notifications</span>
          <div className="w-8" />
        </div>
      </header>
      <div className="max-w-xl mx-auto px-4 pt-4">
        {/* Follow Requests Section — from getPendingFollowRequests */}
        {followRequests.length > 0 && (
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Follow Requests</h3>
            <div className="divide-y divide-border rounded-md border border-border">
              {followRequests.map((req: any) => (
                <div key={req._id} className="flex items-center gap-3 px-3 py-3">
                  <UserAvatar user={req.follower} className="w-10 h-10 text-sm cursor-pointer" onClick={() => req.followerId && nav(`/profile/${req.followerId}`)} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold cursor-pointer hover:underline truncate" onClick={() => req.followerId && nav(`/profile/${req.followerId}`)}>
                      {req.follower?.name || "Someone"}
                    </p>
                    <p className="text-xs text-muted-foreground">wants to follow you</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => doConfirm(req.followerId)}
                      className="h-8 px-4 rounded-md text-xs font-semibold bg-[#0095F6] text-white hover:bg-[#1877F2] transition-colors">
                      Confirm
                    </button>
                    <button onClick={() => doDelete(req.followerId)}
                      className="h-8 px-4 rounded-md text-xs font-semibold border border-border text-foreground hover:bg-secondary transition-colors">
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Regular Notifications — excludes follow_request type */}
        {otherNotifs.length === 0 && followRequests.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-full bg-secondary mx-auto mb-3 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-7 h-7 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            </div>
            <p className="text-sm text-muted-foreground">No notifications yet</p>
            <p className="text-xs text-muted-foreground mt-1">When someone likes, comments, or follows you, it shows up here.</p>
          </div>
        ) : otherNotifs.length > 0 ? (
          <div>
            {followRequests.length > 0 && <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Recent Activity</h3>}
            <div className="divide-y divide-border">
              {otherNotifs.map((n: any) => {
                const fromName = n.fromUser?.name || "Someone";
                return (
                  <div key={n._id} className="flex items-start gap-3 py-3 px-1">
                    <UserAvatar user={n.fromUser} className="w-10 h-10 text-sm cursor-pointer" onClick={() => n.fromUserId && nav(`/profile/${n.fromUserId}`)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-semibold cursor-pointer hover:underline" onClick={() => n.fromUserId && nav(`/profile/${n.fromUserId}`)}>{fromName}</span>{" "}
                        {n.type === "like" ? "liked your post" :
                         n.type === "comment" ? "commented on your post" :
                         n.type === "follow" ? "started following you" :
                         n.type === "message" ? "sent you a message" :
                         "interacted with you"}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{new Date(n.createdAt).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                    </div>
                    {!n.read && <span className="w-2 h-2 rounded-full bg-[#0095F6] flex-shrink-0 mt-2" />}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ---- SETTINGS (with profile picture, name, bio, private toggle) ---- */
function SettingsPage() {
  const nav = useNavigate();
  const auth = useAuth();
  
  const update = useMutation(api.users.updateProfile);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const initialized = useRef(false);

  const [username, setUsername] = useState("");
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);

  // Username availability check
  const rawUsername = username.trim().toLowerCase();
  const shouldCheck = rawUsername.length >= 1 && rawUsername.length <= 30 && rawUsername !== auth.user?.username?.toLowerCase();
  const usernameCheck = useQuery(
    api.users.checkUsername,
    shouldCheck ? { username: rawUsername } : "skip",
  );

  useEffect(() => {
    if (!shouldCheck) {
      setUsernameAvailable(null);
      setCheckingUsername(false);
      return;
    }
    if (usernameCheck !== undefined) {
      setUsernameAvailable(usernameCheck.available);
      setCheckingUsername(false);
    }
  }, [rawUsername, usernameCheck, shouldCheck]);

  const handleUsernameChange = (val: string) => {
    const cleaned = val.toLowerCase().replace(/[^a-z0-9_.]/g, "");
    if (cleaned.length > 30) return;
    setUsername(cleaned);
    setCheckingUsername(true);
    setUsernameAvailable(null);
  };
  // Initialize from auth.user ONLY ONCE
  if (auth.user && !initialized.current) {
    initialized.current = true;
    setName(auth.user.name || "");
    setBio(auth.user.bio || "");
    setUsername(auth.user.username || "");
    setIsPrivate(auth.user.isPrivate || false);
    setImage(auth.user.image || null);
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Resize image client-side to keep data URL small (Convex has ~1MB arg limit)
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const MAX_SIZE = 300;
        let w = img.width, h = img.height;
        if (w > MAX_SIZE || h > MAX_SIZE) {
          const ratio = Math.min(MAX_SIZE / w, MAX_SIZE / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, w, h);
        setImage(canvas.toDataURL("image/jpeg", 0.7));
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      await update({ name: name || undefined, username: username || undefined, bio: bio || undefined, isPrivate, image: image || undefined, supabaseId: auth.supabaseId ?? undefined });
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  if (!auth.user && !auth.isLoading) return <Navigate to="/auth?returnTo=/settings" replace />;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-xl mx-auto px-4 h-14 flex items-center justify-between">
          <button onClick={() => nav(-1)} className="text-sm text-muted-foreground">&larr;</button>
          <span className="font-semibold text-sm">Edit profile</span>
          <button onClick={saveProfile} disabled={saving} className="text-sm font-semibold text-[#0095F6]">{saving ? "..." : "Save"}</button>
        </div>
      </header>
      <div className="max-w-xl mx-auto px-4 pt-8 space-y-6">
        {/* Profile Picture */}
        <div className="flex flex-col items-center gap-3 pb-4 border-b border-border">
          <div className="relative cursor-pointer group" onClick={() => fileInputRef.current?.click()}>
            <UserAvatar user={image ? { ...auth.user, image } : auth.user} className="w-24 h-24 text-3xl" />
            <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileSelect}
          />
          <button onClick={() => fileInputRef.current?.click()} className="text-sm font-semibold text-[#0095F6]">
            Change profile photo
          </button>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Name</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full h-10 px-3 text-sm bg-secondary rounded-md outline-none focus:ring-1 focus:ring-ring" />
        </div>
        <div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Username</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">@</span>
            <input type="text" value={username} onChange={e => handleUsernameChange(e.target.value)} placeholder="username" className="w-full h-10 pl-7 pr-8 text-sm bg-secondary rounded-md outline-none focus:ring-1 focus:ring-ring" />
            {username && username.length >= 1 && username !== auth.user?.username && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {checkingUsername ? (
                  <svg className="h-3.5 w-3.5 animate-spin text-muted-foreground" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-30" /><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
                ) : usernameAvailable === true ? (
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-green-500" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                ) : usernameAvailable === false ? (
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-red-500" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                ) : null}
              </div>
            )}
          </div>
          {username !== auth.user?.username && username.length >= 1 && usernameAvailable === false && (
            <p className="text-[10px] text-red-500 mt-0.5">Username not available</p>
          )}
          {username !== auth.user?.username && username.length >= 1 && usernameAvailable === true && (
            <p className="text-[10px] text-green-600 mt-0.5">Username available!</p>
          )}
          {username === auth.user?.username && (
            <p className="text-[10px] text-muted-foreground mt-0.5">Current username</p>
          )}
        </div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Bio</label>
          <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Tell people about yourself" rows={3} className="w-full px-3 py-2 text-sm bg-secondary rounded-md outline-none focus:ring-1 focus:ring-ring resize-none" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Email</label>
          <p className="text-sm text-muted-foreground px-1">{auth.user?.email}</p>
        </div>
        <div className="pt-2 border-t border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Private account</p>
              <p className="text-xs text-muted-foreground mt-0.5">People need to send a follow request to see your posts.</p>
            </div>
            <label className="relative cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} />
              <div className="w-11 h-6 bg-border rounded-full peer peer-checked:bg-foreground transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-5 after:h-5 after:rounded-full after:bg-background after:shadow-sm after:transition-all peer-checked:after:translate-x-5" />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---- ADMIN ---- */
function AdminPage() {
  const nav = useNavigate();
  const stats = useQuery(api.admin.getStats, {});
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-xl mx-auto px-4 h-14 flex items-center justify-between">
          <button onClick={() => nav(-1)} className="text-sm text-muted-foreground">&larr;</button>
          <span className="font-semibold text-sm">Admin</span><div className="w-8" />
        </div>
      </header>
      <div className="max-w-xl mx-auto px-4 pt-8">
        <h1 className="text-lg font-bold mb-6">Dashboard</h1>
        {stats ? (
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 border border-border rounded-md"><p className="text-2xl font-bold">{stats.totalUsers ?? 0}</p><p className="text-xs text-muted-foreground">Users</p></div>
            <div className="p-4 border border-border rounded-md"><p className="text-2xl font-bold">{stats.totalPosts ?? 0}</p><p className="text-xs text-muted-foreground">Posts</p></div>
          </div>
        ) : <p className="text-sm text-muted-foreground">Loading stats...</p>}
      </div>
    </div>
  );
}

/* ---- STORIES ---- */
function StoriesPage() {
  const auth = useAuth();
  const nav = useNavigate();
  
  const stories = useQuery(api.stories.getActiveStories, { supabaseId: auth.supabaseId ?? undefined });
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-xl mx-auto px-4 h-14 flex items-center justify-between">
          <button onClick={() => nav(-1)} className="text-sm text-muted-foreground">&larr;</button>
          <span className="font-semibold text-sm">Stories</span><div className="w-8" />
        </div>
      </header>
      <div className="max-w-xl mx-auto px-4 pt-6">
        {(!stories || stories.length === 0) ? <p className="text-sm text-muted-foreground text-center py-12">No active stories</p> : (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {stories.map((s: any) => (
              <div key={s._id} className="flex flex-col items-center gap-1 flex-shrink-0">
                <div className="w-16 h-16 rounded-full bg-secondary overflow-hidden ring-2 ring-foreground p-[2px]">
                  <div className="w-full h-full rounded-full bg-secondary overflow-hidden">{s.imageUrl && <img src={s.imageUrl} alt="" className="w-full h-full object-cover" />}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---- APP ---- */
/* ---- RootRedirect ---- */
function RootRedirect() {
  const nav = useNavigate();
  const auth = useAuth();

  // Direct localStorage check for Supabase session token (instant, no async)
  const hasLocalSession = (() => {
    try {
      const sbKey = Object.keys(localStorage).find(k => k.startsWith("sb-") && k.endsWith("-auth-token"));
      if (sbKey) {
        const raw = localStorage.getItem(sbKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.access_token) return true;
        }
      }
    } catch {}
    return false;
  })();

  // Redirect to feed if we found a session flag or token
  useEffect(() => {
    if (hasLocalSession && !auth.isAuthenticated && !auth.isLoading) {
      // Token in localStorage but auth hook doesn't see it - force page reload
      window.location.reload();
      return;
    }
    if (!auth.isLoading && auth.isAuthenticated) {
      localStorage.setItem("engage_logged_in", "true");
      nav("/feed", { replace: true });
    }
  }, [auth.isLoading, auth.isAuthenticated, nav, hasLocalSession]);

  if (hasLocalSession) {
    return <Navigate to="/feed" replace />;
  }

  if (auth.isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-sm text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (auth.isAuthenticated) {
    return <Navigate to="/feed" replace />;
  }

  return <LandingPage />;
}

function App() {
  if (!hasConvex) {
    return (
      <StrictMode>
        <BrowserRouter>
          <Routes>
            <Route path="*" element={<LandingPage />} />
          </Routes>
        </BrowserRouter>
      </StrictMode>
    );
  }
  return (
    <StrictMode>
      <ConvexProvider client={convex!}>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/feed" element={<FeedPage />} />
            <Route path="/create" element={<CreatePostPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/profile/:userId" element={<ProfilePage />} />
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/messages" element={<MessagesPage />} />
            <Route path="/chat/:userId" element={<ChatPage />} />
            <Route path="/reels" element={<ReelsPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/stories" element={<StoriesPage />} />
            <Route path="*" element={<LandingPage />} />
          </Routes>
        </BrowserRouter>
      </ConvexProvider>
    </StrictMode>
  );
}

createRoot(document.getElementById("root")!).render(<ErrorBoundary><App /></ErrorBoundary>);
