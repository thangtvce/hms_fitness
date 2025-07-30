"use client"

import { useState, useEffect, useRef, useContext } from "react"
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Dimensions, Share } from "react-native"
import { showErrorFetchAPI, showSuccessMessage } from "utils/toastUtil"
import { TextInput } from "react-native"
import { apiSubscriptionService } from "services/apiSubscriptionService"
import { LinearGradient } from "expo-linear-gradient"
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons"
import Header from "components/Header"
import DynamicStatusBar from "screens/statusBar/DynamicStatusBar"
import { ActivityIndicator } from "react-native-paper"
import apiTrainerService from "services/apiTrainerService"
import { Image } from "react-native"
import { theme } from "theme/color"
import { SafeAreaView } from "react-native-safe-area-context"
import * as Notifications from "expo-notifications"
import { AuthContext } from "context/AuthContext"
import apiChatSupportService from "services/apiChatSupport"
import CallWaitingPopup from "components/calling/CallWaitingPopup"

const { width } = Dimensions.get("window")

const SubscriptionDetailScreen = ({ route, navigation }) => {
  const { user } = useContext(AuthContext)
  const { subscription } = route.params
  const [loading, setLoading] = useState(false)
  const [showActions, setShowActions] = useState(false)
  const [trainerRatingData, setTrainerRatingData] = useState(null)
  const [trainerExperience, setTrainerExperience] = useState(null)
  const [incomingCall, setIncomingCall] = useState(null)
  const [showCallWaitingPopup, setShowCallWaitingPopup] = useState(false)
  const [currentRoomId, setCurrentRoomId] = useState(null)

  // Rating subscription
  const [myRating, setMyRating] = useState(null)
  const [showRatingForm, setShowRatingForm] = useState(false)
  const [formRating, setFormRating] = useState(5)
  const [formFeedback, setFormFeedback] = useState("")
  const [submittingRating, setSubmittingRating] = useState(false)

  // Get user rating for this subscription
  useEffect(() => {
    const fetchMyRating = async () => {
      if (!user?.userId || !subscription?.subscriptionId) return
      try {
        const res = await apiSubscriptionService.hasUserRatedSubscription(user.userId, subscription.subscriptionId)
        setMyRating(res)
      } catch (err) {
        setMyRating(null)
      }
    }
    fetchMyRating()
  }, [user?.userId, subscription?.subscriptionId])

  const handleShowRatingForm = () => {
    setShowRatingForm(true)
    setFormRating(myRating?.rating || 5)
    setFormFeedback(myRating?.feedbackText || "")
  }

  const handleSubmitRating = async () => {
    if (!formRating || formRating < 1 || formRating > 5) {
      showErrorFetchAPI("Please select a rating from 1 to 5 stars.")
      return
    }

    setSubmittingRating(true)
    try {
      const ratingDto = {
        subscriptionId: subscription.subscriptionId,
        userId: user.userId,
        trainerId: subscription.trainerId,
        rating: formRating,
        feedbackText: formFeedback,
      }

      let res
      if (myRating) {
        res = await apiSubscriptionService.putRating(myRating.ratingId, ratingDto)
        showSuccessMessage("Review updated successfully!")
      } else {
        res = await apiSubscriptionService.postRating(ratingDto)
        showSuccessMessage("Review submitted successfully!")
      }

      setMyRating(res)
      setShowRatingForm(false)
    } catch (err) {
      if (err?.response?.data?.message) {
        showErrorFetchAPI(err.response.data.message)
      } else {
        showErrorFetchAPI(err.message || "Could not submit review")
      }
    } finally {
      setSubmittingRating(false)
    }
  }

  const notificationListener = useRef()
  const responseListener = useRef()
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(30)).current
  const scaleAnim = useRef(new Animated.Value(0.95)).current

  const getLuminance = (color) => {
    const hex = color.replace("#", "")
    const r = Number.parseInt(hex.substr(0, 2), 16) / 255
    const g = Number.parseInt(hex.substr(2, 2), 16) / 255
    const b = Number.parseInt(hex.substr(4, 2), 16) / 255
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b
    return luminance
  }

  const getStatusBarStyle = (backgroundColor) => {
    const luminance = getLuminance(backgroundColor)
    return luminance > 0.5 ? "dark-content" : "light-content"
  }

  const statusBarStyle = getStatusBarStyle(theme.primaryColor)

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
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start()
  }, [])

  useEffect(() => {
    const fetchTrainerData = async () => {
      if (!subscription?.trainerId) return
      try {
        const ratingData = await apiTrainerService.getTrainerAverageRating(subscription.trainerId)
        setTrainerRatingData(ratingData.data)
        const applicationData = await apiTrainerService.getApprovedTrainerApplication(subscription.trainerId)
        setTrainerExperience(applicationData.data)
      } catch (e) {
        setTrainerRatingData(null)
        setTrainerExperience(null)
      }
    }
    fetchTrainerData()
  }, [subscription?.trainerId])

  useEffect(() => {
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data
      if (data.type === "call-incoming" && data.roomId) {
        setIncomingCall({
          roomId: data.roomId,
          callerName: data.callerName || "Unknown caller",
        })
      } else if (data.type === "call-accepted" && data.roomId && data.roomId === currentRoomId) {
        setShowCallWaitingPopup(false)
        setCurrentRoomId(null)
        navigation.navigate("VideoCallSupport", { roomId: data.roomId })
      } else if (data.type === "call-rejected" && data.roomId && data.roomId === currentRoomId) {
        setShowCallWaitingPopup(false)
        setCurrentRoomId(null)
        showErrorFetchAPI(`Call was rejected by ${data.rejectorId}`)
      }
    })

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current)
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current)
      }
    }
  }, [navigation, currentRoomId])

  const getStatusInfo = (status) => {
    switch (status?.toLowerCase()) {
      case "active":
        return {
          color: theme.successColor,
          bgColor: "#D1FAE5",
          icon: "checkmark-circle",
          label: "Active",
          description: "Your subscription is currently active and running",
        }
      case "pending":
        return {
          color: theme.warningColor,
          bgColor: "#FEF3C7",
          icon: "time",
          label: "Pending",
          description: "Your subscription is pending activation",
        }
      case "paid":
        return {
          color: "#059669",
          bgColor: "#A7F3D0",
          icon: "card",
          label: "Paid",
          description: "Payment completed successfully",
        }
      case "canceled":
        return {
          color: theme.dangerColor,
          bgColor: "#FEE2E2",
          icon: "close-circle",
          label: "Canceled",
          description: "This subscription has been canceled",
        }
      case "expired":
        return {
          color: theme.neutralColor,
          bgColor: "#F3F4F6",
          icon: "calendar",
          label: "Expired",
          description: "This subscription has expired",
        }
      default:
        return {
          color: theme.neutralColor,
          bgColor: "#F1F5F9",
          icon: "help-circle",
          label: "Unknown",
          description: "Status information not available",
        }
    }
  }

  const calculateProgress = () => {
    const startDate = new Date(subscription.startDate)
    const endDate = new Date(subscription.endDate)
    const currentDate = new Date()
    const totalDuration = endDate - startDate
    const elapsed = currentDate - startDate
    return Math.min(100, Math.max(0, (elapsed / totalDuration) * 100))
  }

  const getDaysRemaining = () => {
    const endDate = new Date(subscription.endDate)
    const currentDate = new Date()
    const diffTime = endDate - currentDate
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return Math.max(0, diffDays)
  }

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out my ${subscription.packageName} subscription with ${subscription.trainerFullName}!`,
        title: "My Fitness Subscription",
      })
    } catch (error) {
      showErrorFetchAPI(error.message || "Failed to share subscription details.")
    }
  }

  const handleContactTrainer = async () => {
    try {
      setLoading(true)
      if (!user?.userId) {
        throw new Error("User data not found")
      }
      const response = await apiChatSupportService.createCallRoom({
        userId: user.userId,
        trainerId: subscription.trainerId,
      })
      if (response.statusCode === 200 && response.data) {
        setCurrentRoomId(response.data.roomId)
        setShowCallWaitingPopup(true)
        showSuccessMessage("Call request sent to trainer. Waiting for response...")
      } else {
        throw new Error(response.message || "Failed to create call room")
      }
    } catch (error) {
      console.log("Error initiating call:", error)
      showErrorFetchAPI(error.message || "Failed to initiate call with trainer")
    } finally {
      setLoading(false)
    }
  }

  const handleRenewSubscription = () => {
    navigation.navigate("Payment", {
      packageId: subscription.packageId,
      packageName: subscription.packageName,
      price: subscription.packagePrice,
      trainerId: subscription.trainerId,
      trainerFullName: subscription.trainerFullName,
      isRenewal: true,
    })
  }

  const handleCancelSubscription = () => {
    showSuccessMessage("Cancellation feature will be available soon!")
  }

  const handleCompletePayment = () => {
    navigation.navigate("QRPaymentScreen", {
      amount: subscription.packagePrice || 0,
      packageName: subscription.packageName,
      paymentUrl: subscription.paymentUrl,
    })
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
              size={28}
              color={currentRating >= star ? "#FFD700" : "#CBD5E1"}
            />
          </TouchableOpacity>
        ))}
      </View>
    )
  }

  const statusInfo = getStatusInfo(subscription.status)
  const progress = calculateProgress()
  const daysRemaining = getDaysRemaining()
  const isExpired = new Date(subscription.endDate) < new Date()
  const isActive = subscription.status?.toLowerCase() === "active"

  return (
    <SafeAreaView style={styles.safeArea}>
      <DynamicStatusBar backgroundColor="#FFFFFF" />
      <Header
        title="Subscription Details"
        onBack={() => navigation.goBack()}
        backgroundColor="#FFFFFF"
        textColor="#2D3748"
        subtitle="Manage your package"
        rightActions={[
          {
            icon: "share-outline",
            onPress: handleShare,
            color: "#2D3748",
          },
        ]}
      />
      {loading && (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={theme.secondaryColor} />
        </View>
      )}
      <CallWaitingPopup
        visible={showCallWaitingPopup}
        setVisible={setShowCallWaitingPopup}
        roomId={currentRoomId}
        userId={user?.userId}
        setRoomId={setCurrentRoomId}
      />
      <ScrollView style={[styles.container, { marginTop: 55 }]} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <Animated.View
          style={[
            styles.heroSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
            },
          ]}
        >
          <LinearGradient colors={[theme.backgroundColor, theme.lightBackground]} style={styles.heroGradient}>
            <View style={styles.heroHeader}>
              <View style={styles.packageIconContainer}>
                <MaterialCommunityIcons name="package-variant" size={32} color="#0056d2" />
              </View>
              <View style={styles.heroInfo}>
                <Text style={styles.packageName}>{subscription.packageName || "Fitness Package"}</Text>
                <Text style={styles.trainerName}>with {subscription.trainerFullName || "Professional Trainer"}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: statusInfo.bgColor }]}>
                <Ionicons name={statusInfo.icon} size={16} color={statusInfo.color} />
                <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
              </View>
            </View>
            <Text style={styles.statusDescription}>{statusInfo.description}</Text>
            {isActive && (
              <View style={styles.progressSection}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressTitle}>Subscription Progress</Text>
                  <Text style={styles.progressPercentage}>{Math.round(progress)}%</Text>
                </View>
                <View style={styles.progressBarContainer}>
                  <View style={styles.progressBar}>
                    <Animated.View style={[styles.progressFill, { width: `${progress}%` }]} />
                  </View>
                </View>
                <View style={styles.progressInfo}>
                  <Text style={styles.progressText}>
                    {daysRemaining > 0 ? `${daysRemaining} days remaining` : "Subscription ended"}
                  </Text>
                </View>
              </View>
            )}
          </LinearGradient>
        </Animated.View>

        {/* Package Info Section */}
        <Animated.View
          style={[
            styles.infoSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={styles.sectionTitle}>Package Information</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoCard}>
              <View style={styles.infoIconContainer}>
                <Ionicons name="pricetag" size={20} color="#0056d2" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Price</Text>
                <Text style={styles.infoValue}>${subscription.packagePrice?.toLocaleString() || "0"}</Text>
              </View>
            </View>
            <View style={styles.infoCard}>
              <View style={styles.infoIconContainer}>
                <Ionicons name="time" size={20} color="#0056d2" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Duration</Text>
                <Text style={styles.infoValue}>{subscription.packageDurationDays || "0"} days</Text>
              </View>
            </View>
            <View style={styles.infoCard}>
              <View style={styles.infoIconContainer}>
                <Ionicons name="play-circle" size={20} color={theme.successColor} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Start Date</Text>
                <Text style={styles.infoValue}>
                  {new Date(subscription.startDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </Text>
              </View>
            </View>
            <View style={styles.infoCard}>
              <View style={styles.infoIconContainer}>
                <Ionicons name="stop-circle" size={20} color={isExpired ? theme.dangerColor : theme.warningColor} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>End Date</Text>
                <Text style={[styles.infoValue, isExpired && styles.expiredText]}>
                  {new Date(subscription.endDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Your Trainer Section */}
        <Animated.View
          style={[
            styles.trainerSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 8 }}>
            <Ionicons name="person-outline" size={24} color="#0056d2" />
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#1F2937" }}>Your Trainer</Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.85}
            style={{
              backgroundColor: "#F8FAFC",
              borderRadius: 20,
              flexDirection: "row",
              alignItems: "center",
              padding: 18,
              shadowColor: "#0056d2",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 12,
              elevation: 4,
              marginBottom: 2,
              borderWidth: 1,
              borderColor: "#0056d2",
            }}
            onPress={() => {
              if (subscription?.trainerId) {
                navigation.navigate("TrainerDetailScreen", { trainerId: subscription.trainerId })
              }
            }}
          >
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                marginRight: 18,
                overflow: "hidden",
                backgroundColor: "#EEF2FF",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {subscription.trainerAvatar ? (
                <Image
                  source={{ uri: subscription.trainerAvatar }}
                  style={{ width: 64, height: 64, borderRadius: 32 }}
                />
              ) : (
                <Ionicons name="person" size={32} color="#94A3B8" />
              )}
              <View
                style={{
                  position: "absolute",
                  bottom: 4,
                  right: 4,
                  width: 16,
                  height: 16,
                  borderRadius: 8,
                  backgroundColor: "#10B981",
                  borderWidth: 2,
                  borderColor: "#FFFFFF",
                }}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#1F2937", marginBottom: 2 }}>
                {subscription.trainerFullName || "Professional Trainer"}
              </Text>
              <Text style={{ fontSize: 14, color: "#64748B", marginBottom: 6 }}>Certified Fitness Coach</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                  <Ionicons name="star" size={12} color="#F59E0B" />
                  <Text style={{ fontSize: 12, color: "#64748B", fontWeight: "600" }}>
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
                <View style={{ width: 1, height: 14, backgroundColor: "#E2E8F0", marginHorizontal: 5 }} />
                <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                  <Ionicons name="people-outline" size={12} color="#64748B" />
                  <Text style={{ fontSize: 12, color: "#64748B", fontWeight: "600" }}>
                    {trainerRatingData && trainerRatingData.currentSubscribers !== null
                      ? trainerRatingData.currentSubscribers
                      : "0"}{" "}
                    clients
                  </Text>
                </View>
                <View style={{ width: 1, height: 14, backgroundColor: "#E2E8F0", marginHorizontal: 5 }} />
                <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                  <Ionicons name="time-outline" size={12} color="#10B981" />
                  <Text style={{ fontSize: 12, color: "#64748B", fontWeight: "600" }}>
                    {trainerExperience && trainerExperience.experienceYears !== null
                      ? trainerExperience.experienceYears
                      : "0"}{" "}
                    yrs
                  </Text>
                </View>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={22} color="#94A3B8" style={{ marginLeft: 8 }} />
          </TouchableOpacity>
        </Animated.View>

        {/* Timeline and Actions */}
        <Animated.View
          style={[
            styles.timelineSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={styles.sectionTitle}>Subscription Timeline</Text>
          <View style={styles.timeline}>
            <View style={styles.timelineItem}>
              <View style={[styles.timelineIcon, { backgroundColor: "#D1FAE5" }]}>
                <Ionicons name="calendar" size={16} color={theme.successColor} />
              </View>
              <View style={styles.timelineContent}>
                <Text style={styles.timelineTitle}>Subscription Created</Text>
                <Text style={styles.timelineDate}>
                  {new Date(subscription.createdAt).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </Text>
              </View>
            </View>
            <View style={styles.timelineItem}>
              <View style={[styles.timelineIcon, { backgroundColor: "#A7F3D0" }]}>
                <Ionicons name="play" size={16} color="#059669" />
              </View>
              <View style={styles.timelineContent}>
                <Text style={styles.timelineTitle}>Subscription Started</Text>
                <Text style={styles.timelineDate}>
                  {new Date(subscription.startDate).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </Text>
              </View>
            </View>
            <View style={styles.timelineItem}>
              <View style={[styles.timelineIcon, { backgroundColor: isExpired ? "#FEE2E2" : "#FEF3C7" }]}>
                <Ionicons
                  name={isExpired ? "stop" : "flag"}
                  size={16}
                  color={isExpired ? theme.dangerColor : theme.warningColor}
                />
              </View>
              <View style={styles.timelineContent}>
                <Text style={styles.timelineTitle}>{isExpired ? "Subscription Ended" : "Subscription Ends"}</Text>
                <Text style={[styles.timelineDate, isExpired && styles.expiredText]}>
                  {new Date(subscription.endDate).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>

        <Animated.View
          style={[
            styles.actionsSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {subscription.status?.toLowerCase() === "pending" && (
            <TouchableOpacity style={styles.completePaymentButton} onPress={handleCompletePayment}>
              <Ionicons name="card" size={20} color="#059669" />
              <Text style={styles.completePaymentButtonText}>Complete Payment</Text>
            </TouchableOpacity>
          )}
          {isActive && (
            <TouchableOpacity style={styles.primaryButton} onPress={handleRenewSubscription}>
              <Ionicons name="refresh" size={20} color={theme.primaryColor} />
              <Text style={styles.primaryButtonText}>Renew Subscription</Text>
            </TouchableOpacity>
          )}
          {(isActive || subscription.status?.toLowerCase() === "pending") && (
            <TouchableOpacity style={styles.dangerButton} onPress={handleCancelSubscription}>
              <Ionicons name="close-circle" size={20} color={theme.primaryColor} />
              <Text style={styles.dangerButtonText}>Cancel Subscription</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleContactTrainer}
            disabled={showCallWaitingPopup}
          >
            <Ionicons name="chatbubble-outline" size={20} color={theme.secondaryColor} />
            <Text style={styles.secondaryButtonText}>Contact Trainer</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Your Review Section */}
        <Animated.View
          style={[
            styles.reviewSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.reviewHeader}>
            <View style={styles.reviewHeaderIcon}>
              <Ionicons name="star-outline" size={20} color="#3B82F6" />
            </View>
            <Text style={styles.reviewHeaderTitle}>Your Review</Text>
          </View>

          {showRatingForm ? (
            <View style={styles.reviewForm}>
              <Text style={styles.formTitle}>{myRating ? "Edit Your Review" : "Rate This Package"}</Text>

              <View style={styles.ratingSection}>
                <Text style={styles.ratingLabel}>Your Rating</Text>
                {renderStars(formRating, setFormRating, submittingRating)}
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
                  editable={!submittingRating}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.formActions}>
                <TouchableOpacity
                  style={[styles.submitButton, submittingRating && styles.submitButtonDisabled]}
                  onPress={handleSubmitRating}
                  disabled={submittingRating}
                >
                  {submittingRating ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  )}
                  <Text style={styles.submitButtonText}>
                    {submittingRating ? "Submitting..." : myRating ? "Update Review" : "Submit Review"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setShowRatingForm(false)}
                  style={styles.cancelButton}
                  disabled={submittingRating}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : myRating ? (
            <View style={styles.existingReview}>
              <View style={styles.reviewContent}>
                <View style={styles.ratingDisplay}>
                  {renderStars(myRating.rating)}
                  <Text style={styles.ratingDisplayText}>{myRating.rating} out of 5 stars</Text>
                </View>

                {myRating.feedbackText && (
                  <View style={styles.feedbackDisplay}>
                    <Text style={styles.feedbackDisplayLabel}>Your Feedback:</Text>
                    <Text style={styles.feedbackDisplayText}>{myRating.feedbackText}</Text>
                  </View>
                )}

                <Text style={styles.reviewDate}>
                  Reviewed on {new Date(myRating.createdAt).toLocaleDateString("en-US")}
                </Text>
              </View>

              <TouchableOpacity style={styles.editReviewButton} onPress={handleShowRatingForm}>
                <Ionicons name="create-outline" size={18} color="#3B82F6" />
                <Text style={styles.editReviewButtonText}>Edit Review</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.noReview}>
              <View style={styles.noReviewIcon}>
                <Ionicons name="star-outline" size={32} color="#9CA3AF" />
              </View>
              <Text style={styles.noReviewTitle}>No Review Yet</Text>
              <Text style={styles.noReviewDescription}>
                Share your experience with this package to help other users make informed decisions.
              </Text>
              <TouchableOpacity style={styles.writeReviewButton} onPress={handleShowRatingForm}>
                <Ionicons name="star" size={18} color="#FFFFFF" />
                <Text style={styles.writeReviewButtonText}>Write a Review</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.primaryColor,
  },
  container: {
    flex: 1,
    backgroundColor: theme.lightBackground,
  },
  heroSection: {
    marginTop: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: theme.textPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  heroGradient: {
    padding: 24,
  },
  heroHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  packageIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  heroInfo: {
    flex: 1,
  },
  packageName: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.textPrimary,
    marginBottom: 4,
  },
  trainerName: {
    fontSize: 12,
    color: theme.textSecondary,
    fontWeight: "500",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  statusDescription: {
    fontSize: 12,
    color: theme.textSecondary,
    marginBottom: 20,
    lineHeight: 18,
  },
  progressSection: {
    backgroundColor: theme.lightBackground,
    borderRadius: 16,
    padding: 20,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.textPrimary,
  },
  progressPercentage: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.secondaryColor,
  },
  progressBarContainer: {
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: "#E2E8F0",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: theme.secondaryColor,
    borderRadius: 4,
  },
  progressInfo: {
    alignItems: "center",
  },
  progressText: {
    fontSize: 11,
    color: theme.textSecondary,
    fontWeight: "500",
  },
  infoSection: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.textPrimary,
    marginBottom: 16,
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  infoCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: theme.backgroundColor,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: theme.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: theme.textSecondary,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.textPrimary,
  },
  expiredText: {
    color: theme.dangerColor,
  },
  trainerSection: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  timelineSection: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  timeline: {
    backgroundColor: theme.backgroundColor,
    borderRadius: 16,
    padding: 20,
    shadowColor: theme.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  timelineItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  timelineIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  timelineContent: {
    flex: 1,
  },
  timelineTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.textPrimary,
    marginBottom: 4,
  },
  timelineDate: {
    fontSize: 11,
    color: theme.textSecondary,
  },
  actionsSection: {
    marginHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.secondaryColor,
    borderRadius: 16,
    paddingVertical: 16,
    gap: 8,
    shadowColor: theme.secondaryColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.primaryColor,
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.backgroundColor,
    borderRadius: 16,
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: theme.secondaryColor,
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.secondaryColor,
  },
  dangerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.dangerColor,
    borderRadius: 16,
    paddingVertical: 16,
    gap: 8,
  },
  dangerButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.primaryColor,
  },
  completePaymentButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#A7F3D0",
    borderRadius: 16,
    paddingVertical: 16,
    gap: 8,
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  completePaymentButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#059669",
  },
  // Review Section Styles
  reviewSection: {
    marginHorizontal: 16,
    marginBottom: 24,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  reviewHeaderIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  reviewHeaderTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
  },
  reviewForm: {
    alignItems: "center",
  },
  formTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 20,
    textAlign: "center",
  },
  ratingSection: {
    alignItems: "center",
    marginBottom: 20,
  },
  ratingLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
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
    color: "#6B7280",
    fontWeight: "500",
  },
  feedbackSection: {
    width: "100%",
    marginBottom: 20,
  },
  feedbackLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 8,
  },
  feedbackInput: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: "#1F2937",
    minHeight: 80,
    textAlignVertical: "top",
  },
  formActions: {
    width: "100%",
    gap: 12,
  },
  submitButton: {
    backgroundColor: "#3B82F6",
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
    paddingVertical: 10,
  },
  cancelButtonText: {
    color: "#6B7280",
    fontSize: 14,
    fontWeight: "500",
  },
  existingReview: {
    alignItems: "center",
  },
  reviewContent: {
    alignItems: "center",
    marginBottom: 20,
  },
  ratingDisplay: {
    alignItems: "center",
    marginBottom: 16,
  },
  ratingDisplayText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
    marginTop: 8,
  },
  feedbackDisplay: {
    width: "100%",
    marginBottom: 12,
  },
  feedbackDisplayLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 8,
  },
  feedbackDisplayText: {
    fontSize: 14,
    color: "#1F2937",
    lineHeight: 20,
    backgroundColor: "#F9FAFB",
    padding: 12,
    borderRadius: 8,
  },
  reviewDate: {
    fontSize: 12,
    color: "#9CA3AF",
    fontStyle: "italic",
  },
  editReviewButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  editReviewButtonText: {
    color: "#3B82F6",
    fontSize: 14,
    fontWeight: "600",
  },
  noReview: {
    alignItems: "center",
    paddingVertical: 20,
  },
  noReviewIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  noReviewTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
    textAlign: "center",
  },
  noReviewDescription: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  writeReviewButton: {
    backgroundColor: "#3B82F6",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  writeReviewButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  bottomSpacing: {
    height: 40,
  },
})

export default SubscriptionDetailScreen
