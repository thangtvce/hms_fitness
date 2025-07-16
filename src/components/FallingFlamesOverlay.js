import React, { useEffect, useRef } from "react"
import { View, StyleSheet, Animated, Dimensions, Text } from "react-native"
import { Ionicons } from "@expo/vector-icons"

const { height, width } = Dimensions.get("window")

const FallingFlamesOverlayInline = ({ isVisible }) => {
  const outerFlameAnimations = useRef([]).current
  const outerFlameProps = useRef([]).current
  const NUM_FLAMES = 15

  useEffect(() => {
    if (!isVisible) return

    outerFlameAnimations.length = 0
    outerFlameProps.length = 0

    for (let i = 0; i < NUM_FLAMES; i++) {
      outerFlameAnimations.push(new Animated.Value(0))
      outerFlameProps.push({
        initialY: -Math.random() * height * 0.5,
        targetY: height + 50,
        initialX: Math.random() * width,
        duration: Math.random() * 3000 + 4000,
        delay: Math.random() * 2000,
        size: Math.random() * 20 + 30,
        color: ["#FFD700", "#FF4500", "#FF0000", "#FFA500", "#FF6347"][
          Math.floor(Math.random() * 5)
        ],
      })
    }

    outerFlameAnimations.forEach((anim) => anim.setValue(0))

    const animations = outerFlameAnimations.map((anim, i) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: outerFlameProps[i].duration,
        delay: outerFlameProps[i].delay,
        useNativeDriver: true,
      })
    )

    Animated.parallel(animations).start()
  }, [isVisible])

  if (!isVisible) return null

  return (
    <View style={[StyleSheet.absoluteFillObject, { zIndex: 1001 }]} pointerEvents="none">
      {outerFlameAnimations.map((anim, i) => {
        const props = outerFlameProps[i]
        const translateY = anim.interpolate({
          inputRange: [0, 1],
          outputRange: [props.initialY, props.targetY],
        })
        const opacity = anim.interpolate({
          inputRange: [0, 0.1, 0.9, 1],
          outputRange: [0, 1, 1, 0],
        })

        return (
          <Animated.View
            key={`flame-inline-${i}`}
            style={{
              position: "absolute",
              left: props.initialX,
              transform: [{ translateY }],
              opacity,
            }}
          >
            {/* Dùng emoji để test nếu Ionicons bị lỗi */}
            {/* <Text style={{ fontSize: props.size }}>{'🔥'}</Text> */}
            <Ionicons name="flame" size={props.size} color={props.color} />
          </Animated.View>
        )
      })}
    </View>
  )
}

export default function FallingFlamesTestScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔥 Test Ngọn Lửa Rơi 🔥</Text>
      <FallingFlamesOverlayInline isVisible={true} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#614141ff",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: 80,
  },
})
