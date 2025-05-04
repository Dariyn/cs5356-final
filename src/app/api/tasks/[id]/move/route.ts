import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pkg from 'pg';
const { Client } = pkg;

// Prevent Next.js from caching this route
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function PATCH(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const id = context.params.id;
    console.log(`Task move API called for task ID: ${id}`);
    
    const session = await getServerSession(authOptions);

    if (!session) {
      console.log("Task move failed: Unauthorized");
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const taskId = parseInt(id);
    if (isNaN(taskId)) {
      console.log(`Task move failed: Invalid task ID "${id}"`);
      return NextResponse.json(
        { message: "Invalid task ID" },
        { status: 400 }
      );
    }

    const body = await request.json();
    console.log("Request body:", body);
    
    const { columnId } = body;
    if (!columnId || isNaN(parseInt(columnId.toString()))) {
      console.log(`Task move failed: Invalid column ID "${columnId}"`);
      return NextResponse.json(
        { message: "Column ID is required" },
        { status: 400 }
      );
    }

    const columnIdInt = parseInt(columnId.toString());
    console.log(`Moving task ${taskId} to column ${columnIdInt}`);

    // Use a direct client connection to ensure transaction integrity
    const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("Database connection string is missing");
    }
    
    const client = new Client({ connectionString });
    await client.connect();
    console.log("Connected to database for task move operation");
    
    try {
      // Start transaction
      await client.query('BEGIN');
      
      // First, get the task to check permissions
      const taskResult = await client.query(
        `SELECT t.id, t.column_id, c.board_id 
         FROM tasks t 
         JOIN columns c ON t.column_id = c.id 
         WHERE t.id = $1`,
        [taskId]
      );

      if (taskResult.rowCount === 0) {
        await client.query('ROLLBACK');
        await client.end();
        console.log(`Task move failed: Task ${taskId} not found`);
        return NextResponse.json(
          { message: "Task not found" },
          { status: 404 }
        );
      }

      const task = taskResult.rows[0];
      console.log(`Current task details:`, task);
      
      // If the task is already in this column, no need to move it
      if (task.column_id === columnIdInt) {
        await client.query('ROLLBACK');
        await client.end();
        console.log(`Task is already in column ${columnIdInt}, no move needed`);
        return NextResponse.json(
          { message: "Task is already in this column" },
          { status: 200 }
        );
      }
      
      // Check if the target column exists and belongs to the same board
      const columnResult = await client.query(
        `SELECT id, board_id FROM columns WHERE id = $1`,
        [columnIdInt]
      );

      if (columnResult.rowCount === 0) {
        await client.query('ROLLBACK');
        await client.end();
        console.log(`Task move failed: Target column ${columnIdInt} not found`);
        return NextResponse.json(
          { message: "Target column not found" },
          { status: 404 }
        );
      }

      const targetColumn = columnResult.rows[0];
      console.log(`Target column details:`, targetColumn);
      
      // Make sure columns belong to the same board
      if (task.board_id !== targetColumn.board_id) {
        await client.query('ROLLBACK');
        await client.end();
        console.log(`Task move failed: Columns are in different boards (${task.board_id} vs ${targetColumn.board_id})`);
        return NextResponse.json(
          { message: "Cannot move task to a column in a different board" },
          { status: 400 }
        );
      }

      // Get the maximum position in the target column
      const positionResult = await client.query(
        `SELECT COALESCE(MAX(position), -1) as max_position FROM tasks WHERE column_id = $1`,
        [columnIdInt]
      );
      
      const maxPosition = positionResult.rows[0].max_position;
      const newPosition = maxPosition + 1;
      console.log(`New position for task: ${newPosition}`);

      // Update the task's column and position
      const updateResult = await client.query(
        `UPDATE tasks SET column_id = $1, position = $2 WHERE id = $3 RETURNING *`,
        [columnIdInt, newPosition, taskId]
      );
      
      if (updateResult.rowCount === 0) {
        await client.query('ROLLBACK');
        await client.end();
        console.log(`Task move failed: Update operation did not affect any rows`);
        return NextResponse.json(
          { message: "Failed to update task" },
          { status: 500 }
        );
      }
      
      const updatedTask = updateResult.rows[0];
      console.log(`Task updated successfully:`, updatedTask);

      // Commit the transaction
      await client.query('COMMIT');
      console.log('Transaction committed successfully');
      
      await client.end();
      console.log('Database connection closed');

      return NextResponse.json(
        { 
          message: "Task moved successfully",
          task: updatedTask
        },
        { 
          status: 200,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'Surrogate-Control': 'no-store'
          }
        }
      );
    } catch (error) {
      // Rollback transaction on error
      await client.query('ROLLBACK');
      await client.end();
      throw error;
    }
  } catch (error) {
    console.error("Error moving task:", error);
    return NextResponse.json(
      { message: "An error occurred while moving the task", error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 