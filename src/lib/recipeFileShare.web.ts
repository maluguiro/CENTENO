import {
  exportRecipeToJson,
  exportRecipesToJson,
  type RecipeShareScope
} from "@/lib/recipeImportExport";
import type { Recipe } from "@/types/recipe";

const FALLBACK_FILE_BASENAME = "receta-centeno";
const FALLBACK_BACKUP_FILE_BASENAME = "centeno-recetas";
const CENTENO_MIME_TYPE = "application/json";

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

function createBlobUrl(content: string) {
  if (typeof URL === "undefined" || typeof URL.createObjectURL !== "function") {
    throw new Error("FILE_EXPORT_UNAVAILABLE");
  }

  return URL.createObjectURL(new Blob([content], { type: CENTENO_MIME_TYPE }));
}

function downloadBlobUrl(blobUrl: string, fileName: string) {
  if (typeof document === "undefined") {
    throw new Error("FILE_EXPORT_UNAVAILABLE");
  }

  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = fileName;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 0);
}

export function buildCentenoFileName(recipeName: string) {
  return `${normalizeFileBaseName(recipeName)}.centeno`;
}

export function buildCentenoBackupFileName(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${normalizeFileBaseName(`${FALLBACK_BACKUP_FILE_BASENAME}-${year}-${month}-${day}`)}.centeno`;
}

export async function createCentenoRecipeFile(
  recipe: Recipe,
  scope: RecipeShareScope = "complete"
) {
  return createBlobUrl(exportRecipeToJson(recipe, scope));
}

export async function createCentenoRecipesBackupFile(recipes: Recipe[]) {
  return createBlobUrl(exportRecipesToJson(recipes));
}

export async function shareCentenoRecipeFile(
  recipe: Recipe,
  scope: RecipeShareScope = "complete"
) {
  downloadBlobUrl(await createCentenoRecipeFile(recipe, scope), buildCentenoFileName(recipe.name));
}

export async function shareCentenoRecipesBackupFile(recipes: Recipe[]) {
  downloadBlobUrl(await createCentenoRecipesBackupFile(recipes), buildCentenoBackupFileName());
}

type WebDocumentPickerAsset = {
  file?: { text?: () => Promise<string> };
  name?: string | null;
  uri?: string;
};

export async function pickCentenoRecipeFileContent() {
  const documentPicker = getDocumentPickerModule();

  if (!documentPicker?.getDocumentAsync) {
    throw new Error("FILE_IMPORT_UNAVAILABLE");
  }

  const result = await documentPicker.getDocumentAsync({
    type: ["application/json", "text/plain", "application/octet-stream", "application/*", "*/*"],
    copyToCacheDirectory: false,
    multiple: false
  });

  if (result.canceled) {
    return { status: "cancel" as const };
  }

  const asset = result.assets?.[0] as WebDocumentPickerAsset | undefined;

  if (!asset) {
    throw new Error("FILE_PICK_INVALID");
  }

  if (asset.file?.text) {
    return {
      status: "success" as const,
      content: await asset.file.text(),
      fileName: asset.name ?? buildCentenoFileName("")
    };
  }

  if (asset.uri) {
    const response = await fetch(asset.uri);

    if (response.ok) {
      return {
        status: "success" as const,
        content: await response.text(),
        fileName: asset.name ?? buildCentenoFileName("")
      };
    }
  }

  throw new Error("FILE_READ_UNAVAILABLE");
}
