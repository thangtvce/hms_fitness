import React,{ useState,useEffect,useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Platform,
  ScrollView,
  Dimensions,
} from 'react-native';
import Loading from 'components/Loading';
import { showErrorFetchAPI,showErrorMessage,showSuccessMessage } from 'utils/toastUtil';
import { Ionicons } from '@expo/vector-icons';
import { weightHistoryService } from 'services/apiWeightHistoryService';
import { AuthContext,useAuth } from 'context/AuthContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LineChart } from 'react-native-chart-kit';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemeContext } from 'components/theme/ThemeContext';
import Header from 'components/Header';
import DynamicStatusBar from 'screens/statusBar/DynamicStatusBar';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import CommonSkeleton from 'components/CommonSkeleton/CommonSkeleton';
import { handleDailyCheckin } from 'utils/checkin';


const { width } = Dimensions.get('window');

export default function AddWeightHistoryScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const { colors } = useContext(ThemeContext);
  const [formData,setFormData] = useState({
    weight: '',
    recordedAt: new Date()
  });
  const [showDatePicker,setShowDatePicker] = useState(false);
  const [recentWeights,setRecentWeights] = useState([]);
  const [loading,setLoading] = useState(false);
  const [weightTrend,setWeightTrend] = useState(null);
  const [activeField,setActiveField] = useState(null);

  useEffect(() => {
    fetchRecentWeights();
  },[]);

  const fetchRecentWeights = async () => {
    try {
      setLoading(true);
      const response = await weightHistoryService.getMyWeightHistory({ pageNumber: 1,pageSize: 7 });
      if (response.statusCode === 200 && response.data && response.data.records) {
        const sortedWeights = response.data.records
          .sort((a,b) => new Date(a.recordedAt) - new Date(b.recordedAt))
          .slice(-7);

        setRecentWeights(sortedWeights);

        if (sortedWeights.length >= 2) {
          const firstWeight = sortedWeights[0].weight;
          const lastWeight = sortedWeights[sortedWeights.length - 1].weight;
          const difference = lastWeight - firstWeight;
          setWeightTrend({
            difference,
            isGain: difference > 0,
            isLoss: difference < 0,
            percentage: Math.abs((difference / firstWeight) * 100).toFixed(1)
          });
        }
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (event,selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setFormData({ ...formData,recordedAt: selectedDate });
    }
  };

  const handleSubmit = async () => {
    if (!user || !user.userId) {
      showErrorMessage('You are not logged in. Please log in again.');
      navigation.replace('Login');
      return;
    }
    const userId = parseInt(user.userId,10);
    if (isNaN(userId) || userId <= 0) {
      showErrorMessage('UserId must be a positive integer.');
      return;
    }

    if (!formData.weight || isNaN(parseFloat(formData.weight))) {
      showErrorMessage('Weight is required and must be a valid number.');
      return;
    }
    const weight = parseFloat(formData.weight);
    if (weight < 0.1 || weight > 500) {
      showErrorMessage('Weight must be between 0.1 and 500 kg.');
      return;
    }

    const now = new Date();
    if (formData.recordedAt && formData.recordedAt > now) {
      showErrorMessage('Recorded date cannot be in the future.');
      return;
    }

    try {
      setLoading(true);
      const d = formData.recordedAt;
      const localDateTime =
        d.getFullYear() + '-' +
        String(d.getMonth() + 1).padStart(2,'0') + '-' +
        String(d.getDate()).padStart(2,'0') + 'T' +
        String(d.getHours()).padStart(2,'0') + ':' +
        String(d.getMinutes()).padStart(2,'0') + ':' +
        String(d.getSeconds()).padStart(2,'0');
      const response = await weightHistoryService.addWeightHistory({
        historyId: "0",
        userId: userId,
        weight: weight,
        recordedAt: localDateTime,
      });

      if (response.statusCode === 201) {
        showSuccessMessage('Weight recorded successfully.');
        try {
          if (user?.userId) {
            await handleDailyCheckin(user?.userId,"weight_log");
          }
        } catch (e) {
          console.log(e);
        }
        navigation.goBack();
      } else {
        let errorMessage = response.message || 'An error occurred.';
        if (response.data && response.data.errors && typeof response.data.errors === 'object') {
          const validationErrors = Object.values(response.data.errors)
            .filter((err) => Array.isArray(err))
            .flat()
            .filter((err) => typeof err === 'string')
            .join('\n');
          errorMessage = validationErrors || errorMessage;
        }

        showErrorMessage(errorMessage);
      }
    } catch (error) {
      showErrorFetchAPI(error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US',{
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const renderWeightChart = () => {
    if (recentWeights.length < 2) {
      return (
        <View style={styles.noChartContainer}>
          <Ionicons name="analytics-outline" size={40} color="#CBD5E1" />
          <Text style={styles.noChartText}>
            Not enough data to show weight trend.
          </Text>
        </View>
      );
    }

    const chartData = {
      labels: recentWeights.map(item =>
        new Date(item.recordedAt).toLocaleDateString('en-US',{ month: 'short',day: 'numeric' })
      ),
      datasets: [{
        data: recentWeights.map(item => item.weight)
      }]
    };

    return (
      <View style={styles.chartContainer}>
        <LineChart
          data={chartData}
          width={width - 48}
          height={180}
          yAxisSuffix=" kg"
          chartConfig={{
            backgroundColor: '#FFFFFF',
            backgroundGradientFrom: '#FFFFFF',
            backgroundGradientTo: '#FFFFFF',
            decimalPlaces: 1,
            color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(30, 41, 59, ${opacity})`,
            style: {
              borderRadius: 16,
            },
            propsForDots: {
              r: '5',
              strokeWidth: '2',
              stroke: '#2563EB',
            },
            propsForLabels: {
              fontSize: 10,
            }
          }}
          bezier
          style={styles.chart}
        />

        {weightTrend && (
          <View style={styles.trendContainer}>
            <Text style={styles.trendLabel}>
              {weightTrend.isGain ? 'Weight Gain' : weightTrend.isLoss ? 'Weight Loss' : 'No Change'}:
            </Text>
            <View style={[
              styles.trendValueContainer,
              weightTrend.isGain ? styles.gainContainer :
                weightTrend.isLoss ? styles.lossContainer : styles.noChangeContainer
            ]}>
              <Ionicons
                name={weightTrend.isGain ? "arrow-up" : weightTrend.isLoss ? "arrow-down" : "remove"}
                size={16}
                color={weightTrend.isGain ? "#EF4444" : weightTrend.isLoss ? "#10B981" : "#64748B"}
              />
              <Text style={[
                styles.trendValue,
                weightTrend.isGain ? styles.gainText :
                  weightTrend.isLoss ? styles.lossText : styles.noChangeText
              ]}>
                {Math.abs(weightTrend.difference).toFixed(1)} kg ({weightTrend.percentage}%)
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return <CommonSkeleton />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <DynamicStatusBar backgroundColor={colors.headerBackground || "#FFFFFF"} />
      <Header
        title="Add Weight"
        onBack={() => navigation.goBack()}
        backgroundColor={colors.headerBackground || "#FFFFFF"}
        textColor={colors.headerText || colors.primary || "#0056d2"}
      />
      <View style={[styles.container,{ paddingTop: 80 }]}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>New Weight Entry</Text>

            <View style={styles.inputContainer}>
              <View style={styles.labelContainer}>
                <Ionicons name="scale-outline" size={20} color="#64748B" style={styles.labelIcon} />
                <Text style={styles.label}>Weight (kg) <Text style={styles.requiredStar}>*</Text></Text>
              </View>
              <View style={[
                styles.inputWrapper,
                activeField === 'weight' && styles.activeInput
              ]}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your weight"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={formData.weight}
                  onChangeText={(text) => setFormData({ ...formData,weight: text })}
                  onFocus={() => setActiveField('weight')}
                  onBlur={() => setActiveField(null)}
                />
                <Text style={styles.unitText}>kg</Text>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.labelContainer}>
                <Ionicons name="calendar-outline" size={20} color="#64748B" style={styles.labelIcon} />
                <Text style={styles.label}>Date</Text>
              </View>
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.dateText}>{formatDate(formData.recordedAt)}</Text>
                <Ionicons name="calendar" size={20} color="#64748B" />
              </TouchableOpacity>

              {showDatePicker && (
                <DateTimePicker
                  value={formData.recordedAt}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleDateChange}
                  maximumDate={new Date()}
                  style={styles.datePicker}
                />
              )}
            </View>

            <TouchableOpacity
              onPress={handleSubmit}
              style={[styles.submitButton,{ backgroundColor: colors.primary || '#0056d2' }]}
              disabled={loading}
            >
              <>
                <Ionicons name="save-outline" size={20} color="#FFFFFF" style={styles.submitIcon} />
                <Text style={styles.submitButtonText}>Save Weight</Text>
              </>
            </TouchableOpacity>
          </View>

          <View style={styles.trendCard}>
            <Text style={styles.sectionTitle}>Recent Weight Trend</Text>
            {renderWeightChart()}
          </View>

          <View style={styles.tipsCard}>
            <Text style={styles.sectionTitle}>Weight Tracking Tips</Text>
            <View style={styles.tipItem}>
              <Ionicons name="time-outline" size={20} color={colors.primary || "#0056d2"} style={styles.tipIcon} />
              <Text style={styles.tipText}>Weigh yourself at the same time each day for consistency</Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="water-outline" size={20} color={colors.primary || "#0056d2"} style={styles.tipIcon} />
              <Text style={styles.tipText}>Stay hydrated, but avoid weighing right after drinking large amounts</Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="trending-up-outline" size={20} color={colors.primary || "#0056d2"} style={styles.tipIcon} />
              <Text style={styles.tipText}>Focus on long-term trends rather than daily fluctuations</Text>
            </View>
          </View>

          {/* Add extra padding at the bottom to ensure the form is scrollable past the bottom tab bar */}
          <View style={styles.bottomPadding} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0,height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  trendCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0,height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  tipsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0,height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  labelIcon: {
    marginRight: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#334155',
  },
  requiredStar: {
    color: '#EF4444',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
  },
  activeInput: {
    borderColor: '#2563EB',
    borderWidth: 2,
  },
  input: {
    flex: 1,
    height: 44,
    fontSize: 16,
    color: '#0F172A',
  },
  unitText: {
    fontSize: 14,
    color: '#64748B',
    marginLeft: 4,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  dateText: {
    fontSize: 16,
    color: '#0F172A',
  },
  datePicker: {
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        borderRadius: 8,
        overflow: 'hidden',
      },
    }),
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#0056d2',
        shadowOffset: { width: 0,height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  submitIcon: {
    marginRight: 8,
  },
  submitButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  loadingContainer: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartContainer: {
    alignItems: 'center',
  },
  chart: {
    borderRadius: 16,
    marginVertical: 8,
  },
  noChartContainer: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noChartText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  trendLabel: {
    fontSize: 14,
    color: '#64748B',
    marginRight: 8,
  },
  trendValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
  },
  gainContainer: {
    backgroundColor: '#FEF2F2',
  },
  lossContainer: {
    backgroundColor: '#ECFDF5',
  },
  noChangeContainer: {
    backgroundColor: '#F1F5F9',
  },
  trendValue: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  gainText: {
    color: '#EF4444',
  },
  lossText: {
    color: '#10B981',
  },
  noChangeText: {
    color: '#64748B',
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  tipIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  tipText: {
    fontSize: 14,
    color: '#334155',
    flex: 1,
    lineHeight: 20,
  },
  bottomPadding: {
    height: 80,
  },
});