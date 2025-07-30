import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';

export default function FoodDetailsOverlay({ food, onClose, onAdd }) {
  if (!food) return null;
  return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Feather name="x" size={28} color="#64748B" />
        </TouchableOpacity>
        <ScrollView contentContainerStyle={{ alignItems: 'center', paddingBottom: 32 }}>
          <Image source={{ uri: food.image || food.foodImage || food.imageUrl || undefined }} style={styles.image} />
          <Text style={styles.title}>{food.name || food.foodName}</Text>
          <Text style={styles.kcal}>{food.kcal || food.calories || 0} kcal</Text>
          {food.desc || food.description ? (
            <Text style={styles.desc}>{food.desc || food.description}</Text>
          ) : null}
          <View style={styles.nutritionRow}>
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionLabel}>Protein</Text>
              <Text style={styles.nutritionValue}>{food.protein || 0}g</Text>
            </View>
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionLabel}>Carbs</Text>
              <Text style={styles.nutritionValue}>{food.carbs || 0}g</Text>
            </View>
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionLabel}>Fats</Text>
              <Text style={styles.nutritionValue}>{food.fats || 0}g</Text>
            </View>
          </View>
        </ScrollView>
        <TouchableOpacity style={styles.addBtn} onPress={onAdd}>
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    zIndex: 1000,
  },
  container: {
    width: '98%',
    height: '92%',
    maxHeight: '98%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
    alignItems: 'center',
    position: 'relative',
    elevation: 8,
  },
  closeBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 2,
    padding: 8,
  },
  image: {
    width: 120,
    height: 120,
    borderRadius: 16,
    marginBottom: 12,
    backgroundColor: '#F1F5F9',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 4,
    textAlign: 'center',
  },
  kcal: {
    fontSize: 16,
    color: '#64748B',
    marginBottom: 8,
  },
  desc: {
    fontSize: 15,
    color: '#64748B',
    marginBottom: 12,
    textAlign: 'center',
  },
  nutritionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 8,
    marginBottom: 16,
  },
  nutritionItem: {
    flex: 1,
    alignItems: 'center',
  },
  nutritionLabel: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 2,
  },
  nutritionValue: {
    fontSize: 15,
    color: '#0056d2',
    fontWeight: 'bold',
  },
  addBtn: {
    backgroundColor: '#0056d2',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 40,
    alignItems: 'center',
    marginTop: 8,
    width: '100%',
  },
  addBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
