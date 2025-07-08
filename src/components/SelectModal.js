import React, { useRef, useEffect } from "react";
import {
  Modal,
  Animated,
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  Platform,
  Dimensions,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const { height } = Dimensions.get("window");

/**
 * Flexible Select Modal
 * @param {Object} props
 * @param {boolean} props.visible - Show/hide modal
 * @param {function} props.onClose - Called when modal is dismissed
 * @param {string} props.title - Modal title
 * @param {Array} props.options - Array of options (string or {label, value, icon})
 * @param {any} props.selected - Currently selected value
 * @param {function} props.onSelect - Called with selected value
 * @param {function} [props.renderOption] - Custom render function (option, isSelected) => ReactNode
 * @param {object} [props.theme] - Optional color theme
 */
export default function SelectModal({
  visible,
  onClose,
  title = "Select Option",
  options = [],
  selected,
  onSelect,
  renderOption,
  theme = {},
}) {
  const animation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(animation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(animation, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const getLabel = (option) =>
    typeof option === "string" ? option : option.label || String(option.value);
  const getValue = (option) =>
    typeof option === "string" ? option : option.value;
  const getIcon = (option) => (typeof option === "object" && option.icon ? option.icon : null);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View
        style={[
          styles.overlay,
          { opacity: animation },
        ]}
      >
        <TouchableOpacity style={styles.background} onPress={onClose} />
        <Animated.View
          style={[
            styles.container,
            {
              transform: [
                {
                  translateY: animation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [height * 0.4, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.titleColor || "#1E293B" }]}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.iconColor || "#64748B"} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={options}
            keyExtractor={(item, idx) => getValue(item) + "" + idx}
            renderItem={({ item }) => {
              const isSelected = getValue(item) === selected;
              if (renderOption) {
                return renderOption(item, isSelected, onSelect);
              }
              return (
                <TouchableOpacity
                  style={styles.option}
                  onPress={() => onSelect(getValue(item))}
                >
                  <View style={styles.optionContent}>
                    {getIcon(item) && (
                      <Ionicons
                        name={getIcon(item)}
                        size={22}
                        color={theme.iconColor || "#0056d2"}
                        style={{ marginRight: 12 }}
                      />
                    )}
                    <Text
                      style={[
                        styles.optionText,
                        { color: theme.optionColor || "#1E293B" },
                        isSelected && { color: theme.selectedColor || "#0056d2", fontWeight: "bold" },
                      ]}
                    >
                      {getLabel(item)}
                    </Text>
                  </View>
                  {isSelected && (
                    <Ionicons name="checkmark" size={20} color={theme.selectedColor || "#0056d2"} />
                  )}
                </TouchableOpacity>
              );
            }}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            contentContainerStyle={{ paddingBottom: 16 }}
          />
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  container: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "70%",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  optionContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  optionText: {
    fontFamily: "Inter_400Regular",
    fontSize: 16,
  },
  separator: {
    height: 1,
    backgroundColor: "#F1F5F9",
  },
});
