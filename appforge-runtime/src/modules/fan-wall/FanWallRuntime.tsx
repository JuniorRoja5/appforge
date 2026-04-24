import React, { useState, useEffect, useCallback, useRef } from 'react';
import { registerRuntimeModule } from '../registry';
import {
  isAuthenticated,
  getCurrentUser,
  onAuthChange,
  type AppUserData,
} from '../../lib/auth';
import { resolveAssetUrl } from '../../lib/resolve-asset-url';
import {
  getFanPosts,
  createFanPost,
  toggleFanLike,
  deleteFanPost,
  reportFanPost,
  uploadAppUserImage,
  type FanPostItem,
} from '../../lib/api';
import { compressImage } from '../../lib/image-utils';
import { imgFallback } from '../../lib/img-fallback';

// ─── PhotoDetail Modal ─────────────────────────────────

const PhotoDetail: React.FC<{
  post: FanPostItem;
  currentUserId?: string;
  onClose: () => void;
  onLike: (postId: string) => void;
  onDelete: (postId: string) => void;
  onReport: (postId: string) => void;
}> = ({ post, currentUserId, onClose, onLike, onDelete, onReport }) => {
  const isOwn = currentUserId === post.author.id;
  const displayName = post.author.firstName
    ? `${post.author.firstName}${post.author.lastName ? ` ${post.author.lastName}` : ''}`
    : post.author.email.split('@')[0];

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', flexDirection: 'column' }} onClick={onClose}>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={(e) => e.stopPropagation()}>
        <img src={resolveAssetUrl(post.imageUrl)} alt="" style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: 8, objectFit: 'contain' }} onError={imgFallback} />
      </div>
      <div style={{ background: 'var(--color-surface-card, #fff)', borderRadius: '16px 16px 0 0', padding: 16 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--color-primary, #ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-on-primary, #fff)', fontSize: 13, fontWeight: 600, overflow: 'hidden', flexShrink: 0 }}>
            {post.author.avatarUrl
              ? <img src={resolveAssetUrl(post.author.avatarUrl)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={imgFallback} />
              : displayName[0]?.toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary, #1f2937)' }}>{displayName}</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-secondary, #9ca3af)' }}>
              {new Date(post.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
            </div>
          </div>
        </div>
        {post.caption && <p style={{ fontSize: 14, color: 'var(--color-text-primary, #374151)', margin: '0 0 10px' }}>{post.caption}</p>}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {currentUserId && (
            <button onClick={() => onLike(post.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22 }}>
              {post.isLiked ? '❤️' : '🤍'}
            </button>
          )}
          <span style={{ fontSize: 14, color: 'var(--color-text-secondary, #6b7280)' }}>{post.likesCount} likes</span>
          <span style={{ flex: 1 }} />
          {currentUserId && (
            <>
              {isOwn && <button onClick={() => onDelete(post.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--color-feedback-error, #ef4444)' }}>Eliminar</button>}
              <button onClick={() => onReport(post.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--color-text-secondary, #9ca3af)' }}>Reportar</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ────────────────────────────────────

const FanWallRuntime: React.FC<{
  data: Record<string, unknown>;
  apiUrl: string;
  appId: string;
}> = ({ data }) => {
  const wallTitle = (data.title as string) ?? '';
  const bgColor = (data.backgroundColor as string) || '';
  const headerColor = (data.headerColor as string) || '';
  const [user, setUser] = useState<AppUserData | null>(getCurrentUser());
  const [authed, setAuthed] = useState(isAuthenticated());
  const [posts, setPosts] = useState<FanPostItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selectedPost, setSelectedPost] = useState<FanPostItem | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return onAuthChange((u) => {
      setUser(u);
      setAuthed(u !== null);
    });
  }, []);

  const loadPosts = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await getFanPosts(p, 24);
      setPosts((prev) => p === 1 ? res.data : [...prev, ...res.data]);
      setTotal(res.total);
      setPage(p);
    } catch (err: any) {
      setError(err?.message || 'No se pudieron cargar las publicaciones');
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadPosts(1); }, [loadPosts]);

  const handleLike = async (postId: string) => {
    if (!authed) return;
    // Optimistic UI
    setPosts((prev) => prev.map((p) => {
      if (p.id !== postId) return p;
      const wasLiked = p.isLiked;
      return { ...p, isLiked: !wasLiked, likesCount: p.likesCount + (wasLiked ? -1 : 1) };
    }));
    if (selectedPost?.id === postId) {
      setSelectedPost((p) => p ? { ...p, isLiked: !p.isLiked, likesCount: p.likesCount + (p.isLiked ? -1 : 1) } : p);
    }
    try {
      const res = await toggleFanLike(postId);
      setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, isLiked: res.liked, likesCount: res.likesCount } : p));
      if (selectedPost?.id === postId) {
        setSelectedPost((p) => p ? { ...p, isLiked: res.liked, likesCount: res.likesCount } : p);
      }
    } catch {
      // Revert
      setPosts((prev) => prev.map((p) => {
        if (p.id !== postId) return p;
        const wasLiked = p.isLiked;
        return { ...p, isLiked: !wasLiked, likesCount: p.likesCount + (wasLiked ? -1 : 1) };
      }));
    }
  };

  const handleDelete = async (postId: string) => {
    if (!confirm('¿Eliminar esta foto?')) return;
    try {
      await deleteFanPost(postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      setTotal((t) => t - 1);
      setSelectedPost(null);
    } catch (err: any) {
      setError(err?.message || 'No se pudo eliminar la foto');
    }
  };

  const handleReport = async (postId: string) => {
    const reason = prompt('¿Por qué quieres reportar esta foto? (opcional)');
    if (reason === null) return;
    try {
      await reportFanPost(postId, reason || undefined);
      alert('Reporte enviado. Gracias.');
    } catch (err: any) {
      alert(err.message || 'Error al reportar');
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const compressed = await compressImage(file);
      const result = await uploadAppUserImage(compressed);
      const caption = prompt('Agrega una descripción (opcional)') ?? undefined;
      const post = await createFanPost(result.url, caption || undefined);
      setPosts((prev) => [post, ...prev]);
      setTotal((t) => t + 1);
    } catch (err: any) {
      setError(err?.message || 'No se pudo subir la foto. Verifica los permisos de cámara/galería.');
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div style={{ padding: 4, minHeight: '100%', background: bgColor || 'var(--color-surface-bg, #f9fafb)' }}>
      {/* Header */}
      {wallTitle && (
        <div style={{
          background: headerColor || 'linear-gradient(to right, var(--color-primary, #ec4899), var(--color-secondary, #f43f5e))',
          borderRadius: 12, padding: '10px 16px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ fontSize: 14 }}>📷</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{wallTitle}</span>
        </div>
      )}
      {/* Upload button */}
      {authed && (
        <div style={{ padding: '8px 8px 4px', display: 'flex', justifyContent: 'flex-end' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--color-primary, #ec4899)', color: '#fff', padding: '8px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: uploading ? 0.5 : 1 }}>
            {uploading ? '⏳ Subiendo...' : '📷 Subir foto'}
            <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} disabled={uploading} style={{ display: 'none' }} />
          </label>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div style={{ margin: '8px 8px 0', padding: '10px 14px', borderRadius: 10, backgroundColor: 'var(--color-feedback-error-bg, #fef2f2)', color: 'var(--color-feedback-error, #ef4444)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ flex: 1 }}>{error}</span>
          <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--color-feedback-error, #ef4444)', padding: 0 }}>✕</button>
        </div>
      )}

      {!authed && (
        <div style={{ padding: 12, textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary, #9ca3af)', margin: 0 }}>Inicia sesión para subir fotos y dar likes</p>
        </div>
      )}

      {/* Photo grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3, padding: 4 }}>
        {posts.map((post) => (
          <div
            key={post.id}
            onClick={() => setSelectedPost(post)}
            style={{ position: 'relative', aspectRatio: '1', cursor: 'pointer', borderRadius: 4, overflow: 'hidden' }}
          >
            <img src={resolveAssetUrl(post.imageUrl)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={imgFallback} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.5))', padding: '12px 6px 4px', display: 'flex', alignItems: 'center', gap: 3 }}>
              <span style={{ fontSize: 10, color: '#fff' }}>❤️ {post.likesCount}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Load more */}
      {posts.length < total && (
        <div style={{ padding: 12, textAlign: 'center' }}>
          <button onClick={() => loadPosts(page + 1)} disabled={loading} style={{ background: 'var(--color-surface-card, #fff)', border: '1px solid var(--color-divider, #e5e7eb)', borderRadius: 12, padding: '10px 24px', fontSize: 13, fontWeight: 600, color: 'var(--color-primary, #ec4899)', cursor: 'pointer', opacity: loading ? 0.5 : 1 }}>
            {loading ? 'Cargando...' : 'Cargar más'}
          </button>
        </div>
      )}

      {!loading && posts.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-secondary, #9ca3af)', fontSize: 14 }}>
          Aún no hay fotos. ¡Sube la primera!
        </div>
      )}

      {/* Detail modal */}
      {selectedPost && (
        <PhotoDetail
          post={selectedPost}
          currentUserId={user?.id}
          onClose={() => setSelectedPost(null)}
          onLike={handleLike}
          onDelete={handleDelete}
          onReport={handleReport}
        />
      )}
    </div>
  );
};

registerRuntimeModule({ id: 'fan_wall', Component: FanWallRuntime });
