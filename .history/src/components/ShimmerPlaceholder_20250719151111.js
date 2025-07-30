import React from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';

// Simple shimmer effect for loading cards
const ShimmerPlaceholder = ({ style, borderRadius = 16 }) => {
  const shimmerAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
        easing: Easing.inOut(Easing.ease),
      })
    ).start();
  }, [shimmerAnim]);

  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 400],
  });

  return (
    <View style={[styles.container, { borderRadius }, style]}>
      <Animated.View
        style={[
          styles.shimmer,
          {
            borderRadius,
            transform: [{ translateX }],
            backgroundColor: 'rgba(180,180,200,0.22)',
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
    width: '100%',
    height: 120,
    marginBottom: 16,
  },
  shimmer: {
    width: 180,
    height: '100%',
    opacity: 0.8,
    borderRadius: 16,
  },
});

export default ShimmerPlaceholder;
