import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Loader2, Eye, EyeOff, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EngageLogo } from "@/components/EngageLogo";
import { supabase } from "@/lib/supabase";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

function resolveRedirectAfterAuth(
  returnTo: string | null,
  fallback = "/feed",
) {
  if (returnTo?.startsWith("/") && !returnTo.startsWith("//")) {
    return returnTo;
  }
  return fallback;
}

export default function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = resolveRedirectAfterAuth(searchParams.get("returnTo"));

  const [screen, setScreen] = useState<"login" | "signup" | "success">("login");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loginInput, setLoginInput] = useState("");

  // Username availability check (debounced)
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const checkTimer = useRef<number | null>(null);

  // Check username availability via Convex query
  const shouldCheckUsername = username.trim().length >= 1 && username.trim().length <= 30;
  const usernameCheck = useQuery(
    api.users.checkUsername,
    shouldCheckUsername ? { username: username.trim().toLowerCase() } : "skip",
  );

  useEffect(() => {
    if (!username.trim()) {
      setUsernameAvailable(null);
      setCheckingUsername(false);
      return;
    }
    if (username.trim().length < 1) {
      setUsernameAvailable(null);
      setCheckingUsername(false);
      return;
    }
    if (usernameCheck !== undefined) {
      setUsernameAvailable(usernameCheck.available);
      setCheckingUsername(false);
    }
  }, [username, usernameCheck]);

  const handleUsernameChange = (val: string) => {
    // Only allow letters, numbers, periods, underscores (Instagram-style)
    const cleaned = val.toLowerCase().replace(/[^a-z0-9_.]/g, "");
    if (cleaned.length > 30) return; // Max 30 chars
    setUsername(cleaned);
    setCheckingUsername(true);
    setUsernameAvailable(null);
  };

  // Handle OAuth callback — if Supabase already has a session, redirect
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        navigate(redirect, { replace: true });
      }
    });
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!loginInput.trim()) {
      setError("Please enter your email or username");
      return;
    }
    if (!password) {
      setError("Please enter your password");
      return;
    }

    setSubmitting(true);
    try {
      // Try as email first, then as username
      const isEmail = loginInput.includes("@");
      if (isEmail) {
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email: loginInput.trim(),
          password,
        });
        if (authError) throw authError;
        if (!data.user) throw new Error("Invalid login credential");
        navigate(redirect, { replace: true });
      } else {
        // Try to find user by username, then use their email
        const user = await fetch(`/api/users/by-username/${loginInput.trim().toLowerCase()}`);
        // For now, prompt user to use email for login
        setError("Please use your email to log in. Username login will be available after setup.");
        setSubmitting(false);
        return;
      }
    } catch (err: any) {
      setError(err.message || "Invalid login credential");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Please enter your email");
      return;
    }
    if (!username.trim()) {
      setError("Please choose a username");
      return;
    }
    if (username.trim().length > 30) {
      setError("Username must be 30 characters or fewer");
      return;
    }
    if (usernameAvailable === false) {
      setError("This username is not available. Please choose another.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    // Store username in localStorage so we can set it after signup
    localStorage.setItem("pendingUsername", username.trim().toLowerCase());

    setSubmitting(true);
    try {
      const { error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      if (authError) throw authError;

      setScreen("success");
      setPassword("");
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setSubmitting(true);
    try {
      // Use the current page URL as base for the OAuth redirect
      const redirectTo = Capacitor.isNativePlatform()
        ? 'com.engage.app://auth'
        : window.location.origin + '/auth';
      
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
        },
      });
      if (authError) throw authError;
    } catch (err: any) {
      setError(err.message || "Google sign-in failed");
      setSubmitting(false);
    }
  };

  const switchToLogin = () => {
    setScreen("login");
    setError("");
  };

  const switchToSignUp = () => {
    setScreen("signup");
    setError("");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex-1 flex items-center justify-center px-8">
        <div className="w-full max-w-[350px]">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div
              className="cursor-pointer flex flex-col items-center"
              onClick={() => navigate("/")}
            >
              <EngageLogo size="md" showText />
            </div>
          </div>

          {/* Border card */}
          <div className="border border-border rounded-sm p-10">
            {screen === "login" && (
              <>
                <h1 className="text-[17px] font-[500] text-center mb-6 tracking-tight">
                  Log in
                </h1>

                <form onSubmit={handleLogin} className="space-y-2">
                  <div className="relative">
                    <input
                      type="text"
                      value={loginInput}
                      onChange={(e) => setLoginInput(e.target.value)}
                      placeholder="Email"
                      autoComplete="email"
                      className="w-full h-[38px] px-2 text-xs bg-secondary rounded-[3px] border border-border outline-none focus:border-foreground/50 transition-colors placeholder:text-muted-foreground/70"
                    />
                  </div>

                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      autoComplete="current-password"
                      className="w-full h-[38px] px-2 pr-8 text-xs bg-secondary rounded-[3px] border border-border outline-none focus:border-foreground/50 transition-colors placeholder:text-muted-foreground/70"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>

                  {error && (
                    <p className="text-xs text-destructive text-center pt-1">{error}</p>
                  )}

                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full h-[30px] bg-[#0095F6] hover:bg-[#1877F2] text-white rounded-lg text-[13px] font-semibold mt-2"
                  >
                    {submitting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      "Log in"
                    )}
                  </Button>

                  <div className="flex items-center gap-4 my-3">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-[11px] text-muted-foreground font-[500] uppercase">OR</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>

                  {/* Google sign-in */}
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={submitting}
                    className="w-full h-[36px] bg-white hover:bg-gray-50 text-[#3C4043] border border-border rounded-lg text-[13px] font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    {submitting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      "Continue with Google"
                    )}
                  </button>
                </form>
              </>
            )}

            {screen === "signup" && (
              <>
                <div className="text-center mb-4">
                  <h1 className="text-[17px] font-[500] tracking-tight mb-1">
                    Create account
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    Sign up to see photos and videos from your friends.
                  </p>
                </div>

                <form onSubmit={handleSignUp} className="space-y-2">
                  <div className="relative">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email"
                      autoComplete="email"
                      className="w-full h-[38px] px-2 text-xs bg-secondary rounded-[3px] border border-border outline-none focus:border-foreground/50 transition-colors placeholder:text-muted-foreground/70"
                    />
                  </div>

                  <div className="relative">
                    <div className="relative">
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => handleUsernameChange(e.target.value)}
                        placeholder="Username"
                        autoComplete="off"
                        className={`w-full h-[38px] px-2 text-xs bg-secondary rounded-[3px] border outline-none focus:border-foreground/50 transition-colors placeholder:text-muted-foreground/70 ${
                          username && username.length >= 1
                            ? usernameAvailable === true
                              ? "border-green-500/50"
                              : usernameAvailable === false
                              ? "border-red-500/50"
                              : "border-border"
                            : "border-border"
                        }`}
                      />
                      {username && username.length >= 1 && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2">
                          {checkingUsername ? (
                            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                          ) : usernameAvailable === true ? (
                            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-green-500" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                          ) : usernameAvailable === false ? (
                            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-red-500" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                          ) : null}
                        </div>
                      )}
                    </div>
                    {username && username.length >= 1 && usernameAvailable === false && (
                      <p className="text-[10px] text-red-500 mt-0.5">This username is not available</p>
                    )}
                    {username && username.length >= 1 && usernameAvailable === true && (
                      <p className="text-[10px] text-green-600 mt-0.5">Username available!</p>
                    )}
                    {username.length === 0 && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">Letters, numbers, periods, and underscores</p>
                    )}
                  </div>

                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      autoComplete="new-password"
                      className="w-full h-[38px] px-2 pr-8 text-xs bg-secondary rounded-[3px] border border-border outline-none focus:border-foreground/50 transition-colors placeholder:text-muted-foreground/70"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>

                  {error && (
                    <p className="text-xs text-destructive text-center pt-1">{error}</p>
                  )}

                  <p className="text-[11px] text-muted-foreground text-center mt-2">
                    People who use our service may have uploaded your contact information.{" "}
                    <a href="#" className="text-[#385185]">Learn more</a>
                  </p>

                  <p className="text-[11px] text-muted-foreground text-center">
                    By signing up, you agree to our{" "}
                    <a href="#" className="text-[#385185]">Terms</a>,{" "}
                    <a href="#" className="text-[#385185]">Privacy Policy</a> and{" "}
                    <a href="#" className="text-[#385185]">Cookies Policy</a>.
                  </p>

                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full h-[30px] bg-[#0095F6] hover:bg-[#1877F2] text-white rounded-lg text-[13px] font-semibold mt-1"
                  >
                    {submitting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      "Sign up"
                    )}
                  </Button>

                  <div className="flex items-center gap-4 my-3">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-[11px] text-muted-foreground font-[500] uppercase">OR</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>

                  {/* Google sign-up */}
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={submitting}
                    className="w-full h-[36px] bg-white hover:bg-gray-50 text-[#3C4043] border border-border rounded-lg text-[13px] font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    {submitting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      "Continue with Google"
                    )}
                  </button>
                </form>
              </>
            )}

            {screen === "success" && (
              <div className="text-center py-6">
                <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <h1 className="text-[17px] font-[500] tracking-tight mb-2">
                  Check your email!
                </h1>
                <p className="text-xs text-muted-foreground mb-6">
                  We sent a confirmation link to your email. Please check your inbox and click the link to verify your account.
                </p>
                <Button
                  onClick={() => { setScreen("login"); setError(""); }}
                  className="w-full h-[30px] bg-[#0095F6] hover:bg-[#1877F2] text-white rounded-lg text-[13px] font-semibold"
                >
                  Log in
                </Button>
              </div>
            )}
          </div>

          {/* Toggle between login/signup */}
          <div className="border border-border rounded-sm p-5 mt-2 text-center">
            <p className="text-xs text-foreground">
              {screen === "login" ? (
                <>
                  Don't have an account?{" "}
                  <button
                    onClick={switchToSignUp}
                    className="text-[#0095F6] font-[600] text-xs hover:text-[#1877F2] transition-colors"
                  >
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  Have an account?{" "}
                  <button
                    onClick={switchToLogin}
                    className="text-[#0095F6] font-[600] text-xs hover:text-[#1877F2] transition-colors"
                  >
                    Log in
                  </button>
                </>
              )}
            </p>
          </div>

          {/* Footer */}
          <p className="mt-6 text-center text-[11px] text-muted-foreground">
            <a
              href="https://freebuff.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              Built with Freebuff
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
