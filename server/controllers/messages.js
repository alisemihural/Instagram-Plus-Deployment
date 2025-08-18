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

export const editMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const { text } = req.body;

        const message = await Message.findById(messageId);
        if (!message) return res.status(404).json({ message: 'Message not found' });

        if (message.sender.toString() !== req.userId)
            return res.status(403).json({ message: 'Not authorized to edit this message' });

        message.text = text;
        message.edited = true;
        await message.save();

        res.status(200).json(message);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const deleteMessage = async (req, res) => {
    try {
        const { messageId } = req.params;

        const message = await Message.findById(messageId);
        if (!message) return res.status(404).json({ message: 'Message not found' });

        if (message.sender.toString() !== req.userId)
            return res.status(403).json({ message: 'Not authorized to delete this message' });

        await message.deleteOne();

        res.status(200).json({ message: 'Message deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
