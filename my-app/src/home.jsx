import { useEffect, useState } from 'react'
import axios from 'axios'
import './home.css'

const Home = () => {
    const [posts, setPosts] = useState([])

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

    return (
        <div className="feed-container">
            {posts.length === 0 ? (
                <p>No posts yet</p>
            ) : (
                posts.map(post => (
                    <div className="post" key={post._id}>
                        <div className="post-header" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            <img
                                src={post.author?.profilePic || 'https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png'}
                                alt="Profile"
                                style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    marginRight: '10px',
                                    objectFit: 'cover'
                                }}
                            />
                            <strong>{post.author?.username}</strong>
                        </div>


                        <img src={post.image} alt="Post" className="post-image" />
                        <p className="post-caption">{post.caption}</p>
                    </div>
                ))
            )}
        </div>
    )
}

export default Home
