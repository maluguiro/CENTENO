import {
  buildRecipeForSharing,
  type RecipeShareScope
} from "@/lib/recipeImportExport";
import {
  getDoughWeight,
  getHydrationPercentage,
  getIngredientDisplayBreakdown,
  getPrefermentBreakdown,
  getTotalFlour
} from "@/lib/baker";
import {
  formatBakingSummary,
  formatFermentationSummary,
  formatYieldSummary,
  hasBaking,
  hasFermentation,
  hasPreparation,
  hasYieldData
} from "@/lib/recipeFields";
import { richTextToPlainText } from "@/lib/richText";
import { getLinkedRecipeDisplayName } from "@/lib/linkedRecipeDisplayName";
import type { Recipe } from "@/types/recipe";

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, "");
}

function getCategoryLabel(category?: Recipe["category"]) {
  return category === "pastry" ? "Pasteleria" : "Panaderia";
}

export function formatRecipeAsShareText(
  recipe: Recipe,
  recipes: Recipe[] = [],
  scope: RecipeShareScope = "complete"
) {
  const scopedRecipe = buildRecipeForSharing(recipe, scope);
  const recipeLookup = new Map(recipes.map((item) => [item.id, item]));
  const lines: string[] = [];
  const hydration = getHydrationPercentage(scopedRecipe.ingredients);
  const flourTotal = getTotalFlour(scopedRecipe.ingredients);
  const doughWeight = getDoughWeight(
    scopedRecipe.ingredients,
    (linkedRecipeId: string) => recipeLookup.get(linkedRecipeId),
    scopedRecipe.id
  );

  lines.push("CENTENO · Receta");
  lines.push("");
  lines.push(scopedRecipe.name);
  lines.push("");
  lines.push(`Tipo: ${getCategoryLabel(scopedRecipe.category)}`);

  if (scopedRecipe.description?.trim()) {
    lines.push(`Descripcion: ${scopedRecipe.description.trim()}`);
  }

  if (hydration > 0) {
    lines.push(`Hidratacion: ${formatNumber(hydration)}%`);
  }

  if (flourTotal > 0) {
    lines.push(`Harina total: ${formatNumber(flourTotal)} g`);
  }

  if (doughWeight > 0) {
    lines.push(`Masa total: ${formatNumber(doughWeight)} g`);
  }

  if (hasYieldData(scopedRecipe.yield)) {
    lines.push(`Rendimiento: ${formatYieldSummary(scopedRecipe.yield)}`);
  }

  lines.push("");
  lines.push("Ingredientes:");

  scopedRecipe.ingredients.forEach((ingredient) => {
    const displayBreakdown = getIngredientDisplayBreakdown(
      ingredient,
      scopedRecipe.ingredients,
      (linkedRecipeId: string) => recipeLookup.get(linkedRecipeId),
      scopedRecipe.id
    );
    const prefermentBreakdown = getPrefermentBreakdown(
      ingredient,
      (linkedRecipeId: string) => recipeLookup.get(linkedRecipeId),
      scopedRecipe.id
    );

    if (ingredient.role === "preferment") {
      lines.push(
        `• ${getLinkedRecipeDisplayName(ingredient, recipeLookup)} — ${formatNumber(ingredient.quantity)} ${ingredient.unit} · Prefermento`
      );

      if (prefermentBreakdown?.status === "resolved") {
        lines.push(
          `  Aporta ${formatNumber(prefermentBreakdown.contributedFlour)} g harina · ${formatNumber(prefermentBreakdown.contributedLiquids)} g agua · ${formatNumber(prefermentBreakdown.originalHydration)}% hidratacion`
        );
      }

      if (prefermentBreakdown?.status === "missing" || prefermentBreakdown?.status === "insufficient") {
        lines.push(`  ${prefermentBreakdown.message}`);
      }

      return;
    }

    lines.push(
      `• ${ingredient.name} — ${formatNumber(displayBreakdown.visibleQuantity)} ${ingredient.unit} · ${formatNumber(ingredient.bakerPercentage)}%`
    );

    if (displayBreakdown.detail) {
      lines.push(`  ${displayBreakdown.detail}`);
    }

    if (displayBreakdown.warning) {
      lines.push(`  ${displayBreakdown.warning}`);
    }
  });

  if (hasPreparation(scopedRecipe.preparation)) {
    lines.push("");
    lines.push("Preparacion:");
    scopedRecipe.preparation?.steps.forEach((step, index) => {
      lines.push(`${index + 1}. ${step}`);
    });
  }

  if (hasFermentation(scopedRecipe.fermentation)) {
    lines.push("");
    lines.push("Fermentacion:");
    const summary = formatFermentationSummary(scopedRecipe.fermentation);
    if (summary) {
      lines.push(summary);
    }
    if (scopedRecipe.fermentation?.instructions) {
      lines.push(scopedRecipe.fermentation.instructions);
    }
    if (scopedRecipe.fermentation?.visualCue) {
      lines.push(scopedRecipe.fermentation.visualCue);
    }
  }

  if (hasBaking(scopedRecipe.baking)) {
    lines.push("");
    lines.push("Horneado:");
    const summary = formatBakingSummary(scopedRecipe.baking);
    if (summary) {
      lines.push(summary);
    }
    if (scopedRecipe.baking?.instructions) {
      lines.push(scopedRecipe.baking.instructions);
    }
  }

  if (scopedRecipe.notes?.trim()) {
    lines.push("");
    lines.push("Notas:");
    lines.push(richTextToPlainText(scopedRecipe.notes));
  }

  lines.push("");
  lines.push("Exportado desde CENTENO");

  return lines.join("\n");
}
