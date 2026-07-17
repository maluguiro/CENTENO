import type { Recipe } from "@/types/recipe";

export const sampleRecipes: Recipe[] = [
  {
    id: "country-loaf",
    name: "Pan de campo",
    description: "Masa madre suave con hidratacion intermedia para hornos domesticos.",
    notes: "Version inicial para validar calculos y escalado local.",
    category: "bakery",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ingredients: [
      {
        id: "flour",
        name: "Harina 000",
        quantity: 1000,
        unit: "g",
        role: "flour",
        bakerPercentage: 100
      },
      {
        id: "water",
        name: "Agua",
        quantity: 720,
        unit: "g",
        role: "water",
        bakerPercentage: 72
      },
      {
        id: "salt",
        name: "Sal",
        quantity: 20,
        unit: "g",
        role: "salt",
        bakerPercentage: 2
      },
      {
        id: "starter",
        name: "Masa madre",
        quantity: 200,
        unit: "g",
        role: "sourdough",
        bakerPercentage: 20
      }
    ]
  },
  {
    id: "focaccia",
    name: "Focaccia",
    description: "Formula alta en hidratacion, aceite de oliva y fermentacion en frio.",
    notes: "Usa aceite como ingrediente de formula, no cuenta como hidratacion.",
    category: "bakery",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ingredients: [
      {
        id: "bread-flour",
        name: "Harina de fuerza",
        quantity: 800,
        unit: "g",
        role: "flour",
        bakerPercentage: 100
      },
      {
        id: "water",
        name: "Agua",
        quantity: 680,
        unit: "g",
        role: "water",
        bakerPercentage: 85
      },
      {
        id: "oil",
        name: "Aceite de oliva",
        quantity: 64,
        unit: "g",
        role: "fat",
        bakerPercentage: 8
      },
      {
        id: "salt",
        name: "Sal fina",
        quantity: 18,
        unit: "g",
        role: "salt",
        bakerPercentage: 2.2
      }
    ]
  }
];
