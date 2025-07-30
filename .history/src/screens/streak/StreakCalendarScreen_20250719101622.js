import { useState, useEffect } from "react"
import { View, Text, StyleSheet, ActivityIndicator, Platform } from "react-native"
import { Calendar, LocaleConfig } from "react-native-calendars"
import Header from "components/Header"
import { useNavigation } from "@react-navigation/native"
import apiUserService from "services/apiUserService"
import { Ionicons } from "@expo/vector-icons"
import LottieView from 'lottie-react-native';
import { LinearGradient } from "expo-linear-gradient"
import StreakCelebrationPopup from "components/StreakCelebrationPopup"

// Define consistent colors
const PRIMARY_COLOR = "#0056d2"
const ACCENT_COLOR = "#0EA5E9"
const TEXT_COLOR_DARK = "#1E293B"
const TEXT_COLOR_MEDIUM = "#475569"
const TEXT_COLOR_LIGHT = "#64748B"
const BACKGROUND_COLOR = "#F0F2F5"

// Cấu hình tiếng Việt cho lịch
LocaleConfig.locales["en"] = {
  monthNames: [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ],
  monthNamesShort: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  dayNames: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  dayNamesShort: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  today: "Today",
}
LocaleConfig.defaultLocale = "en"

export default function StreakCalendarScreen() {
  const navigation = useNavigation()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [streakDates, setStreakDates] = useState([])
  const [currentStreak, setCurrentStreak] = useState(0)
  const [lastCheckInDate, setLastCheckInDate] = useState(null)
  const [showStreakPopup, setShowStreakPopup] = useState(false)

  useEffect(() => {
    async function fetchUser() {
      try {
        const userId = 58
        const data = await apiUserService.getUserById(userId)
        setUser(data.data)
        const fetchedStreak = data.data.currentStreak || 0
        setCurrentStreak(fetchedStreak)
        setLastCheckInDate(data.data.lastCheckInDate)

        if (data.data.lastCheckInDate) {
          setStreakDates([data.data.lastCheckInDate.slice(0, 10)])
        } else {
          setStreakDates([])
        }

        // Kích hoạt hiệu ứng popup nếu có streak và streak lớn hơn 0
        if (fetchedStreak > 0) {
          setShowStreakPopup(true)
          const timer = setTimeout(() => {
            setShowStreakPopup(false)
          }, 4000) // Hiển thị trong 4 giây
          return () => clearTimeout(timer)
        }
      } catch (e) {
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [])

  // Thống kê streak liên tục theo tháng
  function getMonthlyStreaks(dates) {
    if (!dates || dates.length === 0) return {}

    const byMonth = {}
    dates.forEach((dateStr) => {
      const [year, month, day] = dateStr.split("-")
      const key = `${year}-${month}`
      if (!byMonth[key]) byMonth[key] = []
      byMonth[key].push(dateStr)
    })

    const result = {}
    Object.entries(byMonth).forEach(([month, arr]) => {
      const sorted = arr.sort()
      let maxStreak = 0
      let currentStreakInMonth = 0

      if (sorted.length > 0) {
        maxStreak = 1
        currentStreakInMonth = 1

        for (let i = 1; i < sorted.length; i++) {
          const prev = new Date(sorted[i - 1])
          const curr = new Date(sorted[i])
          const diff = (curr - prev) / (1000 * 60 * 60 * 24)

          if (diff === 1) {
            currentStreakInMonth++
            if (currentStreakInMonth > maxStreak) maxStreak = currentStreakInMonth
          } else {
            currentStreakInMonth = 1
          }
        }
      }
      result[month] = maxStreak
    })
    return result
  }

  const monthlyStreaks = getMonthlyStreaks(streakDates)

  // Đánh dấu các ngày đã checkin
  const markedDates = {}
  const today = new Date().toISOString().slice(0, 10)

  // Mark the streak chain (continuous streak days) in green
  if (lastCheckInDate && currentStreak > 0) {
    const streakDays = [];
    const lastDate = new Date(lastCheckInDate.slice(0, 10));
    for (let i = 0; i < currentStreak; i++) {
      const d = new Date(lastDate);
      d.setDate(lastDate.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      streakDays.push(dateStr);
    }
    streakDays.reverse();
    streakDays.forEach((dateStr, idx) => {
      markedDates[dateStr] = {
        selected: true,
        customStyles: {
          container: styles.streakChainDayContainer,
          text: styles.streakChainDayText,
        },
      };
      // Add flame emoji to the last day (lastCheckInDate)
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
  const CustomDay = ({ date, marking }) => {
    const isToday = date.dateString === today
    const isMarked = marking && marking.selected

    let containerStyle = styles.dayContainer
    let textStyle = styles.dayText
    let emoji = null

    if (isMarked) {
      containerStyle = { ...containerStyle, ...styles.markedDayContainer }
      textStyle = { ...textStyle, ...styles.markedDayText }
      if (marking.emoji) {
        emoji = marking.emoji
      }
    }

    if (isToday) {
      containerStyle = { ...containerStyle, ...styles.todayDayContainer }
      textStyle = { ...textStyle, ...styles.todayDayText }
      if (isMarked) {
        containerStyle = { ...containerStyle, ...styles.todayMarkedDayContainer }
        textStyle = { ...textStyle, ...styles.todayMarkedDayText }
      }
    }

    return (
      <View style={containerStyle}>
        <Text style={textStyle}>{date.day}</Text>
        {emoji && <Text style={styles.emojiStyle}>{emoji}</Text>}
      </View>
    )
  }

  // Determine flame intensity based on currentStreak
  const getFlameStyle = () => {
    let flameSize = 24
    let flameColor = "#FF6347"
    let flameShadow = {
      shadowColor: "#FF6347",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.4,
      shadowRadius: 4,
      elevation: 5,
    }

    if (currentStreak > 14) {
      flameSize = 48
      flameColor = "#FF0000"
      flameShadow = {
        shadowColor: "#FF0000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.6,
        shadowRadius: 12,
        elevation: 15,
      }
    } else if (currentStreak > 7) {
      flameSize = 36
      flameColor = "#FF4500"
      flameShadow = {
        shadowColor: "#FF4500",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
        elevation: 10,
      }
    } else if (currentStreak > 1) {
      flameSize = 28
      flameColor = "#FFA500"
      flameShadow = {
        shadowColor: "#FFA500",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.45,
        shadowRadius: 6,
        elevation: 7,
      }
    }

    return {
      iconSize: flameSize,
      iconColor: flameColor,
      iconShadow: flameShadow,
    }
  }

  const flameStyle = getFlameStyle()
  

  return (
    <View style={styles.container}>
      <Header title="Streak Calendar" onBack={() => navigation.goBack()} />

      {loading ? (
        <ActivityIndicator size="large" color={PRIMARY_COLOR} style={{ marginTop: 32 }} />
      ) : (
        <>
          {/* Thẻ tiêu đề chung cho Streak */}
          <View style={styles.streakSummaryCard}>
            <LinearGradient
              colors={[PRIMARY_COLOR, ACCENT_COLOR]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
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

          {/* Hiển thị currentStreak dưới lịch với hiệu ứng ngọn lửa */}
          <View style={styles.currentStreakContainer}>
            {currentStreak > 0 && (
              <View style={[styles.flameIcon, flameStyle.iconShadow, { width: flameStyle.iconSize * 1.4, height: flameStyle.iconSize * 1.4 }]}> 
                <LottieView
                  source={
                    currentStreak < 20
                      ? require('../../../assets/animation/FireStreakOrange.json')
                      : require('../../../assets/animation/StreakFire.json')
                  }
                  autoPlay
                  loop
                  style={{ width: '100%', height: '100%' }}
                />
              </View>
            )}
            <Text style={styles.currentStreakLabel}>Current Streak</Text>
            <Text style={styles.currentStreakValue}>
              {currentStreak > 0 ? `${currentStreak} days` : "No streak yet"}
            </Text>
          </View>
        </>
      )}

      {/* Render StreakCelebrationPopup và FallingFlamesOverlay */}

      <StreakCelebrationPopup isVisible={showStreakPopup} streakCount={currentStreak} />
      

    </View>
  )
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
        shadowOffset: { width: 0, height: 6 },
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
  },
  streakSummaryTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    marginLeft: 12,
  },
    streakChainDayContainer: {
    backgroundColor: '#22c55e', // Green highlight for streak chain
  },
  streakChainDayText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  monthlyStreaksContainer: {
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  monthlyStreaksTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: TEXT_COLOR_DARK,
    marginBottom: 12,
    textAlign: "center",
  },
  monthlyStreakItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  monthlyStreakText: {
    fontSize: 15,
    color: TEXT_COLOR_MEDIUM,
    marginLeft: 10,
    fontWeight: "500",
    textAlign: "center",
  },
  calendar: {
    marginHorizontal: 16,
    borderRadius: 16,
    paddingBottom: 10,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
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
    borderColor: "#FF6347",
    borderWidth: 2,
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
        shadowOffset: { width: 0, height: 2 },
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
  streakChainDayContainer: {
    backgroundColor: '#22c55e', // Green highlight for streak chain
  },
  streakChainDayText: {
    color: '#fff',
    fontWeight: 'bold',
  },
})
