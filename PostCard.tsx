import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Heart,
  MessageCircle,
  Bookmark,
  Send,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "react-router";
import { cn } from "@/lib/utils";
import { Doc } from "@/convex/_generated/dataModel";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PostCardProps {
  post: any;
  showCaption?: boolean;
  isReel?: boolean;
}

export function PostCard({ post, showCaption = true, isReel = false }: PostCardProps) {
  const { user, supabaseId } = useAuth();
  const navigate = useNavigate();
  const toggleLike = useMutation(api.posts.toggleLike);
  const toggleSave = useMutation(api.posts.toggleSave);
  const deletePost = useMutation(api.posts.deletePost);
  const comments = useQuery(api.posts.getComments, { postId: post._id });
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const addComment = useMutation(api.posts.addComment);
  const [isLiked, setIsLiked] = useState(post.isLiked ?? false);
  const [isSaved, setIsSaved] = useState(post.isSaved ?? false);
  const [likesCount, setLikesCount] = useState(post.likesCount ?? 0);
  const [showLikes, setShowLikes] = useState(false);
  const likesData = useQuery(api.posts.getLikes, showLikes ? { postId: post._id } : { postId: post._id });

  const handleLike = async () => {
    const result = await toggleLike({ postId: post._id, supabaseId: supabaseId ?? undefined });
    setIsLiked(result);
    setLikesCount((prev: number) => (result ? prev + 1 : prev - 1));
  };

  const handleSave = async () => {
    const result = await toggleSave({ postId: post._id, supabaseId: supabaseId ?? undefined });
    setIsSaved(result);
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    await addComment({ postId: post._id, content: commentText, supabaseId: supabaseId ?? undefined });
    setCommentText("");
  };

  const handleDelete = async () => {
    if (confirm("Delete this post?")) {
      await deletePost({ postId: post._id, supabaseId: supabaseId ?? undefined });
    }
  };

  const userInitials = post.user?.name?.slice(0, 2).toUpperCase() || "U";

  return (
    <div className="border-b border-border pb-6 mb-6 last:border-b-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => navigate(`/profile/${post.userId}`)}
        >
          <Avatar className="h-8 w-8 ring-1 ring-border">
            <AvatarImage src={post.user?.image} />
            <AvatarFallback className="text-[10px]">{userInitials}</AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium">{post.user?.name || "Anonymous"}</span>
          {post.location && (
            <span className="text-xs text-muted-foreground">· {post.location}</span>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            {(user?._id === post.userId || user?.role === "admin") && (
              <DropdownMenuItem onClick={handleDelete} className="text-destructive cursor-pointer">
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Image/Video */}
      {post.imageUrl && (
        <div className="rounded-sm overflow-hidden bg-muted mb-3">
          <img
            src={post.imageUrl}
            alt="Post"
            className="w-full object-cover max-h-[600px]"
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://placehold.co/600x600/e5e5e5/999?text=No+Image`;
            }}
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-4">
          <button onClick={handleLike} className="transition-transform hover:scale-110 active:scale-90">
            {isLiked ? (
              <Heart className="h-6 w-6 fill-foreground text-foreground" />
            ) : (
              <Heart className="h-6 w-6 text-foreground" />
            )}
          </button>
          <button onClick={() => setShowComments(!showComments)} className="transition-transform hover:scale-110">
            <MessageCircle className="h-6 w-6" />
          </button>
          <button onClick={() => { navigator.clipboard.writeText(window.location.origin + "/post/" + post._id); }} className="transition-transform hover:scale-110">
            <Send className="h-6 w-6" />
          </button>
        </div>
        <button onClick={handleSave} className="transition-transform hover:scale-110">
          <Bookmark className={cn("h-6 w-6", isSaved && "fill-foreground")} />
        </button>
      </div>

      {/* Likes */}
      {likesCount > 0 && (
        <button
          onClick={() => setShowLikes(!showLikes)}
          className="text-sm font-semibold mb-1 hover:underline"
        >
          {likesCount.toLocaleString()} {likesCount === 1 ? "like" : "likes"}
        </button>
      )}

      {/* Caption */}
      {showCaption && post.caption && (
        <div className="text-sm mb-1">
          <span className="font-semibold mr-2">{post.user?.name || "Anonymous"}</span>
          {post.caption}
        </div>
      )}

      {/* Hashtags */}
      {post.hashtags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {post.hashtags.map((tag: string) => (
            <button
              key={tag}
              onClick={() => navigate(`/search?q=%23${tag}`)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      {/* Comments */}
      {comments && comments.length > 0 && !showComments && (
        <button
          onClick={() => setShowComments(true)}
          className="text-sm text-muted-foreground mb-1 hover:text-foreground transition-colors"
        >
          View all {comments.length} {comments.length === 1 ? "comment" : "comments"}
        </button>
      )}

      {showComments && comments && (
        <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
          {comments.map((comment: any) => (
            <div key={comment._id} className="flex items-start gap-2 text-sm">
              <Avatar className="h-6 w-6 flex-shrink-0">
                <AvatarImage src={comment.user?.image} />
                <AvatarFallback className="text-[8px]">
                  {comment.user?.name?.slice(0, 2).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div>
                <span className="font-semibold mr-1.5">{comment.user?.name || "Anonymous"}</span>
                {comment.content}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Comment Input */}
      <form onSubmit={handleComment} className="flex items-center gap-2 mt-2">
        <input
          type="text"
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder="Add a comment..."
          className="flex-1 text-sm bg-transparent border-none outline-none placeholder:text-muted-foreground"
        />
        <Button
          type="submit"
          variant="ghost"
          size="sm"
          disabled={!commentText.trim()}
          className="text-xs font-semibold text-foreground disabled:text-muted-foreground hover:text-foreground p-0"
        >
          Post
        </Button>
      </form>
      <Separator className="mt-3" />
    </div>
  );
}
