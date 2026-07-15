import { StyleSheet, Text, View } from "react-native";

import { theme } from "@/theme";

type HydrationBarProps = {
  hydration: number;
};

export function HydrationBar({ hydration }: HydrationBarProps) {
  const width = `${Math.max(0, Math.min(100, hydration))}%` as `${number}%`;

  return (
    <View style={styles.wrap}>
      <View style={styles.labels}>
        <Text style={styles.edge}>0%</Text>
        <View style={styles.barWrap}>
          <View style={styles.track}>
            <View style={[styles.fill, { width }]} />
            <Text style={styles.centerValue}>{hydration}%</Text>
          </View>
        </View>
        <Text style={styles.edge}>100%</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8
  },
  labels: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10
  },
  edge: {
    color: theme.colors.textMuted,
    fontSize: 12,
    width: 34
  },
  barWrap: {
    flex: 1
  },
  track: {
    alignItems: "center",
    backgroundColor: theme.colors.waterSoft,
    borderRadius: 14,
    height: 28,
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
    fontSize: 14,
    fontWeight: "800"
  }
});
