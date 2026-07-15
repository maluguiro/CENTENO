import { StyleSheet, Text, View } from "react-native";

import { theme } from "@/theme";

type MetricChipProps = {
  label: string;
  value: string;
};

export function MetricChip({ label, value }: MetricChipProps) {
  return (
    <View style={styles.chip}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.borderStrong,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    gap: 4,
    minWidth: "31%",
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  label: {
    color: theme.colors.textMuted,
    fontSize: 11,
    textTransform: "uppercase"
  },
  value: {
    color: theme.colors.accent,
    fontSize: 18,
    fontWeight: "800"
  }
});
