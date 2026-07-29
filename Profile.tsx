import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/BottomNav";
import { LogoDropdown } from "@/components/LogoDropdown";
import { FollowRequestBell } from "@/components/FollowRequestBell";
import { Settings, Grid, Bookmark, UserCheck, UserPlus, LogOut, ArrowLeft, Plus } from "lucide-react";
import { Doc } from "@/convex/_generated/dataModel";
import { useNavigate as useRouterNavigate } from "react-router";

export default function Profile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser, signOut, supabaseId } = useAuth();
  const [activeTab, setActiveTab] = useState<"posts" | "saved">("posts");
  const [listType, setListType] = useState<string | null>(null);
  const [followListStates, setFollowListStates] = useState<Record<string, string>>({});
  const [storyPreviewUrl, setStoryPreviewUrl] = useState<string | null>(null);
  const [storyIsVideo, setStoryIsVideo] = useState(false);
  const [storyVideoDuration, setStoryVideoDuration] = useState<number | null>(null);
  const [storyBusy, setStoryBusy] = useState(false);
  const [storyError, setStoryError] = useState<string | null>(null);
  const [storySong, setStorySong] = useState<{ name: string; artist?: string; audioUrl?: string; artwork?: string } | null>(null);
  const [showSongPicker, setShowSongPicker] = useState(false);
  const [songSearchQuery, setSongSearchQuery] = useState("");
  const [songSearchResults, setSongSearchResults] = useState<any[]>([]);
  const [songSearching, setSongSearching] = useState(false);
  const songSearchTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const storyCameraRef = useRef<HTMLInputElement>(null);
  const storyGalleryRef = useRef<HTMLInputElement>(null);
  const [showStoryPicker, setShowStoryPicker] = useState(false);
  const createStory = useMutation(api.stories.createStory);

  // iTunes search with debounce
  const searchSongs = useCallback((query: string) => {
    if (!query.trim()) { setSongSearchResults([]); setSongSearching(false); return; }
    setSongSearching(true);
    fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&limit=25&media=music`)
      .then(r => r.json())
      .then(data => {
        const results = (data.results || []).map((r: any) => ({
          name: r.trackName,
          artist: r.artistName,
          audioUrl: r.previewUrl,
          artwork: r.artworkUrl100?.replace('100x100', '300x300'),
        }));
        setSongSearchResults(results);
        setSongSearching(false);
      })
      .catch(() => { setSongSearchResults([]); setSongSearching(false); });
  }, []);

  useEffect(() => {
    if (songSearchQuery) {
      clearTimeout(songSearchTimeout.current);
      songSearchTimeout.current = setTimeout(() => searchSongs(songSearchQuery), 400);
    } else {
      setSongSearchResults([]);
    }
    return () => clearTimeout(songSearchTimeout.current);
  }, [songSearchQuery, searchSongs]);

  const profileUserId = (userId || currentUser?._id) as any;
  const profileUser = useQuery(api.users.getUserById, { userId: profileUserId });
  const followersCount = useQuery(api.follows.getFollowersCount, { userId: profileUserId });
  const followingCount = useQuery(api.follows.getFollowingCount, { userId: profileUserId });
  const followers = useQuery(api.follows.getFollowers, { userId: profileUserId });
  const following = useQuery(api.follows.getFollowing, { userId: profileUserId });
  const isFollowing = useQuery(api.follows.isFollowing, { followingId: profileUserId, supabaseId: supabaseId ?? undefined });
  const toggleFollowMut = useMutation(api.follows.toggleFollow);
  const posts = useQuery(api.posts.getPostsByUser, { userId: profileUserId, supabaseId: supabaseId ?? undefined });
  const savedPosts = useQuery(api.posts.getSavedPosts, { supabaseId: supabaseId ?? undefined });

  const compressImage = (dataUrl: string, maxSize = 800, quality = 0.7): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        let w = img.width, h = img.height;
        if (w > maxSize || h > maxSize) {
          const ratio = Math.min(maxSize / w, maxSize / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = dataUrl;
    });
  };

  const handleStoryFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStoryError(null);
    setStorySong(null);
    setShowSongPicker(false);

    const isVideo = file.type.startsWith("video/");
    setStoryIsVideo(isVideo);

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const raw = ev.target?.result as string;

      if (isVideo) {
        // For videos, get the duration from video metadata
        const video = document.createElement("video");
        video.preload = "metadata";
        video.onloadedmetadata = () => {
          setStoryVideoDuration(Math.round(video.duration * 1000)); // in ms
          video.remove();
        };
        video.onerror = () => {
          setStoryVideoDuration(null);
          video.remove();
        };
        video.src = raw;
        setStoryPreviewUrl(raw);
      } else {
        // Compress images
        setStoryVideoDuration(null);
        try {
          const compressed = await compressImage(raw, 600, 0.6);
          setStoryPreviewUrl(compressed);
        } catch {
          setStoryPreviewUrl(raw);
        }
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleUploadStory = async () => {
    if (!storyPreviewUrl) return;
    setStoryBusy(true);
    setStoryError(null);
    try {
      // Clean the song object to only include schema-allowed fields
      const cleanSong = storySong
        ? { name: storySong.name, artist: storySong.artist, audioUrl: storySong.audioUrl, artwork: storySong.artwork }
        : undefined;

      // Create story in Convex — pass imageUrl for photos, videoUrl for videos
      await createStory({
        imageUrl: storyIsVideo ? undefined : storyPreviewUrl,
        videoUrl: storyIsVideo ? storyPreviewUrl : undefined,
        duration: storyIsVideo ? storyVideoDuration ?? undefined : undefined,
        song: cleanSong,
        supabaseId: supabaseId ?? undefined,
      });

      // Reset state
      setStoryPreviewUrl(null);
      setStoryIsVideo(false);
      setStoryVideoDuration(null);
      setStorySong(null);
      setShowSongPicker(false);
      setSongSearchQuery("");
    } catch (e: any) {
      console.error("Story upload error:", e);
      setStoryError(e?.message || "Upload failed. Please try again.");
    }
    finally { setStoryBusy(false); }
  };

  const isOwnProfile = currentUser?._id === profileUserId;
  const displayPosts = activeTab === "posts" ? posts : savedPosts;

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handleFollow = async () => {
    await toggleFollowMut({ followingId: profileUserId, supabaseId: supabaseId ?? undefined });
  };

  if (!profileUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-sm text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const initials = profileUser.name?.slice(0, 2).toUpperCase() || "U";

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {!isOwnProfile ? (
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
            ) : (
              <LogoDropdown />
            )}
            <span className="font-semibold">{profileUser.username || profileUser.name || "Profile"}</span>
          </div>
          <div className="flex items-center gap-2">
            {isOwnProfile && (
              <>
                <FollowRequestBell />
                <Button
                  size="sm"
                  className="h-8 px-3 text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={() => navigate("/settings")}
                >
                  <Settings className="h-3.5 w-3.5" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  className="h-8 px-3 text-xs gap-1.5 bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/50"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign Out
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 pt-8">
        {/* Profile Info */}
        <div className="flex items-start gap-8 mb-8">
          <div className="relative w-20 h-20 md:w-24 md:h-24">
            <Avatar className="w-full h-full ring-2 ring-border">
              <AvatarImage src={profileUser.image} />
              <AvatarFallback className="text-lg">{initials}</AvatarFallback>
            </Avatar>
            {isOwnProfile && (
              <>
                <button
                  onClick={() => setShowStoryPicker(true)}
                  className="absolute -bottom-1 -right-1 w-7 h-7 md:w-8 md:h-8 rounded-full bg-[#0095F6] text-white flex items-center justify-center shadow-md hover:bg-[#1877F2] transition-colors border-2 border-background z-10"
                  title="Add story"
                >
                  <Plus className="w-4 h-4 md:w-5 md:h-5" />
                </button>
                {/* Hidden file inputs */}
                <input
                  ref={storyCameraRef}
                  type="file"
                  accept="image/*,video/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleStoryFileSelect}
                />
                <input
                  ref={storyGalleryRef}
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={handleStoryFileSelect}
                />
              </>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-4">
              <h1 className="text-xl font-semibold">{profileUser.name || "Anonymous"}</h1>
              {isOwnProfile ? (
                <Button
                  className="text-xs h-8 rounded-md px-4 bg-foreground text-background hover:bg-foreground/90"
                  onClick={() => navigate("/settings")}
                >
                  Edit profile
                </Button>
              ) : (
                <Button
                  onClick={handleFollow}
                  className={`text-xs h-8 rounded-md px-4 ${
                    isFollowing
                      ? "bg-secondary text-foreground hover:bg-secondary/80"
                      : "bg-foreground text-background hover:bg-foreground/90"
                  }`}
                >
                  {isFollowing ? (
                    <><UserCheck className="h-3.5 w-3.5 mr-1" /> Following</>
                  ) : (
                    <><UserPlus className="h-3.5 w-3.5 mr-1" /> Follow</>
                  )}
                </Button>
              )}
            </div>

            <div className="flex items-center gap-8 mb-4">
              <div className="text-center">
                <p className="font-semibold">{posts?.length ?? 0}</p>
                <p className="text-xs text-muted-foreground">posts</p>
              </div>
              <button onClick={() => setListType("followers")} className="text-center hover:opacity-70 transition-opacity cursor-pointer">
                <p className="font-semibold">{followersCount ?? 0}</p>
                <p className="text-xs text-muted-foreground">followers</p>
              </button>
              <button onClick={() => setListType("following")} className="text-center hover:opacity-70 transition-opacity cursor-pointer">
                <p className="font-semibold">{followingCount ?? 0}</p>
                <p className="text-xs text-muted-foreground">following</p>
              </button>
            </div>

            {profileUser.bio && (
              <p className="text-sm whitespace-pre-wrap">{profileUser.bio}</p>
            )}
            {profileUser.website && (
              <a
                href={profileUser.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold text-foreground hover:underline"
              >
                {profileUser.website}
              </a>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="border-t border-border">
          <div className="flex justify-center gap-16">
            <button
              onClick={() => setActiveTab("posts")}
              className={`flex items-center gap-1.5 py-3 text-xs font-semibold border-t-2 transition-colors ${
                activeTab === "posts"
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground"
              }`}
            >
              <Grid className="h-3 w-3" />
              POSTS
            </button>
            {isOwnProfile && (
              <button
                onClick={() => setActiveTab("saved")}
                className={`flex items-center gap-1.5 py-3 text-xs font-semibold border-t-2 transition-colors ${
                  activeTab === "saved"
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted-foreground"
                }`}
              >
                <Bookmark className="h-3 w-3" />
                SAVED
              </button>
            )}
          </div>
        </div>

        {/* Content Grid */}
        {displayPosts && displayPosts.length > 0 ? (
          <div className="grid grid-cols-3 gap-[2px] md:gap-1">
            {displayPosts.map((post: any) => (
              <div
                key={post._id}
                className="aspect-square bg-muted overflow-hidden cursor-pointer group relative"
                onClick={() => navigate(`/feed?post=${post._id}`)}
              >
                {post.imageUrl ? (
                  <img
                    src={post.imageUrl}
                    alt=""
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://placehold.co/400x400/e5e5e5/999?text=No+Image`;
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                    No image
                  </div>
                )}
                {/* Overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center gap-6">
                  <div className="hidden group-hover:flex items-center gap-1 text-white text-sm font-semibold">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white" fill="white"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                    {post.likesCount}
                  </div>
                  <div className="hidden group-hover:flex items-center gap-1 text-white text-sm font-semibold">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white" fill="white"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    {post.commentsCount}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-full bg-secondary mx-auto mb-4 flex items-center justify-center">
              <Grid className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-1">
              {activeTab === "posts" ? "No posts yet" : "No saved posts"}
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              {activeTab === "posts"
                ? isOwnProfile
                  ? "Share your first photo or video."
                  : "This user hasn't posted anything yet."
                : "Save posts to view them later."}
            </p>
            {isOwnProfile && activeTab === "posts" && (
              <Button
                onClick={() => navigate("/create")}
                variant="outline"
                className="rounded-md"
              >
                Create your first post
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Followers/Following List Modal */}
      {listType && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center" onClick={() => setListType(null)}>
          <div className="bg-background w-full max-w-md rounded-t-xl sm:rounded-xl max-h-[70vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="font-semibold text-sm capitalize">{listType}</h3>
              <button onClick={() => setListType(null)} className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-secondary text-muted-foreground">
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
            <div className="overflow-y-auto flex-1 divide-y divide-border">
              {(listType === "followers" ? (followers || []) : (following || [])).length === 0 ? (
                <div className="px-4 py-12 text-center">
                  <p className="text-sm text-muted-foreground">No {listType} yet</p>
                </div>
              ) : (
                (listType === "followers" ? (followers || []) : (following || [])).map((u: any) => {
                  const isMe = u._id === currentUser?._id;
                  const state = followListStates[u._id] || (listType === "followers" ? "none" : "following");
                  return (
                    <div key={u._id} className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors">
                      <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 cursor-pointer" onClick={() => { setListType(null); navigate(`/profile/${u._id}`); }}>
                        {u.image ? (
                          <img src={u.image} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-secondary flex items-center justify-center text-sm font-medium">{u.name?.[0]?.toUpperCase() || "U"}</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => { setListType(null); navigate(`/profile/${u._id}`); }}>
                        <p className="text-sm font-semibold truncate">{u.name || "User"}</p>
                        {u.username && <p className="text-[11px] text-muted-foreground truncate">{u.username}</p>}
                      </div>
                      {!isMe && (
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              const result = await toggleFollowMut({ followingId: u._id as any, supabaseId: supabaseId ?? undefined });
                              if (result.action === "following") setFollowListStates(p => ({ ...p, [u._id]: "following" }));
                              else if (result.action === "unfollowed" || result.action === "cancelled") setFollowListStates(p => ({ ...p, [u._id]: "none" }));
                              else if (result.action === "requested") setFollowListStates(p => ({ ...p, [u._id]: "requested" }));
                            } catch (e) { console.error(e); }
                          }}
                          className={`h-8 px-4 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${
                            state === "following"
                              ? "bg-secondary text-foreground border border-border hover:bg-destructive/10 hover:text-destructive"
                              : state === "requested"
                              ? "bg-secondary text-muted-foreground border border-border"
                              : "bg-foreground text-background hover:bg-foreground/90"
                          }`}
                        >
                          {state === "following" ? "Following" : state === "requested" ? "Requested" : "Follow"}
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Story Source Picker */}
      {showStoryPicker && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center" onClick={() => setShowStoryPicker(false)}>
          <div
            className="bg-background w-full max-w-sm rounded-t-xl sm:rounded-xl overflow-hidden shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 pt-4 pb-2 text-center border-b border-border">
              <p className="text-sm font-semibold">Add to story</p>
            </div>
            <button
              onClick={() => {
                setShowStoryPicker(false);
                setTimeout(() => storyCameraRef.current?.click(), 200);
              }}
              className="w-full px-6 py-4 flex items-center gap-4 hover:bg-secondary/50 transition-colors active:bg-secondary"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-yellow-400 to-pink-500 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold">Camera</p>
                <p className="text-[11px] text-muted-foreground">Take a photo or video</p>
              </div>
            </button>
            <button
              onClick={() => {
                setShowStoryPicker(false);
                setTimeout(() => storyGalleryRef.current?.click(), 200);
              }}
              className="w-full px-6 py-4 flex items-center gap-4 hover:bg-secondary/50 transition-colors active:bg-secondary"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold">Gallery</p>
                <p className="text-[11px] text-muted-foreground">Choose photos &amp; videos</p>
              </div>
            </button>
            <div className="px-6 py-3 border-t border-border">
              <button
                onClick={() => setShowStoryPicker(false)}
                className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Story Preview Modal */}
      {storyPreviewUrl && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center">
          <div className="relative max-w-lg w-full mx-4">
            {/* Photo with music icon overlay */}
            <div className="relative">
              {storyIsVideo ? (
                <video
                  src={storyPreviewUrl}
                  className="w-full rounded-lg max-h-[55vh] object-contain"
                  autoPlay
                  muted
                  loop
                  playsInline
                />
              ) : (
                <img src={storyPreviewUrl} alt="Story preview" className="w-full rounded-lg max-h-[55vh] object-contain" />
              )}
              {/* Music icon button on the photo */}
              <div className="absolute top-3 right-3">
                <div className="relative">
                  <button
                    onClick={() => setShowSongPicker(!showSongPicker)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all ${storySong ? "bg-[#0095F6] text-white scale-110" : "bg-black/50 text-white hover:bg-black/70"}`}
                    title={storySong ? `Song: ${storySong.name}` : "Add music"}
                  >
                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                      <path d="M9 18V5l12-2v13" />
                      <circle cx="6" cy="18" r="3" />
                      <circle cx="18" cy="16" r="3" />
                    </svg>
                  </button>
                  {storySong && (
                    <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap">
                      <span className="text-[10px] text-white/80 bg-black/40 px-2 py-0.5 rounded-full">{storySong.name}</span>
                    </div>
                  )}
                  {/* Song Picker Dropdown */}
                  {showSongPicker && (
                    <div className="absolute top-full mt-2 right-0 w-72 bg-popover text-popover-foreground rounded-lg border border-border shadow-xl z-50 max-h-80 overflow-hidden flex flex-col">
                      <div className="px-4 py-2.5 border-b border-border bg-popover">
                        <p className="text-xs font-semibold mb-1.5">Search iTunes songs</p>
                        <input
                          type="text"
                          value={songSearchQuery}
                          onChange={e => setSongSearchQuery(e.target.value)}
                          placeholder="Search for any song..."
                          className="w-full h-8 px-2 text-xs bg-secondary rounded-md outline-none focus:ring-1 focus:ring-ring"
                          autoFocus
                        />
                      </div>
                      <div className="flex-1 overflow-y-auto max-h-56">
                        {storySong && !songSearchQuery && (
                          <button
                            onClick={() => { setStorySong(null); setShowSongPicker(false); }}
                            className="w-full px-4 py-2.5 text-left text-xs text-red-400 hover:bg-secondary/50 border-b border-border flex items-center gap-2"
                          >
                            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            Remove current song
                          </button>
                        )}
                        {songSearching ? (
                          <div className="px-4 py-8 text-center">
                            <div className="w-5 h-5 border-2 border-muted-foreground/30 border-t-foreground rounded-full animate-spin mx-auto" />
                            <p className="text-[10px] text-muted-foreground mt-2">Searching...</p>
                          </div>
                        ) : songSearchResults.length > 0 ? (
                          songSearchResults.map((song: any, idx: number) => (
                            <button
                              key={idx}
                              onClick={() => { setStorySong(song); setShowSongPicker(false); }}
                              className={`w-full px-4 py-2.5 text-left hover:bg-secondary/50 transition-colors flex items-center gap-2.5 ${storySong?.name === song.name ? "bg-secondary" : ""}`}
                            >
                              {song.artwork && <img src={song.artwork} alt="" className="w-9 h-9 rounded object-cover flex-shrink-0" />}
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-medium truncate">{song.name}</p>
                                <p className="text-[10px] text-muted-foreground truncate">{song.artist}</p>
                              </div>
                              <svg viewBox="0 0 24 24" className="w-4 h-4 text-muted-foreground flex-shrink-0" fill="currentColor">
                                <path d="M9 18V5l12-2v13" />
                                <circle cx="6" cy="18" r="3" />
                                <circle cx="18" cy="16" r="3" />
                              </svg>
                            </button>
                          ))
                        ) : songSearchQuery ? (
                          <div className="px-4 py-8 text-center">
                            <p className="text-xs text-muted-foreground">No songs found</p>
                            <p className="text-[10px] text-muted-foreground mt-1">Try a different search</p>
                          </div>
                        ) : (
                          <div className="px-4 py-8 text-center">
                            <p className="text-xs text-muted-foreground">Search for any song from iTunes</p>
                            <p className="text-[10px] text-muted-foreground mt-1">Type to search the iTunes catalog</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {showSongPicker && (
                    <div className="fixed inset-0 z-[-1]" onClick={() => setShowSongPicker(false)} />
                  )}
                </div>
              </div>
            </div>
            {storyError && (
              <div className="mt-4 text-center">
                <p className="text-xs text-red-400 bg-red-400/10 rounded-md px-3 py-2 inline-block">{storyError}</p>
              </div>
            )}
            <div className="flex items-center justify-center gap-4 mt-6">
              <button
                onClick={handleUploadStory}
                disabled={storyBusy}
                className="h-12 px-10 rounded-full bg-[#0095F6] text-white text-sm font-semibold hover:bg-[#1877F2] transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {storyBusy ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-30" />
                      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                    Uploading...
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    Post to story
                  </>
                )}
              </button>
              <button
                onClick={() => { setStoryPreviewUrl(null); setStoryIsVideo(false); setStoryVideoDuration(null); setStorySong(null); setShowSongPicker(false); setSongSearchQuery(""); }}
                disabled={storyBusy}
                className="h-12 px-6 rounded-full bg-white/10 text-white/80 hover:bg-white/20 transition-colors text-sm disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
