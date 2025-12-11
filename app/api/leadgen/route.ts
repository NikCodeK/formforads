import { NextResponse } from 'next/server';

const DEFAULT_LEADGEN_WEBHOOK_URL = 'https://cleverfunding.app.n8n.cloud/webhook-test/edaa879d-442a-4fcf-8fc1-dd9df5797efe';
const DEFAULT_LEADGEN_WEBHOOK_TOKEN = 'n8n_ingest_7e2f4a913c8d4fb1b1d51b64b83a92c1';
const DEFAULT_LEADGEN_WEBHOOK_METHOD = 'POST';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const payload = body?.payload ?? body;
    if (!payload) {
      return NextResponse.json({ message: 'Missing payload' }, { status: 400 });
    }

    const url = process.env.LEADGEN_WEBHOOK_URL ?? DEFAULT_LEADGEN_WEBHOOK_URL;
    const token = process.env.LEADGEN_WEBHOOK_TOKEN ?? DEFAULT_LEADGEN_WEBHOOK_TOKEN;
    const method = (process.env.LEADGEN_WEBHOOK_METHOD ?? DEFAULT_LEADGEN_WEBHOOK_METHOD).toUpperCase();

    const supportsBody = method !== 'GET' && method !== 'HEAD';
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    let requestUrl = url;
    let bodyPayload: string | undefined;
    if (supportsBody) {
      bodyPayload = JSON.stringify(payload);
    } else {
      try {
        const urlObject = new URL(url);
        urlObject.searchParams.set('payload', JSON.stringify(payload));
        requestUrl = urlObject.toString();
      } catch {
        requestUrl = `${url}${url.includes('?') ? '&' : '?'}payload=${encodeURIComponent(JSON.stringify(payload))}`;
      }
    }

    const response = await fetch(requestUrl, { method, headers, body: bodyPayload });
    const text = await response.text();

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { message: text || 'No content' };
    }

    return NextResponse.json(parsed, { status: response.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ message }, { status: 500 });
  }
}
