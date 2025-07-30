"use client"

import { useState, useRef, useEffect } from "react"
import { View, Animated, Dimensions, StyleSheet } from "react-native"
import { PanGestureHandler, GestureHandlerRootView } from "react-native-gesture-handler"

const screenDimensions = Dimensions.get("window")
const { width } = screenDimensions || { width: 375 }

export default function CustomRuler({
  min = 40,
  max = 200,
  value = 70,
  onValueChange = () => {},
  type = "height", // 'height' or 'weight'
  unit = "kg",
  unitOptions = ["kg", "lb"],
  onUnitChange = () => {},
  majorStep = 10,
  minorStep = 1,
  indicatorColor = "#10B981",
  indicatorWidth = 2,
  indicatorHeight = 80,
  style = {},
  renderLabel,
}) {
  const rulerWidth = Math.max(width - 80, 200) // Ensure minimum width
  const [currentValue, setCurrentValue] = useState(value)
  const translateX = useRef(new Animated.Value(0)).current
  const gestureState = useRef({ isGesturing: false }).current

  // Calculate ruler parameters based on type
  const getRulerParams = () => {
    if (type === "weight") {
      return {
        min: unit === "kg" ? 30 : 66, // 30kg = 66lbs
        max: unit === "kg" ? 200 : 440, // 200kg = 440lbs
        step: unit === "kg" ? 1 : 2,
        majorStep: unit === "kg" ? 10 : 20,
      }
    } else {
      return {
        min: unit === "cm" ? 140 : 4.6, // 140cm = 4.6ft
        max: unit === "cm" ? 220 : 7.2, // 220cm = 7.2ft
        step: unit === "cm" ? 1 : 0.1,
        majorStep: unit === "cm" ? 10 : 0.5,
      }
    }
  }

  const params = getRulerParams()
  const range = params.max - params.min
  const pixelsPerUnit = rulerWidth / range
  const centerOffset = rulerWidth / 2

  useEffect(() => {
    setCurrentValue(value)
    const offset = (value - params.min) * pixelsPerUnit - centerOffset
    translateX.setValue(-offset)
  }, [value, unit])

  const onGestureEvent = Animated.event([{ nativeEvent: { translationX: translateX } }], {
    useNativeDriver: false,
    listener: (event) => {
      if (!gestureState.isGesturing) return

      const translationX = event.nativeEvent.translationX
      const newValue = params.min + (centerOffset - translationX) / pixelsPerUnit
      const clampedValue = Math.max(params.min, Math.min(params.max, newValue))
      const steppedValue = Math.round(clampedValue / params.step) * params.step

      if (steppedValue !== currentValue) {
        setCurrentValue(steppedValue)
        onValueChange?.(steppedValue)
      }
    },
  })

  const onHandlerStateChange = (event) => {
    if (event.nativeEvent.state === 4) {
      // BEGAN
      gestureState.isGesturing = true
    } else if (event.nativeEvent.state === 5) {
      // END
      gestureState.isGesturing = false
    }
  }

  const renderRulerMarks = () => {
    const marks = []
    const totalMarks = Math.ceil(range / params.step)

    for (let i = 0; i <= totalMarks; i++) {
      const markValue = params.min + i * params.step
      if (markValue > params.max) break

      const isMajor = markValue % params.majorStep === 0
      const position = i * params.step * pixelsPerUnit

      marks.push(
        <View
          key={i}
          style={[
            styles.rulerMark,
            {
              left: position,
              height: isMajor ? 30 : 15,
              backgroundColor: isMajor ? "#334155" : "#CBD5E1",
            },
          ]}
        >
          {isMajor && renderLabel && <View style={styles.labelContainer}>{renderLabel(markValue)}</View>}
        </View>,
      )
    }

    return marks
  }

  return (
    <GestureHandlerRootView style={[styles.container, style]}>
      <View style={styles.rulerContainer}>
        <PanGestureHandler onGestureEvent={onGestureEvent} onHandlerStateChange={onHandlerStateChange}>
          <Animated.View
            style={[
              styles.ruler,
              {
                width: rulerWidth * 2,
                transform: [{ translateX }],
              },
            ]}
          >
            {renderRulerMarks()}
          </Animated.View>
        </PanGestureHandler>

        {/* Center indicator */}
        <View
          style={[
            styles.indicator,
            {
              backgroundColor: indicatorColor,
              width: indicatorWidth,
              height: indicatorHeight,
            },
          ]}
        />
      </View>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  container: {
    height: 120,
    justifyContent: "center",
    alignItems: "center",
  },
  rulerContainer: {
    height: 80,
    width: width - 80,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    overflow: "hidden",
    justifyContent: "center",
    position: "relative",
  },
  ruler: {
    height: "100%",
    flexDirection: "row",
    alignItems: "flex-end",
    paddingBottom: 10,
  },
  rulerMark: {
    width: 2,
    position: "absolute",
    bottom: 0,
  },
  labelContainer: {
    position: "absolute",
    bottom: 35,
    left: -15,
    width: 30,
    alignItems: "center",
  },
  indicator: {
    position: "absolute",
    top: 0,
    left: "50%",
    marginLeft: -1,
    zIndex: 10,
  },
})
