// File: middleware.ts
import { clerkMiddleware } from '@clerk/nextjs/server';

// This is the simplest possible middleware. It runs on every request
// and sets up the Clerk authentication context, but it doesn't protect any routes yet.
export default clerkMiddleware();

export const config = {
  matcher: [
    // Match all routes except for static assets
    '/((?!.*\\..*|_next).*)', 
    '/', 
    '/(api|trpc)(.*)'
  ],
};