import React, { useEffect } from 'react';
import Chat from '../components/Chat';

const ChatPage = () => {
  useEffect(() => {
    // React Router retains the previous page's scroll position. Always open
    // Chat at its header; message scrolling is handled inside the chat panel.
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, []);

  return (
    <div className="min-h-[calc(100vh-80px)] overflow-hidden border-t-2 border-black">
      <Chat />
    </div>
  );
};

export default ChatPage; 
