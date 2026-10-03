import { api } from "./api";

export interface User {
  email: string;
}

export type AuthMode = "signin" | "signup";

/** Signs in or registers; the backend sets the session cookie. */
export const authenticate = (mode: AuthMode, email: string, password: string) =>
  api<User>(`/api/auth/${mode}`, "POST", { email, password });

export const signOut = () => api<void>("/api/auth/signout", "POST");

/** The signed in user; rejects with a 401 ApiError when signed out. */
export const fetchMe = () => api<User>("/api/auth/me");
