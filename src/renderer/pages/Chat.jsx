import React, { useState, useRef, useEffect } from 'react';
import { ButtonPlain, ButtonIconed } from '../components/Button';
import { LoaderSmall } from '../components/Loader';
import { APIKeyModal } from '../components/APIKeyModal';

const Chat = () => {
  const [llmReady, setLlmReady] = useState(false);
  const [llmInitializing, setLlmInitializing] = useState(true);
  const [apiKey, setApiKey] = useState(() => {
    return localStorage.getItem('omnis-reach-api-key') || null;
  });
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chats, setChats] = useState([{
    id: Date.now(),
    title: 'New Chat',
    messages: [{
      id: 1,
      type: 'bot',
      content: 'Hello! I\'m your automation assistant. How can I help you today?',
      timestamp: new Date().toISOString(),
    }],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }]);
  const [activeChatId, setActiveChatId] = useState(chats[0]?.id || null);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const activeChat = chats.find(chat => chat.id === activeChatId);
  const messages = activeChat?.messages || [];

  useEffect(() => {
    initializeLLM();
  }, []);

  async function initializeLLM() {
    try {
      console.log('🤖 Initializing LLM...');
      const result = await window.llmAPI.initialize();
      if (result.success) {
        await window.llmAPI.startChat();
        setLlmReady(true);
        console.log('✅ LLM ready');
      } else {
        console.error('❌ LLM initialization failed:', result.error);
      }
    } catch (error) {
      console.error('❌ LLM error:', error);
    } finally {
      setLlmInitializing(false);
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, activeChatId]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isTyping || !llmReady) return;

    const userMessage = {
      id: messages.length + 1,
      type: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    const isFirstUserMessage = messages.filter(m => m.type === 'user').length === 0;
    const newTitle = isFirstUserMessage ? input.trim().substring(0, 30) + (input.trim().length > 30 ? '...' : '') : activeChat?.title;

    setChats(prev => prev.map(chat => 
      chat.id === activeChatId
        ? {
            ...chat,
            title: newTitle,
            messages: [...chat.messages, userMessage],
            updatedAt: new Date().toISOString(),
          }
        : chat
    ));
    
    const userInput = input.trim();
    setInput('');
    setIsTyping(true);

    try {
      const result = await window.llmAPI.sendMessage(userInput);
      
      if (result.success) {
        const botMessage = {
          id: messages.length + 2,
          type: 'bot',
          content: result.data.message,
          timestamp: new Date().toISOString(),
        };
        
        setChats(prev => prev.map(chat => 
          chat.id === activeChatId
            ? {
                ...chat,
                messages: [...chat.messages, botMessage],
                updatedAt: new Date().toISOString(),
              }
            : chat
        ));

        if (result.data.isComplete) {
          console.log('🎯 Requirements complete! Extracting workflow...');
          const workflowResult = await window.llmAPI.extractWorkflow();
          
          if (workflowResult.success) {
            console.log('✅ Generated Workflow:', workflowResult.data);
            
            const workflowMessage = {
              id: messages.length + 3,
              type: 'bot',
              content: '✨ I\'ve generated your workflow! Check the console for details.',
              timestamp: new Date().toISOString(),
            };
            
            setChats(prev => prev.map(chat => 
              chat.id === activeChatId
                ? {
                    ...chat,
                    messages: [...chat.messages, workflowMessage],
                    updatedAt: new Date().toISOString(),
                  }
                : chat
            ));
          }
        }
      }
    } catch (error) {
      console.error('❌ Chat error:', error);
      const errorMessage = {
        id: messages.length + 2,
        type: 'bot',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString(),
      };
      setChats(prev => prev.map(chat => 
        chat.id === activeChatId
          ? {
              ...chat,
              messages: [...chat.messages, errorMessage],
              updatedAt: new Date().toISOString(),
            }
          : chat
      ));
    } finally {
      setIsTyping(false);
    }
  };

  const createNewChat = async () => {
    const newChat = {
      id: Date.now(),
      title: 'New Chat',
      messages: [{
        id: 1,
        type: 'bot',
        content: 'Hello! I\'m your automation assistant. How can I help you today?',
        timestamp: new Date().toISOString(),
      }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setChats(prev => [newChat, ...prev]);
    setActiveChatId(newChat.id);
    setSidebarOpen(false);
    
    await window.llmAPI.reset();
    await window.llmAPI.startChat();
  };

  const switchChat = (chatId) => {
    setActiveChatId(chatId);
    setSidebarOpen(false);
  };

  const deleteChat = (chatId, e) => {
    e.stopPropagation();
    if (chats.length === 1) {

      createNewChat();
      setChats(prev => prev.filter(chat => chat.id !== chatId));
    } else {
      setChats(prev => prev.filter(chat => chat.id !== chatId));
      if (activeChatId === chatId) {

        const remainingChats = chats.filter(chat => chat.id !== chatId);
        setActiveChatId(remainingChats[0]?.id || null);
      }
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
      }).format(date);
    }
  };

  const handleApiKeySave = (key) => {
    setApiKey(key);
    setApiKeyModalOpen(false);
  };

  return (
    <div className="flex h-full bg-base-background relative">
      {}
      <div
        className={`fixed inset-y-0 left-0 z-50 bg-[var(--color-base-background-light)] border-r border-border-muted transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ width: '320px', top: '0' }}
      >
        <div className="flex flex-col h-full">
          {}
          <div className="p-4 border-b border-border-muted">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text-primary">Chat History</h3>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-2 hover:bg-[var(--color-base-background)] rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <ButtonPlain variant="primary" className="w-full" onClick={createNewChat}>
              + New Chat
            </ButtonPlain>
          </div>

          {}
          <div className="flex-1 overflow-y-auto p-2">
            {chats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => switchChat(chat.id)}
                className={`group relative p-3 rounded-lg mb-2 cursor-pointer transition-colors ${
                  activeChatId === chat.id
                    ? 'bg-primary-accent text-white'
                    : 'hover:bg-[var(--color-base-background)] text-text-primary'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${
                      activeChatId === chat.id ? 'text-white' : 'text-text-primary'
                    }`}>
                      {chat.title}
                    </p>
                    <p className={`text-xs mt-1 ${
                      activeChatId === chat.id ? 'text-white/70' : 'text-text-muted'
                    }`}>
                      {formatDate(chat.updatedAt)}
                    </p>
                  </div>
                  <button
                    onClick={(e) => deleteChat(chat.id, e)}
                    className={`ml-2 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
                      activeChatId === chat.id
                        ? 'hover:bg-white/20 text-white'
                        : 'hover:bg-error/20 text-error'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {}
      <div className="flex flex-col flex-1 h-full">
        {}
        <div className="bg-[var(--color-base-background-light)] border-b border-border-muted px-6 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-[var(--color-base-background)] rounded-lg transition-colors"
            >
              {}
              <div className="w-6 h-6 flex flex-col justify-center gap-1.5">
                <span
                  className={`block h-0.5 bg-text-primary transition-all duration-300 ${
                    sidebarOpen ? 'rotate-45 translate-y-2' : ''
                  }`}
                />
                <span
                  className={`block h-0.5 bg-text-primary transition-all duration-300 ${
                    sidebarOpen ? 'opacity-0' : 'opacity-100'
                  }`}
                />
                <span
                  className={`block h-0.5 bg-text-primary transition-all duration-300 ${
                    sidebarOpen ? '-rotate-45 -translate-y-2' : ''
                  }`}
                />
              </div>
            </button>
            <div className="w-10 h-10 rounded-full bg-primary-accent flex items-center justify-center">
              <span className="text-white text-lg">🤖</span>
            </div>
            <div>
            <h2 className="text-lg font-semibold text-text-primary">Omnis Assistant</h2>
            <p className="text-sm text-text-secondary">AI-powered task automation</p>
            </div>
          </div>
        </div>

        {}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {llmInitializing && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <LoaderSmall className="mx-auto mb-4" />
                <p className="text-text-primary font-medium">Loading AI Model...</p>
                <p className="text-text-muted text-sm mt-2">This may take a few seconds</p>
              </div>
            </div>
          )}

          {!llmInitializing && !llmReady && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-error">
                <p className="font-medium">Failed to load AI model</p>
                <p className="text-sm mt-2">Please check console for details</p>
              </div>
            </div>
          )}

          {llmReady && messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] rounded-lg px-4 py-3 ${
                  message.type === 'user'
                    ? 'bg-primary-accent text-white'
                    : 'bg-[var(--color-base-background-light)] text-text-primary border border-border-muted'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                <p
                  className={`text-xs mt-1 ${
                    message.type === 'user' ? 'text-white/70' : 'text-text-muted'
                  }`}
                >
                  {formatTime(message.timestamp)}
                </p>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-[var(--color-base-background-light)] rounded-lg px-4 py-3 border border-border-muted">
                <LoaderSmall />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {}
        <div className="bg-[var(--color-base-background-light)] border-t border-border-muted p-4">
          {!apiKey ? (
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-base-background border border-border-muted rounded-lg px-4 py-3 text-text-muted cursor-not-allowed">
                API key required to start chatting
              </div>
              <ButtonPlain variant="primary" onClick={() => setApiKeyModalOpen(true)}>
                Enter API Key
              </ButtonPlain>
            </div>
          ) : (
            <form onSubmit={handleSend} className="flex gap-3">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 bg-base-background border border-border-muted rounded-lg px-4 py-3 text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary-accent focus:border-transparent transition-all"
                disabled={isTyping}
              />
              <ButtonIconed
                type="submit"
                variant="primary"
                icon={
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                }
                disabled={!input.trim() || isTyping}
              >
                Send
              </ButtonIconed>
            </form>
          )}
        </div>
      </div>

      {}
      <APIKeyModal
        isOpen={apiKeyModalOpen}
        onClose={() => setApiKeyModalOpen(false)}
        onSave={handleApiKeySave}
      />
    </div>
  );
};

export default Chat;
