import { apiClient } from '@/lib/apiClient';
import type { User } from '@aivora/shared';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar';
import { Separator } from '@/components/ui/Separator';

async function getUsers(): Promise<User[]> {
  return apiClient.get<User[]>('/users');
}

function getInitials(name: string | null | undefined, email: string): string {
  if (name) {
    const parts = name.trim().split(' ');
    return parts.length >= 2
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : parts[0][0].toUpperCase();
  }
  return email[0].toUpperCase();
}

export default async function UsersPage() {
  const users = await getUsers();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-[28px] font-semibold tracking-tight text-ink">Users</h1>
        <p className="mt-1 text-[15px] text-muted">
          {users.length === 0
            ? 'No users yet.'
            : `${users.length} member${users.length === 1 ? '' : 's'} in your workspace`}
        </p>
      </div>

      {users.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
          {users.map((user, index) => (
            <div key={user.id}>
              <div className="flex items-center gap-4 px-6 py-4">
                <Avatar>
                  <AvatarImage src={undefined} alt={user.name ?? user.email} />
                  <AvatarFallback>{getInitials(user.name, user.email)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-medium text-ink">
                    {user.name ?? 'Unnamed'}
                  </p>
                  <p className="truncate text-[13px] text-muted">{user.email}</p>
                </div>
              </div>
              {index < users.length - 1 && <Separator />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
