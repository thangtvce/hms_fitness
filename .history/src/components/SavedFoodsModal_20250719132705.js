import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, TextInput } from 'react-native';
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
            {/* Edit bottom sheet overlay, only show if editIdx !== null */}
            {editIdx !== null && (
              <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '50%', backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, borderColor: '#E5E7EB', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 6, padding: 20, alignItems: 'center', justifyContent: 'flex-start' }}>
                <View style={{ width: '100%', maxWidth: 340 }}>
                  <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 6, textAlign: 'center', color: '#1E293B' }}>Edit Portion</Text>
                  <Text style={{ fontSize: 16, fontWeight: '500', marginBottom: 4, textAlign: 'center', color: '#0056d2' }}>{savedFoods[editIdx]?.name}</Text>
                  <Text style={{ fontSize: 14, color: '#64748B', marginBottom: 16, textAlign: 'center' }}>{savedFoods[editIdx]?.kcal} kcal</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 18 }}>
                    <View style={{ alignItems: 'center', marginRight: 18 }}>
                      <Text style={{ fontSize: 14, color: '#64748B', marginBottom: 4 }}>Serving size</Text>
                      <TextInput
                        style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 8, width: 70, textAlign: 'center', fontSize: 16, backgroundColor: '#F8FAFC' }}
                        keyboardType="numeric"
                        value={editServing}
                        onChangeText={setEditServing}
                        placeholder="1"
                        placeholderTextColor="#94A3B8"
                      />
                    </View>
                    <View style={{ alignItems: 'center' }}>
                      <Text style={{ fontSize: 14, color: '#64748B', marginBottom: 4 }}>Portion size</Text>
                      <TextInput
                        style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 8, width: 70, textAlign: 'center', fontSize: 16, backgroundColor: '#F8FAFC' }}
                        keyboardType="numeric"
                        value={editPortion}
                        onChangeText={setEditPortion}
                        placeholder="1"
                        placeholderTextColor="#94A3B8"
                      />
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 8 }}>
                    <TouchableOpacity
                      style={{ backgroundColor: '#0056d2', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 28, minWidth: 100, alignItems: 'center', marginRight: 10 }}
                      disabled={editLoading}
                      onPress={handleSave}
                    >
                      <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>{editLoading ? 'Saving...' : 'Save'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{ backgroundColor: '#F1F5F9', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 28, minWidth: 100, alignItems: 'center' }}
                      onPress={() => setEditIdx(null)}
                    >
                      <Text style={{ color: '#64748B', fontSize: 16, fontWeight: 'bold' }}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default SavedFoodsModal;
