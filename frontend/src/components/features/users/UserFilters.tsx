import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface UserFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  selectedGroup: string;
  onGroupChange: (value: string) => void;
  groups: any[];
}

export default function UserFilters({ search, onSearchChange, selectedGroup, onGroupChange, groups }: UserFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
      <div className="relative w-full sm:w-[480px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Пошук за іменем або email..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 h-11 border-slate-200 rounded-md focus-visible:ring-[#BA0000]/20 focus-visible:border-[#BA0000] text-sm"
        />
      </div>
      <Select value={selectedGroup || "all"} onValueChange={(val) => onGroupChange(val === "all" ? "" : val)}>
        <SelectTrigger className="w-full sm:w-48 h-11 bg-white border-slate-200">
          <SelectValue placeholder="Всі групи" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Всі групи</SelectItem>
          {groups.map((g) => (
            <SelectItem key={g._id} value={g._id}>{g.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
