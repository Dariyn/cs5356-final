import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pkg from 'pg';
const { Client } = pkg;

// Disable all caching for this route
export const fetchCache = 'force-no-store';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Handler for updating a task (PATCH)
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Extract the ID from the URL path
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/');
    const idIndex = pathSegments.findIndex(segment => segment === 'tasks') + 1;
    const id = pathSegments[idIndex] || '';
    const taskId = parseInt(id);
    
    if (isNaN(taskId)) {
      return NextResponse.json(
        { message: "Invalid task ID" },
        { status: 400 }
      );
    }

    const data = await request.json();
    const { title, description } = data;

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
        `SELECT t.id, t.column_id, c.board_id, b.user_id 
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

      // Update the task
      const updateResult = await client.query(
        `UPDATE tasks 
         SET title = $1, description = $2 
         WHERE id = $3 
         RETURNING *`,
        [title, description || null, taskId]
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
          message: "Task updated successfully",
          task: updateResult.rows[0]
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
    console.error("Error updating task:", error);
    return NextResponse.json(
      { message: "Something went wrong", error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// Handler for deleting a task (DELETE)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Extract the ID from the URL path
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/');
    const idIndex = pathSegments.findIndex(segment => segment === 'tasks') + 1;
    const id = pathSegments[idIndex] || '';
    const taskId = parseInt(id);
    
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
        `SELECT t.id, t.column_id, c.board_id, b.user_id 
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
          { message: "You don't have permission to delete this task" },
          { status: 403 }
        );
      }

      // Delete the task
      await client.query(
        `DELETE FROM tasks WHERE id = $1`,
        [taskId]
      );

      // After deleting, reorder the remaining tasks in the column
      await client.query(
        `UPDATE tasks 
         SET position = position - 1 
         WHERE column_id = $1 AND position > (SELECT position FROM tasks WHERE id = $2)`,
        [task.column_id, taskId]
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
          message: "Task deleted successfully"
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
    console.error("Error deleting task:", error);
    return NextResponse.json(
      { message: "Something went wrong", error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 