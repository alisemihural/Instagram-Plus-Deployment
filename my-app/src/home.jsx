import { useEffect, useState } from 'react'
import axios from 'axios'
import './home.css'
import PostCard from './components/PostCard'
import Modal from 'react-modal'

const Home = () => {
    const [posts, setPosts] = useState([])
    const [currentUser, setCurrentUser] = useState(null)
    const [stories, setStories] = useState({})
    const [storiesProfile, setStoriesProfile] = useState([])
    const [storiesLoaded, setStoriesLoaded] = useState(false)
    const [showStorySlides, setShowStorySlides] = useState(false)
    const [currentStory, setCurrentStory] = useState(0)
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

    const openStorySlides = (e) => {
        e.preventDefault();
        setShowStorySlides(true);
    }

    const closeStorySlides = () => setShowStorySlides(false);

    const previousStory = () => {
        setCurrentStory(currentStory === 0 ? Object.keys(stories).length - 1 : currentStory - 1);
    }

    const nextStory = () => {
        setCurrentStory(currentStory === 0 ? Object.keys(stories).length + 1 : currentStory + 1);
    }

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
        const fetchStories = async () => {
            try {
                await axios.get('http://localhost:5000/stories', {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }).then((response) => {
                    setStories(response.data);
                    setStoriesLoaded(true);
                })
            } catch (err) {
                console.error('Failed to fetch stories:', err)
            }
        }
        fetchStories()
    }, [])

    useEffect(() => {
        const fetchStoriesProfile = async () => {
            try {
                await axios.get('http://localhost:5000/stories/users', {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }).then((response) => {
                    setStoriesProfile(response.data)
                });
            } catch (err) {
                console.error('Failed to fetch stories:', err)
            }
        }
        if (!storiesLoaded) {
            return;
        }
        fetchStoriesProfile()
    }, [storiesLoaded])

    useEffect(() => {
        if (storiesLoaded) {

        }
    }, [stories])

    return (
        <div className='feed-container'>
            <Modal isOpen={showStorySlides} onRequestClose={closeStorySlides}>

            </Modal>
            {storiesProfile.length === 0 ? (
                <p>No stories yet</p>
            ) : (
                <div style={{ display: 'flex', gap: 10, padding: '10px 6px', overflowX: 'auto', marginBottom: 16 }}>
                    {storiesProfile.map(s => (
                        <div key={s._id}>
                            <a onClick={openStorySlides}>
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
