import { useMemo, useState } from 'react'
import axios from 'axios'
import { AiFillHeart, AiOutlineHeart } from 'react-icons/ai'
import { BiMessageRounded } from 'react-icons/bi'
import MediaCarousel from './MediaCarousel.jsx'
import CommentsModal from './CommentsModal.jsx'

const PostCard = ({ post, token, currentUserId }) => {
    const [doc, setDoc] = useState(post)

    const media = useMemo(() => (
        doc.media?.length ? doc.media : (doc.image ? [{ kind: 'image', src: doc.image }] : [])
    ), [doc])

    const [index, setIndex] = useState(0)
    const [likesCount, setLikesCount] = useState(doc.likes?.length || 0)
    const [liked, setLiked] = useState((doc.likes || []).some(u => (u?._id || u)?.toString() === (currentUserId || '').toString()))
    const [commentsCount, setCommentsCount] = useState(doc.comments?.length || 0)
    const [modalOpen, setModalOpen] = useState(false)

    const fmt = iso => !iso ? '' : new Date(iso).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    const createdAt = doc.createdAt ? fmt(doc.createdAt) : ''
    const updatedAt = doc.updatedAt ? fmt(doc.updatedAt) : ''
    const isEdited = doc.updatedAt && doc.createdAt && new Date(doc.updatedAt) - new Date(doc.createdAt) > 60000

    const handleLike = async () => {
        try {
            const res = await axios.patch(`http://localhost:5000/posts/${doc._id}/like`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            })
            const arr = res.data.likes || []
            setLikesCount(arr.length)
            setLiked(arr.some(u => (u?._id || u)?.toString() === (currentUserId || '').toString()))
        } catch (err) {
            console.error('Failed to like/unlike post:', err)
        }
    }

    const refreshPost = async () => {
        try {
            const res = await axios.get(`http://localhost:5000/posts/${doc._id}`)
            const fresh = res.data
            setDoc(fresh)
            setLikesCount((fresh.likes || []).length)
            setLiked((fresh.likes || []).some(u => (u?._id || u)?.toString() === (currentUserId || '').toString()))
            setCommentsCount((fresh.comments || []).length)
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px' }}>
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
                onClose={() => {
                    setModalOpen(false)
                    refreshPost()
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
