import { v4 as uuid } from "uuid";
import { db } from "./db";
import type { Client } from "@/types/client";

export const listClients = () => db.clients.orderBy("createdAt").reverse().toArray();

export const getClient = (id: string) => db.clients.get(id);

export const createClient = (input: Omit<Client, "id" | "createdAt">) =>
  db.clients.put({ ...input, id: uuid(), createdAt: new Date().toISOString() });

export const updateClient = (id: string, patch: Partial<Client>) =>
  db.clients.update(id, patch);

export const deleteClient = (id: string) => db.clients.delete(id);
