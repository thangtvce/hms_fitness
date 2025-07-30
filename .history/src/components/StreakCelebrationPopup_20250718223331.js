
import { useRef, useEffect } from "react"
import { View, Text, StyleSheet, Animated, Dimensions, Easing } from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { Ionicons } from "@expo/vector-icons"
import Svg, { Polygon, Defs, LinearGradient as SVGGradient, Stop } from "react-native-svg"

const { width, height } = Dimensions.get("window")
const NUM_SPARKLES = 25
const NUM_INNER_FALLING_FLAMES = 20
const NUM_RAYS = 10

const StreakCelebrationPopup = ({ isVisible, streakCount }) => {
  const animatedValue = useRef(new Animated.Value(0)).current
  const sparkleAnimationsRef = useRef([])
  const sparklePropsRef = useRef([])
  const flamePulse = useRef(new Animated.Value(1)).current
  const flameShake = useRef(new Animated.Value(0)).current
  const innerFlameAnimations = useRef([]).current
  const innerFlameProps = useRef([]).current
  const rayRotation = useRef(new Animated.Value(0)).current
  const rayPulse = useRef(new Animated.Value(1)).current
  const haloPulse = useRef(new Animated.Value(1)).current
  const centerGlow = useRef(new Animated.Value(1)).current

  useEffect(() => {
    if (isVisible) {
      animatedValue.setValue(0)
      Animated.spring(animatedValue, {
        toValue: 1,
        friction: 7,
        tension: 40,
        useNativeDriver: true,
      }).start()

      sparkleAnimationsRef.current = []
      sparklePropsRef.current = []
      for (let i = 0; i < NUM_SPARKLES; i++) {
        sparkleAnimationsRef.current.push(new Animated.Value(0))
        sparklePropsRef.current.push({
          targetX: (Math.random() - 0.5) * width * 0.8,
          targetY: (Math.random() - 0.5) * height * 0.6,
          duration: Math.random() * 1000 + 1500,
          delay: Math.random() * 800,
          size: Math.random() * 12 + 8,
          color: ["#FF69B4", "#FFB6C1", "#FFC0CB", "#FF1493", "#DA70D6"][Math.floor(Math.random() * 5)],
          rotationSpeed: Math.random() * 720 + 360,
          scaleFactorX: Math.random() * 0.8 + 0.8,
          scaleFactorY: Math.random() * 0.4 + 0.6,
        })
      }

      sparkleAnimationsRef.current.forEach((anim) => anim.setValue(0))
      const parallelSparkleAnimations = sparkleAnimationsRef.current.map((anim, i) => {
        const props = sparklePropsRef.current[i]
        return Animated.timing(anim, {
          toValue: 1,
          duration: props.duration,
          delay: props.delay,
          useNativeDriver: true,
        })
      })
      Animated.parallel(parallelSparkleAnimations).start()

      innerFlameAnimations.length = 0
      innerFlameProps.length = 0
      for (let i = 0; i < NUM_INNER_FALLING_FLAMES; i++) {
        innerFlameAnimations.push(new Animated.Value(0))
        innerFlameProps.push({
          initialY: -80,
          targetY: height * 0.6,
          initialX: Math.random() * width * 0.6 - width * 0.3,
          duration: Math.random() * 2000 + 3000,
          delay: Math.random() * 1500,
          size: Math.random() * 25 + 25,
          color: ["#FFD700", "#FF4500", "#FF0000", "#FFA500", "#FF6347"][Math.floor(Math.random() * 5)],
        })
      }

      innerFlameAnimations.forEach((anim) => anim.setValue(0))
      const parallelInnerFlameAnimations = innerFlameAnimations.map((anim, i) => {
        const props = innerFlameProps[i]
        return Animated.timing(anim, {
          toValue: 1,
          duration: props.duration,
          delay: props.delay,
          useNativeDriver: true,
        })
      })
      Animated.parallel(parallelInnerFlameAnimations).start()

      flamePulse.setValue(1)
      Animated.loop(
        Animated.sequence([
          Animated.timing(flamePulse, {
            toValue: 1.2,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(flamePulse, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
      ).start()

      flameShake.setValue(0)
      Animated.loop(
        Animated.sequence([
          Animated.timing(flameShake, {
            toValue: 1,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.timing(flameShake, {
            toValue: -1,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.timing(flameShake, {
            toValue: 0,
            duration: 700,
            useNativeDriver: true,
          }),
        ]),
      ).start()

      rayRotation.setValue(0)
      Animated.loop(
        Animated.timing(rayRotation, {
          toValue: 1,
          duration: 15000,
          useNativeDriver: true,
        }),
      ).start()

      rayPulse.setValue(1)
      Animated.loop(
        Animated.sequence([
          Animated.timing(rayPulse, {
            toValue: 1.2,
            duration: 2500,
            useNativeDriver: true,
          }),
          Animated.timing(rayPulse, {
            toValue: 1,
            duration: 2500,
            useNativeDriver: true,
          }),
        ]),
      ).start()

      haloPulse.setValue(1)
      Animated.loop(
        Animated.sequence([
          Animated.timing(haloPulse, {
            toValue: 1.05,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(haloPulse, {
            toValue: 1,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ).start()

      // Animation cho center glow
      centerGlow.setValue(1)
      Animated.loop(
        Animated.sequence([
          Animated.timing(centerGlow, {
            toValue: 1.3,
            duration: 1800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(centerGlow, {
            toValue: 1,
            duration: 1800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ).start()
    }
  }, [isVisible])

  const popupScale = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1],
  })

  const popupOpacity = animatedValue.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0, 1, 1],
  })

  const popupTranslateY = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [100, 0],
  })

  const flameTranslateX = flameShake.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [-10, 0, 10],
  })

  const rayRotationDegrees = rayRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  })

  const renderRays = () => {
    const rays = []
    const center = width * 1.1
    const innerRadius = 30 // Giảm để tia bắt đầu gần tâm hơn
    const outerRadius = width * 0.8 // Tăng để tia dài hơn
    const rayBaseWidth = 25

    for (let i = 0; i < NUM_RAYS; i++) {
      const angle = (360 / NUM_RAYS) * i

      // Màu sắc đậm ở tâm, nhạt dần ra ngoài (đậm nhất ở 0%, 10%, nhạt dần về 50%, 100%)
      const points = `
        ${center - rayBaseWidth / 1.38},${center - innerRadius}
        ${center + rayBaseWidth / 1.38},${center - innerRadius}
        ${center + rayBaseWidth * 2.5},${center - outerRadius}
        ${center - rayBaseWidth * 2.5},${center - outerRadius}
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
                {/* Đậm nhất ở tâm và gần tâm */}
                <Stop offset="0%" stopColor="rgba(243, 194, 220, 1)" />
                <Stop offset="10%" stopColor="rgba(255,20,147,0.85)" />
                <Stop offset="50%" stopColor="rgba(255,182,193,0.18)" />
                <Stop offset="100%" stopColor="rgba(255,240,245,0)" />
              </SVGGradient>
            </Defs>
            <Polygon 
              points={points} 
              fill={`url(#grad-${i})`} 
              stroke="rgba(255,105,180,0.10)" 
              strokeWidth="0.5" 
            />
          </Svg>
        </Animated.View>,
      )
    }

    // Thêm nhiều lớp hiệu ứng sáng ở trung tâm
    rays.push(
      // Lớp sáng ngoài cùng
      <Animated.View
        key="halo-outer"
        style={{
          position: "absolute",
          width: width * 0.7,
          height: width * 0.7,
          borderRadius: width * 0.35,
          backgroundColor: "rgba(255,105,180,0.08)",
          transform: [{ scale: haloPulse }],
        }}
      />,

      // Lớp sáng giữa
      <Animated.View
        key="halo-middle"
        style={{
          position: "absolute",
          width: width * 0.5,
          height: width * 0.5,
          borderRadius: width * 0.25,
          backgroundColor: "rgba(255,69,180,0.15)",
          transform: [{ scale: centerGlow }],
        }}
      />,

      // Lớp sáng trong cùng - đậm nhất
      <Animated.View
        key="halo-inner"
        style={{
          position: "absolute",
          width: width * 0.3,
          height: width * 0.3,
          borderRadius: width * 0.15,
          backgroundColor: "rgba(255,20,147,0.25)",
          transform: [{ scale: centerGlow }],
        }}
      />,

      // Điểm sáng trung tâm
      <Animated.View
        key="center-dot"
        style={{
          position: "absolute",
          width: width * 0.15,
          height: width * 0.15,
          borderRadius: width * 0.075,
          backgroundColor: "rgba(255,255,255,0.3)",
          transform: [{ scale: centerGlow }],
        }}
      />,
    )

    return rays
  }

  const renderSparkles = () => {
    const sparkleAnimations = sparkleAnimationsRef.current
    const sparkleProps = sparklePropsRef.current

    if (sparkleAnimations.length !== NUM_SPARKLES || sparkleProps.length !== NUM_SPARKLES) {
      return null
    }

    return Array.from({ length: NUM_SPARKLES }).map((_, i) => {
      const animValue = sparkleAnimations[i]
      const props = sparkleProps[i]

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
        inputRange: [0, 0.3, 1],
        outputRange: [0, 1.2, 0.4],
      })

      const rotate = animValue.interpolate({
        inputRange: [0, 1],
        outputRange: ["0deg", `${props.rotationSpeed}deg`],
      })

      return (
        <Animated.View
          key={`sparkle-${i}`}
          style={[
            styles.sparkleParticle,
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

  const renderInnerFlames = () => {
    if (
      innerFlameAnimations.length !== NUM_INNER_FALLING_FLAMES ||
      innerFlameProps.length !== NUM_INNER_FALLING_FLAMES
    ) {
      return null
    }

    return Array.from({ length: NUM_INNER_FALLING_FLAMES }).map((_, i) => {
      const animValue = innerFlameAnimations[i]
      const props = innerFlameProps[i]

      const translateY = animValue.interpolate({
        inputRange: [0, 1],
        outputRange: [props.initialY, props.targetY],
      })

      const opacity = animValue.interpolate({
        inputRange: [0, 0.1, 0.9, 1],
        outputRange: [0, 1, 1, 0],
      })

      return (
        <Animated.View
          key={`inner-flame-${i}`}
          style={[
            styles.innerFallingFlame,
            {
              left: props.initialX,
              transform: [{ translateY }],
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
      <LinearGradient
        colors={["rgba(255,255,255,0.15)", "rgba(255,182,193,0.1)", "rgba(255,255,255,0.08)"]}
        style={styles.popupBackgroundGradient}
      >
        <View style={styles.popupContentWrapper}>
          <View style={styles.raysBackground}>{renderRays()}</View>

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

          <Text style={styles.streakLabel}>Streak</Text>
          <Text style={styles.streakCountText}>{streakCount}</Text>

          {renderInnerFlames()}
          {renderSparkles()}
        </View>
      </LinearGradient>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
    zIndex: 1000,
  },
  popupBackgroundGradient: {
    width: width * 0.85,
    height: height * 0.55,
    borderRadius: 25,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
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
    width: width * 2.2,
    height: width * 2.2,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 0,
  },
  flameGif: {
    position: "absolute",
    width: width * 0.95,
    height: width * 0.95,
    zIndex: 1,
    opacity: 0.95,
  },
  streakCountText: {
    position: "absolute",
    fontSize: 85,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: -3,
    zIndex: 2,
    top: "50%",
    transform: [{ translateY: -42 }],
    textShadowColor: "#FF69B4",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  streakLabel: {
    position: "absolute",
    top: "22%",
    fontSize: 40,
    fontWeight: "700",
    color: "#FFFFFF",
    textShadowColor: "#FF69B4",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
    zIndex: 2,
  },
  sparkleParticle: {
    position: "absolute",
    left: "50%",
    top: "50%",
    marginLeft: -10,
    marginTop: -10,
    zIndex: 3,
  },
  innerFallingFlame: {
    position: "absolute",
    zIndex: 2,
  },
})

export default StreakCelebrationPopup
