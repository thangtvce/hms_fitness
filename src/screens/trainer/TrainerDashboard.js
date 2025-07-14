import { useState,useEffect,useRef,useContext } from "react"
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Platform,
  Dimensions,
  ScrollView,
  Modal,
  Image,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { SafeAreaView } from "react-native-safe-area-context"
import { AuthContext } from "context/AuthContext"
import { useNavigation } from "@react-navigation/native"
import { trainerService } from "services/apiTrainerService"
import { apiUserService } from "services/apiUserService"
import { showErrorFetchAPI } from "utils/toastUtil"
import { PieChart,BarChart } from "react-native-chart-kit"
import DateTimePicker from "@react-native-community/datetimepicker"
import AsyncStorage from "@react-native-async-storage/async-storage"
import DynamicStatusBar from "screens/statusBar/DynamicStatusBar"

const { width } = Dimensions.get("window")

const TrainerDashboard = () => {
  const { user,loading: authLoading } = useContext(AuthContext)
  const navigation = useNavigation()

  const [statistics,setStatistics] = useState(null)
  const [userData,setUserData] = useState(null)
  const [loading,setLoading] = useState(true)
  const [userLoading,setUserLoading] = useState(true)
  const [showFilterModal,setShowFilterModal] = useState(false)
  const [showStartDatePicker,setShowStartDatePicker] = useState(false)
  const [showEndDatePicker,setShowEndDatePicker] = useState(false)
  const [filters,setFilters] = useState({
    startDate: new Date(),
    endDate: new Date(),
  })
  const [tempFilters,setTempFilters] = useState(filters)
  const [filterErrors,setFilterErrors] = useState({})

  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(30)).current
  const welcomeAnim = useRef(new Animated.Value(0)).current

  // Get time-based greeting
  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return { greeting: "Good Morning",icon: "sunny",color: "#F59E0B" }
    if (hour < 17) return { greeting: "Good Afternoon",icon: "partly-sunny",color: "#0EA5E9" }
    return { greeting: "Good Evening",icon: "moon",color: "#8B5CF6" }
  }

  const fetchUserData = async () => {
    try {
      setUserLoading(true)
      const response = await apiUserService.getUserById(user.userId)
      if (response.statusCode === 200 && response.data) {
        setUserData(response.data)
        const avatar = response.data.avatar
        if (avatar) {
          await AsyncStorage.setItem("userAvatar",avatar)
        }
      }
    } catch (error) {
      console.error("Error fetching user data:",error)
    } finally {
      setUserLoading(false)
    }
  }

  useEffect(() => {
    if (authLoading) return

    const fetchData = async () => {
      await Promise.all([fetchUserData(),fetchStatistics()])
    }

    fetchData()
  },[authLoading,user,filters])

  const fetchStatistics = async () => {
    try {
      setLoading(true)
      const params = {
        startDate: filters.startDate
          ? filters.startDate.toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
        endDate: filters.endDate ? filters.endDate.toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      }

      const response = await trainerService.getDashboardStatistic(params.startDate,params.endDate)
      if (response.statusCode === 200 && response.data) {
        setStatistics(response.data)
        startAnimations()
      } else {
        showErrorFetchAPI(new Error("Dashboard statistics not found."))
        setStatistics(null)
      }
    } catch (error) {
      showErrorFetchAPI(error)
      setStatistics(null)
    } finally {
      setLoading(false)
    }
  }

  const startAnimations = () => {
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
      Animated.timing(welcomeAnim,{
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start()
  }

  const validateFilters = (filtersToValidate) => {
    const errors = {}
    if (
      filtersToValidate.startDate &&
      filtersToValidate.endDate &&
      filtersToValidate.startDate > filtersToValidate.endDate
    ) {
      errors.dateRange = "Start date must be earlier than or equal to end date"
    }
    return errors
  }

  const applyTempFilters = () => {
    const errors = validateFilters(tempFilters)
    if (Object.keys(errors).length > 0) {
      setFilterErrors(errors)
      showErrorFetchAPI(new Error("Please correct the filter inputs."))
      return
    }
    setFilters(tempFilters)
    setFilterErrors({})
    setShowFilterModal(false)
  }

  const resetTempFilters = () => {
    const defaultFilters = {
      startDate: new Date(),
      endDate: new Date(),
    }
    setTempFilters(defaultFilters)
    setFilterErrors({})
  }

  const formatDate = (date) => {
    if (!date) return "Select Date"
    return date.toLocaleDateString("en-US",{
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US",{
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(amount || 0)
  }

  const handleStartDateConfirm = () => {
    setTempFilters((prev) => ({
      ...prev,
      startDate: tempFilters.startDate || new Date(),
    }))
    setShowStartDatePicker(false)
  }

  const handleEndDateConfirm = () => {
    setTempFilters((prev) => ({
      ...prev,
      endDate: tempFilters.endDate || new Date(),
    }))
    setShowEndDatePicker(false)
  }

  const renderWelcomeSection = () => {
    const timeGreeting = getTimeBasedGreeting()
    const trainerName = userData?.fullName || user?.fullName || "Trainer"
    const currentDate = new Date().toLocaleDateString("en-US",{
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    })

    return (
      <Animated.View
        style={[
          styles.welcomeSection,
          {
            opacity: welcomeAnim,
            transform: [
              {
                translateY: welcomeAnim.interpolate({
                  inputRange: [0,1],
                  outputRange: [20,0],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.welcomeCard}>
          <View style={styles.welcomeHeader}>
            <View style={styles.welcomeInfo}>
              <View style={styles.greetingContainer}>
                <View style={[styles.greetingIcon,{ backgroundColor: `${timeGreeting.color}15` }]}>
                  <Ionicons name={timeGreeting.icon} size={24} color={timeGreeting.color} />
                </View>
                <View style={styles.greetingText}>
                  <Text style={styles.greetingMessage}>{timeGreeting.greeting}</Text>
                  <Text style={styles.currentDate}>{currentDate}</Text>
                </View>
              </View>
              <Text style={styles.welcomeTitle}>Welcome back, {trainerName}!</Text>
              <Text style={styles.welcomeSubtitle}>Here's your training business overview</Text>
            </View>
            <View style={styles.avatarContainer}>
              {userLoading ? (
                <View style={styles.avatarPlaceholder}>
                  <ActivityIndicator size="small" color="#0056D2" />
                </View>
              ) : userData?.avatar ? (
                <Image source={{ uri: userData.avatar }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={32} color="#64748B" />
                </View>
              )}
              <View style={styles.onlineIndicator} />
            </View>
          </View>

          {/* Quick Stats Preview */}
          <View style={styles.quickStats}>
            <View style={styles.quickStatItem}>
              <View style={[styles.quickStatIcon,{ backgroundColor: "#10B98115" }]}>
                <Ionicons name="trending-up" size={16} color="#10B981" />
              </View>
              <Text style={styles.quickStatValue}>{formatCurrency(statistics?.totalRevenue || 0)}</Text>
              <Text style={styles.quickStatLabel}>Total Revenue</Text>
            </View>
            <View style={styles.quickStatItem}>
              <View style={[styles.quickStatIcon,{ backgroundColor: "#8B5CF615" }]}>
                <Ionicons name="people" size={16} color="#8B5CF6" />
              </View>
              <Text style={styles.quickStatValue}>{statistics?.totalSubscriptions || 0}</Text>
              <Text style={styles.quickStatLabel}>Active Clients</Text>
            </View>
            <View style={styles.quickStatItem}>
              <View style={[styles.quickStatIcon,{ backgroundColor: "#0056D215" }]}>
                <Ionicons name="fitness" size={16} color="#0056D2" />
              </View>
              <Text style={styles.quickStatValue}>{statistics?.workoutPlanStats?.totalPlans || 0}</Text>
              <Text style={styles.quickStatLabel}>Workout Plans</Text>
            </View>
          </View>
        </View>
      </Animated.View>
    )
  }

  const renderLoadingScreen = () => (
    <SafeAreaView style={styles.container}>
      <DynamicStatusBar backgroundColor="#F8FAFC" />
      <View style={styles.loadingContainer}>
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color="#0056D2" />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
          <Text style={styles.loadingSubtext}>Fetching your latest statistics</Text>
        </View>
      </View>
    </SafeAreaView>
  )

  const renderEmptyState = () => (
    <SafeAreaView style={styles.container}>
      <DynamicStatusBar backgroundColor="#F8FAFC" />
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate("TrainerServiceManagement")}>
            <Ionicons name="arrow-back" size={24} color="#1E293B" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Dashboard</Text>
          </View>
          <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilterModal(true)}>
            <Ionicons name="options" size={24} color="#0056D2" />
          </TouchableOpacity>
        </View>
      </View>
      {renderWelcomeSection()}
      <Animated.View
        style={[
          styles.emptyContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={styles.emptyIcon}>
          <Ionicons name="analytics-outline" size={64} color="#94A3B8" />
        </View>
        <Text style={styles.emptyTitle}>No Statistics Available</Text>
        <Text style={styles.emptyText}>
          {filters.startDate || filters.endDate
            ? "No statistics match your current date range. Try adjusting your criteria."
            : "No dashboard statistics found for today."}
        </Text>
        {(filters.startDate || filters.endDate) && (
          <TouchableOpacity
            style={styles.emptyActionButton}
            onPress={() => setFilters({ startDate: new Date(),endDate: new Date() })}
          >
            <Ionicons name="refresh" size={20} color="#FFFFFF" />
            <Text style={styles.emptyActionText}>Clear Filters</Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    </SafeAreaView>
  )

  const renderOverviewCards = () => {
    const totalRevenue = statistics?.totalRevenue || 0
    const pendingRevenue = statistics?.pendingRevenue || 0
    const payoutRevenue = statistics?.payoutRevenue || 0

    return (
      <Animated.View
        style={[
          styles.overviewSection,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={styles.sectionHeaderContainer}>
          <Text style={styles.sectionMainTitle}>Revenue Overview</Text>
          <Text style={styles.sectionSubtitle}>Your financial performance at a glance</Text>
        </View>
        <View style={styles.overviewGrid}>
          <View style={[styles.overviewCard,styles.totalRevenueCard]}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIcon,{ backgroundColor: "#10B98115" }]}>
                <Ionicons name="trending-up" size={24} color="#10B981" />
              </View>
              <View style={styles.cardBadge}>
                <Text style={styles.cardBadgeText}>Total</Text>
              </View>
            </View>
            <Text style={styles.cardValue}>{formatCurrency(totalRevenue)}</Text>
            <Text style={styles.cardLabel}>Total Revenue</Text>
            <View style={styles.cardProgress}>
              <View style={[styles.progressBar,{ width: "100%",backgroundColor: "#10B981" }]} />
            </View>
          </View>

          <View style={styles.overviewCard}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIcon,{ backgroundColor: "#F59E0B15" }]}>
                <Ionicons name="time" size={24} color="#F59E0B" />
              </View>
            </View>
            <Text style={styles.cardValue}>{formatCurrency(pendingRevenue)}</Text>
            <Text style={styles.cardLabel}>Pending Revenue</Text>
            <View style={styles.cardProgress}>
              <View
                style={[
                  styles.progressBar,
                  {
                    width: totalRevenue > 0 ? `${(pendingRevenue / totalRevenue) * 100}%` : "0%",
                    backgroundColor: "#F59E0B",
                  },
                ]}
              />
            </View>
          </View>

          <View style={styles.overviewCard}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIcon,{ backgroundColor: "#0056D215" }]}>
                <Ionicons name="card" size={24} color="#0056D2" />
              </View>
            </View>
            <Text style={styles.cardValue}>{formatCurrency(payoutRevenue)}</Text>
            <Text style={styles.cardLabel}>Payout Revenue</Text>
            <View style={styles.cardProgress}>
              <View
                style={[
                  styles.progressBar,
                  {
                    width: totalRevenue > 0 ? `${(payoutRevenue / totalRevenue) * 100}%` : "0%",
                    backgroundColor: "#0056D2",
                  },
                ]}
              />
            </View>
          </View>
        </View>
      </Animated.View>
    )
  }

  const renderSubscriptionStats = () => {
    const totalSubs = statistics?.totalSubscriptions || 0
    const mostPopular = statistics?.mostPopularPackage
    const leastPopular = statistics?.leastPopularPackage

    return (
      <Animated.View
        style={[
          styles.section,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={styles.modernCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <Ionicons name="people" size={20} color="#8B5CF6" />
            </View>
            <View>
              <Text style={styles.sectionTitle}>Subscription Analytics</Text>
              <Text style={styles.sectionDescription}>Track your client engagement</Text>
            </View>
          </View>

          <View style={styles.subscriptionOverview}>
            <View style={styles.totalSubscriptions}>
              <Text style={styles.totalSubsNumber}>{totalSubs}</Text>
              <Text style={styles.totalSubsLabel}>Total Subscriptions</Text>
            </View>
          </View>

          {mostPopular && leastPopular && (
            <View style={styles.packageComparison}>
              <View style={styles.packageCard}>
                <View style={styles.packageHeader}>
                  <View style={[styles.packageIcon,{ backgroundColor: "#10B98115" }]}>
                    <Ionicons name="trophy" size={16} color="#10B981" />
                  </View>
                  <Text style={styles.packageLabel}>Most Popular</Text>
                </View>
                <Text style={styles.packageName}>{mostPopular.packageName}</Text>
                <View style={styles.packageStats}>
                  <View style={styles.packageStat}>
                    <Text style={styles.packageStatValue}>{mostPopular.subscriptionCount}</Text>
                    <Text style={styles.packageStatLabel}>Subscribers</Text>
                  </View>
                  <View style={styles.packageStat}>
                    <Text style={styles.packageStatValue}>{formatCurrency(mostPopular.totalRevenue)}</Text>
                    <Text style={styles.packageStatLabel}>Revenue</Text>
                  </View>
                </View>
              </View>

              <View style={styles.packageCard}>
                <View style={styles.packageHeader}>
                  <View style={[styles.packageIcon,{ backgroundColor: "#EF444415" }]}>
                    <Ionicons name="trending-down" size={16} color="#EF4444" />
                  </View>
                  <Text style={styles.packageLabel}>Least Popular</Text>
                </View>
                <Text style={styles.packageName}>{leastPopular.packageName}</Text>
                <View style={styles.packageStats}>
                  <View style={styles.packageStat}>
                    <Text style={styles.packageStatValue}>{leastPopular.subscriptionCount}</Text>
                    <Text style={styles.packageStatLabel}>Subscribers</Text>
                  </View>
                  <View style={styles.packageStat}>
                    <Text style={styles.packageStatValue}>{formatCurrency(leastPopular.totalRevenue)}</Text>
                    <Text style={styles.packageStatLabel}>Revenue</Text>
                  </View>
                </View>
              </View>
            </View>
          )}
        </View>
      </Animated.View>
    )
  }

  const renderWorkoutPlanStats = () => {
    const totalPlans = statistics?.workoutPlanStats?.totalPlans || 0
    const plansByStatus = statistics?.workoutPlanStats?.plansByStatus || []

    const pieData = plansByStatus.map((item,index) => ({
      name: item.status.charAt(0).toUpperCase() + item.status.slice(1),
      value: item.count,
      color: index === 0 ? "#10B981" : index === 1 ? "#F59E0B" : "#EF4444",
      legendFontColor: "#1E293B",
      legendFontSize: 14,
    }))

    return (
      <Animated.View
        style={[
          styles.section,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={styles.modernCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <Ionicons name="fitness" size={20} color="#0056D2" />
            </View>
            <View>
              <Text style={styles.sectionTitle}>Workout Plans</Text>
              <Text style={styles.sectionDescription}>Monitor your training programs</Text>
            </View>
          </View>

          <View style={styles.planOverview}>
            <View style={styles.planTotalContainer}>
              <Text style={styles.planTotalNumber}>{totalPlans}</Text>
              <Text style={styles.planTotalLabel}>Total Plans Created</Text>
            </View>

            {pieData.length > 0 && (
              <View style={styles.planStatusChart}>
                <Text style={styles.chartTitle}>Plans by Status</Text>
                <PieChart
                  data={pieData}
                  width={width - 80}
                  height={200}
                  chartConfig={{
                    backgroundColor: "#FFFFFF",
                    backgroundGradientFrom: "#FFFFFF",
                    backgroundGradientTo: "#FFFFFF",
                    color: (opacity = 1) => `rgba(0, 86, 210, ${opacity})`,
                  }}
                  accessor="value"
                  backgroundColor="transparent"
                  paddingLeft="15"
                  center={[10,0]}
                  absolute
                />
              </View>
            )}
          </View>
        </View>
      </Animated.View>
    )
  }

  const renderRatingStats = () => {
    const totalRatings = statistics?.ratingStats?.totalRatings || 0
    const averageRating = statistics?.ratingStats?.averageRating || 0
    const ratingPercentage = (averageRating / 5) * 100

    return (
      <Animated.View
        style={[
          styles.section,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={styles.modernCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <Ionicons name="star" size={20} color="#F59E0B" />
            </View>
            <View>
              <Text style={styles.sectionTitle}>Rating Overview</Text>
              <Text style={styles.sectionDescription}>Your client satisfaction scores</Text>
            </View>
          </View>

          <View style={styles.ratingContainer}>
            <View style={styles.ratingDisplay}>
              <Text style={styles.ratingNumber}>{averageRating.toFixed(1)}</Text>
              <View style={styles.ratingStars}>
                {[1,2,3,4,5].map((star) => (
                  <Ionicons
                    key={star}
                    name={star <= averageRating ? "star" : "star-outline"}
                    size={20}
                    color="#F59E0B"
                  />
                ))}
              </View>
              <Text style={styles.ratingLabel}>Average Rating</Text>
            </View>

            <View style={styles.ratingProgress}>
              <View style={styles.ratingProgressBar}>
                <View style={[styles.ratingProgressFill,{ width: `${ratingPercentage}%` }]} />
              </View>
              <Text style={styles.ratingCount}>{totalRatings} total ratings</Text>
            </View>
          </View>
        </View>
      </Animated.View>
    )
  }

  const renderExerciseStats = () => {
    const totalExercises = statistics?.exerciseStats?.totalExercises || 0
    const publicExercises = statistics?.exerciseStats?.publicExercises || 0
    const privateExercises = statistics?.exerciseStats?.privateExercises || 0

    return (
      <Animated.View
        style={[
          styles.section,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={styles.modernCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <Ionicons name="barbell" size={20} color="#EF4444" />
            </View>
            <View>
              <Text style={styles.sectionTitle}>Exercise Library</Text>
              <Text style={styles.sectionDescription}>Your exercise collection</Text>
            </View>
          </View>

          <View style={styles.exerciseOverview}>
            <View style={styles.exerciseTotalContainer}>
              <Text style={styles.exerciseTotalNumber}>{totalExercises}</Text>
              <Text style={styles.exerciseTotalLabel}>Total Exercises</Text>
            </View>

            <View style={styles.exerciseBreakdown}>
              <View style={styles.exerciseTypeCard}>
                <View style={[styles.exerciseTypeIcon,{ backgroundColor: "#10B98115" }]}>
                  <Ionicons name="globe" size={20} color="#10B981" />
                </View>
                <Text style={styles.exerciseTypeNumber}>{publicExercises}</Text>
                <Text style={styles.exerciseTypeLabel}>Public</Text>
              </View>

              <View style={styles.exerciseTypeCard}>
                <View style={[styles.exerciseTypeIcon,{ backgroundColor: "#0056D215" }]}>
                  <Ionicons name="lock-closed" size={20} color="#0056D2" />
                </View>
                <Text style={styles.exerciseTypeNumber}>{privateExercises}</Text>
                <Text style={styles.exerciseTypeLabel}>Private</Text>
              </View>
            </View>

            {totalExercises > 0 && (
              <View style={styles.exerciseChart}>
                <BarChart
                  data={{
                    labels: ["Public","Private"],
                    datasets: [
                      {
                        data: [publicExercises,privateExercises],
                      },
                    ],
                  }}
                  width={width - 80}
                  height={180}
                  yAxisSuffix=""
                  chartConfig={{
                    backgroundColor: "#FFFFFF",
                    backgroundGradientFrom: "#FFFFFF",
                    backgroundGradientTo: "#FFFFFF",
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(0, 86, 210, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(30, 41, 59, ${opacity})`,
                    barPercentage: 0.6,
                  }}
                  style={styles.chart}
                />
              </View>
            )}
          </View>
        </View>
      </Animated.View>
    )
  }

  const renderFilterModal = () => (
    <Modal
      visible={showFilterModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => {
        setShowFilterModal(false)
        setTempFilters(filters)
        setFilterErrors({})
      }}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.filterModalContent}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter Statistics</Text>
            <TouchableOpacity
              onPress={() => {
                setShowFilterModal(false)
                setTempFilters(filters)
                setFilterErrors({})
              }}
              style={styles.modalCloseBtn}
            >
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Date Range</Text>
              <View style={styles.dateRangeContainer}>
                <TouchableOpacity style={styles.dateButton} onPress={() => setShowStartDatePicker(true)}>
                  <Ionicons name="calendar" size={16} color="#0056D2" />
                  <Text style={styles.dateButtonText}>{formatDate(tempFilters.startDate)}</Text>
                </TouchableOpacity>
                <Text style={styles.dateRangeSeparator}>to</Text>
                <TouchableOpacity style={styles.dateButton} onPress={() => setShowEndDatePicker(true)}>
                  <Ionicons name="calendar" size={16} color="#0056D2" />
                  <Text style={styles.dateButtonText}>{formatDate(tempFilters.endDate)}</Text>
                </TouchableOpacity>
              </View>
              {filterErrors.dateRange && <Text style={styles.errorText}>{filterErrors.dateRange}</Text>}
            </View>
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.resetButton} onPress={resetTempFilters}>
              <Ionicons name="refresh" size={16} color="#64748B" />
              <Text style={styles.resetButtonText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyButton} onPress={applyTempFilters}>
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {showStartDatePicker && (
        <Modal visible={showStartDatePicker} transparent={true} animationType="fade">
          <View style={styles.datePickerOverlay}>
            <View style={styles.datePickerContainer}>
              <View style={styles.datePickerHeader}>
                <Text style={styles.datePickerTitle}>Select Start Date</Text>
                <TouchableOpacity onPress={handleStartDateConfirm}>
                  <Ionicons name="close" size={24} color="#64748B" />
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={tempFilters.startDate || new Date()}
                mode="date"
                display="spinner"
                onChange={(event,selectedDate) => {
                  if (event.type === "set" && selectedDate) {
                    setTempFilters({ ...tempFilters,startDate: selectedDate })
                  }
                }}
              />
              {Platform.OS === "ios" && (
                <TouchableOpacity style={styles.datePickerConfirm} onPress={handleStartDateConfirm}>
                  <Text style={styles.datePickerConfirmText}>Confirm</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </Modal>
      )}

      {showEndDatePicker && (
        <Modal visible={showEndDatePicker} transparent={true} animationType="fade">
          <View style={styles.datePickerOverlay}>
            <View style={styles.datePickerContainer}>
              <View style={styles.datePickerHeader}>
                <Text style={styles.datePickerTitle}>Select End Date</Text>
                <TouchableOpacity onPress={handleEndDateConfirm}>
                  <Ionicons name="close" size={24} color="#64748B" />
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={tempFilters.endDate || new Date()}
                mode="date"
                display="spinner"
                onChange={(event,selectedDate) => {
                  if (event.type === "set" && selectedDate) {
                    setTempFilters({ ...tempFilters,endDate: selectedDate })
                  }
                }}
              />
              {Platform.OS === "ios" && (
                <TouchableOpacity style={styles.datePickerConfirm} onPress={handleEndDateConfirm}>
                  <Text style={styles.datePickerConfirmText}>Confirm</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </Modal>
      )}
    </Modal>
  )

  if (loading) return renderLoadingScreen()
  if (!statistics) return renderEmptyState()

  return (
    <SafeAreaView style={styles.container}>
      <DynamicStatusBar backgroundColor="#F8FAFC" />

      {/* Modern Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate("TrainerServiceManagement")}>
            <Ionicons name="arrow-back" size={24} color="#1E293B" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Dashboard</Text>
            <Text style={styles.headerSubtitle}>Analytics Overview</Text>
          </View>
          <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilterModal(true)}>
            <Ionicons name="options" size={24} color="#0056D2" />
            {(filters.startDate || filters.endDate) && <View style={styles.filterBadge} />}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderWelcomeSection()}
        {renderOverviewCards()}
        {renderSubscriptionStats()}
        {renderWorkoutPlanStats()}
        {renderRatingStats()}
        {renderExerciseStats()}
      </ScrollView>

      {renderFilterModal()}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  // Header Styles
  header: {
    paddingTop: Platform.OS === 'android' ? 10 : 10,
    paddingBottom: 15,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
    marginHorizontal: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#0056D215",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  filterBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#F59E0B",
  },

  // Welcome Section
  welcomeSection: {
    marginBottom: 24,
  },
  welcomeCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  welcomeHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  welcomeInfo: {
    flex: 1,
    marginRight: 16,
  },
  greetingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  greetingIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  greetingText: {
    flex: 1,
  },
  greetingMessage: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 2,
  },
  currentDate: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: "#64748B",
    fontWeight: "500",
    lineHeight: 22,
  },
  avatarContainer: {
    position: "relative",
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  onlineIndicator: {
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

  // Quick Stats
  quickStats: {
    flexDirection: "row",
    gap: 16,
  },
  quickStatItem: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 10,
  },
  quickStatIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  quickStatValue: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 4,
  },
  quickStatLabel: {
    fontSize: 9,
    color: "#64748B",
    fontWeight: "600",
    textAlign: "center",
  },

  // Loading Styles
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: "600",
    color: "#1E293B",
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 12,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },
  emptyActionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0056D2",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  emptyActionText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
  },

  // Scroll Container
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 32,
  },

  // Section Headers
  sectionHeaderContainer: {
    marginBottom: 20,
  },
  sectionMainTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
  },

  // Overview Section
  overviewSection: {
    marginBottom: 24,
  },
  overviewGrid: {
    gap: 16,
  },
  overviewCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  totalRevenueCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#10B981",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBadge: {
    backgroundColor: "#10B981",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  cardBadgeText: {
    fontSize: 12,
    color: "#FFFFFF",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  cardValue: {
    fontSize: 32,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 8,
  },
  cardLabel: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
    marginBottom: 12,
  },
  cardProgress: {
    height: 4,
    backgroundColor: "#F1F5F9",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    borderRadius: 2,
  },

  // Section Styles
  section: {
    marginBottom: 24,
  },
  modernCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  sectionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
  },
  sectionDescription: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
    marginTop: 2,
  },

  // Subscription Styles
  subscriptionOverview: {
    alignItems: "center",
    marginBottom: 24,
  },
  totalSubscriptions: {
    alignItems: "center",
  },
  totalSubsNumber: {
    fontSize: 48,
    fontWeight: "800",
    color: "#8B5CF6",
  },
  totalSubsLabel: {
    fontSize: 16,
    color: "#64748B",
    fontWeight: "500",
  },
  packageComparison: {
    flexDirection: "row",
    gap: 16,
  },
  packageCard: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 16,
  },
  packageHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  packageIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  packageLabel: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  packageName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 12,
  },
  packageStats: {
    gap: 8,
  },
  packageStat: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  packageStatValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B",
  },
  packageStatLabel: {
    fontSize: 12,
    color: "#64748B",
  },

  // Workout Plan Styles
  planOverview: {
    alignItems: "center",
  },
  planTotalContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  planTotalNumber: {
    fontSize: 48,
    fontWeight: "800",
    color: "#0056D2",
  },
  planTotalLabel: {
    fontSize: 16,
    color: "#64748B",
    fontWeight: "500",
  },
  planStatusChart: {
    alignItems: "center",
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 16,
  },

  // Rating Styles
  ratingContainer: {
    alignItems: "center",
  },
  ratingDisplay: {
    alignItems: "center",
    marginBottom: 24,
  },
  ratingNumber: {
    fontSize: 48,
    fontWeight: "800",
    color: "#F59E0B",
    marginBottom: 8,
  },
  ratingStars: {
    flexDirection: "row",
    gap: 4,
    marginBottom: 8,
  },
  ratingLabel: {
    fontSize: 16,
    color: "#64748B",
    fontWeight: "500",
  },
  ratingProgress: {
    width: "100%",
    alignItems: "center",
  },
  ratingProgressBar: {
    width: "100%",
    height: 8,
    backgroundColor: "#F1F5F9",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  ratingProgressFill: {
    height: "100%",
    backgroundColor: "#F59E0B",
    borderRadius: 4,
  },
  ratingCount: {
    fontSize: 14,
    color: "#64748B",
  },

  // Exercise Styles
  exerciseOverview: {
    alignItems: "center",
  },
  exerciseTotalContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  exerciseTotalNumber: {
    fontSize: 48,
    fontWeight: "800",
    color: "#EF4444",
  },
  exerciseTotalLabel: {
    fontSize: 16,
    color: "#64748B",
    fontWeight: "500",
  },
  exerciseBreakdown: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 24,
  },
  exerciseTypeCard: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 16,
  },
  exerciseTypeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  exerciseTypeNumber: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 4,
  },
  exerciseTypeLabel: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
  },
  exerciseChart: {
    alignItems: "center",
  },
  chart: {
    borderRadius: 16,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  filterModalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    height: "30%",
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#CBD5E1",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    flex: 1,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 16,
  },
  dateRangeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dateButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 8,
  },
  dateButtonText: {
    fontSize: 14,
    color: "#1E293B",
    flex: 1,
    fontWeight: "500",
  },
  dateRangeSeparator: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    paddingTop: 20,
  },
  resetButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  resetButtonText: {
    fontSize: 16,
    color: "#64748B",
    fontWeight: "600",
  },
  applyButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0056D2",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  applyButtonText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
  },

  // Date Picker Styles
  datePickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  datePickerContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    width: "100%",
    maxWidth: 350,
  },
  datePickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
  },
  datePickerConfirm: {
    backgroundColor: "#0056D2",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 20,
  },
  datePickerConfirmText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  errorText: {
    fontSize: 12,
    color: "#EF4444",
    marginTop: 8,
  },
})

export default TrainerDashboard
