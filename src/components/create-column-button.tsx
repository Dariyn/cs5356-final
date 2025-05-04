"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface CreateColumnButtonProps {
  boardId: number;
  variant?: "default" | "primary";
}

export default function CreateColumnButton({ boardId, variant = "default" }: CreateColumnButtonProps) {
  const router = useRouter();
  const [isAdding, setIsAdding] = useState(false);
  const [columnName, setColumnName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!columnName.trim()) {
      toast.error("Column name is required");
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await fetch(`/api/boards/${boardId}/columns`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: columnName.trim(),
          board_id: boardId
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to create column");
      }
      
      toast.success("Column created successfully");
      setColumnName("");
      setIsAdding(false);
      router.refresh();
    } catch (error) {
      console.error("Error creating column:", error);
      toast.error("Failed to create column");
    } finally {
      setIsLoading(false);
    }
  };

  if (isAdding) {
    return (
      <div className="bg-white p-3 rounded-md shadow-sm border border-gray-300 w-[280px] h-fit">
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={columnName}
            onChange={(e) => setColumnName(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter column name"
            autoFocus
          />
          <div className="flex justify-end mt-3 space-x-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
              disabled={isLoading}
            >
              {isLoading ? "Adding..." : "Add Column"}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <button
      onClick={() => setIsAdding(true)}
      className="h-12 w-[280px] rounded-md border-2 border-dashed border-gray-300 hover:border-gray-400 flex items-center justify-center text-gray-500 hover:text-gray-600 transition-colors"
    >
      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
      </svg>
      Add Column
    </button>
  );
} 