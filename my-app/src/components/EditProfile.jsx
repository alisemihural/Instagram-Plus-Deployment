import { useState, useEffect } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

const EditProfile = () => {
    const [username, setUsername] = useState('')
    const [profilePic, setProfilePic] = useState('')
    const [preview, setPreview] = useState('')
    const navigate = useNavigate()

    const placeholder = 'https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png'

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const token = localStorage.getItem('token')
                const res = await axios.get('http://localhost:5000/users/profile', {
                    headers: { Authorization: `Bearer ${token}` }
                })

                setUsername(res.data.username)
                setProfilePic(res.data.profilePic)
                setPreview(res.data.profilePic || '')
            } catch (err) {
                console.error('Failed to load profile:', err)
            }
        }

        fetchProfile()
    }, [])

    const handleImageChange = (e) => {
        const file = e.target.files[0]
        if (file) {
            const reader = new FileReader()
            reader.onloadend = () => {
                setProfilePic(reader.result)
                setPreview(reader.result)
            }
            reader.readAsDataURL(file)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            const token = localStorage.getItem('token')
            await axios.patch('https://instaplus.up.railway.app/users/editProfile', {
                username,
                profilePic
            }, {
                headers: { Authorization: `Bearer ${token}` }
            })

            alert('Profile updated')
            navigate('/')
        } catch (err) {
            alert('Update failed')
        }
    }

    return (
        <div style={{ maxWidth: '500px', margin: '0 auto', padding: '20px' }}>
            <h2>Edit Profile</h2>
            <form onSubmit={handleSubmit}>
                <img
                    src={preview || placeholder}
                    alt="Profile Preview"
                    style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', marginBottom: '10px' }}
                />

                <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                />

                <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Username"
                    required
                    style={{ display: 'block', marginTop: '10px', width: '100%' }}
                />

                <button type="submit" style={{ marginTop: '10px' }}>Save</button>
            </form>
        </div>
    )
}

export default EditProfile
