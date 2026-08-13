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
import type { Recipe } from "@/types/recipe";

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, "");
}

function getCategoryLabel(category?: Recipe["category"]) {
  return category === "pastry" ? "Pasteleria" : "Panaderia";
}

export function formatRecipeAsShareText(
  recipe: Recipe,
  recipes: Recipe[] = []
) {
  const recipeLookup = new Map(recipes.map((item) => [item.id, item]));
  const lines: string[] = [];
  const hydration = getHydrationPercentage(recipe.ingredients);
  const flourTotal = getTotalFlour(recipe.ingredients);
  const doughWeight = getDoughWeight(
    recipe.ingredients,
    (linkedRecipeId) => recipeLookup.get(linkedRecipeId),
    recipe.id
  );

  lines.push("CENTENO · Receta");
  lines.push("");
  lines.push(recipe.name);
  lines.push("");
  lines.push(`Tipo: ${getCategoryLabel(recipe.category)}`);

  if (recipe.description?.trim()) {
    lines.push(`Descripcion: ${recipe.description.trim()}`);
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

  if (hasYieldData(recipe.yield)) {
    lines.push(`Rendimiento: ${formatYieldSummary(recipe.yield)}`);
  }

  lines.push("");
  lines.push("Ingredientes:");

  recipe.ingredients.forEach((ingredient) => {
    const displayBreakdown = getIngredientDisplayBreakdown(
      ingredient,
      recipe.ingredients,
      (linkedRecipeId) => recipeLookup.get(linkedRecipeId),
      recipe.id
    );
    const prefermentBreakdown = getPrefermentBreakdown(
      ingredient,
      (linkedRecipeId) => recipeLookup.get(linkedRecipeId),
      recipe.id
    );

    if (ingredient.role === "preferment") {
      lines.push(
        `• ${ingredient.name} — ${formatNumber(ingredient.quantity)} ${ingredient.unit} · Prefermento`
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

  if (hasPreparation(recipe.preparation)) {
    lines.push("");
    lines.push("Preparacion:");
    recipe.preparation?.steps.forEach((step, index) => {
      lines.push(`${index + 1}. ${step}`);
    });
  }

  if (hasFermentation(recipe.fermentation)) {
    lines.push("");
    lines.push("Fermentacion:");
    const summary = formatFermentationSummary(recipe.fermentation);
    if (summary) {
      lines.push(summary);
    }
    if (recipe.fermentation?.instructions) {
      lines.push(recipe.fermentation.instructions);
    }
    if (recipe.fermentation?.visualCue) {
      lines.push(recipe.fermentation.visualCue);
    }
  }

  if (hasBaking(recipe.baking)) {
    lines.push("");
    lines.push("Horneado:");
    const summary = formatBakingSummary(recipe.baking);
    if (summary) {
      lines.push(summary);
    }
    if (recipe.baking?.instructions) {
      lines.push(recipe.baking.instructions);
    }
  }

  if (recipe.notes?.trim()) {
    lines.push("");
    lines.push("Notas:");
    lines.push(richTextToPlainText(recipe.notes));
  }

  lines.push("");
  lines.push("Exportado desde CENTENO");

  return lines.join("\n");
}
