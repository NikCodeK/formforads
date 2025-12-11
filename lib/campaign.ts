import {
  adCtas,
  adFormats,
  campaignGoals,
  leadGenForms,
  mediaTypes,
  offers,
  phases,
  targetAudienceCategory,
  targetAudienceTypes,
  targetUrls,
  type CampaignBuilderFormState,
  type VariantDetail,
  type VariantRow
} from './types';
import { createEmptyLeadGenDraft, isValidUrl } from './leadgen';

export const DEFAULT_CREATIVES = 2;
export const DEFAULT_HEADLINES = 2;
export const DEFAULT_COPYS = 2;
const COUNTRY = 'DE';
const SOURCE = 'li';

export const createId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 10);
};

export const createVariantDetail = (): VariantDetail => ({
  id: createId(),
  headline: '',
  copy: '',
  assetUrl: ''
});

export const resizeVariantList = (current: VariantDetail[] | undefined, total: number): VariantDetail[] => {
  const normalized = (current ?? []).map((variant) => ({
    id: variant?.id ?? createId(),
    headline: variant?.headline ?? '',
    copy: variant?.copy ?? '',
    assetUrl: variant?.assetUrl ?? ''
  }));
  const next = normalized.slice(0, Math.max(total, 0));
  while (next.length < total) {
    next.push(createVariantDetail());
  }
  return next;
};

export function createDefaultFormState(): CampaignBuilderFormState {
  const creatives = DEFAULT_CREATIVES;
  const headlines = DEFAULT_HEADLINES;
  const copys = DEFAULT_COPYS;
  const totalVariants = creatives * headlines * copys;
  const defaultAudience = targetAudienceTypes[0];
  const defaultAudienceType = targetAudienceCategory[0];
  const defaultLeadGen = leadGenForms[0];
  const defaultLeadGenDraft = {
    ...createEmptyLeadGenDraft(),
    phase: phases[0]?.label ?? ''
  };
  return {
    phase: phases[0]?.label ?? '',
    format: adFormats[0]?.label ?? '',
    target: campaignGoals[0]?.label ?? '',
    offer: offers[0] ?? '',
    cta: adCtas[0] ?? '',
    targetAudience: defaultAudience?.label ?? '',
    targetAudienceCode: defaultAudience?.code ?? '',
    targetAudienceType: defaultAudienceType?.label ?? '',
    targetAudienceTypeCode: defaultAudienceType?.code ?? '',
    targetUrl: targetUrls[0] ?? '',
    leadGenForm: defaultLeadGen?.label ?? '',
    leadGenFormId: defaultLeadGen?.code ?? '',
    leadGenFormDraft: defaultLeadGenDraft,
    country: COUNTRY,
    budget: 100,
    source: SOURCE,
    creatives,
    headlines,
    copys,
    assetType: mediaTypes[0]?.label ?? '',
    variants: resizeVariantList([], totalVariants)
  };
}

type BaseErrors = Partial<
  Record<
    | 'phase'
    | 'format'
    | 'target'
    | 'offer'
    | 'cta'
    | 'targetAudience'
    | 'targetAudienceType'
    | 'leadGenForm'
    | 'targetUrl'
    | 'budget'
    | 'creatives'
    | 'headlines'
    | 'copys'
    | 'assetType',
    string
  >
>;

interface VariantFieldErrors {
  headline?: string;
  copy?: string;
  assetUrl?: string;
}

export interface ValidationResult {
  formErrors: BaseErrors;
  variantErrors: VariantFieldErrors[];
  hasErrors: boolean;
}

export function validateForm(formState: CampaignBuilderFormState): ValidationResult {
  const formErrors: BaseErrors = {};

  if (!formState.phase) formErrors.phase = 'Phase is required.';
  if (!formState.format) formErrors.format = 'Format is required.';
  if (!formState.target) formErrors.target = 'Target is required.';
  if (!formState.offer) formErrors.offer = 'Offer is required.';
  if (!formState.cta) formErrors.cta = 'CTA is required.';
  if (!formState.targetAudience) formErrors.targetAudience = 'Target audience is required.';
  if (!formState.targetAudienceType) formErrors.targetAudienceType = 'Audience type is required.';
  if (!formState.targetUrl) {
    formErrors.targetUrl = 'Target URL is required.';
  } else if (!isValidUrl(formState.targetUrl)) {
    formErrors.targetUrl = 'Enter a valid https:// URL.';
  }
  if (!formState.leadGenForm) formErrors.leadGenForm = 'Lead gen form is required.';
  if (formState.budget === null || Number.isNaN(formState.budget) || formState.budget <= 0) {
    formErrors.budget = 'Provide a positive budget.';
  }
  if (!formState.creatives) formErrors.creatives = 'Select at least 1 creative.';
  if (!formState.headlines) formErrors.headlines = 'Select at least 1 headline.';
  if (!formState.copys) formErrors.copys = 'Select at least 1 copy.';
  if (!formState.assetType) formErrors.assetType = 'Choose an asset type.';

  const variantErrors: VariantFieldErrors[] = formState.variants.map(() => ({}));
  formState.variants.forEach((variant, index) => {
    const entry: VariantFieldErrors = {};
    if (!variant.headline.trim()) {
      entry.headline = 'Headline is required.';
    }
    if (!variant.copy.trim()) {
      entry.copy = 'Copy is required.';
    }
    if (!variant.assetUrl.trim()) {
      entry.assetUrl = 'Asset URL is required.';
    } else if (!isValidUrl(variant.assetUrl)) {
      entry.assetUrl = 'Enter a valid https:// URL.';
    }
    variantErrors[index] = entry;
  });

  const hasFormErrors = Object.keys(formErrors).length > 0;
  const hasVariantErrors = variantErrors.some((entry) => Object.keys(entry).length > 0);

  return {
    formErrors,
    variantErrors,
    hasErrors: hasFormErrors || hasVariantErrors
  };
}

export function generateVariants(state: CampaignBuilderFormState): VariantRow[] {
  return state.variants.map((variant, index) => ({
    variante: `Variante ${index + 1}`,
    headline: variant.headline,
    copy: variant.copy,
    assetType: state.assetType,
    assetUrl: variant.assetUrl,
    phase: state.phase,
    format: state.format,
    target: state.target,
    offer: state.offer,
    cta: state.cta,
    targetAudience: state.targetAudience,
    targetAudienceCode: state.targetAudienceCode,
    targetAudienceType: state.targetAudienceType,
    targetAudienceTypeCode: state.targetAudienceTypeCode,
    targetUrl: state.targetUrl,
    leadGenForm: state.leadGenForm,
    leadGenFormId: state.leadGenFormId,
    leadGenFormDraft: state.leadGenFormDraft,
    country: state.country,
    source: state.source,
    budget: state.budget
  }));
}
