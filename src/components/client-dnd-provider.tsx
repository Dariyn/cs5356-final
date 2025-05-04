"use client";

import { useEffect, useState } from "react";
import BoardColumns from "./board-columns";

interface ClientDndProviderProps {
  board: any; // Using any to match the existing board type
}

export default function ClientDndProvider({ board }: ClientDndProviderProps) {
  // Use a state to control when the client-side component should render
  const [isMounted, setIsMounted] = useState(false);

  // Only render on the client to avoid hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Show a simple loading state or nothing until client-side rendering kicks in
  if (!isMounted) {
    return (
      <div className="flex h-full gap-4 items-start">
        <div className="bg-gray-100 rounded-md w-[280px] h-[200px] animate-pulse"></div>
        <div className="bg-gray-100 rounded-md w-[280px] h-[200px] animate-pulse"></div>
        <div className="bg-gray-100 rounded-md w-[280px] h-[200px] animate-pulse"></div>
      </div>
    );
  }

  // Render the actual component only on the client side
  return <BoardColumns board={board} />;
} 