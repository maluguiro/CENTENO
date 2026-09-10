import { sampleRecipes } from "@/data/sampleRecipes";
import {
  mergeMissingSampleRecipes,
  restoreOfficialSampleRecipes
} from "@/store/RecipesProvider";
import type { Recipe } from "@/types/recipe";

const OFFICIAL_IDS = [
  "seed-lactal-centeno-nuez",
  "seed-poolish",
  "seed-focaccia",
  "seed-magdalena-centeno"
];

const OFFICIAL_NAMES = [
  "Lactal CENTENO y nuez LEVADURA",
  "Poolish focaccia",
  "Focaccia",
  "Magdalena de CENTENO"
];

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
  assert(poolish!.preparation?.steps.length === 2, "Poolish debe conservar sus pasos.");

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
  assert(
    linkedPreferment?.linkedRecipeName === poolish!.name,
    "Focaccia debe conservar el fallback del nombre del Poolish sample."
  );
  assert(focaccia!.preparation?.steps.length === 12, "Focaccia debe conservar los 12 pasos completos.");
  assert(
    focaccia!.yield?.quantity === 4 && focaccia!.yield.weightPerUnit === 250,
    "Focaccia debe conservar su rendimiento completo."
  );

  const lactal = sampleRecipes.find((recipe) => recipe.id === "seed-lactal-centeno-nuez");
  assert(lactal?.preparation?.steps.length === 12, "Lactal debe conservar los 12 pasos completos.");
  assert(lactal?.fermentation?.instructions === "Doble fermentación.", "Lactal debe conservar doble fermentación.");
  assert(
    lactal?.yield?.quantity === 3 && lactal.yield.weightPerUnit === 1000,
    "Lactal debe conservar el rendimiento de 3 lactales de 1 kg."
  );

  const magdalena = sampleRecipes.find((recipe) => recipe.id === "seed-magdalena-centeno");
  assert(magdalena?.preparation?.steps.length === 9, "Magdalena debe conservar los 9 pasos completos.");
  assert(
    (magdalena?.notes ?? "").includes("12 magdalenas") &&
      (magdalena?.notes ?? "").includes("menos aceite"),
    "Magdalena debe conservar la nota de rendimiento y el tip de menos aceite."
  );
  assert(
    magdalena?.baking?.temperatureMinC === 175 &&
      magdalena.baking.temperatureMaxC === 180 &&
      magdalena.baking.timeMinMinutes === 18 &&
      magdalena.baking.timeMaxMinutes === 25,
    "Magdalena debe conservar el horneado completo."
  );
  assert(magdalena?.yield?.quantity === 12, "Magdalena debe conservar el rendimiento de 12 unidades.");

  const fromEmpty = mergeMissingSampleRecipes([], sampleRecipes);
  assert(
    fromEmpty.length === OFFICIAL_IDS.length,
    "Almacenamiento vacio debe resolver a las 4 recetas iniciales."
  );
  assert(
    fromEmpty.find((recipe) => recipe.id === "seed-focaccia")?.preparation?.steps.length === 12 &&
      fromEmpty.find((recipe) => recipe.id === "seed-lactal-centeno-nuez")?.preparation?.steps.length ===
        12 &&
      fromEmpty.find((recipe) => recipe.id === "seed-magdalena-centeno")?.preparation?.steps.length ===
        9,
    "Restaurar recetas iniciales debe cargar las instrucciones completas."
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

  const oldFocaccia: Recipe = {
    ...focaccia!,
    preparation: { steps: ["Paso antiguo de focaccia."] }
  };
  const oldLactal: Recipe = {
    ...lactal!,
    preparation: { steps: ["Paso antiguo de lactal."] }
  };
  const oldMagdalena: Recipe = {
    ...magdalena!,
    preparation: { steps: ["Paso antiguo de magdalena."] }
  };
  const restored = restoreOfficialSampleRecipes(
    [makePersonalRecipe(), oldFocaccia, oldLactal, oldMagdalena],
    sampleRecipes
  );
  assert(restored.length === sampleRecipes.length + 1, "Restaurar no debe duplicar samples oficiales.");
  assert(
    restored.find((recipe) => recipe.id === "personal-1")?.name === "Mi receta personal",
    "Restaurar no debe borrar recetas personales."
  );
  assert(
    restored.find((recipe) => recipe.id === "seed-focaccia")?.preparation?.steps.length === 12 &&
      restored.find((recipe) => recipe.id === "seed-lactal-centeno-nuez")?.preparation?.steps
        .length === 12 &&
      restored.find((recipe) => recipe.id === "seed-magdalena-centeno")?.preparation?.steps
        .length === 9,
    "Restaurar debe reemplazar los samples antiguos por las instrucciones completas."
  );
  assert(
    Boolean(
      restored
      .find((recipe) => recipe.id === "seed-focaccia")
      ?.ingredients.some(
        (ingredient) =>
          ingredient.role === "preferment" && ingredient.linkedRecipeId === "seed-poolish"
      )
    ),
    "Focaccia restaurada debe mantener el vínculo con Poolish focaccia."
  );

  const legacyLactal: Recipe = {
    ...oldLactal,
    id: "legacy-lactal",
    name: "Lactal CENTENO y nuez"
  };
  const restoredLegacy = restoreOfficialSampleRecipes([legacyLactal, makePersonalRecipe()], sampleRecipes);
  assert(
    !restoredLegacy.some((recipe) => recipe.id === "legacy-lactal") &&
      restoredLegacy.filter((recipe) => recipe.id === "seed-lactal-centeno-nuez").length === 1,
    "Restaurar debe sustituir un sample antiguo identificado por nombre oficial controlado."
  );

  console.log("seed validation passed");
}

run();
