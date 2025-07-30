
import { useRef, useEffect } from "react"
import { View, Text, StyleSheet, Animated, Dimensions, TouchableOpacity } from "react-native"
import LottieView from 'lottie-react-native';
import { LinearGradient } from "expo-linear-gradient"
import { Ionicons } from "@expo/vector-icons"

const { width, height } = Dimensions.get("window")


const StreakCelebrationPopup = ({ isVisible, streakCount, onClose }) => {
  const animatedValue = useRef(new Animated.Value(0)).current

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
        <Text style={styles.title}>Streak Unlocked!</Text>
        <Text style={styles.subtitle}>You have unlocked a {streakCount}-day activity streak!</Text>

        {/* Flame with Boom effect behind */}
        <View style={styles.flameContainer}>
          {/* Boom Lottie effect as background */}
          <LottieView
            source={require('../../assets/animation/Boom.json')}
            autoPlay
            loop
            style={StyleSheet.absoluteFill}
          />
          <Animated.View
            style={[
              styles.flameGif,
              {
                transform: [{ scale: flameScale }, { scale: flamePulse }],
              },
            ]}
          >
            <LottieView
              source={require('../../assets/animation/Fire.json')}
              autoPlay
              loop
              style={{ width: '100%', height: '100%' }}
            />
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
            <Text style={styles.buttonText}>Post to Journal</Text>
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
  // raysContainer and ray removed
  flameGif: {
    width: 200, // Adjusted size for the GIF
    height: 200, // Adjusted size for the GIF
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
