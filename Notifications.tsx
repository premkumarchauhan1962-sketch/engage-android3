import { useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { BottomNav } from "@/components/BottomNav";
import { LogoDropdown } from "@/components/LogoDropdown";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigate } from "react-router";
import { useAuth } from "@/hooks/use-auth";
import { Heart, MessageCircle, UserPlus, AtSign, Send } from "lucide-react";

const notificationIcons: Record<string, any> = {
  like: Heart,
  comment: MessageCircle,
  follow: UserPlus,
  mention: AtSign,
  message: Send,
};

const notificationColors: Record<string, string> = {
  like: "text-foreground",
  comment: "text-foreground",
  follow: "text-foreground",
  mention: "text-foreground",
  message: "text-foreground",
};

export default function Notifications() {
  const navigate = useNavigate();
  const { supabaseId } = useAuth();
  const notifications = useQuery(api.notifications.getNotifications, { limit: 30, supabaseId: supabaseId ?? undefined });
  const markAsRead = useMutation(api.notifications.markNotificationsAsRead);

  useEffect(() => {
    markAsRead({ supabaseId: supabaseId ?? undefined });
  }, [markAsRead, supabaseId]);

  const getText = (n: any) => {
    switch (n.type) {
      case "like":
        return "liked your post";
      case "comment":
        return "commented on your post";
      case "follow":
        return "started following you";
      case "mention":
        return "mentioned you";
      case "message":
        return "sent you a message";
      default:
        return "interacted with you";
    }
  };

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <LogoDropdown />
          <span className="font-semibold">Notifications</span>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 pt-4">
        {!notifications || notifications.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-full bg-secondary mx-auto mb-4 flex items-center justify-center">
              <Heart className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No notifications yet</h3>
            <p className="text-sm text-muted-foreground">
              When someone likes, comments, or follows you, it will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {notifications.map((n: any) => {
              const Icon = notificationIcons[n.type] || Heart;
              return (
                <div
                  key={n._id}
                  className={`flex items-center gap-3 py-3 px-2 rounded-md transition-colors ${
                    !n.read ? "bg-secondary/50" : ""
                  }`}
                >
                  <div className="relative">
                    <Avatar
                      className="h-11 w-11 cursor-pointer"
                      onClick={() => navigate(`/profile/${n.fromUserId}`)}
                    >
                      <AvatarImage src={n.fromUser?.image} />
                      <AvatarFallback className="text-xs">
                        {n.fromUser?.name?.slice(0, 2).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`absolute -bottom-0.5 -right-0.5 bg-background rounded-full p-0.5 ${notificationColors[n.type]}`}>
                      <Icon className="h-3 w-3" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span
                        className="font-semibold cursor-pointer hover:underline"
                        onClick={() => navigate(`/profile/${n.fromUserId}`)}
                      >
                        {n.fromUser?.name || "Someone"}
                      </span>{" "}
                      {getText(n)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(n.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  {n.post?.imageUrl && (
                    <img
                      src={n.post.imageUrl}
                      alt=""
                      className="h-10 w-10 object-cover rounded cursor-pointer"
                      onClick={() => navigate("/feed")}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
