"use client"

import { useRef, useEffect } from "react"
import { View, Text, StyleSheet, Animated, Dimensions, TouchableOpacity } from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { Ionicons } from "@expo/vector-icons"
import Svg, { Polygon, Defs, LinearGradient as SVGGradient, Stop } from "react-native-svg" // Import SVG components

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

  const renderRays = () => {
    const rays = []
    const flameRadius = 100 // Approximate radius of the flame GIF
    const innerRayWidth = 20 // Width of the ray near the flame
    const outerRayWidth = 80 // Width of the ray at its outer edge
    const rayLength = 150 // Length of the ray from inner to outer edge

    for (let i = 0; i < NUM_RAYS; i++) {
      const angle = (360 / NUM_RAYS) * i
      const radian = (angle * Math.PI) / 180

      // Calculate points for the trapezoid
      // Point 1 (inner-left)
      const p1x = flameRadius * Math.cos(radian - innerRayWidth / 2 / flameRadius)
      const p1y = flameRadius * Math.sin(radian - innerRayWidth / 2 / flameRadius)

      // Point 2 (inner-right)
      const p2x = flameRadius * Math.cos(radian + innerRayWidth / 2 / flameRadius)
      const p2y = flameRadius * Math.sin(radian + innerRayWidth / 2 / flameRadius)

      // Point 3 (outer-right)
      const p3x = (flameRadius + rayLength) * Math.cos(radian + outerRayWidth / 2 / (flameRadius + rayLength))
      const p3y = (flameRadius + rayLength) * Math.sin(radian + outerRayWidth / 2 / (flameRadius + rayLength))

      // Point 4 (outer-left)
      const p4x = (flameRadius + rayLength) * Math.cos(radian - outerRayWidth / 2 / (flameRadius + rayLength))
      const p4y = (flameRadius + rayLength) * Math.sin(radian - outerRayWidth / 2 / (flameRadius + rayLength))

      const points = `${p1x},${p1y} ${p2x},${p2y} ${p3x},${p3y} ${p4x},${p4y}`

      rays.push(
        <Animated.View
          key={`ray-${i}`}
          style={[
            styles.rayWrapper,
            {
              transform: [{ rotate: `${angle}deg` }, { rotate: rayRotationDegrees }],
            },
          ]}
        >
          <Svg
            height={flameRadius * 2 + rayLength * 2}
            width={flameRadius * 2 + rayLength * 2}
            viewBox={`-${flameRadius + rayLength} -${flameRadius + rayLength} ${flameRadius * 2 + rayLength * 2} ${flameRadius * 2 + rayLength * 2}`}
          >
            <Defs>
              <SVGGradient id={`rayGradient${i}`} x1="0%" y1="0%" x2="100%" y2="0%">
                {/* Gradient from opaque yellow to transparent yellow */}
                <Stop offset="0%" stopColor="rgba(255, 200, 0, 0.8)" />
                <Stop offset="100%" stopColor="rgba(255, 200, 0, 0)" />
              </SVGGradient>
            </Defs>
            <Polygon
              points={points}
              fill={`url(#rayGradient${i})`}
              stroke="rgba(255, 200, 0, 0.1)" // Subtle stroke for definition
              strokeWidth="1"
            />
          </Svg>
        </Animated.View>,
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
          <Animated.View style={[styles.raysContainer, { transform: [{ rotate: rayRotationDegrees }] }]}>
            {renderRays()}
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
  raysContainer: {
    position: "absolute",
    width: width * 0.8, // This container will hold the SVG elements
    height: width * 0.8,
    justifyContent: "center",
    alignItems: "center",
  },
  rayWrapper: {
    position: "absolute",
    width: "100%", // SVG will handle its own size
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  flameGif: {
    width: 250, // Increased size for the GIF
    height: 250, // Increased size for the GIF
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
