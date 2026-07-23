export type OperatorConsoleActionMethod = 'GET' | 'POST' | 'PUT';

export interface OperatorConsoleAction {
  id: string;
  label: string;
  method: OperatorConsoleActionMethod;
  path: string;
  bounded: boolean;
  enabled: boolean;
  owner: string;
  note: string;
}

export interface OperatorConsoleSection {
  id: string;
  title: string;
  summary: string;
  status: 'available' | 'partial' | 'planned';
  actions: OperatorConsoleAction[];
}

export interface OperatorConsoleViewModel {
  generatedAt: string;
  title: string;
  subtitle: string;
  sections: OperatorConsoleSection[];
  warnings: string[];
  topics: OperatorTopicSummary[];
  providerStatuses: OperatorProviderStatusSummary[];
  flash: string | null;
}

export interface OperatorTopicSummary {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  status: string;
  configurationVersion: number;
  updatedAt: string;
  discovery?: {
    search?: {
      queries?: Array<{ text: string; language?: string; geo?: { countryCode?: string } }>;
    };
    seeds?: {
      urls?: string[];
    };
  };
  languageGeo?: {
    languages?: Array<{ tag: string }>;
    geoTargets?: Array<{ countryCode: string }>;
  };
  crawlPolicy?: {
    maxPages?: number;
  };
}

export interface OperatorProviderStatusSummary {
  providerKey: string;
  status: string;
  tier: string;
  capabilities: string[];
  warnings: string[];
}
