import { NextResponse } from "next/server";
import { withAuth } from "next-auth/middleware";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isAuthenticated = !!token;
    const isAdmin = token?.role === "admin";
    const pathname = req.nextUrl.pathname;

    // Redirect from root to dashboard when authenticated
    if (pathname === "/" && isAuthenticated) {
      return NextResponse.redirect(new URL("/boards", req.url));
    }

    // Handle protected admin routes
    if (pathname.startsWith("/admin") && !isAdmin) {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

// See https://nextjs.org/docs/app/building-your-application/routing/middleware
export const config = {
  matcher: [
    // Protected routes that require authentication
    "/boards/:path*",
    "/admin/:path*",
    // Public routes that don't require authentication
    "/((?!api|_next/static|_next/image|favicon.ico|login|register|unauthorized).*)",
  ],
}; 