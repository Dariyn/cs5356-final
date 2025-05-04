import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pkg from 'pg';
const { Client } = pkg;
import { z } from "zod";

const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().optional(),
  column_id: z.number().int().positive(),
  due_date: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const body = await req.json();
    console.log("Task creation request body:", body);
    
    // Validate input
    const result = createTaskSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { message: "Invalid input data", errors: result.error.errors },
        { status: 400 }
      );
    }
    
    const { title, description, column_id, due_date } = result.data;
    
    // Using direct pg connection for reliability
    const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("Database connection string is missing");
    }
    
    const client = new Client({ connectionString });
    await client.connect();
    
    try {
      // Check if column exists and user has access to it
      const columnResult = await client.query(
        `SELECT c.*, b.user_id 
         FROM columns c
         JOIN boards b ON c.board_id = b.id
         WHERE c.id = $1`,
        [column_id]
      );
      
      const column = columnResult.rows[0];
      
      if (!column) {
        await client.end();
        return NextResponse.json(
          { message: "Column not found" },
          { status: 404 }
        );
      }
      
      // Verify the user owns the board containing this column
      if (column.user_id !== parseInt(session.user.id)) {
        await client.end();
        return NextResponse.json(
          { message: "Unauthorized: You don't have access to this board" },
          { status: 403 }
        );
      }
      
      // Get the max position in the column to place new task at the end
      const maxPositionResult = await client.query(
        'SELECT MAX(position) as max_position FROM tasks WHERE column_id = $1',
        [column_id]
      );
      
      const maxPosition = maxPositionResult.rows[0].max_position || -1;
      const newPosition = maxPosition + 1;
      
      // Create the task
      const newTaskResult = await client.query(
        `INSERT INTO tasks (title, description, column_id, position, due_date, is_completed)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [title, description, column_id, newPosition, due_date ? new Date(due_date) : null, false]
      );
      
      const newTask = newTaskResult.rows[0];
      await client.end();
      
      return NextResponse.json(
        { message: "Task created successfully", task: newTask },
        { status: 201 }
      );
    } catch (error) {
      await client.end();
      throw error;
    }
  } catch (error) {
    console.error("Task creation error:", error);
    return NextResponse.json(
      { message: "Something went wrong", error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 