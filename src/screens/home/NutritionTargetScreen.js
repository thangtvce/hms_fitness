import React,{ useState,useEffect } from "react";
import { useAuth } from "context/AuthContext";
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Dimensions,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import Slider from "@react-native-community/slider";
import Header from "../../components/Header";
import { showErrorFetchAPI,showErrorMessage,showSuccessMessage } from "utils/toastUtil";
import CommonSkeleton from "components/CommonSkeleton/CommonSkeleton";
const { width } = Dimensions.get('window');

const PRESET_TARGETS = [
  { name: "Cutting - Standard",type: "Cutting",calories: 1700,carbs: 150,protein: 130,fats: 40,description: "Balanced cutting macros for steady fat loss" },
  { name: "Cutting - High Protein",type: "Cutting",calories: 1600,carbs: 120,protein: 160,fats: 35,description: "Extra protein to preserve muscle while cutting" },
  { name: "Cutting - Low Carb",type: "Cutting",calories: 1500,carbs: 80,protein: 140,fats: 50,description: "Lower carbs for faster fat loss" },
  { name: "Cutting - Aggressive",type: "Cutting",calories: 1400,carbs: 100,protein: 150,fats: 30,description: "Aggressive cut for rapid results" },
  { name: "Cutting - Moderate",type: "Cutting",calories: 1800,carbs: 160,protein: 120,fats: 45,description: "Sustainable moderate cutting approach" },
  { name: "Cutting - Carb Cycling",type: "Cutting",calories: 1650,carbs: 130,protein: 140,fats: 40,description: "Flexible carb cycling for cutting" },
  { name: "Cutting - Mini Cut",type: "Cutting",calories: 1550,carbs: 110,protein: 145,fats: 35,description: "Short-term aggressive mini cut" },
  { name: "Cutting - Contest Prep",type: "Cutting",calories: 1300,carbs: 70,protein: 160,fats: 25,description: "Competition preparation macros" },

  // Bulking (10 options)
  { name: "Bulking - Standard",type: "Bulking",calories: 2800,carbs: 320,protein: 120,fats: 70,description: "Classic bulking macros for muscle gain" },
  { name: "Bulking - High Carb",type: "Bulking",calories: 3200,carbs: 400,protein: 110,fats: 60,description: "High carb approach for maximum energy" },
  { name: "Bulking - Clean",type: "Bulking",calories: 2600,carbs: 300,protein: 140,fats: 60,description: "Clean bulk with quality nutrition" },
  { name: "Bulking - High Fat",type: "Bulking",calories: 3000,carbs: 250,protein: 120,fats: 100,description: "Higher fat for calorie density" },
  { name: "Bulking - Lean Gains",type: "Bulking",calories: 2500,carbs: 280,protein: 130,fats: 65,description: "Slow, lean muscle building" },
  { name: "Bulking - Power",type: "Bulking",calories: 3500,carbs: 450,protein: 130,fats: 80,description: "High calorie for strength athletes" },
  { name: "Bulking - Moderate",type: "Bulking",calories: 2700,carbs: 310,protein: 125,fats: 70,description: "Balanced moderate bulking" },
  { name: "Bulking - High Protein",type: "Bulking",calories: 2900,carbs: 280,protein: 150,fats: 75,description: "Protein-focused muscle building" },
  { name: "Bulking - Dirty Bulk",type: "Bulking",calories: 3800,carbs: 500,protein: 120,fats: 90,description: "Maximum calories for rapid gains" },
  { name: "Bulking - Ectomorph",type: "Bulking",calories: 3300,carbs: 420,protein: 115,fats: 75,description: "High calories for hard gainers" },

  // Maintenance (6 options)
  { name: "Maintenance - Balanced",type: "Maintenance",calories: 2200,carbs: 220,protein: 110,fats: 55,description: "Perfectly balanced maintenance macros" },
  { name: "Maintenance - High Protein",type: "Maintenance",calories: 2100,carbs: 180,protein: 140,fats: 50,description: "Protein-focused maintenance" },
  { name: "Maintenance - Low Fat",type: "Maintenance",calories: 2300,carbs: 250,protein: 110,fats: 35,description: "Lower fat maintenance approach" },
  { name: "Maintenance - Active",type: "Maintenance",calories: 2400,carbs: 240,protein: 120,fats: 60,description: "For active individuals" },
  { name: "Maintenance - Sedentary",type: "Maintenance",calories: 1900,carbs: 190,protein: 100,fats: 50,description: "Lower activity maintenance" },
  { name: "Maintenance - Flexible",type: "Maintenance",calories: 2250,carbs: 200,protein: 115,fats: 65,description: "Flexible maintenance approach" },

  // Keto (5 options)
  { name: "Keto - Standard",type: "Keto",calories: 1500,carbs: 30,protein: 100,fats: 120,description: "Classic ketogenic macros" },
  { name: "Keto - High Protein",type: "Keto",calories: 1550,carbs: 30,protein: 130,fats: 100,description: "Protein-enhanced keto" },
  { name: "Keto - Therapeutic",type: "Keto",calories: 1400,carbs: 20,protein: 90,fats: 125,description: "Medical-grade keto ratios" },
  { name: "Keto - Maintenance",type: "Keto",calories: 1800,carbs: 35,protein: 110,fats: 140,description: "Keto for weight maintenance" },
  { name: "Keto - Cyclical",type: "Keto",calories: 1600,carbs: 40,protein: 120,fats: 110,description: "Cyclical keto approach" },

  // Low-Carb (4 options)
  { name: "Low-Carb - Moderate",type: "Low-Carb",calories: 1600,carbs: 60,protein: 120,fats: 80,description: "Moderate low-carb approach" },
  { name: "Low-Carb - High Fat",type: "Low-Carb",calories: 1700,carbs: 50,protein: 100,fats: 100,description: "High fat, low carb" },
  { name: "Low-Carb - Athlete",type: "Low-Carb",calories: 2000,carbs: 80,protein: 140,fats: 90,description: "Low carb for athletes" },
  { name: "Low-Carb - Flexible",type: "Low-Carb",calories: 1750,carbs: 70,protein: 130,fats: 85,description: "Flexible low-carb lifestyle" },

  // High-Protein (4 options)
  { name: "High-Protein - Lean",type: "High-Protein",calories: 1800,carbs: 180,protein: 180,fats: 40,description: "Maximum protein, minimal fat" },
  { name: "High-Protein - Moderate",type: "High-Protein",calories: 1900,carbs: 160,protein: 170,fats: 60,description: "High protein with moderate fats" },
  { name: "High-Protein - Bulking",type: "High-Protein",calories: 2400,carbs: 200,protein: 200,fats: 70,description: "High protein muscle building" },
  { name: "High-Protein - Recovery",type: "High-Protein",calories: 2100,carbs: 180,protein: 190,fats: 55,description: "Enhanced recovery focus" },

  // Athlete (4 options)
  { name: "Athlete - Endurance",type: "Athlete",calories: 2500,carbs: 400,protein: 120,fats: 40,description: "Endurance sports nutrition" },
  { name: "Athlete - Strength",type: "Athlete",calories: 2700,carbs: 300,protein: 160,fats: 60,description: "Strength training focus" },
  { name: "Athlete - Mixed",type: "Athlete",calories: 2600,carbs: 350,protein: 140,fats: 50,description: "Mixed training approach" },
  { name: "Athlete - Competition",type: "Athlete",calories: 2800,carbs: 380,protein: 150,fats: 55,description: "Competition preparation" },

  // Specialized Diets (9 options)
  { name: "Vegan - Balanced",type: "Vegan",calories: 2200,carbs: 250,protein: 100,fats: 60,description: "Balanced plant-based nutrition" },
  { name: "Vegan - High Protein",type: "Vegan",calories: 2100,carbs: 200,protein: 130,fats: 60,description: "Protein-focused vegan diet" },
  { name: "Vegetarian - Standard",type: "Vegetarian",calories: 2300,carbs: 230,protein: 110,fats: 55,description: "Standard vegetarian macros" },
  { name: "Paleo - Standard",type: "Paleo",calories: 2500,carbs: 150,protein: 120,fats: 80,description: "Traditional paleo approach" },
  { name: "Mediterranean",type: "Mediterranean",calories: 2400,carbs: 200,protein: 100,fats: 80,description: "Heart-healthy Mediterranean" },
  { name: "Zone Diet",type: "Zone",calories: 2100,carbs: 210,protein: 140,fats: 47,description: "40-30-30 zone ratios" },
  { name: "Intermittent Fasting 16:8",type: "IF",calories: 2000,carbs: 200,protein: 120,fats: 60,description: "16:8 fasting window" },
  { name: "Intermittent Fasting 20:4",type: "IF",calories: 1800,carbs: 180,protein: 120,fats: 70,description: "20:4 warrior diet" },
  { name: "Body Recomposition",type: "Recomp",calories: 1900,carbs: 180,protein: 160,fats: 50,description: "Simultaneous fat loss & muscle gain" },
];

const FILTERS = [
  "All",
  ...Array.from(new Set(PRESET_TARGETS.map((p) => p.type)))
];

const NutritionTargetScreen = () => {
  const { user } = useAuth();
  const navigation = useNavigation();
  const [target,setTarget] = useState({ calories: 0,carbs: 0,protein: 0,fats: 0 });
  const [selectedPreset,setSelectedPreset] = useState(null);
  const [filter,setFilter] = useState("All");
  const [lastSaved,setLastSaved] = useState(null);
  const [loading,setLoading] = useState(true);

  // Helper to get userId-based key
  const getUserId = () => {
    if (user && typeof user === 'object') {
      return user.id || user._id || user.userId || '';
    }
    return '';
  };
  const getStorageKey = () => {
    const userId = getUserId();
    return userId ? `nutritionTarget_${userId}` : 'nutritionTarget';
  };
  const getTodayKey = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2,'0');
    const dd = String(today.getDate()).padStart(2,'0');
    const userId = getUserId();
    return userId ? `nutritionTarget_${userId}_${yyyy}-${mm}-${dd}` : `nutritionTarget_${yyyy}-${mm}-${dd}`;
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const saved = await AsyncStorage.getItem(getStorageKey());
        if (saved) {
          const parsed = JSON.parse(saved);
          setTarget(parsed);
          setLastSaved(parsed);
        } else {
        }
      } catch (e) {
        showErrorFetchAPI(e);
      } finally {
        setLoading(false);
      }
    })();
  },[user]);

  const handleReset = async () => {
    const saved = await AsyncStorage.getItem(getStorageKey());
    if (saved) {
      setTarget(JSON.parse(saved));
      setSelectedPreset(null);
    }
  };

  const handlePreset = (preset,idx) => {
    setTarget({
      calories: preset.calories,
      carbs: preset.carbs,
      protein: preset.protein,
      fats: preset.fats
    });
    setSelectedPreset(idx);
  };


  const handleSave = async () => {
    if (!target.calories || !target.carbs || !target.protein || !target.fats) {
      showErrorMessage("Please set all nutrition targets before saving");
      return;
    }

    setLoading(true);
    try {
      await AsyncStorage.setItem(getStorageKey(),JSON.stringify(target));
      const todayKey = getTodayKey();
      await AsyncStorage.setItem(todayKey,JSON.stringify(target));

      setLastSaved(target);
      showSuccessMessage("Your nutrition targets have been saved successfully!");
      navigation.navigate("HomeScreen");
    } catch (e) {
      showErrorFetchAPI(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredPresets = filter === "All"
    ? PRESET_TARGETS
    : PRESET_TARGETS.filter(p => p.type === filter);

  const MacroSlider = ({ label,value,max,color,unit = "",onChange }) => (
    <View style={styles.sliderContainer}>
      <View style={styles.sliderHeader}>
        <Text style={styles.sliderLabel}>{label}</Text>
        <View style={[styles.valueChip,{ backgroundColor: color + '20' }]}>
          <Text style={[styles.valueText,{ color: color }]}>
            {Math.round(value)}{unit}
          </Text>
        </View>
      </View>
      <Slider
        style={styles.slider}
        minimumValue={0}
        maximumValue={max}
        step={label === "Calories" ? 10 : 1}
        minimumTrackTintColor={color}
        maximumTrackTintColor="#E5E7EB"
        thumbTintColor={color}
        value={value}
        onValueChange={onChange}
      />
    </View>
  );


  // Macro selection state
  const macroOptions = [
    { key: 'calories',label: 'Calories',color: '#FF6B6B',max: 5000,unit: '' },
    { key: 'carbs',label: 'Carbs',color: '#4ECDC4',max: 500,unit: 'g' },
    { key: 'protein',label: 'Protein',color: '#45B7D1',max: 300,unit: 'g' },
    { key: 'fats',label: 'Fats',color: '#F9CA24',max: 200,unit: 'g' },
  ];
  const [selectedMacro,setSelectedMacro] = useState('calories');

  if (loading) {
    return <CommonSkeleton />
  }

  return (
    <View style={styles.container}>
      <Header title="Targets" onBack={navigation.goBack} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Current Target Summary */}
        {lastSaved && (
          <View style={styles.currentTarget}>
            <Text style={styles.currentTargetTitle}>Current Target</Text>
            <View style={styles.macroSummary}>
              <View style={styles.macroItem}>
                <Text style={[styles.macroValue,{ color: '#FF6B6B' }]}>{lastSaved.calories}</Text>
                <Text style={styles.macroLabel}>Calories</Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={[styles.macroValue,{ color: '#4ECDC4' }]}>{lastSaved.carbs}g</Text>
                <Text style={styles.macroLabel}>Carbs</Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={[styles.macroValue,{ color: '#45B7D1' }]}>{lastSaved.protein}g</Text>
                <Text style={styles.macroLabel}>Protein</Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={[styles.macroValue,{ color: '#F9CA24' }]}>{lastSaved.fats}g</Text>
                <Text style={styles.macroLabel}>Fats</Text>
              </View>
            </View>
          </View>
        )}

        {/* Macro Select Row */}
        <View style={styles.macroSelectRow}>
          {macroOptions.map((macro) => (
            <TouchableOpacity
              key={macro.key}
              style={[styles.macroSelectButton,selectedMacro === macro.key && { backgroundColor: macro.color + '22' }]}
              onPress={() => setSelectedMacro(macro.key)}
            >
              <Text style={[styles.macroSelectLabel,selectedMacro === macro.key && { color: macro.color }]}>{macro.label}</Text>
              <Text style={[styles.macroSelectValue,selectedMacro === macro.key && { color: macro.color }]}>
                {target[macro.key]}{macro.unit}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Macro Slider for selected macro only */}
        <View style={styles.slidersSection}>
          <Text style={styles.sectionTitle}>Adjust {macroOptions.find(m => m.key === selectedMacro).label}</Text>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={macroOptions.find(m => m.key === selectedMacro).max}
            step={selectedMacro === 'calories' ? 10 : 1}
            minimumTrackTintColor={macroOptions.find(m => m.key === selectedMacro).color}
            maximumTrackTintColor="#E5E7EB"
            thumbTintColor={macroOptions.find(m => m.key === selectedMacro).color}
            value={target[selectedMacro]}
            onValueChange={(v) => { setTarget({ ...target,[selectedMacro]: v }); setSelectedPreset(null); }}
          />
          <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
            <Text style={styles.resetButtonText}>↻ Reset to Saved</Text>
          </TouchableOpacity>
        </View>

        {/* Filter Section */}
        <View style={styles.filterSection}>
          <Text style={styles.sectionTitle}>Quick Presets</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScrollContent}
          >
            {FILTERS.map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.filterChip,filter === f && styles.filterChipActive]}
                onPress={() => setFilter(f)}
              >
                <Text style={[
                  styles.filterChipText,
                  filter === f && styles.filterChipTextActive
                ]}>
                  {f}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Presets List */}
        <View style={styles.presetsSection}>
          <Text style={styles.presetCount}>
            {filteredPresets.length} preset{filteredPresets.length !== 1 ? 's' : ''} available
          </Text>

          {filteredPresets.map((preset,idx) => (
            <TouchableOpacity
              key={`${preset.name}-${idx}`}
              style={[
                styles.presetCard,
                selectedPreset === idx && styles.presetCardActive,
              ]}
              onPress={() => handlePreset(preset,idx)}
            >
              <View style={styles.presetHeader}>
                <Text style={styles.presetName}>{preset.name}</Text>
                <View style={[styles.typeTag,{ backgroundColor: getTypeColor(preset.type) }]}>
                  <Text style={styles.typeTagText}>{preset.type}</Text>
                </View>
              </View>

              <Text style={styles.presetDescription}>{preset.description}</Text>

              <View style={styles.presetMacros}>
                <View style={styles.presetMacroItem}>
                  <Text style={styles.presetMacroValue}>{preset.calories}</Text>
                  <Text style={styles.presetMacroLabel}>cal</Text>
                </View>
                <View style={styles.presetMacroItem}>
                  <Text style={styles.presetMacroValue}>{preset.carbs}g</Text>
                  <Text style={styles.presetMacroLabel}>carbs</Text>
                </View>
                <View style={styles.presetMacroItem}>
                  <Text style={styles.presetMacroValue}>{preset.protein}g</Text>
                  <Text style={styles.presetMacroLabel}>protein</Text>
                </View>
                <View style={styles.presetMacroItem}>
                  <Text style={styles.presetMacroValue}>{preset.fats}g</Text>
                  <Text style={styles.presetMacroLabel}>fats</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Save Button */}
      <View style={styles.saveButtonContainer}>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save Nutrition Target</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const getTypeColor = (type) => {
  const colors = {
    'Cutting': '#FF6B6B20',
    'Bulking': '#4ECDC420',
    'Maintenance': '#45B7D120',
    'Keto': '#F9CA2420',
    'Low-Carb': '#FF9F4320',
    'High-Protein': '#6C5CE720',
    'Athlete': '#26DE8120',
    'Vegan': '#2ECC7120',
    'Vegetarian': '#A8E6CF20',
    'Paleo': '#D4A57420',
    'Mediterranean': '#87CEEB20',
    'Zone': '#DDA0DD20',
    'IF': '#FFB6C120',
    'Recomp': '#98D8C820',
  };
  return colors[type] || '#E5E7EB20';
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    marginTop: 120,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
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
  currentTarget: {
    margin: 20,
    padding: 20,
    backgroundColor: '#F8FAFC',
    borderRadius: 0,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  currentTargetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 12,
    textAlign: 'center'
  },
  macroSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  macroItem: {
    alignItems: 'center',
  },
  macroValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  macroLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginTop: 2,
  },
  slidersSection: {
    margin: 20,
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0,height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
  },
  slider: {
    width: '100%',
    height: 32,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sliderLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  valueChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  valueText: {
    fontSize: 12,
    fontWeight: '700',
  },
  resetButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  resetButtonText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 13,
  },
  filterSection: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  filterScrollContent: {
    paddingRight: 20,
  },
  filterChip: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterChipActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  filterChipText: {
    color: '#6B7280',
    fontWeight: '600',
    fontSize: 14,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  presetsSection: {
    marginHorizontal: 20,
  },
  presetCount: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
    fontWeight: '500',
  },
  presetCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 0,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0,height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  presetCardActive: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
    shadowOpacity: 0.1,
    elevation: 2,
  },
  presetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  presetName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    flex: 1,
  },
  typeTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  typeTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
  },
  presetDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
    lineHeight: 20,
  },
  presetMacros: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  presetMacroItem: {
    alignItems: 'center',
  },
  presetMacroValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
  presetMacroLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  saveButtonContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  saveButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0,height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  macroSelectRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 12,
    marginTop: 8,
    gap: 8,
  },
  macroSelectButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 0,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  macroSelectLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  macroSelectValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },

});

export default NutritionTargetScreen;