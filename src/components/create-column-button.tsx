"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface CreateColumnButtonProps {
  boardId: number;
  variant?: "default" | "primary";
}

export default function CreateColumnButton({ boardId, variant: _variant = "default" }: CreateColumnButtonProps) {
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
      <div className="bg-white p-4 rounded-lg shadow-md border border-blue-200 w-[280px] h-fit transition-all">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="column-name" className="block text-sm font-medium text-gray-800 mb-1">
              Column Name
            </label>
            <input
              id="column-name"
              type="text"
              value={columnName}
              onChange={(e) => setColumnName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm text-gray-800"
              placeholder="Enter column name"
              autoFocus
            />
          </div>
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 text-sm border border-gray-300 rounded-md text-gray-800 hover:bg-gray-50 transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Adding...
                </>
              ) : (
                <>Add Column</>
              )}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <button
      onClick={() => setIsAdding(true)}
      className="h-16 w-[280px] rounded-lg border-2 border-dashed border-blue-300 hover:border-blue-400 flex items-center justify-center text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition-all"
    >
      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
      </svg>
      <span className="font-medium">Add New Column</span>
    </button>
  );
} 