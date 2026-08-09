import { Center } from '@astryxdesign/core/Center';
import { VStack } from '@astryxdesign/core/VStack';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { Link } from '@astryxdesign/core/Link';
import { RegisterForm } from './RegisterForm';

export default function RegisterPage() {
  return (
    <Center axis="horizontal" className="px-6 py-24">
      <VStack gap={2} width={384}>
        <Heading level={1} justify="center">
          Create your account
        </Heading>
        <Text color="secondary" justify="center">
          Start your free trial. No credit card required.
        </Text>

        <RegisterForm />

        <Text color="secondary" justify="center" className="mt-2">
          Already have an account? <Link href="/login">Sign in</Link>
        </Text>
      </VStack>
    </Center>
  );
}
