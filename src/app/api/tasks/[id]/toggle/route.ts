import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { tasks } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(
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
    
    const taskId = parseInt(params.id);
    
    if (isNaN(taskId)) {
      return NextResponse.json(
        { message: "Invalid task ID" },
        { status: 400 }
      );
    }
    
    // Get the task with its column and board to check ownership
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId),
      with: {
        column: {
          with: {
            board: true,
          },
        },
      },
    });
    
    if (!task) {
      return NextResponse.json(
        { message: "Task not found" },
        { status: 404 }
      );
    }
    
    // Verify the user owns the board containing this task
    if (task.column.board.userId !== parseInt(session.user.id)) {
      return NextResponse.json(
        { message: "Unauthorized: You don't have access to this task" },
        { status: 403 }
      );
    }
    
    // Toggle the isCompleted status
    const updatedTask = await db.update(tasks)
      .set({ isCompleted: !task.isCompleted })
      .where(eq(tasks.id, taskId))
      .returning();
    
    return NextResponse.json(
      { 
        message: "Task completion toggled successfully", 
        task: updatedTask[0] 
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error toggling task completion:", error);
    return NextResponse.json(
      { message: "Something went wrong" },
      { status: 500 }
    );
  }
} 