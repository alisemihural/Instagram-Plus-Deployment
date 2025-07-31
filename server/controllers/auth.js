import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'

export const register = async (req, res) => {
    const { username, email, password } = req.body
    try {
        const existingUser = await User.findOne({ email })
        if (existingUser) return res.status(400).json({ message: 'User already exists' })

        const hashedPassword = await bcrypt.hash(password, 12)
        const result = await User.create({ username, email, password: hashedPassword })

        const token = jwt.sign({ id: result._id }, process.env.JWT_SECRET, { expiresIn: '1d' })
        res.status(201).json({ result, token })
    } catch (err) {
        res.status(500).json({ message: 'Something went wrong' })
    }
}

export const login = async (req, res) => {
    const { email, password } = req.body
    try {
        const user = await User.findOne({ email })
        if (!user) return res.status(404).json({ message: 'User not found' })

        const isPasswordCorrect = await bcrypt.compare(password, user.password)
        if (!isPasswordCorrect) return res.status(400).json({ message: 'Invalid credentials' })

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' })
        res.status(200).json({ result: user, token })
    } catch (err) {
        res.status(500).json({ message: 'Something went wrong' })
    }
}
