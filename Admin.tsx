import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useNavigate } from "react-router";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogoDropdown } from "@/components/LogoDropdown";
import { Users, Image as ImageIcon, MessageCircle, Heart, BookOpen, BarChart3, Trash2, Shield, ArrowLeft } from "lucide-react";

export default function Admin() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const stats = useQuery(api.admin.getStats);
  const allUsers = useQuery(api.admin.getAllUsers, { limit: 30 });
  const allPosts = useQuery(api.admin.getAllPosts, { limit: 30 });
  const deleteUser = useMutation(api.admin.deleteUser);
  const updateUserRole = useMutation(api.admin.updateUserRole);
  const deletePost = useMutation(api.posts.deletePost);
  const [activeSection, setActiveSection] = useState<"stats" | "users" | "posts">("stats");

  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">Access Denied</h2>
          <p className="text-sm text-muted-foreground mb-4">You don't have admin permissions.</p>
          <Button variant="outline" onClick={() => navigate("/feed")} className="rounded-md">
            Go to Feed
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LogoDropdown />
            <span className="font-semibold">Admin Panel</span>
          </div>
          <span className="text-xs text-muted-foreground">Pulse Admin</span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 pt-6">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
            {[
              { icon: Users, label: "Users", value: stats.totalUsers },
              { icon: ImageIcon, label: "Posts", value: stats.totalPosts },
              { icon: MessageCircle, label: "Comments", value: stats.totalComments },
              { icon: Heart, label: "Likes", value: stats.totalLikes },
              { icon: BookOpen, label: "Stories", value: stats.totalStories },
              { icon: BarChart3, label: "Messages", value: stats.totalMessages },
            ].map((item) => (
              <div key={item.label} className="p-4 rounded-md border border-border">
                <item.icon className="h-4 w-4 text-muted-foreground mb-2" />
                <p className="text-2xl font-bold">{item.value}</p>
                <p className="text-xs text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Section Tabs */}
        <div className="flex border-b border-border mb-6">
          {(["stats", "users", "posts"] as const).map((section) => (
            <button
              key={section}
              onClick={() => setActiveSection(section)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize ${
                activeSection === section
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {section === "stats" && <BarChart3 className="h-4 w-4 inline mr-1.5" />}
              {section === "users" && <Users className="h-4 w-4 inline mr-1.5" />}
              {section === "posts" && <ImageIcon className="h-4 w-4 inline mr-1.5" />}
              {section}
            </button>
          ))}
        </div>

        {/* Users List */}
        {activeSection === "users" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">Manage Users</h3>
              <p className="text-xs text-muted-foreground">{allUsers?.length ?? 0} users</p>
            </div>
            <div className="space-y-2">
              {allUsers?.map((u: any) => (
                <div key={u._id} className="flex items-center justify-between p-3 rounded-md border border-border">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={u.image} />
                      <AvatarFallback className="text-[10px]">
                        {u.name?.slice(0, 2).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{u.name || "Anonymous"}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>@{u.username || "no-username"}</span>
                        <span>·</span>
                        <span className={u.role === "admin" ? "text-foreground font-medium" : ""}>{u.role || "user"}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {u.role !== "admin" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-8"
                        onClick={() => updateUserRole({ userId: u._id, role: "admin" })}
                      >
                        <Shield className="h-3 w-3 mr-1" />
                        Make Admin
                      </Button>
                    )}
                    {u.role === "admin" && u._id !== user?._id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-8"
                        onClick={() => updateUserRole({ userId: u._id, role: "user" })}
                      >
                        Remove Admin
                      </Button>
                    )}
                    {u._id !== user?._id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-8 text-destructive"
                        onClick={async () => {
                          if (confirm(`Delete user "${u.name}" and all their content?`)) {
                            await deleteUser({ userId: u._id });
                          }
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Posts List */}
        {activeSection === "posts" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">Manage Posts</h3>
              <p className="text-xs text-muted-foreground">{allPosts?.length ?? 0} posts</p>
            </div>
            <div className="space-y-2">
              {allPosts?.map((post: any) => (
                <div key={post._id} className="flex items-center justify-between p-3 rounded-md border border-border">
                  <div className="flex items-center gap-3">
                    {post.imageUrl ? (
                      <img src={post.imageUrl} alt="" className="h-10 w-10 object-cover rounded" />
                    ) : (
                      <div className="h-10 w-10 rounded bg-secondary flex items-center justify-center text-muted-foreground text-xs">
                        {post.isReel ? "🎬" : "📷"}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm truncate max-w-[200px]">{post.caption || "No caption"}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>❤️ {post.likesCount}</span>
                        <span>💬 {post.commentsCount}</span>
                        <span>by {post.user?.name || "Unknown"}</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-8 text-destructive"
                    onClick={async () => {
                      if (confirm("Delete this post?")) {
                        await deletePost({ postId: post._id });
                      }
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
