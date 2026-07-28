import { exportRecipeToJson } from "@/lib/recipeImportExport";
import type { Recipe } from "@/types/recipe";

const FALLBACK_FILE_BASENAME = "receta-centeno";

function getFileSystemModule() {
  try {
    return require("expo-file-system/legacy") as typeof import("expo-file-system/legacy");
  } catch {
    return null;
  }
}

function getSharingModule() {
  try {
    return require("expo-sharing") as typeof import("expo-sharing");
  } catch {
    return null;
  }
}

function getDocumentPickerModule() {
  try {
    return require("expo-document-picker") as typeof import("expo-document-picker");
  } catch {
    return null;
  }
}

function normalizeFileBaseName(value: string) {
  const sanitized = value
    .trim()
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[.\-_]+|[.\-_]+$/g, "");

  return sanitized || FALLBACK_FILE_BASENAME;
}

export function buildCentenoFileName(recipeName: string) {
  return `${normalizeFileBaseName(recipeName)}.centeno`;
}

export async function createCentenoRecipeFile(recipe: Recipe) {
  const fileSystem = getFileSystemModule();

  if (!fileSystem?.cacheDirectory || !fileSystem.writeAsStringAsync) {
    throw new Error("FILE_SYSTEM_UNAVAILABLE");
  }

  const fileUri = `${fileSystem.cacheDirectory}${buildCentenoFileName(recipe.name)}`;
  await fileSystem.writeAsStringAsync(fileUri, exportRecipeToJson(recipe));

  return fileUri;
}

export async function shareCentenoRecipeFile(recipe: Recipe) {
  const sharing = getSharingModule();

  if (!sharing?.isAvailableAsync || !sharing?.shareAsync) {
    throw new Error("SHARING_UNAVAILABLE");
  }

  const available = await sharing.isAvailableAsync();

  if (!available) {
    throw new Error("SHARING_UNAVAILABLE");
  }

  const fileUri = await createCentenoRecipeFile(recipe);

  await sharing.shareAsync(fileUri, {
    dialogTitle: "Compartir archivo CENTENO",
    mimeType: "application/json",
    UTI: "public.json"
  });
}

export async function pickCentenoRecipeFileContent() {
  const documentPicker = getDocumentPickerModule();
  const fileSystem = getFileSystemModule();

  if (!documentPicker?.getDocumentAsync || !fileSystem?.readAsStringAsync) {
    throw new Error("FILE_IMPORT_UNAVAILABLE");
  }

  const result = await documentPicker.getDocumentAsync({
    type: [
      "application/json",
      "text/plain",
      "application/octet-stream",
      "application/*",
      "*/*"
    ],
    copyToCacheDirectory: true,
    multiple: false
  });

  if (result.canceled) {
    return { status: "cancel" as const };
  }

  const asset = result.assets?.[0];

  if (!asset?.uri) {
    throw new Error("FILE_PICK_INVALID");
  }

  const content = await fileSystem.readAsStringAsync(asset.uri);

  return {
    status: "success" as const,
    content,
    fileName: asset.name ?? buildCentenoFileName("")
  };
}
