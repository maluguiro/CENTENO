import { Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { theme } from "@/theme";

export type GuideTargetKey =
  | "brandHeader"
  | "recipeList"
  | "categoryFilter"
  | "newRecipeFab"
  | "settingsButton";

export type GuideTargetRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type GuidePreviewKind = "formula" | "editor" | "target" | "breakdown" | "export";

type GuideStep = {
  title: string;
  body: string;
  icon?: string;
  preview?: GuidePreviewKind;
  targetKey?: GuideTargetKey;
};

type GuideModalProps = {
  visible: boolean;
  onClose: () => void;
  onComplete: () => void;
  onSkip: () => void;
  onStepChange?: (stepIndex: number) => void;
  stepIndex: number;
  targetRects?: Partial<Record<GuideTargetKey, GuideTargetRect>>;
};

const guideSteps: GuideStep[] = [
  {
    icon: "Manual",
    title: "Bienvenida a CENTENO",
    body:
      "CENTENO es una libreta de obrador para guardar, escalar y compartir formulas panaderas. No funciona como una calculadora generica: trabaja con porcentaje panadero y con una harina base clara.",
    targetKey: "brandHeader"
  },
  {
    icon: "Home",
    title: "Home y recetas",
    body:
      "En la pantalla principal vas a ver tus recetas ordenadas alfabeticamente. Toca una receta para abrirla o mantenela presionada para ver acciones rapidas como duplicar, exportar, editar o eliminar.",
    targetKey: "recipeList"
  },
  {
    icon: "Filtro",
    title: "Panaderia y pasteleria",
    body:
      "Usa el boton de cupcake para ver solo recetas de pasteleria. Toca el pan para volver a ver todas las recetas. Al crear o editar una receta podes marcar si es Panaderia o Pasteleria.",
    targetKey: "categoryFilter"
  },
  {
    icon: "Nueva",
    title: "Crear una receta",
    body:
      "Toca Nueva receta para crear una formula. Podes definir nombre, descripcion, tipo de receta y si queres que pueda usarse como prefermento.",
    targetKey: "newRecipeFab"
  },
  {
    icon: "Base",
    title: "Harina base",
    body:
      "La primera harina de la receta es la harina base y representa el 100%. Si queres que la base sea integral, centeno, fuerza o 000, edita el nombre de esa primera harina. Esa harina no baja por debajo de otros ingredientes.",
    preview: "formula"
  },
  {
    icon: "Harinas",
    title: "Harinas secundarias y porcentajes",
    body:
      "Las otras harinas tambien van como rol Harina. Se expresan como porcentaje sobre la harina base. Agua, sal, azucar, grasas, semillas y prefermentos se calculan sobre la harina total real. Si una harina forma parte de la formula, no la cargues como Otro.",
    preview: "editor"
  },
  {
    icon: "H2O",
    title: "Hidratacion real",
    body:
      "La hidratacion principal es agua o liquidos sobre harina total. La barra muestra esa hidratacion real con el simbolo 💧. Las grasas y aceites pueden influir en suavidad o sensacion de humedad, pero no se suman a la hidratacion panadera principal.",
    preview: "target"
  },
  {
    icon: "Pref",
    title: "Prefermentos y masa madre",
    body:
      "Un prefermento vinculado aporta harina y agua internas. CENTENO descuenta visualmente ese aporte de la harina principal y del liquido principal para evitar contar dos veces la formula. Las harinas secundarias no reciben descuento automatico.",
    preview: "breakdown"
  },
  {
    icon: "Masa",
    title: "Masa y ajustes",
    body:
      "La masa mostrada en CENTENO es masa neta cuando hay prefermentos vinculados. Podes ajustar una receta por harina total, por masa deseada o por piezas. Si dejas un ajuste activo, CENTENO intenta mantener ese objetivo hasta que lo quites.",
    preview: "export"
  },
  {
    icon: "Salir",
    title: "Exportar, importar y ayuda",
    body:
      "Compartir como texto sirve para WhatsApp, notas o impresion. El archivo .centeno sirve para pasar recetas entre instalaciones de CENTENO. El codigo de respaldo queda como opcion avanzada. Desde Configuracion podes volver a abrir este manual cuando quieras.",
    targetKey: "settingsButton"
  }
];

export function GuideModal({
  visible,
  onClose,
  onComplete,
  onSkip,
  onStepChange,
  stepIndex,
  targetRects
}: GuideModalProps) {
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const step = guideSteps[stepIndex];
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === guideSteps.length - 1;
  const targetRect = step.targetKey ? targetRects?.[step.targetKey] : undefined;
  const hasSpotlight =
    !!targetRect &&
    targetRect.width > 0 &&
    targetRect.height > 0 &&
    targetRect.x >= 0 &&
    targetRect.y >= 0;

  const spotlightPadding = 10;
  const spotlightTop = hasSpotlight ? Math.max(0, targetRect.y - spotlightPadding) : 0;
  const spotlightLeft = hasSpotlight ? Math.max(0, targetRect.x - spotlightPadding) : 0;
  const spotlightWidth = hasSpotlight
    ? Math.min(screenWidth - spotlightLeft, targetRect.width + spotlightPadding * 2)
    : 0;
  const spotlightHeight = hasSpotlight
    ? Math.min(screenHeight - spotlightTop, targetRect.height + spotlightPadding * 2)
    : 0;
  const cardAnchorTop = hasSpotlight ? spotlightTop + spotlightHeight + theme.spacing.md : undefined;
  const estimatedCardHeight = step.preview ? 360 : 280;
  const availableBelow = hasSpotlight
    ? screenHeight - (spotlightTop + spotlightHeight) - theme.spacing.lg
    : 0;
  const availableAbove = hasSpotlight ? spotlightTop - theme.spacing.lg : 0;
  const cardPositionStyle = hasSpotlight
    ? availableBelow >= estimatedCardHeight
      ? { top: cardAnchorTop }
      : availableAbove >= estimatedCardHeight
        ? {
            top: Math.max(
              theme.spacing.lg,
              spotlightTop - estimatedCardHeight - theme.spacing.md
            )
          }
        : {
            top: Math.max(
              theme.spacing.lg,
              Math.min(
                screenHeight - estimatedCardHeight - theme.spacing.lg,
                spotlightTop - estimatedCardHeight / 2
              )
            )
          }
    : styles.cardWrapCentered;
  const fineTunedCardPositionStyle =
    hasSpotlight && step.targetKey === "recipeList" && "top" in cardPositionStyle
      ? { ...cardPositionStyle, top: Number(cardPositionStyle.top) + 48 }
      : hasSpotlight && step.targetKey === "newRecipeFab" && "top" in cardPositionStyle
        ? { ...cardPositionStyle, top: Math.max(theme.spacing.md, Number(cardPositionStyle.top) - 48) }
        : cardPositionStyle;

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.root}>
        {hasSpotlight ? (
          <>
            <View style={[styles.dimBlock, { height: spotlightTop, left: 0, right: 0, top: 0 }]} />
            <View
              style={[
                styles.dimBlock,
                { left: 0, top: spotlightTop, width: spotlightLeft, height: spotlightHeight }
              ]}
            />
            <View
              style={[
                styles.dimBlock,
                {
                  left: spotlightLeft + spotlightWidth,
                  top: spotlightTop,
                  right: 0,
                  height: spotlightHeight
                }
              ]}
            />
            <View
              style={[
                styles.dimBlock,
                {
                  left: 0,
                  right: 0,
                  top: spotlightTop + spotlightHeight,
                  bottom: 0
                }
              ]}
            />
            <View
              pointerEvents="none"
              style={[
                styles.spotlight,
                {
                  left: spotlightLeft,
                  top: spotlightTop,
                  width: spotlightWidth,
                  height: spotlightHeight
                }
              ]}
            />
          </>
        ) : (
          <View style={styles.fullBackdrop} />
        )}

        <View
          style={[
            styles.cardWrap,
            fineTunedCardPositionStyle
          ]}
        >
          <View style={styles.card}>
            <Text style={styles.progress}>
              {stepIndex + 1} / {guideSteps.length}
            </Text>
            {step.icon ? <Text style={styles.icon}>{step.icon}</Text> : null}
            <Text style={styles.title}>{step.title}</Text>
            <Text style={styles.body}>{step.body}</Text>
            {step.preview ? <GuidePreview preview={step.preview} /> : null}
            <View style={styles.actions}>
              {!isFirstStep ? (
                <Pressable
                  accessibilityLabel="Volver al paso anterior"
                  onPress={() => onStepChange?.(stepIndex - 1)}
                  style={({ pressed }) => [styles.textAction, pressed && styles.textActionPressed]}
                >
                  <Text style={styles.textActionLabel}>Volver</Text>
                </Pressable>
              ) : (
                <View style={styles.spacer} />
              )}
              {!isLastStep ? (
                <Pressable
                  accessibilityLabel="Siguiente paso de la guia"
                  onPress={() => onStepChange?.(stepIndex + 1)}
                  style={({ pressed }) => [styles.primaryAction, pressed && styles.primaryActionPressed]}
                >
                  <Text style={styles.primaryActionLabel}>Siguiente</Text>
                </Pressable>
              ) : (
                <Pressable
                  accessibilityLabel="Empezar a usar CENTENO"
                  onPress={onComplete}
                  style={({ pressed }) => [styles.primaryAction, pressed && styles.primaryActionPressed]}
                >
                  <Text style={styles.primaryActionLabel}>Empezar a usar CENTENO</Text>
                </Pressable>
              )}
            </View>
            {!isLastStep ? (
              <View style={styles.skipRow}>
                <Pressable
                  accessibilityLabel="Omitir guia de uso"
                  onPress={onSkip}
                  style={({ pressed }) => [styles.skipAction, pressed && styles.textActionPressed]}
                >
                  <Text style={styles.skipActionLabel}>Omitir</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function GuidePreview({ preview }: { preview: GuidePreviewKind }) {
  if (preview === "formula") {
    return (
      <View style={styles.previewCard}>
        <Text style={styles.previewTitle}>Ejemplo rapido</Text>
        <View style={styles.previewLine}>
          <Text style={styles.previewLabel}>Harina base</Text>
          <Text style={styles.previewValue}>1000 g = 100%</Text>
        </View>
        <View style={styles.previewLine}>
          <Text style={styles.previewLabel}>Harina secundaria</Text>
          <Text style={styles.previewValue}>100 g = 10%</Text>
        </View>
        <View style={styles.previewLine}>
          <Text style={styles.previewLabel}>Agua</Text>
          <Text style={styles.previewValue}>770 g = 70%</Text>
        </View>
      </View>
    );
  }

  if (preview === "editor") {
    return (
      <View style={styles.previewCard}>
        <Text style={styles.previewTitle}>Lectura de formula</Text>
        <View style={styles.previewField}>
          <Text style={styles.previewFieldLabel}>Agua</Text>
          <Text style={styles.previewFieldValue}>770 g = 70%</Text>
        </View>
        <View style={styles.previewField}>
          <Text style={styles.previewFieldLabel}>Aceite</Text>
          <Text style={styles.previewFieldValue}>40 g = 3.6%</Text>
        </View>
      </View>
    );
  }

  if (preview === "target") {
    return (
      <View style={styles.previewCard}>
        <Text style={styles.previewTitle}>Hidratacion principal</Text>
        <View style={styles.previewChip}>
          <Text style={styles.previewChipLabel}>70% 💧 sobre harina total</Text>
        </View>
        <Text style={styles.previewOptionBody}>
          El aceite aporta suavidad, pero no cambia la hidratacion principal visible.
        </Text>
      </View>
    );
  }

  if (preview === "breakdown") {
    return (
      <View style={styles.previewCard}>
        <Text style={styles.previewTitle}>Aporte del prefermento</Text>
        <View style={styles.previewBreakdownRow}>
          <Text style={styles.previewLabel}>Harina visible</Text>
          <Text style={styles.previewValue}>400 g</Text>
        </View>
        <View style={styles.previewBreakdownMeta}>
          <Text style={styles.previewBreakdownText}>[800 - 400]</Text>
          <View style={styles.previewHelpBadge}>
            <Text style={styles.previewHelpLabel}>?</Text>
          </View>
        </View>
        <View style={styles.previewBreakdownRow}>
          <Text style={styles.previewLabel}>Agua visible</Text>
          <Text style={styles.previewValue}>120 g</Text>
        </View>
        <View style={styles.previewBreakdownMeta}>
          <Text style={styles.previewBreakdownText}>[520 - 400]</Text>
          <View style={styles.previewHelpBadge}>
            <Text style={styles.previewHelpLabel}>?</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.previewCard}>
      <Text style={styles.previewTitle}>Masa y ajuste activo</Text>
      <View style={styles.previewOption}>
        <Text style={styles.previewOptionTitle}>Masa neta</Text>
        <Text style={styles.previewOptionBody}>
          Evita duplicar harina y agua ya contenidas en el prefermento.
        </Text>
      </View>
      <View style={styles.previewOption}>
        <Text style={styles.previewOptionTitle}>Objetivo activo</Text>
        <Text style={styles.previewOptionBody}>Podes escalar por harina total, masa o piezas.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1
  },
  fullBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(47, 42, 38, 0.32)"
  },
  dimBlock: {
    backgroundColor: "rgba(47, 42, 38, 0.38)",
    position: "absolute"
  },
  spotlight: {
    borderColor: "#FFF9EF",
    borderRadius: 22,
    borderWidth: 2,
    position: "absolute"
  },
  cardWrap: {
    left: theme.spacing.md,
    maxWidth: 520,
    position: "absolute",
    right: theme.spacing.md
  },
  cardWrapCentered: {
    bottom: 0,
    justifyContent: "center",
    top: 0
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.borderStrong,
    borderRadius: 28,
    borderWidth: 1,
    elevation: 6,
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    width: "100%"
  },
  progress: {
    color: theme.colors.textSoft,
    fontSize: 12,
    fontWeight: "700"
  },
  icon: {
    color: theme.colors.accentDeep,
    fontSize: 16,
    fontWeight: "800"
  },
  title: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: "800"
  },
  body: {
    color: theme.colors.textMuted,
    fontSize: 14,
    lineHeight: 22
  },
  previewCard: {
    backgroundColor: "#FBF7F0",
    borderColor: theme.colors.border,
    borderRadius: 18,
    borderWidth: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.md
  },
  previewTitle: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: "800"
  },
  previewLine: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  previewLabel: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: "600"
  },
  previewValue: {
    color: theme.colors.accentDeep,
    fontSize: 12,
    fontWeight: "800"
  },
  previewField: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 10
  },
  previewFieldLabel: {
    color: theme.colors.textSoft,
    fontSize: 11,
    fontWeight: "700"
  },
  previewFieldValue: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: "700"
  },
  previewChip: {
    alignSelf: "flex-start",
    backgroundColor: "#F3E8D9",
    borderColor: theme.colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 10
  },
  previewChipLabel: {
    color: theme.colors.accentDeep,
    fontSize: 12,
    fontWeight: "800"
  },
  previewBreakdownRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  previewBreakdownMeta: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8
  },
  previewBreakdownText: {
    color: theme.colors.accent,
    fontSize: 12,
    fontWeight: "800"
  },
  previewHelpBadge: {
    alignItems: "center",
    backgroundColor: "#F3E8D9",
    borderColor: theme.colors.border,
    borderRadius: 999,
    borderWidth: 1,
    height: 20,
    justifyContent: "center",
    width: 20
  },
  previewHelpLabel: {
    color: theme.colors.accentDeep,
    fontSize: 11,
    fontWeight: "800"
  },
  previewOption: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
    padding: theme.spacing.sm
  },
  previewOptionTitle: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: "800"
  },
  previewOptionBody: {
    color: theme.colors.textMuted,
    fontSize: 12,
    lineHeight: 18
  },
  actions: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing.sm,
    justifyContent: "space-between",
    marginTop: theme.spacing.sm
  },
  spacer: {
    width: 64
  },
  textAction: {
    paddingHorizontal: 8,
    paddingVertical: 10
  },
  textActionPressed: {
    opacity: theme.interaction.pressedOpacity
  },
  textActionLabel: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: "700"
  },
  primaryAction: {
    backgroundColor: theme.colors.accentDeep,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  primaryActionPressed: {
    opacity: theme.interaction.pressedOpacity
  },
  primaryActionLabel: {
    color: "#F8F5F1",
    fontSize: 13,
    fontWeight: "800"
  },
  skipRow: {
    alignItems: "flex-end"
  },
  skipAction: {
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  skipActionLabel: {
    color: theme.colors.textSoft,
    fontSize: 12,
    fontWeight: "700"
  }
});
