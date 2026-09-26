import { api } from "@/lib/api";

export type CmsLink = { label: string; href: string };

export type CmsSection = {
  id: string;
  section_type: string;
  anchor_id: string | null;
  title: string;
  content: Record<string, unknown>;
  sort_order: number;
  enabled: boolean;
};

export type CmsPage = {
  id: string;
  slug: string;
  title: string;
  meta_description: string;
  published: boolean;
  is_home: boolean;
  sort_order: number;
  updated_at: string | null;
  sections?: CmsSection[];
};

export type CmsPublicSite = {
  site: {
    header: {
      nav: CmsLink[];
      sign_in: CmsLink;
      get_started: CmsLink;
    };
    footer: {
      description: string;
      badge: string;
      columns: Array<{ title: string; links: CmsLink[] }>;
      copyright: string;
      legal_note: string;
    };
  };
  page: CmsPage;
};

export const cmsPublic = {
  async site() {
    return (await api.get<CmsPublicSite>("/v1/public/site")).data;
  },
  async page(slug: string) {
    return (await api.get<CmsPublicSite>(`/v1/public/pages/${slug}`)).data;
  },
};

export type LegalDocument = {
  slug: string;
  title: string;
  meta_description: string;
  published: boolean;
  public_path: string;
  updated_at: string | null;
  body: string;
  page_id: string;
};

export type RuleTemplateAdmin = {
  template_code: string;
  name: string;
  segment: string;
  segment_label: string;
  description: string;
  compliance_mode: string;
  code_compliance_mode?: string;
  recommended_program_codes: string[];
  editable: boolean;
  source?: "code" | "custom";
  is_custom?: boolean;
  archived?: boolean;
  has_custom_rules: boolean;
  code_defaults: Record<string, unknown>;
  override: {
    enabled: boolean;
    rules: Record<string, unknown>;
    compliance_mode?: string | null;
    effective_from?: string | null;
    publish_note?: string | null;
    updated_at: string | null;
  };
  effective_rules: Record<string, unknown>;
};

export type RuleTemplateVersion = {
  id: string;
  template_code: string;
  version_number: number;
  rules: Record<string, unknown>;
  compliance_mode: string | null;
  enabled: boolean;
  effective_from: string | null;
  publish_note: string | null;
  is_rollback: boolean;
  created_at: string | null;
};

export type SchemeTemplateMapRow = {
  scheme_code: string;
  scheme_label: string;
  ministry: string;
  default_template_code: string | null;
  template_name: string | null;
  default_compliance_mode: string;
  checklist_codes: string[];
};

export type ChecklistOverrideSummary = {
  checklist_code: string;
  title: string;
  short_label: string;
  framework_reference: string;
  has_custom_items: boolean;
  item_count: number;
  override: Record<string, unknown>;
};

export type ChecklistOverrideDetail = ChecklistOverrideSummary & {
  description: string;
  disclaimer: string;
  code_items: Array<{
    id: string;
    category: string;
    question: string;
    guidance: string;
    required: boolean;
  }>;
  effective_items: Array<{
    id: string;
    category: string;
    question: string;
    guidance: string;
    required: boolean;
  }>;
};

export type ProjectRuleOverride = {
  project_id: string;
  template_code: string | null;
  project_compliance_mode: string;
  effective_compliance_mode: string;
  has_project_override: boolean;
  base_rules: Record<string, unknown>;
  effective_rules: Record<string, unknown>;
  override: {
    enabled: boolean;
    rules: Record<string, unknown>;
    compliance_mode?: string | null;
    publish_note?: string | null;
    updated_at: string | null;
  };
};

export const cmsAdmin = {
  async sectionTypes() {
    return (await api.get<string[]>("/v1/platform/cms/section-types")).data;
  },
  async listLegal() {
    return (await api.get<LegalDocument[]>("/v1/platform/cms/legal")).data;
  },
  async updateLegal(
    slug: string,
    payload: {
      title?: string;
      meta_description?: string;
      body?: string;
      published?: boolean;
    },
  ) {
    return (await api.put<LegalDocument>(`/v1/platform/cms/legal/${slug}`, payload)).data;
  },
  async siteConfig() {
    return (await api.get<{ header: CmsPublicSite["site"]["header"]; footer: CmsPublicSite["site"]["footer"] }>(
      "/v1/platform/cms/site",
    )).data;
  },
  async updateSiteConfig(key: "header" | "footer", data: Record<string, unknown>) {
    return (await api.put(`/v1/platform/cms/site/${key}`, { data })).data;
  },
  async listPages() {
    return (await api.get<CmsPage[]>("/v1/platform/cms/pages")).data;
  },
  async getPage(id: string) {
    return (await api.get<CmsPage & { sections: CmsSection[] }>(`/v1/platform/cms/pages/${id}`)).data;
  },
  async createPage(payload: {
    title: string;
    slug?: string;
    meta_description?: string;
    published?: boolean;
  }) {
    return (await api.post<CmsPage>("/v1/platform/cms/pages", payload)).data;
  },
  async updatePage(id: string, payload: Partial<CmsPage>) {
    return (await api.patch<CmsPage>(`/v1/platform/cms/pages/${id}`, payload)).data;
  },
  async deletePage(id: string) {
    return (await api.delete(`/v1/platform/cms/pages/${id}`)).data;
  },
  async createSection(pageId: string, payload: Partial<CmsSection>) {
    return (await api.post<CmsSection>(`/v1/platform/cms/pages/${pageId}/sections`, payload)).data;
  },
  async updateSection(id: string, payload: Partial<CmsSection>) {
    return (await api.patch<CmsSection>(`/v1/platform/cms/sections/${id}`, payload)).data;
  },
  async deleteSection(id: string) {
    return (await api.delete(`/v1/platform/cms/sections/${id}`)).data;
  },
  async listRuleTemplates() {
    return (await api.get<RuleTemplateAdmin[]>("/v1/platform/cms/rule-templates")).data;
  },
  async createRuleTemplate(payload: {
    name: string;
    segment: string;
    description?: string;
    compliance_mode?: "open" | "guided" | "strict";
    recommended_program_codes?: string[];
    clone_from?: string | null;
    rules?: Record<string, unknown>;
  }) {
    return (await api.post<RuleTemplateAdmin>("/v1/platform/cms/rule-templates", payload)).data;
  },
  async archiveRuleTemplate(code: string) {
    await api.delete(`/v1/platform/cms/rule-templates/${code}`);
  },
  async getRuleTemplate(code: string) {
    return (await api.get<RuleTemplateAdmin>(`/v1/platform/cms/rule-templates/${code}`)).data;
  },
  async updateRuleTemplate(
    code: string,
    payload: {
      enabled: boolean;
      rules: Record<string, unknown>;
      compliance_mode?: string | null;
      effective_from?: string | null;
      publish_note?: string | null;
      name?: string;
      description?: string;
      segment?: string;
      recommended_program_codes?: string[];
    },
  ) {
    return (await api.put<RuleTemplateAdmin>(`/v1/platform/cms/rule-templates/${code}`, payload))
      .data;
  },
  async exportRuleTemplates() {
    return (await api.get<Record<string, unknown>>("/v1/platform/cms/rule-templates/export")).data;
  },
  async importRuleTemplates(payload: { version?: number; templates: Record<string, unknown>[] }) {
    return (await api.post<{ imported: number }>("/v1/platform/cms/rule-templates/import", payload))
      .data;
  },
  async listRuleTemplateVersions(code: string) {
    return (await api.get<RuleTemplateVersion[]>(`/v1/platform/cms/rule-templates/${code}/versions`))
      .data;
  },
  async rollbackRuleTemplate(code: string, versionId: string) {
    return (
      await api.post<RuleTemplateAdmin>(
        `/v1/platform/cms/rule-templates/${code}/versions/${versionId}/rollback`,
      )
    ).data;
  },
  async previewRuleTemplate(
    code: string,
    payload: {
      rules: Record<string, unknown>;
      compliance_mode: string;
      latitude?: number;
      longitude?: number;
      accuracy_m?: number;
      species_text?: string;
      photo_count?: number;
      metadata?: Record<string, unknown>;
    },
  ) {
    return (
      await api.post<{
        template_code: string;
        compliance_mode: string;
        rules_preview: Record<string, unknown>;
        result: { passed: boolean; issues: Array<{ severity: string; message: string }> };
      }>(`/v1/platform/cms/rule-templates/${code}/preview`, payload)
    ).data;
  },
  async schemeTemplateMap() {
    return (await api.get<SchemeTemplateMapRow[]>("/v1/platform/cms/rule-schemes-map")).data;
  },
  async listChecklistOverrides() {
    return (await api.get<ChecklistOverrideSummary[]>("/v1/platform/cms/checklist-overrides")).data;
  },
  async getChecklistOverride(code: string) {
    return (await api.get<ChecklistOverrideDetail>(`/v1/platform/cms/checklist-overrides/${code}`))
      .data;
  },
  async updateChecklistOverride(
    code: string,
    payload: { enabled: boolean; item_overrides: Record<string, unknown> },
  ) {
    return (
      await api.put<ChecklistOverrideDetail>(`/v1/platform/cms/checklist-overrides/${code}`, payload)
    ).data;
  },
};
