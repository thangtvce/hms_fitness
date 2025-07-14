
import React, { useState, useEffect, useContext, useRef } from "react"
import { LineChart } from "react-native-chart-kit"
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Animated } from "react-native"
import { showErrorFetchAPI, showSuccessMessage } from "utils/toastUtil";
import Loading from "components/Loading";
import { Ionicons } from "@expo/vector-icons"
import { AnimatedCircularProgress } from "react-native-circular-progress"
import AsyncStorage from "@react-native-async-storage/async-storage"
import workoutService from "services/apiWorkoutService"
import { LinearGradient } from "expo-linear-gradient"
import { AuthContext } from "context/AuthContext"
import FloatingMenuButton from "components/FloatingMenuButton"
import { StatusBar } from "expo-status-bar"
import { SafeAreaView } from "react-native-safe-area-context"
import { Accelerometer } from "expo-sensors"

const { width, height } = Dimensions.get("window")
const CIRCLE_SIZE = 220

const RollingCounter = ({ value, style, duration = 800 }) => {
  const [displayValue, setDisplayValue] = useState(0)
  const animValue = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const numValue = Number(value) || 0
    if (numValue !== displayValue) {
      Animated.timing(animValue, {
        toValue: 1,
        duration: duration,
        useNativeDriver: false,
      }).start(() => {
        animValue.setValue(0)
      })

      const startValue = displayValue
      const difference = numValue - startValue

      const steps = Math.min(Math.abs(difference), 30)
      if (steps === 0) {
        setDisplayValue(numValue)
        return
      }

      const stepDuration = duration / steps
      let currentStep = 0

      // Chạy hiệu ứng linear, không dùng easing nữa
      const interval = setInterval(() => {
        currentStep++
        const progress = currentStep / steps
        const newValue = Math.round(startValue + difference * progress)
        setDisplayValue(newValue)

        if (currentStep >= steps) {
          clearInterval(interval)
          setDisplayValue(numValue)
        }
      }, stepDuration)

      return () => clearInterval(interval)
    }
  }, [value, displayValue, duration])

  return <Animated.Text style={style}>{displayValue.toLocaleString()}</Animated.Text>
}

const StepCounterScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext)

  const getTodayStr = () => {
    const d = new Date()
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`
  }

  const [steps, setSteps] = useState(0)
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState(null)
  const [lastStepTime, setLastStepTime] = useState(null)
  const [calories, setCalories] = useState(0)
  const [distance, setDistance] = useState(0)
  const [target, setTarget] = useState(10000)
  const [stepHistory, setStepHistory] = useState([])
  const [selectedDate, setSelectedDate] = useState(getTodayStr())
  const [historyRange, setHistoryRange] = useState("1W")
  const [streak, setStreak] = useState(0)

  const fadeAnim = useRef(new Animated.Value(0)).current
  const scaleAnim = useRef(new Animated.Value(0.8)).current
  const slideAnim = useRef(new Animated.Value(50)).current
  const pulseAnim = useRef(new Animated.Value(1)).current

  // Animate entrance
  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 40,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start()
  }, [])

  // Calculate calories, distance
  React.useEffect(() => {
    const distanceKm = (Number(steps) * 0.762) / 1000
    setDistance(distanceKm)

    let calPerStep = 0.04
    if (user && user.gender) {
      if (user.gender.toLowerCase() === "female" || user.gender.toLowerCase() === "nữ") calPerStep = 0.03
    }
    const caloriesBurned = Math.round(Number(steps) * calPerStep)
    setCalories(caloriesBurned)
  }, [steps, user])

  // Continuous pulse animation (linear, không dùng Easing)
  React.useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.02,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ]),
    )
    pulseAnimation.start()
    return () => pulseAnimation.stop()
  }, [])

  const handleSaveSession = async () => {
    try {
      const userId = user?.userId || "unknown"
      const todayKey = `stepcounter_${userId}_${getTodayStr()}`
      const data = await AsyncStorage.getItem(todayKey)
      let parsed = { 
        steps: Number(steps), 
        duration: Number(duration), 
        lastStepTime, 
        date: new Date().toISOString(), 
        userId, 
        target: Number(target) 
      }
      if (data) {
        parsed = { ...parsed, ...JSON.parse(data) }
      }

      const now = new Date()
      const workoutSession = {
        UserId: userId,
        StartTime: parsed.lastStepTime ? new Date(parsed.lastStepTime).toISOString() : now.toISOString(),
        EndTime: now.toISOString(),
        Steps: Number(parsed.steps) || 0,
        DistanceKm: Number(distance) || 0,
        CaloriesBurned: Number(calories) || 0,
        TotalCaloriesBurned: Number(calories) || 0,
        TotalDurationMinutes: Math.round(Number(parsed.duration) / 60) || 0,
        Location: "",
        GoalStatus: "Not Started",
        IsSummary: true,
        RecordedAt: now.toISOString(),
        ExerciseId: 12,
        SessionId: 12,
      }

      const activity = {
        UserId: userId,
        ExerciseId: 12,
        ActivityType: 1,
        SessionId: 6,
        Steps: Number(parsed.steps) || 0,
        DistanceKm: Number(distance) || 0,
        CaloriesBurned: Number(calories) || 0,
        DurationMinutes: Math.round(Number(parsed.duration) / 60) || 0,
        Location: "",
        GoalStatus: "Not Started",
        IsSummary: true,
        RecordedAt: now.toISOString(),
      }

      await workoutService.createWorkoutSession(workoutSession)
      await workoutService.createActivity(activity)
      showSuccessMessage("Step data saved successfully!")
    } catch (err) {
      showErrorFetchAPI(err.message || "Unable to save data")
    }
  }

  const formatDuration = (seconds) => {
    const totalSeconds = Number(seconds) || 0
    const hrs = Math.floor(totalSeconds / 3600)
    const mins = Math.floor((totalSeconds % 3600) / 60)
    const secs = totalSeconds % 60
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const formatDistance = (km) => {
    const distance = Number(km) || 0
    return distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(2)}km`
  }

  // Load saved data and calculate streak
  useEffect(() => {
    const load = async () => {
      try {
        const userId = user?.userId || "unknown"
        const todayKey = `stepcounter_${userId}_${getTodayStr()}`
        const data = await AsyncStorage.getItem(todayKey)
        if (data) {
          const parsed = JSON.parse(data)
          setSteps(Number(parsed.steps) || 0)
          setDuration(Number(parsed.duration) || 0)
          setLastStepTime(parsed.lastStepTime || null)
          setTarget(Number(parsed.target) || 10000)
        }

        // Load step history
        const history = []
        for (let i = 0; i < 7; i++) {
          const d = new Date()
          d.setDate(d.getDate() - i)
          const dateStr = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`
          const key = `stepcounter_${userId}_${dateStr}`
          const val = await AsyncStorage.getItem(key)
          if (val) {
            try {
              const parsed = JSON.parse(val)
              history.push({ 
                date: dateStr, 
                steps: Number(parsed.steps) || 0, 
                target: Number(parsed.target) || 10000 
              })
            } catch {
              history.push({ date: dateStr, steps: 0, target: 10000 })
            }
          } else {
            history.push({ date: dateStr, steps: 0, target: 10000 })
          }
        }
        setStepHistory(history.reverse())

        // Calculate streak
        let streakCount = 0
        for (let i = 0; i < 365; i++) {
          const d = new Date()
          d.setDate(d.getDate() - i)
          const dateStr = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`
          const key = `stepcounter_${userId}_${dateStr}`
          const val = await AsyncStorage.getItem(key)
          let stepsForDay = 0
          if (val) {
            try {
              const parsed = JSON.parse(val)
              stepsForDay = Number(parsed.steps) || 0
            } catch {}
          }
          if (stepsForDay > 0) {
            streakCount++
          } else {
            break
          }
        }
        setStreak(streakCount)
      } catch (err) {
      }
    }
    load()
  }, [user])

  // Save data on change
  useEffect(() => {
    const userId = user?.userId || "unknown"
    const todayKey = `stepcounter_${userId}_${getTodayStr()}`
    const saveData = { 
      steps: Number(steps), 
      duration: Number(duration), 
      lastStepTime, 
      date: new Date().toISOString(), 
      userId, 
      target: Number(target) 
    }
    AsyncStorage.setItem(todayKey, JSON.stringify(saveData))

    const updateStreak = async () => {
      let streakCount = 0
      for (let i = 0; i < 365; i++) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const dateStr = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`
        const key = `stepcounter_${userId}_${dateStr}`
        const val = await AsyncStorage.getItem(key)
        let stepsForDay = 0
        if (val) {
          try {
            const parsed = JSON.parse(val)
            stepsForDay = Number(parsed.steps) || 0
          } catch {}
        }
        if (stepsForDay > 0) {
          streakCount++
        } else {
          break
        }
      }
      setStreak(streakCount)
    }
    updateStreak()

    return () => {
      AsyncStorage.setItem(todayKey, JSON.stringify(saveData))
    }
  }, [steps, duration, lastStepTime, target])

  // Step counting with accelerometer
  useEffect(() => {
    let prev = { x: 0, y: 0, z: 0, mag: 0 }
    let prevStepTime = lastStepTime || 0
    let _steps = Number(steps) || 0
    let _duration = Number(duration) || 0
    let _lastStepTime = lastStepTime
    let sub = null

    const threshold = 0.5
    const minStepInterval = 250
    const minMove = 0.08

    const start = async () => {
      try {
        const { status } = await Accelerometer.requestPermissionsAsync()
        if (status !== "granted") {
          setError("Accelerometer permission denied")
          return
        }

        const available = await Accelerometer.isAvailableAsync()
        if (!available) {
          setError("Accelerometer not available")
          return
        }

        Accelerometer.setUpdateInterval(100)
        sub = Accelerometer.addListener((accelData) => {
          const { x, y, z } = accelData
          const mag = Math.sqrt(x * x + y * y + z * z)
          const now = Date.now()
          const deltaMag = Math.abs(mag - prev.mag)
          const deltaVec = Math.sqrt(
            Math.pow(x - prev.x, 2) + 
            Math.pow(y - prev.y, 2) + 
            Math.pow(z - prev.z, 2)
          )

          if (deltaMag > threshold && deltaVec > minMove && now - prevStepTime > minStepInterval) {
            _steps = _steps + 1
            setSteps((s) => {
              const newSteps = Number(s) + 1
              return newSteps
            })
            if (!prevStepTime || now - prevStepTime > 1000) {
              _duration = _duration + 1
              setDuration((d) => {
                const newDuration = Number(d) + 1
                return newDuration
              })
            }
            prevStepTime = now
            _lastStepTime = now
            setLastStepTime(now)
          }
          prev = { x, y, z, mag }
        })
      } catch (e) {
        setError("Accelerometer error")
      }
    }

    start()
    return () => {
      if (sub) sub.remove()
    }
  }, [])

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.errorContainer}>
          <View style={styles.errorIcon}>
            <Ionicons name="alert-circle-outline" size={48} color="#FF6B6B" />
          </View>
          <Text style={styles.errorTitle}>Step Counter Unavailable</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </SafeAreaView>
    )
  }

  const currentSteps = Number(steps) || 0
  const currentTarget = Number(target) || 10000
  const progressPercentage = Math.min(100, Math.round((currentSteps / currentTarget) * 100))

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Modern Header */}
      <View style={styles.modernHeader}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#2D3748" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Step Counter</Text>
        <View style={styles.headerSpacer} />
      </View>

      <Animated.ScrollView
        style={[styles.container, { opacity: fadeAnim }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Streak Badge */}
        <Animated.View style={[styles.streakBadge, { transform: [{ translateY: slideAnim }] }]}>
          <LinearGradient
            colors={["#FF8A80", "#FF5722"]}
            style={styles.streakGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="flame" size={18} color="#FFFFFF" />
            <Text style={styles.streakText}>{Number(streak)} day streak</Text>
          </LinearGradient>
        </Animated.View>

        {/* Main Progress Circle */}
        <Animated.View
          style={[
            styles.progressContainer,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <LinearGradient
              colors={["#FFFFFF", "#F8FAFC"]}
              style={styles.progressCircle}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <AnimatedCircularProgress
                size={CIRCLE_SIZE}
                width={14}
                fill={progressPercentage}
                tintColor="#0056d2"
                backgroundColor="#E2E8F0"
                rotation={0}
                lineCap="round"
              />
              <View style={styles.progressContent}>
                <RollingCounter value={currentSteps} style={styles.stepCount} duration={600} />
                <Text style={styles.stepLabel}>steps</Text>
                <Text style={styles.progressPercent}>
                  <Text style={{color: '#0056d2'}}>{progressPercentage}%</Text>
                  <Text style={{color: '#0056d2'}}> of goal</Text>
                </Text>
              </View>
            </LinearGradient>
          </Animated.View>
        </Animated.View>

        {/* Target Controls */}
        <Animated.View style={[styles.targetContainer, { transform: [{ translateY: slideAnim }] }]}>
          <Text style={styles.targetLabel}>Steps</Text>
          <View style={styles.targetControls}>
            <TouchableOpacity 
              style={styles.targetButton} 
              onPress={() => setTarget((t) => Math.max(1000, Number(t) - 500))}
            >
              <Ionicons name="remove" size={20} color="#6B7280" />
            </TouchableOpacity>
            <View style={styles.targetDisplay}>
              <Text style={styles.targetValue}>{currentTarget.toLocaleString()}</Text>
            </View>
            <TouchableOpacity 
              style={styles.targetButton} 
              onPress={() => setTarget((t) => Math.min(50000, Number(t) + 500))}
            >
              <Ionicons name="add" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Stats Grid */}
        <Animated.View style={[styles.statsContainer, { transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: "#EBF4FF" }]}>
              <Ionicons name="time-outline" size={20} color="#3B82F6" />
            </View>
            <Text style={styles.statValue}>{formatDuration(duration)}</Text>
            <Text style={styles.statLabel}>Duration</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: "#FEF2F2" }]}>
              <Ionicons name="flame-outline" size={20} color="#EF4444" />
            </View>
            <RollingCounter value={Number(calories)} style={styles.statValue} duration={400} />
            <Text style={styles.statLabel}>Calories</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: "#F0FDF4" }]}>
              <Ionicons name="location-outline" size={20} color="#10B981" />
            </View>
            <Text style={styles.statValue}>{formatDistance(distance)}</Text>
            <Text style={styles.statLabel}>Distance</Text>
          </View>
        </Animated.View>

        {/* Action Buttons */}
        <Animated.View style={[styles.actionContainer, { transform: [{ translateY: slideAnim }] }]}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => {
              const userId = user?.userId || "unknown"
              const todayStr = getTodayStr()
              const todayKey = `stepcounter_${userId}_${todayStr}`
              AsyncStorage.getItem(todayKey).then((data) => {
                let parsed = { 
                  steps: Number(steps), 
                  duration: Number(duration), 
                  lastStepTime, 
                  date: new Date().toISOString(), 
                  userId, 
                  target: Number(target) 
                }
                if (data) {
                  try {
                    parsed = { ...parsed, ...JSON.parse(data) }
                  } catch {}
                }
                parsed.target = Number(target)
                AsyncStorage.setItem(todayKey, JSON.stringify(parsed)).then(() => {
                  setStepHistory((prev) => {
                    const updated = prev.map((item) => 
                      item.date === todayStr ? { ...item, target: Number(target) } : item
                    )
                    return updated
                  })
                })
              })
            }}
          >
            <LinearGradient
              colors={["#8B5CF6", "#7C3AED"]}
              style={styles.buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="flag-outline" size={24} color="#FFFFFF" />
              <Text style={styles.buttonText}>Save Goal</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.primaryButton} onPress={handleSaveSession}>
            <LinearGradient
              colors={["#3B82F6", "#2563EB"]}
              style={styles.buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="cloud-upload-outline" size={20} color="#FFFFFF" />
              <Text style={styles.buttonText}>Save Data</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* History Section */}
        <Animated.View style={[styles.historySection, { transform: [{ translateY: slideAnim }] }]}>
          <Text style={styles.sectionTitle}>Step History</Text>

          {/* Range Filter */}
          <View style={styles.filterContainer}>
            {["1D", "3D", "1W", "3M", "6M", "1Y"].map((range) => (
              <TouchableOpacity
                key={range}
                style={[styles.filterButton, historyRange === range && styles.filterButtonActive]}
                onPress={() => setHistoryRange(range)}
              >
                <Text style={[styles.filterText, historyRange === range && styles.filterTextActive]}>
                  {range}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Selected Date Info */}
          {(() => {
            const todayStr = getTodayStr();
            const [selectedInfo, setSelectedInfo] = React.useState(null);
            React.useEffect(() => {
              let isMounted = true;
              const fetchSelected = async () => {
                if (!selectedDate || !user) {
                  if (isMounted) setSelectedInfo(null);
                  return;
                }
                // Nếu là ngày hôm nay, lấy trực tiếp từ state steps/target
                if (selectedDate === todayStr) {
                  if (isMounted) setSelectedInfo({
                    steps: Number(steps) || 0,
                    target: Number(target) || 10000,
                    date: selectedDate
                  });
                  return;
                }
                const userId = user?.userId || "unknown";
                const key = `stepcounter_${userId}_${selectedDate}`;
                try {
                  const val = await AsyncStorage.getItem(key);
                  if (val) {
                    const parsed = JSON.parse(val);
                    if (isMounted) {
                      setSelectedInfo({
                        steps: Number(parsed.steps) || 0,
                        target: Number(parsed.target) || 10000,
                        date: selectedDate
                      });
                    }
                  } else {
                    if (isMounted) setSelectedInfo({ steps: 0, target: 10000, date: selectedDate });
                  }
                } catch {
                  if (isMounted) setSelectedInfo({ steps: 0, target: 10000, date: selectedDate });
                }
              };
              fetchSelected();
              return () => { isMounted = false; };
            }, [selectedDate, user, steps, target]);
            if (!selectedInfo) return null;
            const selectedSteps = selectedInfo.steps;
            const selectedTarget = selectedInfo.target;
            const selectedPercentage = Math.min(100, Math.round((selectedSteps / selectedTarget) * 100));
            return (
              <View style={styles.selectedDateCard}>
                <Text style={styles.selectedSteps}>
                  {selectedSteps.toLocaleString()} / {selectedTarget.toLocaleString()}
                </Text>
                <Text style={styles.selectedDate}>steps on {selectedInfo.date}</Text>
                <Text style={styles.selectedPercent}>
                  {selectedPercentage}% of goal
                </Text>
              </View>
            );
          })()}

          {/* Chart */}
          <View style={styles.chartContainer}>
            <LineChart
              data={{
                labels:
                  getFilteredHistory(stepHistory, historyRange).length > 0
                    ? getFilteredHistory(stepHistory, historyRange).map((item) => item.date.slice(5))
                    : [""],
                datasets: [
                  {
                    data:
                      getFilteredHistory(stepHistory, historyRange).length > 0
                        ? getFilteredHistory(stepHistory, historyRange).map((item) => Number(item.steps) || 0)
                        : [0],
                    color: (opacity = 1) => `rgba(0, 86, 210, ${opacity})`,
                    strokeWidth: 2,
                  },
                  {
                    data:
                      getFilteredHistory(stepHistory, historyRange).length > 0
                        ? getFilteredHistory(stepHistory, historyRange).map((item) => Number(item.target) || 10000)
                        : [10000],
                    color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`, // #10B981
                    strokeWidth: 2,
                    strokeDashArray: [5, 5],
                  },
                ],
                legend: ["Steps", "Goal"],
              }}
              width={width - 48}
              height={200}
              yAxisSuffix=""
              yAxisInterval={1}
              chartConfig={{
                backgroundColor: "#FFFFFF",
                backgroundGradientFrom: "#FFFFFF",
                backgroundGradientTo: "#FFFFFF",
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(0, 86, 210, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(45, 55, 72, ${opacity})`,
                style: { borderRadius: 12 },
                propsForDots: [
                  { r: "3", strokeWidth: "2", stroke: "#0056d2" }, // Steps
                  { r: "3", strokeWidth: "2", stroke: "#10B981" }, // Goal
                ],
                propsForBackgroundLines: {
                  strokeDasharray: "",
                  stroke: "#E2E8F0",
                  strokeWidth: 1,
                },
              }}
              bezier
              style={styles.chart}
              withShadow={false}
              withInnerLines={true}
              withOuterLines={false}
            />
          </View>
        </Animated.View>

        {/* Tips Card */}
        <Animated.View style={[styles.tipsCard, { transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.tipsHeader}>
            <View style={styles.tipsIcon}>
              <Ionicons name="bulb-outline" size={18} color="#F59E0B" />
            </View>
            <Text style={styles.tipsTitle}>Daily Tips</Text>
          </View>
          <Text style={styles.tipsText}>
            • Keep your phone with you while walking{"\n"}• Aim for 10,000 steps per day{"\n"}• Take regular breaks
            during long walks{"\n"}• Stay hydrated and maintain good posture
          </Text>
        </Animated.View>
      </Animated.ScrollView>

      <FloatingMenuButton
        initialPosition={{ x: width - 70, y: height - 150 }}
        autoHide={true}
        navigation={navigation}
        autoHideDelay={4000}
      />
    </SafeAreaView>
  )
}

export default StepCounterScreen

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollContent: {
    paddingBottom: 32,
  },
  modernHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2D3748",
  },
  headerSpacer: {
    width: 40,
  },
  streakBadge: {
    alignItems: "center",
    marginTop: 20,
    marginBottom: 10,
  },
  streakGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  streakText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
  progressContainer: {
    alignItems: "center",
    marginVertical: 30,
  },
  progressCircle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  progressContent: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  stepCount: {
    fontSize: 36,
    fontWeight: "700",
    color: "#2D3748",
  },
  stepLabel: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 2,
  },
  progressPercent: {
    fontSize: 12,
    color: "#0056d2",
    fontWeight: "500",
    marginTop: 4,
  },
  targetContainer: {
    alignItems: "center",
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  targetLabel: {
    fontSize: 16,
    color: "#64748B",
    fontWeight: "500",
    marginBottom: 12,
  },
  targetControls: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  targetButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },
  targetDisplay: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  targetValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2D3748",
  },
  statsContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginBottom: 30,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2D3748",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#64748B",
  },
  actionContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginBottom: 30,
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  buttonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  historySection: {
    marginHorizontal: 20,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2D3748",
    marginBottom: 16,
  },
  filterContainer: {
    flexDirection: "row",
    marginBottom: 16,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
  },
  filterButtonActive: {
    backgroundColor: "#0056d2",
  },
  filterText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#64748B",
  },
  filterTextActive: {
    color: "#FFFFFF",
  },
  selectedDateCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  selectedSteps: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0056d2",
  },
  selectedDate: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 4,
  },
  selectedPercent: {
    fontSize: 14,
    color: "#10B981",
    fontWeight: "500",
    marginTop: 4,
  },
  chartContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  chart: {
    borderRadius: 12,
  },
  tipsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  tipsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  tipsIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2D3748",
  },
  tipsText: {
    fontSize: 14,
    color: "#64748B",
    lineHeight: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    backgroundColor: "#F8FAFC",
  },
  errorIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2D3748",
    marginBottom: 8,
    textAlign: "center",
  },
  errorText: {
    fontSize: 16,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 24,
  },
})

// Helper function to filter step history by range
function getFilteredHistory(history, range) {
  if (!Array.isArray(history)) return []
  const today = new Date()
  let days = 7

  switch (range) {
    case "1D":
      days = 1
      break
    case "3D":
      days = 3
      break
    case "1W":
      days = 7
      break
    case "3M":
      days = 90
      break
    case "6M":
      days = 180
      break
    case "1Y":
      days = 365
      break
    default:
      days = 7
      break
  }

  const dateSet = new Set()
  for (let i = 0; i < days; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const dateStr =
      d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0")
    dateSet.add(dateStr)
  }

  return history.filter((item) => dateSet.has(item.date)).sort((a, b) => a.date.localeCompare(b.date))
}