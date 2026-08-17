import type { Recipe } from "@/types/recipe";

const SEED_TIMESTAMP = "2026-08-14T00:00:00.000Z";

export const sampleRecipes: Recipe[] = [
  {
    id: "seed-lactal-centeno-nuez",
    name: "Lactal CENTENO y nuez",
    description: "Lactal suave con centeno, miel y nuez para molde.",
    notes: "Receta inicial incluida en CENTENO.",
    category: "bakery",
    preparation: {
      steps: [
        "Mezclar los ingredientes hasta integrar.",
        "Desarrollar gluten y sumar la nuez al final del amasado.",
        "Fermentar, dividir, moldear y hornear en molde."
      ]
    },
    fermentation: {
      instructions: "Fermentar en bloque y luego en molde hasta buen desarrollo.",
      timeMinMinutes: 60,
      timeMaxMinutes: 120,
      temperatureMinC: 24,
      temperatureMaxC: 26
    },
    baking: {
      instructions: "Hornear hasta dorar y secar bien la base.",
      timeMinMinutes: 32,
      timeMaxMinutes: 38,
      temperatureMinC: 180,
      temperatureMaxC: 190
    },
    yield: {
      quantity: 2,
      unit: "lactales",
      weightPerUnit: 1542.8,
      weightUnit: "g"
    },
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
    ingredients: [
      {
        id: "seed-lactal-flour-white",
        name: "Harina 000",
        quantity: 1500,
        unit: "g",
        role: "flour",
        bakerPercentage: 100
      },
      {
        id: "seed-lactal-flour-rye",
        name: "Harina de centeno",
        quantity: 150,
        unit: "g",
        role: "flour",
        bakerPercentage: 10
      },
      {
        id: "seed-lactal-water",
        name: "Agua",
        quantity: 1155,
        unit: "g",
        role: "water",
        bakerPercentage: 70
      },
      {
        id: "seed-lactal-nuts",
        name: "Nuez",
        quantity: 165,
        unit: "g",
        role: "other",
        bakerPercentage: 10
      },
      {
        id: "seed-lactal-honey",
        name: "Miel",
        quantity: 82.5,
        unit: "g",
        role: "sugar",
        bakerPercentage: 5
      },
      {
        id: "seed-lactal-salt",
        name: "Sal",
        quantity: 33,
        unit: "g",
        role: "salt",
        bakerPercentage: 2
      }
    ]
  },
  {
    id: "seed-poolish",
    name: "Poolish",
    description: "Prefermento liquido al 100% de hidratacion para usar en otras formulas.",
    notes: "Marcado como prefermento para poder vincularlo desde otras recetas.",
    category: "bakery",
    useAsPreferment: true,
    preparation: {
      steps: [
        "Mezclar harina, agua y levadura hasta homogeneizar.",
        "Dejar madurar hasta que este aireado y en su punto."
      ]
    },
    fermentation: {
      instructions: "Dejar fermentar hasta maduracion completa.",
      visualCue: "Superficie aireada, convexa y con buen aroma.",
      timeMinMinutes: 720,
      timeMaxMinutes: 960,
      temperatureMinC: 20,
      temperatureMaxC: 24
    },
    yield: {
      quantity: 1,
      unit: "lote",
      weightPerUnit: 600,
      weightUnit: "g"
    },
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
    ingredients: [
      {
        id: "seed-poolish-flour",
        name: "Harina 000",
        quantity: 300,
        unit: "g",
        role: "flour",
        bakerPercentage: 100
      },
      {
        id: "seed-poolish-water",
        name: "Agua",
        quantity: 300,
        unit: "g",
        role: "water",
        bakerPercentage: 100
      },
      {
        id: "seed-poolish-yeast",
        name: "Levadura",
        quantity: 0.3,
        unit: "g",
        role: "yeast",
        bakerPercentage: 0.1
      }
    ]
  },
  {
    id: "seed-focaccia",
    name: "Focaccia",
    description: "Formula alta en hidratacion, aceite de oliva y fermentacion en frio.",
    notes: "Usa Poolish como prefermento vinculado dentro de la formula.",
    category: "bakery",
    preparation: {
      steps: [
        "Integrar la masa y desarrollar suavemente.",
        "Dar pliegues durante la fermentacion en bloque.",
        "Estirar en placa, fermentar y hornear."
      ]
    },
    fermentation: {
      instructions: "Fermentar en bloque con frio si hace falta para ganar sabor.",
      timeMinMinutes: 180,
      timeMaxMinutes: 720,
      temperatureMinC: 4,
      temperatureMaxC: 24
    },
    baking: {
      instructions: "Hornear hasta obtener base seca y buena coloracion.",
      timeMinMinutes: 18,
      timeMaxMinutes: 25,
      temperatureMinC: 220,
      temperatureMaxC: 240
    },
    yield: {
      quantity: 2,
      unit: "placas",
      weightPerUnit: 1081,
      weightUnit: "g"
    },
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
    ingredients: [
      {
        id: "seed-focaccia-flour",
        name: "Harina de fuerza",
        quantity: 800,
        unit: "g",
        role: "flour",
        bakerPercentage: 100
      },
      {
        id: "seed-focaccia-water",
        name: "Agua",
        quantity: 680,
        unit: "g",
        role: "water",
        bakerPercentage: 85
      },
      {
        id: "seed-focaccia-poolish",
        name: "Poolish",
        quantity: 600,
        unit: "g",
        role: "preferment",
        bakerPercentage: 75,
        linkedRecipeId: "seed-poolish",
        linkedRecipeName: "Poolish"
      },
      {
        id: "seed-focaccia-oil",
        name: "Aceite de oliva",
        quantity: 64,
        unit: "g",
        role: "fat",
        bakerPercentage: 8
      },
      {
        id: "seed-focaccia-salt",
        name: "Sal fina",
        quantity: 18,
        unit: "g",
        role: "salt",
        bakerPercentage: 2.2
      }
    ]
  },
  {
    id: "seed-magdalena-centeno",
    name: "Magdalena de CENTENO",
    description: "Magdalena de molde con miel y harina de centeno.",
    notes: "Receta inicial incluida para la seccion de pasteleria.",
    category: "pastry",
    preparation: {
      steps: [
        "Batir huevos, azucar y miel hasta airear.",
        "Integrar secos y luego sumar aceite y leche.",
        "Reposar, dosificar y hornear."
      ]
    },
    baking: {
      instructions: "Hornear hasta domo alto y centro cocido.",
      timeMinMinutes: 14,
      timeMaxMinutes: 18,
      temperatureMinC: 190,
      temperatureMaxC: 210
    },
    yield: {
      quantity: 24,
      unit: "magdalenas",
      weightPerUnit: 58,
      weightUnit: "g"
    },
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
    ingredients: [
      {
        id: "seed-magdalena-flour-white",
        name: "Harina 0000",
        quantity: 400,
        unit: "g",
        role: "flour",
        bakerPercentage: 100
      },
      {
        id: "seed-magdalena-flour-rye",
        name: "Harina de centeno",
        quantity: 80,
        unit: "g",
        role: "flour",
        bakerPercentage: 20
      },
      {
        id: "seed-magdalena-eggs",
        name: "Huevos",
        quantity: 400,
        unit: "g",
        role: "other",
        bakerPercentage: 83.3
      },
      {
        id: "seed-magdalena-sugar",
        name: "Azucar",
        quantity: 340,
        unit: "g",
        role: "sugar",
        bakerPercentage: 70.8
      },
      {
        id: "seed-magdalena-honey",
        name: "Miel",
        quantity: 40,
        unit: "g",
        role: "sugar",
        bakerPercentage: 8.3
      },
      {
        id: "seed-magdalena-milk",
        name: "Leche",
        quantity: 160,
        unit: "g",
        role: "water",
        bakerPercentage: 33.3
      },
      {
        id: "seed-magdalena-oil",
        name: "Aceite suave",
        quantity: 220,
        unit: "g",
        role: "fat",
        bakerPercentage: 45.8
      },
      {
        id: "seed-magdalena-baking-powder",
        name: "Polvo de hornear",
        quantity: 16,
        unit: "g",
        role: "other",
        bakerPercentage: 3.3
      },
      {
        id: "seed-magdalena-salt",
        name: "Sal",
        quantity: 6,
        unit: "g",
        role: "salt",
        bakerPercentage: 1.3
      }
    ]
  }
];
