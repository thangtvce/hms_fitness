import React from 'react';
import { View, Image, StyleSheet } from 'react-native';

const Loading = ({ backgroundColor = '#FFFFFF', logoSize = 300 }) => {
  return (
    <View style={[styles.loadingContainer, { backgroundColor }]}> 
      <View style={styles.loadingGradient}>
        <Image
          source={require('../../assets/images/logo.png')}
          style={[styles.loadingImage, { width: logoSize, height: logoSize }]}
          resizeMode="contain"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  loadingImage: {
    marginBottom: 20,
  },
});

export default Loading;
