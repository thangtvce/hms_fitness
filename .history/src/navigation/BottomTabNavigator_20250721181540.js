import { useState,useRef,useEffect } from "react"
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Modal,
  TouchableWithoutFeedback,
  Dimensions,
  Platform,
} from "react-native"
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import Icon from "react-native-vector-icons/Ionicons"
import HomeScreen from "screens/home/HomeScreen"
import SettingsScreen from "screens/setting/SettingsScreen"
import ServicePackageScreen from "screens/servicePackage/ServicePackageScreen"
import ActiveGroupsScreen from "screens/community/ActiveGroupsScreen"

const Tab = createBottomTabNavigator()
const { width } = Dimensions.get("window")

function CustomTabBar({ state,descriptors,navigation }) {
  const [modalVisible,setModalVisible] = useState(false)
  const insets = useSafeAreaInsets()
  const scaleAnim = useRef(new Animated.Value(0)).current
  const opacityAnim = useRef(new Animated.Value(0)).current
  const buttonAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (modalVisible) {
      Animated.parallel([
        Animated.timing(scaleAnim,{
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim,{
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(buttonAnim,{
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start()
    } else {
      Animated.timing(buttonAnim,{
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start()
      scaleAnim.setValue(0)
      opacityAnim.setValue(0)
    }
  },[modalVisible])

  const rotateZ = buttonAnim.interpolate({
    inputRange: [0,1],
    outputRange: ["0deg","45deg"],
  })

  const actionOptions = [
    {
      icon: "camera-outline",
      label: "Take Photo",
      color: "#4F46E5",
      onPress: () => {
        setModalVisible(false)
        navigation.navigate("FoodScannerScreen")
      },
    },
    {
      icon: "walk-outline",
      label: "Step Counter",
      color: "#10B981",
      onPress: () => {
        setModalVisible(false)
        navigation.navigate("StepCounter")
      },
    },
    {
      icon: "nutrition-outline",
      label: "Meal",
      color: "#F59E0B",
      onPress: () => {
        setModalVisible(false)
        navigation.navigate("Food")
      },
    },
    {
      icon: "water-outline",
      label: "Log Water",
      color: "#3B82F6",
      onPress: () => {
        setModalVisible(false)
        navigation.navigate("UserWaterLog")
      },
    },
    {
      icon: "medkit-outline",
      label: "Log Medication",
      color: "#EC4899",
      onPress: () => {
        setModalVisible(false)
        // Navigate to medication logging screen
      },
    },
    {
      icon: "bed-outline",
      label: "Log Sleep",
      color: "#8B5CF6",
      onPress: () => {
        setModalVisible(false)
        // Navigate to sleep logging screen
      },
    },
  ]

  return (
    <>
      <View style={[styles.tabBarContainer,{ paddingBottom: Math.max(insets.bottom,10) }]}>
        {/* Curved cutout background */}
        <View style={styles.curvedBackground} />

        <View style={styles.tabsRow}>
          {state.routes.slice(0,2).map((route,index) => {
            const { options } = descriptors[route.key]
            const label = options.tabBarLabel || options.title || route.name
            const isFocused = state.index === index

            let iconName
            switch (route.name) {
              case "Home":
                iconName = "home"
                break
              case "Profile":
                iconName = "compass"
              case "Services":
                iconName = "fitness";
                break
              default:
                iconName = "apps"
            }

            const onPress = () => {
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              })

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name)
              }
            }

            return (
              <TouchableOpacity
                key={route.key}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel}
                testID={options.tabBarTestID}
                onPress={onPress}
                style={styles.tabButton}
              >
                <Icon
                  name={isFocused ? iconName : `${iconName}-outline`}
                  size={24}
                  color={isFocused ? "#0056d2" : "#94A3B8"}
                />
                <Text style={[styles.tabLabel,{ color: isFocused ? "#0056d2" : "#94A3B8" }]}>{label}</Text>
              </TouchableOpacity>
            )
          })}

          <View style={styles.centerSpace} />

          {state.routes.slice(3,5).map((route,index) => {
            const actualIndex = index + 3
            const { options } = descriptors[route.key]
            const label = options.tabBarLabel || options.title || route.name
            const isFocused = state.index === actualIndex

            let iconName
            switch (route.name) {
              case "Community":
                iconName = "people"
                break
              case "Settings":
                iconName = "settings"
                break
              default:
                iconName = "apps"
            }

            const onPress = () => {
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              })

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name)
              }
            }

            return (
              <TouchableOpacity
                key={route.key}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel}
                testID={options.tabBarTestID}
                onPress={onPress}
                style={styles.tabButton}
              >
                <Icon
                  name={isFocused ? iconName : `${iconName}-outline`}
                  size={24}
                  color={isFocused ? "#0056d2" : "#94A3B8"}
                />
                <Text style={[styles.tabLabel,{ color: isFocused ? "#0056d2" : "#94A3B8" }]}>{label}</Text>
              </TouchableOpacity>
            )
          })}
        </View>

        {/* Center Action Button with circular background */}
        <Animated.View style={[styles.centerButtonContainer,{ transform: [{ rotateZ }] }]}>
          <TouchableOpacity
            style={styles.centerButton}
            onPress={() => setModalVisible(!modalVisible)}
            activeOpacity={0.8}
          >
            <Icon name="add" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        </Animated.View>
      </View>

      <Modal
        transparent={true}
        visible={modalVisible}
        animationType="none"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <Animated.View
                style={[
                  styles.modalContent,
                  {
                    opacity: opacityAnim,
                    transform: [{ scale: scaleAnim }],
                    paddingBottom: insets.bottom > 0 ? insets.bottom : 20,
                  },
                ]}
              >
                <View style={styles.modalHandle} />

                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Health Actions</Text>
                  <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
                    <Icon name="close" size={24} color="#6B7280" />
                  </TouchableOpacity>
                </View>

                <View style={styles.optionsGrid}>
                  {actionOptions.map((option,index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.optionButton}
                      onPress={option.onPress}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.optionIconContainer,{ backgroundColor: option.color }]}>
                        <Icon name={option.icon} size={24} color="#FFFFFF" />
                      </View>
                      <Text style={styles.optionLabel}>{option.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </Animated.View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  )
}

export default function BottomTabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Services" component={ServicePackageScreen} />
      <Tab.Screen name="Actions" component={HomeScreen} options={{ tabBarButton: () => null }} />
      <Tab.Screen name="Community" component={ActiveGroupsScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  )
}

const styles = StyleSheet.create({
  tabBarContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0,height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
    paddingTop: 10,
    height: 90,
  },
  tabsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    height: 60,
  },
  tabButton: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    height: 50,
  },
  centerSpace: {
    width: width / 5,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  tabLabel: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: "500",
  },
  centerButtonContainer: {
    position: "absolute",
    alignSelf: "center",
    top: -15,
    alignItems: "center",
    justifyContent: "center",
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#FFFFFF",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0,height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  centerButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#0056d2",
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#FF5722",
        shadowOffset: { width: 0,height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0,height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 16,
      },
    }),
  },
  modalHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#CBD5E1",
    alignSelf: "center",
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  closeButton: {
    padding: 4,
  },
  optionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  optionButton: {
    width: "30%",
    alignItems: "center",
    marginBottom: 24,
  },
  optionIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0,height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  optionLabel: {
    fontSize: 14,
    color: "#4B5563",
    textAlign: "center",
    fontWeight: "500",
  },
})
