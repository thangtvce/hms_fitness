import { View, Text, TouchableOpacity, Modal, StyleSheet } from "react-native"
import dayjs from "dayjs"

const DatePicker = ({ visible, onClose, selectedDate, onDateSelect }) => {
  const generateCalendarDays = () => {
    const startOfMonth = dayjs(selectedDate).startOf("month")
    const endOfMonth = dayjs(selectedDate).endOf("month")
    const startDate = startOfMonth.startOf("week")
    const endDate = endOfMonth.endOf("week")

    const days = []
    let current = startDate

    while (current.isBefore(endDate) || current.isSame(endDate, "day")) {
      days.push(current)
      current = current.add(1, "day")
    }

    return days
  }

  const days = generateCalendarDays()
  const currentMonth = dayjs(selectedDate)

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => onDateSelect(currentMonth.subtract(1, "month").toDate())}>
              <Text style={styles.navButton}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.monthYear}>{currentMonth.format("MMMM YYYY")}</Text>
            <TouchableOpacity onPress={() => onDateSelect(currentMonth.add(1, "month").toDate())}>
              <Text style={styles.navButton}>›</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.weekDays}>
            {["CN", "T2", "T3", "T4", "T5", "T6", "T7"].map((day) => (
              <Text key={day} style={styles.weekDay}>
                {day}
              </Text>
            ))}
          </View>

          <View style={styles.calendar}>
            {days.map((day, index) => {
              const isCurrentMonth = day.isSame(currentMonth, "month")
              const isSelected = day.isSame(selectedDate, "day")
              const isToday = day.isSame(dayjs(), "day")

              return (
                <TouchableOpacity
                  key={index}
                  style={[styles.day, isSelected && styles.selectedDay, isToday && styles.today]}
                  onPress={() => {
                    onDateSelect(day.toDate())
                    onClose()
                  }}
                >
                  <Text
                    style={[
                      styles.dayText,
                      !isCurrentMonth && styles.otherMonthDay,
                      isSelected && styles.selectedDayText,
                      isToday && styles.todayText,
                    ]}
                  >
                    {day.format("D")}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Đóng</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    width: "90%",
    maxWidth: 350,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  navButton: {
    fontSize: 24,
    color: "#4F46E5",
    fontWeight: "bold",
    padding: 10,
  },
  monthYear: {
    fontSize: 18,
    fontWeight: "600",
  },
  weekDays: {
    flexDirection: "row",
    marginBottom: 10,
  },
  weekDay: {
    flex: 1,
    textAlign: "center",
    fontSize: 14,
    fontWeight: "500",
    color: "#64748B",
    paddingVertical: 8,
  },
  calendar: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  day: {
    width: "14.28%",
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
  },
  selectedDay: {
    backgroundColor: "#4F46E5",
  },
  today: {
    backgroundColor: "#EEF2FF",
  },
  dayText: {
    fontSize: 16,
    color: "#1F2937",
  },
  otherMonthDay: {
    color: "#D1D5DB",
  },
  selectedDayText: {
    color: "#fff",
    fontWeight: "bold",
  },
  todayText: {
    color: "#4F46E5",
    fontWeight: "bold",
  },
  closeButton: {
    backgroundColor: "#4F46E5",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  closeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
})

export default DatePicker
