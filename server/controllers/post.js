import Post from '../models/Post.js'

export const createPost = async (req, res) => {
    const { caption, image } = req.body
    try {
        const newPost = await Post.create({ author: req.userId, caption, image })
        res.status(201).json(newPost)
    } catch (err) {
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
