import express from 'express'
import bodyParser from 'body-parser'
import mongoose from 'mongoose'
import cors from 'cors'
import dotenv from 'dotenv'

import authRoutes from './routes/auth.js'
import postRoutes from './routes/posts.js'
import userRoutes from './routes/users.js'
import uploadRoutes from './routes/upload.js'

const app = express()
dotenv.config()

app.use(bodyParser.json({ limit: '30mb', extended: true }))
app.use(bodyParser.urlencoded({ limit: '30mb', extended: true }))
app.use(cors())

app.use('/auth', authRoutes)
app.use('/posts', postRoutes)
app.use('/users', userRoutes)
app.use('/upload', uploadRoutes)

const PORT = process.env.PORT || 5000

mongoose.connect(process.env.CONNECTION_URL)
    .then(() => app.listen(PORT, () => console.log(`Server Running on port: ${PORT} | ${process.env.CONNECTION_URL}`)))
    .catch((error) => console.log(error.message))
