import React,{ useState,useEffect,useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Platform,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { bodyMeasurementService } from 'services/apiBodyMeasurementService';
import { useAuth } from 'context/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import DynamicStatusBar from 'screens/statusBar/DynamicStatusBar';
import { theme } from 'theme/color';
import { LinearGradient } from 'expo-linear-gradient';
import FloatingMenuButton from 'components/FloatingMenuButton';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width,height } = Dimensions.get("window");

// Warning thresholds for different measurements
const WARNING_THRESHOLDS = {
  weight: { moderate: 2,severe: 5 }, // kg per week
  bodyFatPercentage: { moderate: 2,severe: 4 }, // % per week
  chestCm: { moderate: 3,severe: 6 }, // cm per week
  waistCm: { moderate: 3,severe: 6 }, // cm per week
  hipCm: { moderate: 3,severe: 6 }, // cm per week
  bicepCm: { moderate: 2,severe: 4 }, // cm per week
  thighCm: { moderate: 3,severe: 6 }, // cm per week
  neckCm: { moderate: 2,severe: 4 }, // cm per week
};

export default function BodyMeasurementsScreen({ navigation }) {
  const { user,authToken } = useAuth();
  const [measurements,setMeasurements] = useState([]);
  const [loading,setLoading] = useState(true);
  const [refreshing,setRefreshing] = useState(false);
  const [warningModalVisible,setWarningModalVisible] = useState(false);
  const [selectedWarnings,setSelectedWarnings] = useState([]);

  const fetchMeasurements = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      if (user && authToken) {
        const response = await bodyMeasurementService.getMyMeasurements({ pageNumber: 1,pageSize: 50 });
        if (response.statusCode === 200 && response.data) {
          const sortedMeasurements = (response.data.records || []).sort((a,b) =>
            new Date(b.measurementDate) - new Date(a.measurementDate)
          );
          setMeasurements(sortedMeasurements);
        }
      } else {
        Alert.alert('Error','Please log in.');
        navigation.replace('Login');
      }
    } catch (error) {
      Alert.alert('Error','Failed to load body measurements.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMeasurements();
  },[user,authToken,navigation]);

  useFocusEffect(
    useCallback(() => {
      fetchMeasurements();
    },[])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchMeasurements(false);
  };

  const handleAddMeasurement = () => {
    navigation.navigate('AddBodyMeasurement');
  };

  const handleEditMeasurement = (item) => {
    navigation.navigate('EditBodyMeasurement',{ measurement: item });
  };

  const handleDeleteMeasurement = (measurementId) => {
    Alert.alert(
      'Delete Measurement',
      'Are you sure you want to delete this measurement?',
      [
        { text: 'Cancel',style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await bodyMeasurementService.deleteMeasurement(measurementId);
              if (response.statusCode === 200) {
                fetchMeasurements();
                Alert.alert('Success','Measurement deleted successfully.');
              }
            } catch (error) {
              Alert.alert('Error','Failed to delete measurement.');
            }
          },
        },
      ]
    );
  };

  const getDaysBetweenDates = (date1,date2) => {
    const diffTime = Math.abs(new Date(date1) - new Date(date2));
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getWarningLevel = (current,previous,field,daysBetween) => {
    if (!previous || current[field] === null || previous[field] === null || daysBetween === 0) {
      return null;
    }

    const change = Math.abs(current[field] - previous[field]);
    const weeklyChange = (change / daysBetween) * 7; // Convert to weekly change
    const thresholds = WARNING_THRESHOLDS[field];

    if (!thresholds) return null;

    if (weeklyChange >= thresholds.severe) {
      return 'severe';
    } else if (weeklyChange >= thresholds.moderate) {
      return 'moderate';
    }
    return null;
  };

  const getMeasurementChange = (current,previous,field) => {
    if (!previous || current[field] === null || previous[field] === null) return null;

    const change = current[field] - previous[field];
    return {
      value: Math.abs(change).toFixed(1),
      isIncrease: change > 0,
      isDecrease: change < 0,
    };
  };

  const getCardWarnings = (item,previousItem) => {
    if (!previousItem) return [];

    const daysBetween = getDaysBetweenDates(item.measurementDate,previousItem.measurementDate);
    const warnings = [];

    Object.keys(WARNING_THRESHOLDS).forEach(field => {
      const warningLevel = getWarningLevel(item,previousItem,field,daysBetween);
      if (warningLevel) {
        const change = getMeasurementChange(item,previousItem,field);
        const fieldName = field === 'bodyFatPercentage' ? 'Body Fat' :
          field.replace('Cm','').replace(/([A-Z])/g,' $1').trim();

        warnings.push({
          field: fieldName,
          level: warningLevel,
          change: change,
          weeklyRate: ((Math.abs(item[field] - previousItem[field]) / daysBetween) * 7).toFixed(1),
          unit: field === 'weight' ? 'kg' : field === 'bodyFatPercentage' ? '%' : 'cm'
        });
      }
    });

    return warnings;
  };

  const getCardWarningLevel = (warnings) => {
    if (warnings.some(w => w.level === 'severe')) return 'severe';
    if (warnings.some(w => w.level === 'moderate')) return 'moderate';
    return null;
  };

  const showWarningModal = (warnings) => {
    setSelectedWarnings(warnings);
    setWarningModalVisible(true);
  };

  const renderWarningModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={warningModalVisible}
      onRequestClose={() => setWarningModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Ionicons name="warning" size={24} color="#F59E0B" />
            <Text style={styles.modalTitle}>Measurement Warnings</Text>
            <TouchableOpacity
              onPress={() => setWarningModalVisible(false)}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <Text style={styles.modalDescription}>
              The following measurements have changed significantly in a short period:
            </Text>

            {selectedWarnings.map((warning,index) => (
              <View key={index} style={[
                styles.warningItem,
                warning.level === 'severe' ? styles.severeWarningItem : styles.moderateWarningItem
              ]}>
                <View style={styles.warningHeader}>
                  <Text style={styles.warningFieldName}>{warning.field}</Text>
                  <View style={[
                    styles.warningBadge,
                    warning.level === 'severe' ? styles.severeBadge : styles.moderateBadge
                  ]}>
                    <Text style={[
                      styles.warningBadgeText,
                      warning.level === 'severe' ? styles.severeBadgeText : styles.moderateBadgeText
                    ]}>
                      {warning.level === 'severe' ? 'HIGH ALERT' : 'MODERATE'}
                    </Text>
                  </View>
                </View>

                <Text style={styles.warningDetails}>
                  Change: {warning.change?.isIncrease ? '+' : '-'}{warning.change?.value} {warning.unit}
                </Text>
                <Text style={styles.warningDetails}>
                  Weekly rate: ~{warning.weeklyRate} {warning.unit}/week
                </Text>

                <Text style={styles.warningAdvice}>
                  {warning.level === 'severe'
                    ? 'Consider consulting with a healthcare professional about this rapid change.'
                    : 'Monitor this measurement closely and consider adjusting your routine if needed.'
                  }
                </Text>
              </View>
            ))}

            <View style={styles.generalAdvice}>
              <Text style={styles.generalAdviceTitle}>General Recommendations:</Text>
              <Text style={styles.generalAdviceText}>
                • Rapid changes in body measurements can indicate various factors{'\n'}
                • Consider your recent diet, exercise, and lifestyle changes{'\n'}
                • Consult a healthcare professional for significant concerns{'\n'}
                • Maintain consistent measurement conditions for accuracy
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const renderItem = ({ item,index }) => {
    const previousItem = measurements[index + 1];
    const date = new Date(item.measurementDate);
    const formattedDate = date.toLocaleDateString('en-US',{
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    const weightChange = getMeasurementChange(item,previousItem,'weight');
    const warnings = getCardWarnings(item,previousItem);
    const cardWarningLevel = getCardWarningLevel(warnings);

    return (
      <TouchableOpacity
        style={[
          styles.card,
          cardWarningLevel === 'severe' && styles.severeWarningCard,
          cardWarningLevel === 'moderate' && styles.moderateWarningCard,
        ]}
        onPress={() => handleEditMeasurement(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.dateContainer}>
            <Ionicons name="calendar-outline" size={18} color="#64748B" />
            <Text style={styles.dateText}>{formattedDate}</Text>
          </View>
          <View style={styles.actionButtons}>
            {warnings.length > 0 && (
              <TouchableOpacity
                style={[
                  styles.warningButton,
                  cardWarningLevel === 'severe' ? styles.severeWarningButton : styles.moderateWarningButton
                ]}
                onPress={() => showWarningModal(warnings)}
              >
                <Ionicons
                  name="warning"
                  size={18}
                  color={cardWarningLevel === 'severe' ? '#DC2626' : '#F59E0B'}
                />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => handleEditMeasurement(item)}
            >
              <Ionicons name="pencil-outline" size={20} color="#2563EB" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeleteMeasurement(item.measurementId)}
            >
              <Ionicons name="trash-outline" size={20} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.mainMeasurement}>
          <View style={styles.weightContainer}>
            <Text style={styles.weightLabel}>Weight</Text>
            <Text style={styles.weightValue}>{item.weight} kg</Text>

            {weightChange && (
              <View
                style={[
                  styles.changeContainer,
                  weightChange.isIncrease ? styles.increaseContainer : weightChange.isDecrease ? styles.decreaseContainer : null,
                ]}
              >
                <Ionicons
                  name={weightChange.isIncrease ? 'arrow-up' : 'arrow-down'}
                  size={14}
                  color={weightChange.isIncrease ? '#EF4444' : '#10B981'}
                />
                <Text
                  style={[
                    styles.changeText,
                    weightChange.isIncrease ? styles.increaseText : styles.decreaseText,
                  ]}
                >
                  {weightChange.value} kg
                </Text>
              </View>
            )}
          </View>

          {item.bodyFatPercentage !== null && (
            <View style={styles.bodyFatContainer}>
              <Text style={styles.bodyFatLabel}>Body Fat</Text>
              <Text style={styles.bodyFatValue}>{item.bodyFatPercentage}%</Text>
            </View>
          )}
        </View>

        <View style={styles.divider} />

        <View style={styles.measurementsGrid}>
          {item.chestCm !== null && (
            <View style={styles.measurementItem}>
              <Ionicons name="body-outline" size={18} color="#64748B" />
              <Text style={styles.measurementLabel}>Chest</Text>
              <Text style={styles.measurementValue}>{item.chestCm} cm</Text>
            </View>
          )}

          {item.waistCm !== null && (
            <View style={styles.measurementItem}>
              <Ionicons name="resize-outline" size={18} color="#64748B" />
              <Text style={styles.measurementLabel}>Waist</Text>
              <Text style={styles.measurementValue}>{item.waistCm} cm</Text>
            </View>
          )}

          {item.hipCm !== null && (
            <View style={styles.measurementItem}>
              <Ionicons name="ellipse-outline" size={18} color="#64748B" />
              <Text style={styles.measurementLabel}>Hip</Text>
              <Text style={styles.measurementValue}>{item.hipCm} cm</Text>
            </View>
          )}

          {item.bicepCm !== null && (
            <View style={styles.measurementItem}>
              <Ionicons name="fitness-outline" size={18} color="#64748B" />
              <Text style={styles.measurementLabel}>Bicep</Text>
              <Text style={styles.measurementValue}>{item.bicepCm} cm</Text>
            </View>
          )}

          {item.thighCm !== null && (
            <View style={styles.measurementItem}>
              <Ionicons name="barbell-outline" size={18} color="#64748B" />
              <Text style={styles.measurementLabel}>Thigh</Text>
              <Text style={styles.measurementValue}>{item.thighCm} cm</Text>
            </View>
          )}

          {item.neckCm !== null && (
            <View style={styles.measurementItem}>
              <Ionicons name="shirt-outline" size={18} color="#64748B" />
              <Text style={styles.measurementLabel}>Neck</Text>
              <Text style={styles.measurementValue}>{item.neckCm} cm</Text>
            </View>
          )}
        </View>

        {item.notes && (
          <View style={styles.notesContainer}>
            <Ionicons name="document-text-outline" size={18} color="#64748B" />
            <Text style={styles.notesText}>{item.notes}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <DynamicStatusBar backgroundColor={theme.primaryColor} />
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Loading measurements...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <DynamicStatusBar backgroundColor={theme.primaryColor} />
      <View style={styles.container}>
        <LinearGradient colors={["#4F46E5","#6366F1","#818CF8"]} style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Body Measurements</Text>
            <View style={styles.headerRight} />
          </View>
        </LinearGradient>

        {measurements.length > 0 ? (
          <FlatList
            data={measurements}
            renderItem={renderItem}
            keyExtractor={(item) => item.measurementId.toString()}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#2563EB']}
                tintColor="#2563EB"
              />
            }
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="body-outline" size={64} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No Measurements</Text>
            <Text style={styles.emptyText}>
              Start tracking your body measurements to monitor your fitness progress.
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={handleAddMeasurement}
            >
              <Text style={styles.emptyButtonText}>Add First Measurement</Text>
            </TouchableOpacity>
          </View>
        )}

        {measurements.length > 0 && (
          <TouchableOpacity
            style={styles.fab}
            onPress={handleAddMeasurement}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        )}

        {renderWarningModal()}
      </View>
      <FloatingMenuButton
        initialPosition={{ x: width - 70,y: height - 180 }}
        autoHide={true}
        navigation={navigation}
        autoHideDelay={4000}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#2563EB',
    fontWeight: '500',
  },
  header: {
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    color: "#fff"
  },
  headerTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
    color: "#FFFFFF",
    textAlign: "center",
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0,height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  moderateWarningCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    backgroundColor: '#FFFBEB',
  },
  severeWarningCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
    backgroundColor: '#FEF2F2',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 14,
    color: '#64748B',
    marginLeft: 6,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  warningButton: {
    padding: 6,
    borderRadius: 6,
    marginRight: 8,
  },
  moderateWarningButton: {
    backgroundColor: '#FEF3C7',
  },
  severeWarningButton: {
    backgroundColor: '#FECACA',
  },
  editButton: {
    padding: 4,
    marginRight: 8,
  },
  deleteButton: {
    padding: 4,
  },
  mainMeasurement: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  weightContainer: {
    flex: 1,
  },
  weightLabel: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 4,
  },
  weightValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
  },
  bodyFatContainer: {
    marginLeft: 24,
  },
  bodyFatLabel: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 4,
  },
  bodyFatValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  increaseContainer: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  decreaseContainer: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  changeText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 2,
  },
  increaseText: {
    color: '#EF4444',
  },
  decreaseText: {
    color: '#10B981',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginBottom: 16,
  },
  measurementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  measurementItem: {
    width: '33.33%',
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  measurementLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  measurementValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  notesContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F1F5F9',
    padding: 12,
    borderRadius: 8,
    marginTop: 4,
  },
  notesText: {
    fontSize: 14,
    color: '#475569',
    marginLeft: 8,
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
    maxWidth: 300,
  },
  emptyButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#2563EB',
        shadowOffset: { width: 0,height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxHeight: '80%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0,height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginLeft: 12,
    flex: 1,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  modalDescription: {
    fontSize: 16,
    color: '#64748B',
    marginBottom: 20,
    lineHeight: 24,
  },
  warningItem: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  moderateWarningItem: {
    backgroundColor: '#FFFBEB',
    borderColor: '#F59E0B',
  },
  severeWarningItem: {
    backgroundColor: '#FEF2F2',
    borderColor: '#DC2626',
  },
  warningHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  warningFieldName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  warningBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  moderateBadge: {
    backgroundColor: '#F59E0B',
  },
  severeBadge: {
    backgroundColor: '#DC2626',
  },
  warningBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  moderateBadgeText: {
    color: '#FFFFFF',
  },
  severeBadgeText: {
    color: '#FFFFFF',
  },
  warningDetails: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 4,
  },
  warningAdvice: {
    fontSize: 14,
    color: '#374151',
    fontStyle: 'italic',
    marginTop: 8,
    lineHeight: 20,
  },
  generalAdvice: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  generalAdviceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  generalAdviceText: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
  },
});
