import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState } from "react";
import { StoryViewer } from "./StoryViewer";
import { useAuth } from "@/hooks/use-auth";
import { Plus } from "lucide-react";

interface StoryGroup {
  user: any;
  stories: any[];
  hasUnseen: boolean;
}

export function StoriesBar({ onCreateStory }: { onCreateStory?: () => void }) {
  const { user, supabaseId } = useAuth();
  const storyGroups = useQuery(api.stories.getActiveStories, { supabaseId: supabaseId ?? undefined }) as StoryGroup[] | undefined;
  const [viewingIndex, setViewingIndex] = useState<number | null>(null);

  if (!storyGroups || storyGroups.length === 0) {
    return (
      <div className="flex gap-4 overflow-x-auto py-3 px-1 scrollbar-none">
        <div className="flex flex-col items-center gap-1 flex-shrink-0">
          <button
            onClick={onCreateStory}
            className="relative w-16 h-16 rounded-full border-2 border-dashed border-muted-foreground/40 flex items-center justify-center hover:border-foreground/60 transition-colors"
          >
            <Plus className="h-6 w-6 text-muted-foreground" />
          </button>
          <span className="text-[11px] text-muted-foreground">Add</span>
        </div>
      </div>
    );
  }

  const currentGroup = viewingIndex !== null ? storyGroups[viewingIndex] : null;

  return (
    <>
      <div className="flex gap-5 overflow-x-auto py-3 px-1 scrollbar-none">
        {/* Your story button */}
        <div className="flex flex-col items-center gap-1 flex-shrink-0">
          <button
            onClick={onCreateStory}
            className="relative w-16 h-16"
          >
            <Avatar className="w-16 h-16 ring-2 ring-border">
              <AvatarImage src={user?.image} />
              <AvatarFallback className="text-sm">
                {user?.name?.slice(0, 2).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-0.5 -right-0.5 bg-foreground text-background rounded-full p-0.5">
              <Plus className="h-3.5 w-3.5" />
            </div>
          </button>
          <span className="text-[11px] text-muted-foreground truncate max-w-16 text-center">
            Your Story
          </span>
        </div>

        {/* Other users' stories */}
        {storyGroups.map((group, index) => (
          <button
            key={group.user?._id}
            onClick={() => setViewingIndex(index)}
            className="flex flex-col items-center gap-1 flex-shrink-0"
          >
            <div className={group.hasUnseen ? "story-ring" : "story-ring-seen"}>
              <Avatar className="w-14 h-14 border-2 border-background">
                <AvatarImage src={group.user?.image} />
                <AvatarFallback className="text-sm">
                  {group.user?.name?.slice(0, 2).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
            </div>
            <span className="text-[11px] text-muted-foreground truncate max-w-16 text-center">
              {group.user?.name?.split(" ")[0] || "User"}
            </span>
          </button>
        ))}
      </div>

      {/* Story Viewer */}
      {currentGroup && viewingIndex !== null && (
        <StoryViewer
          storyGroup={currentGroup}
          onClose={() => setViewingIndex(null)}
          onNext={() => {
            if (viewingIndex < storyGroups.length - 1) {
              setViewingIndex(viewingIndex + 1);
            } else {
              setViewingIndex(null);
            }
          }}
          onPrev={() => {
            if (viewingIndex > 0) {
              setViewingIndex(viewingIndex - 1);
            } else {
              setViewingIndex(null);
            }
          }}
        />
      )}
    </>
  );
}
