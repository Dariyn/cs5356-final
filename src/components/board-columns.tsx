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
  
  // Function to add a new task to a column without refreshing the page
  const handleAddTask = (columnId: number, newTask: Task) => {
    setColumns(currentColumns => {
      return currentColumns.map(column => {
        if (column.id === columnId) {
          return {
            ...column,
            tasks: [...column.tasks, newTask]
          };
        }
        return column;
      });
    });
  };
  
  // Function to remove a task from a column without refreshing the page
  const handleRemoveTask = (taskId: number) => {
    setColumns(currentColumns => {
      return currentColumns.map(column => {
        return {
          ...column,
          tasks: column.tasks.filter(task => task.id !== taskId)
        };
      });
    });
  };
  
  // Function to update a task in a column without refreshing the page
  const handleUpdateTask = (updatedTask: Task) => {
    setColumns(currentColumns => {
      return currentColumns.map(column => {
        if (column.id === updatedTask.column_id) {
          return {
            ...column,
            tasks: column.tasks.map(task => 
              task.id === updatedTask.id ? updatedTask : task
            )
          };
        }
        return column;
      });
    });
  };
  
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
    
    // We only care about dragging tasks over columns
    if (!activeId.startsWith("column-") && overId.startsWith("column-")) {
      const taskId = parseInt(activeId);
      const newColumnId = parseInt(overId.replace("column-", ""));
      
      // Find the source column containing the task
      let sourceColumnId: number | null = null;
      
      for (const column of columns) {
        const taskIndex = column.tasks.findIndex(t => t.id === taskId);
        if (taskIndex !== -1) {
          sourceColumnId = column.id;
          break;
        }
      }
      
      // Only update if we're moving to a different column
      if (sourceColumnId !== null && sourceColumnId !== newColumnId) {
        // Update the columns state to move the task between columns
        setColumns(currentColumns => {
          // First find the task and remove it from the source column
          let taskToMove: Task | null = null;
          
          const updatedColumns = currentColumns.map(column => {
            if (column.id === sourceColumnId) {
              // Find the task to move
              const task = column.tasks.find(t => t.id === taskId);
              if (task) {
                taskToMove = { ...task, column_id: newColumnId };
                // Remove the task from this column
                return {
                  ...column,
                  tasks: column.tasks.filter(t => t.id !== taskId)
                };
              }
            }
            return column;
          });
          
          // Then add the task to the target column
          if (taskToMove) {
            return updatedColumns.map(column => {
              if (column.id === newColumnId) {
                return {
                  ...column,
                  tasks: [...column.tasks, taskToMove!]
                };
              }
              return column;
            });
          }
          
          return currentColumns; // Return original if something went wrong
        });
      }
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
      
      for (const column of columns) {
        const taskIndex = column.tasks.findIndex(t => t.id === taskId);
        if (taskIndex !== -1) {
          sourceColumnId = column.id;
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
          
          // We don't need to refresh since we've already updated the state in handleDragOver
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
          targetIndex = tIndex;
        }
        
        if (sourceIndex !== -1 && targetIndex !== -1) break;
      }
      
      if (sourceColumnId !== null && sourceIndex !== -1 && targetIndex !== -1) {
        // Reordering within the same column
        setColumns(currentColumns => {
          return currentColumns.map(column => {
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
                taskIds: taskIds
              }),
            });
            
            if (!reorderResponse.ok) {
              const errorData = await reorderResponse.json();
              throw new Error(errorData.message || "Failed to reorder tasks");
            }
            
            console.log(`Tasks reordered successfully in column ${sourceColumnId}`);
            toast.success("Task order saved");
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
      {/* Mobile view instructions */}
      <div className="md:hidden bg-blue-50 p-3 mb-4 rounded-lg border border-blue-200 text-sm text-blue-800">
        <p className="font-medium">Mobile View</p>
        <p>Scroll horizontally to see all columns. Tap and hold to drag items.</p>
      </div>

      {/* Responsive container with horizontal scroll on mobile */}
      <div className="overflow-x-auto pb-4 -mx-4 px-4 md:mx-0 md:px-0">
        <div className="flex h-full gap-4 md:gap-6 items-start min-w-max">
          <SortableContext items={columns.map(col => `column-${col.id}`)} strategy={horizontalListSortingStrategy}>
            {columns.map((column) => (
              <ColumnContainer
                key={column.id}
                column={column}
                boardId={board.id}
                onAddTask={handleAddTask}
                onRemoveTask={handleRemoveTask}
                onUpdateTask={handleUpdateTask}
              />
            ))}
          </SortableContext>
        </div>
      </div>
      
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
    </DndContext>
  );
}
