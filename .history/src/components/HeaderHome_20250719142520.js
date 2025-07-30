import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import LottieView from "lottie-react-native";
import { Feather } from "@expo/vector-icons";

// Props: weekday, streak, onPressAnalysis, onPressNotifications, streakFireSource, colors, SPACING, notificationBadge
export default function HeaderHome({
  weekday = "Monday",
  streak = 0,
  streakFireSource,
  onPressAnalysis,
  onPressNotifications,
  colors = {},
  SPACING = 20,
  notificationBadge = 0,
}) {
  return (
    <View style={[styles.container, { paddingHorizontal: SPACING }]}> 
      {/* Streak fire + number */}
      {typeof streak === "number" && streak > 0 && (
        <View style={styles.streakContainer}>
          <LottieView
            source={streakFireSource}
            autoPlay
            loop
            style={styles.lottie}
          />
          <Text style={styles.streakText}>{streak}</Text>
        </View>
      )}
      {/* Weekday */}
      <Text style={[styles.weekday, { color: colors.headerText || "#0056d2" }]}>{weekday}</Text>
      <View style={{ flex: 1 }} />
      {/* Analysis icon */}
      <TouchableOpacity style={styles.iconButton} onPress={onPressAnalysis}>
        <Feather name="bar-chart-2" size={24} color={colors.primary || "#0056d2"} />
      </TouchableOpacity>
      {/* Notifications icon */}
      <TouchableOpacity style={styles.iconButton} onPress={onPressNotifications}>
        <Feather name="bell" size={24} color={colors.primary || "#0056d2"} />
        {notificationBadge > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{notificationBadge}</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    height: 120, // Much taller header
    backgroundColor: "#fff",
    zIndex: 10,
    paddingTop: 32, // Even more top padding
    paddingBottom: 32, // Even more bottom padding
  },
  streakContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 8,
  },
  lottie: {
    width: 32,
    height: 32,
  },
  streakText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#F59E0B",
    marginLeft: 2,
  },
  weekday: {
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 0,
    marginRight: 12,
  },
  iconButton: {
    marginLeft: 8,
    padding: 6,
    borderRadius: 20,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  badge: {
    position: "absolute",
    top: 2,
    right: 2,
    backgroundColor: "#F59E0B",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 3,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
});
