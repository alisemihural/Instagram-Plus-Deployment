import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import { AiOutlineClose, AiFillHeart, AiOutlineHeart } from 'react-icons/ai'
import { BiMessageRounded } from 'react-icons/bi'
import { FiEdit2, FiTrash2 } from 'react-icons/fi'
import { BsChevronDown, BsChevronUp } from 'react-icons/bs'
import MediaCarousel from './MediaCarousel.jsx'

const CommentsModal = ({ open, onClose, post, token, currentUserId, onStats }) => {
    const media = useMemo(() => (
        post?.media?.length ? post.media : (post?.image ? [{ kind: 'image', src: post.image }] : [])
    ), [post])

    const [index, setIndex] = useState(0)
    const [comments, setComments] = useState([])
    const [busy, setBusy] = useState(false)

    const [typing, setTyping] = useState('')
    const [replyTo, setReplyTo] = useState(null)
    const [editing, setEditing] = useState(null)
    const [openThreads, setOpenThreads] = useState(new Set())

    const [likedPost, setLikedPost] = useState((post?.likes || []).includes(currentUserId))
    const [postLikes, setPostLikes] = useState(post?.likes?.length || 0)

    useEffect(() => setIndex(0), [open, post?._id])

    const resetState = () => {
        setIndex(0)
        setComments([])
        setTyping('')
        setReplyTo(null)
        setEditing(null)
        setOpenThreads(new Set())
        setBusy(false)
    }

    const handleClose = () => {
        resetState()
        onClose && onClose()
    }

    useEffect(() => {
        if (!open) resetState()
    }, [open])

    useEffect(() => {
        const load = async () => {
            if (!open || !post?._id) return
            try {
                setBusy(true)
                const res = await axios.get(`http://localhost:5000/posts/${post._id}/comments`, {
                    headers: { Authorization: `Bearer ${token}` }
                })
                setComments(res.data || [])
            } catch (e) {
                console.error('comments fetch failed', e)
            } finally {
                setBusy(false)
            }
        }
        load()
    }, [open, post?._id, token])

    useEffect(() => {
        if (!open) return
        const onKey = e => e.key === 'Escape' && handleClose()
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [open])

    const toggleThread = id => {
        const next = new Set(openThreads)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        setOpenThreads(next)
    }

    const isOwn = uid => uid && currentUserId && uid.toString() === currentUserId.toString()

    const submitText = async () => {
        const text = (editing ? editing.text : typing).trim()
        if (!text) return
        try {
            if (editing) {
                await axios.patch(`http://localhost:5000/posts/${post._id}/comments/${editing.commentId}`, {
                    text,
                    replyId: editing.replyId || undefined
                }, { headers: { Authorization: `Bearer ${token}` } })
                setComments(prev => prev.map(c => {
                    if (c._id === editing.commentId) {
                        if (editing.replyId) {
                            return {
                                ...c,
                                replies: c.replies.map(r => r._id === editing.replyId ? { ...r, text, editedAt: new Date().toISOString() } : r)
                            }
                        } else {
                            return { ...c, text, editedAt: new Date().toISOString() }
                        }
                    }
                    return c
                }))
                setEditing(null)
            } else {
                const body = replyTo ? { text, parentId: replyTo.id } : { text }
                const res = await axios.post(`http://localhost:5000/posts/${post._id}/comments`, body, {
                    headers: { Authorization: `Bearer ${token}` }
                })
                if (res.data.kind === 'reply') {
                    setComments(prev => prev.map(c => c._id === replyTo.id
                        ? { ...c, replies: [...c.replies, res.data.reply] }
                        : c))
                    setOpenThreads(s => new Set([...Array.from(s), replyTo.id]))
                } else {
                    setComments(prev => [...prev, res.data.comment])
                    onStats && onStats({ likes: postLikes, comments: (prevCount(comments) + 1) })
                }
                setReplyTo(null)
                setTyping('')
            }
        } catch (err) {
            console.error('submit failed', err)
        }
    }

    const prevCount = arr => {
        return arr.reduce((acc, c) => acc + 1 + (c.replies?.length || 0), 0)
    }

    const likeToggle = async (commentId, replyId) => {
        try {
            await axios.patch(`http://localhost:5000/posts/${post._id}/comments/${commentId}/like`, {
                replyId
            }, { headers: { Authorization: `Bearer ${token}` } })
            setComments(prev => prev.map(c => {
                if (c._id !== commentId) return c
                if (replyId) {
                    return {
                        ...c,
                        replies: c.replies.map(r => {
                            if (r._id !== replyId) return r
                            const liked = (r.likes || []).some(u => u === currentUserId || (u && u._id === currentUserId))
                            return {
                                ...r,
                                likes: liked
                                    ? (r.likes || []).filter(u => (u._id || u).toString() !== currentUserId.toString())
                                    : [...(r.likes || []), currentUserId]
                            }
                        })
                    }
                } else {
                    const liked = (c.likes || []).some(u => u === currentUserId || (u && u._id === currentUserId))
                    return {
                        ...c,
                        likes: liked
                            ? (c.likes || []).filter(u => (u._id || u).toString() !== currentUserId.toString())
                            : [...(c.likes || []), currentUserId]
                    }
                }
            }))
        } catch (err) {
            console.error('like comment failed', err)
        }
    }

    const startEdit = (commentId, replyId, text) => {
        setEditing({ commentId, replyId, text })
        setReplyTo(null)
    }

    const removeItem = async (commentId, replyId) => {
        try {
            await axios.delete(`http://localhost:5000/posts/${post._id}/comments/${commentId}`, {
                headers: { Authorization: `Bearer ${token}` },
                data: { replyId: replyId || undefined }
            })
            setComments(prev => prev.flatMap(c => {
                if (c._id !== commentId) return [c]
                if (replyId) {
                    return [{ ...c, replies: c.replies.filter(r => r._id !== replyId) }]
                } else {
                    return []
                }
            }))
        } catch (err) {
            console.error('delete failed', err)
        }
    }

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    onClick={handleClose}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 2000,
                        overscrollBehavior: 'contain'
                    }}
                >
                    <motion.div
                        onClick={e => e.stopPropagation()}
                        initial={{ y: 30, opacity: 0, scale: 0.98 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: 20, opacity: 0, scale: 0.98 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 40, mass: 0.6 }}
                        style={{
                            width: 'min(94vw, 1200px)',
                            maxHeight: 'min(720px, calc(100dvh - 48px))',
                            background: '#121212',
                            borderRadius: 12,
                            overflow: 'hidden',
                            color: '#fff',
                            position: 'relative',
                            boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
                            display: 'flex',
                            flexDirection: 'row'
                        }}
                    >
                        <button
                            onClick={handleClose}
                            aria-label='Close'
                            style={{
                                position: 'absolute', top: 10, right: 10,
                                background: 'rgba(0,0,0,0.45)', border: 'none', color: '#fff',
                                padding: 8, borderRadius: 10, cursor: 'pointer', zIndex: 3
                            }}
                        >
                            <AiOutlineClose size={20} />
                        </button>

                        <div style={{ flex: 1.6, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
                            <MediaCarousel media={media} index={index} setIndex={setIndex} height={600} dark />
                        </div>

                        <div style={{ flex: 1, minWidth: 360, maxWidth: 420, background: '#1e1e1e', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                            <div style={{ padding: 12, borderBottom: '1px solid #2a2a2a', display: 'flex', alignItems: 'center', gap: 10 }}>
                                <img
                                    src={post.author?.profilePic || 'https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png'}
                                    alt='avatar'
                                    style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }}
                                />
                                <div style={{ fontWeight: 600 }}>{post.author?.username || 'Unknown'}</div>
                            </div>

                            <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
                                {post.caption && (
                                    <div style={{ padding: '8px 0', borderBottom: '1px solid #2a2a2a' }}>
                                        <strong>{post.author?.username || 'Unknown'}</strong> {post.caption}
                                    </div>
                                )}

                                {busy ? (
                                    <div style={{ padding: '16px 0' }}>Loading comments…</div>
                                ) : comments.length === 0 ? (
                                    <div style={{ color: '#aaa', paddingTop: 10 }}>No comments yet</div>
                                ) : comments.map(c => (
                                    <div key={c._id} style={{ padding: '10px 0', borderBottom: '1px solid #2a2a2a' }}>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                                            <img
                                                src={c.user?.profilePic || 'https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png'}
                                                alt='avatar'
                                                style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', marginTop: 2 }}
                                            />
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <strong>{c.user?.username || 'Unknown'}</strong>
                                                    {c.editedAt && <span style={{ color: '#9aa', fontSize: 12 }}>(edited)</span>}
                                                </div>

                                                {editing && editing.commentId === c._id && !editing.replyId ? (
                                                    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                                                        <input
                                                            value={editing.text}
                                                            onChange={e => setEditing({ ...editing, text: e.target.value })}
                                                            style={{ flex: 1, background: '#111', color: '#fff', border: '1px solid #333', borderRadius: 6, padding: '6px 8px' }}
                                                        />
                                                        <button onClick={submitText} style={{ padding: '6px 10px', background: '#0095f6', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                                                            Save
                                                        </button>
                                                        <button onClick={() => setEditing(null)} style={{ padding: '6px 10px', background: 'transparent', color: '#ddd', border: '1px solid #444', borderRadius: 6, cursor: 'pointer' }}>
                                                            Cancel
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div style={{ marginTop: 4 }}>{c.text}</div>
                                                )}

                                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6, color: '#bbb', fontSize: 13 }}>
                                                    <button onClick={() => likeToggle(c._id)} title='Like' style={{ background: 'transparent', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                                                        {(c.likes || []).some(u => (u._id || u).toString() === currentUserId?.toString()) ? <AiFillHeart size={16} color='#e63946' /> : <AiOutlineHeart size={16} />}
                                                        <span>{(c.likes || []).length || 0}</span>
                                                    </button>

                                                    <button onClick={() => setReplyTo({ id: c._id, username: c.user?.username })} style={{ background: 'transparent', border: 'none', color: '#bbb', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                        <BiMessageRounded size={16} /> Reply
                                                    </button>

                                                    {isOwn(c.user?._id) && (
                                                        <>
                                                            <button onClick={() => startEdit(c._id, null, c.text)} style={{ background: 'transparent', border: 'none', color: '#bbb', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                                <FiEdit2 size={16} /> Edit
                                                            </button>
                                                            <button onClick={() => removeItem(c._id)} style={{ background: 'transparent', border: 'none', color: '#bbb', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                                <FiTrash2 size={16} /> Delete
                                                            </button>
                                                        </>
                                                    )}

                                                    {c.replies?.length > 0 && (
                                                        <button onClick={() => toggleThread(c._id)} style={{ background: 'transparent', border: 'none', color: '#bbb', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                            {openThreads.has(c._id) ? <BsChevronUp size={14} /> : <BsChevronDown size={14} />} {openThreads.has(c._id) ? 'Hide replies' : `View replies (${c.replies.length})`}
                                                        </button>
                                                    )}
                                                </div>

                                                {openThreads.has(c._id) && c.replies?.map(r => (
                                                    <div key={r._id} style={{ display: 'flex', gap: 8, marginTop: 10, marginLeft: 32 }}>
                                                        <img
                                                            src={r.user?.profilePic || 'https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png'}
                                                            alt='avatar'
                                                            style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover', marginTop: 2 }}
                                                        />
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                <strong>{r.user?.username || 'Unknown'}</strong>
                                                                {r.editedAt && <span style={{ color: '#9aa', fontSize: 12 }}>(edited)</span>}
                                                            </div>

                                                            {editing && editing.commentId === c._id && editing.replyId === r._id ? (
                                                                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                                                                    <input
                                                                        value={editing.text}
                                                                        onChange={e => setEditing({ ...editing, text: e.target.value })}
                                                                        style={{ flex: 1, background: '#111', color: '#fff', border: '1px solid #333', borderRadius: 6, padding: '6px 8px' }}
                                                                    />
                                                                    <button onClick={submitText} style={{ padding: '6px 10px', background: '#0095f6', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                                                                        Save
                                                                    </button>
                                                                    <button onClick={() => setEditing(null)} style={{ padding: '6px 10px', background: 'transparent', color: '#ddd', border: '1px solid #444', borderRadius: 6, cursor: 'pointer' }}>
                                                                        Cancel
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <div style={{ marginTop: 4 }}>{r.text}</div>
                                                            )}

                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6, color: '#bbb', fontSize: 13 }}>
                                                                <button onClick={() => likeToggle(c._id, r._id)} title='Like' style={{ background: 'transparent', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                                                                    {(r.likes || []).some(u => (u._id || u).toString() === currentUserId?.toString()) ? <AiFillHeart size={16} color='#e63946' /> : <AiOutlineHeart size={16} />}
                                                                    <span>{(r.likes || []).length || 0}</span>
                                                                </button>

                                                                <button onClick={() => setReplyTo({ id: c._id, username: r.user?.username })} style={{ background: 'transparent', border: 'none', color: '#bbb', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                                    <BiMessageRounded size={16} /> Reply
                                                                </button>

                                                                {isOwn(r.user?._id) && (
                                                                    <>
                                                                        <button onClick={() => startEdit(c._id, r._id, r.text)} style={{ background: 'transparent', border: 'none', color: '#bbb', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                                            <FiEdit2 size={16} /> Edit
                                                                        </button>
                                                                        <button onClick={() => removeItem(c._id, r._id)} style={{ background: 'transparent', border: 'none', color: '#bbb', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                                            <FiTrash2 size={16} /> Delete
                                                                        </button>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div style={{ padding: '10px 12px', borderTop: '1px solid #2a2a2a', display: 'flex', alignItems: 'center', gap: 14 }}>
                                <div style={{ color: '#ccc', fontSize: 13 }}>{postLikes} likes</div>
                            </div>

                            <div style={{ display: 'flex', gap: 8, padding: 12, borderTop: '1px solid #2a2a2a' }}>
                                <input
                                    value={editing ? editing.text : typing}
                                    onChange={e => editing ? setEditing({ ...editing, text: e.target.value }) : setTyping(e.target.value)}
                                    placeholder={editing
                                        ? 'Edit your comment...'
                                        : replyTo
                                            ? `Replying to ${replyTo.username}...`
                                            : 'Add a comment...'}
                                    style={{ flex: 1, background: '#111', color: '#fff', border: '1px solid #333', borderRadius: 8, padding: '10px 12px' }}
                                />
                                <button
                                    onClick={submitText}
                                    style={{ padding: '10px 14px', borderRadius: 8, background: '#0095f6', color: '#fff', border: 'none', cursor: 'pointer' }}
                                >
                                    {editing ? 'Save' : 'Post'}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}

export default CommentsModal
