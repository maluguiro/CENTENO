type ClipboardModule = {
  getStringAsync?: () => Promise<string>;
  setStringAsync?: (value: string) => Promise<void>;
};

function getClipboardModule(): ClipboardModule | null {
  try {
    const module = require("expo-clipboard") as {
      default?: ClipboardModule;
      getStringAsync?: () => Promise<string>;
      setStringAsync?: (value: string) => Promise<void>;
    };

    if (module.default) {
      return module.default;
    }

    return {
      getStringAsync: module.getStringAsync,
      setStringAsync: module.setStringAsync
    };
  } catch {
    return null;
  }
}

export function isClipboardAvailable() {
  const module = getClipboardModule();
  return !!module?.getStringAsync && !!module?.setStringAsync;
}

export async function getClipboardText() {
  const module = getClipboardModule();

  if (!module?.getStringAsync) {
    return null;
  }

  return module.getStringAsync();
}

export async function setClipboardText(value: string) {
  const module = getClipboardModule();

  if (!module?.setStringAsync) {
    return false;
  }

  await module.setStringAsync(value);
  return true;
}
