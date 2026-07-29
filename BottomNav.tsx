import { useNavigate, useLocation } from "react-router";
import { Home, Search, PlusSquare, Compass, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

const navItems = [
  { icon: Home, label: "Home", path: "/feed" },
  { icon: Search, label: "Search", path: "/search" },
  { icon: PlusSquare, label: "Create", path: "/create" },
  { icon: Compass, label: "Explore", path: "/explore" },
  { icon: User, label: "Profile", path: "/profile" },
];

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background md:hidden">
      <div className="flex items-center justify-around h-14">
        {navItems.map((item) => {
          const isActive =
            item.path === "/profile"
              ? location.pathname.startsWith("/profile")
              : location.pathname.startsWith(item.path);
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center justify-center h-full px-4 transition-colors",
                isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {item.icon === Home ? (
                <Icon className={cn("h-6 w-6", isActive && "fill-foreground")} />
              ) : (
                <Icon className="h-6 w-6" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
