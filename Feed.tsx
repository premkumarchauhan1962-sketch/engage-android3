import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { PostCard } from "@/components/PostCard";
import { StoriesBar } from "@/components/StoriesBar";
import { BottomNav } from "@/components/BottomNav";
import { useNavigate } from "react-router";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogoDropdown } from "@/components/LogoDropdown";
import { FollowRequestBell } from "@/components/FollowRequestBell";
import {
  MessageCircle, Plus, Loader2, Camera, Image, Link,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export default function Feed() {
  const { user, supabaseId } = useAuth();
  const navigate = useNavigate();
  const feedData = useQuery(api.posts.getFeedPosts, { limit: 10, supabaseId: supabaseId ?? undefined });
  const suggestedUsers = useQuery(api.follows.getSuggestedUsers, { limit: 5, supabaseId: supabaseId ?? undefined });
  const createStory = useMutation(api.stories.createStory);

  const posts = feedData?.posts ?? [];
  const [storyModalOpen, setStoryModalOpen] = useState(false);
  const [storyUrl, setStoryUrl] = useState("");
  const [storyCreating, setStoryCreating] = useState(false);
  const [storyError, setStoryError] = useState("");

  const handleCreateStory = async () => {
    if (!storyUrl.trim()) return;
    setStoryCreating(true);
    setStoryError("");
    try {
      await createStory({ imageUrl: storyUrl.trim(), supabaseId: supabaseId ?? undefined });
      setStoryModalOpen(false);
      setStoryUrl("");
    } catch (err: any) {
      setStoryError(err.message || "Failed to create story");
    } finally {
      setStoryCreating(false);
    }
  };

  const demoStoryImages = [
    "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=400",
    "https://images.unsplash.com/photo-1470071459604-7b8ec44ffd4e?w=400",
    "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400",
    "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=400",
  ];

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      {/* Top Navigation */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LogoDropdown />
            <span className="text-lg font-semibold tracking-tight">Engage</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate("/create")}>
              <Plus className="h-5 w-5" />
            </Button>
            <FollowRequestBell />
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate("/messages")}>
              <MessageCircle className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4">
        <div className="flex gap-8">
          {/* Main Feed */}
          <div className="flex-1 max-w-[600px] mx-auto md:mx-0">
            {/* Stories */}
            <div className="border-b border-border mb-6">
              <StoriesBar onCreateStory={() => setStoryModalOpen(true)} />
            </div>

            {/* Posts */}
            {posts.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-16 h-16 rounded-full bg-secondary mx-auto mb-4 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="2" y="2" width="20" height="20" rx="4" />
                    <circle cx="12" cy="12" r="4" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold mb-2">No posts yet</h2>
                <p className="text-sm text-muted-foreground mb-6">
                  Follow users to see their posts in your feed.
                </p>
                <Button onClick={() => navigate("/explore")} className="bg-foreground text-background hover:bg-foreground/90 rounded-md">
                  Explore content
                </Button>
              </div>
            ) : (
              <div className="pt-4">
                {posts.map((post: any) => (
                  <PostCard key={post._id} post={post} />
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="hidden lg:block w-[320px] flex-shrink-0 pt-8">
            {/* Current User */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/profile")}>
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user?.image} />
                  <AvatarFallback className="text-xs">{user?.name?.slice(0, 2).toUpperCase() || "U"}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-semibold">{user?.name || "Anonymous"}</p>
                  <p className="text-xs text-muted-foreground">{user?.username || ""}</p>
                </div>
              </div>
              <Button variant="ghost" className="text-xs font-semibold text-foreground h-auto p-0" onClick={() => navigate("/profile")}>
                Switch
              </Button>
            </div>

            {/* Suggested Users */}
            {suggestedUsers && suggestedUsers.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-muted-foreground font-semibold">Suggestions for you</span>
                </div>
                <div className="space-y-3">
                  {suggestedUsers.map((suggested: any) => (
                    <div key={suggested._id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate(`/profile/${suggested._id}`)}>
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={suggested.image} />
                          <AvatarFallback className="text-[10px]">{suggested.name?.slice(0, 2).toUpperCase() || "U"}</AvatarFallback>
                        </Avatar>
                        <div className="text-sm">
                          <p className="font-semibold">{suggested.name}</p>
                          <p className="text-xs text-muted-foreground">{suggested.username || ""}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer Links */}
            <div className="text-xs text-muted-foreground space-y-1">
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                <span className="hover:underline cursor-pointer">About</span>
                <span className="hover:underline cursor-pointer">Help</span>
                <span className="hover:underline cursor-pointer">Press</span>
                <span className="hover:underline cursor-pointer">Privacy</span>
                <span className="hover:underline cursor-pointer">Terms</span>
              </div>
              <p className="mt-4">© 2026 Engage</p>
            </div>
          </aside>
        </div>
      </div>

      {/* Story Creation Dialog */}
      <Dialog open={storyModalOpen} onOpenChange={setStoryModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" /> Create Story
            </DialogTitle>
            <DialogDescription>
              Add a photo to your story. It will disappear after 24 hours.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Image URL</label>
              <div className="relative flex-1">
                <Link className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input type="url" value={storyUrl} onChange={(e) => setStoryUrl(e.target.value)}
                  placeholder="https://example.com/photo.jpg"
                  className="w-full h-10 pl-9 pr-3 text-sm bg-secondary rounded-md border-none outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Quick pick</label>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {demoStoryImages.map((url, i) => (
                  <button key={i} onClick={() => setStoryUrl(url)}
                    className={`flex-shrink-0 w-16 h-24 rounded-lg overflow-hidden border-2 transition-all ${storyUrl === url ? "border-foreground scale-105" : "border-transparent opacity-70 hover:opacity-100"}`}>
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
            {storyUrl && (
              <div className="rounded-lg overflow-hidden bg-muted aspect-[9/16] max-h-[300px]">
                <img src={storyUrl} alt="Story preview" className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).classList.add("hidden"); }} />
              </div>
            )}
            {storyError && <p className="text-xs text-destructive">{storyError}</p>}
            <Button onClick={handleCreateStory} disabled={!storyUrl.trim() || storyCreating}
              className="w-full bg-foreground text-background hover:bg-foreground/90 rounded-md">
              {storyCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Image className="h-4 w-4 mr-2" /> Add to Story</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}
