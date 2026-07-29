import { useState, useRef } from "react";
import { useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/hooks/use-auth";
import { ArrowLeft, Image, Video, X, Loader2, Upload } from "lucide-react";

export default function CreatePost() {
  const navigate = useNavigate();
  const { supabaseId } = useAuth();
  const [isReel, setIsReel] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [vimeoUrl, setVimeoUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");
  const [hashtagInput, setHashtagInput] = useState("");
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [isPosting, setIsPosting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [vimeoVideoId, setVimeoVideoId] = useState("");
  const [uploadingFile, setUploadingFile] = useState(false);

  const createPost = useMutation(api.posts.createPost);
  const uploadToVimeo = useAction(api.vimeo.uploadVideo);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFile(true);
    try {
      if (file.type.startsWith("video/")) {
        // For videos, read as data URL (keep under ~5MB for best results)
        const reader = new FileReader();
        reader.onload = (ev) => {
          const dataUrl = ev.target?.result as string;
          setVideoUrl(dataUrl);
          setUploadingFile(false);
        };
        reader.onerror = () => { setUploadingFile(false); alert("Failed to read video file."); };
        reader.readAsDataURL(file);
      } else {
        // For images, resize via canvas to keep size manageable
        const img = new window.Image();
        const objectUrl = URL.createObjectURL(file);
        img.onload = () => {
          const maxDim = 1200;
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            const ratio = Math.min(maxDim / width, maxDim / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d")!;
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
          setImageUrl(dataUrl);
          URL.revokeObjectURL(objectUrl);
          setUploadingFile(false);
        };
        img.onerror = () => { setUploadingFile(false); alert("Failed to load image."); };
        img.src = objectUrl;
      }
    } catch (err) {
      setUploadingFile(false);
      console.error("File read error:", err);
    }
    // Reset input so same file can be selected again
    e.target.value = "";
  };

  const addHashtag = () => {
    const tag = hashtagInput.trim().replace(/^#/, "");
    if (tag && !hashtags.includes(tag)) {
      setHashtags([...hashtags, tag]);
      setHashtagInput("");
    }
  };

  const removeHashtag = (tag: string) => {
    setHashtags(hashtags.filter((t) => t !== tag));
  };

  const handleUploadToVimeo = async () => {
    if (!vimeoUrl.trim()) return;
    setIsUploading(true);
    setUploadStatus("Uploading to Vimeo...");
    try {
      const result = await uploadToVimeo({
        videoUrl: vimeoUrl.trim(),
        name: caption || "Pulse Video",
        description: caption || undefined,
      });

      if (result && typeof result === "object" && "videoUrl" in result) {
        const vimeoResult = result as { videoUrl: string; vimeoId?: string; vimeoUri?: string };
        setVideoUrl(vimeoResult.videoUrl);
        setVimeoVideoId(vimeoResult.vimeoId || "");
        setUploadStatus("Uploaded successfully!");
      }
    } catch (error) {
      console.error("Vimeo upload error:", error);
      setUploadStatus("Upload failed. Check your Vimeo access token.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!imageUrl && !videoUrl) return;
    setIsPosting(true);
    try {
      const postId = await createPost({
        imageUrl: imageUrl || undefined,
        videoUrl: videoUrl || undefined,
        caption: caption || undefined,
        location: location || undefined,
        isReel,
        hashtags,
        supabaseId: supabaseId ?? undefined,
      });
      navigate(isReel ? "/reels" : "/feed");
    } catch (error) {
      console.error("Error creating post:", error);
      setIsPosting(false);
    }
  };

  // Demo images for easy testing

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <span className="font-semibold">New {isReel ? "Reel" : "Post"}</span>
          </div>
          <Button
            onClick={handleSubmit}
            disabled={(!imageUrl && !videoUrl) || isPosting}
            className="text-sm h-9 px-4 bg-foreground text-background hover:bg-foreground/90 rounded-md"
          >
            {isPosting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Share"
            )}
          </Button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 pt-6">
        {/* Type Toggle */}
        <div className="flex items-center gap-2 mb-6 bg-secondary rounded-md p-1 w-fit">
          <button
            onClick={() => { setIsReel(false); setVideoUrl(""); setVimeoUrl(""); }}
            className={`flex items-center gap-2 px-4 py-2 text-sm rounded-md transition-colors ${
              !isReel ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            <Image className="h-4 w-4" />
            Post
          </button>
          <button
            onClick={() => { setIsReel(true); setImageUrl(""); }}
            className={`flex items-center gap-2 px-4 py-2 text-sm rounded-md transition-colors ${
              isReel ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            <Video className="h-4 w-4" />
            Reel
          </button>
        </div>

        {isReel ? (
          /* Video upload section (for reels) */
          <>
            <div className="mb-4">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                1. Enter a video URL to upload to Vimeo
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={vimeoUrl}
                  onChange={(e) => setVimeoUrl(e.target.value)}
                  placeholder="https://example.com/video.mp4"
                  className="flex-1 h-10 px-3 text-sm bg-secondary rounded-md border-none outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
                />
                <Button
                  onClick={handleUploadToVimeo}
                  disabled={!vimeoUrl.trim() || isUploading}
                  variant="outline"
                  size="sm"
                  className="flex-shrink-0"
                >
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {uploadStatus && (
                <p className={`text-xs mt-1 ${uploadStatus.includes("failed") ? "text-destructive" : "text-muted-foreground"}`}>
                  {uploadStatus}
                </p>
              )}
            </div>

            {/* Or paste Vimeo URL directly */}
            <div className="mb-4">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                2. Or paste a Vimeo video URL directly
              </label>
              <input
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://vimeo.com/123456789"
                className="w-full h-10 px-3 text-sm bg-secondary rounded-md border-none outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
              />
            </div>

            {/* Preview */}
            {videoUrl && (
              <div className="mb-6 relative rounded-md overflow-hidden bg-muted max-h-[400px]">
                {videoUrl.includes("vimeo.com") || videoUrl.includes("player.vimeo.com") ? (
                  <div className="aspect-[9/16] bg-black">
                    <iframe
                      src={
                        videoUrl.includes("player.vimeo.com")
                          ? videoUrl
                          : `https://player.vimeo.com/video/${videoUrl.split("/").pop()}?title=0&byline=0&portrait=0`
                      }
                      className="w-full h-full"
                      allow="autoplay; fullscreen"
                      allowFullScreen
                      title="Video preview"
                    />
                  </div>
                ) : (
                  <video src={videoUrl} className="w-full aspect-[9/16] object-cover" controls />
                )}
              </div>
            )}
          </>
        ) : (
          /* Image upload section (for posts) */
          <>
            {/* Upload media - label wrapping hidden file input */}
            <div className="mb-6">
              <label className="w-full h-32 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors cursor-pointer bg-secondary/20">
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                {uploadingFile ? (
                  <Loader2 className="h-8 w-8 animate-spin" />
                ) : (
                  <>
                    <Upload className="h-8 w-8" />
                    <span className="text-sm font-medium">Choose a photo or video</span>
                    <span className="text-xs text-muted-foreground/60">from your device</span>
                  </>
                )}
              </label>
            </div>

            {/* Preview */}
            {imageUrl && (
              <div className="mb-6 relative rounded-md overflow-hidden bg-muted max-h-[400px]">
                <img
                  src={imageUrl}
                  alt="Preview"
                  className="w-full h-72 object-cover"
                />
              </div>
            )}
          </>
        )}

        {/* Caption */}
        <div className="mb-4">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
            Caption
          </label>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Write a caption..."
            rows={3}
            className="w-full px-3 py-2 text-sm bg-secondary rounded-md border-none outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground resize-none"
          />
        </div>

        {/* Location */}
        <div className="mb-4">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
            Location
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Add location..."
            className="w-full h-10 px-3 text-sm bg-secondary rounded-md border-none outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
          />
        </div>

        {/* Hashtags */}
        <div className="mb-6">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
            Hashtags
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={hashtagInput}
              onChange={(e) => setHashtagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  addHashtag();
                }
              }}
              placeholder="Type a hashtag and press Enter"
              className="flex-1 h-10 px-3 text-sm bg-secondary rounded-md border-none outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
            />
          </div>
          {hashtags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {hashtags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-3 py-1 text-xs bg-secondary rounded-full"
                >
                  #{tag}
                  <button onClick={() => removeHashtag(tag)} className="hover:text-destructive transition-colors">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
