import { useState,useEffect,useContext,useRef } from "react"
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    ActivityIndicator,
    Alert,
    Animated,
    Easing,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { Pedometer } from "expo-sensors"
import { LinearGradient } from "expo-linear-gradient"
import { AuthContext } from "context/AuthContext"
import FloatingMenuButton from "components/FloatingMenuButton"
import { StatusBar } from "expo-status-bar"
import { SafeAreaView } from "react-native-safe-area-context"

const { width,height } = Dimensions.get("window")
const CIRCLE_SIZE = 200

const RollingCounter = ({ value,style,duration = 800 }) => {
    const [displayValue,setDisplayValue] = useState(0)
    const animValue = useRef(new Animated.Value(0)).current

    useEffect(() => {
        if (value !== displayValue) {
            Animated.timing(animValue,{
                toValue: 1,
                duration: duration,
                easing: Easing.out(Easing.quad),
                useNativeDriver: false,
            }).start(() => {
                animValue.setValue(0)
            })

            const startValue = displayValue
            const difference = value - startValue
            const steps = Math.min(Math.abs(difference),30)

            if (steps === 0) {
                setDisplayValue(value)
                return
            }

            const stepDuration = duration / steps

            let currentStep = 0
            const interval = setInterval(() => {
                currentStep++
                const progress = currentStep / steps
                const easedProgress = Easing.out(Easing.quad)(progress)
                const newValue = Math.round(startValue + difference * easedProgress)

                setDisplayValue(newValue)

                if (currentStep >= steps) {
                    clearInterval(interval)
                    setDisplayValue(value)
                }
            },stepDuration)

            return () => clearInterval(interval)
        }
    },[value,displayValue,duration])

    return <Animated.Text style={style}>{displayValue.toLocaleString()}</Animated.Text>
}

export default function StepCounterScreen({ navigation }) {
    const { user } = useContext(AuthContext)
    const [isTracking,setIsTracking] = useState(false)
    const [steps,setSteps] = useState(0)
    const [todaySteps,setTodaySteps] = useState(0)
    const [duration,setDuration] = useState(0)
    const [loading,setLoading] = useState(false)
    const [error,setError] = useState(null)
    const [calories,setCalories] = useState(0)
    const [distance,setDistance] = useState(0)
    const [subscription,setSubscription] = useState(null)

    // Initialize all animated values properly
    const fadeAnim = useRef(new Animated.Value(0)).current
    const scaleAnim = useRef(new Animated.Value(0.8)).current
    const slideAnim = useRef(new Animated.Value(50)).current
    const stepCountAnim = useRef(new Animated.Value(0)).current
    const pulseAnim = useRef(new Animated.Value(1)).current
    const rotateAnim = useRef(new Animated.Value(0)).current

    // Initialize component
    useEffect(() => {
        checkPedometerAvailability()
        getTodaySteps()

        // Animate entrance
        Animated.parallel([
            Animated.timing(fadeAnim,{
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim,{
                toValue: 1,
                tension: 50,
                friction: 7,
                useNativeDriver: true,
            }),
            Animated.spring(slideAnim,{
                toValue: 0,
                tension: 40,
                friction: 8,
                useNativeDriver: true,
            }),
        ]).start()

        return () => {
            if (subscription) {
                subscription.remove()
            }
        }
    },[])

    // Continuous pulse animation when tracking
    useEffect(() => {
        let pulseAnimation
        if (isTracking) {
            pulseAnimation = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim,{
                        toValue: 1.05,
                        duration: 800,
                        easing: Easing.inOut(Easing.quad),
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim,{
                        toValue: 1,
                        duration: 800,
                        easing: Easing.inOut(Easing.quad),
                        useNativeDriver: true,
                    }),
                ]),
            )
            pulseAnimation.start()
        } else {
            // Reset pulse animation when not tracking
            Animated.timing(pulseAnim,{
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }).start()
        }

        return () => {
            if (pulseAnimation) {
                pulseAnimation.stop()
            }
        }
    },[isTracking])

    // Timer for duration tracking
    useEffect(() => {
        let timer
        if (isTracking) {
            timer = setInterval(() => {
                setDuration((prev) => prev + 1)
            },1000)
        }
        return () => {
            if (timer) clearInterval(timer)
        }
    },[isTracking])

    // Calculate calories and distance based on steps
    useEffect(() => {
        const estimatedCalories = Math.round(steps * 0.04)
        const estimatedDistance = (steps * 0.762) / 1000
        setCalories(estimatedCalories)
        setDistance(estimatedDistance)
    },[steps])

    const checkPedometerAvailability = async () => {
        try {
            const isAvailable = await Pedometer.isAvailableAsync()
            if (!isAvailable) {
                setError("Step counting is not available on this device")
            }
        } catch (err) {
            setError("Error checking step counter availability")
        }
    }

    const getTodaySteps = async () => {
        try {
            const isAvailable = await Pedometer.isAvailableAsync()
            if (isAvailable) {
                const start = new Date()
                start.setHours(0,0,0,0)
                const end = new Date()

                const result = await Pedometer.getStepCountAsync(start,end)
                setTodaySteps(result.steps || 0)
            }
        } catch (err) {
        }
    }

    const startTracking = async () => {
        try {
            setLoading(true)
            setError(null)

            const isAvailable = await Pedometer.isAvailableAsync()
            if (!isAvailable) {
                Alert.alert("Unavailable","Step counting is not supported on this device")
                setLoading(false)
                return
            }

            // Reset counters
            setSteps(0)
            setDuration(0)
            setCalories(0)
            setDistance(0)

            // Start watching step count
            const stepSubscription = Pedometer.watchStepCount((result) => {
                setSteps(result.steps)
            })

            setSubscription(stepSubscription)
            setIsTracking(true)
            setLoading(false)

            // Animate step counter position
            Animated.timing(stepCountAnim,{
                toValue: -10,
                duration: 500,
                easing: Easing.out(Easing.back(1.1)),
                useNativeDriver: true,
            }).start()
        } catch (err) {
            setError("Failed to start step tracking")
            setLoading(false)
        }
    }

    const stopTracking = () => {
        if (subscription) {
            subscription.remove()
            setSubscription(null)
        }
        setIsTracking(false)

        // Reset step counter position
        Animated.timing(stepCountAnim,{
            toValue: 0,
            duration: 500,
            easing: Easing.out(Easing.back(1.1)),
            useNativeDriver: true,
        }).start()
    }

    const resetTracking = () => {
        // Reset animation
        Animated.sequence([
            Animated.timing(rotateAnim,{
                toValue: 1,
                duration: 500,
                easing: Easing.out(Easing.back(1.2)),
                useNativeDriver: true,
            }),
            Animated.timing(rotateAnim,{
                toValue: 0,
                duration: 0,
                useNativeDriver: true,
            }),
        ]).start()

        stopTracking()
        setSteps(0)
        setDuration(0)
        setCalories(0)
        setDistance(0)
    }

    const formatDuration = (seconds) => {
        const hrs = Math.floor(seconds / 3600)
        const mins = Math.floor((seconds % 3600) / 60)
        const secs = seconds % 60
        return `${hrs.toString().padStart(2,"0")}:${mins.toString().padStart(2,"0")}:${secs.toString().padStart(2,"0")}`
    }

    const formatDistance = (km) => {
        return km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(2)}km`
    }

    if (error) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
                <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
                    <Text style={styles.errorTitle}>Step Counter Unavailable</Text>
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity style={styles.retryButton} onPress={() => navigation.goBack()}>
                        <Text style={styles.retryButtonText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        )
    }

    const spin = rotateAnim.interpolate({
        inputRange: [0,1],
        outputRange: ["0deg","360deg"],
    })

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

            {/* Header */}
            <Animated.View
                style={[
                    styles.header,
                    {
                        opacity: fadeAnim,
                        transform: [{ translateY: slideAnim }],
                    },
                ]}
            >
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="#1E293B" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Step Counter</Text>
                <TouchableOpacity style={styles.resetButton} onPress={resetTracking}>
                    <Animated.View style={{ transform: [{ rotate: spin }] }}>
                        <Ionicons name="refresh" size={24} color="#1E293B" />
                    </Animated.View>
                </TouchableOpacity>
            </Animated.View>

            <Animated.ScrollView
                style={[styles.container,{ opacity: fadeAnim }]}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Today's Steps Card */}
                <Animated.View
                    style={[
                        styles.todayCard,
                        {
                            transform: [{ translateY: slideAnim },{ scale: scaleAnim }],
                        },
                    ]}
                >
                    <View style={styles.todayHeader}>
                        <Ionicons name="calendar-outline" size={20} color="#4F46E5" />
                        <Text style={styles.todayTitle}>Today's Progress</Text>
                    </View>
                    <RollingCounter value={todaySteps} style={styles.todaySteps} duration={1000} />
                    <Text style={styles.todayLabel}>steps walked today</Text>
                </Animated.View>

                {/* Main Step Counter */}
                <Animated.View
                    style={[
                        styles.circleContainer,
                        {
                            transform: [{ scale: scaleAnim },{ translateY: stepCountAnim }],
                        },
                    ]}
                >
                    <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                        <LinearGradient
                            colors={isTracking ? ["#4F46E5","#7C3AED"] : ["#E2E8F0","#CBD5E1"]}
                            style={styles.circle}
                            start={{ x: 0,y: 0 }}
                            end={{ x: 1,y: 1 }}
                        >
                            <RollingCounter
                                value={steps}
                                style={[styles.circleText,!isTracking && styles.inactiveText]}
                                duration={600}
                            />
                            <Text style={[styles.circleLabel,!isTracking && styles.inactiveText]}>Steps</Text>
                            {isTracking && (
                                <View style={styles.pulseIndicator}>
                                    <Ionicons name="radio-button-on" size={12} color="#10B981" />
                                    <Text style={styles.liveText}>LIVE</Text>
                                </View>
                            )}
                        </LinearGradient>
                    </Animated.View>
                </Animated.View>

                {/* Stats Grid */}
                <Animated.View
                    style={[
                        styles.statsGrid,
                        {
                            transform: [{ translateY: slideAnim }],
                            opacity: fadeAnim,
                        },
                    ]}
                >
                    <View style={styles.statCard}>
                        <Ionicons name="time-outline" size={24} color="#3B82F6" />
                        <Text style={styles.statValue}>{formatDuration(duration)}</Text>
                        <Text style={styles.statLabel}>Duration</Text>
                    </View>

                    <View style={styles.statCard}>
                        <Ionicons name="flame-outline" size={24} color="#EF4444" />
                        <RollingCounter value={calories} style={styles.statValue} duration={400} />
                        <Text style={styles.statLabel}>Calories</Text>
                    </View>

                    <View style={styles.statCard}>
                        <Ionicons name="location-outline" size={24} color="#10B981" />
                        <Text style={styles.statValue}>{formatDistance(distance)}</Text>
                        <Text style={styles.statLabel}>Distance</Text>
                    </View>
                </Animated.View>

                {/* Control Buttons */}
                <Animated.View
                    style={[
                        styles.buttonContainer,
                        {
                            transform: [{ translateY: slideAnim }],
                            opacity: fadeAnim,
                        },
                    ]}
                >
                    {!isTracking ? (
                        <TouchableOpacity style={[styles.button,styles.startButton]} onPress={startTracking} disabled={loading}>
                            {loading ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <>
                                    <Ionicons name="play" size={24} color="#FFFFFF" />
                                    <Text style={styles.startButtonText}>Start Tracking</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity style={[styles.button,styles.stopButton]} onPress={stopTracking}>
                            <Ionicons name="stop" size={24} color="#FFFFFF" />
                            <Text style={styles.stopButtonText}>Stop Tracking</Text>
                        </TouchableOpacity>
                    )}
                </Animated.View>

                {/* Tips Card */}
                <Animated.View
                    style={[
                        styles.tipsCard,
                        {
                            transform: [{ translateY: slideAnim }],
                            opacity: fadeAnim,
                        },
                    ]}
                >
                    <View style={styles.tipsHeader}>
                        <Ionicons name="bulb-outline" size={20} color="#F59E0B" />
                        <Text style={styles.tipsTitle}>Tips</Text>
                    </View>
                    <Text style={styles.tipsText}>
                        • Keep your phone with you while walking{"\n"}• Aim for 10,000 steps per day{"\n"}• Take regular breaks
                        during long walks
                    </Text>
                </Animated.View>
            </Animated.ScrollView>
            <FloatingMenuButton
                initialPosition={{ x: width - 70,y: height - 150 }}
                autoHide={true}
                navigation={navigation}
                autoHideDelay={4000}
            />
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: "#FFFFFF",
    },
    container: {
        flex: 1,
        backgroundColor: "#F8FAFC",
    },
    scrollContent: {
        paddingBottom: 32,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 16,
        backgroundColor: "#FFFFFF",
        borderBottomWidth: 1,
        borderBottomColor: "#E2E8F0",
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#1E293B",
    },
    backButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: "#F1F5F9",
    },
    resetButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: "#F1F5F9",
    },
    todayCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 20,
        marginHorizontal: 16,
        marginTop: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0,height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    todayHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 8,
    },
    todayTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1E293B",
        marginLeft: 8,
    },
    todaySteps: {
        fontSize: 32,
        fontWeight: "700",
        color: "#4F46E5",
        textAlign: "center",
    },
    todayLabel: {
        fontSize: 14,
        color: "#64748B",
        textAlign: "center",
        marginTop: 4,
    },
    circleContainer: {
        alignItems: "center",
        marginVertical: 32,
    },
    circle: {
        width: CIRCLE_SIZE,
        height: CIRCLE_SIZE,
        borderRadius: CIRCLE_SIZE / 2,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#4F46E5",
        shadowOffset: { width: 0,height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
    },
    circleText: {
        fontSize: 42,
        fontWeight: "700",
        color: "#FFFFFF",
    },
    circleLabel: {
        fontSize: 18,
        color: "rgba(255, 255, 255, 0.9)",
        marginTop: 4,
    },
    inactiveText: {
        color: "#64748B",
    },
    pulseIndicator: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 8,
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    liveText: {
        fontSize: 10,
        fontWeight: "700",
        color: "#10B981",
        marginLeft: 4,
    },
    statsGrid: {
        flexDirection: "row",
        marginHorizontal: 16,
        marginBottom: 24,
        gap: 12,
    },
    statCard: {
        flex: 1,
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 16,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0,height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    statValue: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1E293B",
        marginTop: 8,
    },
    statLabel: {
        fontSize: 12,
        color: "#64748B",
        marginTop: 4,
    },
    buttonContainer: {
        paddingHorizontal: 16,
        marginBottom: 24,
    },
    button: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 16,
        borderRadius: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0,height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    startButton: {
        backgroundColor: "#4F46E5",
    },
    stopButton: {
        backgroundColor: "#EF4444",
    },
    startButtonText: {
        fontSize: 18,
        fontWeight: "600",
        color: "#FFFFFF",
        marginLeft: 8,
    },
    stopButtonText: {
        fontSize: 18,
        fontWeight: "600",
        color: "#FFFFFF",
        marginLeft: 8,
    },
    tipsCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 20,
        marginHorizontal: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0,height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    tipsHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
    },
    tipsTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1E293B",
        marginLeft: 8,
    },
    tipsText: {
        fontSize: 14,
        color: "#64748B",
        lineHeight: 20,
    },
    errorContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 32,
        backgroundColor: "#F8FAFC",
    },
    errorTitle: {
        fontSize: 24,
        fontWeight: "700",
        color: "#1E293B",
        marginTop: 16,
        marginBottom: 8,
    },
    errorText: {
        fontSize: 16,
        color: "#64748B",
        textAlign: "center",
        marginBottom: 24,
        lineHeight: 24,
    },
    retryButton: {
        backgroundColor: "#4F46E5",
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 12,
    },
    retryButtonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "600",
    },
})
