import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
      <p className="text-gray-600 mb-6 max-w-md">
        You don&apos;t have permission to access this page. Please contact an administrator if you believe this is an error.
      </p>
      <Link
        href="/boards"
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Go to My Boards
      </Link>
    </div>
  );
} 