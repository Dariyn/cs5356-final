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
  
  // Check if the user is an admin
  const isAdmin = session?.user?.role === "admin";

  return (
    <div className="bg-white border-b border-gray-200 py-4 px-6 relative z-10">
      <div className="flex justify-between items-center max-w-7xl mx-auto">
        <div className="flex items-center space-x-1">
          <Link href="/" className="text-lg font-bold text-gray-900 hover:text-gray-700">
            <div className="header-gradient rounded-md py-2 px-3 text-white">
              Kanban Board
            </div>
          </Link>
        </div>

        {isAuthenticated ? (
          <div className="flex items-center space-x-4">
            <Link href="/boards" className="text-sm font-medium text-gray-600 hover:text-gray-900">
              My Boards
            </Link>
            {isAdmin && (
              <Link href="/admin" className="text-sm font-medium text-gray-600 hover:text-gray-900">
                Admin
              </Link>
            )}
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Sign out
            </button>
          </div>
        ) : (
          <div className="flex items-center space-x-4">
            <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900">
              Sign in
            </Link>
            <Link href="/register" className="text-sm font-medium bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
              Sign up
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
