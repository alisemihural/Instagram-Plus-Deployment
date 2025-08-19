import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import './home.css'
import PostCard from './components/PostCard'
import Modal from 'react-modal'

const PAGE_SIZE = 5

const Home = () => {
    const [posts, setPosts] = useState([])
    const [currentUser, setCurrentUser] = useState(null)
    const [stories, setStories] = useState({})
    const [storiesProfile, setStoriesProfile] = useState([])
    const [storiesLoaded, setStoriesLoaded] = useState(false)
    const [showStorySlides, setShowStorySlides] = useState(false)
    const [currentStory, setCurrentStory] = useState(0)

    const [cursor, setCursor] = useState(null)
    const [hasMore, setHasMore] = useState(true)
    const [loadingPosts, setLoadingPosts] = useState(false)
    const [postsError, setPostsError] = useState('')

    const sentinelRef = useRef(null)

    const postsInitRef = useRef(false)
    const postsInFlightRef = useRef(false)
    const postsAbortRef = useRef(null)
    const hasMoreRef = useRef(true)
    const cursorRef = useRef(null)

    const storiesInitRef = useRef(false)
    const storiesProfileInitRef = useRef(false)

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    const authHeaders = token ? { Authorization: `Bearer ${token}` } : {}

    const openStorySlides = authorId => {
        setCurrentStory(authorId)
        setShowStorySlides(true)
    }
    const closeStorySlides = () => setShowStorySlides(false)

    const previousStory = () => {
        setCurrentStory(prev => prev === 0 ? Math.max(Object.keys(stories).length - 1, 0) : prev - 1)
    }

    const nextStory = () => {
        setCurrentStory(prev => prev === Object.keys(stories).length - 1 ? 0 : prev + 1)
    }

    const refreshUser = async () => {
        try {
            if (!token) return
            const res = await axios.get('http://localhost:5000/users/profile', {
                headers: authHeaders
            })
            setCurrentUser(res.data)
        } catch (err) {
            console.error('Failed to refresh user data:', err)
        }
    }

    useEffect(() => {
        refreshUser()
    }, [])

    const loadPosts = async (initial = false) => {
        if (postsInFlightRef.current || !hasMoreRef.current) return

        postsInFlightRef.current = true
        setLoadingPosts(true)
        setPostsError('')

        if (postsAbortRef.current) postsAbortRef.current.abort()
        postsAbortRef.current = new AbortController()

        try {
            const res = await axios.get('http://localhost:5000/posts', {
                params: { limit: PAGE_SIZE, cursor: initial ? undefined : cursorRef.current },
                headers: authHeaders,
                signal: postsAbortRef.current.signal
            })

            const items = Array.isArray(res.data) ? res.data : res.data.items || []
            const next = Array.isArray(res.data) ? null : res.data.nextCursor ?? null

            setPosts(prev => {
                const seen = new Set(prev.map(p => p._id))
                const merged = [...prev]
                for (const it of items) {
                    if (!seen.has(it._id)) {
                        merged.push(it)
                        seen.add(it._id)
                    }
                }
                return merged
            })

            cursorRef.current = next
            setCursor(next)
            hasMoreRef.current = Boolean(next)
            setHasMore(Boolean(next))
        } catch (err) {
            if (err.code !== 'ERR_CANCELED') {
                console.error('Failed to load posts:', err)
                setPostsError('Failed to load posts')
            }
        } finally {
            setLoadingPosts(false)
            postsInFlightRef.current = false
        }
    }

    // initial page: guard StrictMode double-mount
    useEffect(() => {
        if (postsInitRef.current) return
        postsInitRef.current = true
        cursorRef.current = null
        hasMoreRef.current = true
        loadPosts(true)
        return () => {
            if (postsAbortRef.current) postsAbortRef.current.abort()
        }
    }, [])

    useEffect(() => {
        if (!sentinelRef.current) return
        const el = sentinelRef.current

        const obs = new IntersectionObserver(entries => {
            const first = entries[0]
            if (first.isIntersecting) loadPosts(false)
        }, { rootMargin: '800px 0px 800px 0px' })

        obs.observe(el)
        return () => obs.disconnect()
    }, [])

    useEffect(() => {
        const fetchStories = async () => {
            try {
                const res = await axios.get('http://localhost:5000/stories', {
                    headers: authHeaders
                })
                setStories(res.data)
                setStoriesLoaded(true)
            } catch (err) {
                console.error('Failed to fetch stories:', err)
            }
        }
        if (!storiesInitRef.current) {
            storiesInitRef.current = true
            fetchStories()
        }
    }, [])

    useEffect(() => {
        const fetchStoriesProfile = async () => {
            try {
                const res = await axios.get('http://localhost:5000/stories/users', {
                    headers: authHeaders
                })
                setStoriesProfile(res.data)
            } catch (err) {
                console.error('Failed to fetch stories profile:', err)
            }
        }
        if (storiesLoaded && !storiesProfileInitRef.current) {
            storiesProfileInitRef.current = true
            fetchStoriesProfile()
        }
    }, [storiesLoaded])

    return (
        <div className='feed-container'>
            <Modal isOpen={showStorySlides} onRequestClose={closeStorySlides}>
                {currentStory && (
                    <div className='story-content'>
                        {
                            (stories[currentStory]).map((eachStory, index) => (
                                <img
                                    key={currentStory + index}
                                    src={eachStory}
                                    alt='Story'
                                    style={{ width: "75%", height: "75%" }}
                                />
                            ))
                        }
                    </div>
                )}
            </Modal>

            {storiesProfile.length === 0 ? (
                <p>No stories yet</p>
            ) : (
                <div style={{ display: 'flex', gap: 10, padding: '10px 6px', overflowX: 'auto', marginBottom: 16 }}>
                    {storiesProfile.map(s => (
                        <div key={s._id}>
                            <a onClick={e => {
                                e.preventDefault()
                                openStorySlides(s._id)
                            }}>
                                <div className='story' style={{ flex: '0 0 auto' }}>
                                    <img
                                        src={s.profilePic}
                                        alt='Story'
                                        className='story-image'
                                        style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '2px solid #e1306c' }}
                                    />
                                </div>
                            </a>
                            <p>{s.username}</p>
                        </div>
                    ))}
                </div>
            )}

            {posts.length === 0 && !loadingPosts && !postsError && (
                <p>No posts yet</p>
            )}

            {posts.map(p => (
                <PostCard
                    key={p._id}
                    post={p}
                    token={token}
                    currentUserId={currentUser?._id}
                    currentUser={currentUser}
                    onFollowChange={refreshUser}
                />
            ))}

            {postsError && <div style={{ color: 'crimson', padding: 12 }}>{postsError}</div>}
            {loadingPosts && <div style={{ padding: 12 }}>Loading…</div>}
            {!hasMore && posts.length > 0 && <div style={{ padding: 12, color: '#777' }}>You’re all caught up</div>}

            {/* sentinel for infinite scroll */}
            <div ref={sentinelRef} style={{ height: 1 }} />
        </div>
    )
}

export default Home
