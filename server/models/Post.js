import mongoose from 'mongoose'

const mediaSchema = new mongoose.Schema({
    kind: { type: String, enum: ['image', 'video'], required: true }, // image=base64, video=URL
    src: { type: String, required: true }
}, { _id: false })

const postSchema = new mongoose.Schema({
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    caption: { type: String },
    media: { type: [mediaSchema], validate: v => v.length > 0 && v.length <= 5 },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    comments: [
        {
            user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            text: String,
            createdAt: { type: Date, default: Date.now }
        }
    ]
}, { timestamps: true })

export default mongoose.model('Post', postSchema)
