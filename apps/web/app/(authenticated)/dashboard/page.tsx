import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';

export default function DashboardPage() {
  return (
    <div>
      <div className="mb-8">
        <Heading level={1}>Dashboard</Heading>
        <Text color="secondary">Welcome to Aivora.</Text>
      </div>
    </div>
  );
}
