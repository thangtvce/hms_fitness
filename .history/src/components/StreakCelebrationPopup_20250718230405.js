
import { useRef, useEffect } from "react"
import { View, Text, StyleSheet, Animated, Dimensions, TouchableOpacity } from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { Ionicons } from "@expo/vector-icons"
import Svg, { Polygon, Defs, Stop, LinearGradient as SVGLinearGradient } from "react-native-svg"

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

  const renderRays = () => {
    const rays = []
    for (let i = 0; i < NUM_RAYS; i++) {
      const angle = (360 / NUM_RAYS) * i
      const radian = (angle * Math.PI) / 180

      // Calculate points for the trapezoid
      // Point 1 (inner-left)
      const p1x = flameRadius * Math.cos(radian - Math.atan(innerRayWidth / 2 / flameRadius))
      const p1y = flameRadius * Math.sin(radian - Math.atan(innerRayWidth / 2 / flameRadius))

      // Point 2 (inner-right)
      const p2x = flameRadius * Math.cos(radian + Math.atan(innerRayWidth / 2 / flameRadius))
      const p2y = flameRadius * Math.sin(radian + Math.atan(innerRayWidth / 2 / flameRadius))

      // Point 3 (outer-right)
      const p3x = outerRadius * Math.cos(radian + Math.atan(outerRayWidth / 2 / outerRadius))
      const p3y = outerRadius * Math.sin(radian + Math.atan(outerRayWidth / 2 / outerRadius))

      // Point 4 (outer-left)
      const p4x = outerRadius * Math.cos(radian - Math.atan(outerRayWidth / 2 / outerRadius))
      const p4y = outerRadius * Math.sin(radian - Math.atan(outerRayWidth / 2 / outerRadius))

      const points = `${p1x},${p1y} ${p2x},${p2y} ${p3x},${p3y} ${p4x},${p4y}`

      rays.push(
        <Polygon
          key={`ray-polygon-${i}`}
          points={points}
          fill={`url(#rayGradient${i})`}
          stroke="none" // Removed stroke for cleaner look
        />,
      )
    }
    return rays
  }

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

        {/* Flame with rays */}
        <View style={styles.flameContainer}>
          {/* SVG for rays with improved gradient */}
          <Animated.View style={[styles.raysSvgWrapper, { transform: [{ rotate: rayRotationDegrees }] }]}>
            <Svg
              height={outerRadius * 2}
              width={outerRadius * 2}
              viewBox={`-${outerRadius} -${outerRadius} ${outerRadius * 2} ${outerRadius * 2}`}
              style={styles.raysSvg}
            >
              <Defs>
                {Array.from({ length: NUM_RAYS }).map((_, i) => {
                  const angle = (360 / NUM_RAYS) * i
                  return (
                    <SVGLinearGradient
                      key={`rayGradient${i}`}
                      id={`rayGradient${i}`}
                      x1="50%"
                      y1="50%"
                      x2="100%"
                      y2="50%"
                      gradientUnits="objectBoundingBox"
                    >
                      {/* Inner part (near flame) - solid, strong color */}
                      <Stop offset="0%" stopColor="rgba(254, 0, 0, 1)" />
                      <Stop offset="25%" stopColor="rgba(255, 220, 80, 0.85)" />
                      <Stop offset="60%" stopColor="rgba(255, 220, 80, 0.25)" />
                      {/* Outer part - almost fully transparent */}
                      <Stop offset="100%" stopColor="rgba(255, 220, 80, 0.01)" />
                    </SVGLinearGradient>
                  )
                })}
              </Defs>
              {renderRays()}
            </Svg>
          </Animated.View>

          <Animated.Image
            source={require("../../assets/animation/FireAnimation1.gif")}
            style={[
              styles.flameGif,
              {
                transform: [{ scale: flameScale }, { scale: flamePulse }],
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