import { useEffect,useState,useContext,useRef } from "react"
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  ScrollView,
  Dimensions,
  Animated,
  Platform,
  KeyboardAvoidingView,
} from "react-native"
import { showErrorFetchAPI,showSuccessMessage } from "utils/toastUtil"
import { apiSubscriptionService } from "services/apiSubscriptionService"
import { AuthContext } from "context/AuthContext"
import { Ionicons,Feather } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import SkeletonCard from "components/SkeletonCard/SkeletonCard"
import Header from "components/Header"

const { width } = Dimensions.get("window")

const SubscriptionReviewDetailScreen = ({ route,navigation }) => {
  const { subscription } = route.params
  const { user } = useContext(AuthContext)
  const [loading,setLoading] = useState(true)
  const [rating,setRating] = useState(null)
  const [error,setError] = useState(null)
  const [showForm,setShowForm] = useState(false)
  const [formRating,setFormRating] = useState(5)
  const [formFeedback,setFormFeedback] = useState("")
  const [submitting,setSubmitting] = useState(false)

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(30)).current
  const scaleAnim = useRef(new Animated.Value(0.95)).current
  const scrollViewRef = useRef(null)
  const feedbackInputRef = useRef(null)

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
      Animated.spring(scaleAnim,{
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start()

    return () => {
      fadeAnim.setValue(0)
      slideAnim.setValue(30)
      scaleAnim.setValue(0.95)
    }
  },[])

  useEffect(() => {
    const fetchRating = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await apiSubscriptionService.hasUserRatedSubscription(user.userId,subscription.subscriptionId)
        setRating(res)
      } catch (err) {
        showErrorFetchAPI(err?.response?.data?.message || "Error checking rating")
        setError(err?.response?.data?.message || "Error checking rating")
        console.log(err?.response?.data?.message)
      } finally {
        setLoading(false)
      }
    }

    fetchRating()
  },[subscription.subscriptionId,user.userId])

  const handleGoBack = () => navigation.goBack()

  const handleReview = () => {
    setShowForm(true)
    setFormRating(5)
    setFormFeedback("")
  }

  const handleEditReview = () => {
    setShowForm(true)
    setFormRating(rating.rating)
    setFormFeedback(rating.feedbackText || "")
  }

  const handleSubmit = async () => {
    if (!formRating || formRating < 1 || formRating > 5) {
      showErrorFetchAPI("Please select a rating from 1 to 5 stars.")
      return
    }

    setSubmitting(true)
    try {
      const ratingDto = {
        subscriptionId: subscription.subscriptionId,
        userId: user.userId,
        trainerId: subscription.trainerId,
        rating: formRating,
        feedbackText: formFeedback,
      }

      let res
      if (rating) {
        res = await apiSubscriptionService.putRating(rating.ratingId,ratingDto)
        showSuccessMessage("Review updated successfully!")
      } else {
        res = await apiSubscriptionService.postRating(ratingDto)
        showSuccessMessage("Review submitted successfully!")
      }

      setRating(res)
      setShowForm(false)
    } catch (err) {
      showErrorFetchAPI(err)
    } finally {
      setSubmitting(false)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleDateString("en-US",{
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const formatPrice = (price) => {
    if (!price) return "0"
    return price.toLocaleString("vi-VN")
  }

  const getStatusInfo = (status) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return { color: "#10B981",bgColor: "#D1FAE5",icon: "checkmark-circle" }
      case "active":
        return { color: "#0056d2",bgColor: "#E3F2FD",icon: "checkmark-circle" }
      case "pending":
        return { color: "#F59E0B",bgColor: "#FEF3C7",icon: "time" }
      default:
        return { color: "#6B7280",bgColor: "#F1F5F9",icon: "help-circle" }
    }
  }

  const renderStars = (currentRating,onPress = null,disabled = false) => {
    return (
      <View style={styles.starsContainer}>
        {[1,2,3,4,5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => onPress && onPress(star)}
            style={styles.starButton}
            disabled={disabled || !onPress}
          >
            <Ionicons
              name={currentRating >= star ? "star" : "star-outline"}
              size={32}
              color={currentRating >= star ? "#FFD700" : "#CBD5E1"}
            />
          </TouchableOpacity>
        ))}
      </View>
    )
  }

  const renderSkeletonLoader = () => (
    <View style={styles.skeletonContainer}>
      <SkeletonCard cardHeight={200} />
      <SkeletonCard cardHeight={300} />
    </View>
  )

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header
          title="Subscription Review"
          onBack={() => navigation.goBack()}
          subtitle="Loading review..."
          style={{ backgroundColor: "#0056d2",paddingTop: Platform.OS === "android" ? 40 : 20,paddingBottom: 10 }}
        />
        {renderSkeletonLoader()}
      </SafeAreaView>
    )
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <Header
          title="Subscription Review"
          onBack={() => navigation.goBack()}
          subtitle="Error loading review"
          style={{ backgroundColor: "#0056d2",paddingTop: Platform.OS === "android" ? 40 : 20,paddingBottom: 10 }}
        />
        <Animated.View
          style={[
            styles.errorContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim },{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={styles.errorIcon}>
            <Ionicons name="alert-circle-outline" size={80} color="#EF4444" />
          </View>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </Animated.View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="Subscription Review"
        onBack={() => navigation.goBack()}
        subtitle={subscription.packageName}
        style={{ backgroundColor: "#0056d2",paddingTop: Platform.OS === "android" ? 40 : 20,paddingBottom: 10 }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={10}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollViewContent}
        >
          {/* Package Information Card */}
          <Animated.View
            style={[
              styles.packageCard,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim },{ scale: scaleAnim }],
              },
            ]}
          >
            <LinearGradient colors={["#FFFFFF","#FAFBFF"]} style={styles.cardGradient}>
              <View style={styles.packageHeader}>
                <View style={styles.packageIconContainer}>
                  <Feather name="package" size={24} color="#0056d2" />
                </View>
                <View style={styles.packageInfo}>
                  <Text style={styles.packageName} numberOfLines={2}>
                    {subscription.packageName}
                  </Text>
                  <Text style={styles.packageSubtitle}>Review this package</Text>
                </View>
                <View style={[styles.statusBadge,{ backgroundColor: getStatusInfo(subscription.status).bgColor }]}>
                  <Ionicons
                    name={getStatusInfo(subscription.status).icon}
                    size={12}
                    color={getStatusInfo(subscription.status).color}
                  />
                  <Text style={[styles.statusText,{ color: getStatusInfo(subscription.status).color }]}>
                    {subscription.status}
                  </Text>
                </View>
              </View>

              <View style={styles.packageDetails}>
                <View style={styles.detailRow}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>
                      <Feather name="user" size={14} color="#64748B" /> Trainer
                    </Text>
                    <Text style={styles.detailValue}>{subscription.trainerFullName}</Text>
                    <Text style={styles.detailSubValue}>{subscription.trainerEmail}</Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>
                      <Feather name="calendar" size={14} color="#64748B" /> Duration
                    </Text>
                    <Text style={styles.detailValue}>
                      {formatDate(subscription.startDate)} - {formatDate(subscription.endDate)}
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>
                      <Feather name="dollar-sign" size={14} color="#64748B" /> Price
                    </Text>
                    <Text style={styles.priceValue}>{formatPrice(subscription.packagePrice)} VND</Text>
                  </View>
                </View>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* Review Section */}
          <Animated.View
            style={[
              styles.reviewSection,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim },{ scale: scaleAnim }],
              },
            ]}
          >
            {showForm ? (
              <LinearGradient colors={["#FFFFFF","#FAFBFF"]} style={styles.reviewForm}>
                <Text style={styles.formTitle}>{rating ? "Edit Your Review" : "Rate This Package"}</Text>

                <View style={styles.ratingSection}>
                  <Text style={styles.ratingLabel}>Your Rating</Text>
                  {renderStars(formRating,setFormRating,submitting)}
                  <Text style={styles.ratingText}>
                    {formRating} star{formRating !== 1 ? "s" : ""}
                  </Text>
                </View>

                <View style={styles.feedbackSection}>
                  <Text style={styles.feedbackLabel}>Your Feedback (Optional)</Text>
                  <TextInput
                    ref={feedbackInputRef}
                    style={styles.feedbackInput}
                    placeholder="Share your experience with this package..."
                    value={formFeedback}
                    onChangeText={setFormFeedback}
                    editable={!submitting}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    placeholderTextColor="#9CA3AF"
                    onFocus={() => {
                      setTimeout(() => {
                        feedbackInputRef.current.measure((x,y,width,height,pageX,pageY) => {
                          scrollViewRef.current.scrollTo({ y: pageY - 100,animated: true })
                        })
                      },100)
                    }}
                  />
                </View>

                <View style={styles.formActions}>
                  <TouchableOpacity
                    style={[styles.submitButton,submitting && styles.submitButtonDisabled]}
                    onPress={handleSubmit}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                    )}
                    <Text style={styles.submitButtonText}>
                      {submitting ? "Submitting..." : rating ? "Update Review" : "Submit Review"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setShowForm(false)}
                    style={styles.cancelButton}
                    disabled={submitting}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            ) : rating ? (
              <LinearGradient colors={["#FFFFFF","#FAFBFF"]} style={styles.existingReview}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewTitle}>Your Review</Text>
                  <TouchableOpacity onPress={handleEditReview} style={styles.editButton}>
                    <Ionicons name="create-outline" size={16} color="#0056d2" />
                    <Text style={styles.editButtonText}>Edit</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.reviewContent}>
                  <View style={styles.ratingDisplay}>
                    {renderStars(rating.rating)}
                    <Text style={styles.ratingDisplayText}>{rating.rating} out of 5 stars</Text>
                  </View>

                  {rating.feedbackText && (
                    <View style={styles.feedbackDisplay}>
                      <Text style={styles.feedbackDisplayLabel}>Your Feedback:</Text>
                      <Text style={styles.feedbackDisplayText}>{rating.feedbackText}</Text>
                    </View>
                  )}

                  <Text style={styles.reviewDate}>Reviewed on {formatDate(rating.createdAt)}</Text>
                </View>
              </LinearGradient>
            ) : (
              <LinearGradient colors={["#FFFFFF","#FAFBFF"]} style={styles.noReview}>
                <View style={styles.noReviewIcon}>
                  <Ionicons name="star-outline" size={48} color="#9CA3AF" />
                </View>
                <Text style={styles.noReviewTitle}>No Review Yet</Text>
                <Text style={styles.noReviewDescription}>
                  Share your experience with this package to help other users make informed decisions.
                </Text>
                <TouchableOpacity style={styles.reviewButton} onPress={handleReview}>
                  <Ionicons name="star" size={20} color="#FFFFFF" />
                  <Text style={styles.reviewButtonText}>Write a Review</Text>
                </TouchableOpacity>
              </LinearGradient>
            )}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    marginTop: 50
  },
  skeletonContainer: {
    padding: 16,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#0056d2",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  headerBackButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  headerSpacer: {
    width: 44,
  },
  packageCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cardGradient: {
    padding: 20,
  },
  packageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  packageIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#E3F2FD",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  packageInfo: {
    flex: 1,
  },
  packageName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 4,
  },
  packageSubtitle: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  packageDetails: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 16,
  },
  detailRow: {
    flexDirection: "row",
    marginBottom: 12,
  },
  detailItem: {
    flex: 1,
    marginRight: 16,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#64748B",
    marginBottom: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 2,
  },
  detailSubValue: {
    fontSize: 14,
    color: "#64748B",
  },
  priceValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#059669",
  },
  reviewSection: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 32,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  reviewForm: {
    padding: 24,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 24,
    textAlign: "center",
  },
  ratingSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 12,
  },
  starsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 8,
  },
  starButton: {
    padding: 4,
  },
  ratingText: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
  },
  feedbackSection: {
    marginBottom: 24,
  },
  feedbackLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 8,
  },
  feedbackInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#1E293B",
    minHeight: 100,
    textAlignVertical: "top",
  },
  formActions: {
    gap: 12,
  },
  submitButton: {
    backgroundColor: "#0056d2",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  cancelButton: {
    alignItems: "center",
    paddingVertical: 12,
  },
  cancelButtonText: {
    color: "#64748B",
    fontSize: 16,
    fontWeight: "500",
  },
  existingReview: {
    padding: 24,
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  reviewTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#E3F2FD",
    borderRadius: 8,
    gap: 4,
  },
  editButtonText: {
    color: "#0056d2",
    fontSize: 14,
    fontWeight: "600",
  },
  reviewContent: {
    alignItems: "center",
  },
  ratingDisplay: {
    alignItems: "center",
    marginBottom: 20,
  },
  ratingDisplayText: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
    marginTop: 8,
  },
  feedbackDisplay: {
    width: "100%",
    marginBottom: 16,
  },
  feedbackDisplayLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 8,
  },
  feedbackDisplayText: {
    fontSize: 16,
    color: "#1E293B",
    lineHeight: 24,
    backgroundColor: "#F8FAFC",
    padding: 16,
    borderRadius: 12,
  },
  reviewDate: {
    fontSize: 12,
    color: "#9CA3AF",
    fontStyle: "italic",
  },
  noReview: {
    padding: 40,
    alignItems: "center",
  },
  noReviewIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  noReviewTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 8,
    textAlign: "center",
  },
  noReviewDescription: {
    fontSize: 16,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
  },
  reviewButton: {
    backgroundColor: "#0056d2",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  reviewButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    backgroundColor: "#F8FAFC",
  },
  errorIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#FEF2F2",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 12,
    textAlign: "center",
  },
  errorMessage: {
    fontSize: 16,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },
  backButton: {
    backgroundColor: "#0056d2",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  backButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
})

export default SubscriptionReviewDetailScreen