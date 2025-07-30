import { useState,useEffect,useRef } from "react"
import trainerService from "services/apiTrainerService"
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Animated,
  Platform,
  Linking,
  Alert,
  Dimensions,
} from "react-native"
import HTML from "react-native-render-html"
import { LinearGradient } from "expo-linear-gradient"
import { Ionicons } from "@expo/vector-icons"
import DynamicStatusBar from "screens/statusBar/DynamicStatusBar"
import { StatusBar } from "expo-status-bar"
import { SafeAreaView } from "react-native-safe-area-context"
import Header from "components/Header"

const { width,height } = Dimensions.get("window")

const TrainerDetailScreen = ({ route,navigation }) => {
  const { trainerId,trainerFullName,trainerAvatar } = route.params || {}
  const [trainerData,setTrainerData] = useState(null)
  const [loading,setLoading] = useState(true)
  const [error,setError] = useState(null)
  const [showFullBio,setShowFullBio] = useState(false)

  // State cho rating và clients thực tế
  const [averageRating,setAverageRating] = useState(null)
  const [totalClients,setTotalClients] = useState(null)

  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(30)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,{
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim,{
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start()
  },[])

  useEffect(() => {
    if (!trainerId) {
      setError("Invalid trainer ID provided.")
      setLoading(false)
      Alert.alert("Error","Invalid trainer ID provided.",[{ text: "OK",onPress: () => navigation.goBack() }])
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
  },[trainerId,navigation])

  useEffect(() => {
    if (trainerId) {
      // Lấy rating trung bình
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
      // Lấy tổng số client
      trainerService
        .getAllActivePackages({ trainerId })
        .then((res) => {
          const pkgs = res.data?.packages || []
          const total = pkgs.reduce((sum,pkg) => sum + (pkg.currentSubscribers || 0),0)
          setTotalClients(total)
        })
        .catch(() => setTotalClients(0))
    }
  },[trainerId])

  const handleContactEmail = () => {
    if (trainerData?.email) {
      Linking.openURL(`mailto:${trainerData.email}`).catch(() => Alert.alert("Error","Unable to open email client."))
    } else {
      Alert.alert("Notice","Email not available.")
    }
  }

  const handleContactPhone = () => {
    if (trainerData?.phoneNumber) {
      Linking.openURL(`tel:${trainerData.phoneNumber}`).catch(() =>
        Alert.alert("Error","Unable to make a phone call."),
      )
    } else {
      Alert.alert("Notice","Phone number not available.")
    }
  }

  const handleOpenSocialLinks = () => {
    if (trainerData?.socialLinks && trainerData.socialLinks !== "string") {
      Linking.openURL(trainerData.socialLinks).catch(() => Alert.alert("Error","Unable to open social link."))
    } else {
      Alert.alert("Notice","No social links available.")
    }
  }

  const handleViewCV = () => {
    if (trainerData?.cvFileUrl && trainerData.cvFileUrl !== "string") {
      Linking.openURL(trainerData.cvFileUrl).catch(() => Alert.alert("Error","Unable to open CV file."))
    } else {
      Alert.alert("Notice","No CV file available.")
    }
  }


  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingContent}>
            <View style={styles.loadingIcon}>
              <Ionicons name="person-circle-outline" size={48} color="#111" />
            </View>
            <Text style={[styles.loadingTitle,{ color: '#111' }]}>Loading Trainer Profile</Text>
            <Text style={[styles.loadingText,{ color: '#444' }]}>Please wait...</Text>
          </View>
        </View>
      </SafeAreaView>
    )
  }

  if (!trainerData || error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <View style={styles.errorContent}>
            <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
            <Text style={styles.errorTitle}>Trainer Not Found</Text>
            <Text style={styles.errorText}>{error || "We couldn't find this trainer. Please try again later."}</Text>
            <TouchableOpacity style={styles.errorButton} onPress={() => navigation.goBack()}>
              <Text style={styles.errorButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <DynamicStatusBar backgroundColor="#FFF" />

      {/* Header */}
      <Header
        title="Trainer Profile"
        onBack={() => navigation.goBack()}
        showAvatar={false}
      />


      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Profile Section */}
        <Animated.View
          style={[
            styles.profileSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.avatarContainer}>
            <Image
              source={{
                uri:
                  trainerData.profileImageUrl && trainerData.profileImageUrl !== "string"
                    ? trainerData.profileImageUrl
                    : trainerAvatar || "https://via.placeholder.com/150",
              }}
              style={styles.avatar}
            />
            <View style={styles.onlineIndicator} />
          </View>

          <Text style={styles.trainerName}>{trainerData.fullName || "Professional Trainer"}</Text>
          <Text style={styles.trainerTitle}>Certified Health & Fitness Coach</Text>

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{trainerData.experienceYears || 0}</Text>
              <Text style={styles.statLabel}>Years Experience</Text>
            </View>
            {/* Hiển thị rating thực tế */}
            <>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{averageRating !== null ? averageRating.toFixed(1) : '--'}</Text>
                <Text style={styles.statLabel}>Rating</Text>
              </View>
            </>
            {/* Hiển thị số client thực tế */}
            <>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{totalClients !== null ? totalClients : '--'}</Text>
                <Text style={styles.statLabel}>Clients</Text>
              </View>
            </>
          </View>
        </Animated.View>

        {/* About Section */}
        <Animated.View
          style={[
            styles.section,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.card}>
            <Text style={styles.aboutText} numberOfLines={showFullBio ? undefined : 4}>
              {trainerData.bio && trainerData.bio !== "string"
                ? trainerData.bio
                : "Passionate fitness professional dedicated to helping you achieve your health and wellness goals. With years of experience and proven results, I'm here to guide you on your fitness journey."}
            </Text>
            <TouchableOpacity onPress={() => setShowFullBio(!showFullBio)}>
              <Text style={styles.readMoreText}>{showFullBio ? "Show Less" : "Read More"}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Specialties Section */}
        <Animated.View
          style={[
            styles.section,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={styles.sectionTitle}>Specialties</Text>
          <View style={styles.card}>
            {trainerData.specialties && trainerData.specialties !== "string" ? (
              <HTML
                source={{ html: trainerData.specialties }}
                contentWidth={width - 80}
                tagsStyles={{ p: { color: "#374151",fontSize: 15,lineHeight: 22 } }}
                ignoredTags={['script','style']}
              />
            ) : (
              <Text style={styles.specialtiesText}>
                Weight Training, Cardio, Nutrition Coaching, Strength Building
              </Text>
            )}
          </View>
        </Animated.View>

        {/* Certifications Section */}
        <Animated.View
          style={[
            styles.section,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={styles.sectionTitle}>Certifications</Text>
          <View style={styles.card}>
            {trainerData.certifications && trainerData.certifications !== "string" ? (
              <HTML
                source={{ html: trainerData.certifications }}
                contentWidth={width - 80}
                tagsStyles={{ p: { color: "#374151",fontSize: 15,lineHeight: 22 } }}
                ignoredTags={['script','style']}
              />
            ) : (
              <Text style={styles.certificationsText}>
                NASM Certified Personal Trainer, CPR/AED Certified, Nutrition Specialist
              </Text>
            )}
          </View>
        </Animated.View>

        {/* Contact Section */}
        <Animated.View
          style={[
            styles.section,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.contactItem} onPress={handleContactEmail}>
              <Ionicons name="mail-outline" size={20} color="#6B7280" />
              <Text style={styles.contactText}>{trainerData.email || "Email not available"}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.contactItem} onPress={handleContactPhone}>
              <Ionicons name="call-outline" size={20} color="#6B7280" />
              <Text style={styles.contactText}>{trainerData.phoneNumber || "Phone not available"}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.contactItem} onPress={handleOpenSocialLinks}>
              <Ionicons name="globe-outline" size={20} color="#6B7280" />
              <Text style={styles.contactText}>Social Media</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.contactItem} onPress={handleViewCV}>
              <Ionicons name="document-text-outline" size={20} color="#6B7280" />
              <Text style={styles.contactText}>View Resume</Text>
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
    backgroundColor: "#FFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight + 16 : 16,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#111",
  },
  headerPlaceholder: {
    width: 40,
  },
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: 70,
  },
  profileSection: {
    alignItems: "center",
    paddingTop: 32,
    paddingHorizontal: 20,
    paddingBottom: 24,
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#E5E7EB",
  },
  onlineIndicator: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#10B981",
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  trainerName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
    textAlign: "center",
  },
  trainerTitle: {
    fontSize: 16,
    color: "#6B7280",
    marginBottom: 24,
    textAlign: "center",
  },
  statsContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 16,
  },
  bookButton: {
    backgroundColor: "#0056D2",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: "100%",
  },
  bookButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 20,
    marginTop: 20
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 12,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  aboutText: {
    fontSize: 15,
    color: "#374151",
    lineHeight: 22,
    marginBottom: 8,
  },
  readMoreText: {
    fontSize: 14,
    color: "#111",
    fontWeight: "500",
  },
  specialtiesText: {
    fontSize: 15,
    color: "#374151",
    lineHeight: 22,
  },
  certificationsText: {
    fontSize: 15,
    color: "#374151",
    lineHeight: 22,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  contactText: {
    fontSize: 15,
    color: "#374151",
    marginLeft: 12,
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContent: {
    alignItems: "center",
  },
  loadingIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  loadingTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#111",
    marginBottom: 8,
  },
  loadingText: {
    fontSize: 16,
    color: "#444",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    padding: 20,
  },
  errorContent: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 32,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#EF4444",
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 15,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  errorButton: {
    backgroundColor: "#111",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  errorButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "500",
  },
  bottomSpacing: {
    height: 32,
  },
})

export default TrainerDetailScreen
