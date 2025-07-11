import React, { useState, useEffect } from "react";
import { View, Text, FlatList, StyleSheet, TouchableOpacity, SafeAreaView } from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import dayjs from "dayjs";

const FILTERS = ["All", "Completed", "Not Met"];

const NutritionTargetHistoryScreen = () => {
  const [history, setHistory] = useState([]);
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    (async () => {
      // Lấy history
      const raw = await AsyncStorage.getItem("nutritionTargetHistory");
      let historyArr = [];
      if (raw) historyArr = JSON.parse(raw);
      // Lấy target hiện tại từ AsyncStorage
      const rawTarget = await AsyncStorage.getItem("nutritionTarget");
      let currentTarget = { carbs: 0, protein: 0, fats: 0, calories: 0 };
      if (rawTarget) currentTarget = JSON.parse(rawTarget);
      // Nếu entry nào thiếu targetCarbs/targetProtein/targetFats/targetCalories thì bổ sung từ target hiện tại
      const fixed = historyArr.map(item => ({
        ...item,
        targetCarbs: item.targetCarbs ?? currentTarget.carbs,
        targetProtein: item.targetProtein ?? currentTarget.protein,
        targetFats: item.targetFats ?? currentTarget.fats,
        targetCalories: item.targetCalories ?? currentTarget.calories,
        completed:
          Number(item.carbs) >= Number(item.targetCarbs ?? currentTarget.carbs) &&
          Number(item.protein) >= Number(item.targetProtein ?? currentTarget.protein) &&
          Number(item.fats) >= Number(item.targetFats ?? currentTarget.fats) &&
          (typeof item.netCalories === 'number' && typeof (item.targetCalories ?? currentTarget.calories) === 'number'
            ? Number(item.netCalories) >= Number(item.targetCalories ?? currentTarget.calories)
            : true),
      }));
      setHistory(fixed);
    })();
  }, []);

  // Filtered history
  const filtered = history.filter(item => {
    if (filter === "All") return true;
    if (filter === "Completed") return item.completed;
    if (filter === "Not Met") return !item.completed;
    return true;
  });

  const renderMacro = (label, value, target, unit = 'g') => {
    const percent = target && target > 0 ? Math.round((value / target) * 100) : 0;
    return (
      <Text style={styles.macroLine}>
        {label}: <Text style={{color:'#4F46E5', fontWeight:'700'}}>{value}</Text>/{target}{unit} (<Text style={{color: percent >= 100 ? '#10B981' : '#F59E0B'}}>{percent}%</Text>)
      </Text>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => (typeof navigation !== 'undefined' && navigation.goBack ? navigation.goBack() : null)}>
          <Icon name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nutrition Target Completion History</Text>
        <View style={{width: 40}} />
      </View>
      <View style={styles.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={styles.filterBtnText}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <FlatList
        data={filtered.sort((a, b) => dayjs(b.date).unix() - dayjs(a.date).unix())}
        keyExtractor={(item) => item.date}
        renderItem={({ item }) => (
          <View style={[styles.item, item.completed ? styles.itemCompleted : styles.itemNotMet]}>
            <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center'}}>
              <Text style={styles.date}>{dayjs(item.date).format("YYYY-MM-DD")}</Text>
              <Text style={[styles.status, {color: item.completed ? '#10B981' : '#EF4444'}]}>
                {item.completed ? "Completed" : "Not Met"}
              </Text>
            </View>
            {renderMacro('Carbs', item.carbs, item.targetCarbs)}
            {renderMacro('Protein', item.protein, item.targetProtein)}
            {renderMacro('Fats', item.fats, item.targetFats)}
            {renderMacro('Net Calories', item.netCalories ?? (typeof item.calories === 'number' && typeof item.burnedCalories === 'number' ? item.calories - item.burnedCalories : 0), item.targetCalories, ' cal')}
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No completion history yet.</Text>}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingTop: 8,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginBottom: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
    gap: 8,
    paddingHorizontal: 18,
  },
  filterBtn: {
    backgroundColor: '#E0E7FF',
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 18,
    marginRight: 8,
    marginBottom: 8,
  },
  filterBtnActive: {
    backgroundColor: '#6366F1',
  },
  filterBtnText: {
    color: '#3730A3',
    fontWeight: '700',
    fontSize: 15,
  },
  item: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  itemCompleted: {
    borderLeftWidth: 6,
    borderLeftColor: '#10B981',
  },
  itemNotMet: {
    borderLeftWidth: 6,
    borderLeftColor: '#EF4444',
  },
  date: { fontSize: 16, fontWeight: "700", color: "#4F46E5" },
  status: { fontSize: 14, fontWeight: "700", marginLeft: 8 },
  macroLine: { fontSize: 14, marginTop: 4, marginLeft: 2 },
  empty: { color: "#64748B", textAlign: "center", marginTop: 40 },
});

export default NutritionTargetHistoryScreen;
