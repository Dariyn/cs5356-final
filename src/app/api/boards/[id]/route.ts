import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pkg from 'pg';
const { Client } = pkg;

// GET handler to retrieve a specific board
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const boardId = params.id;
    if (!boardId) {
      return NextResponse.json(
        { message: "Board ID is required" },
        { status: 400 }
      );
    }
    
    const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!connectionString) {
      throw new Error("Database connection string is missing");
    }
    
    const client = new Client({ 
      connectionString,
      ssl: { rejectUnauthorized: false } // Important for Vercel deployment
    });
    await client.connect();
    
    try {
      // Check if the user has access to this board
      // For admins, allow access to any board
      let boardQuery;
      let queryParams;
      
      if (session.user.role === 'admin') {
        boardQuery = 'SELECT * FROM boards WHERE id = $1';
        queryParams = [boardId];
      } else {
        boardQuery = 'SELECT * FROM boards WHERE id = $1 AND user_id = $2';
        queryParams = [boardId, session.user.id];
      }
      
      const result = await client.query(boardQuery, queryParams);
      
      if (result.rows.length === 0) {
        return NextResponse.json(
          { message: "Board not found or access denied" },
          { status: 404 }
        );
      }
      
      return NextResponse.json(result.rows[0]);
    } finally {
      await client.end();
    }
  } catch (error) {
    console.error("Error retrieving board:", error);
    return NextResponse.json(
      { message: "Something went wrong", error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// DELETE handler to delete a board
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const boardId = params.id;
    if (!boardId) {
      return NextResponse.json(
        { message: "Board ID is required" },
        { status: 400 }
      );
    }
    
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
      console.log("Board Delete API: Connected to database successfully");
      
      // Check if the user has access to delete this board
      // Admins can delete any board, regular users can only delete their own
      let boardQuery;
      let queryParams;
      
      if (session.user.role === 'admin') {
        boardQuery = 'SELECT * FROM boards WHERE id = $1';
        queryParams = [boardId];
      } else {
        boardQuery = 'SELECT * FROM boards WHERE id = $1 AND user_id = $2';
        queryParams = [boardId, session.user.id];
      }
      
      const checkResult = await client.query(boardQuery, queryParams);
      
      if (checkResult.rows.length === 0) {
        return NextResponse.json(
          { message: "Board not found or you don't have permission to delete it" },
          { status: 404 }
        );
      }
      
      // Start transaction
      await client.query('BEGIN');
      
      try {
        // Due to cascade delete in the schema, deleting the board will also delete
        // all associated columns and tasks
        const deleteResult = await client.query(
          'DELETE FROM boards WHERE id = $1 RETURNING *',
          [boardId]
        );
        
        // Commit transaction
        await client.query('COMMIT');
        
        return NextResponse.json({
          message: "Board deleted successfully",
          board: deleteResult.rows[0]
        });
      } catch (error) {
        // Rollback transaction on error
        await client.query('ROLLBACK');
        throw error;
      }
    } finally {
      await client.end();
      console.log("Board Delete API: Database connection closed");
    }
  } catch (error) {
    console.error("Error deleting board:", error);
    return NextResponse.json(
      { message: "Failed to delete board", error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
