import { NextResponse } from "next/server";
import { withAuth } from "next-auth/middleware";

export default withAuth(
  function middleware(req) {
    try {
      console.log("Middleware: Processing request for", req.nextUrl.pathname);
      const token = req.nextauth.token;
      console.log("Middleware: Token present:", !!token);
      
      const isAuthenticated = !!token;
      const isAdmin = token?.role === "admin";
      const pathname = req.nextUrl.pathname;

      // Redirect from root to dashboard when authenticated
      if (pathname === "/" && isAuthenticated) {
        console.log("Middleware: Redirecting authenticated user from root to /boards");
        return NextResponse.redirect(new URL("/boards", req.url));
      }

      // Handle protected admin routes
      if (pathname.startsWith("/admin") && !isAdmin) {
        console.log("Middleware: Non-admin user attempted to access admin route");
        return NextResponse.redirect(new URL("/unauthorized", req.url));
      }
      
      console.log("Middleware: Request allowed to proceed");
    } catch (error) {
      console.error("Middleware error:", error);
      // Allow the request to proceed and let the page handle any errors
    }
  },
  {
    callbacks: {
      authorized: ({ token }) => {
        const isAuthorized = !!token;
        console.log("Middleware: Authorization check result:", isAuthorized);
        return isAuthorized;
      },
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