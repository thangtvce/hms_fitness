import React from "react"
import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native"
import { Feather } from "@expo/vector-icons"

export default function WaterCupTracker({
  targetMl = 2000,
  todayIntake = 0,
  totalCups = 10,
  onWaterAdded
}) {
  // Calculate ml per cup and progress
  const mlPerCup = targetMl / totalCups;
  const cupsFull = Math.floor(todayIntake / mlPerCup);
  const lastCupPercent = Math.min(1, Math.max(0, (todayIntake - cupsFull * mlPerCup) / mlPerCup));

  // Render a cup with fill percent
  const renderCup = (index) => {
    let fillPercent = 0;
    if (index < cupsFull) fillPercent = 1;
    else if (index === cupsFull) fillPercent = lastCupPercent;
    return (
      <View key={index} style={waterStyles.cupTouchable}>
        <Image
          source={require('../../assets/images/water.png')}
          style={{ width: 48, height: 48, opacity: fillPercent > 0 ? 1 : 0.3 }}
          resizeMode="contain"
        />
        {fillPercent > 0 && fillPercent < 1 && (
          <View style={[waterStyles.cupFillOverlay, { height: 48 * (1 - fillPercent) }]} />
        )}
      </View>
    );
  };

  // Quick log button (not on cup)
  const quickAddAmount = 200; // ml to add per tap
  const handleQuickAdd = () => {
    if (onWaterAdded) onWaterAdded(quickAddAmount);
  };

  return (
    <View style={[waterStyles.container, { backgroundColor: "#fff" }]}> 
      <View style={waterStyles.gradient}>
        {/* Top section: Water title and Goal */}
        <View style={waterStyles.headerContent}>
          <View>
            <Text style={waterStyles.title}>Water</Text>
            <Text style={waterStyles.goal}>{todayIntake} ml</Text>
          </View>
          {/* Quick log button */}
          <TouchableOpacity style={waterStyles.quickAddBtn} onPress={handleQuickAdd}>
            <Feather name="plus" size={20} color="#2563EB" />
            <Text style={waterStyles.quickAddText}>+{quickAddAmount}ml</Text>
          </TouchableOpacity>
        </View>
        {/* Cups Grid */}
        <View style={waterStyles.unitsGrid}>
          {Array(totalCups)
            .fill(0)
            .map((_, index) => renderCup(index))}
        </View>
      </View>
    </View>
  );
}

const waterStyles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 20,
    elevation: 8,
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    backgroundColor: "#fff", // White background
  },
  gradient: {
    padding: 20,
    paddingBottom: 15,
    backgroundColor: "#fff",
  },
  headerContent: {
    alignSelf: "flex-start",
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
  },
  goal: {
    fontSize: 14,
    color: "#1E293B",
    marginTop: 2,
  },
  quickAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0E7FF',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginLeft: 12,
    alignSelf: 'center',
  },
  quickAddText: {
    color: '#2563EB',
    fontWeight: '700',
    fontSize: 14,
    marginLeft: 4,
  },
  cupFillOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#fff",
    opacity: 0.7,
    zIndex: 2,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  unitsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    alignItems: "flex-end",
    marginBottom: 16,
    gap: 0,
    alignSelf: 'center',
    width: '100%',
    maxWidth: '100%',
  },
  cupTouchable: {
    padding: 0,
    alignItems: 'center',
    flexBasis: '12.5%', // 8 cups per row
    maxWidth: '12.5%',
    height: 56,
  },
})