import mongoose from 'mongoose'
const { ObjectId } = mongoose.Schema.Types

const mediaSchema = new mongoose.Schema({
    kind: { type: String, enum: ['image', 'video'], required: true },
    src: { type: String, required: true },
    publicId: { type: String, required: true },
    width: Number,
    height: Number,
    duration: Number
}, { _id: false })

const commentSchema = new mongoose.Schema({
    user: { type: ObjectId, ref: 'User', required: true },
    text: { type: String, required: true },
    likes: [{ type: ObjectId, ref: 'User' }],
    replies: [{
        user: { type: ObjectId, ref: 'User', required: true },
        text: { type: String, required: true },
        likes: [{ type: ObjectId, ref: 'User' }],
        createdAt: { type: Date, default: Date.now }
    }],
    createdAt: { type: Date, default: Date.now }
})

const postSchema = new mongoose.Schema({
    author: { type: ObjectId, ref: 'User', required: true },
    caption: { type: String, trim: true },
    media: [mediaSchema],
    likes: [{ type: ObjectId, ref: 'User' }],
    comments: [commentSchema]
}, { timestamps: true })

postSchema.index({ createdAt: -1, _id: -1 })
postSchema.index({ author: 1, createdAt: -1 })

export default mongoose.model('Post', postSchema)
