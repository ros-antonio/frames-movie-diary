import { ArrowLeft, MessageCircle, SendHorizonal } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { movieDiaryApi } from '../api/movieDiaryApi';
import type { ChatMessage, ChatUser } from '../types';

interface ChatPageProps {
  onBack: () => void;
}

type ChatSocketEvent =
  | { type: 'chat_message'; message: ChatMessage }
  | { type: 'error'; message: string };

function mergeMessagesById(existing: ChatMessage[], incoming: ChatMessage[]) {
  const messagesById = new Map(existing.map((message) => [message.id, message]));

  incoming.forEach((message) => {
    messagesById.set(message.id, message);
  });

  return Array.from(messagesById.values()).sort((left, right) =>
    new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
  );
}

export function ChatPage({ onBack }: ChatPageProps) {
  const [chatUsers, setChatUsers] = useState<ChatUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draftMessage, setDraftMessage] = useState('');
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const selectedUserIdRef = useRef<string | null>(null);
  const hasConnectedRef = useRef(false);
  const connectionWarningTimeoutRef = useRef<number | null>(null);
  const currentUserId = localStorage.getItem('userId');

  useEffect(() => {
    selectedUserIdRef.current = selectedUserId;
  }, [selectedUserId]);

  useEffect(() => {
    let isMounted = true;

    async function loadChatUsers() {
      try {
        const users = await movieDiaryApi.getChatUsers();

        if (!isMounted) {
          return;
        }

        setChatUsers(users);
        setSelectedUserId((currentSelectedUserId) => currentSelectedUserId ?? users[0]?.id ?? null);
      } catch (loadError: unknown) {
        if (isMounted) {
          setError(loadError instanceof Error ? loadError.message : 'Could not load chat users.');
        }
      }
    }

    void loadChatUsers();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadConversation() {
      if (!selectedUserId) {
        setMessages([]);
        return;
      }

      try {
        const nextMessages = await movieDiaryApi.getChatMessages(selectedUserId);

        if (isMounted) {
          setMessages(nextMessages);
          setError(null);
        }
      } catch (loadError: unknown) {
        if (isMounted) {
          setError(loadError instanceof Error ? loadError.message : 'Could not load conversation.');
        }
      }
    }

    void loadConversation();

    return () => {
      isMounted = false;
    };
  }, [selectedUserId]);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const socket = new WebSocket(`${protocol}://${window.location.host}/ws/chat`);
    socketRef.current = socket;

    const clearPendingConnectionWarning = () => {
      if (connectionWarningTimeoutRef.current !== null) {
        window.clearTimeout(connectionWarningTimeoutRef.current);
        connectionWarningTimeoutRef.current = null;
      }
    };

    const scheduleConnectionWarning = (message: string) => {
      clearPendingConnectionWarning();
      connectionWarningTimeoutRef.current = window.setTimeout(() => {
        setError(message);
        connectionWarningTimeoutRef.current = null;
      }, 600);
    };

    socket.addEventListener('open', () => {
      clearPendingConnectionWarning();
      hasConnectedRef.current = true;
      setConnectionState('connected');
      setError(null);
    });

    socket.addEventListener('message', (event) => {
      try {
        const payload = JSON.parse(event.data) as ChatSocketEvent;

        if (payload.type === 'chat_message') {
          setMessages((previous) => {
            const activeUserId = selectedUserIdRef.current;

            if (!activeUserId) {
              return previous;
            }

            const isConversationMessage =
              payload.message.senderUserId === activeUserId
              || payload.message.recipientUserId === activeUserId;

            return isConversationMessage ? mergeMessagesById(previous, [payload.message]) : previous;
          });
          return;
        }

        if (payload.type === 'error') {
          setError(payload.message);
        }
      } catch {
        setError('Could not read chat message from the server.');
      }
    });

    socket.addEventListener('close', () => {
      setConnectionState('disconnected');
      scheduleConnectionWarning(hasConnectedRef.current ? 'Chat connection was lost.' : 'Could not connect to chat.');
    });

    socket.addEventListener('error', () => {
      if (hasConnectedRef.current) {
        scheduleConnectionWarning('Chat connection failed.');
      }
    });

    return () => {
      clearPendingConnectionWarning();
      socket.close();
    };
  }, []);

  useEffect(() => {
    if (typeof messagesEndRef.current?.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const text = draftMessage.trim();

    if (!text) {
      return;
    }

    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      setError('Chat is not connected yet.');
      return;
    }

    if (!selectedUserId) {
      setError('Choose a user to start chatting.');
      return;
    }

    socketRef.current.send(JSON.stringify({
      type: 'send_message',
      recipientUserId: selectedUserId,
      text,
    }));
    setDraftMessage('');
  }

  function handleComposerKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();

      const form = event.currentTarget.form;
      if (form) {
        form.requestSubmit();
      }
    }
  }

  const selectedUser = chatUsers.find((user) => user.id === selectedUserId) ?? null;

  return (
    <div className="h-screen overflow-hidden bg-[#261834] p-8 text-[#B9A5D2]">
      <div className="mx-auto flex h-full max-w-5xl flex-col gap-6">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center text-[#B9A5D2] transition-colors hover:text-[#E0BAAA]"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Diary
        </button>

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <MessageCircle className="h-8 w-8 text-[#E0BAAA]" />
            <div>
              <h1 className="text-4xl font-bold">Live Chat</h1>
              <p className="text-sm opacity-80">Private one-to-one chat for logged-in users.</p>
            </div>
          </div>
          <span className="rounded-md border border-[#E0BAAA] px-3 py-1 text-sm text-[#E0BAAA]">
            {connectionState === 'connected' ? 'Connected' : connectionState === 'connecting' ? 'Connecting' : 'Disconnected'}
          </span>
        </div>

        {error && (
          <div role="alert" className="rounded-lg border border-red-500/60 bg-red-900/80 p-4 text-red-100">
            {error}
          </div>
        )}

        <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
          <aside className="overflow-hidden rounded-3xl border border-[#E0BAAA]/20 bg-[linear-gradient(180deg,rgba(34,54,98,0.96),rgba(24,39,71,0.96))] shadow-2xl">
            <div className="border-b border-[#B9A5D2]/15 px-5 py-4">
              <h2 className="text-lg font-semibold text-[#E0BAAA]">People</h2>
              <p className="mt-1 text-sm opacity-80">Choose exactly one user to open a private conversation.</p>
            </div>
            <div className="space-y-2 px-3 py-3">
              {chatUsers.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => setSelectedUserId(user.id)}
                  className={`w-full rounded-2xl border px-4 py-3 text-left transition-colors ${
                    selectedUserId === user.id
                      ? 'border-[#E0BAAA] bg-[#E0BAAA]/10'
                      : 'border-transparent hover:border-[#B9A5D2]/20 hover:bg-[#FFFFFF]/5'
                  }`}
                >
                  <div className="font-semibold">{user.name}</div>
                  <div className="text-sm opacity-75">{user.email}</div>
                  <div className="mt-1 text-xs uppercase tracking-[0.2em] opacity-70">{user.role}</div>
                </button>
              ))}
              {chatUsers.length === 0 && (
                <div className="rounded-2xl border border-dashed border-[#B9A5D2]/20 bg-[#261834]/40 p-5 text-sm opacity-75">
                  No other users are available for private chat yet.
                </div>
              )}
            </div>
          </aside>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-[#E0BAAA]/20 bg-[linear-gradient(180deg,rgba(34,54,98,0.96),rgba(24,39,71,0.96))] shadow-2xl">
            <div className="border-b border-[#B9A5D2]/15 px-5 py-4 text-sm opacity-80">
              {selectedUser
                ? `Private conversation with ${selectedUser.name}. Messages are stored in MongoDB and delivered in real time.`
                : 'Choose a user from the left to start a private conversation.'}
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
              {selectedUserId && messages.length === 0 && (
                <div className="rounded-2xl border border-dashed border-[#B9A5D2]/20 bg-[#261834]/40 p-6 text-center text-sm opacity-75">
                  No messages yet with this user. Send the first message to start the conversation.
                </div>
              )}

              {!selectedUserId && (
                <div className="rounded-2xl border border-dashed border-[#B9A5D2]/20 bg-[#261834]/40 p-6 text-center text-sm opacity-75">
                  Select a person to open a direct message thread.
                </div>
              )}

              {messages.map((message) => {
                const isCurrentUser = message.senderUserId === currentUserId;

                return (
                  <div
                    key={message.id}
                    className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-3xl px-4 py-3 shadow-lg ${
                        isCurrentUser
                          ? 'bg-[#E0BAAA] text-[#261834]'
                          : 'bg-[#1C2D52] text-[#E9E2F5]'
                      }`}
                    >
                      <div className={`mb-1 flex items-center gap-2 text-xs ${isCurrentUser ? 'text-[#4C3659]' : 'text-[#CBBDE2]'}`}>
                        <span className="font-semibold">{message.senderName}</span>
                        <span>{message.senderRole}</span>
                        <span>{new Date(message.createdAt).toLocaleTimeString()}</span>
                      </div>
                      <p className="whitespace-pre-wrap break-words break-all text-sm leading-6">{message.text}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSubmit} className="border-t border-[#B9A5D2]/15 bg-[#1A2948]/80 p-4">
              <div className="flex gap-3">
                <textarea
                  value={draftMessage}
                  onChange={(event) => setDraftMessage(event.target.value)}
                  onKeyDown={handleComposerKeyDown}
                  rows={2}
                  maxLength={500}
                  placeholder={selectedUser ? `Write a private message to ${selectedUser.name}...` : 'Choose a user before sending a message...'}
                  className="min-h-[3.5rem] flex-1 resize-none rounded-2xl border border-[#B9A5D2]/20 bg-[#0F1930] px-4 py-3 text-sm text-[#E9E2F5] outline-none transition-colors focus:border-[#E0BAAA]"
                />
                <button
                  type="submit"
                  disabled={connectionState !== 'connected' || !selectedUserId}
                  className="inline-flex items-center justify-center rounded-2xl bg-[#E0BAAA] px-5 text-sm font-semibold text-[#261834] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <SendHorizonal className="mr-2 h-4 w-4" />
                  Send
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
