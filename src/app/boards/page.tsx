import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import CreateBoardButton from "@/components/create-board-button";
import pkg from 'pg';
const { Client } = pkg;

export default async function BoardsPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    console.log("No session found, redirecting to login");
    redirect("/login");
  }
  
  console.log("Session user:", session.user);
  
  let userBoards = [];
  
  try {
    // Using direct pg connection for reliability
    const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    
    if (!connectionString) {
      throw new Error("Database connection string is missing");
    }
    
    console.log("Connecting to database with connection string...");
    const client = new Client({ connectionString });
    await client.connect();
    console.log("Connected to database successfully");
    
    // Get user's boards - ensure we handle the ID correctly
    const userId = session.user.id;
    console.log("Fetching boards for user ID:", userId);
    
    // Try to handle both string and number IDs
    const result = await client.query(
      'SELECT * FROM boards WHERE user_id = $1 ORDER BY created_at DESC',
      [userId] // Use the ID directly without parsing
    );
    
    console.log(`Found ${result.rows.length} boards for user`);
    userBoards = result.rows;
    await client.end();
  } catch (error) {
    console.error("Error fetching boards:", error);
    // Continue with empty boards array if there's an error
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">My Boards</h1>
        <CreateBoardButton userId={parseInt(session.user.id)} />
      </div>
      
      {userBoards.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <h3 className="text-lg font-semibold mb-2">No boards yet</h3>
          <p className="text-gray-800 mb-6">
            Create your first board to get started with task management
          </p>
          <CreateBoardButton userId={parseInt(session.user.id)} variant="primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {userBoards.map((board) => (
            <Link
              key={board.id}
              href={`/boards/${board.id}`}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <h3 className="text-lg font-semibold mb-2 truncate">{board.name}</h3>
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
} 