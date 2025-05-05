import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import CreateBoardButton from "@/components/create-board-button";
import pkg from 'pg';
const { Client } = pkg;

export const dynamic = 'force-dynamic'; // Disable caching for this page
export const fetchCache = 'force-no-store'; // Disable fetch caching
export const revalidate = 0; // Disable revalidation

export default async function BoardsPage() {
  console.log("Boards: Page rendering started");
  
  try {
    const session = await getServerSession(authOptions);
    console.log("Boards: Session fetched", { hasUser: !!session?.user });
    
    if (!session?.user) {
      console.log("Boards: No session found, redirecting to login");
      redirect("/login");
    }
    
    console.log("Boards: Session user:", JSON.stringify(session.user));
    
    let userBoards = [];
    
    try {
      // Using direct pg connection for reliability
      const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
      
      if (!connectionString) {
        throw new Error("Database connection string is missing");
      }
      
      console.log("Boards: Connecting to database...");
      const client = new Client({ 
        connectionString,
        ssl: { rejectUnauthorized: false } // Important for Vercel deployment
      });
      
      try {
        await client.connect();
        console.log("Boards: Connected to database successfully");
        
        // Get user's boards - ensure we handle the ID correctly
        const userId = session.user.id;
        console.log("Boards: Fetching boards for user ID:", userId);
        
        // Try to handle both string and number IDs
        const result = await client.query(
          'SELECT * FROM boards WHERE user_id = $1 ORDER BY created_at DESC',
          [userId] // Use the ID directly without parsing
        );
        
        console.log(`Boards: Found ${result.rows.length} boards for user`);
        userBoards = result.rows;
      } catch (dbError) {
        console.error("Boards: Database query error:", dbError);
        throw dbError; // Re-throw to be caught by the outer try-catch
      } finally {
        try {
          await client.end();
          console.log("Boards: Database connection closed");
        } catch (closeError) {
          console.error("Boards: Error closing database connection:", closeError);
        }
      }
    } catch (error) {
      console.error("Boards: Error fetching boards:", error);
      // Continue with empty boards array if there's an error
    }
    
    console.log("Boards: Rendering boards page with", userBoards.length, "boards");
    return (
      <div>
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-black">My Boards</h1>
          <CreateBoardButton userId={session.user.id} />
        </div>
        
        {userBoards.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <h3 className="text-lg font-semibold mb-2">No boards yet</h3>
            <p className="text-gray-800 mb-6">
              Create your first board to get started with task management
            </p>
            <CreateBoardButton userId={session.user.id} variant="primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {userBoards.map((board) => (
              <Link
                key={board.id}
                href={`/boards/${board.id}`}
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
              >
                <h3 className="text-lg font-semibold mb-2 truncate text-black">{board.name}</h3>
                {board.description && (
                  <p className="text-gray-800 mb-4 line-clamp-2">{board.description}</p>
                )}
                <div className="text-sm text-gray-700">
                  Created {new Date(board.created_at).toLocaleDateString()}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  } catch (error) {
    console.error("Boards: Unhandled error in BoardsPage:", error);
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <h3 className="text-lg font-semibold mb-2 text-red-600">Error Loading Boards</h3>
        <p className="text-gray-800 mb-6">
          There was an error loading your boards. Please try again later.
        </p>
        <div className="text-sm text-gray-500 mt-4">
          Error details: {error instanceof Error ? error.message : String(error)}
        </div>
      </div>
    );
  }

  // No duplicate return statement needed - it's already in the try block
}