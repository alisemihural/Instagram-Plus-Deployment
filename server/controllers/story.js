import mongoose from 'mongoose'
import Story from '../models/Story.js'
import User from '../models/User.js'
import cloudinary from '../cloudinary.js'

const { ObjectId } = mongoose.Types

const safeDestroy = async publicId => {
    try {
        let r = await cloudinary.uploader.destroy(publicId)
        if (r.result !== 'ok' && r.result !== 'not found') {
            r = await cloudinary.uploader.destroy(publicId, { resource_type: 'video' })
        }
        return r
    } catch {
        return null
    }
}

export const createStory = async (req, res) => {
    try {
        const { media } = req.body
        if (!media?.src || media.src.startsWith('data:')) {
            return res.status(400).json({ message: 'upload to /upload/media first' })
        }

        const doc = await Story.create({ author: req.userId, media })

        await User.findByIdAndUpdate(
            req.userId,
            { $addToSet: { stories: doc._id } },
            { new: false }
        )

        res.status(201).json(doc)
    } catch (e) {
        console.error('createStory', e)
        res.status(500).json({ message: 'server error' })
    }
}

export const deleteStory = async (req, res) => {
    try {
        const story = await Story.findById(req.params.id)
        if (!story) return res.status(404).json({ message: 'not found' })
        if (story.author.toString() !== req.userId) return res.status(403).json({ message: 'forbidden' })

        if (story.media?.publicId) await safeDestroy(story.media.publicId)

        await User.findByIdAndUpdate(story.author, { $pull: { stories: story._id } })
        await story.deleteOne()

        res.json({ ok: true })
    } catch (e) {
        console.error('deleteStory', e)
        res.status(500).json({ message: 'server error' })
    }
}

export const getStoriesProfile = async (req, res) => {
    try {
        const me = await User.findById(req.userId).select('following').lean()
        if (!me) return res.status(404).json({ message: 'user not found' })

        const ids = [...me.following.map(id => new ObjectId(id)), new ObjectId(req.userId)]
        const now = new Date()

        const rows = await Story.aggregate([
            { $match: { author: { $in: ids }, expiresAt: { $gt: now } } },
            { $sort: { createdAt: -1 } },
            { $group: { _id: '$author', lastStoryAt: { $first: '$createdAt' } } },
            { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'author' } },
            { $unwind: '$author' },
            {
                $project: {
                    _id: '$author._id',
                    username: '$author.username',
                    profilePic: '$author.profilePic',
                    lastStoryAt: 1
                }
            },
            { $sort: { lastStoryAt: -1 } }
        ])

        res.status(200).json(rows)
    } catch (err) {
        console.error('getStoriesProfile', err)
        res.status(500).json({ message: err.message })
    }
}

export const getUserStories = async (req, res) => {
    try {
        const me = await User.findById(req.userId).select('following').lean()
        if (!me) return res.status(404).json({ message: 'user not found' })

        const ids = [...me.following.map(id => new ObjectId(id)), new ObjectId(req.userId)]
        const now = new Date()

        const stories = await Story.find({
            author: { $in: ids },
            expiresAt: { $gt: now }
        })
            .select('author media.src createdAt')
            .sort({ createdAt: 1 })
            .lean()

        const out = {}
        for (const s of stories) {
            const key = String(s.author)
            const url = s.media?.src
            if (!url) continue
            if (!out[key]) out[key] = []
            out[key].push(url)
        }

        res.status(200).json(out)
    } catch (err) {
        console.error('getUserStories', err)
        res.status(500).json({ message: err.message })
    }
}
