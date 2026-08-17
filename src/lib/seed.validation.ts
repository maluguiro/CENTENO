import { sampleRecipes } from "@/data/sampleRecipes";
import { mergeMissingSampleRecipes } from "@/store/RecipesProvider";
import type { Recipe } from "@/types/recipe";

const OFFICIAL_IDS = [
  "seed-lactal-centeno-nuez",
  "seed-poolish",
  "seed-focaccia",
  "seed-magdalena-centeno"
];

const OFFICIAL_NAMES = ["Lactal CENTENO y nuez", "Poolish", "Focaccia", "Magdalena de CENTENO"];

let assertions = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
  assertions += 1;
}

function makePersonalRecipe(): Recipe {
  return {
    id: "personal-1",
    name: "Mi receta personal",
    category: "bakery",
    ingredients: [
      {
        id: "personal-1-flour",
        name: "Harina 000",
        quantity: 1000,
        unit: "g",
        role: "flour",
        bakerPercentage: 100
      }
    ],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  };
}

function run() {
  const ids = sampleRecipes.map((recipe) => recipe.id);
  const names = sampleRecipes.map((recipe) => recipe.name);

  OFFICIAL_IDS.forEach((id) => {
    assert(ids.includes(id), `Falta la receta inicial ${id}.`);
  });
  OFFICIAL_NAMES.forEach((name) => {
    assert(names.includes(name), `Falta la receta inicial ${name}.`);
  });
  assert(sampleRecipes.length === OFFICIAL_IDS.length, "Deben existir 4 recetas iniciales.");

  sampleRecipes.forEach((recipe) => {
    assert(Boolean(recipe.id), "Cada receta debe tener id.");
    assert(Boolean(recipe.name), "Cada receta debe tener nombre.");
    assert(recipe.ingredients.length > 0, `${recipe.id} debe tener ingredientes.`);
    assert(Boolean(recipe.createdAt), `${recipe.id} debe tener createdAt.`);
    assert(Boolean(recipe.updatedAt), `${recipe.id} debe tener updatedAt.`);
  });

  const poolish = sampleRecipes.find((recipe) => recipe.id === "seed-poolish");
  assert(poolish !== undefined, "Poolish debe estar en el seed.");
  assert(poolish!.useAsPreferment === true, "Poolish debe estar marcado como prefermento.");

  const focaccia = sampleRecipes.find((recipe) => recipe.id === "seed-focaccia");
  assert(focaccia !== undefined, "Focaccia debe estar en el seed.");
  const linkedPreferment = focaccia!.ingredients.find(
    (ingredient) => ingredient.role === "preferment"
  );
  assert(linkedPreferment !== undefined, "Focaccia debe tener un prefermento vinculado.");
  assert(
    linkedPreferment?.linkedRecipeId === "seed-poolish",
    "Focaccia debe apuntar a seed-poolish via linkedRecipeId."
  );

  const fromEmpty = mergeMissingSampleRecipes([], sampleRecipes);
  assert(
    fromEmpty.length === OFFICIAL_IDS.length,
    "Almacenamiento vacio debe resolver a las 4 recetas iniciales."
  );

  const rehydrated = mergeMissingSampleRecipes(fromEmpty, sampleRecipes);
  assert(
    rehydrated.length === OFFICIAL_IDS.length,
    "Rehidratar no debe duplicar las recetas iniciales."
  );

  const withPersonal = mergeMissingSampleRecipes([makePersonalRecipe()], sampleRecipes);
  assert(
    withPersonal.length === OFFICIAL_IDS.length + 1,
    "Las recetas personales deben conservarse junto al seed."
  );
  assert(
    withPersonal.some((recipe) => recipe.id === "personal-1"),
    "La receta personal debe permanecer."
  );

  const editedSample: Recipe = {
    ...sampleRecipes[0],
    name: "Lactal CENTENO y nuez (editada)",
    ingredients: [
      {
        id: "seed-lactal-flour-white",
        name: "Harina 000",
        quantity: 1800,
        unit: "g",
        role: "flour",
        bakerPercentage: 100
      }
    ]
  };
  const mergedWithEdit = mergeMissingSampleRecipes([editedSample], sampleRecipes);
  const kept = mergedWithEdit.find((recipe) => recipe.id === sampleRecipes[0].id);
  assert(kept !== undefined, "La receta editada debe seguir existiendo.");
  assert(
    kept?.name === "Lactal CENTENO y nuez (editada)",
    "El seed no debe sobrescribir una edicion legitima del usuario."
  );
  assert(
    kept?.ingredients.length === 1,
    "El seed no debe reinyectar ingredientes sobre una edicion legitima."
  );

  console.log("seed validation passed");
}

run();
