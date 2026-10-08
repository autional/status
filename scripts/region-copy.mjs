/**
 * 区域静态文案单点（index.html 元信息 / robots 注释 / security.txt 语言行 / PWA manifest 描述）。
 * zh = cn 基线原文（逐字节不变）；en = com 面文案（B3 起 com 默认 en）。
 */
export const REGION_COPY = {
  zh: {
    locale: 'zh-CN',
    ogLocale: 'zh_CN',
    siteName: 'Autional 服务状态',
    title: 'Autional 服务状态',
    description: 'Autional 服务状态 —— 各微服务的实时可用性与历史事件。',
    keywords: 'Autional, 服务状态, 系统状态, 可用性, 事件历史, 维护公告',
    ogTitle: 'Autional 服务状态 — 实时可用性与事件历史',
    ogDescription: '实时查看 Autional 各微服务的运行状态、历史事件与维护公告。',
    robotsComment: '公开服务状态页，欢迎收录。',
    preferredLanguages: 'zh-CN, en',
    manifestDescription: 'Autional 系统状态页面 — 实时查看所有服务运行状态与维护公告',
  },
  en: {
    locale: 'en-US',
    ogLocale: 'en_US',
    siteName: 'Autional Status',
    title: 'Autional Status',
    description: 'Autional Service Status — live availability and event history across all microservices.',
    keywords: 'Autional, status page, service status, availability, incidents, maintenance announcements',
    ogTitle: 'Autional Status — Live Availability & Event History',
    ogDescription: 'Track the live health of every Autional microservice, historical incidents, and scheduled maintenance.',
    robotsComment: 'public service status page; indexing welcome.',
    preferredLanguages: 'en',
    manifestDescription: 'Autional system status page — live service health and maintenance announcements',
  },
};
