import express from 'express'
import User from '../models/User.js'
import auth from '../middleware/auth.js'

const router = express.Router()

router.get('/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password')
        res.status(200).json(user)
    } catch (err) {
        res.status(500).json({ message: err.message })
    }
})

router.patch('/:id/follow', auth, async (req, res) => {
    try {
        const target = await User.findById(req.params.id)
        const me = await User.findById(req.userId)

        if (!target.followers.includes(req.userId)) {
            target.followers.push(req.userId)
            me.following.push(req.params.id)
        } else {
            target.followers = target.followers.filter(id => id.toString() !== req.userId)
            me.following = me.following.filter(id => id.toString() !== req.params.id)
        }

        await target.save()
        await me.save()

        res.status(200).json({ message: 'Updated follow status' })
    } catch (err) {
        res.status(500).json({ message: err.message })
    }
})

export default router
