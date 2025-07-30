"use client"

import { useRef, useEffect } from "react"
import { View, StyleSheet, Animated, Dimensions, Easing } from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { Ionicons } from "@expo/vector-icons"
import Svg, { Polygon, Defs, LinearGradient as SVGGradient, Stop } from "react-native-svg"

const { width, height } = Dimensions.get("window")
const NUM_SPARKLES = 35
const NUM_CONFETTI = 40
const NUM_HEARTS = 15
const NUM_STARS = 20
const NUM_INNER_FALLING_FLAMES = 25
const NUM_RAYS = 12

const StreakCelebrationPopup = ({ isVisible, streakCount }) => {
  const animatedValue = useRef(new Animated.Value(0)).current
  const sparkleAnimationsRef = useRef([])
  const sparklePropsRef = useRef([])
  const confettiAnimationsRef = useRef([])
  const confettiPropsRef = useRef([])
  const heartAnimationsRef = useRef([])
  const heartPropsRef = useRef([])
  const starAnimationsRef = useRef([])
  const starPropsRef = useRef([])

  const flamePulse = useRef(new Animated.Value(1)).current
  const flameShake = useRef(new Animated.Value(0)).current
  const innerFlameAnimations = useRef([]).current
  const innerFlameProps = useRef([]).current
  const rayRotation = useRef(new Animated.Value(0)).current
  const rayPulse = useRef(new Animated.Value(1)).current
  const haloPulse = useRef(new Animated.Value(1)).current
  const centerGlow = useRef(new Animated.Value(1)).current
  const textBounce = useRef(new Animated.Value(1)).current
  const textGlow = useRef(new Animated.Value(1)).current
  const backgroundPulse = useRef(new Animated.Value(1)).current
  const explosionScale = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (isVisible) {
      // Reset all animations
      animatedValue.setValue(0)
      explosionScale.setValue(0)

      // Main entrance animation
      Animated.sequence([
        Animated.timing(explosionScale, {
          toValue: 1.2,
          duration: 300,
          easing: Easing.out(Easing.back(2)),
          useNativeDriver: true,
        }),
        Animated.timing(explosionScale, {
          toValue: 1,
          duration: 200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start()

      Animated.spring(animatedValue, {
        toValue: 1,
        friction: 6,
        tension: 50,
        useNativeDriver: true,
      }).start()

      // Initialize sparkles with more vibrant colors
      sparkleAnimationsRef.current = []
      sparklePropsRef.current = []
      for (let i = 0; i < NUM_SPARKLES; i++) {
        sparkleAnimationsRef.current.push(new Animated.Value(0))
        sparklePropsRef.current.push({
          targetX: (Math.random() - 0.5) * width * 1.2,
          targetY: (Math.random() - 0.5) * height * 0.8,
          duration: Math.random() * 1200 + 1800,
          delay: Math.random() * 600,
          size: Math.random() * 16 + 12,
          color: ["#FF1493", "#00FFFF", "#FFD700", "#FF69B4", "#00FF7F", "#FF4500", "#9370DB", "#FF6347"][
            Math.floor(Math.random() * 8)
          ],
          rotationSpeed: Math.random() * 1080 + 720,
          scaleFactorX: Math.random() * 0.6 + 1.0,
          scaleFactorY: Math.random() * 0.6 + 1.0,
        })
      }

      // Initialize confetti
      confettiAnimationsRef.current = []
      confettiPropsRef.current = []
      for (let i = 0; i < NUM_CONFETTI; i++) {
        confettiAnimationsRef.current.push(new Animated.Value(0))
        confettiPropsRef.current.push({
          targetX: (Math.random() - 0.5) * width * 1.4,
          targetY: height * 0.8 + Math.random() * 200,
          initialY: -100 - Math.random() * 100,
          duration: Math.random() * 2000 + 2500,
          delay: Math.random() * 800,
          size: Math.random() * 8 + 6,
          color: ["#FF1493", "#00FFFF", "#FFD700", "#FF69B4", "#00FF7F", "#FF4500", "#9370DB"][
            Math.floor(Math.random() * 7)
          ],
          rotationSpeed: Math.random() * 1440 + 720,
          shape: Math.random() > 0.5 ? "square" : "circle",
        })
      }

      // Initialize hearts
      heartAnimationsRef.current = []
      heartPropsRef.current = []
      for (let i = 0; i < NUM_HEARTS; i++) {
        heartAnimationsRef.current.push(new Animated.Value(0))
        heartPropsRef.current.push({
          targetX: (Math.random() - 0.5) * width * 0.6,
          targetY: -height * 0.5 - Math.random() * 200,
          duration: Math.random() * 3000 + 3000,
          delay: Math.random() * 1000,
          size: Math.random() * 20 + 25,
          color: ["#FF1493", "#FF69B4", "#FFB6C1", "#FF6347", "#FF4500"][Math.floor(Math.random() * 5)],
          pulseSpeed: Math.random() * 800 + 600,
        })
      }

      // Initialize stars
      starAnimationsRef.current = []
      starPropsRef.current = []
      for (let i = 0; i < NUM_STARS; i++) {
        starAnimationsRef.current.push(new Animated.Value(0))
        starPropsRef.current.push({
          targetX: (Math.random() - 0.5) * width * 1.0,
          targetY: (Math.random() - 0.5) * height * 0.7,
          duration: Math.random() * 1500 + 2000,
          delay: Math.random() * 1200,
          size: Math.random() * 18 + 15,
          color: ["#FFD700", "#FFFF00", "#FFA500", "#FF8C00", "#FFFFE0"][Math.floor(Math.random() * 5)],
          twinkleSpeed: Math.random() * 400 + 300,
        })
      }

      // Start all particle animations
      const allAnimations = [
        ...sparkleAnimationsRef.current.map((anim, i) =>
          Animated.timing(anim, {
            toValue: 1,
            duration: sparklePropsRef.current[i].duration,
            delay: sparklePropsRef.current[i].delay,
            useNativeDriver: true,
          }),
        ),
        ...confettiAnimationsRef.current.map((anim, i) =>
          Animated.timing(anim, {
            toValue: 1,
            duration: confettiPropsRef.current[i].duration,
            delay: confettiPropsRef.current[i].delay,
            useNativeDriver: true,
          }),
        ),
        ...heartAnimationsRef.current.map((anim, i) =>
          Animated.timing(anim, {
            toValue: 1,
            duration: heartPropsRef.current[i].duration,
            delay: heartPropsRef.current[i].delay,
            useNativeDriver: true,
          }),
        ),
        ...starAnimationsRef.current.map((anim, i) =>
          Animated.timing(anim, {
            toValue: 1,
            duration: starPropsRef.current[i].duration,
            delay: starPropsRef.current[i].delay,
            useNativeDriver: true,
          }),
        ),
      ]

      Animated.parallel(allAnimations).start()

      // Initialize inner flames
      innerFlameAnimations.length = 0
      innerFlameProps.length = 0
      for (let i = 0; i < NUM_INNER_FALLING_FLAMES; i++) {
        innerFlameAnimations.push(new Animated.Value(0))
        innerFlameProps.push({
          initialY: -120,
          targetY: height * 0.7,
          initialX: Math.random() * width * 0.8 - width * 0.4,
          duration: Math.random() * 2500 + 3500,
          delay: Math.random() * 1200,
          size: Math.random() * 30 + 30,
          color: ["#FFD700", "#FF4500", "#FF0000", "#FFA500", "#FF6347", "#FF8C00"][Math.floor(Math.random() * 6)],
        })
      }

      const parallelInnerFlameAnimations = innerFlameAnimations.map((anim, i) => {
        return Animated.timing(anim, {
          toValue: 1,
          duration: innerFlameProps[i].duration,
          delay: innerFlameProps[i].delay,
          useNativeDriver: true,
        })
      })

      Animated.parallel(parallelInnerFlameAnimations).start()

      // Enhanced flame pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(flamePulse, {
            toValue: 1.3,
            duration: 500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(flamePulse, {
            toValue: 0.9,
            duration: 500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ).start()

      // Enhanced shake animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(flameShake, {
            toValue: 1,
            duration: 400,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(flameShake, {
            toValue: -1,
            duration: 400,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(flameShake, {
            toValue: 0,
            duration: 400,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ).start()

      // Faster ray rotation
      Animated.loop(
        Animated.timing(rayRotation, {
          toValue: 1,
          duration: 8000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ).start()

      // Enhanced ray pulse
      Animated.loop(
        Animated.sequence([
          Animated.timing(rayPulse, {
            toValue: 1.4,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(rayPulse, {
            toValue: 0.8,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ).start()

      // Enhanced halo pulse
      Animated.loop(
        Animated.sequence([
          Animated.timing(haloPulse, {
            toValue: 1.2,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(haloPulse, {
            toValue: 0.9,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ).start()

      // Enhanced center glow
      Animated.loop(
        Animated.sequence([
          Animated.timing(centerGlow, {
            toValue: 1.5,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(centerGlow, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ).start()

      // Text bounce animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(textBounce, {
            toValue: 1.1,
            duration: 600,
            easing: Easing.out(Easing.back(1.5)),
            useNativeDriver: true,
          }),
          Animated.timing(textBounce, {
            toValue: 1,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ).start()

      // Text glow animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(textGlow, {
            toValue: 1.3,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(textGlow, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ).start()

      // Background pulse
      Animated.loop(
        Animated.sequence([
          Animated.timing(backgroundPulse, {
            toValue: 1.05,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(backgroundPulse, {
            toValue: 1,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ).start()
    }
  }, [isVisible])

  const popupScale = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.2, 1],
  })

  const popupOpacity = animatedValue.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0, 1, 1],
  })

  const popupTranslateY = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [150, 0],
  })

  const flameTranslateX = flameShake.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [-15, 0, 15],
  })

  const rayRotationDegrees = rayRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  })

  const renderEnhancedRays = () => {
    const rays = []
    const center = width * 1.2
    const innerRadius = 40
    const outerRadius = width * 1.0
    const rayBaseWidth = 30

    for (let i = 0; i < NUM_RAYS; i++) {
      const angle = (360 / NUM_RAYS) * i
      const points = `
        ${center - rayBaseWidth / 1.2},${center - innerRadius}
        ${center + rayBaseWidth / 1.2},${center - innerRadius}
        ${center + rayBaseWidth * 3},${center - outerRadius}
        ${center - rayBaseWidth * 3},${center - outerRadius}
      `

      rays.push(
        <Animated.View
          key={`ray-${i}`}
          style={{
            position: "absolute",
            width: center * 2,
            height: center * 2,
            transform: [{ rotate: `${angle}deg` }, { rotate: rayRotationDegrees }, { scaleY: rayPulse }],
          }}
        >
          <Svg width={center * 2} height={center * 2}>
            <Defs>
              <SVGGradient id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor="rgba(255,20,147,1)" />
                <Stop offset="15%" stopColor="rgba(255,69,180,0.9)" />
                <Stop offset="40%" stopColor="rgba(0,255,255,0.4)" />
                <Stop offset="70%" stopColor="rgba(255,215,0,0.2)" />
                <Stop offset="100%" stopColor="rgba(255,255,255,0)" />
              </SVGGradient>
            </Defs>
            <Polygon points={points} fill={`url(#grad-${i})`} stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
          </Svg>
        </Animated.View>,
      )
    }

    // Enhanced center glow layers
    rays.push(
      <Animated.View
        key="halo-outer"
        style={{
          position: "absolute",
          width: width * 0.9,
          height: width * 0.9,
          borderRadius: width * 0.45,
          backgroundColor: "rgba(255,20,147,0.15)",
          transform: [{ scale: haloPulse }],
        }}
      />,
      <Animated.View
        key="halo-middle"
        style={{
          position: "absolute",
          width: width * 0.6,
          height: width * 0.6,
          borderRadius: width * 0.3,
          backgroundColor: "rgba(0,255,255,0.25)",
          transform: [{ scale: centerGlow }],
        }}
      />,
      <Animated.View
        key="halo-inner"
        style={{
          position: "absolute",
          width: width * 0.4,
          height: width * 0.4,
          borderRadius: width * 0.2,
          backgroundColor: "rgba(255,215,0,0.35)",
          transform: [{ scale: centerGlow }],
        }}
      />,
      <Animated.View
        key="center-dot"
        style={{
          position: "absolute",
          width: width * 0.2,
          height: width * 0.2,
          borderRadius: width * 0.1,
          backgroundColor: "rgba(255,255,255,0.5)",
          transform: [{ scale: centerGlow }],
        }}
      />,
    )

    return rays
  }

  const renderSparkles = () => {
    return sparkleAnimationsRef.current.map((animValue, i) => {
      const props = sparklePropsRef.current[i]
      if (!props) return null

      const translateX = animValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0, props.targetX],
      })

      const translateY = animValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0, props.targetY],
      })

      const opacity = animValue.interpolate({
        inputRange: [0, 0.1, 0.9, 1],
        outputRange: [0, 1, 1, 0],
      })

      const scale = animValue.interpolate({
        inputRange: [0, 0.2, 0.8, 1],
        outputRange: [0, 1.5, 1.2, 0.3],
      })

      const rotate = animValue.interpolate({
        inputRange: [0, 1],
        outputRange: ["0deg", `${props.rotationSpeed}deg`],
      })

      return (
        <Animated.View
          key={`sparkle-${i}`}
          style={[
            styles.particle,
            {
              transform: [
                { translateX },
                { translateY },
                { scaleX: props.scaleFactorX },
                { scaleY: props.scaleFactorY },
                { scale },
                { rotate },
              ],
              opacity,
            },
          ]}
        >
          <Ionicons name="sparkles" size={props.size} color={props.color} />
        </Animated.View>
      )
    })
  }

  const renderConfetti = () => {
    return confettiAnimationsRef.current.map((animValue, i) => {
      const props = confettiPropsRef.current[i]
      if (!props) return null

      const translateX = animValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0, props.targetX],
      })

      const translateY = animValue.interpolate({
        inputRange: [0, 1],
        outputRange: [props.initialY, props.targetY],
      })

      const opacity = animValue.interpolate({
        inputRange: [0, 0.1, 0.8, 1],
        outputRange: [0, 1, 1, 0],
      })

      const rotate = animValue.interpolate({
        inputRange: [0, 1],
        outputRange: ["0deg", `${props.rotationSpeed}deg`],
      })

      return (
        <Animated.View
          key={`confetti-${i}`}
          style={[
            styles.confetti,
            {
              width: props.size,
              height: props.size,
              backgroundColor: props.color,
              borderRadius: props.shape === "circle" ? props.size / 2 : 2,
              transform: [{ translateX }, { translateY }, { rotate }],
              opacity,
            },
          ]}
        />
      )
    })
  }

  const renderHearts = () => {
    return heartAnimationsRef.current.map((animValue, i) => {
      const props = heartPropsRef.current[i]
      if (!props) return null

      const translateX = animValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0, props.targetX],
      })

      const translateY = animValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0, props.targetY],
      })

      const opacity = animValue.interpolate({
        inputRange: [0, 0.1, 0.7, 1],
        outputRange: [0, 1, 1, 0],
      })

      const scale = animValue.interpolate({
        inputRange: [0, 0.3, 0.7, 1],
        outputRange: [0, 1.2, 1, 0.8],
      })

      return (
        <Animated.View
          key={`heart-${i}`}
          style={[
            styles.particle,
            {
              transform: [{ translateX }, { translateY }, { scale }],
              opacity,
            },
          ]}
        >
          <Ionicons name="heart" size={props.size} color={props.color} />
        </Animated.View>
      )
    })
  }

  const renderStars = () => {
    return starAnimationsRef.current.map((animValue, i) => {
      const props = starPropsRef.current[i]
      if (!props) return null

      const translateX = animValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0, props.targetX],
      })

      const translateY = animValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0, props.targetY],
      })

      const opacity = animValue.interpolate({
        inputRange: [0, 0.2, 0.8, 1],
        outputRange: [0, 1, 1, 0],
      })

      const scale = animValue.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0, 1.3, 0.5],
      })

      return (
        <Animated.View
          key={`star-${i}`}
          style={[
            styles.particle,
            {
              transform: [{ translateX }, { translateY }, { scale }],
              opacity,
            },
          ]}
        >
          <Ionicons name="star" size={props.size} color={props.color} />
        </Animated.View>
      )
    })
  }

  const renderInnerFlames = () => {
    return innerFlameAnimations.map((animValue, i) => {
      const props = innerFlameProps[i]
      if (!props) return null

      const translateY = animValue.interpolate({
        inputRange: [0, 1],
        outputRange: [props.initialY, props.targetY],
      })

      const opacity = animValue.interpolate({
        inputRange: [0, 0.1, 0.8, 1],
        outputRange: [0, 1, 1, 0],
      })

      const scale = animValue.interpolate({
        inputRange: [0, 0.3, 0.7, 1],
        outputRange: [0.5, 1.2, 1, 0.8],
      })

      return (
        <Animated.View
          key={`inner-flame-${i}`}
          style={[
            styles.innerFallingFlame,
            {
              left: props.initialX,
              transform: [{ translateY }, { scale }],
              opacity,
            },
          ]}
        >
          <Ionicons name="flame" size={props.size} color={props.color} />
        </Animated.View>
      )
    })
  }

  if (!isVisible) return null

  return (
    <Animated.View
      style={[
        styles.overlay,
        {
          opacity: popupOpacity,
          transform: [{ scale: popupScale }, { translateY: popupTranslateY }],
        },
      ]}
      pointerEvents="none"
    >
      <Animated.View style={[styles.backgroundPulse, { transform: [{ scale: backgroundPulse }] }]}>
        <LinearGradient
          colors={["rgba(255,20,147,0.3)", "rgba(0,255,255,0.2)", "rgba(255,215,0,0.2)", "rgba(255,69,180,0.3)"]}
          style={styles.popupBackgroundGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Animated.View style={[styles.popupContentWrapper, { transform: [{ scale: explosionScale }] }]}>
            <View style={styles.raysBackground}>{renderEnhancedRays()}</View>

            <Animated.Image
              source={require("../../assets/animation/FireAnimation1.gif")}
              style={[
                styles.flameGif,
                {
                  transform: [{ scale: flamePulse }, { translateX: flameTranslateX }],
                },
              ]}
              resizeMode="contain"
            />


            <Animated.Text
              style={[
                styles.streakLabel,
                { transform: [{ scale: textBounce }] },
              ]}
            >
              🔥 STREAK 🔥
            </Animated.Text>

            <Animated.Text
              style={[
                styles.streakCountText,
                { transform: [{ scale: textBounce }] },
              ]}
            >
              {streakCount}
            </Animated.Text>

            <Animated.Text style={styles.celebrationText}>🎉 AMAZING! 🎉</Animated.Text>

            {renderInnerFlames()}
            {renderSparkles()}
            {renderConfetti()}
            {renderHearts()}
            {renderStars()}
          </Animated.View>
        </LinearGradient>
      </Animated.View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.85)",
    zIndex: 1000,
  },
  backgroundPulse: {
    width: width * 0.95,
    height: height * 0.65,
    borderRadius: 30,
    overflow: "hidden",
  },
  popupBackgroundGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 30,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.3)",
  },
  popupContentWrapper: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  raysBackground: {
    position: "absolute",
    width: width * 2.4,
    height: width * 2.4,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 0,
  },
  flameGif: {
    position: "absolute",
    width: width * 1.1,
    height: width * 1.1,
    zIndex: 1,
    opacity: 0.9,
  },
  streakCountText: {
    position: "absolute",
    fontSize: 95,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -4,
    zIndex: 3,
    top: "50%",
    transform: [{ translateY: -47 }],
    textShadowColor: "#FF1493",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
    fontFamily: "System",
  },
  streakLabel: {
    position: "absolute",
    top: "18%",
    fontSize: 32,
    fontWeight: "800",
    color: "#FFFFFF",
    textShadowColor: "#00FFFF",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
    zIndex: 3,
    letterSpacing: 2,
  },
  celebrationText: {
    position: "absolute",
    bottom: "15%",
    fontSize: 24,
    fontWeight: "700",
    color: "#FFD700",
    textShadowColor: "#FF4500",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
    zIndex: 3,
    letterSpacing: 1,
  },
  particle: {
    position: "absolute",
    left: "50%",
    top: "50%",
    marginLeft: -10,
    marginTop: -10,
    zIndex: 4,
  },
  confetti: {
    position: "absolute",
    left: "50%",
    top: "50%",
    zIndex: 4,
  },
  innerFallingFlame: {
    position: "absolute",
    zIndex: 2,
  },
})

export default StreakCelebrationPopup
