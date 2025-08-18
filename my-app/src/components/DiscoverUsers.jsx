import { useState, useEffect } from 'react'
import axios from 'axios'
import './DiscoverUsers.css'

const DiscoverUsers = () => {
    const [users, setUsers] = useState([])
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState([])
    const [currentUser, setCurrentUser] = useState(null)
    const [isSearching, setIsSearching] = useState(false)

    useEffect(() => {
        const fetchCurrentUser = async () => {
            try {
                const token = localStorage.getItem('token')
                if (token) {
                    const res = await axios.get('https://instaplus.up.railway.app/users/profile', {
                        headers: { Authorization: `Bearer ${token}` }
                    })
                    setCurrentUser(res.data)
                }
            } catch (err) {
                console.error('Failed to fetch current user:', err)
            }
        }

        const fetchUsers = async () => {
            try {
                const res = await axios.get('https://instaplus.up.railway.app/users')
                setUsers(res.data)
            } catch (err) {
                console.error('Failed to fetch users:', err)
            }
        }

        fetchCurrentUser()
        fetchUsers()
    }, [])

    useEffect(() => {
        const searchUsers = async () => {
            if (searchQuery.trim() === '') {
                setSearchResults([])
                setIsSearching(false)
                return
            }

            setIsSearching(true)
            try {
                const res = await axios.get(`https://instaplus.up.railway.app/users/search/${encodeURIComponent(searchQuery)}`)
                setSearchResults(res.data)
            } catch (err) {
                console.error('Failed to search users:', err)
                setSearchResults([])
            } finally {
                setIsSearching(false)
            }
        }

        const debounceTimer = setTimeout(searchUsers, 300)
        return () => clearTimeout(debounceTimer)
    }, [searchQuery])

    const handleFollowToggle = async (userId) => {
        try {
            const token = localStorage.getItem('token')
            await axios.patch(`https://instaplus.up.railway.app/users/${userId}/follow`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            })

            // Refresh current user data
            const userRes = await axios.get('https://instaplus.up.railway.app/users/profile', {
                headers: { Authorization: `Bearer ${token}` }
            })
            setCurrentUser(userRes.data)

            // Update the users list
            const usersRes = await axios.get('https://instaplus.up.railway.app/users')
            setUsers(usersRes.data)

            // Update search results if searching
            if (searchQuery.trim() !== '') {
                const searchRes = await axios.get(`https://instaplus.up.railway.app/users/search/${encodeURIComponent(searchQuery)}`)
                setSearchResults(searchRes.data)
            }
        } catch (err) {
            console.error('Failed to toggle follow:', err)
            alert('Failed to update follow status')
        }
    }

    const isUserFollowed = (userId) => {
        if (!currentUser || !currentUser.following) return false
        return currentUser.following.some(user => 
            user._id === userId || user === userId
        )
    }

    const UserCard = ({ user }) => {
        const isFollowing = isUserFollowed(user._id)
        const isOwnProfile = currentUser && user._id === currentUser._id

        return (
            <div className="user-card">
                <div className="user-info">
                    <img
                        src={user.profilePic || 'https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png'}
                        alt={`${user.username}'s profile`}
                        className="user-avatar"
                    />
                    <div className="user-details">
                        <h3>{user.username}</h3>
                        <p className="user-stats">
                            {user.followers?.length || 0} followers • {user.following?.length || 0} following
                        </p>
                    </div>
                </div>
                {!isOwnProfile && (
                    <button
                        onClick={() => handleFollowToggle(user._id)}
                        className={`follow-btn ${isFollowing ? 'following' : 'not-following'}`}
                    >
                        {isFollowing ? 'Unfollow' : 'Follow'}
                    </button>
                )}
            </div>
        )
    }

    const displayUsers = searchQuery.trim() !== '' ? searchResults : users.filter(user => 
        currentUser ? user._id !== currentUser._id : true
    )

    return (
        <div className="discover-users">
            <div className="discover-header">
                <h2>Discover People</h2>
                <div className="search-container">
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="search-input"
                    />
                    {isSearching && <div className="search-loading">Searching...</div>}
                </div>
            </div>

            <div className="users-list">
                {displayUsers.length === 0 ? (
                    <p className="no-users">
                        {searchQuery.trim() !== '' ? 'No users found' : 'No users to discover'}
                    </p>
                ) : (
                    displayUsers.map(user => (
                        <UserCard key={user._id} user={user} />
                    ))
                )}
            </div>
        </div>
    )
}

export default DiscoverUsers
