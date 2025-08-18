import Story from '../models/Story.js'
import User from '../models/User.js'

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
            story: story
        });

        await User.findByIdAndUpdate(
            req.userId,
            {$push: {stories: newStory._id}}
        );

        console.log(`Story created by user ${req.userId} with ID ${newStory._id}`)
        res.status(201).json(newStory)
    } catch (err) {
        console.error('Error creating story:', err)
        res.status(500).json({ message: err.message })
    }
}


export const getStoriesProfile = async (req, res) => {
    try {
        let usersWithStories = [];
        const user = await User.findById(req.userId).sort({ createdAt: -1 });

        for (const element of user.following) {
            const eachFollower = await User.findById(element).sort({ createdAt: -1 });
            if ((eachFollower.stories).length <= 0) {
                continue;
            } else {
                usersWithStories.push(eachFollower);
            }
        }
        res.status(200).json(usersWithStories);
    } catch (err) {
        res.status(500).json({ message: err.message })
    }
}

export const getUserStories = async (req, res) => {
    try {
        let storiesObjects = {};
        const user = await User.findById(req.userId);

        if ((user.following).length > 0) {
            for (const element of user.following) {
                const eachFollowing = await User.findById(element);
                if ((eachFollowing.stories).length <= 0) {
                    continue;
                } else {
                    for (const eachStoryId of eachFollowing.stories) {
                        const eachStory = await Story.findById(eachStoryId);
                        if (!storiesObjects[eachStory.author]) {
                            storiesObjects[eachStory.author] = [eachStory.story];
                        } else {
                            (storiesObjects[eachStory.author]).push(eachStory.story);
                        }
                    }
                }
            }
        }
        res.status(200).json(storiesObjects);
    } catch (err) {
        res.status(500).json({ message: err.message })
    }
}



