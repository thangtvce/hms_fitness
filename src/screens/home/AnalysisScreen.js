import { View,Text,StyleSheet,ScrollView,Dimensions,Animated,Platform,TouchableOpacity } from "react-native"
import { useEffect,useRef } from "react"
import { LinearGradient } from "expo-linear-gradient"
import Header from "components/Header"
import DynamicStatusBar from "screens/statusBar/DynamicStatusBar"
import { theme } from "theme/color"
import { useNavigation } from "@react-navigation/native"
import { MaterialCommunityIcons,Feather } from "@expo/vector-icons"

const { width,height } = Dimensions.get("window")

const analysisCategories = [
  {
    id: "dietaryEnergy",
    title: "Dietary Energy",
    subtitle: "Track your calorie intake",
    image: require("../../../assets/images/analyst/streeak.png"),
    gradient: ["#FF6B6B","#FF4757"],
    targetScreen: "StreakCalendar",
    targetParams: {},
    icon: "fire",
  },
  {
    id: "dietaryIntake",
    title: "Dietary Intake",
    subtitle: "Monitor your nutrition",
    image: require("../../../assets/images/analyst/dieatary.png"),
    gradient: ["#6A5ACD","#8A2BE2"],
    targetScreen: "CaloriesLogStatisticsScreen",
    targetParams: {},
    icon: "nutrition",
  },
  {
    id: "waterIntake",
    title: "Water Intake",
    subtitle: "Stay hydrated daily",
    image: require("../../../assets/images/analyst/water.png"),
    gradient: ["#00BFFF","#1E90FF"],
    targetScreen: "WaterLogAnalyticsScreen",
    targetParams: {},
    icon: "water",
  },
  {
    id: "activeEnergy",
    title: "Active Energy",
    subtitle: "Calories burned tracking",
    image: require("../../../assets/images/analyst/active.png"),
    gradient: ["#20B2AA","#00CED1"],
    targetScreen: "ActiveStaticsScreen",
    targetParams: {},
    icon: "run-fast",
  },
  {
    id: "steps",
    title: "Steps",
    subtitle: "Daily step counter",
    image: require("../../../assets/images/analyst/step.png"),
    gradient: ["#FFD700","#FFA500"],
    targetScreen: "StepCounter",
    targetParams: {},
    icon: "walk",
  },
  {
    id: "weight",
    title: "Weight",
    subtitle: "Weight progress tracking",
    image: require("../../../assets/images/analyst/weight.png"),
    gradient: ["#A9A9A9","#808080"],
    targetScreen: "WeightAnalystScreen",
    targetParams: {},
    icon: "scale-bathroom",
  },
  {
    id: "nutrients",
    title: "Nutrients",
    subtitle: "Macro & micro nutrients",
    image: require("../../../assets/images/analyst/nutrients.png"),
    gradient: ["#3CB371","#2E8B57"],
    targetScreen: "NutrientLogStatistics",
    targetParams: {},
    icon: "leaf",
  },
  {
    id: "bodyMeasurements",
    title: "Body Measurements",
    subtitle: "Track body dimensions",
    image: require("../../../assets/images/analyst/body.png"),
    gradient: ["#9370DB","#8A2BE2"],
    targetScreen: "BodyMeasurementAnalyst",
    targetParams: {},
    icon: "human-male-height",
  },
  {
    id: "progressPhotos",
    title: "Progress Photos",
    subtitle: "Visual transformation",
    image: require("../../../assets/images/analyst/active.png"),
    gradient: ["#E91E63","#AD1457"], // Fixed gradient colors
    targetScreen: "ProgressComparisonScreen",
    targetParams: {},
    icon: "camera",
  },
]

export default function AnalysisScreen() {
  const navigation = useNavigation()
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(50)).current
  const scaleAnim = useRef(new Animated.Value(0.9)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,{
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim,{
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim,{
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start()

    return () => {
      fadeAnim.setValue(0)
      slideAnim.setValue(50)
      scaleAnim.setValue(0.9)
    }
  },[])

  const renderStatsOverview = () => (
    <Animated.View
      style={[
        styles.statsContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim },{ scale: scaleAnim }],
        },
      ]}
    >
      <LinearGradient colors={["#0056d2","#4285f4"]} style={styles.statsGradient}>
        <View style={styles.statsContent}>
          <View style={styles.statsHeader}>
            <View style={styles.statsIconContainer}>
              <MaterialCommunityIcons name="chart-line" size={32} color="#FFFFFF" />
            </View>
            <View style={styles.statsTextContainer}>
              <Text style={styles.statsTitle}>Health Analytics</Text>
              <Text style={styles.statsSubtitle}>Track your wellness journey</Text>
            </View>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>9</Text>
              <Text style={styles.statLabel}>Categories</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>24/7</Text>
              <Text style={styles.statLabel}>Tracking</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>∞</Text>
              <Text style={styles.statLabel}>Insights</Text>
            </View>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  )

  const renderCategorySection = (title,categories,delay = 0) => (
    <Animated.View
      style={[
        styles.categorySection,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim },{ scale: scaleAnim }],
        },
      ]}
    >
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={styles.sectionDivider} />
      </View>

      <View style={styles.gridContainer}>
        {categories.map((category,index) => (
          <Animated.View
            key={category.id}
            style={[
              styles.cardWrapper,
              {
                opacity: fadeAnim,
                transform: [
                  {
                    translateY: Animated.add(slideAnim,new Animated.Value(index * 10)),
                  },
                  { scale: scaleAnim },
                ],
              },
            ]}
          >
            <EnhancedAnalysisCard
              title={category.title}
              subtitle={category.subtitle}
              image={category.image}
              gradientColors={category.gradient}
              targetScreen={category.targetScreen}
              targetParams={category.targetParams}
              icon={category.icon}
            />
          </Animated.View>
        ))}
      </View>
    </Animated.View>
  )

  // Split categories into sections
  const primaryCategories = analysisCategories.slice(0,4)
  const secondaryCategories = analysisCategories.slice(4,7)
  const advancedCategories = analysisCategories.slice(7)

  return (
    <View style={styles.container}>
      <DynamicStatusBar backgroundColor={theme.primaryColor} />
      <Header
        title="Health Analytics"
        onBack={() => navigation.goBack()}
        style={{
          backgroundColor: theme.primaryColor,
          paddingTop: Platform.OS === "android" ? 40 : 20,
          paddingBottom: 10,
        }}
      />

      <ScrollView
        style={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Stats Overview */}
        {renderStatsOverview()}

        {/* Primary Categories */}
        {renderCategorySection("Essential Metrics",primaryCategories)}

        {/* Secondary Categories */}
        {renderCategorySection("Activity & Wellness",secondaryCategories)}

        {/* Advanced Categories */}
        {renderCategorySection("Advanced Tracking",advancedCategories)}

        {/* Bottom Spacer */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  )
}

const EnhancedAnalysisCard = ({ title,subtitle,image,gradientColors,targetScreen,targetParams,icon }) => {
  const navigation = useNavigation()
  const scaleValue = useRef(new Animated.Value(1)).current

  const handlePressIn = () => {
    Animated.spring(scaleValue,{
      toValue: 0.95,
      useNativeDriver: true,
    }).start()
  }

  const handlePressOut = () => {
    Animated.spring(scaleValue,{
      toValue: 1,
      useNativeDriver: true,
    }).start()
  }

  const handlePress = () => {
    navigation.navigate(targetScreen,targetParams)
  }

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={handlePress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View
        style={[
          styles.enhancedCard,
          {
            transform: [{ scale: scaleValue }],
          },
        ]}
      >
        <LinearGradient
          colors={[...gradientColors,gradientColors[1] + "E6"]}
          style={styles.cardGradient}
          start={{ x: 0,y: 0 }}
          end={{ x: 1,y: 1 }}
        >
          <View style={styles.cardContent}>
            {/* Background Pattern */}
            <View style={styles.backgroundPattern}>
              <MaterialCommunityIcons
                name={icon}
                size={100}
                color="rgba(255, 255, 255, 0.08)"
                style={styles.backgroundIcon}
              />
            </View>

            {/* Card Header */}
            <View style={styles.cardHeader}>
              <View style={styles.iconContainer}>
                <MaterialCommunityIcons name={icon} size={24} color="#FFFFFF" />
              </View>
              <View style={styles.cardBadge}>
                <Feather name="trending-up" size={12} color="#FFFFFF" />
              </View>
            </View>

            {/* Card Body */}
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle} numberOfLines={2}>
                {title}
              </Text>
              <Text style={styles.cardSubtitle} numberOfLines={2}>
                {subtitle}
              </Text>
            </View>

            {/* Card Footer - Removed progress bar */}
            <View style={styles.cardFooter}>
              <Text style={styles.viewMoreText}>View Analytics</Text>
              <Feather name="arrow-right" size={16} color="#FFFFFF" />
            </View>
          </View>
        </LinearGradient>
      </Animated.View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollViewContent: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },

  statsContainer: {
    marginHorizontal: 16,
    marginTop: 120,
    marginBottom: 32,
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  statsGradient: {
    padding: 24,
  },
  statsContent: {
    alignItems: "center",
  },
  statsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  statsIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  statsTextContainer: {
    flex: 1,
  },
  statsTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  statsSubtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.8)",
    fontWeight: "500",
  },
  statsGrid: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    width: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 16,
    paddingVertical: 16,
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },

  // Category Section Styles
  categorySection: {
    marginBottom: 32,
  },
  sectionHeader: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  sectionDivider: {
    height: 4,
    width: 60,
    backgroundColor: "#0056d2",
    borderRadius: 2,
  },

  // Grid Styles
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 8,
    justifyContent: "space-between",
  },
  cardWrapper: {
    width: (width - 48) / 2,
    marginHorizontal: 8,
    marginBottom: 16,
  },

  // Enhanced Card Styles - Fixed height for consistency
  enhancedCard: {
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    height: 180, // Fixed height for all cards
  },
  cardGradient: {
    flex: 1,
  },
  cardContent: {
    flex: 1,
    padding: 20,
    position: "relative",
    justifyContent: "space-between", // Distribute content evenly
  },
  backgroundPattern: {
    position: "absolute",
    top: -10,
    right: -10,
    opacity: 0.1,
  },
  backgroundIcon: {
    transform: [{ rotate: "15deg" }],
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  cardBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  cardBody: {
    flex: 1,
    justifyContent: "center",
    paddingVertical: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 6,
    lineHeight: 22,
  },
  cardSubtitle: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.8)",
    fontWeight: "500",
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  viewMoreText: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.9)",
    fontWeight: "600",
    flex: 1,
  },

  // Utility Styles
  bottomSpacer: {
    height: 40,
  },
})
