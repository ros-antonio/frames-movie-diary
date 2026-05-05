import { MongoClient } from 'mongodb';

const mongoUrl = process.env.MONGODB_URL ?? 'mongodb://127.0.0.1:27017';
const mongoDbName = process.env.MONGODB_DB_NAME ?? 'frames_chat_logging_chat';

let clientPromise: Promise<MongoClient> | null = null;

async function getMongoClient() {
  if (!clientPromise) {
    clientPromise = MongoClient.connect(mongoUrl);
  }

  return clientPromise;
}

export async function getMongoDb() {
  const client = await getMongoClient();
  return client.db(mongoDbName);
}

export async function closeMongoClient() {
  if (!clientPromise) {
    return;
  }

  const client = await clientPromise;
  await client.close();
  clientPromise = null;
}
