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

// Simple and clean CORS configuration
app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token', 'Origin', 'X-Requested-With', 'Accept']
}))

app.use(bodyParser.json({ limit: '30mb', extended: true }))
app.use(bodyParser.urlencoded({ limit: '30mb', extended: true }))

// Simple debug middleware
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path} - Origin: ${req.get('Origin')}`);
    next();
});

// Test route
app.get('/test', (req, res) => {
    res.json({ message: 'Server is working!' })
})

app.use('/auth', authRoutes)
app.use('/posts', postRoutes)
app.use('/users', userRoutes)
app.use('/upload', uploadRoutes)
app.use('/stories', storyRoutes)

// Serve static files from the React app build directory
app.use(express.static('client'))

// Catch all handler: send back React's index.html file for any non-API routes
// Use a safer approach without wildcards
app.use((req, res, next) => {
    // Only serve index.html for GET requests that don't start with /api, /auth, etc.
    if (req.method === 'GET' && 
        !req.path.startsWith('/auth') && 
        !req.path.startsWith('/posts') && 
        !req.path.startsWith('/users') && 
        !req.path.startsWith('/upload') && 
        !req.path.startsWith('/stories') && 
        !req.path.startsWith('/test') &&
        !req.path.includes('.')) { // Skip files with extensions (CSS, JS, images)
        
        return res.sendFile('index.html', { root: 'client' })
    }
    
    // If it's an API route that doesn't exist, return 404
    next()
})

const PORT = process.env.PORT || 5000

mongoose.connect(process.env.CONNECTION_URL)
    .then(() => app.listen(PORT, () => console.log(`Server Running on port: ${PORT} | ${process.env.CONNECTION_URL}`)))
    .catch((error) => console.log(error.message))
