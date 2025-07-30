import React, { useState, useEffect } from "react";
import ShimmerPlaceholder from "components/shimmer/ShimmerPlaceholder";

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isoWeek from 'dayjs/plugin/isoWeek';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
dayjs.extend(isoWeek);
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
  Dimensions,
  Platform,
} from "react-native";
import { showErrorFetchAPI, showSuccessMessage } from "utils/toastUtil";
import { Ionicons } from "@expo/vector-icons";
import { BarChart } from "react-native-chart-kit";
import Header from "components/Header";
import { apiUserWaterLogService } from "services/apiUserWaterLogService";
import { useAuth } from "context/AuthContext";
import DateTimePicker from '@react-native-community/datetimepicker';

const PlatformSpecificDatePicker = (props) => <DateTimePicker {...props} />;

const { width: screenWidth } = Dimensions.get("window");

const CHART_FILTERS = [
  { id: "daily", label: "Daily", type: "day", days: 1, groupBy: "day" },
  { id: "weekly", label: "Weekly", type: "week", days: 7, groupBy: "week" },
  { id: "monthly", label: "Monthly", type: "month", months: 1, groupBy: "month" },
];



export default function WaterLogAnalyticsScreen({ navigation }) {
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header title="Water Analytics" onBack={() => navigation.goBack()} />
        {/* Tabs luôn hiển thị */}
        <View style={{paddingHorizontal: 0, marginTop: 8}}>
          <View style={styles.tabContainer}>
            {CHART_FILTERS.map((filter) => (
              <TouchableOpacity
                key={filter.id}
                style={[styles.tab, mainFilter === filter.id && styles.tabActive]}
                onPress={() => setMainFilter(filter.id)}
              >
                <Text style={[styles.tabLabel, mainFilter === filter.id && styles.tabLabelActive]}>{filter.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        <View>
          {/* Shimmer cho Statistics Cards */}
          <View style={{flexDirection: 'row', gap: 12, marginBottom: 24, marginHorizontal: 16}}>
            <ShimmerPlaceholder style={{flex: 1, height: 80, borderRadius: 12}} />
            <ShimmerPlaceholder style={{flex: 1, height: 80, borderRadius: 12}} />
            <ShimmerPlaceholder style={{flex: 1, height: 80, borderRadius: 12}} />
          </View>
          {/* Shimmer cho Chart */}
          <View style={{marginHorizontal: 16}}>
            <ShimmerPlaceholder style={{height: 240, borderRadius: 16, marginBottom: 24, width: '100%'}} />
          </View>
          {/* Shimmer cho Logs List */}
          <View style={{marginHorizontal: 16}}>
            <ShimmerPlaceholder style={{height: 260, borderRadius: 16, width: '100%'}} />
          </View>
        </View>
        </View>
      </SafeAreaView>
    );
  }
  const { user, authToken } = useAuth();

  // Log current Vietnam date and water target for current user
  useEffect(() => {
    // Get Vietnam today string in YYYY-MM-DD
    let vietnamDate = '';
    try {
      vietnamDate = new Date().toLocaleDateString('en-CA', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    } catch (e) {}
    let userId = null;
    if (user && typeof user === 'object') {
      userId = user.id || user._id || user.userId;
    }
    const key = userId ? `waterTarget_${userId}` : 'waterTarget';
    const saved = typeof window !== 'undefined' && window.localStorage ? localStorage.getItem(key) : null;
    console.log('DEBUG analytics Vietnam date:', vietnamDate, '| waterTarget localStorage:', key, saved);
  }, [user]);
  
  // State management
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearchInput, setShowSearchInput] = useState(false);
  // Unified filter for both chart and logs
  const [mainFilter, setMainFilter] = useState("daily");
  const [chartData, setChartData] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [chartLoading, setChartLoading] = useState(false);
  
  // Statistics
  const [totalAmount, setTotalAmount] = useState(0);
  const [averageAmount, setAverageAmount] = useState(0);
  const [totalLogs, setTotalLogs] = useState(0);

  // Custom date range for log filter
  const [customStartDate, setCustomStartDate] = useState(null);
  const [customEndDate, setCustomEndDate] = useState(null);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [tempStartDate, setTempStartDate] = useState(null);
  const [tempEndDate, setTempEndDate] = useState(null);

  useEffect(() => {
    if (showStartDatePicker) {
      setTempStartDate(customStartDate || new Date());
    }
  }, [showStartDatePicker, customStartDate]);

  useEffect(() => {
    if (showEndDatePicker) {
      setTempEndDate(customEndDate || new Date());
    }
  }, [showEndDatePicker, customEndDate]);

  useEffect(() => {
    fetchChartData();
    fetchLogs();
  }, [mainFilter, searchTerm, customStartDate, customEndDate]);

  const fetchChartData = async () => {
    setChartLoading(true);
    try {
      const filterObj = CHART_FILTERS.find(f => f.id === mainFilter) || CHART_FILTERS[0];
      let startDate, endDate;
      if (filterObj.id === 'daily') {
        // Daily: today only
        const nowUTC = dayjs.utc();
        const nowVN = nowUTC.add(7, 'hour');
        startDate = nowVN.startOf('day').toDate();
        endDate = nowVN.endOf('day').toDate();
      } else if (filterObj.id === 'weekly') {
        // Weekly: last 7 days
        endDate = new Date();
        endDate.setHours(23, 59, 59, 999);
        startDate = new Date();
        startDate.setDate(endDate.getDate() - 6);
        startDate.setHours(0, 0, 0, 0);
      } else if (filterObj.id === 'monthly') {
        // Monthly: current month
        endDate = new Date();
        endDate.setHours(23, 59, 59, 999);
        startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
        startDate.setHours(0, 0, 0, 0);
      }
      const queryParams = {
        pageNumber: 1,
        pageSize: 5000,
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
        status: "active",
      };
      const response = await apiUserWaterLogService.getMyWaterLogs(queryParams);
      if (response?.statusCode === 200 && response?.data) {
        const records = response.data.records || [];
        generateChartData(records, filterObj, startDate, endDate);
      } else {
        setChartData(null);
        console.error('Chart fetch error:', response);
        showErrorFetchAPI(response);
      }
    } catch (error) {
      setChartData(null);
      console.error('Chart fetch exception:', error);
      showErrorFetchAPI(error);
    } finally {
      setChartLoading(false);
    }
  };

  const generateChartData = (records, filterObj, startDate, endDate) => {
    let labels = [];
    let data = [];

    if (filterObj.id === 'daily') {
      // Show 7 most recent days with data (Vietnam time)
      // Group by day, get last 7 days with data
      const grouped = {};
      records.forEach(log => {
        let dVN;
        if (typeof log.consumptionDate === 'string') {
          dVN = dayjs.tz(log.consumptionDate, 'Asia/Ho_Chi_Minh');
          if (!dVN.isValid()) dVN = dayjs.tz(log.consumptionDate + ' 00:00:00', 'Asia/Ho_Chi_Minh');
        } else {
          dVN = dayjs(log.consumptionDate).tz('Asia/Ho_Chi_Minh');
        }
        if (dVN.isValid()) {
          const key = dVN.format('YYYY-MM-DD');
          if (!grouped[key]) grouped[key] = 0;
          grouped[key] += log.amountMl || 0;
        }
      });
      // Get last 7 days (sorted)
      const sortedDays = Object.keys(grouped).sort((a, b) => dayjs(a).unix() - dayjs(b).unix());
      const last7 = sortedDays.slice(-7);
      labels = last7.map(d => dayjs(d).format('DD/MM'));
      data = last7.map(d => grouped[d]);
    } else if (filterObj.id === 'weekly') {
      // Group by week, sum per week, show each week as a bar
      // Week starts on Monday
      const grouped = {};
      records.forEach(log => {
        let dVN;
        if (typeof log.consumptionDate === 'string') {
          dVN = dayjs.tz(log.consumptionDate, 'Asia/Ho_Chi_Minh');
          if (!dVN.isValid()) dVN = dayjs.tz(log.consumptionDate + ' 00:00:00', 'Asia/Ho_Chi_Minh');
        } else {
          dVN = dayjs(log.consumptionDate).tz('Asia/Ho_Chi_Minh');
        }
        if (dVN.isValid()) {
          // Get week number and year
          const weekYear = dVN.isoWeekYear();
          const weekNum = dVN.isoWeek();
          const key = `${weekYear}-W${weekNum}`;
          if (!grouped[key]) grouped[key] = { total: 0, weekNum, weekYear, dVN };
          grouped[key].total += log.amountMl || 0;
        }
      });
      // Sort by week
      const sortedWeeks = Object.keys(grouped).sort((a, b) => {
        const [yA, wA] = a.split('-W');
        const [yB, wB] = b.split('-W');
        if (yA !== yB) return parseInt(yA) - parseInt(yB);
        return parseInt(wA) - parseInt(wB);
      });
      labels = sortedWeeks.map(k => {
        const { weekNum, weekYear } = grouped[k];
        // Show week range label (Mon - Sun)
        // Try/catch to avoid crash if isoWeek plugin is not working
        try {
          const monday = dayjs().isoWeekYear(weekYear).isoWeek(weekNum).startOf('isoWeek');
          const sunday = monday.endOf('isoWeek');
          if (typeof monday.format === 'function' && typeof sunday.format === 'function') {
            return `${monday.format('DD/MM')}-${sunday.format('DD/MM')}`;
          }
        } catch (e) {}
        // Fallback: just show week/year
        return `W${weekNum}/${weekYear}`;
      });
      data = sortedWeeks.map(k => grouped[k].total);
    } else if (filterObj.id === 'monthly') {
      // Group by month, sum per month, show each month as a bar
      const grouped = {};
      records.forEach(log => {
        let dVN;
        if (typeof log.consumptionDate === 'string') {
          dVN = dayjs.tz(log.consumptionDate, 'Asia/Ho_Chi_Minh');
          if (!dVN.isValid()) dVN = dayjs.tz(log.consumptionDate + ' 00:00:00', 'Asia/Ho_Chi_Minh');
        } else {
          dVN = dayjs(log.consumptionDate).tz('Asia/Ho_Chi_Minh');
        }
        if (dVN.isValid()) {
          const key = dVN.format('YYYY-MM');
          if (!grouped[key]) grouped[key] = 0;
          grouped[key] += log.amountMl || 0;
        }
      });
      // Sort by month
      const sortedMonths = Object.keys(grouped).sort((a, b) => dayjs(a).unix() - dayjs(b).unix());
      labels = sortedMonths.map(m => dayjs(m + '-01').format('MM/YYYY'));
      data = sortedMonths.map(m => grouped[m]);
    }
    else if (filterObj.id === '3m') {
      // 3M: mỗi cột là tổng lượng nước của 3 tháng
      const months = [];
      let temp = dayjs(startDate).tz('Asia/Ho_Chi_Minh').startOf('month');
      let end = dayjs(endDate).tz('Asia/Ho_Chi_Minh').endOf('month');
      while (temp.isBefore(end) || temp.isSame(end, 'month')) {
        months.push({
          key: temp.format('YYYY-MM'),
          label: temp.format('MM/YYYY'),
          total: 0
        });
        temp = temp.add(1, 'month');
      }
      records.forEach(log => {
        let d = log.consumptionDate;
        const dVN = dayjs.tz(typeof d === 'string' ? d + ' 00:00:00' : d, 'Asia/Ho_Chi_Minh');
        const key = dVN.format('YYYY-MM');
        const monthData = months.find(m => m.key === key);
        if (monthData) monthData.total += log.amountMl || 0;
      });
      // Group mỗi 3 tháng
      const grouped = [];
      for (let i = 0; i < months.length; i += 3) {
        const group = months.slice(i, i + 3);
        const total = group.reduce((sum, m) => sum + m.total, 0);
        const label = group.length > 1 ? `${group[0].label}-${group[group.length-1].label}` : group[0].label;
        grouped.push({ label, total });
      }
      labels = grouped.map(g => g.label);
      data = grouped.map(g => g.total);
    }
    else if (filterObj.id === '6m') {
      // 6M: mỗi cột là tổng lượng nước của 6 tháng
      const months = [];
      let temp = dayjs(startDate).tz('Asia/Ho_Chi_Minh').startOf('month');
      let end = dayjs(endDate).tz('Asia/Ho_Chi_Minh').endOf('month');
      while (temp.isBefore(end) || temp.isSame(end, 'month')) {
        months.push({
          key: temp.format('YYYY-MM'),
          label: temp.format('MM/YYYY'),
          total: 0
        });
        temp = temp.add(1, 'month');
      }
      records.forEach(log => {
        let d = log.consumptionDate;
        const dVN = dayjs.tz(typeof d === 'string' ? d + ' 00:00:00' : d, 'Asia/Ho_Chi_Minh');
        const key = dVN.format('YYYY-MM');
        const monthData = months.find(m => m.key === key);
        if (monthData) monthData.total += log.amountMl || 0;
      });
      // Group mỗi 6 tháng
      const grouped = [];
      for (let i = 0; i < months.length; i += 6) {
        const group = months.slice(i, i + 6);
        const total = group.reduce((sum, m) => sum + m.total, 0);
        const label = group.length > 1 ? `${group[0].label}-${group[group.length-1].label}` : group[0].label;
        grouped.push({ label, total });
      }
      labels = grouped.map(g => g.label);
      data = grouped.map(g => g.total);
    }
    else if (filterObj.groupBy === 'day') {
      // ...existing code for day grouping...

    } else if (filterObj.groupBy === 'year') {
      // Group by year
      const years = [];
      let temp = new Date(startDate);
      
      while (temp <= endDate) {
        const year = temp.getFullYear();
        if (!years.find(y => y.year === year)) {
          years.push({
            year,
            label: year.toString(),
            total: 0,
          });
        }
        temp.setFullYear(temp.getFullYear() + 1);
      }

      records.forEach(log => {
        const year = new Date(log.consumptionDate).getFullYear();
        const yearData = years.find(y => y.year === year);
        if (yearData) {
          yearData.total += log.amountMl || 0;
        }
      });

      labels = years.map(y => y.label);
      data = years.map(y => y.total);
    }

    // Limit data points for better display
    const maxPoints = screenWidth < 400 ? 8 : 10;
    if (labels.length > maxPoints) {
      labels = labels.slice(-maxPoints);
      data = data.slice(-maxPoints);
    }

    setChartData({
      labels,
      datasets: [{ data: data.length > 0 ? data : [0] }],
    });
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let startDate, endDate;
      if (mainFilter === 'custom' && customStartDate && customEndDate) {
        startDate = new Date(customStartDate);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(customEndDate);
        endDate.setHours(23, 59, 59, 999);
      } else if (mainFilter === 'daily') {
        const nowUTC = dayjs.utc();
        const nowVN = nowUTC.add(7, 'hour');
        startDate = nowVN.startOf('day').toDate();
        endDate = nowVN.endOf('day').toDate();
      } else if (mainFilter === 'weekly') {
        endDate = new Date();
        endDate.setHours(23, 59, 59, 999);
        startDate = new Date();
        startDate.setDate(endDate.getDate() - 6);
        startDate.setHours(0, 0, 0, 0);
      } else if (mainFilter === 'monthly') {
        endDate = new Date();
        endDate.setHours(23, 59, 59, 999);
        startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
        startDate.setHours(0, 0, 0, 0);
      } else {
        // Fallback: use today
        const nowUTC = dayjs.utc();
        const nowVN = nowUTC.add(7, 'hour');
        startDate = nowVN.startOf('day').toDate();
        endDate = nowVN.endOf('day').toDate();
      }
      if (!startDate || !endDate) {
        // Defensive: fallback to today
        const nowUTC = dayjs.utc();
        const nowVN = nowUTC.add(7, 'hour');
        startDate = nowVN.startOf('day').toDate();
        endDate = nowVN.endOf('day').toDate();
      }
      const queryParams = {
        pageNumber: 1,
        pageSize: 1000,
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
        status: "active",
        searchTerm: searchTerm.trim() ? searchTerm.trim() : undefined,
      };
      Object.keys(queryParams).forEach(key => queryParams[key] === undefined && delete queryParams[key]);
      const response = await apiUserWaterLogService.getMyWaterLogs(queryParams);
      if (response?.statusCode === 200 && response?.data) {
        let records = response.data.records || [];
        setLogs(records);
        const total = records.reduce((sum, log) => sum + (log.amountMl || 0), 0);
        setTotalAmount(total);
        setTotalLogs(records.length);
        setAverageAmount(records.length > 0 ? Math.round(total / records.length) : 0);
      } else {
        setLogs([]);
        setTotalAmount(0);
        setTotalLogs(0);
        setAverageAmount(0);
        console.error('Logs fetch error:', response);
        showErrorFetchAPI(response);
      }
    } catch (error) {
      setLogs([]);
      setTotalAmount(0);
      setTotalLogs(0);
      setAverageAmount(0);
      console.error('Logs fetch exception:', error);
      showErrorFetchAPI(error);
    } finally {
      setLoading(false);
    }
  };

  const renderSearchBar = () => (
    <View style={styles.searchBarContainer}>
      {!showSearchInput ? (
        <TouchableOpacity 
          style={styles.searchToggleButton} 
          onPress={() => setShowSearchInput(true)}
        >
          <Ionicons name="search" size={16} color="#64748B" />
          <Text style={styles.searchToggleText}>Search notes...</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={16} color="#64748B" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search in notes..."
            placeholderTextColor="#9CA3AF"
            value={searchTerm}
            onChangeText={setSearchTerm}
            returnKeyType="search"
            autoFocus
          />
          <TouchableOpacity onPress={() => { 
            setSearchTerm(""); 
            setShowSearchInput(false); 
          }}>
            <Ionicons name="close-circle" size={16} color="#EF4444" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

const renderStatistics = () => (
  <View style={styles.statisticsContainer}>
    {loading ? (
      <>
        <ShimmerPlaceholder style={{flex: 1, height: 80, borderRadius: 12}} />
        <ShimmerPlaceholder style={{flex: 1, height: 80, borderRadius: 12}} />
        <ShimmerPlaceholder style={{flex: 1, height: 80, borderRadius: 12}} />
      </>
    ) : (
      <>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{totalLogs}</Text>
          <Text style={styles.statLabel}>Total Logs</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{totalAmount.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Total (ml)</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{averageAmount.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Average (ml)</Text>
        </View>
      </>
    )}
  </View>
);

  const renderChart = () => (
    <View style={styles.chartSection}>

      {/* Filter Tabs - styled giống CaloriesLogStatisticsScreen */}
      <View style={styles.tabContainer}>
        {CHART_FILTERS.map((filter) => (
          <TouchableOpacity
            key={filter.id}
            style={[styles.tab, mainFilter === filter.id && styles.tabActive]}
            onPress={() => setMainFilter(filter.id)}
          >
            <Text style={[styles.tabLabel, mainFilter === filter.id && styles.tabLabelActive]}>{filter.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {/* Statistics above chart */}
      {renderStatistics()}
      <View style={styles.chartContainer}>
        {chartData && chartData.datasets[0].data.some(val => val > 0) ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <BarChart
              data={chartData}
              width={Math.max(screenWidth - 32, chartData.labels.length * 60)}
              height={240}
              chartConfig={{
                backgroundColor: '#ffffff',
                backgroundGradientFrom: '#ffffff',
                backgroundGradientTo: '#ffffff',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
                style: { borderRadius: 16 },
                propsForLabels: { fontSize: 11 },
                barPercentage: 0.7,
              }}
              style={styles.chart}
              showValuesOnTopOfBars={true}
              fromZero={true}
              withInnerLines={false}
            />
          </ScrollView>
        ) : (
          <View style={styles.noChartData}>
            <Ionicons name="bar-chart-outline" size={48} color="#CBD5E1" />
            <Text style={styles.noChartText}>No data available for chart</Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderLogsList = () => (
    <View style={styles.logsSection}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Water Logs List</Text>
      </View>

      {mainFilter === 'custom' && (
        <View style={styles.customDateContainer}>
          <TouchableOpacity
            style={styles.datePickerButton}
            onPress={() => setShowStartDatePicker(true)}
          >
            <Ionicons name="calendar-outline" size={18} color="#2563EB" />
            <Text style={styles.datePickerText}>
              {customStartDate ? new Date(customStartDate).toLocaleDateString('en-US') : 'From Date'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.datePickerButton}
            onPress={() => setShowEndDatePicker(true)}
          >
            <Ionicons name="calendar-outline" size={18} color="#2563EB" />
            <Text style={styles.datePickerText}>
              {customEndDate ? new Date(customEndDate).toLocaleDateString('en-US') : 'To Date'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

const renderDatePicker = (isStart) => {
  const isVisible = isStart ? showStartDatePicker : showEndDatePicker;
  const tempDate = isStart ? tempStartDate : tempEndDate;
  const currentDate = isStart ? customStartDate : customEndDate;
  
  if (!isVisible) return null;

  return (
    <View style={styles.datePickerOverlay}>
      <View style={styles.datePickerModal}>
        <Text style={styles.datePickerTitle}>
          {isStart ? "Select Start Date" : "Select End Date"}
        </Text>
        <PlatformSpecificDatePicker
          value={tempDate || new Date()}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(_, selectedDate) => {
            if (selectedDate) {
              if (isStart) {
                setTempStartDate(selectedDate);
              } else {
                setTempEndDate(selectedDate);
              }
            }
          }}
          maximumDate={isStart ? (customEndDate ? new Date(customEndDate) : undefined) : undefined}
          minimumDate={!isStart ? (customStartDate ? new Date(customStartDate) : undefined) : undefined}
        />
        <View style={styles.datePickerActions}>
          <TouchableOpacity 
            style={styles.datePickerButton}
            onPress={() => {
              if (isStart) {
                setShowStartDatePicker(false);
                setTempStartDate(customStartDate);
              } else {
                setShowEndDatePicker(false);
                setTempEndDate(customEndDate);
              }
            }}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.datePickerButton, styles.confirmButton]}
            onPress={() => {
              if (isStart) {
                if (tempStartDate) setCustomStartDate(tempStartDate);
                setShowStartDatePicker(false);
              } else {
                if (tempEndDate) setCustomEndDate(tempEndDate);
                setShowEndDatePicker(false);
              }
            }}
          >
            <Text style={styles.confirmButtonText}>Confirm</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

  // Always show tabs and statistics, shimmer only chart and logs when loading
  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Water Analytics"
        onBack={() => navigation.goBack()}
      />

      {renderSearchBar()}

      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        pointerEvents={loading ? "none" : "auto"}
      >
        {/* Tabs and statistics always visible */}
        <View style={styles.chartSection}>
          <View style={styles.tabContainer}>
            {CHART_FILTERS.map((filter) => (
              <TouchableOpacity
                key={filter.id}
                style={[styles.tab, mainFilter === filter.id && styles.tabActive]}
                onPress={() => setMainFilter(filter.id)}
              >
                <Text style={[styles.tabLabel, mainFilter === filter.id && styles.tabLabelActive]}>{filter.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {renderStatistics()}
          <View style={styles.chartContainer}>
            {loading ? (
              null
            ) : chartData && chartData.datasets[0].data.some(val => val > 0) ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <BarChart
                  data={chartData}
                  width={Math.max(screenWidth - 32, chartData.labels.length * 60)}
                  height={240}
                  chartConfig={{
                    backgroundColor: '#ffffff',
                    backgroundGradientFrom: '#ffffff',
                    backgroundGradientTo: '#ffffff',
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
                    style: { borderRadius: 16 },
                    propsForLabels: { fontSize: 11 },
                    barPercentage: 0.7,
                  }}
                  style={styles.chart}
                  showValuesOnTopOfBars={true}
                  fromZero={true}
                  withInnerLines={false}
                />
              </ScrollView>
            ) : (
              <View style={styles.noChartData}>
                <Ionicons name="bar-chart-outline" size={48} color="#CBD5E1" />
                <Text style={styles.noChartText}>No data available for chart</Text>
              </View>
            )}
          </View>
        </View>

        {/* Logs List section */}
        <View style={styles.logsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Water Logs List</Text>
          </View>
          {mainFilter === 'custom' && (
            <View style={styles.customDateContainer}>
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => setShowStartDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={18} color="#2563EB" />
                <Text style={styles.datePickerText}>
                  {customStartDate ? new Date(customStartDate).toLocaleDateString('en-US') : 'From Date'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => setShowEndDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={18} color="#2563EB" />
                <Text style={styles.datePickerText}>
                  {customEndDate ? new Date(customEndDate).toLocaleDateString('en-US') : 'To Date'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
          {loading ? (
            <ShimmerPlaceholder style={{height: 260, borderRadius: 16, width: '100%', marginTop: 16,}} />
          ) : (!loading && logs.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="water-outline" size={64} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No Water Logs Found</Text>
              <Text style={styles.emptyText}>
                {searchTerm 
                  ? `No logs found matching "${searchTerm}"` 
                  : "No logs found for this period."
                }
              </Text>
            </View>
          ) : logs.map((item) => {
            let dateVN = null;
            let timeVN = null;
            if (item.consumptionDate) {
              if (typeof item.consumptionDate === 'string') {
                dateVN = dayjs.tz(item.consumptionDate, 'Asia/Ho_Chi_Minh');
                if (!dateVN.isValid()) {
                  dateVN = dayjs.tz(item.consumptionDate + ' 00:00:00', 'Asia/Ho_Chi_Minh');
                }
              } else {
                dateVN = dayjs(item.consumptionDate).tz('Asia/Ho_Chi_Minh');
              }
            }
            if (item.recordedAt) {
              let recordedAtStr = item.recordedAt;
              if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(recordedAtStr)) {
                recordedAtStr += 'Z';
              }
              timeVN = dayjs(recordedAtStr).tz('Asia/Ho_Chi_Minh');
            }
            const formattedDate = dateVN && dateVN.isValid() ? dateVN.format('MMM D, YYYY') : '';
            const formattedTime = timeVN && timeVN.isValid() ? timeVN.format('hh:mm A') : '';
            return (
              <View key={item.logId} style={styles.logCard}>
                <View style={styles.logCardHeader}>
                  <View style={styles.dateTimeContainer}>
                    <Text style={styles.logDate}>{formattedDate}</Text>
                    <Text style={styles.logTime}>{formattedTime ? `Time Update: ${formattedTime}` : ''}</Text>
                  </View>
                  <View style={styles.amountDisplay}>
                    <Ionicons name="water" size={24} color="#2563EB" />
                    <Text style={styles.amountValue}>{item.amountMl || 0} ml</Text>
                  </View>
                </View>
                {item.notes && (
                  <View style={styles.notesSection}>
                    <Ionicons name="document-text" size={16} color="#64748B" />
                    <Text style={styles.notesText} numberOfLines={2}>
                      {item.notes}
                    </Text>
                  </View>
                )}
              </View>
            );
          }))}
        </View>

        {/* Date Pickers */}
        {renderDatePicker(true)}
        {renderDatePicker(false)}
      </ScrollView>
    </SafeAreaView>
  );

  
}

const styles = StyleSheet.create({
  safeArea: {
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  tabActive: {
    backgroundColor: "#2563EB",
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
  },
  tabLabelActive: {
    color: "#ffffff",
  },
    paddingHorizontal: 16,
    gap: 8,
  },
  
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#111827",
    paddingVertical: 4,
  },

  // Sections
  chartSection: {
    backgroundColor: "#FFFFFF",
    marginTop: 8,
    paddingBottom: 16,
  },
  
  logsSection: {
    backgroundColor: "#FFFFFF",
    marginTop: 8,
    paddingBottom: 16,
  },
  
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },

  // Filter Tabs
  filterTabs: {
    paddingVertical: 12,
  },
  
  filterTabsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 16,
    gap: 8,
  },
  
  filterTab: {
    paddingVertical: 10,
    paddingHorizontal: 0,
    borderRadius: 6,
    backgroundColor: "#F1F5F9",
    minWidth: 0,
    alignItems: "center",
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  
  filterTabActive: {
    backgroundColor: "#2563EB",
  },
  
  filterTabText: {
    color: "#64748B",
    fontWeight: "600",
    fontSize: 14,
  },
  
  filterTabTextActive: {
    color: "#FFFFFF",
  },

  // Custom Date
  customDateContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  
  datePickerButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 8,
  },
  
  datePickerText: {
    color: "#374151",
    fontSize: 14,
    fontWeight: "500",
  },

  // Statistics
  statisticsContainer: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  
  statCard: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: "center",
    // Removed borderWidth and borderColor to eliminate blue border
  },
  
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2563EB",
  },
  
  statLabel: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 4,
    textAlign: "center",
  },

  // Chart
  chartContainer: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  
  chart: {
    borderRadius: 16,
  },
  
  chartLoadingContainer: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 12,
  },
  
  noChartData: {
    alignItems: "center",
    paddingVertical: 60,
  },
  
  noChartText: {
    color: "#64748B",
    fontSize: 14,
    marginTop: 8,
  },

  // Logs
  logsContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  
  logCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginBottom: 12,
    padding: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  
  logCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  
  dateTimeContainer: {
    flex: 1,
  },
  
  logDate: {
    fontSize: 16,
    color: "#2563EB",
    fontWeight: "700",
  },
  
  logTime: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
  },
  
  amountDisplay: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  
  amountValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2563EB",
  },
  
  notesSection: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 12,
    gap: 8,
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 8,
  },
  
  notesText: {
    color: "#64748B",
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },

  // Loading & Empty States
  loadingContainer: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 12,
  },
  
  loadingText: {
    color: "#64748B",
    fontSize: 14,
  },
  
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2563EB",
    marginTop: 16,
    textAlign: "center",
  },
  
  emptyText: {
    fontSize: 15,
    color: "#64748B",
    marginTop: 8,
    textAlign: "center",
    lineHeight: 22,
  },

  // Date Picker Modal
  datePickerOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  
  datePickerModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    minWidth: 320,
    maxWidth: '90%',
  },
  
  datePickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  
  datePickerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
    gap: 16,
  },
  
  cancelButtonText: {
    color: '#EF4444',
    fontWeight: '600',
    fontSize: 16,
  },
  
  confirmButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  
  confirmButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  }, 
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    paddingHorizontal: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  tabActive: {
    backgroundColor: "#2563EB",
    shadowColor: "#2563EB",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
  },
  tabLabelActive: {
    color: "#ffffff",
  },
});