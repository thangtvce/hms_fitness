import React, { useRef, useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Dimensions
} from 'react-native';
import { Audio } from 'expo-av';

const screenWidth = Dimensions.get('window').width;
const unitWidth = 10; // 1 đơn vị = 10px

/**
 * CustomRuler
 * type: 'height' | 'weight' (optional, for semantic usage)
 * min, max, unit, majorStep, minorStep: customize for height/weight
 * Example for height: min=140, max=220, unit='cm'
 * Example for weight: min=40, max=150, unit='kg'
 */
export default function CustomRuler({
  type = 'height', // 'height' or 'weight' (optional, for semantic usage)
  min,
  max,
  value,
  onValueChange = () => {},
  unit,
  unitOptions, // e.g. ['cm', 'ft'] or ['kg', 'lb']
  onUnitChange, // callback(unit)
  majorStep,
  minorStep,
  soundFile = require('../../assets/snap1.wav'),
  indicatorColor = 'red',
  indicatorWidth = 2,
  indicatorHeight = 70,
  style,
  renderLabel,
}) {
  // Default values by type
  // Đơn vị mặc định và min/max theo đơn vị
  let defaultUnit, defaultMin, defaultMax, defaultValue, defaultMajorStep, defaultMinorStep;
  if (type === 'weight') {
    defaultUnit = 'kg';
    defaultMin = 40;
    defaultMax = 150;
    defaultValue = 70;
    defaultMajorStep = 10;
    defaultMinorStep = 1;
  } else {
    defaultUnit = 'cm';
    defaultMin = 70;
    defaultMax = 250;
    defaultValue = 160;
    defaultMajorStep = 10;
    defaultMinorStep = 1;
  }
  unit = unit ?? defaultUnit;
  min = min ?? defaultMin;
  max = max ?? defaultMax;
  value = value ?? defaultValue;
  majorStep = majorStep ?? defaultMajorStep;
  minorStep = minorStep ?? defaultMinorStep;

  // Chuyển đổi đơn vị
  const convertValue = (val, from, to) => {
    if (from === to) return val;
    if (type === 'height') {
      // cm <-> ft
      if (from === 'cm' && to === 'ft') {
        const totalInches = val / 2.54;
        return totalInches / 12; // feet (float)
      }
      if (from === 'ft' && to === 'cm') {
        return val * 12 * 2.54;
      }
    } else if (type === 'weight') {
      // kg <-> lb
      if (from === 'kg' && to === 'lb') {
        return val * 2.20462;
      }
      if (from === 'lb' && to === 'kg') {
        return val / 2.20462;
      }
    }
    return val;
  };

  // min/max theo đơn vị hiện tại
  let displayMin = min, displayMax = max, displayValue = value;
  if (type === 'height' && unit === 'ft') {
    displayMin = Math.round((min / 2.54) / 12 * 100) / 100; // feet
    displayMax = Math.round((max / 2.54) / 12 * 100) / 100;
    displayValue = Math.round((value / 2.54) / 12 * 100) / 100;
    majorStep = 1;
    minorStep = 0.0833; // 1 inch = 1/12 ft
  } else if (type === 'weight' && unit === 'lb') {
    displayMin = Math.round(min * 2.20462);
    displayMax = Math.round(max * 2.20462);
    displayValue = Math.round(value * 2.20462);
    majorStep = 10;
    minorStep = 1;
  } else {
    displayMin = min;
    displayMax = max;
    displayValue = value;
  }
  const rulerLength = Math.round((displayMax - displayMin) / minorStep) + 1;
  const scrollRef = useRef(null);
  const soundRef = useRef(null);
  const lastValueRef = useRef(value);
  const [internalValue, setInternalValue] = useState(displayValue);
  const [currentUnit, setCurrentUnit] = useState(unit);

  useEffect(() => {
    loadSound();
    return () => {
      if (soundRef.current) soundRef.current.unloadAsync();
    };
  }, []);


  // Khi đổi đơn vị từ ngoài vào
  useEffect(() => {
    if (unit !== currentUnit) {
      // Chuyển đổi giá trị sang đơn vị mới
      const newVal = convertValue(internalValue, currentUnit, unit);
      setInternalValue(newVal);
      setCurrentUnit(unit);
      setTimeout(() => scrollToValue(newVal), 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unit]);

  // Chỉ scrollToValue nếu value prop đổi từ ngoài (không phải do kéo), so sánh sau khi convert về cùng đơn vị
  useEffect(() => {
    // Convert prop value về đơn vị hiện tại để so với internalValue
    const valueInCurrentUnit = convertValue(value, defaultUnit, currentUnit);
    if (Math.abs(valueInCurrentUnit - internalValue) > (minorStep / 2)) {
      setInternalValue(valueInCurrentUnit);
      setTimeout(() => scrollToValue(valueInCurrentUnit), 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, currentUnit, displayMin, displayMax]);

  // Scroll to initial value on mount only
  useEffect(() => {
    setTimeout(() => scrollToValue(displayValue), 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadSound = async () => {
    if (!soundFile) return;
    try {
      const { sound } = await Audio.Sound.createAsync(soundFile);
      soundRef.current = sound;
    } catch {}
  };

  const playSound = async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.setPositionAsync(0);
        await soundRef.current.playAsync();
      } catch {}
    }
  };

  const onScroll = (event) => {
    let offsetX = event.nativeEvent.contentOffset.x;
    // Clamp offsetX so user can't scroll out of bounds
    const minOffset = 0;
    const maxOffset = (rulerLength - 1) * unitWidth;
    if (offsetX < minOffset) offsetX = minOffset;
    if (offsetX > maxOffset) offsetX = maxOffset;
    let val = Math.round(offsetX / unitWidth) * minorStep + displayMin;
    // Làm tròn cho ft (1/12)
    if (type === 'height' && currentUnit === 'ft') {
      val = Math.round(val * 12) / 12;
    } else {
      val = Math.round(val);
    }
    if (val !== lastValueRef.current && val >= displayMin && val <= displayMax) {
      setInternalValue(val);
      lastValueRef.current = val;
      // Gửi về đơn vị gốc (cm/kg)
      let outVal = val;
      if (currentUnit !== defaultUnit) {
        outVal = convertValue(val, currentUnit, defaultUnit);
      }
      onValueChange(Math.round(outVal));
      playSound();
    }
  };

  const scrollToValue = (val, animated = true) => {
    // Clamp value to min/max
    let clamped = Math.max(displayMin, Math.min(displayMax, val));
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        x: ((clamped - displayMin) / minorStep) * unitWidth - screenWidth / 2 + unitWidth / 2,
        animated,
      });
    }
  };

  return (
    <View style={[styles.rulerWrapper, style]}>
      {/* Đổi đơn vị nếu có nhiều lựa chọn */}
      {unitOptions && unitOptions.length > 1 && (
        <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 4 }}>
          {unitOptions.map(opt => (
            <Text
              key={opt}
              style={{
                marginHorizontal: 8,
                fontWeight: currentUnit === opt ? 'bold' : 'normal',
                color: currentUnit === opt ? '#d32f2f' : '#333',
                textDecorationLine: currentUnit === opt ? 'underline' : 'none',
                fontSize: 13,
              }}
              onPress={() => {
                if (opt !== currentUnit) {
                  setCurrentUnit(opt);
                  if (onUnitChange) onUnitChange(opt);
                }
              }}
            >
              {opt === 'ft' ? 'ft/in' : opt}
            </Text>
          ))}
        </View>
      )}
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rulerScroll}
        snapToInterval={unitWidth}
        decelerationRate="fast"
        onScroll={onScroll}
        scrollEventThrottle={16}
        bounces={false}
        overScrollMode="never"
        style={{ flexGrow: 0, flexShrink: 0 }}
        contentOffset={{ x: 0, y: 0 }}
      >
        {Array.from({ length: rulerLength }).map((_, i) => {
          let val = displayMin + i * minorStep;
          let label = '';
          let isMajor = false;
          if (type === 'height' && currentUnit === 'ft') {
            // ft/in: major mỗi 1ft, minor mỗi 1in
            const ft = Math.floor(val);
            const inch = Math.round((val - ft) * 12);
            isMajor = (Math.abs(val - Math.round(val)) < 0.01);
            label = isMajor ? `${ft} ft` : '';
            if (isMajor && ft > 0) label = `${ft} ft`;
          } else {
            isMajor = (Math.round(val) % majorStep === 0);
            label = isMajor ? `${Math.round(val)} ${currentUnit}` : '';
          }
          return (
            <View key={i} style={styles.tickWrapper}>
              <View style={[styles.tick, { height: isMajor ? 30 : 15 }]} />
              {isMajor && label && (
                <View style={styles.tickNumberWrapper}>
                  {renderLabel ? renderLabel(val) : (
                    <Text style={styles.tickNumber}>{label}</Text>
                  )}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
      {/* Chỉ báo chính giữa */}
      <View style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: indicatorWidth,
        height: indicatorHeight,
        backgroundColor: indicatorColor,
        left: screenWidth / 2 - indicatorWidth / 2,
      }} />
    </View>
  );
}

const styles = StyleSheet.create({
  rulerWrapper: {
    height: 70,
    marginBottom: 10,
    position: 'relative',
  },
  rulerScroll: {
    paddingHorizontal: screenWidth / 2 - unitWidth / 2,
    alignItems: 'flex-start',
  },
  tickWrapper: {
    width: unitWidth,
    alignItems: 'center',
  },
  tick: {
    width: 2,
    backgroundColor: '#000',
  },
  tickNumberWrapper: {
    width: 30,
    alignItems: 'center',
    marginTop: 8,
  },
  tickNumber: {
    fontSize: 10,
    color: '#333',
    textAlign: 'center',
  },
});
