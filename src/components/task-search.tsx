"use client";

import { useState } from "react";
import { Task } from "./board-columns";

interface TaskSearchProps {
  tasks: Task[];
  onTaskClick: (taskId: number, columnId: number) => void;
}

export default function TaskSearch({ tasks, onTaskClick }: TaskSearchProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("");
  const [completionFilter, setCompletionFilter] = useState<string>("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const filteredTasks = tasks.filter((task) => {
    // Search term filter
    const matchesSearch = searchTerm === "" || 
                         task.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (task.description && task.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Priority filter
    const matchesPriority = priorityFilter === "" || 
                           task.priority === priorityFilter;
    
    // Completion filter
    const matchesCompletion = completionFilter === "" || 
                             (completionFilter === "completed" && task.is_completed) || 
                             (completionFilter === "not-completed" && !task.is_completed);
    
    return matchesSearch && matchesPriority && matchesCompletion;
  });

  const handleClick = (taskId: number, columnId: number) => {
    onTaskClick(taskId, columnId);
    setIsSearchOpen(false);
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsSearchOpen(!isSearchOpen)}
        className="p-2 rounded-md bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 flex items-center"
        aria-label="Search tasks"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <path d="m21 21-4.3-4.3"></path>
        </svg>
        <span className="ml-2">Search tasks</span>
      </button>

      {isSearchOpen && (
        <div className="absolute right-0 top-12 z-10 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="space-y-3">
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Search
              </label>
              <input
                id="search"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                placeholder="Search by title or description"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="priority" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Priority
                </label>
                <select
                  id="priority"
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                >
                  <option value="">All Priorities</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="completion" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status
                </label>
                <select
                  id="completion"
                  value={completionFilter}
                  onChange={(e) => setCompletionFilter(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                >
                  <option value="">All Tasks</option>
                  <option value="completed">Completed</option>
                  <option value="not-completed">Not Completed</option>
                </select>
              </div>
            </div>
            
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Results ({filteredTasks.length})
              </h4>
              
              <div className="max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md">
                {filteredTasks.length > 0 ? (
                  <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredTasks.map((task) => (
                      <li 
                        key={task.id} 
                        onClick={() => handleClick(task.id, task.column_id)}
                        className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                      >
                        <div className="flex items-center space-x-2">
                          <span className={`w-2 h-2 rounded-full ${task.is_completed ? 'bg-green-500' : 'bg-blue-500'}`}></span>
                          <span className={`text-sm font-medium ${task.is_completed ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-800 dark:text-white'}`}>
                            {task.title}
                          </span>
                          {task.priority && (
                            <span className={`text-xs px-1.5 py-0.5 rounded-full ml-auto ${
                              task.priority === 'high' ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300' :
                              task.priority === 'low' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300' :
                              'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-300'
                            }`}>
                              {task.priority}
                            </span>
                          )}
                        </div>
                        {task.description && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-1">
                            {task.description}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                    No matching tasks found
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 