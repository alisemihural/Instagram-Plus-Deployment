import { useEffect, useState } from 'react'
import axios from 'axios'
import './Messages.css'

const Messages = () => {
    const [conversations, setConversations] = useState([])
    const [selectedConv, setSelectedConv] = useState(null)
    const [messages, setMessages] = useState([])
    const [newMessage, setNewMessage] = useState('')
    const [currentUserId, setCurrentUserId] = useState(null)
    const [showNewMsgModal, setShowNewMsgModal] = useState(false)
    const [usersList, setUsersList] = useState([])

    const [editingMessageId, setEditingMessageId] = useState(null)
    const [editText, setEditText] = useState('')

    const token = localStorage.getItem('token')

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await axios.get('http://localhost:5000/users/profile', {
                    headers: { Authorization: `Bearer ${token}` }
                })
                setCurrentUserId(res.data._id)
            } catch (err) {
                console.error('Error loading profile:', err)
            }
        }

        const fetchConversations = async () => {
            try {
                const res = await axios.get('http://localhost:5000/messages/conversations', {
                    headers: { Authorization: `Bearer ${token}` }
                })
                setConversations(res.data)
            } catch (err) {
                console.error('Error loading conversations:', err)
            }
        }

        fetchData()
        fetchConversations()
    }, [token])

    useEffect(() => {
        const fetchMessages = async () => {
            if (!selectedConv) return
            try {
                const res = await axios.get(`http://localhost:5000/messages/${selectedConv._id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                })
                setMessages(res.data)
            } catch (err) {
                console.error('Failed to load messages:', err)
            }
        }

        fetchMessages()
    }, [selectedConv, token])

    const sendMessage = async () => {
        if (!newMessage.trim()) return
        try {
            const res = await axios.post(
                `http://localhost:5000/messages/${selectedConv._id}`,
                { text: newMessage },
                { headers: { Authorization: `Bearer ${token}` } }
            )
            setMessages(prev => [...prev, res.data])
            setNewMessage('')
        } catch (err) {
            console.error('Failed to send message:', err)
        }
    }

    const deleteMessage = async (messageId) => {
        try {
            await axios.delete(`http://localhost:5000/messages/${messageId}`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            setMessages(prev => prev.filter(m => m._id !== messageId))
        } catch (err) {
            console.error('Failed to delete message:', err)
        }
    }

    const startEdit = (msg) => {
        setEditingMessageId(msg._id)
        setEditText(msg.text)
    }

    const saveEdit = async () => {
        try {
            const res = await axios.patch(`http://localhost:5000/messages/${editingMessageId}`, {
                text: editText
            }, {
                headers: { Authorization: `Bearer ${token}` }
            })
            setMessages(prev => prev.map(m => m._id === editingMessageId ? res.data : m))
            setEditingMessageId(null)
            setEditText('')
        } catch (err) {
            console.error('Failed to edit message:', err)
        }
    }

    const fetchFollowUsers = async (userId) => {
        try {
            if (!userId) {
                console.warn('User ID not available yet')
                return
            }

            const res = await axios.get(`http://localhost:5000/users/${userId}`)

            const followers = res.data.followers || []
            const following = res.data.following || []

            const combined = [...followers, ...following]
            const uniqueUsers = Array.from(new Map(combined.map(user => [user._id, user])).values())

            setUsersList(uniqueUsers)
            setShowNewMsgModal(true)
        } catch (err) {
            console.error('Failed to fetch follow users:', err)
        }
    }

    const startConversation = async (userId) => {
        try {
            const res = await axios.post(`http://localhost:5000/messages/start/${userId}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            })
            setSelectedConv(res.data)
            setConversations(prev => {
                const exists = prev.find(c => c._id === res.data._id)
                return exists ? prev : [res.data, ...prev]
            })
            setShowNewMsgModal(false)
        } catch (err) {
            console.error('Failed to start conversation:', err)
        }
    }

    return (
        <div className="messages-container">
            <div className="sidebar">
                <h3>Conversations</h3>
                <button onClick={() => fetchFollowUsers(currentUserId)} style={{ marginBottom: 10 }}>
                    New Message
                </button>

                {conversations.map(conv => {
                    const otherUser = conv.participants.find(p => p._id !== currentUserId)
                    return (
                        <div
                            key={conv._id}
                            className={`conversation ${selectedConv?._id === conv._id ? 'active' : ''}`}
                            onClick={() => setSelectedConv(conv)}
                        >
                            {otherUser?.username || 'Unknown'}
                        </div>
                    )
                })}

                {showNewMsgModal && (
                    <div className="new-message-modal">
                        <h4>Select a user to message</h4>
                        {usersList.map(user => (
                            <div key={user._id} className="conversation" onClick={() => startConversation(user._id)}>
                                {user.username}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="chat-window">
                {selectedConv ? (
                    <>
                        <div className="messages-list">
                            {messages.map(msg => (
                                <div
                                    key={msg._id}
                                    className={`message ${msg.sender?._id === currentUserId || msg.sender === currentUserId ? 'sent' : 'received'}`}
                                >
                                    <div className="message-header">
                                        <span className="timestamp">
                                            {new Date(msg.createdAt).toLocaleString(undefined, {
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                                hour12: true
                                            })}
                                        </span>
                                        {msg.edited && <span className="edited">(edited)</span>}
                                    </div>
                                    {editingMessageId === msg._id ? (
                                        <div className="edit-area">
                                            <input
                                                value={editText}
                                                onChange={(e) => setEditText(e.target.value)}
                                            />
                                            <button onClick={saveEdit}>Save</button>
                                            <button onClick={() => setEditingMessageId(null)}>Cancel</button>
                                        </div>
                                    ) : (
                                        <>
                                            <div>{msg.text}</div>
                                            {msg.sender === currentUserId || msg.sender?._id === currentUserId ? (
                                                <div className="message-actions">
                                                    <button onClick={() => startEdit(msg)}>Edit</button>
                                                    <button onClick={() => deleteMessage(msg._id)}>Delete</button>
                                                </div>
                                            ) : null}
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="input-area">
                            <input
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder="Type a message..."
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    sendMessage();
                                    }
                                }}
                            />
                            <button onClick={sendMessage}>Send</button>
                        </div>
                    </>
                ) : (
                    <div className="no-conversation">Select or start a conversation</div>
                )}
            </div>
        </div>
    )
}

export default Messages
