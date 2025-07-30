
import { useEffect, useState, useContext } from "react"
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
} from "react-native"
import { showErrorFetchAPI, showSuccessMessage } from "utils/toastUtil"
import { apiSubscriptionService } from "services/apiSubscriptionService"
import { AuthContext } from "context/AuthContext"
import { Ionicons } from "@expo/vector-icons"

const { width } = Dimensions.get("window")

const SubscriptionReviewDetailScreen = ({ route, navigation }) => {
  const { subscription } = route.params
  const { user } = useContext(AuthContext)
  const [loading, setLoading] = useState(true)
  const [rating, setRating] = useState(null)
  const [error, setError] = useState(null)

  // State for review form
  const [showForm, setShowForm] = useState(false)
  const [formRating, setFormRating] = useState(5)
  const [formFeedback, setFormFeedback] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const fetchRating = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await apiSubscriptionService.hasUserRatedSubscription(user.userId, subscription.subscriptionId)
        setRating(res) // null if not rated, object if already rated
      } catch (err) {
        setError(err.message || "Error checking rating")
      } finally {
        setLoading(false)
      }
    }

    fetchRating()
  }, [subscription.subscriptionId, user.userId])

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
        // Already has rating, call PUT
        res = await apiSubscriptionService.putRating(rating.ratingId, ratingDto)
        showSuccessMessage("Review updated successfully!")
      } else {
        // No rating yet, call POST
        res = await apiSubscriptionService.postRating(ratingDto)
        showSuccessMessage("Review submitted successfully!")
      }

      setRating(res)
      setShowForm(false)
    } catch (err) {
      showErrorFetchAPI(err || "Could not submit review")
    } finally {
      setSubmitting(false)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return "N/A"
    return dateString.slice(0, 10)
  }

  const formatPrice = (price) => {
    if (!price) return "0"
    return price.toLocaleString("vi-VN")
  }

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return "#10B981"
      case "active":
        return "#3B82F6"
      case "pending":
        return "#F59E0B"
      default:
        return "#6B7280"
    }
  }

  const renderStars = (currentRating, onPress = null, disabled = false) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
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

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading review details...</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <View style={styles.errorIcon}>
            <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          </View>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGoBack} style={styles.headerBackButton}>
            <Ionicons name="arrow-back" size={24} color="#1E293B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Package Review</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Package Information Card */}
        <View style={styles.packageCard}>
          <View style={styles.packageHeader}>
            <Text style={styles.packageName} numberOfLines={2}>
              {subscription.packageName}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(subscription.status) }]}>
              <Text style={styles.statusText}>{subscription.status}</Text>
            </View>
          </View>

          <View style={styles.packageDetails}>
            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Trainer</Text>
                <Text style={styles.detailValue}>{subscription.trainerFullName}</Text>
                <Text style={styles.detailSubValue}>{subscription.trainerEmail}</Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Duration</Text>
                <Text style={styles.detailValue}>
                  {formatDate(subscription.startDate)} - {formatDate(subscription.endDate)}
                </Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Price</Text>
                <Text style={styles.priceValue}>{formatPrice(subscription.packagePrice)} VND</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Review Section */}
        <View style={styles.reviewSection}>
          {showForm ? (
            <View style={styles.reviewForm}>
              <Text style={styles.formTitle}>{rating ? "Edit Your Review" : "Rate This Package"}</Text>

              <View style={styles.ratingSection}>
                <Text style={styles.ratingLabel}>Your Rating</Text>
                {renderStars(formRating, setFormRating, submitting)}
                <Text style={styles.ratingText}>
                  {formRating} star{formRating !== 1 ? "s" : ""}
                </Text>
              </View>

              <View style={styles.feedbackSection}>
                <Text style={styles.feedbackLabel}>Your Feedback (Optional)</Text>
                <TextInput
                  style={styles.feedbackInput}
                  placeholder="Share your experience with this package..."
                  value={formFeedback}
                  onChangeText={setFormFeedback}
                  editable={!submitting}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.formActions}>
                <TouchableOpacity
                  style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
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

                <TouchableOpacity onPress={() => setShowForm(false)} style={styles.cancelButton} disabled={submitting}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : rating ? (
            <View style={styles.existingReview}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewTitle}>Your Review</Text>
                <TouchableOpacity onPress={handleEditReview} style={styles.editButton}>
                  <Ionicons name="create-outline" size={16} color="#3B82F6" />
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
            </View>
          ) : (
            <View style={styles.noReview}>
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
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  loadingText: {
    fontSize: 16,
    color: "#64748B",
    marginTop: 16,
    textAlign: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  errorIcon: {
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 8,
    textAlign: "center",
  },
  errorMessage: {
    fontSize: 16,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  headerBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1E293B",
  },
  headerSpacer: {
    width: 40,
  },
  packageCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  packageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: 20,
    paddingBottom: 16,
  },
  packageName: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1E293B",
    flex: 1,
    marginRight: 12,
    lineHeight: 28,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
    textTransform: "uppercase",
  },
  packageDetails: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  detailRow: {
    flexDirection: "row",
    marginBottom: 16,
  },
  detailItem: {
    flex: 1,
    marginRight: 16,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
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
    fontSize: 18,
    fontWeight: "700",
    color: "#059669",
  },
  reviewSection: {
    margin: 20,
  },
  reviewForm: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: "600",
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
    fontWeight: "500",
    color: "#374151",
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
    fontWeight: "500",
    color: "#374151",
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
    backgroundColor: "#3B82F6",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
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
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  reviewTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1E293B",
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    gap: 4,
  },
  editButtonText: {
    color: "#3B82F6",
    fontSize: 14,
    fontWeight: "500",
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
    fontWeight: "500",
    color: "#374151",
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
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 40,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
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
    fontWeight: "600",
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
    backgroundColor: "#3B82F6",
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
  backButton: {
    backgroundColor: "#3B82F6",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  backButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
})

export default SubscriptionReviewDetailScreen
