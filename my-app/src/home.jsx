import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { LeftAdBanner, RightAdBanner } from './components/AdBanner'
import { API_ENDPOINTS } from './config/api'
import './home.css'

const PostCarousel = ({ items, legacyImage, author, createdAt, caption, currentUser, onFollowToggle }) => {
    const [index, setIndex] = useState(0)
    const [isFollowing, setIsFollowing] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const navigate = useNavigate()

    useEffect(() => {
        // Check if current user is following this post's author
        if (currentUser && currentUser.following && author) {
            setIsFollowing(currentUser.following.some(user => 
                user._id === author._id || user === author._id
            ))
        }
    }, [currentUser, author])

    const media = Array.isArray(items) && items.length > 0
        ? items
        : legacyImage
            ? [{ kind: 'image', src: legacyImage }]
            : []

    if (media.length === 0) return null

    const cur = media[index]
    const type = cur.kind || cur.type || 'image'

    const handlePrev = () => {
        if (index > 0) setIndex(index - 1)
    }

    const handleNext = () => {
        if (index < media.length - 1) setIndex(index + 1)
    }

    const handleFollowToggle = async () => {
        if (!author || isLoading || author._id === currentUser?._id) return
        
        setIsLoading(true)
        try {
            const token = localStorage.getItem('token')
            await axios.patch(API_ENDPOINTS.follow(author._id), {}, {
                headers: { Authorization: `Bearer ${token}` }
            })
            
            setIsFollowing(!isFollowing)
            if (onFollowToggle) onFollowToggle()
        } catch (err) {
            console.error('Failed to toggle follow:', err)
            alert('Failed to update follow status')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div style={{
            backgroundColor: '#fff',
            border: '1px solid #e6e6e6',
            borderRadius: '10px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            marginBottom: '20px',
            maxWidth: '600px',
            marginLeft: 'auto',
            marginRight: 'auto',
            fontFamily: 'Arial, sans-serif',
            overflow: 'hidden'
        }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px',
                justifyContent: 'space-between'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img
                        src={author?.profilePic || 'https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png'}
                        alt='Profile'
                        style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: '1px solid #ddd',
                            cursor: 'pointer'
                        }}
                        onClick={() => author && navigate(`/user/${author._id}`)}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'start' }}>
                        <strong 
                            style={{ 
                                fontSize: '14px', 
                                cursor: 'pointer',
                                color: '#333',
                                textDecoration: 'none'
                            }}
                            onClick={() => author && navigate(`/user/${author._id}`)}
                        >
                            {author?.username || 'Unknown'}
                        </strong>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                            {new Date(createdAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                        </div>
                    </div>
                </div>
                
                {/* Follow/Unfollow button - only show if not own post */}
                {author && currentUser && author._id !== currentUser._id && (
                    <button
                        onClick={handleFollowToggle}
                        disabled={isLoading}
                        style={{
                            backgroundColor: isFollowing ? '#e0e0e0' : '#007bff',
                            color: isFollowing ? '#333' : 'white',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '6px 12px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            cursor: isLoading ? 'default' : 'pointer',
                            opacity: isLoading ? 0.7 : 1
                        }}
                    >
                        {isLoading ? '...' : isFollowing ? 'Unfollow' : 'Follow'}
                    </button>
                )}
            </div>

            <div style={{
                position: 'relative',
                width: '100%',
                height: '500px',
                backgroundColor: '#000',
                overflow: 'hidden'
            }}>
                {type === 'video' ? (
                    <video
                        src={cur.src}
                        controls
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                ) : (
                    <img
                        src={cur.src}
                        alt={`Slide ${index}`}
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                )}

                {index > 0 && (
                    <button
                        onClick={handlePrev}
                        style={{
                            position: 'absolute',
                            top: '50%',
                            left: '10px',
                            transform: 'translateY(-50%)',
                            background: 'rgba(0,0,0,0.3)',
                            border: 'none',
                            color: 'white',
                            fontSize: '20px',
                            padding: '8px',
                            cursor: 'pointer',
                            borderRadius: '50%',
                            zIndex: 2
                        }}
                    >
                        ‹
                    </button>
                )}

                {index < media.length - 1 && (
                    <button
                        onClick={handleNext}
                        style={{
                            position: 'absolute',
                            top: '50%',
                            right: '10px',
                            transform: 'translateY(-50%)',
                            background: 'rgba(0,0,0,0.3)',
                            border: 'none',
                            color: 'white',
                            fontSize: '20px',
                            padding: '8px',
                            cursor: 'pointer',
                            borderRadius: '50%',
                            zIndex: 2
                        }}
                    >
                        ›
                    </button>
                )}

                {media.length > 1 && (
                    <div style={{
                        position: 'absolute',
                        bottom: '10px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        display: 'flex',
                        gap: '6px'
                    }}>
                        {media.map((_, i) => (
                            <span
                                key={i}
                                style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    backgroundColor: i === index ? '#fff' : 'rgba(255,255,255,0.5)',
                                    transition: 'background-color 0.2s'
                                }}
                            />
                        ))}
                    </div>
                )}
            </div>

            <div style={{
                borderTop: '1px solid #e6e6e6',
                padding: '10px',
                fontSize: '14px',
                textAlign: 'left'
            }}>
                <strong 
                    style={{ 
                        cursor: 'pointer',
                        color: '#333',
                        textDecoration: 'none'
                    }}
                    onClick={() => author && navigate(`/user/${author._id}`)}
                >
                    {author?.username || 'Unknown'}
                </strong>: {caption}
            </div>
        </div>
    )
}

const PostInteractions = ({ post, token }) => {
    const [likesCount, setLikesCount] = useState(post.likes.length)
    const [liked, setLiked] = useState(post.likes.includes(post.currentUserId))
    const [comments, setComments] = useState([])
    const [showComments, setShowComments] = useState(false)
    const [commentText, setCommentText] = useState('')

    const fetchComments = async () => {
        try {
            const res = await axios.get(API_ENDPOINTS.postComments(post._id), {
                headers: { Authorization: `Bearer ${token}` }
            })
            setComments(res.data)
        } catch (err) {
            console.error('Failed to fetch comments:', err)
        }
    }

    const handleLike = async () => {
        try {
            const res = await axios.patch(API_ENDPOINTS.likePost(post._id), {}, {
                headers: { Authorization: `Bearer ${token}` }
            })
            setLikesCount(res.data.likes.length)
            setLiked(res.data.likes.includes(post.currentUserId))
        } catch (err) {
            console.error('Failed to like/unlike post:', err)
        }
    }

    const handleAddComment = async () => {
        if (!commentText.trim()) return
        try {
            const res = await axios.post(API_ENDPOINTS.postComments(post._id), { text: commentText }, {
                headers: { Authorization: `Bearer ${token}` }
            })
            setComments(prev => [...prev, res.data])
            setCommentText('')
        } catch (err) {
            console.error('Failed to add comment:', err)
        }
    }

    const toggleComments = () => {
        if (!showComments) fetchComments()
        setShowComments(!showComments)
    }

    return (
        <div style={{ maxWidth: '600px', margin: '10px auto 40px' }}>
            <button onClick={handleLike} style={{ cursor: 'pointer', marginRight: '10px' }}>
                {liked ? 'Unlike' : 'Like'} ({likesCount})
            </button>
            <button onClick={toggleComments} style={{ cursor: 'pointer' }}>
                {showComments ? 'Hide Comments' : `Show Comments (${comments.length})`}
            </button>

            {showComments && (
                <div style={{ marginTop: '10px', textAlign: 'left' }}>
                    {comments.length === 0 ? (
                        <p>No comments yet</p>
                    ) : (
                        comments.map((c) => (
                            <div key={c._id} style={{ borderBottom: '1px solid #eee', padding: '5px 0' }}>
                                <strong>{c.user?.username || 'Unknown'}</strong>: {c.text}
                            </div>
                        ))
                    )}
                    <div style={{ marginTop: '10px' }}>
                        <input
                            type="text"
                            placeholder="Add a comment..."
                            value={commentText}
                            onChange={e => setCommentText(e.target.value)}
                            style={{ width: '80%', padding: '5px' }}
                        />
                        <button onClick={handleAddComment} style={{ padding: '5px 10px', marginLeft: '5px' }}>
                            Post
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

const Home = () => {
    const [posts, setPosts] = useState([])
    const [currentUser, setCurrentUser] = useState(null)
    
    const token = localStorage.getItem('token')
    const [userId, setUserId] = useState(null)
    const [stories, setStories] = useState([]);

    useEffect(() => {
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]))
                setUserId(payload.id)
            } catch {
                setUserId(null)
            }
        }
    }, [token])

    useEffect(() => {
        const fetchCurrentUser = async () => {
            try {
                const token = localStorage.getItem('token')
                if (token) {
                    const res = await axios.get(API_ENDPOINTS.profile, {
                        headers: { Authorization: `Bearer ${token}` }
                    })
                    setCurrentUser(res.data)
                }
            } catch (err) {
                console.error('Failed to fetch current user:', err)
            }
        }

        fetchCurrentUser()
    }, [])

    useEffect(() => {
        const fetchFeed = async () => {
            try {
                const res = await axios.get(API_ENDPOINTS.posts)
                setPosts(res.data)
            } catch (err) {
                console.error('Failed to fetch feed:', err)
            }
        }
        fetchFeed()
    }, [])

    const handleFollowToggle = async () => {
        // Refresh current user data to update following list
        try {
            const token = localStorage.getItem('token')
            if (token) {
                const res = await axios.get(API_ENDPOINTS.profile, {
                    headers: { Authorization: `Bearer ${token}` }
                })
                setCurrentUser(res.data)
            }
        } catch (err) {
            console.error('Failed to refresh user data:', err)
        }
    }

    useEffect(() => {
        const fetchFeed = async () => {
            try {
                const res = await axios.get(API_ENDPOINTS.stories)
                setStories(res.data)
            } catch (err) {
                console.error('Failed to fetch stories:', err)
            }
        }

        fetchFeed()
    }, [])


    return (
        <div className="home-layout">
            {/* Left Ad Panel */}
            <div className="left-sidebar">
                <LeftAdBanner />
            </div>

            {/* Main Feed */}
            <div className="feed-container">
                {stories.length === 0 ? (<p>No stories yet</p>) : (
                    stories.map(eachStory => (
                        <div className='story' key={eachStory._id}>
                            <img src={eachStory.story} alt="Story" className="story-image" />
                        </div>
                    ))
                )}
                {posts.length === 0 ? (
                    <p>No posts yet</p>
                ) : (
                    posts.map(post => (
                        <div key={post._id} style={{ marginBottom: '36px' }}>
                            <PostCarousel
                                items={post.media}
                                legacyImage={post.image}
                                author={post.author}
                                createdAt={post.createdAt}
                                caption={post.caption}
                                currentUser={currentUser}
                                onFollowToggle={handleFollowToggle}
                            />
                            <PostInteractions post={{ ...post, currentUserId: userId }} token={token} />
                        </div>
                    ))
                )}
            </div>

            {/* Right Ad Panel */}
            <div className="right-sidebar">
                <RightAdBanner />
            </div>
        </div>
    )
}

export default Home
