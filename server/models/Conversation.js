import mongoose from 'mongoose'
const { ObjectId } = mongoose.Schema.Types

const conversationSchema = mongoose.Schema(
    {
        participants: [{ type: ObjectId, ref: 'User' }]
    },
    { timestamps: true })

export default mongoose.model('Conversation', conversationSchema)
