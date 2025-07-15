
import { useEffect, useState } from "react"
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity } from "react-native"
import { Video } from "expo-av"
import { WebView } from 'react-native-webview'
import { Ionicons } from "@expo/vector-icons" 
import { LinearGradient } from "expo-linear-gradient"
import { SafeAreaView } from "react-native-safe-area-context"
import AsyncStorage from "@react-native-async-storage/async-storage"
import Header from "components/Header"
import Loading from "components/Loading"
import { showErrorFetchAPI, showSuccessMessage } from "utils/toastUtil"
import workoutService from "services/apiWorkoutService"
const ExerciseDetailsScreen = ({ route, navigation }) => {
  const { exercise } = route.params


  // Helper: check if mediaUrl là video file
  const isVideo = (url) => {
    if (!url) return false
    return url.match(/\.(mp4|mov|webm|avi|mkv)$/i)
  }
  // Helper: check nếu là link YouTube
  const isYouTube = (url) => {
    if (!url) return false
    return /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//.test(url)
  }
  // Helper: lấy videoId từ link YouTube
  const getYouTubeId = (url) => {
    if (!url) return null
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/
    const match = url.match(regExp)
    return match && match[2].length === 11 ? match[2] : null
  }

  const [categoryName, setCategoryName] = useState("")
  const [mediaType, setMediaType] = useState(() => {
    if (exercise && exercise.mediaUrl) {
      if (isVideo(exercise.mediaUrl)) return "video"
      if (isYouTube(exercise.mediaUrl)) return "youtube"
    }
    return "image"
  })
  const [isFavorite, setIsFavorite] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const checkFavorite = async () => {
      try {
        setLoading(true)
        const storedFavorites = await AsyncStorage.getItem("favoriteExercises")
        const favoriteList = storedFavorites ? JSON.parse(storedFavorites) : []
        setIsFavorite(favoriteList.some((ex) => ex.exerciseId === exercise.exerciseId))
      } catch (error) {
        setIsFavorite(false)
      } finally {
        setLoading(false)
      }
    }
    checkFavorite()
  }, [exercise.exerciseId])

  const toggleFavorite = async () => {
    try {
      setLoading(true)
      const storedFavorites = await AsyncStorage.getItem("favoriteExercises")
      const favoriteList = storedFavorites ? JSON.parse(storedFavorites) : []
      const exists = favoriteList.some((ex) => ex.exerciseId === exercise.exerciseId)
      let updatedList
      if (exists) {
        updatedList = favoriteList.filter((ex) => ex.exerciseId !== exercise.exerciseId)
      } else {
        updatedList = [...favoriteList, exercise]
      }
      await AsyncStorage.setItem("favoriteExercises", JSON.stringify(updatedList))
      setIsFavorite(!exists)
      showSuccessMessage(exists ? "Removed from favorites" : "Added to favorites")
    } catch (error) {
      showErrorFetchAPI("Failed to update favorites.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const fetchCategoryName = async () => {
      if (typeof exercise.categoryId === "number") {
        try {
          setLoading(true)
          const data = await workoutService.getCategoryById(exercise.categoryId)
          setCategoryName(data?.categoryName || exercise.categoryId)
        } catch (error) {
          setCategoryName("N/A")
        } finally {
          setLoading(false)
        }
      } else {
        setCategoryName(exercise.categoryId ?? "N/A")
      }
    }
    fetchCategoryName()
  }, [exercise.categoryId])

  const getExerciseImage = (exerciseName) => {
    return `https://source.unsplash.com/600x400/?fitness,${exerciseName.replace(/\s/g, "")}`
  }

  const handleAddToWorkout = async () => {
    try {
      setLoading(true)
      const storedExercises = await AsyncStorage.getItem("scheduledExercises")
      const scheduledExercises = storedExercises ? JSON.parse(storedExercises) : []
      if (scheduledExercises.some((ex) => ex.exerciseId === exercise.exerciseId)) {
        showErrorFetchAPI(`${exercise.exerciseName} is already in your workout schedule`)
        return
      }
      const exerciseToSave = {
        ...exercise,
        mediaUrl: exercise.mediaUrl || "",
      }
      scheduledExercises.push(exerciseToSave)
      await AsyncStorage.setItem("scheduledExercises", JSON.stringify(scheduledExercises))
      showSuccessMessage(`${exercise.exerciseName} added to your workout schedule`)
    } catch (error) {
      showErrorFetchAPI("Failed to add exercise to schedule. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      {loading ? (
        <View style={{ flex: 1, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', position: 'absolute', width: '100%', height: '100%', zIndex: 999 }}>
          <Loading />
        </View>
      ) : (
        <>
          <Header
            title={exercise.exerciseName || "Exercise Details"}
            onBack={() => navigation.goBack()}
            backgroundColor="#fff"
            titleStyle={{ color: "#6C63FF", fontWeight: "bold" }}
            rightActions={[
              {
                icon: isFavorite ? "heart" : "heart-outline",
                onPress: toggleFavorite,
                color: isFavorite ? "#EF4444" : "#6C63FF",
              },
              {
                icon: "add-circle-outline",
                onPress: handleAddToWorkout,
                color: "#0056d2",
              },
            ]}
          />
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollViewContent, { marginTop: 55 }] }>
            <View
              style={[
                styles.mediaContainer,
                (mediaType === "image" || mediaType === "video") && { backgroundColor: "#FFFFFF" },
              ]}
            >
              {mediaType === "video" && exercise.mediaUrl && isVideo(exercise.mediaUrl) ? (
                <Video
                  source={{ uri: exercise.mediaUrl }}
                  style={styles.heroMedia}
                  useNativeControls
                  resizeMode="cover"
                  shouldPlay={true}
                  isLooping={true}
                  posterSource={{ uri: exercise.imageUrl || getExerciseImage(exercise.exerciseName) }}
                  posterStyle={{ width: "100%", height: "100%" }}
                />
              ) : mediaType === "youtube" && exercise.mediaUrl && isYouTube(exercise.mediaUrl) ? (
                <WebView
                  style={styles.heroMedia}
                  javaScriptEnabled={true}
                  domStorageEnabled={true}
                  source={{
                    uri: `https://www.youtube.com/embed/${getYouTubeId(exercise.mediaUrl)}?autoplay=0&modestbranding=1&controls=1`,
                  }}
                  allowsFullscreenVideo
                />
              ) : (
                <Image
                  source={{ uri: exercise.imageUrl || getExerciseImage(exercise.exerciseName) }}
                  style={styles.heroMedia}
                  resizeMode="cover"
                />
              )}
              <LinearGradient colors={["transparent", "rgba(0,0,0,0.8)"]} style={styles.imageGradient} />
            </View>
            {/* Toggle buttons for media type */}
            <View style={styles.mediaToggleContainer}>
              <TouchableOpacity
                style={[styles.mediaToggleButton, mediaType === "image" && styles.mediaToggleButtonActive]}
                onPress={() => setMediaType("image")}
                disabled={mediaType === "image"}
              >
                <Text style={[styles.mediaToggleText, mediaType === "image" && styles.mediaToggleTextActive]}>Image</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.mediaToggleButton,
                  mediaType === "video" && styles.mediaToggleButtonActive,
                  !exercise.mediaUrl || (!isVideo(exercise.mediaUrl)) ? styles.mediaToggleButtonDisabled : null,
                ]}
                onPress={() => setMediaType("video")}
                disabled={!exercise.mediaUrl || !isVideo(exercise.mediaUrl) || mediaType === "video"}
              >
                <Text
                  style={[
                    styles.mediaToggleText,
                    mediaType === "video" && styles.mediaToggleTextActive,
                    (!exercise.mediaUrl || !isVideo(exercise.mediaUrl)) && styles.mediaToggleTextDisabled,
                  ]}
                >
                  Video
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.mediaToggleButton,
                  mediaType === "youtube" && styles.mediaToggleButtonActive,
                  !exercise.mediaUrl || !isYouTube(exercise.mediaUrl) ? styles.mediaToggleButtonDisabled : null,
                ]}
                onPress={() => setMediaType("youtube")}
                disabled={!exercise.mediaUrl || !isYouTube(exercise.mediaUrl) || mediaType === "youtube"}
              >
                <Text
                  style={[
                    styles.mediaToggleText,
                    mediaType === "youtube" && styles.mediaToggleTextActive,
                    (!exercise.mediaUrl || !isYouTube(exercise.mediaUrl)) && styles.mediaToggleTextDisabled,
                  ]}
                >
                  YouTube
                </Text>
              </TouchableOpacity>
            </View>

            {/* New Key Metrics Section */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Key Metrics</Text>
              <View style={styles.metricsGrid}>
                <View style={styles.metricCard}>
                  <Text style={styles.metricValue}>{exercise.caloriesBurnedPerMin ?? "N/A"}</Text>
                  <Text style={styles.metricLabel}>kcal/min</Text>
                </View>
                {exercise.genderSpecific && (
                  <View style={styles.metricCard}>
                    <Text style={styles.metricValue}>{exercise.genderSpecific}</Text>
                    <Text style={styles.metricLabel}>Gender</Text>
                  </View>
                )}
                <View style={styles.metricCard}>
                  <Text style={styles.metricValue}>
                    {new Date(exercise.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </Text>
                  <Text style={styles.metricLabel}>Added On</Text>
                </View>
              </View>
            </View>

            {/* Category Card */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Category</Text>
              <TouchableOpacity
                style={styles.categoryCard}
                onPress={() =>
                  navigation.navigate("ExercisesByCategoryScreen", {
                    categoryId: exercise.categoryId,
                    categoryName: categoryName,
                  })
                }
              >
                <Text style={styles.categoryText}>{categoryName || "Loading..."}</Text>
                <Ionicons name="chevron-forward-outline" size={20} color="#9E9E9E" />
              </TouchableOpacity>
            </View>

            {/* Description Card */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Description</Text>
              <View style={styles.descriptionCard}>
                <Text style={styles.descriptionText}>
                  {exercise.description ||
                    "No description available for this exercise. Try checking the category details for more information about similar exercises."}
                </Text>
              </View>
            </View>

            {/* Optional: Instructions if available in exercise object */}
            {exercise.instructions && exercise.instructions.length > 0 && (
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>Instructions</Text>
                <View style={styles.instructionsCard}>
                  {exercise.instructions.map((step, index) => (
                    <View key={index} style={styles.instructionItem}>
                      <Text style={styles.instructionNumber}>{index + 1}.</Text>
                      <Text style={styles.instructionText}>{step}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.bottomSpacing} />
          </ScrollView>
        </>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F7",
  },
  scrollViewContent: {
    paddingBottom: 24, // Adjusted padding to give more space at the bottom
  },
  mediaContainer: {
    height: 300,
    position: "relative",
    backgroundColor: "#000",
    padding: 16,
  },
  heroMedia: {
    width: "100%",
    height: "100%",
    backgroundColor: "#000",
    borderRadius: 16,
  },
  imageGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "100%",
    justifyContent: "space-between",
    padding: 16,
    paddingTop: 40,
  },
  mediaToggleContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 4,
  },
  mediaToggleButton: {
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderRadius: 12,
    backgroundColor: "#E0E0E0",
    marginHorizontal: 8,
  },
  mediaToggleButtonActive: {
    backgroundColor: "#0056d2",
  },
  mediaToggleButtonDisabled: {
    backgroundColor: "#E0E0E0",
    opacity: 0.5,
  },
  mediaToggleText: {
    color: "#424242",
    fontWeight: "600",
    fontSize: 15,
  },
  mediaToggleTextActive: {
    color: "#fff",
  },
  mediaToggleTextDisabled: {
    color: "#BDBDBD",
  },
  // New styles for sections below media
  sectionContainer: {
    marginHorizontal: 16,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginBottom: 12,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  metricCard: {
    width: "31%", // Approx 3 items per row with spacing
    backgroundColor: "#F8F8F8",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#EEE",
  },
  metricValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#424242",
    marginTop: 8,
  },
  metricLabel: {
    fontSize: 11,
    color: "#757575",
    marginTop: 2,
    textAlign: "center",
  },
  cardIcon: {
    marginRight: 12,
  },
  categoryCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  categoryText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#0056d2",
  },
  descriptionCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  descriptionText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    color: "#424242",
  },
  instructionsCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  instructionItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  instructionNumber: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#6C63FF",
    marginRight: 8,
  },
  instructionText: {
    flex: 1,
    fontSize: 15,
    color: "#424242",
    lineHeight: 22,
  },
  bottomSpacing: {
    height: 24,
  },
})

export default ExerciseDetailsScreen
