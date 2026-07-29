import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useNavigate } from "react-router";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { LogoDropdown } from "@/components/LogoDropdown";
import { ArrowLeft, Save, Loader2 } from "lucide-react";

export default function Settings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const updateProfile = useMutation(api.users.updateProfile);

  const [name, setName] = useState(user?.name || "");
  const [username, setUsername] = useState(user?.username || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [website, setWebsite] = useState(user?.website || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [gender, setGender] = useState(user?.gender || "");
  const [image, setImage] = useState(user?.image || "");
  const [isPrivate, setIsPrivate] = useState(user?.isPrivate || false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateProfile({
        name: name || undefined,
        username: username || undefined,
        bio: bio || undefined,
        website: website || undefined,
        phone: phone || undefined,
        gender: gender || undefined,
        isPrivate,
        image: image || undefined,
      });
      navigate(-1);
    } catch (error) {
      console.error("Error updating profile:", error);
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <span className="font-semibold">Edit Profile</span>
          </div>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="text-sm h-9 px-4 bg-foreground text-background hover:bg-foreground/90 rounded-md"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <><Save className="h-3.5 w-3.5 mr-1" /> Save</>
            )}
          </Button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 pt-6">
        {/* Profile Image */}
        <div className="flex items-center gap-6 mb-8 pb-6 border-b border-border">
          <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center overflow-hidden ring-2 ring-border">
            {image ? (
              <img src={image} alt="" className="w-full h-full object-cover" />
            ) : (
              <svg viewBox="0 0 24 24" className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            )}
          </div>
          <div>
            <p className="text-sm font-semibold">{user?.name || "Your Name"}</p>
            <p className="text-xs text-muted-foreground mb-2">Profile photo URL</p>
            <input
              type="url"
              value={image}
              onChange={(e) => setImage(e.target.value)}
              placeholder="https://example.com/photo.jpg"
              className="w-full max-w-sm h-9 px-3 text-xs bg-secondary rounded-md border-none outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {/* Form Fields */}
        <div className="space-y-5">
          {[
            { label: "Name", value: name, setter: setName, placeholder: "Your name" },
            { label: "Username", value: username, setter: setUsername, placeholder: "username" },
            { label: "Website", value: website, setter: setWebsite, placeholder: "https://yourwebsite.com", type: "url" },
            { label: "Phone", value: phone, setter: setPhone, placeholder: "+1 234 567 890", type: "tel" },
          ].map((field) => (
            <div key={field.label}>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
                {field.label}
              </label>
              <input
                type={field.type || "text"}
                value={field.value}
                onChange={(e) => field.setter(e.target.value)}
                placeholder={field.placeholder}
                className="w-full h-10 px-3 text-sm bg-secondary rounded-md border-none outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
              />
            </div>
          ))}

          {/* Bio */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell people about yourself..."
              rows={3}
              className="w-full px-3 py-2 text-sm bg-secondary rounded-md border-none outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground resize-none"
            />
          </div>

          {/* Gender */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Gender
            </label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full h-10 px-3 text-sm bg-secondary rounded-md border-none outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">Prefer not to say</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="non-binary">Non-binary</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Private Account */}
          <div className="flex items-center justify-between py-3 border-t border-border">
            <div>
              <p className="text-sm font-medium">Private account</p>
              <p className="text-xs text-muted-foreground">
                When your account is private, only approved followers can see your posts.
              </p>
            </div>
            <button
              onClick={() => setIsPrivate(!isPrivate)}
              className={`w-11 h-6 rounded-full transition-colors relative ${
                isPrivate ? "bg-foreground" : "bg-muted-foreground/30"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${
                  isPrivate ? "translate-x-[22px]" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
