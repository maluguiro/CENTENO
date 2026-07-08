# CENTENO

Base inicial para una app de formulas panaderas inspirada en Doughlator.

## Stack elegido

- Expo + React Native + TypeScript
- Expo Router para navegacion por archivos
- AsyncStorage para persistencia local simple en el MVP
- Arquitectura liviana con `src/types`, `src/lib`, `src/store`, `src/components` y `app`

## Pantallas incluidas

- `Home / Lista de formulas`
- `Detalle de formula`
- `Formulario de formula`
- `Vista de formula / recalculo`
- `Calculadora simple de escalado`

## Modelo de datos

```ts
type RecipeIngredient = {
  id: string;
  name: string;
  quantity: number;
  unit: "g" | "kg" | "ml" | "l" | "unit";
  role:
    | "flour"
    | "water"
    | "salt"
    | "yeast"
    | "sourdough"
    | "preferment"
    | "sugar"
    | "fat"
    | "other";
  bakerPercentage: number;
};

type Recipe = {
  id: string;
  name: string;
  description?: string;
  notes?: string;
  ingredients: RecipeIngredient[];
  createdAt: string;
  updatedAt: string;
};
```

## Criterios de esta etapa

- Base extensible antes que complejidad
- CRUD simple en memoria con persistencia local prevista
- Recalculo por harina total desde porcentaje panadero
- Hidratacion calculada desde ingredientes con rol `water`
- Peso total de masa calculado desde la formula

## Proximos pasos sugeridos

1. Instalar dependencias y validar el arranque en Expo.
2. Endurecer el store para evitar inconsistencias de ids y mejorar validaciones.
3. Incorporar tests para `src/lib/baker.ts`.
4. Evaluar migracion a SQLite cuando haga falta busqueda, filtros o sincronizacion mas robusta.
