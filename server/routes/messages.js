import express from 'express';
import auth from '../middleware/auth.js';
import {
    createConversation,
    sendMessage,
    getConversations,
    getMessages
} from '../controllers/messages.js';

const router = express.Router();

router.post('/start/:id', auth, createConversation)
router.get('/conversations', auth, getConversations);
router.get('/messages/:conversationId', auth, getMessages);
router.post('/messages/:conversationId', auth, sendMessage);

export default router;
