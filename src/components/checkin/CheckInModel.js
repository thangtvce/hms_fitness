import React,{ useState,useEffect,useImperativeHandle,forwardRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Alert,
    Animated,
    Dimensions,
    Platform,
} from "react-native";

import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import apiUserService from "services/apiUserService";
import { StatusBar } from "expo-status-bar";

const { width,height } = Dimensions.get("window");

const isToday = (dateStr) => {
    if (!dateStr) return false;
    const today = new Date();
    const saved = new Date(dateStr);
    return (
        saved.getFullYear() === today.getFullYear() &&
        saved.getMonth() === today.getMonth() &&
        saved.getDate() === today.getDate()
    );
};

const FireworkParticle = ({ delay = 0 }) => {
    const animatedValue = new Animated.Value(0);
    const scaleValue = new Animated.Value(0);
    const opacityValue = new Animated.Value(1);

    useEffect(() => {
        const startAnimation = () => {
            Animated.sequence([
                Animated.delay(delay),
                Animated.parallel([
                    Animated.timing(animatedValue,{
                        toValue: 1,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(scaleValue,{
                        toValue: 1,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                    Animated.timing(opacityValue,{
                        toValue: 0,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                ]),
            ]).start();
        };

        startAnimation();
    },[]);

    const translateY = animatedValue.interpolate({
        inputRange: [0,1],
        outputRange: [0,-200],
    });

    const translateX = animatedValue.interpolate({
        inputRange: [0,1],
        outputRange: [0,Math.random() * 200 - 100],
    });

    return (
        <Animated.View
            style={[
                styles.checkInFireworkParticle,
                {
                    transform: [{ translateX },{ translateY },{ scale: scaleValue }],
                    opacity: opacityValue,
                },
            ]}
        >
            <Text style={styles.checkInFireworkEmoji}>✨</Text>
        </Animated.View>
    );
};

const SuccessCelebration = ({ visible,onComplete }) => {
    const scaleAnim = new Animated.Value(0);
    const rotateAnim = new Animated.Value(0);
    const pulseAnim = new Animated.Value(1);

    useEffect(() => {
        if (visible) {
            Animated.sequence([
                Animated.spring(scaleAnim,{
                    toValue: 1,
                    tension: 50,
                    friction: 3,
                    useNativeDriver: true,
                }),
                Animated.timing(rotateAnim,{
                    toValue: 1,
                    duration: 500,
                    useNativeDriver: true,
                }),
            ]).start();

            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim,{
                        toValue: 1.1,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim,{
                        toValue: 1,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                ])
            ).start();

            setTimeout(() => {
                onComplete();
            },3000);
        }
    },[visible,onComplete]);

    const rotate = rotateAnim.interpolate({
        inputRange: [0,1],
        outputRange: ["0deg","360deg"],
    });

    if (!visible) return null;

    return (
        <Modal transparent animationType="fade" visible={visible}>
            <View style={styles.checkInCelebrationOverlay}>
                <StatusBar backgroundColor="rgba(79, 70, 229, 0.9)" barStyle="light-content" />
                {[...Array(12)].map((_,index) => (
                    <FireworkParticle key={index} delay={index * 100} />
                ))}
                <Animated.View
                    style={[
                        styles.checkInCelebrationContent,
                        {
                            transform: [{ scale: scaleAnim },{ rotate }],
                        },
                    ]}
                >
                    <LinearGradient colors={["#4F46E5","#7C3AED","#EC4899"]} style={styles.checkInCelebrationCard}>
                        <Animated.View style={[styles.checkInSuccessIcon,{ transform: [{ scale: pulseAnim }] }]}>
                            <Ionicons name="checkmark-circle" size={80} color="#FFFFFF" />
                        </Animated.View>
                        <Text style={styles.checkInCelebrationTitle}>🎉 Awesome!</Text>
                        <Text style={styles.checkInCelebrationSubtitle}>Daily Check-in Complete!</Text>
                        <Text style={styles.checkInCelebrationMessage}>You're building healthy habits! 💪</Text>
                        <View style={styles.checkInStreakContainer}>
                            <Text style={styles.checkInStreakText}>🔥 Keep the streak going!</Text>
                        </View>
                    </LinearGradient>
                </Animated.View>
                <View style={styles.checkInFloatingEmojis}>
                    <Text style={[styles.checkInFloatingEmoji,{ top: "20%",left: "10%" }]}>💪</Text>
                    <Text style={[styles.checkInFloatingEmoji,{ top: "30%",right: "15%" }]}>🏃‍♂️</Text>
                    <Text style={[styles.checkInFloatingEmoji,{ top: "60%",left: "20%" }]}>🥗</Text>
                    <Text style={[styles.checkInFloatingEmoji,{ top: "70%",right: "10%" }]}>💚</Text>
                    <Text style={[styles.checkInFloatingEmoji,{ top: "40%",left: "5%" }]}>⭐</Text>
                    <Text style={[styles.checkInFloatingEmoji,{ top: "50%",right: "5%" }]}>🎯</Text>
                </View>
            </View >
        </Modal >
    );
};

const CheckInModal = forwardRef(({ setHasCheckedIn },ref) => {
    const [visible,setVisible] = useState(false);
    const [showCelebration,setShowCelebration] = useState(false);
    const [loading,setLoading] = useState(false);
    const scaleAnim = new Animated.Value(1); // Start at 1 to avoid initial scaling issues
    const slideAnim = new Animated.Value(0); // Start at 0 to ensure modal is in view

    const show = () => {
        setVisible(true);
        setScaleAnim(0); // Reset scale for animation
        setSlideAnim(height); // Reset slide for animation
        Animated.parallel([
            Animated.spring(scaleAnim,{
                toValue: 1,
                tension: 50,
                friction: 8,
                useNativeDriver: true,
            }),
            Animated.spring(slideAnim,{
                toValue: 0,
                tension: 50,
                friction: 8,
                useNativeDriver: true,
            }),
        ]).start();
    };

    const hide = () => {
        Animated.parallel([
            Animated.timing(scaleAnim,{
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim,{
                toValue: height,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start(() => {
            setVisible(false);
        });
    };

    useImperativeHandle(ref,() => ({
        show: async () => {
            try {
                const accessToken = await AsyncStorage.getItem("accessToken");
                if (!accessToken) {
                    Alert.alert("Error","Please log in to check in.");
                    return;
                }

                const lastDate = await AsyncStorage.getItem("lastCheckInDate1");
                if (!isToday(lastDate)) {
                    show();
                } else {
                    Alert.alert("Info","You've already checked in today!");
                }
            } catch (err) {

            }
        },
    }));

    const confirmCheckIn = async () => {
        setLoading(true);
        try {
            // await apiUserService.checkInUser();
            // await AsyncStorage.setItem("lastCheckInDate",new Date().toISOString());
            setTimeout(() => {
                setShowCelebration(true);
                setHasCheckedIn(true);
            },300);
        } catch (err) {
            Alert.alert("❌ Check-in Failed",err.message || "Something went wrong. Please try again.",[
                { text: "OK",style: "default" },
            ]);
        } finally {
            setLoading(false);
            hide();
        }
    };

    const handleCelebrationComplete = () => {
        setShowCelebration(false);
    };

    return (
        <>
            {visible && (
                <Modal transparent animationType="none" visible={visible}>
                    <View style={styles.checkInOverlay}>
                        <StatusBar backgroundColor="rgba(0, 0, 0, 0.7)" barStyle="light-content" />
                        <Animated.View
                            style={[
                                styles.checkInModalContainer,
                                {
                                    transform: [{ scale: scaleAnim },{ translateY: slideAnim }],
                                },
                            ]}
                        >
                            <LinearGradient colors={["#4F46E5","#6366F1","#8B5CF6"]} style={styles.checkInModal}>
                                <View style={styles.checkInModalHeader}>
                                    <View style={styles.checkInIconContainer}>
                                        <Ionicons name="fitness" size={40} color="#FFFFFF" />
                                    </View>
                                    <Text style={styles.checkInTitle}>Daily Health Check-in</Text>
                                    <Text style={styles.checkInSubtitle}>Start your day with a healthy commitment! 🌟</Text>
                                </View>
                                <View style={styles.checkInModalContent}>
                                    <View style={styles.checkInBenefitsList}>
                                        <View style={styles.checkInBenefitItem}>
                                            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                                            <Text style={styles.checkInBenefitText}>Track your daily progress</Text>
                                        </View>
                                        <View style={styles.checkInBenefitItem}>
                                            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                                            <Text style={styles.checkInBenefitText}>Build healthy habits</Text>
                                        </View>
                                        <View style={styles.checkInBenefitItem}>
                                            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                                            <Text style={styles.checkInBenefitText}>Stay motivated daily</Text>
                                        </View>
                                    </View>
                                    <View style={styles.checkInMotivationContainer}>
                                        <Text style={styles.checkInMotivationText}>
                                            "Every day is a new opportunity to improve your health!" 💪
                                        </Text>
                                    </View>
                                </View>
                                <View style={styles.checkInButtonContainer}>
                                    <TouchableOpacity style={styles.checkInLaterButton} onPress={hide} activeOpacity={0.8}>
                                        <Text style={styles.checkInLaterButtonText}>Maybe Later</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.checkInCheckInButton,loading && styles.checkInCheckInButtonDisabled]}
                                        onPress={confirmCheckIn}
                                        disabled={loading}
                                        activeOpacity={0.8}
                                    >
                                        <LinearGradient
                                            colors={loading ? ["#9CA3AF","#6B7280"] : ["#10B981","#059669"]}
                                            style={styles.checkInCheckInButtonGradient}
                                        >
                                            {loading ? (
                                                <View style={styles.checkInLoadingContainer}>
                                                    <Text style={styles.checkInLoadingText}>Checking in...</Text>
                                                </View>
                                            ) : (
                                                <>
                                                    <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                                                    <Text style={styles.checkInCheckInButtonText}>Check In Now!</Text>
                                                </>
                                            )}
                                        </LinearGradient>
                                    </TouchableOpacity>
                                </View>
                            </LinearGradient>
                        </Animated.View>
                    </View>
                </Modal>
            )}
            <SuccessCelebration visible={showCelebration} onComplete={handleCelebrationComplete} />
        </>
    );
});

const styles = StyleSheet.create({
    checkInOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 20,
    },
    checkInModalContainer: {
        width: "100%",
        maxWidth: 380,
        zIndex: 1000, // Reasonable zIndex value
    },
    checkInModal: {
        borderRadius: 24,
        overflow: "visible", // Changed to visible to prevent clipping
        ...Platform.select({
            ios: {
                shadowColor: "#4F46E5",
                shadowOffset: { width: 0,height: 10 },
                shadowOpacity: 0.3,
                shadowRadius: 20,
            },
            android: {
                elevation: 10,
            },
        }),
    },
    checkInModalHeader: {
        alignItems: "center",
        paddingTop: 32,
        paddingHorizontal: 24,
        paddingBottom: 20,
    },
    checkInIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 16,
    },
    checkInTitle: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#FFFFFF",
        textAlign: "center",
        marginBottom: 8,
    },
    checkInSubtitle: {
        fontSize: 16,
        color: "rgba(255, 255, 255, 0.9)",
        textAlign: "center",
        lineHeight: 22,
    },
    checkInModalContent: {
        backgroundColor: "#FFFFFF",
        paddingHorizontal: 24,
        paddingVertical: 24,
    },
    checkInBenefitsList: {
        marginBottom: 20,
    },
    checkInBenefitItem: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
    },
    checkInBenefitText: {
        fontSize: 16,
        color: "#374151",
        marginLeft: 12,
        fontWeight: "500",
    },
    checkInMotivationContainer: {
        backgroundColor: "#F0FDF4",
        padding: 16,
        borderRadius: 12,
        borderLeftWidth: 4,
        borderLeftColor: "#10B981",
    },
    checkInMotivationText: {
        fontSize: 15,
        color: "#065F46",
        fontStyle: "italic",
        textAlign: "center",
        lineHeight: 22,
    },
    checkInButtonContainer: {
        flexDirection: "row",
        paddingHorizontal: 24,
        paddingBottom: 24,
        paddingTop: 24,
        gap: 12,
    },
    checkInLaterButton: {
        flex: 1,
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: "center",
    },
    checkInLaterButtonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "600",
    },
    checkInCheckInButton: {
        flex: 2,
        borderRadius: 12,
        overflow: "hidden",
    },
    checkInCheckInButtonDisabled: {
        opacity: 0.7,
    },
    checkInCheckInButtonGradient: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 16,
        paddingHorizontal: 20,
    },
    checkInCheckInButtonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "bold",
        marginLeft: 8,
    },
    checkInLoadingContainer: {
        flexDirection: "row",
        alignItems: "center",
    },
    checkInLoadingText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "600",
    },
    checkInCelebrationOverlay: {
        flex: 1,
        backgroundColor: "rgba(79, 70, 229, 0.9)",
        justifyContent: "center",
        alignItems: "center",
        position: "relative",
    },
    checkInCelebrationContent: {
        alignItems: "center",
    },
    checkInCelebrationCard: {
        borderRadius: 24,
        paddingVertical: 40,
        paddingHorizontal: 32,
        alignItems: "center",
        minWidth: 300,
        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOffset: { width: 0,height: 10 },
                shadowOpacity: 0.3,
                shadowRadius: 20,
            },
            android: {
                elevation: 10,
            },
        }),
    },
    checkInSuccessIcon: {
        marginBottom: 20,
    },
    checkInCelebrationTitle: {
        fontSize: 32,
        fontWeight: "bold",
        color: "#FFFFFF",
        marginBottom: 8,
        textAlign: "center",
    },
    checkInCelebrationSubtitle: {
        fontSize: 20,
        color: "rgba(255, 255, 255, 0.9)",
        marginBottom: 12,
        textAlign: "center",
        fontWeight: "600",
    },
    checkInCelebrationMessage: {
        fontSize: 16,
        color: "rgba(255, 255, 255, 0.8)",
        textAlign: "center",
        marginBottom: 24,
        lineHeight: 22,
    },
    checkInStreakContainer: {
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 20,
    },
    checkInStreakText: {
        fontSize: 16,
        color: "#FFFFFF",
        fontWeight: "600",
        textAlign: "center",
    },
    checkInFireworkParticle: {
        position: "absolute",
        top: "50%",
        left: "50%",
    },
    checkInFireworkEmoji: {
        fontSize: 24,
    },
    checkInFloatingEmojis: {
        position: "absolute",
        width: "100%",
        height: "100%",
    },
    checkInFloatingEmoji: {
        position: "absolute",
        fontSize: 32,
        opacity: 0.7,
    },
});

export default CheckInModal;