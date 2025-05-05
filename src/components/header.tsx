"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useState } from "react";

export default function Header() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const isAuthenticated = status === "authenticated";
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Debug session information
  console.log("Header - User session:", session?.user);
  
  // Check if the user is an admin
  const isAdmin = session?.user?.role === "admin";

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <header className="bg-white border-b border-gray-200 py-4 px-6">
      <div className="flex justify-between items-center max-w-7xl mx-auto">
        <div className="flex items-center space-x-1">
          <Link 
            href="/" 
            className="text-lg font-bold text-gray-900 hover:text-gray-700"
          >
              <div className="header-gradient rounded-md py-2 px-3 text-white">
              Kanban Board
            </div>          
          </Link>
        </div>

        {/* Desktop Navigation */}
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

        {/* Mobile Menu Button */}
        <button 
          onClick={toggleMobileMenu} 
          className="md:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          aria-label="Toggle mobile menu"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
          </svg>
        </button>

        {/* Desktop User Info / Auth Links */}
        <div className="hidden md:flex items-center space-x-4">
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

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden mt-4 pb-2 border-t border-gray-200 pt-4">
          <div className="flex flex-col space-y-4">
            {isAuthenticated && (
              <>
                <Link
                  href="/boards"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    pathname.startsWith("/boards")
                      ? "bg-blue-50 text-blue-600"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  My Boards
                </Link>
                {isAdmin && (
                  <Link
                    href="/admin"
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      pathname.startsWith("/admin")
                        ? "bg-blue-50 text-blue-600"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Admin
                  </Link>
                )}
              </>
            )}

            {/* Mobile User Info / Auth Links */}
            <div className="border-t border-gray-200 pt-4 mt-2">
              {isAuthenticated ? (
                <div className="flex flex-col space-y-3 px-3">
                  <div className="text-sm text-gray-700">
                    {session.user?.name || session.user?.email} 
                    {isAdmin && <span className="ml-1 text-xs text-purple-600">(Admin)</span>}
                  </div>
                  <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="text-left text-sm font-medium text-red-600 hover:text-red-700"
                  >
                    Sign out
                  </button>
                </div>
              ) : (
                <div className="flex flex-col space-y-3 px-3">
                  <Link
                    href="/login"
                    className="text-sm font-medium text-gray-600 hover:text-gray-900"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/register"
                    className="text-sm font-medium bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 inline-block text-center"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Sign up
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
} 