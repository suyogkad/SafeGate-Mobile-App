import { api } from "../lib/api";
import type { Token, User } from "../types";

export async function login(email: string, password: string): Promise<Token> {
  const form = new URLSearchParams();
  form.set("username", email);
  form.set("password", password);
  return api.postForm<Token>("/auth/login", form);
}

export function me(): Promise<User> {
  return api.get<User>("/auth/me");
}
