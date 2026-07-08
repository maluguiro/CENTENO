import type { IngredientRole } from "@/types/recipe";

export const ingredientRoleLabels: Record<IngredientRole, string> = {
  flour: "Harina / seco base",
  water: "Humedo",
  salt: "Sal",
  yeast: "Levadura",
  sourdough: "Masa madre",
  preferment: "Prefermento",
  sugar: "Azucar",
  fat: "Grasa",
  other: "Otro"
};
