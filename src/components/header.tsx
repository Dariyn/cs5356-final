"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import ThemeToggle from "./theme-toggle";

export default function Header() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const isAuthenticated = status === "authenticated";
  
  // Debug session information
  console.log("Header - User session:", session?.user);
  
  // Check if the user is an admin
  const isAdmin = session?.user?.role === "admin";

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 py-4 px-6">
      <div className="flex justify-between items-center max-w-7xl mx-auto">
        <div className="flex items-center space-x-1">
          <Link 
            href="/" 
            className="text-lg font-bold text-gray-900 dark:text-white hover:text-gray-700 dark:hover:text-gray-300"
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
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                My Boards
              </Link>
              {isAdmin && (
                <Link
                  href="/admin"
                  className={`text-sm font-medium transition-colors ${
                    pathname.startsWith("/admin")
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  Admin
                </Link>
              )}
            </>
          )}
        </nav>

        <div className="flex items-center space-x-4">
          <ThemeToggle />
          
          {isAuthenticated ? (
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-700 dark:text-gray-300">
                {session.user?.name || session.user?.email} 
                {isAdmin && <span className="ml-1 text-xs text-purple-600 dark:text-purple-400">(Admin)</span>}
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                Sign out
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-4">
              <Link
                href="/login"
                className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="text-sm font-medium bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
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