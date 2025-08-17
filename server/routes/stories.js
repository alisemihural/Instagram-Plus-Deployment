import express from 'express'
import auth from '../middleware/auth.js'
import { createStory, getStoriesProfile, getUserStories } from '../controllers/story.js'

const router = express.Router()

router.get('/users', auth, getStoriesProfile)
router.get('/', auth, getUserStories)
router.post('/', auth, createStory)

export default router
