type StorageLike = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
};

const GUIDE_STORAGE_KEY = "centeno.guide.seen";
const isDev =
  typeof __DEV__ !== "undefined" ? __DEV__ : process.env.NODE_ENV !== "production";

const memoryStorageState = new Map<string, string>();

const memoryStorage: StorageLike = {
  async getItem(key) {
    return memoryStorageState.get(key) ?? null;
  },
  async setItem(key, value) {
    memoryStorageState.set(key, value);
  }
};

function getStorage(): StorageLike {
  try {
    const module = require("@react-native-async-storage/async-storage");
    const asyncStorage = module?.default;

    if (
      asyncStorage &&
      typeof asyncStorage.getItem === "function" &&
      typeof asyncStorage.setItem === "function"
    ) {
      return asyncStorage as StorageLike;
    }
  } catch {
  }

  return memoryStorage;
}

const storage = getStorage();

export async function getGuideSeen() {
  try {
    const value = await storage.getItem(GUIDE_STORAGE_KEY);
    const seen = value === "true";

    if (isDev) {
      console.log(`[CENTENO] guide: ${seen ? "seen" : "first launch guide shown"}`);
    }

    return seen;
  } catch {
    if (isDev) {
      console.log("[CENTENO] guide: first launch guide shown");
    }
    return false;
  }
}

export async function setGuideSeen() {
  await storage.setItem(GUIDE_STORAGE_KEY, "true");
}

export { GUIDE_STORAGE_KEY };
