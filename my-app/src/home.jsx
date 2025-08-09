import { useEffect, useState } from 'react'
import axios from 'axios'
import './home.css'

const PostCarousel = ({ items, legacyImage, author, createdAt, caption }) => {
    const [index, setIndex] = useState(0)

    const media = Array.isArray(items) && items.length > 0
        ? items
        : legacyImage
            ? [{ kind: 'image', src: legacyImage }]
            : []

    if (media.length === 0) return null

    const cur = media[index]
    const type = cur.kind || cur.type || 'image'

    const handlePrev = () => {
        if (index > 0) setIndex(index - 1)
    }

    const handleNext = () => {
        if (index < media.length - 1) setIndex(index + 1)
    }

    return (
        <div style={{
            backgroundColor: '#fff',
            border: '1px solid #e6e6e6',
            borderRadius: '10px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            marginBottom: '20px',
            maxWidth: '600px',
            marginLeft: 'auto',
            marginRight: 'auto',
            fontFamily: 'Arial, sans-serif',
            overflow: 'hidden'
        }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px'
            }}>
                <img
                    src={author?.profilePic || 'https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png'}
                    alt='Profile'
                    style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '1px solid #ddd'
                    }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'start' }}>
                    <strong style={{ fontSize: '14px' }}>{author?.username || 'Unknown'}</strong>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                        {new Date(createdAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                    </div>
                </div>
            </div>

            <div style={{
                position: 'relative',
                width: '100%',
                height: '500px',
                backgroundColor: '#000',
                overflow: 'hidden'
            }}>
                {type === 'video' ? (
                    <video
                        src={cur.src}
                        controls
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                ) : (
                    <img
                        src={cur.src}
                        alt={`Slide ${index}`}
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                )}

                {index > 0 && (
                    <button
                        onClick={handlePrev}
                        style={{
                            position: 'absolute',
                            top: '50%',
                            left: '10px',
                            transform: 'translateY(-50%)',
                            background: 'rgba(0,0,0,0.3)',
                            border: 'none',
                            color: 'white',
                            fontSize: '20px',
                            padding: '8px',
                            cursor: 'pointer',
                            borderRadius: '50%',
                            zIndex: 2
                        }}
                    >
                        ‹
                    </button>
                )}

                {index < media.length - 1 && (
                    <button
                        onClick={handleNext}
                        style={{
                            position: 'absolute',
                            top: '50%',
                            right: '10px',
                            transform: 'translateY(-50%)',
                            background: 'rgba(0,0,0,0.3)',
                            border: 'none',
                            color: 'white',
                            fontSize: '20px',
                            padding: '8px',
                            cursor: 'pointer',
                            borderRadius: '50%',
                            zIndex: 2
                        }}
                    >
                        ›
                    </button>
                )}

                {media.length > 1 && (
                    <div style={{
                        position: 'absolute',
                        bottom: '10px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        display: 'flex',
                        gap: '6px'
                    }}>
                        {media.map((_, i) => (
                            <span
                                key={i}
                                style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    backgroundColor: i === index ? '#fff' : 'rgba(255,255,255,0.5)',
                                    transition: 'background-color 0.2s'
                                }}
                            />
                        ))}
                    </div>
                )}
            </div>

            <div style={{
                borderTop: '1px solid #e6e6e6',
                padding: '10px',
                fontSize: '14px',
                textAlign: 'left'
            }}>
                <strong>{author?.username || 'Unknown'}</strong>: {caption}
            </div>
        </div>
    )
}

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
        <div className='feed-container'>
            {posts.length === 0 ? (
                <p>No posts yet</p>
            ) : (
                posts.map(post => (
                    <PostCarousel
                        key={post._id}
                        items={post.media}
                        legacyImage={post.image}
                        author={post.author}
                        createdAt={post.createdAt}
                        caption={post.caption}
                    />
                ))
            )}
        </div>
    )
}

export default Home