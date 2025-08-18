import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const MAX_MEDIA = 5

const Spinner = () => (
    <div style={{
        width: '64px',
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto'
    }}>
        <svg
            viewBox='0 0 50 50'
            style={{ width: '100%', height: '100%' }}
            aria-label='Loading'
        >
            <circle
                cx='25'
                cy='25'
                r='20'
                stroke='#fff'
                strokeWidth='5'
                fill='none'
                strokeLinecap='round'
                opacity='0.2'
            />
            <path fill='none' stroke='#fff' strokeWidth='5' d='M25 5 a20 20 0 0 1 0 40'>
                <animateTransform
                    attributeName='transform'
                    type='rotate'
                    from='0 25 25'
                    to='360 25 25'
                    dur='1s'
                    repeatCount='indefinite'
                />
            </path>
        </svg>
    </div>
)

const CreatePost = () => {
    const [caption, setCaption] = useState('')
    const [media, setMedia] = useState([]) // [{kind:'image'|'video', src:string, uploading?:boolean}]
    const [status, setStatus] = useState('')
    const [current, setCurrent] = useState(0)
    const [isUploading, setIsUploading] = useState(false) // disables paste/file while a video uploads
    const pasteZoneRef = useRef(null)
    const fileInputRef = useRef(null)
    const navigate = useNavigate()

    const fileToDataUrl = file =>
        new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result)
            reader.onerror = reject
            reader.readAsDataURL(file)
        })

    const addWithRoom = items => {
        const room = MAX_MEDIA - media.length
        if (room <= 0) return []
        return items.slice(0, room)
    }

    const uploadVideo = async file => {
        const token = localStorage.getItem('token')
        const formData = new FormData()
        formData.append('file', file)
        const up = await axios.post('https://instaplus.up.railway.app/upload/video', formData, {
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
        })
        return up.data.url
    }

    const handleFileChange = async e => {
        if (isUploading) {
            setStatus('A video is processing — please wait…')
            return
        }
        const files = Array.from(e.target.files || [])
        if (!files.length) return
        const list = addWithRoom(files)
        if (!list.length) {
            setStatus(`You can upload up to ${MAX_MEDIA} items`)
            return
        }

        setStatus('Processing files…')

        // process sequentially to keep state simple
        for (const file of list) {
            if (file.type.startsWith('image/')) {
                const dataUrl = await fileToDataUrl(file)
                const updated = [...media, { kind: 'image', src: dataUrl }]
                setMedia(updated)
                setCurrent(updated.length - 1)
            } else if (file.type.startsWith('video/')) {
                // add placeholder slide marked as uploading
                const placeholderIndex = media.length
                const updated = [...media, { kind: 'video', src: '', uploading: true }]
                setMedia(updated)
                setCurrent(updated.length - 1)
                setIsUploading(true)

                try {
                    const url = await uploadVideo(file)
                    setMedia(prev => {
                        const copy = [...prev]
                        // if user removed it meanwhile, guard
                        if (copy[placeholderIndex]) {
                            copy[placeholderIndex] = { kind: 'video', src: url, uploading: false }
                        }
                        return copy
                    })
                } catch (err) {
                    console.error(err)
                    setStatus('Video upload failed')
                    // remove failed placeholder
                    setMedia(prev => prev.filter((_, i) => i !== placeholderIndex))
                    setCurrent(prev => Math.max(0, Math.min(prev, media.length - 2)))
                } finally {
                    setIsUploading(false)
                }
            }
        }

        setStatus('Ready to post')
        // clear file input so same file can be re-selected if needed
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const handlePaste = async e => {
        if (isUploading) {
            // while a video is processing, block paste and show a message
            setStatus('A video is processing — please wait before pasting another image')
            return
        }

        const file = e.clipboardData?.files?.[0]
        if (file && file.type.startsWith('image/')) {
            e.preventDefault()
            if (media.length >= MAX_MEDIA) {
                setStatus(`You can upload up to ${MAX_MEDIA} items`)
                return
            }
            setStatus('Loading pasted image…')
            const dataUrl = await fileToDataUrl(file)
            const updated = [...media, { kind: 'image', src: dataUrl }]
            setMedia(updated)
            setCurrent(updated.length - 1)
            setStatus('Ready to post')
            return
        }

        const items = e.clipboardData?.items || []
        for (let i = 0; i < items.length; i++) {
            const it = items[i]
            if (it.kind === 'file' && it.type.startsWith('image/')) {
                e.preventDefault()
                if (media.length >= MAX_MEDIA) {
                    setStatus(`You can upload up to ${MAX_MEDIA} items`)
                    return
                }
                setStatus('Loading pasted image…')
                const blob = it.getAsFile()
                if (!blob) continue
                const dataUrl = await fileToDataUrl(blob)
                const updated = [...media, { kind: 'image', src: dataUrl }]
                setMedia(updated)
                setCurrent(updated.length - 1)
                setStatus('Ready to post')
                return
            }
        }
    }

    useEffect(() => {
        const onWindowPaste = async e => {
            const tag = document.activeElement?.tagName
            if (tag === 'INPUT' || tag === 'TEXTAREA') return
            await handlePaste(e)
        }
        window.addEventListener('paste', onWindowPaste)
        return () => window.removeEventListener('paste', onWindowPaste)
    }, [media, isUploading])

    const removeAt = idx => {
        const updated = media.filter((_, i) => i !== idx)
        setMedia(updated)
        if (updated.length === 0) setCurrent(0)
        else setCurrent(Math.min(idx, updated.length - 1))
    }

    const handleSubmit = async e => {
        e.preventDefault()
        if (isUploading) {
            setStatus('Please wait for the video to finish processing')
            return
        }
        if (media.length === 0) {
            setStatus('Add at least one image or video')
            return
        }
        try {
            const token = localStorage.getItem('token')
            await axios.post(
                'https://instaplus.up.railway.app/posts',
                { caption, media },
                { headers: { Authorization: `Bearer ${token}` } }
            )
            alert('Post created')
            navigate('/')
        } catch (err) {
            console.error(err)
            setStatus(err.response?.data?.message || 'Failed to create post')
        }
    }

    const cur = media[current]

    return (
        <div style={{ maxWidth: 560, margin: '0 auto', padding: 20 }}>
            <h2>Create New Post</h2>

            {/* Paste zone */}
            <div
                ref={pasteZoneRef}
                onPaste={handlePaste}
                tabIndex={isUploading ? -1 : 0}
                style={{
                    border: '2px dashed #ccc',
                    borderRadius: 8,
                    padding: 16,
                    marginBottom: 12,
                    outline: 'none',
                    opacity: isUploading ? 0.6 : 1,
                    pointerEvents: isUploading ? 'none' : 'auto',
                    userSelect: 'none'
                }}
                role='button'
                aria-label={isUploading ? 'Uploading, paste disabled' : 'Paste image here'}
            >
                {isUploading
                    ? 'Uploading video… please wait'
                    : 'Press Ctrl/Cmd+V to paste an image, or use the file selector below'}
            </div>

            <form onSubmit={handleSubmit}>
                <input
                    ref={fileInputRef}
                    type='file'
                    accept='image/*,video/*'
                    multiple
                    onChange={handleFileChange}
                    disabled={isUploading}
                    style={{ display: 'block', marginBottom: 10, opacity: isUploading ? 0.6 : 1 }}
                />

                {media.length > 0 && (
                    <div style={{ marginTop: 10 }}>
                        {/* Controls */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <button type='button' onClick={() => setCurrent(c => Math.max(0, c - 1))} disabled={current === 0}>
                                ‹
                            </button>
                            <div style={{ flex: 1, textAlign: 'center' }}>{current + 1} / {media.length}</div>
                            <button
                                type='button'
                                onClick={() => setCurrent(c => Math.min(media.length - 1, c + 1))}
                                disabled={current === media.length - 1}
                            >
                                ›
                            </button>
                            <button type='button' onClick={() => removeAt(current)} disabled={media[current]?.uploading}>
                                Remove
                            </button>
                        </div>

                        {/* Preview area */}
                        <div style={{ background: '#000', borderRadius: 8, maxHeight: 360, overflow: 'hidden' }}>
                            {cur?.uploading ? (
                                <div style={{
                                    width: '100%',
                                    height: 360,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <Spinner />
                                </div>
                            ) : cur?.kind === 'video' ? (
                                <video
                                    src={cur.src}
                                    controls
                                    style={{ display: 'block', width: '100%', height: 360, objectFit: 'contain' }}
                                />
                            ) : (
                                <img
                                    src={cur?.src}
                                    alt='preview'
                                    style={{ display: 'block', width: '100%', height: 360, objectFit: 'contain' }}
                                />
                            )}
                        </div>

                        {/* Thumbnails */}
                        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginTop: 8 }}>
                            {media.map((m, i) => (
                                <div
                                    key={i}
                                    onClick={() => setCurrent(i)}
                                    style={{
                                        border: i === current ? '2px solid #333' : '1px solid #ddd',
                                        borderRadius: 6,
                                        padding: 2,
                                        cursor: 'pointer',
                                        minWidth: 64,
                                        opacity: m.uploading ? 0.6 : 1
                                    }}
                                >
                                    {m.kind === 'video'
                                        ? (
                                            <div style={{
                                                width: 64,
                                                height: 64,
                                                borderRadius: 4,
                                                background: '#000',
                                                color: '#fff',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: 12
                                            }}>
                                                {m.uploading ? 'Uploading…' : 'video'}
                                            </div>
                                        )
                                        : (
                                            <img
                                                src={m.src}
                                                alt={`thumb-${i}`}
                                                style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 4 }}
                                            />
                                        )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <textarea
                    placeholder='Write a caption…'
                    value={caption}
                    onChange={e => setCaption(e.target.value)}
                    rows={3}
                    style={{ width: '100%', marginTop: 10 }}
                />

                <button type='submit' style={{ marginTop: 10 }} disabled={isUploading}>
                    {isUploading ? 'Processing…' : 'Post'}
                </button>
            </form>

            {status && <div style={{ marginTop: 10, fontSize: 12, color: '#666' }}>{status}</div>}
        </div>
    )
}

export default CreatePost
