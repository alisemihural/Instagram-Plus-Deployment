import express from 'express'
import bodyParser from 'body-parser'
import mongoose from 'mongoose'
import cors from 'cors'
import dotenv from 'dotenv'
import compression from 'compression'
import http from 'http'
import { Server as SocketIOServer } from 'socket.io'
import path from 'path'
import { fileURLToPath } from 'url'

import authRoutes from './routes/auth.js'
import postRoutes from './routes/posts.js'
import userRoutes from './routes/users.js'
import uploadRoutes from './routes/upload.js'
import storyRoutes from './routes/stories.js'
import messageRoutes from './routes/messages.js'

import "./jobs/clearStories.js"

const app = express()
dotenv.config()


// HTTP server
const server = http.createServer(app)

// Socket.IO server
const io = new SocketIOServer(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    },
})

// Middleware
app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token', 'Origin', 'X-Requested-With', 'Accept'],
    optionsSuccessStatus: 200
}))

app.use(compression())

app.use(bodyParser.json({ limit: '30mb', extended: true }))
app.use(bodyParser.urlencoded({ limit: '30mb', extended: true }))

app.use((req, res, next) => {
    console.log(`${req.method} ${req.path} - Origin: ${req.get('Origin')}`);
    next();
});

app.get('/test', (req, res) => {
    res.json({ message: 'CORS is working!' })
})

// Routes
app.use('/auth', authRoutes)
app.use('/posts', postRoutes)
app.use('/users', userRoutes)
app.use('/upload', uploadRoutes)
app.use('/stories', storyRoutes)
app.use('/messages', messageRoutes)

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Serve static files from the React app build directory
app.use(express.static(path.join(__dirname, 'client')))

// Catch-all handler: send back React's index.html file for any non-API routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client', 'index.html'))
})

// Socket.IO Logic
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id)

    socket.on('joinConversation', (conversationId) => {
        socket.join(conversationId)
        console.log(`Socket ${socket.id} joined room ${conversationId}`)
    })

    socket.on('sendMessage', ({ conversationId, message }) => {
        socket.to(conversationId).emit('receiveMessage', message)
    })

    socket.on('editMessage', ({ conversationId, message }) => {
        socket.to(conversationId).emit('messageEdited', message)
    })

    socket.on('deleteMessage', ({ conversationId, messageId }) => {
        socket.to(conversationId).emit('messageDeleted', messageId)
    })

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id)
    })
})

const PORT = process.env.PORT || 5000

mongoose.connect(process.env.CONNECTION_URL)
    .then(() => {
        server.listen(PORT, () => {
            console.log(`Server running on port: ${PORT}`)
            console.log(`Database connected: ${process.env.CONNECTION_URL}`)
        })
    })
    .catch((error) => console.log('MongoDB connection error:', error.message))
