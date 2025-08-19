// create/update/delete posts without base64, delete Cloudinary on removal
import mongoose from 'mongoose'
import Post from '../models/Post.js'
import cloudinary from '../cloudinary.js'

const safeDestroy = async publicId => {
    try {
        let r = await cloudinary.uploader.destroy(publicId)
        if (r.result !== 'ok' && r.result !== 'not found') {
            r = await cloudinary.uploader.destroy(publicId, { resource_type: 'video' })
        }
        return r
    } catch (e) {
        console.error('safeDestroy', e)
        return null
    }
}

export const getFeed = async (req, res) => {
    try {
        const viewerId = new mongoose.Types.ObjectId(req.userId)
        const limit = Math.min(parseInt(req.query.limit || '10', 10), 25)
        const cursor = req.query.cursor ? new Date(req.query.cursor) : null

        const pipeline = cursor
            ? [{ $match: { createdAt: { $lt: cursor } } }, { $sort: { createdAt: -1, _id: -1 } }, { $limit: limit }]
            : [{ $sort: { createdAt: -1, _id: -1 } }, { $limit: limit }]

        pipeline.push(
            { $lookup: { from: 'users', localField: 'author', foreignField: '_id', as: 'author' } },
            { $unwind: '$author' },
            {
                $project: {
                    caption: 1,
                    media: {
                        $map: {
                            input: '$media',
                            as: 'm',
                            in: { kind: '$$m.kind', src: '$$m.src', publicId: '$$m.publicId', width: '$$m.width', height: '$$m.height', duration: '$$m.duration' }
                        }
                    },
                    createdAt: 1,
                    updatedAt: 1,
                    author: { _id: '$author._id', username: '$author.username', profilePic: '$author.profilePic' },
                    likesCount: { $size: { $ifNull: ['$likes', []] } },
                    commentsCount: { $size: { $ifNull: ['$comments', []] } },
                    isLiked: { $in: [viewerId, { $ifNull: ['$likes', []] }] }
                }
            }
        )

        const items = await Post.aggregate(pipeline).hint({ createdAt: -1, _id: -1 }).allowDiskUse(true)
        const nextCursor = items.length === limit ? items[items.length - 1].createdAt : null
        res.status(200).json({ items, nextCursor })
    } catch (err) {
        console.error('getFeed error', err)
        res.status(500).json({ message: 'server error' })
    }
}

export const getPost = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id)
            .populate('author', 'username profilePic')
            .populate('comments.user', 'username profilePic')
            .populate('comments.replies.user', 'username profilePic')
        if (!post) return res.status(404).json({ message: 'not found' })
        res.json(post)
    } catch (e) {
        console.error('getPost', e)
        res.status(500).json({ message: 'server error' })
    }
}

export const createPost = async (req, res) => {
    try {
        const { caption = '', media = [] } = req.body
        if (!Array.isArray(media) || media.length === 0) return res.status(400).json({ message: 'media required' })
        if (media.some(m => typeof m?.src !== 'string' || m.src.startsWith('data:'))) {
            return res.status(400).json({ message: 'base64 not allowed, upload to /upload/media first' })
        }
        const doc = await Post.create({ author: req.userId, caption, media })
        const populated = await Post.findById(doc._id).populate('author', 'username profilePic')
        res.status(201).json(populated)
    } catch (e) {
        console.error('createPost', e)
        res.status(500).json({ message: 'server error' })
    }
}

export const updatePost = async (req, res) => {
    try {
        const { caption, media, removedPublicIds = [] } = req.body
        const post = await Post.findById(req.params.id)
        if (!post) return res.status(404).json({ message: 'not found' })
        if (post.author.toString() !== req.userId) return res.status(403).json({ message: 'forbidden' })
        if (Array.isArray(media) && media.some(m => typeof m?.src !== 'string' || m.src.startsWith('data:'))) {
            return res.status(400).json({ message: 'base64 not allowed' })
        }
        if (typeof caption === 'string') post.caption = caption
        if (Array.isArray(media)) post.media = media
        await post.save()
        for (const pid of removedPublicIds) await safeDestroy(pid)
        const populated = await Post.findById(post._id).populate('author', 'username profilePic')
        res.json(populated)
    } catch (e) {
        console.error('updatePost', e)
        res.status(500).json({ message: 'server error' })
    }
}

export const deletePost = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id)
        if (!post) return res.status(404).json({ message: 'not found' })
        if (post.author.toString() !== req.userId) return res.status(403).json({ message: 'forbidden' })
        const pids = (post.media || []).map(m => m.publicId).filter(Boolean)
        await post.deleteOne()
        for (const pid of pids) await safeDestroy(pid)
        res.json({ ok: true })
    } catch (e) {
        console.error('deletePost', e)
        res.status(500).json({ message: 'server error' })
    }
}

export const getUserPosts = async (req, res) => {
    try {
        const { userId } = req.params
        const posts = await Post.find({ author: userId }).populate('author', 'username profilePic').sort({ createdAt: -1 })
        res.status(200).json(posts)
    } catch (err) {
        res.status(500).json({ message: err.message })
    }
}

export const likePost = async (req, res) => {
    const { id } = req.params
    try {
        const post = await Post.findById(id)
        if (!post) return res.status(404).json({ message: 'Post not found' })

        const index = post.likes.indexOf(req.userId)
        if (index === -1) {
            post.likes.push(req.userId)
        } else {
            post.likes.splice(index, 1)
        }
        await post.save()
        res.status(200).json(post)
    } catch (err) {
        res.status(500).json({ message: err.message })
    }
}

export const getComments = async (req, res) => {
    const { id } = req.params
    try {
        const post = await Post.findById(id)
            .populate('comments.user', 'username profilePic')
            .populate('comments.replies.user', 'username profilePic')
        if (!post) return res.status(404).json({ message: 'Post not found' })
        res.status(200).json(post.comments)
    } catch (err) {
        console.error('Error fetching comments:', err)
        res.status(500).json({ message: 'Server error' })
    }
}


export const addComment = async (req, res) => {
    const { id } = req.params
    const { text, parentId } = req.body
    if (!req.userId) return res.status(401).json({ message: 'Unauthorized' })
    if (!text || text.trim() === '') return res.status(400).json({ message: 'No Comment is Inputted' })

    try {
        const post = await Post.findById(id)
        if (!post) return res.status(404).json({ message: 'Post not found' })

        // create either a top-level comment or a reply
        if (parentId) {
            const parent = post.comments.id(parentId)
            if (!parent) return res.status(404).json({ message: 'Parent comment not found' })

            parent.replies.push({ user: req.userId, text: text.trim() })
            // capture the new reply id before requery
            const newReplyId = parent.replies[parent.replies.length - 1]._id
            await post.save()

            // requery and populate from the parent doc, then pick the one we just added
            const populated = await Post.findById(post._id)
                .select('comments')
                .populate([
                    { path: 'comments.user', select: 'username profilePic' },
                    { path: 'comments.replies.user', select: 'username profilePic' }
                ])

            const parentPop = populated.comments.id(parentId)
            const replyPop = parentPop?.replies.id(newReplyId)
            return res.status(201).json({ kind: 'reply', parentId, reply: replyPop })
        } else {
            post.comments.push({ user: req.userId, text: text.trim() })
            const newCommentId = post.comments[post.comments.length - 1]._id
            await post.save()

            const populated = await Post.findById(post._id)
                .select('comments')
                .populate({ path: 'comments.user', select: 'username profilePic' })

            const commentPop = populated.comments.id(newCommentId)
            return res.status(201).json({ kind: 'comment', comment: commentPop })
        }
    } catch (err) {
        console.error('Error adding comment:', err)
        res.status(500).json({ message: 'Server error' })
    }
}

export const likeComment = async (req, res) => {
    const { id, commentId } = req.params
    const { replyId } = req.body
    if (!req.userId) return res.status(401).json({ message: 'Unauthorized' })

    try {
        const post = await Post.findById(id)
        if (!post) return res.status(404).json({ message: 'Post not found' })

        const targetComment = post.comments.id(commentId)
        if (!targetComment) return res.status(404).json({ message: 'Comment not found' })

        if (replyId) {
            const reply = targetComment.replies.id(replyId)
            if (!reply) return res.status(404).json({ message: 'Reply not found' })
            const idx = reply.likes.findIndex(u => u.toString() === req.userId)
            if (idx === -1) reply.likes.push(req.userId)
            else reply.likes.splice(idx, 1)
        } else {
            const idx = targetComment.likes.findIndex(u => u.toString() === req.userId)
            if (idx === -1) targetComment.likes.push(req.userId)
            else targetComment.likes.splice(idx, 1)
        }

        await post.save()
        res.status(200).json({ ok: true })
    } catch (err) {
        console.error('Error liking comment:', err)
        res.status(500).json({ message: 'Server error' })
    }
}

export const editComment = async (req, res) => {
    const { id, commentId } = req.params
    const { text, replyId } = req.body
    if (!req.userId) return res.status(401).json({ message: 'Unauthorized' })
    if (!text || text.trim() === '') return res.status(400).json({ message: 'No text provided' })

    try {
        const post = await Post.findById(id)
        if (!post) return res.status(404).json({ message: 'Post not found' })

        const c = post.comments.id(commentId)
        if (!c) return res.status(404).json({ message: 'Comment not found' })

        if (replyId) {
            const r = c.replies.id(replyId)
            if (!r) return res.status(404).json({ message: 'Reply not found' })
            if (r.user.toString() !== req.userId) return res.status(403).json({ message: 'Forbidden' })
            r.text = text.trim()
            r.editedAt = new Date()
        } else {
            if (c.user.toString() !== req.userId) return res.status(403).json({ message: 'Forbidden' })
            c.text = text.trim()
            c.editedAt = new Date()
        }

        await post.save()
        res.status(200).json({ ok: true })
    } catch (err) {
        console.error('Error editing comment:', err)
        res.status(500).json({ message: 'Server error' })
    }
}

export const deleteComment = async (req, res) => {
    const { id, commentId } = req.params
    const { replyId } = req.body
    if (!req.userId) return res.status(401).json({ message: 'Unauthorized' })

    try {
        const post = await Post.findById(id)
        if (!post) return res.status(404).json({ message: 'Post not found' })

        const c = post.comments.id(commentId)
        if (!c) return res.status(404).json({ message: 'Comment not found' })

        if (replyId) {
            const r = c.replies.id(replyId)
            if (!r) return res.status(404).json({ message: 'Reply not found' })
            if (r.user.toString() !== req.userId && post.author.toString() !== req.userId) {
                return res.status(403).json({ message: 'Forbidden' })
            }
            r.deleteOne()
        } else {
            if (c.user.toString() !== req.userId && post.author.toString() !== req.userId) {
                return res.status(403).json({ message: 'Forbidden' })
            }
            c.deleteOne()
        }

        await post.save()
        res.status(200).json({ ok: true })
    } catch (err) {
        console.error('Error deleting comment:', err)
        res.status(500).json({ message: 'Server error' })
    }
}