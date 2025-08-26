import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import PostCard from './PostCard'
import { API_ENDPOINTS } from '../config/api'

const PAGE_SIZE = 5

const ForYouFeed = ({ currentUser, token, onFollowChange }) => {
    const [forYouPosts, setForYouPosts] = useState([])
    const [cursor, setCursor] = useState(null)
    const [hasMore, setHasMore] = useState(true)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const sentinelRef = useRef(null)
    const initRef = useRef(false)
    const inFlightRef = useRef(false)
    const abortRef = useRef(null)
    const hasMoreRef = useRef(true)
    const cursorRef = useRef(null)

    const authHeaders = token ? { Authorization: `Bearer ${token}` } : {}

    const loadForYouPosts = async (initial = false) => {
        if (inFlightRef.current || !hasMoreRef.current) return

        inFlightRef.current = true
        setLoading(true)
        setError('')

        if (abortRef.current) abortRef.current.abort()
        abortRef.current = new AbortController()

        try {
            const res = await axios.get(API_ENDPOINTS.forYouPosts, {
                params: { limit: PAGE_SIZE, cursor: initial ? undefined : cursorRef.current },
                headers: authHeaders,
                signal: abortRef.current.signal
            })

            const items = Array.isArray(res.data) ? res.data : res.data.items || []
            const next = Array.isArray(res.data) ? null : res.data.nextCursor ?? null

            setForYouPosts(prev => {
                const seen = new Set(prev.map(p => p._id))
                const merged = [...prev]
                for (const item of items) {
                    if (!seen.has(item._id)) {
                        merged.push(item)
                        seen.add(item._id)
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
                console.error('Failed to load For You posts:', err)
                setError('Failed to load recommendations')
            }
        } finally {
            setLoading(false)
            inFlightRef.current = false
        }
    }

    // Initial load
    useEffect(() => {
        if (initRef.current || !token) return
        initRef.current = true
        cursorRef.current = null
        hasMoreRef.current = true
        loadForYouPosts(true)
        return () => {
            if (abortRef.current) abortRef.current.abort()
        }
    }, [token])

    // Infinite scroll
    useEffect(() => {
        if (!sentinelRef.current) return
        const el = sentinelRef.current

        const obs = new IntersectionObserver(entries => {
            const first = entries[0]
            if (first.isIntersecting) loadForYouPosts(false)
        }, { rootMargin: '400px 0px 400px 0px' })

        obs.observe(el)
        return () => obs.disconnect()
    }, [])

    if (!token) {
        return null
    }

    return (
        <div className="for-you-section">
            <div className="for-you-header">
                <h2 style={{ 
                    margin: '16px 0', 
                    fontSize: '18px', 
                    fontWeight: '600',
                    color: '#262626',
                    borderBottom: '1px solid #dbdbdb',
                    paddingBottom: '8px'
                }}>
                    💫 For You
                </h2>
                <p style={{ 
                    fontSize: '14px', 
                    color: '#8e8e8e', 
                    margin: '0 0 16px 0' 
                }}>
                    Recommended posts based on your interests
                </p>
            </div>

            {forYouPosts.length === 0 && !loading && !error && (
                <div style={{ 
                    textAlign: 'center', 
                    padding: '32px 16px',
                    color: '#8e8e8e',
                    fontSize: '14px'
                }}>
                    <p>Like and interact with posts to get personalized recommendations!</p>
                </div>
            )}

            {forYouPosts.map(post => (
                <PostCard
                    key={post._id}
                    post={post}
                    token={token}
                    currentUserId={currentUser?._id}
                    currentUser={currentUser}
                    onFollowChange={onFollowChange}
                />
            ))}

            {error && (
                <div style={{ 
                    color: 'crimson', 
                    padding: 12, 
                    textAlign: 'center',
                    backgroundColor: '#fef2f2',
                    borderRadius: '8px',
                    margin: '8px 0'
                }}>
                    {error}
                </div>
            )}

            {loading && (
                <div style={{ 
                    padding: 12, 
                    textAlign: 'center',
                    color: '#8e8e8e'
                }}>
                    Loading recommendations...
                </div>
            )}

            {!hasMore && forYouPosts.length > 0 && (
                <div style={{ 
                    padding: 12, 
                    color: '#8e8e8e',
                    textAlign: 'center',
                    fontSize: '14px'
                }}>
                    That's all for now! Check back later for more recommendations.
                </div>
            )}

            {/* Sentinel for infinite scroll */}
            <div ref={sentinelRef} style={{ height: 1 }} />
        </div>
    )
}

export default ForYouFeed
