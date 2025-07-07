import React,{ useState,useEffect,useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Image,
    Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons,MaterialCommunityIcons } from "@expo/vector-icons";
import DynamicStatusBar from "screens/statusBar/DynamicStatusBar";
import { theme } from "theme/color";
import { Dimensions } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";

const { width,height } = Dimensions.get("window");

const SavedPackagesScreen = ({ navigation }) => {
    const [savedPackages,setSavedPackages] = useState([]);
    const [loading,setLoading] = useState(true);

    const getPackageIcon = (packageName) => {
        if (!packageName) return "fitness";
        const name = packageName.toLowerCase();
        if (name.includes("yoga") || name.includes("meditation")) return "yoga";
        if (name.includes("diet") || name.includes("nutrition")) return "nutrition";
        if (name.includes("cardio") || name.includes("running")) return "cardio";
        if (name.includes("strength") || name.includes("weight")) return "strength";
        if (name.includes("wellness") || name.includes("mental")) return "wellness";
        return "fitness";
    };

    const renderPackageIcon = (type,size = 24) => {
        const iconProps = { size,color: "#FFFFFF" };
        switch (type) {
            case "yoga":
                return <MaterialCommunityIcons name="yoga" {...iconProps} />;
            case "nutrition":
                return <Ionicons name="nutrition" {...iconProps} />;
            case "cardio":
                return <Ionicons name="heart" {...iconProps} />;
            case "strength":
                return <MaterialCommunityIcons name="weight-lifter" {...iconProps} />;
            case "wellness":
                return <MaterialCommunityIcons name="meditation" {...iconProps} />;
            default:
                return <MaterialCommunityIcons name="dumbbell" {...iconProps} />;
        }
    };

    const getPackageGradient = (type) => {
        switch (type) {
            case "yoga":
                return ["#10B981","#059669"];
            case "nutrition":
                return ["#F59E0B","#D97706"];
            case "cardio":
                return ["#EF4444","#DC2626"];
            case "strength":
                return ["#8B5CF6","#7C3AED"];
            case "wellness":
                return ["#06B6D4","#0891B2"];
            default:
                return ["#4F46E5","#3730A3"];
        }
    };

    const fetchSavedPackages = useCallback(async () => {
        try {
            setLoading(true);
            const savedPackages = await AsyncStorage.getItem("@SavedPackages");
            const packages = savedPackages ? JSON.parse(savedPackages) : [];
            setSavedPackages(packages);
        } catch (error) {
            Alert.alert("Error","Unable to load saved packages: " + error.message);
        } finally {
            setLoading(false);
        }
    },[]);

    useEffect(() => {
        fetchSavedPackages();
        const unsubscribe = navigation.addListener("focus",fetchSavedPackages);
        return unsubscribe;
    },[navigation,fetchSavedPackages]);

    const handleRemovePackage = async (packageId) => {
        try {
            const savedPackages = await AsyncStorage.getItem("@SavedPackages");
            let packages = savedPackages ? JSON.parse(savedPackages) : [];
            packages = packages.filter((pkg) => pkg.packageId !== packageId);
            await AsyncStorage.setItem("@SavedPackages",JSON.stringify(packages));
            setSavedPackages(packages);
            Alert.alert("Success","Package removed from saved list.");
        } catch (error) {
            Alert.alert("Error","Unable to remove package: " + error.message);
        }
    };

    const renderPackageItem = ({ item }) => {
        const packageType = getPackageIcon(item.packageName);
        const gradientColors = getPackageGradient(packageType);

        return (
            <TouchableOpacity
                style={styles.packageCard}
                onPress={() => navigation.navigate("PackageDetail",{ package: item })}
                activeOpacity={0.8}
            >
                <View style={styles.cardContent}>
                    <LinearGradient
                        colors={gradientColors}
                        style={styles.iconContainer}
                        start={{ x: 0,y: 0 }}
                        end={{ x: 1,y: 1 }}
                    >
                        {renderPackageIcon(packageType,24)}
                    </LinearGradient>
                    <View style={styles.packageInfo}>
                        <Text style={styles.packageName} numberOfLines={2}>
                            {item.packageName || "Service Package"}
                        </Text>
                        <Text style={styles.trainerName} numberOfLines={1}>
                            {item.trainerFullName || "Unknown Trainer"}
                        </Text>
                        <View style={styles.priceContainer}>
                            <Text style={styles.packagePrice}>
                                {item.price ? `$${item.price.toLocaleString()}` : "Contact"}
                            </Text>
                            <View style={styles.durationBadge}>
                                <Ionicons name="time-outline" size={12} color="#64748B" />
                                <Text style={styles.durationText}>{item.durationDays || "N/A"} days</Text>
                            </View>
                        </View>
                    </View>
                    <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => handleRemovePackage(item.packageId)}
                    >
                        <Ionicons name="trash-outline" size={20} color="#EF4444" />
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        );
    };

    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="bookmark-off-outline" size={64} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No Saved Packages</Text>
            <Text style={styles.emptyText}>
                You haven't saved any packages yet. Explore services and save your favorites!
            </Text>
            <TouchableOpacity
                style={styles.exploreButton}
                onPress={() => navigation.navigate("ServicePackage")}
            >
                <Text style={styles.exploreButtonText}>Explore Packages</Text>
            </TouchableOpacity>
        </View>
    );

    if (loading) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <LinearGradient colors={["#4F46E5","#6366F1"]} style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#FFFFFF" />
                    <Text style={styles.loadingText}>Loading saved packages...</Text>
                </LinearGradient>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <DynamicStatusBar backgroundColor={theme.primaryColor} />
            <LinearGradient colors={["#4F46E5","#6366F1","#818CF8"]} style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle}>Saved Packages</Text>
                    <Text style={styles.headerSubtitle}>Your favorite fitness services</Text>
                </View>
                <View style={styles.placeholder} />
            </LinearGradient>
            <FlatList
                data={savedPackages}
                renderItem={renderPackageItem}
                keyExtractor={(item) => item.packageId.toString()}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={renderEmpty}
                showsVerticalScrollIndicator={false}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: theme.primaryColor,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingBottom: 15,
        paddingTop: Platform.OS === "android" ? StatusBar.currentHeight + 16 : 16,
    },
    backBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        justifyContent: "center",
        alignItems: "center",
    },
    headerTitleContainer: {
        flex: 1,
        alignItems: "center",
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: "700",
        color: "#FFFFFF",
        textAlign: "center",
    },
    headerSubtitle: {
        fontSize: 14,
        color: "rgba(255, 255, 255, 0.8)",
        textAlign: "center",
        marginTop: 2,
    },
    placeholder: {
        width: 44,
    },
    listContent: {
        padding: 20,
        paddingBottom: 100,
        backgroundColor: "#F8FAFC",
    },
    packageCard: {
        backgroundColor: "#FFFFFF",
        marginBottom: 12,
        borderRadius: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0,height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
    },
    cardContent: {
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 16,
    },
    packageInfo: {
        flex: 1,
    },
    packageName: {
        fontSize: 16,
        fontWeight: "700",
        color: "#0F172A",
        marginBottom: 4,
    },
    trainerName: {
        fontSize: 14,
        color: "#64748B",
        marginBottom: 8,
    },
    priceContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    packagePrice: {
        fontSize: 16,
        fontWeight: "800",
        color: "#4F46E5",
    },
    durationBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F8FAFC",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    durationText: {
        fontSize: 12,
        color: "#64748B",
        fontWeight: "500",
    },
    removeButton: {
        padding: 8,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 32,
        backgroundColor: "#F8FAFC",
        minHeight: height - 200,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#1E293B",
        marginTop: 16,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 16,
        color: "#64748B",
        textAlign: "center",
        marginBottom: 24,
        lineHeight: 24,
    },
    exploreButton: {
        backgroundColor: "#4F46E5",
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 12,
    },
    exploreButtonText: {
        fontSize: 16,
        color: "#FFFFFF",
        fontWeight: "700",
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    loadingText: {
        fontSize: 16,
        color: "#FFFFFF",
        marginTop: 16,
        fontWeight: "500",
    },
});

export default SavedPackagesScreen;