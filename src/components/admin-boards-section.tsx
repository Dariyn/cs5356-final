"use client";

import UserBoardsList from "./user-boards-list";

interface AdminBoardsSectionProps {
  boards: any[];
  adminId: number;
}

export default function AdminBoardsSection({ boards, adminId }: AdminBoardsSectionProps) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <h2 className="text-lg font-semibold mb-4 text-gray-900">User Boards</h2>
      <p className="text-sm text-gray-600 mb-4">View and manage all user boards from this dashboard.</p>
      <UserBoardsList boards={boards} adminId={adminId} />
    </div>
  );
}
