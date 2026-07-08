export type IngredientUnit = "g" | "kg" | "ml" | "l" | "unit";

export type IngredientRole =
  | "flour"
  | "water"
  | "salt"
  | "yeast"
  | "sourdough"
  | "preferment"
  | "sugar"
  | "fat"
  | "other";

export type RecipeIngredient = {
  id: string;
  name: string;
  quantity: number;
  unit: IngredientUnit;
  role: IngredientRole;
  bakerPercentage: number;
};

export type Recipe = {
  id: string;
  name: string;
  description?: string;
  notes?: string;
  ingredients: RecipeIngredient[];
  createdAt: string;
  updatedAt: string;
};

export type RecipeDraft = {
  name: string;
  description: string;
  notes: string;
  ingredients: RecipeIngredient[];
};
