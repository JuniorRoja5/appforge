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
  getSocialPosts,
  createSocialPost,
  toggleSocialLike,
  getSocialComments,
  createSocialComment,
  deleteSocialPost,
  deleteSocialComment,
  reportSocialContent,
  uploadAppUserImage,
  type SocialPostItem,
  type SocialCommentItem,
} from '../../lib/api';
import { compressImage } from '../../lib/image-utils';
import { imgFallback } from '../../lib/img-fallback';

// ─── PostCard ──────────────────────────────────────────

const PostCard: React.FC<{
  post: SocialPostItem;
  currentUserId?: string;
  onLike: (postId: string) => void;
  onDelete: (postId: string) => void;
  onReport: (postId: string) => void;
  onToggleComments: (postId: string) => void;
  showComments: boolean;
}> = ({ post, currentUserId, onLike, onDelete, onReport, onToggleComments, showComments }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const isOwn = currentUserId === post.author.id;
  const displayName = post.author.firstName
    ? `${post.author.firstName}${post.author.lastName ? ` ${post.author.lastName}` : ''}`
    : post.author.email.split('@')[0];

  return (
    <div style={{ background: 'var(--color-surface-card, #fff)', borderRadius: 12, padding: 16, marginBottom: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10, gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--color-primary, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 600, overflow: 'hidden', flexShrink: 0 }}>
          {post.author.avatarUrl
            ? <img src={resolveAssetUrl(post.author.avatarUrl)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={imgFallback} />
            : displayName[0]?.toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary, #1f2937)' }}>{displayName}</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-secondary, #9ca3af)' }}>
            {new Date(post.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
        {currentUserId && (
          <div style={{ position: 'relative' }}>
            <button onClick={() => setMenuOpen(!menuOpen)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, fontSize: 16, color: 'var(--color-text-secondary, #9ca3af)' }}>⋯</button>
            {menuOpen && (
              <div style={{ position: 'absolute', right: 0, top: '100%', background: 'var(--color-surface-card, #fff)', border: '1px solid var(--color-divider, #e5e7eb)', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 10, minWidth: 140, overflow: 'hidden' }}>
                {isOwn && <button onClick={() => { setMenuOpen(false); onDelete(post.id); }} style={{ display: 'block', width: '100%', padding: '8px 12px', border: 'none', background: 'none', textAlign: 'left', fontSize: 13, color: 'var(--color-feedback-error, #ef4444)', cursor: 'pointer' }}>Eliminar</button>}
                <button onClick={() => { setMenuOpen(false); onReport(post.id); }} style={{ display: 'block', width: '100%', padding: '8px 12px', border: 'none', background: 'none', textAlign: 'left', fontSize: 13, color: 'var(--color-text-secondary, #6b7280)', cursor: 'pointer' }}>Reportar</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <p style={{ fontSize: 14, color: 'var(--color-text-primary, #1f2937)', lineHeight: 1.5, margin: '0 0 10px', whiteSpace: 'pre-wrap' }}>{post.content}</p>

      {/* Image */}
      {post.imageUrl && (
        <img src={resolveAssetUrl(post.imageUrl)} alt="" style={{ width: '100%', borderRadius: 8, marginBottom: 10, maxHeight: 300, objectFit: 'cover' }} onError={imgFallback} />
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 16, borderTop: '1px solid var(--color-divider, #f3f4f6)', paddingTop: 10 }}>
        <button onClick={() => onLike(post.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: post.isLiked ? '#ef4444' : 'var(--color-text-secondary, #9ca3af)' }}>
          {post.isLiked ? '❤️' : '🤍'} {post.likesCount}
        </button>
        <button onClick={() => onToggleComments(post.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: showComments ? 'var(--color-primary, #3b82f6)' : 'var(--color-text-secondary, #9ca3af)' }}>
          💬 {post.commentCount}
        </button>
      </div>
    </div>
  );
};

// ─── CommentSection ────────────────────────────────────

const CommentSection: React.FC<{ postId: string; currentUserId?: string }> = ({ postId, currentUserId }) => {
  const [comments, setComments] = useState<SocialCommentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [commentError, setCommentError] = useState('');

  const load = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await getSocialComments(postId, p, 10);
      setComments((prev) => p === 1 ? res.data : [...prev, ...res.data]);
      setTotal(res.total);
      setPage(p);
    } catch (err: any) {
      console.warn('[SocialWall] Failed to load comments:', err?.message);
    }
    setLoading(false);
  }, [postId]);

  useEffect(() => { load(1); }, [load]);

  const handleSubmit = async () => {
    if (!newComment.trim() || submitting) return;
    setSubmitting(true);
    try {
      const comment = await createSocialComment(postId, newComment.trim());
      setComments((prev) => [...prev, comment]);
      setTotal((t) => t + 1);
      setNewComment('');
      setCommentError('');
    } catch (err: any) {
      setCommentError(err?.message || 'No se pudo enviar el comentario');
    }
    setSubmitting(false);
  };

  const handleDelete = async (commentId: string) => {
    try {
      await deleteSocialComment(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      setTotal((t) => t - 1);
    } catch (err: any) {
      setCommentError(err?.message || 'No se pudo eliminar el comentario');
    }
  };

  return (
    <div style={{ padding: '0 16px 16px', background: 'var(--color-surface-card, #fff)', borderRadius: '0 0 12px 12px', marginTop: -12, marginBottom: 12 }}>
      <div style={{ maxHeight: 200, overflowY: 'auto' }}>
        {comments.map((c) => {
          const name = c.author.firstName || c.author.email.split('@')[0];
          return (
            <div key={c.id} style={{ display: 'flex', gap: 8, padding: '6px 0', fontSize: 13 }}>
              <span style={{ fontWeight: 600, color: 'var(--color-text-primary, #1f2937)', flexShrink: 0 }}>{name}</span>
              <span style={{ color: 'var(--color-text-primary, #1f2937)', flex: 1 }}>{c.content}</span>
              {currentUserId === c.author.id && (
                <button onClick={() => handleDelete(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 11, flexShrink: 0 }}>×</button>
              )}
            </div>
          );
        })}
        {comments.length < total && (
          <button onClick={() => load(page + 1)} disabled={loading} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary, #3b82f6)', fontSize: 12, padding: '4px 0' }}>
            {loading ? 'Cargando...' : 'Ver más comentarios'}
          </button>
        )}
      </div>

      {commentError && (
        <p style={{ fontSize: 12, color: 'var(--color-feedback-error, #ef4444)', margin: '4px 0' }}>{commentError}</p>
      )}

      {currentUserId && (
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="Escribe un comentario..."
            style={{ flex: 1, border: '1px solid var(--color-divider, #e5e7eb)', borderRadius: 20, padding: '6px 12px', fontSize: 13, outline: 'none' }}
          />
          <button onClick={handleSubmit} disabled={submitting || !newComment.trim()} style={{ background: 'var(--color-primary, #3b82f6)', color: '#fff', border: 'none', borderRadius: 20, padding: '6px 14px', fontSize: 13, cursor: 'pointer', opacity: submitting || !newComment.trim() ? 0.5 : 1 }}>
            {submitting ? '...' : 'Enviar'}
          </button>
        </div>
      )}
    </div>
  );
};

// ─── CreatePostForm ────────────────────────────────────

const CreatePostForm: React.FC<{ onCreated: (post: SocialPostItem) => void; allowImages: boolean }> = ({ onCreated, allowImages }) => {
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState<string | undefined>();
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const compressed = await compressImage(file);
      const result = await uploadAppUserImage(compressed);
      setImageUrl(result.url);
      setFormError('');
    } catch (err: any) {
      setFormError(err?.message || 'No se pudo subir la imagen. Verifica los permisos de cámara/galería.');
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleSubmit = async () => {
    if (!content.trim() || submitting) return;
    setSubmitting(true);
    try {
      const post = await createSocialPost(content.trim(), imageUrl);
      onCreated(post);
      setContent('');
      setImageUrl(undefined);
      setFormError('');
    } catch (err: any) {
      setFormError(err?.message || 'No se pudo publicar. Inténtalo de nuevo.');
    }
    setSubmitting(false);
  };

  return (
    <div style={{ background: 'var(--color-surface-card, #fff)', borderRadius: 12, padding: 16, marginBottom: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="¿Qué estás pensando?"
        rows={3}
        style={{ width: '100%', border: '1px solid var(--color-divider, #e5e7eb)', borderRadius: 8, padding: 10, fontSize: 14, resize: 'none', outline: 'none', fontFamily: 'inherit' }}
      />
      {imageUrl && (
        <div style={{ position: 'relative', marginTop: 8 }}>
          <img src={resolveAssetUrl(imageUrl)} alt="" style={{ width: '100%', borderRadius: 8, maxHeight: 150, objectFit: 'cover' }} onError={imgFallback} />
          <button onClick={() => setImageUrl(undefined)} style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', fontSize: 14 }}>×</button>
        </div>
      )}
      {formError && (
        <p style={{ fontSize: 12, color: 'var(--color-feedback-error, #ef4444)', margin: '6px 0 0' }}>{formError}</p>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
        {allowImages && (
          <label style={{ cursor: 'pointer', color: 'var(--color-primary, #3b82f6)', fontSize: 13 }}>
            {uploading ? '⏳ Subiendo...' : '📷 Imagen'}
            <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} style={{ display: 'none' }} />
          </label>
        )}
        {!allowImages && <span />}
        <button onClick={handleSubmit} disabled={submitting || !content.trim()} style={{ background: 'var(--color-primary, #3b82f6)', color: '#fff', border: 'none', borderRadius: 20, padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: submitting || !content.trim() ? 0.5 : 1 }}>
          {submitting ? 'Publicando...' : 'Publicar'}
        </button>
      </div>
    </div>
  );
};

// ─── Main Component ────────────────────────────────────

const SocialWallRuntime: React.FC<{
  data: Record<string, unknown>;
  apiUrl: string;
  appId: string;
}> = ({ data }) => {
  // Builder config fields
  const allowImages = data.allowImages !== false;
  const wallTitle = (data.title as string) ?? '';
  const postLayout = (data.postLayout as string) ?? 'list';
  const postsPerPage = (data.postsPerPage as number) ?? 20;
  const showHeader = data.showHeader !== false;
  const allowLikes = data.allowLikes !== false;
  const allowComments = data.allowComments !== false;
  const bgColor = (data.backgroundColor as string) || '';
  const headerColor = (data.headerColor as string) || '';
  const textColor = (data.textColor as string) || '';

  const [user, setUser] = useState<AppUserData | null>(getCurrentUser());
  const [authed, setAuthed] = useState(isAuthenticated());
  const [posts, setPosts] = useState<SocialPostItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');

  useEffect(() => {
    return onAuthChange((u) => {
      setUser(u);
      setAuthed(u !== null);
    });
  }, []);

  const loadPosts = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await getSocialPosts(p, postsPerPage);
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
    try {
      const res = await toggleSocialLike(postId);
      setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, isLiked: res.liked, likesCount: res.likesCount } : p));
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
    if (!confirm('¿Eliminar este post?')) return;
    try {
      await deleteSocialPost(postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      setTotal((t) => t - 1);
    } catch (err: any) {
      setError(err?.message || 'No se pudo eliminar el post');
    }
  };

  const handleReport = async (postId: string) => {
    const reason = prompt('¿Por qué quieres reportar este post? (opcional)');
    if (reason === null) return; // cancelled
    try {
      await reportSocialContent('social_post', postId, reason || undefined);
      alert('Reporte enviado. Gracias.');
    } catch (err: any) {
      alert(err.message || 'Error al reportar');
    }
  };

  const toggleComments = (postId: string) => {
    setExpandedComments((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });
  };

  const handleCreated = (post: SocialPostItem) => {
    setPosts((prev) => [post, ...prev]);
    setTotal((t) => t + 1);
  };

  // Determine spacing based on layout
  const layoutSpacing = postLayout === 'compact' ? 0 : postLayout === 'cards' ? 12 : 8;
  const postStyle: React.CSSProperties = postLayout === 'compact'
    ? { borderBottom: '1px solid var(--color-divider, #e5e7eb)' }
    : {};

  return (
    <div style={{ padding: 12, minHeight: '100%', background: bgColor || 'var(--color-surface-bg, #f9fafb)' }}>
      {/* Header */}
      {showHeader && wallTitle && (
        <div style={{
          background: headerColor || 'linear-gradient(to right, var(--color-primary, #3b82f6), var(--color-secondary, #0891b2))',
          borderRadius: 12, padding: '12px 16px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{wallTitle}</span>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div style={{ margin: '0 0 12px', padding: '10px 14px', borderRadius: 10, backgroundColor: 'var(--color-feedback-error-bg, #fef2f2)', color: 'var(--color-feedback-error, #ef4444)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ flex: 1 }}>{error}</span>
          <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--color-feedback-error, #ef4444)', padding: 0 }}>✕</button>
        </div>
      )}

      {authed && <CreatePostForm onCreated={handleCreated} allowImages={allowImages} />}

      {!authed && (
        <div style={{ background: 'var(--color-surface-card, #fff)', borderRadius: 12, padding: 16, marginBottom: 12, textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <p style={{ fontSize: 13, color: textColor || 'var(--color-text-secondary, #9ca3af)', margin: 0 }}>Inicia sesión para publicar y participar</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: layoutSpacing }}>
        {posts.map((post) => (
          <React.Fragment key={post.id}>
            <div style={postStyle}>
              <PostCard
                post={post}
                currentUserId={user?.id}
                onLike={allowLikes ? handleLike : () => {}}
                onDelete={handleDelete}
                onReport={handleReport}
                onToggleComments={allowComments ? toggleComments : () => {}}
                showComments={allowComments && expandedComments.has(post.id)}
              />
            </div>
            {allowComments && expandedComments.has(post.id) && (
              <CommentSection postId={post.id} currentUserId={user?.id} />
            )}
          </React.Fragment>
        ))}
      </div>

      {posts.length < total && (
        <button onClick={() => loadPosts(page + 1)} disabled={loading} style={{ display: 'block', width: '100%', padding: 12, marginTop: 12, background: 'var(--color-surface-card, #fff)', border: '1px solid var(--color-divider, #e5e7eb)', borderRadius: 12, fontSize: 13, fontWeight: 600, color: 'var(--color-primary, #3b82f6)', cursor: 'pointer', opacity: loading ? 0.5 : 1 }}>
          {loading ? 'Cargando...' : 'Cargar más'}
        </button>
      )}

      {!loading && posts.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: textColor || 'var(--color-text-secondary, #9ca3af)', fontSize: 14 }}>
          Aún no hay publicaciones. ¡Sé el primero!
        </div>
      )}
    </div>
  );
};

registerRuntimeModule({ id: 'social_wall', Component: SocialWallRuntime });
