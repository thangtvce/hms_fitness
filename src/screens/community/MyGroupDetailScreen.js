"use client"

import { useEffect, useState, useRef } from "react"
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Image,
  Dimensions,
  Animated,
} from "react-native"
import { useNavigation, useRoute } from "@react-navigation/native"
import { getMyGroupActiveById, deleteGroup } from "services/apiCommunityService"
import { LinearGradient } from "expo-linear-gradient"
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons"
import { SafeAreaView } from "react-native-safe-area-context"

const { width, height } = Dimensions.get("window")

const MyGroupDetailScreen = () => {
  const navigation = useNavigation()
  const route = useRoute()
  const { groupId } = route.params || {}

  const [group, setGroup] = useState(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(50)).current
  const scaleAnim = useRef(new Animated.Value(0.9)).current
  const rotateAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (groupId) {
      getMyGroupActiveById(groupId)
        .then((data) => {
          setGroup(data)
          // Start animations after data loads
          Animated.parallel([
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
              toValue: 0,
              duration: 800,
              useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
              toValue: 1,
              tension: 100,
              friction: 8,
              useNativeDriver: true,
            }),
          ]).start()

          // Continuous rotation animation
          Animated.loop(
            Animated.timing(rotateAnim, {
              toValue: 1,
              duration: 20000,
              useNativeDriver: true,
            }),
          ).start()
        })
        .catch((err) => {
          Alert.alert("Error", err.message || "Failed to load group info")
          navigation.goBack()
        })
        .finally(() => setLoading(false))
    }
  }, [groupId])

  const handleEdit = () => {
    navigation.navigate("EditGroupScreen", { groupId })
  }

  const handleDelete = async () => {
    Alert.alert("Delete Group", "Are you sure you want to delete this group?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setDeleting(true)
          try {
            await deleteGroup(groupId)
            Alert.alert("Deleted", "Group deleted successfully!", [
              { text: "OK", onPress: () => navigation.navigate("MyGroupsScreen") },
            ])
          } catch (err) {
            Alert.alert("Error", err.message || "Failed to delete group")
          } finally {
            setDeleting(false)
          }
        },
      },
    ])
  }

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "active":
        return ["#22C55E", "#16A34A"]
      case "pending":
        return ["#F59E0B", "#D97706"]
      case "inactive":
        return ["#EF4444", "#DC2626"]
      default:
        return ["#6B7280", "#4B5563"]
    }
  }

  const formatMemberCount = (count) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`
    return count?.toString() || "0"
  }

  const formatDate = (dateString) => {
    if (!dateString) return "Unknown"
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    } catch {
      return "Unknown"
    }
  }

  const renderLoadingScreen = () => (
    <View style={styles.container}>
      <LinearGradient colors={["#4F46E5", "#7C3AED"]} style={styles.loadingGradient}>
        <View style={styles.loadingContainer}>
          <Animated.View
            style={[
              styles.loadingOrb,
              {
                transform: [
                  {
                    rotate: rotateAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["0deg", "360deg"],
                    }),
                  },
                ],
              },
            ]}
          >
            <LinearGradient colors={["#22C55E", "#3B82F6", "#8B5CF6"]} style={styles.loadingOrbGradient}>
              <ActivityIndicator size="large" color="#FFFFFF" />
            </LinearGradient>
          </Animated.View>
          <Text style={styles.loadingText}>Loading Group Data...</Text>
          <View style={styles.loadingDots}>
            <Animated.View style={[styles.loadingDot, { opacity: fadeAnim }]} />
            <Animated.View style={[styles.loadingDot, { opacity: fadeAnim }]} />
            <Animated.View style={[styles.loadingDot, { opacity: fadeAnim }]} />
          </View>
        </View>
      </LinearGradient>
    </View>
  )

  const renderHeroSection = () => (
    <Animated.View
      style={[
        styles.heroSection,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
        },
      ]}
    >
      <LinearGradient colors={["#FFFFFF", "#F8FAFC"]} style={styles.heroBackground}>
        <View style={styles.heroContent}>
          <View style={styles.heroImageContainer}>
            {group.thumbnail ? (
              <Image source={{ uri: group.thumbnail }} style={styles.heroImage} />
            ) : (
              <LinearGradient colors={["#3B82F6", "#8B5CF6"]} style={styles.heroImagePlaceholder}>
                <MaterialCommunityIcons name="account-group" size={40} color="#FFFFFF" />
              </LinearGradient>
            )}
            {group.isPrivate && (
              <View style={styles.privateBadge}>
                <Ionicons name="lock-closed" size={12} color="#FFFFFF" />
              </View>
            )}
          </View>

          <View style={styles.heroInfo}>
            <Text style={styles.heroTitle}>{group.groupName}</Text>
            <View style={styles.heroStats}>
              <View style={styles.heroStat}>
                <Ionicons name="people" size={16} color="#22C55E" />
                <Text style={styles.heroStatText}>{formatMemberCount(group.memberCount)} Members</Text>
              </View>
              <View style={styles.heroStat}>
                <Ionicons name="calendar" size={16} color="#3B82F6" />
                <Text style={styles.heroStatText}>Created {formatDate(group.createdAt)}</Text>
              </View>
            </View>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  )

  const renderStatsCards = () => (
    <Animated.View
      style={[
        styles.statsContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.statsGrid}>
        {/* Status Card */}
        <View style={styles.statCard}>
          <LinearGradient colors={getStatusColor(group.status)} style={styles.statCardGradient}>
            <View style={styles.statCardContent}>
              <Ionicons name="pulse" size={24} color="#FFFFFF" />
              <Text style={styles.statCardLabel}>Status</Text>
              <Text style={styles.statCardValue}>{group.status || "Active"}</Text>
            </View>
          </LinearGradient>
        </View>

        {/* Members Card */}
        <View style={styles.statCard}>
          <LinearGradient colors={["#22C55E", "#16A34A"]} style={styles.statCardGradient}>
            <View style={styles.statCardContent}>
              <Ionicons name="people" size={24} color="#FFFFFF" />
              <Text style={styles.statCardLabel}>Members</Text>
              <Text style={styles.statCardValue}>{formatMemberCount(group.memberCount)}</Text>
            </View>
          </LinearGradient>
        </View>

        {/* Privacy Card */}
        <View style={styles.statCard}>
          <LinearGradient colors={["#8B5CF6", "#7C3AED"]} style={styles.statCardGradient}>
            <View style={styles.statCardContent}>
              <Ionicons name={group.isPrivate ? "lock-closed" : "globe"} size={24} color="#FFFFFF" />
              <Text style={styles.statCardLabel}>Privacy</Text>
              <Text style={styles.statCardValue}>{group.isPrivate ? "Private" : "Public"}</Text>
            </View>
          </LinearGradient>
        </View>

        {/* Activity Card */}
        <View style={styles.statCard}>
          <LinearGradient colors={["#F59E0B", "#D97706"]} style={styles.statCardGradient}>
            <View style={styles.statCardContent}>
              <Ionicons name="trending-up" size={24} color="#FFFFFF" />
              <Text style={styles.statCardLabel}>Activity</Text>
              <Text style={styles.statCardValue}>High</Text>
            </View>
          </LinearGradient>
        </View>
      </View>
    </Animated.View>
  )

  const renderDescriptionCard = () => (
    <Animated.View
      style={[
        styles.descriptionCard,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.descriptionContainer}>
        <LinearGradient colors={["#FFFFFF", "#F8FAFC"]} style={styles.descriptionGradient}>
          <View style={styles.descriptionHeader}>
            <Ionicons name="document-text" size={20} color="#3B82F6" />
            <Text style={styles.descriptionTitle}>Description</Text>
          </View>
          <Text style={styles.descriptionText}>{group.description || "No description available."}</Text>
        </LinearGradient>
      </View>
    </Animated.View>
  )

  const renderActionButtons = () => (
    <Animated.View
      style={[
        styles.actionContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <TouchableOpacity style={styles.actionButton} onPress={handleEdit} activeOpacity={0.8}>
        <LinearGradient colors={["#3B82F6", "#2563EB"]} style={styles.actionButtonGradient}>
          <Ionicons name="pencil" size={20} color="#FFFFFF" />
          <Text style={styles.actionButtonText}>Edit Group</Text>
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionButton} onPress={handleDelete} disabled={deleting} activeOpacity={0.8}>
        <LinearGradient colors={["#EF4444", "#DC2626"]} style={styles.actionButtonGradient}>
          {deleting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="trash" size={20} color="#FFFFFF" />
          )}
          <Text style={styles.actionButtonText}>{deleting ? "Deleting..." : "Delete Group"}</Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  )

  if (loading) return renderLoadingScreen()

  if (!group) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={["#F8FAFC", "#E2E8F0"]} style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle-outline" size={64} color="#EF4444" />
          <Text style={styles.errorTitle}>Group Not Found</Text>
          <Text style={styles.errorText}>The group you're looking for doesn't exist or has been deleted.</Text>
          <TouchableOpacity style={styles.errorButton} onPress={() => navigation.goBack()}>
            <Text style={styles.errorButtonText}>Go Back</Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#F8FAFC", "#E2E8F0"]} style={styles.backgroundGradient}>
        <SafeAreaView style={styles.safeArea}>
          {/* Header */}
          <Animated.View
            style={[
              styles.header,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <LinearGradient colors={["#3B82F6", "#2563EB"]} style={styles.backButtonGradient}>
                <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Group Details</Text>
            <View style={styles.headerRight} />
          </Animated.View>

          <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
            {renderHeroSection()}
            {renderStatsCards()}
            {renderDescriptionCard()}
            {renderActionButtons()}

            {/* Floating Particles */}
            <Animated.View
              style={[
                styles.floatingParticle,
                styles.particle1,
                {
                  transform: [
                    {
                      rotate: rotateAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ["0deg", "360deg"],
                      }),
                    },
                  ],
                },
              ]}
            />
            <Animated.View
              style={[
                styles.floatingParticle,
                styles.particle2,
                {
                  transform: [
                    {
                      rotate: rotateAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ["360deg", "0deg"],
                      }),
                    },
                  ],
                },
              ]}
            />
            <Animated.View
              style={[
                styles.floatingParticle,
                styles.particle3,
                {
                  transform: [
                    {
                      rotate: rotateAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ["0deg", "180deg"],
                      }),
                    },
                  ],
                },
              ]}
            />
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundGradient: {
    flex: 1,
  },
  loadingGradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "transparent",
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButtonGradient: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
    textAlign: "center",
    flex: 1,
  },
  headerRight: {
    width: 44,
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingOrb: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: "hidden",
    marginBottom: 30,
  },
  loadingOrbGradient: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 18,
    color: "#FFFFFF",
    fontWeight: "600",
    marginBottom: 20,
  },
  loadingDots: {
    flexDirection: "row",
    gap: 8,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FFFFFF",
  },
  heroSection: {
    marginBottom: 30,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  heroBackground: {
    padding: 20,
  },
  heroContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  heroImageContainer: {
    position: "relative",
    marginRight: 20,
  },
  heroImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  heroImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  privateBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#8B5CF6",
    justifyContent: "center",
    alignItems: "center",
  },
  heroInfo: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 10,
  },
  heroStats: {
    flexDirection: "column",
    gap: 8,
  },
  heroStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  heroStatText: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "600",
  },
  statsContainer: {
    marginBottom: 30,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 15,
  },
  statCard: {
    width: (width - 55) / 2,
    height: 120,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statCardGradient: {
    flex: 1,
    padding: 16,
    justifyContent: "center",
  },
  statCardContent: {
    alignItems: "center",
  },
  statCardLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "600",
    marginTop: 8,
    marginBottom: 4,
  },
  statCardValue: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "800",
    textTransform: "capitalize",
  },
  descriptionCard: {
    marginBottom: 30,
  },
  descriptionContainer: {
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  descriptionGradient: {
    padding: 20,
  },
  descriptionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  descriptionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
    marginLeft: 10,
  },
  descriptionText: {
    fontSize: 16,
    color: "#64748B",
    lineHeight: 24,
    fontWeight: "400",
  },
  actionContainer: {
    gap: 15,
    marginBottom: 40,
  },
  actionButton: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  actionButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    paddingHorizontal: 24,
    gap: 10,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  pendingButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F59E0B",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
    alignSelf: "flex-start",
    marginTop: 10,
  },
  pendingIcon: {
    marginRight: 6,
  },
  pendingText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 15,
  },
  floatingParticle: {
    position: "absolute",
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#3B82F6",
    opacity: 0.6,
  },
  particle1: {
    top: 100,
    right: 30,
  },
  particle2: {
    top: 300,
    left: 40,
    backgroundColor: "#8B5CF6",
  },
  particle3: {
    top: 500,
    right: 60,
    backgroundColor: "#22C55E",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1E293B",
    marginTop: 20,
    marginBottom: 10,
    textAlign: "center",
  },
  errorText: {
    fontSize: 16,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 30,
  },
  errorButton: {
    backgroundColor: "#3B82F6",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  errorButtonText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
  },
})

export default MyGroupDetailScreen
