import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import UserList from "@/components/user-list";
import AdminBoardsSection from "@/components/admin-boards-section";
import pkg from 'pg';
const { Client } = pkg;

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect("/login");
  }
  
  // Log the user session to help debug
  console.log("Admin page - User session:", {
    id: session.user.id,
    role: session.user.role
  });
  
  if (session.user.role !== "admin") {
    redirect("/unauthorized");
  }
  
  let allUsers = [];
  let userBoards = [];
  
  try {
    // Using direct pg connection for reliability
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
      console.log("Admin: Connected to database successfully");
      
      // Get all users
      const usersResult = await client.query(
        'SELECT * FROM users ORDER BY email ASC'
      );
      
      allUsers = usersResult.rows;
      
      // Get all boards with user information
      const boardsResult = await client.query(
        `SELECT b.*, u.name as user_name, u.email as user_email 
         FROM boards b 
         JOIN users u ON b.user_id = u.id 
         ORDER BY u.email ASC, b.created_at DESC`
      );
      
      userBoards = boardsResult.rows;
      console.log(`Admin: Found ${userBoards.length} boards across all users`);
    } catch (dbError) {
      console.error("Admin: Database query error:", dbError);
      throw dbError;
    } finally {
      try {
        await client.end();
        console.log("Admin: Database connection closed");
      } catch (closeError) {
        console.error("Admin: Error closing database connection:", closeError);
      }
    }
  } catch (error) {
    console.error("Admin: Error fetching data:", error);
    // Continue with empty arrays if there's an error
  }
  
  return (
    <div>
      <h1 className="text-2xl font-bold mb-8 text-gray-900">Admin Dashboard</h1>
      
      <div className="space-y-8">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold mb-4 text-gray-900">User Management</h2>
          <UserList users={allUsers} currentUserId={parseInt(session.user.id)} />
        </div>
        
        <AdminBoardsSection boards={userBoards} adminId={parseInt(session.user.id)} />
      </div>
    </div>
  );
}