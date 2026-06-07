import { MongoClient, type Db } from "mongodb";

let usersDb: Db;
let toolsDb: Db;

export async function connectDatabases(): Promise<void> {
  const [usersClient, toolsClient] = await Promise.all([
    new MongoClient(process.env.MONGO_URI_USERS!).connect(),
    new MongoClient(process.env.MONGO_URI_TOOLS!).connect(),
  ]);
  usersDb = usersClient.db("pulse_users");
  toolsDb = toolsClient.db("pulse_tools");
}

export const getUsersDb = (): Db => usersDb;
export const getToolsDb = (): Db => toolsDb;
