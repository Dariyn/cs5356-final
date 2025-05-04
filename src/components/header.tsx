"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";

export default function Header() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const isAuthenticated = status === "authenticated";
  
  // Debug session information
  console.log("Header - User session:", session?.user);
  
  // Check if the user is an admin
  const isAdmin = session?.user?.role === "admin";

  return (
    <header className="bg-white border-b border-gray-200 py-4 px-6">
      <div className="flex justify-between items-center max-w-7xl mx-auto">
        <div className="flex items-center space-x-1">
          <Link 
            href="/" 
            className="text-lg font-bold text-gray-900 hover:text-gray-700"
          >
            Kanban Board
          </Link>
        </div>

        <nav className="hidden md:flex space-x-8">
          {isAuthenticated && (
            <>
              <Link
                href="/boards"
                className={`text-sm font-medium transition-colors ${
                  pathname.startsWith("/boards")
                    ? "text-blue-600"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                My Boards
              </Link>
              {isAdmin && (
                <Link
                  href="/admin"
                  className={`text-sm font-medium transition-colors ${
                    pathname.startsWith("/admin")
                      ? "text-blue-600"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Admin
                </Link>
              )}
            </>
          )}
        </nav>

        <div className="flex items-center space-x-4">
          {isAuthenticated ? (
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-700">
                {session.user?.name || session.user?.email} 
                {isAdmin && <span className="ml-1 text-xs text-purple-600">(Admin)</span>}
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                Sign out
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-4">
              <Link
                href="/login"
                className="text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="text-sm font-medium bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Sign up
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
} 