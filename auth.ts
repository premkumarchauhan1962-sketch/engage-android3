// Clerk authentication is integrated via:
// 1. Frontend: ClerkProvider + ConvexProviderWithClerk (main.tsx)
// 2. Backend: JWT validation via Convex Dashboard → Auth → Add JWT Provider
//    Issuer URL: https://{your-clerk-domain}.clerk.accounts.dev
// 3. User lookup: use getCurrentUser (queries) or ensureCurrentUser (mutations) from ./users

export { getCurrentUser, ensureCurrentUser } from "./users";
