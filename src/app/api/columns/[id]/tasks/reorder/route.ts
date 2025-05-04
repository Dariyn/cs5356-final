import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pg } from "@/lib/db";

interface ReorderParams {
  id: string;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: ReorderParams }
) {
  try {
    console.log(`Task reorder API called for column ID: ${params.id}`);
    
    const session = await getServerSession(authOptions);

    if (!session) {
      console.log("Task reorder failed: Unauthorized");
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const columnId = parseInt(params.id);
    if (isNaN(columnId)) {
      console.log(`Task reorder failed: Invalid column ID "${params.id}"`);
      return NextResponse.json(
        { message: "Invalid column ID" },
        { status: 400 }
      );
    }

    const body = await request.json();
    console.log("Reorder request body:", body);
    
    const { taskIds } = body;
    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      console.log(`Task reorder failed: Missing or invalid taskIds:`, taskIds);
      return NextResponse.json(
        { message: "Task IDs are required" },
        { status: 400 }
      );
    }

    console.log(`Reordering tasks in column ${columnId}: ${taskIds.join(', ')}`);

    // First check if all tasks belong to this column
    const tasksResult = await pg.query(
      `SELECT id, column_id FROM tasks WHERE id = ANY($1)`,
      [taskIds]
    );

    if (tasksResult.rowCount !== taskIds.length) {
      console.log(`Task reorder failed: Some tasks were not found. 
        Found ${tasksResult.rowCount} out of ${taskIds.length}.`);
      return NextResponse.json(
        { message: "Some tasks were not found" },
        { status: 404 }
      );
    }

    // Check if all tasks belong to the specified column
    const tasksNotInColumn = tasksResult.rows.filter(task => task.column_id !== columnId);
    if (tasksNotInColumn.length > 0) {
      console.log(`Task reorder failed: Tasks in wrong column. 
        Tasks ${tasksNotInColumn.map(t => t.id).join(', ')} don't belong to column ${columnId}`);
      return NextResponse.json(
        { message: "Some tasks do not belong to this column" },
        { status: 400 }
      );
    }

    // Reorder tasks
    const client = await pg.connect();
    console.log("Connected to database for transaction");

    try {
      // Start transaction
      await client.query('BEGIN');
      console.log("Transaction started");
      
      // Update each task with its new position
      for (let i = 0; i < taskIds.length; i++) {
        console.log(`Setting task ${taskIds[i]} to position ${i}`);
        await client.query(
          `UPDATE tasks SET position = $1 WHERE id = $2`,
          [i, taskIds[i]]
        );
      }
      
      // Commit transaction
      await client.query('COMMIT');
      console.log("Transaction committed successfully");
    } catch (error) {
      // Rollback in case of error
      await client.query('ROLLBACK');
      console.log("Transaction rolled back due to error");
      throw error;
    } finally {
      client.release();
      console.log("Database connection released");
    }

    console.log("Task reordering completed successfully");
    return NextResponse.json(
      { 
        message: "Tasks reordered successfully",
        taskIds: taskIds
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("Error reordering tasks:", error);
    return NextResponse.json(
      { 
        message: "An error occurred while reordering tasks", 
        error: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
} 