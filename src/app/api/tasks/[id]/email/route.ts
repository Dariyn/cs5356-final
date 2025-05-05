import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pkg from 'pg';
import nodemailer from 'nodemailer';
const { Client } = pkg;

// Disable all caching for this route
export const fetchCache = 'force-no-store';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // Extract the ID from the URL path
    const url = new URL(req.url);
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
      // First, check if the task exists and if the user has access to it
      const taskResult = await client.query(
        `SELECT t.*, c.name as column_name, b.name as board_name
         FROM tasks t 
         JOIN columns c ON t.column_id = c.id 
         JOIN boards b ON c.board_id = b.id
         WHERE t.id = $1`,
        [taskId]
      );

      if (taskResult.rowCount === 0) {
        await client.end();
        return NextResponse.json(
          { message: "Task not found" },
          { status: 404 }
        );
      }

      const task = taskResult.rows[0];
      
      // Get user's email address
      const userResult = await client.query(
        `SELECT email, name FROM users WHERE id = $1`,
        [session.user.id]
      );
      
      if (userResult.rowCount === 0) {
        await client.end();
        return NextResponse.json(
          { message: "User not found" },
          { status: 404 }
        );
      }
      
      const user = userResult.rows[0];
      
      // Configure nodemailer with a test account
      // In production, you would use your actual SMTP credentials
      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.ethereal.email',
        port: parseInt(process.env.EMAIL_PORT || '587'),
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
          user: process.env.EMAIL_USER || 'test@example.com',
          pass: process.env.EMAIL_PASSWORD || 'password',
        },
      });
      
      // Format the email content
      const emailSubject = `Task Notification: ${task.title}`;
      const status = task.is_completed ? 'Completed' : 'Pending';
      const dueDate = task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date';
      
      const emailBody = `
        <h1>Task Notification</h1>
        <p>Hello ${user.name || user.email},</p>
        <p>Here's a notification about your task:</p>
        <ul>
          <li><strong>Board:</strong> ${task.board_name}</li>
          <li><strong>Column:</strong> ${task.column_name}</li>
          <li><strong>Task:</strong> ${task.title}</li>
          <li><strong>Description:</strong> ${task.description || 'No description'}</li>
          <li><strong>Status:</strong> ${status}</li>
          <li><strong>Due Date:</strong> ${dueDate}</li>
        </ul>
        <p>You can view this task in your Kanban board.</p>
        <p>Thank you for using our Kanban Board application!</p>
      `;
      
      // Send the email
      const info = await transporter.sendMail({
        from: process.env.EMAIL_FROM || '"Kanban Board" <kanban@example.com>',
        to: user.email,
        subject: emailSubject,
        html: emailBody,
      });
      
      console.log('Email sent: %s', info.messageId);
      
      // For development purposes, if using Ethereal, log the preview URL
      if (info.ethereal) {
        console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
      }
      
      return NextResponse.json(
        {
          message: "Email notification sent successfully",
          emailId: info.messageId,
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
      await client.end();
      throw error;
    }
  } catch (error) {
    console.error("Error sending email notification:", error);
    return NextResponse.json(
      { message: "Failed to send email notification", error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 