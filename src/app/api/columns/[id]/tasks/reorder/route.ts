import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pkg from 'pg';
const { Client } = pkg;

// Disable all caching for this route
export const fetchCache = 'force-no-store';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // Extract the column ID from the URL path
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/');
    const idIndex = pathSegments.findIndex(segment => segment === 'columns') + 2; // changed to +2
    const columnId = parseInt(pathSegments[idIndex] || '0');
    
    if (isNaN(columnId)) {
      return NextResponse.json(
        { message: "Invalid column ID" },
        { status: 400 }
      );
    }

    // Get the taskIds from the request body
    const data = await request.json();
    const { taskIds } = data;
    
    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return NextResponse.json(
        { message: "taskIds must be a non-empty array" },
        { status: 400 }
      );
    }

    console.log(`Reordering tasks in column ${columnId} with task IDs: ${taskIds.join(', ')}`);

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
      
      // First, check if the column exists and if the user has access to it
      const columnResult = await client.query(
        `SELECT c.id, c.board_id, b.user_id 
         FROM columns c 
         JOIN boards b ON c.board_id = b.id
         WHERE c.id = $1`,
        [columnId]
      );

      if (columnResult.rowCount === 0) {
        await client.query('ROLLBACK');
        await client.end();
        console.log(`Column ${columnId} not found`);
        return NextResponse.json(
          { message: "Column not found" },
          { status: 404 }
        );
      }

      const column = columnResult.rows[0];
      
      // Check if the logged-in user owns the board
      if (column.user_id !== parseInt(session.user.id)) {
        await client.query('ROLLBACK');
        await client.end();
        console.log(`User ${session.user.id} does not have access to column ${columnId}`);
        return NextResponse.json(
          { message: "You don't have permission to reorder tasks in this column" },
          { status: 403 }
        );
      }

      // Verify that all tasks belong to this column
      const tasksResult = await client.query(
        `SELECT id, column_id FROM tasks WHERE id = ANY($1)`,
        [taskIds]
      );

      // Check if we found all tasks
      if (tasksResult.rowCount !== taskIds.length) {
        await client.query('ROLLBACK');
        await client.end();
        console.log(`Some tasks were not found`);
        return NextResponse.json(
          { message: "Some tasks were not found" },
          { status: 400 }
        );
      }

      // Check if all tasks belong to the specified column
      const invalidTasks = tasksResult.rows.filter(task => task.column_id !== columnId);
      if (invalidTasks.length > 0) {
        await client.query('ROLLBACK');
        await client.end();
        console.log(`Some tasks do not belong to column ${columnId}`);
        return NextResponse.json(
          { message: "Some tasks do not belong to this column" },
          { status: 400 }
        );
      }

      // Update the position of each task
      for (let i = 0; i < taskIds.length; i++) {
        await client.query(
          `UPDATE tasks SET position = $1 WHERE id = $2`,
          [i, taskIds[i]]
        );
      }

      // Commit the transaction
      await client.query('COMMIT');
      
      // Set cache control headers to prevent caching
      const headers = new Headers();
      headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      headers.set('Pragma', 'no-cache');
      headers.set('Expires', '0');
      headers.set('Surrogate-Control', 'no-store');

      return NextResponse.json(
        {
          message: "Tasks reordered successfully"
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
    console.error("Error reordering tasks:", error);
    return NextResponse.json(
      { message: "Something went wrong", error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 