import { useState,useRef,useEffect } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    Animated,
    PanResponder,
    Dimensions,
    StyleSheet,
    Modal,
    Vibration,
    Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

const { width: screenWidth,height: screenHeight } = Dimensions.get("window");

const FloatingMenuButton = ({
    navigation,
    initialPosition = { x: screenWidth - 80,y: screenHeight / 2 },
    buttonSize = 56,
    menuRadius = 120,
    autoHide = true,
    autoHideDelay = 3000,
}) => {
    const insets = useSafeAreaInsets();
    const [isMenuVisible,setIsMenuVisible] = useState(false);
    const [isDragging,setIsDragging] = useState(false);
    const [isVisible,setIsVisible] = useState(true);

    const menuItems = [
        {
            id: "home",
            title: "Home",
            icon: "home-outline",
            onPress: () => navigation.navigate("Main"),
            color: "#4F46E5",
            backgroundColor: "#EEF2FF",
        },
        {
            id: "profile",
            title: "Profile",
            icon: "person-outline",
            onPress: () => navigation.navigate("Profile"),
            color: "#10B981",
            backgroundColor: "#F0FDF4",
        },
        {
            id: "settings",
            title: "Settings",
            icon: "settings-outline",
            onPress: () => navigation.navigate("Settings"),
            color: "#F59E0B",
            backgroundColor: "#FFFBEB",
        },
        {
            id: "back",
            title: "Back",
            icon: "arrow-back-outline",
            onPress: () => navigation.goBack(),
            color: "#EF4444",
            backgroundColor: "#FEF2F2",
        },
        {
            id: "search",
            title: "Search",
            icon: "search-outline",
            onPress: () => navigation.navigate("Search"),
            color: "#8B5CF6",
            backgroundColor: "#F5F3FF",
        },
        {
            id: "notifications",
            title: "Alerts",
            icon: "notifications-outline",
            onPress: () => navigation.navigate("Notifications"),
            color: "#06B6D4",
            backgroundColor: "#F0F9FF",
        },
    ];

    const positionX = useRef(new Animated.Value(initialPosition.x)).current;
    const positionY = useRef(new Animated.Value(initialPosition.y)).current;
    const scale = useRef(new Animated.Value(1)).current;
    const opacity = useRef(new Animated.Value(0.8)).current;
    const menuScale = useRef(new Animated.Value(0)).current;
    const menuOpacity = useRef(new Animated.Value(0)).current;

    const autoHideTimer = useRef(null);

    const resetAutoHideTimer = () => {
        if (autoHideTimer.current) {
            clearTimeout(autoHideTimer.current);
        }
        if (autoHide && !isMenuVisible) {
            autoHideTimer.current = setTimeout(() => {
                hideButton();
            },autoHideDelay);
        }
    };

    const showButton = () => {
        setIsVisible(true);
        Animated.timing(opacity,{
            toValue: 0.8,
            duration: 300,
            useNativeDriver: true,
        }).start();
        resetAutoHideTimer();
    };

    const hideButton = () => {
        if (!isMenuVisible) {
            Animated.timing(opacity,{
                toValue: 0.3,
                duration: 300,
                useNativeDriver: true,
            }).start();
        }
    };

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_,gestureState) => {
                return Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5;
            },
            onPanResponderGrant: () => {
                setIsDragging(true);
                if (Platform.OS === "ios") {
                    Vibration.vibrate(10);
                }

                Animated.parallel([
                    Animated.timing(scale,{
                        toValue: 1.1,
                        duration: 150,
                        useNativeDriver: true,
                    }),
                    Animated.timing(opacity,{
                        toValue: 1,
                        duration: 150,
                        useNativeDriver: true,
                    }),
                ]).start();
            },
            onPanResponderMove: (_,gestureState) => {
                const newX = initialPosition.x + gestureState.dx;
                const newY = initialPosition.y + gestureState.dy;
                const minX = buttonSize / 2;
                const maxX = screenWidth - buttonSize / 2;
                const minY = insets.top + buttonSize / 2;
                const maxY = screenHeight - insets.bottom - buttonSize / 2;

                positionX.setValue(Math.max(minX,Math.min(maxX,newX)));
                positionY.setValue(Math.max(minY,Math.min(maxY,newY)));
            },
            onPanResponderRelease: (_,gestureState) => {
                const currentX = positionX._value;
                const currentY = positionY._value;
                const minX = buttonSize / 2;
                const maxX = screenWidth - buttonSize / 2;
                const minY = insets.top + buttonSize / 2;
                const maxY = screenHeight - insets.bottom - buttonSize / 2;
                const snapToLeft = currentX < screenWidth / 2;
                const finalX = snapToLeft ? minX : maxX;
                const finalY = Math.max(minY,Math.min(maxY,currentY));

                Animated.parallel([
                    Animated.spring(positionX,{
                        toValue: finalX,
                        useNativeDriver: true,
                        tension: 100,
                        friction: 8,
                    }),
                    Animated.spring(positionY,{
                        toValue: finalY,
                        useNativeDriver: true,
                        tension: 100,
                        friction: 8,
                    }),
                    Animated.timing(scale,{
                        toValue: 1,
                        duration: 150,
                        useNativeDriver: true,
                    }),
                    Animated.timing(opacity,{
                        toValue: 0.8,
                        duration: 150,
                        useNativeDriver: true,
                    }),
                ]).start();

                const isJustTap = Math.abs(gestureState.dx) < 10 && Math.abs(gestureState.dy) < 10;
                if (isJustTap && !isDragging) {
                    setTimeout(() => {
                        toggleMenu();
                    },100);
                }

                setIsDragging(false);
                resetAutoHideTimer();
            },
        })
    ).current;

    const toggleMenu = () => {
        if (isMenuVisible) {
            closeMenu();
        } else {
            openMenu();
        }
    };

    const openMenu = () => {
        setIsMenuVisible(true);
        if (autoHideTimer.current) {
            clearTimeout(autoHideTimer.current);
        }

        Animated.parallel([
            Animated.spring(menuScale,{
                toValue: 1,
                useNativeDriver: true,
                tension: 100,
                friction: 8,
            }),
            Animated.timing(menuOpacity,{
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(opacity,{
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start();
    };

    const closeMenu = () => {
        Animated.parallel([
            Animated.timing(menuScale,{
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(menuOpacity,{
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(opacity,{
                toValue: 0.8,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start(() => {
            setIsMenuVisible(false);
            resetAutoHideTimer();
        });
    };

    // Handle menu item press
    const handleMenuItemPress = (item) => {
        closeMenu();
        setTimeout(() => {
            item.onPress();
        },250);
    };

    // Calculate menu item positions - relative to center of screen
    const getMenuItemPosition = (index,total) => {
        const angle = (index * (Math.PI * 2)) / total - Math.PI / 2;
        const x = Math.cos(angle) * menuRadius;
        const y = Math.sin(angle) * menuRadius;
        return { x,y };
    };

    useEffect(() => {
        showButton();
        return () => {
            if (autoHideTimer.current) {
                clearTimeout(autoHideTimer.current);
            }
        };
    },[]);

    // Handle screen interaction to show button
    useEffect(() => {
        if (!isVisible && !isMenuVisible) {
            showButton();
        }
    },[isVisible,isMenuVisible]);

    return (
        <>
            {/* Main Floating Button */}
            <Animated.View
                style={[
                    styles.floatingButton,
                    {
                        width: buttonSize,
                        height: buttonSize,
                        borderRadius: buttonSize / 2,
                        transform: [{ translateX: positionX },{ translateY: positionY },{ scale }],
                        opacity,
                    },
                ]}
                {...panResponder.panHandlers}
            >
                <TouchableOpacity
                    style={styles.buttonTouchable}
                    activeOpacity={0.8}
                    onPress={toggleMenu}
                    disabled={isDragging}
                >
                    <Animated.View
                        style={[
                            styles.buttonContent,
                            {
                                transform: [
                                    {
                                        rotate: isMenuVisible ? "45deg" : "0deg",
                                    },
                                ],
                            },
                        ]}
                    >
                        <Ionicons name={isMenuVisible ? "close" : "apps"} size={24} color="#FFFFFF" />
                    </Animated.View>
                </TouchableOpacity>

                {/* Drag Indicator */}
                {isDragging && (
                    <View style={styles.dragIndicator}>
                        <View style={styles.dragDot} />
                        <View style={styles.dragDot} />
                        <View style={styles.dragDot} />
                    </View>
                )}
            </Animated.View>

            {/* Menu Overlay - FIXED: Menu always in the center of the screen */}
            {isMenuVisible && (
                <Modal
                    transparent
                    visible={isMenuVisible}
                    onRequestClose={closeMenu}
                    statusBarTranslucent
                >
                    <StatusBar backgroundColor="rgba(0,0,0,0.3)" barStyle="light-content" />
                    <TouchableOpacity
                        style={styles.menuOverlay}
                        activeOpacity={1}
                        onPress={closeMenu}
                    >
                        {/* Menu Container - FIXED: Positioned at screen center */}
                        <Animated.View
                            style={[
                                styles.menuContainer,
                                {
                                    left: screenWidth / 2 - 150, // Center horizontally (300/2 = 150)
                                    top: screenHeight / 2 - 150, // Center vertically (300/2 = 150)
                                    transform: [{ scale: menuScale }],
                                    opacity: menuOpacity,
                                },
                            ]}
                        >
                            {/* Menu Items */}
                            {menuItems.map((item,index) => {
                                const itemPosition = getMenuItemPosition(index,menuItems.length);
                                return (
                                    <Animated.View
                                        key={item.id}
                                        style={[
                                            styles.menuItem,
                                            {
                                                transform: [{ translateX: itemPosition.x },{ translateY: itemPosition.y }],
                                            },
                                        ]}
                                    >
                                        <TouchableOpacity
                                            style={[styles.menuItemButton,{ backgroundColor: item.backgroundColor || "#FFFFFF" }]}
                                            onPress={() => handleMenuItemPress(item)}
                                            activeOpacity={0.8}
                                        >
                                            <Ionicons name={item.icon} size={20} color={item.color || "#4F46E5"} />
                                        </TouchableOpacity>
                                        <Text style={styles.menuItemLabel}>{item.title}</Text>
                                    </Animated.View>
                                );
                            })}

                            {/* Center Button */}
                            <View style={styles.centerButton}>
                                <TouchableOpacity
                                    style={styles.centerButtonTouchable}
                                    onPress={closeMenu}
                                    activeOpacity={0.8}
                                >
                                    <Ionicons name="close" size={20} color="#FFFFFF" />
                                </TouchableOpacity>
                            </View>
                        </Animated.View>
                    </TouchableOpacity>
                </Modal>
            )}
        </>
    );
};

const styles = StyleSheet.create({
    floatingButton: {
        position: "absolute",
        backgroundColor: "#4F46E5",
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
        zIndex: 9999,
    },
    buttonTouchable: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    buttonContent: {
        justifyContent: "center",
        alignItems: "center",
    },
    dragIndicator: {
        position: "absolute",
        top: -30,
        alignSelf: "center",
        flexDirection: "row",
        backgroundColor: "rgba(0,0,0,0.6)",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    dragDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: "#FFFFFF",
        marginHorizontal: 1,
    },
    menuOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.3)",
        justifyContent: "center",
        alignItems: "center",
    },
    menuContainer: {
        position: "absolute",
        width: 300,
        height: 300,
        justifyContent: "center",
        alignItems: "center",
    },
    menuItem: {
        position: "absolute",
        alignItems: "center",
    },
    menuItemButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
    menuItemLabel: {
        marginTop: 4,
        fontSize: 12,
        fontWeight: "600",
        color: "#FFFFFF",
        textAlign: "center",
        textShadowColor: "rgba(0,0,0,0.5)",
        textShadowOffset: { width: 0,height: 1 },
        textShadowRadius: 2,
    },
    centerButton: {
        position: "absolute",
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: "#EF4444",
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    centerButtonTouchable: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
});

export default FloatingMenuButton;