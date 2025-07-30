import React from 'react';
import { View, StyleSheet } from 'react-native';
import LottieView from 'lottie-react-native';

const LoadingSpinner = ({ size = 64, style }) => (
  <View style={[styles.container, style]}>
    <LottieView
      source={require('../../assets/animation/Loading.json')}
      autoPlay
      loop
      style={{ width: size, height: size }}
    />
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default LoadingSpinner;
