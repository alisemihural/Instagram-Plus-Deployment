import express from 'express'
import bodyParser from 'body-parser'
import mongoose from 'mongoose'
import cors from 'cors'
import dotenv from 'dotenv'

import authRoutes from './routes/auth.js'
import postRoutes from './routes/posts.js'
import userRoutes from './routes/users.js'
import uploadRoutes from './routes/upload.js'
import storyRoutes from './routes/stories.js'

const app = express()
dotenv.config()

// Configure CORS first, before body parsers
app.use(cors({
    origin: true, // Allow all origins for now
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token', 'Origin', 'X-Requested-With', 'Accept'],
    optionsSuccessStatus: 200 // For legacy browser support
}))

app.use(bodyParser.json({ limit: '30mb', extended: true }))
app.use(bodyParser.urlencoded({ limit: '30mb', extended: true }))

// Debug middleware to log all requests
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path} - Origin: ${req.get('Origin')}`);
    next();
});

// Test route
app.get('/test', (req, res) => {
    res.json({ message: 'CORS is working!' })
})

app.use('/auth', authRoutes)
app.use('/posts', postRoutes)
app.use('/users', userRoutes)
app.use('/upload', uploadRoutes)
app.use('/stories', storyRoutes)

const PORT = process.env.PORT || 5001

mongoose.connect(process.env.CONNECTION_URL)
    .then(() => app.listen(PORT, () => console.log(`Server Running on port: ${PORT} | ${process.env.CONNECTION_URL}`)))
    .catch((error) => console.log(error.message))
