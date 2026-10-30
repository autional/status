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
  /** RSS 自动发现链接 title（须与频道语言一致：.cn 中文 / .com 英文）。 */
  rssTitle: string;
}

export const REGION_COPY: Record<'zh' | 'en', RegionCopy>;
