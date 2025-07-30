import React,{ useState,useEffect } from "react";
import ShimmerPlaceholder from "components/shimmer/ShimmerPlaceholder";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import isoWeek from "dayjs/plugin/isoWeek";
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
  RefreshControl,
} from "react-native";
import { showErrorFetchAPI } from "utils/toastUtil";
import { Ionicons } from "@expo/vector-icons";
import { BarChart } from "react-native-chart-kit";
import Header from "components/Header";
import { apiUserWaterLogService } from "services/apiUserWaterLogService";
import { useAuth } from "context/AuthContext";
import DateTimePicker from "@react-native-community/datetimepicker";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
dayjs.extend(isoWeek);

const { width: screenWidth } = Dimensions.get("window");

const CHART_FILTERS = [
  { id: "daily",label: "Daily",type: "day",days: 1,groupBy: "day" },
  { id: "weekly",label: "Weekly",type: "week",days: 7,groupBy: "week" },
  { id: "monthly",label: "Monthly",type: "month",months: 1,groupBy: "month" },
  { id: "custom",label: "Custom",type: "custom",groupBy: "day" },
];

const PlatformSpecificDatePicker = (props) => <DateTimePicker {...props} />;

const WaterLogAnalyticsScreen = ({ navigation }) => {
  const { user,authToken } = useAuth();
  const [searchTerm,setSearchTerm] = useState("");
  const [showSearchInput,setShowSearchInput] = useState(false);
  const [mainFilter,setMainFilter] = useState("daily");
  const [chartData,setChartData] = useState(null);
  const [logs,setLogs] = useState([]);
  const [loading,setLoading] = useState(true);
  const [chartLoading,setChartLoading] = useState(false);
  const [totalAmount,setTotalAmount] = useState(0);
  const [averageAmount,setAverageAmount] = useState(0);
  const [totalLogs,setTotalLogs] = useState(0);
  const [customStartDate,setCustomStartDate] = useState(null);
  const [customEndDate,setCustomEndDate] = useState(null);
  const [showStartDatePicker,setShowStartDatePicker] = useState(false);
  const [showEndDatePicker,setShowEndDatePicker] = useState(false);
  const [tempStartDate,setTempStartDate] = useState(null);
  const [tempEndDate,setTempEndDate] = useState(null);
  const [selectedPeriodIndex,setSelectedPeriodIndex] = useState(0);
  const [refreshing,setRefreshing] = useState(false);

  // Initialize default dates for Custom filter
  const getDefaultCustomDates = () => {
    const nowVN = dayjs().tz("Asia/Ho_Chi_Minh");
    const defaultEndDate = nowVN.endOf("day").toDate();
    const defaultStartDate = nowVN.subtract(2,"day").startOf("day").toDate();
    return { defaultStartDate,defaultEndDate };
  };

  useEffect(() => {
    let vietnamDate = "";
    try {
      vietnamDate = new Date().toLocaleDateString("en-CA",{
        timeZone: "Asia/Ho_Chi_Minh",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    } catch (e) { }
    let userId = null;
    if (user && typeof user === "object") {
      userId = user.id || user._id || user.userId;
    }
    const key = userId ? `waterTarget_${userId}` : "waterTarget";
    const saved = typeof window !== "undefined" && window.localStorage ? localStorage.getItem(key) : null;
  },[user]);

  useEffect(() => {
    if (showStartDatePicker) {
      const { defaultStartDate } = getDefaultCustomDates();
      setTempStartDate(customStartDate || defaultStartDate);
    }
  },[showStartDatePicker,customStartDate]);

  useEffect(() => {
    if (showEndDatePicker) {
      const { defaultEndDate } = getDefaultCustomDates();
      setTempEndDate(customEndDate || defaultEndDate);
    }
  },[showEndDatePicker,customEndDate]);

  useEffect(() => {
    fetchChartData();
    fetchLogs();
  },[mainFilter,searchTerm,customStartDate,customEndDate,user,authToken]);

  const fetchChartData = async () => {
    setChartLoading(true);
    try {
      const filterObj = CHART_FILTERS.find((f) => f.id === mainFilter) || CHART_FILTERS[0];
      let startDate,endDate;
      if (mainFilter === "custom") {
        const { defaultStartDate,defaultEndDate } = getDefaultCustomDates();
        startDate = customStartDate ? new Date(customStartDate) : defaultStartDate;
        startDate.setHours(0,0,0,0);
        endDate = customEndDate ? new Date(customEndDate) : defaultEndDate;
        endDate.setHours(23,59,59,999);
      } else if (filterObj.id === "daily") {
        const nowUTC = dayjs.utc();
        const nowVN = nowUTC.add(7,"hour");
        startDate = nowVN.startOf("day").toDate();
        endDate = nowVN.endOf("day").toDate();
      } else if (filterObj.id === "weekly") {
        endDate = new Date();
        endDate.setHours(23,59,59,999);
        startDate = new Date();
        startDate.setDate(endDate.getDate() - 6);
        startDate.setHours(0,0,0,0);
      } else if (filterObj.id === "monthly") {
        endDate = new Date();
        endDate.setHours(23,59,59,999);
        startDate = new Date(endDate.getFullYear(),endDate.getMonth(),1);
        startDate.setHours(0,0,0,0);
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
        generateChartData(records,filterObj,startDate,endDate);
      } else {
        setChartData(null);
      }
    } catch (error) {
      setChartData(null);
      showErrorFetchAPI(error);
    } finally {
      setChartLoading(false);
    }
  };

  const generateChartData = (records,filterObj,startDate,endDate) => {
    let labels = [];
    let data = [];
    let periods = [];

    if (filterObj.id === "daily") {
      const grouped = {};
      records.forEach((log) => {
        let dVN;
        if (typeof log.consumptionDate === "string") {
          dVN = dayjs.tz(log.consumptionDate,"Asia/Ho_Chi_Minh");
          if (!dVN.isValid()) dVN = dayjs.tz(log.consumptionDate + " 00:00:00","Asia/Ho_Chi_Minh");
        } else {
          dVN = dayjs(log.consumptionDate).tz("Asia/Ho_Chi_Minh");
        }
        if (dVN.isValid()) {
          const key = dVN.format("YYYY-MM-DD");
          if (!grouped[key]) grouped[key] = 0;
          grouped[key] += log.amountMl || 0;
          periods.push({ key,amount: grouped[key] });
        }
      });
      const sortedDays = Object.keys(grouped).sort((a,b) => dayjs(a).unix() - dayjs(b).unix());
      periods = sortedDays.map((key) => ({ key,amount: grouped[key] }));
      labels = periods.map((p) => dayjs(p.key).format("DD/MM"));
      data = periods.map((p) => p.amount);
    } else if (filterObj.id === "weekly") {
      const grouped = {};
      records.forEach((log) => {
        let dVN;
        if (typeof log.consumptionDate === "string") {
          dVN = dayjs.tz(log.consumptionDate,"Asia/Ho_Chi_Minh");
          if (!dVN.isValid()) dVN = dayjs.tz(log.consumptionDate + " 00:00:00","Asia/Ho_Chi_Minh");
        } else {
          dVN = dayjs(log.consumptionDate).tz("Asia/Ho_Chi_Minh");
        }
        if (dVN.isValid()) {
          const weekYear = dVN.isoWeekYear();
          const weekNum = dVN.isoWeek();
          const key = `${weekYear}-W${weekNum}`;
          if (!grouped[key]) grouped[key] = { total: 0,weekNum,weekYear };
          grouped[key].total += log.amountMl || 0;
        }
      });
      const sortedWeeks = Object.keys(grouped).sort((a,b) => {
        const [yA,wA] = a.split("-W");
        const [yB,wB] = b.split("-W");
        if (yA !== yB) return parseInt(yA) - parseInt(yB);
        return parseInt(wA) - parseInt(wB);
      });
      periods = sortedWeeks.map((key) => ({ key,amount: grouped[key].total }));
      labels = periods.map((p) => {
        const [year,week] = p.key.split("-W");
        try {
          const monday = dayjs().isoWeekYear(parseInt(year)).isoWeek(parseInt(week)).startOf("isoWeek");
          return `W${week}`;
        } catch (e) {
          return p.key;
        }
      });
      data = periods.map((p) => p.amount);
    } else if (filterObj.id === "monthly") {
      const grouped = {};
      records.forEach((log) => {
        let dVN;
        if (typeof log.consumptionDate === "string") {
          dVN = dayjs.tz(log.consumptionDate,"Asia/Ho_Chi_Minh");
          if (!dVN.isValid()) dVN = dayjs.tz(log.consumptionDate + " 00:00:00","Asia/Ho_Chi_Minh");
        } else {
          dVN = dayjs(log.consumptionDate).tz("Asia/Ho_Chi_Minh");
        }
        if (dVN.isValid()) {
          const key = dVN.format("YYYY-MM");
          if (!grouped[key]) grouped[key] = 0;
          grouped[key] += log.amountMl || 0;
        }
      });
      const sortedMonths = Object.keys(grouped).sort((a,b) => dayjs(a).unix() - dayjs(b).unix());
      periods = sortedMonths.map((key) => ({ key,amount: grouped[key] }));
      labels = periods.map((p) => dayjs(p.key + "-01").format("MMM YY"));
      data = periods.map((p) => p.amount);
    } else if (filterObj.id === "custom") {
      const grouped = {};
      records.forEach((log) => {
        let dVN;
        if (typeof log.consumptionDate === "string") {
          dVN = dayjs.tz(log.consumptionDate,"Asia/Ho_Chi_Minh");
          if (!dVN.isValid()) dVN = dayjs.tz(log.consumptionDate + " 00:00:00","Asia/Ho_Chi_Minh");
        } else {
          dVN = dayjs(log.consumptionDate).tz("Asia/Ho_Chi_Minh");
        }
        if (dVN.isValid()) {
          const key = dVN.format("YYYY-MM-DD");
          if (!grouped[key]) grouped[key] = 0;
          grouped[key] += log.amountMl || 0;
        }
      });
      const sortedDays = Object.keys(grouped).sort((a,b) => dayjs(a).unix() - dayjs(b).unix());
      periods = sortedDays.map((key) => ({ key,amount: grouped[key] }));
      labels = periods.map((p) => dayjs(p.key).format("DD/MM"));
      data = periods.map((p) => p.amount);
    }

    const maxPoints = screenWidth < 400 ? 8 : 10;
    if (labels.length > maxPoints) {
      labels = labels.slice(-maxPoints);
      data = data.slice(-maxPoints);
      periods = periods.slice(-maxPoints);
    }

    setChartData({
      labels,
      datasets: [{ data: data.length > 0 ? data : [0] }],
      periods,
    });
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let startDate,endDate;
      if (mainFilter === "custom") {
        const { defaultStartDate,defaultEndDate } = getDefaultCustomDates();
        startDate = customStartDate ? new Date(customStartDate) : defaultStartDate;
        startDate.setHours(0,0,0,0);
        endDate = customEndDate ? new Date(customEndDate) : defaultEndDate;
        endDate.setHours(23,59,59,999);
      } else if (mainFilter === "daily") {
        const nowUTC = dayjs.utc();
        const nowVN = nowUTC.add(7,"hour");
        startDate = nowVN.startOf("day").toDate();
        endDate = nowVN.endOf("day").toDate();
      } else if (mainFilter === "weekly") {
        endDate = new Date();
        endDate.setHours(23,59,59,999);
        startDate = new Date();
        startDate.setDate(endDate.getDate() - 6);
        startDate.setHours(0,0,0,0);
      } else if (mainFilter === "monthly") {
        endDate = new Date();
        endDate.setHours(23,59,59,999);
        startDate = new Date(endDate.getFullYear(),endDate.getMonth(),1);
        startDate.setHours(0,0,0,0);
      } else {
        const nowUTC = dayjs.utc();
        const nowVN = nowUTC.add(7,"hour");
        startDate = nowVN.startOf("day").toDate();
        endDate = nowVN.endOf("day").toDate();
      }
      const queryParams = {
        pageNumber: 1,
        pageSize: 1000,
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
        status: "active",
        searchTerm: searchTerm.trim() ? searchTerm.trim() : undefined,
      };
      Object.keys(queryParams).forEach((key) => queryParams[key] === undefined && delete queryParams[key]);
      const response = await apiUserWaterLogService.getMyWaterLogs(queryParams);
      if (response?.statusCode === 200 && response?.data) {
        let records = response.data.records || [];
        setLogs(records);
        const total = records.reduce((sum,log) => sum + (log.amountMl || 0),0);
        setTotalAmount(total);
        setTotalLogs(records.length);
        setAverageAmount(records.length > 0 ? Math.round(total / records.length) : 0);
      } else {
        setLogs([]);
        setTotalAmount(0);
        setTotalLogs(0);
        setAverageAmount(0);
      }
    } catch (error) {
      setLogs([]);
      setTotalAmount(0);
      setTotalLogs(0);
      setAverageAmount(0);
      showErrorFetchAPI(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchChartData();
    fetchLogs();
  };

  const renderSearchBar = () => (
    <View style={styles.searchBarContainer}>
      {!showSearchInput ? (
        <TouchableOpacity style={styles.searchToggleButton} onPress={() => setShowSearchInput(true)}>
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
          <TouchableOpacity
            onPress={() => {
              setSearchTerm("");
              setShowSearchInput(false);
            }}
          >
            <Ionicons name="close-circle" size={16} color="#EF4444" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderStatistics = () => {
    const selectedPeriod = chartData?.periods?.[selectedPeriodIndex] || { amount: 0 };
    const total = chartData?.periods?.reduce((sum,p) => sum + p.amount,0) || 0;
    const average = chartData?.periods?.length > 0 ? Math.round(total / chartData.periods.length) : 0;

    return (
      <View style={styles.statisticsContainer}>
        {loading ? (
          <>
            <ShimmerPlaceholder style={{ flex: 1,height: 80,borderRadius: 12 }} />
            <ShimmerPlaceholder style={{ flex: 1,height: 80,borderRadius: 12 }} />
            <ShimmerPlaceholder style={{ flex: 1,height: 80,borderRadius: 12 }} />
          </>
        ) : (
          <>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{totalLogs}</Text>
              <Text style={styles.statLabel}>Total Logs</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{selectedPeriod.amount.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Total (ml)</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{average.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Average (ml)</Text>
            </View>
          </>
        )}
      </View>
    );
  };

  const renderChart = () => (
    <View style={styles.chartSection}>
      <View style={styles.tabContainer}>
        {CHART_FILTERS.map((filter) => (
          <TouchableOpacity
            key={filter.id}
            style={[styles.tab,mainFilter === filter.id && styles.tabActive]}
            onPress={() => {
              setMainFilter(filter.id);
              setSelectedPeriodIndex(0);
              if (filter.id === "custom") {
                const { defaultStartDate,defaultEndDate } = getDefaultCustomDates();
                if (!customStartDate) setCustomStartDate(defaultStartDate);
                if (!customEndDate) setCustomEndDate(defaultEndDate);
              }
            }}
          >
            <Text style={[styles.tabLabel,mainFilter === filter.id && styles.tabLabelActive]}>
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {mainFilter !== "custom" && (
        <View style={styles.periodSelector}>
          <Text style={styles.periodSelectorTitle}>Select Period</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {chartData?.periods?.map((item,index) => (
              <TouchableOpacity
                key={item.key}
                style={[styles.periodItem,selectedPeriodIndex === index && styles.periodItemActive]}
                onPress={() => setSelectedPeriodIndex(index)}
              >
                <Text
                  style={[
                    styles.periodItemText,
                    selectedPeriodIndex === index && styles.periodItemTextActive,
                  ]}
                >
                  {mainFilter === "daily"
                    ? dayjs(item.key).format("MMM DD, YYYY")
                    : mainFilter === "weekly"
                      ? `Week ${item.key.split("-W")[1]}`
                      : dayjs(item.key + "-01").format("MMM YYYY")}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
      {renderStatistics()}
      <View style={styles.chartContainer}>
        {chartLoading ? (
          <ShimmerPlaceholder style={{ height: 240,borderRadius: 16,width: "100%" }} />
        ) : chartData && chartData.datasets[0].data.some((val) => val > 0) ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <BarChart
              data={chartData}
              width={Math.max(screenWidth - 32,chartData.labels.length * 60)}
              height={240}
              chartConfig={{
                backgroundColor: "#ffffff",
                backgroundGradientFrom: "#ffffff",
                backgroundGradientTo: "#ffffff",
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

  const renderDatePicker = (isStart) => {
    const isVisible = isStart ? showStartDatePicker : showEndDatePicker;
    const tempDate = isStart ? tempStartDate : tempEndDate;
    const currentDate = isStart ? customStartDate : customEndDate;
    const { defaultStartDate,defaultEndDate } = getDefaultCustomDates();

    if (!isVisible) return null;

    return (
      <View style={styles.datePickerOverlay}>
        <View style={styles.datePickerModal}>
          <Text style={styles.datePickerTitle}>{isStart ? "Select Start Date" : "Select End Date"}</Text>
          <PlatformSpecificDatePicker
            value={tempDate || (isStart ? defaultStartDate : defaultEndDate)}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={(_,selectedDate) => {
              if (selectedDate) {
                if (isStart) {
                  setTempStartDate(selectedDate);
                } else {
                  setTempEndDate(selectedDate);
                }
              }
            }}
            maximumDate={isStart ? (customEndDate || defaultEndDate) : undefined}
            minimumDate={!isStart ? (customStartDate || defaultStartDate) : undefined}
          />
          <View style={styles.datePickerActions}>
            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={() => {
                if (isStart) {
                  setShowStartDatePicker(false);
                  setTempStartDate(customStartDate || defaultStartDate);
                } else {
                  setShowEndDatePicker(false);
                  setTempEndDate(customEndDate || defaultEndDate);
                }
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.datePickerButton,styles.confirmButton]}
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

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header title="Water Analytics" onBack={() => navigation.goBack()} />
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#2563EB"]}
              tintColor={"#2563EB"}
            />
          }
        >
          <View style={styles.searchBarContainer}>
            <ShimmerPlaceholder style={{ height: 40,borderRadius: 12,width: "100%" }} />
          </View>
          <View style={styles.chartSection}>
            <ShimmerPlaceholder style={{ height: 40,borderRadius: 12,marginBottom: 20 }} />
            <ShimmerPlaceholder style={{ height: 40,borderRadius: 8,marginBottom: 20 }} />
            <View style={{ flexDirection: "row",gap: 12,marginBottom: 24,marginHorizontal: 16 }}>
              <ShimmerPlaceholder style={{ flex: 1,height: 80,borderRadius: 12 }} />
              <ShimmerPlaceholder style={{ flex: 1,height: 80,borderRadius: 12 }} />
              <ShimmerPlaceholder style={{ flex: 1,height: 80,borderRadius: 12 }} />
            </View>
            <View style={{ marginHorizontal: 16 }}>
              <ShimmerPlaceholder style={{ height: 240,borderRadius: 16,marginBottom: 24,width: "100%" }} />
            </View>
          </View>
          <View style={styles.logsSection}>
            <ShimmerPlaceholder style={{ height: 24,width: 150,borderRadius: 8,marginBottom: 16,marginHorizontal: 16 }} />
            <View style={styles.logsWrapper}>
              <ShimmerPlaceholder style={{ height: 60,borderRadius: 8,marginBottom: 12,marginHorizontal: 16 }} />
              <ShimmerPlaceholder style={{ height: 60,borderRadius: 8,marginBottom: 12,marginHorizontal: 16 }} />
              <ShimmerPlaceholder style={{ height: 60,borderRadius: 8,marginHorizontal: 16 }} />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Water Analytics" onBack={() => navigation.goBack()} />
      {renderSearchBar()}
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#2563EB"]}
            tintColor={"#2563EB"}
          />
        }
      >
        {renderChart()}
        <View style={styles.logsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent History</Text>
          </View>
          {mainFilter === "custom" && (
            <View style={styles.customDateContainer}>
              <TouchableOpacity style={styles.datePickerButton} onPress={() => setShowStartDatePicker(true)}>
                <Ionicons name="calendar-outline" size={18} color="#2563EB" />
                <Text style={styles.datePickerText}>
                  {customStartDate
                    ? new Date(customStartDate).toLocaleDateString("en-US")
                    : getDefaultCustomDates().defaultStartDate.toLocaleDateString("en-US")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.datePickerButton} onPress={() => setShowEndDatePicker(true)}>
                <Ionicons name="calendar-outline" size={18} color="#2563EB" />
                <Text style={styles.datePickerText}>
                  {customEndDate
                    ? new Date(customEndDate).toLocaleDateString("en-US")
                    : getDefaultCustomDates().defaultEndDate.toLocaleDateString("en-US")}
                </Text>
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.logsWrapper}>
            <ScrollView
              style={styles.logsList}
              contentContainerStyle={styles.logsListContent}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}
            >
              {logs.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="water-outline" size={64} color="#CBD5E1" />
                  <Text style={styles.emptyTitle}>No Water Logs Found</Text>
                  <Text style={styles.emptyText}>
                    {searchTerm ? `No logs found matching "${searchTerm}"` : "No logs found for this period."}
                  </Text>
                </View>
              ) : (
                logs.map((item) => {
                  let dateVN = null;
                  let timeVN = null;
                  if (item.consumptionDate) {
                    if (typeof item.consumptionDate === "string") {
                      dateVN = dayjs.tz(item.consumptionDate,"Asia/Ho_Chi_Minh");
                      if (!dateVN.isValid()) {
                        dateVN = dayjs.tz(item.consumptionDate + " 00:00:00","Asia/Ho_Chi_Minh");
                      }
                    } else {
                      dateVN = dayjs(item.consumptionDate).tz("Asia/Ho_Chi_Minh");
                    }
                  }
                  if (item.recordedAt) {
                    let recordedAtStr = item.recordedAt;
                    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(recordedAtStr)) {
                      recordedAtStr += "Z";
                    }
                    timeVN = dayjs(recordedAtStr).tz("Asia/Ho_Chi_Minh");
                  }
                  const formattedDate = dateVN && dateVN.isValid() ? dateVN.format("MMM D, YYYY") : "";
                  const formattedTime = timeVN && timeVN.isValid() ? timeVN.format("hh:mm A") : "";
                  return (
                    <View key={item.logId} style={styles.logCard}>
                      <View style={styles.logCardHeader}>
                        <View style={styles.dateTimeContainer}>
                          <Text style={styles.logDate}>{formattedDate}</Text>
                          <Text style={styles.logTime}>{formattedTime ? `Time Update: ${formattedTime}` : ""}</Text>
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
                })
              )}
            </ScrollView>
          </View>
        </View>
        {renderDatePicker(true)}
        {renderDatePicker(false)}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    marginTop: 10
  },
  searchBarContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  searchToggleButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 8,
  },
  searchToggleText: {
    color: "#64748B",
    fontSize: 14,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#111827",
    paddingVertical: 8,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 2 },
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
    shadowOffset: { width: 0,height: 2 },
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
  periodSelector: {
    marginBottom: 20,
  },
  periodSelectorTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2C3E50",
    marginBottom: 8,
  },
  periodItem: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    marginRight: 8,
  },
  periodItemActive: {
    backgroundColor: "#2563EB",
  },
  periodItemText: {
    fontSize: 14,
    color: "#2C3E50",
  },
  periodItemTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  chartSection: {
    backgroundColor: "#FFFFFF",
    marginTop: 8,
    paddingBottom: 16,
    borderRadius: 16,
  },
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
  chartContainer: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  chart: {
    borderRadius: 16,
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
  logsSection: {
    backgroundColor: "#FFFFFF",
    marginTop: 8,
    paddingBottom: 16,
    borderRadius: 16,
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
  logsWrapper: {
    height: 300,
    marginHorizontal: 16,
    overflow: "hidden",
  },
  logsList: {
    flex: 1,
  },
  logsListContent: {
    paddingBottom: 16,
  },
  logCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginBottom: 12,
    padding: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 2 },
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
  datePickerOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  datePickerModal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    minWidth: 320,
    maxWidth: "90%",
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 16,
    textAlign: "center",
  },
  datePickerActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 20,
    gap: 16,
  },
  cancelButtonText: {
    color: "#EF4444",
    fontWeight: "600",
    fontSize: 16,
  },
  confirmButton: {
    backgroundColor: "#2563EB",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  confirmButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
  },
});

export default WaterLogAnalyticsScreen;