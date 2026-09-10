import type { Recipe } from "@/types/recipe";

const SEED_TIMESTAMP = "2026-09-10T00:00:00.000Z";

/** Names used by older official samples before their stable seed IDs or names changed. */
export const sampleRecipeLegacyNames = ["Lactal CENTENO y nuez", "Poolish"];

export const sampleRecipes: Recipe[] = [
  {
    id: "seed-lactal-centeno-nuez",
    name: "Lactal CENTENO y nuez LEVADURA",
    description: "",
    notes:
      "- Salen 3 lactales de 1kg.\n\n- Puede reemplazarse la levadura por pasta madre (o masa madre) utilizando un 30% de MM y ajustando los valores de harina y agua para mantener la hidratación y cantidad de masa original.\n\n\nImportante: los tiempos de fermentación son orientativos. Temperatura de la masa, ambiente, fuerza de la harina y actividad de la levadura modifican considerablemente el tiempo.****",
    category: "bakery",
    useAsPreferment: false,
    preparation: {
      steps: [
        "Dejar remojando las nueces en agua al menos 8hs antes de hacer la receta. \n\nUtilizaremos el agua de remojo de las nueces para la receta, esto le dará un gran color y sabor al pan.",
        "Colocar las harinas en la amasadora o recipiente y mezclar.",
        "Incorporar el agua, reservando una pequeña cantidad para realizar ajustes durante el amasado.",
        "Agregar la miel y comenzar a amasar hasta obtener una masa homogénea.",
        "Incorporar la levadura fresca y continuar amasando.",
        "Agregar la sal y terminar el amasado hasta conseguir una masa lisa, elástica y con buen desarrollo.",
        "Incorporar las nueces al final del amasado, a velocidad baja o manualmente, procurando distribuirlas sin desgarrar excesivamente la masa.",
        "Cubrir y dejar fermentar aproximadamente 1–1½ horas a 24–26 °C, o hasta observar un aumento claro de volumen.",
        "Dividir en 3 piezas de aproximadamente 1 kg, preformar suavemente, dejar reposar 5/10 minutos. \n\nLuego formar los lactales y colocarlos en moldes previamente aceitados.",
        "Dejar fermentar nuevamente aproximadamente 1–1½ horas, hasta que la masa haya casi duplicado su volumen.",
        "Hornear en horno precalentado a 180–190 °C durante aproximadamente 35–45 minutos.",
        "Desmoldar y dejar enfriar sobre rejilla antes de cortar."
      ]
    },
    fermentation: { instructions: "Doble fermentación.", timeMinMinutes: 60, timeMaxMinutes: 90 },
    baking: { timeMinMinutes: 35, timeMaxMinutes: 45, temperatureMinC: 180, temperatureMaxC: 190 },
    yield: { quantity: 3, unit: "Lactales", weightPerUnit: 1000, weightUnit: "g" },
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
    ingredients: [
      { id: "seed-lactal-white-flour", name: "Harina blanca", quantity: 1450, unit: "g", role: "flour", bakerPercentage: 100 },
      { id: "seed-lactal-rye-flour", name: "Harina de centeno", quantity: 145, unit: "g", role: "flour", bakerPercentage: 10 },
      { id: "seed-lactal-water", name: "Agua", quantity: 1116.5, unit: "g", role: "water", bakerPercentage: 70 },
      { id: "seed-lactal-nuts", name: "Nueces", quantity: 159.5, unit: "g", role: "other", bakerPercentage: 10 },
      { id: "seed-lactal-honey", name: "Miel", quantity: 79.8, unit: "g", role: "sugar", bakerPercentage: 5 },
      { id: "seed-lactal-salt", name: "Sal", quantity: 32.3, unit: "g", role: "salt", bakerPercentage: 2 },
      { id: "seed-lactal-yeast", name: "Levadura", quantity: 31.9, unit: "g", role: "yeast", bakerPercentage: 2 }
    ]
  },
  {
    id: "seed-poolish",
    name: "Poolish focaccia",
    description: "Prefermento líquido al 100% de hidratación para usar en focaccia.",
    notes: "Marcado como prefermento para poder vincularlo desde otras recetas.",
    category: "bakery",
    useAsPreferment: true,
    preparation: {
      steps: [
        "Mezclar harina, agua y levadura hasta homogeneizar.",
        "Dejar madurar hasta que esté aireado y en su punto."
      ]
    },
    fermentation: {
      instructions: "Dejar fermentar hasta maduración completa.",
      visualCue: "Superficie aireada, convexa y con buen aroma.",
      timeMinMinutes: 720,
      timeMaxMinutes: 960,
      temperatureMinC: 20,
      temperatureMaxC: 24
    },
    yield: { quantity: 1, unit: "lote", weightPerUnit: 600, weightUnit: "g" },
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
    ingredients: [
      { id: "seed-poolish-flour", name: "Harina 000", quantity: 300, unit: "g", role: "flour", bakerPercentage: 100 },
      { id: "seed-poolish-water", name: "Agua", quantity: 300, unit: "g", role: "water", bakerPercentage: 100 },
      { id: "seed-poolish-yeast", name: "Levadura", quantity: 0.3, unit: "g", role: "yeast", bakerPercentage: 0.1 }
    ]
  },
  {
    id: "seed-focaccia",
    name: "Focaccia",
    description: "Formula alta en hidratacion, aceite de oliva y fermentacion en frio.",
    notes:
      "**• Preparacion para hornear en el mismo día.**\n\n\n**Importante**: esta versión está pensada para prepararse y hornearse en el mismo día. Los tiempos de fermentación son orientativos: priorizar el desarrollo y aspecto de la masa por sobre el reloj.",
    category: "bakery",
    useAsPreferment: false,
    preparation: {
      steps: [
        "Mezclar la harina, el poolish y la mayor parte del agua, reservando una pequeña cantidad para ajustar la masa durante el amasado.",
        "Amasar hasta comenzar a desarrollar la estructura de la masa.",
        "Incorporar progresivamente el agua reservada.",
        "Agregar la levadura y, posteriormente, la sal.",
        "Incorporar el aceite de oliva gradualmente y continuar amasando hasta obtener una masa homogénea, elástica y extensible.",
        "Cubrir y dejar reposar. Durante la primera fermentación, realizar 2–3 series de pliegues, separadas aproximadamente por 20–30 minutos, para favorecer el desarrollo de estructura.",
        "Continuar la fermentación a temperatura ambiente hasta que la masa muestre un aumento claro de volumen y se encuentre aireada. El tiempo dependerá de la temperatura y de la actividad del poolish y la levadura.",
        "Colocar la masa en una bandeja generosamente aceitada y extenderla suavemente con las manos, evitando desgasificarla en exceso. Si la masa ofrece resistencia, dejarla reposar unos minutos y continuar extendiéndola después.",
        "Cubrir y realizar una segunda fermentación a temperatura ambiente hasta que la masa esté relajada, aireada y presente burbujas visibles.",
        "Precalentar bien el horno a 220–240 °C.",
        "Agregar aceite de oliva sobre la superficie y realizar los característicos hoyuelos presionando suavemente con las yemas de los dedos.\nTerminar con sal gruesa y los toppings deseados.",
        "Hornear durante aproximadamente 20–30 minutos, hasta obtener una superficie bien dorada y una base completamente cocida.\n\nRetirar de la bandeja y dejar enfriar sobre rejilla."
      ]
    },
    baking: { timeMinMinutes: 20, timeMaxMinutes: 30, temperatureMinC: 220, temperatureMaxC: 240 },
    yield: { quantity: 4, unit: "Focaccias", weightPerUnit: 250, weightUnit: "g" },
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
    ingredients: [
      { id: "seed-focaccia-bread-flour", name: "Harina de fuerza", quantity: 600, unit: "g", role: "flour", bakerPercentage: 100 },
      { id: "seed-focaccia-water", name: "Agua", quantity: 390, unit: "g", role: "water", bakerPercentage: 65 },
      { id: "seed-focaccia-oil", name: "Aceite de oliva", quantity: 30, unit: "g", role: "fat", bakerPercentage: 5 },
      { id: "seed-focaccia-salt", name: "Sal fina", quantity: 12, unit: "g", role: "salt", bakerPercentage: 2 },
      { id: "seed-focaccia-poolish", name: "Poolish focaccia", quantity: 600, unit: "g", role: "preferment", bakerPercentage: 100, linkedRecipeId: "seed-poolish", linkedRecipeName: "Poolish focaccia" },
      { id: "seed-focaccia-yeast", name: "Levadura seca", quantity: 12, unit: "g", role: "yeast", bakerPercentage: 2 }
    ]
  },
  {
    id: "seed-magdalena-centeno",
    name: "Magdalena de CENTENO",
    description: "",
    notes:
      "**•** **Salen, aproximadamente, 12 magdalenas.**\n\n**•** **TIP** — versión con menos aceite: La receta original utiliza 190 g de aceite, lo que contribuye a obtener magdalenas muy húmedas y tiernas. Si se desea una alternativa con menos aceite, se pueden utilizar 100 g de aceite + 90 g de yogur natural. De esta manera se mantiene aproximadamente la cantidad total de preparación y el yogur ayuda a aportar humedad y cuerpo. La textura final puede resultar ligeramente diferente y menos untuosa que la receta original.",
    category: "pastry",
    useAsPreferment: false,
    preparation: {
      steps: [
        "Precalentar el horno a 175–180 °C.\nY preparar los moldes para magdalenas con cápsulas de papel o ligeramente aceitados.",
        "Mezclar bien la harina de centeno, la harina integral, el polvo de hornear y la sal.",
        "En otro recipiente, batir los huevos con el azúcar hasta integrar y obtener una preparación ligeramente aireada.",
        "Incorporar gradualmente los 190 g de aceite mientras se continúa mezclando.",
        "Agregar la leche e integrar.",
        "Incorporar los ingredientes secos en 2–3 adiciones, mezclando solamente hasta obtener una preparación homogénea. Evitar batir excesivamente una vez incorporadas las harinas.",
        "Distribuir la mezcla en los moldes, llenándolos aproximadamente hasta ¾ de su capacidad.",
        "Enviar al horno.\nAl finalizar, comprobar la cocción insertando un palillo en el centro. Debe salir sin masa cruda adherida.",
        "Dejar reposar unos minutos antes de desmoldar y terminar de enfriar sobre rejilla."
      ]
    },
    baking: { timeMinMinutes: 18, timeMaxMinutes: 25, temperatureMinC: 175, temperatureMaxC: 180 },
    yield: { quantity: 12, unit: "Magdalenas", weightPerUnit: 65.2, weightUnit: "g" },
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
    ingredients: [
      { id: "seed-magdalena-rye-flour", name: "Harina de centeno", quantity: 160, unit: "g", role: "flour", bakerPercentage: 100 },
      { id: "seed-magdalena-whole-flour", name: "Harina integral", quantity: 60, unit: "g", role: "flour", bakerPercentage: 37.5 },
      { id: "seed-magdalena-milk", name: "Leche", quantity: 60, unit: "g", role: "water", bakerPercentage: 26.1 },
      { id: "seed-magdalena-salt", name: "Sal", quantity: 3, unit: "g", role: "salt", bakerPercentage: 1.3 },
      { id: "seed-magdalena-baking-powder", name: "Polvo de hornear", quantity: 9.7, unit: "g", role: "flour", bakerPercentage: 6.1 },
      { id: "seed-magdalena-oil", name: "Aceite", quantity: 190, unit: "g", role: "fat", bakerPercentage: 82.7 },
      { id: "seed-magdalena-sugar", name: "Azúcar", quantity: 175, unit: "g", role: "sugar", bakerPercentage: 76.2 },
      { id: "seed-magdalena-egg", name: "Huevo", quantity: 125, unit: "g", role: "other", bakerPercentage: 54.4 }
    ]
  }
];
