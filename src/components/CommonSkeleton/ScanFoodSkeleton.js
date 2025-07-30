import { useEffect,useRef,useState } from "react"
import { View,StyleSheet,Platform,Animated,Text,Image } from "react-native"
import { LinearGradient } from "expo-linear-gradient"

const ScanFoodSkeleton = ({ containerStyle }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current
    const shimmerAnim = useRef(new Animated.Value(0)).current
    const [loadingText,setLoadingText] = useState("Scanning food...")

    const loadingMessages = [
        "Scanning food...",
        "Identifying ingredients...",
        "Analyzing nutrition...",
        "Almost done...",
    ]

    useEffect(() => {
        Animated.timing(fadeAnim,{
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
        }).start()

        const shimmerLoop = Animated.loop(
            Animated.timing(shimmerAnim,{
                toValue: 1,
                duration: 2000,
                useNativeDriver: true,
            }),
        )

        shimmerLoop.start()

        const interval = setInterval(() => {
            setLoadingText((prev) => {
                const idx = loadingMessages.indexOf(prev)
                return loadingMessages[(idx + 1) % loadingMessages.length]
            })
        },2000)

        return () => {
            shimmerLoop.stop()
            clearInterval(interval)
        }
    },[])

    const shimmerTranslate = shimmerAnim.interpolate({
        inputRange: [0,1],
        outputRange: [-200,200],
    })

    return (
        <View style={[styles.container,containerStyle]}>
            {/* Logo + Status */}
            <Animated.View style={[styles.logoSection,{ opacity: fadeAnim }]}>
                <View style={styles.logoWrapper}>
                    <LinearGradient colors={["#fff","#f3f4f6"]} style={styles.logoCircle}>
                        <Image
                            source={require("../../../assets/images/logo_loading.png")}
                            style={{ width: 120,height: 120 }}
                            resizeMode="contain"
                        />
                    </LinearGradient>
                </View>
                <Text style={styles.loadingText}>{loadingText}</Text>
            </Animated.View>

            {/* Placeholder food card */}
            <Animated.View style={[styles.card,{ opacity: fadeAnim }]}>
                <LinearGradient colors={["#ffffff","#f9fafb"]} style={styles.cardGradient}>
                    <View style={styles.shimmerContainer}>
                        <Animated.View
                            style={[
                                styles.shimmerOverlay,
                                {
                                    transform: [{ translateX: shimmerTranslate }],
                                },
                            ]}
                        />
                    </View>

                    <View style={styles.foodInfo}>
                        <View style={[styles.skeletonLine,{ width: "60%" }]} />
                        <View style={[styles.skeletonLine,{ width: "40%",marginTop: 8 }]} />
                        <View style={[styles.skeletonLine,{ width: "80%",marginTop: 8 }]} />
                        <View style={[styles.skeletonLine,{ width: "50%",marginTop: 8 }]} />
                    </View>
                </LinearGradient>
            </Animated.View>

            {/* Nutrition bar */}
            <Animated.View style={[styles.card,{ opacity: fadeAnim }]}>
                <LinearGradient colors={["#ffffff","#f9fafb"]} style={styles.cardGradient}>
                    <View style={styles.shimmerContainer}>
                        <Animated.View
                            style={[
                                styles.shimmerOverlay,
                                {
                                    transform: [{ translateX: shimmerTranslate }],
                                },
                            ]}
                        />
                    </View>
                    <View style={styles.nutritionBar}>
                        <View style={[styles.skeletonBar,{ width: "30%" }]} />
                        <View style={[styles.skeletonBar,{ width: "50%" }]} />
                        <View style={[styles.skeletonBar,{ width: "40%" }]} />
                    </View>
                </LinearGradient>
            </Animated.View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F8FAFC",
        alignItems: "center",
        paddingTop: Platform.OS === "android" ? 100 : 80,
        gap: 20,
    },
    logoSection: {
        alignItems: "center",
        marginBottom: 16,
    },
    logoWrapper: {
        width: 100,
        height: 100,
        borderRadius: 50,
        overflow: "hidden",
        marginBottom: 12,
    },
    logoCircle: {
        flex: 1,
        borderRadius: 50,
        justifyContent: "center",
        alignItems: "center",
    },
    loadingText: {
        fontSize: 18,
        fontWeight: "600",
        color: "#1E293B",
    },
    card: {
        width: "90%",
        height: 140,
        borderRadius: 16,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0,height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
    },
    cardGradient: {
        flex: 1,
        padding: 20,
        position: "relative",
    },
    shimmerContainer: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: "hidden",
    },
    shimmerOverlay: {
        position: "absolute",
        top: 0,
        left: 0,
        height: "100%",
        width: 100,
        backgroundColor: "rgba(255,255,255,0.4)",
        transform: [{ skewX: "-20deg" }],
    },
    skeletonLine: {
        height: 14,
        backgroundColor: "#E2E8F0",
        borderRadius: 7,
    },
    skeletonBar: {
        height: 10,
        backgroundColor: "#E2E8F0",
        borderRadius: 5,
        marginVertical: 6,
    },
    foodInfo: {
        marginTop: 10,
    },
    nutritionBar: {
        marginTop: 10,
    },
})

export default ScanFoodSkeleton
