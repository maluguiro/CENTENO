import {
  expandPreparationSection,
  getInitialPreparationSections,
  togglePreparationSection,
  type PreparationSectionKey,
  type PreparationSectionsState
} from "@/lib/preparationSections";

function assert(condition: unknown, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

const sections: PreparationSectionKey[] = ["preparation", "fermentation", "baking", "yield"];

const initial = getInitialPreparationSections();

assert(initial.preparation === true, "Preparacion debe iniciar expandida.");
assert(initial.fermentation === false, "Fermentacion debe iniciar contraida.");
assert(initial.baking === false, "Horneado debe iniciar contraido.");
assert(initial.yield === false, "Rendimiento debe iniciar contraido.");

const collapsedPreparation = togglePreparationSection(initial, "preparation");
assert(collapsedPreparation.preparation === false, "Toggle debe contraer Preparacion.");
assert(
  togglePreparationSection(collapsedPreparation, "preparation").preparation === true,
  "Toggle debe expandir Preparacion nuevamente."
);

const expandedFermentation = togglePreparationSection(initial, "fermentation");
assert(expandedFermentation.fermentation === true, "Toggle debe expandir Fermentacion.");
assert(
  togglePreparationSection(expandedFermentation, "fermentation").fermentation === false,
  "Toggle debe contraer Fermentacion."
);

const severalOpen = togglePreparationSection(
  togglePreparationSection(initial, "fermentation"),
  "baking"
);
assert(severalOpen.fermentation === true, "Fermentacion debe seguir abierta.");
assert(severalOpen.baking === true, "Horneado debe estar abierto.");
assert(severalOpen.preparation === true, "Abrir otras no debe cerrar Preparacion.");
assert(severalOpen.yield === false, "Rendimiento debe seguir contraido.");

const afterEdit = expandPreparationSection(initial, "fermentation");
assert(afterEdit.fermentation === true, "Guardar una seccion debe dejarla expandida.");

const reset = getInitialPreparationSections();
for (const section of sections) {
  assert(
    reset[section] === initial[section],
    `Nueva receta debe restablecer estado inicial de ${section}.`
  );
}

const before = JSON.stringify(initial);
expandPreparationSection(initial, "yield");
assert(
  JSON.stringify(initial) === before,
  "Las funciones no deben mutar el estado recibido."
);

console.log("preparation sections validation passed");
