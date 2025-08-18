import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import './UserProfile.css'

const MyProfile = () => {
    const navigate = useNavigate()
    const [user, setUser] = useState(null)
    const [userPosts, setUserPosts] = useState([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = localStorage.getItem('token')
                
                // Fetch current user with populated followers/following
                const userRes = await axios.get('http://localhost:5000/users/profile', {
                    headers: { Authorization: `Bearer ${token}` }
                })
                setUser(userRes.data)

                // Fetch user's posts
                const postsRes = await axios.get(`${API_BASE_URL}/posts/user/${userRes.data._id}`)
                setUserPosts(postsRes.data)

            } catch (err) {
                console.error('Failed to fetch user data:', err)
                alert('Failed to load profile')
                navigate('/')
            } finally {
                setIsLoading(false)
            }
        }

        fetchData()
    }, [navigate])

    if (isLoading) {
        return (
            <div className="user-profile-loading">
                <div className="loading-spinner">Loading your profile...</div>
            </div>
        )
    }

    if (!user) {
        return (
            <div className="user-profile-error">
                <h2>Profile not found</h2>
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
                        src={user.profilePic || 'https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png'}
                        alt={`${user.username}'s profile`}
                        className="profile-picture"
                    />
                    <div className="profile-details">
                        <div className="profile-title">
                            <h1>{user.username}</h1>
                            <button
                                onClick={() => navigate('/edit-profile')}
                                className="edit-profile-button"
                            >
                                Edit Profile
                            </button>
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
                    <h3>Your Posts</h3>
                    {userPosts.length === 0 ? (
                        <div className="no-posts">
                            <p>You haven't posted anything yet</p>
                            <button 
                                onClick={() => navigate('/create')}
                                className="create-post-btn"
                                style={{
                                    marginTop: '15px',
                                    padding: '10px 20px',
                                    backgroundColor: '#007bff',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '14px'
                                }}
                            >
                                Create Your First Post
                            </button>
                        </div>
                    ) : (
                        <div className="posts-grid">
                            {userPosts.map(post => (
                                <div key={post._id} className="post-thumbnail">
                                    {post.media && post.media.length > 0 ? (
                                        post.media[0].kind === 'video' ? (
                                            <video 
                                                src={post.media[0].src} 
                                                className="post-media"
                                                muted
                                            />
                                        ) : (
                                            <img 
                                                src={post.media[0].src} 
                                                alt="Post" 
                                                className="post-media"
                                            />
                                        )
                                    ) : post.image ? (
                                        <img 
                                            src={post.image} 
                                            alt="Post" 
                                            className="post-media"
                                        />
                                    ) : (
                                        <div className="no-media">No media</div>
                                    )}
                                    <div className="post-overlay">
                                        <span>{post.caption || 'No caption'}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Show followers and following if they exist */}
                {(user.followers?.length > 0 || user.following?.length > 0) && (
                    <div className="connections-section" style={{ marginTop: '40px' }}>
                        {user.followers?.length > 0 && (
                            <div className="followers-section" style={{ marginBottom: '30px' }}>
                                <h4>Followers ({user.followers.length})</h4>
                                <div className="connections-grid" style={{ 
                                    display: 'flex', 
                                    flexWrap: 'wrap', 
                                    gap: '15px',
                                    marginTop: '15px'
                                }}>
                                    {user.followers.slice(0, 10).map(follower => (
                                        <div 
                                            key={follower._id} 
                                            className="connection-item"
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                padding: '8px 12px',
                                                backgroundColor: '#f8f9fa',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                fontSize: '14px'
                                            }}
                                            onClick={() => navigate(`/user/${follower._id}`)}
                                        >
                                            <img 
                                                src={follower.profilePic || 'https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png'}
                                                alt={follower.username}
                                                style={{
                                                    width: '24px',
                                                    height: '24px',
                                                    borderRadius: '50%',
                                                    objectFit: 'cover'
                                                }}
                                            />
                                            <span>{follower.username}</span>
                                        </div>
                                    ))}
                                    {user.followers.length > 10 && (
                                        <span style={{ fontSize: '14px', color: '#666', alignSelf: 'center' }}>
                                            +{user.followers.length - 10} more
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}

                        {user.following?.length > 0 && (
                            <div className="following-section">
                                <h4>Following ({user.following.length})</h4>
                                <div className="connections-grid" style={{ 
                                    display: 'flex', 
                                    flexWrap: 'wrap', 
                                    gap: '15px',
                                    marginTop: '15px'
                                }}>
                                    {user.following.slice(0, 10).map(following => (
                                        <div 
                                            key={following._id} 
                                            className="connection-item"
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                padding: '8px 12px',
                                                backgroundColor: '#f8f9fa',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                fontSize: '14px'
                                            }}
                                            onClick={() => navigate(`/user/${following._id}`)}
                                        >
                                            <img 
                                                src={following.profilePic || 'https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png'}
                                                alt={following.username}
                                                style={{
                                                    width: '24px',
                                                    height: '24px',
                                                    borderRadius: '50%',
                                                    objectFit: 'cover'
                                                }}
                                            />
                                            <span>{following.username}</span>
                                        </div>
                                    ))}
                                    {user.following.length > 10 && (
                                        <span style={{ fontSize: '14px', color: '#666', alignSelf: 'center' }}>
                                            +{user.following.length - 10} more
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

export default MyProfile
