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
  ImageBackground,
} from "react-native"
import HTML from "react-native-render-html"
import { LinearGradient } from "expo-linear-gradient"
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons"
import Header from "components/Header"
import DynamicStatusBar from "screens/statusBar/DynamicStatusBar"
import { SafeAreaView } from "react-native-safe-area-context"

const { width, height } = Dimensions.get("window")

const TrainerDetailScreen = ({ route, navigation }) => {
  const { trainerId, trainerFullName, trainerAvatar } = route.params || {}
  const [trainerData, setTrainerData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showFullBio, setShowFullBio] = useState(false)
  // Accordion state: 'about', 'specialties', 'certifications'
  const [openSection, setOpenSection] = useState('about')
  const [averageRating, setAverageRating] = useState(null)
  const [totalClients, setTotalClients] = useState(null)
  
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(50)).current
  const scaleAnim = useRef(new Animated.Value(0.8)).current
  const rotateAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start()

    // Continuous rotation animation for badges
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 10000,
        useNativeDriver: true,
      })
    ).start()
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
      stars.push(<Ionicons key={i} name="star" size={16} color="#FFD700" />)
    }
    if (hasHalfStar) {
      stars.push(<Ionicons key="half" name="star-half" size={16} color="#FFD700" />)
    }
    for (let i = stars.length; i < 5; i++) {
      stars.push(<Ionicons key={i} name="star-outline" size={16} color="#E5E7EB" />)
    }
    return stars
  }

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  })

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: '#fff' }]}> 
        <View style={styles.loadingContainer}>
          <Animated.View style={[styles.loadingSpinner, { borderColor: '#0056d2', borderWidth: 4, transform: [{ rotate: spin }] }]}> 
            <MaterialCommunityIcons name="reload" size={40} color="#0056d2" />
          </Animated.View>
          <Text style={[styles.loadingText, { color: '#0056d2' }]}>Loading trainer profile...</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (!trainerData || error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <LinearGradient colors={['#ff6b6b', '#ee5a24']} style={styles.errorContainer}>
          <View style={styles.errorIcon}>
            <Ionicons name="alert-circle-outline" size={48} color="#FFFFFF" />
          </View>
          <Text style={styles.errorTitle}>Trainer Not Found</Text>
          <Text style={styles.errorText}>{error || "We couldn't find this trainer."}</Text>
          <TouchableOpacity style={styles.errorButton} onPress={() => navigation.goBack()}>
            <Text style={styles.errorButtonText}>Go Back</Text>
          </TouchableOpacity>
        </LinearGradient>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <DynamicStatusBar backgroundColor="transparent" barStyle="light-content" />

      {/* Standardized Header using Header.js */}
      <Header
        title={trainerData.fullName || "Trainer Profile"}
        onBack={() => navigation.goBack()}
        rightActions={[{
          icon: "share-outline",
          onPress: () => {},
        }]}
        backgroundColor="#fff"
        textColor="#222"
        containerStyle={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100 }}
      />

      {/* Add paddingTop to avoid header overlap */}
      <ScrollView style={[styles.container, { paddingTop: 70 }]} showsVerticalScrollIndicator={false}>
        {/* Hero Section with Gradient Background */}
        <View style={[styles.heroSection, { backgroundColor: '#fff' }]}> 
          {/* Profile Content */}
          <Animated.View
            style={[
              styles.profileContent,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
              },
            ]}
          >

            {/* Avatar with Glow Effect */}
            <View style={styles.avatarContainer}>
              <View style={styles.avatarGlow}>
                <Image
                  source={{
                    uri:
                      trainerData.profileImageUrl && trainerData.profileImageUrl !== "string"
                        ? trainerData.profileImageUrl
                        : trainerAvatar || "https://via.placeholder.com/150",
                  }}
                  style={styles.avatar}
                />
              </View>
              <View style={styles.onlineStatus}>
                <View style={styles.onlinePulse} />
              </View>
              {/* Verified Badge */}
              <Animated.View style={[styles.verifiedBadge, { transform: [{ rotate: spin }] }]}> 
                <LinearGradient colors={['#10b981', '#059669']} style={styles.badgeGradient}>
                  <Ionicons name="checkmark" size={16} color="#fff" />
                </LinearGradient>
              </Animated.View>
            </View>

            {/* Trainer Info */}
            <Text style={[styles.trainerName, { color: '#222', textShadowColor: 'transparent' }]}>{trainerData.fullName || "Professional Trainer"}</Text>
        
            {/* Action Buttons */}
            <View style={styles.heroActions}>
            {/* Action buttons removed as requested */}
            </View>
          </Animated.View>
        </View>

        {/* Stats Cards */}
        <Animated.View
          style={[
            styles.statsContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={[styles.statRow]}>
            <View style={[styles.statCell, { borderLeftWidth: 0 }]}> 
              <MaterialCommunityIcons name="clock-outline" size={18} color="#FFFFFF" />
              <Text style={[styles.statValue, { fontSize: 16 }]}>{trainerData.experienceYears || 0}</Text>
              <Text style={[styles.statLabel, { fontSize: 10 }]}>Years</Text>
            </View>
            <View style={styles.statCell}> 
              <Ionicons name="people" size={18} color="#FFFFFF" />
              <Text style={[styles.statValue, { fontSize: 16 }]}>{totalClients || 0}</Text>
              <Text style={[styles.statLabel, { fontSize: 10 }]}>Clients</Text>
            </View>
            <View style={styles.statCell}> 
              <Ionicons name="trophy" size={18} color="#FFFFFF" />
              <Text style={[styles.statValue, { fontSize: 16 }]}>Pro</Text>
              <Text style={[styles.statLabel, { fontSize: 10 }]}>Level</Text>
            </View>
            <View style={[styles.statCell, { borderRightWidth: 0 }]}> 
                <Ionicons name="star" size={18} color="#FFD700" />
                <Text style={[styles.statValue, { fontSize: 16 }]}>{averageRating !== null ? averageRating.toFixed(1) : "0.0"}</Text>
                <Text style={[styles.statLabel, { fontSize: 10 }]}>Stars</Text>
            </View>
          </View>
        </Animated.View>


        {/* Accordion Sections: About, Specialties, Certifications */}
        <Animated.View style={[styles.section, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>  
          {/* Accordion Header Row */}
          <View style={styles.accordionHeaderRow}>
            <TouchableOpacity
              style={[
                styles.accordionTab,
                { flex: 1 },
                openSection === 'about' ? styles.accordionTabActive : styles.accordionTabInactive,
                { borderTopLeftRadius: 0, borderBottomLeftRadius: 0, borderRightWidth: 0 },
              ]}
              onPress={() => setOpenSection('about')}
              activeOpacity={0.85}
            >
              <Text style={[styles.accordionTabText, openSection === 'about' && styles.accordionTabTextActive]}>About</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.accordionTab,
                { flex: 1 },
                openSection === 'specialties' ? styles.accordionTabActive : styles.accordionTabInactive,
                { borderRightWidth: 0.5 },
              ]}
              onPress={() => setOpenSection('specialties')}
              activeOpacity={0.85}
            >
              <Text style={[styles.accordionTabText, openSection === 'specialties' && styles.accordionTabTextActive]}>Specialties</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.accordionTab,
                { flex: 1 },
                openSection === 'certifications' ? styles.accordionTabActive : styles.accordionTabInactive,
                { borderTopRightRadius: 16, borderBottomRightRadius: 16 },
              ]}
              onPress={() => setOpenSection('certifications')}
              activeOpacity={0.85}
            >
              <Text style={[styles.accordionTabText, openSection === 'certifications' && styles.accordionTabTextActive]}>Certifications</Text>
            </TouchableOpacity>
          </View>

          {/* Accordion Content */}
          {openSection === 'about' && (
            <View style={styles.glassCard}>
              <Text style={styles.aboutText} numberOfLines={showFullBio ? undefined : 4}>
                {trainerData.bio && trainerData.bio !== "string"
                  ? trainerData.bio
                  : "Passionate fitness professional dedicated to helping you achieve your health and wellness goals. With years of experience and proven results, I'm here to guide you on your fitness journey with personalized training programs."}
              </Text>
              {trainerData.bio && trainerData.bio !== "string" && trainerData.bio.length > 200 && (
                  <TouchableOpacity onPress={() => setShowFullBio(!showFullBio)} style={styles.readMoreButton}>
                    <Text style={styles.readMoreTextLink}>
                      {showFullBio ? "Show Less" : "Read More"}
                    </Text>
                    <Ionicons name={showFullBio ? "chevron-up" : "chevron-down"} size={16} color="#0056d2" style={{ marginLeft: 2 }} />
                  </TouchableOpacity>
              )}
            </View>
          )}
          {openSection === 'specialties' && (
            <View style={styles.glassCard}>
              {trainerData.specialties && trainerData.specialties !== "string" ? (
                <HTML
                  source={{ html: trainerData.specialties }}
                  contentWidth={width - 80}
                  tagsStyles={{
                    p: { color: "#4B5563", fontSize: 14, lineHeight: 22, margin: 0 },
                    ul: { margin: 0, paddingLeft: 16 },
                    li: { color: "#4B5563", fontSize: 14, lineHeight: 22 },
                  }}
                  ignoredTags={["script", "style"]}
                />
              ) : (
                <View style={styles.specialtyTags}>
                  {['Weight Training', 'Cardio', 'Nutrition', 'Strength Building'].map((specialty, index) => (
                    <View key={index} style={styles.specialtyTag}>
                      <Text style={styles.specialtyTagText}>{specialty}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
          {openSection === 'certifications' && (
            <View style={styles.glassCard}>
              {trainerData.certifications && trainerData.certifications !== "string" ? (
                <HTML
                  source={{ html: trainerData.certifications }}
                  contentWidth={width - 80}
                  tagsStyles={{
                    p: { color: "#4B5563", fontSize: 14, lineHeight: 22, margin: 0 },
                    ul: { margin: 0, paddingLeft: 16 },
                    li: { color: "#4B5563", fontSize: 14, lineHeight: 22 },
                  }}
                  ignoredTags={["script", "style"]}
                />
              ) : (
                <View style={styles.certificationList}>
                  {['NASM Certified', 'CPR/AED', 'Nutrition Specialist'].map((cert, index) => (
                    <View key={index} style={styles.certificationItem}>
                      <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                      <Text style={styles.certificationText}>{cert}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>


          )}
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
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconContainer, { backgroundColor: '#0056d2', borderWidth: 0 }]}> 
              <Ionicons name="call" size={20} color="#fff" />
            </View>
            <Text style={[styles.sectionTitle, { color: '#0056d2' }]}>Contact</Text>
          </View>
          {/* Contact grid: each button in its own card, 2 columns */}
          <View style={styles.contactGrid}>
            <TouchableOpacity style={styles.contactCard} onPress={handleContactEmail}>
              <View style={styles.contactWhiteCard}>
                <Ionicons name="mail" size={20} color="#0056d2" />
                <Text style={styles.contactBlueLabel}>Email</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.contactCard} onPress={handleContactPhone}>
              <View style={styles.contactWhiteCard}>
                <Ionicons name="call" size={20} color="#0056d2" />
                <Text style={styles.contactBlueLabel}>Call</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.contactCard} onPress={handleOpenSocialLinks}>
              <View style={styles.contactWhiteCard}>
                <Ionicons name="globe" size={20} color="#0056d2" />
                <Text style={styles.contactBlueLabel}>Social</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.contactCard} onPress={handleViewCV}>
              <View style={styles.contactWhiteCard}>
                <Ionicons name="document-text" size={20} color="#0056d2" />
                <Text style={styles.contactBlueLabel}>CV</Text>
              </View>
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
    backgroundColor: "#F8FAFC",
  },
  container: {
    flex: 1,
  },

  // Hero Section
  heroSection: {
    paddingTop: 50,
    paddingBottom: 40,
    position: 'relative',
    overflow: 'hidden',
  },
  customHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    backdropFilter: 'blur(10px)',
  },
  shareButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    backdropFilter: 'blur(10px)',
  },
  profileContent: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  avatarGlow: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  onlineStatus: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#10b981',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlinePulse: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },
  verifiedBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
  },
  badgeGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trainerName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  trainerTitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '500',
  },
  ratingSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  starsContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  ratingText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  heroActions: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
  },
  primaryHeroButton: {
    flex: 2,
    borderRadius: 16,
    overflow: 'hidden',
  },
  heroButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  primaryHeroButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  secondaryHeroButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    backdropFilter: 'blur(10px)',
  },
  secondaryHeroButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  decorativeCircle1: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },

  // Stats Container
  statsContainer: {
    marginHorizontal: 0,
    marginTop: -20,
    zIndex: 10,
  },
  statRow: {
    flexDirection: 'row',
    borderRadius: 0,
    overflow: 'hidden',
    backgroundColor: '#0056d2',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  // floatingHeaderButtons removed, now using standardized Header.js
  statCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#fff',
    minHeight: 90,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },


  // Sections
  section: {
    marginHorizontal: 20,
    marginTop: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },

  // Accordion Tab Row
  accordionHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#e5e9f2',
    marginBottom: 18,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  accordionTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 18,
    minWidth: 90,
    justifyContent: 'center',
    borderRightWidth: 0,
    borderColor: '#d1d5db',
    backgroundColor: 'transparent',
    gap: 6,
  },
  accordionTabActive: {
    backgroundColor: '#0056d2',
    borderColor: '#0056d2',
    zIndex: 2,
  },
  accordionTabInactive: {
    backgroundColor: 'transparent',
    borderColor: '#e5e9f2',
    zIndex: 1,
  },
  accordionTabText: {

    fontSize: 12,
    fontWeight: '700',
    color: '#0056d2',
    letterSpacing: 0.2,
    marginLeft: 4,
    textTransform: 'none',
  },
  accordionTabTextActive: {
    color: '#fff',
    paddingLeft: 4,
    paddingRight: 4,
  },

  // Glass Card Effect
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 10,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
    backdropFilter: 'blur(10px)',
  },
  aboutText: {
    fontSize: 16,
    color: '#4B5563',
    lineHeight: 24,
    textAlign: 'justify',
  },
  readMoreButton: {
    marginTop: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 0,
    backgroundColor: 'transparent',
  },
  readMoreTextLink: {
    fontSize: 14,
    color: '#0056d2',
    fontWeight: '700',
    marginRight: 2,
    // Removed underline as requested
    textDecorationLine: 'none',
  },

  // Expertise
  expertiseContainer: {
    gap: 16,
  },
  expertiseCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  expertiseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  expertiseTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginLeft: 12,
  },
  specialtyTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  specialtyTag: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  specialtyTagText: {
    fontSize: 14,
    color: '#4338CA',
    fontWeight: '500',
  },
  certificationList: {
    gap: 12,
  },
  certificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  certificationText: {
    fontSize: 16,
    color: '#4B5563',
    marginLeft: 12,
    fontWeight: '500',
  },

  // Contact Grid
  contactGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactCard: {
    width: (width - 260) / 2,
    height: (width - 260) / 2,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 1,
    marginBottom: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactWhiteCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  contactGradient: {},
  contactLabel: {},
  contactBlueLabel: {
    fontSize: 10,
    color: '#0056d2',
    fontWeight: '600',
    marginTop: 3,
  },

  // Loading & Error States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingSpinner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderColor: '#0056d2',
    borderWidth: 4,
  },
  loadingText: {
    fontSize: 18,
    color: '#0056d2',
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  errorButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    backdropFilter: 'blur(10px)',
  },
  errorButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSpacing: {
    height: 40,
  },
})

export default TrainerDetailScreen