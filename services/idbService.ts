const DB_NAME = 'AuraCelestialDB';
const DB_VERSION = 1;
const STORE_NAME = 'game_data';

export const IDB = {
  db: null as IDBDatabase | null,

  async init(): Promise<void> {
    if (this.db) return;
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve();
      };
      request.onerror = (event) => {
        console.error("IDB Open Error:", event);
        reject("Could not open IndexedDB");
      };
    });
  },

  async setItem(key: string, value: any): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(value, key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  async getItem<T>(key: string): Promise<T | null> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  },

  async removeItem(key: string): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  async getAllKeys(): Promise<string[]> {
      await this.init();
      return new Promise((resolve, reject) => {
          const transaction = this.db!.transaction([STORE_NAME], 'readonly');
          const store = transaction.objectStore(STORE_NAME);
          const request = store.getAllKeys();
          request.onsuccess = () => resolve(request.result as string[]);
          request.onerror = () => reject(request.error);
      });
  }
};