import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { BottomNav } from "@/components/BottomNav";
import { LogoDropdown } from "@/components/LogoDropdown";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigate, useSearchParams } from "react-router";
import { Search as SearchIcon, Hash, User, Loader2 } from "lucide-react";

export default function Search() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState<"users" | "hashtags">("users");

  const users = useQuery(api.search.searchUsers, { query, limit: 20 });
  const hashtags = useQuery(api.search.searchHashtags, { query, limit: 20 });

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <LogoDropdown />
          <div className="flex-1 relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search users and hashtags..."
              className="w-full h-9 pl-9 pr-3 text-sm bg-secondary rounded-md border-none outline-none focus:ring-1 focus:ring-ring transition-shadow placeholder:text-muted-foreground"
              autoFocus
            />
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 pt-4">
        {!query.trim() ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-full bg-secondary mx-auto mb-4 flex items-center justify-center">
              <SearchIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-1">Search Pulse</h3>
            <p className="text-sm text-muted-foreground">
              Find users, explore hashtags, and discover content.
            </p>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex border-b border-border mb-4">
              <button
                onClick={() => setActiveTab("users")}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "users"
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <User className="h-4 w-4" />
                Users
              </button>
              <button
                onClick={() => setActiveTab("hashtags")}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "hashtags"
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Hash className="h-4 w-4" />
                Hashtags
              </button>
            </div>

            {/* Results */}
            {activeTab === "users" && (
              <div>
                {users && users.length === 0 ? (
                  <div className="text-center py-10 text-sm text-muted-foreground">
                    No users found for "{query}"
                  </div>
                ) : (
                  <div className="space-y-1">
                    {users?.map((u: any) => (
                      <div
                        key={u._id}
                        onClick={() => navigate(`/profile/${u._id}`)}
                        className="flex items-center gap-3 p-3 rounded-md hover:bg-secondary/50 transition-colors cursor-pointer"
                      >
                        <Avatar className="h-11 w-11">
                          <AvatarImage src={u.image} />
                          <AvatarFallback className="text-xs">
                            {u.name?.slice(0, 2).toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-semibold">{u.name || "Anonymous"}</p>
                          {u.username && (
                            <p className="text-xs text-muted-foreground">@{u.username}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "hashtags" && (
              <div>
                {hashtags && hashtags.length === 0 ? (
                  <div className="text-center py-10 text-sm text-muted-foreground">
                    No hashtags found for "{query}"
                  </div>
                ) : (
                  <div className="space-y-1">
                    {hashtags?.map((h: any) => (
                      <div
                        key={h._id}
                        onClick={() => navigate(`/search?q=%23${h.name}`)}
                        className="flex items-center gap-3 p-3 rounded-md hover:bg-secondary/50 transition-colors cursor-pointer"
                      >
                        <div className="h-11 w-11 rounded-md bg-secondary flex items-center justify-center">
                          <Hash className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">#{h.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {h.postCount} {h.postCount === 1 ? "post" : "posts"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
