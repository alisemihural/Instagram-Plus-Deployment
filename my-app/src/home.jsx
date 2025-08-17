import { useEffect, useState } from 'react'
import axios from 'axios'
import './home.css'
import PostCard from './components/PostCard'

const Home = () => {
    const [posts, setPosts] = useState([])
    const [currentUser, setCurrentUser] = useState(null)
    const [stories, setStories] = useState({})
    const [storiesProfile, setStoriesProfile] = useState([])
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

    const refreshUser = async () => {
        try {
            if (!token) return
            const res = await axios.get('http://localhost:5000/users/profile', {
                headers: { Authorization: `Bearer ${token}` }
            })
            setCurrentUser(res.data)
        } catch (err) {
            console.error('Failed to refresh user data:', err)
        }
    }

    useEffect(() => { refreshUser() }, [])

    useEffect(() => {
        const fetchFeed = async () => {
            try {
                const res = await axios.get('http://localhost:5000/posts')
                setPosts(res.data)
            } catch (err) {
                console.error('Failed to fetch feed:', err)
            }
        }
        fetchFeed()

    }, [])

    useEffect(() => {
        const fetchStoriesProfile = async () => {
            try {
                const res = await axios.get('http://localhost:5000/stories/users', {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                })
                setStoriesProfile(res.data || [])
            } catch (err) {
                console.error('Failed to fetch stories:', err)
            }
        }
        fetchStoriesProfile()
    }, [])

    useEffect(() => {
        const fetchStories = async () => {
            try {
                const res = await axios.get('http://localhost:5000/stories', {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                setStories(res.data || {});
            } catch (err) {
                console.error('Failed to fetch stories:', err)
            }
        }
        fetchStories()
    }, [])

    return (
        <div className='feed-container'>
            {storiesProfile.length === 0 ? (
                <p>No stories yet</p>
            ) : (
                <div style={{ display: 'flex', gap: 10, padding: '10px 6px', overflowX: 'auto', marginBottom: 16 }}>
                    {storiesProfile.map(s => (
                        <div className='story' key={s._id} style={{ flex: '0 0 auto' }}>
                            <img
                                src={s.profilePic}
                                alt='Story'
                                className='story-image'
                                style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '2px solid #e1306c' }}
                            />
                            <p>{s.username}</p>
                        </div>
                    ))}
                </div>
            )}

            {posts.length === 0 ? (
                <p>No posts yet</p>
            ) : (
                posts.map(p => (
                    <PostCard
                        key={p._id}
                        post={p}
                        token={token}
                        currentUserId={currentUser?._id}
                        currentUser={currentUser}
                        onFollowChange={refreshUser}
                    />
                ))
            )}
        </div>
    )
}

export default Home
