import { useEffect,useState,useRef,useContext } from "react"
import { View,Text,TouchableOpacity,StyleSheet,Modal,Dimensions } from "react-native"
import Loading from "components/Loading"
import { showErrorFetchAPI,showSuccessMessage } from "utils/toastUtil"
import { Ionicons } from "@expo/vector-icons"
import { SafeAreaView } from "react-native-safe-area-context"
import { useNavigation,useRoute } from "@react-navigation/native"
import { workoutService } from "services/apiWorkoutService"
import { AuthContext,useAuth } from "context/AuthContext"
import { Video } from "expo-av"
import AsyncStorage from "@react-native-async-storage/async-storage"
import * as Speech from "expo-speech"
import YouTubeIframe from "react-native-youtube-iframe"
import { handleDailyCheckin } from "utils/checkin"
import { StatusBar } from "expo-status-bar"

const { width: screenWidth,height: screenHeight } = Dimensions.get("window")

const getYouTubeVideoId = (url) => {
  if (!url) return null
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/
  const match = url.match(regex)
  return match ? match[1] : null
}

const isYouTubeUrl = (url) => {
  return url && (url.includes("youtube.com") || url.includes("youtu.be"))
}

const ExerciseInfoModal = ({ visible,exercise,onClose }) => {
  if (!exercise) return null

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={styles.modalBackdrop} onPress={onClose} />
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Exercise Info</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <Text style={styles.exerciseModalName}>{exercise.exerciseName}</Text>

            {exercise.description && (
              <View style={styles.descriptionContainer}>
                <Text style={styles.descriptionTitle}>Description</Text>
                <Text style={styles.descriptionText}>{exercise.description}</Text>
              </View>
            )}

            <View style={styles.exerciseStatsContainer}>
              <View style={styles.statItem}>
                <Ionicons name="repeat" size={20} color="#10B981" />
                <Text style={styles.statLabel}>Sets</Text>
                <Text style={styles.statValue}>{exercise.sets || "N/A"}</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="fitness" size={20} color="#3B82F6" />
                <Text style={styles.statLabel}>Reps</Text>
                <Text style={styles.statValue}>{exercise.reps || "N/A"}</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="time" size={20} color="#F59E0B" />
                <Text style={styles.statLabel}>Duration</Text>
                <Text style={styles.statValue}>{exercise.durationMinutes || "N/A"}m</Text>
              </View>
            </View>

            {exercise.notes && (
              <View style={styles.notesContainer}>
                <Ionicons name="document-text" size={20} color="#F59E0B" />
                <Text style={styles.notesText}>{exercise.notes}</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  )
}

// Helper function to render video (YouTube hoặc mp4)
const renderVideoPlayer = (mediaUrl,isPlaying = true) => {
  const videoId = getYouTubeVideoId(mediaUrl)
  // Tính toán kích thước video 16:9
  const videoWidth = Math.round(screenWidth * 0.92)
  const videoHeight = Math.round(videoWidth * 9 / 16)
  if (isYouTubeUrl(mediaUrl) && videoId) {
    return (
      <View style={styles.videoContainer} pointerEvents="none">
        <YouTubeIframe
          videoId={videoId}
          play={isPlaying}
          height={videoHeight}
          width={videoWidth}
          webViewStyle={styles.videoPlayer}
          initialPlayerParams={{ controls: 0,modestbranding: 1,rel: 0,showinfo: 0,fs: 0 }}
          webViewProps={{ allowsInlineMediaPlayback: true }}
          onChangeState={() => { }}
        />
      </View>
    )
  }
  if (mediaUrl && (mediaUrl.endsWith(".mp4") || mediaUrl.endsWith(".mov") || mediaUrl.endsWith(".webm"))) {
    return (
      <View style={styles.videoContainer} pointerEvents="none">
        <Video
          source={{ uri: `${mediaUrl}?t=${Date.now()}` }}
          rate={1.0}
          volume={0.8}
          isMuted={false}
          resizeMode="cover"
          shouldPlay={isPlaying}
          isLooping={true}
          useNativeControls={false}
          style={styles.videoPlayer}
          onPlaybackStatusUpdate={(status) => {
            if (status.error) {
            }
          }}
        />
      </View>
    )
  }
  return (
    <View style={styles.videoContainer} pointerEvents="none">
      <View style={[styles.videoPlayer,{ justifyContent: "center",alignItems: "center" }]}>
        <Text style={{ color: "#fff" }}>No video available</Text>
      </View>
    </View>
  )
}

export default function WorkoutSessionActiveScreen() {
  const navigation = useNavigation()
  const route = useRoute()
  const { exercises = [],userId: paramUserId } = route.params || {}
  const { user } = useContext(AuthContext)
  const userId = paramUserId || user?.userId || user?.id
  const [currentIndex,setCurrentIndex] = useState(0)
  const [currentSet,setCurrentSet] = useState(1)
  const [secondsLeft,setSecondsLeft] = useState(0)
  const [isRunning,setIsRunning] = useState(false)
  const [startTime,setStartTime] = useState(null)
  const [endTime,setEndTime] = useState(null)
  const [totalCalories,setTotalCalories] = useState(0)
  const [totalDuration,setTotalDuration] = useState(0)
  const [isWarmup,setIsWarmup] = useState(false)
  const [warmupSeconds,setWarmupSeconds] = useState(15)
  const [isResting,setIsResting] = useState(false)
  const [restSeconds,setRestSeconds] = useState(0)
  const [showPauseModal,setShowPauseModal] = useState(false)
  const [showExerciseInfo,setShowExerciseInfo] = useState(false)
  const timerRef = useRef(null)
  const warmupTimerRef = useRef(null)
  const restTimerRef = useRef(null)
  const hasSpokenRef = useRef({ 10: false,3: false,2: false,1: false })

  const currentExercise = exercises[currentIndex] || {}
  const totalSets = currentExercise.sets || 1
  const duration = (currentExercise.durationMinutes || 1) * 60

  const [exerciseStartTimes,setExerciseStartTimes] = useState({})
  const [exerciseAccumulatedTimes,setExerciseAccumulatedTimes] = useState({})

  useEffect(() => {
    let calo = 0,
      dur = 0
    exercises.forEach((ex) => {
      calo += Number(ex.calories || 0)
      dur += Number(ex.durationMinutes || 0) * (ex.sets || 1)
    })
    setTotalCalories(calo)
    setTotalDuration(dur)
  },[exercises])

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setSecondsLeft((s) => s - 1)
      },1000)
    } else if (timerRef.current) {
      clearInterval(timerRef.current)
    }
    return () => timerRef.current && clearInterval(timerRef.current)
  },[isRunning])

  useEffect(() => {
    if (isWarmup) {
      setWarmupSeconds(15)
      warmupTimerRef.current = setInterval(() => {
        setWarmupSeconds((s) => {
          if (s <= 1) {
            clearInterval(warmupTimerRef.current)
            setIsWarmup(false)
            setSecondsLeft(duration)
            setIsRunning(true)
            const now = new Date()
            setStartTime(now)
            if (exercises[currentIndex]) {
              const exId =
                exercises[currentIndex].exerciseId || exercises[currentIndex].id || exercises[currentIndex].ExerciseId
              let startTimes = []
              try {
                const str = AsyncStorage.getItem("userActivityStartTimes")
                if (str) startTimes = JSON.parse(str)
                startTimes = startTimes.filter((e) => e.exerciseId !== exId)
              } catch { }
              startTimes.push({ exerciseId: exId,startTime: now.toISOString() })
              AsyncStorage.setItem("userActivityStartTimes",JSON.stringify(startTimes))
              setExerciseStartTimes((prev) => ({ ...prev,[exId]: now }))
            }
            return 0
          }
          return s - 1
        })
      },1000)
      return () => clearInterval(warmupTimerRef.current)
    }
  },[isWarmup,duration,exercises,currentIndex])

  useEffect(() => {
    if (isResting) {
      restTimerRef.current = setInterval(() => {
        setRestSeconds((s) => {
          if (s <= 1) {
            clearInterval(restTimerRef.current)
            setIsResting(false)
            if (currentSet < totalSets) {
              setCurrentSet((s) => s + 1)
              setSecondsLeft(duration)
              setIsRunning(true)
              hasSpokenRef.current = { 10: false,3: false,2: false,1: false }
            } else if (currentIndex < exercises.length - 1) {
              setCurrentIndex((i) => i + 1)
              setCurrentSet(1)
              setSecondsLeft((exercises[currentIndex + 1]?.durationMinutes || 1) * 60)
              setIsRunning(true)
              hasSpokenRef.current = { 10: false,3: false,2: false,1: false }
            } else {
              setIsRunning(false)
              const end = new Date()
              setEndTime(end)
                ; (async () => {
                  try {
                    const sessionDurationSeconds = startTime && end > startTime ? Math.floor((end - startTime) / 1000) : 1
                    const sessionDurationMinutes = Math.max(1,Math.round(sessionDurationSeconds / 60))
                    await workoutService.createWorkoutSession({
                      UserId: userId || 1,
                      StartTime: startTime ? startTime.toISOString() : end.toISOString(),
                      EndTime: end.toISOString(),
                      TotalCaloriesBurned: totalCalories,
                      TotalDurationMinutes: sessionDurationMinutes,
                      Notes: `Completed workout with ${exercises.length} exercises`,
                    })

                    try {
                      if (user?.userId) {
                        handleDailyCheckin(user.userId);
                      }
                    } catch (e) {
                      console.log(e);
                    }
                  } catch {

                  }
                })()
              showSuccessMessage("You have completed your workout session.")
              navigation.goBack()
            }
            return 0
          }
          return s - 1
        })
      },1000)
      return () => clearInterval(restTimerRef.current)
    }
  },[
    isResting,
    currentSet,
    totalSets,
    currentIndex,
    exercises,
    duration,
    userId,
    startTime,
    totalCalories,
    totalDuration,
    navigation,
  ])

  useEffect(() => {
    if (isRunning && secondsLeft <= 0) {
      if (currentSet < totalSets || currentIndex < exercises.length - 1) {
        setIsRunning(false)
        setIsResting(true)
        setRestSeconds(Number(currentExercise.rest_time_second) || 30)
      } else {
        setIsRunning(false)
        const end = new Date()
        setEndTime(end)
          ; (async () => {
            try {
              const sessionDurationSeconds = startTime && end > startTime ? Math.floor((end - startTime) / 1000) : 1
              const sessionDurationMinutes = Math.max(1,Math.round(sessionDurationSeconds / 60))
              await workoutService.createWorkoutSession({
                UserId: userId || 1,
                StartTime: startTime ? startTime.toISOString() : end.toISOString(),
                EndTime: end.toISOString(),
                TotalCaloriesBurned: totalCalories,
                TotalDurationMinutes: sessionDurationMinutes,
                Notes: `Completed workout with ${exercises.length} exercises`,
              })
            } catch { }
          })()
        showSuccessMessage("You have completed your workout session.")
        navigation.goBack()
      }
    }
    if (isRunning) {
      if (secondsLeft === 10 && !hasSpokenRef.current[10]) {
        showSuccessMessage("10 seconds remaining for this set.")
        Speech.speak("Ten seconds remaining!",{
          language: "en-US",
          pitch: 1.0,
          rate: 1.0,
        })
        hasSpokenRef.current[10] = true
      } else if (secondsLeft === 3 && !hasSpokenRef.current[3]) {
        Speech.speak("Three",{
          language: "en-US",
          pitch: 1.0,
          rate: 1.0,
        })
        hasSpokenRef.current[3] = true
      } else if (secondsLeft === 2 && !hasSpokenRef.current[2]) {
        Speech.speak("Two",{
          language: "en-US",
          pitch: 1.0,
          rate: 1.0,
        })
        hasSpokenRef.current[2] = true
      } else if (secondsLeft === 1 && !hasSpokenRef.current[1]) {
        Speech.speak("One",{
          language: "en-US",
          pitch: 1.0,
          rate: 1.0,
        })
        hasSpokenRef.current[1] = true
      }
    }
  },[
    secondsLeft,
    isRunning,
    currentSet,
    totalSets,
    currentIndex,
    exercises,
    userId,
    startTime,
    totalCalories,
    totalDuration,
    navigation,
  ])

  const handleStart = async () => {
    setIsWarmup(true)
    setIsRunning(false)
    setWarmupSeconds(15)
    setSecondsLeft((exercises[currentIndex]?.durationMinutes || 1) * 60)
    await AsyncStorage.setItem("workoutSessionStartTime",new Date().toISOString())
  }

  const handlePause = () => {
    setIsRunning(false)
    accumulateCurrentExerciseTime()
    setShowPauseModal(true)
    hasSpokenRef.current = { 10: false,3: false,2: false,1: false }
  }

  const handleResume = async () => {
    setShowPauseModal(false)
    const ex = exercises[currentIndex]
    if (ex) {
      const exId = ex.exerciseId || ex.id || ex.ExerciseId
      const now = new Date()
      let startTimes = []
      try {
        const str = await AsyncStorage.getItem("userActivityStartTimes")
        if (str) startTimes = JSON.parse(str)
        startTimes = startTimes.filter((e) => e.exerciseId !== exId)
      } catch { }
      startTimes.push({ exerciseId: exId,startTime: now.toISOString() })
      await AsyncStorage.setItem("userActivityStartTimes",JSON.stringify(startTimes))
      setExerciseStartTimes((prev) => ({ ...prev,[exId]: now }))
    }
    setIsRunning(true)
    hasSpokenRef.current = { 10: false,3: false,2: false,1: false }
  }

  const handleStop = async () => {
    setIsRunning(false)
    const end = new Date()
    setEndTime(end)
    let validStart = startTime
    if (!validStart || isNaN(validStart.getTime()) || validStart >= end) {
      validStart = new Date(end.getTime() - 1000)
    }
    let sessionId = null
    try {
      let startTimes = []
      try {
        const str = await AsyncStorage.getItem("userActivityStartTimes")
        if (str) startTimes = JSON.parse(str)
      } catch { }
      let sessionDurationSeconds = 0
      const activities = []
      for (let i = 0; i < exercises.length; i++) {
        const ex = exercises[i]
        const exId = ex.exerciseId || ex.id || ex.ExerciseId
        const found = startTimes.find((e) => e.exerciseId === exId)
        const actStartTime = found ? found.startTime : validStart.toISOString()
        const actEndTime =
          i < exercises.length - 1 && startTimes[i + 1] ? startTimes[i + 1].startTime : end.toISOString()
        let durationSeconds =
          i < currentIndex ? Math.max(1,Math.round((new Date(actEndTime) - new Date(actStartTime)) / 1000)) : 1
        if (i === currentIndex) {
          const accTime = exerciseAccumulatedTimes[exId] || 0
          const start = exerciseStartTimes[exId]
          if (start) {
            durationSeconds = accTime + Math.floor((new Date() - new Date(start)) / 1000)
          }
        }
        durationSeconds = Math.max(1,durationSeconds)
        sessionDurationSeconds += durationSeconds
        const expectedDurationSeconds = (ex.durationMinutes || 1) * 60 * (ex.sets || 1)
        const calorieRatio = durationSeconds / expectedDurationSeconds
        const adjustedCalories = Math.round((ex.calories || 0) * calorieRatio)
        activities.push({
          UserId: userId || 1,
          ActivityType: Number(ex.activityType) || 1,
          ExerciseId: exId,
          SessionId: sessionId,
          Steps: ex.steps || undefined,
          DistanceKm: ex.distanceKm || 0,
          CaloriesBurned: adjustedCalories,
          DurationMinutes: Math.max(1,Math.round(durationSeconds / 60)),
          HeartRate: ex.heartRate || undefined,
          Location: ex.location || undefined,
          GoalStatus: i <= currentIndex ? "Completed" : "NotStarted",
          IsSummary: ex.isSummary !== undefined ? ex.isSummary : true,
          RecordedAt: actEndTime,
          StartTime: actStartTime,
          EndTime: actEndTime,
        })
      }
      const sessionDurationMinutes = Math.max(1,Math.round(sessionDurationSeconds / 60))
      const sessionData = [
        {
          UserId: userId || 1,
          StartTime: validStart.toISOString(),
          EndTime: end.toISOString(),
          TotalCaloriesBurned: activities.reduce((sum,a) => sum + (a.CaloriesBurned || 0),0),
          TotalDurationMinutes: sessionDurationMinutes,
          Notes: `Stopped workout after ${currentIndex + 1} exercises`,
        },
      ]
      const sessionRes = await workoutService.createWorkoutSessionsBulk(sessionData)
      if (sessionRes && Array.isArray(sessionRes) && sessionRes[0]?.id) {
        sessionId = sessionRes[0].id
      } else if (sessionRes && sessionRes.id) {
        sessionId = sessionRes.id
      }
      if (sessionId) {
        activities.forEach((a) => (a.SessionId = sessionId))
      }
      const validActivities = activities.filter((a) => a.ExerciseId && a.DurationMinutes > 0).map(sanitizeActivity)
      if (validActivities.length > 0) {
        await workoutService.createActivitiesBulk(validActivities)
      }
      try {
        await AsyncStorage.removeItem("scheduledExercisesWorkout")
      } catch {

      }
      try {
        await AsyncStorage.removeItem("userActivityStartTimes")
      } catch { }
      try {
        await AsyncStorage.removeItem("workoutSessionStartTime")
      } catch { }
      showSuccessMessage("Your workout session has been saved successfully.")
      navigation.goBack()
    } catch (e) {
      showErrorFetchAPI("Could not save workout session. Please try again. " + (e?.message || ""))
      navigation.goBack()
    }
  }

  const goToExercise = async (newIndex) => {
    if (exercises[currentIndex]) {
      await logCurrentActivity(exercises[currentIndex],null,userId)
      accumulateCurrentExerciseTime()
    }
    setCurrentIndex(newIndex)
    setCurrentSet(1)
    const ex = exercises[newIndex]
    let exId = null
    if (ex) {
      exId = ex.exerciseId || ex.id || ex.ExerciseId
      const now = new Date()
      let startTimes = []
      try {
        const str = await AsyncStorage.getItem("userActivityStartTimes")
        if (str) startTimes = JSON.parse(str)
        startTimes = startTimes.filter((e) => e.exerciseId !== exId)
      } catch { }
      startTimes.push({ exerciseId: exId,startTime: now.toISOString() })
      await AsyncStorage.setItem("userActivityStartTimes",JSON.stringify(startTimes))
      setExerciseStartTimes((prev) => ({ ...prev,[exId]: now }))
    }
    const totalTime = (ex?.durationMinutes || 1) * 60
    const accTime = exerciseAccumulatedTimes[exId] || 0
    const left = Math.max(0,totalTime - accTime)
    setSecondsLeft(left)
    setIsRunning(true)
    hasSpokenRef.current = { 10: false,3: false,2: false,1: false }
  }

  const logCurrentActivity = async (exercise,sessionId,userId) => {
    let startTimes = []
    try {
      const str = await AsyncStorage.getItem("userActivityStartTimes")
      if (str) startTimes = JSON.parse(str)
    } catch { }
    const exId = exercise.exerciseId || exercise.id || exercise.ExerciseId
    const found = startTimes.find((e) => e.exerciseId === exId)
    const startTimeStr = found ? found.startTime : new Date().toISOString()
    const endTimeStr = new Date().toISOString()
    let durationSeconds = exerciseAccumulatedTimes[exId] || 0
    const start = exerciseStartTimes[exId]
    if (start) {
      durationSeconds += Math.floor((new Date() - new Date(start)) / 1000)
    }
    durationSeconds = Math.max(1,durationSeconds)
    const expectedDurationSeconds = (exercise.durationMinutes || 1) * 60 * (exercise.sets || 1)
    const calorieRatio = durationSeconds / expectedDurationSeconds
    const adjustedCalories = Math.round((exercise.calories || 0) * calorieRatio)
    const activity = {
      UserId: userId || 1,
      ActivityType: Number(exercise.activityType) || 1,
      ExerciseId: exId,
      SessionId: sessionId,
      Steps: exercise.steps || undefined,
      DistanceKm: exercise.distanceKm || 0,
      CaloriesBurned: adjustedCalories,
      DurationMinutes: Math.max(1,Math.round(durationSeconds / 60)),
      HeartRate: exercise.heartRate || undefined,
      Location: exercise.location || undefined,
      GoalStatus: "Completed",
      IsSummary: exercise.isSummary !== undefined ? exercise.isSummary : true,
      RecordedAt: endTimeStr,
      StartTime: startTimeStr,
      EndTime: endTimeStr,
    }
    await workoutService.createActivitiesBulk([sanitizeActivity(activity)])
  }

  const accumulateCurrentExerciseTime = () => {
    const ex = exercises[currentIndex]
    if (!ex) return
    const exId = ex.exerciseId || ex.id || ex.ExerciseId
    setExerciseAccumulatedTimes((prev) => {
      const prevAccum = prev[exId] || 0
      const start = exerciseStartTimes[exId]
      if (start) {
        const now = new Date()
        const diff = Math.floor((now - new Date(start)) / 1000)
        return { ...prev,[exId]: prevAccum + diff }
      }
      return prev
    })
    setExerciseStartTimes((prev) => ({ ...prev,[exId]: null }))
  }

  const getProgressPercent = () => {
    const totalSetsAll = exercises.reduce((sum,ex) => sum + (ex.sets || 1),0)
    let completedSets = 0
    for (let i = 0; i < currentIndex; i++) {
      completedSets += exercises[i]?.sets || 1
    }
    completedSets += currentSet - 1
    return totalSetsAll > 0 ? Math.floor((completedSets / totalSetsAll) * 100) : 0
  }

  const formatTime = (s) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2,"0")}`
  }

  const renderProgressBars = () => (
    <View style={styles.progressContainer}>
      <View style={styles.progressRow}>
        {exercises.map((_,idx) => (
          <View
            key={idx}
            style={[
              styles.progressBar,
              {
                backgroundColor: idx < currentIndex ? "#10B981" : idx === currentIndex ? "#3B82F6" : "#E5E7EB",
                flex: 1,
              },
            ]}
          />
        ))}
      </View>
      <Text style={styles.progressText}>
        Exercise {currentIndex + 1} of {exercises.length}
      </Text>
    </View>
  )

  const renderWarmupScreen = () => {
    const nextExercise = exercises[currentIndex] || {}
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <SafeAreaView style={{ flex: 1,justifyContent: "flex-start" }}>
          {renderVideoPlayer(nextExercise.mediaUrl,true)}
          <View style={styles.warmupContent}>
            <Text style={styles.readyTitle}>Ready to Go!</Text>

            <View style={styles.timerSection}>
              <Text style={styles.countdownTimer}>{warmupSeconds}</Text>
              <TouchableOpacity
                style={styles.nextButton}
                onPress={() => {
                  setIsWarmup(false)
                  clearInterval(warmupTimerRef.current)
                  setIsRunning(true)
                  const now = new Date()
                  setStartTime(now)
                  if (exercises[currentIndex]) {
                    const exId =
                      exercises[currentIndex].exerciseId ||
                      exercises[currentIndex].id ||
                      exercises[currentIndex].ExerciseId
                    let startTimes = []
                    try {
                      const str = AsyncStorage.getItem("userActivityStartTimes")
                      if (str) startTimes = JSON.parse(str)
                      startTimes = startTimes.filter((e) => e.exerciseId !== exId)
                    } catch { }
                    startTimes.push({ exerciseId: exId,startTime: now.toISOString() })
                    AsyncStorage.setItem("userActivityStartTimes",JSON.stringify(startTimes))
                    setExerciseStartTimes((prev) => ({ ...prev,[exId]: now }))
                  }
                }}
              >
                <Ionicons name="play" size={24} color="#fff" />
                <Text style={styles.nextButtonText}>Next</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.exercisePreview}>
              <Text style={styles.upNextText}>Up Next</Text>
              <Text style={styles.exerciseNamePreview}>{nextExercise.exerciseName || "Unknown Exercise"}</Text>
            </View>
          </View>
        </SafeAreaView>
      </View>
    )
  }

  const renderRestScreen = () => {
    let nextExercise = null
    let nextSet = 1
    if (currentSet < totalSets) {
      nextExercise = currentExercise
      nextSet = currentSet + 1
    } else if (currentIndex < exercises.length - 1) {
      nextExercise = exercises[currentIndex + 1]
      nextSet = 1
    }
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <SafeAreaView style={{ flex: 1,justifyContent: "flex-start" }}>
          {renderVideoPlayer(nextExercise?.mediaUrl,true)}
          <View style={styles.restContent}>
            <Text style={styles.restTitle}>Rest Time</Text>

            <View style={styles.timerSection}>
              <Text style={styles.restTimer}>{restSeconds}</Text>
              <TouchableOpacity
                style={styles.nextButton}
                onPress={() => {
                  setIsResting(false)
                  clearInterval(restTimerRef.current)
                  if (currentSet < totalSets) {
                    setCurrentSet((s) => s + 1)
                    setSecondsLeft(duration)
                    setIsRunning(true)
                    hasSpokenRef.current = { 10: false,3: false,2: false,1: false }
                  } else if (currentIndex < exercises.length - 1) {
                    setCurrentIndex((i) => i + 1)
                    setCurrentSet(1)
                    setSecondsLeft((exercises[currentIndex + 1]?.durationMinutes || 1) * 60)
                    setIsRunning(true)
                    hasSpokenRef.current = { 10: false,3: false,2: false,1: false }
                  } else {
                    setIsRunning(false)
                    Alert.alert("Workout Complete!","You have completed your workout session.",[
                      { text: "OK",onPress: () => navigation.goBack() },
                    ])
                  }
                }}
              >
                <Ionicons name="play" size={24} color="#fff" />
                <Text style={styles.nextButtonText}>Next</Text>
              </TouchableOpacity>
            </View>

            {nextExercise && (
              <View style={styles.exercisePreview}>
                <Text style={styles.upNextText}>Up Next</Text>
                <Text style={styles.exerciseNamePreview}>{nextExercise.exerciseName || "Unknown Exercise"}</Text>
                <Text style={styles.setPreview}>
                  Set {nextSet}/{nextExercise.sets || 1}
                </Text>
              </View>
            )}

            <TouchableOpacity style={styles.addTimeButton} onPress={() => setRestSeconds((s) => s + 20)}>
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.addTimeText}>+20s</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    )
  }

  const renderExerciseScreen = () => {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <SafeAreaView>{renderProgressBars()}</SafeAreaView>
        <SafeAreaView style={{ flex: 1,justifyContent: "flex-start" }}>
          {renderVideoPlayer(currentExercise.mediaUrl,isRunning)}
          <View style={styles.exerciseBottomContent}>
            <View style={styles.exerciseInfo}>
              <View style={styles.exerciseNameContainer}>
                <Text style={styles.exerciseNameMain}>{currentExercise.exerciseName || "Unknown Exercise"}</Text>
                <TouchableOpacity style={styles.infoButton} onPress={() => setShowExerciseInfo(true)}>
                  <Ionicons name="help-circle-outline" size={20} color="#64748B" />
                </TouchableOpacity>
              </View>
              <Text style={styles.setInfoMain}>
                Set {currentSet}/{totalSets}
              </Text>
              <Text style={styles.timerMain}>{formatTime(secondsLeft)}</Text>
            </View>

            <View style={styles.exerciseControls}>
              <TouchableOpacity
                disabled={currentIndex === 0}
                style={[styles.navButton,{ opacity: currentIndex === 0 ? 0.3 : 1 }]}
                onPress={() => {
                  if (currentIndex > 0) {
                    goToExercise(currentIndex - 1)
                  }
                }}
              >
                <Ionicons name="chevron-back" size={24} color="#fff" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.pauseButton} onPress={handlePause}>
                <Ionicons name={isRunning ? "pause" : "play"} size={32} color="#fff" />
              </TouchableOpacity>

              <TouchableOpacity
                disabled={currentIndex === exercises.length - 1}
                style={[styles.navButton,{ opacity: currentIndex === exercises.length - 1 ? 0.3 : 1 }]}
                onPress={() => {
                  if (currentIndex < exercises.length - 1) {
                    goToExercise(currentIndex + 1)
                  }
                }}
              >
                <Ionicons name="chevron-forward" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Exercise Info Modal */}
          <ExerciseInfoModal
            visible={showExerciseInfo}
            exercise={currentExercise}
            onClose={() => setShowExerciseInfo(false)}
          />
        </SafeAreaView>
      </View>
    )
  }

  useEffect(() => {
    if (secondsLeft === 0 && exercises.length > 0) {
      setSecondsLeft((exercises[0]?.durationMinutes || 1) * 60)
    }
  },[exercises])

  return (
    <>
      <Modal visible={showPauseModal} transparent animationType="fade" onRequestClose={() => setShowPauseModal(false)}>
        <View style={styles.pauseModalOverlay}>
          <View style={styles.pauseModalContent}>
            <Ionicons name="barbell" size={48} color="#3B82F6" style={{ marginBottom: 16 }} />
            <Text style={styles.pauseModalTitle}>Workout Progress: {getProgressPercent()}%</Text>
            <Text style={styles.pauseModalText}>
              Completed {currentIndex + 1}/{exercises.length} exercises, set {currentSet}/{totalSets} of current
              exercise.
            </Text>
            <View style={styles.pauseModalButtons}>
              <TouchableOpacity style={styles.stopModalButton} onPress={handleStop}>
                <Ionicons name="stop" size={24} color="#fff" />
                <Text style={styles.modalButtonText}>Stop</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.resumeModalButton} onPress={handleResume}>
                <Ionicons name="play" size={24} color="#fff" />
                <Text style={styles.modalButtonText}>Resume</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {!isRunning && !isWarmup && !isResting && !showPauseModal && currentSet === 1 && currentIndex === 0 ? (
        <View style={styles.startScreenContainer}>
          <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
          <SafeAreaView style={styles.startScreen}>
            <Text style={styles.startTitle}>Ready to Start?</Text>
            <Text style={styles.startSubtitle}>
              {exercises.length} exercises • {totalDuration} minutes • {totalCalories} calories
            </Text>
            <TouchableOpacity style={styles.startWorkoutButton} onPress={handleStart}>
              <Ionicons name="play" size={32} color="#fff" />
              <Text style={styles.startWorkoutText}>Start Workout</Text>
            </TouchableOpacity>
          </SafeAreaView>
        </View>
      ) : isWarmup ? (
        renderWarmupScreen()
      ) : isResting ? (
        renderRestScreen()
      ) : (
        renderExerciseScreen()
      )}
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },

  startScreenContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  startScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  startTitle: {
    fontSize: 32,
    fontWeight: "900",
    color: "#0F172A",
    marginBottom: 16,
    textAlign: "center",
  },
  startSubtitle: {
    fontSize: 18,
    color: "#64748B",
    marginBottom: 48,
    textAlign: "center",
  },
  startWorkoutButton: {
    backgroundColor: "#3B82F6",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 48,
    paddingVertical: 20,
    borderRadius: 25,
    gap: 12,
  },
  startWorkoutText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
  },

  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  progressRow: {
    flexDirection: "row",
    gap: 4,
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
  },
  progressText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },

  fullScreenVideoContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  fullScreenVideo: {
    width: screenWidth,
    height: screenHeight,
  },
  videoOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  overlayContent: {
    flex: 1,
    justifyContent: "space-between",
    zIndex: 1,
  },

  warmupHeader: {
    flexDirection: "row",
    justifyContent: "flex-start",
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  warmupContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  readyTitle: {
    fontSize: 48,
    fontWeight: "900",
    color: "#fff",
    marginBottom: 60,
    textAlign: "center",
  },
  timerSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 60,
    gap: 32,
  },
  countdownTimer: {
    fontSize: 80,
    fontWeight: "900",
    color: "#fff",
  },
  nextButton: {
    backgroundColor: "#3B82F6",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 25,
    gap: 8,
  },
  nextButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  exercisePreview: {
    alignItems: "center",
  },
  upNextText: {
    fontSize: 16,
    color: "rgba(255,255,255,0.8)",
    marginBottom: 8,
  },
  exerciseNamePreview: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
  },

  restHeader: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  restContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  restTitle: {
    fontSize: 48,
    fontWeight: "900",
    color: "#fff",
    marginBottom: 60,
    textAlign: "center",
  },
  restTimer: {
    fontSize: 80,
    fontWeight: "900",
    color: "#F59E0B",
  },
  setPreview: {
    fontSize: 16,
    color: "rgba(255,255,255,0.8)",
    marginTop: 4,
  },
  addTimeButton: {
    backgroundColor: "rgba(255,255,255,0.2)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    gap: 8,
    marginTop: 40,
  },
  addTimeText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  exerciseVideoContainer: {
    flex: 1,
    zIndex: 0,
  },
  exerciseVideo: {
    width: screenWidth,
    height: "100%",
  },
  exerciseBottomContent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.8)",
    paddingBottom: 40,
    zIndex: 1,
  },
  exerciseInfo: {
    alignItems: "center",
    paddingHorizontal: 32,
    paddingTop: 32,
    paddingBottom: 24,
  },
  exerciseNameContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  exerciseNameMain: {
    fontSize: 24,
    fontWeight: "800",
    color: "#fff",
    textAlign: "center",
  },
  infoButton: {
    padding: 4,
  },
  setInfoMain: {
    fontSize: 16,
    color: "#10B981",
    fontWeight: "600",
    marginBottom: 16,
  },
  timerMain: {
    fontSize: 48,
    fontWeight: "900",
    color: "#fff",
  },
  exerciseControls: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    gap: 32,
  },
  navButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  pauseButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#3B82F6",
    justifyContent: "center",
    alignItems: "center",
  },

  pauseModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  pauseModalContent: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    width: screenWidth - 64,
  },
  pauseModalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 12,
    textAlign: "center",
  },
  pauseModalText: {
    fontSize: 16,
    color: "#64748B",
    marginBottom: 32,
    textAlign: "center",
    lineHeight: 24,
  },
  pauseModalButtons: {
    flexDirection: "row",
    gap: 16,
  },
  stopModalButton: {
    backgroundColor: "#EF4444",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  resumeModalButton: {
    backgroundColor: "#3B82F6",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  modalButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 20,
    width: screenWidth - 40,
    maxHeight: screenHeight * 0.7,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  exerciseModalName: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 16,
    textAlign: "center",
  },
  descriptionContainer: {
    marginBottom: 20,
  },
  descriptionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 14,
    color: "#64748B",
    lineHeight: 20,
  },
  exerciseStatsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 20,
  },
  statItem: {
    alignItems: "center",
    gap: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
  },
  statValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  notesContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFFBEB",
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  notesText: {
    flex: 1,
    fontSize: 14,
    color: "#92400E",
    lineHeight: 20,
  },
  videoContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 24,
    paddingBottom: 16,
    backgroundColor: '#111',
  },
  videoPlayer: {
    width: Math.round(screenWidth * 0.92),
    height: Math.round(screenWidth * 0.92 * 9 / 16),
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0,height: 4 },
    elevation: 6,
  },
})

function sanitizeActivity(activity) {
  const clean = {}
  Object.entries(activity).forEach(([k,v]) => {
    if (v !== undefined && v !== null && !(typeof v === "number" && isNaN(v))) {
      clean[k] = v
    }
  })
  const metrics = ["Steps","DistanceKm","CaloriesBurned","DurationMinutes","HeartRate"]
  let hasMetric = false
  for (const m of metrics) {
    if (clean[m] && Number(clean[m]) > 0) {
      hasMetric = true
      break
    }
  }
  if (!hasMetric) {
    clean["DurationMinutes"] = 1
  }
  return clean
}
