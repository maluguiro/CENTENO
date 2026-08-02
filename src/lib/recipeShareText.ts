import {
  getDoughWeight,
  getHydrationPercentage,
  getIngredientDisplayBreakdown,
  getPrefermentBreakdown,
  getTotalFlour
} from "@/lib/baker";
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

  if (hydration > 0) {
    lines.push(`Hidratacion: ${formatNumber(hydration)}%`);
  }

  if (flourTotal > 0) {
    lines.push(`Harina total: ${formatNumber(flourTotal)} g`);
  }

  if (doughWeight > 0) {
    lines.push(`Masa total: ${formatNumber(doughWeight)} g`);
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

  if (recipe.notes?.trim()) {
    lines.push("");
    lines.push("Notas:");
    lines.push(recipe.notes.trim());
  }

  lines.push("");
  lines.push("Exportado desde CENTENO");

  return lines.join("\n");
}
