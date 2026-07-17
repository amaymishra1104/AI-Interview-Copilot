import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// By default, clerkMiddleware does not protect any routes automatically in v5, 
// so you don't actually need complex regex rules unless you strictly protect them.
// We will leave the homepage open, and just use Clerk components there!

export default clerkMiddleware();

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
