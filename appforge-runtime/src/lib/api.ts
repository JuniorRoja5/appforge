import { getManifest } from './manifest';
import { getToken } from './auth';

function getApiUrl(): string {
  return getManifest()?.apiUrl ?? 'http://localhost:3000';
}

function getAppId(): string {
  return getManifest()?.appId ?? '';
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${getApiUrl()}${path}`;
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options?.headers as Record<string, string>) ?? {}),
  };
  const response = await fetch(url, {
    ...options,
    headers,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message ?? `API error ${response.status}`);
  }
  return response.json();
}

// ─── News Feed ─────────────────────────────────────────
export const getNews = () =>
  apiFetch<Array<{ id: string; title: string; content: string; imageUrl?: string; publishedAt: string }>>(
    `/apps/${getAppId()}/news`,
  );

// ─── Events ────────────────────────────────────────────
export const getEvents = () =>
  apiFetch<Array<{ id: string; title: string; description?: string; imageUrl?: string; eventDate: string; location?: string; price?: string; ticketUrl?: string }>>(
    `/apps/${getAppId()}/events`,
  );

// ─── Gallery ───────────────────────────────────────────
export const getGallery = () =>
  apiFetch<Array<{ id: string; title?: string; description?: string; imageUrl: string; order: number }>>(
    `/apps/${getAppId()}/gallery`,
  );

// ─── Menu Restaurant ───────────────────────────────────
export const getMenuCategories = () =>
  apiFetch<Array<{ id: string; name: string; description?: string; imageUrl?: string; items: Array<{ id: string; name: string; description?: string; price: string; imageUrl?: string; allergens: string[]; available: boolean }> }>>(
    `/apps/${getAppId()}/menu`,
  );

// ─── Catalog ───────────────────────────────────────────
export const getCatalogCollections = () =>
  apiFetch<Array<{ id: string; name: string; description?: string; imageUrl?: string; products: Array<{ id: string; name: string; description?: string; price: string; comparePrice?: string; imageUrls: string[]; inStock: boolean; tags: string[] }> }>>(
    `/apps/${getAppId()}/catalog`,
  );

// ─── Discount Coupons ──────────────────────────────────
export const getCoupons = () =>
  apiFetch<Array<{ id: string; title: string; description?: string; code: string; discountType: string; discountValue: string; imageUrl?: string; conditions?: string; validFrom: string; validUntil?: string; isActive: boolean }>>(
    `/apps/${getAppId()}/coupons`,
  );

// ─── Booking ───────────────────────────────────────────
export const getAvailableSlots = (date: string) =>
  apiFetch<string[]>(`/apps/${getAppId()}/bookings/available?date=${date}`);

export const createBooking = (data: { date: string; timeSlot: string; formData: Record<string, string> }) =>
  apiFetch<{ id: string; shortCode: string; trackingToken: string; date: string; timeSlot: string }>(
    `/apps/${getAppId()}/bookings`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
  );

// ─── Contact ───────────────────────────────────────────
export const getCaptcha = () =>
  apiFetch<{ token: string; expiresAt: string }>(`/apps/${getAppId()}/contact/captcha`);

export const submitContact = (data: { captchaToken: string; data: Record<string, string>; honeypot?: string }) =>
  apiFetch<{ id: string }>(`/apps/${getAppId()}/contact/submit`, {
    method: 'POST',
    body: JSON.stringify(data),
  });

// ─── Social Wall ──────────────────────────────────────

export interface SocialPostItem {
  id: string; appId: string; content: string; imageUrl?: string;
  likesCount: number; commentCount: number; isLiked?: boolean;
  author: { id: string; firstName?: string; lastName?: string; avatarUrl?: string; email: string };
  createdAt: string;
}

export interface SocialCommentItem {
  id: string; postId: string; content: string;
  author: { id: string; firstName?: string; lastName?: string; avatarUrl?: string; email: string };
  createdAt: string;
}

export const getSocialPosts = (page = 1, limit = 20) =>
  apiFetch<{ data: SocialPostItem[]; total: number; page: number; limit: number }>(
    `/apps/${getAppId()}/social/posts?page=${page}&limit=${limit}`,
  );

export const createSocialPost = (content: string, imageUrl?: string) =>
  apiFetch<SocialPostItem>(`/apps/${getAppId()}/social/posts`, {
    method: 'POST',
    body: JSON.stringify({ content, imageUrl }),
  });

export const toggleSocialLike = (postId: string) =>
  apiFetch<{ liked: boolean; likesCount: number }>(`/apps/${getAppId()}/social/posts/${postId}/like`, {
    method: 'POST',
  });

export const getSocialComments = (postId: string, page = 1, limit = 20) =>
  apiFetch<{ data: SocialCommentItem[]; total: number; page: number; limit: number }>(
    `/apps/${getAppId()}/social/posts/${postId}/comments?page=${page}&limit=${limit}`,
  );

export const createSocialComment = (postId: string, content: string) =>
  apiFetch<SocialCommentItem>(`/apps/${getAppId()}/social/posts/${postId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });

export const deleteSocialPost = (postId: string) =>
  apiFetch<void>(`/apps/${getAppId()}/social/posts/${postId}`, { method: 'DELETE' });

export const deleteSocialComment = (commentId: string) =>
  apiFetch<void>(`/apps/${getAppId()}/social/comments/${commentId}`, { method: 'DELETE' });

export const reportSocialContent = (targetType: string, targetId: string, reason?: string) =>
  apiFetch<{ message: string }>(`/apps/${getAppId()}/social/report`, {
    method: 'POST',
    body: JSON.stringify({ targetType, targetId, reason }),
  });

// ─── Fan Wall ─────────────────────────────────────────

export interface FanPostItem {
  id: string; appId: string; imageUrl: string; caption?: string;
  likesCount: number; isLiked?: boolean;
  author: { id: string; firstName?: string; lastName?: string; avatarUrl?: string; email: string };
  createdAt: string;
}

export const getFanPosts = (page = 1, limit = 24) =>
  apiFetch<{ data: FanPostItem[]; total: number; page: number; limit: number }>(
    `/apps/${getAppId()}/fan-wall/posts?page=${page}&limit=${limit}`,
  );

export const createFanPost = (imageUrl: string, caption?: string) =>
  apiFetch<FanPostItem>(`/apps/${getAppId()}/fan-wall/posts`, {
    method: 'POST',
    body: JSON.stringify({ imageUrl, caption }),
  });

export const toggleFanLike = (postId: string) =>
  apiFetch<{ liked: boolean; likesCount: number }>(`/apps/${getAppId()}/fan-wall/posts/${postId}/like`, {
    method: 'POST',
  });

export const deleteFanPost = (postId: string) =>
  apiFetch<void>(`/apps/${getAppId()}/fan-wall/posts/${postId}`, { method: 'DELETE' });

export const reportFanPost = (postId: string, reason?: string) =>
  apiFetch<{ message: string }>(`/apps/${getAppId()}/fan-wall/posts/${postId}/report`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });

// ─── Loyalty Card ────────────────────────────────────
export const getMyLoyaltyCard = () =>
  apiFetch<{ currentStamps: number; totalStamps: number; canRedeem: boolean; reward: string }>(
    `/apps/${getAppId()}/loyalty/my-card`,
  );

export const redeemLoyalty = () =>
  apiFetch<{ message: string }>(`/apps/${getAppId()}/loyalty/redeem`, { method: 'POST' });

// ─── Orders (Catalog) ────────────────────────────────
export const createOrder = (data: {
  customerName: string;
  customerPhone?: string;
  customerNotes?: string;
  items: Array<{ productId: string; quantity: number }>;
}) =>
  apiFetch<{ id: string; total: string }>(`/apps/${getAppId()}/orders`, {
    method: 'POST',
    body: JSON.stringify(data),
  });

// ─── App-User Image Upload ───────────────────────────

export const uploadAppUserImage = async (file: File): Promise<{ url: string }> => {
  const formData = new FormData();
  formData.append('file', file);

  const token = getToken();
  const response = await fetch(`${getApiUrl()}/upload/app-user-image`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message ?? 'Error al subir imagen');
  }

  return response.json();
};
