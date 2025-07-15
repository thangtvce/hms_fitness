import React from 'react';
import { SafeAreaView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import { showSuccessMessage } from 'utils/toastUtil';
import Header from 'components/Header';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons'; // Import Ionicons

import AsyncStorage from '@react-native-async-storage/async-storage';

const setTargetWaterLog = async (userId, target, unit) => {
  try {
    const key = `waterTarget_${userId}`;
    const value = JSON.stringify({ target, unit });
    await AsyncStorage.setItem(key, value);
    console.log(`Saving water target for user ${userId}: ${target} ${unit}`);
    return { success: true };
  } catch (e) {
    console.log('Error saving water target:', e);
    return { success: false };
  }
};

const getTargetWaterLog = async (userId) => {
  try {
    const key = `waterTarget_${userId}`;
    const stored = await AsyncStorage.getItem(key);
    console.log(`Fetching water target for user ${userId}`);
    if (stored) {
      return JSON.parse(stored);
    }
    // Nếu chưa có thì trả về mặc định
    return { target: 2000, unit: 'ml' };
  } catch (e) {
    console.log('Error fetching water target:', e);
    return { target: 2000, unit: 'ml' };
  }
};


export default function SetWaterTargetScreen({ route, navigation }) {
  const safeNavigation = navigation || { goBack: () => { } };
  const { userId, initialTarget, onSaved } = route?.params || {};
  const [target, setTarget] = React.useState(initialTarget || 2000);
  const [saving, setSaving] = React.useState(false);

  // Load saved target when screen mounts
  React.useEffect(() => {
    let isMounted = true;
    if (userId) {
      getTargetWaterLog(userId).then((data) => {
        if (isMounted && data && typeof data.target === 'number') {
          setTarget(data.target);
        }
      });
    }
    return () => { isMounted = false; };
  }, [userId]);

  const handleSave = async () => {
    setSaving(true);
    await setTargetWaterLog(userId, target, 'ml');
    try {
      const saved = await getTargetWaterLog(userId);
      if (saved && typeof saved.target === 'number') {
        setTarget(saved.target);
      }
      console.log('Saved water target:', saved);
    } catch (e) {
      console.log('Error reading saved water target:', e);
    }
    setSaving(false);
    if (onSaved) onSaved(target, 'ml');
    showSuccessMessage('Water target saved successfully!');
    safeNavigation.goBack(); 
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title={<Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: 'bold', textAlign: 'center' }}>Set Water Target</Text>}
        onBack={() => safeNavigation.goBack()}
        backgroundColor="#0056d2"
        titleStyle={{
          fontSize: 20,
          fontWeight: "bold",
          color: "#FFFFFF",
          textAlign: "center",
        }}
        containerStyle={{
          borderBottomWidth: 0,
          elevation: 0,
        }}
        backButtonColor="#FFFFFF"
        backIconColor="#FFFFFF"
      />
      <LinearGradient
        colors={['#0056d2', '#2070e0']} // Updated gradient colors
        style={styles.gradientBackground}
      >
        <View style={styles.content}>
          <View style={styles.card}>
            <Text style={styles.title}>SET YOUR DAILY WATER TARGET </Text>
            <Text style={styles.currentValue}>{target} ml</Text>
            <Slider
              style={styles.slider}
              minimumValue={500}
              maximumValue={5000}
              step={50}
              value={target}
              onValueChange={setTarget}
              minimumTrackTintColor="#0056d2" // Updated primary color
              maximumTrackTintColor="#E0E7FF"
              thumbTintColor="#0056d2" // Updated primary color
            />
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSave}
              disabled={saving}
            >
              <LinearGradient
                colors={['#0056d2', '#2070e0']} // Updated gradient colors for the button
                style={styles.saveButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" style={styles.buttonIcon} />
                <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save Target'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2070e0',
  },
  gradientBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 30,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 20,
    textAlign: 'center',
  },
  currentValue: {
    fontSize: 48,
    fontWeight: '900',
    color: '#0056d2', // Updated primary color
    marginBottom: 30,
  },
  slider: {
    width: '100%',
    height: 40,
    marginBottom: 30,
  },
  saveButton: {
    width: '100%',
    borderRadius: 15,
    overflow: 'hidden',
    marginTop: 10,
    shadowColor: '#0056d2', // Updated shadow color
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  buttonIcon: {
    marginRight: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
});