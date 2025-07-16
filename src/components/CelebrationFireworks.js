
import { useRef, useEffect } from "react"
import { View, Animated, StyleSheet, Dimensions } from "react-native"
import { Ionicons } from "@expo/vector-icons"

const { width, height } = Dimensions.get("window")
const NUM_PARTICLES = 30 

const CelebrationFireworks = ({
  isVisible,
  colors = ["#FFD700", "#FF6347", "#6A5ACD", "#00CED1", "#32CD32", "#FF1493"], 
}) => {
  const animations = useRef([]).current
  const particleProps = useRef([]).current 

  useEffect(() => {
    if (isVisible) {
      if (animations.length === 0) {
        for (let i = 0; i < NUM_PARTICLES; i++) {
          animations.push(new Animated.Value(0))

          const targetX = Math.random() * 400 - 200 // Từ -200 đến 200 (ngang)
          const targetY = Math.random() * 400 - 300 // Từ -300 (lên trên) đến 100 (xuống dưới)
          const duration = Math.random() * 800 + 1200 // Thời gian animation từ 1200ms đến 2000ms
          const size = Math.random() * 15 + 10 // Kích thước từ 10 đến 25
          const particleColor = Array.isArray(colors) ? colors[Math.floor(Math.random() * colors.length)] : colors // Chọn màu ngẫu nhiên từ mảng

          particleProps.push({
            targetX,
            targetY,
            duration,
            size,
            color: particleColor,
            initialDelay: Math.random() * 200, // Độ trễ nhỏ ngẫu nhiên cho mỗi hạt
          })
        }
      }

      animations.forEach((anim) => {
        anim.setValue(0) // Đặt lại animation về trạng thái ban đầu
      })

      // Chạy song song các animation với độ trễ riêng
      const parallelAnimations = animations.map((anim, i) => {
        const props = particleProps[i] || { duration: 1500, initialDelay: 0 } // Fallback nếu props chưa được khởi tạo
        return Animated.timing(anim, {
          toValue: 1,
          duration: props.duration,
          useNativeDriver: true,
          delay: props.initialDelay, // Áp dụng độ trễ riêng
        })
      })

      Animated.parallel(parallelAnimations).start() // Bắt đầu tất cả các animation song song sau độ trễ của chúng
    }
  }, [isVisible, colors]) // Chạy lại nếu isVisible hoặc colors thay đổi

  if (!isVisible) {
    return null
  }

  // Tâm của vụ nổ (hơi thấp hơn giữa màn hình để giống pháo hoa bắn từ dưới lên)
  const explosionCenterX = width / 2
  const explosionCenterY = height * 0.8 // Đặt thấp hơn một chút

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {Array.from({ length: NUM_PARTICLES }).map((_, i) => {
        const animValue = animations[i] || (animations[i] = new Animated.Value(0))
        const props = particleProps[i] || {} // Lấy thuộc tính đã lưu

        const translateX = animValue.interpolate({
          inputRange: [0, 1],
          outputRange: [0, props.targetX || 0],
        })
        const translateY = animValue.interpolate({
          inputRange: [0, 1],
          outputRange: [0, props.targetY || 0],
        })
        const opacity = animValue.interpolate({
          inputRange: [0, 0.1, 0.7, 1], // Xuất hiện nhanh, giữ, rồi mờ dần
          outputRange: [0, 1, 1, 0],
        })
        const scale = animValue.interpolate({
          inputRange: [0, 0.1, 1], // Tăng kích thước nhanh, rồi giữ
          outputRange: [0, 1, 1],
        })
        const rotate = animValue.interpolate({
          inputRange: [0, 1],
          outputRange: ["0deg", `${Math.random() * 360}deg`], // Xoay ngẫu nhiên
        })

        return (
          <Animated.View
            key={i}
            style={[
              styles.particle,
              {
                left: explosionCenterX,
                top: explosionCenterY,
                transform: [{ translateX }, { translateY }, { scale }, { rotate }],
                opacity,
              },
            ]}
          >
            <Ionicons name="sparkles" size={props.size || 15} color={props.color || "#FFD700"} />
          </Animated.View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  particle: {
    position: "absolute",
  },
})

export default CelebrationFireworks
