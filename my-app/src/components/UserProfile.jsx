import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import './UserProfile.css'
import { API_ENDPOINTS } from '../config/api'

const PAGE_SIZE = 12

const UserProfile = () => {
    const { userId } = useParams()
    const navigate = useNavigate()

    const [user, setUser] = useState(null)
    const [currentUser, setCurrentUser] = useState(null)
    const [userPosts, setUserPosts] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [isFollowLoading, setIsFollowLoading] = useState(false)

    const [cursor, setCursor] = useState(null)
    const [hasMore, setHasMore] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    const authHeaders = token ? { Authorization: `Bearer ${token}` } : {}

    const fetchInitial = async () => {
        try {
            setIsLoading(true)
            setUser(null)
            setUserPosts([])
            setCursor(null)
            setHasMore(true)

            const me = await axios.get(API_ENDPOINTS.profile, { headers: authHeaders })
            setCurrentUser(me.data)

            const u = await axios.get(API_ENDPOINTS.userById(userId), { headers: authHeaders })
            setUser(u.data)

            const pr = await axios.get(API_ENDPOINTS.userPosts(userId), {
                headers: authHeaders,
                params: { limit: PAGE_SIZE }
            })
            const items = Array.isArray(pr.data) ? pr.data : pr.data.items || []
            const next = Array.isArray(pr.data) ? null : pr.data.nextCursor ?? null

            setUserPosts(items)
            setCursor(next)
            setHasMore(Boolean(next))
        } catch (err) {
            console.error('Failed to fetch user data:', err)
            alert('User not found')
            navigate('/')
        } finally {
            setIsLoading(false)
        }
    }

    const loadMore = async () => {
        if (!hasMore || loadingMore) return
        try {
            setLoadingMore(true)
            const pr = await axios.get(API_ENDPOINTS.userPosts(userId), {
                headers: authHeaders,
                params: { limit: PAGE_SIZE, cursor }
            })
            const items = Array.isArray(pr.data) ? pr.data : pr.data.items || []
            const next = Array.isArray(pr.data) ? null : pr.data.nextCursor ?? null

            setUserPosts(prev => {
                const seen = new Set(prev.map(p => p._id))
                const merged = [...prev]
                for (const it of items) if (!seen.has(it._id)) merged.push(it)
                return merged
            })
            setCursor(next)
            setHasMore(Boolean(next))
        } catch (e) {
            console.error('Failed to load more posts', e)
        } finally {
            setLoadingMore(false)
        }
    }

    useEffect(() => {
        if (userId) fetchInitial()
    }, [userId])

    const handleFollowToggle = async () => {
        if (!user || isFollowLoading) return
        setIsFollowLoading(true)
        try {
            await axios.patch(
                API_ENDPOINTS.follow(user._id),
                {},
                { headers: authHeaders }
            )

            const [u, me] = await Promise.all([
                axios.get(API_ENDPOINTS.userById(userId), { headers: authHeaders }),
                axios.get(API_ENDPOINTS.profile, { headers: authHeaders })
            ])
            setUser(u.data)
            setCurrentUser(me.data)
        } catch (err) {
            console.error('Failed to toggle follow:', err)
            alert('Failed to update follow status')
        } finally {
            setIsFollowLoading(false)
        }
    }

    const isFollowing =
        currentUser &&
        user &&
        (currentUser.following || []).some(
            f => (f?._id || f)?.toString() === user._id.toString()
        )

    const isOwnProfile = currentUser && user && currentUser._id === user._id

    if (isLoading) {
        return (
            <div className="user-profile-loading">
                <div className="loading-spinner">Loading...</div>
            </div>
        )
    }

    if (!user) {
        return (
            <div className="user-profile-error">
                <h2>User not found</h2>
                <button onClick={() => navigate('/')} className="back-btn">
                    Go Back to Home
                </button>
            </div>
        )
    }

    return (
        <div className="user-profile">
            <div className="profile-header">
                <div className="profile-info">
                    <img
                        src={
                            user.profilePic ||
                            'https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png'
                        }
                        alt={`${user.username}'s profile`}
                        className="profile-picture"
                    />
                    <div className="profile-details">
                        <div className="profile-title">
                            <h1>{user.username}</h1>
                            {!isOwnProfile ? (
                                <button
                                    onClick={handleFollowToggle}
                                    disabled={isFollowLoading}
                                    className={`follow-button ${isFollowing ? 'following' : 'not-following'}`}
                                >
                                    {isFollowLoading ? 'Loading...' : isFollowing ? 'Unfollow' : 'Follow'}
                                </button>
                            ) : (
                                <button
                                    onClick={() => navigate('/edit-profile')}
                                    className="edit-profile-button"
                                >
                                    Edit Profile
                                </button>
                            )}
                        </div>

                        <div className="profile-stats">
                            <div className="stat">
                                <strong>{userPosts.length}</strong>
                                <span>posts</span>
                            </div>
                            <div className="stat">
                                <strong>{user.followers?.length || 0}</strong>
                                <span>followers</span>
                            </div>
                            <div className="stat">
                                <strong>{user.following?.length || 0}</strong>
                                <span>following</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="profile-content">
                <div className="posts-section">
                    <h3>Posts</h3>
                    {userPosts.length === 0 ? (
                        <div className="no-posts">
                            <p>
                                {isOwnProfile
                                    ? "You haven't posted anything yet"
                                    : `${user.username} hasn't posted anything yet`}
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="posts-grid">
                                {userPosts.map(post => (
                                    <div key={post._id} className="post-thumbnail">
                                        {post.media && post.media.length > 0 ? (
                                            post.media[0].kind === 'video' ? (
                                                <video src={post.media[0].src} className="post-media" muted />
                                            ) : (
                                                <img src={post.media[0].src} alt="Post" className="post-media" />
                                            )
                                        ) : post.image ? (
                                            <img src={post.image} alt="Post" className="post-media" />
                                        ) : (
                                            <div className="no-media">No media</div>
                                        )}
                                        <div className="post-overlay">
                                            <span>{post.caption || 'No caption'}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {hasMore && (
                                <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
                                    <button
                                        onClick={loadMore}
                                        disabled={loadingMore}
                                        className="load-more-btn"
                                    >
                                        {loadingMore ? 'Loading…' : 'Load more'}
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

export default UserProfile
