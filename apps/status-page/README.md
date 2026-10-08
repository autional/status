# Autional Status Page

Autional 公开状态页面，用于实时展示所有微服务的健康状态、事件历史和维护公告。

## 技术栈

- Vite 6 + React 19 + TypeScript
- React Router v7
- Tailwind CSS 3 + `@autional/tailwind-preset`
- TanStack Query (数据获取与缓存)
- lucide-react (图标)

## 端口

**13106**

## 开发

```bash
# 从 monorepo 根目录
cd web
pnpm dev:status

# 或直接
cd web/apps/status-page
pnpm dev
```

访问 http://localhost:13106

## 构建

```bash
pnpm build
```

## 页面

| 路由 | 页面 | 说明 |
|------|------|------|
| `/` | 状态总览 | 系统整体状态、服务卡片（catalog 全量 6 组）、最近事件 |
| `/incidents` | 事件历史 | 完整事件列表，支持按严重级别/状态筛选 |
| `/incidents/:id` | 事件详情 | 事件时间线、受影响服务、进展更新 |
| `/services/:serviceId` | 服务详情 | 延迟/可用率趋势图、关联事件 |
| `/subscribe` | 订阅通知 | 邮箱订阅、取消订阅、偏好设置 |
| `/subscribe/verify` | 订阅验证 | 邮箱验证确认 |
| `/maintenance` | 维护日历 | 计划维护日历、维护记录列表 |
| `/maintenance/:id` | 维护详情 | 维护状态、进度时间线、受影响服务 |
| `/rss` | RSS Feed 预览 | 事件与维护的 Feed 预览；真实订阅地址 `/feed.xml`（rewrite 至 API） |

## 数据来源

### 实时健康状态

通过站点 `/ready`（rewrite 至 `https://api.autional.cn/ready`）获取网关聚合的健康状态：

```
GET /ready → 网关聚合所有上游服务状态（checks / checks_latency）
```

无监控 check 的服务显示「未知（unknown）」，不会回填为正常；`/ready` 不可达时全部服务显示未知。

### 事件历史
通过 status-service REST API 获取事件列表和详情。
### 订阅
通过 status-service REST API 管理邮件订阅和偏好设置。

## 特性

- **公开访问**：无需登录，无认证要求
- **自动刷新**：每 30 秒自动获取最新状态（带倒计时进度条）
- **暗色模式**：支持亮色/暗色主题切换，持久化到 localStorage
- **响应式设计**：适配桌面端和移动端
- **错误边界**：页面级 ErrorBoundary 防止崩溃
- **503 兼容**：Gateway 返回 503（服务降级）时仍能正确解析响应体，显示真实状态

## 服务列表

展示 15 个核心微服务：

identity-service, profile-service, tenant-service, session-service, mfa-service, oauth-service, wallet-service, point-service, audit-service, notification-service, communication-service, storage-service, billing-service, compliance-service, gateway-service
