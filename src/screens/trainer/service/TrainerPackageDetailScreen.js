"use client"

import { useState, useEffect, useRef } from "react"
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Animated,
  Platform,
  Image,
  Dimensions,
} from "react-native"
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import { SafeAreaView } from "react-native-safe-area-context"
import { BlurView } from "expo-blur"
import { useAuth } from "context/AuthContext"
import { theme } from "theme/color"
import { useNavigation, useRoute } from "@react-navigation/native"
import { trainerService } from "services/apiTrainerService"
import DynamicStatusBar from "screens/statusBar/DynamicStatusBar"

const { width, height } = Dimensions.get("window")
const isIOS = Platform.OS === "ios"

const ServicePackageDetail = () => {
  const { user, loading: authLoading } = useAuth()
  const navigation = useNavigation()
  const route = useRoute()
  const { packageId } = route.params
  const [packageData, setPackageData] = useState(null)
  const [loading, setLoading] = useState(true)

  // Enhanced animations
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(50)).current
  const scaleAnim = useRef(new Animated.Value(0.9)).current
  const headerOpacity = useRef(new Animated.Value(0)).current
  const scrollY = useRef(new Animated.Value(0)).current

  useEffect(() => {
    // Staggered entrance animations
    Animated.sequence([
      Animated.timing(headerOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),
    ]).start()

    return () => {
      fadeAnim.setValue(0)
      slideAnim.setValue(50)
      scaleAnim.setValue(0.9)
      headerOpacity.setValue(0)
    }
  }, [])

  useEffect(() => {
    if (authLoading) return

     if (!user?.roles?.includes('Trainer') && user?.roles?.includes('User')) {
      Alert.alert("Access Denied", "This page is only accessible to trainers.")
      navigation.goBack()
      return
    }

    if (!packageId) {
      Alert.alert("Error", "Invalid package ID")
      navigation.goBack()
      return
    }

    const fetchPackageDetails = async () => {
      try {
        setLoading(true)
        const response = await trainerService.getServicePackage({ PackageId: packageId, TrainerId: user.userId })
        if (response.statusCode === 200 && response.data?.packages?.length > 0) {
          const pkg = response.data.packages.find((p) => p.packageId === packageId)
          if (pkg && pkg.trainerId === user.userId) {
            setPackageData(pkg)
          } else {
            Alert.alert("Error", "Package not found or you do not have permission to view it.")
            navigation.goBack()
          }
        } else {
          Alert.alert("Error", "Package not found.")
          navigation.goBack()
        }
      } catch (error) {
        console.error("Fetch Error:", error)
        Alert.alert("Error", error.message || "Failed to load package details.")
        navigation.goBack()
      } finally {
        setLoading(false)
      }
    }

    fetchPackageDetails()
  }, [authLoading, user, packageId, navigation])

  const getPackageIcon = (packageName) => {
    if (!packageName) return "fitness"
    const name = packageName.toLowerCase()
    if (name.includes("yoga") || name.includes("meditation")) return "yoga"
    if (name.includes("diet") || name.includes("nutrition")) return "nutrition"
    if (name.includes("cardio") || name.includes("running")) return "cardio"
    return "fitness"
  }

  const renderPackageIcon = (type) => {
    const iconProps = { size: 28, style: styles.headerIcon }
    switch (type) {
      case "yoga":
        return <MaterialCommunityIcons name="yoga" color="#10B981" {...iconProps} />
      case "nutrition":
        return <Ionicons name="nutrition" color="#F59E0B" {...iconProps} />
      case "cardio":
        return <Ionicons name="heart" color="#EF4444" {...iconProps} />
      default:
        return <MaterialCommunityIcons name="weight-lifter" color="#4F46E5" {...iconProps} />
    }
  }

  const handleRestore = async () => {
    try {
      const response = await trainerService.restoreServicePackage(packageId)
      if (response.statusCode === 200) {
        Alert.alert("Success", "Package restored successfully.", [{ text: "OK", onPress: () => navigation.goBack() }])
      } else {
        Alert.alert("Error", response.message || "Failed to restore package.")
      }
    } catch (error) {
      Alert.alert("Error", error.message || "An error occurred while restoring the package.")
    }
  }

  if (loading || !packageData) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <DynamicStatusBar backgroundColor={theme.primaryColor} />
        <LinearGradient colors={["#667eea", "#764ba2", "#f093fb"]} style={styles.loadingContainer}>
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.loadingText}>Loading package details...</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    )
  }

  const packageType = getPackageIcon(packageData.packageName)
  const statusColor = packageData.status === "active" ? "#10B981" : "#EF4444"

  // Animated header background based on scroll
  const headerBackgroundOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, 1],
    extrapolate: "clamp",
  })

  return (
    <View style={styles.container}>
      <DynamicStatusBar backgroundColor="transparent" />

      {/* Enhanced Animated Header */}
      <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
        <LinearGradient
          colors={["#667eea", "#764ba2", "#f093fb"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <SafeAreaView style={styles.safeArea}>
            <Animated.View style={[styles.headerBackground, { opacity: headerBackgroundOpacity }]}>
              <BlurView intensity={80} style={StyleSheet.absoluteFill} />
            </Animated.View>

            <View style={styles.headerContent}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
                activeOpacity={0.8}
                accessibilityLabel="Go back"
              >
                <View style={styles.buttonContainer}>
                  <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                </View>
              </TouchableOpacity>

              <View style={styles.headerTitleContainer}>
                <Text style={styles.headerTitle} numberOfLines={1}>
                  {packageData.packageName || "Service Package"}
                </Text>
                <Text style={styles.headerSubtitle}>Package Details</Text>
              </View>

              <TouchableOpacity
                style={styles.editButton}
                onPress={() => navigation.navigate("EditServicePackage", { packageId })}
                activeOpacity={0.8}
                accessibilityLabel="Edit package"
              >
                <View style={styles.buttonContainer}>
                  <Ionicons name="pencil" size={20} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </LinearGradient>
      </Animated.View>

      {/* Enhanced Content */}
      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        scrollEventThrottle={16}
      >
        {/* Enhanced Hero Card */}
        <Animated.View
          style={[
            styles.heroCard,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
            },
          ]}
        >
          <LinearGradient colors={["#FFFFFF", "#F8FAFC"]} style={styles.heroCardGradient}>
            {/* Enhanced Status Badge */}
            <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>
                {packageData.status.charAt(0).toUpperCase() + packageData.status.slice(1)}
              </Text>
            </View>

            {/* Enhanced Main Content */}
            <View style={styles.heroContent}>
              <View style={styles.avatarContainer}>
                {packageData.trainerAvatar ? (
                  <Image
                    source={{ uri: packageData.trainerAvatar }}
                    style={styles.trainerAvatar}
                    accessibilityLabel="Trainer avatar"
                  />
                ) : (
                  <View style={styles.iconContainer}>{renderPackageIcon(packageType)}</View>
                )}
                <View style={styles.avatarBorder} />
              </View>

              <View style={styles.titleSection}>
                <Text style={styles.packageTitle}>{packageData.packageName || "Service Package"}</Text>
                <Text style={styles.trainerInfo}>by You</Text>
                <Text style={styles.trainerEmail}>{packageData.trainerEmail || "N/A"}</Text>
              </View>
            </View>

            {/* Enhanced Price Section */}
            <View style={styles.priceSection}>
              <Text style={styles.priceLabel}>Package Price</Text>
              <Text style={styles.priceValue}>
                {packageData.price ? `$${packageData.price.toLocaleString()}` : "Contact"}
              </Text>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Enhanced Description Card */}
        <Animated.View
          style={[
            styles.card,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.cardHeader}>
            <Ionicons name="document-text-outline" size={24} color="#4F46E5" />
            <Text style={styles.cardTitle}>Description</Text>
          </View>
          <Text style={styles.description}>
            {packageData.description ? packageData.description.replace(/<[^>]+>/g, "") : "No description available"}
          </Text>
        </Animated.View>

        {/* Enhanced Stats Grid */}
        <Animated.View
          style={[
            styles.statsGrid,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={[styles.statCard, styles.statCard1]}>
            <LinearGradient colors={["#667eea", "#764ba2"]} style={styles.statGradient}>
              <Ionicons name="calendar-outline" size={24} color="#FFFFFF" />
              <Text style={styles.statValue}>{packageData.durationDays || "N/A"}</Text>
              <Text style={styles.statLabel}>Days</Text>
            </LinearGradient>
          </View>

          <View style={[styles.statCard, styles.statCard2]}>
            <LinearGradient colors={["#f093fb", "#f5576c"]} style={styles.statGradient}>
              <Ionicons name="people-outline" size={24} color="#FFFFFF" />
              <Text style={styles.statValue}>{packageData.SubscriptionCount || 0}</Text>
              <Text style={styles.statLabel}>Subscribers</Text>
            </LinearGradient>
          </View>
        </Animated.View>

        {/* Enhanced Timeline Card */}
        <Animated.View
          style={[
            styles.card,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.cardHeader}>
            <Ionicons name="time-outline" size={24} color="#4F46E5" />
            <Text style={styles.cardTitle}>Timeline</Text>
          </View>

          <View style={styles.timeline}>
            <View style={styles.timelineItem}>
              <View style={styles.timelineDot} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineLabel}>Created</Text>
                <Text style={styles.timelineDate}>
                  {new Date(packageData.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </Text>
              </View>
            </View>

            <View style={styles.timelineLine} />

            <View style={styles.timelineItem}>
              <View style={[styles.timelineDot, styles.timelineDotActive]} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineLabel}>Last Updated</Text>
                <Text style={styles.timelineDate}>
                  {packageData.updatedAt
                    ? new Date(packageData.updatedAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : "Never"}
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Enhanced Action Button */}
        {packageData.status !== "active" && (
          <Animated.View
            style={[
              styles.actionContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <TouchableOpacity
              style={styles.restoreButton}
              onPress={handleRestore}
              disabled={loading}
              activeOpacity={0.8}
              accessibilityLabel="Restore package"
            >
              <LinearGradient colors={["#10B981", "#059669"]} style={styles.restoreButtonGradient}>
                <Ionicons name="refresh-outline" size={20} color="#FFFFFF" />
                <Text style={styles.restoreButtonText}>Restore Package</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </Animated.ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContent: {
    alignItems: "center",
    padding: 32,
  },
  loadingText: {
    fontSize: 16,
    color: "#FFFFFF",
    marginTop: 16,
    fontWeight: "600",
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  headerGradient: {
    paddingTop: isIOS ? 0 : Platform.OS === "android" ? 25 : 0,
  },
  headerBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    zIndex: 10,
  },
  editButton: {
    zIndex: 10,
  },
  buttonContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
    marginTop: 2,
  },
  headerIcon: {
    marginBottom: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: isIOS ? 120 : 140,
    paddingHorizontal: 20,
  },
  heroCard: {
    marginBottom: 24,
    borderRadius: 24,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 24,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  heroCardGradient: {
    padding: 24,
    position: "relative",
  },
  statusBadge: {
    position: "absolute",
    top: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    zIndex: 10,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FFFFFF",
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  heroContent: {
    alignItems: "center",
    marginTop: 20,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 16,
  },
  trainerAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarBorder: {
    position: "absolute",
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 44,
    borderWidth: 3,
    borderColor: "#4F46E5",
    opacity: 0.3,
  },
  titleSection: {
    alignItems: "center",
  },
  packageTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1E293B",
    textAlign: "center",
    marginBottom: 8,
  },
  trainerInfo: {
    fontSize: 16,
    color: "#64748B",
    fontWeight: "600",
    marginBottom: 4,
  },
  trainerEmail: {
    fontSize: 14,
    color: "#94A3B8",
    fontWeight: "500",
  },
  priceSection: {
    alignItems: "center",
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  priceLabel: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 32,
    fontWeight: "800",
    color: "#4F46E5",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
    marginLeft: 12,
  },
  description: {
    fontSize: 16,
    color: "#64748B",
    lineHeight: 24,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    borderRadius: 20,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  statGradient: {
    padding: 20,
    alignItems: "center",
    minHeight: 120,
    justifyContent: "center",
  },
  statValue: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    fontWeight: "600",
  },
  timeline: {
    position: "relative",
  },
  timelineItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#CBD5E1",
    marginRight: 16,
  },
  timelineDotActive: {
    backgroundColor: "#4F46E5",
  },
  timelineLine: {
    position: "absolute",
    left: 5.5,
    top: 24,
    bottom: 24,
    width: 1,
    backgroundColor: "#E2E8F0",
  },
  timelineContent: {
    flex: 1,
  },
  timelineLabel: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "600",
    marginBottom: 2,
  },
  timelineDate: {
    fontSize: 16,
    color: "#1E293B",
    fontWeight: "500",
  },
  actionContainer: {
    marginTop: 8,
    marginBottom: 16,
  },
  restoreButton: {
    borderRadius: 16,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#10B981",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  restoreButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  restoreButtonText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "700",
    marginLeft: 8,
  },
  bottomSpacing: {
    height: 40,
  },
})

export default ServicePackageDetail;