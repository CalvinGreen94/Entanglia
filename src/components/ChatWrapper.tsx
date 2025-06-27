import React, { useEffect, useState } from 'react';
import { StreamChat } from 'stream-chat';
import {
  Chat,
  Channel,
  ChannelHeader,
  MessageList,
  MessageInput,
  Window,
  LoadingIndicator,
} from 'stream-chat-react';
import 'stream-chat-react/dist/css/v2/index.css';

const apiKey = 'cknfetvs4fdj'; // Replace with your real Stream API key

interface Props {
  currentUserId: string;
  currentUserToken: string;
  otherUserId: string;
}

const ChatWrapper: React.FC<Props> = ({ currentUserId, currentUserToken, otherUserId }) => {
  const [client, setClient] = useState<StreamChat | null>(null);
  const [channel, setChannel] = useState<any>(null);

  useEffect(() => {
    const initChat = async () => {
      const chatClient = StreamChat.getInstance(apiKey);

      await chatClient.connectUser(
        {
          id: currentUserId,
          name: `EntangliaUser${currentUserId}`,
        },
        currentUserToken
      );

      const newChannel = chatClient.channel('messaging', {
        members: [currentUserId, otherUserId], // 1-on-1 channel
      });

      await newChannel.watch();

      setClient(chatClient);
      setChannel(newChannel);
    };

    initChat();

    return () => {
      if (client) client.disconnectUser();
    };
  }, [currentUserId, currentUserToken, otherUserId]);

  if (!client || !channel) return <LoadingIndicator />;

  return (
    <Chat client={client} theme="str-chat__theme-light">
      <Channel channel={channel}>
        <Window>
          <ChannelHeader />
          <MessageList />
          <MessageInput />
        </Window>
      </Channel>
    </Chat>
  );
};

export default ChatWrapper;
