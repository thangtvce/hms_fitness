import { View, Text, StyleSheet, ScrollView, Dimensions } from "react-native"
import Header from "components/Header"
import AnalysisCard from "components/AnalysisCard"
import DynamicStatusBar from "screens/statusBar/DynamicStatusBar"
import { theme } from "theme/color"
import { useNavigation } from "@react-navigation/native"

const { width } = Dimensions.get("window")

const analysisCategories = [
  {
    id: "dietaryEnergy",
    title: "Dietary Energy",
    icon: "flame-outline",
    gradient: ["#FF6B6B", "#FF4757"], // Red-Orange gradient
    targetScreen: "StreakCalendar",
    targetParams: {},
  },
  {
    id: "dietaryIntake",
    title: "Dietary Intake",
    icon: "nutrition-outline",
    gradient: ["#6A5ACD", "#8A2BE2"], // Purple-Blue gradient
    targetScreen: "CaloriesLogStatisticsScreen",
    targetParams: {},
  },
  {
    id: "waterIntake",
    title: "Water Intake",
    icon: "water-outline",
    gradient: ["#00BFFF", "#1E90FF"], // Sky Blue-Dodger Blue gradient
    targetScreen: "WaterLogAnalyticsScreen",
    targetParams: {},
  },
  {
    id: "activeEnergy",
    title: "Active Energy",
    icon: "walk-outline",
    gradient: ["#20B2AA", "#00CED1"], // Teal-Turquoise gradient
    targetScreen: "ActiveStaticsScreen",
    targetParams: {},
  },
  {
    id: "steps",
    title: "Steps",
    icon: "footsteps-outline",
    gradient: ["#FFD700", "#FFA500"], // Gold-Orange gradient
    targetScreen: "StepCounter",
    targetParams: {},
  },
  {
    id: "weight",
    title: "Weight",
    icon: "scale-outline",
    gradient: ["#A9A9A9", "#808080"], // Dark Gray gradient
    targetScreen: "WeightHistory",
    targetParams: {},
  },
  {
    id: "nutrients",
    title: "Nutrients",
    icon: "leaf-outline",
    gradient: ["#3CB371", "#2E8B57"], // Medium Sea Green gradient
    targetScreen: "NutrientLogStatistics",
    targetParams: {},
  },
  // Hidden: Minerals
  // Hidden: Vitamins
  {
    id: "bodyMeasurements",
    title: "Body Measurements",
    icon: "body-outline",
    gradient: ["#9370DB", "#8A2BE2"], // Medium Purple-Blue Violet gradient
    targetScreen: "FoodList", // Placeholder
    targetParams: {},
  },
]

export default function AnalysisScreen() {
  const navigation = useNavigation()

  return (
    <View style={styles.container}>
      <DynamicStatusBar backgroundColor={theme.primaryColor} />
      <Header title="Analysis" onBack={() => navigation.goBack()} />

      <ScrollView style={styles.scrollViewContent}>
        <Text style={styles.sectionTitle}>Analysis</Text>
        <View style={styles.gridContainer}>
          {analysisCategories.map((category) => (
            <AnalysisCard
              key={category.id}
              title={category.title}
              iconName={category.icon}
              gradientColors={category.gradient}
              targetScreen={category.targetScreen}
              targetParams={category.targetParams}
            />
          ))}
        </View>
        <View style={{ height: 40 }} />
        {/* Spacer at the bottom */}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff", // Nền trắng
  },
  scrollViewContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 24, // Larger title
    fontWeight: "800", // Extra bold
    color: "#2C3E50", // Darker, more prominent text
    marginBottom: 18, // More space below title
    marginTop: 100, // Cách header 55px
    marginLeft: 4,
    textTransform: "uppercase", // Uppercase for emphasis
    letterSpacing: 0.5,
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-around", // Distribute items evenly with space
    paddingHorizontal: 0,
  },
})
