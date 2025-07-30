"use client"

import React from "react"
import { View, StyleSheet, Animated, Easing } from "react-native"
import { LinearGradient } from "expo-linear-gradient" // Hoặc 'react-native-linear-gradient'

const ShimmerPlaceholder = ({ style, borderRadius = 16 }) => {
  const shimmerAnim = React.useRef(new Animated.Value(0)).current

  React.useEffect(() => {
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1200, // Tăng thời gian để animation mượt mà hơn
        useNativeDriver: true,
        easing: Easing.linear,
      }),
    ).start()
  }, [shimmerAnim])

  // Điều chỉnh outputRange để dải gradient quét qua toàn bộ chiều rộng
  // Giả sử chiều rộng container là 100% và dải shimmer rộng hơn container
  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-350, 350], // Điều chỉnh giá trị này tùy theo kích thước mong muốn
  })

  return (
    <View style={[styles.container, { borderRadius }, style]}>
      <Animated.View
        style={[
          styles.shimmerWrapper,
          {
            borderRadius,
            transform: [{ translateX }],
          },
        ]}
      >
        <LinearGradient
          colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.3)", "rgba(255,255,255,0)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradient}
        />
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#E0E0E0", // Màu nền xám nhạt hơn cho placeholder
    overflow: "hidden",
    width: "100%",
    height: 120,
    marginBottom: 16,
  },
  shimmerWrapper: {
    width: "100%", // Dải shimmer rộng bằng container
    height: "100%",
    position: "absolute",
    left: 0,
    top: 0,
  },
  gradient: {
    flex: 1,
  },
})

export default ShimmerPlaceholder
