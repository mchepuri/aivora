import { Center } from '@astryxdesign/core/Center';
import { VStack } from '@astryxdesign/core/VStack';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { Link } from '@astryxdesign/core/Link';
import { LoginForm } from './LoginForm';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl = '/dashboard' } = await searchParams;

  return (
    <Center axis="horizontal" className="px-6 py-24">
      <VStack gap={2} width={384}>
        <Heading level={1} justify="center">
          Sign in to Aivora
        </Heading>
        <Text color="secondary" justify="center">
          Welcome back. Enter your details to continue.
        </Text>

        <LoginForm callbackUrl={callbackUrl} />

        <Text color="secondary" justify="center" className="mt-2">
          Don&apos;t have an account? <Link href="/register">Sign up</Link>
        </Text>
      </VStack>
    </Center>
  );
}
