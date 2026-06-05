import { apiClient } from '@/lib/apiClient';
import type { User } from '@aivora/shared';

async function getUsers(): Promise<User[]> {
  return apiClient.get<User[]>('/users');
}

export default async function UsersPage() {
  const users = await getUsers();

  return (
    <main>
      <h1>Users</h1>
      {users.length === 0 ? (
        <p>No users yet.</p>
      ) : (
        <ul>
          {users.map((user) => (
            <li key={user.id}>
              <strong>{user.name ?? 'Unnamed'}</strong> — {user.email}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
