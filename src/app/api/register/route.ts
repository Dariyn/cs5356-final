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
    const connectionString = process.env.POSTGRES_URL
      || process.env.DATABASE_URL;
    if (!connectionString) throw new Error("Database URL missing");

    const client = new Client({ connectionString });
    await client.connect();

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
    return NextResponse.json(
      { message: "Something went wrong", error: (err as Error).message },
      { status: 500 }
    );
  }
}
