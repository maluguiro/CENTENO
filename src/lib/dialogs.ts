import { Alert, Platform } from "react-native";

type ConfirmDialogOptions = {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  onConfirm: () => void;
};

type ThreeOptionDialogOptions = {
  title: string;
  message?: string;
  primaryText: string;
  secondaryText: string;
  cancelText?: string;
  onPrimary: () => void;
  onSecondary: () => void;
};

function webMessage(title: string, message?: string) {
  return message ? `${title}\n\n${message}` : title;
}

function getWebWindow() {
  return typeof window === "undefined" ? null : window;
}

export function showInfoDialog(title: string, message?: string) {
  if (Platform.OS === "web") {
    getWebWindow()?.alert(webMessage(title, message));
    return;
  }

  Alert.alert(title, message);
}

export function showErrorDialog(title: string, message?: string) {
  showInfoDialog(title, message);
}

export function showConfirmDialog({
  title,
  message,
  confirmText = "Aceptar",
  cancelText = "Cancelar",
  destructive = false,
  onConfirm
}: ConfirmDialogOptions) {
  if (Platform.OS === "web") {
    const confirmed = getWebWindow()?.confirm(
      `${webMessage(title, message)}\n\nAceptar: ${confirmText}\nCancelar: ${cancelText}`
    );

    if (confirmed) {
      onConfirm();
    }
    return;
  }

  Alert.alert(title, message, [
    { text: cancelText, style: "cancel" },
    { text: confirmText, style: destructive ? "destructive" : "default", onPress: onConfirm }
  ]);
}

export function showThreeOptionDialog({
  title,
  message,
  primaryText,
  secondaryText,
  cancelText = "Cancelar",
  onPrimary,
  onSecondary
}: ThreeOptionDialogOptions) {
  if (Platform.OS === "web") {
    const web = getWebWindow();

    if (
      web?.confirm(
        `${webMessage(title, message)}\n\nAceptar: ${primaryText}\nCancelar: elegir otra opcion.`
      )
    ) {
      onPrimary();
      return;
    }

    if (
      web?.confirm(
        `${webMessage(title, message)}\n\nAceptar: ${secondaryText}\nCancelar: ${cancelText}`
      )
    ) {
      onSecondary();
    }
    return;
  }

  Alert.alert(title, message, [
    { text: cancelText, style: "cancel" },
    { text: primaryText, onPress: onPrimary },
    { text: secondaryText, onPress: onSecondary }
  ]);
}
