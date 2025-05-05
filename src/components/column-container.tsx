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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  boardId,
  isOverlay = false 
}: ColumnContainerProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [columnName, setColumnName] = useState(column.name);
  const [isAddingTask, setIsAddingTask] = useState(false);
  // Use the tasks directly from the column prop to ensure it stays in sync with parent state
  // This ensures the count badge always shows the correct number
  const columnTasks = column.tasks;
  
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
      className={`
        rounded-lg shadow-md w-[280px] h-fit max-h-full flex flex-col
        bg-gradient-to-b from-gray-50 to-gray-100 border border-gray-200
        ${isOverlay ? "opacity-80 ring-2 ring-blue-400" : ""}
      `}
    >
      {/* Column Header */}
      <div className={`
        p-4 font-medium flex justify-between items-center rounded-t-lg
        border-b border-gray-200 bg-white
        ${column.name.toLowerCase() === 'to do' ? 'bg-blue-50' : 
          column.name.toLowerCase() === 'in progress' ? 'bg-amber-50' : 
          column.name.toLowerCase() === 'done' ? 'bg-green-50' : 'bg-white'}
      `}>
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
                className="bg-white px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-full shadow-sm"
                autoFocus
              />
            </div>
          ) : (
            <div 
              className="text-base font-semibold truncate cursor-pointer hover:text-blue-600 transition-colors" 
              onClick={() => !isOverlay && setIsEditing(true)}
            >
              <span className={`
                ${column.name.toLowerCase() === 'to do' ? 'text-blue-600' : 
                  column.name.toLowerCase() === 'in progress' ? 'text-amber-600' : 
                  column.name.toLowerCase() === 'done' ? 'text-green-600' : 'text-gray-700'}
              `}>
                {column.name}
              </span>
              <span className="ml-2 text-xs font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                {column.tasks.length}
              </span>
            </div>
          )}
        </div>
        {!isOverlay && (
          <button
            onClick={handleDeleteColumn}
            className="text-gray-400 hover:text-red-600 p-2 rounded-full hover:bg-red-50 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18"></path>
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
            </svg>
          </button>
        )}
      </div>

      {/* Tasks */}
      <div className="flex-1 flex flex-col gap-3 p-3 overflow-y-auto max-h-[calc(100vh-220px)]">
        <SortableContext items={columnTasks.map(task => task.id)} strategy={verticalListSortingStrategy}>
          {columnTasks.map((task) => (
            <TaskCard 
              key={task.id} 
              task={task} 
              onDelete={(taskId) => {
                // Instead of updating local state, refresh the entire board
                // This ensures all components have the latest data
                router.refresh();
              }}
              onUpdate={(updatedTask) => {
                // Instead of updating local state, refresh the entire board
                // This ensures all components have the latest data
                router.refresh();
              }}
            />
          ))}
        </SortableContext>

        {columnTasks.length === 0 && !isAddingTask && (
          <div className="bg-gray-50 border border-dashed border-gray-200 rounded-lg py-8 px-3 text-center">
            <p className="text-gray-500 text-sm">
              No tasks yet
            </p>
            <p className="text-gray-400 text-xs mt-1">
              Add a task to get started
            </p>
          </div>
        )}

        {isAddingTask ? (
          <CreateTaskForm
            columnId={column.id}
            onCancel={() => setIsAddingTask(false)}
            onSuccess={(newTask) => {
              setIsAddingTask(false);
              
              // Always refresh the router to ensure all components have the latest data
              // This ensures the column count and task list stay in sync
              router.refresh();
            }}
          />
        ) : (
          !isOverlay && (
            <button
              onClick={() => setIsAddingTask(true)}
              className="mt-2 w-full py-2 px-3 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-200 text-sm font-medium transition-colors flex items-center justify-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
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