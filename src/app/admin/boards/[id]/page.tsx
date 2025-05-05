import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import pkg from 'pg';
const { Client } = pkg;

import BoardHeader from "@/components/board-header";
import ClientDndProvider from "@/components/client-dnd-provider";

// Disable all caching for this route
export const fetchCache = 'force-no-store';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PageProps = {
  params: { id: string };
  searchParams: { [key: string]: string | string[] | undefined };
};

export default async function AdminBoardPage({ params, searchParams }: PageProps) {
  // Get the board ID from the URL
  const boardId = params?.id;
  
  // Safety check to ensure we have a valid ID
  if (!boardId) {
    redirect("/admin");
  }

  // Verify the user is authenticated and is an admin
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }
  
  // Check if user has admin role
  if (session.user.role !== "admin") {
    redirect("/unauthorized");
  }

  console.log(`Admin viewing board with ID: ${boardId}`);

  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!connectionString) {
    throw new Error("Database connection string is missing");
  }

  const client = new Client({ 
    connectionString,
    ssl: { rejectUnauthorized: false } // Important for Vercel deployment
  });
  
  try {
    await client.connect();
    console.log("Admin Board: Connected to database successfully");

    // Fetch the board with user information
    const boardResult = await client.query(
      `SELECT b.*, u.name as user_name, u.email as user_email 
       FROM boards b 
       JOIN users u ON b.user_id = u.id 
       WHERE b.id = $1`,
      [boardId]
    );
    
    if (boardResult.rowCount === 0) {
      await client.end();
      redirect("/admin");
    }
    
    const board = boardResult.rows[0];

    // Fetch columns
    const columnsResult = await client.query(
      `SELECT * FROM columns WHERE board_id = $1 ORDER BY position ASC`,
      [boardId]
    );
    const columns = columnsResult.rows;

    // Fetch tasks per column
    const boardWithColumns = {
      ...board,
      columns: await Promise.all(
        columns.map(async (column) => {
          const tasksResult = await client.query(
            `SELECT * FROM tasks WHERE column_id = $1 ORDER BY position ASC`,
            [column.id]
          );
          return {
            ...column,
            tasks: tasksResult.rows,
          };
        })
      ),
    };

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Link 
              href="/admin" 
              className="text-blue-600 hover:text-blue-800 flex items-center mb-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Admin Dashboard
            </Link>
            <h1 className="text-2xl font-bold">{board.name}</h1>
            <p className="text-sm text-gray-600">
              Owner: {board.user_name || 'Unknown'} ({board.user_email})
            </p>
          </div>
          <div className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
            Admin View
          </div>
        </div>
        
        <BoardHeader board={board} />
        <ClientDndProvider board={boardWithColumns} />
      </div>
    );
  } catch (error) {
    console.error("Admin Board: Error fetching board data:", error);
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <h3 className="text-lg font-semibold mb-2 text-red-600">Error Loading Board</h3>
        <p className="text-gray-800 mb-6">
          There was an error loading this board. Please try again later.
        </p>
        <div className="text-sm text-gray-500 mt-4">
          Error details: {error instanceof Error ? error.message : String(error)}
        </div>
        <Link 
          href="/admin" 
          className="mt-6 inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Return to Admin Dashboard
        </Link>
      </div>
    );
  } finally {
    try {
      await client.end();
      console.log("Admin Board: Database connection closed");
    } catch (closeError) {
      console.error("Admin Board: Error closing database connection:", closeError);
    }
  }
}
