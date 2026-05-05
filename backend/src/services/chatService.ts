import { ObjectId } from 'mongodb';
import { HttpError } from '../utils/httpError.js';
import type { ChatMessage } from '../types.js';
import { getMongoDb } from '../repositories/mongoClient.js';
import { prisma } from '../repositories/prismaClient.js';

interface CreateChatMessageInput {
  senderUserId: string;
  senderName: string;
  senderRole: string;
  recipientUserId: string;
  text: string;
}

interface ChatMessageDocument {
  _id: ObjectId;
  conversationId: string;
  senderUserId: string;
  senderName: string;
  senderRole: string;
  recipientUserId: string;
  text: string;
  createdAt: Date;
}

const CHAT_COLLECTION = 'messages';
const MAX_CHAT_HISTORY = 50;

class ChatService {
  getConversationId(firstUserId: string, secondUserId: string): string {
    return [firstUserId, secondUserId].sort().join(':');
  }

  private toChatMessage(document: ChatMessageDocument): ChatMessage {
    return {
      id: document._id.toHexString(),
      conversationId: document.conversationId,
      senderUserId: document.senderUserId,
      senderName: document.senderName,
      senderRole: document.senderRole,
      recipientUserId: document.recipientUserId,
      text: document.text,
      createdAt: document.createdAt.toISOString(),
    };
  }

  normalizeMessageText(text: string): string {
    return text.trim();
  }

  async listConversationMessages(currentUserId: string, otherUserId: string, limit = MAX_CHAT_HISTORY): Promise<ChatMessage[]> {
    const conversationId = this.getConversationId(currentUserId, otherUserId);
    const db = await getMongoDb();
    const messages = await db.collection<ChatMessageDocument>(CHAT_COLLECTION)
      .find({ conversationId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    return messages.reverse().map((message) => this.toChatMessage(message));
  }

  async createMessage(input: CreateChatMessageInput): Promise<ChatMessage> {
    if (input.senderUserId === input.recipientUserId) {
      throw new HttpError(400, 'Direct chat requires another user.');
    }

    const recipient = await prisma.user.findUnique({
      where: { id: input.recipientUserId },
      select: { id: true },
    });

    if (!recipient) {
      throw new HttpError(404, 'Chat recipient not found');
    }

    const db = await getMongoDb();
    const text = this.normalizeMessageText(input.text);
    const conversationId = this.getConversationId(input.senderUserId, input.recipientUserId);

    const document: Omit<ChatMessageDocument, '_id'> = {
      conversationId,
      senderUserId: input.senderUserId,
      senderName: input.senderName,
      senderRole: input.senderRole,
      recipientUserId: input.recipientUserId,
      text,
      createdAt: new Date(),
    };

    const result = await db.collection<ChatMessageDocument>(CHAT_COLLECTION).insertOne(document as ChatMessageDocument);

    return this.toChatMessage({
      _id: result.insertedId,
      ...document,
    });
  }

  async deleteUserMessages(userId: string): Promise<number> {
    const db = await getMongoDb();
    const result = await db.collection<ChatMessageDocument>(CHAT_COLLECTION).deleteMany({
      $or: [
        { senderUserId: userId },
        { recipientUserId: userId },
      ],
    });

    return result.deletedCount;
  }
}

export const chatService = new ChatService();
