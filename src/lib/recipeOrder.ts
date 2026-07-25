import type { RecipeIngredient } from "@/types/recipe";

export type MoveDirection = "up" | "down";

export function moveIngredientInList(
  ingredients: RecipeIngredient[],
  ingredientId: string,
  direction: MoveDirection
) {
  const currentIndex = ingredients.findIndex((ingredient) => ingredient.id === ingredientId);

  if (currentIndex === -1) {
    return ingredients;
  }

  const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

  if (targetIndex < 0 || targetIndex >= ingredients.length) {
    return ingredients;
  }

  const nextIngredients = [...ingredients];
  const [movedIngredient] = nextIngredients.splice(currentIndex, 1);
  nextIngredients.splice(targetIndex, 0, movedIngredient);

  return nextIngredients;
}
