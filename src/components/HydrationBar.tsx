import { StyleSheet, Text, View } from "react-native";

import { theme } from "@/theme";

type HydrationBarProps = {
  hydration: number;
};

export function HydrationBar({ hydration }: HydrationBarProps) {
  const width = `${Math.max(0, Math.min(100, hydration))}%` as `${number}%`;
  const hydrationLabel = `💧 ${hydration}%`;

  return (
    <View style={styles.wrap}>
      <View style={styles.labels}>
        <Text style={styles.edge}>0%</Text>
        <View style={styles.barWrap}>
          <View style={styles.track}>
            <View style={[styles.fill, { width }]} />
            <Text style={styles.centerValue}>{hydrationLabel}</Text>
          </View>
        </View>
        <Text style={styles.edge}>100%</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 6
  },
  labels: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10
  },
  edge: {
    color: theme.colors.textSoft,
    fontSize: 11,
    fontWeight: "600",
    width: 32
  },
  barWrap: {
    flex: 1
  },
  track: {
    alignItems: "center",
    backgroundColor: theme.colors.waterSoft,
    borderRadius: 16,
    height: 36,
    justifyContent: "center",
    overflow: "hidden",
    position: "relative"
  },
  fill: {
    backgroundColor: theme.colors.water,
    borderRadius: 999,
    height: "100%",
    left: 0,
    position: "absolute",
    top: 0
  },
  centerValue: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: "800"
  }
});
