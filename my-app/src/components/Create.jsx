import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { API_ENDPOINTS } from '../config/api'

const MAX_MEDIA = 5

const Spinner = () => (
    <div style={{
        width: 64,
        height: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto'
    }}>
        <svg viewBox='0 0 50 50' style={{ width: '100%', height: '100%' }} aria-label='Loading'>
            <circle cx='25' cy='25' r='20' stroke='#fff' strokeWidth='5' fill='none' opacity='0.2' />
            <path fill='none' stroke='#fff' strokeWidth='5' d='M25 5 a20 20 0 0 1 0 40'>
                <animateTransform attributeName='transform' type='rotate' from='0 25 25' to='360 25 25' dur='1s' repeatCount='indefinite' />
            </path>
        </svg>
    </div>
)

const CreatePost = () => {
    const [caption, setCaption] = useState('')
    const [media, setMedia] = useState([])
    const [status, setStatus] = useState('')
    const [current, setCurrent] = useState(0)
    const [isUploading, setIsUploading] = useState(false)

    const pasteZoneRef = useRef(null)
    const fileInputRef = useRef(null)
    const navigate = useNavigate()

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    const headers = { Authorization: `Bearer ${token}` }

    const newUploadsRef = useRef(new Set())
    const submittedRef = useRef(false)

    const addWithRoom = files => {
        const room = MAX_MEDIA - media.length
        if (room <= 0) return []
        return files.slice(0, room)
    }

    const uploadFiles = async files => {
        const fd = new FormData()
        files.forEach(f => fd.append('files', f))
        const res = await axios.post(API_ENDPOINTS.uploadMedia, fd, {
            headers: { ...headers, 'Content-Type': 'multipart/form-data' }
        })
        return res.data?.media || []
    }

    const deleteByPublicIds = async publicIds => {
        if (!publicIds?.length) return
        try {
            await axios.delete(API_ENDPOINTS.uploadMedia, {
                headers,
                data: { publicIds }
            })
        } catch (e) {
            console.error('Cloud delete failed', e)
        }
    }

    const handleFileChange = async e => {
        if (isUploading) {
            setStatus('An upload is in progress — please wait…')
            return
        }

        const files = Array.from(e.target.files || [])
        if (!files.length) return

        const list = addWithRoom(files)
        if (!list.length) {
            setStatus(`You can upload up to ${MAX_MEDIA} items`)
            return
        }

        const startIndex = media.length
        const placeholders = list.map(f => ({
            kind: f.type.startsWith('video/') ? 'video' : 'image',
            src: '',
            uploading: true,
            name: f.name || ''
        }))

        setMedia(prev => {
            const updated = [...prev, ...placeholders]
            setCurrent(updated.length - 1)
            return updated
        })

        setIsUploading(true)
        setStatus('Uploading…')

        try {
            const uploaded = await uploadFiles(list) // [{kind, src, publicId, ...}]
            uploaded.forEach(u => {
                if (u.publicId) newUploadsRef.current.add(u.publicId)
            })
            setMedia(prev => {
                const copy = [...prev]
                for (let i = 0; i < uploaded.length; i++) {
                    const at = startIndex + i
                    if (copy[at]) copy[at] = { ...uploaded[i], uploading: false, name: list[i]?.name || '' }
                }
                return copy
            })
            setStatus('Ready to post')
        } catch (err) {
            console.error(err)
            setMedia(prev => prev.filter((_, i) => i < startIndex || i >= startIndex + placeholders.length))
            setCurrent(prev => Math.max(0, Math.min(prev, startIndex - 1)))
            setStatus('Upload failed')
        } finally {
            setIsUploading(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    const handlePaste = async e => {
        if (isUploading) {
            setStatus('An upload is in progress — please wait before pasting')
            return
        }

        const filesFromClipboard = []
        const dtFiles = Array.from(e.clipboardData?.files || [])
        for (const f of dtFiles) {
            if (f.type.startsWith('image/') || f.type.startsWith('video/')) {
                filesFromClipboard.push(f)
            }
        }

        if (!filesFromClipboard.length) return
        e.preventDefault()

        const list = addWithRoom(filesFromClipboard)
        if (!list.length) {
            setStatus(`You can upload up to ${MAX_MEDIA} items`)
            return
        }

        const startIndex = media.length
        const placeholders = list.map(f => ({
            kind: f.type.startsWith('video/') ? 'video' : 'image',
            src: '',
            uploading: true,
            name: f.name || ''
        }))

        setMedia(prev => {
            const updated = [...prev, ...placeholders]
            setCurrent(updated.length - 1)
            return updated
        })

        setIsUploading(true)
        setStatus('Uploading…')

        try {
            const uploaded = await uploadFiles(list)
            uploaded.forEach(u => {
                if (u.publicId) newUploadsRef.current.add(u.publicId)
            })
            setMedia(prev => {
                const copy = [...prev]
                for (let i = 0; i < uploaded.length; i++) {
                    const at = startIndex + i
                    if (copy[at]) copy[at] = { ...uploaded[i], uploading: false, name: list[i]?.name || '' }
                }
                return copy
            })
            setStatus('Ready to post')
        } catch (err) {
            console.error(err)
            setMedia(prev => prev.filter((_, i) => i < startIndex || i >= startIndex + placeholders.length))
            setCurrent(prev => Math.max(0, Math.min(prev, startIndex - 1)))
            setStatus('Upload failed')
        } finally {
            setIsUploading(false)
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
    }, [isUploading, media.length])

    const removeAt = async idx => {
        const item = media[idx]
        if (item?.uploading) return

        if (item?.publicId) {
            if (newUploadsRef.current.has(item.publicId)) {
                await deleteByPublicIds([item.publicId])
                newUploadsRef.current.delete(item.publicId)
            }
        }

        const updated = media.filter((_, i) => i !== idx)
        setMedia(updated)
        if (updated.length === 0) setCurrent(0)
        else setCurrent(Math.min(idx, updated.length - 1))
    }

    const handleSubmit = async e => {
        e.preventDefault()
        if (isUploading) {
            setStatus('Please wait for uploads to finish')
            return
        }
        if (media.length === 0) {
            setStatus('Add at least one image or video')
            return
        }

        try {
            await axios.post(API_ENDPOINTS.posts, { caption, media }, { headers })

            submittedRef.current = true
            newUploadsRef.current.clear()

            alert('Post created')
            navigate('/')
        } catch (err) {
            console.error(err)
            setStatus(err.response?.data?.message || 'Failed to create post')
        }
    }

    useEffect(() => {
        return () => {
            if (!submittedRef.current) {
                const ids = Array.from(newUploadsRef.current)
                if (ids.length) {
                    axios.delete(API_ENDPOINTS.uploadMedia, {
                        headers,
                        data: { publicIds: ids }
                    }).catch(() => { })
                    newUploadsRef.current.clear()
                }
            }
        }
    }, [])

    const cur = media[current]

    return (
        <div style={{ maxWidth: 560, margin: '0 auto', padding: 20 }}>
            <h2>Create New Post</h2>

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
                aria-label={isUploading ? 'Uploading, paste disabled' : 'Paste media here'}
            >
                {isUploading
                    ? 'Uploading… please wait'
                    : 'Press Ctrl/Cmd+V to paste an image/video, or use the file selector below'}
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            {current > 0 && (
                                <button type='button' onClick={() => setCurrent(c => Math.max(0, c - 1))}>
                                    ‹
                                </button>
                            )}
                            <div style={{ flex: 1, textAlign: 'center' }}>{current + 1} / {media.length}</div>
                            {current < media.length - 1 && (
                                <button type='button' onClick={() => setCurrent(c => Math.min(media.length - 1, c + 1))}>
                                    ›
                                </button>
                            )}
                            <button type='button' onClick={() => removeAt(current)} disabled={media[current]?.uploading}>
                                Remove
                            </button>
                        </div>

                        <div style={{ background: '#000', borderRadius: 8, height: 360, overflow: 'hidden' }}>
                            {cur?.uploading ? (
                                <div style={{ width: '100%', height: 360, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Spinner />
                                </div>
                            ) : cur?.kind === 'video' ? (
                                <video src={cur.src} controls style={{ display: 'block', width: '100%', height: 360, objectFit: 'contain' }} />
                            ) : (
                                <img src={cur?.src} alt='preview' style={{ display: 'block', width: '100%', height: 360, objectFit: 'contain' }} />
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginTop: 8 }}>
                            {media.map((m, i) => (
                                <div
                                    key={m.publicId || `ph-${i}`}
                                    onClick={() => setCurrent(i)}
                                    style={{
                                        border: i === current ? '2px solid #333' : '1px solid #ddd',
                                        borderRadius: 6,
                                        padding: 2,
                                        cursor: 'pointer',
                                        minWidth: 64,
                                        opacity: m.uploading ? 0.6 : 1
                                    }}
                                    title={m.kind === 'video' ? (m.name || 'video') : undefined}
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
                                                padding: 6
                                            }}>
                                                <span
                                                    title={m.name || 'video'}
                                                    style={{
                                                        display: 'block',
                                                        maxWidth: '100%',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                        fontSize: 11,
                                                        lineHeight: 1.1,
                                                        textAlign: 'center'
                                                    }}
                                                >
                                                    {m.uploading ? 'Uploading…' : (m.name || 'video')}
                                                </span>
                                            </div>
                                        )
                                        : (
                                            m.uploading
                                                ? <div style={{
                                                    width: 64,
                                                    height: 64,
                                                    borderRadius: 4,
                                                    background: '#000',
                                                    color: '#fff',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: 12
                                                }}>Uploading…</div>
                                                : <img src={m.src} alt={`thumb-${i}`} style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 4 }} />
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
