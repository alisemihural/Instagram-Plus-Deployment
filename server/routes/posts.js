import express from 'express'
import auth from '../middleware/auth.js'
import { createPost, getFeed, likePost, addComment, getComments, getUserPosts } from '../controllers/post.js'

const router = express.Router()

router.get('/', getFeed)
router.get('/user/:userId', getUserPosts)
router.post('/', auth, createPost)
router.patch('/:id/like', auth, likePost)
router.get('/:id/comments', auth, getComments)
router.post('/:id/comments', auth, addComment)

export default router
