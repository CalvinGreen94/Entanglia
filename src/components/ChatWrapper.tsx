import React, { useEffect, useState, useRef } from 'react';
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
import './ChatWrapper.css'; // optional custom styles

const apiKey = 'cknfetvs4fdj';

interface Props {
  currentUserId: string;
  currentUserToken: string;
  otherUserId: string;
  matchInfo?: {
    score: number;
    keras: number;
    quantum: number;
  };
}

const ChatWrapper: React.FC<Props> = ({
  currentUserId,
  currentUserToken,
  otherUserId,
  matchInfo,
}) => {
  const [clientReady, setClientReady] = useState(false);
  const [channel, setChannel] = useState<any>(null);
  const [client, setClient] = useState<StreamChat | null>(null);
  const chatClient = useRef(StreamChat.getInstance(apiKey));
  useEffect(() => {
    const client = chatClient.current;
    const sortedMembers = [currentUserId, otherUserId].sort();
    const channelId = `entanglia-${sortedMembers[0]}-${sortedMembers[1]}`;
  
    const init = async () => {
      await client.connectUser(
        { id: currentUserId, name: `EntangliaUser${currentUserId}` },
        currentUserToken
      );
  
      const newChannel = client.channel('messaging', channelId, {
        members: sortedMembers,
      });
  
      await newChannel.watch();
      setChannel(newChannel);
      setClientReady(true);
    };
  
    init();
  
    return () => {
      client.disconnectUser();
    };
  }, [currentUserId, currentUserToken, otherUserId]);
  

  if (!clientReady || !channel) return <LoadingIndicator />;

  const handleEmojiClick = (emoji: string) => {
    channel.sendMessage({ text: emoji });
  };

  return (
    <Chat client={client!} theme="str-chat__theme-light">
      <Channel channel={channel}>
        <Window>
          <div className="custom-chat-header">
            <ChannelHeader />
            {matchInfo && (
              <div className="match-stats">
                <p>💖 Score: {matchInfo.score.toFixed(2)}</p>
                <p>🤖 AI: {matchInfo.keras.toFixed(2)}</p>
                <p>🧠 Quantum: {matchInfo.quantum.toFixed(2)}</p>
              </div>
            )}
          </div>

          <MessageList />
          <MessageInput />

          <div className="emoji-bar">
            <span onClick={() => handleEmojiClick('❤️')}>❤️</span>
            <span onClick={() => handleEmojiClick('😂')}>😂</span>
            <span onClick={() => handleEmojiClick('🔥')}>🔥</span>
            <span onClick={() => handleEmojiClick('👍')}>👍</span>
            <span onClick={() => handleEmojiClick('😎')}>😎</span>
          </div>
        </Window>
      </Channel>
    </Chat>
  );
};

export default ChatWrapper;
