import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pkg from 'pg';
const { Client } = pkg;

// Disable all caching for this route
export const fetchCache = 'force-no-store';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function PATCH(
  req: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // Fix the sync-dynamic-apis warning by accessing params through context destructuring
    const taskId = parseInt(context.params.id);
    
    if (isNaN(taskId)) {
      return NextResponse.json(
        { message: "Invalid task ID" },
        { status: 400 }
      );
    }

    // Connect to PostgreSQL directly
    const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("Database connection string is missing");
    }
    
    const client = new Client({ connectionString });
    await client.connect();
    
    try {
      // Start transaction
      await client.query('BEGIN');
      
      // First, check if the task exists and if the user has access to it
      const taskResult = await client.query(
        `SELECT t.id, t.column_id, c.board_id, b.user_id, t.is_completed
         FROM tasks t 
         JOIN columns c ON t.column_id = c.id 
         JOIN boards b ON c.board_id = b.id
         WHERE t.id = $1`,
        [taskId]
      );

      if (taskResult.rowCount === 0) {
        await client.query('ROLLBACK');
        await client.end();
        console.log(`Task ${taskId} not found`);
        return NextResponse.json(
          { message: "Task not found" },
          { status: 404 }
        );
      }

      const task = taskResult.rows[0];
      
      // Check if the logged-in user owns the board
      if (task.user_id !== parseInt(session.user.id)) {
        await client.query('ROLLBACK');
        await client.end();
        console.log(`User ${session.user.id} does not have access to task ${taskId}`);
        return NextResponse.json(
          { message: "You don't have permission to update this task" },
          { status: 403 }
        );
      }

      // Toggle the isCompleted status
      const updatedResult = await client.query(
        `UPDATE tasks 
         SET is_completed = $1
         WHERE id = $2 
         RETURNING *`,
        [!task.is_completed, taskId]
      );

      await client.query('COMMIT');
      
      // Set cache control headers to prevent caching
      const headers = new Headers();
      headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      headers.set('Pragma', 'no-cache');
      headers.set('Expires', '0');
      headers.set('Surrogate-Control', 'no-store');

      return NextResponse.json(
        {
          message: "Task completion toggled successfully",
          task: updatedResult.rows[0]
        },
        {
          status: 200,
          headers: headers
        }
      );
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      await client.end();
    }
  } catch (error) {
    console.error("Error toggling task completion:", error);
    return NextResponse.json(
      { message: "Something went wrong", error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 