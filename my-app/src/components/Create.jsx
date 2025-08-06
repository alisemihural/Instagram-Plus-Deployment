import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const CreatePost = () => {
    const [image, setImage] = useState(null)
    const [caption, setCaption] = useState('')
    const [preview, setPreview] = useState(null)
    const navigate = useNavigate()

    const handleImageChange = (e) => {
        const file = e.target.files[0]
        if (file) {
            const reader = new FileReader()
            reader.onloadend = () => {
                setImage(reader.result) // base64 string
                setPreview(reader.result)
            }
            reader.readAsDataURL(file)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!image) {
            alert('Please select an image')
            return
        }

        try {
            const token = localStorage.getItem('token')

            await axios.post('http://localhost:5000/posts', {
                image,
                caption
            }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            })

            alert('Post created!')
            navigate('/')
        } catch (err) {
            console.error(err)
            alert(err.response?.data?.message || 'Failed to create post')
        }
    }

    return (
        <div style={{ maxWidth: '500px', margin: '0 auto', padding: '20px' }}>
            <h2>Create New Post</h2>
            <form onSubmit={handleSubmit}>
                <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    required
                />
                {preview && (
                    <div style={{ marginTop: '10px', maxHeight: '300px', overflow: 'hidden' }}>
                        <img
                            src={preview}
                            alt="Preview"
                            style={{
                                maxWidth: '100%',
                                maxHeight: '300px',
                                objectFit: 'contain',
                                display: 'block',
                                margin: '0 auto',
                                borderRadius: '8px'
                            }}
                        />
                    </div>
                )}

                <textarea
                    placeholder="Write a caption..."
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    rows="3"
                    style={{ width: '100%', marginTop: '10px' }}
                />
                <button type="submit" style={{ marginTop: '10px' }}>Post</button>
            </form>
        </div>
    )
}

export default CreatePost
