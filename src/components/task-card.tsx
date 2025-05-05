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

export default function TaskCard({ task: initialTask, isOverlay = false }: TaskCardProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(initialTask.title);
  const [description, setDescription] = useState(initialTask.description || "");
  const [isLoading, setIsLoading] = useState(false);
  const [task, setTask] = useState(initialTask);
  
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
      
      // Get the updated task from the response
      const data = await response.json();
      const updatedTask = data.task;
      
      // Update the local state with the new task data
      setTask(updatedTask);
      
      toast.success(task.is_completed ? "Task marked as incomplete" : "Task marked as complete");
      
      // We don't need to refresh the entire page anymore
      // router.refresh();
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
      className={`
        p-3 rounded-lg shadow-sm cursor-grab transition-all duration-200
        ${task.is_completed 
          ? "bg-green-50 border-l-4 border-green-500 border-t border-r border-b border-green-200" 
          : "bg-white border-l-4 border-blue-400 border-t border-r border-b border-gray-200 hover:border-blue-300"}
        ${isOverlay ? "shadow-lg opacity-90" : "hover:shadow-md"}
      `}
      {...attributes}
      {...listeners}
      onClick={() => !isOverlay && !isDragging && setIsEditing(true)}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1 mr-2">
          <h3 className={`text-sm font-medium mb-1 ${task.is_completed ? "line-through text-gray-500" : "text-gray-800"}`}>
            {task.title}
          </h3>
          {task.description && (
            <p className="text-xs text-gray-600 line-clamp-2 mt-1">
              {task.description}
            </p>
          )}
        </div>
        
        {!isOverlay && (
          <div className="flex flex-col gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleCompletion();
              }}
              className={`
                p-2 rounded-full transition-all duration-200
                ${task.is_completed 
                  ? "bg-green-100 text-green-600 hover:bg-green-200" 
                  : "bg-gray-100 text-gray-400 hover:bg-blue-100 hover:text-blue-600"}
              `}
              disabled={isLoading}
              title={task.is_completed ? "Mark as incomplete" : "Mark as complete"}
            >
              {task.is_completed ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path>
                  <path d="m9 12 2 2 4-4"></path>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path>
                </svg>
              )}
            </button>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete();
              }}
              className="p-2 bg-gray-100 text-gray-400 hover:bg-red-100 hover:text-red-600 rounded-full transition-all duration-200"
              disabled={isLoading}
              title="Delete task"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18"></path>
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        )}
      </div>
      
      {task.due_date && (
        <div className="mt-2 text-xs flex items-center text-gray-500">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          Due: {new Date(task.due_date).toLocaleDateString()}
        </div>
      )}
      
      <div className="mt-2 text-xs text-gray-400">
        ID: {task.id}
      </div>
    </div>
  );
} 