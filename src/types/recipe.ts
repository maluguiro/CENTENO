export type IngredientUnit = "g" | "kg" | "ml" | "l" | "unit";
export type RecipeCategory = "bakery" | "pastry";
export type RecipeScalingTargetMode = "totalFlour" | "doughWeight" | "pieces";
export type RecipeYieldWeightUnit = "g" | "kg";

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
  linkedRecipeId?: string;
  linkedRecipeName?: string;
};

export type RecipeScalingTarget = {
  mode: RecipeScalingTargetMode;
  totalFlour?: number;
  doughWeight?: number;
  pieces?: number;
  pieceWeight?: number;
};

export type RecipePreparation = {
  steps: string[];
};

export type RecipeFermentation = {
  instructions?: string;
  visualCue?: string;
  timeMinMinutes?: number;
  timeMaxMinutes?: number;
  temperatureMinC?: number;
  temperatureMaxC?: number;
};

export type RecipeBaking = {
  instructions?: string;
  timeMinMinutes?: number;
  timeMaxMinutes?: number;
  temperatureMinC?: number;
  temperatureMaxC?: number;
};

export type RecipeYield = {
  quantity?: number;
  unit?: string;
  weightPerUnit?: number;
  weightUnit?: RecipeYieldWeightUnit;
};

export type Recipe = {
  id: string;
  name: string;
  description?: string;
  notes?: string;
  preparation?: RecipePreparation;
  fermentation?: RecipeFermentation;
  baking?: RecipeBaking;
  yield?: RecipeYield;
  category?: RecipeCategory;
  useAsPreferment?: boolean;
  scalingTarget?: RecipeScalingTarget;
  scalingSnapshotIngredients?: RecipeIngredient[];
  ingredients: RecipeIngredient[];
  createdAt: string;
  updatedAt: string;
};

export type RecipeDraft = {
  name: string;
  description: string;
  notes: string;
  preparation?: RecipePreparation;
  fermentation?: RecipeFermentation;
  baking?: RecipeBaking;
  yield?: RecipeYield;
  category: RecipeCategory;
  useAsPreferment: boolean;
  scalingTarget?: RecipeScalingTarget;
  scalingSnapshotIngredients?: RecipeIngredient[];
  ingredients: RecipeIngredient[];
};
