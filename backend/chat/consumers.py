import json
from datetime import datetime, timezone
from asgiref.sync import async_to_sync
from channels.generic.websocket import WebsocketConsumer
from .models import ChatRoom, Message  
from user.models import User

# Track connected users
connected_users = {}

class ChatConsumer(WebsocketConsumer):
    def connect(self):
        self.user = self.scope['user']
        self.chatroom_id = self.scope['url_route']['kwargs']['room_id']
        self.room_group_name = f'chat_{self.chatroom_id}'

        # Check if the chat room exists and if the user has permission to access it
        try:
            chatroom = ChatRoom.objects.get(id=self.chatroom_id)
            self.chatroom = chatroom
            if self.scope['user'] not in chatroom.members.all():
                self.close()
                return
        except ChatRoom.DoesNotExist:
            # Chat room doesn't exist
            self.close()
            return
        
        connected_users[self.user.username] = self.chatroom_id
        
        # Join room group
        async_to_sync(self.channel_layer.group_add)(
            self.room_group_name,
            self.channel_name
        )

        self.accept()
        print(f"WebSocket connected: {self.user.username} in room {self.chatroom_id}")

    def disconnect(self, close_code):
        # Remove user from Connected users
        if hasattr(self, 'user') and self.user.username in connected_users:
            del connected_users[self.user.username]
        
        # Leave room group
        if hasattr(self, 'room_group_name') and hasattr(self, 'channel_name'):
            async_to_sync(self.channel_layer.group_discard)(
                self.room_group_name,
                self.channel_name
            )
        print(f"WebSocket disconnected: code {close_code}")

    def receive(self, text_data):
        # Handle incoming messages
        print(f"Received WebSocket data: {text_data}")
        json_data = json.loads(text_data)
        action = json_data.get('action')

        if action == 'type':
            value = json_data.get('typing', False)
            user = json_data.get('user')
            
            # Broadcast the typing status to the room group
            async_to_sync(self.channel_layer.group_send)(
                self.room_group_name,
                {
                    'type': 'typing_status',
                    'action': action,
                    'typing': value,
                    'user': user
                }
            )

        elif action == 'message':
            content = json_data.get('content')
            receiver_name = json_data.get('receiver')
            
            try:
                receiver = User.objects.get(username=receiver_name)
                my_date = datetime.now(timezone.utc)

                is_read = connected_users.get(receiver_name) == self.chatroom_id

                # Create message in database
                message = Message.objects.create(
                    content=content,
                    sender=self.user,
                    receiver=receiver,
                    room=self.chatroom,
                    created_at=my_date,
                    is_read=is_read,
                )

                # Prepare message data for frontend
                message_data = {
                    'id': message.id,
                    'content': message.content,
                    'sender': self.user.username,
                    'receiver': receiver.username,
                    'created_at': message.created_at.isoformat(),
                    'is_read': is_read,
                }

                print(f"Created message: {message_data}")

                # Broadcast the message to the room group
                async_to_sync(self.channel_layer.group_send)(
                    self.room_group_name,
                    {
                        'type': 'chat_message',
                        'action': 'message',
                        'data': message_data
                    }
                )

                # Send Notifications to the receiver
                async_to_sync(self.channel_layer.group_send)(
                    f'user_{receiver.username}',
                    {
                        'type': 'notify_message',
                        'message': message_data,
                        'sender': self.user.username,
                    }
                )
            except User.DoesNotExist:
                print(f"User not found: {receiver_name}")
            except Exception as e:
                print(f"Error processing message: {str(e)}")

    def typing_status(self, event):
        # Send typing status to WebSocket
        self.send(text_data=json.dumps({
            'action': event['action'],
            'typing': event['typing'],
            'user': event['user']
        }))

    def chat_message(self, event):
        # Send message to WebSocket
        self.send(text_data=json.dumps({
            'action': event['action'],
            'data': event['data']
        }))