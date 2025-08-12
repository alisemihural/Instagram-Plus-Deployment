import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function Stories() {
    const [story, setStory] = useState('');
    const [preview, setPreview] = useState(null);
    const navigate = useNavigate();

    const handleStoryChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader()
            reader.onloadend = () => {
                setStory(reader.result);
                setPreview(reader.result);
            }
            reader.readAsDataURL(file);
        }
    }

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (story) {
            try {
                const token = localStorage.getItem('token');
                await axios.post('http://localhost:5001/stories', {
                    story
                }, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                })
                
                alert('Story created!')
                navigate('/')

            } catch (error) {
                console.error(err);
                alert(err.response?.data?.message || 'Failed to create story');
            }
        } else {
            alert("Please select a file");
            return;
        }
    }

    return (
    <div>
        <h1>Create New Stories</h1>
        <form onSubmit={handleSubmit}>
            <input
                type="file"
                accept="image/*"
                onChange={handleStoryChange}
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
            <br></br>
            <button type="submit" style={{ marginTop: '10px' }}>Submit</button>
        </form>
    </div>
    )
}

export default Stories