'use client';

import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import type { LeadGenFormDraft, OptionWithCode, CampaignBuilderFormState } from '@/lib/types';
import {
  createEmptyLeadGenDraft,
  LEADGEN_CTA_OPTIONS,
  LEADGEN_WEBHOOK_URL,
  resolveLeadGenResult,
  sendLeadGenWebhook,
  validateLeadGenDraft
} from '@/lib/leadgen';
import { useLeadGenForms } from '@/lib/useLeadGenForms';

const WEBHOOK_URL = 'https://cleverfunding.app.n8n.cloud/webhook/edaa879d-442a-4fcf-8fc1-dd9df5797efe';

interface CampaignSidebarProps {
  formState?: Partial<CampaignBuilderFormState>;
  onFormStateChange?: (state: Partial<CampaignBuilderFormState>) => void;
}

export function CampaignSidebar({ formState: externalFormState, onFormStateChange }: CampaignSidebarProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitFeedback, setSubmitFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isLeadGenModalOpen, setIsLeadGenModalOpen] = useState(false);
  const [leadGenDraft, setLeadGenDraft] = useState<LeadGenFormDraft>(createEmptyLeadGenDraft());
  const [isLeadGenSubmitting, setIsLeadGenSubmitting] = useState(false);
  const [leadGenSubmitFeedback, setLeadGenSubmitFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [customLeadGenForms, setCustomLeadGenForms] = useState<OptionWithCode[]>([]);
  const [leadGenStatus, setLeadGenStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const isLeadGenWebhookConfigured = Boolean(LEADGEN_WEBHOOK_URL);
  const { forms: fetchedLeadGenForms } = useLeadGenForms();

  const logLeadGenDebug = useCallback((label: string, data?: unknown) => {
    console.log(`[leadgen] ${label}`, data);
  }, []);

  const leadGenFormOptions = useMemo(
    () => [...fetchedLeadGenForms, ...customLeadGenForms],
    [customLeadGenForms, fetchedLeadGenForms]
  );

  const leadGenTicker = useMemo(() => {
    if (leadGenStatus === 'sending') {
      return {
        label: 'Sending…',
        wrapper: 'border-rose-200 bg-rose-50 text-rose-600',
        dot: 'bg-rose-500'
      };
    }
    if (leadGenStatus === 'success') {
      const message = typeof leadGenSubmitFeedback?.message === 'string' ? leadGenSubmitFeedback.message : 'Successfully created';
      return {
        label: message,
        wrapper: 'border-emerald-200 bg-emerald-50 text-emerald-600',
        dot: 'bg-emerald-500'
      };
    }
    if (leadGenStatus === 'error') {
      const message = leadGenSubmitFeedback?.message ?? 'Send failed';
      return {
        label: message,
        wrapper: 'border-rose-200 bg-rose-50 text-rose-600',
        dot: 'bg-rose-500'
      };
    }
    return {
      label: 'Not in use',
      wrapper: 'border-slate-200 bg-slate-100 text-slate-600',
      dot: 'bg-slate-400'
    };
  }, [leadGenStatus, leadGenSubmitFeedback]);

  const updateLeadGenDraft = useCallback((updates: Partial<LeadGenFormDraft>) => {
    setLeadGenDraft((prev) => ({ ...prev, ...updates }));
  }, []);

  const resetLeadGenDraft = useCallback(() => {
    setLeadGenDraft(createEmptyLeadGenDraft());
  }, []);

  const reportLeadGenError = useCallback((message: string) => {
    setLeadGenSubmitFeedback({ type: 'error', message });
    setLeadGenStatus('error');
  }, []);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitFeedback(null);

    const payload = {
      campaign: externalFormState,
      timestamp: new Date().toISOString()
    };

    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Webhook antwortete mit einem Fehler.');
      }

      console.log('Campaign submitted:', payload);
      setSubmitFeedback({ type: 'success', message: 'Webhook erfolgreich ausgelöst.' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unbekannter Fehler beim Abschicken.';
      setSubmitFeedback({ type: 'error', message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLeadGenSubmit = async () => {
    setLeadGenSubmitFeedback(null);

    if (!LEADGEN_WEBHOOK_URL) {
      reportLeadGenError('Kein Leadgen-WebHook konfiguriert.');
      return;
    }

    const validationError = validateLeadGenDraft(leadGenDraft);
    if (validationError) {
      reportLeadGenError(validationError);
      return;
    }

    setLeadGenStatus('sending');
    setIsLeadGenSubmitting(true);

    const payload = {
      draft: leadGenDraft,
      campaign: externalFormState,
      success: true
    };

    try {
      logLeadGenDebug('submission-started', { payload });
      const result = await sendLeadGenWebhook(payload, { log: logLeadGenDebug });

      if (!result.success) {
        throw new Error(result.message ?? 'Leadgen-Webhook meldete einen Fehler.');
      }

      const resolved = resolveLeadGenResult(result.parsedBody, leadGenDraft, {
        label: externalFormState?.leadGenForm ?? leadGenFormOptions[0]?.label ?? '',
        id: externalFormState?.leadGenFormId ?? leadGenFormOptions[0]?.code ?? ''
      });

      setLeadGenStatus('success');
      setLeadGenSubmitFeedback({ type: 'success', message: result.message ?? 'Lead Gen Form erfolgreich erstellt!' });
      setLeadGenDraft(resolved.draft);
      setIsLeadGenModalOpen(false);

      if (onFormStateChange) {
        onFormStateChange({
          leadGenForm: resolved.formLabel,
          leadGenFormId: resolved.formId,
          leadGenFormDraft: resolved.draft
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unbekannter Fehler beim Leadgen-Webhook.';
      logLeadGenDebug('submission-error', { error, message });
      reportLeadGenError(message);
    } finally {
      setIsLeadGenSubmitting(false);
    }
  };

  return (
    <>
      <aside className="w-full shrink-0 space-y-5 lg:w-[320px] xl:sticky xl:top-12">
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
          <h3 className="text-lg font-semibold text-slate-900">Summary</h3>
          <dl className="space-y-2 text-sm text-slate-600">
            <div className="flex justify-between">
              <dt>Phase</dt>
              <dd className="font-medium text-slate-900">{externalFormState?.phase || '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Format</dt>
              <dd className="font-medium text-slate-900">{externalFormState?.format || '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Target</dt>
              <dd className="font-medium text-slate-900">{externalFormState?.target || '—'}</dd>
            </div>
            {externalFormState?.targetForAirtable ? (
              <div className="flex justify-between">
                <dt>Target (Airtable)</dt>
                <dd className="font-medium text-slate-900">{externalFormState.targetForAirtable}</dd>
              </div>
            ) : null}
            <div className="flex justify-between">
              <dt>Target Audience Type</dt>
              <dd className="font-medium text-slate-900">{externalFormState?.targetAudienceType || '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Audience Type Code</dt>
              <dd className="font-medium text-slate-900">{externalFormState?.targetAudienceTypeCode || '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Target Audience ID</dt>
              <dd className="font-medium text-slate-900">{externalFormState?.targetAudienceCode || '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Target URL</dt>
              <dd className="font-medium text-slate-900">{externalFormState?.targetUrl || '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Lead Gen Form</dt>
              <dd className="font-medium text-slate-900">{externalFormState?.leadGenForm || '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Lead Gen Form ID</dt>
              <dd className="font-medium text-slate-900">{externalFormState?.leadGenFormId || '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Total Variants</dt>
              <dd className="font-semibold text-slate-900">{externalFormState?.variants?.length || 0}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Asset Type Code</dt>
              <dd className="font-medium text-slate-900">{externalFormState?.assetType || '—'}</dd>
            </div>
          </dl>
          <button
            type="button"
            onClick={() => {
              resetLeadGenDraft();
              setLeadGenSubmitFeedback(null);
              setLeadGenStatus('idle');
              setIsLeadGenModalOpen(true);
            }}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
          >
            Leadgen Form erstellen
          </button>
          <div className={`mt-2 inline-flex min-h-[32px] w-full items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold ${leadGenTicker.wrapper}`}>
            <span className={`h-2 w-2 rounded-full ${leadGenTicker.dot}`} />
            <span className="flex-1 text-left">{leadGenTicker.label}</span>
          </div>
          <button
            type="button"
            onClick={handleSubmit}
            className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-emerald-400"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Sendet…' : 'Abschicken'}
          </button>
          {submitFeedback && (
            <p className={`text-xs ${submitFeedback.type === 'success' ? 'text-emerald-600' : 'text-rose-500'}`}>
              {submitFeedback.message}
            </p>
          )}
        </div>
      </aside>

      <LeadGenFormModal
        open={isLeadGenModalOpen}
        draft={leadGenDraft}
        ticker={leadGenTicker}
        isSubmitting={isLeadGenSubmitting}
        isWebhookConfigured={isLeadGenWebhookConfigured}
        onChange={updateLeadGenDraft}
        onReset={() => {
          resetLeadGenDraft();
          setLeadGenStatus('idle');
        }}
        onSubmit={handleLeadGenSubmit}
        onClose={() => {
          setLeadGenSubmitFeedback(null);
          setIsLeadGenModalOpen(false);
        }}
      />
    </>
  );
}

function LeadGenFormModal({
  open,
  draft,
  ticker,
  isSubmitting,
  isWebhookConfigured,
  onChange,
  onReset,
  onSubmit,
  onClose
}: {
  open: boolean;
  draft: LeadGenFormDraft;
  ticker: { wrapper: string; dot: string; label: string };
  isSubmitting: boolean;
  isWebhookConfigured: boolean;
  onChange: (updates: Partial<LeadGenFormDraft>) => void;
  onReset: () => void;
  onSubmit: () => void;
  onClose: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={() => {
        onClose();
      }}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <TextField label="Phase" value={draft.phase} onChange={(value) => onChange({ phase: value })} />
        <TextField label="LG Form Image ID" value={draft.imageId} onChange={(value) => onChange({ imageId: value })} />
        <TextField
          label="LG Form Image Link"
          value={draft.imageLink}
          onChange={(value) => onChange({ imageLink: value })}
          placeholder="https://"
        />
        <TextField label="LG Form Title (60 Zeichen)" value={draft.title} onChange={(value) => onChange({ title: value })} />
        <TextField
          label="LG Form Detail (160 Zeichen)"
          value={draft.detail}
          onChange={(value) => onChange({ detail: value })}
          multiline
          rows={3}
        />
        <TextField
          label="LG Form Thank You Message (300 Zeichen)"
          value={draft.thankYouMessage}
          onChange={(value) => onChange({ thankYouMessage: value })}
          multiline
          rows={4}
        />
        <SelectControl label="LGF CTA" value={draft.cta} options={LEADGEN_CTA_OPTIONS} onChange={(value) => onChange({ cta: value })} />
        <TextField
          label="LGF Target Link"
          value={draft.targetLink}
          onChange={(value) => onChange({ targetLink: value })}
          placeholder="https://"
        />
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
        <button
          type="button"
          className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
          onClick={onReset}
        >
          Zurücksetzen
        </button>
        <div className={`inline-flex min-h-[32px] items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold ${ticker.wrapper}`}>
          <span className={`h-2 w-2 rounded-full ${ticker.dot}`} />
          <span>{ticker.label}</span>
        </div>
        <button
          type="button"
          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-emerald-400"
          onClick={onSubmit}
          disabled={isSubmitting || !isWebhookConfigured}
        >
          {isSubmitting ? 'Sendet…' : 'Leadgen Form senden'}
        </button>
        <button
          type="button"
          className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
          onClick={onClose}
        >
          Schließen
        </button>
      </div>
    </Modal>
  );
}

function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Leadgen Form erstellen</h3>
          <button
            type="button"
            className="text-sm font-medium text-slate-500 transition hover:text-slate-900"
            onClick={onClose}
          >
            Schließen
          </button>
        </div>
        <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-2">{children}</div>
      </div>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  multiline,
  rows
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
}) {
  return (
    <label className="flex flex-col gap-2 md:col-span-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {multiline ? (
        <textarea
          className="min-h-[96px] rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          value={value}
          placeholder={placeholder}
          rows={rows}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  );
}

function SelectControl({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <select
        className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((option, index) => (
          <option key={`${option}-${index}`} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
