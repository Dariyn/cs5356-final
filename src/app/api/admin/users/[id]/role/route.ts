import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pkg from 'pg';
const { Client } = pkg;
import { z } from "zod";

const roleUpdateSchema = z.object({
  role: z.string().refine((val) => ["user", "admin"].includes(val), {
    message: "Role must be either 'user' or 'admin'",
  }),
});

// Define the handler using the correct Next.js App Router pattern
export async function PATCH(
  request: NextRequest,
  // Use the exact type that Next.js expects
  context: { params: Record<string, string> }
) {
  const { id } = context.params;
  try {
    const session = await getServerSession(authOptions);
    
    // Check authentication and admin role
    if (!session?.user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // Log the user session for debugging
    console.log("Role update API - User session:", {
      id: session.user.id,
      role: session.user.role
    });
    
    if (session.user.role !== "admin") {
      return NextResponse.json(
        { message: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }
    
    const userId = parseInt(id);
    
    if (isNaN(userId)) {
      return NextResponse.json(
        { message: "Invalid user ID" },
        { status: 400 }
      );
    }
    
    // Prevent admins from changing their own role (to prevent losing admin access)
    if (userId === parseInt(session.user.id)) {
      return NextResponse.json(
        { message: "Cannot change your own role" },
        { status: 403 }
      );
    }
    
    // Using direct pg connection for reliability
    const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("Database connection string is missing");
    }
    
    const client = new Client({ connectionString });
    await client.connect();
    
    try {
      // Check if user exists
      const checkUserResult = await client.query(
        'SELECT * FROM users WHERE id = $1',
        [userId]
      );
      
      const existingUser = checkUserResult.rows[0];
      
      if (!existingUser) {
        await client.end();
        return NextResponse.json(
          { message: "User not found" },
          { status: 404 }
        );
      }
      
      // Validate and extract role from request body
      const body = await request.json();
      const result = roleUpdateSchema.safeParse(body);
      
      if (!result.success) {
        await client.end();
        return NextResponse.json(
          { message: "Invalid input data", errors: result.error.errors },
          { status: 400 }
        );
      }
      
      const { role } = result.data;
      
      // Update user role
      await client.query(
        'UPDATE users SET role = $1 WHERE id = $2',
        [role, userId]
      );
      
      await client.end();
      
      return NextResponse.json(
        { message: "User role updated successfully" },
        { status: 200 }
      );
    } catch (error) {
      await client.end();
      throw error;
    }
  } catch (error) {
    console.error("Error updating user role:", error);
    return NextResponse.json(
      { message: "Something went wrong", error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 