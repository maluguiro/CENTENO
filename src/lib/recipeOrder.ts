import type { RecipeIngredient } from "@/types/recipe";

export type MoveDirection = "up" | "down";

export function getPrimaryFlourIndex(ingredients: RecipeIngredient[]) {
  return ingredients.findIndex((ingredient) => ingredient.role === "flour");
}

export function canMoveIngredient(
  ingredients: RecipeIngredient[],
  ingredientId: string,
  direction: MoveDirection
) {
  const currentIndex = ingredients.findIndex((ingredient) => ingredient.id === ingredientId);

  if (currentIndex === -1) {
    return false;
  }

  const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

  if (targetIndex < 0 || targetIndex >= ingredients.length) {
    return false;
  }

  const primaryFlourIndex = getPrimaryFlourIndex(ingredients);

  if (primaryFlourIndex === -1) {
    return true;
  }

  if (currentIndex === primaryFlourIndex && direction === "down") {
    return false;
  }

  if (
    currentIndex !== primaryFlourIndex &&
    direction === "up" &&
    targetIndex <= primaryFlourIndex
  ) {
    return false;
  }

  return true;
}

export function moveIngredientInList(
  ingredients: RecipeIngredient[],
  ingredientId: string,
  direction: MoveDirection
) {
  if (!canMoveIngredient(ingredients, ingredientId, direction)) {
    return ingredients;
  }

  const currentIndex = ingredients.findIndex((ingredient) => ingredient.id === ingredientId);
  const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

  const nextIngredients = [...ingredients];
  const [movedIngredient] = nextIngredients.splice(currentIndex, 1);
  nextIngredients.splice(targetIndex, 0, movedIngredient);

  return nextIngredients;
}
