"use client"

import { useState, useEffect, useRef } from "react"
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  ScrollView,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useNavigation } from "@react-navigation/native"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { Video } from "expo-av"
import { LinearGradient } from "expo-linear-gradient"
import Header from "components/Header"
import DynamicStatusBar from "screens/statusBar/DynamicStatusBar"
import { theme } from "theme/color"
import { workoutService } from "services/apiWorkoutService"
import { StatusBar } from "expo-status-bar"
import { SafeAreaView } from "react-native-safe-area-context"
import YouTubeIframe from "react-native-youtube-iframe";

const { width, height } = Dimensions.get("window")

const WorkoutSessionScreen = () => {
  const navigation = useNavigation()
  const [scheduledExercises, setScheduledExercises] = useState([])
  const [filteredExercises, setFilteredExercises] = useState([])
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(-1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [timer, setTimer] = useState(0)
  const [isWorkoutStarted, setIsWorkoutStarted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState("exercises")
  const [filterModalVisible, setFilterModalVisible] = useState(false)
  const [workoutStats, setWorkoutStats] = useState({
    totalCalories: 0,
    totalDuration: 0,
    exerciseCount: 0,
  })

  const [filters, setFilters] = useState({
    searchTerm: "",
    minCalories: "",
    maxCalories: "",
    gender: "",
    sortBy: "name",
    sortOrder: "asc",
  })

  const timerRef = useRef(null)
  const videoRef = useRef(null)
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(30)).current
  const sessionStartTimeRef = useRef(null)

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start()

    loadScheduledExercises();

    // Khi màn hình được focus lại, reload danh sách bài tập
    const unsubscribe = navigation.addListener('focus', () => {
      loadScheduledExercises();
    });
    return unsubscribe;
  }, [])

  useEffect(() => {
    if (isPlaying && isWorkoutStarted) {
      timerRef.current = setInterval(() => {
        setTimer((prev) => prev + 1)
      }, 1000)
    } else {
      clearInterval(timerRef.current)
    }
    return () => clearInterval(timerRef.current)
  }, [isPlaying, isWorkoutStarted])

  useEffect(() => {
    applyFilters()
    calculateWorkoutStats()
  }, [scheduledExercises, filters])

  const loadScheduledExercises = async () => {
    try {
      const storedExercises = await AsyncStorage.getItem("scheduledExercises")
      if (storedExercises) {
        const exercises = JSON.parse(storedExercises)
        console.log("Loaded scheduledExercises:", exercises);
        setScheduledExercises(exercises)
        setFilteredExercises(exercises)
      } else {
        console.log("No scheduledExercises found in AsyncStorage.");
      }
      setLoading(false)
    } catch (err) {
      setError("Failed to load scheduled exercises")
      setLoading(false)
      console.log("Error loading scheduledExercises:", err);
    }
  }

  const saveScheduledExercises = async (exercises) => {
    try {
      await AsyncStorage.setItem("scheduledExercises", JSON.stringify(exercises))
    } catch (err) {
      setError("Failed to save scheduled exercises")
    }
  }

  const applyFilters = () => {
    let filtered = [...scheduledExercises]

    if (filters.searchTerm) {
      filtered = filtered.filter((exercise) =>
        exercise.exerciseName.toLowerCase().includes(filters.searchTerm.toLowerCase()),
      )
    }

    if (filters.minCalories) {
      filtered = filtered.filter((exercise) => exercise.caloriesBurnedPerMin >= Number.parseInt(filters.minCalories))
    }
    if (filters.maxCalories) {
      filtered = filtered.filter((exercise) => exercise.caloriesBurnedPerMin <= Number.parseInt(filters.maxCalories))
    }

    if (filters.gender) {
      filtered = filtered.filter((exercise) => exercise.genderSpecific === filters.gender)
    }

    filtered.sort((a, b) => {
      let comparison = 0
      switch (filters.sortBy) {
        case "calories":
          comparison = a.caloriesBurnedPerMin - b.caloriesBurnedPerMin
          break
        case "duration":
          comparison = (a.duration || 0) - (b.duration || 0)
          break
        default:
          comparison = a.exerciseName.localeCompare(b.exerciseName)
      }
      return filters.sortOrder === "asc" ? comparison : -comparison
    })

    setFilteredExercises(filtered)
  }

  const calculateWorkoutStats = () => {
    const totalCalories = scheduledExercises.reduce((sum, ex) => sum + ex.caloriesBurnedPerMin * (ex.duration || 1), 0)
    const totalDuration = scheduledExercises.reduce((sum, ex) => sum + (ex.duration || 1), 0)
    const exerciseCount = scheduledExercises.length

    setWorkoutStats({ totalCalories, totalDuration, exerciseCount })
  }

  const removeExercise = (exerciseId) => {
    Alert.alert("Remove Exercise", "Are you sure you want to remove this exercise?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          const updatedExercises = scheduledExercises.filter((ex) => ex.exerciseId !== exerciseId)
          setScheduledExercises(updatedExercises)
          saveScheduledExercises(updatedExercises)
        },
      },
    ])
  }

  const startWorkout = async () => {
    if (scheduledExercises.length === 0) {
      Alert.alert("Error", "No exercises scheduled")
      return
    }
    // Prepare params to pass to the new screen
    const startTimeVN = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString();
    await AsyncStorage.setItem('workoutSessionStartTime', startTimeVN);
    await AsyncStorage.setItem('userActivityStartTimes', JSON.stringify([{ exerciseId: scheduledExercises[0].exerciseId, startTime: startTimeVN }]));
    navigation.navigate('WorkoutInProgressScreen', {
      scheduledExercises,
      startTime: startTimeVN,
    });
  }

  const logCurrentActivity = async (exercise, sessionId, userId) => {
    const startTimesStr = await AsyncStorage.getItem('userActivityStartTimes');
    let startTimes = [];
    if (startTimesStr) startTimes = JSON.parse(startTimesStr);
    const found = startTimes.find(e => e.exerciseId === exercise.exerciseId);
    const startTime = found ? found.startTime : new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString();
    const endTime = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString();
    const durationMs = new Date(endTime) - new Date(startTime);
    const durationSeconds = Math.max(1, Math.round(durationMs / 1000));
    const activity = {
      UserId: userId,
      ActivityType: 1,
      exerciseId: exercise.exerciseId,
      SessionId: sessionId,
      steps: 0,
      distanceKm: 0,
      CaloriesBurned: exercise.caloriesBurnedPerMin ? (exercise.caloriesBurnedPerMin * durationSeconds) / 60 : 0,
      durationMinutes: durationSeconds, 
      heartRate: 0,
      location: "N/A",
      goalStatus: "Completed",
      isSummary: false,
      recordedAt: endTime,
      startTime,
      endTime
    };
    await workoutService.createActivity(activity);
  }

  const nextExercise = async () => {
    if (currentExerciseIndex < scheduledExercises.length - 1) {
      const userId = 15; 
      const sessionId = null; 
      await logCurrentActivity(scheduledExercises[currentExerciseIndex], sessionId, userId);
      const nextStartTime = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString();
      let startTimes = JSON.parse(await AsyncStorage.getItem('userActivityStartTimes')) || [];
      startTimes.push({ exerciseId: scheduledExercises[currentExerciseIndex + 1].exerciseId, startTime: nextStartTime });
      await AsyncStorage.setItem('userActivityStartTimes', JSON.stringify(startTimes));
      setCurrentExerciseIndex(currentExerciseIndex + 1)
      setIsPlaying(true)
      if (videoRef.current) {
        videoRef.current.playAsync()
      }
    } else {
      await completeWorkout()
    }
  }

  const completeWorkout = async () => {
    if (currentExerciseIndex >= 0) {
      const userId = 15;
      const sessionId = null;
      await logCurrentActivity(scheduledExercises[currentExerciseIndex], sessionId, userId);
    }
    await finishWorkout();
  }

  const finishWorkout = async () => {
    if (!isWorkoutStarted) return
    setLoading(true)
    try {
      const userId = 15 
      let startTime = sessionStartTimeRef.current;
      if (!startTime) {
        const startTimeVN = await AsyncStorage.getItem('workoutSessionStartTime');
        startTime = startTimeVN || new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString();
      }
      const endTime = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString();
      let startTimes = [];
      try {
        const startTimesStr = await AsyncStorage.getItem('userActivityStartTimes');
        if (startTimesStr) startTimes = JSON.parse(startTimesStr);
      } catch (e) { startTimes = []; }
      let totalDurationSeconds = 0;
      for (let i = 0; i <= currentExerciseIndex; i++) {
        const exercise = scheduledExercises[i];
        const found = startTimes.find(e => e.exerciseId === exercise.exerciseId);
        const actStartTime = found ? found.startTime : new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString();
        const actEndTime = (i < currentExerciseIndex)
          ? (startTimes[i + 1]?.startTime || new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString())
          : endTime;
        let durationSeconds = 1;
        try {
          const start = new Date(actStartTime);
          const end = new Date(actEndTime);
          durationSeconds = Math.max(1, Math.round((end - start) / 1000));
        } catch (e) {
          durationSeconds = 1;
        }
        totalDurationSeconds += durationSeconds;
        const activity = {
          UserId: userId,
          ActivityType: 1,
          exerciseId: exercise.exerciseId,
          SessionId: null, 
          steps: 0,
          distanceKm: 0,
          CaloriesBurned: exercise.caloriesBurnedPerMin ? (exercise.caloriesBurnedPerMin * durationSeconds) / 60 : 0,
          durationMinutes: durationSeconds, 
          heartRate: 0,
          location: "N/A",
          goalStatus: "Completed",
          isSummary: false,
          recordedAt: actEndTime,
          startTime: actStartTime,
          endTime: actEndTime
        };
        await workoutService.createActivity(activity);
      }
      const totalCaloriesBurned = scheduledExercises.slice(0, currentExerciseIndex + 1).reduce(
        (sum, ex) => sum + ex.caloriesBurnedPerMin || 0,
        0
      )
      const session = {
        UserId: userId,
        StartTime: startTime,
        EndTime: endTime,
        totalCaloriesBurned: totalCaloriesBurned,
        totalDurationMinutes: totalDurationSeconds, 
        notes: `Completed workout with ${currentExerciseIndex + 1} exercises`,
      }
      const sessionResponse = await workoutService.createWorkoutSessionsBulk([session])
  
      Alert.alert("Success", "Workout session and activities logged successfully!")
      setScheduledExercises([])
      await AsyncStorage.removeItem("scheduledExercises")
      await AsyncStorage.removeItem('workoutSessionStartTime')
      await AsyncStorage.removeItem('userActivityStartTimes')
      resetWorkout()
      navigation.navigate("WorkoutHistoryScreen")
    } catch (err) {
      let errorMessage = err.message || "Failed to log workout"
      if (err.response && err.response.status === 400) {
        errorMessage = `Bad request: ${err.response.data?.message || "Invalid activity data"}`
      }
      setError(errorMessage)
      Alert.alert("Error", errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const resetFilters = () => {
    setFilters({
      searchTerm: "",
      minCalories: "",
      maxCalories: "",
      gender: "",
      sortBy: "name",
      sortOrder: "asc",
    })
  }

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`
  }

  const renderTabButton = (tabName, title, icon) => (
    <TouchableOpacity
      style={[styles.tabButton, activeTab === tabName && styles.activeTab]}
      onPress={() => setActiveTab(tabName)}
    >
      <Ionicons name={icon} size={16} color={activeTab === tabName ? "#4F46E5" : "#64748B"} />
      <Text style={[styles.tabText, activeTab === tabName && styles.activeTabText]}>{title}</Text>
    </TouchableOpacity>
  )

  const renderWorkoutStats = () => (
    <View style={styles.statsContainer}>
      <View style={[styles.statCard, styles.caloriesCard]}>
        <Ionicons name="flame" size={24} color="#FF6B35" />
        <Text style={[styles.statValue, { color: "#FF6B35" }]}>{Math.round(workoutStats.totalCalories)}</Text>
        <Text style={styles.statLabel}>Total Calories</Text>
      </View>

      <View style={[styles.statCard, styles.durationCard]}>
        <Ionicons name="time" size={24} color="#10B981" />
        <Text style={[styles.statValue, { color: "#10B981" }]}>{workoutStats.totalDuration}</Text>
        <Text style={styles.statLabel}>Total Minutes</Text>
      </View>

      <View style={[styles.statCard, styles.exerciseCard]}>
        <Ionicons name="fitness" size={24} color="#8B5CF6" />
        <Text style={[styles.statValue, { color: "#8B5CF6" }]}>{workoutStats.exerciseCount}</Text>
        <Text style={styles.statLabel}>Exercises</Text>
      </View>
    </View>
  )

  const renderScheduledExerciseItem = ({ item, index }) => (
    <View style={styles.exerciseCard}>
      <View style={styles.exerciseHeader}>
        <View style={styles.exerciseNumber}>
          <Text style={styles.exerciseNumberText}>{index + 1}</Text>
        </View>
        <View style={styles.exerciseInfo}>
          <Text style={styles.exerciseName}>{item.exerciseName}</Text>
          <View style={styles.exerciseDetails}>
            <View style={styles.exerciseDetailItem}>
              <Ionicons name="flame" size={14} color="#FF6B35" />
              <Text style={styles.exerciseDetailText}>{item.caloriesBurnedPerMin} kcal/min</Text>
            </View>
            {/* Bỏ duration vì không có trong database */}
            <View style={styles.exerciseDetailItem}>
              <Ionicons name="person" size={14} color="#8B5CF6" />
              <Text style={styles.exerciseDetailText}>{item.genderSpecific}</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity style={styles.removeButton} onPress={() => removeExercise(item.exerciseId)}>
          <Ionicons name="trash-outline" size={20} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </View>
  )

  const renderFilterModal = () => (
    <Modal visible={filterModalVisible} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={styles.filterModalContent}>
          <View style={styles.filterModalHeader}>
            <Text style={styles.filterModalTitle}>Filter Exercises</Text>
            <TouchableOpacity style={styles.filterCloseButton} onPress={() => setFilterModalVisible(false)}>
              <Text style={{fontSize: 20, color: '#64748B'}}>×</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.filterModalBody} showsVerticalScrollIndicator={false}>
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Search Exercise</Text>
              <TextInput
                style={styles.filterInput}
                placeholder="Enter exercise name..."
                value={filters.searchTerm}
                onChangeText={(text) => setFilters((prev) => ({ ...prev, searchTerm: text }))}
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Calorie Range (per minute)</Text>
              <View style={styles.filterRow}>
                <View style={styles.filterHalf}>
                  <Text style={styles.filterSubLabel}>Min Calories</Text>
                  <TextInput
                    style={styles.filterInput}
                    placeholder="0"
                    value={filters.minCalories}
                    onChangeText={(text) => setFilters((prev) => ({ ...prev, minCalories: text }))}
                    keyboardType="numeric"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
                <View style={styles.filterHalf}>
                  <Text style={styles.filterSubLabel}>Max Calories</Text>
                  <TextInput
                    style={styles.filterInput}
                    placeholder="50"
                    value={filters.maxCalories}
                    onChangeText={(text) => setFilters((prev) => ({ ...prev, maxCalories: text }))}
                    keyboardType="numeric"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>
            </View>

            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Gender Specific</Text>
              <View style={styles.genderButtons}>
                {["", "Male", "Female", "Unisex"].map((gender) => (
                  <TouchableOpacity
                    key={gender}
                    style={[styles.genderButton, filters.gender === gender && { backgroundColor: '#0056d2', borderColor: '#0056d2' }]}
                    onPress={() => setFilters((prev) => ({ ...prev, gender }))}
                  >
                    <Text style={[styles.genderButtonText, filters.gender === gender && { color: '#fff' }]}>
                      {gender || "All"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Sort Options</Text>
              <View style={styles.filterRow}>
                <View style={styles.filterHalf}>
                  <Text style={styles.filterSubLabel}>Sort By</Text>
                  <View style={styles.sortButtons}>
                    {[
                      { key: "name", label: "Name" },
                      { key: "calories", label: "Calories" },
                      { key: "duration", label: "Duration" },
                    ].map((sort) => (
                      <TouchableOpacity
                        key={sort.key}
                    style={[styles.sortButton, filters.sortBy === sort.key && { backgroundColor: '#0056d2', borderColor: '#0056d2' }]}
                        onPress={() => setFilters((prev) => ({ ...prev, sortBy: sort.key }))}
                      >
                        <Text
                          style={[styles.sortButtonText, filters.sortBy === sort.key && { color: '#fff' }]}
                        >
                          {sort.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <View style={styles.filterHalf}>
                  <Text style={styles.filterSubLabel}>Order</Text>
                  <View style={styles.sortButtons}>
                    {[
                      { key: "asc", label: "Asc" },
                      { key: "desc", label: "Desc" },
                    ].map((order) => (
                      <TouchableOpacity
                        key={order.key}
                    style={[styles.sortButton, filters.sortOrder === order.key && { backgroundColor: '#0056d2', borderColor: '#0056d2' }]}
                        onPress={() => setFilters((prev) => ({ ...prev, sortOrder: order.key }))}
                      >
                        <Text
                          style={[styles.sortButtonText, filters.sortOrder === order.key && { color: '#fff' }]}
                        >
                          {order.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            </View>
          </ScrollView>

          <View style={styles.filterModalButtons}>
            <TouchableOpacity style={styles.filterResetButton} onPress={resetFilters}>
              <Text style={styles.filterResetText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.filterApplyButton}
              onPress={() => {
                applyFilters()
                setFilterModalVisible(false)
              }}
            >
              <Text style={styles.filterApplyText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )

  // Helper function to extract YouTube video ID from URL
  const getYouTubeVideoId = (url) => {
    if (!url) return null
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/
    const match = url.match(regex)
    return match ? match[1] : null
  }
  // Helper function to determine if URL is a YouTube URL
  const isYouTubeUrl = (url) => {
    return url && (url.includes("youtube.com") || url.includes("youtu.be"))
  }

  const renderVideoPlayer = (mediaUrl, isPlaying = true) => {
    const videoId = getYouTubeVideoId(mediaUrl)
    const videoWidth = Math.round(width * 0.92)
    const videoHeight = Math.round(videoWidth * 9 / 16)
    if (isYouTubeUrl(mediaUrl) && videoId) {
      return (
        <View style={styles.unifiedVideoWrapper} pointerEvents="none">
          <YouTubeIframe
            videoId={videoId}
            play={isPlaying}
            height={videoHeight}
            width={videoWidth}
            webViewStyle={styles.unifiedVideoContainer}
            initialPlayerParams={{ controls: 0, modestbranding: 1, rel: 0, showinfo: 0, fs: 0 }}
            webViewProps={{ allowsInlineMediaPlayback: true }}
            onError={(error) => setError("YouTube Error: " + error)}
            onChangeState={() => {}}
          />
        </View>
      )
    }
    if (mediaUrl && (mediaUrl.endsWith(".mp4") || mediaUrl.endsWith(".mov") || mediaUrl.endsWith(".webm"))) {
      return (
        <View style={styles.unifiedVideoWrapper} pointerEvents="none">
          <Video
            source={{ uri: `${mediaUrl}?t=${Date.now()}` }}
            rate={1.0}
            volume={0.8}
            isMuted={false}
            resizeMode="cover"
            shouldPlay={isPlaying}
            isLooping={true}
            useNativeControls={false}
            style={styles.unifiedVideoContainer}
            onError={(error) => setError("Video Error: " + error)}
          />
        </View>
      )
    }
    return (
      <View style={styles.unifiedVideoWrapper} pointerEvents="none">
        <View style={[styles.unifiedVideoContainer, { justifyContent: "center", alignItems: "center" }]}> 
          <Text style={{ color: "#fff" }}>No video available</Text>
        </View>
      </View>
    )
  }

  const renderWorkoutSession = () => (
    <View style={styles.workoutContainer}>
      <View style={styles.workoutHeader}>
        <Text style={styles.workoutTitle}>Workout in Progress</Text>
        <Text style={styles.workoutProgress}>
          Exercise {currentExerciseIndex + 1} of {scheduledExercises.length}
        </Text>
      </View>

      {currentExerciseIndex >= 0 && scheduledExercises[currentExerciseIndex] && (
        <>
          <View style={styles.currentExerciseCard}>
            <Text style={styles.currentExerciseName}>{scheduledExercises[currentExerciseIndex].exerciseName}</Text>
            <View style={styles.currentExerciseStats}>
              <View style={styles.currentExerciseStat}>
                <Ionicons name="flame" size={16} color="#FF6B35" />
                <Text style={styles.currentExerciseStatText}>
                  {scheduledExercises[currentExerciseIndex].caloriesBurnedPerMin} kcal/min
                </Text>
              </View>
              <View style={styles.currentExerciseStat}>
                <Ionicons name="time" size={16} color="#10B981" />
                <Text style={styles.currentExerciseStatText}>
                  {scheduledExercises[currentExerciseIndex].duration || 1} min
                </Text>
              </View>
            </View>
          </View>

          {/* Unified Video Player */}
          {renderVideoPlayer(scheduledExercises[currentExerciseIndex].mediaUrl)}

          {/* Progress Bar */}
          <View style={styles.progressBarWrapper}>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFg,
                  {
                    width: `${((currentExerciseIndex + 1) / scheduledExercises.length) * 100}%`,
                  },
                ]}
              />
            </View>
            <Text style={styles.progressBarText}>
              {currentExerciseIndex + 1} / {scheduledExercises.length}
            </Text>
          </View>

          {/* Timer */}
          <View style={styles.timerContainer}>
            <Text style={styles.timerLabel}>Workout Time</Text>
            <Text style={styles.timerText}>{formatTime(timer)}</Text>
          </View>

          {/* Controls */}
          <View style={styles.controlsContainer}>
            <TouchableOpacity
              style={[styles.controlButton, styles.pauseButton]}
              onPress={() => (isPlaying ? pauseWorkout() : resumeWorkout())}
            >
              <Ionicons name={isPlaying ? "pause" : "play"} size={24} color="#FFFFFF" />
              <Text style={styles.controlButtonText}>{isPlaying ? "Pause" : "Resume"}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.controlButton, styles.nextButton]} onPress={() => nextExercise()}>
              <Ionicons name="play-skip-forward" size={24} color="#FFFFFF" />
              <Text style={styles.controlButtonText}>
                {currentExerciseIndex < scheduledExercises.length - 1 ? "Next" : "Finish"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.controlButton, styles.stopButton]} onPress={() => completeWorkout()}>
              <Ionicons name="stop" size={24} color="#FFFFFF" />
              <Text style={styles.controlButtonText}>Stop</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  )

  // Thêm lại hàm pauseWorkout và resumeWorkout
  const pauseWorkout = () => {
    setIsPlaying(false)
  }

  const resumeWorkout = () => {
    setIsPlaying(true)
  }

  // Hàm resetWorkout để reset lại trạng thái sau khi hoàn thành hoặc lỗi
  const resetWorkout = () => {
    setIsWorkoutStarted(false);
    setIsPlaying(false);
    setCurrentExerciseIndex(-1);
    setTimer(0);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#4F46E5" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loadingTitle}>Loading Workout Session</Text>
          <Text style={styles.loadingText}>Please wait a moment...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#4F46E5" />
      <DynamicStatusBar backgroundColor={theme.primaryColor} />

      {/* Header */}
      <Header
        title="Workout Session"
        onBack={() => navigation.goBack()}
        rightActions={
          !isWorkoutStarted
            ? [
                {
                  icon: 'options-outline',
                  onPress: () => setFilterModalVisible(true),
                  color: '#3B82F6',
                },
              ]
            : []
        }
      />

      <Animated.View
        style={[
          styles.container,
          {
            marginTop: 55,
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {!isWorkoutStarted ? (
          <>
            {/* Tabs */}
            <View style={styles.tabContainer}>
              {renderTabButton("exercises", "Exercises", "list")}
              {renderTabButton("overview", "Overview", "analytics")}
            </View>

            {/* Content */}
            {activeTab === "overview" && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {renderWorkoutStats()}

                <View style={styles.overviewSection}>
                  <Text style={styles.sectionTitle}>🎯 Workout Summary</Text>
                  <View style={styles.summaryCard}>
                    <Text style={styles.summaryText}>
                      You have <Text style={styles.summaryHighlight}>{scheduledExercises.length} exercises</Text>{" "}
                      scheduled for this workout session.
                    </Text>
                    <Text style={styles.summaryText}>
                      Estimated duration:{" "}
                      <Text style={styles.summaryHighlight}>{workoutStats.totalDuration} minutes</Text>
                    </Text>
                    <Text style={styles.summaryText}>
                      Expected calories burned:{" "}
                      <Text style={styles.summaryHighlight}>{Math.round(workoutStats.totalCalories)} kcal</Text>
                    </Text>
                  </View>
                </View>

                {scheduledExercises.length > 0 && (
                  <TouchableOpacity style={styles.startWorkoutButton} onPress={startWorkout}>
                    <LinearGradient colors={["#0056d2", "#0056d2"]} style={styles.startWorkoutGradient}>
                      <Ionicons name="play" size={24} color="#FFFFFF" />
                      <Text style={styles.startWorkoutText}>Start Workout</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </ScrollView>
            )}

            {activeTab === "exercises" && (
              <View style={styles.exercisesTab}>
                <View style={styles.exercisesHeader}>
                  <Text style={styles.sectionTitle}>
                    Scheduled Exercises ({filteredExercises.length}/{scheduledExercises.length})
                  </Text>
                  <TouchableOpacity style={styles.addExerciseButton} onPress={() => navigation.navigate("WorkoutListScreen")}> 
                    <Ionicons name="add" size={20} color="#0056d2" />
                    <Text style={styles.addExerciseText}>Add More</Text>
                  </TouchableOpacity>
                </View>

                <FlatList
                  data={filteredExercises}
                  renderItem={renderScheduledExerciseItem}
                  keyExtractor={(item) => item.exerciseId.toString()}
                  contentContainerStyle={styles.listContainer}
                  ListEmptyComponent={
                    <View style={styles.emptyState}>
                      <Ionicons name="fitness" size={64} color="#D1D5DB" />
                      <Text style={styles.emptyTitle}>No Exercises Found</Text>
                      <Text style={styles.emptyText}>
                        {scheduledExercises.length === 0
                          ? "Add exercises from the Workout screen to get started."
                          : "Try adjusting your filters to see more exercises."}
                      </Text>
                      <TouchableOpacity
                        style={styles.emptyButton}
                        onPress={() =>
                          scheduledExercises.length === 0 ? navigation.navigate("WorkoutListScreen") : resetFilters()
                        }
                      >
                        <Text style={styles.emptyButtonText}>
                          {scheduledExercises.length === 0 ? "Add Exercises" : "Reset Filters"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  }
                  showsVerticalScrollIndicator={false}
                />

                {scheduledExercises.length > 0 && (
                  <TouchableOpacity style={styles.startButton} onPress={startWorkout}>
                    <Text style={styles.startButtonText}> Start Workout</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

          </>
        ) : null
}
        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="warning" size={24} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => {
                setError(null)
                loadScheduledExercises()
              }}
            >
              <Text style={styles.retryButtonText}>🔄 Retry</Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>

      {renderFilterModal()}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    gap: 16,
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  loadingText: {
    fontSize: 14,
    color: "#64748B",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
    gap: 6,
  },
  activeTab: {
    borderBottomColor: "#0056d2",
  },
  tabText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  activeTabText: {
    color: "#0056d2",
    fontWeight: "600",
  },
  statsContainer: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
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
    elevation: 3,
  },
  caloriesCard: {
    backgroundColor: "#FFF7ED",
  },
  durationCard: {
    backgroundColor: "#F0FDF4",
  },
  exerciseCard: {
    backgroundColor: "#F5F3FF",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "500",
    textAlign: "center",
  },
  overviewSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 16,
  },
  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryText: {
    fontSize: 14,
    color: "#64748B",
    lineHeight: 20,
    marginBottom: 8,
  },
  summaryHighlight: {
    color: "#0056d2",
    fontWeight: "600",
  },
  startWorkoutButton: {
    margin: 16,
    borderRadius: 16,
    overflow: "hidden",
  },
  startWorkoutGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  startWorkoutText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  exercisesTab: {
    flex: 1,
    padding: 16,
  },
  exercisesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  addExerciseButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  addExerciseText: {
    fontSize: 12,
    color: "#0056d2",
    fontWeight: "600",
  },
  exerciseCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  exerciseHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  exerciseNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#0056d2",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  exerciseNumberText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
  },
  exerciseDetails: {
    flexDirection: "row",
    gap: 12,
  },
  exerciseDetailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  exerciseDetailText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  removeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FEF2F2",
    justifyContent: "center",
    alignItems: "center",
  },
  startButton: {
    backgroundColor: "#0056d2",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 16,
  },
  startButtonText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyButton: {
    backgroundColor: "#0056d2",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  workoutContainer: {
    flex: 1,
    padding: 16,
  },
  workoutHeader: {
    alignItems: "center",
    marginBottom: 24,
  },
  workoutTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 4,
  },
  workoutProgress: {
    fontSize: 14,
    color: "#64748B",
  },
  currentExerciseCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  currentExerciseName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
    textAlign: "center",
    marginBottom: 12,
  },
  currentExerciseStats: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 24,
  },
  currentExerciseStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  currentExerciseStatText: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
  },
  unifiedVideoWrapper: {
    width: '100%',
    aspectRatio: 16 / 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  unifiedVideoShadow: {
    width: '96%',
    height: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderRadius: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unifiedVideoContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressBarWrapper: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressBarBg: {
    width: '90%',
    height: 10,
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressBarFg: {
    height: 10,
    backgroundColor: '#4F46E5',
    borderRadius: 8,
  },
  progressBarText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  timerContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  timerLabel: {
    fontSize: 14,
    color: "#64748B",
    marginBottom: 4,
  },
  timerText: {
    fontSize: 32,
    fontWeight: "700",
    color: "#4F46E5",
  },
  controlsContainer: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "center",
  },
  controlButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 16,
    borderRadius: 16,
    gap: 4,
  },
  pauseButton: {
    backgroundColor: "#F59E0B",
  },
  nextButton: {
    backgroundColor: "#10B981",
  },
  stopButton: {
    backgroundColor: "#EF4444",
  },
  controlButtonText: {
    fontSize: 12,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  errorContainer: {
    alignItems: "center",
    padding: 16,
    backgroundColor: "#FEF2F2",
    borderRadius: 16,
    margin: 16,
    gap: 8,
  },
  errorText: {
    fontSize: 14,
    color: "#EF4444",
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: "#4F46E5",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  listContainer: {
    paddingBottom: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  filterModalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
  },
  filterModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  filterModalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
  },
  filterCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  filterModalBody: {
    padding: 20,
    maxHeight: 400,
  },
  filterGroup: {
    marginBottom: 24,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 12,
  },
  filterSubLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 8,
  },
  filterInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: "#F9FAFB",
    color: "#1F2937",
  },
  filterRow: {
    flexDirection: "row",
    gap: 12,
  },
  filterHalf: {
    flex: 1,
  },
  genderButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  genderButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
  },
  activeGenderButton: {
    backgroundColor: "#4F46E5",
    borderColor: "#4F46E5",
  },
  genderButtonText: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
  },
  activeGenderButtonText: {
    color: "#FFFFFF",
  },
  sortButtons: {
    flexDirection: "row",
    gap: 6,
  },
  sortButton: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    alignItems: "center",
  },
  activeSortButton: {
    backgroundColor: "#4F46E5",
    borderColor: "#4F46E5",
  },
  sortButtonText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  activeSortButtonText: {
    color: "#FFFFFF",
  },
  filterModalButtons: {
    flexDirection: "row",
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  filterResetButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  filterResetText: {
    fontSize: 16,
    color: "#64748B",
    fontWeight: "600",
  },
  filterApplyButton: {
    flex: 2,
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#0056d2",
    alignItems: "center",
  },
  filterApplyText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
  },
})

export default WorkoutSessionScreen
