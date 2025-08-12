import mongoose from 'mongoose'

const storySchema = mongoose.Schema({
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    story: { type: String, required: true },
}, { timestamps: true })

export default mongoose.model('Story', storySchema)
