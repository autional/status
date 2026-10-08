import type { Incident, Maintenance } from '@/types';
import i18n from '@/i18n';

function escapeXml(str: string): string {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}

function formatRssDate(isoString: string): string {
	const date = new Date(isoString);
	return date.toUTCString();
}

export function generateRSS(incidents: Incident[], maintenances: Maintenance[]): string {
	const now = new Date().toUTCString();
	const baseUrl = window.location.origin;

	// labels 等必须在下方区间映射**之前**声明：const 存在 TDZ，此前声明在后，
	// 只要存在事件/维护，映射回调就会 ReferenceError，客户端回退 XML 永远生成失败。
	const lang = i18n.language;
	const isZh = lang === 'zh-CN';
	const channelTitle = isZh
		? 'Autional Status — 系统事件通知'
		: 'Autional Status — System Event Notifications';
	const channelDesc = isZh
		? 'Autional 所有系统服务的状态事件与维护公告 RSS Feed'
		: 'RSS feed for Autional system service status events and maintenance announcements';
	const xmlLang = isZh ? 'zh-CN' : 'en-US';

	const labels = isZh
		? {
				affectedServices: '影响服务',
				status: '状态',
				scheduledTime: '计划时间',
				to: '至',
				incidentPrefix: '[事件]',
				maintenancePrefix: '[维护]',
			}
		: {
				affectedServices: 'Affected Services',
				status: 'Status',
				scheduledTime: 'Scheduled',
				to: 'to',
				incidentPrefix: '[Incident]',
				maintenancePrefix: '[Maintenance]',
			};

	const incidentItems = incidents
		.map((incident) => {
			const link = `${baseUrl}/incidents/${incident.id}`;
			const description = escapeXml(
				`${incident.description}\n\n${labels.affectedServices}: ${(incident.affectedServices || []).join(', ')}\n${labels.status}: ${incident.status}`,
			);
			return `    <item>
      <title>${labels.incidentPrefix} ${escapeXml(incident.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="false">${incident.id}</guid>
      <pubDate>${formatRssDate(incident.createdAt)}</pubDate>
      <description>${description}</description>
      <category>${incident.severity}</category>
    </item>`;
		})
		.join('\n');

	const maintenanceItems = maintenances
		.map((m) => {
			const link = `${baseUrl}/maintenance/${m.id}`;
			const description = escapeXml(
				`${m.description}\n\n${labels.affectedServices}: ${(m.affectedServices || []).join(', ')}\n${labels.scheduledTime}: ${m.scheduledStartAt} ${labels.to} ${m.scheduledEndAt}\n${labels.status}: ${m.status}`,
			);
			return `    <item>
      <title>${labels.maintenancePrefix} ${escapeXml(m.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="false">${m.id}</guid>
      <pubDate>${formatRssDate(m.createdAt)}</pubDate>
      <description>${description}</description>
      <category>maintenance</category>
    </item>`;
		})
		.join('\n');

	const items = [incidentItems, maintenanceItems].filter(Boolean).join('\n');

	return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(channelTitle)}</title>
    <link>${baseUrl}</link>
    <description>${escapeXml(channelDesc)}</description>
    <language>${xmlLang}</language>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="${baseUrl}/feed.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;
}
