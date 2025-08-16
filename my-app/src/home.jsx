import { useEffect, useState } from 'react'
import axios from 'axios'
import PostCard from './components/PostCard.jsx'

const Home = () => {
    const [posts, setPosts] = useState([])
    const [user, setUser] = useState(null)
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

    useEffect(() => {
        const load = async () => {
            try {
                if (token) {
                    const me = await axios.get('http://localhost:5000/users/profile', {
                        headers: { Authorization: `Bearer ${token}` }
                    })
                    setUser(me.data)
                }
                const res = await axios.get('http://localhost:5000/posts')
                setPosts(res.data)
            } catch (err) {
                console.error('Failed to load home:', err)
            }
        }
        load()
    }, [])

    return (
        <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
            <div style={{ width: 'min(700px, 96vw)' }}>
                {posts.map(p => (
                    <PostCard
                        key={p._id}
                        post={p}
                        token={token}
                        currentUserId={user?._id}
                    />
                ))}
            </div>
        </div>
    )
}

export default Home
