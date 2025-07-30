import { View, Text, StyleSheet, TouchableOpacity } from "react-native"
import LottieView from "lottie-react-native"
import { Feather } from "@expo/vector-icons"

// Hàm trợ giúp để lấy tên icon dựa trên cấp độ
const getLevelIcon = (level) => {
  if (level >= 70) {
    return "globe" // Ví dụ: Biểu tượng cao cấp nhất
  } else if (level >= 40) {
    return "zap" // Ví dụ: Biểu tượng cho cấp độ cao
  } else if (level >= 20) {
    return "crown" // Ví dụ: Biểu tượng vương miện
  } else if (level >= 10) {
    return "shield" // Ví dụ: Biểu tượng lá chắn
  } else if (level >= 5) {
    return "star" // Ví dụ: Biểu tượng ngôi sao
  } else {
    return "award" // Mặc định cho cấp độ thấp
  }
}

// Props: weekday, streak, onPressAnalysis, onPressNotifications, streakFireSource, colors, SPACING, notificationBadge
export default function HeaderHome({
  weekday = "Monday",
  streak = 0,
  level = null,
  streakFireSource,
  onPressAnalysis,
  onPressNotifications,
  colors = {},
  SPACING = 20,
  notificationBadge = 0,
}) {
  const currentLevelIcon = getLevelIcon(level)

  return (
    <View style={[styles.container, { paddingHorizontal: SPACING }]}> 
      {/* Weekday on the far left */}
      <Text style={[styles.weekday, { color: colors.headerText || "#0056d2" }]}>{weekday}</Text>

      <View style={{ flex: 1 }} />
      {/* Streak fire + number and level grouped together */}
      {(typeof streak === "number" && streak > 0) || level !== null ? (
        <View style={styles.streakLevelGroup}>
          {typeof streak === "number" && streak > 0 && (
            <View style={styles.streakContainer}>
              <LottieView source={streakFireSource} autoPlay loop style={styles.lottie} />
              <Text style={styles.streakText}>{streak}</Text>
            </View>
          )}
          {level !== null && (
            <View style={styles.levelContainer}>
              <Feather name={currentLevelIcon} size={18} color={colors.primary || "#0056d2"} style={{ marginRight: 2 }} />
              <Text style={styles.levelText}>Lv {level}</Text>
            </View>
          )}
        </View>
      ) : null}

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
  )

}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    height: 90, // Much taller header
    backgroundColor: "#fff",
    zIndex: 10,
    paddingTop: 40, // Even more top padding
    paddingBottom: 5, // Even more bottom padding
  },
  levelContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    paddingVertical: 2,
    marginLeft: 0,
  },
  levelText: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#0056d2",
    marginLeft: 2,
    marginRight: 2,
  },
  streakLevelGroup: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 8,
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
    streakLevelGroup: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 8,
  },
})
