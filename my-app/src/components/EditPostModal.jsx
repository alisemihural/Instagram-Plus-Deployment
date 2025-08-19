import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'

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

const Backdrop = ({ children, onClose, disabled }) => {
    useEffect(() => {
        const onKey = e => {
            if (e.key === 'Escape' && !disabled) onClose()
        }
        window.addEventListener('keydown', onKey)
        const original = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
            window.removeEventListener('keydown', onKey)
            document.body.style.overflow = original
        }
    }, [onClose, disabled])

    return (
        <motion.div
            onClick={() => !disabled && onClose()}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                padding: 16
            }}
        >
            {children}
        </motion.div>
    )
}

const ModalCard = ({ children }) => (
    <motion.div
        onClick={e => e.stopPropagation()}
        initial={{ y: 30, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 20, opacity: 0, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 500, damping: 40, mass: 0.6 }}
        style={{
            position: 'relative',
            width: 'min(900px, 96vw)',
            maxHeight: '90vh',
            overflow: 'auto',
            background: '#fff',
            borderRadius: 12,
            boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
            padding: 16
        }}
    >
        {children}
    </motion.div>
)

const MAX_MEDIA = 5

export default function EditPostModal({ open, post, token, onClose, onSaved }) {
    const [caption, setCaption] = useState(post.caption || '')
    const [media, setMedia] = useState(
        post.media?.length
            ? post.media.map(m => ({ ...m }))
            : post.image
                ? [{ kind: 'image', src: post.image }]
                : []
    )
    const [removedPublicIds, setRemovedPublicIds] = useState([])
    const [status, setStatus] = useState('')
    const [isUploading, setIsUploading] = useState(false)
    const [current, setCurrent] = useState(0)

    const addInputRef = useRef(null)
    const replaceInputRef = useRef(null)

    const initialPidSetRef = useRef(new Set((post.media || []).map(m => m.publicId).filter(Boolean)))
    const newUploadsRef = useRef(new Set())

    const headers = { Authorization: `Bearer ${token}` }

    useEffect(() => {
        setCaption(post.caption || '')
        setMedia(
            post.media?.length
                ? post.media.map(m => ({ ...m }))
                : post.image
                    ? [{ kind: 'image', src: post.image }]
                    : []
        )
        setRemovedPublicIds([])
        setStatus('')
        setIsUploading(false)
        setCurrent(0)
        initialPidSetRef.current = new Set((post.media || []).map(m => m.publicId).filter(Boolean))
        newUploadsRef.current = new Set()
        if (addInputRef.current) addInputRef.current.value = ''
        if (replaceInputRef.current) replaceInputRef.current.value = ''
    }, [post, open])

    const uploadFiles = async files => {
        const fd = new FormData()
        files.forEach(f => fd.append('files', f))
        const res = await axios.post('http://localhost:5000/upload/media', fd, {
            headers: { ...headers, 'Content-Type': 'multipart/form-data' }
        })
        return res.data?.media || []
    }

    const deleteByPublicIds = async publicIds => {
        if (!publicIds?.length) return
        try {
            await axios.delete('http://localhost:5000/upload/media', {
                headers,
                data: { publicIds }
            })
        } catch (e) {
            console.error('cloud delete failed', e)
        }
    }

    const addWithRoom = files => {
        const room = MAX_MEDIA - media.length
        if (room <= 0) return []
        return files.slice(0, room)
    }

    const handleAddFiles = async e => {
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
            uploading: true
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
                if (u.publicId && !initialPidSetRef.current.has(u.publicId)) {
                    newUploadsRef.current.add(u.publicId)
                }
            })
            setMedia(prev => {
                const copy = [...prev]
                for (let i = 0; i < uploaded.length; i++) {
                    const at = startIndex + i
                    if (copy[at]) copy[at] = { ...uploaded[i], uploading: false }
                }
                return copy
            })
            setStatus('Ready to save')
        } catch (err) {
            console.error(err)
            setMedia(prev => prev.filter((_, i) => i < startIndex || i >= startIndex + placeholders.length))
            setCurrent(prev => Math.max(0, Math.min(prev, startIndex - 1)))
            setStatus('Upload failed')
        } finally {
            setIsUploading(false)
            if (addInputRef.current) addInputRef.current.value = ''
        }
    }

    const handleReplace = async e => {
        const file = e.target.files?.[0]
        if (!file || isUploading || media.length === 0) return
        const idx = current
        const old = media[idx]

        setIsUploading(true)
        setStatus('Uploading…')
        try {
            const [uploaded] = await uploadFiles([file])
            if (!uploaded) throw new Error('no upload response')

            if (uploaded.publicId && !initialPidSetRef.current.has(uploaded.publicId)) {
                newUploadsRef.current.add(uploaded.publicId)
            }

            if (old?.publicId && initialPidSetRef.current.has(old.publicId)) {
                setRemovedPublicIds(prev => [...prev, old.publicId])
            } else if (old?.publicId && newUploadsRef.current.has(old.publicId)) {
                await deleteByPublicIds([old.publicId])
                newUploadsRef.current.delete(old.publicId)
            }

            setMedia(prev => prev.map((m, i) => i === idx ? { ...uploaded, uploading: false } : m))
            setStatus('Ready to save')
        } catch (err) {
            console.error(err)
            setStatus('Upload failed')
        } finally {
            setIsUploading(false)
            if (replaceInputRef.current) replaceInputRef.current.value = ''
        }
    }

    const removeCurrent = async () => {
        const idx = current
        const item = media[idx]
        if (!item) return

        if (item.publicId) {
            if (initialPidSetRef.current.has(item.publicId)) {
                setRemovedPublicIds(prev => [...prev, item.publicId])
            } else if (newUploadsRef.current.has(item.publicId)) {
                await deleteByPublicIds([item.publicId])
                newUploadsRef.current.delete(item.publicId)
            }
        }

        const updated = media.filter((_, i) => i !== idx)
        setMedia(updated)
        if (updated.length === 0) setCurrent(0)
        else setCurrent(Math.min(idx, updated.length - 1))
    }

    const handleSave = async () => {
        if (isUploading) {
            setStatus('Please wait for uploads to finish')
            return
        }
        if (media.length < 1) {
            setStatus('At least 1 item required')
            return
        }
        if (media.length > MAX_MEDIA) {
            setStatus(`Maximum ${MAX_MEDIA} items`)
            return
        }

        try {
            const payload = { caption, media, removedPublicIds }
            const res = await axios.patch(`http://localhost:5000/posts/${post._id}`, payload, { headers })
            newUploadsRef.current.clear()
            onSaved && onSaved(res.data)
            onClose && onClose(true)
        } catch (e) {
            setStatus(e.response?.data?.message || 'Failed to save changes')
        }
    }

    const handleCancel = async () => {
        if (isUploading) return
        const toDelete = Array.from(newUploadsRef.current)
        if (toDelete.length) await deleteByPublicIds(toDelete)
        newUploadsRef.current.clear()
        onClose && onClose(false)
    }

    const cur = media[current]

    return (
        <AnimatePresence>
            {open && (
                <Backdrop onClose={handleCancel} disabled={isUploading}>
                    <ModalCard>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                            <div style={{ fontSize: 18, fontWeight: 700 }}>Edit Post</div>
                            <button
                                onClick={handleCancel}
                                disabled={isUploading}
                                style={{
                                    fontSize: 18,
                                    lineHeight: 1,
                                    opacity: isUploading ? 0.6 : 1,
                                    cursor: isUploading ? 'not-allowed' : 'pointer',
                                    background: 'transparent',
                                    border: 'none'
                                }}
                            >
                                ✕
                            </button>
                        </div>

                        <input
                            ref={addInputRef}
                            type='file'
                            accept='image/*,video/*'
                            multiple
                            onChange={handleAddFiles}
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

                                    <label style={{ display: 'inline-block' }}>
                                        <button
                                            type='button'
                                            onClick={() => {
                                                if (!isUploading && replaceInputRef.current) replaceInputRef.current.click()
                                            }}
                                            disabled={isUploading || media.length === 0}
                                        >
                                            Replace
                                        </button>
                                        <input
                                            ref={replaceInputRef}
                                            type='file'
                                            accept='image/*,video/*'
                                            onChange={handleReplace}
                                            disabled={isUploading || media.length === 0}
                                            style={{ display: 'none' }}
                                        />
                                    </label>

                                    <button type='button' onClick={removeCurrent} disabled={isUploading || media.length === 0}>
                                        Remove
                                    </button>
                                </div>

                                <div style={{ background: '#000', borderRadius: 8, height: 360, overflow: 'hidden', position: 'relative' }}>
                                    {cur?.uploading ? (
                                        <div style={{ width: '100%', height: 360, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Spinner />
                                        </div>
                                    ) : cur?.kind === 'video' ? (
                                        <video src={cur?.src} controls style={{ display: 'block', width: '100%', height: 360, objectFit: 'contain' }} />
                                    ) : (
                                        <img src={cur?.src} alt='preview' style={{ display: 'block', width: '100%', height: 360, objectFit: 'contain' }} />
                                    )}
                                </div>

                                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginTop: 8 }}>
                                    {media.map((m, i) => (
                                        <div
                                            key={m.publicId || `idx-${i}`}
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
                            value={caption}
                            onChange={e => setCaption(e.target.value)}
                            rows={3}
                            placeholder='Write a caption…'
                            style={{ width: '100%', marginTop: 10 }}
                            disabled={isUploading}
                        />

                        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                            <button
                                onClick={handleSave}
                                disabled={isUploading}
                                style={{ opacity: isUploading ? 0.6 : 1, cursor: isUploading ? 'not-allowed' : 'pointer' }}
                            >
                                Save Changes
                            </button>
                            <button
                                onClick={handleCancel}
                                disabled={isUploading}
                                style={{ opacity: isUploading ? 0.6 : 1, cursor: isUploading ? 'not-allowed' : 'pointer' }}
                            >
                                Cancel
                            </button>
                        </div>

                        {status && <div style={{ marginTop: 10, fontSize: 12, color: '#666' }}>{status}</div>}
                    </ModalCard>
                </Backdrop>
            )}
        </AnimatePresence>
    )
}
