import Post from '../models/Post.js'

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
