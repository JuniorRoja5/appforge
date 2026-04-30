const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const saveAppSchema = async (
  appId: string,
  schema: unknown,
  token: string,
  designTokens?: unknown,
) => {
  const body: Record<string, unknown> = { schema };
  if (designTokens !== undefined) {
    body.designTokens = designTokens;
  }

  const response = await fetch(`${API_URL}/apps/${appId}/schema`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error('Failed to save schema');
  }

  return response.json();
};

export const login = async (email: string, pass: string): Promise<{
  access_token: string;
  user: {
    id: string; email: string; role: 'SUPER_ADMIN' | 'CLIENT'; tenantId: string | null;
    firstName: string | null; lastName: string | null; avatarUrl: string | null; company: string | null;
  };
}> => {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password: pass })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || 'Login failed');
  }

  return response.json();
};

export const googleLogin = async (idToken: string): Promise<{
  access_token: string;
  user: {
    id: string; email: string; role: 'SUPER_ADMIN' | 'CLIENT'; tenantId: string | null;
    firstName: string | null; lastName: string | null; avatarUrl: string | null; company: string | null;
  };
}> => {
  const response = await fetch(`${API_URL}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || 'Error con Google login');
  }

  return response.json();
};

// --- Forgot / Reset Password ---

export const forgotPassword = async (email: string): Promise<{ message: string }> => {
  const response = await fetch(`${API_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || 'Error al enviar código');
  }
  return response.json();
};

export const resetPassword = async (
  email: string,
  token: string,
  newPassword: string,
): Promise<{ message: string }> => {
  const response = await fetch(`${API_URL}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, token, newPassword }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || 'Error al restablecer contraseña');
  }
  return response.json();
};

// --- App Management ---

export interface AppInfo {
  id: string;
  name: string;
  slug: string;
  tenantId: string;
  schema: unknown;
  designTokens: unknown;
  appConfig: Record<string, any> | null;
  needsRebuild: boolean;
  status: 'DRAFT' | 'PUBLISHED' | 'BUILDING';
  createdAt: string;
  updatedAt: string;
}

export const getApps = async (token: string): Promise<AppInfo[]> => {
  const response = await fetch(`${API_URL}/apps`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Error al obtener apps');
  return response.json();
};

export const getApp = async (appId: string, token: string): Promise<AppInfo> => {
  const response = await fetch(`${API_URL}/apps/${appId}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Error al obtener app');
  return response.json();
};

export const createApp = async (
  data: { name: string; slug: string; schema?: unknown; designTokens?: unknown },
  token: string,
): Promise<AppInfo> => {
  const response = await fetch(`${API_URL}/apps`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || 'Error al crear app');
  }
  return response.json();
};

export const deleteApp = async (appId: string, token: string): Promise<void> => {
  const response = await fetch(`${API_URL}/apps/${appId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || 'Error al eliminar app');
  }
};

export const uploadFile = async (file: File, token: string) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch(`${API_URL}/upload/image`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });
  
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || 'Error al subir el archivo');
  }

  return response.json();
};

export const uploadDocument = async (file: File, token: string) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_URL}/upload/file`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || 'Error al subir el archivo');
  }

  return response.json();
};

// --- App Config ---

export interface AppConfig {
  icon?: { url: string };
  splash?: {
    enabled: boolean;
    type: 'color' | 'image';
    backgroundColor?: string;
    backgroundImageUrl?: string;
    logoUrl?: string;
    duration: number;
  };
  onboarding?: {
    enabled: boolean;
    slides: Array<{
      id: string;
      title: string;
      description: string;
      imageUrl: string;
      order: number;
    }>;
  };
  terms?: { content: string };
  smtp?: {
    host: string;
    port: number;
    secure: boolean;
    username: string;
    fromEmail: string;
    fromName: string;
    hasPassword?: boolean;
    password?: string;
  };
  iosPermissions?: Record<string, string>;
  androidConfig?: {
    packageName: string;
    versionName: string;
    versionCode: number;
  };
  androidPermissions?: Record<string, boolean>;
}

export const getAppConfig = async (appId: string, token: string): Promise<AppConfig> => {
  const response = await fetch(`${API_URL}/apps/${appId}/config`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Error al obtener configuración');
  return response.json();
};

export const saveAppConfig = async (appId: string, config: Partial<AppConfig>, token: string): Promise<unknown> => {
  // Separate SMTP from the rest (SMTP goes to its own endpoint)
  const { smtp, ...rest } = config;
  const response = await fetch(`${API_URL}/apps/${appId}/config`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(rest),
  });
  if (!response.ok) throw new Error('Error al guardar configuración');
  return response.json();
};

export const saveSmtpConfig = async (
  appId: string,
  smtp: { host: string; port: number; secure: boolean; username: string; password: string; fromEmail: string; fromName: string },
  token: string,
): Promise<unknown> => {
  const response = await fetch(`${API_URL}/apps/${appId}/config/smtp`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(smtp),
  });
  if (!response.ok) throw new Error('Error al guardar configuración SMTP');
  return response.json();
};

export const testSmtpConfig = async (
  appId: string,
  smtpData: { host: string; port: number; secure: boolean; username: string; password?: string; fromEmail: string; fromName: string },
  token: string,
): Promise<{ connectionOk: boolean; emailSent: boolean; error?: string }> => {
  const response = await fetch(`${API_URL}/apps/${appId}/config/test-smtp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(smtpData),
  });
  if (!response.ok) throw new Error('Error al probar SMTP');
  return response.json();
};

export const uploadAppIcon = async (file: File, token: string) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_URL}/upload/app-icon`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || 'Error al subir el icono');
  }

  return response.json();
};

// --- News Articles CRUD ---

export interface NewsArticle {
  id: string;
  appId: string;
  title: string;
  content: string;
  imageUrl: string | null;
  videoUrl: string | null;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
}

export const getNewsArticles = async (appId: string, token: string): Promise<NewsArticle[]> => {
  const response = await fetch(`${API_URL}/apps/${appId}/news`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Error al obtener artículos');
  return response.json();
};

export const createNewsArticle = async (
  appId: string,
  data: { title: string; content: string; imageUrl?: string; videoUrl?: string; publishedAt?: string },
  token: string,
): Promise<NewsArticle> => {
  const response = await fetch(`${API_URL}/apps/${appId}/news`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Error al crear artículo');
  return response.json();
};

export const updateNewsArticle = async (
  appId: string,
  articleId: string,
  data: { title?: string; content?: string; imageUrl?: string; videoUrl?: string; publishedAt?: string },
  token: string,
): Promise<NewsArticle> => {
  const response = await fetch(`${API_URL}/apps/${appId}/news/${articleId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Error al actualizar artículo');
  return response.json();
};

export const deleteNewsArticle = async (
  appId: string,
  articleId: string,
  token: string,
): Promise<void> => {
  const response = await fetch(`${API_URL}/apps/${appId}/news/${articleId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Error al eliminar artículo');
};

// --- Contact Submissions ---

export interface ContactSubmission {
  id: string;
  appId: string;
  data: Record<string, unknown>;
  fileUrls: string[];
  createdAt: string;
}

export const getContactCaptcha = async (appId: string): Promise<{ token: string; expiresAt: string }> => {
  const response = await fetch(`${API_URL}/apps/${appId}/contact/captcha`);
  if (!response.ok) throw new Error('Error al obtener captcha');
  return response.json();
};

export const submitContactForm = async (
  appId: string,
  body: { data: Record<string, unknown>; fileUrls?: string[]; captchaToken: string; honeypot?: string },
): Promise<ContactSubmission> => {
  const response = await fetch(`${API_URL}/apps/${appId}/contact/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error('Error al enviar formulario');
  return response.json();
};

export const getContactSubmissions = async (appId: string, token: string): Promise<ContactSubmission[]> => {
  const response = await fetch(`${API_URL}/apps/${appId}/contact`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Error al obtener submissions');
  return response.json();
};

export const deleteContactSubmission = async (appId: string, id: string, token: string): Promise<void> => {
  const response = await fetch(`${API_URL}/apps/${appId}/contact/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Error al eliminar submission');
};

// --- Gallery Items CRUD ---

export interface GalleryItem {
  id: string;
  appId: string;
  title: string | null;
  description: string | null;
  imageUrl: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export const getGalleryItems = async (appId: string, token: string): Promise<GalleryItem[]> => {
  const response = await fetch(`${API_URL}/apps/${appId}/gallery`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Error al obtener galería');
  return response.json();
};

export const createGalleryItem = async (
  appId: string,
  data: { imageUrl: string; title?: string; description?: string },
  token: string,
): Promise<GalleryItem> => {
  const response = await fetch(`${API_URL}/apps/${appId}/gallery`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Error al crear item de galería');
  return response.json();
};

export const updateGalleryItem = async (
  appId: string,
  id: string,
  data: { title?: string; description?: string; imageUrl?: string; order?: number },
  token: string,
): Promise<GalleryItem> => {
  const response = await fetch(`${API_URL}/apps/${appId}/gallery/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Error al actualizar item de galería');
  return response.json();
};

export const deleteGalleryItem = async (appId: string, id: string, token: string): Promise<void> => {
  const response = await fetch(`${API_URL}/apps/${appId}/gallery/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Error al eliminar item de galería');
};

export const reorderGalleryItems = async (
  appId: string,
  items: { id: string; order: number }[],
  token: string,
): Promise<void> => {
  const response = await fetch(`${API_URL}/apps/${appId}/gallery/reorder`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ items }),
  });
  if (!response.ok) throw new Error('Error al reordenar galería');
};

// --- Events CRUD ---

export interface AppEvent {
  id: string;
  appId: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  location: string | null;
  eventDate: string;
  eventEndDate: string | null;
  price: string | null;
  ticketUrl: string | null;
  ticketLabel: string | null;
  category: string | null;
  organizer: string | null;
  contactInfo: string | null;
  createdAt: string;
  updatedAt: string;
}

export const getEvents = async (appId: string, token: string): Promise<AppEvent[]> => {
  const response = await fetch(`${API_URL}/apps/${appId}/events`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Error al obtener eventos');
  return response.json();
};

export const createEvent = async (
  appId: string,
  data: { title: string; description?: string; imageUrl?: string; location?: string; eventDate: string; eventEndDate?: string; price?: string; ticketUrl?: string; ticketLabel?: string; category?: string; organizer?: string; contactInfo?: string },
  token: string,
): Promise<AppEvent> => {
  const response = await fetch(`${API_URL}/apps/${appId}/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Error al crear evento');
  return response.json();
};

export const updateEvent = async (
  appId: string,
  id: string,
  data: { title?: string; description?: string; imageUrl?: string; location?: string; eventDate?: string; eventEndDate?: string; price?: string; ticketUrl?: string; ticketLabel?: string; category?: string; organizer?: string; contactInfo?: string },
  token: string,
): Promise<AppEvent> => {
  const response = await fetch(`${API_URL}/apps/${appId}/events/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Error al actualizar evento');
  return response.json();
};

export const deleteEvent = async (appId: string, id: string, token: string): Promise<void> => {
  const response = await fetch(`${API_URL}/apps/${appId}/events/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Error al eliminar evento');
};

// --- Menu Restaurant CRUD ---

export interface MenuItemAPI {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  price: string; // Decimal comes as string from Prisma
  imageUrl: string | null;
  allergens: string[];
  available: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface MenuCategory {
  id: string;
  appId: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  order: number;
  items: MenuItemAPI[];
  createdAt: string;
  updatedAt: string;
}

export const getMenuCategories = async (appId: string, token: string): Promise<MenuCategory[]> => {
  const response = await fetch(`${API_URL}/apps/${appId}/menu`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Error al obtener menú');
  return response.json();
};

export const createMenuCategory = async (
  appId: string,
  data: { name: string; description?: string; imageUrl?: string },
  token: string,
): Promise<MenuCategory> => {
  const response = await fetch(`${API_URL}/apps/${appId}/menu`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Error al crear categoría');
  return response.json();
};

export const updateMenuCategory = async (
  appId: string,
  categoryId: string,
  data: { name?: string; description?: string; imageUrl?: string },
  token: string,
): Promise<MenuCategory> => {
  const response = await fetch(`${API_URL}/apps/${appId}/menu/${categoryId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Error al actualizar categoría');
  return response.json();
};

export const deleteMenuCategory = async (appId: string, categoryId: string, token: string): Promise<void> => {
  const response = await fetch(`${API_URL}/apps/${appId}/menu/${categoryId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Error al eliminar categoría');
};

export const reorderMenuCategories = async (
  appId: string,
  items: { id: string; order: number }[],
  token: string,
): Promise<void> => {
  const response = await fetch(`${API_URL}/apps/${appId}/menu/reorder`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ items }),
  });
  if (!response.ok) throw new Error('Error al reordenar categorías');
};

export const createMenuItem = async (
  appId: string,
  categoryId: string,
  data: { name: string; description?: string; price: number; imageUrl?: string; allergens?: string[]; available?: boolean },
  token: string,
): Promise<MenuItemAPI> => {
  const response = await fetch(`${API_URL}/apps/${appId}/menu/${categoryId}/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Error al crear plato');
  return response.json();
};

export const updateMenuItem = async (
  appId: string,
  categoryId: string,
  itemId: string,
  data: { name?: string; description?: string; price?: number; imageUrl?: string; allergens?: string[]; available?: boolean },
  token: string,
): Promise<MenuItemAPI> => {
  const response = await fetch(`${API_URL}/apps/${appId}/menu/${categoryId}/items/${itemId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Error al actualizar plato');
  return response.json();
};

export const deleteMenuItem = async (
  appId: string,
  categoryId: string,
  itemId: string,
  token: string,
): Promise<void> => {
  const response = await fetch(`${API_URL}/apps/${appId}/menu/${categoryId}/items/${itemId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Error al eliminar plato');
};

export const reorderMenuItems = async (
  appId: string,
  categoryId: string,
  items: { id: string; order: number }[],
  token: string,
): Promise<void> => {
  const response = await fetch(`${API_URL}/apps/${appId}/menu/${categoryId}/items/reorder`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ items }),
  });
  if (!response.ok) throw new Error('Error al reordenar platos');
};

// --- Discount Coupons CRUD ---

export interface DiscountCoupon {
  id: string;
  appId: string;
  title: string;
  description: string | null;
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: string; // Decimal from Prisma
  imageUrl: string | null;
  conditions: string | null;
  maxUses: number | null;
  currentUses: number;
  validFrom: string;
  validUntil: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const getDiscountCoupons = async (appId: string, token: string): Promise<DiscountCoupon[]> => {
  const response = await fetch(`${API_URL}/apps/${appId}/coupons`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Error al obtener cupones');
  return response.json();
};

export const createDiscountCoupon = async (
  appId: string,
  data: { title: string; code: string; discountType: 'PERCENTAGE' | 'FIXED_AMOUNT'; discountValue: number; description?: string; imageUrl?: string; conditions?: string; maxUses?: number; validFrom?: string; validUntil?: string },
  token: string,
): Promise<DiscountCoupon> => {
  const response = await fetch(`${API_URL}/apps/${appId}/coupons`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Error al crear cupón');
  return response.json();
};

export const updateDiscountCoupon = async (
  appId: string,
  id: string,
  data: { title?: string; code?: string; discountType?: 'PERCENTAGE' | 'FIXED_AMOUNT'; discountValue?: number; description?: string; imageUrl?: string; conditions?: string; maxUses?: number; validFrom?: string; validUntil?: string; isActive?: boolean },
  token: string,
): Promise<DiscountCoupon> => {
  const response = await fetch(`${API_URL}/apps/${appId}/coupons/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Error al actualizar cupón');
  return response.json();
};

export const deleteDiscountCoupon = async (appId: string, id: string, token: string): Promise<void> => {
  const response = await fetch(`${API_URL}/apps/${appId}/coupons/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Error al eliminar cupón');
};

export const generateCouponCode = async (appId: string, token: string): Promise<{ code: string }> => {
  const response = await fetch(`${API_URL}/apps/${appId}/coupons/generate-code`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Error al generar código');
  return response.json();
};

// --- Catalog CRUD ---

export interface CatalogProduct {
  id: string;
  collectionId: string;
  name: string;
  description: string | null;
  price: string;
  comparePrice: string | null;
  imageUrls: string[];
  inStock: boolean;
  tags: string[];
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface CatalogCollection {
  id: string;
  appId: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  order: number;
  products: CatalogProduct[];
  createdAt: string;
  updatedAt: string;
}

export const getCatalogCollections = async (appId: string, token: string): Promise<CatalogCollection[]> => {
  const response = await fetch(`${API_URL}/apps/${appId}/catalog`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Error al obtener catálogo');
  return response.json();
};

export const createCatalogCollection = async (
  appId: string,
  data: { name: string; description?: string; imageUrl?: string },
  token: string,
): Promise<CatalogCollection> => {
  const response = await fetch(`${API_URL}/apps/${appId}/catalog`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Error al crear colección');
  return response.json();
};

export const updateCatalogCollection = async (
  appId: string,
  collectionId: string,
  data: { name?: string; description?: string; imageUrl?: string },
  token: string,
): Promise<CatalogCollection> => {
  const response = await fetch(`${API_URL}/apps/${appId}/catalog/${collectionId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Error al actualizar colección');
  return response.json();
};

export const deleteCatalogCollection = async (appId: string, collectionId: string, token: string): Promise<void> => {
  const response = await fetch(`${API_URL}/apps/${appId}/catalog/${collectionId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Error al eliminar colección');
};

export const reorderCatalogCollections = async (
  appId: string,
  items: { id: string; order: number }[],
  token: string,
): Promise<void> => {
  const response = await fetch(`${API_URL}/apps/${appId}/catalog/reorder`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ items }),
  });
  if (!response.ok) throw new Error('Error al reordenar colecciones');
};

export const createCatalogProduct = async (
  appId: string,
  collectionId: string,
  data: { name: string; price: number; description?: string; comparePrice?: number; imageUrls?: string[]; inStock?: boolean; tags?: string[] },
  token: string,
): Promise<CatalogProduct> => {
  const response = await fetch(`${API_URL}/apps/${appId}/catalog/${collectionId}/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Error al crear producto');
  return response.json();
};

export const updateCatalogProduct = async (
  appId: string,
  collectionId: string,
  productId: string,
  data: { name?: string; price?: number; description?: string; comparePrice?: number; imageUrls?: string[]; inStock?: boolean; tags?: string[] },
  token: string,
): Promise<CatalogProduct> => {
  const response = await fetch(`${API_URL}/apps/${appId}/catalog/${collectionId}/products/${productId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Error al actualizar producto');
  return response.json();
};

export const deleteCatalogProduct = async (
  appId: string,
  collectionId: string,
  productId: string,
  token: string,
): Promise<void> => {
  const response = await fetch(`${API_URL}/apps/${appId}/catalog/${collectionId}/products/${productId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Error al eliminar producto');
};

export const reorderCatalogProducts = async (
  appId: string,
  collectionId: string,
  items: { id: string; order: number }[],
  token: string,
): Promise<void> => {
  const response = await fetch(`${API_URL}/apps/${appId}/catalog/${collectionId}/products/reorder`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ items }),
  });
  if (!response.ok) throw new Error('Error al reordenar productos');
};

// --- User Profile ---

export interface UserProfile {
  id: string;
  email: string;
  role: string;
  tenantId: string | null;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  avatarUrl: string | null;
  phone: string | null;
  address: string | null;
  address2: string | null;
  zipCode: string | null;
  city: string | null;
  country: string | null;
  stateProvince: string | null;
  createdAt: string;
}

export const getProfile = async (token: string): Promise<UserProfile> => {
  const response = await fetch(`${API_URL}/users/me`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Error al obtener perfil');
  return response.json();
};

export const updateProfile = async (
  data: Partial<Omit<UserProfile, 'id' | 'email' | 'role' | 'tenantId' | 'createdAt'>>,
  token: string,
): Promise<UserProfile> => {
  const response = await fetch(`${API_URL}/users/me`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || 'Error al actualizar perfil');
  }
  return response.json();
};

export const changePassword = async (
  data: { currentPassword: string; newPassword: string },
  token: string,
): Promise<void> => {
  const response = await fetch(`${API_URL}/users/me/password`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || 'Error al cambiar contraseña');
  }
};

export const requestAccountDeletion = async (password: string, token: string): Promise<void> => {
  const response = await fetch(`${API_URL}/users/me/request-deletion`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ password }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || 'Error al solicitar eliminación');
  }
};

export const uploadAvatar = async (file: File, token: string) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_URL}/upload/avatar`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || 'Error al subir avatar. Máximo 2MB.');
  }

  return response.json();
};

// --- Bookings CRUD ---

export interface BookingRecord {
  id: string;
  appId: string;
  date: string;
  timeSlot: string;
  duration: number;
  status: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  formData: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export const getAvailableSlots = async (appId: string, date: string): Promise<string[]> => {
  const response = await fetch(`${API_URL}/apps/${appId}/bookings/available?date=${date}`);
  if (!response.ok) throw new Error('Error al obtener slots disponibles');
  return response.json();
};

export const createBooking = async (
  appId: string,
  data: { date: string; timeSlot: string; formData: Record<string, unknown> },
): Promise<BookingRecord> => {
  const response = await fetch(`${API_URL}/apps/${appId}/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || 'Error al crear reserva');
  }
  return response.json();
};

export const getBookings = async (
  appId: string,
  token: string,
  filters?: { date?: string; status?: string },
): Promise<BookingRecord[]> => {
  const params = new URLSearchParams();
  if (filters?.date) params.set('date', filters.date);
  if (filters?.status) params.set('status', filters.status);
  const qs = params.toString();
  const response = await fetch(`${API_URL}/apps/${appId}/bookings${qs ? `?${qs}` : ''}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Error al obtener reservas');
  return response.json();
};

export const updateBookingStatus = async (
  appId: string,
  bookingId: string,
  status: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED',
  token: string,
): Promise<BookingRecord> => {
  const response = await fetch(`${API_URL}/apps/${appId}/bookings/${bookingId}/status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ status }),
  });
  if (!response.ok) throw new Error('Error al actualizar estado de reserva');
  return response.json();
};

export const deleteBooking = async (appId: string, bookingId: string, token: string): Promise<void> => {
  const response = await fetch(`${API_URL}/apps/${appId}/bookings/${bookingId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Error al eliminar reserva');
};

// ─── Builds ────────────────────────────────────────────────────────────────────

export interface AppBuild {
  id: string;
  appId: string;
  status: 'QUEUED' | 'PREPARING' | 'BUILDING' | 'SIGNING' | 'COMPLETED' | 'FAILED';
  buildType: string;
  schemaHash: string;
  logOutput?: string;
  artifactUrl?: string;
  artifactSize?: number;
  errorMessage?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export const requestBuild = async (
  appId: string,
  token: string,
  buildType: 'debug' | 'release' | 'aab' | 'ios-export' | 'pwa' = 'debug',
): Promise<AppBuild> => {
  const response = await fetch(`${API_URL}/apps/${appId}/builds`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ buildType }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message ?? 'Error al solicitar build');
  }
  return response.json();
};

export const getBuilds = async (appId: string, token: string): Promise<AppBuild[]> => {
  const response = await fetch(`${API_URL}/apps/${appId}/builds`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Error al obtener builds');
  return response.json();
};

export const getBuild = async (appId: string, buildId: string, token: string): Promise<AppBuild> => {
  const response = await fetch(`${API_URL}/apps/${appId}/builds/${buildId}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Error al obtener build');
  return response.json();
};

export const getLatestBuild = async (appId: string, token: string): Promise<AppBuild | null> => {
  const response = await fetch(`${API_URL}/apps/${appId}/builds/latest`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Error al obtener último build');
  const data = await response.json();
  return data || null;
};

export const getBuildDownloadUrl = (appId: string, buildId: string): string => {
  return `${API_URL}/apps/${appId}/builds/${buildId}/download`;
};

export const downloadBuildArtifact = (appId: string, buildId: string, token: string): void => {
  const url = `${API_URL}/apps/${appId}/builds/${buildId}/download?token=${encodeURIComponent(token)}`;
  window.open(url, '_blank');
};

// ─── Keystore ──────────────────────────────────────────────────────────────────

export interface KeystoreInfo {
  hasKeystore: boolean;
  createdAt?: string;
}

export const getKeystoreInfo = async (appId: string, token: string): Promise<KeystoreInfo> => {
  const response = await fetch(`${API_URL}/apps/${appId}/keystore/info`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Error al obtener info de keystore');
  return response.json();
};

export const getKeystoreDownloadUrl = (appId: string): string => {
  return `${API_URL}/apps/${appId}/keystore/download`;
};

export const downloadKeystore = (appId: string, token: string): void => {
  const url = `${API_URL}/apps/${appId}/keystore/download?token=${encodeURIComponent(token)}`;
  window.open(url, '_blank');
};

// ─── Subscription ──────────────────────────────────────────────────────────────

export interface SubscriptionPlan {
  id: string;
  name: string;
  planType: string;
  maxApps: number;
  maxBuildsPerMonth: number;
  storageGb: number;
  canBuild: boolean;
  isWhiteLabel: boolean;
  priceMonthly: number;
}

export interface SubscriptionInfo {
  subscription: {
    id: string;
    tenantId: string;
    planId: string;
    expiresAt: string;
    stripeSubscriptionId?: string;
    stripeCurrentPeriodEnd?: string;
    cancelAtPeriodEnd?: boolean;
    plan: SubscriptionPlan;
  };
  usage: {
    appsCount: number;
    buildsThisMonth: number;
    storageBytes: number;
  };
}

export const getSubscription = async (token: string): Promise<SubscriptionInfo> => {
  const response = await fetch(`${API_URL}/subscription`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Error al obtener suscripción');
  return response.json();
};

export const getSubscriptionPlans = async (token: string): Promise<SubscriptionPlan[]> => {
  const response = await fetch(`${API_URL}/subscription/plans`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Error al obtener planes');
  return response.json();
};

// ─── Stripe Billing ─────────────────────────────────────────────────────────

export const createCheckoutSession = async (planType: string, token: string): Promise<{ url: string }> => {
  const response = await fetch(`${API_URL}/stripe/create-checkout-session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ planType }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || 'Error al crear sesión de checkout');
  }
  return response.json();
};

export const cancelStripeSubscription = async (token: string): Promise<void> => {
  const response = await fetch(`${API_URL}/stripe/cancel`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || 'Error al cancelar suscripción');
  }
};

export const createPortalSession = async (token: string): Promise<{ url: string }> => {
  const response = await fetch(`${API_URL}/stripe/portal`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || 'Error al abrir portal de facturación');
  }
  return response.json();
};

// ─── Push Notifications ─────────────────────────────────────────────────────

export interface PushNotificationItem {
  id: string;
  appId: string;
  title: string;
  body: string;
  imageUrl: string | null;
  status: 'DRAFT' | 'SENT' | 'FAILED';
  sentAt: string | null;
  successCount: number;
  failureCount: number;
  errorMessage: string | null;
  createdAt: string;
}

export const getPushNotifications = async (appId: string, token: string): Promise<PushNotificationItem[]> => {
  const response = await fetch(`${API_URL}/apps/${appId}/push`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Error al obtener notificaciones');
  return response.json();
};

export const sendPushNotification = async (
  appId: string,
  data: { title: string; body: string; imageUrl?: string },
  token: string,
): Promise<PushNotificationItem> => {
  const response = await fetch(`${API_URL}/apps/${appId}/push/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || 'Error al enviar notificación');
  }
  return response.json();
};

export const getPushDeviceCount = async (appId: string, token: string): Promise<number> => {
  const response = await fetch(`${API_URL}/apps/${appId}/push/devices/count`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Error al obtener conteo de dispositivos');
  const d = await response.json();
  return d.count;
};

export const getPushStats = async (appId: string, token: string): Promise<{
  deviceCount: number;
  notificationsSent: number;
  lastSentAt: string | null;
}> => {
  const response = await fetch(`${API_URL}/apps/${appId}/push/stats`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Error al obtener estadísticas push');
  return response.json();
};

// ─── App Users (end-user auth for generated apps) ────────────────────────────

export interface AppUserItem {
  id: string;
  appId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  status: 'ACTIVE' | 'BANNED';
  lastLoginAt: string | null;
  createdAt: string;
}

export interface PaginatedAppUsers {
  data: AppUserItem[];
  total: number;
  page: number;
  limit: number;
}

export const getAppUsers = async (
  appId: string,
  token: string,
  params?: { search?: string; status?: string; page?: number; limit?: number; from?: string; to?: string },
): Promise<PaginatedAppUsers> => {
  const qs = new URLSearchParams();
  if (params?.search) qs.set('search', params.search);
  if (params?.status) qs.set('status', params.status);
  if (params?.page) qs.set('page', params.page.toString());
  if (params?.limit) qs.set('limit', params.limit.toString());
  if (params?.from) qs.set('from', params.from);
  if (params?.to) qs.set('to', params.to);
  const qsStr = qs.toString();
  const response = await fetch(`${API_URL}/apps/${appId}/users${qsStr ? `?${qsStr}` : ''}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Error al obtener usuarios de la app');
  return response.json();
};

export const getAppUserStats = async (appId: string, token: string): Promise<{ total: number; active: number; banned: number }> => {
  const response = await fetch(`${API_URL}/apps/${appId}/users/stats`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Error al obtener estadísticas de usuarios');
  return response.json();
};

export const banAppUser = async (appId: string, userId: string, token: string): Promise<AppUserItem> => {
  const response = await fetch(`${API_URL}/apps/${appId}/users/${userId}/ban`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Error al bloquear usuario');
  return response.json();
};

export const unbanAppUser = async (appId: string, userId: string, token: string): Promise<AppUserItem> => {
  const response = await fetch(`${API_URL}/apps/${appId}/users/${userId}/unban`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Error al desbloquear usuario');
  return response.json();
};

export const deleteAppUser = async (appId: string, userId: string, token: string): Promise<void> => {
  const response = await fetch(`${API_URL}/apps/${appId}/users/${userId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Error al eliminar usuario');
};

export interface AppUserDetail extends AppUserItem {
  activity: {
    socialPosts: number;
    socialComments: number;
    socialLikes: number;
    fanPosts: number;
    fanLikes: number;
    reports: number;
  };
  recentPosts: {
    socialPosts: Array<{ id: string; content: string; imageUrl?: string; likesCount: number; createdAt: string }>;
    fanPosts: Array<{ id: string; imageUrl: string; caption?: string; likesCount: number; createdAt: string }>;
  };
}

export const getAppUserDetail = async (appId: string, userId: string, token: string): Promise<AppUserDetail> => {
  const response = await fetch(`${API_URL}/apps/${appId}/users/${userId}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Error al obtener detalle del usuario');
  return response.json();
};

export const resetAppUserPassword = async (
  appId: string, userId: string, token: string,
): Promise<{ resetToken: string; expiresAt: string; emailSent: boolean }> => {
  const response = await fetch(`${API_URL}/apps/${appId}/users/${userId}/reset-password`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Error al generar reset de contraseña');
  return response.json();
};

export const exportAppUsersCsv = async (appId: string, token: string): Promise<Blob> => {
  const response = await fetch(`${API_URL}/apps/${appId}/users/export/csv`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Error al exportar usuarios');
  return response.blob();
};

// ──────────────────── Social Wall ────────────────────

export interface SocialPostItem {
  id: string;
  appId: string;
  content: string;
  imageUrl?: string;
  likesCount: number;
  commentCount: number;
  isLiked?: boolean;
  author: { id: string; firstName?: string; lastName?: string; avatarUrl?: string; email: string };
  createdAt: string;
}

export interface ContentReportItem {
  id: string;
  targetType: string;
  targetId: string;
  reason?: string;
  appUser: { email: string; firstName?: string };
  createdAt: string;
}

export const getSocialPosts = async (
  appId: string, token: string, page = 1,
): Promise<{ data: SocialPostItem[]; total: number; page: number; limit: number }> => {
  const response = await fetch(`${API_URL}/apps/${appId}/social/posts?page=${page}&limit=10`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Error al obtener posts del social wall');
  return response.json();
};

export const getSocialWallStats = async (
  appId: string, token: string,
): Promise<{ totalPosts: number; totalComments: number; totalLikes: number; pendingReports: number }> => {
  const response = await fetch(`${API_URL}/apps/${appId}/social/stats`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Error al obtener estadísticas del social wall');
  return response.json();
};

export const getSocialReports = async (appId: string, token: string): Promise<ContentReportItem[]> => {
  const response = await fetch(`${API_URL}/apps/${appId}/social/reports`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Error al obtener reportes');
  return response.json();
};

export const resolveSocialReport = async (appId: string, reportId: string, token: string): Promise<void> => {
  const response = await fetch(`${API_URL}/apps/${appId}/social/reports/${reportId}/resolve`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Error al resolver reporte');
};

export const deleteSocialPost = async (appId: string, postId: string, token: string): Promise<void> => {
  const response = await fetch(`${API_URL}/apps/${appId}/social/posts/${postId}/moderate`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Error al eliminar post');
};

// ──────────────────── Fan Wall ────────────────────

export interface FanPostItem {
  id: string;
  appId: string;
  imageUrl: string;
  caption?: string;
  likesCount: number;
  isLiked?: boolean;
  author: { id: string; firstName?: string; lastName?: string; avatarUrl?: string; email: string };
  createdAt: string;
}

export const getFanPosts = async (
  appId: string, token: string, page = 1,
): Promise<{ data: FanPostItem[]; total: number; page: number; limit: number }> => {
  const response = await fetch(`${API_URL}/apps/${appId}/fan-wall/posts?page=${page}&limit=12`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Error al obtener posts del fan wall');
  return response.json();
};

export const getFanWallStats = async (
  appId: string, token: string,
): Promise<{ totalPosts: number; totalLikes: number; pendingReports: number }> => {
  const response = await fetch(`${API_URL}/apps/${appId}/fan-wall/stats`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Error al obtener estadísticas del fan wall');
  return response.json();
};

export const deleteFanPost = async (appId: string, postId: string, token: string): Promise<void> => {
  const response = await fetch(`${API_URL}/apps/${appId}/fan-wall/posts/${postId}/moderate`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Error al eliminar foto');
};

// ─── Analytics ──────────────────────────────────────────────

export interface AnalyticsOverview {
  totalSessions: number;
  activeUsers: number;
  avgSessionDuration: number;
  totalScreenViews: number;
  dailyTrend: Array<{ day: string; users: number; sessions: number }>;
}

export interface ModuleRanking {
  moduleId: string;
  views: number;
}

export interface DeviceBreakdown {
  platforms: { android: number; ios: number; web: number };
  topDevices: Array<{ model: string; count: number }>;
}

export interface RetentionData {
  dau: number;
  wau: number;
  mau: number;
  dailyActiveUsers: Array<{ day: string; users: number }>;
}

export const getAppAnalyticsOverview = async (
  appId: string, period: string, token: string,
): Promise<AnalyticsOverview> => {
  const response = await fetch(`${API_URL}/apps/${appId}/analytics/overview?period=${period}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Error al obtener analíticas');
  return response.json();
};

export const getAppAnalyticsModules = async (
  appId: string, period: string, token: string,
): Promise<ModuleRanking[]> => {
  const response = await fetch(`${API_URL}/apps/${appId}/analytics/modules?period=${period}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Error al obtener ranking de módulos');
  return response.json();
};

export const getAppAnalyticsDevices = async (
  appId: string, period: string, token: string,
): Promise<DeviceBreakdown> => {
  const response = await fetch(`${API_URL}/apps/${appId}/analytics/devices?period=${period}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Error al obtener dispositivos');
  return response.json();
};

export const getAppAnalyticsRetention = async (
  appId: string, period: string, token: string,
): Promise<RetentionData> => {
  const response = await fetch(`${API_URL}/apps/${appId}/analytics/retention?period=${period}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Error al obtener retención');
  return response.json();
};

// --- Loyalty Card ---

export const setupLoyalty = async (
  appId: string,
  data: { totalStamps: number; reward: string; rewardDescription?: string; pin: string },
  token: string,
): Promise<{ id: string; appId: string; totalStamps: number; reward: string }> => {
  const response = await fetch(`${API_URL}/apps/${appId}/loyalty/setup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || 'Error al configurar la tarjeta de lealtad');
  }
  return response.json();
};

export const getLoyaltyConfig = async (
  appId: string,
): Promise<{ id: string; totalStamps: number; reward: string; rewardDescription?: string } | null> => {
  const response = await fetch(`${API_URL}/apps/${appId}/loyalty/config`);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error('Error al obtener configuración de lealtad');
  return response.json();
};

export const getLoyaltyStats = async (
  appId: string, token: string,
): Promise<{ activeUsers: number; stampsThisMonth: number; totalRedemptions: number }> => {
  const response = await fetch(`${API_URL}/apps/${appId}/loyalty/stats`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Error al obtener estadísticas de lealtad');
  return response.json();
};

export const stampLoyalty = async (
  appId: string,
  data: { appUserEmail: string; pin: string },
): Promise<{ stampsCollected: number; totalStamps: number; canRedeem: boolean }> => {
  const response = await fetch(`${API_URL}/apps/${appId}/loyalty/stamp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || 'Error al sellar');
  }
  return response.json();
};

// --- Coupon Redemption ---

export const redeemCoupon = async (
  appId: string,
  couponId: string,
  data?: { appUserId?: string; deviceId?: string },
): Promise<{ redemption: { id: string }; currentUses: number; maxUses: number | null }> => {
  const response = await fetch(`${API_URL}/apps/${appId}/coupons/${couponId}/redeem`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data || {}),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || 'Error al canjear cupón');
  }
  return response.json();
};

export interface CouponRedemptionItem {
  id: string;
  couponId: string;
  appUserId?: string;
  deviceId?: string;
  redeemedAt: string;
  appUser?: { id: string; email: string; firstName?: string; lastName?: string };
}

export const getCouponRedemptions = async (
  appId: string, couponId: string, token: string,
): Promise<CouponRedemptionItem[]> => {
  const response = await fetch(`${API_URL}/apps/${appId}/coupons/${couponId}/redemptions`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Error al obtener canjes');
  return response.json();
};

export const resetCouponRedemptions = async (
  appId: string, couponId: string, token: string,
): Promise<{ message: string }> => {
  const response = await fetch(`${API_URL}/apps/${appId}/coupons/${couponId}/reset-redemptions`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Error al resetear canjes');
  return response.json();
};

// --- Coupon Merchant Config ---

export interface CouponMerchantConfigStatus {
  configured: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export const getCouponMerchantConfigStatus = async (
  appId: string,
  token: string,
): Promise<CouponMerchantConfigStatus> => {
  const response = await fetch(`${API_URL}/apps/${appId}/coupons/merchant-config`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Error al obtener configuración del comerciante');
  return response.json();
};

export const setupCouponMerchantConfig = async (
  appId: string,
  pin: string,
  token: string,
): Promise<{ id: string; appId: string; createdAt: string; updatedAt: string }> => {
  const response = await fetch(`${API_URL}/apps/${appId}/coupons/merchant-config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ pin }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || 'Error al configurar PIN');
  }
  return response.json();
};

export interface CouponMerchantPublicInfo {
  appName: string;
  activeCoupons: number;
}

export const getCouponMerchantPublicInfo = async (
  appId: string,
): Promise<CouponMerchantPublicInfo | null> => {
  const response = await fetch(`${API_URL}/apps/${appId}/coupons/merchant-info`);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error('Error al obtener info del negocio');
  return response.json();
};

export interface MerchantRedeemResult {
  success: boolean;
  redemption: { id: string };
  coupon: {
    id: string;
    title: string;
    code: string;
    discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
    discountValue: string;
    currentUses: number;
    maxUses: number | null;
  };
  message: string;
}

export const merchantRedeemCoupon = async (
  appId: string,
  data: { code: string; pin: string; appUserEmail?: string },
): Promise<MerchantRedeemResult> => {
  const response = await fetch(`${API_URL}/apps/${appId}/coupons/merchant-redeem`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || 'Error al validar cupón');
  }
  return response.json();
};

// --- Orders ---

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  collectionName?: string;
}

export interface OrderData {
  id: string;
  appId: string;
  status: 'PENDING' | 'CONFIRMED' | 'READY' | 'DELIVERED' | 'CANCELLED';
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  customerNotes?: string;
  items: OrderItem[];
  total: number;
  createdAt: string;
  updatedAt: string;
}

export const createOrder = async (
  appId: string,
  data: { customerName: string; customerPhone?: string; customerEmail?: string; customerNotes?: string; items: { productId: string; quantity: number }[] },
): Promise<OrderData> => {
  const response = await fetch(`${API_URL}/apps/${appId}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || 'Error al crear pedido');
  }
  return response.json();
};

export const getOrder = async (appId: string, orderId: string): Promise<OrderData> => {
  const response = await fetch(`${API_URL}/apps/${appId}/orders/${orderId}`);
  if (!response.ok) throw new Error('Error al obtener pedido');
  return response.json();
};

export const getOrders = async (
  appId: string, token: string, params?: { status?: string; page?: number },
): Promise<{ data: OrderData[]; total: number; page: number; limit: number }> => {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  if (params?.page) qs.set('page', String(params.page));
  const response = await fetch(`${API_URL}/apps/${appId}/orders?${qs.toString()}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Error al obtener pedidos');
  return response.json();
};

export const updateOrderStatus = async (
  appId: string, orderId: string, status: string, token: string,
): Promise<OrderData> => {
  const response = await fetch(`${API_URL}/apps/${appId}/orders/${orderId}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ status }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || 'Error al actualizar estado');
  }
  return response.json();
};

export const getOrderStats = async (
  appId: string, token: string,
): Promise<{ pendingCount: number; todayCount: number; totalRevenue: number }> => {
  const response = await fetch(`${API_URL}/apps/${appId}/orders/stats`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Error al obtener estadísticas de pedidos');
  return response.json();
};
