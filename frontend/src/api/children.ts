import { api } from "../lib/api";
import type { Child } from "../types";

export function listChildren(): Promise<Child[]> {
  return api.get<Child[]>("/children");
}

export function getChild(id: string): Promise<Child> {
  return api.get<Child>(`/children/${id}`);
}
