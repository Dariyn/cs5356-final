// ./src/app/api/register/route.ts
import { NextRequest, NextResponse } from "next/server";
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
    const body = await req.json();
    const result = registerSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { message: "Invalid input data", errors: result.error.errors },
        { status: 400 }
      );
    }

    const { name, email, password } = result.data;
    // Prioritize DATABASE_URL for Neon database connection
    const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!connectionString) throw new Error("Database URL missing");

    console.log("Register: Connecting to database...");
    const client = new Client({ 
      connectionString,
      ssl: { rejectUnauthorized: false } // Important for Vercel deployment
    });
    try {
      await client.connect();
      console.log("Register: Database connection successful");
    } catch (error) {
      console.error("Register: Database connection error:", error);
      throw new Error(`Failed to connect to database: ${(error as Error).message}`);
    }

    const { rows } = await client.query(
      'SELECT 1 FROM users WHERE email = $1',
      [email]
    );
    if (rows.length) {
      await client.end();
      return NextResponse.json({ message: "User already exists" }, { status: 409 });
    }

    const hashed = await bcrypt.hash(password, 10);
    const insert = await client.query(
      `INSERT INTO users (name,email,password,role)
       VALUES ($1,$2,$3,$4)
       RETURNING id, name, email, role, created_at`,
      [name, email, hashed, "user"]
    );

    await client.end();

    const user = insert.rows[0];
    return NextResponse.json(
      { message: "User created successfully", user },
      { status: 201 }
    );

  } catch (err) {
    console.error("Registration error:", err);
    
    // Provide more detailed error information
    let errorMessage = "Something went wrong";
    const details = (err as Error).message;
    
    // Check for specific error types
    if (details.includes("duplicate key")) {
      errorMessage = "Email already in use";
      return NextResponse.json(
        { message: errorMessage, error: details },
        { status: 409 }
      );
    }
    
    // Database connection errors
    if (details.includes("connect") || details.includes("connection")) {
      errorMessage = "Database connection error";
    }
    
    return NextResponse.json(
      { message: errorMessage, error: details },
      { status: 500 }
    );
  }
}
