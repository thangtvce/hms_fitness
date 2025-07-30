import { useState,useEffect,useRef,useContext } from "react"
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  Share,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  Alert,
} from "react-native"
import { showErrorFetchAPI,showErrorMessage,showSuccessMessage } from "utils/toastUtil"
import { apiSubscriptionService } from "services/apiSubscriptionService"
import { LinearGradient } from "expo-linear-gradient"
import { Ionicons,MaterialCommunityIcons } from "@expo/vector-icons"
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
import SkeletonCard from "components/SkeletonCard/SkeletonCard"

const { width } = Dimensions.get("window")

const SubscriptionDetailScreen = ({ route,navigation }) => {
  const { user } = useContext(AuthContext)
  const { subscription } = route.params
  const [loading,setLoading] = useState(true)
  const [showActions,setShowActions] = useState(false)
  const [trainerRatingData,setTrainerRatingData] = useState(null)
  const [trainerExperience,setTrainerExperience] = useState(null)
  const [incomingCall,setIncomingCall] = useState(null)
  const [showCallWaitingPopup,setShowCallWaitingPopup] = useState(false)
  const [currentRoomId,setCurrentRoomId] = useState(null)

  const [myRating,setMyRating] = useState(null)
  const [showRatingForm,setShowRatingForm] = useState(false)
  const [formRating,setFormRating] = useState(5)
  const [formFeedback,setFormFeedback] = useState("")
  const [submittingRating,setSubmittingRating] = useState(false)

  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(30)).current
  const scaleAnim = useRef(new Animated.Value(0.95)).current
  const scrollViewRef = useRef(null)
  const feedbackInputRef = useRef(null)

  const notificationListener = useRef()
  const responseListener = useRef()

  useEffect(() => {
    const fetchMyRating = async () => {
      if (!user?.userId || !subscription?.subscriptionId) return
      try {
        const res = await apiSubscriptionService.hasUserRatedSubscription(user.userId,subscription.subscriptionId)
        setMyRating(res)
      } catch (err) {
        setMyRating(null)
      }
    }
    fetchMyRating()
  },[user?.userId,subscription?.subscriptionId])

  const handleShowRatingForm = () => {
    setShowRatingForm(true)
    setFormRating(myRating?.rating || 5)
    setFormFeedback(myRating?.feedbackText || "")
  }

  const handleSubmitRating = async () => {
    if (!formRating || formRating < 1 || formRating > 5) {
      showErrorMessage("Please select a rating from 1 to 5 stars.")
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
        res = await apiSubscriptionService.putRating(myRating.ratingId,ratingDto)
        showSuccessMessage("Review updated successfully!")
      } else {
        res = await apiSubscriptionService.postRating(ratingDto)
        showSuccessMessage("Review submitted successfully!")
      }

      setMyRating(res)
      setShowRatingForm(false)
    } catch (err) {
      showErrorFetchAPI(err)
    } finally {
      setSubmittingRating(false)
    }
  }

  const getLuminance = (color) => {
    const hex = color.replace("#","")
    const r = Number.parseInt(hex.substr(0,2),16) / 255
    const g = Number.parseInt(hex.substr(2,2),16) / 255
    const b = Number.parseInt(hex.substr(4,2),16) / 255
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
        showErrorFetchAPI(e);
      } finally {
        setLoading(false)
      }
    }
    fetchTrainerData()
  },[subscription?.trainerId])

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
        navigation.navigate("VideoCallSupport",{ roomId: data.roomId })
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
  },[navigation,currentRoomId])

  const getStatusInfo = (status) => {
    switch (status?.toLowerCase()) {
      case "active":
        return {
          color: "#10B981",
          bgColor: "#D1FAE5",
          icon: "checkmark-circle",
          label: "Active",
          description: "Your subscription is currently active and running",
        }
      case "pending":
        return {
          color: "#F59E0B",
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
          color: "#EF4444",
          bgColor: "#FEE2E2",
          icon: "close-circle",
          label: "Canceled",
          description: "This subscription has been canceled",
        }
      case "expired":
        return {
          color: "#6B7280",
          bgColor: "#F3F4F6",
          icon: "calendar",
          label: "Expired",
          description: "This subscription has expired",
        }
      default:
        return {
          color: "#6B7280",
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
    return Math.min(100,Math.max(0,(elapsed / totalDuration) * 100))
  }

  const getDaysRemaining = () => {
    const endDate = new Date(subscription.endDate)
    const currentDate = new Date()
    const diffTime = endDate - currentDate
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return Math.max(0,diffDays)
  }

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out my ${subscription.packageName} subscription with ${subscription.trainerFullName}!`,
        title: "My Fitness Subscription",
      })
    } catch (error) {
      showErrorMessage(error.message || "Failed to share subscription details.")
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
      showErrorFetchAPI(error)
    } finally {
      setLoading(false)
    }
  }

  const handleRenewSubscription = () => {
    navigation.navigate("Payment",{
      packageId: subscription.packageId,
      packageName: subscription.packageName,
      price: subscription.packagePrice,
      trainerId: subscription.trainerId,
      trainerFullName: subscription.trainerFullName,
      isRenewal: true,
    })
  }

  const handleCancelSubscription = () => {
    Alert.alert(
      "Cancel Subscription",
      "Are you sure you want to cancel this subscription?",
      [
        {
          text: "No",
          style: "cancel"
        },
        {
          text: "Yes",
          onPress: async () => {
            try {
              setLoading(true);
              if (!user?.userId) {
                throw new Error("User data not found");
              }
              await apiSubscriptionService.cancelSubscription(subscription?.subscriptionId);
              showSuccessMessage("Your subscription has been successfully canceled.");
            } catch (error) {
              console.log(error?.response?.data?.message)
              showErrorFetchAPI(error);
            } finally {
              setLoading(false);
            }
          }
        }
      ],
      { cancelable: false }
    );
  };

  const handleCompletePayment = () => {
    navigation.navigate("QRPaymentScreen",{
      amount: subscription.packagePrice || 0,
      packageName: subscription.packageName,
      paymentUrl: subscription.paymentLink,
    })
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
      <SkeletonCard cardHeight={150} />
      <SkeletonCard cardHeight={100} />
      <SkeletonCard cardHeight={200} />
      <SkeletonCard cardHeight={300} />
    </View>
  )

  const statusInfo = getStatusInfo(subscription.status)
  const progress = calculateProgress()
  const daysRemaining = getDaysRemaining()
  const isExpired = new Date(subscription.endDate) < new Date()
  const isActive = subscription.status?.toLowerCase() === "active"

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <DynamicStatusBar backgroundColor="#0056d2" barStyle="light-content" />
        <Header
          title="Subscription Details"
          onBack={() => navigation.goBack()}
          subtitle={subscription.packageName}
          rightActions={[
            {
              icon: "share-outline",
              onPress: handleShare,
            },
          ]}
          style={{ paddingTop: Platform.OS === "android" ? 40 : 20,paddingBottom: 10 }}
        />
        {renderSkeletonLoader()}
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <DynamicStatusBar backgroundColor="#0056d2" barStyle="light-content" />
      <Header
        title="Subscription Details"
        onBack={() => navigation.goBack()}
        subtitle={subscription.packageName}
        rightActions={[
          {
            icon: "share-outline",
            onPress: handleShare,
          },
        ]}
      />
      <CallWaitingPopup
        visible={showCallWaitingPopup}
        setVisible={setShowCallWaitingPopup}
        roomId={currentRoomId}
        userId={user?.userId}
        setRoomId={setCurrentRoomId}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={10}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.container}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollViewContent}
        >
          {/* Hero Section */}
          <Animated.View
            style={[
              styles.heroSection,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim },{ scale: scaleAnim }],
              },
            ]}
          >
            <LinearGradient colors={["#FFFFFF","#FAFBFF"]} style={styles.heroGradient}>
              <View style={styles.heroHeader}>
                <View style={styles.packageIconContainer}>
                  <MaterialCommunityIcons name="package-variant" size={24} color="#0056d2" />
                </View>
                <View style={styles.heroInfo}>
                  <Text style={styles.packageName}>{subscription.packageName || "Fitness Package"}</Text>
                  <Text style={styles.trainerName}>with {subscription.trainerFullName || "Professional Trainer"}</Text>
                </View>
                <View style={[styles.statusBadge,{ backgroundColor: statusInfo.bgColor }]}>
                  <Ionicons name={statusInfo.icon} size={12} color={statusInfo.color} />
                  <Text style={[styles.statusText,{ color: statusInfo.color }]}>{statusInfo.label}</Text>
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
                      <Animated.View style={[styles.progressFill,{ width: `${progress}%` }]} />
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
                transform: [{ translateY: slideAnim },{ scale: scaleAnim }],
              },
            ]}
          >
            <LinearGradient colors={["#FFFFFF","#FAFBFF"]} style={styles.infoGradient}>
              <Text style={styles.sectionTitle}>Package Information</Text>
              <View style={styles.infoGrid}>
                <View style={styles.infoCard}>
                  <View style={styles.infoIconContainer}>
                    <Ionicons name="pricetag" size={14} color="#64748B" />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Price</Text>
                    <Text style={styles.infoValue}>{subscription.packagePrice?.toLocaleString("vi-VN") || "0"} VND</Text>
                  </View>
                </View>
                <View style={styles.infoCard}>
                  <View style={styles.infoIconContainer}>
                    <Ionicons name="time" size={14} color="#64748B" />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Duration</Text>
                    <Text style={styles.infoValue}>{subscription.packageDurationDays || "0"} days</Text>
                  </View>
                </View>
                <View style={styles.infoCard}>
                  <View style={styles.infoIconContainer}>
                    <Ionicons name="play-circle" size={14} color="#10B981" />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Start Date</Text>
                    <Text style={styles.infoValue}>
                      {new Date(subscription.startDate).toLocaleDateString("en-US",{
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </Text>
                  </View>
                </View>
                <View style={styles.infoCard}>
                  <View style={styles.infoIconContainer}>
                    <Ionicons name="stop-circle" size={14} color={isExpired ? "#EF4444" : "#F59E0B"} />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>End Date</Text>
                    <Text style={[styles.infoValue,isExpired && styles.expiredText]}>
                      {new Date(subscription.endDate).toLocaleDateString("en-US",{
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </Text>
                  </View>
                </View>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* Your Trainer Section */}
          <Animated.View
            style={[
              styles.trainerSection,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim },{ scale: scaleAnim }],
              },
            ]}
          >
            <LinearGradient colors={["#FFFFFF","#FAFBFF"]} style={styles.trainerGradient}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIcon}>
                  <Ionicons name="person-outline" size={14} color="#64748B" />
                </View>
                <Text style={styles.sectionTitle}>Your Trainer</Text>
              </View>
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.trainerCard}
                onPress={() => {
                  if (subscription?.trainerId) {
                    navigation.navigate("TrainerDetailScreen",{ trainerId: subscription.trainerId })
                  }
                }}
              >
                <View style={styles.trainerAvatarContainer}>
                  {subscription.trainerAvatar ? (
                    <Image
                      source={{ uri: subscription.trainerAvatar }}
                      style={styles.trainerAvatar}
                    />
                  ) : (
                    <Ionicons name="person" size={14} color="#64748B" />
                  )}
                  <View style={styles.trainerStatusDot} />
                </View>
                <View style={styles.trainerInfo}>
                  <Text style={styles.trainerName}>{subscription.trainerFullName || "Professional Trainer"}</Text>
                  <Text style={styles.trainerSubtitle}>Certified Fitness Coach</Text>
                  <View style={styles.trainerStats}>
                    <View style={styles.statItem}>
                      <Ionicons name="star" size={12} color="#64748B" />
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
                      <Ionicons name="people-outline" size={12} color="#64748B" />
                      <Text style={styles.statText}>
                        {trainerRatingData && trainerRatingData.currentSubscribers !== null
                          ? trainerRatingData.currentSubscribers
                          : "0"} clients
                      </Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                      <Ionicons name="time-outline" size={12} color="#64748B" />
                      <Text style={styles.statText}>
                        {trainerExperience && trainerExperience.experienceYears !== null
                          ? trainerExperience.experienceYears
                          : "0"} yrs
                      </Text>
                    </View>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={14} color="#64748B" style={styles.trainerChevron} />
              </TouchableOpacity>
            </LinearGradient>
          </Animated.View>

          {/* Timeline Section */}
          <Animated.View
            style={[
              styles.timelineSection,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim },{ scale: scaleAnim }],
              },
            ]}
          >
            <LinearGradient colors={["#FFFFFF","#FAFBFF"]} style={styles.timelineGradient}>
              <Text style={styles.sectionTitle}>Subscription Timeline</Text>
              <View style={styles.timeline}>
                <View style={styles.timelineItem}>
                  <View style={[styles.timelineIcon,{ backgroundColor: "#D1FAE5" }]}>
                    <Ionicons name="calendar" size={14} color="#64748B" />
                  </View>
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineTitle}>Subscription Created</Text>
                    <Text style={styles.timelineDate}>
                      {new Date(subscription.createdAt).toLocaleDateString("en-US",{
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </Text>
                  </View>
                </View>
                <View style={styles.timelineItem}>
                  <View style={[styles.timelineIcon,{ backgroundColor: "#A7F3D0" }]}>
                    <Ionicons name="play" size={14} color="#64748B" />
                  </View>
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineTitle}>Subscription Started</Text>
                    <Text style={styles.timelineDate}>
                      {new Date(subscription.startDate).toLocaleDateString("en-US",{
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </Text>
                  </View>
                </View>
                <View style={styles.timelineItem}>
                  <View style={[styles.timelineIcon,{ backgroundColor: isExpired ? "#FEE2E2" : "#FEF3C7" }]}>
                    <Ionicons
                      name={isExpired ? "stop" : "flag"}
                      size={14} color={isExpired ? "#EF4444" : "#F59E0B"}
                    />
                  </View>
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineTitle}>{isExpired ? "Subscription Ended" : "Subscription Ends"}</Text>
                    <Text style={[styles.timelineDate,isExpired && styles.expiredText]}>
                      {new Date(subscription.endDate).toLocaleDateString("en-US",{
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </Text>
                  </View>
                </View>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* Actions Section */}
          <Animated.View
            style={[
              styles.actionsSection,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim },{ scale: scaleAnim }],
              },
            ]}
          >
            {subscription.status?.toLowerCase() === "pending" && (
              <TouchableOpacity style={styles.completePaymentButton} onPress={handleCompletePayment}>
                <Ionicons name="card" size={14} color="#64748B" />
                <Text style={styles.completePaymentButtonText}>Complete Payment</Text>
              </TouchableOpacity>
            )}
            {isActive && (
              <TouchableOpacity style={styles.primaryButton} onPress={handleRenewSubscription}>
                <Ionicons name="refresh" size={14} color="#64748B" />
                <Text style={styles.primaryButtonText}>Renew Subscription</Text>
              </TouchableOpacity>
            )}
            {(isActive || subscription.status?.toLowerCase() === "pending") && (
              <TouchableOpacity style={styles.dangerButton} onPress={handleCancelSubscription}>
                <Ionicons name="close-circle" size={14} color="#64748B" />
                <Text style={styles.dangerButtonText}>Cancel Subscription</Text>
              </TouchableOpacity>
            )}
            {(subscription.status?.toLowerCase() === "paid" || subscription.status?.toLowerCase() === "systempaid") && (
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleContactTrainer}
                disabled={showCallWaitingPopup}
              >
                <Ionicons name="chatbubble-outline" size={14} color="#64748B" />
                <Text style={styles.secondaryButtonText}>Contact Trainer</Text>
              </TouchableOpacity>
            )}
          </Animated.View>

          {/* Review Section */}
          {myRating && typeof myRating === "object" && (
            <Animated.View
              style={[
                styles.reviewSection,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim },{ scale: scaleAnim }],
                },
              ]}
            >
              <LinearGradient colors={["#FFFFFF","#FAFBFF"]} style={styles.reviewGradient}>
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewHeaderIcon}>
                    <Ionicons name="star-outline" size={14} color="#64748B" />
                  </View>
                  <Text style={styles.reviewHeaderTitle}>Your Review</Text>
                </View>

                {showRatingForm ? (
                  <View style={styles.reviewForm}>
                    <Text style={styles.formTitle}>{myRating ? "Edit Your Review" : "Rate This Package"}</Text>

                    <View style={styles.ratingSection}>
                      <Text style={styles.ratingLabel}>Your Rating</Text>
                      {renderStars(formRating,setFormRating,submittingRating)}
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
                        editable={!submittingRating}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                        placeholderTextColor="#9CA3AF"
                        onFocus={() => {
                          setTimeout(() => {
                            feedbackInputRef.current.measure((x,y,width,height,pageX,pageY) => {
                              scrollViewRef.current.scrollTo({ y: pageY + 200,animated: true })
                            })
                          },100)
                        }}
                      />
                    </View>

                    <View style={styles.formActions}>
                      <TouchableOpacity
                        style={[styles.submitButton,submittingRating && styles.submitButtonDisabled]}
                        onPress={handleSubmitRating}
                        disabled={submittingRating}
                      >
                        {submittingRating ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Ionicons name="checkmark-circle" size={14} color="#FFFFFF" />
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
                ) : myRating && (
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
                        Reviewed on{" "}
                        {new Date(myRating.createdAt).toLocaleDateString("en-US",{
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </Text>
                    </View>

                    <TouchableOpacity style={styles.editReviewButton} onPress={handleShowRatingForm}>
                      <Ionicons name="create-outline" size={14} color="#64748B" />
                      <Text style={styles.editReviewButtonText}>Edit Review</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </LinearGradient>
            </Animated.View>
          )}

          <View style={styles.bottomSpacing} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    marginTop: 60
  },
  skeletonContainer: {
    padding: 16,
    backgroundColor: "#F8FAFC",
  },
  heroSection: {
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  heroGradient: {
    padding: 20,
  },
  heroHeader: {
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
  heroInfo: {
    flex: 1,
  },
  packageName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 4,
  },
  trainerName: {
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
  statusDescription: {
    fontSize: 14,
    color: "#64748B",
    marginBottom: 16,
    lineHeight: 20,
  },
  progressSection: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 16,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
  },
  progressPercentage: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0056d2",
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
    backgroundColor: "#0056d2",
    borderRadius: 4,
  },
  progressInfo: {
    alignItems: "center",
  },
  progressText: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
  },
  infoSection: {
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
  infoGradient: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E3F2FD",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  infoCard: {
    flex: 1,
    minWidth: "45%",
    flexDirection: "row",
    alignItems: "center",
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#E3F2FD",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
  },
  expiredText: {
    color: "#EF4444",
  },
  trainerSection: {
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
  trainerGradient: {
    padding: 20,
  },
  trainerCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  trainerAvatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#E3F2FD",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  trainerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  trainerStatusDot: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#10B981",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  trainerInfo: {
    flex: 1,
  },
  trainerSubtitle: {
    fontSize: 14,
    color: "#64748B",
    marginBottom: 8,
  },
  trainerStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
  },
  statDivider: {
    width: 1,
    height: 14,
    backgroundColor: "#E2E8F0",
  },
  trainerChevron: {
    marginLeft: 8,
  },
  timelineSection: {
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
  timelineGradient: {
    padding: 20,
  },
  timeline: {
    flex: 1,
  },
  timelineItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  timelineIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  timelineContent: {
    flex: 1,
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 4,
  },
  timelineDate: {
    fontSize: 14,
    color: "#64748B",
  },
  actionsSection: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 32,
    gap: 12,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0056d2",
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#0056d2",
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0056d2",
  },
  dangerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EF4444",
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  dangerButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  completePaymentButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#A7F3D0",
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  completePaymentButtonText: {
    fontSize: 16,
    fontWeight: "600",
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
  reviewGradient: {
    padding: 24,
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
    backgroundColor: "#E3F2FD",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  reviewHeaderTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
  },
  reviewForm: {
    alignItems: "center",
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
    width: "100%",
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
    width: "100%",
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
  editReviewButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E3F2FD",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 4,
  },
  editReviewButtonText: {
    color: "#0056d2",
    fontSize: 14,
    fontWeight: "600",
  },
  noReview: {
    alignItems: "center",
    paddingVertical: 40,
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
  writeReviewButton: {
    backgroundColor: "#0056d2",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  writeReviewButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  bottomSpacing: {
    height: 40,
  },
})

export default SubscriptionDetailScreen