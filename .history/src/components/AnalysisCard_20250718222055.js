import { TouchableOpacity, Text, StyleSheet, Platform } from "react-native"
import { useNavigation } from "@react-navigation/native"
import { LinearGradient } from "expo-linear-gradient" 
import { Ionicons } from "@expo/vector-icons" 

const AnalysisCard = ({ title, iconName, gradientColors, targetScreen, targetParams }) => {
  const navigation = useNavigation()
  const handlePress = () => {
    if (targetScreen) {
      navigation.navigate(targetScreen, targetParams)
    } else {
      console.warn(`No target screen defined for ${title}`)
    }
  }
  return (
    <TouchableOpacity style={styles.cardContainer} onPress={handlePress} activeOpacity={0.8}>
      <LinearGradient colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cardGradient}>
        <Ionicons name={iconName} size={36} color="#FFFFFF" style={styles.cardIcon} />
        <Text style={styles.cardTitle}>{title}</Text>
      </LinearGradient>
    </TouchableOpacity>
  )
}
const styles = StyleSheet.create({
  cardContainer: {
    width: "47%", 
    marginBottom: 16,
    borderRadius: 20, 
    overflow: "hidden", 
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 }, 
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 10, 
      },
    }),
  },
  cardGradient: {
    flex: 1,
    paddingVertical: 24,
    paddingHorizontal: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  cardIcon: {
    marginBottom: 12, 
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF", 
    textAlign: "center",
  },
})

export default AnalysisCard
