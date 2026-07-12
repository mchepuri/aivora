import { Section } from '@astryxdesign/core/Section';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { Button } from '@/components/ui/Button';

export function CtaSection() {
  return (
    <Section id="solutions" dividers={['top']} className="px-6 py-20 text-center">
      <Heading level={2} type="display-3" justify="center">
        Ready to see Aivora in action?
      </Heading>
      <Text color="secondary" justify="center" className="mx-auto mt-3 max-w-xl text-[17px]">
        Create a free account and explore the platform — no credit card required.
      </Text>
      <div className="mt-7">
        <Button variant="primary" href="/register">
          Create your account
        </Button>
      </div>
    </Section>
  );
}
