
import { useRef, useEffect } from "react"
import { View, Text, StyleSheet, Animated, Dimensions, TouchableOpacity } from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { Ionicons } from "@expo/vector-icons"


const { width, height } = Dimensions.get("window")
const NUM_RAYS = 8 // Number of rays for the sunburst effect

const StreakCelebrationPopup = ({ isVisible, streakCount, onClose }) => {
  const animatedValue = useRef(new Animated.Value(0)).current
  const rayRotation = useRef(new Animated.Value(0)).current
  const flameScale = useRef(new Animated.Value(0)).current
  const flamePulse = useRef(new Animated.Value(1)).current

  useEffect(() => {
    if (isVisible) {
      // Reset animations
      animatedValue.setValue(0)
      flameScale.setValue(0)

      // Main entrance animation
      Animated.parallel([
        Animated.spring(animatedValue, {
          toValue: 1,
          friction: 8,
          tension: 100,
          useNativeDriver: true,
        }),
        Animated.spring(flameScale, {
          toValue: 1,
          friction: 6,
          tension: 80,
          delay: 200,
          useNativeDriver: true,
        }),
      ]).start()

      // Continuous ray rotation
      Animated.loop(
        Animated.timing(rayRotation, {
          toValue: 1,
          duration: 20000, // Slower rotation for a softer effect
          useNativeDriver: true,
        }),
      ).start()

      // Subtle flame pulse
      Animated.loop(
        Animated.sequence([
          Animated.timing(flamePulse, {
            toValue: 1.05,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(flamePulse, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
        ]),
      ).start()
    }
  }, [isVisible])

  const popupScale = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1],
  })

  const popupOpacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  })

  const rayRotationDegrees = rayRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  })

  // Define ray properties - adjusted to be closer to flame and match the reference image
  const flameGifSize = 280
  // Make rays start much closer to the center (almost at the center)
  const flameRadius = flameGifSize / 8 // Smaller value: rays start near the center
  const innerRayWidth = 25 // Width of the ray near the flame (narrow end)
  const outerRayWidth = 80 // Width of the ray at its outer edge (wide end)
  const rayLength = 120 // Length of the ray
  const outerRadius = (flameGifSize / 2.5) + rayLength // Keep outer edge the same as before



  if (!isVisible) return null

  return (
    <Animated.View
      style={[
        styles.overlay,
        {
          opacity: popupOpacity,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.popup,
          {
            transform: [{ scale: popupScale }],
          },
        ]}
      >
        {/* Close button */}
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Ionicons name="close" size={24} color="rgba(255,255,255,0.8)" />
        </TouchableOpacity>

        {/* Title */}
        <Text style={styles.title}>Đã mở khóa Streak!</Text>
        <Text style={styles.subtitle}>Bạn và Mai đã trò chuyện được {streakCount} ngày liên tiếp.</Text>

        {/* Flame with animated background GIF */}
        <View style={styles.flameContainer}>
          <Animated.Image
            source={require("../../assets/animation/bg.gif")}
            style={[StyleSheet.absoluteFill, { zIndex: 0, borderRadius: 999 }]} // full background, behind flame
            resizeMode="cover"
          />
          <Animated.Image
            source={require("../../assets/animation/FireAnimation1.gif")}
            style={[
              styles.flameGif,
              {
                transform: [{ scale: flameScale }, { scale: flamePulse }],
                zIndex: 1,
              },
            ]}
            resizeMode="contain"
          />
        </View>

        {/* Action button */}
        <TouchableOpacity style={styles.actionButton} onPress={onClose}>
          <LinearGradient
            colors={["#FF1493", "#FF69B4"]}
            style={styles.buttonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.buttonText}>Đăng lên Nhật ký</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  popup: {
    width: width * 0.85,
    backgroundColor: "rgba(40,40,40,0.95)",
    borderRadius: 20,
    padding: 30,
    alignItems: "center",
    position: "relative",
  },
  closeButton: {
    position: "absolute",
    top: 15,
    right: 15,
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
    marginBottom: 40,
    lineHeight: 22,
  },
  flameContainer: {
    width: width * 0.8,
    height: width * 0.8,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 40,
    position: "relative",
  },
  raysSvgWrapper: {
    position: "absolute",
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  raysSvg: {
    // No specific styles needed here, size and viewBox are set in component
  },
  flameGif: {
    width: 280,
    height: 280,
    position: "absolute",
    zIndex: 2,
  },
  actionButton: {
    borderRadius: 25,
    overflow: "hidden",
    elevation: 5,
    shadowColor: "#FF1493",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  buttonGradient: {
    paddingHorizontal: 40,
    paddingVertical: 15,
    alignItems: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
  },
})

export default StreakCelebrationPopup