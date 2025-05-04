"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

// Add interface to handle PostgreSQL snake_case field names
interface BoardWithColumns {
  id: number;
  name: string;
  description?: string;
  user_id: number;
  created_at?: Date | string;
  columns: ColumnWithTasks[];
}

interface ColumnWithTasks {
  id: number;
  name: string;
  position: number;
  board_id: number;
  created_at?: Date | string;
  tasks: Task[];
}

interface Task {
  id: number;
  title: string;
  description?: string;
  position: number;
  column_id: number;
  created_at?: Date | string;
  due_date?: Date | string;
  is_completed: boolean;
}

interface BoardHeaderProps {
  board: BoardWithColumns;
}

export default function BoardHeader({ board }: BoardHeaderProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(board.name);
  const [description, setDescription] = useState(board.description || "");
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Board name cannot be empty");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/api/boards/${board.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to update board");
      }

      toast.success("Board updated successfully");
      router.refresh();
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating board:", error);
      toast.error("Failed to update board");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this board? This action cannot be undone.")) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/api/boards/${board.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to delete board");
      }

      toast.success("Board deleted successfully");
      router.push("/boards");
      router.refresh();
    } catch (error) {
      console.error("Error deleting board:", error);
      toast.error("Failed to delete board");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm mb-6 border border-gray-200">
      {isEditing ? (
        <div className="space-y-4">
          <div>
            <label htmlFor="boardName" className="block text-sm font-medium text-gray-800 mb-1">
              Board Name
            </label>
            <input
              id="boardName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
              placeholder="Enter board name"
              required
            />
          </div>
          <div>
            <label htmlFor="boardDescription" className="block text-sm font-medium text-gray-800 mb-1">
              Description (optional)
            </label>
            <textarea
              id="boardDescription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
              placeholder="Enter board description"
              rows={2}
            />
          </div>
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setIsEditing(false)}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-gray-800 text-sm hover:bg-gray-50 font-medium"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50 font-medium"
              disabled={isLoading}
            >
              {isLoading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{board.name}</h1>
            {board.description && (
              <p className="text-gray-700 mt-1 text-sm">{board.description}</p>
            )}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setIsEditing(true)}
              className="px-3 py-1.5 bg-white border border-gray-300 rounded-md text-gray-800 text-sm hover:bg-gray-50 font-medium"
            >
              Edit Board
            </button>
            <button
              onClick={handleDelete}
              className="px-3 py-1.5 bg-white border border-red-300 rounded-md text-red-600 text-sm hover:bg-red-50 font-medium"
              disabled={isLoading}
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 