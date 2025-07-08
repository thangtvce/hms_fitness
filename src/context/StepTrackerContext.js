import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { AuthContext } from "./AuthContext";
import { Accelerometer } from "expo-sensors";
import AsyncStorage from "@react-native-async-storage/async-storage";

const StepTrackerContext = createContext();

export function StepTrackerProvider({ children }) {
  const { user } = useContext(AuthContext);
  const userId = user?.userId;
  const [steps, setSteps] = useState(0);
  const [duration, setDuration] = useState(0); 
  const [lastStepTime, setLastStepTime] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const lastAccel = useRef({ x: 0, y: 0, z: 0, mag: 0 });
  const accelSub = useRef(null);

  // Helper
  function getTodayKey(userId) {
    const d = new Date();
    return `stepcounter_${userId || 'unknown'}_${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`;
  }

  // Load saved data on mount
  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      try {
        const todayKey = getTodayKey(userId);
        const data = await AsyncStorage.getItem(todayKey);
        if (data) {
          const parsed = JSON.parse(data);
          setSteps(parsed.steps || 0);
          setDuration(parsed.duration || 0);
          setLastStepTime(parsed.lastStepTime || null);
        }
      } catch {}
      setIsReady(true);
    };
    load();
  }, [userId]);

  // Step tracking logic (always on)
useEffect(() => {
  if (!userId || !isReady) return;
  console.log('[StepTracker] Starting step tracking', { userId, isReady });
  let isMounted = true;

  const checkPermissionAndStart = async () => {
    try {

      // Yêu cầu quyền sensor rõ ràng, show alert nếu bị từ chối
      const { status } = await Accelerometer.requestPermissionsAsync();
      console.log('[StepTracker] Accelerometer permission status:', status);
      if (status !== 'granted') {
        alert('Bạn cần cấp quyền truy cập cảm biến chuyển động để đếm bước chân! Vui lòng vào phần cài đặt và cấp quyền cho ứng dụng.');
        setError('Accelerometer permission denied');
        return;
      }

      const available = await Accelerometer.isAvailableAsync();
      console.log('[StepTracker] Accelerometer available:', available);
      if (!available) {
        console.warn('[StepTracker] Accelerometer not available on this device.');
        setError('Accelerometer not available on this device');
        return;
      }

      Accelerometer.setUpdateInterval(100);
      let _steps = steps;
      let _duration = duration;
      let _lastStepTime = lastStepTime;
      let saveInterval = null;
      const threshold = 1.15;
      const accelListener = Accelerometer.addListener(accelData => {
        const { x, y, z } = accelData;
        const mag = Math.sqrt(x * x + y * y + z * z);
        const now = Date.now();
        console.log('[StepTracker] Accelerometer data:', { x, y, z, mag, diff: mag - lastAccel.current.mag });
        if (
          mag - lastAccel.current.mag > threshold &&
          (!_lastStepTime || now - _lastStepTime > 350)
        ) {
          _steps++;
          setSteps(s => s + 1);
          if (!_lastStepTime || now - _lastStepTime > 1000) {
            _duration += 1;
            setDuration(d => d + 1);
          }
          _lastStepTime = now;
          setLastStepTime(now);
          console.log('[StepTracker] STEP DETECTED', { steps: _steps, duration: _duration, now });
        }
        lastAccel.current = { x, y, z, mag };
      });
      accelSub.current = accelListener;

      saveInterval = setInterval(async () => {
        try {
          const todayKey = getTodayKey(userId);
          const saveData = { steps: _steps, duration: _duration, lastStepTime: _lastStepTime, date: new Date().toISOString(), userId };
          await AsyncStorage.setItem(todayKey, JSON.stringify(saveData));
          console.log('[StepTracker] Data saved to AsyncStorage:', saveData);
        } catch (err) {
          console.error('[StepTracker] AsyncStorage save error:', err);
        }
      }, 10000);

      return () => {
        if (accelSub.current) {
          accelSub.current.remove();
          console.log('[StepTracker] Accelerometer listener removed');
        }
        if (saveInterval) clearInterval(saveInterval);
      };
    } catch (err) {
      console.error('[StepTracker] Error:', err);
      setError('Error initializing step tracker');
    }
  };
  checkPermissionAndStart();
  return () => {
    if (accelSub.current) {
      accelSub.current.remove();
      console.log('[StepTracker] Cleanup accelerometer listener');
    }
  };
}, [userId, isReady]);
  // Save on unmount
  useEffect(() => {
    return () => {
      if (!userId) return;
      const todayKey = getTodayKey(userId);
      const saveData = { steps, duration, lastStepTime, date: new Date().toISOString(), userId };
      AsyncStorage.setItem(todayKey, JSON.stringify(saveData));
    };
    // eslint-disable-next-line
  }, [userId, steps, duration, lastStepTime]);

  return (
    <StepTrackerContext.Provider value={{ steps, duration, isReady }}>
      {children}
    </StepTrackerContext.Provider>
  );
}

export function useStepTracker() {
  return useContext(StepTrackerContext);
}
