import express from 'express'
import auth from '../middleware/auth.js'
import { createPost, getFeed, getForYouFeed, likePost, addComment, getComments, getUserPosts, updatePost, deletePost, likeComment, editComment, deleteComment, getPost } from '../controllers/post.js'

const router = express.Router()

router.get('/', auth, getFeed)
router.get('/foryou', auth, getForYouFeed)
router.get('/user/:userId', auth, getUserPosts)
router.post('/', auth, createPost)
router.patch('/:id/like', auth, likePost)
router.patch('/:id', auth, updatePost)
router.delete('/:id', auth, deletePost)
router.get('/:id', auth, getPost)
router.get('/:id/comments', auth, getComments)
router.post('/:id/comments', auth, addComment)
router.patch('/:id/comments/:commentId/like', auth, likeComment)
router.patch('/:id/comments/:commentId', auth, editComment)
router.delete('/:id/comments/:commentId', auth, deleteComment)

export default router
