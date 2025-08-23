import { useEffect, useRef } from 'react'
import { BsChevronLeft, BsChevronRight } from 'react-icons/bs'

const MediaCarousel = ({ media = [], index, setIndex, height = 480, dark = true, onIndexChange }) => {
    const containerRef = useRef(null)

    const clamp = i => Math.max(0, Math.min(media.length - 1, i))
    const goPrev = () => setIndex(i => clamp(i - 1))
    const goNext = () => setIndex(i => clamp(i + 1))

    useEffect(() => {
        const el = containerRef.current
        if (!el) return
        const onKey = e => {
            if (e.key === 'ArrowLeft') goPrev()
            if (e.key === 'ArrowRight') goNext()
            if (e.key === 'Home') setIndex(0)
            if (e.key === 'End') setIndex(media.length - 1)
        }
        el.addEventListener('keydown', onKey)
        return () => el.removeEventListener('keydown', onKey)
    }, [media.length, setIndex])

    useEffect(() => {
        if (onIndexChange) onIndexChange(index)
    }, [index, onIndexChange])

    useEffect(() => {
        if (!media?.length) return
        const prev = media[index - 1]
        const next = media[index + 1]
            ;[prev, next].forEach(m => {
                if (m?.kind !== 'video' && m?.src) {
                    const img = new Image()
                    img.src = m.src
                }
            })
    }, [index, media])

    const startX = useRef(0)
    const dragging = useRef(false)
    const onPointerDown = e => {
        dragging.current = true
        startX.current = e.clientX ?? e.touches?.[0]?.clientX ?? 0
    }
    const onPointerUp = e => {
        if (!dragging.current) return
        dragging.current = false
        const x = e.clientX ?? e.changedTouches?.[0]?.clientX ?? 0
        const dx = x - startX.current
        const threshold = 50
        if (dx > threshold) goPrev()
        else if (dx < -threshold) goNext()
    }

    const cur = media?.[index]

    return (
        <div
            ref={containerRef}
            tabIndex={0}
            onMouseDown={onPointerDown}
            onMouseUp={onPointerUp}
            onTouchStart={onPointerDown}
            onTouchEnd={onPointerUp}
            style={{
                background: dark ? '#000' : 'transparent',
                height,
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                outline: 'none',
                userSelect: 'none'
            }}
            aria-roledescription='carousel'
            aria-label='Post media carousel'
        >
            {!cur ? null : cur.kind === 'video'
                ? <video src={cur.src} controls style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                : <img src={cur.src} alt='media' loading='lazy' style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            }

            {media.length > 1 && (
                <>
                    <button
                        onClick={goPrev}
                        disabled={index === 0}
                        aria-label='Previous'
                        style={{
                            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                            background: 'rgba(0,0,0,0.45)', border: 'none', color: '#fff',
                            padding: 8, borderRadius: '50%', display: index === 0 ? 'none' : 'block'
                        }}
                    >
                        <BsChevronLeft size={20} />
                    </button>

                    <button
                        onClick={goNext}
                        disabled={index === media.length - 1}
                        aria-label='Next'
                        style={{
                            position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                            background: 'rgba(0,0,0,0.45)', border: 'none', color: '#fff',
                            padding: 8, borderRadius: '50%', display: index === media.length - 1 ? 'none' : 'block'
                        }}
                    >
                        <BsChevronRight size={20} />
                    </button>

                    <div style={{ position: 'absolute', bottom: 10, left: 0, right: 0, textAlign: 'center' }}>
                        {media.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setIndex(i)}
                                aria-label={`Go to slide ${i + 1}`}
                                style={{
                                    width: 6, height: 6, borderRadius: '50%',
                                    background: i === index ? '#fff' : 'rgba(255,255,255,0.5)',
                                    margin: '0 3px',
                                    border: 'none',
                                    padding: 0,
                                    display: 'inline-block',
                                    cursor: 'pointer'
                                }}
                            />
                        ))}
                    </div>

                    <div style={{
                        position: 'absolute',
                        top: 10,
                        right: 12,
                        color: '#fff',
                        fontSize: 12,
                        background: 'rgba(0,0,0,0.45)',
                        padding: '2px 6px',
                        borderRadius: 8
                    }}>
                        {index + 1} / {media.length}
                    </div>
                </>
            )}
        </div>
    )
}

export default MediaCarousel
