import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { AiFillHeart, AiOutlineHeart } from 'react-icons/ai'
import { BiMessageRounded } from 'react-icons/bi'
import MediaCarousel from './MediaCarousel.jsx'
import CommentsModal from './CommentsModal.jsx'
import { API_ENDPOINTS } from '../config/api'

const PostCard = ({ post, token, currentUserId, currentUser, onFollowChange }) => {
    const [doc, setDoc] = useState(post)

    const media = useMemo(() => (
        doc.media?.length ? doc.media : (doc.image ? [{ kind: 'image', src: doc.image }] : [])
    ), [doc])

    const [index, setIndex] = useState(0)
    const [likesCount, setLikesCount] = useState(
        doc.likesCount ?? (doc.likes?.length || 0)
    )
    const [liked, setLiked] = useState(
        typeof doc.isLiked === 'boolean'
            ? doc.isLiked
            : (doc.likes || []).some(u => (u?._id || u)?.toString() === (currentUserId || '').toString())
    )
    const [commentsCount, setCommentsCount] = useState(
        doc.commentsCount ?? (doc.comments?.length || 0)
    )
    const [modalOpen, setModalOpen] = useState(false)

    const [isFollowing, setIsFollowing] = useState(false)
    const [followBusy, setFollowBusy] = useState(false)

    useEffect(() => {
        const authId = doc.author?._id
        const arr = currentUser?.following || []
        const has = arr.some(u => (u?._id || u)?.toString() === (authId || '').toString() || u === authId)
        setIsFollowing(Boolean(has))
    }, [currentUser, doc.author?._id])

    const fmt = iso => !iso ? '' : new Date(iso).toLocaleString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
    })
    const createdAt = doc.createdAt ? fmt(doc.createdAt) : ''
    const updatedAt = doc.updatedAt ? fmt(doc.updatedAt) : ''
    const isEdited = doc.updatedAt && doc.createdAt && new Date(doc.updatedAt) - new Date(doc.createdAt) > 60000

    const headers = { Authorization: `Bearer ${token}` }

    const handleLike = async () => {
        try {
            const res = await axios.patch(API_ENDPOINTS.likePost(doc._id), {}, { headers })
            const arr = res.data.likes || []
            setLikesCount(arr.length)
            setLiked(arr.some(u => (u?._id || u)?.toString() === (currentUserId || '').toString()))
        } catch (err) {
            console.error('Failed to like/unlike post:', err)
        }
    }

    const toggleFollow = async () => {
        if (!token || !doc.author?._id || followBusy) return
        if (doc.author._id === currentUserId) return
        try {
            setFollowBusy(true)
            await axios.patch(API_ENDPOINTS.follow(doc.author._id), {}, { headers })
            setIsFollowing(v => !v)
            onFollowChange && onFollowChange()
        } catch (err) {
            console.error('Failed to toggle follow:', err)
            alert('Failed to update follow status')
        } finally {
            setFollowBusy(false)
        }
    }

    const refreshPost = async () => {
        try {
            const res = await axios.get(API_ENDPOINTS.postById(doc._id), { headers })
            const fresh = res.data
            setDoc(fresh)
            setLikesCount(fresh.likesCount ?? (fresh.likes || []).length)
            setLiked(
                typeof fresh.isLiked === 'boolean'
                    ? fresh.isLiked
                    : (fresh.likes || []).some(u => (u?._id || u)?.toString() === (currentUserId || '').toString())
            )
            setCommentsCount(fresh.commentsCount ?? (fresh.comments || []).length)
            setIndex(0)
        } catch (err) {
            console.error('Failed to refresh post:', err)
        }
    }

    return (
        <div
            className='post-card'
            style={{
                background: '#fff',
                border: '1px solid #e6e6e6',
                borderRadius: 12,
                overflow: 'hidden',
                maxWidth: 680,
                margin: '20px auto',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <img
                        src={doc.author?.profilePic || 'https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png'}
                        alt='avatar'
                        style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ fontWeight: 600 }}>{doc.author?.username || 'Unknown'}</div>
                        <div style={{ fontSize: 12, color: '#777' }}>
                            {createdAt}{isEdited && <span> (edited {updatedAt})</span>}
                        </div>
                    </div>
                </div>

                {currentUserId && doc.author?._id && doc.author._id !== currentUserId && (
                    <button
                        onClick={toggleFollow}
                        disabled={followBusy}
                        style={{
                            backgroundColor: isFollowing ? '#e0e0e0' : '#0095f6',
                            color: isFollowing ? '#333' : '#fff',
                            border: 'none',
                            borderRadius: 6,
                            padding: '6px 12px',
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: followBusy ? 'default' : 'pointer',
                            opacity: followBusy ? 0.7 : 1
                        }}
                    >
                        {followBusy ? '...' : isFollowing ? 'Unfollow' : 'Follow'}
                    </button>
                )}
            </div>

            <MediaCarousel media={media} index={index} setIndex={setIndex} height={480} dark />

            <div style={{ borderTop: '1px solid #e6e6e6', padding: '10px 12px', fontSize: 14, textAlign: 'left' }}>
                <strong>{doc.author?.username || 'Unknown'}</strong>{doc.caption ? ` ${doc.caption}` : ''}
            </div>

            <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <button
                    onClick={handleLike}
                    title={liked ? 'Unlike' : 'Like'}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                    {liked ? <AiFillHeart size={24} color='#e63946' /> : <AiOutlineHeart size={24} />}
                    <span style={{ fontSize: 14 }}>{likesCount}</span>
                </button>

                <button
                    onClick={() => setModalOpen(true)}
                    title='Comments'
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                    <BiMessageRounded size={24} />
                    <span style={{ fontSize: 14 }}>{commentsCount}</span>
                </button>
            </div>

            <CommentsModal
                open={modalOpen}
                onClose={didChange => {
                    setModalOpen(false)
                    if (didChange) refreshPost()
                }}
                post={doc}
                token={token}
                currentUserId={currentUserId}
                onStats={({ likes, comments }) => {
                    if (typeof likes === 'number') setLikesCount(likes)
                    if (typeof comments === 'number') setCommentsCount(comments)
                }}
            />
        </div>
    )
}

export default PostCard
