import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ROOT_URL, SITE_URL } from './site-env';

/**
 * SPA 路由级页面外元数据单点（ST2-11/ST2-12）。
 *
 * index.html 里的 title/description/canonical/OG/Twitter/JSON-LD/RSS alternate 是
 * 区域级静态默认值；SPA 切路由后由本模块按当前路由与语言重写，否则所有页面共享
 * 首页标题与 canonical，英文面还会继续输出中文分享卡。
 */

interface PageMetaInput {
	title: string;
	description: string;
	/** 站点内路径（不带 query；canonical 用） */
	path: string;
	rssTitle: string;
	siteName: string;
	noindex?: boolean;
}

const OG_LOCALE: Record<string, string> = {
	'zh-CN': 'zh_CN',
	'en-US': 'en_US',
};

function metaElement(attr: 'name' | 'property', key: string): HTMLMetaElement {
	const selector = `meta[${attr}="${key}"]`;
	const existing = document.head.querySelector<HTMLMetaElement>(selector);
	if (existing) return existing;
	const el = document.createElement('meta');
	el.setAttribute(attr, key);
	document.head.appendChild(el);
	return el;
}

function linkElement(rel: string, type?: string): HTMLLinkElement {
	const typeSelector = type ? `[type="${type}"]` : '';
	const selector = `link[rel="${rel}"]${typeSelector}`;
	const existing = document.head.querySelector<HTMLLinkElement>(selector);
	if (existing) return existing;
	const el = document.createElement('link');
	el.rel = rel;
	if (type) el.type = type;
	document.head.appendChild(el);
	return el;
}

export function applyPageMeta({ title, description, path, rssTitle, siteName, noindex }: PageMetaInput) {
	if (typeof document === 'undefined') return;

	const lang = document.documentElement.lang || 'zh-CN';
	const isEnglish = lang.toLowerCase().startsWith('en');
	const url = new URL(path, `${SITE_URL}/`).toString();
	const siteUrl = `${SITE_URL}/`;
	const feedUrl = `${SITE_URL}/feed.xml${isEnglish ? '?lang=en' : ''}`;

	document.title = title;
	metaElement('name', 'description').content = description;
	metaElement('name', 'robots').content = noindex ? 'noindex,follow' : 'index,follow';

	linkElement('canonical').href = url;

	const alternate = linkElement('alternate', 'application/rss+xml');
	alternate.href = feedUrl;
	alternate.title = rssTitle;

	metaElement('property', 'og:title').content = title;
	metaElement('property', 'og:description').content = description;
	metaElement('property', 'og:url').content = url;
	metaElement('property', 'og:site_name').content = siteName;
	metaElement('property', 'og:locale').content = OG_LOCALE[lang] ?? OG_LOCALE['zh-CN'];

	metaElement('name', 'twitter:title').content = title;
	metaElement('name', 'twitter:description').content = description;

	const structuredData = document.head.querySelector<HTMLScriptElement>(
		'script[type="application/ld+json"]',
	);
	if (structuredData) {
		structuredData.textContent = JSON.stringify({
			'@context': 'https://schema.org',
			'@type': 'WebPage',
			name: title,
			description,
			url,
			inLanguage: lang,
			isPartOf: {
				'@type': 'WebSite',
				name: siteName,
				url: siteUrl,
			},
			publisher: {
				'@type': 'Organization',
				name: 'Autional',
				url: ROOT_URL,
			},
		});
	}
}

/** 页面挂载、路由语言变化时同步页面外元数据。 */
export function usePageMeta(
	title: string,
	description: string,
	path: string,
	options?: { noindex?: boolean },
) {
	const { t, i18n } = useTranslation();
	const localizedRssTitle = t('rss.title');
	const localizedSiteName = t('footer.brand');
	useEffect(() => {
		applyPageMeta({
			title,
			description,
			path,
			rssTitle: localizedRssTitle,
			siteName: localizedSiteName,
			noindex: options?.noindex,
		});
	}, [
		title,
		description,
		path,
		localizedRssTitle,
		localizedSiteName,
		options?.noindex,
		i18n.resolvedLanguage,
	]);
}
