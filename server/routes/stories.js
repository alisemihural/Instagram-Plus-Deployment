import express from 'express'
import auth from '../middleware/auth.js'
import { createStory, getStories } from '../controllers/story.js'

const router = express.Router()

router.get('/', getStories)
router.post('/', auth, createStory)

export default router
