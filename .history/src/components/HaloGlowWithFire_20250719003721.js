import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions, Easing, Image } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Polygon } from 'react-native-svg';

const { width } = Dimensions.get('window');
const SIZE = width * 0.6;
const CENTER = SIZE / 2;
const RAY_COUNT = 8; // Fewer rays for more spacing

export default function HaloGlowWithFire() {
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 20000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const rotateInterpolate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Rays: longer, thinner, and more spaced out
  const rays = Array.from({ length: RAY_COUNT }).map((_, i) => {
    const angle = (360 / RAY_COUNT) * i;
    const outerRadius = SIZE * 0.55; // longer
    const innerRadius = 0; // start exactly at center
    const width = 7; // thinner

    const x1 = CENTER + innerRadius * Math.cos((angle * Math.PI) / 180);
    const y1 = CENTER + innerRadius * Math.sin((angle * Math.PI) / 180);
    const x2 = CENTER + outerRadius * Math.cos(((angle - width) * Math.PI) / 180);
    const y2 = CENTER + outerRadius * Math.sin(((angle - width) * Math.PI) / 180);
    const x3 = CENTER + outerRadius * Math.cos(((angle + width) * Math.PI) / 180);
    const y3 = CENTER + outerRadius * Math.sin(((angle + width) * Math.PI) / 180);

    return (
      <Polygon
        key={i}
        points={`${x1},${y1} ${x2},${y2} ${x3},${y3}`}
        fill="url(#grad)"
        opacity={0.18}
      />
    );
  });

  return (
    <View style={styles.container}>
      <Animated.View
        style={{
          transform: [{ rotate: rotateInterpolate }],
        }}
      >
        <Svg width={SIZE} height={SIZE}>
          <Defs>
            <LinearGradient id="grad" x1="0.5" y1="0" x2="0.5" y2="1">
              <Stop offset="0%" stopColor="rgba(255, 184, 0, 0.8)" />
              <Stop offset="100%" stopColor="rgba(255, 184, 0, 0)" />
            </LinearGradient>
          </Defs>
          {rays}
        </Svg>
      </Animated.View>
      {/* Center glow (optional) */}
      <View style={styles.centerGlow} />
      {/* Fire GIF in center */}
      <Image
        source={require('../../assets/animation/FireAnimation1.gif')}
        style={styles.fire}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    width: SIZE,
    height: SIZE,
    position: 'relative',
  },
  centerGlow: {
    position: 'absolute',
    left: (SIZE - 80) / 2,
    top: (SIZE - 80) / 2,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 200, 0, 0.4)',
    shadowColor: '#ffc800',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 20,
    zIndex: 1,
  },
  fire: {
    position: 'absolute',
    left: (SIZE - 80) / 2,
    top: (SIZE - 80) / 2,
    width: 80,
    height: 80,
    zIndex: 2,
  },
});
