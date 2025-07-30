
import { useEffect,useState,useCallback } from "react"
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Platform,
  Modal,
  TextInput,
  ScrollView,
  Animated,
} from "react-native"
import { apiUserWaterLogService } from "services/apiUserWaterLogService"
import { useAuth } from "context/AuthContext"
import { useFocusEffect } from "@react-navigation/native"
import DynamicStatusBar from "screens/statusBar/DynamicStatusBar"
import { theme } from "theme/color"
import { LinearGradient } from "expo-linear-gradient"
import FloatingMenuButton from "components/FloatingMenuButton"
import { StatusBar } from "expo-status-bar"
import { SafeAreaView } from "react-native-safe-area-context"
import DateTimePicker from "@react-native-community/datetimepicker"
import Header from "components/Header"
import Loading from "components/Loading"
import { showErrorFetchAPI,showSuccessMessage } from "utils/toastUtil"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { Ionicons } from "@expo/vector-icons"
import { useWaterTotal } from "context/WaterTotalContext"
import { getTargetWaterLog } from "utils/waterTargetStorage"
import { getGeminiHealthAdvice } from "utils/gemini"
import CelebrationFireworks from "components/congratulation/CelebrationFireworks"
import CommonSkeleton from "components/CommonSkeleton/CommonSkeleton"
import { handleDailyCheckin } from "utils/checkin"

const { width,height } = Dimensions.get("window")
const RECOMMENDED_DAILY_INTAKE = 2000
const MINIMUM_DAILY_INTAKE = 1200
const MAXIMUM_SAFE_INTAKE = 3500

export default function UserWaterLogScreen({ navigation }) {
  const safeNavigation = navigation || { navigate: () => { },goBack: () => { } }
  const [showTargetSelector,setShowTargetSelector] = useState(false)
  const [targetWater,setTargetWater] = useState(() => {
    try {
      let userId = null;
      if (typeof window !== 'undefined' && window.localStorage) {
        // Try to get userId from localStorage or from global context if available
        const userRaw = localStorage.getItem('user');
        if (userRaw) {
          try {
            const userObj = JSON.parse(userRaw);
            userId = userObj.id || userObj._id || userObj.userId;
          } catch (e) { }
        }
      }
      // Fallback: try to get userId from global variable if available
      if (!userId && typeof window !== 'undefined' && window.userId) {
        userId = window.userId;
      }
      const key = userId ? `waterTarget_${userId}` : 'waterTarget';
      const saved = localStorage.getItem(key);
      console.log('DEBUG waterTarget localStorage:',key,saved);
      if (saved) {
        const obj = JSON.parse(saved);
        if (obj && typeof obj.target === 'number') return obj.target;
      }
    } catch (e) { }
    return 2000;
  })
  const [targetType,setTargetType] = useState("ml")
  const [targetLoaded,setTargetLoaded] = useState(false)

  // New state for celebration
  const [showCelebration,setShowCelebration] = useState(false)

  const { user,authToken } = useAuth()

  useFocusEffect(
    useCallback(() => {
      let userId = null
      if (user && typeof user === "object") {
        userId = user.id || user._id || user.userId
        if (typeof userId === "string") userId = Number.parseInt(userId,10)
      }
      if (userId) {
        getTargetWaterLog(userId).then((data) => {
          if (data && data.targetMl && data.type) {
            setTargetWater(data.targetMl)
            setTargetType(data.type)
          }
          setTargetLoaded(true)
        })
      } else {
        setTargetLoaded(true)
      }
    },[user]),
  )

  const { allTimeTotalIntake,setAllTimeTotalIntake } = useWaterTotal()
  const [waterLogs,setWaterLogs] = useState([])
  const [loading,setLoading] = useState(true)
  const [refreshing,setRefreshing] = useState(false)
  const [filterModalVisible,setFilterModalVisible] = useState(false)
  const [customDaysModalVisible,setCustomDaysModalVisible] = useState(false)
  const [selectedQuickFilter,setSelectedQuickFilter] = useState("7")
  const [customDaysInput,setCustomDaysModalInput] = useState("")
  const [showAllLogs,setShowAllLogs] = useState(false)
  const [filters,setFilters] = useState({
    pageNumber: 1,
    pageSize: 50,
    startDate: null,
    endDate: null,
    searchTerm: "",
    status: "active",
  })
  const [tempFilters,setTempFilters] = useState({ ...filters });
  const [showStartDatePicker,setShowStartDatePicker] = useState(false)
  const [showEndDatePicker,setShowEndDatePicker] = useState(false)
  const [timePeriod,setTimePeriod] = useState("week")
  const [customDays,setCustomDays] = useState(7)
  const [chartData,setChartData] = useState({ labels: [],datasets: [] })
  const [averageIntake,setAverageIntake] = useState(0)
  const [hydrationStatus,setHydrationStatus] = useState("")
  const [todayIntake,setTodayIntake] = useState(0)
  const [weeklyAverage,setWeeklyAverage] = useState(0)
  // Tổng amountMl của tất cả log (không chỉ hôm nay)
  const [allTimeTotalIntakeState,setAllTimeTotalIntakeState] = useState(0)
  const [animatedValue] = useState(new Animated.Value(0))
  // Quick log form state
  const [quickLogForm,setQuickLogForm] = useState({
    amountMl: 250,
    consumptionDate: new Date(),
    notes: "",
    status: "active",
  })
  const [logging,setLogging] = useState(false)
  const [quickLogStatus,setQuickLogStatus] = useState({ status: "idle",message: "" })
  const [showSelectModal,setShowSelectModal] = useState(false)
  const quickFilterOptions = [
    { id: "today",label: "Today",days: 0 },
    { id: "3",label: "3 Days",days: 3 },
    { id: "5",label: "5 Days",days: 5 },
    { id: "7",label: "7 Days",days: 7 },
    { id: "custom",label: "Custom",days: null },
  ]
  // Generate water amount options for iOS-style picker
  const generateWaterAmounts = () => {
    const amounts = []
    for (let i = 0; i <= 3500; i += 50) {
      amounts.push(i)
    }
    return amounts
  }
  const waterAmounts = generateWaterAmounts()
  const quickLogOptions = generateWaterAmounts().map((amount) => ({ label: `${amount} ml`,value: amount }))
  // Modern iOS-style Quick Log card
  const renderQuickLogCard = () => {
    const currentIndex = waterAmounts.findIndex((amount) => amount >= quickLogForm.amountMl)
    const selectedIndex = currentIndex >= 0 ? currentIndex : 0
    return (
      <View style={styles.quickLogCard}>
        <LinearGradient
          colors={["#FFFFFF","#F8FAFC"]}
          style={styles.quickLogGradient}
          start={{ x: 0,y: 0 }}
          end={{ x: 1,y: 1 }}
        >
          <View style={styles.quickLogHeader}>
            <View style={styles.quickLogIconContainer}>
              <LinearGradient colors={["#06B6D4","#0EA5E9"]} style={styles.iconGradient}>
                <Ionicons name="water" size={28} color="#FFFFFF" />
              </LinearGradient>
            </View>
            <View style={styles.quickLogTitleContainer}>
              <Text style={styles.quickLogTitle}>Quick Log</Text>
              <Text style={styles.quickLogSubtitle}>Track your hydration instantly</Text>
            </View>
          </View>

          <View style={styles.quickLogContent}>
            {/* Modern Amount Selector */}
            <View style={styles.amountSelectorContainer}>
              <Text style={styles.amountLabel}>Select Amount</Text>

              <View style={styles.modernAmountContainer}>
                {/* Current Amount Display */}
                <View style={styles.currentAmountDisplay}>
                  <View style={styles.amountCircle}>
                    <LinearGradient colors={["#06B6D4","#0EA5E9"]} style={styles.amountCircleGradient}>
                      <Text style={styles.currentAmountText}>{quickLogForm.amountMl}</Text>
                      <Text style={styles.currentAmountUnit}>ml</Text>
                    </LinearGradient>
                  </View>
                </View>
                {/* iOS-style Picker */}
                <View style={styles.pickerContainer}>
                  <View style={styles.pickerWrapper}>
                    <View style={styles.pickerHighlight} />
                    <ScrollView
                      style={styles.pickerScrollView}
                      showsVerticalScrollIndicator={false}
                      snapToInterval={50}
                      decelerationRate="fast"
                      contentContainerStyle={styles.pickerContent}
                      onMomentumScrollEnd={(event) => {
                        const y = event.nativeEvent.contentOffset.y
                        const index = Math.round(y / 50)
                        const selectedAmount = waterAmounts[index] || 0
                        setQuickLogForm((f) => ({ ...f,amountMl: selectedAmount }))
                      }}
                    >
                      {waterAmounts.map((amount,index) => (
                        <TouchableOpacity
                          key={amount}
                          style={styles.pickerItem}
                          onPress={() => setQuickLogForm((f) => ({ ...f,amountMl: amount }))}
                        >
                          <Text
                            style={[
                              styles.pickerItemText,
                              amount === quickLogForm.amountMl && styles.pickerItemTextSelected,
                            ]}
                          >
                            {amount}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </View>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.modernLogButton,logging && styles.modernLogButtonDisabled]}
              onPress={handleQuickLog}
              disabled={logging}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={logging ? ["#94A3B8","#CBD5E1"] : ["#06B6D4","#0EA5E9"]}
                style={styles.modernLogButtonGradient}
                start={{ x: 0,y: 0 }}
                end={{ x: 1,y: 0 }}
              >
                {logging ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <View style={styles.modernLogButtonIcon}>
                      <Ionicons name="add" size={24} color="#FFFFFF" />
                    </View>
                    <Text style={styles.modernLogButtonText}>Log Water</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    )
  }
  const safeNavigate = (screen,params = {}) => {
    try {
      if (safeNavigation && typeof safeNavigation.navigate === "function") {
        safeNavigation.navigate(screen,params)
      } else {
        Alert.alert("Error","Navigation is not available")
      }
    } catch (error) { }
  }
  const safeGoBack = () => {
    try {
      if (safeNavigation && typeof safeNavigation.goBack === "function") {
        safeNavigation.goBack()
      } else if (safeNavigation && typeof safeNavigation.navigate === "function") {
        safeNavigation.navigate("Home")
      }
    } catch (error) { }
  }
  const getDateRangeForDays = (days) => {
    const endDate = new Date()
    endDate.setHours(23,59,59,999)
    let startDate
    if (days === 0) {
      startDate = new Date()
      startDate.setHours(0,0,0,0)
    } else {
      startDate = new Date()
      startDate.setDate(startDate.getDate() - (days - 1))
      startDate.setHours(0,0,0,0)
    }
    return { startDate,endDate }
  }
  const handleQuickFilter = (filterId) => {
    setSelectedQuickFilter(filterId)
    if (filterId === "custom") {
      setCustomDaysModalVisible(true)
      return
    }
    const option = quickFilterOptions.find((opt) => opt.id === filterId)
    if (option) {
      const { startDate,endDate } = getDateRangeForDays(option.days)
      const newFilters = {
        ...filters,
        startDate,
        endDate,
      }
      setFilters(newFilters)
      fetchWaterLogs(true,newFilters)
    }
  }
  const handleCustomDaysSubmit = () => {
    const days = Number.parseInt(customDaysInput)
    if (isNaN(days) || days < 1 || days > 365) {
      showErrorFetchAPI("Please enter a number between 1 and 365.")
      return
    }
    const { startDate,endDate } = getDateRangeForDays(days)
    const newFilters = {
      ...filters,
      startDate,
      endDate,
    }
    setFilters(newFilters)
    fetchWaterLogs(true,newFilters)
    setCustomDaysModalVisible(false)
    setCustomDaysModalInput("")
  }
  const fetchWaterLogs = async (showLoading = true,appliedFilters = filters) => {
    try {
      if (showLoading) setLoading(true)
      if (!user || !authToken) {
        return
      }
      const queryParams = {
        pageNumber: appliedFilters.pageNumber,
        pageSize: appliedFilters.pageSize,
        startDate: appliedFilters.startDate ? appliedFilters.startDate.toISOString().split("T")[0] : undefined,
        endDate: appliedFilters.endDate ? appliedFilters.endDate.toISOString().split("T")[0] : undefined,
        searchTerm: appliedFilters.searchTerm || undefined,
        status: appliedFilters.status || undefined,
        validPageSize: appliedFilters.pageSize,
      }
      if (typeof apiUserWaterLogService?.getMyWaterLogs !== "function") {
        throw new Error("Water log service not available")
      }
      const response = await apiUserWaterLogService.getMyWaterLogs(queryParams)
      if (response?.statusCode === 200 && response?.data) {
        const sortedLogs = (response.data.records || []).sort(
          (a,b) => new Date(b.consumptionDate) - new Date(a.consumptionDate),
        )
        setWaterLogs(sortedLogs)
        updateChartData(sortedLogs)
        calculateHealthMetrics(sortedLogs)
        const allTotal = sortedLogs.reduce((sum,log) => sum + (Number(log.amountMl) || 0),0)
        setAllTimeTotalIntake(allTotal)
      }
    } catch (error) {
      showErrorFetchAPI(error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }
  function parseVietnamDate(dateStr) {
    if (!dateStr) return null
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [y,m,d] = dateStr.split("-").map(Number)
      return new Date(Date.UTC(y,m - 1,d,0,0,0))
    }
    const date = new Date(dateStr)
    const utc = date.getTime() + date.getTimezoneOffset() * 60000
    return new Date(utc + 7 * 60 * 60000)
  }
  const updateChartData = (logs) => {
    if (!Array.isArray(logs)) {
      setChartData({ labels: [],datasets: [] })
      return
    }
    const dataPoints = []
    let labels = []
    const now = new Date()
    const utc = now.getTime() + now.getTimezoneOffset() * 60000
    const vietnamToday = new Date(utc + 7 * 60 * 60000)
    vietnamToday.setHours(0,0,0,0)
    try {
      if (timePeriod === "week") {
        labels = Array.from({ length: 7 },(_,i) => {
          const date = new Date(vietnamToday)
          date.setDate(vietnamToday.getDate() - (6 - i))
          return date.toLocaleDateString("en-US",{ weekday: "short" })
        })
        dataPoints.push(
          ...Array.from({ length: 7 },(_,i) => {
            const date = new Date(vietnamToday)
            date.setDate(vietnamToday.getDate() - (6 - i))
            const nextDay = new Date(date)
            nextDay.setDate(date.getDate() + 1)
            return logs
              .filter((log) => {
                const logDate = parseVietnamDate(log.consumptionDate)
                return logDate && logDate >= date && logDate < nextDay
              })
              .reduce((sum,log) => sum + (log.amountMl || 0),0)
          }),
        )
      }
      setChartData({
        labels,
        datasets: [
          {
            data: dataPoints,
            borderColor: "#2563EB",
            backgroundColor: "rgba(37, 99, 235, 0.1)",
            fill: true,
          },
        ],
      })
    } catch (error) {
      setChartData({ labels: [],datasets: [] })
    }
  }
  const calculateHealthMetrics = (logs) => {
    if (!Array.isArray(logs) || logs.length === 0) {
      setAverageIntake(0)
      setHydrationStatus("No data")
      setTodayIntake(0)
      setWeeklyAverage(0)
      return
    }
    try {
      // Get today in Vietnam timezone
      const now = new Date()
      const utc = now.getTime() + now.getTimezoneOffset() * 60000
      const vietnamToday = new Date(utc + 7 * 60 * 60000)
      vietnamToday.setHours(0,0,0,0)
      const vietnamTomorrow = new Date(vietnamToday)
      vietnamTomorrow.setDate(vietnamToday.getDate() + 1)
      const todayLogs = logs.filter((log) => {
        const logDate = parseVietnamDate(log.consumptionDate)
        return logDate && logDate >= vietnamToday && logDate < vietnamTomorrow
      })
      const todayTotal = todayLogs.reduce((sum,log) => sum + (log.amountMl || 0),0)
      setTodayIntake(todayTotal)
      const weekAgo = new Date(vietnamToday)
      weekAgo.setDate(vietnamToday.getDate() - 7)
      const weekLogs = logs.filter((log) => {
        const logDate = parseVietnamDate(log.consumptionDate)
        return logDate && logDate >= weekAgo && logDate < vietnamTomorrow
      })
      const weeklyTotal = weekLogs.reduce((sum,log) => sum + (log.amountMl || 0),0)
      const weeklyAvg = weeklyTotal / 7
      setWeeklyAverage(weeklyAvg)
      // Ensure amountMl is always a number and not NaN/null/undefined
      const totalIntake = logs.reduce((sum,log) => sum + (Number(log.amountMl) || 0),0)
      const uniqueDays = new Set(
        logs
          .filter((log) => log.consumptionDate)
          .map((log) => {
            const d = parseVietnamDate(log.consumptionDate)
            return d ? d.toDateString() : null
          }),
      ).size
      const avgIntake = uniqueDays > 0 ? totalIntake / uniqueDays : 0
      setAverageIntake(avgIntake)
      if (weeklyAvg < MINIMUM_DAILY_INTAKE) {
        setHydrationStatus("Severely Dehydrated")
      } else if (weeklyAvg < RECOMMENDED_DAILY_INTAKE * 0.7) {
        setHydrationStatus("Underhydrated")
      } else if (weeklyAvg >= RECOMMENDED_DAILY_INTAKE * 0.7 && weeklyAvg <= MAXIMUM_SAFE_INTAKE) {
        setHydrationStatus("Well-hydrated")
      } else {
        setHydrationStatus("Overhydrated")
      }
    } catch (error) {
      setAverageIntake(0)
      setHydrationStatus("No data")
      setTodayIntake(0)
      setWeeklyAverage(0)
    }
  }
  const getIntakeWarning = (amount,date) => {
    const logDate = new Date(date)
    const today = new Date()
    today.setHours(0,0,0,0)
    const logDay = new Date(logDate)
    logDay.setHours(0,0,0,0)
    if (amount > MAXIMUM_SAFE_INTAKE) {
      return {
        type: "danger",
        message: "Excessive intake - Consult doctor",
        icon: "warning",
        color: "#EF4444",
      }
    } else if (amount > RECOMMENDED_DAILY_INTAKE * 1.5) {
      return {
        type: "warning",
        message: "High intake - Monitor closely",
        icon: "alert-circle",
        color: "#F59E0B",
      }
    } else if (amount < MINIMUM_DAILY_INTAKE && logDay.getTime() === today.getTime()) {
      return {
        type: "info",
        message: "Low intake - Drink more water",
        icon: "information-circle",
        color: "#3B82F6",
      }
    }
    return null
  }
  const getHydrationColor = () => {
    switch (hydrationStatus) {
      case "Well-hydrated":
        return "#10B981"
      case "Underhydrated":
        return "#F59E0B"
      case "Severely Dehydrated":
        return "#EF4444"
      case "Overhydrated":
        return "#8B5CF6"
      default:
        return "#64748B"
    }
  }
  const getHydrationIcon = () => {
    switch (hydrationStatus) {
      case "Well-hydrated":
        return "checkmark-circle"
      case "Underhydrated":
        return "alert-circle"
      case "Severely Dehydrated":
        return "warning"
      case "Overhydrated":
        return "information-circle"
      default:
        return "help-circle"
    }
  }
  const applyFilters = () => {
    setFilters({ ...tempFilters })
    fetchWaterLogs(true,tempFilters)
    setFilterModalVisible(false)
  }
  const resetFilters = () => {
    const defaultFilters = {
      pageNumber: 1,
      pageSize: 50,
      startDate: null,
      endDate: null,
      searchTerm: "",
      status: "active",
    }
    setTempFilters(defaultFilters)
    setFilters(defaultFilters)
    setSelectedQuickFilter("7")
    fetchWaterLogs(true,defaultFilters)
    setFilterModalVisible(false)
  }
  const handleQuickLog = async () => {
    let userId = null
    if (user && typeof user === "object") {
      userId = user.id || user._id || user.userId
      if (typeof userId === "string") userId = Number.parseInt(userId,10)
    }
    if (!userId || isNaN(userId) || userId <= 0) {
      showErrorFetchAPI("Unable to identify user. Please log in again.")
      return
    }
    const amount = quickLogForm.amountMl
    if (isNaN(amount) || amount <= 0 || amount > 3500) {
      showErrorFetchAPI("Please enter a valid water amount (1–3500 ml).")
      return
    }
    setLogging(true)
    try {
      if (typeof apiUserWaterLogService?.addWaterLog !== "function") {
        showErrorFetchAPI("Unable to log water. Service unavailable.")
        return
      }
      // Luôn dùng ngày Việt Nam cho consumptionDate và recordedAt
      const vietnamTodayStr = getVietnamTodayString();
      const vietnamNow = new Date();
      const logData = {
        logId: 0,
        userId: userId,
        amountMl: amount,
        consumptionDate: vietnamTodayStr,
        recordedAt: vietnamNow.toISOString(),
        notes: "",
        status: "active",
      }
      const response = await apiUserWaterLogService.addWaterLog(logData)
      if (
        response?.statusCode === 200 ||
        response?.statusCode === 201 ||
        (typeof response?.message === "string" && response.message.toLowerCase().includes("success"))
      ) {
        setQuickLogForm({ amountMl: 250,consumptionDate: vietnamTodayStr,notes: "",status: "active" })
        await fetchWaterLogs(true)
        showSuccessMessage("Water logged successfully!");
        try {
          if (user?.userId) {
            await handleDailyCheckin(user.userId,"water_log");
          }
        } catch (e) {
          console.log(e);
        }
        return
      } else if (response?.message) {
        showErrorFetchAPI(response.message)
        return
      } else {
        showErrorFetchAPI(error.message || "Unable to log water.")
        return
      }
    } catch (error) {
      showErrorFetchAPI(error)
      return
    } finally {
      setLogging(false)
    }
  }
  // Utility: Get Vietnam today string in YYYY-MM-DD format using Asia/Ho_Chi_Minh timezone
  function getVietnamTodayString() {
    const vietnamDate = new Date().toLocaleDateString('en-CA',{
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return vietnamDate;
  }
  // Get today's logs for limited display (compare by yyyy-mm-dd string in Vietnam timezone)
  const getTodayLogs = () => {
    const todayStr = getVietnamTodayString()
    // Debug: log ngày Việt Nam hiện tại
    const todayLogs = waterLogs.filter((log) => {
      if (!log.consumptionDate) return false
      const isToday = log.consumptionDate === todayStr
      if (isToday) return isToday
    })
    return showAllLogs ? todayLogs : todayLogs.slice(0,3)
  }
  // Calculate today's total water intake (sum of all logs for today, using Vietnam timezone)
  const getTodayTotalIntake = () => {
    const todayStr = getVietnamTodayString()
    const total = waterLogs
      .filter((log) => {
        if (!log.consumptionDate) return false
        return log.consumptionDate === todayStr
      })
      .reduce((sum,log) => sum + (Number(log.amountMl) || 0),0)
    return total
  }
  // Luôn cập nhật todayIntake khi waterLogs thay đổi
  useEffect(() => {
    const currentTodayIntake = getTodayTotalIntake()
    setTodayIntake(currentTodayIntake)

    // Animate progress bar safely
    if (
      animatedValue &&
      typeof animatedValue === "object" &&
      typeof animatedValue.setValue === "function" &&
      typeof Animated.timing === "function"
    ) {
      try {
        Animated.timing(animatedValue,{
          toValue: Math.min(currentTodayIntake / (targetWater || RECOMMENDED_DAILY_INTAKE),1),
          duration: 1000,
          useNativeDriver: false,
        }).start()
      } catch (err) {
        // Silent catch to avoid crash
      }
    }

    // Show celebration only when currentTodayIntake >= targetWater
    if (targetLoaded && targetWater > 0 && currentTodayIntake >= targetWater) {
      setShowCelebration(true)
    } else {
      setShowCelebration(false)
    }
  },[waterLogs,targetWater,targetLoaded,animatedValue])

  const getTodayLogsCount = () => {
    const todayStr = getVietnamTodayString()
    return waterLogs.filter((log) => {
      if (!log.consumptionDate) return false
      return log.consumptionDate === todayStr
    }).length
  }
  // Display today's water intake progress (sum of all logs for today)
  const renderHealthCard = () => {
    const todayTotalIntake = getTodayTotalIntake()
    return (
      <View style={styles.healthCard}>
        <LinearGradient colors={["#0056d2","#2070e0","#4080f0"]} style={styles.healthCardGradient}>
          <View style={styles.healthCardHeader}>
            <Ionicons name="water" size={24} color="#FFFFFF" />
            <Text style={styles.healthCardTitle}>Today's Hydration</Text>
          </View>
          <View style={styles.progressContainer}>
            <View style={styles.progressBackground}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    width: animatedValue.interpolate({
                      inputRange: [0,1],
                      outputRange: ["0%","100%"],
                    }),
                  },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {todayTotalIntake} / {targetWater} ml
            </Text>
          </View>
          <View style={styles.healthStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {targetWater ? Math.round((todayTotalIntake / targetWater) * 100) : 0}%
              </Text>
              <Text style={styles.statLabel}>Daily Goal</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{Math.round(weeklyAverage)}</Text>
              <Text style={styles.statLabel}>Weekly Avg</Text>
            </View>
          </View>
        </LinearGradient>
      </View>
    )
  }
  // Display hydration status with Gemini AI advice (personalized with today's water log data)
  const [geminiAdvice,setGeminiAdvice] = useState("")
  useEffect(() => {
    // Compose a detailed prompt for Gemini based on today's water intake
    const status =
      hydrationStatus === "Underhydrated" || hydrationStatus === "Severely Dehydrated"
        ? "under"
        : hydrationStatus === "Overhydrated"
          ? "over"
          : "normal"
    // Always call Gemini for advice, pass todayIntake as the main value
    const prompt = {
      macro: "water",
      status,
      todayIntake,
      hydrationStatus,
      recommended: RECOMMENDED_DAILY_INTAKE,
      min: MINIMUM_DAILY_INTAKE,
      max: MAXIMUM_SAFE_INTAKE,
      date: new Date().toISOString().split("T")[0],
    }
    getGeminiHealthAdvice(prompt).then((msg) => {
      if (msg) {
        // Only keep the first 2 non-empty lines
        const lines = msg
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean)
          .slice(0,2)
        setGeminiAdvice(lines.join("\n"))
      } else {
        setGeminiAdvice("")
      }
    })
  },[todayIntake,hydrationStatus])
  const renderStatusCard = () => (
    <View style={styles.statusCard}>
      <View style={styles.statusHeader}>
        <Ionicons name={getHydrationIcon()} size={24} color={getHydrationColor()} />
        <Text style={styles.statusTitle}>Hydration Status</Text>
      </View>
      <View style={{ marginTop: 8 }}>
        {geminiAdvice ? (
          <Text
            style={{
              fontSize: 15,
              color: "#111",
              textAlign: "justify",
              lineHeight: 22,
              fontWeight: "400",
              paddingHorizontal: 10,
              whiteSpace: "pre-line",
            }}
          >
            {geminiAdvice.trim()}
          </Text>
        ) : (
          <Text style={{ fontSize: 15,color: "#111",textAlign: "center",lineHeight: 22,fontWeight: "400" }}>
            {hydrationStatus}
          </Text>
        )}
      </View>
    </View>
  )
  useEffect(() => {
    handleQuickFilter("7")
  },[user,authToken]) // Removed todayIntake from here as it's handled in the combined useEffect

  useEffect(() => {
    setAllTimeTotalIntake(allTimeTotalIntake)
  },[allTimeTotalIntake,setAllTimeTotalIntake])
  useFocusEffect(
    useCallback(() => {
      if (selectedQuickFilter) {
        handleQuickFilter(selectedQuickFilter)
      }
    },[]),
  )
  const onRefresh = () => {
    setRefreshing(true)
    fetchWaterLogs(false)
  }
  const handleAddWaterLog = () => {
    safeNavigate("AddWaterLogScreen")
  }
  const handleEditWaterLog = (item) => {
    safeNavigate("EditWaterLogScreen",{ waterLog: item })
  }
  const handleDeleteWaterLog = (logId) => {
    // Custom confirm dialog can be implemented if needed, for now just delete directly for toast demo
    const confirmDelete = async () => {
      try {
        if (typeof apiUserWaterLogService?.deleteWaterLog !== "function") {
          showErrorFetchAPI("Delete service not available")
          return
        }
        const response = await apiUserWaterLogService.deleteWaterLog(logId)
        if (response?.statusCode === 200) {
          fetchWaterLogs()
          showSuccessMessage("Water log deleted successfully.")
        } else {
          showErrorFetchAPI("Failed to delete water log.")
        }
      } catch (error) {
        showErrorFetchAPI(error.message || "Failed to delete water log.")
      }
    }
    // If you want to keep a confirm dialog, you can use a custom modal or a simple JS confirm for now
    // For demo, just call confirmDelete directly
    confirmDelete()
  }
  // Quick Filters removed as requested
  const renderCustomDaysModal = () => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={customDaysModalVisible}
      onRequestClose={() => setCustomDaysModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.customDaysModalContent}>
          <View style={styles.customDaysModalHeader}>
            <Ionicons name="calendar-outline" size={24} color="#2563EB" />
            <Text style={styles.customDaysModalTitle}>Custom Days</Text>
          </View>
          <Text style={styles.customDaysLabel}>Enter number of days (1-365):</Text>
          <TextInput
            style={styles.customDaysInput}
            value={customDaysInput}
            onChangeText={setCustomDaysModalInput}
            placeholder="e.g., 14"
            placeholderTextColor="#9CA3AF"
            keyboardType="numeric"
            maxLength={3}
            autoFocus={true}
          />
          <View style={styles.customDaysButtons}>
            <TouchableOpacity
              style={styles.customDaysCancelButton}
              onPress={() => {
                setCustomDaysModalVisible(false)
                setCustomDaysModalInput("")
                setSelectedQuickFilter("7")
              }}
            >
              <Text style={styles.customDaysCancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.customDaysApplyButton} onPress={handleCustomDaysSubmit}>
              <Text style={styles.customDaysApplyButtonText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
  const renderFilterModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={filterModalVisible}
      onRequestClose={() => setFilterModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Ionicons name="filter" size={24} color="#2563EB" />
            <Text style={styles.modalTitle}>Advanced Filters</Text>
            <TouchableOpacity onPress={() => setFilterModalVisible(false)} style={styles.modalCloseButton}>
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody}>
            <Text style={styles.filterLabel}>Search Term</Text>
            <TextInput
              style={styles.input}
              value={tempFilters.searchTerm || ""}
              onChangeText={(text) => setTempFilters({ ...tempFilters,searchTerm: text })}
              placeholder="Enter search term"
              placeholderTextColor="#9CA3AF"
            />
            <Text style={styles.filterLabel}>Status</Text>
            <View style={styles.statusButtons}>
              {["active","inactive"].map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[styles.statusButton,tempFilters.status === status && styles.statusButtonSelected]}
                  onPress={() => setTempFilters({ ...tempFilters,status })}
                >
                  <Text
                    style={[styles.statusButtonText,tempFilters.status === status && styles.statusButtonTextSelected]}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.filterLabel}>Start Date</Text>
            <TouchableOpacity style={styles.dateButton} onPress={() => setShowStartDatePicker(true)}>
              <Ionicons name="calendar-outline" size={20} color="#64748B" />
              <Text style={styles.dateButtonText}>
                {tempFilters.startDate ? tempFilters.startDate.toLocaleDateString() : "Select Start Date"}
              </Text>
            </TouchableOpacity>
            {showStartDatePicker && (
              <DateTimePicker
                value={tempFilters.startDate || new Date()}
                mode="date"
                display="default"
                onChange={(event,date) => {
                  setShowStartDatePicker(false)
                  if (date) {
                    setTempFilters({ ...tempFilters,startDate: date })
                  }
                }}
              />
            )}
            <Text style={styles.filterLabel}>End Date</Text>
            <TouchableOpacity style={styles.dateButton} onPress={() => setShowEndDatePicker(true)}>
              <Ionicons name="calendar-outline" size={20} color="#64748B" />
              <Text style={styles.dateButtonText}>
                {tempFilters.endDate ? tempFilters.endDate.toLocaleDateString() : "Select End Date"}
              </Text>
            </TouchableOpacity>
            {showEndDatePicker && (
              <DateTimePicker
                value={tempFilters.endDate || new Date()}
                mode="date"
                display="default"
                onChange={(event,date) => {
                  setShowEndDatePicker(false)
                  if (date) {
                    setTempFilters({ ...tempFilters,endDate: date })
                  }
                }}
              />
            )}
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.resetButton} onPress={resetFilters}>
                <Text style={styles.resetButtonText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyButton} onPress={applyFilters}>
                <Text style={styles.applyButtonText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
  const renderItem = ({ item }) => {
    // Use recordedAt for time display, fallback to consumptionDate if missing
    const recordedAt = item.recordedAt || item.consumptionDate
    if (!item || !recordedAt) {
      return null
    }
    // Parse and convert to Vietnam timezone (UTC+7)
    const date = new Date(recordedAt)
    // Format date as local Vietnam time
    const formattedDate = date.toLocaleDateString("vi-VN",{
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "Asia/Ho_Chi_Minh",
    })
    // Format time as 12h with AM/PM in Vietnam timezone
    const formattedTime = date.toLocaleTimeString("en-US",{
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Ho_Chi_Minh",
    })
    const warning = getIntakeWarning(item.amountMl,recordedAt)
    return (
      <TouchableOpacity style={styles.logCard} onPress={() => handleEditWaterLog(item)} activeOpacity={0.7}>
        {warning && (
          <View style={[styles.warningBanner,{ backgroundColor: warning.color }]}>
            <Ionicons name={warning.icon} size={16} color="#FFFFFF" />
            <Text style={styles.warningText}>{warning.message}</Text>
          </View>
        )}
        <View style={styles.logCardHeader}>
          <View style={styles.dateTimeContainer}>
            <Text style={styles.logDate}>{formattedDate}</Text>
            <Text style={styles.logTime}>{formattedTime}</Text>
          </View>
          <View style={styles.logActions}>
            <TouchableOpacity style={styles.editButton} onPress={() => handleEditWaterLog(item)}>
              <Ionicons name="pencil" size={18} color="#2563EB" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeleteWaterLog(item.logId)}>
              <Ionicons name="trash" size={18} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.logContent}>
          <View style={styles.amountDisplay}>
            <Ionicons name="water" size={32} color="#2563EB" />
            <View style={styles.amountInfo}>
              <Text style={styles.amountValue}>{item.amountMl || 0}</Text>
              <Text style={styles.amountUnit}>ml</Text>
            </View>
          </View>
          <View style={styles.statusBadge}>
            <View
              style={[styles.statusIndicator,{ backgroundColor: item.status === "active" ? "#10B981" : "#EF4444" }]}
            />
            <Text style={styles.statusText}>
              {item.status ? item.status.charAt(0).toUpperCase() + item.status.slice(1) : "Unknown"}
            </Text>
          </View>
        </View>
        {item.notes && (
          <View style={styles.notesSection}>
            <Ionicons name="document-text" size={16} color="#64748B" />
            <Text style={styles.notesText}>{item.notes}</Text>
          </View>
        )}
      </TouchableOpacity>
    )
  }
  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <DynamicStatusBar backgroundColor={theme.primaryColor} />
        <CommonSkeleton />
      </SafeAreaView>
    )
  }
  const displayLogs = getTodayLogs()
  const totalTodayLogs = getTodayLogsCount()
  return (
    <SafeAreaView style={styles.safeArea}>
      <DynamicStatusBar backgroundColor={theme.primaryColor} />
      <Header
        title="Water Intake Logs"
        onBack={safeGoBack}
        rightActions={[
          {
            icon: "analytics",
            onPress: () => safeNavigate("WaterComparison"),
          },
          {
            icon: "water-outline",
            iconColor: "#0056d2",
            onPress: () => {
              const userId =
                user && (user.id || user._id || user.userId)
                  ? Number.parseInt(user.id || user._id || user.userId,10)
                  : null
              safeNavigation.navigate("SetWaterTarget",{
                userId,
                initialTarget: targetWater,
                initialType: targetType,
                onSaved: (t,ty) => {
                  setTargetWater(t)
                  setTargetType(ty)
                },
              })
            },
          },
        ]}
      />
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#0056d2"]} tintColor="#0056d2" />
        }
      >
        <View style={styles.cardsContainer}>
          {/* Health Card with new color */}
          <View style={styles.healthCard}>
            <LinearGradient colors={["#0056d2","#2070e0","#4080f0"]} style={styles.healthCardGradient}>
              <View style={styles.healthCardHeader}>
                <Ionicons name="water" size={24} color="#FFFFFF" />
                <Text style={styles.healthCardTitle}>Today's Hydration</Text>
              </View>
              <View style={styles.progressContainer}>
                <View style={styles.progressBackground}>
                  <Animated.View
                    style={[
                      styles.progressFill,
                      {
                        width: animatedValue.interpolate({
                          inputRange: [0,1],
                          outputRange: ["0%","100%"],
                        }),
                      },
                    ]}
                  />
                </View>
                <Text style={styles.progressText}>
                  {todayIntake} / {targetWater} ml
                </Text>
              </View>
              <View style={styles.healthStats}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {targetWater ? Math.round((todayIntake / targetWater) * 100) : 0}%
                  </Text>
                  <Text style={styles.statLabel}>Daily Goal</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{Math.round(weeklyAverage)}</Text>
                  <Text style={styles.statLabel}>Weekly Avg</Text>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* Congratulatory Message */}
          {showCelebration && (
            <View style={styles.celebrationMessageContainer}>
              <Ionicons name="trophy-outline" size={24} color="#0056d2" />
              <Text style={styles.celebrationMessageText}>
                {"Congratulations! You have achieved your water intake goal for today!"}
              </Text>
            </View>
          )}

          {/* Simple Quick Log Card */}
          <View style={styles.quickLogCard}>
            <View style={styles.quickLogContentSimple}>
              <View style={{ width: "100%",marginBottom: 6,alignItems: "center",justifyContent: "center" }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: "#F1F5F9",
                    borderWidth: 1,
                    borderColor: "#E2E8F0",
                    borderRadius: 12,
                    paddingVertical: 0,
                    paddingHorizontal: 0,
                    width: 140,
                    height: 48,
                    justifyContent: "center",
                  }}
                >
                  <TextInput
                    style={{
                      backgroundColor: "transparent",
                      fontSize: 18,
                      color: "#1E293B",
                      textAlign: "right",
                      paddingVertical: 12,
                      paddingHorizontal: 0,
                      width: 70,
                    }}
                    value={quickLogForm.amountMl.toString()}
                    onChangeText={(val) => {
                      let num = Number.parseInt(val.replace(/[^0-9]/g,"")) || 0
                      if (num > 3500) num = 3500
                      setQuickLogForm((f) => ({ ...f,amountMl: num }))
                    }}
                    placeholder="0"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                    maxLength={5}
                    returnKeyType="done"
                  />
                  <Text
                    style={{
                      fontSize: 16,
                      color: "#64748B",
                      fontWeight: "500",
                      marginLeft: 2,
                      marginRight: 20,
                    }}
                  >
                    {"ml"}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[
                  styles.simpleLogButton,
                  { backgroundColor: "#0056d2",marginTop: 4 },
                  logging && styles.simpleLogButtonDisabled,
                ]}
                onPress={handleQuickLog}
                disabled={logging}
                activeOpacity={0.8}
              >
                {logging ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.simpleLogButtonText}>{"Quick Log Water"}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
          {renderStatusCard()}
        </View>
        <View style={styles.logsSection}>
          <View style={styles.logsSectionHeader}>
            <Text style={styles.logsSectionTitle}>{"Today's Logs"}</Text>
            <View style={{ flexDirection: "row",alignItems: "center" }}>
              <Text style={styles.logsCount}>{`${totalTodayLogs} entries`}</Text>
              <TouchableOpacity
                style={{
                  marginLeft: 12,
                  paddingVertical: 4,
                  paddingHorizontal: 12,
                  borderRadius: 16,
                  backgroundColor: "#0056d2",
                }} // Updated color
                onPress={() => safeNavigate("WaterLogAnalyticsScreen")}
                activeOpacity={0.8}
              >
                <Text style={{ color: "#fff",fontWeight: "600",fontSize: 14 }}>{"View All"}</Text>
              </TouchableOpacity>
            </View>
          </View>
          {displayLogs.length > 0 ? (
            <>
              <FlatList
                data={displayLogs}
                renderItem={renderItem}
                keyExtractor={(item) => (item.logId ? item.logId.toString() : Math.random().toString())}
                scrollEnabled={false}
                showsVerticalScrollIndicator={false}
              />
              {totalTodayLogs > 3 && !showAllLogs && (
                <TouchableOpacity style={styles.showMoreButton} onPress={() => setShowAllLogs(true)}>
                  <Text style={styles.showMoreText}>{`Show ${totalTodayLogs - 3} more logs`}</Text>
                  <Ionicons name="chevron-down" size={16} color="#0056d2" />
                </TouchableOpacity>
              )}
              {showAllLogs && totalTodayLogs > 3 && (
                <TouchableOpacity style={styles.showMoreButton} onPress={() => setShowAllLogs(false)}>
                  <Text style={styles.showMoreText}>{"Show less"}</Text>
                  <Ionicons name="chevron-up" size={16} color="#0056d2" />
                </TouchableOpacity>
              )}
            </>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="water-outline" size={64} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>{"No Water Logs Yet"}</Text>
              <Text style={styles.emptyText}>
                {"Start tracking your daily water intake to maintain optimal hydration levels"}
              </Text>
              <TouchableOpacity style={styles.emptyButton} onPress={handleAddWaterLog}>
                <Ionicons name="add" size={20} color="#FFFFFF" />
                <Text style={styles.emptyButtonText}>{"Add First Log"}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
      <TouchableOpacity
        style={[
          styles.fab,
          {
            backgroundColor: "#0056d2",
            justifyContent: "center",
            alignItems: "center",
            shadowColor: "#0056d2",
            shadowOffset: { width: 0,height: 8 },
            shadowOpacity: 0.35,
            shadowRadius: 16,
            elevation: 12,
          },
        ]}
        onPress={handleAddWaterLog}
        activeOpacity={0.8}
      >
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: "#fff",
            justifyContent: "center",
            alignItems: "center",
            shadowColor: "#0056d2",
            shadowOffset: { width: 0,height: 2 },
            shadowOpacity: 0.12,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          <Ionicons name="add" size={32} color="#0056d2" />
        </View>
      </TouchableOpacity>
      {renderFilterModal()}
      {renderCustomDaysModal()}
      <FloatingMenuButton
        initialPosition={{ x: width - 70,y: height - 180 }}
        autoHide={true}
        navigation={navigation}
        autoHideDelay={4000}
      />
      {/* Render CelebrationFireworks */}
      <CelebrationFireworks isVisible={showCelebration} color="#FFD700" />
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
    backgroundColor: "#F9FAFB",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  loadingContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#2563EB",
    fontWeight: "500",
  },
  header: {
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 2,
  },
  filterButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  cardsContainer: {
    padding: 20,
    paddingBottom: 10,
    marginTop: 55,
  },
  healthCard: {
    borderRadius: 20,
    marginBottom: 16,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#4F46E5",
        shadowOffset: { width: 0,height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  healthCardGradient: {
    padding: 24,
  },
  healthCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  healthCardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
    marginLeft: 12,
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressBackground: {
    height: 8,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    textAlign: "center",
  },
  healthStats: {
    flexDirection: "row",
    alignItems: "center",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  statLabel: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    marginHorizontal: 20,
  },
  // Modern iOS-style Quick Log styles
  quickLogCard: {
    marginBottom: 16,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#06B6D4",
        shadowOffset: { width: 0,height: 12 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  quickLogGradient: {
    padding: 32,
  },
  quickLogHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 28,
  },
  quickLogIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 20,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#06B6D4",
        shadowOffset: { width: 0,height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  iconGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  quickLogTitleContainer: {
    flex: 1,
  },
  quickLogTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: "#0F172A",
    marginBottom: 4,
    letterSpacing: -0.8,
  },
  quickLogSubtitle: {
    fontSize: 16,
    color: "#64748B",
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  quickLogContent: {
    gap: 24,
  },
  amountSelectorContainer: {
    alignItems: "center",
  },
  amountLabel: {
    fontSize: 20,
    fontWeight: "800",
    color: "#374151",
    marginBottom: 20,
    letterSpacing: -0.4,
  },
  modernAmountContainer: {
    width: "100%",
    alignItems: "center",
    gap: 20,
  },
  currentAmountDisplay: {
    alignItems: "center",
    marginBottom: 8,
  },
  amountCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#06B6D4",
        shadowOffset: { width: 0,height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  amountCircleGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  currentAmountText: {
    fontSize: 32,
    fontWeight: "900",
    color: "#FFFFFF",
    lineHeight: 36,
    letterSpacing: -1,
  },
  currentAmountUnit: {
    fontSize: 14,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.8)",
    letterSpacing: 0.5,
    marginTop: -2,
  },
  pickerContainer: {
    width: "100%",
    alignItems: "center",
  },
  pickerWrapper: {
    width: 200,
    height: 150,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 20,
    overflow: "hidden",
    position: "relative",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0,height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  pickerHighlight: {
    position: "absolute",
    top: "50%",
    left: 0,
    right: 0,
    height: 50,
    backgroundColor: "rgba(6, 182, 212, 0.1)",
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderColor: "#06B6D4",
    zIndex: 1,
    transform: [{ translateY: -25 }],
  },
  pickerScrollView: {
    flex: 1,
  },
  pickerContent: {
    paddingVertical: 50,
  },
  pickerItem: {
    height: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  pickerItemText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#9CA3AF",
    letterSpacing: -0.3,
  },
  pickerItemTextSelected: {
    fontSize: 22,
    fontWeight: "800",
    color: "#06B6D4",
    letterSpacing: -0.5,
  },
  quickAmountButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    gap: 12,
  },
  quickAmountButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    borderWidth: 2,
    borderColor: "rgba(6, 182, 212, 0.2)",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#06B6D4",
        shadowOffset: { width: 0,height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  quickAmountButtonSelected: {
    backgroundColor: "#06B6D4",
    borderColor: "#06B6D4",
    transform: [{ scale: 1.05 }],
  },
  quickAmountButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#06B6D4",
    letterSpacing: -0.2,
  },
  quickAmountButtonTextSelected: {
    color: "#FFFFFF",
  },
  modernLogButton: {
    borderRadius: 24,
    overflow: "hidden",
    marginTop: 8,
    ...Platform.select({
      ios: {
        shadowColor: "#06B6D4",
        shadowOffset: { width: 0,height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  modernLogButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    paddingHorizontal: 40,
    gap: 16,
  },
  modernLogButtonIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  modernLogButtonText: {
    fontSize: 20,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -0.4,
  },
  modernLogButtonDisabled: {
    opacity: 0.7,
  },
  statusCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0,height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  statusHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
    marginLeft: 8,
  },
  statusValue: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 12,
  },
  recommendationContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    padding: 12,
    borderRadius: 8,
  },
  recommendationText: {
    fontSize: 14,
    color: "#92400E",
    marginLeft: 8,
    flex: 1,
  },
  quickFiltersContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0,height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  quickFiltersTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 12,
  },
  quickFiltersScrollContainer: {
    paddingRight: 20,
  },
  quickFilterButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    minWidth: 80,
    justifyContent: "center",
  },
  quickFilterButtonSelected: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  quickFilterButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
  },
  quickFilterButtonTextSelected: {
    color: "#FFFFFF",
  },
  customDaysModalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    width: "85%",
    maxWidth: 320,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0,height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  customDaysModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  customDaysModalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1E293B",
    marginLeft: 12,
  },
  customDaysLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#64748B",
    marginBottom: 8,
  },
  customDaysInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#1E293B",
    marginBottom: 20,
    backgroundColor: "#FFFFFF",
    textAlign: "center",
  },
  customDaysButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  customDaysCancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  customDaysCancelButtonText: {
    fontSize: 16,
    color: "#475569",
    fontWeight: "600",
  },
  customDaysApplyButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#2563EB",
    alignItems: "center",
    marginLeft: 8,
  },
  customDaysApplyButtonText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  logsSection: {
    padding: 20,
    paddingTop: 10,
  },
  logsSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  logsSectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1E293B",
  },
  logsCount: {
    fontSize: 14,
    color: "#64748B",
  },
  showMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  showMoreText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2563EB",
    marginRight: 4,
  },
  logCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginBottom: 12,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0,height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    paddingHorizontal: 16,
  },
  warningText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
    marginLeft: 6,
  },
  logCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    paddingBottom: 8,
  },
  dateTimeContainer: {
    flex: 1,
  },
  logDate: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
  },
  logTime: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 2,
  },
  logActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  editButton: {
    padding: 8,
    marginRight: 4,
  },
  deleteButton: {
    padding: 8,
  },
  logContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  amountDisplay: {
    flexDirection: "row",
    alignItems: "center",
  },
  amountInfo: {
    marginLeft: 12,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  notesSection: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F8FAFC",
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
  },
  notesText: {
    fontSize: 14,
    color: "#475569",
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },
  emptyState: {
    alignItems: "center",
    padding: 40,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0,height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1E293B",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 24,
  },
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2563EB",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#4F46E5",
        shadowOffset: { width: 0,height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  fabGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    width: "100%",
    maxHeight: "80%",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0,height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1E293B",
    marginLeft: 12,
    flex: 1,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#1E293B",
    marginBottom: 16,
    backgroundColor: "#FFFFFF",
  },
  statusButtons: {
    flexDirection: "row",
    marginBottom: 16,
  },
  statusButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  statusButtonSelected: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  statusButtonText: {
    fontSize: 14,
    color: "#475569",
    fontWeight: "600",
  },
  statusButtonTextSelected: {
    color: "#FFFFFF",
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    backgroundColor: "#FFFFFF",
  },
  dateButtonText: {
    fontSize: 16,
    color: "#1E293B",
    marginLeft: 8,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
  },
  resetButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  resetButtonText: {
    fontSize: 16,
    color: "#475569",
    fontWeight: "600",
  },
  applyButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: "#2563EB",
    alignItems: "center",
    marginLeft: 8,
  },
  applyButtonText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  compareButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  // New styles for SelectModal
  selectAmountButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 16,
  },
  selectAmountText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1E293B",
    marginRight: 8,
  },
  quickLogHeaderSimple: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  quickLogTitleSimple: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1E293B",
  },
  quickLogContentSimple: {
    alignItems: "center",
  },
  simpleLogButton: {
    backgroundColor: "#2563EB",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    ...Platform.select({
      ios: {
        shadowColor: "#06B6D4",
        shadowOffset: { width: 0,height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  simpleLogButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  simpleLogButtonDisabled: {
    opacity: 0.7,
  },
  celebrationMessageContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E0F7FA", // Light blue background
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#B2EBF2", // Slightly darker border
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  celebrationMessageText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0056d2", // Main color
    marginLeft: 8,
    flex: 1,
  },
})
