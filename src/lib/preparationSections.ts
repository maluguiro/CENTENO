export type PreparationSectionKey = "preparation" | "fermentation" | "baking" | "yield";

export type PreparationSectionsState = Record<PreparationSectionKey, boolean>;

export function getInitialPreparationSections(): PreparationSectionsState {
  return {
    preparation: true,
    fermentation: false,
    baking: false,
    yield: false
  };
}

export function togglePreparationSection(
  state: PreparationSectionsState,
  section: PreparationSectionKey
): PreparationSectionsState {
  return {
    ...state,
    [section]: !state[section]
  };
}

export function expandPreparationSection(
  state: PreparationSectionsState,
  section: PreparationSectionKey
): PreparationSectionsState {
  return {
    ...state,
    [section]: true
  };
}
