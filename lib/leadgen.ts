import type { CampaignBuilderFormState, LeadGenFormDraft } from './types';

const DEFAULT_LEADGEN_WEBHOOK_URL = 'https://cleverfunding.app.n8n.cloud/webhook-test/9b2b0503-c872-407f-8d53-e26a2a9232dd';
const DEFAULT_LEADGEN_WEBHOOK_METHOD = 'POST';

export const LEADGEN_WEBHOOK_URL = process.env.NEXT_PUBLIC_LEADGEN_WEBHOOK_URL ?? DEFAULT_LEADGEN_WEBHOOK_URL;
export const LEADGEN_WEBHOOK_METHOD = (process.env.NEXT_PUBLIC_LEADGEN_WEBHOOK_METHOD ?? DEFAULT_LEADGEN_WEBHOOK_METHOD).toUpperCase();

export const LEADGEN_CTA_OPTIONS: string[] = [
  'VISIT_COMPANY_WEBSITE',
  'LEARN_MORE',
  'VIEW_NOW',
  'DOWNLOAD_NOW',
  'TRY_NOW'
];

export const createEmptyLeadGenDraft = (): LeadGenFormDraft => ({
  phase: '',
  imageId: '',
  imageLink: '',
  title: '',
  detail: '',
  thankYouMessage: '',
  cta: LEADGEN_CTA_OPTIONS[0] ?? '',
  targetLink: ''
});

export function isValidUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

export function validateLeadGenDraft(draft: LeadGenFormDraft): string | null {
  if (!draft.title.trim()) return 'Bitte einen Titel für das Leadgen-Formular angeben.';
  if (!draft.targetLink.trim()) return 'Bitte einen Ziellink für das Leadgen-Formular angeben.';
  if (!isValidUrl(draft.targetLink)) return 'Bitte einen gültigen Ziellink (https://) angeben.';
  if (draft.imageLink && !isValidUrl(draft.imageLink)) return 'Bitte einen gültigen Bildlink (https://) angeben.';
  return null;
}

function interpretIngestResponse(
  payload: unknown
): { success: boolean; message?: string; metaStatus?: string } {
  const inspectables = Array.isArray(payload) ? payload : [payload];
  let fallbackMessage: string | undefined;
  let fallbackStatus: string | undefined;

  for (const item of inspectables) {
    if (!item || typeof item !== 'object') {
      continue;
    }
    const data = item as Record<string, unknown>;
    const body =
      data.body && typeof data.body === 'object' && data.body !== null
        ? (data.body as Record<string, unknown>)
        : data;

    const dataStatus = data['status'];
    const dataStatusCode = data['statusCode'];
    const bodyStatus = (body as Record<string, unknown>)['status'];
    const bodyStatusCode = (body as Record<string, unknown>)['statusCode'];

    const rawStatus =
      (typeof dataStatus === 'string' && dataStatus) ||
      (typeof dataStatusCode === 'string' && dataStatusCode) ||
      (typeof dataStatusCode === 'number' && String(dataStatusCode)) ||
      (typeof bodyStatus === 'string' && bodyStatus) ||
      (typeof bodyStatusCode === 'string' && bodyStatusCode) ||
      (typeof bodyStatusCode === 'number' && String(bodyStatusCode)) ||
      undefined;
    if (rawStatus && !fallbackStatus) {
      fallbackStatus = rawStatus;
    }

    const bodyMessage = (body as Record<string, unknown>)['message'];
    const dataMessage = data['message'];
    const rawMessage =
      (typeof bodyMessage === 'string' && bodyMessage.trim()) ||
      (typeof dataMessage === 'string' && dataMessage.trim()) ||
      undefined;
    if (rawMessage && !fallbackMessage) {
      fallbackMessage = rawMessage;
    }

    const successFlags = [
      (body as Record<string, unknown>)['received'],
      data['received'],
      (body as Record<string, unknown>)['success'],
      data['success']
    ].map((value) => {
      if (value === true) return true;
      if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        return normalized === 'true' || normalized === 'ok' || normalized === 'success' || normalized === 'created';
      }
      return false;
    });

    if (successFlags.some(Boolean)) {
      return { success: true, message: rawMessage, metaStatus: rawStatus };
    }

    const normalizedStatus = rawStatus?.trim().toLowerCase();
    if (normalizedStatus && ['ok', 'success', 'created'].includes(normalizedStatus)) {
      return { success: true, message: rawMessage, metaStatus: rawStatus };
    }

    if (typeof dataStatusCode === 'number' && dataStatusCode >= 200 && dataStatusCode < 300) {
      return { success: true, message: rawMessage, metaStatus: rawStatus };
    }
  }

  const normalizedFallbackMessage = fallbackMessage?.trim().toLowerCase();
  if (normalizedFallbackMessage && normalizedFallbackMessage.includes('workflow was started')) {
    return { success: true, message: fallbackMessage, metaStatus: fallbackStatus };
  }

  return { success: false, message: fallbackMessage, metaStatus: fallbackStatus };
}

export interface LeadGenWebhookResult {
  success: boolean;
  message?: string;
  metaStatus?: string;
  parsedBody?: unknown;
  method?: string;
  url?: string;
}

export async function sendLeadGenWebhook(
  payload: unknown,
  options: {
    url?: string;
    method?: string;
    log?: (label: string, data?: unknown) => void;
  } = {}
): Promise<LeadGenWebhookResult> {
  const log = options.log ?? (() => {});
  const baseUrl = options.url ?? LEADGEN_WEBHOOK_URL;
  if (!baseUrl) {
    return { success: false, message: 'Kein Leadgen-WebHook konfiguriert.' };
  }
  let activeUrl = baseUrl;
  let activeMethod = (options.method ?? LEADGEN_WEBHOOK_METHOD).toUpperCase();

  const sendRequest = async (url: string, method: string) => {
    const supportsBody = method !== 'GET' && method !== 'HEAD';
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };

    let requestUrl = url;
    let body: string | undefined;
    if (supportsBody) {
      body = JSON.stringify({ payload });
    } else {
      try {
        const urlObject = new URL(url);
        urlObject.searchParams.set('payload', JSON.stringify(payload));
        requestUrl = urlObject.toString();
      } catch {
        requestUrl = `${url}${url.includes('?') ? '&' : '?'}payload=${encodeURIComponent(JSON.stringify(payload))}`;
      }
    }

    log('request-dispatch', { url: requestUrl, method, supportsBody });

    const response = await fetch(requestUrl, { method, headers, body });
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });
    log('response-meta', {
      url: requestUrl,
      method,
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders
    });
    return response;
  };

  const isInternalProxy = activeUrl.startsWith('/api/leadgen');
  let response = await sendRequest(activeUrl, activeMethod);

  if (!isInternalProxy) {
    if (response.status === 404 && activeUrl.includes('/webhook-test/')) {
      log('fallback-webhook-url', { from: activeUrl, to: activeUrl.replace('/webhook-test/', '/webhook/') });
      activeUrl = activeUrl.replace('/webhook-test/', '/webhook/');
      response = await sendRequest(activeUrl, activeMethod);
    }

    if (response.status === 405 && activeMethod !== 'GET') {
      log('method-retry', { previousMethod: activeMethod, nextMethod: 'GET' });
      activeMethod = 'GET';
      response = await sendRequest(activeUrl, activeMethod);
    }
  }

  if (!response.ok) {
    const errorText = await response.text();
    const statusInfo = response.status ? ` (Status ${response.status})` : '';
    log('response-error', { status: response.status, statusText: response.statusText, body: errorText });
    return { success: false, message: errorText || `Leadgen-Webhook antwortete mit einem Fehler${statusInfo}.` };
  }

  let parsedBody: unknown = {};
  try {
    parsedBody = await response.json();
    log('response-body', parsedBody);
  } catch (parseError) {
    log('response-json-parse-error', parseError);
  }

  const interpreted = interpretIngestResponse(parsedBody);
  if (!interpreted.success) {
    const statusSuffix = interpreted.metaStatus ? ` (${interpreted.metaStatus})` : '';
    const message =
      interpreted.message ??
      (Array.isArray(parsedBody) && parsedBody.length === 0
        ? 'Leadgen-Webhook lieferte keine Daten.'
        : 'Leadgen-Webhook meldete keinen Erfolg.');
    log('interpreted-failure', { interpreted, raw: parsedBody });
    return { success: false, message: `${message}${statusSuffix}`, parsedBody };
  }

  const successMessage =
    interpreted.message && interpreted.message.trim() ? interpreted.message : 'Workflow has succeed';

  return {
    success: true,
    message: successMessage,
    metaStatus: interpreted.metaStatus,
    parsedBody,
    method: activeMethod,
    url: activeUrl
  };
}

export function resolveLeadGenResult(
  parsedBody: unknown,
  draftPayload: LeadGenFormDraft,
  fallbackForm: { label: string; id: string }
): { formLabel: string; formId: string; draft: LeadGenFormDraft } {
  const resolvedResult =
    Array.isArray(parsedBody)
      ? (() => {
          const withBody = parsedBody.find(
            (item) => item && typeof item === 'object' && 'body' in (item as Record<string, unknown>)
          ) as { body?: Record<string, unknown> } | undefined;
          if (withBody?.body && typeof withBody.body === 'object') {
            return withBody.body;
          }
          const firstObject = parsedBody.find((item) => item && typeof item === 'object') as
            | Record<string, unknown>
            | undefined;
          return firstObject;
        })()
      : (parsedBody as Record<string, unknown> | undefined);

  const resolvedLeadGenForm =
    resolvedResult && typeof resolvedResult.leadGenForm === 'object' && resolvedResult.leadGenForm !== null
      ? (resolvedResult.leadGenForm as Record<string, unknown>)
      : undefined;

  const newFormLabel =
    (resolvedLeadGenForm && typeof resolvedLeadGenForm.label === 'string'
      ? String(resolvedLeadGenForm.label)
      : null) ??
    (typeof resolvedResult?.label === 'string' ? resolvedResult.label : null) ??
    fallbackForm.label;
  const newFormId =
    (resolvedLeadGenForm && typeof resolvedLeadGenForm.id === 'string'
      ? String(resolvedLeadGenForm.id)
      : null) ??
    (typeof resolvedResult?.code === 'string' ? resolvedResult.code : null) ??
    fallbackForm.id;
  const newDraft: LeadGenFormDraft = {
    ...draftPayload,
    ...(resolvedResult?.leadGenFormDraft && typeof resolvedResult.leadGenFormDraft === 'object'
      ? (resolvedResult.leadGenFormDraft as Partial<LeadGenFormDraft>)
      : {})
  };

  return {
    formLabel: newFormLabel || fallbackForm.label || `LeadGen ${Date.now()}`,
    formId: newFormId || fallbackForm.id || `${Date.now()}`,
    draft: newDraft
  };
}
