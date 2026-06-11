import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users } from 'lucide-react';
import type { IUser } from '@redmonkey/shared';

interface UserAvatarGroupProps {
  users: IUser[];
  maxCount?: number;
  emptyMessage?: string;
  showCount?: boolean;
  countLabel?: string;
  className?: string;
}

export function UserAvatarGroup({ 
  users, 
  maxCount = 5, 
  emptyMessage = 'Користувачів немає',
  showCount = true,
  countLabel = 'ос.',
  className = ''
}: UserAvatarGroupProps) {
  return (
    <div className={`flex items-center justify-between ${className}`}>
      <div className="flex items-center -space-x-2 overflow-hidden">
        {users.slice(0, maxCount).map((user) => (
          <Avatar key={user._id} className="inline-block border-2 border-white h-8 w-8">
            <AvatarImage src={user.avatar || undefined} />
            <AvatarFallback className="bg-slate-200 text-[10px] font-bold text-slate-700">
              {user.firstName[0]}
              {user.lastName[0]}
            </AvatarFallback>
          </Avatar>
        ))}
        {users.length > maxCount && (
          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-slate-100 border-2 border-white text-[10px] font-bold text-slate-600">
            +{users.length - maxCount}
          </div>
        )}
        {users.length === 0 && (
          <span className="text-xs text-slate-400 pl-2">{emptyMessage}</span>
        )}
      </div>
      {showCount && (
        <div className="flex items-center gap-1 text-xs text-slate-500 font-medium">
          <Users className="h-4 w-4" />
          <span>{users.length} {countLabel}</span>
        </div>
      )}
    </div>
  );
}
