import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import bcrypt from "bcryptjs";
import { z } from "zod";
import pkg from 'pg';
const { Client } = pkg;

const registerSchema = z.object({
  name: z.string().min(2).max(50),
  email: z.string().email(),
  password: z.string().min(6),
});

export async function POST(req: NextRequest) {
  try {
    console.log("Registration endpoint called");
    console.log("Database URL:", process.env.DATABASE_URL);
    console.log("Postgres URL:", process.env.POSTGRES_URL);
    
    const body = await req.json();
    
    // Validate input
    const result = registerSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { message: "Invalid input data", errors: result.error.errors },
        { status: 400 }
      );
    }
    
    const { name, email, password } = result.data;
    
    // Using direct pg connection for reliability
    const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
    console.log("Using connection string:", connectionString);
    
    if (!connectionString) {
      throw new Error("Database connection string is missing");
    }
    
    const client = new Client({ connectionString });
    await client.connect();
    
    // Check if user already exists
    const existingUserResult = await client.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    
    const existingUser = existingUserResult.rows[0];
    
    if (existingUser) {
      await client.end();
      return NextResponse.json(
        { message: "User already exists" },
        { status: 409 }
      );
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const newUserResult = await client.query(
      'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, email, hashedPassword, "user"]
    );
    
    await client.end();
    
    // Return the newly created user (excluding password)
    const newUser = newUserResult.rows[0];
    const { password: _, ...userWithoutPassword } = newUser;
    
    return NextResponse.json(
      { message: "User created successfully", user: userWithoutPassword },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { message: "Something went wrong", error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 