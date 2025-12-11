import { NextResponse } from 'next/server';

const DEFAULT_TABLE_NAME = 'Lead Gen Forms';

interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
}

const getEnv = () => ({
  apiKey: process.env.AIRTABLE_API_KEY,
  baseId: process.env.AIRTABLE_BASE_ID,
  table: process.env.AIRTABLE_LEADGEN_TABLE ?? DEFAULT_TABLE_NAME
});

const pickText = (value: unknown) => {
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string' && value.trim()) return value.trim();
  return null;
};

export async function GET() {
  const { apiKey, baseId, table } = getEnv();
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
  const forms =
    data.records
      ?.map((record) => {
        const fields = record.fields ?? {};
        const lgFormId = pickText(fields['LG Form ID']);

        // Nur Records mit "LG Form ID" zurückgeben
        if (!lgFormId) {
          return null;
        }

        const code =
          pickText(fields['Leadgenform ID aus LinkedIn']) ??
          pickText(fields['Leadgenform ID aus Linkedin']) ??
          pickText(fields['LGF ID']) ??
          pickText(fields['Code']) ??
          pickText(fields['code']) ??
          lgFormId;
        return {
          label: lgFormId,
          code
        };
      })
      .filter((item): item is { label: string; code: string } => item !== null)
      .sort((a, b) => {
        // Extrahiere numerische Teile aus den IDs für Sortierung
        const extractNumber = (str: string): number => {
          const match = str.match(/\d+/);
          return match ? Number.parseInt(match[0], 10) : 0;
        };

        const numA = extractNumber(a.label);
        const numB = extractNumber(b.label);

        // Sortiere nach Zahlen, falls vorhanden, sonst alphabetisch
        if (numA !== 0 || numB !== 0) {
          return numA - numB;
        }
        return a.label.localeCompare(b.label);
      }) ?? [];

  return NextResponse.json({
    forms,
    count: forms.length
  });
}
