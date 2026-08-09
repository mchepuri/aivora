import type { User } from '@aivora/shared';
import { Avatar } from '@astryxdesign/core/Avatar';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { Card } from '@astryxdesign/core/Card';
import { Separator } from '@/components/ui/Separator';

interface Props {
  users: User[];
}

export function UsersList({ users }: Props) {
  return (
    <div>
      <div className="mb-8">
        <Heading level={1}>Users</Heading>
        <Text color="secondary">
          {users.length === 0
            ? 'No users yet.'
            : `${users.length} member${users.length === 1 ? '' : 's'} in your workspace`}
        </Text>
      </div>

      {users.length > 0 && (
        <Card padding={0}>
          {users.map((user, index) => (
            <div key={user.id}>
              <div className="flex items-center gap-4 px-6 py-4">
                <Avatar name={user.name ?? user.email} />
                <div className="min-w-0 flex-1">
                  <Text weight="medium" maxLines={1}>
                    {user.name ?? 'Unnamed'}
                  </Text>
                  <Text color="secondary" maxLines={1}>
                    {user.email}
                  </Text>
                </div>
              </div>
              {index < users.length - 1 && <Separator />}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
