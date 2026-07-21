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

export const cmsAdmin = {
  async sectionTypes() {
    return (await api.get<string[]>("/v1/platform/cms/section-types")).data;
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
};
