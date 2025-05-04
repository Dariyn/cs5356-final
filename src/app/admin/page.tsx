import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import UserList from "@/components/user-list";
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
  
  try {
    // Using direct pg connection for reliability
    const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("Database connection string is missing");
    }
    
    const client = new Client({ connectionString });
    await client.connect();
    
    // Get all users
    const result = await client.query(
      'SELECT * FROM users ORDER BY email ASC'
    );
    
    allUsers = result.rows;
    await client.end();
  } catch (error) {
    console.error("Error fetching users:", error);
    // Continue with empty users array if there's an error
  }
  
  return (
    <div>
      <h1 className="text-2xl font-bold mb-8">Admin Dashboard</h1>
      
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-lg font-semibold mb-4">User Management</h2>
        <UserList users={allUsers} currentUserId={parseInt(session.user.id)} />
      </div>
    </div>
  );
} 