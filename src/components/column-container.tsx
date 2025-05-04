"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import TaskCard from "./task-card";
import CreateTaskForm from "./create-task-form";

// Define interfaces to handle PostgreSQL snake_case field names
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

interface ColumnContainerProps {
  column: ColumnWithTasks;
  boardId: number;
  isOverlay?: boolean;
}

export default function ColumnContainer({ 
  column, 
  boardId,
  isOverlay = false 
}: ColumnContainerProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [columnName, setColumnName] = useState(column.name);
  const [isAddingTask, setIsAddingTask] = useState(false);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `column-${column.id}`,
    data: {
      type: "column",
      column,
    },
  });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleRenameColumn = async () => {
    if (!columnName.trim()) {
      toast.error("Column name cannot be empty");
      setColumnName(column.name);
      setIsEditing(false);
      return;
    }
    
    if (columnName === column.name) {
      setIsEditing(false);
      return;
    }
    
    try {
      const response = await fetch(`/api/columns/${column.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: columnName.trim(),
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to rename column");
      }
      
      toast.success("Column renamed successfully");
      router.refresh();
    } catch (error) {
      console.error("Error renaming column:", error);
      toast.error("Failed to rename column");
      setColumnName(column.name);
    } finally {
      setIsEditing(false);
    }
  };

  const handleDeleteColumn = async () => {
    if (column.tasks.length > 0) {
      if (!confirm(`This column has ${column.tasks.length} tasks. Are you sure you want to delete it and all its tasks?`)) {
        return;
      }
    } else {
      if (!confirm("Are you sure you want to delete this column?")) {
        return;
      }
    }
    
    try {
      const response = await fetch(`/api/columns/${column.id}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to delete column");
      }
      
      toast.success("Column deleted successfully");
      router.refresh();
    } catch (error) {
      console.error("Error deleting column:", error);
      toast.error("Failed to delete column");
    }
  };

  const columnRef = isOverlay ? null : setNodeRef;

  return (
    <div
      ref={columnRef}
      style={style}
      className={`bg-gray-100 rounded-md w-[280px] h-fit max-h-full flex flex-col ${isOverlay ? "shadow-md opacity-70" : ""}`}
    >
      {/* Column Header */}
      <div className="p-3 font-medium flex justify-between items-center bg-gray-200 rounded-t-md">
        <div
          {...attributes}
          {...listeners}
          className="flex-1 cursor-grab"
        >
          {isEditing ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={columnName}
                onChange={(e) => setColumnName(e.target.value)}
                onBlur={handleRenameColumn}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRenameColumn();
                  if (e.key === "Escape") {
                    setColumnName(column.name);
                    setIsEditing(false);
                  }
                }}
                className="bg-white px-2 py-1 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                autoFocus
              />
            </div>
          ) : (
            <div 
              className="text-sm font-semibold truncate" 
              onClick={() => !isOverlay && setIsEditing(true)}
            >
              {column.name}
            </div>
          )}
        </div>
        {!isOverlay && (
          <button
            onClick={handleDeleteColumn}
            className="text-gray-500 hover:text-red-600 p-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
          </button>
        )}
      </div>

      {/* Tasks */}
      <div className="flex-1 flex flex-col gap-2 p-2 overflow-y-auto max-h-[calc(100vh-220px)]">
        <SortableContext items={column.tasks.map(task => task.id)} strategy={verticalListSortingStrategy}>
          {column.tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </SortableContext>

        {column.tasks.length === 0 && !isAddingTask && (
          <p className="text-gray-500 text-sm text-center py-8">
            No tasks in this column
          </p>
        )}

        {isAddingTask ? (
          <CreateTaskForm
            columnId={column.id}
            onCancel={() => setIsAddingTask(false)}
            onSuccess={() => {
              setIsAddingTask(false);
              router.refresh();
            }}
          />
        ) : (
          !isOverlay && (
            <button
              onClick={() => setIsAddingTask(true)}
              className="mt-2 w-full py-2 px-3 text-gray-500 bg-white rounded-md border border-gray-300 text-sm hover:bg-gray-50 flex items-center justify-center"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
              </svg>
              Add Task
            </button>
          )
        )}
      </div>
    </div>
  );
} 