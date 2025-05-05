"use client";

import { useState, useRef, useEffect } from "react";
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
import CreateColumnButton from "@/components/create-column-button";

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

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

export default function BoardColumns({ board }: BoardColumnsProps) {
  const router = useRouter();
  const [columns, setColumns] = useState(board.columns);
  const [activeColumn, setActiveColumn] = useState<ColumnWithTasks | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const columnsContainerRef = useRef<HTMLDivElement>(null);
  const [isDraggingAnyItem, setIsDraggingAnyItem] = useState(false);
  
  // Configure sensors for drag detection
  const mouseSensor = useSensor(MouseSensor, {
    // Lower the activation distance to improve responsiveness
    activationConstraint: {
      distance: 5,
    },
  });
  
  const touchSensor = useSensor(TouchSensor, {
    // Increase delay for touch devices to prevent accidental drags
    activationConstraint: {
      delay: 100,
      tolerance: 5,
    },
  });
  
  const sensors = useSensors(mouseSensor, touchSensor);
  
  // Setup horizontal scroll with mouse wheel
  useEffect(() => {
    if (!columnsContainerRef.current || !isBrowser) return;
    
    const container = columnsContainerRef.current;
    
    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY === 0) return;
      
      // Prevent default behavior (vertical scroll)
      e.preventDefault();
      
      // Scroll horizontally (use deltaY for horizontal scroll)
      container.scrollLeft += e.deltaY;
    };
    
    container.addEventListener('wheel', handleWheel, { passive: false });
    
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, []);
  
  const handleDragStart = (event: DragStartEvent) => {
    setIsDraggingAnyItem(true);
    const { active } = event;
    const activeId = active.id.toString();
    
    // If we're dragging a column
    if (activeId.startsWith("column-")) {
      const columnId = parseInt(activeId.replace("column-", ""));
      const column = columns.find(col => col.id === columnId);
      if (column) {
        setActiveColumn({ ...column });
      }
    } 
    // If we're dragging a task
    else {
      const taskId = parseInt(activeId);
      
      // Find the task in all columns
      for (const column of columns) {
        const task = column.tasks.find(t => t.id === taskId);
        if (task) {
          setActiveTask({ ...task });
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
        
        // Add the task to the target column at the end
        const newPosition = newColumns[targetColumnIndex].tasks.length;
        task.column_id = newColumnId;
        task.position = newPosition;
        
        newColumns[targetColumnIndex].tasks.push(task);
        
        // Create a new task with updated column_id
        const updatedTask = {
          ...task,
          column_id: newColumnId
        };
        
        // Remove task from source column
        newColumns[sourceColumnIndex] = {
          ...newColumns[sourceColumnIndex],
          tasks: [
            ...newColumns[sourceColumnIndex].tasks.slice(0, taskIndex),
            ...newColumns[sourceColumnIndex].tasks.slice(taskIndex + 1)
          ]
        };
        
        // Find destination column
        const destColumnIndex = newColumns.findIndex(col => col.id === newColumnId);
        
        // If destination column exists, add the task to it
        if (destColumnIndex !== -1) {
          newColumns[destColumnIndex] = {
            ...newColumns[destColumnIndex],
            tasks: [...newColumns[destColumnIndex].tasks, updatedTask]
          };
        }
        
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
    setIsDraggingAnyItem(false);
    
    if (!over) return;
    
    const activeId = active.id.toString();
    const overId = over.id.toString();
    
    // Return if no change
    if (activeId === overId) return;
    
    if (activeId.startsWith("column-") && overId.startsWith("column-")) {
      // Reordering columns
      const activeColumnId = parseInt(activeId.replace("column-", ""));
      const overColumnId = parseInt(overId.replace("column-", ""));
      
      // Find the indices of the columns
      const activeColumnIndex = columns.findIndex(col => col.id === activeColumnId);
      const overColumnIndex = columns.findIndex(col => col.id === overColumnId);
      
      if (activeColumnIndex === -1 || overColumnIndex === -1) return;
      
      // Create new version of columns array with reordered columns
      const newColumns = [...columns];
      
      // Remove the active column
      const [activeColumn] = newColumns.splice(activeColumnIndex, 1);
      
      // Insert it at the new position
      newColumns.splice(overColumnIndex, 0, activeColumn);
      
      // Update positions
      const updatedColumns = newColumns.map((col, index) => ({
        ...col,
        position: index,
      }));
      
      // Update state with the new order
      setColumns(updatedColumns);
      
      try {
        // Update column positions in the database
        const response = await fetch(`/api/boards/${board.id}/columns/reorder`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            columns: updatedColumns.map(col => ({
              id: col.id,
              position: col.position,
            })),
          }),
        });
        
        if (!response.ok) {
          throw new Error("Failed to update column positions");
        }
        
        console.log("Column positions updated successfully");
      } catch (error) {
        console.error("Error updating column positions:", error);
        // Revert to original order if update fails
        setColumns(columns);
        toast.error("Failed to update column positions");
      }
    }
    // Handle moving a task between columns
    else if (!activeId.startsWith("column-") && overId.startsWith("column-")) {
      // Task was already moved in handleDragOver, just need to save to DB
      const taskId = parseInt(activeId);
      const newColumnId = parseInt(overId.replace("column-", ""));
      
      try {
        // Find the task's new position in the destination column
        let taskPosition = -1;
        for (const column of columns) {
          if (column.id === newColumnId) {
            const taskIndex = column.tasks.findIndex(t => t.id === taskId);
            if (taskIndex !== -1) {
              taskPosition = taskIndex;
            }
            break;
          }
        }
        
        // Update the task in the database
        const response = await fetch(`/api/tasks/${taskId}/move`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            columnId: newColumnId,
            position: taskPosition,
          }),
        });
        
        if (!response.ok) {
          throw new Error("Failed to move task to new column");
        }
        
        console.log(`Task ${taskId} moved to column ${newColumnId}`);
      } catch (error) {
        console.error("Error moving task:", error);
        toast.error("Failed to move task");
        // We should refresh to get the latest state
        router.refresh();
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
          // Find the source column with the updated task order
          const sourceColumn = columns.find(col => col.id === sourceColumnId);
          if (!sourceColumn) throw new Error("Source column not found");
          
          // Get the updated task positions
          let updatedTasks: { id: number; position: number }[] = [];
          setColumns(columns => {
            const updatedColumns = columns.map(column => {
              if (column.id === sourceColumnId) {
                const newTasks = [...column.tasks];
                const [movedTask] = newTasks.splice(sourceIndex, 1);
                newTasks.splice(targetIndex, 0, movedTask);
                
                // Update positions
                updatedTasks = newTasks.map((task, index) => ({
                  id: task.id,
                  position: index,
                }));
                
                return {
                  ...column,
                  tasks: newTasks.map((task, index) => ({
                    ...task,
                    position: index,
                  })),
                };
              }
              return column;
            });
            
            return updatedColumns;
          });
          
          // Update task positions in the database
          const response = await fetch(`/api/columns/${sourceColumnId}/tasks/reorder`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              tasks: updatedTasks,
            }),
          });
          
          if (!response.ok) {
            throw new Error("Failed to update task positions");
          }
          
          console.log("Task positions updated successfully");
        } catch (error) {
          console.error("Error updating task positions:", error);
          toast.error("Failed to update task order");
          // Refresh to get the latest state
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
      <div 
        ref={columnsContainerRef}
        className="flex h-full gap-4 items-start overflow-x-auto py-2 px-1 pb-4 sm:px-0 sm:py-2 scrollbar-hide"
        style={{
          scrollBehavior: "smooth",
          paddingBottom: "1rem",
          WebkitOverflowScrolling: "touch"
        }}
      >
        <SortableContext items={columns.map(col => `column-${col.id}`)} strategy={horizontalListSortingStrategy}>
          {columns.map((column) => (
            <ColumnContainer
              key={column.id}
              column={column}
              boardId={board.id}
            />
          ))}
        </SortableContext>
        
        <CreateColumnButton boardId={board.id} />
        
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