import { NextResponse } from 'next/server';

const DEFAULT_TABLE_NAME = 'Target Audience ID';

interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
}

const pickString = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : null);

export async function GET() {
  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;
  const table = process.env.AIRTABLE_TARGET_TABLE ?? DEFAULT_TABLE_NAME;

  if (!apiKey || !baseId || !table) {
    return NextResponse.json({ error: 'Missing Airtable configuration' }, { status: 500 });
  }

  const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
    cache: 'no-store'
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: text || 'Airtable error' }, { status: res.status });
  }

  const data = (await res.json()) as { records?: AirtableRecord[] };
  const entries =
    data.records?.map((record) => {
      const fields = record.fields ?? {};
      const label =
        pickString(fields['Target Audience Name']) ??
        pickString(fields['Name']) ??
        pickString(fields['Label']) ??
        pickString(fields['Target Audience']) ??
        pickString(fields['Target Audience ID']) ??
        record.id;
      const code =
        pickString(fields['Target Audience ID']) ??
        pickString(fields['Code']) ??
        pickString(fields['code']) ??
        record.id;
      return { label, code };
    }) ?? [];

  return NextResponse.json({
    audiences: entries.filter((item) => item.label && item.code),
    count: entries.length
  });
}
