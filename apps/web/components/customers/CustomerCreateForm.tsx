'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Card } from '@astryxdesign/core/Card';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { Link } from '@astryxdesign/core/Link';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Selector } from '@astryxdesign/core/Selector';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@/components/ui/Button';
import { apiClient } from '@/lib/apiClient';
import { CUSTOMER_STATUS_OPTIONS, type CustomerStatus } from './CustomerDialog';

interface FormState {
  code: string;
  legalName: string;
  defaultCurrency: string;
  status: CustomerStatus;
}

function defaultForm(): FormState {
  return {
    code: '',
    legalName: '',
    defaultCurrency: 'USD',
    status: 'PENDING_APPROVAL',
  };
}

export function CustomerCreateForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(defaultForm());
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await apiClient.post('/master-data/customers', form);
      router.push('/customers');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create customer');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-lg">
      <div className="mb-8">
        <Link href="/customers" className="mb-4 inline-flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
            <path
              d="M9 11L5 7l4-4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Customers
        </Link>
        <Heading level={1}>New Customer</Heading>
        <Text color="secondary">Add a new customer to the customer master.</Text>
      </div>

      <Card padding={8}>
        <form onSubmit={handleSubmit} className="space-y-5">
          <TextInput
            label="Code"
            placeholder="e.g. NORTHWIND-01"
            value={form.code}
            onChange={(value) => setForm({ ...form, code: value.toUpperCase() })}
            isRequired
          />
          <TextInput
            label="Legal Name"
            placeholder="e.g. Northwind Traders Inc."
            value={form.legalName}
            onChange={(value) => setForm({ ...form, legalName: value })}
            isRequired
          />
          <TextInput
            label="Default Currency"
            placeholder="USD"
            value={form.defaultCurrency}
            onChange={(value) => setForm({ ...form, defaultCurrency: value.toUpperCase() })}
          />
          <Selector
            label="Status"
            options={CUSTOMER_STATUS_OPTIONS}
            value={form.status}
            onChange={(value) => setForm({ ...form, status: value as CustomerStatus })}
          />

          {error && <Banner status="error" title={error} />}

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={saving}>
              {saving ? 'Creating…' : 'Create Customer'}
            </Button>
            <Button type="button" variant="ghost" href="/customers">
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
