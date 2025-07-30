import { useState, useEffect, useContext } from "react"
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Modal } from "react-native"
import Loading from "components/Loading"
import { showErrorFetchAPI, showSuccessMessage } from "utils/toastUtil"
import Svg, { Circle } from "react-native-svg"
import { Ionicons } from "@expo/vector-icons"
import { Video } from "expo-av"
import YouTubeIframe from "react-native-youtube-iframe"
import { LinearGradient } from "expo-linear-gradient"
import { AuthContext } from "context/AuthContext"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { workoutService } from "services/apiWorkoutService"

const { width, height: screenHeight } = Dimensions.get("window")

const getYouTubeVideoId = (url) => {
  if (!url) return null
  const regex = /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/
  const match = url.match(regex)
  return match ? match[1] : null
}

// Helper function to determine if URL is a YouTube URL
const isYouTubeUrl = (url) => {
  return url && (url.includes("youtube.com") || url.includes("youtu.be"))
}

const ReadyCircleProgress = ({ seconds, maxSeconds }) => {
  const size = 140
  const strokeWidth = 8
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progress = (maxSeconds - seconds) / maxSeconds
  const strokeDashoffset = circumference * (1 - progress)

  return (
    <View style={{ width: size, height: size, justifyContent: "center", alignItems: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute", top: 0, left: 0 }}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke="#fff" strokeWidth={strokeWidth} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#fff"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </Svg>
      <View style={styles.readyCountdownCircleContent}>
        <Text style={[styles.readyCountdownCircleText, { color: "#fff" }]}>{seconds}</Text>
        <Text style={styles.readyCountdownCircleLabel}>SEC</Text>
      </View>
    </View>
  )
}

const WorkoutInProgressScreen = ({ route, navigation }) => {
  const { user } = useContext(AuthContext)
  const {
    scheduledExercises = [],
    currentExerciseIndex = 0,
    timer,
    isPlaying,
    formatTime = (t) => t,
    pauseWorkout = () => {},
    resumeWorkout = () => {},
    nextExercise = () => {},
    completeWorkout = () => {},
    videoRef,
    setError,
  } = route.params || {}

  const [showResumePopup, setShowResumePopup] = useState(false)
  const [showReadyScreen, setShowReadyScreen] = useState(true)
  const [readySeconds, setReadySeconds] = useState(15)
  const [showRestScreen, setShowRestScreen] = useState(false)
  const [restSeconds, setRestSeconds] = useState(15)
  const [workoutStartTime, setWorkoutStartTime] = useState(null)
  const [workoutElapsed, setWorkoutElapsed] = useState(0)
  const [isWorkoutPaused, setIsWorkoutPaused] = useState(false)
  const [pausedAt, setPausedAt] = useState(null)
  const [totalPausedSeconds, setTotalPausedSeconds] = useState(0)
  const [exerciseEndTime, setExerciseEndTime] = useState(null)
  const [exerciseStartTime, setExerciseStartTime] = useState(null)
  const [localExerciseIndex, setLocalExerciseIndex] = useState(currentExerciseIndex)
  const [showExerciseInfo, setShowExerciseInfo] = useState(false)
  const [loading, setLoading] = useState(false)

  // Ready screen countdown
  useEffect(() => {
    if (!showReadyScreen) return
    if (readySeconds === 0) {
      setShowReadyScreen(false)
      setWorkoutStartTime(new Date())
      setWorkoutElapsed(0)
      setExerciseStartTime(new Date())
      return
    }
    const timerId = setTimeout(() => {
      setReadySeconds((s) => s - 1)
    }, 1000)
    return () => clearTimeout(timerId)
  }, [showReadyScreen, readySeconds])

  // Rest screen countdown
  useEffect(() => {
    if (!showRestScreen) return
    if (restSeconds === 0) {
      setShowRestScreen(false)
      setRestSeconds(15)
      if (isDefaultNextExercise) {
        setLocalExerciseIndex((prev) => {
          if (prev < scheduledExercises.length - 1) return prev + 1
          return prev
        })
        setExerciseStartTime(new Date())
        setWorkoutStartTime(new Date())
        setWorkoutElapsed(0)
        setTotalPausedSeconds(0)
        setPausedAt(null)
      } else {
        nextExercise()
        setExerciseStartTime(new Date())
        setWorkoutStartTime(new Date())
        setWorkoutElapsed(0)
        setTotalPausedSeconds(0)
        setPausedAt(null)
      }
      return
    }
    const timerId = setTimeout(() => {
      setRestSeconds((s) => s - 1)
    }, 1000)
    return () => clearTimeout(timerId)
  }, [showRestScreen, restSeconds, scheduledExercises.length, nextExercise])

  // Workout elapsed time tracking
  useEffect(() => {
    let intervalId
    if (!showReadyScreen && !showRestScreen && workoutStartTime && !isWorkoutPaused) {
      intervalId = setInterval(() => {
        const elapsed = Math.floor((Date.now() - workoutStartTime.getTime()) / 1000) - totalPausedSeconds
        setWorkoutElapsed(elapsed)
      }, 1000)
    }
    return () => intervalId && clearInterval(intervalId)
  }, [showReadyScreen, showRestScreen, workoutStartTime, isWorkoutPaused, totalPausedSeconds, pausedAt])

  const isDefaultNextExercise = !route.params?.nextExercise

  let safeIndex = isDefaultNextExercise ? localExerciseIndex : currentExerciseIndex
  if (!scheduledExercises || scheduledExercises.length === 0 || isNaN(safeIndex) || safeIndex < 0) safeIndex = 0
  if (safeIndex >= scheduledExercises.length) safeIndex = scheduledExercises.length - 1

  const effectiveExerciseIndex = safeIndex
  const currentExercise = scheduledExercises[effectiveExerciseIndex]
  const nextExerciseData =
    effectiveExerciseIndex + 1 < scheduledExercises.length ? scheduledExercises[effectiveExerciseIndex + 1] : null


  // playVideo: true nếu không pause, false nếu đang showResumePopup (pause)
  const renderVideoPlayer = (mediaUrl, forcePlay) => {
    const videoId = getYouTubeVideoId(mediaUrl);
    const videoWidth = width;
    const videoHeight = screenHeight * 0.45;
    // Nếu forcePlay không truyền vào thì mặc định là !showResumePopup
    const play = typeof forcePlay === 'boolean' ? forcePlay : !showResumePopup;

    if (isYouTubeUrl(mediaUrl) && videoId) {
      return (
        <View
          style={[styles.videoWrapper, { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 0 }]}
          pointerEvents="none"
        >
          <YouTubeIframe
            videoId={videoId}
            play={play}
            height={videoHeight}
            width={width}
            webViewStyle={[styles.videoContainer, { alignSelf: 'center', width: '100%' }]}
            initialPlayerParams={{ controls: 0, modestbranding: 1, rel: 0, showinfo: 0, fs: 0, autoplay: 1, disablekb: 1 }}
            webViewProps={{ allowsInlineMediaPlayback: true, scrollEnabled: false }}
            onError={(error) => {
              setError && setError("YouTube Error: " + error);
              showErrorFetchAPI("YouTube Error: " + error);
            }}
            onChangeState={() => {}}
            allowWebViewZoom={false}
            forceAndroidAutoplay
            disableWebView={false}
            pointerEvents="none"
            style={[styles.videoContainer, { alignSelf: 'center', width: '100%' }]}
          />
        </View>
      );
    }

    if (mediaUrl && (mediaUrl.endsWith(".mp4") || mediaUrl.endsWith(".mov") || mediaUrl.endsWith(".webm"))) {
      return (
        <View style={styles.videoWrapper}>
          <Video
            ref={videoRef}
            source={{ uri: mediaUrl }}
            rate={1.0}
            volume={0.8}
            isMuted={false}
            resizeMode="cover"
            shouldPlay={play}
            isLooping={true}
            useNativeControls={true}
            style={styles.videoContainer}
            onError={(error) => {
              setError && setError("Video Error: " + error);
              showErrorFetchAPI("Video Error: " + error);
            }}
          />
        </View>
      );
    }

    return (
      <View style={styles.videoWrapper}>
        <View style={[styles.videoContainer, styles.noVideoContainer]}>
          <Ionicons name="videocam-off" size={48} color="#666" />
          <Text style={styles.noVideoText}>No video available</Text>
        </View>
      </View>
    );
  }  

  const handleAddRestTime = () => {
    setRestSeconds((prev) => prev + 20) // Changed to +20s to match design
  }

  // Format time as MM:SS
  const formatRestTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  // Calculate workout progress
  const workoutProgress = Math.round(((effectiveExerciseIndex + 1) / scheduledExercises.length) * 100)
  const exercisesLeft = scheduledExercises.length - (effectiveExerciseIndex + 1)

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', position: 'absolute', width: '100%', height: '100%', zIndex: 999 }}>
        <Loading />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {showReadyScreen ? (
        <LinearGradient colors={["#0056dff2", "#003d99"]} style={styles.readyContainer}>
          <View style={styles.readyHeader}>
            <Text style={styles.readyTitle}>GET READY!</Text>
            <Text style={styles.readySubtitle}>Prepare yourself for the workout</Text>
          </View>

          {renderVideoPlayer(scheduledExercises[0]?.mediaUrl)}

          <View style={styles.readyExerciseInfo}>
            <View style={styles.exerciseNameContainer}>
              <View style={styles.exerciseDot} />
              <Text style={styles.readyExerciseName}>{scheduledExercises[0]?.exerciseName || "Unknown Exercise"}</Text>
            </View>
          </View>

          <View style={styles.readyControls}>
            <ReadyCircleProgress seconds={readySeconds} maxSeconds={15} />
            <TouchableOpacity
              style={styles.startButton}
              onPress={async () => {
                // Clear workoutLogs before start to avoid duplicate/old logs
                try { await AsyncStorage.removeItem("workoutLogs"); } catch (e) {}
                setShowReadyScreen(false)
                setWorkoutStartTime(new Date())
                setWorkoutElapsed(0)
                setIsWorkoutPaused(false)
                setPausedAt(null)
                setTotalPausedSeconds(0)
              }}
            >
              <LinearGradient colors={["#ffffff", "#ffffff"]} style={styles.startButtonGradient}>
                <Ionicons name="play" size={28} color="#0056d2" />
                <Text style={styles.startButtonText}>START</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      ) : showRestScreen ? (
        <LinearGradient colors={["#5394f5ff", "#0563bcff", "#0056d2"]} style={styles.newRestContainer}>
          {/* Top Section - REST Title and Timer */}
          <View style={styles.restTopSection}>
            <Text style={styles.newRestTitle}>REST</Text>
            <Text style={styles.newRestTimer}>{formatRestTime(restSeconds)}</Text>

            {/* Control Buttons */}
            <View style={styles.restButtonsContainer}>
              <TouchableOpacity style={styles.addTimeButtonNew} onPress={handleAddRestTime}>
                <Text style={styles.addTimeButtonText}>+20s</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.skipButtonNew}
                onPress={() => {
                  setShowRestScreen(false)
                  setRestSeconds(15)
                  if (isDefaultNextExercise) {
                    setLocalExerciseIndex((prev) => {
                      if (prev < scheduledExercises.length - 1) return prev + 1
                      return prev
                    })
                    setExerciseStartTime(new Date())
                    setWorkoutStartTime(new Date())
                    setWorkoutElapsed(0)
                    setTotalPausedSeconds(0)
                    setPausedAt(null)
                  } else {
                    nextExercise()
                    setExerciseStartTime(new Date())
                    setWorkoutStartTime(new Date())
                    setWorkoutElapsed(0)
                    setTotalPausedSeconds(0)
                    setPausedAt(null)
                  }
                }}
              >
                <Text style={styles.skipButtonTextNew}>Skip</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Bottom Section - Next Exercise Info */}
          <View style={styles.restBottomSection}>
            <Text style={styles.nextExerciseLabel}>
              NEXT {effectiveExerciseIndex + 2}/{scheduledExercises.length}
            </Text>

            <View style={styles.nextExerciseHeader}>
              <Text style={styles.nextExerciseName}>
                {(nextExerciseData?.exerciseName || "Unknown Exercise").toUpperCase()}
              </Text>
              <View style={styles.exerciseInfoRow}>
                <Ionicons name="help-circle-outline" size={20} color="#1F2937" />
                <Text style={styles.exerciseReps}>x {nextExerciseData?.duration || 20}</Text>
              </View>
            </View>

            {/* Next Exercise Video Preview */}
            <View style={styles.nextExerciseVideoContainer}>
              {renderVideoPlayer(nextExerciseData?.mediaUrl)}
            </View>
          </View>
        </LinearGradient>
      ) : (
        <>
          {!scheduledExercises || scheduledExercises.length === 0 || !currentExercise ? (
            <View style={styles.noExerciseContainer}>
              <Ionicons name="fitness" size={64} color="#666" />
              <Text style={styles.noExerciseText}>No exercises available</Text>
            </View>
          ) : (
            <View style={styles.newWorkoutContainer}>
              {/* Header with progress and close button */}
              <View style={styles.newWorkoutHeader}>
                <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
                  <Ionicons name="close" size={24} color="#000" />
                </TouchableOpacity>

                <View style={styles.headerCenter}>
                  <Text style={styles.exerciseProgress}>
                    Exercises {effectiveExerciseIndex + 1}/{scheduledExercises.length}
                  </Text>
                  <Text style={styles.exerciseTimer}>{formatTime(workoutElapsed)}</Text>
                </View>

                <TouchableOpacity style={styles.musicButton}>
                  <Ionicons name="musical-notes" size={24} color="#000" />
                </TouchableOpacity>
              </View>

              {/* Progress Bar */}
              <View style={styles.newProgressBar}>
                <View
                  style={[
                    styles.newProgressFill,
                    {
                      width: `${((effectiveExerciseIndex + 1) / scheduledExercises.length) * 100}%`,
                    },
                  ]}
                />
              </View>

              {/* Current Exercise Title */}
              <View style={styles.exerciseTitleContainer}>
                <Text style={styles.newCurrentExerciseName}>
                  {(currentExercise.exerciseName || "Unknown Exercise").toUpperCase()}
                </Text>
                <Text style={styles.nextExerciseHint}>Next</Text>
              </View>

              {/* Video Player */}
              <View style={styles.newVideoSection}>{renderVideoPlayer(currentExercise.mediaUrl)}</View>

              {/* Next Exercise Info */}
              <View style={styles.nextExerciseInfo}>
                <View style={{ width: "100%", flexDirection: "row", alignItems: "flex-start", justifyContent: "center" }}>
                  <Text style={styles.nextExerciseTitle}>
                    {(nextExerciseData?.exerciseName || "Workout Complete").toUpperCase()
                    }
                  </Text>
                  <TouchableOpacity onPress={() => setShowExerciseInfo(true)}>
                    <Ionicons name="help-circle-outline" size={14} color="#0056d2" style={{ marginLeft: 4, marginTop: -8 }} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Timer Display */}
              <View style={styles.newTimerSection}>
                <Text style={styles.newTimerText}>{formatTime(workoutElapsed)}</Text>
              </View>

              {/* Control Buttons */}
              <View style={styles.newControlsContainer}>
        
                <TouchableOpacity
                  style={styles.newControlButton}
                  onPress={() => {
                    pauseWorkout()
                    setIsWorkoutPaused(true)
                    setPausedAt(Date.now())
                    setShowResumePopup(true)
                    if (isDefaultNextExercise) {
                      setLocalExerciseIndex(0)
                    } else {
                      route.params.currentExerciseIndex = 0
                    }
                  }}
                >
                  <Ionicons name="play-back" size={28} color="#000" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.newMainControlButton}
                  onPress={() => {
                    pauseWorkout()
                    setIsWorkoutPaused(true)
                    setPausedAt(Date.now())
                    setShowResumePopup(true)
                  }}
                >
                  <LinearGradient colors={["#0056d2", "#003d99"]} style={styles.newMainControlGradient}>
                    <Ionicons name={isPlaying ? "pause" : "play"} size={32} color="#fff" />
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.newControlButton}
                  onPress={async () => {
                    const endTime = new Date();
                    setExerciseEndTime(endTime);

                    try {
                      const log = {
                        exerciseId: currentExercise?.exerciseId || null,
                        exerciseName: currentExercise?.exerciseName,
                        caloriesBurnedPerMin: currentExercise?.caloriesBurnedPerMin,
                        duration: currentExercise?.duration,
                        startTime: workoutStartTime ? workoutStartTime.toISOString() : null,
                        endTime: endTime.toISOString(),
                        elapsedTime: workoutElapsed,
                        index: effectiveExerciseIndex + 1,
                        userId: user?.userId || null,
                        sessionId: route.params?.sessionId || null,
                      };
                      const prevLogs = await AsyncStorage.getItem("workoutLogs");
                      const logsArr = prevLogs ? JSON.parse(prevLogs) : [];
                      logsArr.push(log);
                      await AsyncStorage.setItem("workoutLogs", JSON.stringify(logsArr));
                    } catch (err) {
                      // Handle error silently
                    }

                    if (effectiveExerciseIndex < scheduledExercises.length - 1) {
                      setShowRestScreen(true);
                      setRestSeconds(15);
                    } else {
                      // Đảm bảo chỉ tạo session 1 lần duy nhất
                      try {
                        const logsRaw = await AsyncStorage.getItem("workoutLogs");
                        const logsArr = logsRaw ? JSON.parse(logsRaw) : [];
                        console.log('DEBUG: workoutLogs before create session:', logsArr);
                        if (!logsArr.length) throw new Error("No workout logs found");

                        let sessionStart = logsArr[0]?.startTime;
                        if (!sessionStart) {
                          sessionStart =
                            exerciseStartTime?.toISOString() ||
                            workoutStartTime?.toISOString() ||
                            new Date().toISOString();
                        }
                        const sessionEnd = logsArr[logsArr.length - 1].endTime;
                        const totalCalories = logsArr.reduce((sum, l) => sum + (l.caloriesBurnedPerMin || 0), 0);
                        const totalDuration = Math.floor((new Date(sessionEnd) - new Date(sessionStart)) / 1000);

                        const notes = `Logged ${logsArr.length} exercise${logsArr.length === 1 ? '' : 's'}`;
                        const sessionPayload = [
                          {
                            UserId: user?.userId,
                            StartTime: sessionStart,
                            EndTime: sessionEnd,
                            TotalCaloriesBurned: totalCalories,
                            TotalDurationMinutes: totalDuration,
                            Notes: notes,
                          },
                        ];

                        // Kiểm tra lại không gọi API tạo session ở nơi khác
                        const sessionRes = await workoutService.createWorkoutSessionsBulk(sessionPayload);
                        let sessionId = null;
                        if (sessionRes && sessionRes.data && Array.isArray(sessionRes.data.createdSessions) && sessionRes.data.createdSessions.length > 0) {
                          const createdSession = sessionRes.data.createdSessions[0];
                          sessionId = createdSession.id || createdSession.sessionId || null;
                        }

                        const activities = logsArr.map((l) => {
                          const duration = Math.floor((new Date(l.endTime) - new Date(l.startTime)) / 1000);
                          return {
                            UserId: user?.userId,
                            ActivityType: 1,
                            ExerciseId: l.exerciseId,
                            SessionId: sessionId,
                            Steps: l.steps || 0,
                            DistanceKm: l.distanceKm || 0,
                            CaloriesBurned: l.caloriesBurnedPerMin || 0,
                            DurationMinutes: duration,
                            HeartRate: l.heartRate || 220,
                            Location: "string",
                            GoalStatus: "Failed",
                            IsSummary: true,
                            RecordedAt: l.endTime,
                          };
                        });

                        await workoutService.createActivitiesBulk(activities);
                        await AsyncStorage.removeItem("workoutLogs");
                        completeWorkout();
                        navigation.goBack();
                      } catch (err) {
                        completeWorkout();
                        navigation.goBack();
                      }
                    }
                  }}
                >
                  <Ionicons name="play-forward" size={28} color="#000" />
                </TouchableOpacity>
              </View>

              {/* New Resume Popup */}
              {showResumePopup && !isPlaying && (
                <Modal transparent={true} visible={showResumePopup} animationType="fade">
                  <View style={styles.newModalOverlay}>
                    <View style={styles.newModalContainer}>
                      {/* Background Exercise Video */}
                      <View style={styles.modalBackgroundVideo}>
                        {renderVideoPlayer(currentExercise.mediaUrl, false)}
                        <View style={styles.modalVideoOverlay} />
                      </View>

                      {/* Modal Content */}
                      <View style={styles.newModalContent}>
                        <View style={styles.modalHeader}>
                          <Text style={styles.modalExerciseProgress}>
                            Exercises {effectiveExerciseIndex + 1}/{scheduledExercises.length}
                          </Text>
                          <Text style={styles.modalTimer}>{formatTime(workoutElapsed)}</Text>
                        </View>

                        <View style={styles.modalMainContent}>
                          <Text style={styles.modalTitle}>Hold on!</Text>
                          <Text style={styles.modalSubtitle}>You can do it!</Text>

                          <View style={styles.modalProgressInfo}>
                            <Text style={styles.modalProgressText}>
                              You have finished <Text style={styles.modalProgressPercent}>{workoutProgress}%</Text>
                            </Text>
                            <Text style={styles.modalProgressText}>
                              Only <Text style={styles.modalExercisesLeft}>{exercisesLeft} exercises</Text> left
                            </Text>
                          </View>

                          {/* Nút tròn ở dưới để resume */}
                          <TouchableOpacity
                            style={{
                              width: 80,
                              height: 80,
                              borderRadius: 40,
                              backgroundColor: '#0056d2',
                              alignItems: 'center',
                              justifyContent: 'center',
                              marginBottom: 24,
                              elevation: 8,
                              shadowColor: '#0056d2',
                              shadowOffset: { width: 0, height: 4 },
                              shadowOpacity: 0.3,
                              shadowRadius: 8,
                            }}
                            onPress={() => {
                              resumeWorkout()
                              setShowResumePopup(false)
                              if (isWorkoutPaused && pausedAt) {
                                setTotalPausedSeconds((prev) => prev + Math.floor((Date.now() - pausedAt) / 1000))
                              }
                              setIsWorkoutPaused(false)
                              setPausedAt(null)
                            }}
                          >
                            <Ionicons name="play" size={40} color="#fff" />
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.modalSecondaryButton}
                            onPress={() => {
                              setShowResumePopup(false)
                              setShowReadyScreen(true)
                              setReadySeconds(15)
                              setWorkoutStartTime(null)
                              setWorkoutElapsed(0)
                              setTotalPausedSeconds(0)
                              setPausedAt(null)
                              setIsWorkoutPaused(false)
                              if (isDefaultNextExercise) {
                                setLocalExerciseIndex(0)
                              } else {
                                route.params.currentExerciseIndex = 0
                              }
                            }}
                          >
                            <Text style={styles.modalSecondaryButtonText}>Restart this exercise</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.modalTertiaryButton}
                            onPress={() => {
                              setExerciseEndTime(new Date())
                              pauseWorkout()
                              setShowResumePopup(false)
                              completeWorkout()
                              navigation.goBack()
                            }}
                          >
                            <Text style={styles.modalTertiaryButtonText}>Quit</Text>
                          </TouchableOpacity>

                          {/* Chỉ hiển thị chữ Stop, không có nút bấm */}
                          <Text style={[styles.modalTertiaryButtonText, { color: '#ef4444', fontWeight: 'bold', marginTop: 10 }]}>Stop</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </Modal>
              )}
              {/* Popup Exercise Info */}
              <Modal visible={showExerciseInfo} transparent animationType="fade">
                <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center" }}>
                  <View style={{ backgroundColor: "#fff", borderRadius: 18, padding: 24, minWidth: 280, maxWidth: 340, elevation: 8 }}>
                    <Text style={{ fontSize: 20, fontWeight: "bold", marginBottom: 12, color: "#0056d2", textAlign: "center" }}>
                      {nextExerciseData?.exerciseName || "Workout Complete"}
                    </Text>
                    {nextExerciseData ? (
                      <>
                        {nextExerciseData.mediaUrl && (
                          <View style={{ alignItems: "center", marginBottom: 12 }}>
                            {renderVideoPlayer(nextExerciseData.mediaUrl, false)}
                          </View>
                        )}
                 
                        {nextExerciseData.caloriesBurnedPerMin && (
                          <Text style={{ fontSize: 16, marginBottom: 6 }}>
                            <Text style={{ fontWeight: "bold" }}>Calories/min: </Text>
                            {nextExerciseData.caloriesBurnedPerMin}
                          </Text>
                        )}
                        {nextExerciseData.description && (
                          <Text style={{ fontSize: 16, marginBottom: 6 }}>
                            <Text style={{ fontWeight: "bold" }}>Description: </Text>
                            {nextExerciseData.description}
                          </Text>
                        )}
                        {/* Add more fields if needed */}
                      </>
                    ) : (
                      <Text style={{ fontSize: 16 }}>No data available.</Text>
                    )}
                    <TouchableOpacity onPress={() => setShowExerciseInfo(false)} style={{ marginTop: 18, alignSelf: "center" }}>
                      <Text style={{ color: "#0056d2", fontWeight: "bold", fontSize: 16 }}>Đóng</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Modal>
            </View>
          )}
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  // Ready Screen Styles
  readyContainer: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  readyHeader: {
    alignItems: "center",
    marginBottom: 20,
  },
  readyTitle: {
    fontSize: 36,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 2,
    textAlign: "center",
  },
  readySubtitle: {
    fontSize: 16,
    color: "rgba(255,255,255,0.8)",
    marginTop: 8,
    textAlign: "center",
  },
  readyExerciseInfo: {
    alignItems: "center",
    marginVertical: 20,
  },
  exerciseNameContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  exerciseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FF6B35",
    marginRight: 12,
  },
  readyExerciseName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  readyControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginTop: 30,
  },
  readyCountdownCircleContent: {
    alignItems: "center",
  },
  readyCountdownCircleText: {
    fontSize: 32,
    fontWeight: "900",
    color: "#fff",
  },
  readyCountdownCircleLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
    marginTop: 4,
  },
  startButton: {
    borderRadius: 30,
    overflow: "hidden",
    elevation: 8,
    shadowColor: "#0056d2",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  startButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 32,
    paddingVertical: 16,
    gap: 12,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0056d2",
    letterSpacing: 1,
  },

  // NEW REST SCREEN STYLES - Clean Design
  newRestContainer: {
    flex: 1,
    paddingTop: 60,
  },
  restTopSection: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  newRestTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 3,
    marginBottom: 40,
  },
  newRestTimer: {
    fontSize: 80,
    fontWeight: "900",
    color: "#FFFFFF",
    fontVariant: ["tabular-nums"],
    marginBottom: 60,
  },
  restButtonsContainer: {
    flexDirection: "row",
    gap: 20,
    alignItems: "center",
  },
  addTimeButtonNew: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 25,
  },
  addTimeButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  skipButtonNew: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 25,
  },
  skipButtonTextNew: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0056d2",
  },
  restBottomSection: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 30,
    paddingHorizontal: 20,
    paddingBottom: 40,
    minHeight: screenHeight * 0.45,
  },
  nextExerciseLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0056d2",
    marginBottom: 8,
  },
  nextExerciseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  nextExerciseName: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1F2937",
    flex: 1,
    marginRight: 16,
  },
  exerciseInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  exerciseReps: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  nextExerciseVideoContainer: {
    borderRadius: 0,
    overflow: "visible",
    elevation: 0,
    shadowColor: "transparent",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    width: "100%",
    backgroundColor: "transparent",
  },

  // NEW WORKOUT SCREEN STYLES
  newWorkoutContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingTop: 50,
  },
  newWorkoutHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    alignItems: "center",
    flex: 1,
  },
  exerciseProgress: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  exerciseTimer: {
    fontSize: 14,
    fontWeight: "500",
    color: "#999",
    marginTop: 2,
  },
  musicButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
  },
  newProgressBar: {
    height: 4,
    backgroundColor: "#E5E5E5",
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 2,
  },
  newProgressFill: {
    height: "100%",
    backgroundColor: "#000",
    borderRadius: 2,
  },
  exerciseTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  newCurrentExerciseName: {
    fontSize: 24,
    fontWeight: "800",
    color: "#000",
    flex: 1,
  },
  nextExerciseHint: {
    fontSize: 16,
    fontWeight: "600",
    color: "#999",
  },
  newVideoSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  nextExerciseInfo: {
    paddingHorizontal: 20,
  },
  nextExerciseTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
    marginBottom: 8,
  },
  nextExerciseDetails: {
    flexDirection: "row",
    alignItems: "center",
  },
  newTimerSection: {
    alignItems: "center",
    marginBottom: 10,
  },
  newTimerText: {
    fontSize: 64,
    fontWeight: "900",
    color: "#0056d2",
    fontVariant: ["tabular-nums"],
  },
  newControlsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    paddingBottom: 40,
    gap: 40,
  },
  newControlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
  },
  newMainControlButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: "hidden",
    elevation: 8,
    shadowColor: "#0056d2",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  newMainControlGradient: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },

  // NEW MODAL STYLES
  newModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  newModalContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  modalBackgroundVideo: {
    height: screenHeight * 0.5,
    position: "relative",
  },
  modalVideoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.8)",
  },
  newModalContent: {
    flex: 1,
    paddingTop: 30,
    paddingHorizontal: 20,
  },
  modalHeader: {
    alignItems: "center",
    marginBottom: 40,
  },
  modalExerciseProgress: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  modalTimer: {
    fontSize: 14,
    fontWeight: "500",
    color: "#999",
    marginTop: 2,
  },
  modalMainContent: {
    alignItems: "center",
    flex: 1,
  },
  modalTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "#000",
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#000",
    marginBottom: 40,
  },
  modalProgressInfo: {
    alignItems: "center",
    marginBottom: 60,
  },
  modalProgressText: {
    fontSize: 18,
    fontWeight: "500",
    color: "#666",
    marginBottom: 8,
  },
  modalProgressPercent: {
    color: "#0056d2",
    fontWeight: "700",
  },
  modalExercisesLeft: {
    color: "#0056d2",
    fontWeight: "700",
  },
  newResumeButton: {
    width: "100%",
    borderRadius: 25,
    overflow: "hidden",
    marginBottom: 20,
    elevation: 4,
    shadowColor: "#0056d2",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  newResumeButtonGradient: {
    paddingVertical: 18,
    alignItems: "center",
  },
  newResumeButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  modalSecondaryButton: {
    paddingVertical: 15,
    marginBottom: 15,
  },
  modalSecondaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
  },
  modalTertiaryButton: {
    paddingVertical: 15,
  },
  modalTertiaryButtonText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#999",
  },

  // Video Styles
  videoWrapper: {
    borderRadius: 0,
    overflow: "visible",
    marginVertical: 0,
    elevation: 0,
    shadowColor: "transparent",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    backgroundColor: "transparent",
    width: "100%",
  },
  videoContainer: {
    width: "100%",
    height: screenHeight * 0.45,
    backgroundColor: "transparent",
    borderRadius: 0,
  },
  noVideoContainer: {
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  noVideoText: {
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },

  // No Exercise Styles
  noExerciseContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  noExerciseText: {
    fontSize: 18,
    color: "#666",
    fontWeight: "600",
  },
})

export default WorkoutInProgressScreen
