"use client"

import { useState, useEffect, useRef } from "react"
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Animated,
  Platform,
} from "react-native"
import Loading from "components/Loading";
import { showErrorFetchAPI, showSuccessMessage } from "utils/toastUtil";
import HTML from "react-native-render-html"
import { LinearGradient } from "expo-linear-gradient"
import { useAuth } from "context/AuthContext"
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons"
import Header from "components/Header"
import DynamicStatusBar from "screens/statusBar/DynamicStatusBar"
import { Share } from "react-native"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { SafeAreaView } from "react-native-safe-area-context"
import apiTrainerService from "services/apiTrainerService"

const { width, height } = Dimensions.get("window")

const PackageDetailScreen = ({ route, navigation }) => {
  const { package: initialPackage } = route.params || {}
  const { user } = useAuth()
  const [packageData, setPackageData] = useState(initialPackage || null)
  const [relatedPackages, setRelatedPackages] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingRelated, setLoadingRelated] = useState(false)
  const [error, setError] = useState(null)
  const [showFullDescription, setShowFullDescription] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [trainerRatingData, setTrainerRatingData] = useState(null)
  const [trainerExperience, setTrainerExperience] = useState(null)

  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(30)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start()
  }, [])

  useEffect(() => {
    const checkSavedStatus = async () => {
      if (!packageData?.packageId) return
      try {
        const savedPackages = await AsyncStorage.getItem("@SavedPackages")
        const packages = savedPackages ? JSON.parse(savedPackages) : []
        setIsSaved(packages.some((pkg) => pkg.packageId === packageData.packageId))
      } catch (error) {
        // Silent catch
      }
    }
    checkSavedStatus()
  }, [packageData])

  useEffect(() => {
    const fetchTrainerData = async () => {
      if (!initialPackage?.packageId || !initialPackage?.trainerId) {
        setError("Invalid package or trainer data provided.")
        setLoading(false)
        showErrorFetchAPI("Invalid package data provided.");
        navigation.goBack();
        return;
      }

      try {
        const ratingData = await apiTrainerService.getTrainerAverageRating(initialPackage.trainerId)
        setTrainerRatingData(ratingData.data)

        const applicationData = await apiTrainerService.getApprovedTrainerApplication(initialPackage.trainerId)
        setTrainerExperience(applicationData.data)

        setPackageData(initialPackage)
        setRelatedPackages([])
        setLoading(false)
        setLoadingRelated(false)
      } catch (error) {
        setError("Failed to fetch trainer data.")
        setLoading(false)
        showErrorFetchAPI("Unable to load trainer details.");
        navigation.goBack();
      }
    }

    fetchTrainerData()
  }, [initialPackage])

  const getPackageIcon = (packageName) => {
    if (!packageName) return "fitness"
    const name = packageName.toLowerCase()
    if (name.includes("yoga") || name.includes("meditation")) {
      return "yoga"
    } else if (name.includes("diet") || name.includes("nutrition")) {
      return "nutrition"
    } else if (name.includes("cardio") || name.includes("running")) {
      return "cardio"
    } else if (name.includes("strength") || name.includes("weight")) {
      return "strength"
    } else if (name.includes("wellness") || name.includes("mental")) {
      return "wellness"
    } else {
      return "fitness"
    }
  }

  const renderPackageIcon = (type, size = 24) => {
    const iconProps = { size, color: "#FFFFFF" }
    switch (type) {
      case "yoga":
        return <MaterialCommunityIcons name="yoga" {...iconProps} />
      case "nutrition":
        return <Ionicons name="nutrition" {...iconProps} />
      case "cardio":
        return <Ionicons name="heart" {...iconProps} />
      case "strength":
        return <MaterialCommunityIcons name="weight-lifter" {...iconProps} />
      case "wellness":
        return <MaterialCommunityIcons name="meditation" {...iconProps} />
      default:
        return <MaterialCommunityIcons name="dumbbell" {...iconProps} />
    }
  }

  const stripHtmlAndTruncate = (text, maxLength = 150) => {
    if (!text || typeof text !== "string") return ""
    const plainText = text
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim()
    if (plainText.length > maxLength) {
      return plainText.substring(0, maxLength - 3) + "..."
    }
    return plainText
  }

  const handleShareService = async () => {
    try {
      if (!packageData || !packageData.packageName) {
        throw new Error("Invalid or missing service data")
      }

      const message = `Check out the "${packageData.packageName}" fitness service${
        packageData.trainerFullName ? ` with ${packageData.trainerFullName}` : ""
      } on HMS 3DO!${packageData.description ? `\n${stripHtmlAndTruncate(packageData.description, 150)}` : ""}${
        packageData.price ? `\nPrice: $${packageData.price}` : ""
      }${packageData.durationDays ? `\nDuration: ${packageData.durationDays} days` : ""}
Join me on the fitness journey! Download HMS 3DO: ${
        Platform.OS === "ios" ? "https://apple.co/hms-3do" : "https://play.google.com/store/apps/details?id=com.hms3do"
      }`.trim()

      const shareOptions = {
        title: "HMS 3DO Fitness Service",
        message,
        ...(Platform.OS === "ios" && { url: "https://apple.co/hms-3do" }),
      }

      await Share.share(shareOptions)
    } catch (error) {
      showErrorFetchAPI(`Unable to share service details: ${error.message}`)
    }
  }

  const handleSavePackage = async () => {
    if (!user?.userId) {
      showErrorFetchAPI("Please log in to save this package.");
      navigation.navigate("Login");
      return;
    }

    try {
      const savedPackages = await AsyncStorage.getItem("@SavedPackages")
      let packages = savedPackages ? JSON.parse(savedPackages) : []

      if (isSaved) {
        packages = packages.filter((pkg) => pkg.packageId !== packageData.packageId)
        setIsSaved(false)
        showSuccessMessage("Package removed from saved list.");
      } else {
        const packageToSave = {
          packageId: packageData.packageId,
          packageName: packageData.packageName,
          trainerFullName: packageData.trainerFullName,
          trainerAvatar: packageData.trainerAvatar,
          price: packageData.price,
          durationDays: packageData.durationDays,
          description: packageData.description,
          status: packageData.status,
          createdAt: packageData.createdAt,
          updatedAt: packageData.updatedAt,
          trainerId: packageData.trainerId,
          maxSubscribers: packageData.maxSubscribers,
          currentSubscribers: packageData.currentSubscribers,
        }
        packages.push(packageToSave)
        setIsSaved(true)
        showSuccessMessage("Package saved successfully!");
      }

      await AsyncStorage.setItem("@SavedPackages", JSON.stringify(packages))
    } catch (error) {
      showErrorFetchAPI("Unable to save package: " + error.message);
    }
  }

  const handleCheckout = () => {
    if (!user?.userId) {
      showErrorFetchAPI("Please log in to enroll in this package.");
      navigation.navigate("Login");
      return;
    }

    if (!packageData?.price || packageData.price <= 0) {
      showErrorFetchAPI("Invalid service package price.");
      return;
    }

    navigation.navigate("Payment", {
      packageId: packageData.packageId,
      packageName: packageData.packageName,
      price: packageData.price,
      trainerId: packageData.trainerId || null,
      trainerFullName: packageData.trainerFullName,
      userId: user.userId,
    })
  }

  const renderDescription = () => {
    if (!packageData?.description) {
      return (
        <View style={styles.emptyDescription}>
          <Ionicons name="document-text-outline" size={32} color="#94A3B8" />
          <Text style={styles.emptyDescriptionText}>No description available</Text>
        </View>
      )
    }

    const description = packageData.description
    const isLongText = description.length > 200
    const displayText = showFullDescription || !isLongText ? description : description.substring(0, 200) + "..."

    return (
      <View>
        <HTML
          source={{ html: displayText }}
          contentWidth={width - 64}
          tagsStyles={{
            p: { marginBottom: 8, color: "#64748B", fontSize: 14, lineHeight: 20 },
            li: { color: "#64748B", fontSize: 14, marginBottom: 4, lineHeight: 20 },
            h1: { color: "#1F2937", fontSize: 18, fontWeight: "bold", marginVertical: 8 },
            h2: { color: "#1F2937", fontSize: 16, fontWeight: "bold", marginVertical: 6 },
            h3: { color: "#1F2937", fontSize: 14, fontWeight: "bold", marginVertical: 4 },
            a: { color: "#0056d2", textDecorationLine: "underline" },
          }}
          ignoredTags={["script", "style"]}
        />
        {isLongText && (
          <TouchableOpacity style={styles.readMoreButton} onPress={() => setShowFullDescription(!showFullDescription)}>
            <Text style={styles.readMoreText}>{showFullDescription ? "Show Less" : "Read More"}</Text>
            <Ionicons name={showFullDescription ? "chevron-up" : "chevron-down"} size={16} color="#0056d2" />
          </TouchableOpacity>
        )}
      </View>
    )
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Loading />
      </SafeAreaView>
    );
  }

  if (!packageData || error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <View style={styles.errorIcon}>
            <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          </View>
          <Text style={styles.errorTitle}>Package Not Found</Text>
          <Text style={styles.errorText}>{error || "We couldn't find this package."}</Text>
          <TouchableOpacity style={styles.errorButton} onPress={() => navigation.goBack()}>
            <Text style={styles.errorButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  const packageType = getPackageIcon(packageData.packageName)

  return (
    <SafeAreaView style={styles.safeArea}>
      <DynamicStatusBar backgroundColor="#FFFFFF" />


      {/* Shared Header */}
      <Header
        title="Package Details"
        onBack={() => navigation.goBack()}
        rightActions={[{
          icon: "share-outline",
          onPress: handleShareService,
          color: "#2D3748"
        }]}
        backgroundColor="#FFFFFF"
        textColor="#2D3748"
      />

      <ScrollView style={[styles.container, { marginTop: 55 }]} showsVerticalScrollIndicator={false}>
        {/* Compact Hero Section */}
        <Animated.View
          style={[
            styles.heroSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.heroContent}>
            <View style={styles.packageInfo}>
              <View style={styles.packageIconContainer}>
                <LinearGradient
                  colors={["#0056d2", "#0041a3"]}
                  style={styles.packageIcon}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  {renderPackageIcon(packageType, 28)}
                </LinearGradient>
              </View>

              <View style={styles.packageDetails}>
                <Text style={styles.packageName}>{packageData.packageName || "Service Package"}</Text>
                <View style={styles.packageMeta}>
                  <View style={styles.statusBadge}>
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: packageData.status === "active" ? "#10B981" : "#EF4444" },
                      ]}
                    />
                    <Text style={styles.statusText}>{packageData.status || "Unknown"}</Text>
                  </View>
                  <View style={styles.durationBadge}>
                    <Ionicons name="time-outline" size={14} color="#64748B" />
                    <Text style={styles.durationText}>{packageData.durationDays || "N/A"} days</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.priceSection}>
              <Text style={styles.priceValue}>
                {packageData.price ? `$${packageData.price.toLocaleString()}` : "Contact"}
              </Text>
              <Text style={styles.priceLabel}>Total Price</Text>
            </View>
          </View>
        </Animated.View>

        {/* Compact Trainer Section */}
        <Animated.View
          style={[
            styles.trainerSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.sectionHeader}>
            <Ionicons name="person-outline" size={18} color="#0056d2" />
            <Text style={styles.sectionTitle}>Your Trainer</Text>
          </View>

          <TouchableOpacity
            style={styles.trainerCard}
            onPress={() => {
              if (packageData?.trainerId) {
                navigation.navigate("TrainerDetailScreen", { trainerId: packageData.trainerId })
              }
            }}
          >
            <View style={styles.trainerAvatar}>
              {packageData.trainerAvatar ? (
                <Image source={{ uri: packageData.trainerAvatar }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={24} color="#94A3B8" />
                </View>
              )}
              <View style={styles.onlineIndicator} />
            </View>

            <View style={styles.trainerInfo}>
              <Text style={styles.trainerName}>{packageData.trainerFullName || "Professional Trainer"}</Text>
              <Text style={styles.trainerRole}>Certified Fitness Coach</Text>
              <View style={styles.trainerStats}>
                <View style={styles.statItem}>
                  <Ionicons name="star" size={14} color="#F59E0B" />
                  <Text style={styles.statText}>
                    {trainerRatingData &&
                    typeof trainerRatingData === "object" &&
                    typeof trainerRatingData.averageRating === "number" &&
                    !isNaN(trainerRatingData.averageRating)
                      ? trainerRatingData.averageRating.toFixed(1)
                      : typeof trainerRatingData === "number" && !isNaN(trainerRatingData)
                        ? trainerRatingData.toFixed(1)
                        : "0.0"}
                  </Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Ionicons name="people-outline" size={14} color="#64748B" />
                  <Text style={styles.statText}>
                    {trainerRatingData && trainerRatingData.currentSubscribers !== null
                      ? trainerRatingData.currentSubscribers
                      : "0"}{" "}
                    clients
                  </Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Ionicons name="time-outline" size={14} color="#10B981" />
                  <Text style={styles.statText}>
                    {trainerExperience && trainerExperience.experienceYears !== null
                      ? trainerExperience.experienceYears
                      : "0"}{" "}
                    yrs
                  </Text>
                </View>
              </View>
            </View>

            <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
          </TouchableOpacity>
        </Animated.View>

        {/* Package Info Grid */}
        <Animated.View
          style={[
            styles.infoSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.sectionHeader}>
            <Ionicons name="information-circle-outline" size={18} color="#0056d2" />
            <Text style={styles.sectionTitle}>Package Information</Text>
          </View>

          <View style={styles.infoGridModern}>
            <View style={styles.infoCardModern}>
              <Text style={styles.infoLabelModern}>Created</Text>
              <Text style={styles.infoValueModern}>
                {packageData.createdAt
                  ? new Date(packageData.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "N/A"}
              </Text>
            </View>
            <View style={styles.infoCardModern}>
              <Text style={styles.infoLabelModern}>Subscribers</Text>
              <Text style={styles.infoValueModern}>
                {packageData.currentSubscribers || 0}/{packageData.maxSubscribers || 0}
              </Text>
            </View>
            <View style={styles.infoCardModern}>
              <Text style={styles.infoLabelModern}>Level</Text>
              <Text style={styles.infoValueModern}>All Levels</Text>
            </View>
            <View style={styles.infoCardModern}>
              <Text style={styles.infoLabelModern}>Status</Text>
              <Text style={styles.infoValueModern}>{packageData.status || "Unknown"}</Text>
            </View>
          </View>
        </Animated.View>

        {/* Description Section */}
        <Animated.View
          style={[
            styles.descriptionSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.sectionHeader}>
            <Ionicons name="document-text-outline" size={18} color="#0056d2" />
            <Text style={styles.sectionTitle}>About This Package</Text>
          </View>

          <View style={styles.descriptionCard}>{renderDescription()}</View>
        </Animated.View>

        {/* Action Buttons */}
        <Animated.View
          style={[
            styles.actionSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleCheckout}
            disabled={packageData.currentSubscribers >= packageData.maxSubscribers}
          >
            <LinearGradient
              colors={
                packageData.currentSubscribers >= packageData.maxSubscribers
                  ? ["#94A3B8", "#94A3B8"]
                  : ["#0056d2", "#0041a3"]
              }
              style={styles.primaryButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="card-outline" size={20} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>
                {packageData.currentSubscribers >= packageData.maxSubscribers ? "Fully Booked" : "Enroll Now"}
              </Text>
              <View style={styles.priceBadge}>
                <Text style={styles.priceBadgeText}>
                  ${packageData.price ? packageData.price.toLocaleString() : "0"}
                </Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.secondaryActions}>
            <TouchableOpacity style={styles.secondaryButton} onPress={handleSavePackage}>
              <Ionicons name={isSaved ? "bookmark" : "bookmark-outline"} size={18} color="#0056d2" />
              <Text style={styles.secondaryButtonText}>{isSaved ? "Saved" : "Save"}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton} onPress={handleShareService}>
              <Ionicons name="share-outline" size={18} color="#0056d2" />
              <Text style={styles.secondaryButtonText}>Share</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2D3748",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  heroSection: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  heroContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  packageInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  packageIconContainer: {
    marginRight: 16,
  },
  packageIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  packageDetails: {
    flex: 1,
  },
  packageName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 8,
    lineHeight: 24,
  },
  packageMeta: {
    flexDirection: "row",
    gap: 8,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    color: "#10B981",
    fontWeight: "500",
  },
  durationBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  durationText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  priceSection: {
    alignItems: "flex-end",
  },
  priceValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0056d2",
    marginBottom: 4,
  },
  priceLabel: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  trainerSection: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  trainerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  trainerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 16,
    position: "relative",
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  onlineIndicator: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#10B981",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  trainerInfo: {
    flex: 1,
  },
  trainerName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  trainerRole: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 8,
  },
  trainerStats: {
    flexDirection: "row",
    alignItems: "center",
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statDivider: {
    width: 1,
    height: 12,
    backgroundColor: "#E2E8F0",
    marginHorizontal: 8,
  },
  statText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  infoSection: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  infoGridModern: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  infoCardModern: {
    width: '48%',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 10,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  infoLabelModern: {
    fontSize: 14,
    color: '#0056d2',
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  infoValueModern: {
    fontSize: 12,
    color: '#1F2937',
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  descriptionSection: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  descriptionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyDescription: {
    alignItems: "center",
    paddingVertical: 20,
  },
  emptyDescriptionText: {
    fontSize: 14,
    color: "#94A3B8",
    marginTop: 8,
  },
  readMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    gap: 4,
  },
  readMoreText: {
    fontSize: 14,
    color: "#0056d2",
    fontWeight: "500",
  },
  actionSection: {
    marginHorizontal: 16,
    marginTop: 24,
  },
  primaryButton: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 12,
    shadowColor: "#0056d2",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 8,
    position: "relative",
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  priceBadge: {
    position: "absolute",
    right: 16,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priceBadgeText: {
    fontSize: 12,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  secondaryActions: {
    flexDirection: "row",
    gap: 8,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  secondaryButtonText: {
    fontSize: 14,
    color: "#0056d2",
    fontWeight: "500",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
  loadingSpinner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  loadingText: {
    fontSize: 16,
    color: "#64748B",
    fontWeight: "500",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    padding: 20,
  },
  errorIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#EF4444",
    marginBottom: 8,
    textAlign: "center",
  },
  errorText: {
    fontSize: 16,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 24,
  },
  errorButton: {
    backgroundColor: "#0056d2",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  errorButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  bottomSpacing: {
    height: 32,
  },
})

export default PackageDetailScreen
