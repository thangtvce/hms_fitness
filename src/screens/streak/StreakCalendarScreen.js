import { useState,useEffect,useContext } from "react";
import { View,Text,StyleSheet,Platform,ScrollView,TouchableOpacity,Modal } from "react-native";
import ShimmerPlaceholder from "components/shimmer/ShimmerPlaceholder";
import { Calendar,LocaleConfig } from "react-native-calendars";
import Header from "components/Header";
import { useNavigation } from "@react-navigation/native";
import apiUserService from "services/apiUserService";
import { Ionicons } from "@expo/vector-icons";
import LottieView from 'lottie-react-native';
import { LinearGradient } from "expo-linear-gradient";
import StreakCelebrationPopup from "components/streak/StreakCelebrationPopup";
import { AuthContext } from "context/AuthContext";
import { showErrorFetchAPI } from "utils/toastUtil";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { handleDailyCheckin } from "services/apiUserService";

const PRIMARY_COLOR = "#0056d2";
const ACCENT_COLOR = "#0EA5E9";
const TEXT_COLOR_DARK = "#1E293B";
const TEXT_COLOR_MEDIUM = "#475569";
const TEXT_COLOR_LIGHT = "#64748B";
const BACKGROUND_COLOR = "#F0F2F5";

LocaleConfig.locales["en"] = {
  monthNames: [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December",
  ],
  monthNamesShort: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
  dayNames: ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],
  dayNamesShort: ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],
  today: "Today",
};
LocaleConfig.defaultLocale = "en";

export default function StreakCalendarScreen() {
  const { user } = useContext(AuthContext);
  const navigation = useNavigation();
  const [loading,setLoading] = useState(true);
  const [userLogin,setUserLogin] = useState(null);
  const [streakDates,setStreakDates] = useState([]);
  const [currentStreak,setCurrentStreak] = useState(0);
  const [lastCheckInDate,setLastCheckInDate] = useState(null);
  const [showStreakPopup,setShowStreakPopup] = useState(false);
  const [taskCompletion,setTaskCompletion] = useState({});
  const [taskAnimating,setTaskAnimating] = useState({});
  const [modalVisible,setModalVisible] = useState(false);
  const [selectedTask,setSelectedTask] = useState(null);

  // Define tasks with display names, points, icons, and descriptions
  const tasks = [
    {
      key: "meal_log",
      name: "Log a Meal",
      points: 10,
      icon: "restaurant-outline",
      description: "Record a meal to track your nutrition and stay mindful of your diet.",
    },
    {
      key: "water_log",
      name: "Log Water",
      points: 10,
      icon: "water-outline",
      description: "Log your daily water intake to stay hydrated.",
    },
    {
      key: "weight_log",
      name: "Log Weight",
      points: 10,
      icon: "scale-outline",
      description: "Track your weight to monitor your progress.",
    },
    {
      key: "body_measurement_log",
      name: "Log Body Measurement",
      points: 10,
      icon: "body-outline",
      description: "Measure and log body metrics like waist or arm size.",
    },
    {
      key: "comment_post_and_post_article",
      name: "Comment and up a post",
      points: 20,
      icon: "chatbubble-outline",
      description: "Engage with the community by commenting on and upvoting a post.",
    },
    {
      key: "workout",
      name: "Complete Workout",
      points: 40,
      icon: "barbell-outline",
      description: "Complete a workout session to boost your fitness.",
    },
  ].sort((a,b) => a.points - b.points);

  // Calculate total possible points
  const totalPossiblePoints = tasks.reduce((sum,task) => sum + task.points,0);

  useEffect(() => {
    async function fetchUser() {
      try {
        const userId = user?.userId;
        const data = await apiUserService.getUserById(userId);
        setUserLogin(data.data);
        const fetchedStreak = data.data.currentStreak || 0;
        setCurrentStreak(fetchedStreak);
        setLastCheckInDate(data.data.lastCheckInDate);

        if (data.data.lastCheckInDate) {
          setStreakDates([data.data.lastCheckInDate.slice(0,10)]);
        } else {
          setStreakDates([]);
        }
        if (fetchedStreak > 0) {
          setShowStreakPopup(true);
          const timer = setTimeout(() => {
            setShowStreakPopup(false);
          },4000);
          return () => clearTimeout(timer);
        }
      } catch (e) {
        showErrorFetchAPI(e);
        setUserLogin(null);
      } finally {
        setLoading(false);
      }
    }

    async function checkTaskCompletion() {
      try {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2,'0');
        const day = String(today.getDate()).padStart(2,'0');
        const completionStatus = {};
        const animatingStatus = {};

        for (const task of tasks) {
          if (task.key === "comment_post_and_post_article") {
            // Check both sub-tasks for the combined task
            const commentKey = `@Checkin_${user?.userId}_comment_post_${year}-${month}-${day}`;
            const articleKey = `@Checkin_${user?.userId}_post_article_${year}-${month}-${day}`;
            const combinedKey = `@Checkin_${user?.userId}_comment_post_and_post_article_${year}-${month}-${day}`;
            const commentDone = await AsyncStorage.getItem(commentKey);
            const articleDone = await AsyncStorage.getItem(articleKey);
            const combinedDone = await AsyncStorage.getItem(combinedKey);
            completionStatus[task.key] = !!(commentDone && articleDone && combinedDone);
            animatingStatus[task.key] = !!(commentDone && articleDone && combinedDone);
            if (completionStatus[task.key]) {
              setTimeout(() => {
                setTaskAnimating((prev) => ({ ...prev,[task.key]: false }));
              },1500);
            }
          } else {
            const todayKey = `@Checkin_${user?.userId}_${task.key}_${year}-${month}-${day}`;
            const completed = await AsyncStorage.getItem(todayKey);
            completionStatus[task.key] = !!completed;
            animatingStatus[task.key] = !!completed;
            if (completed) {
              setTimeout(() => {
                setTaskAnimating((prev) => ({ ...prev,[task.key]: false }));
              },1500);
            }
          }
        }
        setTaskCompletion(completionStatus);
        setTaskAnimating(animatingStatus);
      } catch (error) {
        console.log("Failed to check task completion:",error.message);
        setTaskCompletion(tasks.reduce((acc,task) => ({ ...acc,[task.key]: false }),{}));
        setTaskAnimating(tasks.reduce((acc,task) => ({ ...acc,[task.key]: false }),{}));
      }
    }

    if (user?.userId) {
      fetchUser();
      checkTaskCompletion();
    }
  },[user]);

  // Calculate total earned points
  const totalEarnedPoints = tasks.reduce((sum,task) => {
    return sum + (taskCompletion[task.key] ? task.points : 0);
  },0);

  function getMonthlyStreaks(dates) {
    if (!dates || dates.length === 0) return {};

    const byMonth = {};
    dates.forEach((dateStr) => {
      const [year,month] = dateStr.split("-");
      const key = `${year}-${month}`;
      if (!byMonth[key]) byMonth[key] = [];
      byMonth[key].push(dateStr);
    });

    const result = {};
    Object.entries(byMonth).forEach(([month,arr]) => {
      const sorted = arr.sort();
      let maxStreak = 0;
      let currentStreakInMonth = 0;

      if (sorted.length > 0) {
        maxStreak = 1;
        currentStreakInMonth = 1;

        for (let i = 1; i < sorted.length; i++) {
          const prev = new Date(sorted[i - 1]);
          const curr = new Date(sorted[i]);
          const diff = (curr - prev) / (1000 * 60 * 60 * 24);

          if (diff === 1) {
            currentStreakInMonth++;
            if (currentStreakInMonth > maxStreak) maxStreak = currentStreakInMonth;
          } else {
            currentStreakInMonth = 1;
          }
        }
      }
      result[month] = maxStreak;
    });
    return result;
  }

  const monthlyStreaks = getMonthlyStreaks(streakDates);

  // Mark dates for the calendar
  const markedDates = {};
  const today = new Date().toISOString().slice(0,10);

  if (lastCheckInDate && currentStreak > 0) {
    const streakDays = [];
    const lastDate = new Date(lastCheckInDate.slice(0,10));
    for (let i = 0; i < currentStreak; i++) {
      const d = new Date(lastDate);
      d.setDate(lastDate.getDate() - i);
      const dateStr = d.toISOString().slice(0,10);
      streakDays.push(dateStr);
    }
    streakDays.reverse();
    streakDays.forEach((dateStr,idx) => {
      markedDates[dateStr] = {
        selected: true,
        customStyles: {
          container: styles.streakChainDayContainer,
          text: styles.streakChainDayText,
        },
      };
      if (idx === streakDays.length - 1) {
        markedDates[dateStr].emoji = "🔥";
        if (dateStr === today) {
          markedDates[dateStr].customStyles = {
            ...markedDates[dateStr].customStyles,
            container: styles.todayMarkedDayContainer,
            text: styles.todayMarkedDayText,
          };
        }
      }
    });
  }

  // Custom Day Component for Calendar
  const CustomDay = ({ date,marking }) => {
    const isToday = date.dateString === today;
    const isMarked = marking && marking.selected;

    let containerStyle = styles.dayContainer;
    let textStyle = styles.dayText;
    let emoji = null;

    if (isMarked) {
      containerStyle = { ...containerStyle,...styles.markedDayContainer };
      textStyle = { ...textStyle,...styles.markedDayText };
      if (marking.emoji) {
        emoji = marking.emoji;
      }
    }

    if (isToday) {
      containerStyle = { ...containerStyle,...styles.todayDayContainer };
      textStyle = { ...textStyle,...styles.todayDayText };
      if (isMarked) {
        containerStyle = { ...containerStyle,...styles.todayMarkedDayContainer };
        textStyle = { ...textStyle,...styles.todayMarkedDayText };
      }
    }

    return (
      <View style={containerStyle}>
        <Text style={textStyle}>{date.day}</Text>
        {emoji && <Text style={styles.emojiStyle}>{emoji}</Text>}
      </View>
    );
  };

  // Determine flame intensity based on currentStreak
  const getFlameStyle = () => {
    let flameSize = 24;
    let flameColor = "#FF6347";
    let flameShadow = {
      shadowColor: "#FF6347",
      shadowOffset: { width: 0,height: 2 },
      shadowOpacity: 0.4,
      shadowRadius: 4,
      elevation: 5,
    };

    if (currentStreak > 14) {
      flameSize = 48;
      flameColor = "#FF0000";
      flameShadow = {
        shadowColor: "#FF0000",
        shadowOffset: { width: 0,height: 6 },
        shadowOpacity: 0.6,
        shadowRadius: 12,
        elevation: 15,
      };
    } else if (currentStreak > 7) {
      flameSize = 36;
      flameColor = "#FF4500";
      flameShadow = {
        shadowColor: "#FF4500",
        shadowOffset: { width: 0,height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
        elevation: 10,
      };
    } else if (currentStreak > 1) {
      flameSize = 28;
      flameColor = "#FFA500";
      flameShadow = {
        shadowColor: "#FFA500",
        shadowOffset: { width: 0,height: 3 },
        shadowOpacity: 0.45,
        shadowRadius: 6,
        elevation: 7,
      };
    }

    return {
      iconSize: flameSize,
      iconColor: flameColor,
      iconShadow: flameShadow,
    };
  };

  const flameStyle = getFlameStyle();

  // Handle opening the task details modal
  const openTaskDetails = (task) => {
    setSelectedTask(task);
    setModalVisible(true);
  };

  return (
    <View style={styles.container}>
      <Header title="Streak Calendar" onBack={() => navigation.goBack()} />
      <ScrollView>
        {loading ? (
          <View style={{ padding: 24 }}>
            <ShimmerPlaceholder style={{ height: 270,borderRadius: 16,marginBottom: 16,marginTop: 20 }} />
            <ShimmerPlaceholder style={{ height: 100,borderRadius: 16,marginBottom: 16 }} />
          </View>
        ) : (
          <>
            {/* Streak Summary Card */}
            <View style={styles.streakSummaryCard}>
              <LinearGradient
                colors={[PRIMARY_COLOR,ACCENT_COLOR]}
                start={{ x: 0,y: 0 }}
                end={{ x: 1,y: 1 }}
                style={styles.streakSummaryGradient}
              >
                <Ionicons name="flame-outline" size={32} color="#FFFFFF" />
                <Text style={styles.streakSummaryTitle}>Streak Achievement</Text>
              </LinearGradient>
            </View>

            <Calendar
              markedDates={markedDates}
              markingType="custom"
              dayComponent={CustomDay}
              theme={{
                backgroundColor: BACKGROUND_COLOR,
                calendarBackground: "#FFFFFF",
                textSectionTitleColor: TEXT_COLOR_MEDIUM,
                selectedDayBackgroundColor: PRIMARY_COLOR,
                selectedDayTextColor: "#FFFFFF",
                todayTextColor: PRIMARY_COLOR,
                dayTextColor: TEXT_COLOR_DARK,
                textDisabledColor: "#D3D3D3",
                dotColor: PRIMARY_COLOR,
                selectedDotColor: "#FFFFFF",
                arrowColor: PRIMARY_COLOR,
                monthTextColor: TEXT_COLOR_DARK,
                textMonthFontWeight: "bold",
                textDayHeaderFontWeight: "600",
                textDayFontSize: 16,
                textMonthFontSize: 18,
              }}
              style={styles.calendar}
            />

            {/* Current Streak Display */}
            <View style={styles.currentStreakContainer}>
              {currentStreak > 0 && (
                <View style={[styles.flameIcon,flameStyle.iconShadow,{ width: flameStyle.iconSize * 1.4,height: flameStyle.iconSize * 1.4 }]}>
                  <LottieView
                    source={
                      currentStreak < 20
                        ? require('../../../assets/animation/FireStreakOrange.json')
                        : require('../../../assets/animation/StreakFire.json')
                    }
                    autoPlay
                    loop
                    style={{ width: '100%',height: '100%' }}
                  />
                </View>
              )}
              <Text style={styles.currentStreakLabel}>Current Streak</Text>
              <Text style={styles.currentStreakValue}>
                {currentStreak > 0 ? `${currentStreak} days` : "No streak yet"}
              </Text>
            </View>

            {/* Points Summary */}
            <View style={styles.pointsSummaryContainer}>
              <LinearGradient
                colors={[PRIMARY_COLOR,ACCENT_COLOR]}
                start={{ x: 0,y: 0 }}
                end={{ x: 1,y: 1 }}
                style={styles.pointsSummaryGradient}
              >
                <Ionicons name="star-outline" size={24} color="#FFFFFF" style={styles.pointsIcon} />
                <Text style={styles.pointsSummaryTitle}>Today's Points</Text>
              </LinearGradient>
              <Text style={styles.pointsSummaryValue}>{`${totalEarnedPoints} / ${totalPossiblePoints}`}</Text>
            </View>

            {/* Task List */}
            <View style={styles.taskListContainer}>
              <Text style={styles.taskListTitle}>Daily Tasks</Text>
              {tasks.map((task) => (
                <TouchableOpacity
                  key={task.key}
                  activeOpacity={0.8}
                  style={styles.taskItem}
                  onPress={async () => {
                    if (task.key === "comment_post_and_post_article") {
                      // For combined task, inform user to complete sub-tasks elsewhere
                      console.log("Please complete 'Comment on a post' and 'Upvote a post' in the Community section.");
                    } else {
                      await handleDailyCheckin(user?.userId,task.key);
                      const today = new Date();
                      const year = today.getFullYear();
                      const month = String(today.getMonth() + 1).padStart(2,'0');
                      const day = String(today.getDate()).padStart(2,'0');
                      const todayKey = `@Checkin_${user?.userId}_${task.key}_${year}-${month}-${day}`;
                      const completed = await AsyncStorage.getItem(todayKey);
                      if (completed) {
                        setTaskCompletion((prev) => ({ ...prev,[task.key]: true }));
                        setTaskAnimating((prev) => ({ ...prev,[task.key]: true }));
                        setTimeout(() => {
                          setTaskAnimating((prev) => ({ ...prev,[task.key]: false }));
                        },1500);
                      }
                    }
                  }}
                >
                  <LinearGradient
                    colors={taskCompletion[task.key] ? [PRIMARY_COLOR,ACCENT_COLOR] : ['#FFFFFF','#F8FAFC']}
                    start={{ x: 0,y: 0 }}
                    end={{ x: 1,y: 1 }}
                    style={styles.taskGradient}
                  >
                    <View style={styles.taskInfo}>
                      <Ionicons
                        name={task.icon}
                        size={28}
                        color={taskCompletion[task.key] ? '#FFFFFF' : PRIMARY_COLOR}
                        style={styles.taskIcon}
                      />
                      <View style={styles.taskTextContainer}>
                        <Text style={[styles.taskName,taskCompletion[task.key] && styles.taskNameCompleted]}>
                          {task.name}
                        </Text>
                        <Text style={[styles.taskPoints,taskCompletion[task.key] && styles.taskPointsCompleted]}>
                          {`${task.points} points`}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.detailsButton}
                        onPress={() => openTaskDetails(task)}
                      >
                        <Ionicons name="information-circle-outline" size={24} color={taskCompletion[task.key] ? '#FFFFFF' : PRIMARY_COLOR} />
                      </TouchableOpacity>
                    </View>
                    {taskCompletion[task.key] && taskAnimating[task.key] && (
                      <View style={styles.animationContainer}>
                        <LottieView
                          source={require('../../../assets/animation/CheckAnimation.json')}
                          autoPlay
                          loop={false}
                          style={{ width: 36,height: 36 }}
                        />
                      </View>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      {/* Task Details Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <LinearGradient
              colors={[PRIMARY_COLOR,ACCENT_COLOR]}
              start={{ x: 0,y: 0 }}
              end={{ x: 1,y: 1 }}
              style={styles.modalHeader}
            >
              <Text style={styles.modalTitle}>{selectedTask?.name}</Text>
            </LinearGradient>
            <View style={styles.modalContent}>
              <Text style={styles.modalDescription}>{selectedTask?.description}</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Streak Celebration Popup */}
      <StreakCelebrationPopup isVisible={showStreakPopup} streakCount={currentStreak} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND_COLOR,
  },
  streakSummaryCard: {
    marginHorizontal: 16,
    marginVertical: 20,
    borderRadius: 16,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: PRIMARY_COLOR,
        shadowOffset: { width: 0,height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  streakSummaryGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    paddingHorizontal: 24,
    marginTop: 105
  },
  streakSummaryTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    marginLeft: 12,
  },
  streakChainDayContainer: {
    backgroundColor: '#22c55e',
  },
  streakChainDayText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  calendar: {
    marginHorizontal: 16,
    borderRadius: 16,
    paddingBottom: 10,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0,height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  dayContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  dayText: {
    fontSize: 16,
    color: TEXT_COLOR_DARK,
  },
  markedDayContainer: {
    backgroundColor: PRIMARY_COLOR,
  },
  markedDayText: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  todayDayContainer: {
    borderColor: PRIMARY_COLOR,
    borderWidth: 2,
  },
  todayDayText: {
    color: PRIMARY_COLOR,
    fontWeight: "bold",
  },
  todayMarkedDayContainer: {
    backgroundColor: "#FF6347",
    borderWidth: 2,
    borderColor: "#FF6347",
  },
  todayMarkedDayText: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  emojiStyle: {
    position: "absolute",
    bottom: -8,
    fontSize: 12,
  },
  currentStreakContainer: {
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 24,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0,height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  currentStreakLabel: {
    fontSize: 18,
    fontWeight: "600",
    color: TEXT_COLOR_MEDIUM,
    marginRight: 8,
  },
  currentStreakValue: {
    fontSize: 28,
    fontWeight: "800",
    color: PRIMARY_COLOR,
  },
  flameIcon: {
    marginRight: 10,
  },
  pointsSummaryContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0,height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  pointsSummaryGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  pointsSummaryTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    marginLeft: 8,
  },
  pointsSummaryValue: {
    fontSize: 24,
    fontWeight: "800",
    color: PRIMARY_COLOR,
  },
  pointsIcon: {
    marginRight: 4,
  },
  taskListContainer: {
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0,height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  taskListTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: TEXT_COLOR_DARK,
    marginBottom: 16,
    textAlign: "center",
  },
  taskItem: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: "hidden",
  },
  taskGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  taskInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  taskTextContainer: {
    flex: 1,
  },
  taskIcon: {
    marginRight: 16,
  },
  taskName: {
    fontSize: 17,
    fontWeight: "600",
    color: TEXT_COLOR_DARK,
  },
  taskNameCompleted: {
    color: "#FFFFFF",
  },
  taskPoints: {
    fontSize: 14,
    fontWeight: "400",
    color: TEXT_COLOR_LIGHT,
    marginTop: 4,
  },
  taskPointsCompleted: {
    color: "#E6F0FA",
  },
  detailsButton: {
    padding: 8,
    marginLeft: 8,
  },
  animationContainer: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: '80%',
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0,height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  modalHeader: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  modalContent: {
    padding: 20,
    alignItems: "center",
  },
  modalDescription: {
    fontSize: 15,
    fontWeight: "400",
    color: TEXT_COLOR_DARK,
    textAlign: "center",
    marginBottom: 20,
  },
  closeButton: {
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});