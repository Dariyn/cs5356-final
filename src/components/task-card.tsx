"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Define interface to handle PostgreSQL snake_case field names
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

interface TaskCardProps {
  task: Task;
  isOverlay?: boolean;
}

export default function TaskCard({ task, isOverlay = false }: TaskCardProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || "");
  const [isLoading, setIsLoading] = useState(false);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: {
      type: "task",
      task,
    },
  });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Task title cannot be empty");
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to update task");
      }
      
      toast.success("Task updated successfully");
      router.refresh();
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error("Failed to update task");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this task?")) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to delete task");
      }
      
      toast.success("Task deleted successfully");
      router.refresh();
    } catch (error) {
      console.error("Error deleting task:", error);
      toast.error("Failed to delete task");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleCompletion = async () => {
    setIsLoading(true);
    
    try {
      const response = await fetch(`/api/tasks/${task.id}/toggle`, {
        method: "PATCH",
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to toggle task completion");
      }
      
      toast.success(task.is_completed ? "Task marked as incomplete" : "Task marked as complete");
      router.refresh();
    } catch (error) {
      console.error("Error toggling task completion:", error);
      toast.error("Failed to update task status");
    } finally {
      setIsLoading(false);
    }
  };

  const taskRef = isOverlay ? null : setNodeRef;

  if (isEditing && !isOverlay) {
    return (
      <div
        ref={taskRef}
        style={style}
        className="bg-white p-3 rounded-md shadow-sm border border-gray-200"
      >
        <div className="space-y-3">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-2 py-1 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Task title"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-2 py-1 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Add a description..."
            rows={2}
          />
          <div className="flex justify-end space-x-2">
            <button
              onClick={() => setIsEditing(false)}
              className="px-2 py-1 text-xs border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-2 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700"
              disabled={isLoading}
            >
              {isLoading ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={taskRef}
      style={style}
      className={`bg-white p-3 rounded-md shadow-sm cursor-grab border ${
        task.is_completed 
          ? "border-green-300 bg-green-50" 
          : "border-gray-200"
      } ${isOverlay ? "shadow-md opacity-70" : ""}`}
      {...attributes}
      {...listeners}
      onClick={() => !isOverlay && !isDragging && setIsEditing(true)}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1 mr-2">
          <h3 className={`text-sm font-medium mb-1 ${task.is_completed ? "line-through text-gray-500" : ""}`}>
            {task.title}
          </h3>
          {task.description && (
            <p className="text-xs text-gray-600 line-clamp-2">
              {task.description}
            </p>
          )}
        </div>
        
        {!isOverlay && (
          <div className="flex flex-col gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleCompletion();
              }}
              className={`p-1 rounded-full ${
                task.is_completed 
                  ? "text-green-600 hover:bg-green-100" 
                  : "text-gray-400 hover:bg-gray-100"
              }`}
              disabled={isLoading}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 11 12 14 22 4"></polyline>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
              </svg>
            </button>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete();
              }}
              className="p-1 text-gray-400 hover:text-red-600 hover:bg-gray-100 rounded-full"
              disabled={isLoading}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
              </svg>
            </button>
          </div>
        )}
      </div>
      
      {task.due_date && (
        <div className="mt-2 text-xs text-gray-500">
          Due: {new Date(task.due_date).toLocaleDateString()}
        </div>
      )}
    </div>
  );
} 