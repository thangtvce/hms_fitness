import React, { useState, useEffect } from "react"
import { 
  View, 
  Text, 
  ScrollView, 
  Dimensions, 
  TouchableOpacity, 
  StyleSheet,
  Modal,
  FlatList
} from "react-native"
import { BarChart, PieChart } from "react-native-chart-kit"
import { Ionicons } from "@expo/vector-icons"
import dayjs from 'dayjs'
import weekOfYear from 'dayjs/plugin/weekOfYear'
import Header from "../../components/Header"

dayjs.extend(weekOfYear)

const { width: screenWidth } = Dimensions.get('window')

const TrendsScreen = ({ route, logs, navigation }) => {
  const [selectedType, setSelectedType] = useState('week')
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMetric, setSelectedMetric] = useState('calories')
  const [showYearModal, setShowYearModal] = useState(false)
  const [showMetricModal, setShowMetricModal] = useState(false)

  // Get logs from route params or prop, fallback to empty array
  const data = (route?.params?.logs) || logs || []

  // Available years from data
  const availableYears = [...new Set(data.map(log => 
    log.consumptionDate ? dayjs(log.consumptionDate).year() : null
  ).filter(Boolean))].sort((a, b) => b - a)

  // Calculate trends for each field
  const getTrendStats = (field = 'calories') => {
    const stats = { week: {}, month: {}, quarter: {} }
    
    data.forEach(log => {
      const logDate = dayjs(log.consumptionDate)
      const year = logDate.year()
      
      // Filter by selected year
      if (year !== selectedYear) return
      
      const week = logDate.week()
      const month = logDate.month() + 1
      const quarter = Math.floor((month - 1) / 3) + 1

      const weekKey = `W${week}`
      const monthKey = `M${month}`
      const quarterKey = `Q${quarter}`

      if (!stats.week[weekKey]) stats.week[weekKey] = 0
      if (!stats.month[monthKey]) stats.month[monthKey] = 0
      if (!stats.quarter[quarterKey]) stats.quarter[quarterKey] = 0

      stats.week[weekKey] += log[field] || 0
      stats.month[monthKey] += log[field] || 0
      stats.quarter[quarterKey] += log[field] || 0
    })

    return stats
  }

  // Get macronutrient data for combined chart
  const getMacronutrientData = () => {
    const proteinStats = getTrendStats('protein')
    const carbsStats = getTrendStats('carbs')
    const fatsStats = getTrendStats('fats')

    const currentStats = selectedType === 'week' ? 'week' : 
                        selectedType === 'month' ? 'month' : 'quarter'

    const labels = Object.keys(proteinStats[currentStats]).slice(-6)
    
    return {
      labels,
      datasets: [
        {
          data: labels.map(label => proteinStats[currentStats][label] || 0),
          color: () => '#EF4444', // Red for protein
        },
        {
          data: labels.map(label => carbsStats[currentStats][label] || 0),
          color: () => '#3B82F6', // Blue for carbs
        },
        {
          data: labels.map(label => fatsStats[currentStats][label] || 0),
          color: () => '#F59E0B', // Orange for fats
        }
      ]
    }
  }

  // Calculate percentage change
  const getPercentageChange = (field) => {
    const stats = getTrendStats(field)
    const currentStats = stats[selectedType]
    const values = Object.values(currentStats)
    
    if (values.length < 2) return 0
    
    const current = values[values.length - 1]
    const previous = values[values.length - 2]
    
    if (previous === 0) return current > 0 ? 100 : 0
    
    return ((current - previous) / previous * 100).toFixed(1)
  }

  // Pie chart data for percentage changes
  const getPieChartData = (field) => {
    const change = parseFloat(getPercentageChange(field))
    const absChange = Math.abs(change)
    const remaining = 100 - Math.min(absChange, 100)
    
    return [
      {
        name: change >= 0 ? 'Increase' : 'Decrease',
        population: Math.min(absChange, 100),
        color: change >= 0 ? '#22C55E' : '#EF4444',
        legendFontColor: '#374151',
        legendFontSize: 12,
      },
      {
        name: 'Stable',
        population: remaining,
        color: '#E5E7EB',
        legendFontColor: '#9CA3AF',
        legendFontSize: 12,
      }
    ]
  }

  const caloriesStats = getTrendStats('calories')
  const macroData = getMacronutrientData()

  const chartWidth = screenWidth - 32
  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(0, 86, 210, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(55, 65, 81, ${opacity})`,
    style: { borderRadius: 16 },
    propsForBackgroundLines: {
      strokeDasharray: "3,6",
      stroke: "#E5E7EB",
      strokeWidth: 1,
      strokeOpacity: 0.5,
    },
    barPercentage: 0.7,
    categoryPercentage: 0.8,
  }

  const pieChartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    color: (opacity = 1) => `rgba(0, 86, 210, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
  }

  // Render time period selector
  const renderTimePeriodSelector = () => (
    <View style={styles.selectorContainer}>
      {[
        { key: 'week', label: 'Week', icon: 'calendar-outline' },
        { key: 'month', label: 'Month', icon: 'calendar' },
        { key: 'quarter', label: 'Quarter', icon: 'calendar-sharp' },
      ].map(type => (
        <TouchableOpacity
          key={type.key}
          onPress={() => setSelectedType(type.key)}
          style={[
            styles.selectorButton,
            selectedType === type.key && styles.selectorButtonActive
          ]}
        >
          <Ionicons 
            name={type.icon} 
            size={16} 
            color={selectedType === type.key ? '#ffffff' : '#0056d2'} 
          />
          <Text style={[
            styles.selectorText,
            selectedType === type.key && styles.selectorTextActive
          ]}>
            {type.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  )

  // Render header filters
  const renderHeaderFilters = () => (
    <View style={styles.headerFilters}>
      <TouchableOpacity 
        style={styles.filterButton}
        onPress={() => setShowYearModal(true)}
      >
        <Text style={styles.filterButtonText}>{selectedYear}</Text>
        <Ionicons name="chevron-down" size={16} color="#0056d2" />
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.filterButton}
        onPress={() => setShowMetricModal(true)}
      >
        <Text style={styles.filterButtonText}>
          {selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)}
        </Text>
        <Ionicons name="chevron-down" size={16} color="#0056d2" />
      </TouchableOpacity>
    </View>
  )

  // Render year modal
  const renderYearModal = () => (
    <Modal
      visible={showYearModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowYearModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <TouchableOpacity onPress={() => setShowYearModal(false)} style={{ padding: 4, marginRight: 8 }}>
              <Ionicons name="arrow-back" size={22} color="#0056d2" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Year</Text>
          </View>
          <FlatList
            data={availableYears}
            keyExtractor={(item) => item.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.modalItem,
                  selectedYear === item && styles.modalItemActive
                ]}
                onPress={() => {
                  setSelectedYear(item)
                  setShowYearModal(false)
                }}
              >
                <Text style={[
                  styles.modalItemText,
                  selectedYear === item && styles.modalItemTextActive
                ]}>
                  {item}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  )

  // Render metric modal
  const renderMetricModal = () => (
    <Modal
      visible={showMetricModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowMetricModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <TouchableOpacity onPress={() => setShowMetricModal(false)} style={{ padding: 4, marginRight: 8 }}>
              <Ionicons name="arrow-back" size={22} color="#0056d2" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Metric</Text>
          </View>
          {[
            { key: 'calories', label: 'Calories', color: '#0056d2' },
            { key: 'protein', label: 'Protein', color: '#EF4444' },
            { key: 'carbs', label: 'Carbs', color: '#3B82F6' },
            { key: 'fats', label: 'Fats', color: '#F59E0B' },
          ].map(metric => (
            <TouchableOpacity
              key={metric.key}
              style={[
                styles.modalItem,
                selectedMetric === metric.key && styles.modalItemActive
              ]}
              onPress={() => {
                setSelectedMetric(metric.key)
                setShowMetricModal(false)
              }}
            >
              <View style={[styles.metricIndicator, { backgroundColor: metric.color }]} />
              <Text style={[
                styles.modalItemText,
                selectedMetric === metric.key && styles.modalItemTextActive
              ]}>
                {metric.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Modal>
  )

  // Get current data for charts
  const getCurrentData = (field) => {
    const stats = getTrendStats(field)
    const currentStats = stats[selectedType]
    const entries = Object.entries(currentStats).slice(-6)
    
    return {
      labels: entries.map(([key]) => key),
      datasets: [{ data: entries.map(([_, val]) => val) }]
    }
  }

  return (
    <View style={styles.container}>
      <Header
        title="Nutrition Trends"
        onBack={() => navigation.goBack()}
        rightActions={[]}
      />
      
      <View style={styles.content}>
        {renderHeaderFilters()}
        {renderTimePeriodSelector()}
        
        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          {/* Calories Chart - Always visible */}
          <View style={styles.chartSection}>
            <Text style={styles.chartTitle}>Calories Intake</Text>
            <Text style={styles.chartSubtitle}>
              {selectedType.charAt(0).toUpperCase() + selectedType.slice(1)}ly trends for {selectedYear}
            </Text>
            
            {Object.keys(caloriesStats[selectedType]).length > 0 ? (
              <BarChart
                data={getCurrentData('calories')}
                width={chartWidth}
                height={220}
                chartConfig={{
                  ...chartConfig,
                  color: (opacity = 1) => `rgba(0, 86, 210, ${opacity})`,
                }}
                style={styles.chart}
                fromZero={true}
                showValuesOnTopOfBars={true}
              />
            ) : (
              <View style={styles.noDataContainer}>
                <Ionicons name="bar-chart-outline" size={48} color="#E5E7EB" />
                <Text style={styles.noDataText}>No data available</Text>
              </View>
            )}
          </View>

          {/* Calories Percentage Change Pie Chart */}
          <View style={styles.chartSection}>
            <Text style={styles.chartTitle}>Calories Change</Text>
            <Text style={styles.chartSubtitle}>
              {getPercentageChange('calories')}% change from previous period
            </Text>
            
            <PieChart
              data={getPieChartData('calories')}
              width={chartWidth}
              height={200}
              chartConfig={pieChartConfig}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              style={styles.chart}
            />
          </View>

          {/* Macronutrients Chart */}
          <View style={styles.chartSection}>
            <Text style={styles.chartTitle}>Macronutrients Breakdown</Text>
            <Text style={styles.chartSubtitle}>
              Protein, Carbs, and Fats comparison
            </Text>
            
            <View style={styles.legendContainer}>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: '#EF4444' }]} />
                <Text style={styles.legendText}>Protein</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: '#3B82F6' }]} />
                <Text style={styles.legendText}>Carbs</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: '#F59E0B' }]} />
                <Text style={styles.legendText}>Fats</Text>
              </View>
            </View>

            {/* Always show 3 columns: Carb, Protein, Fats (not by period) */}
            <BarChart
              data={{
                labels: ['Carbs', 'Protein', 'Fats'],
                datasets: [
                  {
                    data: [
                      data.filter(log => log.consumptionDate && dayjs(log.consumptionDate).year() === selectedYear)
                        .reduce((sum, log) => sum + (log.carbs || 0), 0),
                      data.filter(log => log.consumptionDate && dayjs(log.consumptionDate).year() === selectedYear)
                        .reduce((sum, log) => sum + (log.protein || 0), 0),
                      data.filter(log => log.consumptionDate && dayjs(log.consumptionDate).year() === selectedYear)
                        .reduce((sum, log) => sum + (log.fats || 0), 0)
                    ],
                    colors: [
                      () => '#3B82F6', // Carbs
                      () => '#EF4444', // Protein
                      () => '#F59E0B', // Fats
                    ],
                  }
                ]
              }}
              width={chartWidth}
              height={220}
              chartConfig={{
                ...chartConfig,
                color: (opacity = 1, index) => {
                  const colors = [
                    `rgba(59, 130, 246, ${opacity})`, // Carbs
                    `rgba(239, 68, 68, ${opacity})`, // Protein
                    `rgba(245, 158, 11, ${opacity})`, // Fats
                  ]
                  return colors[index] || `rgba(0, 86, 210, ${opacity})`
                }
              }}
              style={styles.chart}
              fromZero={true}
              showValuesOnTopOfBars={true}
              withCustomBarColorFromData={true}
              flatColor={true}
            />
          </View>

          {/* Individual Macronutrient Pie Charts */}
          {['protein', 'carbs', 'fats'].map(nutrient => (
            <View key={nutrient} style={styles.chartSection}>
              <Text style={styles.chartTitle}>
                {nutrient.charAt(0).toUpperCase() + nutrient.slice(1)} Change
              </Text>
              <Text style={styles.chartSubtitle}>
                {getPercentageChange(nutrient)}% change from previous period
              </Text>
              
              <PieChart
                data={getPieChartData(nutrient)}
                width={chartWidth}
                height={200}
                chartConfig={pieChartConfig}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="15"
                style={styles.chart}
              />
            </View>
          ))}

          {/* Selected Metric Detailed Chart */}
          {selectedMetric !== 'calories' && (
            <View style={styles.chartSection}>
              <Text style={styles.chartTitle}>
                {selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)} Detailed View
              </Text>
              <Text style={styles.chartSubtitle}>
                Detailed {selectedType}ly breakdown
              </Text>
              
              {Object.keys(getTrendStats(selectedMetric)[selectedType]).length > 0 ? (
                <BarChart
                  data={getCurrentData(selectedMetric)}
                  width={chartWidth}
                  height={220}
                  chartConfig={{
                    ...chartConfig,
                    color: (opacity = 1) => {
                      const colors = {
                        protein: `rgba(239, 68, 68, ${opacity})`,
                        carbs: `rgba(59, 130, 246, ${opacity})`,
                        fats: `rgba(245, 158, 11, ${opacity})`
                      }
                      return colors[selectedMetric] || `rgba(0, 86, 210, ${opacity})`
                    }
                  }}
                  style={styles.chart}
                  fromZero={true}
                  showValuesOnTopOfBars={true}
                />
              ) : (
                <View style={styles.noDataContainer}>
                  <Ionicons name="bar-chart-outline" size={48} color="#E5E7EB" />
                  <Text style={styles.noDataText}>No data available</Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </View>

      {renderYearModal()}
      {renderMetricModal()}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
    marginTop: 100,
  },
  headerFilters: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#0056d2',
    gap: 8,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0056d2',
  },
  selectorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#0056d2',
    gap: 8,
    minWidth: 100,
    justifyContent: 'center',
  },
  selectorButtonActive: {
    backgroundColor: '#0056d2',
    borderColor: '#0056d2',
  },
  selectorText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0056d2',
  },
  selectorTextActive: {
    color: '#ffffff',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  chartSection: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  chartSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  noDataContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noDataText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 12,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    minWidth: 200,
    maxHeight: 300,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 4,
  },
  modalItemActive: {
    backgroundColor: '#0056d2',
  },
  modalItemText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  modalItemTextActive: {
    color: '#ffffff',
  },
  metricIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
})

export default TrendsScreen