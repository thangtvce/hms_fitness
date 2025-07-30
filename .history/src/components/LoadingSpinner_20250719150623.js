import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import LottieView from 'lottie-react-native';

const LoadingSpinner = ({ size = 120, style }) => (
  <View style={[styles.fullScreenContainer, style]}>
    <LottieView
      source={require('../../assets/animation/Loading.json')}
      autoPlay
      loop
      style={{ width: size, height: size }}
    />
    <Text style={styles.loadingText}>Loading...</Text>
  </View>
);

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.0)',
    zIndex: 999,
    marginTop: 120,
  },
  loadingText: {
    fontSize: 20,
    color: '#1976D2',
    fontWeight: '600',
    letterSpacing: 1,
    textAlign: 'center',
    marginTop: 16,
  },
});

export default LoadingSpinner;
