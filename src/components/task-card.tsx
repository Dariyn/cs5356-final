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
  priority?: string;
}

interface TaskCardProps {
  task: Task;
  isOverlay?: boolean;
  onDelete?: (taskId: number) => void;
  onUpdate?: (updatedTask: Task) => void;
}

export default function TaskCard({ task: initialTask, isOverlay = false, onDelete, onUpdate }: TaskCardProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(initialTask.title);
  const [description, setDescription] = useState(initialTask.description || "");
  const [dueDate, setDueDate] = useState(initialTask.due_date ? new Date(initialTask.due_date).toISOString().split('T')[0] : "");
  const [priority, setPriority] = useState(initialTask.priority || "medium");
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
          due_date: dueDate || null,
          priority: priority,
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to update task");
      }
      
      // Get the updated task from the response
      const data = await response.json();
      const updatedTask = data.task;
      
      // Update the local state with the new task data
      setTask(updatedTask);
      
      // If we have an onUpdate callback, call it to update the parent component
      if (onUpdate) {
        onUpdate(updatedTask);
      }
      
      toast.success("Task updated successfully");
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
      
      // If we have an onDelete callback, call it to update the parent component
      if (onDelete) {
        onDelete(task.id);
      } else {
        // Fallback to router refresh if no callback is provided
        router.refresh();
      }
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

  const sendEmailNotification = async () => {
    setIsLoading(true);
    
    try {
      const response = await fetch(`/api/tasks/${task.id}/email`, {
        method: "POST",
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to send email notification");
      }
      
      toast.success("Email notification sent");
    } catch (error) {
      console.error("Error sending email notification:", error);
      toast.error("Failed to send email notification");
    } finally {
      setIsLoading(false);
    }
  };

  const taskRef = isOverlay ? null : setNodeRef;

  // Priority indicator colors
  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300 border-red-300 dark:border-red-700';
      case 'low':
        return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300 border-green-300 dark:border-green-700';
      case 'medium':
      default:
        return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700';
    }
  };

  if (isEditing && !isOverlay) {
    return (
      <div
        ref={taskRef}
        style={style}
        className="bg-white dark:bg-gray-800 p-3 rounded-md shadow-sm border border-gray-200 dark:border-gray-700"
      >
        <div className="space-y-3">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-2 py-1 text-sm border dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
            placeholder="Task title"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-2 py-1 text-sm border dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
            placeholder="Add a description..."
            rows={2}
          />
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col space-y-1">
              <label htmlFor="dueDate" className="text-xs text-gray-600 font-medium">
                Due Date
              </label>
              <input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-2 py-1 text-sm border dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
              />
            </div>
            <div className="flex flex-col space-y-1">
              <label htmlFor="priority" className="text-xs text-gray-600 font-medium">
                Priority
              </label>
              <select
                id="priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-2 py-1 text-sm border dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
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
      id={`task-${task.id}`}
      ref={taskRef}
      style={style}
      className={`
        p-3 rounded-lg shadow-sm cursor-grab transition-all duration-200
        ${task.is_completed 
          ? "bg-green-50 dark:bg-green-900/30 border-l-4 border-green-500 border-t border-r border-b border-green-200 dark:border-green-800" 
          : "bg-white dark:bg-gray-800 border-l-4 border-blue-400 dark:border-blue-600 border-t border-r border-b border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-500"}
        ${isOverlay ? "shadow-lg opacity-90" : "hover:shadow-md"}
      `}
      {...attributes}
      {...listeners}
      onClick={() => !isOverlay && !isDragging && setIsEditing(true)}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1 mr-2">
          <div className="flex items-center space-x-2 mb-1">
            <h3 className={`text-sm font-medium ${task.is_completed ? "line-through text-gray-500 dark:text-gray-400" : "text-gray-800 dark:text-white"}`}>
              {task.title}
            </h3>
            <span className={`text-xs px-2 py-0.5 rounded-full ${getPriorityColor(task.priority || 'medium')}`}>
              {task.priority || 'Medium'}
            </span>
          </div>
          {task.description && (
            <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mt-1">
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
                  ? "bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-800" 
                  : "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 hover:bg-blue-100 dark:hover:bg-blue-900 hover:text-blue-600 dark:hover:text-blue-400"}
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
                sendEmailNotification();
              }}
              className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 hover:bg-blue-100 dark:hover:bg-blue-900 hover:text-blue-600 dark:hover:text-blue-400 rounded-full transition-all duration-200"
              disabled={isLoading}
              title="Send email notification"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2"></rect>
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
              </svg>
            </button>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete();
              }}
              className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 hover:bg-red-100 dark:hover:bg-red-900 hover:text-red-600 dark:hover:text-red-400 rounded-full transition-all duration-200"
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
        <div className="mt-2 text-xs flex items-center text-gray-500 dark:text-gray-400">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          Due: {new Date(task.due_date).toLocaleDateString()}
        </div>
      )}
      
      <div className="mt-2 text-xs text-gray-400 dark:text-gray-500">
        ID: {task.id}
      </div>
    </div>
  );
} 