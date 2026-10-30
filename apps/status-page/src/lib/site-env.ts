/**
 * 构建期区域环境单点（B3 单源双区；契约见 docs/positioning/24 §2.1）。
 *
 * 两区同一份源构建：com（en）/ cn（zh）各自在 Vercel 项目侧注入
 * REGION / SITE_URL / DEFAULT_LANG / FALLBACK_LANG / CDN_HOST，
 * vite.config.ts 读取后 define 内联为 import.meta.env.VITE_*，
 * 因此本模块读到的是构建期固定值，不依赖任何运行时探测。
 * 本地 dev / 测试无注入时兜底 cn 值（与迁移前基线一致）。
 *
 * 禁止在本文件之外散落区域字面量（站点域名 / 分享图）。
 */

export type Region = 'cn' | 'com';
export type Lang = 'zh' | 'en';

export const REGION: Region = (import.meta.env.VITE_REGION as Region) ?? 'cn';
export const SITE_URL: string = import.meta.env.VITE_SITE_URL ?? 'https://status.autional.cn';
export const DEFAULT_LANG: Lang = (import.meta.env.VITE_DEFAULT_LANG as Lang) ?? 'zh';
export const FALLBACK_LANG: Lang = (import.meta.env.VITE_FALLBACK_LANG as Lang) ?? DEFAULT_LANG;

/** 站点 host 与根域（兄弟站/主站 URL 由此派生，不写死子域）。 */
export const SITE_HOST: string = new URL(SITE_URL).host;
export const ROOT_DOMAIN: string = SITE_HOST.split('.').slice(-2).join('.');
export const ROOT_URL: string = `https://www.${ROOT_DOMAIN}`;

/** 全站分享图（web 站托管；shared 默认值指向构建哨兵域名，线上 404）。 */
export const OG_IMAGE: string = `${ROOT_URL}/og-default.png`;

/**
 * 兄弟站基址（.cn ↔ .com，同源码双区，hreflang 互指）。
 *
 * 两区不是「翻译镜像」而是「同一产品面向不同客户群体」，但内容语言不同、
 * 页面结构一一对应 ⇒ 需要 hreflang 声明，否则英文用户可能搜到中文页（反之亦然）。
 */
export const SIBLING_SITE_URL: string =
  REGION === 'com' ? SITE_URL.replace(/\.com(\/|$)/, '.cn$1') : SITE_URL.replace(/\.cn(\/|$)/, '.com$1');

/** BCP-47 locale（'en'→'en-US' / 'zh'→'zh-CN'）；i18n 语言码与 <html lang> 同源。 */
export const localeOf = (lang: Lang): string => (lang === 'en' ? 'en-US' : 'zh-CN');
export const LOCALE: string = localeOf(DEFAULT_LANG);
