import express from 'express'
import auth from '../middleware/auth.js'
import { createPost, getFeed, likePost, getUserPosts } from '../controllers/post.js'

const router = express.Router()

router.get('/', getFeed)
router.get('/user/:userId', getUserPosts)
router.post('/', auth, createPost)
router.patch('/:id/like', auth, likePost)

export default router
