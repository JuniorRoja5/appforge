const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ─── Helpers ────────────────────────────────────────────────

function authHeaders(token: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Error ${res.status}`);
  }
  return res.json();
}

function qs(params: Record<string, string | number | undefined | null>): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== '',
  );
  if (entries.length === 0) return '';
  return '?' + new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString();
}

// ─── Auth ───────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  role: 'SUPER_ADMIN' | 'CLIENT';
  tenantId: string | null;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  company: string | null;
}

export interface LoginResponse {
  access_token: string;
  user: AuthUser;
}

export const login = (email: string, password: string): Promise<LoginResponse> =>
  fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  }).then((r) => handleResponse<LoginResponse>(r));

// ─── Types ──────────────────────────────────────────────────

export type TenantStatus = 'ACTIVE' | 'SUSPENDED';
export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'PENDING_DELETION';
export type BuildStatus = 'QUEUED' | 'PREPARING' | 'BUILDING' | 'SIGNING' | 'COMPLETED' | 'FAILED';
export type PlanType = 'FREE' | 'STARTER' | 'PRO' | 'RESELLER_STARTER' | 'RESELLER_PRO';

export interface SubscriptionPlan {
  id: string;
  planType: PlanType;
  name: string;
  maxApps: number;
  maxBuildsPerMonth: number;
  storageGb: number;
  priceMonthly: number;
  canBuild: boolean;
  isWhiteLabel: boolean;
}

export interface TenantListItem {
  id: string;
  name: string;
  status: TenantStatus;
  createdAt: string;
  subscription: { plan: SubscriptionPlan } | null;
  _count: { apps: number; users: number };
  buildsThisMonth: number;
  storageBytes: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface TenantUser {
  id: string;
  email: string;
  role: string;
  status: UserStatus;
  firstName: string | null;
  lastName: string | null;
  createdAt: string;
  deletionRequestedAt: string | null;
}

export interface AppBuild {
  id: string;
  appId: string;
  buildType: string;
  status: BuildStatus;
  errorMessage: string | null;
  logOutput: string | null;
  artifactUrl: string | null;
  artifactSize: number | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  app?: {
    id: string;
    name: string;
    tenant?: { id: string; name: string };
  };
}

export interface TenantApp {
  id: string;
  name: string;
  slug: string;
  status: string;
  schema: unknown;
  createdAt: string;
  builds: AppBuild[];
  clientName?: string | null;
  clientEmail?: string | null;
  clientNotes?: string | null;
}

export interface TenantDetail {
  id: string;
  name: string;
  status: TenantStatus;
  createdAt: string;
  subscription: { plan: SubscriptionPlan } | null;
  users: TenantUser[];
  apps: TenantApp[];
  usage: {
    appsUsed: number;
    maxApps: number;
    buildsUsed: number;
    maxBuilds: number;
    storageUsedBytes: number;
    storageMaxBytes: number;
  };
}

export interface AdminUser {
  id: string;
  email: string;
  role: string;
  status: UserStatus;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  createdAt: string;
  deletionRequestedAt: string | null;
  tenant: { id: string; name: string } | null;
}

export interface AnalyticsData {
  totals: {
    tenants: number;
    apps: number;
    buildsThisMonth: number;
    storageBytes: number;
    tenantsByPlan: Record<string, number>;
    failedPaymentsCount: number;
  };
  weeklyRegistrations: Array<{ week: string; count: number }>;
  moduleUsage: Array<{ moduleId: string; count: number }>;
  recentFailedBuilds: AppBuild[];
}

export interface SmtpConfig {
  id?: string;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password?: string;
  fromEmail: string;
  fromName: string;
  hasPassword?: boolean;
}

export interface SmtpTestResult {
  connectionOk: boolean;
  emailSent: boolean;
  error?: string;
}

// ─── Admin: Analytics ───────────────────────────────────────

export const getAnalytics = (token: string): Promise<AnalyticsData> =>
  fetch(`${API_URL}/admin/analytics`, { headers: authHeaders(token) })
    .then((r) => handleResponse<AnalyticsData>(r));

// ─── Admin: Tenants ─────────────────────────────────────────

export const listTenants = (
  token: string,
  params: { search?: string; planType?: string; status?: string; page?: number; limit?: number } = {},
): Promise<PaginatedResponse<TenantListItem>> =>
  fetch(`${API_URL}/admin/tenants${qs(params)}`, { headers: authHeaders(token) })
    .then((r) => handleResponse<PaginatedResponse<TenantListItem>>(r));

export const getTenantDetail = (token: string, id: string): Promise<TenantDetail> =>
  fetch(`${API_URL}/admin/tenants/${id}`, { headers: authHeaders(token) })
    .then((r) => handleResponse<TenantDetail>(r));

export const updateTenantStatus = (
  token: string,
  id: string,
  status: TenantStatus,
): Promise<unknown> =>
  fetch(`${API_URL}/admin/tenants/${id}/status`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify({ status }),
  }).then((r) => handleResponse(r));

export const deleteTenant = (token: string, id: string): Promise<{ deleted: boolean }> =>
  fetch(`${API_URL}/admin/tenants/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  }).then((r) => handleResponse<{ deleted: boolean }>(r));

// ─── Admin: Users ───────────────────────────────────────────

export const listUsers = (
  token: string,
  params: { status?: string; search?: string; page?: number; limit?: number } = {},
): Promise<PaginatedResponse<AdminUser>> =>
  fetch(`${API_URL}/admin/users${qs(params)}`, { headers: authHeaders(token) })
    .then((r) => handleResponse<PaginatedResponse<AdminUser>>(r));

export const toggleUserSuspension = (token: string, id: string): Promise<unknown> =>
  fetch(`${API_URL}/admin/users/${id}/suspend`, {
    method: 'PUT',
    headers: authHeaders(token),
  }).then((r) => handleResponse(r));

export const permanentDeleteUser = (token: string, id: string): Promise<{ deleted: boolean }> =>
  fetch(`${API_URL}/admin/users/${id}/permanent`, {
    method: 'DELETE',
    headers: authHeaders(token),
  }).then((r) => handleResponse<{ deleted: boolean }>(r));

// ─── Admin: Builds ──────────────────────────────────────────

export const listBuilds = (
  token: string,
  params: { status?: string; tenantId?: string; appId?: string; from?: string; to?: string; page?: number; limit?: number } = {},
): Promise<PaginatedResponse<AppBuild>> =>
  fetch(`${API_URL}/admin/builds${qs(params)}`, { headers: authHeaders(token) })
    .then((r) => handleResponse<PaginatedResponse<AppBuild>>(r));

export const retryBuild = (token: string, buildId: string): Promise<AppBuild> =>
  fetch(`${API_URL}/admin/builds/${buildId}/retry`, {
    method: 'POST',
    headers: authHeaders(token),
  }).then((r) => handleResponse<AppBuild>(r));

// ─── Subscription: Plans ────────────────────────────────────

export const listPlans = (token: string): Promise<SubscriptionPlan[]> =>
  fetch(`${API_URL}/subscription/plans`, { headers: authHeaders(token) })
    .then((r) => handleResponse<SubscriptionPlan[]>(r));

export const updatePlan = (
  token: string,
  planType: PlanType,
  data: Partial<Omit<SubscriptionPlan, 'id' | 'planType'>>,
): Promise<SubscriptionPlan> =>
  fetch(`${API_URL}/subscription/plans/${planType}`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(data),
  }).then((r) => handleResponse<SubscriptionPlan>(r));

export const changeTenantPlan = (
  token: string,
  tenantId: string,
  planType: PlanType,
): Promise<unknown> =>
  fetch(`${API_URL}/subscription/change`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify({ tenantId, planType }),
  }).then((r) => handleResponse(r));

// ─── Platform: SMTP ─────────────────────────────────────────

export const getSmtpConfig = (token: string): Promise<SmtpConfig | null> =>
  fetch(`${API_URL}/platform/smtp`, { headers: authHeaders(token) })
    .then((r) => handleResponse<SmtpConfig | null>(r));

export const updateSmtpConfig = (token: string, data: SmtpConfig): Promise<SmtpConfig> =>
  fetch(`${API_URL}/platform/smtp`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(data),
  }).then((r) => handleResponse<SmtpConfig>(r));

export const testSmtp = (token: string, data?: Partial<SmtpConfig>): Promise<SmtpTestResult> =>
  fetch(`${API_URL}/platform/test-smtp`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(data ?? {}),
  }).then((r) => handleResponse<SmtpTestResult>(r));

// ─── Platform: FCM Push Notifications ────────────────────────

export interface FcmConfig {
  id?: string;
  projectId: string;
  configured: boolean;
}

export interface FcmTestResult {
  ok: boolean;
  error?: string;
}

export const getFcmConfig = (token: string): Promise<FcmConfig | null> =>
  fetch(`${API_URL}/platform/fcm`, { headers: authHeaders(token) })
    .then((r) => handleResponse<FcmConfig | null>(r));

export const updateFcmConfig = (
  token: string,
  data: { serviceAccountJson: string; googleServicesJson: string },
): Promise<FcmConfig> =>
  fetch(`${API_URL}/platform/fcm`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(data),
  }).then((r) => handleResponse<FcmConfig>(r));

export const testFcm = (token: string): Promise<FcmTestResult> =>
  fetch(`${API_URL}/platform/test-fcm`, {
    method: 'POST',
    headers: authHeaders(token),
  }).then((r) => handleResponse<FcmTestResult>(r));

// ─── Admin: Billing ─────────────────────────────────────────

export interface StripeInvoice {
  id: string;
  number: string | null;
  status: string | null;
  amountDue: number;
  amountPaid: number;
  currency: string;
  created: string;
  dueDate: string | null;
  hostedInvoiceUrl: string | null;
  tenantId: string | null;
  tenantName: string | null;
}

export interface MrrByPlan {
  count: number;
  revenue: number;
}

export interface BillingData {
  mrr: {
    total: number;
    byPlan: Record<string, MrrByPlan>;
  };
  mrrHistory: Array<{ month: string; mrr: number }>;
  recentInvoices: StripeInvoice[];
  failedPayments: StripeInvoice[];
}

export const getBillingAnalytics = (token: string): Promise<BillingData> =>
  fetch(`${API_URL}/admin/billing`, { headers: authHeaders(token) })
    .then((r) => handleResponse<BillingData>(r));
