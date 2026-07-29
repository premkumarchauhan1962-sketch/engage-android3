import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { BottomNav } from "@/components/BottomNav";
import { LogoDropdown } from "@/components/LogoDropdown";
import { FollowRequestBell } from "@/components/FollowRequestBell";
import { useNavigate } from "react-router";
import { Search } from "lucide-react";
import { useState } from "react";

export default function Explore() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const explorePosts = useQuery(api.search.explorePosts, { limit: 30 });

  // Filter locally if searching
  const filtered = explorePosts?.filter((p: Record<string, any>) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.caption?.toLowerCase().includes(q) ||
      p.user?.name?.toLowerCase().includes(q) ||
      p.hashtags?.some((h: string) => h.toLowerCase().includes(q))
    );
  });

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-4">
          <LogoDropdown />
          <div className="flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search captions, people, or tags..."
              className="w-full h-9 pl-9 pr-3 text-sm bg-secondary rounded-md border-none outline-none focus:ring-1 focus:ring-ring transition-shadow placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex items-center gap-2">
            <FollowRequestBell />
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 pt-6">
        {!filtered || filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-full bg-secondary mx-auto mb-4 flex items-center justify-center">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-1">Explore trending content</h3>
            <p className="text-sm text-muted-foreground">
              {searchQuery ? "No results found. Try a different search." : "Discover popular posts from the community."}
            </p>
          </div>
        ) : (
          <>
            <h2 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">
              {searchQuery ? "Search Results" : "Trending"}
            </h2>
            <div className="grid grid-cols-3 gap-[2px] md:gap-1">
              {filtered.map((post: Record<string, any>) => (
                <div
                  key={post._id}
                  className="aspect-square bg-muted overflow-hidden cursor-pointer group relative"
                  onClick={() => navigate(`/profile/${post.userId}`)}
                >
                  {post.imageUrl ? (
                    <img
                      src={post.imageUrl}
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                        (e.target as HTMLImageElement).src = `https://placehold.co/400x400/e5e5e5/999?text=No+Image`;
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs bg-secondary">
                      {post.isReel ? "Reel" : "No image"}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center gap-6">
                    <div className="hidden group-hover:flex items-center gap-1 text-white text-sm font-semibold">
                      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                      {post.likesCount}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
