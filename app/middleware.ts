// File: middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// Define which routes do not require authentication
const isPublicRoute = createRouteMatcher([
  '/', // Make the homepage public
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks/clerk', // The webhook must be public
]);

// The middleware function is async
export default clerkMiddleware(async (auth, request) => {
  // If the route is not public, we perform a check
  if (!isPublicRoute(request)) {
    // Get the user ID
    const { userId } = await auth();

    // If there is no user ID, it means the user is not signed in.
    // Redirect them to the sign-in page.
    if (!userId) {
      const signInUrl = new URL('/sign-in', request.url);
      signInUrl.searchParams.set('redirect_url', request.url);
      return NextResponse.redirect(signInUrl);
    }
  }

  // If the route is public or the user is signed in, allow the request to proceed.
  return NextResponse.next();
});

export const config = {
  // This config tells Next.js to run the middleware on all routes except for static files
  matcher: [ '/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
};