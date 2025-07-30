
import { useEffect,useState,useContext } from "react"
import { getGeminiHealthAdvice } from "utils/gemini"
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
  PanResponder,
  Platform,
} from "react-native"
import { showErrorFetchAPI } from "utils/toastUtil"
import ShimmerPlaceholder from "components/shimmer/ShimmerPlaceholder"
import { weightHistoryService } from "services/apiWeightHistoryService"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { AuthContext } from "context/AuthContext"
import { useTheme,useNavigation } from "@react-navigation/native"
import Header from "components/Header"
import { AnimatedCircularProgress } from "react-native-circular-progress"
import { LineChart,BarChart } from "react-native-chart-kit"
import { Ionicons } from "@expo/vector-icons"
import SelectModal from "components/SelectModal"
import { useWaterTotal } from "context/WaterTotalContext"
import { LinearGradient } from "expo-linear-gradient" // Import LinearGradient
import CommonSkeleton from "components/CommonSkeleton/CommonSkeleton"

const SCREEN_WIDTH = Dimensions.get("window").width
const PRIMARY_COLOR = "#0056d2" // Define primary color for consistency
const ACCENT_COLOR = "#0EA5E9" // A lighter blue/cyan for accents
const TEXT_COLOR_DARK = "#1E293B"
const TEXT_COLOR_MEDIUM = "#475569"
const TEXT_COLOR_LIGHT = "#64748B"
const BACKGROUND_COLOR = "#F8FAFC" // Light background for the screen

export default function WeeklyProgressScreen({ route }) {
  const { user } = useContext(AuthContext)
  const { allTimeTotalIntake } = useWaterTotal()
  // PanResponder for full-screen swipe navigation (only for Day filter, only changes offset, never navigates away)
  const getFullScreenPanResponder = (filter,offset,setOffset) => {
    if (filter !== "Day") return null
    return PanResponder.create({
      onMoveShouldSetPanResponder: (evt,gestureState) => {
        // Only respond to horizontal swipes
        return Math.abs(gestureState.dx) > 20 && Math.abs(gestureState.dy) < 20
      },
      onPanResponderRelease: (evt,gestureState) => {
        if (gestureState.dx > 30) {
          setOffset(offset - 1)
        } else if (gestureState.dx < -30) {
          setOffset(offset + 1)
        }
      },
    })
  }
  const { colors } = useTheme()
  const navigation = useNavigation()
  const [loading,setLoading] = useState(true)
  const [refreshing,setRefreshing] = useState(false)
  const [nutritionTarget,setNutritionTarget] = useState({
    calories: null,
    carbs: null,
    protein: null,
    fats: null,
  })
  const tabNameToIndex = { Calories: 0,Macros: 1,Weight: 2 }
  const initialTabIndex = route?.params?.initialTab ? (tabNameToIndex[route.params.initialTab] ?? 0) : 0
  const [activeTab,setActiveTab] = useState(initialTabIndex)
  const [caloriesFilter,setCaloriesFilter] = useState("Day")
  const [macrosFilter,setMacrosFilter] = useState("Day")
  const [weightFilter,setWeightFilter] = useState("Day")
  // Modal states for filter selection
  const [showCaloriesFilterModal,setShowCaloriesFilterModal] = useState(false)
  const [showMacrosFilterModal,setShowMacrosFilterModal] = useState(false)
  const [showWeightFilterModal,setShowWeightFilterModal] = useState(false)
  // Date offset states
  const [caloriesOffset,setCaloriesOffset] = useState(0)
  const [macrosOffset,setMacrosOffset] = useState(0)
  const [weightOffset,setWeightOffset] = useState(0)
  // Data states
  const [caloriesData,setCaloriesData] = useState(null)
  const [macrosData,setMacrosData] = useState(null)
  const [weightHistory,setWeightHistory] = useState([])
  const [stepsData,setStepsData] = useState([])
  const [stepCounterSteps,setStepCounterSteps] = useState(null)
  const [waterData,setWaterData] = useState([])
  const [macroAdvice,setMacroAdvice] = useState("")
  const filterOptions = ["Day","Week","Month"]
  // Helper functions
  const getCurrentDate = (filter,offset) => {
    const now = new Date()
    // Luôn lấy ngày hiện tại (giờ local), offset=0 là hôm nay
    const date = new Date(now.getFullYear(),now.getMonth(),now.getDate())
    if (filter === "Day") {
      date.setDate(date.getDate() + offset)
    } else if (filter === "Week") {
      date.setDate(date.getDate() + offset * 7)
    } else if (filter === "Month") {
      date.setMonth(date.getMonth() + offset)
    }
    return date
  }
  const formatDateDisplay = (filter,offset) => {
    const date = getCurrentDate(filter,offset)
    if (filter === "Day") {
      return date.toLocaleDateString("en-US",{
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    } else if (filter === "Week") {
      const startOfWeek = new Date(date)
      startOfWeek.setDate(date.getDate() - date.getDay())
      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(startOfWeek.getDate() + 6)
      return `${startOfWeek.toLocaleDateString("en-US",{ month: "short",day: "numeric" })} - ${endOfWeek.toLocaleDateString("en-US",{ month: "short",day: "numeric" })}`
    } else if (filter === "Month") {
      return date.toLocaleDateString("en-US",{ year: "numeric",month: "long" })
    }
  }
  const getDateKey = (filter,offset) => {
    const date = getCurrentDate(filter,offset)
    // yyyy-mm-dd theo local time
    const yyyy = date.getFullYear()
    const mm = (date.getMonth() + 1).toString().padStart(2,"0")
    const dd = date.getDate().toString().padStart(2,"0")
    return `${yyyy}-${mm}-${dd}`
  }
  // Fetch calories data
  const fetchCaloriesData = async () => {
    setCaloriesData(null) // Reset before fetch
    setLoading(true)
    try {
      const dateKey = getDateKey(caloriesFilter,caloriesOffset)
      const displayDate = formatDateDisplay(caloriesFilter,caloriesOffset)
      const raw = await AsyncStorage.getItem(`dailyStats_${dateKey}`)
      if (raw) {
        const parsed = JSON.parse(raw)
        setCaloriesData(parsed)
      } else {
        setCaloriesData(null)
      }
    } catch (error) {
      setCaloriesData(null)
      showErrorFetchAPI(error)
    } finally {
      setLoading(false)
    }
  }
  // Fetch macros data
  const fetchMacrosData = async () => {
    setMacrosData(null) // Reset before fetch
    setMacroAdvice("")
    setLoading(true)
    try {
      const dateKey = getDateKey(macrosFilter,macrosOffset)
      const raw = await AsyncStorage.getItem(`dailyStats_${dateKey}`)
      if (raw) {
        const parsed = JSON.parse(raw)
        setMacrosData(parsed)
        if (parsed.macros) {
          const carbs = parsed.macros.carbs || 0
          const protein = parsed.macros.protein || 0
          const fats = parsed.macros.fats || 0
          const prompt = `Give health advice for someone who consumed ${carbs}g carbs, ${protein}g protein, ${fats}g fats today. Keep it under 100 words.`
          try {
            const advice = await getGeminiHealthAdvice(prompt)
            setMacroAdvice(advice)
          } catch (e) {
            setMacroAdvice("Maintain a balanced diet with adequate macronutrients for optimal health.")
          }
        }
      } else {
        setMacrosData(null)
        setMacroAdvice("")
      }
    } catch (error) {
      setMacrosData(null)
      showErrorFetchAPI(error)
    } finally {
      setLoading(false)
    }
  }
  const fetchWeightData = async () => {
    setStepsData([{ steps: 0,date: getDateKey(weightFilter,weightOffset) }])
    setWaterData([{ waterIntake: 0,date: getDateKey(weightFilter,weightOffset) }])
    setWeightHistory([])
    setLoading(true)
    try {
      const response = await weightHistoryService.getMyWeightHistory({ pageNumber: 1,pageSize: 30 })
      if (response.statusCode === 200 && response.data && response.data.records) {
        setWeightHistory(response.data.records)
      }
      const dateKey = getDateKey(weightFilter,weightOffset)
      const raw = await AsyncStorage.getItem(`dailyStats_${dateKey}`)
      let waterIntake = 0
      if (raw) {
        const parsed = JSON.parse(raw)
        setStepsData([{ steps: parsed.steps || 0,date: dateKey }])
        if (parsed.waterIntake != null) {
          waterIntake = Number(parsed.waterIntake) || 0
        }
      } else {
        setStepsData([{ steps: 0,date: dateKey }])
      }
      try {
        const waterLogKey = `userWaterLogs_${dateKey}`
        const waterLogRaw = await AsyncStorage.getItem(waterLogKey)
        if (waterLogRaw) {
          const logs = JSON.parse(waterLogRaw)
          if (Array.isArray(logs)) {
            const sum = logs.reduce((acc,log) => acc + (Number(log.amountMl) || 0),0)
            if (sum > 0) waterIntake = sum
          }
        }
      } catch (err) {
      }
      setWaterData([{ waterIntake,date: dateKey }])
      const userId = user?.userId || "unknown"
      const stepKey = `stepcounter_${userId}_${dateKey}`
      const stepRaw = await AsyncStorage.getItem(stepKey)
      if (stepRaw) {
        try {
          const parsed = JSON.parse(stepRaw)
          setStepCounterSteps(Number(parsed.steps) || 0)
        } catch {
          setStepCounterSteps(0)
        }
      } else {
        setStepCounterSteps(0)
      }
    } catch (error) {
      setStepCounterSteps(0)
      showErrorFetchAPI(error)
    } finally {
      setLoading(false)
    }
  }
  const getUserId = () => {
    if (user && typeof user === "object") {
      return user.id || user._id || user.userId || ""
    }
    return ""
  }
  const getStorageKey = () => {
    const userId = getUserId()
    return userId ? `nutritionTarget_${userId}` : "nutritionTarget"
  }
  const getTodayKey = (dateKey) => {
    const userId = getUserId()
    return userId ? `nutritionTarget_${userId}_${dateKey}` : `nutritionTarget_${dateKey}`
  }
  useEffect(() => {
    const loadNutritionTarget = async () => {
      try {
        let filter,offset
        if (activeTab === 0) {
          filter = caloriesFilter
          offset = caloriesOffset
        } else if (activeTab === 1) {
          filter = macrosFilter
          offset = macrosOffset
        } else {
          filter = caloriesFilter
          offset = caloriesOffset
        }
        const dateKey = getDateKey(filter,offset)
        const raw = await AsyncStorage.getItem(getTodayKey(dateKey))
        if (raw) {
          const target = JSON.parse(raw)
          setNutritionTarget({
            calories: isNaN(Number(target.calories)) ? null : Number(target.calories),
            carbs: isNaN(Number(target.carbs)) ? null : Number(target.carbs),
            protein: isNaN(Number(target.protein)) ? null : Number(target.protein),
            fats: isNaN(Number(target.fats)) ? null : Number(target.fats),
          })
        } else {
          setNutritionTarget({ calories: null,carbs: null,protein: null,fats: null })
        }
      } catch (e) {
        console.error("Error loading nutrition target:",e)
      }
    }
    loadNutritionTarget()
  },[activeTab,caloriesFilter,caloriesOffset,macrosFilter,macrosOffset,user?.userId])
  useEffect(() => {
    if (activeTab === 0) {
      fetchCaloriesData()
    } else if (activeTab === 1) {
      fetchMacrosData()
    } else if (activeTab === 2) {
      fetchWeightData()
    }
  },[activeTab,caloriesFilter,caloriesOffset,macrosFilter,macrosOffset,weightFilter,weightOffset])
  useEffect(() => {
    if (activeTab === 0) {
      fetchCaloriesData()
    } else if (activeTab === 1) {
      fetchMacrosData()
    } else if (activeTab === 2) {
      fetchWeightData()
    }
  },[])
  const onRefresh = () => {
    setRefreshing(true)
    if (activeTab === 0) {
      fetchCaloriesData()
    } else if (activeTab === 1) {
      fetchMacrosData()
    } else if (activeTab === 2) {
      fetchWeightData()
    }
    setRefreshing(false)
  }

  const NavigationBoxes = ({ activeTab,setActiveTab }) => (
    <View style={styles.navigationContainer}>
      {[
        { index: 0,title: "Calories",icon: "nutrition-outline" },
        { index: 1,title: "Macros",icon: "pie-chart-outline" },
        { index: 2,title: "Weight",icon: "scale-outline" },
      ].map((item) => (
        <TouchableOpacity
          key={item.index}
          style={[
            styles.navigationBox,
            item.index === 0 && styles.navigationBoxLeft,
            item.index === 2 && styles.navigationBoxRight,
          ]}
          onPress={() => setActiveTab(item.index)}
        >
          <Ionicons
            name={item.icon}
            size={24}
            color={activeTab === item.index ? PRIMARY_COLOR : TEXT_COLOR_MEDIUM}
          />
          <Text
            style={[
              styles.navigationBoxText,
              activeTab === item.index && { color: PRIMARY_COLOR,fontWeight: "700" },
            ]}
          >
            {item.title}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  )
  // Filter component with select dropdown and swipe gesture for day navigation
  const FilterComponent = ({ currentFilter,setFilter,offset,setOffset,showModal,setShowModal }) => {
    // Only enable swipe for Day filter
    const enableSwipe = currentFilter === "Day"
    const panResponder = enableSwipe
      ? PanResponder.create({
        onMoveShouldSetPanResponder: (evt,gestureState) => {
          // Only respond to horizontal swipes
          return Math.abs(gestureState.dx) > 20 && Math.abs(gestureState.dy) < 20
        },
        onPanResponderRelease: (evt,gestureState) => {
          // Đảo ngược: kéo qua phải (dx > 30) là tăng ngày, kéo qua trái (dx < -30) là giảm ngày
          if (gestureState.dx > 30) {
            setOffset(offset - 1)
          } else if (gestureState.dx < -30) {
            setOffset(offset + 1)
          }
        },
      })
      : null
    return (
      <View style={styles.filterContainer} {...(enableSwipe ? panResponder.panHandlers : {})}>
        <View style={styles.filterRow}>
          <TouchableOpacity style={styles.navButton} onPress={() => setOffset(offset - 1)}>
            <Ionicons name="chevron-back" size={24} color={PRIMARY_COLOR} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.selectButton} onPress={() => setShowModal(true)}>
            <Text style={styles.selectButtonText}>{currentFilter}</Text>
            <Ionicons name="chevron-down" size={20} color={PRIMARY_COLOR} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.navButton} onPress={() => setOffset(offset + 1)}>
            <Ionicons name="chevron-forward" size={24} color={PRIMARY_COLOR} />
          </TouchableOpacity>
        </View>
        <Text style={styles.dateDisplay}>{formatDateDisplay(currentFilter,offset)}</Text>
      </View>
    )
  }
  // Calories Tab Content
  const CaloriesTab = () => {
    const panResponder = getFullScreenPanResponder(caloriesFilter,caloriesOffset,setCaloriesOffset)
    return (
      <View style={{ flex: 1 }} {...(panResponder ? panResponder.panHandlers : {})}>
        <ScrollView
          style={styles.tabContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <FilterComponent
            currentFilter={caloriesFilter}
            setFilter={setCaloriesFilter}
            offset={caloriesOffset}
            setOffset={setCaloriesOffset}
            showModal={showCaloriesFilterModal}
            setShowModal={setShowCaloriesFilterModal}
          />
          <SelectModal
            visible={showCaloriesFilterModal}
            onClose={() => setShowCaloriesFilterModal(false)}
            options={filterOptions}
            selected={caloriesFilter}
            onSelect={(value) => {
              setCaloriesFilter(value)
              setCaloriesOffset(0)
              setShowCaloriesFilterModal(false)
            }}
            title="Select Filter"
            theme={{
              titleColor: PRIMARY_COLOR,
              selectedColor: PRIMARY_COLOR,
              optionColor: TEXT_COLOR_DARK,
              iconColor: PRIMARY_COLOR,
            }}
          />
          {loading ? (
            <CommonSkeleton />
          ) : (
            <View style={styles.dataCard}>
              {caloriesData?.caloriesSummary ? (
                <>
                  <View style={styles.circularProgressContainer}>
                    {(() => {
                      const target = nutritionTarget.calories ?? caloriesData.caloriesSummary.target
                      const food =
                        typeof caloriesData.caloriesSummary.net === "number" ? caloriesData.caloriesSummary.net : 0
                      const exercise =
                        typeof caloriesData.caloriesSummary.burned === "number"
                          ? caloriesData.caloriesSummary.burned
                          : 0
                      const percent = target > 0 ? Math.round(((food + exercise) / target) * 100) : 0
                      return (
                        <AnimatedCircularProgress
                          size={120}
                          width={8}
                          fill={percent}
                          tintColor={PRIMARY_COLOR}
                          backgroundColor="#E0E0E0"
                          rotation={0}
                          lineCap="round"
                        >
                          {() => (
                            <View style={styles.progressTextContainer}>
                              <Text style={styles.progressPercent}>{percent}%</Text>
                              <Text style={styles.progressLabel}>Complete</Text>
                            </View>
                          )}
                        </AnimatedCircularProgress>
                      )
                    })()}
                  </View>
                  <View style={styles.calorieStatsContainer}>
                    <View style={styles.calorieStatRow}>
                      <View style={styles.calorieStatItem}>
                        <Text style={styles.calorieStatLabel}>Target</Text>
                        <Text style={[styles.calorieStatValue,{ color: PRIMARY_COLOR }]}>
                          {nutritionTarget.calories ?? caloriesData.caloriesSummary.target ?? "-"}
                        </Text>
                      </View>
                      <View style={styles.calorieStatItem}>
                        <Text style={styles.calorieStatLabel}>Food</Text>
                        <Text style={[styles.calorieStatValue,{ color: "#4CAF50" }]}>
                          {typeof caloriesData.caloriesSummary.net === "number"
                            ? caloriesData.caloriesSummary.net
                            : "-"}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.calorieStatRow}>
                      <View style={styles.calorieStatItem}>
                        <Text style={styles.calorieStatLabel}>Exercise</Text>
                        <Text style={[styles.calorieStatValue,{ color: "#FF9800" }]}>
                          {typeof caloriesData.caloriesSummary.burned === "number"
                            ? caloriesData.caloriesSummary.burned
                            : "-"}
                        </Text>
                      </View>
                      <View style={styles.calorieStatItem}>
                        <Text style={styles.calorieStatLabel}>Remaining</Text>
                        <Text style={[styles.calorieStatValue,{ color: "#F44336" }]}>
                          {(() => {
                            // Always use nutritionTarget.calories if available, fallback to caloriesData.caloriesSummary.target
                            const target = nutritionTarget.calories ?? caloriesData.caloriesSummary.target
                            const food =
                              typeof caloriesData.caloriesSummary.net === "number"
                                ? caloriesData.caloriesSummary.net
                                : 0
                            if (
                              typeof target === "number" &&
                              !isNaN(target) &&
                              typeof food === "number" &&
                              !isNaN(food)
                            ) {
                              const remain = target - food
                              return remain === 0 ? 0 : remain
                            }
                            return "-"
                          })()}
                        </Text>
                      </View>
                    </View>
                  </View>
                </>
              ) : (
                <View style={styles.noDataContainer}>
                  <Ionicons name="nutrition-outline" size={48} color="#E0E0E0" />
                  <Text style={styles.noDataText}>No calories data for this {caloriesFilter.toLowerCase()}</Text>
                </View>
              )}
            </View>
          )}
          <TouchableOpacity style={styles.createTargetBtn} onPress={() => navigation.navigate("NutritionTargetScreen")}>
            <LinearGradient
              colors={["#0056d2","#0056d2"]}
              start={{ x: 0,y: 0 }}
              end={{ x: 1,y: 0 }}
              style={styles.createTargetBtnGradient}
            >
              <Text style={styles.createTargetBtnText}>Set Nutrition Target</Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </View>
    )
  }
  // Macros Tab Content
  const MacrosTab = () => {
    const panResponder = getFullScreenPanResponder(macrosFilter,macrosOffset,setMacrosOffset)
    return (
      <View style={{ flex: 1 }} {...(panResponder ? panResponder.panHandlers : {})}>
        <ScrollView
          style={styles.tabContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <FilterComponent
            currentFilter={macrosFilter}
            setFilter={setMacrosFilter}
            offset={macrosOffset}
            setOffset={setMacrosOffset}
            showModal={showMacrosFilterModal}
            setShowModal={setShowMacrosFilterModal}
          />
          <SelectModal
            visible={showMacrosFilterModal}
            onClose={() => setShowMacrosFilterModal(false)}
            options={filterOptions}
            selected={macrosFilter}
            onSelect={(value) => {
              setMacrosFilter(value)
              setMacrosOffset(0)
              setShowMacrosFilterModal(false)
            }}
            title="Select Filter"
            theme={{
              titleColor: PRIMARY_COLOR,
              selectedColor: PRIMARY_COLOR,
              optionColor: TEXT_COLOR_DARK,
              iconColor: PRIMARY_COLOR,
            }}
          />
          {loading ? (
            <>
              <CommonSkeleton />
            </>
          ) : (
            <>
              {macrosData?.macros ? (
                <>
                  <View style={styles.dataCard}>
                    <Text style={styles.cardTitle}>Today's Macros</Text>
                    <View style={styles.macrosContainer}>
                      {["carbs","protein","fats"].map((macro,index) => {
                        const value = macrosData.macros[macro] || 0
                        const target = nutritionTarget[macro] || 0
                        const percent = target > 0 ? Math.round((value / target) * 100) : 0
                        const colors_macro = ["#FF6B6B",PRIMARY_COLOR,"#45B7D1"]
                        return (
                          <View key={macro} style={styles.macroItem}>
                            <AnimatedCircularProgress
                              size={80}
                              width={6}
                              fill={percent}
                              tintColor={colors_macro[index]}
                              backgroundColor="#E0E0E0"
                              rotation={0}
                              lineCap="round"
                            >
                              {() => (
                                <View style={styles.macroProgressText}>
                                  <Text style={[styles.macroPercent,{ color: colors_macro[index] }]}>{percent}%</Text>
                                </View>
                              )}
                            </AnimatedCircularProgress>
                            <Text style={styles.macroLabel}>{macro.charAt(0).toUpperCase() + macro.slice(1)}</Text>
                            <Text style={styles.macroValue}>
                              {value}g / {target}g
                            </Text>
                          </View>
                        )
                      })}
                    </View>
                  </View>
                  {macroAdvice && (
                    <View style={styles.dataCard}>
                      <View style={styles.adviceHeader}>
                        <Ionicons name="bulb-outline" size={20} color="#FF9800" />
                        <Text style={[styles.cardTitle,{ color: "#FF9800",marginLeft: 8 }]}>AI Health Advice</Text>
                      </View>
                      <Text style={styles.adviceText}>{macroAdvice}</Text>
                    </View>
                  )}
                </>
              ) : (
                <View style={styles.dataCard}>
                  <View style={styles.noDataContainer}>
                    <Ionicons name="pie-chart-outline" size={48} color="#E0E0E0" />
                    <Text style={styles.noDataText}>No macros data for this {macrosFilter.toLowerCase()}</Text>
                  </View>
                </View>
              )}
            </>
          )}
        </ScrollView>
      </View>
    )
  }
  // Weight Tab Content
  const WeightTab = () => {
    const panResponder = getFullScreenPanResponder(weightFilter,weightOffset,setWeightOffset)
    // Calculate total water intake (sum all waterData entries)
    const totalWaterIntake =
      waterData && Array.isArray(waterData)
        ? waterData.reduce((sum,entry) => sum + (Number(entry.waterIntake) || 0),0)
        : 0
    // Log water intake for debugging
    return (
      <View style={{ flex: 1 }} {...(panResponder ? panResponder.panHandlers : {})}>
        <ScrollView
          style={styles.tabContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <FilterComponent
            currentFilter={weightFilter}
            setFilter={setWeightFilter}
            offset={weightOffset}
            setOffset={setWeightOffset}
            showModal={showWeightFilterModal}
            setShowModal={setShowWeightFilterModal}
          />
          <SelectModal
            visible={showWeightFilterModal}
            onClose={() => setShowWeightFilterModal(false)}
            options={filterOptions}
            selected={weightFilter}
            onSelect={(value) => {
              setWeightFilter(value)
              setWeightOffset(0)
              setShowWeightFilterModal(false)
            }}
            title="Select Filter"
            theme={{
              titleColor: PRIMARY_COLOR,
              selectedColor: PRIMARY_COLOR,
              optionColor: TEXT_COLOR_DARK,
              iconColor: PRIMARY_COLOR,
            }}
          />
          {loading ? (
            <>
              <CommonSkeleton />
            </>
          ) : (
            <>
              {/* Weight Chart */}
              <View style={styles.dataCard}>
                <View style={styles.chartHeader}>
                  <Text style={styles.cardTitle}>Weight Progress</Text>
                  <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate("WeightHistory")}>
                    <LinearGradient
                      colors={["#0056d2","#0056d2"]}
                      start={{ x: 0,y: 0 }}
                      end={{ x: 1,y: 0 }}
                      style={styles.addButtonGradient}
                    >
                      <Ionicons name="add" size={20} color="#FFFFFF" />
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
                {weightHistory.length > 0 ? (
                  <LineChart
                    data={{
                      labels: weightHistory.slice(-7).map((item) => {
                        const d = new Date(item.recordedAt)
                        return d.toLocaleDateString("en-US",{ month: "short",day: "numeric" })
                      }),
                      datasets: [{ data: weightHistory.slice(-7).map((item) => Number(item.weight)) }],
                    }}
                    width={SCREEN_WIDTH - 64}
                    height={200}
                    yAxisSuffix=" kg"
                    chartConfig={{
                      backgroundColor: "#FFFFFF",
                      backgroundGradientFrom: "#FFFFFF",
                      backgroundGradientTo: "#FFFFFF",
                      decimalPlaces: 1,
                      color: (opacity = 1) => PRIMARY_COLOR,
                      labelColor: (opacity = 1) => TEXT_COLOR_DARK,
                      style: { borderRadius: 0 },
                      propsForDots: { r: "4",strokeWidth: "0.5",stroke: PRIMARY_COLOR },
                      propsForBackgroundLines: { stroke: "#E0E0E0" },
                      propsForLabels: {},
                      propsForHorizontalLabels: {},
                      propsForVerticalLabels: {},
                      propsForLine: { strokeWidth: 0.5 },
                    }}
                    bezier
                    style={styles.chart}
                  />
                ) : (
                  <View style={styles.noDataContainer}>
                    <Ionicons name="scale-outline" size={48} color="#E0E0E0" />
                    <Text style={styles.noDataText}>No weight data available</Text>
                  </View>
                )}
              </View>
              {/* Steps Circular Progress */}
              <View style={styles.dataCard}>
                <Text style={styles.cardTitle}>Steps Today</Text>
                <View style={styles.circularProgressContainer}>
                  {(() => {
                    // Use stepCounterSteps if available, fallback to stepsData
                    const steps =
                      stepCounterSteps !== null && stepCounterSteps !== undefined
                        ? stepCounterSteps
                        : stepsData[0]?.steps || 0
                    const target = 10000 // Default step target
                    const percent = Math.round((steps / target) * 100)
                    return (
                      <AnimatedCircularProgress
                        size={120}
                        width={8}
                        fill={percent}
                        tintColor="#4CAF50"
                        backgroundColor="#E0E0E0"
                        rotation={0}
                        lineCap="round"
                      >
                        {() => (
                          <View style={styles.progressTextContainer}>
                            <Text style={[styles.progressValue,{ color: "#4CAF50" }]}>{steps.toLocaleString()}</Text>
                            <Text style={styles.progressLabel}>steps</Text>
                          </View>
                        )}
                      </AnimatedCircularProgress>
                    )
                  })()}
                </View>
              </View>
              {/* Water Bar Chart - show total water intake */}
              <View style={styles.dataCard}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 16,
                  }}
                >
                  <Text style={styles.cardTitle}>Water Intake</Text>
                  <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate("UserWaterLog")}>
                    <LinearGradient
                      colors={["#0056d2","#0056d2"]}
                      start={{ x: 0,y: 0 }}
                      end={{ x: 1,y: 0 }}
                      style={styles.addButtonGradient}
                    >
                      <Ionicons name="add" size={20} color="#FFFFFF" />
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
                {/* Tổng lượng nước uống mọi thời gian */}
                {/* <View style={{alignItems:'center',marginBottom:8}}>
                  <Text style={{fontWeight:'900',fontSize:20,color:'#1976D2',letterSpacing:0.5}}>Total Water Intake: {allTimeTotalIntake} ml</Text>
                </View> */}
                {totalWaterIntake > 0 ? (
                  <BarChart
                    data={{
                      labels: ["Total"],
                      datasets: [{ data: [totalWaterIntake] }],
                    }}
                    width={SCREEN_WIDTH - 64}
                    height={180}
                    yAxisSuffix=" ml"
                    chartConfig={{
                      backgroundColor: "#FFFFFF",
                      backgroundGradientFrom: "#FFFFFF",
                      backgroundGradientTo: "#FFFFFF",
                      decimalPlaces: 0,
                      color: (opacity = 1) => PRIMARY_COLOR,
                      labelColor: (opacity = 1) => TEXT_COLOR_DARK,
                      style: { borderRadius: 0 },
                      propsForBackgroundLines: { stroke: "#E0E0E0" },
                      propsForLabels: {},
                      propsForHorizontalLabels: {},
                      propsForVerticalLabels: {},
                      barPercentage: 0.7,
                      fillShadowGradient: PRIMARY_COLOR,
                      fillShadowGradientOpacity: 1,
                    }}
                    style={styles.chart}
                    fromZero
                    showBarTops
                    showValuesOnTopOfBars
                  />
                ) : (
                  <View style={styles.noDataContainer}>
                    <Ionicons name="water-outline" size={48} color="#E0E0E0" />
                    <Text style={styles.noDataText}>No water data available</Text>
                  </View>
                )}
              </View>
            </>
          )}
        </ScrollView>
      </View>
    )
  }
  return (
    <View style={styles.container}>
      <Header title="Weekly Progress" onBack={navigation.goBack} />
      {/* Navigation Boxes */}
      <NavigationBoxes activeTab={activeTab} setActiveTab={setActiveTab} />
      {/* Tab Content */}
      <View style={styles.contentContainer}>
        {activeTab === 0 && <CaloriesTab />}
        {activeTab === 1 && <MacrosTab />}
        {activeTab === 2 && <WeightTab />}
      </View>
    </View>
  )
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND_COLOR,
  },
  navigationContainer: {
    flexDirection: "row",
    paddingTop: 4,
    backgroundColor: "#FFFFFF", // White background for the tab bar
    borderBottomLeftRadius: 20, // Rounded bottom corners
    borderBottomRightRadius: 20,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0,height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
    marginTop: 120, // Adjust to sit below the header
  },
  navigationBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 5,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  navigationBoxText: {
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
    color: TEXT_COLOR_MEDIUM,
    fontWeight: "500",
  },
  navigationBoxLeft: {
    borderTopLeftRadius: 20, // Rounded top-left for the first tab
    borderBottomLeftRadius: 20,
  },
  navigationBoxRight: {
    borderTopRightRadius: 20, // Rounded top-right for the last tab
    borderBottomRightRadius: 20,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: BACKGROUND_COLOR
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: 16, // Add horizontal padding
    paddingTop: 20, // Add top padding
  },
  filterContainer: {
    marginBottom: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 16, // Rounded corners
    paddingVertical: 12, // Vertical padding
    paddingHorizontal: 16, // Horizontal padding
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0,height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between", // Space between elements
    marginBottom: 8,
  },
  selectButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9", // Light background for the button
    borderWidth: 1,
    borderColor: "#E2E8F0", // Light border
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12, // More rounded
    minWidth: 120, // Wider button
    justifyContent: "center",
  },
  selectButtonText: {
    fontSize: 16,
    color: PRIMARY_COLOR,
    fontWeight: "600",
    marginRight: 4,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20, // Circular button
    backgroundColor: "#E3F2FD", // Light blue background
    alignItems: "center",
    justifyContent: "center",
  },
  dateDisplay: {
    textAlign: "center",
    fontSize: 18, // Larger font
    fontWeight: "700", // Bolder
    color: TEXT_COLOR_DARK,
    marginTop: 8,
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
    width: "80%",
    maxHeight: "60%",
    padding: 20,
    borderRadius: 16, // Rounded corners
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
  modalTitle: {
    fontSize: 20, // Larger title
    fontWeight: "700",
    color: TEXT_COLOR_DARK,
    marginBottom: 16,
    textAlign: "center",
  },
  modalOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  modalOptionText: {
    fontSize: 16,
    fontWeight: "500",
    color: TEXT_COLOR_DARK,
  },
  modalCloseButton: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#F1F5F9", // Light background
    borderRadius: 12, // Rounded corners
  },
  modalCloseText: {
    fontSize: 16,
    color: TEXT_COLOR_MEDIUM,
    fontWeight: "600",
  },
  dataCard: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    marginBottom: 16,
    borderRadius: 16, // Rounded corners
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0,height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    color: PRIMARY_COLOR,
  },
  circularProgressContainer: {
    alignItems: "center",
    marginVertical: 20,
  },
  progressTextContainer: {
    alignItems: "center",
  },
  progressPercent: {
    fontSize: 24, // Larger percent
    fontWeight: "800", // Bolder
    color: PRIMARY_COLOR,
  },
  progressValue: {
    fontSize: 20, // Larger value
    fontWeight: "600",
  },
  progressLabel: {
    fontSize: 14,
    marginTop: 2,
    color: TEXT_COLOR_LIGHT,
    fontWeight: "500",
  },
  calorieStatsContainer: {
    marginTop: 20,
  },
  calorieStatRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12, // Reduced margin
  },
  calorieStatItem: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#F8FAFC", // Lighter background for items
    padding: 16,
    marginHorizontal: 4,
    borderRadius: 12, // Rounded corners
    borderWidth: 1,
    borderColor: "#E2E8F0", // Subtle border
  },
  calorieStatLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 4,
    color: TEXT_COLOR_MEDIUM,
  },
  calorieStatValue: {
    fontSize: 20, // Larger value
    fontWeight: "700",
  },
  macrosContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginVertical: 20,
  },
  macroItem: {
    alignItems: "center",
  },
  macroProgressText: {
    alignItems: "center",
  },
  macroPercent: {
    fontSize: 16, // Slightly larger percent
    fontWeight: "600",
  },
  macroLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginTop: 8,
    color: TEXT_COLOR_DARK,
  },
  macroValue: {
    fontSize: 12,
    marginTop: 2,
    color: TEXT_COLOR_LIGHT,
    fontWeight: "500",
  },
  adviceHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    justifyContent: "center",
  },
  adviceText: {
    fontSize: 15,
    lineHeight: 22,
    color: TEXT_COLOR_MEDIUM,
    fontWeight: "400",
    textAlign: "justify",
  },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20, // Circular button
    overflow: "hidden", // For gradient
    ...Platform.select({
      ios: {
        shadowColor: PRIMARY_COLOR,
        shadowOffset: { width: 0,height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  addButtonGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  chart: {
    borderRadius: 12, // Rounded corners for charts
    marginVertical: 10,
  },
  noDataContainer: {
    alignItems: "center",
    paddingVertical: 40,
    backgroundColor: "#F8FAFC", // Light background
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  noDataText: {
    fontSize: 16,
    marginTop: 12,
    textAlign: "center",
    color: TEXT_COLOR_LIGHT,
    fontWeight: "500",
  },
  createTargetBtn: {
    borderRadius: 12, // Rounded corners
    overflow: "hidden", // For gradient
    marginTop: 20,
    marginBottom: 20, // Add bottom margin
    ...Platform.select({
      ios: {
        shadowColor: PRIMARY_COLOR,
        shadowOffset: { width: 0,height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  createTargetBtnGradient: {
    alignItems: "center",
    paddingVertical: 16,
  },
  createTargetBtnText: {
    color: "#FFFFFF",
    fontSize: 18, // Larger font
    fontWeight: "700", // Bolder
  },
  loader: {
    marginTop: 40,
  },
})
