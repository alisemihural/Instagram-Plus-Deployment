import express from 'express'
import multer from 'multer'
import { v2 as cloudinary } from 'cloudinary'
import auth from '../middleware/auth.js'
import dotenv from 'dotenv'
dotenv.config()

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
})

const router = express.Router()
const storage = multer.memoryStorage()
const upload = multer({ storage })

router.post('/video', auth, upload.single('file'), async (req, res) => {
    try {
        const stream = cloudinary.uploader.upload_stream(
            { resource_type: 'video', folder: 'instagram_videos' },
            (error, result) => {
                if (error) return res.status(500).json({ message: 'Upload failed', error })
                res.status(200).json({ url: result.secure_url, publicId: result.public_id })
            }
        )
        stream.end(req.file.buffer)
    } catch (err) {
        res.status(500).json({ message: err.message })
    }
})

router.delete('/video/:publicId', auth, async (req, res) => {
    try {
        const { publicId } = req.params
        await cloudinary.uploader.destroy(publicId, { resource_type: 'video' })
        res.status(200).json({ ok: true })
    } catch (err) {
        res.status(500).json({ message: err.message })
    }
})

export default router
