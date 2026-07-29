import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router";
import { ArrowRight, Heart, MessageCircle, Bookmark, Users, RefreshCw, Shield } from "lucide-react";
import { EngageLogo } from "@/components/EngageLogo";

const features = [
  {
    icon: Heart,
    title: "Connect",
    description: "Share moments that matter with people who matter most to you.",
  },
  {
    icon: MessageCircle,
    title: "Communicate",
    description: "Engage through likes, comments, and direct messages.",
  },
  {
    icon: RefreshCw,
    title: "Stories",
    description: "Share fleeting moments that disappear after 24 hours.",
  },
  {
    icon: Bookmark,
    title: "Discover",
    description: "Explore trending content and find your next inspiration.",
  },
  {
    icon: Users,
    title: "Community",
    description: "Build your community around shared interests and creativity.",
  },
  {
    icon: Shield,
    title: "Private",
    description: "Full control over your privacy and who sees your content.",
  },
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <EngageLogo size="sm" showText />
          <div className="flex items-center gap-3">
            <Button
              onClick={() => navigate("/auth")}
              className="text-sm bg-foreground text-background hover:bg-foreground/90 rounded-md font-medium h-9 px-5"
            >
              Log in
            </Button>
            <div className="h-6 w-px bg-border/60" />
            <span className="text-sm text-muted-foreground">or</span>
            <div className="h-6 w-px bg-border/60" />
            <Button
              onClick={() => navigate("/auth")}
              className="text-sm bg-foreground text-background hover:bg-foreground/90 rounded-md font-medium h-9 px-5"
            >
              Sign up
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="pt-32 pb-20 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border text-xs text-muted-foreground mb-8">
                <span className="w-1.5 h-1.5 rounded-full bg-foreground" />
                Share your story
              </div>
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-6">
                Share life's
                <br />
                <span className="text-muted-foreground">moments</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-lg mx-auto mb-10 leading-relaxed">
                A minimalist space for sharing photos, videos, and stories
                with the people who matter most.
              </p>
              <div className="flex items-center justify-center gap-3">
                <Button
                  onClick={() => navigate("/auth")}
                  className="h-11 px-6 bg-foreground text-background hover:bg-foreground/90 rounded-md text-sm"
                >
                  Get started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button
                  onClick={() => navigate("/auth")}
                  className="h-11 px-6 bg-secondary text-foreground hover:bg-secondary/80 rounded-md text-sm"
                >
                  Learn more
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Features */}
        <section className="py-20 border-t border-border">
          <div className="max-w-5xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">
                Everything you need
              </h2>
              <p className="text-muted-foreground text-sm">
                A clean, focused experience for sharing and connecting.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-12">
              {features.map((feature, i) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                  viewport={{ once: true }}
                >
                  <div className="w-8 h-8 rounded-md bg-secondary flex items-center justify-center mb-4">
                    <feature.icon className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 px-6 border-t border-border">
          <div className="max-w-xl mx-auto text-center">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-4">
              Ready to share your story?
            </h2>
            <p className="text-muted-foreground text-sm mb-8">
              Join Engage today and start sharing moments that matter.
            </p>
            <Button
              onClick={() => navigate("/auth")}
              className="h-11 px-8 bg-foreground text-background hover:bg-foreground/90 rounded-md"
            >
              Create your account
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border py-8 px-6">
          <div className="max-w-5xl mx-auto flex items-center justify-between text-xs text-muted-foreground">
            <span>© 2026 Engage. All rights reserved.</span>
            <div className="flex items-center gap-6">
              <a href="/auth" className="hover:text-foreground transition-colors">Privacy</a>
              <a href="/auth" className="hover:text-foreground transition-colors">Terms</a>
              <a href="https://freebuff.com" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">Built with Freebuff</a>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
