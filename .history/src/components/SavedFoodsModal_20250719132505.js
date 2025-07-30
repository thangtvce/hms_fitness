import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { Feather } from '@expo/vector-icons';


const SavedFoodsModal = ({
  visible,
  savedFoods,
  onClose,
  onEdit, // không dùng nữa
  onDelete,
  onUpdateFood, // callback optional nếu muốn lưu ra ngoài
}) => {
  const [editIdx, setEditIdx] = useState(null);
  const [editServing, setEditServing] = useState('1');
  const [editPortion, setEditPortion] = useState('1');
  const [editLoading, setEditLoading] = useState(false);

  const handleEdit = (food, idx) => {
    setEditIdx(idx);
    setEditServing(food.servingSize ? String(food.servingSize) : '1');
    setEditPortion(food.portionSize ? String(food.portionSize) : '1');
  };

  const handleSave = async () => {
    if (editIdx === null) return;
    setEditLoading(true);
    try {
      let updatedFoods = [...savedFoods];
      const oldFood = updatedFoods[editIdx];
      const serving = Number(editServing) || 1;
      const portion = Number(editPortion) || 1;
      let baseKcal = oldFood._baseKcal || oldFood.baseKcal || oldFood.kcal || 0;
      if (!oldFood._baseKcal && oldFood.kcal) {
        baseKcal = oldFood.kcal / ((oldFood.servingSize || 1) * (oldFood.portionSize || 1));
      }
      const newKcal = Math.round(baseKcal * serving * portion);
      updatedFoods[editIdx] = {
        ...oldFood,
        servingSize: serving,
        portionSize: portion,
        kcal: newKcal,
        _baseKcal: baseKcal,
      };
      if (onUpdateFood) onUpdateFood(updatedFoods);
      setEditIdx(null);
    } catch (e) {
      setEditIdx(null);
    } finally {
      setEditLoading(false);
    }
  };

  return (
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
            {editIdx === null ? (
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
                      onPress={() => handleEdit(food, idx)}
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
            ) : (
              <View style={{ alignItems: 'center', marginTop: 32 }}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>Chỉnh sửa khẩu phần</Text>
                <Text style={{ fontSize: 16, fontWeight: '500', marginBottom: 8 }}>{savedFoods[editIdx]?.name}</Text>
                <Text style={{ fontSize: 14, color: '#64748B', marginBottom: 12 }}>{savedFoods[editIdx]?.kcal} kcal</Text>
                <View style={{ flexDirection: 'row', marginBottom: 10 }}>
                  <View style={{ marginRight: 12 }}>
                    <Text style={{ fontSize: 14, color: '#64748B' }}>Serving size</Text>
                    <TextInput
                      style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 6, width: 60, textAlign: 'center', marginTop: 4 }}
                      keyboardType="numeric"
                      value={editServing}
                      onChangeText={setEditServing}
                    />
                  </View>
                  <View>
                    <Text style={{ fontSize: 14, color: '#64748B' }}>Portion size</Text>
                    <TextInput
                      style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 6, width: 60, textAlign: 'center', marginTop: 4 }}
                      keyboardType="numeric"
                      value={editPortion}
                      onChangeText={setEditPortion}
                    />
                  </View>
                </View>
                <TouchableOpacity
                  style={{ backgroundColor: '#0056d2', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 32, marginTop: 8, minWidth: 120 }}
                  disabled={editLoading}
                  onPress={handleSave}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16, textAlign: 'center' }}>{editLoading ? 'Đang lưu...' : 'Lưu'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ marginTop: 8 }}
                  onPress={() => setEditIdx(null)}
                >
                  <Text style={{ color: '#64748B', fontSize: 15 }}>Hủy</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default SavedFoodsModal;
