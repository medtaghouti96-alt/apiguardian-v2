// File: middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// Define which routes do not require a signed-in user session
const isPublicRoute = createRouteMatcher([
  '/', 
  '/pricing',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/(.*)' // <-- THE FIX: Make all API routes public
]);

// Define the admin route separately for its special check
const isAdminRoute = createRouteMatcher(['/admin(.*)']);

export default clerkMiddleware(async (auth, request) => {
  const { userId } = await auth();
  
  // Handle Admin Route Security
  if (isAdminRoute(request)) {
    if (userId !== process.env.ADMIN_USER_ID) {
      const homeUrl = new URL('/', request.url);
      return NextResponse.redirect(homeUrl);
    }
  }
  
  // Handle All Other Protected Routes (e.g., /dashboard)
  // If the route is NOT public AND the user is NOT logged in...
  if (!isPublicRoute(request) && !isAdminRoute(request) && !userId) {
    // ...redirect them to the sign-in page.
    const signInUrl = new URL('/sign-in', request.url);
    signInUrl.searchParams.set('redirect_url', request.url);
    return NextResponse.redirect(signInUrl);
  }

  // If all checks pass, allow the request to proceed.
  return NextResponse.next();
});

export const config = {
  matcher: [ '/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
};