import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { BottomNav } from "@/components/BottomNav";
import { LogoDropdown } from "@/components/LogoDropdown";
import { FollowRequestBell } from "@/components/FollowRequestBell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigate } from "react-router";
import { ArrowLeft, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

export default function Messages() {
  const navigate = useNavigate();
  const { user, supabaseId } = useAuth();
  const conversations = useQuery(api.messages.getConversations, { supabaseId: supabaseId ?? undefined });
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const messages = useQuery(
    api.messages.getMessages,
    selectedUserId ? { otherUserId: selectedUserId as any, limit: 50, supabaseId: supabaseId ?? undefined } : { otherUserId: selectedUserId as any, limit: 50, supabaseId: supabaseId ?? undefined }
  );
  const sendMessage = useMutation(api.messages.sendMessage);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUserId) return;
    await sendMessage({ receiverId: selectedUserId as any, content: newMessage, supabaseId: supabaseId ?? undefined });
    setNewMessage("");
  };

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {selectedUserId ? (
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setSelectedUserId(null)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
            ) : (
              <LogoDropdown />
            )}
            <span className="font-semibold">{selectedUserId ? "Chat" : "Messages"}</span>
          </div>
          <div className="flex items-center gap-2">
            <FollowRequestBell />
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4">
        {!selectedUserId ? (
          /* Conversation List */
          <div className="pt-4">
            {!conversations || conversations.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-16 h-16 rounded-full bg-secondary mx-auto mb-4 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-1">No messages yet</h3>
                <p className="text-sm text-muted-foreground">
                  When you send a message to someone, it will appear here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {conversations.map((conv: any) => (
                  <button
                    key={conv._id}
                    onClick={() => setSelectedUserId(conv.otherUser?._id)}
                    className="flex items-center gap-3 py-3 w-full text-left hover:bg-secondary/50 transition-colors px-2 rounded-md"
                  >
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={conv.otherUser?.image} />
                      <AvatarFallback className="text-xs">
                        {conv.otherUser?.name?.slice(0, 2).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">
                        {conv.otherUser?.name || "Unknown"}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {conv.lastMessageContent || "No messages yet"}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Chat View */
          <div className="flex flex-col h-[calc(100vh-8rem)]">
            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {messages?.map((msg: any) => {
                const isMine = msg.senderId === user?._id;
                return (
                  <div key={msg._id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[75%] px-4 py-2 text-sm rounded-2xl ${
                        isMine
                          ? "bg-foreground text-background rounded-br-md"
                          : "bg-secondary text-foreground rounded-bl-md"
                      }`}
                    >
                      {msg.content}
                      {msg.imageUrl && (
                        <img src={msg.imageUrl} alt="" className="mt-1 rounded-md max-w-full" />
                      )}
                      <p className={`text-[10px] mt-1 ${isMine ? "text-background/60" : "text-muted-foreground"}`}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                );
              })}
              {(!messages || messages.length === 0) && (
                <div className="text-center text-sm text-muted-foreground py-10">
                  Send a message to start chatting
                </div>
              )}
            </div>

            {/* Message Input */}
            <form onSubmit={handleSend} className="border-t border-border py-3 flex items-center gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 h-10 px-4 text-sm bg-secondary rounded-full border-none outline-none placeholder:text-muted-foreground"
              />
              <Button
                type="submit"
                size="icon"
                disabled={!newMessage.trim()}
                className="h-10 w-10 rounded-full bg-foreground text-background hover:bg-foreground/90"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
