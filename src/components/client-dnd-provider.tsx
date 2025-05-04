"use client";

import { useEffect, useState } from "react";
import BoardColumns, { BoardWithColumns } from "./board-columns";

interface ClientDndProviderProps {
  board: BoardWithColumns;
}

export default function ClientDndProvider({ board }: ClientDndProviderProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="flex h-full gap-4 items-start">
        <div className="bg-gray-100 rounded-md w-[280px] h-[200px] animate-pulse" />
        <div className="bg-gray-100 rounded-md w-[280px] h-[200px] animate-pulse" />
        <div className="bg-gray-100 rounded-md w-[280px] h-[200px] animate-pulse" />
      </div>
    );
  }

  return <BoardColumns board={board} />;
}
