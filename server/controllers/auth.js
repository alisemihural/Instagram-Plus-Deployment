import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'

export const register = async (req, res) => {
    const { username, email, password } = req.body
    let createdUser = null

    try {
        const existingUser = await User.findOne({ email })
        if (existingUser) return res.status(400).json({ message: 'User already exists' })

        const hashedPassword = await bcrypt.hash(password, 12)
        createdUser = await User.create({ username, email, password: hashedPassword, profilePic: 'https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png' })

        res.status(201).json({ result: createdUser })
    } catch (err) {
        console.error(err)

        if (createdUser) {
            try {
                await User.findByIdAndDelete(createdUser._id)
                console.log(`Rolled back user creation: ${createdUser._id}`)
            } catch (deleteErr) {
                console.error('Rollback failed:', deleteErr)
            }
        }

        res.status(500).json({ message: 'Something went wrong' })
    }
}


export const login = async (req, res) => {
    const { email, password } = req.body
    console.log('Login attempt:', email)

    try {
        const user = await User.findOne({ email })
        if (!user) {
            console.warn('User not found:', email)
            return res.status(404).json({ message: 'User not found' })
        }

        const isPasswordCorrect = await bcrypt.compare(password, user.password)
        if (!isPasswordCorrect) {
            console.warn('Invalid password attempt for:', email)
            return res.status(400).json({ message: 'Invalid credentials' })
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' })

        console.log('User logged in:', user.username || user.email)
        res.status(200).json({ result: user, token })
    } catch (err) {
        console.error('Login error:', err)
        res.status(500).json({ message: 'Something went wrong' })
    }
}
