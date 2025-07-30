import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { Feather } from '@expo/vector-icons';

const SavedFoodsModal = ({
  visible,
  savedFoods,
  onClose,
  onEdit,
  onDelete,
}) => (
  <Modal
    visible={visible}
    transparent
    animationType="fade"
    onRequestClose={onClose}
  >
    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }}>
      <View style={{ flex: 1, backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: 48, overflow: 'hidden' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 }}>
          <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#1E293B' }}>Saved Foods</Text>
          <TouchableOpacity onPress={onClose} style={{ padding: 8, marginRight: -8, marginTop: -8 }}>
            <Feather name="x" size={28} color="#64748B" />
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1, paddingHorizontal: 20, paddingBottom: 20 }}>
          <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
            {savedFoods.length === 0 && (
              <Text style={{ color: '#64748B', marginBottom: 12 }}>No foods saved.</Text>
            )}
            {savedFoods.map((food, idx) => (
              <View key={food.foodId ? `saved-${food.foodId}` : `${food.name}-${idx}`}
                style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '500', color: '#1E293B' }}>{food.name}</Text>
                  <Text style={{ fontSize: 14, color: '#64748B' }}>{food.kcal} kcal</Text>
                </View>
                <TouchableOpacity
                  style={{ marginRight: 8, padding: 6, borderRadius: 8, backgroundColor: '#F1F5F9' }}
                  onPress={() => onEdit(food, idx)}
                >
                  <Feather name="edit" size={18} color="#0056d2" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ padding: 6, borderRadius: 8, backgroundColor: '#FEE2E2' }}
                  onPress={() => onDelete(idx)}
                >
                  <Feather name="trash-2" size={18} color="#DC2626" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </View>
  </Modal>
);

export default SavedFoodsModal;
