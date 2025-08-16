import { BsChevronLeft, BsChevronRight } from 'react-icons/bs'

const MediaCarousel = ({ media, index, setIndex, height = 480, dark = true }) => {
    const cur = media?.[index]

    return (
        <div style={{
            background: dark ? '#000' : 'transparent',
            height,
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }}>
            {!cur ? null : cur.kind === 'video'
                ? <video src={cur.src} controls style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                : <img src={cur.src} alt='media' style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            }

            {media && media.length > 1 && (
                <>
                    <button
                        onClick={() => setIndex(i => Math.max(0, i - 1))}
                        disabled={index === 0}
                        aria-label='Previous'
                        style={{
                            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                            background: 'rgba(0,0,0,0.45)', border: 'none', color: '#fff',
                            padding: 8, borderRadius: '50%', cursor: index === 0 ? 'not-allowed' : 'pointer'
                        }}
                    >
                        <BsChevronLeft size={20} />
                    </button>

                    <button
                        onClick={() => setIndex(i => Math.min(media.length - 1, i + 1))}
                        disabled={index === media.length - 1}
                        aria-label='Next'
                        style={{
                            position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                            background: 'rgba(0,0,0,0.45)', border: 'none', color: '#fff',
                            padding: 8, borderRadius: '50%', cursor: index === media.length - 1 ? 'not-allowed' : 'pointer'
                        }}
                    >
                        <BsChevronRight size={20} />
                    </button>

                    <div style={{ position: 'absolute', bottom: 10, left: 0, right: 0, textAlign: 'center' }}>
                        {media.map((_, i) => (
                            <span key={i} style={{
                                display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
                                background: i === index ? '#fff' : 'rgba(255,255,255,0.5)', margin: '0 3px'
                            }} />
                        ))}
                    </div>
                </>
            )}
        </div>
    )
}

export default MediaCarousel
