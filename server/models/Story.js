import mongoose from 'mongoose'
const { ObjectId } = mongoose.Schema.Types

const storyMediaSchema = new mongoose.Schema({
    kind: { type: String, enum: ['image', 'video'], required: true },
    src: { type: String, required: true },
    publicId: { type: String, required: true },
    width: Number,
    height: Number,
    duration: Number
}, { _id: false })

const storySchema = new mongoose.Schema({
    author: { type: ObjectId, ref: 'User', required: true },
    media: storyMediaSchema,
    expiresAt: { type: Date, default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) }
}, { timestamps: true })

storySchema.index({ createdAt: -1 })

export default mongoose.model('Story', storySchema)
