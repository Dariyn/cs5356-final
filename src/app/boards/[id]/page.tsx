// ./src/app/boards/[id]/page.tsx

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import pkg from 'pg';
const { Client } = pkg;

import BoardHeader from "@/components/board-header";
import ClientDndProvider from "@/components/client-dnd-provider";

type PageProps = {
  params: { id: string };
  searchParams: { [key: string]: string | string[] | undefined };
};

// Disable all caching for this route
export const fetchCache = 'force-no-store';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function BoardPage({ params, searchParams }: PageProps) {
  // Fix params.id warning by properly destructuring at the function parameter level
  const boardId = params?.id;
  
  // Safety check to ensure we have a valid ID
  if (!boardId) {
    redirect("/boards");
  }

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }

  console.log(`Loading board with ID: ${boardId}`);

  const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("Database connection string is missing");
  }

  const client = new Client({ connectionString });
  await client.connect();

  try {
    // Fetch the board
    const boardResult = await client.query(
      `SELECT * FROM boards WHERE id = $1 AND user_id = $2`,
      [boardId, session.user.id]
    );
    if (boardResult.rowCount === 0) {
      await client.end();
      redirect("/boards");
    }
    const board = boardResult.rows[0];

    // Fetch columns
    const columnsResult = await client.query(
      `SELECT * FROM columns WHERE board_id = $1 ORDER BY position ASC`,
      [boardId]
    );
    const columns = columnsResult.rows;

    // Fetch tasks per column
    const boardWithColumns = {
      ...board,
      columns: await Promise.all(
        columns.map(async (column) => {
          const tasksResult = await client.query(
            `SELECT * FROM tasks WHERE column_id = $1 ORDER BY position ASC`,
            [column.id]
          );
          return {
            ...column,
            tasks: tasksResult.rows,
          };
        })
      ),
    };

    return (
      <div className="space-y-6">
        <BoardHeader board={board} />
        <ClientDndProvider board={boardWithColumns} />
      </div>
    );
  } finally {
    await client.end();
  }
}
