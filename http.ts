import { httpRouter } from "convex/server";

const http = httpRouter();

// Clerk authentication routes are handled by Clerk's own endpoints.
// Convex validates Clerk JWTs via the JWT provider configured in auth.config.ts.

export default http;
