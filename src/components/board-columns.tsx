"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import TaskCard from "@/components/task-card";
import ColumnContainer from "@/components/column-container";

// Add interfaces to handle PostgreSQL snake_case field names
export interface BoardWithColumns {
  id: number;
  name: string;
  description?: string;
  user_id: number;
  created_at?: Date | string;
  columns: ColumnWithTasks[];
}

export interface ColumnWithTasks {
  id: number;
  name: string;
  position: number;
  board_id: number;
  created_at?: Date | string;
  tasks: Task[];
}

export interface Task {
  id: number;
  title: string;
  description?: string;
  position: number;
  column_id: number;
  created_at?: Date | string;
  due_date?: Date | string;
  is_completed: boolean;
}

interface BoardColumnsProps {
  board: BoardWithColumns;
}

export default function BoardColumns({ board }: BoardColumnsProps) {
  const router = useRouter();
  const [columns, setColumns] = useState(board.columns);
  const [activeColumn, setActiveColumn] = useState<ColumnWithTasks | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  );

  // Handle beginning of drag operations
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const activeId = active.id.toString();
    
    // Check if we're dragging a column
    if (activeId.startsWith("column-")) {
      const columnId = parseInt(activeId.replace("column-", ""));
      const column = columns.find((col) => col.id === columnId);
      if (column) setActiveColumn(column);
    } 
    // Otherwise we're dragging a task
    else {
      const taskId = parseInt(activeId);
      // Find the task in one of the columns
      for (const column of columns) {
        const task = column.tasks.find((t) => t.id === taskId);
        if (task) {
          setActiveTask(task);
          break;
        }
      }
    }
  };

  // Handle drag operations between columns
  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;
    
    const activeId = active.id.toString();
    const overId = over.id.toString();
    
    // Return if no change
    if (activeId === overId) return;
    
    // Handle moving tasks between columns
    if (!activeId.startsWith("column-") && overId.startsWith("column-")) {
      // We're dragging a task over a column
      const taskId = parseInt(activeId);
      const newColumnId = parseInt(overId.replace("column-", ""));
      
      setColumns(prevColumns => {
        // Find the task and its source column
        let sourceColumnIndex = -1;
        let taskIndex = -1;
        
        // First find the source column and task
        for (let i = 0; i < prevColumns.length; i++) {
          const column = prevColumns[i];
          const tIndex = column.tasks.findIndex(t => t.id === taskId);
          if (tIndex !== -1) {
            sourceColumnIndex = i;
            taskIndex = tIndex;
            break;
          }
        }
        
        // If task is not found, return original columns
        if (sourceColumnIndex === -1 || taskIndex === -1) {
          return prevColumns;
        }
        
        // Create a new array of columns
        const newColumns = [...prevColumns];
        
        // Get the task to move (we know it exists from checks above)
        const task = {...newColumns[sourceColumnIndex].tasks[taskIndex]};
        
        // Find the target column index
        const targetColumnIndex = newColumns.findIndex(col => col.id === newColumnId);
        
        // If target column doesn't exist, return original columns
        if (targetColumnIndex === -1) {
          return prevColumns;
        }
        
        // Remove the task from the source column
        newColumns[sourceColumnIndex].tasks.splice(taskIndex, 1);
        
        // Update positions in the source column
        newColumns[sourceColumnIndex].tasks = newColumns[sourceColumnIndex].tasks.map((t, index) => ({
          ...t,
          position: index
        }));
        
        // Create a new task with updated column_id
        const updatedTask = {
          ...task,
          column_id: newColumnId,
          position: newColumns[targetColumnIndex].tasks.length // Set position to the end of the target column
        };
        
        // Add the task to the target column at the end
        newColumns[targetColumnIndex].tasks.push(updatedTask);
        
        return newColumns;
      });
    }
  };

  // Handle the end of drag operations
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    // Reset active items
    setActiveColumn(null);
    setActiveTask(null);
    
    if (!over) return;
    
    const activeId = active.id.toString();
    const overId = over.id.toString();
    
    // Return if no change
    if (activeId === overId) return;
    
    // Clear any ghost copies by forcing a refresh after drag operations
    const forceRefresh = () => {
      setTimeout(() => router.refresh(), 100);
    };
    
    if (activeId.startsWith("column-") && overId.startsWith("column-")) {
      // Reordering columns
      const activeColumnId = parseInt(activeId.replace("column-", ""));
      const overColumnId = parseInt(overId.replace("column-", ""));
      
      // Find the indices of the columns
      const activeColumnIndex = columns.findIndex(col => col.id === activeColumnId);
      const overColumnIndex = columns.findIndex(col => col.id === overColumnId);
      
      if (activeColumnIndex !== -1 && overColumnIndex !== -1) {
        // Create new array with reordered columns
        const newColumns = [...columns];
        const [movedColumn] = newColumns.splice(activeColumnIndex, 1);
        newColumns.splice(overColumnIndex, 0, movedColumn);
        
        // Update positions
        const updatedColumns = newColumns.map((col, index) => ({
          ...col,
          position: index,
        }));
        
        setColumns(updatedColumns);
        
        try {
          // Get the updated column IDs in order
          const updatedColumnIds = updatedColumns.map(col => col.id);
          
          const moveResponse = await fetch(`/api/boards/${board.id}/columns/reorder`, {
            method: "PATCH",
            headers: { 
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              columnIds: updatedColumnIds
            }),
          });
          
          if (!moveResponse.ok) {
            const errorData = await moveResponse.json();
            throw new Error(errorData.message || "Failed to reorder columns");
          }
          
          console.log(`Columns reordered successfully`);
          toast.success("Column order saved");
          
          // Force a refresh for consistency
          router.refresh();
        } catch (error) {
          console.error("Failed to update column positions:", error);
          toast.error("Failed to save column order");
          
          // Revert UI on error
          router.refresh();
        }
      }
    }
    // Handle task movement between columns
    else if (!activeId.startsWith("column-") && overId.startsWith("column-")) {
      const taskId = parseInt(activeId);
      const targetColumnId = parseInt(overId.replace("column-", ""));
      
      // Find the source column containing the task
      let sourceColumnId: number | null = null;
      let sourceColumnIndex = -1;
      let taskIndex = -1;
      
      for (let i = 0; i < columns.length; i++) {
        const column = columns[i];
        const tIndex = column.tasks.findIndex(t => t.id === taskId);
        if (tIndex !== -1) {
          sourceColumnId = column.id;
          sourceColumnIndex = i;
          taskIndex = tIndex;
          break;
        }
      }
      
      if (sourceColumnId !== null && sourceColumnId !== targetColumnId) {
        console.log(`Moving task ${taskId} from column ${sourceColumnId} to column ${targetColumnId}...`);
        
        try {
          const moveResponse = await fetch(`/api/tasks/${taskId}/move`, {
            method: "PATCH",
            headers: { 
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              columnId: targetColumnId
            }),
          });
          
          if (!moveResponse.ok) {
            const errorData = await moveResponse.json();
            throw new Error(errorData.message || "Failed to move task");
          }
          
          const data = await moveResponse.json();
          console.log(`Task moved successfully:`, data);
          toast.success("Task moved successfully");
          
          // Force a refresh to ensure UI is in sync with the database
          // and clear any ghost copies
          forceRefresh();
        } catch (error) {
          console.error("Failed to move task:", error);
          toast.error("Failed to move task");
          
          // Revert UI on error
          router.refresh();
        }
      }
    }
    // Handle task reordering within the same column
    else if (!activeId.startsWith("column-") && !overId.startsWith("column-")) {
      const taskId = parseInt(activeId);
      const overTaskId = parseInt(overId);
      
      // Find the columns containing these tasks
      let sourceColumnId: number | null = null;
      let targetColumnId: number | null = null;
      let sourceIndex: number = -1;
      let targetIndex: number = -1;
      
      for (const column of columns) {
        const sIndex = column.tasks.findIndex(t => t.id === taskId);
        const tIndex = column.tasks.findIndex(t => t.id === overTaskId);
        
        if (sIndex !== -1) {
          sourceColumnId = column.id;
          sourceIndex = sIndex;
        }
        
        if (tIndex !== -1) {
          targetColumnId = column.id;
          targetIndex = tIndex;
        }
        
        if (sourceColumnId !== null && targetColumnId !== null) break;
      }
      
      if (sourceColumnId === targetColumnId && sourceIndex !== -1 && targetIndex !== -1) {
        // Reordering within the same column
        setColumns(columns => {
          return columns.map(column => {
            if (column.id === sourceColumnId) {
              const newTasks = [...column.tasks];
              const [movedTask] = newTasks.splice(sourceIndex, 1);
              newTasks.splice(targetIndex, 0, movedTask);
              
              // Update positions
              const updatedTasks = newTasks.map((task, index) => ({
                ...task,
                position: index,
              }));
              
              return { ...column, tasks: updatedTasks };
            }
            return column;
          });
        });
        
        console.log(`Reordering tasks within column ${sourceColumnId}...`);
        
        try {
          // Get the updated task IDs in order
          const updatedColumn = columns.find(col => col.id === sourceColumnId);
          if (updatedColumn) {
            const taskIds = updatedColumn.tasks.map(t => t.id);
            console.log(`Sending reorder request with task IDs: ${taskIds.join(', ')}`);
            
            const reorderResponse = await fetch(`/api/columns/${sourceColumnId}/tasks/reorder`, {
              method: "PATCH",
              headers: { 
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                taskIds: taskIds // Make sure we send the actual task IDs array
              }),
            });
            
            if (!reorderResponse.ok) {
              const errorData = await reorderResponse.json();
              throw new Error(errorData.message || "Failed to reorder tasks");
            }
            
            console.log(`Tasks reordered successfully in column ${sourceColumnId}`);
            toast.success("Task order saved");
            
            // Force a refresh for consistency
            router.refresh();
          }
        } catch (error) {
          console.error("Failed to update task positions:", error);
          toast.error("Failed to save task order");
          
          // Revert UI on error
          router.refresh();
        }
      }  
    }
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full gap-6 items-start">
        <SortableContext items={columns.map(col => `column-${col.id}`)} strategy={horizontalListSortingStrategy}>
          {columns.map((column) => (
            <ColumnContainer
              key={column.id}
              column={column}
              boardId={board.id}
            />
          ))}
        </SortableContext>
        
        <DragOverlay>
          {activeColumn && (
            <ColumnContainer
              column={activeColumn}
              boardId={board.id}
              isOverlay
            />
          )}
          {activeTask && (
            <TaskCard
              task={activeTask}
              isOverlay
            />
          )}
        </DragOverlay>
      </div>
    </DndContext>
  );
} 