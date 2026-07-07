import { TrendingUp, Coins } from 'lucide-react';
import { Avatar } from './Avatar';
import type { Me } from '../lib/api';

export function TopBar({ user }: { user: Me }) {
  return (
    <div className="hidden items-center justify-end gap-3 border-b border-hairline bg-void px-6 py-3 md:flex">
      <span className="flex items-center gap-2 rounded-full bg-gradient-to-r from-accent-2 to-accent px-4 py-2 text-base font-semibold text-white">
        <TrendingUp size={18} /> Level 1
      </span>
      <span className="flex items-center gap-2 rounded-full border border-hairline bg-surface px-4 py-2 text-base font-semibold text-ink">
        <Coins size={18} className="text-warn" /> 0
      </span>
      <Avatar name={user.username} size="sm" ring />
    </div>
  );
}
