"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type CreateBoardButtonProps = {
  userId: number | string; // Accept both number and string IDs
  variant?: "default" | "primary";
};

export default function CreateBoardButton({ 
  userId, 
  variant = "default" 
}: CreateBoardButtonProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [boardName, setBoardName] = useState("");
  const [boardDescription, setBoardDescription] = useState("");

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!boardName.trim()) {
        toast.error("Board name is required");
        return;
      }

      const response = await fetch("/api/boards", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: boardName.trim(),
          description: boardDescription.trim(),
          userId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to create board");
      }

      toast.success("Board created successfully");
      router.push(`/boards/${data.board.id}`);
      router.refresh();
    } catch (error) {
      console.error("Error creating board:", error);
      toast.error("Failed to create board");
    } finally {
      setIsLoading(false);
      setIsModalOpen(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className={`px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
          variant === "primary"
            ? "bg-blue-600 text-white hover:bg-blue-700"
            : "bg-white border border-gray-300 text-gray-800 hover:bg-gray-50"
        }`}
      >
        Create Board
      </button>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Create New Board</h2>
            <form onSubmit={handleCreateBoard}>
              <div className="mb-4">
                <label 
                  htmlFor="boardName" 
                  className="block text-sm font-medium text-gray-800 mb-1"
                >
                  Board Name
                </label>
                <input
                  id="boardName"
                  type="text"
                  value={boardName}
                  onChange={(e) => setBoardName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                  placeholder="Enter board name"
                  required
                />
              </div>
              <div className="mb-6">
                <label 
                  htmlFor="boardDescription" 
                  className="block text-sm font-medium text-gray-800 mb-1"
                >
                  Description (optional)
                </label>
                <textarea
                  id="boardDescription"
                  value={boardDescription}
                  onChange={(e) => setBoardDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                  placeholder="Enter board description"
                  rows={3}
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-800 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Creating..." : "Create Board"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
} 