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
  const [error, setError] = useState(null);
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
    let saveInterval = null;
    let _steps = steps;
    let _duration = duration;
    let _lastStepTime = lastStepTime;
    let prev = { x: 0, y: 0, z: 0, mag: 0 };
    let prevStepTime = _lastStepTime || 0;

    const startTracking = async () => {
      try {
        const { status } = await Accelerometer.requestPermissionsAsync();
        console.log('[StepTracker] Accelerometer permission status:', status);
        if (status !== 'granted') {
          setError('Accelerometer permission denied');
          alert('Bạn cần cấp quyền truy cập cảm biến chuyển động để đếm bước chân! Vui lòng vào phần cài đặt và cấp quyền cho ứng dụng.');
          return;
        }
        const available = await Accelerometer.isAvailableAsync();
        console.log('[StepTracker] Accelerometer available:', available);
        if (!available) {
          setError('Accelerometer not available on this device');
          alert('Thiết bị của bạn không hỗ trợ cảm biến bước chân.');
          return;
        }
        Accelerometer.setUpdateInterval(100);
        accelSub.current = Accelerometer.addListener(accelData => {
          const { x, y, z } = accelData;
          const mag = Math.sqrt(x * x + y * y + z * z);
          const now = Date.now();
          const deltaMag = Math.abs(mag - prev.mag);
          const deltaVec = Math.sqrt(
            Math.pow(x - prev.x, 2) +
            Math.pow(y - prev.y, 2) +
            Math.pow(z - prev.z, 2)
          );
          // Step detected if both magnitude and direction change enough, and not too soon after last step
          const threshold = 0.5; // Lowered for more sensitivity
          const minStepInterval = 250;
          const minMove = 0.08; // Lowered for more sensitivity
          if (
            deltaMag > threshold &&
            deltaVec > minMove &&
            (now - prevStepTime > minStepInterval)
          ) {
            _steps = _steps + 1;
            setSteps(s => s + 1);
            if (!prevStepTime || now - prevStepTime > 1000) {
              _duration = _duration + 1;
              setDuration(d => d + 1);
            }
            prevStepTime = now;
            _lastStepTime = now;
            setLastStepTime(now);
            console.log('[StepTracker] STEP DETECTED', { steps: _steps, duration: _duration, now, deltaMag, deltaVec });
          } else {
            // Debug: log when not detected
            // console.log('[StepTracker] No step', { deltaMag, deltaVec });
          }
          prev = { x, y, z, mag };
          lastAccel.current = { x, y, z, mag };
        });
        saveInterval = setInterval(async () => {
          try {
            const todayKey = getTodayKey(userId);
            const saveData = { steps: _steps, duration: _duration, lastStepTime: _lastStepTime, date: new Date().toISOString(), userId };
            await AsyncStorage.setItem(todayKey, JSON.stringify(saveData));
            // console.log('[StepTracker] Data saved to AsyncStorage:', saveData);
          } catch (err) {
            console.error('[StepTracker] AsyncStorage save error:', err);
          }
        }, 10000);
      } catch (err) {
        setError('Error initializing step tracker');
        console.error('[StepTracker] Error:', err);
      }
    };
    startTracking();
    return () => {
      if (accelSub.current) {
        accelSub.current.remove();
        accelSub.current = null;
        console.log('[StepTracker] Cleanup accelerometer listener');
      }
      if (saveInterval) clearInterval(saveInterval);
    };
  }, [userId, isReady, steps, duration, lastStepTime]);
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
    <StepTrackerContext.Provider value={{ steps, duration, isReady, error }}>
      {children}
    </StepTrackerContext.Provider>
  );
}

export function useStepTracker() {
  return useContext(StepTrackerContext);
}
