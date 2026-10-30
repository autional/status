#!/usr/bin/env node
/**
 * check-vercel-config.mjs —— 部署配置自检（2026-10-30）
 *
 * 为什么需要：`vercel.ts` **不在** `tsc` / `vite build` 的覆盖范围，只由平台在部署时求值。
 * 2026-10-30 一次负向前瞻（`(?!…)`）被 @vercel/config 拒绝，导致**整包部署失败、
 * 自定义域继续吃上一版**（现象＝"Vercel 没自动发布"，本地全绿看不出来）。
 *
 * 做法：给一个占位 API_ORIGIN 后直接 import `vercel.ts` —— 导入即触发
 * 　① @vercel/config 对每条 rewrite/header 的 pattern 校验；
 * 　② 文件内的守卫（destination / 排除带点段 / Accept 放行）。
 * 任何抛错 → 非零退出 ⇒ prebuild 阻断，问题在本地/CI 就暴露，不会等到部署失败。
 */
process.env.API_ORIGIN ||= 'https://api.placeholder.invalid';

try {
  await import('../vercel.ts');
} catch (err) {
  console.error('[check-vercel-config] 部署配置非法：', err?.message ?? err);
  process.exit(1);
}
console.log('[check-vercel-config] ok');
