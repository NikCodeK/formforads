'use client';

import { useEffect, useState } from 'react';
import { CampaignSidebar } from '@/components/CampaignSidebar';
import { Section } from '@/components/Section';
import type { CampaignBuilderFormState } from '@/lib/types';
import {
  phases,
  adFormats,
  campaignGoals,
  offers,
  adCtas,
  targetAudienceCategory,
  targetUrls,
  mediaTypes,
  numericOptions
} from '@/lib/types';
import { useLeadGenForms } from '@/lib/useLeadGenForms';
import { useTargetAudiences } from '@/lib/useTargetAudiences';
import { NumberField, ReadOnlyField, SelectControl } from '@/components/FormControls';

const COUNTRY = 'DE';
const SOURCE = 'li';

export default function AwarenessPage() {
  const { forms: leadGenFormOptions, reload: reloadLeadGenForms, loading: loadingLeadGenForms } = useLeadGenForms();
  const { audiences: targetAudiences, reload: reloadAudiences, loading: loadingAudiences } = useTargetAudiences();
  const [formState, setFormState] = useState<Partial<CampaignBuilderFormState>>({
    phase: 'Awareness',
    format: adFormats[0]?.label ?? '',
    target: campaignGoals[0]?.label ?? '',
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
    assetType: mediaTypes[0]?.label ?? ''
  });

  useEffect(() => {
    if (!formState.leadGenForm && leadGenFormOptions[0]) {
      setFormState((prev) => ({ ...prev, leadGenForm: leadGenFormOptions[0]?.label ?? '', leadGenFormId: leadGenFormOptions[0]?.code ?? '' }));
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
    if (field === 'targetAudience') {
      const match = targetAudiences.find((item) => item.label === value);
      setFormState((prev) => ({ ...prev, targetAudience: value, targetAudienceCode: match?.code ?? '' }));
      return;
    }
    if (field === 'leadGenForm') {
      const match = leadGenFormOptions.find((item) => item.label === value);
      setFormState((prev) => ({ ...prev, leadGenForm: value, leadGenFormId: match?.code ?? '' }));
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

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10 lg:flex-row lg:items-start">
      <div className="flex-1 space-y-6">
        <Section title="Awareness Campaign" countLabel="">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <ReadOnlyField label="Phase" value={formState.phase || ''} />
            <SelectControl
              label="Format"
              value={formState.format || ''}
              options={adFormats.map((item) => item.label)}
              onChange={(value) => handleSelectChange('format', value)}
            />
            <SelectControl
              label="Target"
              value={formState.target || ''}
              options={campaignGoals.map((item) => item.label)}
              onChange={(value) => handleSelectChange('target', value)}
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
              action={
                <button
                  type="button"
                  onClick={reloadAudiences}
                  className="text-xs font-semibold text-blue-600 hover:underline"
                  disabled={loadingAudiences}
                >
                  {loadingAudiences ? '...' : 'Refresh'}
                </button>
              }
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
              action={
                <button
                  type="button"
                  onClick={reloadLeadGenForms}
                  className="text-xs font-semibold text-blue-600 hover:underline"
                  disabled={loadingLeadGenForms}
                >
                  {loadingLeadGenForms ? '...' : 'Refresh'}
                </button>
              }
            />
            <ReadOnlyField label="Country" value={formState.country || ''} />
            <NumberField
              label="Tagesbudget"
              value={formState.budget || null}
              onChange={handleBudgetChange}
            />
            <ReadOnlyField label="Source" value={formState.source || ''} />
            <SelectControl
              label="Asset Type"
              value={formState.assetType || ''}
              options={mediaTypes.map((item) => item.label)}
              onChange={(value) => handleSelectChange('assetType', value)}
            />
          </div>
        </Section>
      </div>

      <CampaignSidebar formState={formState} onFormStateChange={(updates) => setFormState({ ...formState, ...updates })} />
    </div>
  );
}
