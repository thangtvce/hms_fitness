"use client"

import { useState, useEffect, useRef } from "react"
import trainerService from "services/apiTrainerService"
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Animated,
  Linking,
  Alert,
  Dimensions,
} from "react-native"
import HTML from "react-native-render-html"
import { LinearGradient } from "expo-linear-gradient"
import { Ionicons } from "@expo/vector-icons"
import DynamicStatusBar from "screens/statusBar/DynamicStatusBar"
import { SafeAreaView } from "react-native-safe-area-context"

const { width, height } = Dimensions.get("window")

const TrainerDetailScreen = ({ route, navigation }) => {
  const { trainerId, trainerFullName, trainerAvatar } = route.params || {}
  const [trainerData, setTrainerData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showFullBio, setShowFullBio] = useState(false)
  const [averageRating, setAverageRating] = useState(null)
  const [totalClients, setTotalClients] = useState(null)

  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(30)).current

  useEffect(() => {
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
    ]).start()
  }, [])

  useEffect(() => {
    if (!trainerId) {
      setError("Invalid trainer ID provided.")
      setLoading(false)
      Alert.alert("Error", "Invalid trainer ID provided.", [{ text: "OK", onPress: () => navigation.goBack() }])
      return
    }

    const fetchTrainer = async () => {
      try {
        const res = await trainerService.getApprovedTrainerApplication(trainerId)
        if (res && res.statusCode === 200 && res.data) {
          setTrainerData(res.data)
        } else {
          setError("Trainer not found.")
          setTrainerData(null)
        }
      } catch (err) {
        setError("Trainer not found.")
        setTrainerData(null)
      }
      setLoading(false)
    }

    fetchTrainer()
  }, [trainerId, navigation])

  useEffect(() => {
    if (trainerId) {
      // Get average rating
      trainerService
        .getTrainerAverageRating(trainerId)
        .then((res) => {
          let avg = res.data
          if (typeof avg === "object" && avg !== null && avg.averageRating !== undefined) {
            avg = avg.averageRating
          }
          setAverageRating(avg || 0)
        })
        .catch(() => setAverageRating(0))

      // Get total clients
      trainerService
        .getAllActiveServicePackage({ trainerId })
        .then((res) => {
          const pkgs = res.data?.packages || []
          const total = pkgs.reduce((sum, pkg) => sum + (pkg.currentSubscribers || 0), 0)
          setTotalClients(total)
        })
        .catch(() => setTotalClients(0))
    }
  }, [trainerId])

  const handleContactEmail = () => {
    if (trainerData?.email) {
      Linking.openURL(`mailto:${trainerData.email}`).catch(() => Alert.alert("Error", "Unable to open email client."))
    } else {
      Alert.alert("Notice", "Email not available.")
    }
  }

  const handleContactPhone = () => {
    if (trainerData?.phoneNumber) {
      Linking.openURL(`tel:${trainerData.phoneNumber}`).catch(() =>
        Alert.alert("Error", "Unable to make a phone call."),
      )
    } else {
      Alert.alert("Notice", "Phone number not available.")
    }
  }

  const handleOpenSocialLinks = () => {
    if (trainerData?.socialLinks && trainerData.socialLinks !== "string") {
      Linking.openURL(trainerData.socialLinks).catch(() => Alert.alert("Error", "Unable to open social link."))
    } else {
      Alert.alert("Notice", "No social links available.")
    }
  }

  const handleViewCV = () => {
    if (trainerData?.cvFileUrl && trainerData.cvFileUrl !== "string") {
      Linking.openURL(trainerData.cvFileUrl).catch(() => Alert.alert("Error", "Unable to open CV file."))
    } else {
      Alert.alert("Notice", "No CV file available.")
    }
  }

  const handleBookSession = () => {
    Alert.alert(
      "Book Training Session",
      `Would you like to book a training session with ${trainerData?.fullName || "this trainer"}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Book Now",
          onPress: () => {
            Alert.alert("Success", "Booking request sent! The trainer will contact you soon.")
          },
        },
      ],
    )
  }

  const renderStars = (rating) => {
    const stars = []
    const fullStars = Math.floor(rating)
    const hasHalfStar = rating % 1 !== 0

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Ionicons key={i} name="star" size={14} color="#FFC107" />)
    }
    if (hasHalfStar) {
      stars.push(<Ionicons key="half" name="star-half" size={14} color="#FFC107" />)
    }
    for (let i = stars.length; i < 5; i++) {
      stars.push(<Ionicons key={i} name="star-outline" size={14} color="#E5E7EB" />)
    }
    return stars
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingSpinner}>
            <Ionicons name="person-circle-outline" size={40} color="#4F46E5" />
          </View>
          <Text style={styles.loadingText}>Loading trainer profile...</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (!trainerData || error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <View style={styles.errorIcon}>
            <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          </View>
          <Text style={styles.errorTitle}>Trainer Not Found</Text>
          <Text style={styles.errorText}>{error || "We couldn't find this trainer."}</Text>
          <TouchableOpacity style={styles.errorButton} onPress={() => navigation.goBack()}>
            <Text style={styles.errorButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <DynamicStatusBar backgroundColor="#FFFFFF" />

      {/* Compact Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#2D3748" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Trainer Profile</Text>
        <TouchableOpacity style={styles.shareButton}>
          <Ionicons name="share-outline" size={22} color="#2D3748" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Compact Profile Header */}
        <Animated.View
          style={[
            styles.profileHeader,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.profileInfo}>
            <View style={styles.avatarSection}>
              <Image
                source={{
                  uri:
                    trainerData.profileImageUrl && trainerData.profileImageUrl !== "string"
                      ? trainerData.profileImageUrl
                      : trainerAvatar || "https://via.placeholder.com/150",
                }}
                style={styles.avatar}
              />
              <View style={styles.onlineStatus} />
            </View>

            <View style={styles.trainerInfo}>
              <Text style={styles.trainerName}>{trainerData.fullName || "Professional Trainer"}</Text>
              <Text style={styles.trainerRole}>Certified Fitness Coach</Text>

              {/* Rating and Experience Row */}
              <View style={styles.quickStats}>
                <View style={styles.ratingContainer}>
                  <View style={styles.starsContainer}>{renderStars(averageRating || 0)}</View>
                  <Text style={styles.ratingText}>{averageRating !== null ? averageRating.toFixed(1) : "0.0"}</Text>
                </View>
                <View style={styles.statDot} />
                <Text style={styles.experienceText}>{trainerData.experienceYears || 0} years exp</Text>
                <View style={styles.statDot} />
                <Text style={styles.clientsText}>{totalClients !== null ? totalClients : 0} clients</Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.primaryButton} onPress={handleBookSession}>
              <LinearGradient
                colors={["#4F46E5", "#3B82F6"]}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="calendar-outline" size={18} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>Book Session</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton} onPress={handleContactEmail}>
              <Ionicons name="chatbubble-outline" size={18} color="#4F46E5" />
              <Text style={styles.secondaryButtonText}>Message</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Quick Info Cards */}
        <Animated.View
          style={[
            styles.quickInfoSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.infoGrid}>
            <View style={styles.infoCard}>
              <Ionicons name="trophy-outline" size={20} color="#F59E0B" />
              <Text style={styles.infoCardValue}>{trainerData.experienceYears || 0}</Text>
              <Text style={styles.infoCardLabel}>Years</Text>
            </View>

            <View style={styles.infoCard}>
              <Ionicons name="star" size={20} color="#FFC107" />
              <Text style={styles.infoCardValue}>{averageRating !== null ? averageRating.toFixed(1) : "0.0"}</Text>
              <Text style={styles.infoCardLabel}>Rating</Text>
            </View>

            <View style={styles.infoCard}>
              <Ionicons name="people-outline" size={20} color="#10B981" />
              <Text style={styles.infoCardValue}>{totalClients !== null ? totalClients : 0}</Text>
              <Text style={styles.infoCardLabel}>Clients</Text>
            </View>

            <View style={styles.infoCard}>
              <Ionicons name="fitness-outline" size={20} color="#EF4444" />
              <Text style={styles.infoCardValue}>Pro</Text>
              <Text style={styles.infoCardLabel}>Level</Text>
            </View>
          </View>
        </Animated.View>

        {/* About Section - Compact */}
        <Animated.View
          style={[
            styles.section,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.sectionHeader}>
            <Ionicons name="person-outline" size={18} color="#4F46E5" />
            <Text style={styles.sectionTitle}>About</Text>
          </View>
          <View style={styles.compactCard}>
            <Text style={styles.aboutText} numberOfLines={showFullBio ? undefined : 3}>
              {trainerData.bio && trainerData.bio !== "string"
                ? trainerData.bio
                : "Passionate fitness professional dedicated to helping you achieve your health and wellness goals. With years of experience and proven results, I'm here to guide you on your fitness journey."}
            </Text>
            {trainerData.bio && trainerData.bio !== "string" && trainerData.bio.length > 150 && (
              <TouchableOpacity onPress={() => setShowFullBio(!showFullBio)} style={styles.readMoreButton}>
                <Text style={styles.readMoreText}>{showFullBio ? "Show Less" : "Read More"}</Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>

        {/* Specialties & Certifications - Combined */}
        <Animated.View
          style={[
            styles.section,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.sectionHeader}>
            <Ionicons name="medal-outline" size={18} color="#4F46E5" />
            <Text style={styles.sectionTitle}>Expertise</Text>
          </View>

          <View style={styles.compactCard}>
            <View style={styles.expertiseSection}>
              <Text style={styles.expertiseLabel}>Specialties</Text>
              {trainerData.specialties && trainerData.specialties !== "string" ? (
                <HTML
                  source={{ html: trainerData.specialties }}
                  contentWidth={width - 80}
                  tagsStyles={{
                    p: { color: "#4B5563", fontSize: 14, lineHeight: 20, margin: 0 },
                    ul: { margin: 0, paddingLeft: 16 },
                    li: { color: "#4B5563", fontSize: 14, lineHeight: 20 },
                  }}
                  ignoredTags={["script", "style"]}
                />
              ) : (
                <Text style={styles.expertiseText}>Weight Training • Cardio • Nutrition • Strength Building</Text>
              )}
            </View>

            <View style={styles.divider} />

            <View style={styles.expertiseSection}>
              <Text style={styles.expertiseLabel}>Certifications</Text>
              {trainerData.certifications && trainerData.certifications !== "string" ? (
                <HTML
                  source={{ html: trainerData.certifications }}
                  contentWidth={width - 80}
                  tagsStyles={{
                    p: { color: "#4B5563", fontSize: 14, lineHeight: 20, margin: 0 },
                    ul: { margin: 0, paddingLeft: 16 },
                    li: { color: "#4B5563", fontSize: 14, lineHeight: 20 },
                  }}
                  ignoredTags={["script", "style"]}
                />
              ) : (
                <Text style={styles.expertiseText}>NASM Certified • CPR/AED • Nutrition Specialist</Text>
              )}
            </View>
          </View>
        </Animated.View>

        {/* Contact - Compact Grid */}
        <Animated.View
          style={[
            styles.section,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.sectionHeader}>
            <Ionicons name="call-outline" size={18} color="#4F46E5" />
            <Text style={styles.sectionTitle}>Contact</Text>
          </View>

          <View style={styles.contactGrid}>
            <TouchableOpacity style={styles.contactCard} onPress={handleContactEmail}>
              <View style={styles.contactIcon}>
                <Ionicons name="mail-outline" size={20} color="#4F46E5" />
              </View>
              <Text style={styles.contactLabel}>Email</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.contactCard} onPress={handleContactPhone}>
              <View style={styles.contactIcon}>
                <Ionicons name="call-outline" size={20} color="#10B981" />
              </View>
              <Text style={styles.contactLabel}>Call</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.contactCard} onPress={handleOpenSocialLinks}>
              <View style={styles.contactIcon}>
                <Ionicons name="globe-outline" size={20} color="#F59E0B" />
              </View>
              <Text style={styles.contactLabel}>Social</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.contactCard} onPress={handleViewCV}>
              <View style={styles.contactIcon}>
                <Ionicons name="document-text-outline" size={20} color="#EF4444" />
              </View>
              <Text style={styles.contactLabel}>Resume</Text>
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
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2D3748",
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
  profileHeader: {
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
  profileInfo: {
    flexDirection: "row",
    marginBottom: 20,
  },
  avatarSection: {
    position: "relative",
    marginRight: 16,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#E5E7EB",
  },
  onlineStatus: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#10B981",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  trainerInfo: {
    flex: 1,
    justifyContent: "center",
  },
  trainerName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 4,
  },
  trainerRole: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 8,
  },
  quickStats: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  starsContainer: {
    flexDirection: "row",
    marginRight: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  statDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#D1D5DB",
    marginHorizontal: 8,
  },
  experienceText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  clientsText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
  },
  primaryButton: {
    flex: 2,
    borderRadius: 12,
    overflow: "hidden",
  },
  buttonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  secondaryButtonText: {
    color: "#4F46E5",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 6,
  },
  quickInfoSection: {
    marginHorizontal: 16,
    marginTop: 12,
  },
  infoGrid: {
    flexDirection: "row",
    gap: 6,
  },
  infoCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    minHeight: 80,
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  infoCardValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    marginTop: 6,
    marginBottom: 2,
  },
  infoCardLabel: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "500",
  },
  section: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginLeft: 8,
  },
  compactCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  aboutText: {
    fontSize: 14,
    color: "#4B5563",
    lineHeight: 20,
  },
  readMoreButton: {
    marginTop: 8,
  },
  readMoreText: {
    fontSize: 14,
    color: "#4F46E5",
    fontWeight: "500",
  },
  expertiseSection: {
    marginBottom: 8,
  },
  expertiseLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 6,
  },
  expertiseText: {
    fontSize: 14,
    color: "#4B5563",
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 12,
  },
  contactGrid: {
    flexDirection: "row",
    gap: 6,
  },
  contactCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    minHeight: 75,
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  contactIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  contactLabel: {
    fontSize: 11,
    color: "#6B7280",
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
    color: "#6B7280",
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
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 24,
  },
  errorButton: {
    backgroundColor: "#4F46E5",
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

export default TrainerDetailScreen
