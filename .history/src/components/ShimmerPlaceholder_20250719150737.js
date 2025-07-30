import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';

// Simple shimmer effect for loading cards
const ShimmerPlaceholder = ({ style }) => {
  const shimmerAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [shimmerAnim]);

  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-150, 300],
  });

  return (
    <View style={[styles.container, style]}>
      <Animated.View
        style={[
          styles.shimmer,
          {
            transform: [{ translateX }],
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F3F4F6',
    overflow: 'hidden',
    borderRadius: 16,
    width: '100%',
    height: 120,
    marginBottom: 16,
  },
  shimmer: {
    width: 150,
    height: '100%',
    backgroundColor: 'rgba(200,200,200,0.18)',
    opacity: 0.7,
    borderRadius: 16,
  },
});

export default ShimmerPlaceholder;
