import mongoose from 'mongoose'
const { ObjectId } = mongoose.Schema.Types

const messageSchema = mongoose.Schema(
    {
        conversation: { type: ObjectId, ref: 'Conversation', required: true },
        sender: { type: ObjectId, ref: 'User', required: true },
        text: { type: String, required: true },
        seenBy: [{ type: ObjectId, ref: 'User' }]
    },
    { timestamps: true })

export default mongoose.model('Message', messageSchema)
