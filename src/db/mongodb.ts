import { MongoClient, Db, ObjectId } from 'mongodb';
import fs from 'fs';
import path from 'path';

let client: MongoClient | null = null;
let db: Db | null = null;
let isConnected = false;
let connectionError: string | null = null;

// Persistent local fallbacks for high-reliability offline testing
const FALLBACK_FILE = path.join(process.cwd(), 'local_fallback_db.json');

const localData = loadFallbackData();
const localResults: any[] = localData.results;
const localQuestionPapers: any[] = localData.papers;

function loadFallbackData() {
  try {
    if (fs.existsSync(FALLBACK_FILE)) {
      const data = JSON.parse(fs.readFileSync(FALLBACK_FILE, 'utf-8'));
      return {
        results: Array.isArray(data.results) ? data.results : [],
        papers: Array.isArray(data.papers) ? data.papers : []
      };
    }
  } catch (e) {
    console.warn('[MongoDB Fallback] Failed to load local backup:', e);
  }
  return { results: [], papers: [] };
}

function saveFallbackData() {
  try {
    fs.writeFileSync(FALLBACK_FILE, JSON.stringify({
      results: localResults,
      papers: localQuestionPapers
    }, null, 2), 'utf-8');
  } catch (e) {
    console.warn('[MongoDB Fallback] Failed to write local backup:', e);
  }
}

export interface DbStatus {
  connected: boolean;
  usingFallback: boolean;
  uriProvided: boolean;
  error: string | null;
  resultsCount: number;
  papersCount: number;
}

/**
 * Lazily initializes and returns the MongoDB database instance.
 * Gracefully returns null if MONGODB_URI is not set or connection fails.
 */
export async function getDb(): Promise<Db | null> {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    connectionError = 'MONGODB_URI environment variable is missing.';
    isConnected = false;
    return null;
  }

  if (db && isConnected) {
    return db;
  }

  try {
    console.log('[MongoDB] Initializing database connection...');
    client = new MongoClient(uri, {
      connectTimeoutMS: 5000,
      socketTimeoutMS: 5000,
    });
    
    await client.connect();
    // Use the database name specified in the URI or default to 'cbt_exam_engine'
    const urlParts = uri.split('/');
    const pathPart = urlParts.length > 3 ? urlParts.slice(3).join('/').split('?')[0] : '';
    const dbName = pathPart && pathPart.trim() !== '' ? pathPart : 'cbt_exam_engine';
    db = client.db(dbName);
    isConnected = true;
    connectionError = null;
    console.log(`[MongoDB] Connected successfully to database: "${dbName}"`);
    return db;
  } catch (error: any) {
    console.error('[MongoDB] Connection failed:', error);
    connectionError = error.message || String(error);
    isConnected = false;
    db = null;
    return null;
  }
}

/**
 * Programmatically resets the current cached connection, allowing the client to reconnect using a new or updated MONGODB_URI.
 */
export async function resetConnection(newUri?: string): Promise<boolean> {
  try {
    if (client) {
      await client.close();
    }
  } catch (e) {
    console.warn('[MongoDB] Error closing existing client:', e);
  }
  
  client = null;
  db = null;
  isConnected = false;
  connectionError = null;

  if (newUri) {
    process.env.MONGODB_URI = newUri;
  }
  
  // Try to connect with the new configuration
  await getDb();
  return isConnected;
}

/**
 * Retrieve database connection and statistics status.
 */
export async function getDbStatus(): Promise<DbStatus> {
  const uriProvided = !!process.env.MONGODB_URI;
  const database = await getDb();
  
  let resultsCount = localResults.length;
  let papersCount = localQuestionPapers.length;

  if (database && isConnected) {
    try {
      resultsCount = await database.collection('exam_results').countDocuments();
      papersCount = await database.collection('question_papers').countDocuments();
    } catch (e) {
      console.error('[MongoDB] Failed to retrieve collection counts:', e);
    }
  }

  return {
    connected: isConnected,
    usingFallback: !isConnected,
    uriProvided,
    error: connectionError,
    resultsCount,
    papersCount,
  };
}

/**
 * Saves a completed exam result.
 */
export async function saveExamResult(result: any): Promise<any> {
  const database = await getDb();
  const document = {
    ...result,
    createdAt: new Date(),
  };

  if (database && isConnected) {
    const col = database.collection('exam_results');
    const res = await col.insertOne(document);
    return { ...document, _id: res.insertedId, savedToCloud: true };
  } else {
    console.warn('[MongoDB] Using fallback local storage to save exam result.');
    const mockId = `mock-res-${Date.now()}`;
    const mockDoc = { ...document, _id: mockId, savedToCloud: false };
    localResults.unshift(mockDoc);
    saveFallbackData();
    return mockDoc;
  }
}

/**
 * Retrieves all saved exam results, sorted by newest.
 */
export async function getExamResults(): Promise<any[]> {
  const database = await getDb();

  if (database && isConnected) {
    const col = database.collection('exam_results');
    return await col.find({}).sort({ createdAt: -1 }).toArray();
  } else {
    return localResults;
  }
}

/**
 * Deletes an exam result by ID.
 */
export async function deleteExamResult(id: string): Promise<boolean> {
  const database = await getDb();

  let localDeleted = false;
  const index = localResults.findIndex(r => r._id === id || r.id === id);
  if (index !== -1) {
    localResults.splice(index, 1);
    saveFallbackData();
    localDeleted = true;
  }

  if (database && isConnected) {
    const col = database.collection('exam_results');
    let dbDeleted = false;
    try {
      const res = await col.deleteOne({ _id: new ObjectId(id) });
      if (res.deletedCount > 0) dbDeleted = true;
    } catch (_) {}

    if (!dbDeleted) {
      try {
        const res = await col.deleteOne({ $or: [{ _id: id as any }, { id: id }] });
        if (res.deletedCount > 0) dbDeleted = true;
      } catch (_) {}
    }
    return dbDeleted || localDeleted;
  }

  return localDeleted;
}

/**
 * Saves a generated question paper / PDF parse.
 */
export async function saveQuestionPaper(paper: any): Promise<any> {
  const database = await getDb();
  const document = {
    ...paper,
    createdAt: new Date(),
  };

  if (database && isConnected) {
    const col = database.collection('question_papers');
    const res = await col.insertOne(document);
    return { ...document, _id: res.insertedId, savedToCloud: true };
  } else {
    console.warn('[MongoDB] Using fallback local storage to save question paper.');
    const mockId = `mock-paper-${Date.now()}`;
    const mockDoc = { ...document, _id: mockId, savedToCloud: false };
    localQuestionPapers.unshift(mockDoc);
    saveFallbackData();
    return mockDoc;
  }
}

/**
 * Retrieves all saved question papers.
 */
export async function getQuestionPapers(): Promise<any[]> {
  const database = await getDb();

  if (database && isConnected) {
    const col = database.collection('question_papers');
    return await col.find({}).sort({ createdAt: -1 }).toArray();
  } else {
    return localQuestionPapers;
  }
}

/**
 * Deletes a question paper by ID.
 */
export async function deleteQuestionPaper(id: string): Promise<boolean> {
  const database = await getDb();

  if (database && isConnected) {
    const col = database.collection('question_papers');
    try {
      const res = await col.deleteOne({ _id: new ObjectId(id) });
      if (res.deletedCount > 0) return true;
    } catch (_) {
      const res = await col.deleteOne({ _id: id as any });
      if (res.deletedCount > 0) return true;
    }
    return false;
  } else {
    const index = localQuestionPapers.findIndex(p => p._id === id || p.id === id);
    if (index !== -1) {
      localQuestionPapers.splice(index, 1);
      saveFallbackData();
      return true;
    }
    return false;
  }
}

/**
 * Clears all exam results in the database and fallback storage.
 */
export async function clearAllExamResults(): Promise<boolean> {
  const database = await getDb();
  
  localResults.length = 0;
  saveFallbackData();

  if (database && isConnected) {
    const col = database.collection('exam_results');
    await col.deleteMany({});
    return true;
  }
  return true;
}

/**
 * Updates a question paper's topic/name.
 */
export async function updateQuestionPaperTopic(id: string, newTopic: string): Promise<boolean> {
  const database = await getDb();

  if (database && isConnected) {
    const col = database.collection('question_papers');
    try {
      let res = await col.updateOne({ _id: new ObjectId(id) }, { $set: { topic: newTopic } });
      if (res.modifiedCount > 0) return true;
    } catch (_) {
      let res = await col.updateOne({ _id: id as any }, { $set: { topic: newTopic } });
      if (res.modifiedCount > 0) return true;
    }
    return false;
  } else {
    const index = localQuestionPapers.findIndex(p => p._id === id || p.id === id);
    if (index !== -1) {
      localQuestionPapers[index].topic = newTopic;
      saveFallbackData();
      return true;
    }
    return false;
  }
}

