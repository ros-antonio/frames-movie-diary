import type { CustomList, Movie } from '../types.js';

export interface StoredUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
}

class InMemoryStore {
  public movies = new Map<string, Movie>();
  public customLists = new Map<string, CustomList>();
  public users = new Map<string, StoredUser>();
  public userIdByEmail = new Map<string, string>();

  reset(): void {
    this.movies.clear();
    this.customLists.clear();
    this.users.clear();
    this.userIdByEmail.clear();
  }
}

export const store = new InMemoryStore();

