"use client"

import { useRef, useEffect } from "react"
import { View, Text, StyleSheet, Animated, Dimensions, TouchableOpacity } from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { Ionicons } from "@expo/vector-icons"

const { width, height } = Dimensions.get("window")
const NUM_RAYS = 16

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
          duration: 20000,
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
    const centerX = width * 0.4
    const centerY = width * 0.4
    const rayLength = width * 0.35
    const rayWidth = 3

    for (let i = 0; i < NUM_RAYS; i++) {
      const angle = (360 / NUM_RAYS) * i
      const radian = (angle * Math.PI) / 180

      const startX = centerX + Math.cos(radian) * 60
      const startY = centerY + Math.sin(radian) * 60
      const endX = centerX + Math.cos(radian) * rayLength
      const endY = centerY + Math.sin(radian) * rayLength

      rays.push(
        <Animated.View
          key={`ray-${i}`}
          style={[
            styles.ray,
            {
              left: startX,
              top: startY,
              width: Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2)),
              height: rayWidth,
              transform: [{ rotate: `${angle}deg` }, { rotate: rayRotationDegrees }],
            },
          ]}
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
          <Animated.View style={[styles.raysContainer, { transform: [{ rotate: rayRotationDegrees }] }]}>
            {renderRays()}
          </Animated.View>

          <Animated.View
            style={[
              styles.flameWrapper,
              {
                transform: [{ scale: flameScale }, { scale: flamePulse }],
              },
            ]}
          >
            <LinearGradient
              colors={["#FFD700", "#FFA500", "#FF8C00", "#FF6347"]}
              style={styles.flame}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
            >
              <Ionicons name="flame" size={80} color="transparent" />
            </LinearGradient>
          </Animated.View>
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
    width: width * 0.8,
    height: width * 0.8,
    justifyContent: "center",
    alignItems: "center",
  },
  ray: {
    position: "absolute",
    backgroundColor: "rgba(255,215,0,0.3)",
    borderRadius: 1.5,
    transformOrigin: "0 50%",
  },
  flameWrapper: {
    width: 120,
    height: 120,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 60,
    zIndex: 2,
  },
  flame: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#FFA500",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 10,
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
