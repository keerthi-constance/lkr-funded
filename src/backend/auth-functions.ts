import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  signIn,
  signUp,
  signOut,
  getSessionUser,
  type Role,
  type SessionUser,
} from "./server/auth";

const roleEnum = z.enum(["donor", "student", "university", "admin"]);

export const login = createServerFn({ method: "POST" })
  .validator(z.object({ username: z.string().min(1), password: z.string().min(1) }))
  .handler(async ({ data }): Promise<SessionUser> => {
    return signIn(data.username, data.password);
  });

const bankDetailsInput = z.object({
  accountName: z.string().min(1),
  bankName: z.string().min(1),
  accountNumber: z.string().min(1),
  branch: z.string().min(1),
});

const registerInput = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  displayName: z.string().min(1),
  // Only donor/student/university are self-serve; admin accounts are seeded,
  // not created through the public sign-up form.
  role: z.enum(["donor", "student", "university"]),
  universityShort: z.string().optional(),
  // Required for donor/student — where milestone disbursement / auction
  // reward payout emails send money to.
  bankDetails: bankDetailsInput.optional(),
});

export const register = createServerFn({ method: "POST" })
  .validator(registerInput)
  .handler(async ({ data }): Promise<SessionUser> => {
    return signUp({
      username: data.username,
      password: data.password,
      role: data.role as Role,
      displayName: data.displayName,
      universityShort: data.role === "university" ? data.universityShort : undefined,
      bankDetails: data.role === "university" ? undefined : data.bankDetails,
    });
  });

export const logout = createServerFn({ method: "POST" }).handler(async () => {
  await signOut();
});

export const getCurrentUser = createServerFn({ method: "GET" }).handler(
  async (): Promise<SessionUser | null> => {
    return getSessionUser();
  },
);
