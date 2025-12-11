'use client';

import { useEffect, useState, useMemo, ChangeEvent } from 'react';
import { CampaignSidebar } from '@/components/CampaignSidebar';
import { Section } from '@/components/Section';
import type { CampaignBuilderFormState } from '@/lib/types';
import {
  phases,
  adFormats,
  campaignGoals,
  offers,
  adCtas,
  targetAudienceTypes,
  targetAudienceCategory,
  targetUrls,
  mediaTypes,
  numericOptions
} from '@/lib/types';
import { useLeadGenForms } from '@/lib/useLeadGenForms';
import { useTargetAudiences } from '@/lib/useTargetAudiences';
import { createDefaultFormState, generateVariants, resizeVariantList } from '@/lib/campaign';
import type { VariantRow } from '@/lib/types';
import { NumberField, ReadOnlyField, SelectControl } from '@/components/FormControls';

const COUNTRY = 'DE';
const SOURCE = 'li';

export default function MessageAdsPage() {
  const { forms: leadGenFormOptions } = useLeadGenForms();
  const { audiences: targetAudiences } = useTargetAudiences();
  const [formState, setFormState] = useState<CampaignBuilderFormState>(() => {
    const base = createDefaultFormState();
    return {
      ...base,
      phase: 'Message Ads',
      format: 'Message Ad',
      target: 'SPONSORED_INMAILS',
      targetForAirtable: base.targetForAirtable,
      offer: offers[0] ?? '',
      cta: adCtas[0] ?? '',
      targetAudience: '',
      targetAudienceCode: '',
      targetAudienceType: targetAudienceCategory[0]?.label ?? '',
      targetUrl: targetUrls[0] ?? '',
      leadGenForm: '',
      leadGenFormId: '',
      country: COUNTRY,
      budget: 100,
      source: SOURCE,
      assetType: mediaTypes[0]?.label ?? '',
      variants: resizeVariantList([], base.creatives * base.headlines * base.copys)
    };
  });

  useEffect(() => {
    if (!formState.leadGenForm && leadGenFormOptions[0]) {
      setFormState((prev) => ({
        ...prev,
        leadGenForm: leadGenFormOptions[0]?.label ?? '',
        leadGenFormId: leadGenFormOptions[0]?.code ?? ''
      }));
    }
  }, [formState.leadGenForm, leadGenFormOptions]);

  useEffect(() => {
    if (!formState.targetAudience && targetAudiences[0]) {
      setFormState((prev) => ({
        ...prev,
        targetAudience: targetAudiences[0]?.label ?? '',
        targetAudienceCode: targetAudiences[0]?.code ?? ''
      }));
    }
  }, [formState.targetAudience, targetAudiences]);

  const handleSelectChange = (field: keyof CampaignBuilderFormState, value: string) => {
    if (field === 'leadGenForm') {
      const match = leadGenFormOptions.find((item) => item.label === value);
      setFormState((prev) => ({ ...prev, leadGenForm: value, leadGenFormId: match?.code ?? '' }));
      return;
    }
    if (field === 'targetAudience') {
      const match = targetAudiences.find((item) => item.label === value);
      setFormState((prev) => ({ ...prev, targetAudience: value, targetAudienceCode: match?.code ?? '' }));
      return;
    }
    if (field === 'targetForAirtable') {
      setFormState((prev) => ({ ...prev, targetForAirtable: value }));
      return;
    }
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleBudgetChange = (value: string) => {
    const parsed = Number.parseFloat(value);
    setFormState((prev) => ({
      ...prev,
      budget: Number.isNaN(parsed) ? prev.budget : parsed
    }));
  };

  const handleNumberSelect = (field: 'creatives' | 'headlines' | 'copys', value: string) => {
    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed) || parsed <= 0) {
      return;
    }
    setFormState((prev) => {
      const nextCounts = {
        ...prev,
        [field]: parsed
      };
      const total = nextCounts.creatives * nextCounts.headlines * nextCounts.copys;
      return {
        ...nextCounts,
        variants: resizeVariantList(prev.variants, total)
      };
    });
  };

  const handleVariantFieldChange = (
    index: number,
    field: 'headline' | 'copy' | 'assetUrl',
    value: string
  ) => {
    setFormState((prev) => {
      const nextVariants = prev.variants.map((variant, variantIndex) =>
        variantIndex === index ? { ...variant, [field]: value } : variant
      );
      return {
        ...prev,
        variants: nextVariants
      };
    });
  };

  const variants = useMemo<VariantRow[]>(() => generateVariants(formState), [formState]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10 lg:flex-row lg:items-start">
      <div className="flex-1 space-y-6">
        <Section title="Message Ads Campaign" countLabel={`Variants: ${variants.length}`}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <ReadOnlyField label="Phase" value={formState.phase || ''} />
            <ReadOnlyField label="Format" value={formState.format || ''} />
            <ReadOnlyField label="Target (fixed)" value={formState.target} />
            <SelectControl
              label="Target for Airtable"
              value={formState.targetForAirtable || ''}
              options={campaignGoals.map((item) => item.label)}
              onChange={(value) => handleSelectChange('targetForAirtable', value)}
            />
            <SelectControl
              label="Offer"
              value={formState.offer || ''}
              options={offers}
              onChange={(value) => handleSelectChange('offer', value)}
            />
            <SelectControl
              label="CTA"
              value={formState.cta || ''}
              options={adCtas}
              onChange={(value) => handleSelectChange('cta', value)}
            />
            <SelectControl
              label="Target Audience"
              value={formState.targetAudience || ''}
              options={targetAudiences.map((item) => item.label)}
              onChange={(value) => handleSelectChange('targetAudience', value)}
            />
            <SelectControl
              label="Target Audience Type"
              value={formState.targetAudienceType || ''}
              options={targetAudienceCategory.map((item) => item.label)}
              onChange={(value) => handleSelectChange('targetAudienceType', value)}
            />
            <SelectControl
              label="Target URL"
              value={formState.targetUrl || ''}
              options={targetUrls}
              onChange={(value) => handleSelectChange('targetUrl', value)}
            />
            <SelectControl
              label="Lead Gen Form"
              value={formState.leadGenForm || ''}
              options={leadGenFormOptions.map((item) => item.label)}
              onChange={(value) => handleSelectChange('leadGenForm', value)}
            />
            <ReadOnlyField label="Country" value={formState.country || ''} />
            <NumberField
              label="Tagesbudget"
              value={formState.budget || null}
              onChange={handleBudgetChange}
            />
            <ReadOnlyField label="Source" value={formState.source || ''} />
            <SelectControl
              label="#Creatives"
              value={String(formState.creatives)}
              options={numericOptions.map((item) => String(item))}
              onChange={(value) => handleNumberSelect('creatives', value)}
            />
            <SelectControl
              label="#Headlines"
              value={String(formState.headlines)}
              options={numericOptions.map((item) => String(item))}
              onChange={(value) => handleNumberSelect('headlines', value)}
            />
            <SelectControl
              label="#Copys"
              value={String(formState.copys)}
              options={numericOptions.map((item) => String(item))}
              onChange={(value) => handleNumberSelect('copys', value)}
            />
            <SelectControl
              label="Asset Type"
              value={formState.assetType || ''}
              options={mediaTypes.map((item) => item.label)}
              onChange={(value) => handleSelectChange('assetType', value)}
            />
          </div>
        </Section>
        <Section
          title="Variants Preview"
          subtitle="Subject/Message/Image URN Kombinationen"
          countLabel={`${variants.length} rows`}
        >
          {variants.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
              Passe die Counts an, um Varianten zu erzeugen.
            </div>
          ) : (
            <div className="space-y-3">
              {variants.map((variant, index) => {
                const detail = formState.variants[index];
                return (
                  <article
                    key={detail?.id ?? variant.variante}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300"
                  >
                    <header className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{variant.variante}</p>
                        <p className="text-xs uppercase tracking-wide text-slate-500">
                          {variant.phase} · {variant.format} · {variant.target}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-slate-900">
                        {variant.budget !== null
                          ? variant.budget.toLocaleString('de-DE', { minimumFractionDigits: 2 }) + ' €'
                          : '—'}
                      </p>
                    </header>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <VariantEditableField
                        label="Subject Line"
                        value={detail?.headline ?? ''}
                        placeholder="Subject line"
                        onChange={(value) => handleVariantFieldChange(index, 'headline', value)}
                      />
                      <VariantEditableField
                        label="Message Body"
                        value={detail?.copy ?? ''}
                        placeholder="Message text"
                        onChange={(value) => handleVariantFieldChange(index, 'copy', value)}
                      />
                      <VariantEditableField
                        label="Image"
                        value={detail?.assetUrl ?? ''}
                        placeholder="https://drive.google.com/..."
                        onChange={(value) => handleVariantFieldChange(index, 'assetUrl', value)}
                        multiline={false}
                        type="url"
                        toggleable
                      />
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </Section>
      </div>

      <CampaignSidebar formState={formState} onFormStateChange={(updates) => setFormState({ ...formState, ...updates })} />
    </div>
  );
}

function VariantEditableField({
  label,
  value,
  onChange,
  placeholder,
  multiline = true,
  type = 'text',
  toggleable = false
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
    multiline?: boolean;
    type?: string;
    toggleable?: boolean;
  }) {
  const baseClass = `rounded-xl border bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200`;
    const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onChange(event.target.value);
    };

  return (
    <label className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        {toggleable ? (
          <button
            type="button"
            onClick={() => onChange(value ? '' : 'https://')}
            className={`text-xs font-semibold ${
              value ? 'text-rose-600 hover:text-rose-700' : 'text-blue-600 hover:text-blue-700'
            }`}
          >
            {value ? 'Deaktivieren' : 'Aktivieren'}
          </button>
        ) : null}
      </div>
      {multiline ? (
        <textarea
          className={`min-h-[80px] ${baseClass}`}
          value={value}
          placeholder={placeholder}
          onChange={handleChange}
        />
      ) : (
        <input
          className={baseClass}
          value={value}
          placeholder={placeholder}
          onChange={handleChange}
          type={type}
        />
      )}
    </label>
  );
}
