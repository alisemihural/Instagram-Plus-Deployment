import Conversation from '../models/Conversation.js'
import Message from '../models/Message.js'

export const createConversation = async (req, res) => {
    try {
        const userId = req.userId;
        const recipientId = req.params.id;

        if (userId === recipientId) {
            return res.status(400).json({ message: 'Cannot start a conversation with yourself.' });
        }

        let conversation = await Conversation.findOne({
            participants: { $all: [userId, recipientId], $size: 2 }
        }).populate('participants', 'username profilePic');

        if (!conversation) {
            conversation = new Conversation({
                participants: [userId, recipientId]
            });
            await conversation.save();
            conversation = await conversation.populate('participants', 'username profilePic');
        }

        res.status(200).json(conversation);
    } catch (err) {
        console.error('createConversation error:', err);
        res.status(500).json({ message: err.message });
    }
};


export const getConversations = async (req, res) => {
    try {
        const conversations = await Conversation.find({
            participants: req.userId
        }).populate('participants', 'username profilePic');

        res.status(200).json(conversations)
    } catch (err) {
        console.error('getConversations error:', err);
        res.status(500).json({ message: err.message })
    }
}

export const sendMessage = async (req, res) => {
    const { conversationId } = req.params
    const { text } = req.body

    try {
        const message = await Message.create({
            conversation: conversationId,
            sender: req.userId,
            text
        })

        await Conversation.findByIdAndUpdate(conversationId, { updatedAt: new Date() })

        res.status(201).json(message)
    } catch (err) {
        console.error('sendMessage error:', err);
        res.status(500).json({ message: err.message })
    }
}

export const getMessages = async (req, res) => {
    const { conversationId } = req.params

    try {
        const messages = await Message.find({ conversation: conversationId })
            .populate('sender', 'username profilePic')
            .sort({ createdAt: 1 })

        res.status(200).json(messages)
    } catch (err) {
        console.error('getMessages error:', err);
        res.status(500).json({ message: err.message })
    }
}
