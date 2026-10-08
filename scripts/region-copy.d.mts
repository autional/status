export interface RegionCopy {
  locale: string;
  ogLocale: string;
  siteName: string;
  title: string;
  description: string;
  keywords: string;
  ogTitle: string;
  ogDescription: string;
  robotsComment: string;
  preferredLanguages: string;
  manifestDescription: string;
}

export const REGION_COPY: Record<'zh' | 'en', RegionCopy>;
