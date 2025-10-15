// File: middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// Define which routes are ALWAYS public (accessible to everyone)
const isPublicRoute = createRouteMatcher([
  '/', 
  '/pricing',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks/clerk',
]);

// Define the admin route
const isAdminRoute = createRouteMatcher(['/admin(.*)']);

export default clerkMiddleware(async (auth, request) => {
  // --- This is the new, simplified logic ---

  // Get the userId. We will need it for all checks.
  const { userId } = await auth();
  
  // 1. Handle Admin Route Security
  if (isAdminRoute(request)) {
    // If the user is not the admin, boot them to the homepage.
    // This also handles the case where userId is null (logged out).
    if (userId !== process.env.ADMIN_USER_ID) {
      const homeUrl = new URL('/', request.url);
      return NextResponse.redirect(homeUrl);
    }
  }
  
  // 2. Handle All Other Protected Routes
  // If the route is NOT public AND the user is NOT logged in...
  if (!isPublicRoute(request) && !isAdminRoute(request) && !userId) {
    // ...redirect them to the sign-in page.
    const signInUrl = new URL('/sign-in', request.url);
    signInUrl.searchParams.set('redirect_url', request.url);
    return NextResponse.redirect(signInUrl);
  }

  // If none of the above conditions are met, allow the request to proceed.
  return NextResponse.next();
});

export const config = {
  matcher: [ '/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
};