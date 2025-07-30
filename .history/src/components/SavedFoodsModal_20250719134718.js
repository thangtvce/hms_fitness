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
      if (onUpdateFood) {
        onUpdateFood(updatedFoods);
      } else {
        // Update local state if no callback provided
        setSavedFoods(updatedFoods);
      }
      // Log with visible marker for debugging
      setTimeout(() => {
        console.log('=== Updated foods after edit ===', updatedFoods);
      }, 0);
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
                    <Text style={{ fontSize: 14, color: '#64748B' }}>
                      {food.kcal} kcal
                      {food.portionSize > 1 && (
                        <>  | Portion Size: {food.portionSize}</>
                      )}
                    </Text>
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
              <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, marginBottom: 12, backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, borderColor: '#E5E7EB', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 6, padding: 16, alignItems: 'center', justifyContent: 'flex-start' }}>
                <View style={{ width: '100%', maxWidth: 340, position: 'relative' }}>
                  {/* Check icon at top right */}
                  <TouchableOpacity
                    style={{ position: 'absolute', top: -5, right: -15, zIndex: 2, padding: 6 }}
                    onPress={handleSave}
                    disabled={editLoading}
                  >
                    <Feather name="check" size={26} color="#0056d2" />
                  </TouchableOpacity>
                  <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 4, textAlign: 'center', color: '#1E293B' }}>Edit Portion Size</Text>
                  <Text style={{ fontSize: 16, fontWeight: '400', marginBottom: 8, textAlign: 'center', color: '#1E293B' }}>{savedFoods[editIdx]?.name?.toLowerCase?.()}</Text>
                  {/* Portion size row only */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 18, marginTop: 12 }}>
                    <Text style={{ fontSize: 14, color: '#64748B', width: 100 }}>Portion size</Text>
                    <TouchableOpacity
                      style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginRight: 6 }}
                      onPress={() => setEditPortion(prev => String(Math.max(1, (parseInt(prev) || 1) - 1)))}
                    >
                      <Feather name="minus" size={18} color="#64748B" />
                    </TouchableOpacity>
                    <Text style={{ width: 40, textAlign: 'center', fontSize: 18, color: '#1E293B', fontWeight: 'bold' }}>{editPortion}</Text>
                    <TouchableOpacity
                      style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginLeft: 6 }}
                      onPress={() => setEditPortion(prev => String((parseInt(prev) || 1) + 1))}
                    >
                      <Feather name="plus" size={18} color="#0056d2" />
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
