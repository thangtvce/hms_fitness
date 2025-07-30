import React,{ useEffect,useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Modal,
  StyleSheet,
  Dimensions,
  Alert,
} from "react-native";
import { showErrorFetchAPI,showErrorMessage,showSuccessMessage } from "utils/toastUtil";

import { LinearGradient } from "expo-linear-gradient";
import { LineChart,BarChart,PieChart } from "react-native-chart-kit";
import { foodService } from "services/apiFoodService";
import dayjs from "dayjs";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import Header from "components/Header";
import Loading from "components/Loading";

import Icon from "react-native-vector-icons/MaterialIcons";
import IconCommunity from "react-native-vector-icons/MaterialCommunityIcons";
import IconFeather from "react-native-vector-icons/Feather";
import CommonSkeleton from "components/CommonSkeleton/CommonSkeleton";

const { width } = Dimensions.get("window");

const MEAL_TYPES = ["Breakfast","Lunch","Dinner","Other"];
const TIME_PERIODS = [
  { key: "7d",label: "7D",days: 7 },
  { key: "1m",label: "1M",days: 30 },
  { key: "3m",label: "3M",days: 90 },
  { key: "6m",label: "6M",days: 180 },
  { key: "1y",label: "1Y",days: 365 },
];

const FoodLogHistoryScreen = ({ navigation }) => {
  const [logs,setLogs] = useState([]);
  const [loading,setLoading] = useState(true);
  const [activeTab,setActiveTab] = useState("overview");
  const [showFilters,setShowFilters] = useState(false);
  const [expandedDays,setExpandedDays] = useState({});
  const [selectedTimePeriod,setSelectedTimePeriod] = useState("7d");
  const [filteredLogs,setFilteredLogs] = useState([]);

  const [filters,setFilters] = useState({
    pageNumber: 1,
    pageSize: 30,
    startDate: "",
    endDate: "",
    searchTerm: "",
    mealType: "",
    minCalories: "",
    maxCalories: "",
  });

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await foodService.getMyNutritionLogs({
        pageNumber: filters.pageNumber,
        pageSize: filters.pageSize,
      });
      if (res.statusCode === 200) {
        setLogs(res.data.nutritionLogs || []);
      } else {
        setLogs([]);
      }
    } catch (e) {
      showErrorFetchAPI(e);
      setLogs([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  },[]);
  useFocusEffect(
    React.useCallback(() => {
      fetchLogs();
    },[filters.pageNumber,filters.pageSize])
  );

  useEffect(() => {
    applyFilters();
  },[logs,filters]);

  const applyFilters = () => {
    let filtered = [...logs];

    if (filters.startDate) {
      filtered = filtered.filter((log) =>
        dayjs(log.consumptionDate).isAfter(dayjs(filters.startDate).subtract(1,"day"))
      );
    }

    if (filters.endDate) {
      filtered = filtered.filter((log) => dayjs(log.consumptionDate).isBefore(dayjs(filters.endDate).add(1,"day")));
    }

    if (filters.searchTerm) {
      filtered = filtered.filter((log) => log.foodName.toLowerCase().includes(filters.searchTerm.toLowerCase()));
    }

    if (filters.mealType) {
      filtered = filtered.filter((log) => log.mealType === filters.mealType);
    }

    if (filters.minCalories) {
      filtered = filtered.filter((log) => (log.calories || 0) >= Number.parseInt(filters.minCalories));
    }

    if (filters.maxCalories) {
      filtered = filtered.filter((log) => (log.calories || 0) <= Number.parseInt(filters.maxCalories));
    }

    setFilteredLogs(filtered);
  };

  const handleDeleteDayLog = async (date) => {
    const dayLogs = [];
    MEAL_TYPES.forEach((meal) => {
      grouped[date][meal].forEach((log) => dayLogs.push(log));
    });

    Alert.alert(
      "Delete Day Log",
      `Are you sure you want to delete all food logs for ${dayjs(date).format("MMM DD, YYYY")}? This will remove ${dayLogs.length
      } food entries.`,
      [
        { text: "Cancel",style: "cancel" },
        {
          text: "Delete All",
          style: "destructive",
          onPress: async () => {
            try {
              const deletePromises = dayLogs.map((log) => {
                const logId = log.logId || log.id;
                return foodService
                  .deleteNutritionLog(logId)
                  .then((res) => res)
                  .catch((err) => {
                    throw err;
                  });
              });

              const results = await Promise.allSettled(deletePromises);
              const allSuccess = results.every(
                (r) => r.status === "fulfilled" && (!r.value || r.value.statusCode === 200)
              );

              if (allSuccess) {
                showSuccessMessage(`All food logs for ${dayjs(date).format("MMM DD, YYYY")} have been deleted!`);
              } else {
                showErrorMessage(`Some logs may not have been deleted. Check console for details.`);
              }

              fetchLogs();
            } catch (error) {
              showErrorFetchAPI(error);
            }
          },
        },
      ]
    );
  };

  const handleViewDayDetails = (date,dayStats) => {
    navigation.navigate("DayDetailsScreen",{ date,dayStats,grouped: grouped[date],onRefresh: fetchLogs });
  };

  const toggleDayExpansion = (date) => {
    setExpandedDays((prev) => ({
      ...prev,
      [date]: !prev[date],
    }));
  };

  // Group logs by date and meal type, aggregating by foodId and foodName
  const grouped = {};
  filteredLogs.forEach((log) => {
    const date = log.consumptionDate;
    const meal = MEAL_TYPES.includes(log.mealType) ? log.mealType : "Other";
    if (!grouped[date]) {
      grouped[date] = { Breakfast: [],Lunch: [],Dinner: [],Other: [] };
    }

    const mealLogs = grouped[date][meal];
    const existingLog = mealLogs.find(
      (l) => l.foodId === log.foodId && l.foodName === log.foodName
    );

    if (existingLog) {
      existingLog.logIds.push(log.logId || log.id);
      existingLog.quantity = (existingLog.quantity || 1) + (log.quantity || 1);
      existingLog.calories += log.calories || 0;
      existingLog.protein += log.protein || 0;
      existingLog.carbs += log.carbs || 0;
      existingLog.fats += log.fats || 0;
      existingLog.count += 1;
      if (log.satisfactionRating) {
        existingLog.satisfactionRating = log.satisfactionRating;
        existingLog.notes = log.notes || "";
      }
    } else {
      mealLogs.push({
        ...log,
        logIds: [log.logId || log.id],
        quantity: log.quantity || 1,
        count: 1,
      });
    }
  });

  const calculateDailyStats = () => {
    const dailyStats = {};
    Object.keys(grouped).forEach((date) => {
      const dayData = grouped[date];
      let totalCalories = 0;
      let totalProtein = 0;
      let totalCarbs = 0;
      let totalFats = 0;

      MEAL_TYPES.forEach((meal) => {
        dayData[meal].forEach((log) => {
          totalCalories += log.calories || 0;
          totalProtein += log.protein || 0;
          totalCarbs += log.carbs || 0;
          totalFats += log.fats || 0;
        });
      });

      dailyStats[date] = {
        calories: totalCalories,
        protein: totalProtein,
        carbs: totalCarbs,
        fats: totalFats,
        meals: {
          breakfast: dayData.Breakfast.reduce((sum,log) => sum + (log.calories || 0),0),
          lunch: dayData.Lunch.reduce((sum,log) => sum + (log.calories || 0),0),
          dinner: dayData.Dinner.reduce((sum,log) => sum + (log.calories || 0),0),
          other: dayData.Other.reduce((sum,log) => sum + (log.calories || 0),0),
        },
      };
    });

    return dailyStats;
  };

  const dailyStats = calculateDailyStats();
  const sortedDates = Object.keys(dailyStats).sort((a,b) => dayjs(a).unix() - dayjs(b).unix());

  const getFilteredDataByPeriod = () => {
    const selectedPeriod = TIME_PERIODS.find((p) => p.key === selectedTimePeriod);
    const cutoffDate = dayjs().subtract(selectedPeriod.days,"day");

    return sortedDates.filter((date) => dayjs(date).isAfter(cutoffDate));
  };

  const filteredDatesByPeriod = getFilteredDataByPeriod();

  const chartDates = filteredDatesByPeriod.slice(-20);
  const chartData = {
    labels: chartDates.map((date) => dayjs(date).format("MM/DD")),
    datasets: [
      {
        data: chartDates.map((date) => dailyStats[date].calories),
        strokeWidth: 3,
        color: (opacity = 1) => `rgba(79, 70, 229, ${opacity})`,
      },
    ],
  };

  const proteinChartData = {
    labels: chartDates.map((date) => dayjs(date).format("MM/DD")),
    datasets: [
      {
        data: chartDates.map((date) => dailyStats[date].protein),
        strokeWidth: 3,
        color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
      },
    ],
  };

  const carbsChartData = {
    labels: chartDates.map((date) => dayjs(date).format("MM/DD")),
    datasets: [
      {
        data: chartDates.map((date) => dailyStats[date].carbs),
        strokeWidth: 3,
        color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
      },
    ],
  };

  const totalDays = filteredDatesByPeriod.length;
  const avgNutrition = {
    protein: Math.round(
      filteredDatesByPeriod.reduce((sum,date) => sum + dailyStats[date].protein,0) / totalDays || 0
    ),
    carbs: Math.round(
      filteredDatesByPeriod.reduce((sum,date) => sum + dailyStats[date].carbs,0) / totalDays || 0
    ),
    fats: Math.round(
      filteredDatesByPeriod.reduce((sum,date) => sum + dailyStats[date].fats,0) / totalDays || 0
    ),
  };

  const pieData = [
    {
      name: "Protein",
      population: avgNutrition.protein,
      color: "#EF4444",
      legendFontColor: "#374151",
      legendFontSize: 14,
    },
    {
      name: "Carbs",
      population: avgNutrition.carbs,
      color: "#22C55E",
      legendFontColor: "#374151",
      legendFontSize: 14,
    },
    {
      name: "Fats",
      population: avgNutrition.fats,
      color: "#F59E0B",
      legendFontColor: "#374151",
      legendFontSize: 14,
    },
  ];

  // Overall statistics
  const avgCalories =
    totalDays > 0
      ? filteredDatesByPeriod.reduce((sum,date) => sum + dailyStats[date].calories,0) / totalDays
      : 0;
  const maxCalories = Math.max(...filteredDatesByPeriod.map((date) => dailyStats[date].calories),0);
  const minCalories = Math.min(...filteredDatesByPeriod.map((date) => dailyStats[date].calories),0);

  // Calculate percentage changes
  const getPercentageChange = (current,previous) => {
    if (previous === 0) return 0;
    return (((current - previous) / previous) * 100).toFixed(1);
  };

  const currentPeriodAvg = avgCalories;
  const previousPeriodDates = sortedDates.filter((date) => {
    const selectedPeriod = TIME_PERIODS.find((p) => p.key === selectedTimePeriod);
    const cutoffDate = dayjs().subtract(selectedPeriod.days * 2,"day");
    const startDate = dayjs().subtract(selectedPeriod.days,"day");
    return dayjs(date).isAfter(cutoffDate) && dayjs(date).isBefore(startDate);
  });

  const previousPeriodAvg =
    previousPeriodDates.length > 0
      ? previousPeriodDates.reduce((sum,date) => sum + dailyStats[date].calories,0) /
      previousPeriodDates.length
      : 0;

  const caloriesChange = getPercentageChange(currentPeriodAvg,previousPeriodAvg);

  const getMealIcon = (meal) => {
    switch (meal) {
      case "Breakfast":
        return "wb-sunny";
      case "Lunch":
        return "restaurant";
      case "Dinner":
        return "brightness-3";
      default:
        return "fastfood";
    }
  };

  const getMealColor = (meal) => {
    switch (meal) {
      case "Breakfast":
        return "#F59E0B";
      case "Lunch":
        return "#3B82F6";
      case "Dinner":
        return "#8B5CF6";
      default:
        return "#6B7280";
    }
  };

  const renderTabButton = (tabName,title,iconName,iconFamily = "MaterialIcons") => {
    const IconComponent =
      iconFamily === "MaterialCommunityIcons" ? IconCommunity : iconFamily === "Feather" ? IconFeather : Icon;

    return (
      <TouchableOpacity
        style={[styles.tabButton,activeTab === tabName && styles.activeTab]}
        onPress={() => setActiveTab(tabName)}
      >
        <IconComponent name={iconName} size={18} color={activeTab === tabName ? "#4F46E5" : "#6B7280"} />
        <Text style={[styles.tabText,activeTab === tabName && styles.activeTabText]}>{title}</Text>
      </TouchableOpacity>
    );
  };

  const renderTimePeriodSelector = () => (
    <View style={styles.timePeriodContainer}>
      {TIME_PERIODS.map((period) => {
        const isActive = selectedTimePeriod === period.key;
        return (
          <TouchableOpacity
            key={period.key}
            style={[styles.timePeriodButton,isActive && { backgroundColor: "#0056d2" }]}
            onPress={() => setSelectedTimePeriod(period.key)}
          >
            <Text style={[styles.timePeriodText,isActive && { color: "#fff",fontWeight: "bold" }]}>
              {period.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderOverviewTab = () => (
    <ScrollView showsVerticalScrollIndicator={false} style={styles.tabContent}>
      {/* Trading-style Header Stats */}
      <View style={styles.tradingHeader}>
        <View style={styles.tradingHeaderGradient}>
          <View style={styles.mainStatContainer}>
            <Text style={styles.mainStatLabel}>Average Daily Calories</Text>
            <Text style={styles.mainStatValue}>{Math.round(avgCalories).toLocaleString()}</Text>
            <View style={styles.changeContainer}>
              <Icon
                name={caloriesChange >= 0 ? "trending-up" : "trending-down"}
                size={16}
                color={caloriesChange >= 0 ? "#22C55E" : "#EF4444"}
              />
              <Text style={[styles.changeText,{ color: caloriesChange >= 0 ? "#22C55E" : "#EF4444" }]}>
                {Math.abs(caloriesChange)}%
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Trading Cards Grid */}
      <View style={styles.tradingCardsContainer}>
        <View style={styles.tradingCardRow}>
          <View style={styles.tradingCard}>
            <View style={styles.tradingCardHeader}>
              <IconCommunity name="fire" size={20} color="#EF4444" />
              <Text style={styles.tradingCardTitle}>MAX</Text>
            </View>
            <Text style={styles.tradingCardValue}>{maxCalories.toLocaleString()}</Text>
            <Text style={styles.tradingCardLabel}>Highest Day</Text>
            <View style={styles.tradingCardChange}>
              <Text style={[styles.tradingCardChangeText,{ color: "#22C55E" }]}>
                {(((maxCalories - avgCalories) / avgCalories) * 100).toFixed(1)}%
              </Text>
            </View>
          </View>

          <View style={styles.tradingCard}>
            <View style={styles.tradingCardHeader}>
              <IconCommunity name="fire-off" size={20} color="#3B82F6" />
              <Text style={styles.tradingCardTitle}>MIN</Text>
            </View>
            <Text style={styles.tradingCardValue}>{minCalories.toLocaleString()}</Text>
            <Text style={styles.tradingCardLabel}>Lowest Day</Text>
            <View style={styles.tradingCardChange}>
              <Text style={[styles.tradingCardChangeText,{ color: "#EF4444" }]}>
                -{(((avgCalories - minCalories) / avgCalories) * 100).toFixed(1)}%
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.tradingCardRow}>
          <View style={styles.tradingCard}>
            <View style={styles.tradingCardHeader}>
              <IconCommunity name="dumbbell" size={20} color="#EF4444" />
              <Text style={styles.tradingCardTitle}>PROTEIN</Text>
            </View>
            <Text style={styles.tradingCardValue}>{avgNutrition.protein}g</Text>
            <Text style={styles.tradingCardLabel}>Daily Average</Text>
            <View style={styles.tradingCardChange}>
              <Text style={[styles.tradingCardChangeText,{ color: "#EF4444" }]}>
                {(
                  (avgNutrition.protein / (avgNutrition.protein + avgNutrition.carbs + avgNutrition.fats)) *
                  100
                ).toFixed(1)}
                %
              </Text>
            </View>
          </View>

          <View style={styles.tradingCard}>
            <View style={styles.tradingCardHeader}>
              <IconCommunity name="grain" size={20} color="#22C55E" />
              <Text style={styles.tradingCardTitle}>CARBS</Text>
            </View>
            <Text style={styles.tradingCardValue}>{avgNutrition.carbs}g</Text>
            <Text style={styles.tradingCardLabel}>Daily Average</Text>
            <View style={styles.tradingCardChange}>
              <Text style={[styles.tradingCardChangeText,{ color: "#22C55E" }]}>
                {((avgNutrition.carbs / (avgNutrition.protein + avgNutrition.carbs + avgNutrition.fats)) * 100).toFixed(
                  1
                )}
                %
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Market Overview Style */}
      <View style={styles.marketOverview}>
        <View style={styles.marketHeader}>
          <Text style={styles.marketTitle}>Nutrition Portfolio</Text>
          <Text style={styles.marketSubtitle}>Distribution Analysis</Text>
        </View>

        <View style={styles.portfolioGrid}>
          <View style={styles.portfolioItem}>
            <View style={[styles.portfolioIndicator,{ backgroundColor: "#EF4444" }]} />
            <View style={styles.portfolioInfo}>
              <Text style={styles.portfolioLabel}>Protein</Text>
              <Text style={styles.portfolioValue}>{avgNutrition.protein}g</Text>
              <Text style={styles.portfolioPercent}>
                {(
                  (avgNutrition.protein / (avgNutrition.protein + avgNutrition.carbs + avgNutrition.fats)) *
                  100
                ).toFixed(1)}
                %
              </Text>
            </View>
          </View>

          <View style={styles.portfolioItem}>
            <View style={[styles.portfolioIndicator,{ backgroundColor: "#22C55E" }]} />
            <View style={styles.portfolioInfo}>
              <Text style={styles.portfolioLabel}>Carbs</Text>
              <Text style={styles.portfolioValue}>{avgNutrition.carbs}g</Text>
              <Text style={styles.portfolioPercent}>
                {((avgNutrition.carbs / (avgNutrition.protein + avgNutrition.carbs + avgNutrition.fats)) * 100).toFixed(
                  1
                )}
                %
              </Text>
            </View>
          </View>

          <View style={styles.portfolioItem}>
            <View style={[styles.portfolioIndicator,{ backgroundColor: "#F59E0B" }]} />
            <View style={styles.portfolioInfo}>
              <Text style={styles.portfolioLabel}>Fats</Text>
              <Text style={styles.portfolioValue}>{avgNutrition.fats}g</Text>
              <Text style={styles.portfolioPercent}>
                {((avgNutrition.fats / (avgNutrition.protein + avgNutrition.carbs + avgNutrition.fats)) * 100).toFixed(
                  1
                )}
                %
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Recent Activity - Trading Style */}
      <View style={styles.recentActivityContainer}>
        <View style={styles.sectionHeader}>
          <Icon name="history" size={20} color="#4F46E5" />
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <Text style={styles.sectionSubtitle}>Last 5 days</Text>
        </View>

        {sortedDates
          .slice(-5)
          .reverse()
          .map((date) => (
            <TouchableOpacity
              key={date}
              style={styles.activityItem}
              onPress={() => handleViewDayDetails(date,dailyStats[date])}
            >
              <View style={styles.activityLeft}>
                <Text style={styles.activityDate}>{dayjs(date).format("MMM DD")}</Text>
                <Text style={styles.activityDay}>{dayjs(date).format("ddd")}</Text>
              </View>

              <View style={styles.activityCenter}>
                <Text style={styles.activityCalories}>{Math.round(dailyStats[date].calories)}</Text>
                <Text style={styles.activityCaloriesLabel}>kcal</Text>
              </View>

              <View style={styles.activityRight}>
                <View style={styles.activityChange}>
                  <Icon
                    name={dailyStats[date].calories > avgCalories ? "trending-up" : "trending-down"}
                    size={16}
                    color={dailyStats[date].calories > avgCalories ? "#22C55E" : "#EF4444"}
                  />
                  <Text
                    style={[
                      styles.activityChangeText,
                      { color: dailyStats[date].calories > avgCalories ? "#22C55E" : "#EF4444" },
                    ]}
                  >
                    {Math.abs(((dailyStats[date].calories - avgCalories) / avgCalories) * 100).toFixed(1)}%
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
      </View>
    </ScrollView>
  );

  const renderChartsTab = () => (
    <ScrollView showsVerticalScrollIndicator={false} style={styles.tabContent}>
      {/* Time Period Selector */}
      {renderTimePeriodSelector()}

      {/* Main Calories Chart - Trading Style */}
      <View style={styles.chartContainer}>
        <View style={styles.chartHeader}>
          <View style={styles.chartTitleContainer}>
            <Text style={styles.chartTitle}>Calories Trend</Text>
            <Text style={styles.chartSubtitle}>Daily intake analysis</Text>
          </View>
          <View style={styles.chartStats}>
            <Text style={styles.chartStatValue}>{Math.round(avgCalories)}</Text>
            <Text style={styles.chartStatLabel}>AVG</Text>
          </View>
        </View>

        {filteredDatesByPeriod.length > 0 && (
          <LineChart
            data={chartData}
            width={width - 40}
            height={220}
            chartConfig={{
              backgroundColor: "#fff",
              backgroundGradientFrom: "#fff",
              backgroundGradientTo: "#fff",
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(79, 70, 229, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(55, 65, 81, ${opacity})`,
              style: {
                borderRadius: 16,
              },
              propsForDots: {
                r: "5",
                strokeWidth: "3",
                stroke: "#4F46E5",
                fill: "#4F46E5",
                fillOpacity: "1",
              },
              propsForBackgroundLines: {
                strokeDasharray: "3,6",
                stroke: "#E5E7EB",
                strokeWidth: 1,
                strokeOpacity: 0.5,
              },
            }}
            bezier
            style={styles.chart}
            withShadow={false}
            withInnerLines={true}
            withOuterLines={false}
          />
        )}
      </View>

      {/* Protein Chart */}
      <View style={styles.chartContainer}>
        <View style={styles.chartHeader}>
          <View style={styles.chartTitleContainer}>
            <Text style={styles.chartTitle}>Protein Intake</Text>
            <Text style={styles.chartSubtitle}>Daily protein consumption</Text>
          </View>
          <View style={styles.chartStats}>
            <Text style={[styles.chartStatValue,{ color: "#EF4444" }]}>{avgNutrition.protein}g</Text>
            <Text style={styles.chartStatLabel}>AVG</Text>
          </View>
        </View>

        {filteredDatesByPeriod.length > 0 && (
          <LineChart
            data={proteinChartData}
            width={width - 40}
            height={220}
            chartConfig={{
              backgroundColor: "#fff",
              backgroundGradientFrom: "#fff",
              backgroundGradientTo: "#fff",
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(55, 65, 81, ${opacity})`,
              style: {
                borderRadius: 16,
              },
              propsForDots: {
                r: "5",
                strokeWidth: "3",
                stroke: "#EF4444",
                fill: "#EF4444",
                fillOpacity: "1",
              },
              propsForBackgroundLines: {
                strokeDasharray: "3,6",
                stroke: "#E5E7EB",
                strokeWidth: 1,
                strokeOpacity: 0.5,
              },
            }}
            bezier
            style={styles.chart}
            withShadow={false}
            withInnerLines={true}
            withOuterLines={false}
          />
        )}
      </View>

      {/* Carbs Chart */}
      <View style={styles.chartContainer}>
        <View style={styles.chartHeader}>
          <View style={styles.chartTitleContainer}>
            <Text style={styles.chartTitle}>Carbohydrates</Text>
            <Text style={styles.chartSubtitle}>Daily carbs consumption</Text>
          </View>
          <View style={styles.chartStats}>
            <Text style={[styles.chartStatValue,{ color: "#22C55E" }]}>{avgNutrition.carbs}g</Text>
            <Text style={styles.chartStatLabel}>AVG</Text>
          </View>
        </View>

        {filteredDatesByPeriod.length > 0 && (
          <LineChart
            data={carbsChartData}
            width={width - 40}
            height={220}
            chartConfig={{
              backgroundColor: "#fff",
              backgroundGradientFrom: "#fff",
              backgroundGradientTo: "#fff",
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(55, 65, 81, ${opacity})`,
              style: {
                borderRadius: 16,
              },
              propsForDots: {
                r: "5",
                strokeWidth: "3",
                stroke: "#22C55E",
                fill: "#22C55E",
                fillOpacity: "1",
              },
              propsForBackgroundLines: {
                strokeDasharray: "3,6",
                stroke: "#E5E7EB",
                strokeWidth: 1,
                strokeOpacity: 0.5,
              },
            }}
            bezier
            style={styles.chart}
            withShadow={false}
            withInnerLines={true}
            withOuterLines={false}
          />
        )}
      </View>

      {/* Fixed Nutrition Distribution Pie Chart */}
      <View style={styles.modernChartContainer}>
        <View style={styles.chartHeader}>
          <View style={styles.chartTitleContainer}>
            <Text style={styles.chartTitle}>Nutrition Distribution</Text>
            <Text style={styles.chartSubtitle}>Macronutrient breakdown</Text>
          </View>
        </View>

        {pieData.some((item) => item.population > 0) && (
          <View style={[styles.pieChartWrapper,{ backgroundColor: "#fff",borderRadius: 16 }]}>
            <PieChart
              data={pieData}
              width={width - 80}
              height={220}
              chartConfig={{
                color: (opacity = 1) => `rgba(55, 65, 81, ${opacity})`,
              }}
              accessor="population"
              backgroundColor="#fff"
              paddingLeft="15"
              absolute
              hasLegend={false}
              style={styles.modernPieChart}
            />

            {/* Custom Legend with Values */}
            <View style={styles.customLegendContainer}>
              {pieData.map((item,index) => (
                <View key={index} style={styles.customLegendItem}>
                  <View style={[styles.customLegendDot,{ backgroundColor: item.color }]} />
                  <View style={styles.customLegendInfo}>
                    <Text style={styles.customLegendLabel}>{item.name}</Text>
                    <Text style={styles.customLegendValue}>{item.population}g</Text>
                    <Text style={styles.customLegendPercent}>
                      {(
                        (item.population / (avgNutrition.protein + avgNutrition.carbs + avgNutrition.fats)) *
                        100
                      ).toFixed(1)}%
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* Enhanced Daily Comparison Bar Chart */}
      <View style={styles.modernChartContainer}>
        <View style={styles.chartHeader}>
          <View style={styles.chartTitleContainer}>
            <Text style={styles.chartTitle}>Daily Performance</Text>
            <Text style={styles.chartSubtitle}>Calorie intake vs average</Text>
          </View>
          <View style={styles.performanceIndicators}>
            <View style={styles.performanceItem}>
              <View style={[styles.performanceDot,{ backgroundColor: "#22C55E" }]} />
              <Text style={styles.performanceText}>Above Avg</Text>
            </View>
            <View style={styles.performanceItem}>
              <View style={[styles.performanceDot,{ backgroundColor: "#EF4444" }]} />
              <Text style={styles.performanceText}>Below Avg</Text>
            </View>
          </View>
        </View>

        {filteredDatesByPeriod.length > 0 && (
          <View style={[styles.barChartWrapper,{ backgroundColor: "#fff",borderRadius: 16 }]}>
            <BarChart
              data={{
                labels: filteredDatesByPeriod.slice(-7).map((date) => dayjs(date).format("MM/DD")),
                datasets: [
                  {
                    data: filteredDatesByPeriod.slice(-7).map((date) => dailyStats[date].calories),
                    colors: filteredDatesByPeriod.slice(-7).map(
                      (date) =>
                        (opacity = 1) =>
                          dailyStats[date].calories > avgCalories
                            ? `rgba(34, 197, 94, ${opacity})`
                            : `rgba(239, 68, 68, ${opacity})`
                    ),
                  },
                ],
              }}
              width={width - 80}
              height={260}
              chartConfig={{
                backgroundColor: "#fff",
                backgroundGradientFrom: "#fff",
                backgroundGradientTo: "#fff",
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(55, 65, 81, ${opacity})`,
                style: {
                  borderRadius: 16,
                },
                propsForBackgroundLines: {
                  strokeDasharray: "3,6",
                  stroke: "#E5E7EB",
                  strokeWidth: 1,
                  strokeOpacity: 0.5,
                },
                barPercentage: 0.7,
                categoryPercentage: 0.8,
              }}
              style={styles.modernBarChart}
              withCustomBarColorFromData={true}
              flatColor={true}
              showBarTops={false}
              fromZero={true}
            />

            {/* Average Line Indicator */}
            <View
              style={[
                styles.averageLine,
                {
                  top:
                    260 -
                    (avgCalories /
                      Math.max(...filteredDatesByPeriod.slice(-7).map((date) => dailyStats[date].calories))) *
                    200,
                },
              ]}
            >
              <View style={styles.averageLineDash} />
              <Text style={styles.averageLineText}>AVG: {Math.round(avgCalories)}</Text>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );

  const renderHistoryTab = () => (
    <ScrollView showsVerticalScrollIndicator={false} style={styles.tabContent}>
      {Object.keys(grouped).length === 0 ? (
        <View style={styles.emptyState}>
          <Icon name="inbox" size={64} color="#9CA3AF" />
          <Text style={styles.emptyTitle}>No Data Available</Text>
          <Text style={styles.emptyText}>Start logging your meals to see your history here.</Text>
        </View>
      ) : (
        Object.keys(grouped)
          .sort((a,b) => dayjs(b).unix() - dayjs(a).unix())
          .map((date) => {
            const dayLogs = [];
            MEAL_TYPES.forEach((meal) => {
              grouped[date][meal].forEach((log) => dayLogs.push({ ...log,meal }));
            });

            const isExpanded = expandedDays[date] || dayLogs.length <= 3;
            const displayLogs = isExpanded ? dayLogs : dayLogs.slice(0,3);

            return (
              <View key={date} style={styles.historyDateContainer}>
                <TouchableOpacity
                  style={styles.historyDateHeader}
                  onPress={() => handleViewDayDetails(date,dailyStats[date])}
                >
                  <View style={styles.dateInfo}>
                    <Text style={styles.historyDate}>{dayjs(date).format("dddd")}</Text>
                    <Text style={styles.historyDateSub}>{dayjs(date).format("MMM DD, YYYY")}</Text>
                  </View>
                  <View style={styles.caloriesBadge}>
                    <IconCommunity name="fire" size={16} color="#F59E0B" />
                    <Text style={styles.historyCalories}>{Math.round(dailyStats[date]?.calories || 0)}</Text>
                    <Text style={styles.caloriesLabel}>kcal</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.deleteDayButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleDeleteDayLog(date);
                    }}
                  >
                    <IconFeather name="trash-2" size={16} color="#EF4444" />
                  </TouchableOpacity>
                </TouchableOpacity>

                <View style={styles.dayFoodsList}>
                  <Text style={styles.dayFoodsTitle}>
                    {dayLogs.length} food items •{" "}
                    {Object.keys(grouped[date]).filter((meal) => grouped[date][meal].length > 0).length} meals
                  </Text>

                  {displayLogs.map((log,idx) => (
                    <View key={idx} style={styles.simpleFoodItem}>
                      <View style={[styles.mealIndicator,{ backgroundColor: getMealColor(log.meal) }]} />
                      <View style={styles.simpleFoodInfo}>
                        <View style={styles.foodNameContainer}>
                          <Text style={styles.simpleFoodName}>{log.foodName}</Text>
                          {log.count > 1 && (
                            <View style={styles.countTag}>
                              <Text style={styles.countTagText}>+{log.count}</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.simpleFoodDetails}>
                          {log.meal} • {Math.round(log.calories || 0)} kcal • Quantity: {log.quantity.toFixed(1)}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>

                {dayLogs.length > 3 && (
                  <TouchableOpacity style={styles.showMoreButton} onPress={() => toggleDayExpansion(date)}>
                    <Text style={styles.showMoreText}>
                      {isExpanded ? "Show Less" : `Show ${dayLogs.length - 3} More Items`}
                    </Text>
                    <Icon name={isExpanded ? "expand-less" : "expand-more"} size={16} color="#4F46E5" />
                  </TouchableOpacity>
                )}
              </View>
            );
          })
      )}
    </ScrollView>
  );

  const renderFiltersModal = () => (
    <Modal visible={showFilters} animationType="slide" transparent={true} onRequestClose={() => setShowFilters(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleContainer}>
              <Icon name="filter-list" size={20} color="#4F46E5" />
              <Text style={styles.modalTitle}>Advanced Filters</Text>
            </View>
            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setShowFilters(false)}>
              <Icon name="close" size={20} color="#374151" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.modalBody}>
            {/* Search */}
            <View style={styles.filterGroup}>
              <View style={styles.filterLabelContainer}>
                <Icon name="search" size={16} color="#374151" />
                <Text style={styles.filterLabel}>Search Food</Text>
              </View>
              <TextInput
                style={styles.filterInput}
                placeholder="Enter food name..."
                value={filters.searchTerm}
                onChangeText={(text) => setFilters((prev) => ({ ...prev,searchTerm: text }))}
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* Date Range */}
            <View style={styles.filterRow}>
              <View style={styles.filterHalf}>
                <View style={styles.filterLabelContainer}>
                  <Icon name="date-range" size={16} color="#374151" />
                  <Text style={styles.filterLabel}>From Date</Text>
                </View>
                <TextInput
                  style={styles.filterInput}
                  placeholder="YYYY-MM-DD"
                  value={filters.startDate}
                  onChangeText={(text) => setFilters((prev) => ({ ...prev,startDate: text }))}
                  placeholderTextColor="#9CA3AF"
                />
              </View>
              <View style={styles.filterHalf}>
                <View style={styles.filterLabelContainer}>
                  <Icon name="date-range" size={16} color="#374151" />
                  <Text style={styles.filterLabel}>To Date</Text>
                </View>
                <TextInput
                  style={styles.filterInput}
                  placeholder="YYYY-MM-DD"
                  value={filters.endDate}
                  onChangeText={(text) => setFilters((prev) => ({ ...prev,endDate: text }))}
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>

            {/* Meal Type */}
            <View style={styles.filterGroup}>
              <View style={styles.filterLabelContainer}>
                <Icon name="restaurant" size={16} color="#374151" />
                <Text style={styles.filterLabel}>Meal Type</Text>
              </View>
              <View style={styles.mealTypeButtons}>
                {["",...MEAL_TYPES].map((mealType) => (
                  <TouchableOpacity
                    key={mealType}
                    style={[styles.mealTypeButton,filters.mealType === mealType && styles.activeMealType]}
                    onPress={() => setFilters((prev) => ({ ...prev,mealType }))}
                  >
                    <Text
                      style={[styles.mealTypeButtonText,filters.mealType === mealType && styles.activeMealTypeText]}
                    >
                      {mealType || "All"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Calorie Range */}
            <View style={styles.filterRow}>
              <View style={styles.filterHalf}>
                <View style={styles.filterLabelContainer}>
                  <IconCommunity name="fire" size={16} color="#374151" />
                  <Text style={styles.filterLabel}>Min Calories</Text>
                </View>
                <TextInput
                  style={styles.filterInput}
                  placeholder="0"
                  value={filters.minCalories}
                  onChangeText={(text) => setFilters((prev) => ({ ...prev,minCalories: text }))}
                  keyboardType="numeric"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
              <View style={styles.filterHalf}>
                <View style={styles.filterLabelContainer}>
                  <IconCommunity name="fire" size={16} color="#374151" />
                  <Text style={styles.filterLabel}>Max Calories</Text>
                </View>
                <TextInput
                  style={styles.filterInput}
                  placeholder="1000"
                  value={filters.maxCalories}
                  onChangeText={(text) => setFilters((prev) => ({ ...prev,maxCalories: text }))}
                  keyboardType="numeric"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.modalResetButton}
              onPress={() =>
                setFilters({
                  pageNumber: 1,
                  pageSize: 30,
                  startDate: "",
                  endDate: "",
                  searchTerm: "",
                  mealType: "",
                  minCalories: "",
                  maxCalories: "",
                })
              }
            >
              <Icon name="refresh" size={16} color="#374151" />
              <Text style={styles.modalResetText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalApplyButton}
              onPress={() => {
                fetchLogs();
                setShowFilters(false);
              }}
            >
              <LinearGradient
                colors={["#4A90E2","#0056D2","#4A90E2"]}
                style={styles.modalApplyGradient}
              >
                <Icon name="check" size={16} color="#FFFFFF" />
                <Text style={styles.modalApplyText}>Apply Filters</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const handleExportCSV = () => {
    navigation.navigate("ExportHistory",{ logs: filteredLogs });
  };

  if (loading) {
    return <CommonSkeleton />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <Header
        title="Nutrition Analytics"
        onBack={() => navigation?.goBack()}
        rightActions={[{ icon: "options-outline",onPress: () => setShowFilters(true),color: "#111827" }]}
        subtitle="Track your nutrition journey"
      />
      {/* Tabs */}
      <View style={styles.tabContainer}>
        {renderTabButton("overview","Overview","analytics")}
        {renderTabButton("charts","Charts","show-chart")}
        {renderTabButton("history","History","history")}
      </View>
      {/* Custom navigation buttons for new screens & export */}
      <View style={{ flexDirection: "row",justifyContent: "space-around",marginVertical: 12 }}>
        <TouchableOpacity
          style={{ backgroundColor: "#0056d2",paddingVertical: 8,paddingHorizontal: 16,borderRadius: 8 }}
          onPress={() => navigation.navigate("TopFoodsByMeal",{ logs: filteredLogs })}
        >
          <Text style={{ color: "#fff",fontWeight: "bold" }}>Top Foods By Meal</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ backgroundColor: "#0056d2",paddingVertical: 8,paddingHorizontal: 16,borderRadius: 8 }}
          onPress={() => navigation.navigate("Trends",{ logs: filteredLogs })}
        >
          <Text style={{ color: "#fff",fontWeight: "bold" }}>Trends</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ backgroundColor: "#0056d2",paddingVertical: 8,paddingHorizontal: 16,borderRadius: 8 }}
          onPress={handleExportCSV}
        >
          <Text style={{ color: "#fff",fontWeight: "bold" }}>Export CSV</Text>
        </TouchableOpacity>
      </View>
      {/* Content */}
      <View style={styles.content}>
        {activeTab === "overview" && renderOverviewTab()}
        {activeTab === "charts" && renderChartsTab()}
        {activeTab === "history" && renderHistoryTab()}
      </View>
      {/* Modal filter */}
      {renderFiltersModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    shadowColor: "transparent",
    elevation: 0,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#374151",
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    marginTop: 70,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: "center",
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
  },
  activeTab: {
    borderBottomColor: "#111827",
  },
  tabText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
    marginTop: 4,
  },
  activeTabText: {
    color: "#111827",
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  loadingContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: "600",
    color: "#374151",
    textAlign: "center",
  },
  loadingSubText: {
    marginTop: 8,
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },
  // Trading Style Components
  tradingHeader: {
    marginBottom: 20,
  },
  tradingHeaderGradient: {
    borderRadius: 16,
    padding: 24,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  mainStatContainer: {
    alignItems: "center",
  },
  mainStatLabel: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  mainStatValue: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 8,
  },
  changeContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(34, 197, 94, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  changeText: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 4,
  },
  tradingCardsContainer: {
    marginBottom: 20,
  },
  tradingCardRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  tradingCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  tradingCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  tradingCardTitle: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600",
    letterSpacing: 1,
  },
  tradingCardValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 4,
  },
  tradingCardLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 8,
  },
  tradingCardChange: {
    alignSelf: "flex-start",
  },
  tradingCardChangeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  marketOverview: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  marketHeader: {
    marginBottom: 20,
  },
  marketTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 4,
  },
  marketSubtitle: {
    fontSize: 14,
    color: "#6B7280",
  },
  portfolioGrid: {
    gap: 16,
  },
  portfolioItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
  },
  portfolioIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: 16,
  },
  portfolioInfo: {
    flex: 1,
  },
  portfolioLabel: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 4,
  },
  portfolioValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 2,
  },
  portfolioPercent: {
    fontSize: 12,
    color: "#6B7280",
  },
  recentActivityContainer: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 8,
    color: "#111827",
    flex: 1,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: "#6B7280",
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  activityLeft: {
    width: 60,
    alignItems: "center",
  },
  activityDate: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#111827",
  },
  activityDay: {
    fontSize: 12,
    color: "#6B7280",
    textTransform: "uppercase",
  },
  activityCenter: {
    flex: 1,
    alignItems: "center",
  },
  activityCalories: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111827",
  },
  activityCaloriesLabel: {
    fontSize: 12,
    color: "#6B7280",
  },
  activityRight: {
    width: 80,
    alignItems: "flex-end",
  },
  activityChange: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(34, 197, 94, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activityChangeText: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  // Time Period Selector
  timePeriodContainer: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  timePeriodButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 8,
  },
  timePeriodText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "600",
  },
  // Chart Styles
  chartContainer: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  chartTitleContainer: {
    flex: 1,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 4,
  },
  chartSubtitle: {
    fontSize: 12,
    color: "#6B7280",
  },
  chartStats: {
    alignItems: "flex-end",
  },
  chartStatValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111827",
  },
  chartStatLabel: {
    fontSize: 10,
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  chart: {
    borderRadius: 16,
  },
  // Modern Chart Styles
  modernChartContainer: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  pieChartWrapper: {
    alignItems: "center",
    position: "relative",
  },
  modernPieChart: {
    borderRadius: 16,
  },
  customLegendContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 20,
    paddingHorizontal: 20,
  },
  customLegendItem: {
    alignItems: "center",
    flex: 1,
  },
  customLegendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  customLegendInfo: {
    alignItems: "center",
  },
  customLegendLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
    fontWeight: "500",
  },
  customLegendValue: {
    fontSize: 16,
    color: "#111827",
    fontWeight: "bold",
    marginBottom: 2,
  },
  customLegendPercent: {
    fontSize: 11,
    color: "#6B7280",
  },
  performanceIndicators: {
    flexDirection: "row",
    gap: 16,
  },
  performanceItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  performanceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  performanceText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  barChartWrapper: {
    position: "relative",
    alignItems: "center",
  },
  modernBarChart: {
    borderRadius: 16,
  },
  averageLine: {
    position: "absolute",
    left: 40,
    right: 40,
    flexDirection: "row",
    alignItems: "center",
    zIndex: 10,
  },
  averageLineDash: {
    flex: 1,
    height: 2,
    backgroundColor: "#F59E0B",
    opacity: 0.8,
  },
  averageLineText: {
    fontSize: 10,
    color: "#F59E0B",
    fontWeight: "600",
    marginLeft: 8,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 4,
  },
  // History Styles
  historyDateContainer: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  historyDateHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  dateInfo: {
    flex: 1,
  },
  historyDate: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 2,
  },
  historyDateSub: {
    fontSize: 14,
    color: "#6B7280",
  },
  caloriesBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 4,
  },
  historyCalories: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#F59E0B",
  },
  caloriesLabel: {
    fontSize: 10,
    color: "#F59E0B",
    fontWeight: "500",
  },
  deleteDayButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  dayFoodsList: {
    marginTop: 8,
    paddingLeft: 16,
  },
  dayFoodsTitle: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
    marginBottom: 8,
  },
  simpleFoodItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    paddingVertical: 4,
  },
  mealIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: 12,
  },
  simpleFoodInfo: {
    flex: 1,
  },
  foodNameContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  simpleFoodName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#111827",
  },
  countTag: {
    backgroundColor: "#E0E7FF",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  countTagText: {
    fontSize: 10,
    color: "#2563EB",
    fontWeight: "600",
  },
  simpleFoodDetails: {
    fontSize: 11,
    color: "#6B7280",
  },
  showMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    marginTop: 8,
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 4,
  },
  showMoreText: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "500",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#111827",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0,height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111827",
    marginLeft: 8,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBody: {
    padding: 20,
    maxHeight: 400,
  },
  filterGroup: {
    marginBottom: 20,
  },
  filterLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
    color: "#374151",
  },
  filterInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: "#FFFFFF",
    color: "#111827",
  },
  filterRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  filterHalf: {
    flex: 1,
  },
  mealTypeButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  mealTypeButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
  },
  activeMealType: {
    backgroundColor: "#E5E7EB",
    borderColor: "#111827",
  },
  mealTypeButtonText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  activeMealTypeText: {
    color: "#111827",
    fontWeight: "bold",
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  modalResetButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
    gap: 6,
  },
  modalResetText: {
    fontSize: 16,
    color: "#374151",
    fontWeight: "600",
  },
  modalApplyButton: {
    flex: 2,
    borderRadius: 12,
    overflow: "hidden",
  },
  modalApplyGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    gap: 6,
  },
  modalApplyText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
  },
});

export default FoodLogHistoryScreen;