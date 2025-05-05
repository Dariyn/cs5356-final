"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// Interface for board data with user information
interface Board {
  id: number;
  name: string;
  description?: string;
  user_id: number;
  user_name?: string;
  user_email?: string;
  created_at: string | Date;
}

interface UserBoardsListProps {
  boards: Board[];
  adminId: string | number;
}

export default function UserBoardsList({ boards, adminId }: UserBoardsListProps) {
  const router = useRouter();
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  
  // Group boards by user
  const boardsByUser = boards.reduce((acc, board) => {
    const userEmail = board.user_email || 'Unknown User';
    if (!acc[userEmail]) {
      acc[userEmail] = [];
    }
    acc[userEmail].push(board);
    return acc;
  }, {} as Record<string, Board[]>);
  
  const toggleUserExpand = (userEmail: string) => {
    if (expandedUser === userEmail) {
      setExpandedUser(null);
    } else {
      setExpandedUser(userEmail);
    }
  };
  
  return (
    <div className="space-y-4">
      {Object.keys(boardsByUser).length === 0 ? (
        <div className="text-center p-4 bg-gray-50 rounded-md">
          <p className="text-gray-600">No boards found for any users.</p>
        </div>
      ) : (
        Object.entries(boardsByUser).map(([userEmail, userBoards]) => (
          <div key={userEmail} className="border border-gray-200 rounded-md overflow-hidden">
            <div 
              className="flex justify-between items-center p-4 bg-gray-50 cursor-pointer"
              onClick={() => toggleUserExpand(userEmail)}
            >
              <div>
                <h3 className="font-medium text-gray-900">{userEmail}</h3>
                <p className="text-sm text-gray-600">
                  {userBoards.length} {userBoards.length === 1 ? 'board' : 'boards'}
                </p>
              </div>
              <div className="text-gray-500">
                {expandedUser === userEmail ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            </div>
            
            {expandedUser === userEmail && (
              <div className="divide-y divide-gray-200">
                {userBoards.map((board) => (
                  <div key={board.id} className="p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-gray-900">{board.name}</h4>
                        {board.description && (
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{board.description}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-2">
                          Created {new Date(board.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Link
                        href={`/admin/boards/${board.id}`}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                      >
                        View Board
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
