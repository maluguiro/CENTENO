import type { IngredientRole } from "@/types/recipe";

export type IngredientRoleAppearance = {
  background: string;
  dot: string;
  label: string;
  text: string;
};

export const ingredientRoleAppearance: Record<IngredientRole, IngredientRoleAppearance> = {
  flour: {
    background: "#E2DED6",
    dot: "#6F665D",
    label: "Harina / seco base",
    text: "#6F665D"
  },
  water: {
    background: "#D9E8ED",
    dot: "#5E9EB5",
    label: "Humedo",
    text: "#5E9EB5"
  },
  fat: {
    background: "#EFE3BE",
    dot: "#B58A2E",
    label: "Grasa",
    text: "#B58A2E"
  },
  salt: {
    background: "#F3F1EC",
    dot: "#9A948C",
    label: "Sal",
    text: "#9A948C"
  },
  yeast: {
    background: "#DDE8D4",
    dot: "#6E8B61",
    label: "Levadura",
    text: "#6E8B61"
  },
  sugar: {
    background: "#EBD8BA",
    dot: "#A8753A",
    label: "Azucar",
    text: "#A8753A"
  },
  sourdough: {
    background: "#D8DFCC",
    dot: "#657A50",
    label: "Masa madre",
    text: "#657A50"
  },
  preferment: {
    background: "#E8D7BD",
    dot: "#9B713D",
    label: "Prefermento",
    text: "#9B713D"
  },
  other: {
    background: "#E6E1DB",
    dot: "#7B746E",
    label: "Otro",
    text: "#7B746E"
  }
};

export const ingredientRoleLabels: Record<IngredientRole, string> = Object.fromEntries(
  Object.entries(ingredientRoleAppearance).map(([role, value]) => [role, value.label])
) as Record<IngredientRole, string>;

export function getIngredientRoleAppearance(role: IngredientRole) {
  return ingredientRoleAppearance[role];
}
