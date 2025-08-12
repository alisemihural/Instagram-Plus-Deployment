import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import './UserProfile.css'

const UserProfile = () => {
    const { userId } = useParams()
    const navigate = useNavigate()
    const [user, setUser] = useState(null)
    const [currentUser, setCurrentUser] = useState(null)
    const [userPosts, setUserPosts] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [isFollowLoading, setIsFollowLoading] = useState(false)

    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = localStorage.getItem('token')
                
                // Fetch current user
                const currentUserRes = await axios.get('http://localhost:5001/users/profile', {
                    headers: { Authorization: `Bearer ${token}` }
                })
                setCurrentUser(currentUserRes.data)

                // Fetch target user
                const userRes = await axios.get(`http://localhost:5001/users/${userId}`)
                setUser(userRes.data)

                // Fetch user's posts
                const postsRes = await axios.get(`http://localhost:5001/posts/user/${userId}`)
                setUserPosts(postsRes.data)

            } catch (err) {
                console.error('Failed to fetch user data:', err)
                alert('User not found')
                navigate('/')
            } finally {
                setIsLoading(false)
            }
        }

        if (userId) {
            fetchData()
        }
    }, [userId, navigate])

    const handleFollowToggle = async () => {
        if (!user || isFollowLoading) return
        
        setIsFollowLoading(true)
        try {
            const token = localStorage.getItem('token')
            await axios.patch(`http://localhost:5001/users/${user._id}/follow`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            })

            // Refresh user data
            const userRes = await axios.get(`http://localhost:5001/users/${userId}`)
            setUser(userRes.data)

            // Refresh current user data
            const currentUserRes = await axios.get('http://localhost:5001/users/profile', {
                headers: { Authorization: `Bearer ${token}` }
            })
            setCurrentUser(currentUserRes.data)

        } catch (err) {
            console.error('Failed to toggle follow:', err)
            alert('Failed to update follow status')
        } finally {
            setIsFollowLoading(false)
        }
    }

    const isFollowing = currentUser && user && currentUser.following?.some(followedUser => 
        followedUser._id === user._id || followedUser === user._id
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
                        src={user.profilePic || 'https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png'}
                        alt={`${user.username}'s profile`}
                        className="profile-picture"
                    />
                    <div className="profile-details">
                        <div className="profile-title">
                            <h1>{user.username}</h1>
                            {!isOwnProfile && (
                                <button
                                    onClick={handleFollowToggle}
                                    disabled={isFollowLoading}
                                    className={`follow-button ${isFollowing ? 'following' : 'not-following'}`}
                                >
                                    {isFollowLoading ? 'Loading...' : (isFollowing ? 'Unfollow' : 'Follow')}
                                </button>
                            )}
                            {isOwnProfile && (
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
                            <p>{isOwnProfile ? "You haven't posted anything yet" : `${user.username} hasn't posted anything yet`}</p>
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
            </div>
        </div>
    )
}

export default UserProfile
