import {
	Activity,
	BadgeCheck,
	Bell,
	Binary,
	Bot,
	Briefcase,
	Building2,
	ClipboardList,
	CreditCard,
	Fingerprint,
	Folder,
	HardDrive,
	Hash,
	KeyRound,
	Layers,
	Lock,
	Mail,
	Network,
	Plug,
	ReceiptText,
	Router,
	Scale,
	Server,
	Settings,
	Shield,
	ShieldCheck,
	SlidersHorizontal,
	Star,
	Ticket,
	UserCog,
	UserRound,
	Users,
	Wallet,
	Wrench,
	type LucideIcon,
} from 'lucide-react';

/**
 * 服务/分组图标映射 —— 总览页「状态墙」与「舰队全景条」共用的单一真源。
 *
 * 背景：此前所有服务卡片写死同一个 <Server>、所有分组写死同一个 <Folder>，
 * 27 个服务长得一模一样，无法靠图形快速辨认。此处按服务语义给每个 id 配图标。
 *
 * 契约：
 *   · 未知 id 一律回退（服务 → Server / 分组 → Folder），绝不抛错、绝不空白；
 *   · 后端新增服务时无需改这里也能正常渲染（回退即可），补映射是可选优化。
 */

const SERVICE_ICONS: Record<string, LucideIcon> = {
	// 身份认证
	'identity-service': Fingerprint,
	'session-service': Ticket,
	'mfa-service': ShieldCheck,
	'oauth-service': KeyRound,
	// 用户数据
	'profile-service': UserRound,
	'tenant-service': Building2,
	// 业务中台
	'wallet-service': Wallet,
	'point-service': Star,
	'billing-service': ReceiptText,
	'pay-service': CreditCard,
	'storage-service': HardDrive,
	// 运营支撑
	'audit-service': ClipboardList,
	'stream-service': Activity,
	'notification-service': Bell,
	'communication-service': Mail,
	'compliance-service': Scale,
	'config-service': SlidersHorizontal,
	'secret-service': Lock,
	'thirdparty-service': Plug,
	'verification-service': BadgeCheck,
	'captcha3d-service': Bot,
	// 访问控制
	'rbac-service': UserCog,
	'saml-service': Network,
	'hash-service-standard': Hash,
	'hash-service-sm': Binary,
	// 基础设施
	'gateway-service': Router,
	'status-service': Settings,
};

const GROUP_ICONS: Record<string, LucideIcon> = {
	authentication: Shield,
	'user-data': Users,
	'business-platform': Briefcase,
	operations: Wrench,
	'access-control': ShieldCheck,
	infrastructure: Layers,
};

/** 服务图标；未知 id 回退 Server（不抛错、不空白）。 */
export function serviceIcon(id: string): LucideIcon {
	return SERVICE_ICONS[id] ?? Server;
}

/** 分组图标；未知 id 回退 Folder。 */
export function groupIcon(id: string): LucideIcon {
	return GROUP_ICONS[id] ?? Folder;
}
