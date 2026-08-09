import { apiClient } from '@/lib/apiClient';
import type { User } from '@aivora/shared';
import { UsersList } from '@/components/UsersList';

async function getUsers(): Promise<User[]> {
  return apiClient.get<User[]>('/users');
}

export default async function UsersPage() {
  const users = await getUsers();
  return <UsersList users={users} />;
}
