import React, { useContext } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ThemeContext } from "components/theme/ThemeContext";
import { AuthContext } from "context/AuthContext";

const Header = ({
  title,
  onBack,
  rightActions = [],
  showAvatar = false,
  backgroundColor,
  textColor,
  containerStyle,
}) => {
  const { colors } = useContext(ThemeContext);
  const { user } = useContext(AuthContext);

  const bgColor = backgroundColor || colors.headerBackground || "#FFFFFF";
  const txtColor = textColor || colors.headerText || "#1E293B";

  return (
    <View style={[styles.headerContainer, { backgroundColor: bgColor }, containerStyle]}>
      <View style={styles.header}>
        <View style={styles.headerSide}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={txtColor} />
            </TouchableOpacity>
          )}
          {showAvatar && user && (
            <TouchableOpacity
              style={styles.avatarContainer}
              onPress={() => onBack && onBack()}
            >
              <Image
                source={{
                  uri:
                    user.avatar ||
                    "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
                }}
                style={styles.avatar}
              />
              <View style={[styles.onlineIndicator, { backgroundColor: colors.success || "#10B981" }]} />
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: txtColor }]}>{title}</Text>
        </View>
        <View style={[styles.headerSide, styles.headerSideRight]}>
          {rightActions.length > 0 && (
            <View style={styles.headerActions}>
              {rightActions.map((action, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.headerButton, { backgroundColor: colors.headerButtonBackground || "#F3F4F6" }]}
                  onPress={action.onPress}
                >
                  {typeof action.icon === "string"
                    ? <Ionicons name={action.icon} size={20} color={action.color || colors.primary || "#1E293B"} />
                    : action.icon}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 50,
  },
  headerSide: {
    width: 100,
    alignItems: "flex-start",
  },
  headerSideRight: {
    alignItems: "flex-end",
  },
  headerTitleContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  backButton: {
    padding: 4,
  },
  avatarContainer: {
    position: "relative",
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  onlineIndicator: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
    padding: 4,
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default Header;