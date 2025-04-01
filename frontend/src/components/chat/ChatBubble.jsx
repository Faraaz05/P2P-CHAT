import { useOtherUser } from "../../utils/appStore"
function ChatBubble({content, time}) {
  return (
    <div className="texts">
            <p>{content}</p>
            <span>{time}</span>
        </div>
    )
}

function ReplyBubble({ content, time }) {
    const { otherUser } = useOtherUser();
    return (
        <>
            <img
    src={otherUser.avatar?.startsWith('http') ? otherUser.avatar : `http://127.0.0.1:8000${otherUser.avatar || '/media/avatars/default_avatar.jpg'}`}
    alt="User Avatar"
    className="w-10 h-10 rounded-full object-cover"
/>
            <div className="texts">
                <p>{content}</p>
                <span>{time}</span>
            </div>
        </>
    );
}

export {ChatBubble, ReplyBubble}
