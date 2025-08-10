import Story from '../models/Story.js'

export const createStory = async (req, res) => {
    const { story } = req.body

    if (!story) {
        return res.status(400).json({ message: 'Image is required' })
    }

    if (!req.userId) {
        console.warn('createStory called without req.userId')
        return res.status(401).json({ message: 'Unauthorized' })
    }

    try {
        const newStory = await Story.create({
            author: req.userId,
            story
        })

        console.log(`Post created by user ${req.userId} with ID ${newStory._id}`)
        res.status(201).json(newStory)
    } catch (err) {
        console.error('Error creating story:', err)
        res.status(500).json({ message: err.message })
    }
}


export const getStories = async (req, res) => {
    try {
        const stories = await Story.find().populate('author', 'username profilePic').sort({ createdAt: -1 })
        res.status(200).json(stories)
    } catch (err) {
        res.status(500).json({ message: err.message })
    }
}

