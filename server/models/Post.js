import mongoose from 'mongoose'

const { ObjectId } = mongoose.Schema.Types

const replySchema = new mongoose.Schema({
    user: { type: ObjectId, ref: 'User', required: true },
    text: { type: String, required: true },
    likes: [{ type: ObjectId, ref: 'User' }],
    createdAt: { type: Date, default: Date.now },
    editedAt: { type: Date }
}, { _id: true })

const commentSchema = new mongoose.Schema({
    user: { type: ObjectId, ref: 'User', required: true },
    text: { type: String, required: true },
    likes: [{ type: ObjectId, ref: 'User' }],
    createdAt: { type: Date, default: Date.now },
    editedAt: { type: Date },
    replies: [replySchema]
}, { _id: true })

const mediaSchema = new mongoose.Schema({
    kind: { type: String, enum: ['image', 'video'], required: true },
    src: { type: String, required: true },
    publicId: { type: String }
}, { _id: false })

const postSchema = new mongoose.Schema({
    author: { type: ObjectId, ref: 'User', required: true },
    caption: { type: String },
    media: { type: [mediaSchema], validate: v => v.length > 0 && v.length <= 5 },
    likes: [{ type: ObjectId, ref: 'User' }],
    comments: [commentSchema]
}, { timestamps: true })

export default mongoose.model('Post', postSchema)
