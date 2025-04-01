import { useState, useRef, useEffect } from "react"
import { Laugh, Phone, Video, Image, Camera, Mic, SendHorizontal, MessageSquareQuote, EllipsisVertical } from "lucide-react"
import EmojiPicker from "emoji-picker-react"
import useFetch from "../../hooks/useFetch"
import { ChatBubble, ReplyBubble } from "./ChatBubble"
import useWebSocket from 'react-use-websocket'
import useAuthStore, { useAppLayout, useOtherUser } from '../../utils/appStore'
import { formatDistanceToNowStrict } from "date-fns"

const Chat = () => {
  const { otherUser } = useOtherUser()
  const { user } = useAuthStore()
  const { toggleDetail } = useAppLayout()
  const [isEmojiPickerOpened, setIsEmojiPickerOpened] = useState(false)
  const [text, setText] = useState('')
  const [messages, setMessages] = useState([])
  const [uuid, setUUID] = useState(null)
  const [roomId, setRoomId] = useState(null)
  const [ouTyping, setOuTyping] = useState(false)
  const [socketConnected, setSocketConnected] = useState(false)
  const endRef = useRef(null)
  const typingTimeoutRef = useRef(null)

  const api = useFetch()

  const readMessages = async (msg_id) => {
    try {
      const { response, data } = await api(`chat/mark_message_as_read/`, 'POST', {'msg_id': msg_id})
      if (response.status === 200) {
        console.log("Message marked as read:", data)
      } else {
        console.error('Error marking messages read:', response.status)
      }
    } catch (error) {
      console.error('Error messages read:', error)
    }
  }

  const getRoomId = async (otherUser) => {
    try {
      const { response, data } = await api(`chat/user/${otherUser}`)
      if (response.status === 200) {
        setRoomId(data.chatroom)
        console.log("Room ID set:", data.chatroom)
      } else {
        console.error('Error fetching room ID:', response.status)
      }
    } catch (error) {
      console.error('Error fetching room ID:', error)
    }
  }

  const getMessages = async (roomId) => {
    try {
      const { response, data } = await api(`chat/room/${roomId}`)
      if (response.status === 200) {
        console.log("Messages loaded:", data.length)
        setMessages(data)
      } else {
        console.error('Error fetching messages:', response.status)
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
    }
  }

  const getUUID = async () => {
    try {
      const { response, data } = await api('auth/auth_for_ws_connection')
      if (response.status === 200) {
        setUUID(data.uuid)
        console.log("UUID set:", data.uuid)
      } else {
        console.error('Error fetching UUID:', response.status)
      }
    } catch (error) {
      console.error('Error fetching UUID:', error)
    }
  }

  const formatTimeAgo = (timestamp) => {
    try {
      const date = new Date(timestamp)
      return formatDistanceToNowStrict(date, { addSuffix: true })
    } catch (error) {
      console.error("Error formatting time:", error)
      return "recently"
    }
  }

  const scrollToBottom = () => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Fetch room and UUID when otherUser changes
  useEffect(() => {
    const fetchRoomAndMessages = async () => {
      if (otherUser) {
        await getRoomId(otherUser.username)
        await getUUID()
      }
    }

    fetchRoomAndMessages()
  }, [otherUser])

  // Fetch messages when roomId changes
  useEffect(() => {
    if (roomId) {
      getMessages(roomId)
    }
  }, [roomId])

  // Mark messages as read and scroll to bottom when messages change
  useEffect(() => {
    if (messages && messages.length > 0) {
      messages.forEach((message) => {
        if (message.is_read === false && message.sender !== user.username) {
          readMessages(message.id)
        }
      })
      scrollToBottom()
    }
  }, [messages, user.username])

  // Clean up typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [])

  const handleWebSocketMessage = (event) => {
    console.log("WebSocket message received:", event.data)
    try {
      const parsedData = JSON.parse(event.data)
      console.log("Parsed WebSocket message:", parsedData)
      
      // Handle typing status
      if (parsedData.action === 'type') {
        if (parsedData.user === otherUser.username) {
          setOuTyping(parsedData.typing)
        }
        return
      }
      
      // Handle new message
      if (parsedData.action === 'message' && parsedData.data) {
        console.log("New message received:", parsedData.data)
        
        // Check if message already exists (avoid duplicates)
        const existingMessage = messages.find(m => m.id === parsedData.data.id)
        if (!existingMessage) {
          setMessages(prevMessages => [...prevMessages, parsedData.data])
        }
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error)
    }
  }

  const { sendJsonMessage } = useWebSocket(
    roomId && uuid ? `ws://127.0.0.1:8000/ws/chatroom/${roomId}?uuid=${uuid}` : null,
    {
      queryParams: { uuid },
      onOpen: () => {
        console.log('WebSocket connection established')
        setSocketConnected(true)
      },
      onClose: () => {
        console.log('WebSocket connection closed')
        setSocketConnected(false)
      },
      onError: (error) => console.error('WebSocket error:', error),
      onMessage: handleWebSocketMessage,
      shouldReconnect: () => true,
      reconnectAttempts: 10,
      reconnectInterval: 3000,
    }
  )

  const handleEmoji = (e) => {
    setText((prev) => prev + e.emoji)
  }

  const handleFormSubmit = (e) => {
    e.preventDefault()
    if (text.trim() && socketConnected) {
      try {
        console.log("Sending message:", text, "to:", otherUser.username)
        
        // Send the message via WebSocket
        sendJsonMessage({
          action: 'message',
          content: text,
          receiver: otherUser.username
        })
        
        // Clear input
        setText("")
      } catch (err) {
        console.error("Error sending message:", err)
      }
    }
  }

  const handleInputChange = (e) => {
    setText(e.target.value)
    
    if (socketConnected) {
      // Send typing status
      sendJsonMessage({
        'action': 'type',
        'typing': true,
        'user': otherUser.username
      })

      // Clear any existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      
      // Set new timeout to clear typing status
      typingTimeoutRef.current = setTimeout(() => {
        if (socketConnected) {
          sendJsonMessage({
            'action': 'type',
            'typing': false,
            'user': otherUser.username
          })
        }
      }, 1000)
    }
  }

  return (
    otherUser ? (
      <div className="h-full flex flex-col flex-2 border border-transparent border-l-slate-600 border-r-slate-600">
        <div className="px-5 py-3 flex items-center justify-between border border-transparent border-b-slate-600">
          <div className="flex items-center gap-5 cursor-pointer" onClick={toggleDetail}>
            <img
              src={otherUser.avatar?.startsWith('http') ? otherUser.avatar : `http://127.0.0.1:8000${otherUser.avatar || '/media/avatars/default_avatar.jpg'}`}
              className="w-24 h-24 rounded-full object-cover"
              alt="User Avatar"
            />
            <div className="flex gap-2 items-center">
              <span className="font-semibold text-lg">{otherUser.name}</span>
              <span className={`text-md font-light transition-opacity duration-500 ${ouTyping ? 'opacity-100 visible' : 'opacity-0 visible'}`}>
                is typing...
              </span>
            </div>
          </div>
          <div className="flex gap-5">
            <Phone size={22} className="cursor-pointer" />
            <Video size={22} className="cursor-pointer" />
            <EllipsisVertical size={22} className="cursor-pointer" />
          </div>
        </div>
        <div className="flex flex-col flex-1 p-5 gap-5 overflow-y-scroll scroll-smooth transition-all ease-in delay-[500]">
          {messages && messages.length > 0 ? (
            messages.map((item, index) => (
              <div
                className={
                  item.sender === user.username
                    ? "message own"
                    : item.sender === otherUser.username
                    ? "message"
                    : ""
                }
                key={item.id || index} // Use message ID if available
              >
                {item.sender === user.username ? (
                  <ChatBubble
                    content={item.content}
                    time={formatTimeAgo(item.created_at)}
                  />
                ) : item.sender === otherUser.username ? (
                  <ReplyBubble
                    content={item.content}
                    time={formatTimeAgo(item.created_at)}
                  />
                ) : (
                  ""
                )}
              </div>
            ))
          ) : (
            <p className="self-center my-auto">No Messages to Display</p>
          )}
          <div className="pt-3" ref={endRef}></div>
        </div>
        <div className="mt-auto px-5 py-3 flex items-center justify-between border border-transparent gap-5 border-t-slate-600">
          <div className="flex gap-5">
            <Image size={20} />
            <Camera size={20} />
            <Mic size={20} />
          </div>
          <form className="w-full flex justify-evenly gap-4 items-center" onSubmit={handleFormSubmit}>
            <input 
              type="text" 
              value={text} 
              placeholder="Type a message...." 
              onChange={handleInputChange} 
              className="flex-1 bg-slate-700/60 text-base border-none outline-none px-3 py-2 rounded-md" 
            />
            <div className="cursor-pointer relative" onClick={() => {setIsEmojiPickerOpened((prev) => !prev)}}>
              <Laugh size={24} />
              <div className="absolute bottom-12 left-0">
                <EmojiPicker open={isEmojiPickerOpened} onEmojiClick={handleEmoji} height={350} width={270} />
              </div>
            </div>
            <button 
              type="submit" 
              className={text.trim() && socketConnected ? "bg-blue-600 px-4 py-2 rounded-lg" : "bg-blue-600 px-4 py-2 rounded-lg cursor-not-allowed"}
              disabled={!text.trim() || !socketConnected}
            >
              <SendHorizontal/>
            </button>
          </form>
        </div>
      </div>
    ) : (
      <div className="h-full flex flex-col flex-2 items-center justify-center border border-transparent border-l-slate-600 border-r-slate-600 select-none">
        <div className="flex flex-col items-center gap-3">
          <MessageSquareQuote size={60} />
          <h1 className="text-lg font-semibold">Django Web Messenger</h1>
          <p className="text-md font-light">Send and Receive messages from your friends and closest ones, Start Texting...</p>
        </div>
      </div>
    )
  )
}

export default Chat