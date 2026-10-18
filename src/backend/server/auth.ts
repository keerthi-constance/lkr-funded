// Server-only auth: password hashing + session cookie management. Same
// `server/` import-protection boundary as payhere.ts/ledger.ts — password
// hashes and the session secret must never reach the client bundle.
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { useSession } from "@tanstack/react-start/server";
import { getDb } from "../db";
import { UserModel } from "../models";

const SCRYPT_KEYLEN = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, SCRYPT_KEYLEN).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const hashBuf = Buffer.from(hash, "hex");
  const candidateBuf = scryptSync(password, salt, SCRYPT_KEYLEN);
  if (hashBuf.length !== candidateBuf.length) return false;
  return timingSafeEqual(hashBuf, candidateBuf);
}

export type Role = "donor" | "student" | "university" | "admin";

export type SessionUser = {
  userId: string;
  username: string;
  role: Role;
  displayName: string;
  projectSlug?: string;
  universityShort?: string;
};

type SessionShape = { user?: SessionUser };

function sessionConfig() {
  const password = process.env.SESSION_SECRET;
  if (!password || password.length < 32) {
    throw new Error("SESSION_SECRET must be set to a string of at least 32 characters.");
  }
  return {
    password,
    name: "funded_session",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    cookie: { httpOnly: true as const, sameSite: "lax" as const, path: "/" },
  };
}

function toSessionUser(doc: {
  _id: unknown;
  username: string;
  role: Role;
  displayName: string;
  projectSlug?: string;
  universityShort?: string;
}): SessionUser {
  return {
    userId: String(doc._id),
    username: doc.username,
    role: doc.role,
    displayName: doc.displayName,
    projectSlug: doc.projectSlug,
    universityShort: doc.universityShort,
  };
}

export async function signIn(username: string, password: string): Promise<SessionUser> {
  await getDb();
  const user = await UserModel.findOne({ username: username.toLowerCase().trim() });
  if (!user || !verifyPassword(password, user.passwordHash)) {
    throw new Error("Incorrect username or password.");
  }
  const sessionUser = toSessionUser(user);
  const session = await useSession<SessionShape>(sessionConfig());
  await session.update({ user: sessionUser });
  return sessionUser;
}

export type BankDetails = {
  accountName: string;
  bankName: string;
  accountNumber: string;
  branch: string;
};

export async function signUp(params: {
  username: string;
  password: string;
  role: Role;
  displayName: string;
  projectSlug?: string;
  universityShort?: string;
  bankDetails?: BankDetails;
}): Promise<SessionUser> {
  await getDb();
  const username = params.username.toLowerCase().trim();
  if (!/^[a-z0-9_-]{3,32}$/.test(username)) {
    throw new Error("Username must be 3-32 characters: letters, numbers, - or _ only.");
  }
  if (params.password.length < 4) {
    throw new Error("Password must be at least 4 characters.");
  }
  if (
    (params.role === "donor" || params.role === "student") &&
    (!params.bankDetails?.accountName ||
      !params.bankDetails?.bankName ||
      !params.bankDetails?.accountNumber ||
      !params.bankDetails?.branch)
  ) {
    throw new Error("Bank details are required so payouts/rewards can be sent to you.");
  }
  const existing = await UserModel.findOne({ username });
  if (existing) throw new Error("That username is already taken.");

  const passwordHash = hashPassword(params.password);
  const created = await UserModel.create({
    username,
    passwordHash,
    role: params.role,
    displayName: params.displayName.trim() || username,
    projectSlug: params.projectSlug,
    universityShort: params.universityShort,
    bankDetails: params.bankDetails,
  });
  const sessionUser = toSessionUser(created);
  const session = await useSession<SessionShape>(sessionConfig());
  await session.update({ user: sessionUser });
  return sessionUser;
}

export async function signOut(): Promise<void> {
  const session = await useSession<SessionShape>(sessionConfig());
  await session.clear();
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await useSession<SessionShape>(sessionConfig());
  return session.data.user ?? null;
}

// The session cookie holds a snapshot of the user taken at login/signup —
// it doesn't automatically pick up later DB changes (e.g. a student linking
// their first project). Call this right after such a change so the current
// session reflects it without requiring a fresh login.
export async function patchSessionUser(patch: Partial<SessionUser>): Promise<void> {
  const session = await useSession<SessionShape>(sessionConfig());
  if (!session.data.user) return;
  await session.update({ user: { ...session.data.user, ...patch } });
}
