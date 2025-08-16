import Post from '../models/Post.js'
import { v2 as cloudinary } from 'cloudinary'
import dotenv from 'dotenv'
dotenv.config()

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
})

export const createPost = async (req, res) => {
    const { caption, media } = req.body

    if (!req.userId) return res.status(401).json({ message: 'Unauthorized' })
    if (!Array.isArray(media) || media.length === 0) {
        return res.status(400).json({ message: 'Provide 1-5 media items' })
    }
    if (media.length > 5) {
        return res.status(400).json({ message: 'Maximum 5 media items per post' })
    }

    for (const m of media) {
        if (!m?.kind || !m?.src) return res.status(400).json({ message: 'Each media needs kind and src' })
        if (m.kind === 'image' && !m.src.startsWith('data:image/')) {
            return res.status(400).json({ message: 'Images must be base64 data URLs' })
        }
        if (m.kind === 'video' && !/^https?:\/\//.test(m.src)) {
            return res.status(400).json({ message: 'Videos must be a URL' })
        }
    }

    try {
        const newPost = await Post.create({
            author: req.userId,
            caption,
            media
        })
        res.status(201).json(newPost)
    } catch (err) {
        console.error('Error creating post:', err)
        res.status(500).json({ message: err.message })
    }
}


export const getFeed = async (req, res) => {
    try {
        const posts = await Post.find().populate('author', 'username profilePic').sort({ createdAt: -1 })
        res.status(200).json(posts)
    } catch (err) {
        res.status(500).json({ message: err.message })
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

export const getPost = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id)
            .populate('author', 'username profilePic')
            .populate('comments.user', 'username profilePic')
            .populate('comments.replies.user', 'username profilePic')
        if (!post) return res.status(404).json({ message: 'Post not found' })
        res.status(200).json(post)
    } catch (err) {
        console.error('Error fetching post:', err)
        res.status(500).json({ message: 'Server error' })
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

export const updatePost = async (req, res) => {
    const { id } = req.params
    const { caption, media, removedPublicIds = [] } = req.body

    if (!req.userId) return res.status(401).json({ message: 'Unauthorized' })
    if (!Array.isArray(media) || media.length < 1 || media.length > 5) {
        return res.status(400).json({ message: 'Media must be between 1 and 5 items' })
    }
    for (const m of media) {
        if (!m?.kind || !m?.src) return res.status(400).json({ message: 'Each media needs kind and src' })
        if (m.kind === 'image' && !m.src.startsWith('data:image/')) {
            return res.status(400).json({ message: 'Images must be base64 data URLs' })
        }
        if (m.kind === 'video' && !/^https?:\/\//.test(m.src)) {
            return res.status(400).json({ message: 'Videos must be a URL' })
        }
    }

    try {
        const post = await Post.findById(id)
        if (!post) return res.status(404).json({ message: 'Post not found' })
        if (post.author.toString() !== req.userId) {
            return res.status(403).json({ message: 'Forbidden' })
        }

        if (Array.isArray(removedPublicIds) && removedPublicIds.length > 0) {
            await Promise.all(
                removedPublicIds.map(pid => cloudinary.uploader.destroy(pid, { resource_type: 'video' }).catch(() => null))
            )
        }

        post.caption = caption ?? post.caption
        post.media = media
        await post.save()

        const populated = await Post.findById(post._id).populate('author', 'username profilePic')
        res.status(200).json(populated)
    } catch (err) {
        console.error('Error updating post:', err)
        res.status(500).json({ message: err.message })
    }
}

export const deletePost = async (req, res) => {
    const { id } = req.params
    if (!req.userId) return res.status(401).json({ message: 'Unauthorized' })

    try {
        const post = await Post.findById(id)
        if (!post) return res.status(404).json({ message: 'Post not found' })
        if (post.author.toString() !== req.userId) {
            return res.status(403).json({ message: 'Forbidden' })
        }

        const videoPublicIds = (post.media || [])
            .filter(m => m.kind === 'video' && m.publicId)
            .map(m => m.publicId)

        if (videoPublicIds.length) {
            await Promise.all(
                videoPublicIds.map(pid => cloudinary.uploader.destroy(pid, { resource_type: 'video' }).catch(() => null))
            )
        }

        await post.deleteOne()
        res.status(200).json({ ok: true })
    } catch (err) {
        console.error('Error deleting post:', err)
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