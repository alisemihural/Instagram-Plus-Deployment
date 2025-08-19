import express from 'express'
import auth from '../middleware/auth.js'
import multer from 'multer'
import streamifier from 'streamifier'
import cloudinary from '../cloudinary.js'

const router = express.Router()
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 200 * 1024 * 1024, files: 5 }
})

const uploadToCloudinary = (buffer, folder) => new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
        { folder, resource_type: 'auto' },
        (err, result) => err ? reject(err) : resolve(result)
    )
    streamifier.createReadStream(buffer).pipe(stream)
})

router.post('/media', auth, upload.array('files', 5), async (req, res) => {
    try {
        if (!req.files?.length) return res.status(400).json({ message: 'no files' })
        const out = []
        for (const f of req.files) {
            const r = await uploadToCloudinary(f.buffer, 'instagram_plus')
            out.push({
                kind: r.resource_type === 'video' ? 'video' : 'image',
                src: r.secure_url,
                publicId: r.public_id,
                width: r.width,
                height: r.height,
                duration: r.duration
            })
        }
        res.status(201).json({ media: out })
    } catch (e) {
        console.error('upload error', e)
        res.status(500).json({ message: 'upload failed' })
    }
})

const destroyAsset = async publicId => {
    let resp = await cloudinary.uploader.destroy(publicId)
    if (resp.result !== 'ok' && resp.result !== 'not found') {
        resp = await cloudinary.uploader.destroy(publicId, { resource_type: 'video' })
    }
    return resp
}

router.delete('/media', auth, async (req, res) => {
    try {
        const { publicIds = [] } = req.body || {}
        const results = []
        for (const pid of publicIds) {
            results.push(await destroyAsset(pid))
        }
        res.json({ ok: true, results })
    } catch (e) {
        console.error('destroy error', e)
        res.status(500).json({ message: 'delete failed' })
    }
})

export default router
