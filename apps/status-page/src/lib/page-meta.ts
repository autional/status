import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { REGION, ROOT_URL, SIBLING_SITE_URL, SITE_URL } from './site-env';

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

/** hreflang 链接：按 hreflang 值定位（同一文档里可能有多条 rel=alternate）。 */
function ensureHreflang(code: string): HTMLLinkElement {
	const selector = `link[rel="alternate"][hreflang="${code}"]`;
	const existing = document.head.querySelector<HTMLLinkElement>(selector);
	if (existing) return existing;
	const el = document.createElement('link');
	el.rel = 'alternate';
	el.hreflang = code;
	document.head.appendChild(el);
	return el;
}

export function applyPageMeta({ title, description, path, rssTitle, siteName, noindex }: PageMetaInput) {
	if (typeof document === 'undefined') return;

	const lang = document.documentElement.lang || 'zh-CN';
	const url = new URL(path, `${SITE_URL}/`).toString();
	const siteUrl = `${SITE_URL}/`;
	// RSS 频道语言由**区域**决定（.cn 中文 / .com 英文），不再由页面语言拼 ?lang：
	// 一个区域只有一个对外 feed URL，避免同一资源出现两个可索引地址与 self 链分歧。
	const feedUrl = `${SITE_URL}/feed.xml`;

	document.title = title;
	metaElement('name', 'description').content = description;
	metaElement('name', 'robots').content = noindex ? 'noindex,follow' : 'index,follow';

	linkElement('canonical').href = url;

	// hreflang：当前路径在兄弟站上的同名页（两区页面结构一一对应）。
	// 归属按**区域**判定（.cn = zh / .com = en），不按当前页面语言——
	// 语言可在客户端切换，但页面的 hreflang 归属由站点区域决定。
	const sibling = new URL(path, `${SIBLING_SITE_URL}/`).toString();
	const isCNRegion = REGION === 'cn';
	const hreflangs: Array<[string, string]> = [
		['zh-CN', isCNRegion ? url : sibling],
		['en-US', isCNRegion ? sibling : url],
		['x-default', isCNRegion ? sibling : url],
	];
	for (const [code, href] of hreflangs) {
		if (noindex) {
			// noindex 页（带令牌入口 / 404）不参与 hreflang 配对，避免与 index 页互相声明。
			document.head.querySelector(`link[rel="alternate"][hreflang="${code}"]`)?.remove();
			continue;
		}
		ensureHreflang(code).href = href;
	}

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
