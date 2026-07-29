import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useNavigate } from "react-router";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export function FollowRequestBell({ supabaseId: propToken }: { supabaseId?: string | null }) {
  const navigate = useNavigate();
  const { supabaseId: hookToken } = useAuth();
  const supabaseId = propToken !== undefined ? propToken : hookToken;
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const pendingRequests = useQuery(api.follows.getPendingFollowRequests, {
    supabaseId: supabaseId ?? undefined,
  });
  const acceptRequest = useMutation(api.follows.acceptFollowRequest);
  const rejectRequest = useMutation(api.follows.rejectFollowRequest);

  const count = pendingRequests?.length ?? 0;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  const handleAccept = async (followerId: any) => {
    try {
      await acceptRequest({ followerId, supabaseId: supabaseId ?? undefined });
    } catch (err) {
      console.error("Failed to accept follow request:", err);
    }
  };

  const handleReject = async (followerId: any) => {
    try {
      await rejectRequest({ followerId, supabaseId: supabaseId ?? undefined });
    } catch (err) {
      console.error("Failed to reject follow request:", err);
    }
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="h-9 w-9 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary relative"
        title="Follow requests"
      >
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 rounded-full bg-destructive text-white text-[9px] font-bold flex items-center justify-center leading-none shadow-sm">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-popover text-popover-foreground rounded-lg border border-border shadow-lg z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-semibold">Follow Requests</p>
            {count === 0 && <p className="text-xs text-muted-foreground mt-0.5">No pending requests</p>}
            {count > 0 && <p className="text-xs text-muted-foreground mt-0.5">{count} pending request{count !== 1 ? "s" : ""}</p>}
          </div>
          <div className="max-h-[320px] overflow-y-auto">
            {(!pendingRequests || pendingRequests.length === 0) ? (
              <div className="px-4 py-8 text-center">
                <div className="w-10 h-10 rounded-full bg-secondary mx-auto mb-2 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <line x1="19" y1="8" x2="19" y2="14" />
                    <line x1="22" y1="11" x2="16" y2="11" />
                  </svg>
                </div>
                <p className="text-xs text-muted-foreground">No one has requested to follow you yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {pendingRequests.map((req: any) => (
                  <div key={req._id} className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors">
                    <Avatar
                      className="h-10 w-10 cursor-pointer flex-shrink-0"
                      onClick={() => { navigate(`/profile/${req.followerId}`); setOpen(false); }}
                    >
                      <AvatarImage src={req.follower?.image} />
                      <AvatarFallback className="text-xs">
                        {req.follower?.name?.slice(0, 2).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm font-semibold cursor-pointer hover:underline truncate"
                        onClick={() => { navigate(`/profile/${req.followerId}`); setOpen(false); }}
                      >
                        {req.follower?.name || "Unknown User"}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {req.follower?.email || ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => handleAccept(req.followerId)}
                        className="h-8 px-3 rounded-md bg-foreground text-background text-xs font-semibold hover:bg-foreground/90 transition-colors"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleReject(req.followerId)}
                        className="h-8 px-3 rounded-md border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
