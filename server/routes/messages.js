import express from 'express';
import auth from '../middleware/auth.js';
import {
    createConversation,
    sendMessage,
    getConversations,
    getMessages,
    editMessage,
    deleteMessage
} from '../controllers/messages.js';

const router = express.Router();

router.post('/start/:id', auth, createConversation)
router.get('/conversations', auth, getConversations);
router.get('/:conversationId', auth, getMessages);
router.post('/:conversationId', auth, sendMessage);
router.patch('/:messageId', auth, editMessage);
router.delete('/:messageId', auth, deleteMessage);

export default router;
