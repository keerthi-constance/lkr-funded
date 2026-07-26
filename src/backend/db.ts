import mongoose from "mongoose";

declare global {
  // eslint-disable-next-line no-var
  var __mongooseConn: Promise<typeof mongoose> | undefined;
}

export function getDb() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("MONGO_URI environment variable is not set.");

  if (!global.__mongooseConn) {
    global.__mongooseConn = mongoose.connect(uri, {
      dbName: "funded",
      bufferCommands: false,
    });
  }
  return global.__mongooseConn;
}
