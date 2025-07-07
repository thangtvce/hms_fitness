import { useState,useRef,useEffect } from "react"
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    Platform,
    Dimensions,
    Animated,
    Alert,
    Image,
    ScrollView,
    ActivityIndicator,
    Linking,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { CameraView,CameraType,useCameraPermissions } from 'expo-camera';

import { LinearGradient } from "expo-linear-gradient"
import * as ImagePicker from "expo-image-picker"
import DynamicStatusBar from "screens/statusBar/DynamicStatusBar";
import { theme } from "theme/color";
import { StatusBar } from "expo-status-bar";

const { width,height } = Dimensions.get("window")

export default function FoodScannerScreen({ navigation }) {
    const [hasPermission,setHasPermission] = useState(null)
    const [facing,setFacing] = useState("back")
    const [permission,requestPermission] = useCameraPermissions()
    const [capturedImage,setCapturedImage] = useState(null)
    const [isAnalyzing,setIsAnalyzing] = useState(false)
    const [analysisResult,setAnalysisResult] = useState(null)
    const [showResults,setShowResults] = useState(false)

    const cameraRef = useRef(null)
    const fadeAnim = useRef(new Animated.Value(0)).current
    const slideAnim = useRef(new Animated.Value(50)).current
    const scaleAnim = useRef(new Animated.Value(0.8)).current

    const [scrollY,setScrollY] = useState(0)

    const handleScroll = (event) => {
        const offsetY = event.nativeEvent.contentOffset.y
        setScrollY(offsetY)
    }

    const flipCamera = () => {
        setFacing(facing === "back" ? "front" : "back")
    }

    useEffect(() => {
        ; (async () => {
            if (!permission) {
                await requestPermission()
            }
            setHasPermission(permission?.granted)
        })()
    },[permission])

    useEffect(() => {
        if (showResults) {
            Animated.parallel([
                Animated.timing(fadeAnim,{
                    toValue: 1,
                    duration: 600,
                    useNativeDriver: true,
                }),
                Animated.timing(slideAnim,{
                    toValue: 0,
                    duration: 600,
                    useNativeDriver: true,
                }),
                Animated.timing(scaleAnim,{
                    toValue: 1,
                    duration: 600,
                    useNativeDriver: true,
                }),
            ]).start()
        }
    },[showResults])

    const takePicture = async () => {
        if (cameraRef.current) {
            try {
                const photo = await cameraRef.current.takePictureAsync({
                    quality: 0.8,
                    base64: false,
                })
                setCapturedImage(photo.uri)
                setIsAnalyzing(true)
                setTimeout(() => {
                    setIsAnalyzing(false)
                    setAnalysisResult(generateFakeNutritionData())
                    setShowResults(true)
                },2500)
            } catch (error) {
                Alert.alert("Error","Failed to take picture")
            }
        }
    }

    const pickImageFromGallery = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4,3],
                quality: 0.8,
            })

            if (!result.canceled && result.assets && result.assets.length > 0) {
                setCapturedImage(result.assets[0].uri)
                setIsAnalyzing(true)

                setTimeout(() => {
                    setIsAnalyzing(false)
                    setAnalysisResult(generateFakeNutritionData())
                    setShowResults(true)
                },2500)
            }
        } catch (error) {
            Alert.alert("Error","Failed to select image from gallery")
        }
    }

    const generateFakeNutritionData = () => {
        const foodItems = [
            {
                id: 1,
                name: "Avocado Toast",
                emoji: "🥑",
                calories: 245,
                weight: "120g",
                ingredients: [
                    { name: "Whole grain bread",calories: 80,weight: "30g",emoji: "🍞" },
                    { name: "Mashed avocado",calories: 125,weight: "70g",emoji: "🥑" },
                    { name: "Cherry tomatoes",calories: 15,weight: "50g",emoji: "🍅" },
                    { name: "Sea salt",calories: 0,weight: "1g",emoji: "🧂" },
                    { name: "Black pepper",calories: 2,weight: "0.5g",emoji: "🌶️" },
                ],
            },
            {
                id: 2,
                name: "Grilled Chicken Salad",
                emoji: "🥗",
                calories: 320,
                weight: "200g",
                ingredients: [
                    { name: "Grilled chicken breast",calories: 185,weight: "100g",emoji: "🍗" },
                    { name: "Mixed greens",calories: 10,weight: "50g",emoji: "🥬" },
                    { name: "Cherry tomatoes",calories: 15,weight: "40g",emoji: "🍅" },
                    { name: "Cucumber",calories: 8,weight: "30g",emoji: "🥒" },
                    { name: "Olive oil dressing",calories: 102,weight: "15g",emoji: "🫒" },
                ],
            },
            {
                id: 3,
                name: "Salmon Bowl",
                emoji: "🍣",
                calories: 420,
                weight: "250g",
                ingredients: [
                    { name: "Grilled salmon",calories: 206,weight: "100g",emoji: "🐟" },
                    { name: "Brown rice",calories: 112,weight: "80g",emoji: "🍚" },
                    { name: "Edamame",calories: 95,weight: "70g",emoji: "🫛" },
                    { name: "Seaweed",calories: 5,weight: "10g",emoji: "🌿" },
                    { name: "Sesame seeds",calories: 52,weight: "10g",emoji: "🌰" },
                ],
            },
        ]
        return foodItems[Math.floor(Math.random() * foodItems.length)]
    }

    const retakePhoto = () => {
        setCapturedImage(null)
        setAnalysisResult(null)
        setShowResults(false)
        fadeAnim.setValue(0)
        slideAnim.setValue(50)
        scaleAnim.setValue(0.8)
    }

    const shareToFeed = () => {
        Alert.alert("Share to Feed","Your meal has been shared to your health feed!",[
            { text: "OK",onPress: () => navigation.goBack() },
        ])
    }

    const viewDetails = () => {
        Alert.alert(
            "Nutrition Details",
            `Detailed nutrition information for ${analysisResult?.name}\n\nThis feature will show complete macro and micronutrient breakdown.`,
        )
    }

    if (hasPermission === null) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4F46E5" />
                <Text style={styles.loadingText}>Requesting camera permission...</Text>
            </View>
        )
    }

    if (hasPermission === false) {
        return (
            <View style={styles.permissionContainer}>
                <Ionicons name="camera-outline" size={64} color="#64748B" />
                <Text style={styles.permissionTitle}>Camera Access Required</Text>
                <Text style={styles.permissionText}>
                    Please enable camera access to scan your food and get nutrition information.
                </Text>
                <TouchableOpacity style={styles.settingsButton} onPress={() => Linking.openSettings()}>
                    <Text style={styles.settingsButtonText}>Open Settings</Text>
                </TouchableOpacity>
            </View>
        )
    }

    if (showResults && analysisResult) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <DynamicStatusBar backgroundColor={theme.primaryColor} />

                <LinearGradient colors={["#4F46E5","#6366F1","#818CF8"]} style={styles.header}>
                    <TouchableOpacity onPress={retakePhoto} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Food Analysis</Text>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
                        <Ionicons name="close" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                </LinearGradient>

                <ScrollView
                    style={styles.resultsContainer}
                    showsVerticalScrollIndicator={false}
                    onScroll={handleScroll}
                    scrollEventThrottle={16}
                >
                    <Animated.View
                        style={[
                            styles.imageContainer,
                            {
                                height: Math.max(200,300 - scrollY * 0.5),
                                opacity: fadeAnim,
                                transform: [{ translateY: slideAnim },{ scale: scaleAnim },{ translateY: scrollY * 0.3 }],
                            },
                        ]}
                    >
                        <Image source={{ uri: capturedImage }} style={styles.capturedImage} />
                        <LinearGradient colors={["transparent","rgba(0,0,0,0.3)"]} style={styles.imageOverlay} />
                    </Animated.View>

                    <Animated.View
                        style={[
                            styles.nutritionCard,
                            {
                                opacity: fadeAnim,
                                transform: [{ translateY: slideAnim }],
                            },
                        ]}
                    >
                        <View style={styles.foodHeader}>
                            <Text style={styles.foodEmoji}>{analysisResult.emoji}</Text>
                            <View style={styles.foodInfo}>
                                <Text style={styles.foodName}>{analysisResult.name}</Text>
                                <Text style={styles.foodWeight}>{analysisResult.weight}</Text>
                            </View>
                            <View style={styles.caloriesBadge}>
                                <Text style={styles.caloriesText}>{analysisResult.calories}</Text>
                                <Text style={styles.caloriesLabel}>cals</Text>
                            </View>
                        </View>

                        <View style={styles.divider} />

                        <Text style={styles.ingredientsTitle}>Detected Ingredients</Text>
                        <ScrollView
                            style={styles.ingredientsScroll}
                            nestedScrollEnabled={true}
                            showsVerticalScrollIndicator={true}
                        >
                            {analysisResult.ingredients.map((ingredient,index) => (
                                <Animated.View
                                    key={index}
                                    style={[
                                        styles.ingredientItem,
                                        {
                                            opacity: fadeAnim,
                                            transform: [
                                                {
                                                    translateY: Animated.add(slideAnim,new Animated.Value(index * 10)),
                                                },
                                            ],
                                        },
                                    ]}
                                >
                                    <View style={styles.ingredientLeft}>
                                        <Text style={styles.ingredientEmoji}>{ingredient.emoji}</Text>
                                        <View style={styles.ingredientInfo}>
                                            <Text style={styles.ingredientName}>{ingredient.name}</Text>
                                            <Text style={styles.ingredientWeight}>{ingredient.weight}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.ingredientRight}>
                                        <Text style={styles.ingredientCalories}>{ingredient.calories} cals</Text>
                                        <View style={styles.checkmark}>
                                            <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                                        </View>
                                    </View>
                                </Animated.View>
                            ))}
                        </ScrollView>
                    </Animated.View>

                    <Animated.View
                        style={[
                            styles.actionButtons,
                            {
                                opacity: fadeAnim,
                                transform: [{ translateY: slideAnim }],
                            },
                        ]}
                    >
                        <TouchableOpacity style={styles.detailsButton} onPress={viewDetails}>
                            <Ionicons name="analytics-outline" size={20} color="#4F46E5" />
                            <Text style={styles.detailsButtonText}>View</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.retakeButton} onPress={retakePhoto}>
                            <Ionicons name="camera-outline" size={20} color="#64748B" />
                            <Text style={styles.retakeButtonText}>Retake</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.shareButton} onPress={shareToFeed}>
                            <Ionicons name="share-outline" size={20} color="#FFFFFF" />
                            <Text style={styles.shareButtonText}>Share</Text>
                        </TouchableOpacity>
                    </Animated.View>

                    <View style={styles.bottomPadding} />
                </ScrollView>
            </SafeAreaView>
        )
    }

    if (isAnalyzing) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <StatusBar barStyle="light-content" backgroundColor="#4F46E5" />

                <LinearGradient colors={["#4F46E5","#6366F1","#818CF8"]} style={styles.header}>
                    <TouchableOpacity onPress={retakePhoto} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Analyzing Food</Text>
                    <View style={styles.closeButton} />
                </LinearGradient>

                <View style={styles.analyzingContainer}>
                    <Image source={{ uri: capturedImage }} style={styles.analyzingImage} />

                    <View style={styles.analyzingOverlay}>
                        <ActivityIndicator size="large" color="#4F46E5" />
                        <Text style={styles.analyzingTitle}>Analyzing your food...</Text>
                        <Text style={styles.analyzingText}>
                            Our AI is identifying ingredients and calculating nutrition information
                        </Text>

                        <View style={styles.progressSteps}>
                            <View style={styles.progressStep}>
                                <View style={[styles.progressDot,styles.progressDotActive]} />
                                <Text style={styles.progressStepText}>Detecting food</Text>
                            </View>
                            <View style={styles.progressStep}>
                                <View style={[styles.progressDot,styles.progressDotActive]} />
                                <Text style={styles.progressStepText}>Identifying ingredients</Text>
                            </View>
                            <View style={styles.progressStep}>
                                <View style={styles.progressDot} />
                                <Text style={styles.progressStepText}>Calculating nutrition</Text>
                            </View>
                        </View>
                    </View>
                </View>
            </SafeAreaView>
        )
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="light-content" backgroundColor="#4F46E5" />

            <LinearGradient colors={["#4F46E5","#6366F1","#818CF8"]} style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Scan Food</Text>
            </LinearGradient>

            <View style={styles.cameraContainer}>
                <CameraView ref={cameraRef} style={styles.camera} facing={facing}>
                    <View style={styles.cameraOverlay}>
                        <View style={styles.scanFrame}>
                            <View style={[styles.corner,styles.topLeft]} />
                            <View style={[styles.corner,styles.topRight]} />
                            <View style={[styles.corner,styles.bottomLeft]} />
                            <View style={[styles.corner,styles.bottomRight]} />
                        </View>

                        <Text style={styles.scanInstruction}>Position your food within the frame</Text>
                    </View>
                </CameraView>
            </View>

            <View style={styles.cameraControls}>
                <TouchableOpacity onPress={flipCamera} style={styles.flipButton}>
                    <Ionicons name="camera-reverse-outline" size={28} color="#FFFFFF" />
                </TouchableOpacity>

                <TouchableOpacity onPress={takePicture} style={styles.captureButton}>
                    <View style={styles.captureButtonInner} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.galleryButton} onPress={pickImageFromGallery}>
                    <Ionicons name="images-outline" size={28} color="#FFFFFF" />
                </TouchableOpacity>
            </View>

            <View style={styles.tipContainer}>
                <Ionicons name="bulb-outline" size={20} color="#4F46E5" />
                <Text style={styles.tipText}>For best results, ensure good lighting and place food on a plain background</Text>
            </View>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: "#000000",
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#F8FAFC",
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: "#64748B",
    },
    permissionContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#F8FAFC",
        paddingHorizontal: 32,
    },
    permissionTitle: {
        fontSize: 24,
        fontWeight: "700",
        color: "#1E293B",
        marginTop: 16,
        marginBottom: 8,
    },
    permissionText: {
        fontSize: 16,
        color: "#64748B",
        textAlign: "center",
        lineHeight: 24,
        marginBottom: 24,
    },
    settingsButton: {
        backgroundColor: "#4F46E5",
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    settingsButtonText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#FFFFFF",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 12,
        paddingTop: Platform.OS === "android" ? StatusBar.currentHeight + 12 : 12,
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#FFFFFF",
    },
    flashButton: {
        padding: 8,
    },
    closeButton: {
        padding: 8,
    },
    cameraContainer: {
        flex: 1,
    },
    camera: {
        flex: 1,
    },
    cameraOverlay: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    scanFrame: {
        width: width * 0.8,
        height: width * 0.8,
        position: "relative",
    },
    corner: {
        position: "absolute",
        width: 30,
        height: 30,
        borderColor: "#4F46E5",
        borderWidth: 3,
    },
    topLeft: {
        top: 0,
        left: 0,
        borderRightWidth: 0,
        borderBottomWidth: 0,
    },
    topRight: {
        top: 0,
        right: 0,
        borderLeftWidth: 0,
        borderBottomWidth: 0,
    },
    bottomLeft: {
        bottom: 0,
        left: 0,
        borderRightWidth: 0,
        borderTopWidth: 0,
    },
    bottomRight: {
        bottom: 0,
        right: 0,
        borderLeftWidth: 0,
        borderTopWidth: 0,
    },
    scanInstruction: {
        position: "absolute",
        bottom: 10,
        fontSize: 16,
        color: "#FFFFFF",
        textAlign: "center",
        backgroundColor: "rgba(0,0,0,0.5)",
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    cameraControls: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 32,
        paddingVertical: 24,
        backgroundColor: "rgba(0,0,0,0.8)",
    },
    flipButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: "rgba(255,255,255,0.2)",
        justifyContent: "center",
        alignItems: "center",
    },
    captureButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: "#FFFFFF",
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 4,
        borderColor: "rgba(255,255,255,0.3)",
    },
    captureButtonInner: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: "#4F46E5",
    },
    galleryButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: "rgba(255,255,255,0.2)",
        justifyContent: "center",
        alignItems: "center",
    },
    tipContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#EEF2FF",
        marginHorizontal: 16,
        marginBottom: 16,
        padding: 12,
        borderRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: "#4F46E5",
    },
    tipText: {
        flex: 1,
        fontSize: 14,
        color: "#3730A3",
        marginLeft: 8,
        lineHeight: 20,
    },
    analyzingContainer: {
        flex: 1,
        position: "relative",
    },
    analyzingImage: {
        width: "100%",
        height: "100%",
        resizeMode: "cover",
    },
    analyzingOverlay: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.7)",
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 32,
    },
    analyzingTitle: {
        fontSize: 24,
        fontWeight: "700",
        color: "#FFFFFF",
        marginTop: 24,
        marginBottom: 8,
    },
    analyzingText: {
        fontSize: 16,
        color: "#D1D5DB",
        textAlign: "center",
        lineHeight: 24,
        marginBottom: 32,
    },
    progressSteps: {
        alignItems: "flex-start",
    },
    progressStep: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
    },
    progressDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: "#374151",
        marginRight: 12,
    },
    progressDotActive: {
        backgroundColor: "#4F46E5",
    },
    progressStepText: {
        fontSize: 16,
        color: "#FFFFFF",
    },
    resultsContainer: {
        flex: 1,
        backgroundColor: "#F8FAFC",
    },
    imageContainer: {
        position: "relative",
        height: 300,
        marginBottom: 16,
        overflow: "hidden",
    },
    capturedImage: {
        width: "100%",
        height: "100%",
        resizeMode: "cover",
    },
    imageOverlay: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: 60,
    },
    nutritionCard: {
        backgroundColor: "#FFFFFF",
        marginHorizontal: 16,
        borderRadius: 20,
        padding: 24,
        marginBottom: 16,
        shadowColor: "#4F46E5",
        shadowOffset: { width: 0,height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 8,
    },
    ingredientsScroll: {
        height: 350,
    },
    foodHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 16,
    },
    foodEmoji: {
        fontSize: 32,
        marginRight: 12,
    },
    foodInfo: {
        flex: 1,
    },
    foodName: {
        fontSize: 20,
        fontWeight: "700",
        color: "#1E293B",
        marginBottom: 2,
    },
    foodWeight: {
        fontSize: 14,
        color: "#64748B",
    },
    caloriesBadge: {
        backgroundColor: "#4F46E5",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        alignItems: "center",
    },
    caloriesText: {
        fontSize: 18,
        fontWeight: "700",
        color: "#FFFFFF",
    },
    caloriesLabel: {
        fontSize: 12,
        color: "#FFFFFF",
        opacity: 0.8,
    },
    divider: {
        height: 1,
        backgroundColor: "#E2E8F0",
        marginBottom: 16,
    },
    ingredientsTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#374151",
        marginBottom: 12,
    },
    ingredientItem: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#F1F5F9",
    },
    ingredientLeft: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
    },
    ingredientEmoji: {
        fontSize: 20,
        marginRight: 12,
    },
    ingredientInfo: {
        flex: 1,
    },
    ingredientName: {
        fontSize: 16,
        fontWeight: "500",
        color: "#1E293B",
        marginBottom: 2,
    },
    ingredientWeight: {
        fontSize: 14,
        color: "#64748B",
    },
    ingredientRight: {
        flexDirection: "row",
        alignItems: "center",
    },
    ingredientCalories: {
        fontSize: 14,
        fontWeight: "600",
        color: "#4F46E5",
        marginRight: 8,
    },
    checkmark: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: "#4F46E5",
        justifyContent: "center",
        alignItems: "center",
    },
    actionButtons: {
        flexDirection: "row",
        paddingHorizontal: 16,
        marginBottom: 16,
    },
    detailsButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#FFFFFF",
        paddingVertical: 12,
        borderRadius: 8,
        marginRight: 8,
        borderWidth: 1,
        borderColor: "#4F46E5",
    },
    detailsButtonText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#4F46E5",
        marginLeft: 6,
    },
    retakeButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#FFFFFF",
        paddingVertical: 12,
        borderRadius: 8,
        marginRight: 8,
        borderWidth: 1,
        borderColor: "#CBD5E1",
    },
    retakeButtonText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#64748B",
        marginLeft: 6,
    },
    shareButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#4F46E5",
        paddingVertical: 12,
        borderRadius: 8,
    },
    shareButtonText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#FFFFFF",
        marginLeft: 6,
    },
    bottomPadding: {
        height: 80,
    },
})
