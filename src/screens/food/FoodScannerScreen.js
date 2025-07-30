import { useState,useRef,useEffect } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    Platform,
    Dimensions,
    Animated,
    Image,
    ScrollView,
    ActivityIndicator,
    Linking,
    Modal,
    TextInput,
    FlatList,
} from "react-native";
import { showErrorFetchAPI,showErrorMessage,showSuccessMessage } from "utils/toastUtil";
import { Ionicons,MaterialIcons } from "@expo/vector-icons";
import { CameraView,CameraType,useCameraPermissions } from "expo-camera";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import ViewShot from "react-native-view-shot";
import DynamicStatusBar from "screens/statusBar/DynamicStatusBar";
import { StatusBar } from "expo-status-bar";
import Loading from "components/Loading";
import { getMyGroupFilter } from "services/apiCommunityService";
import RenderHTML from "react-native-render-html";
import apiFoodScannerService from "services/apiFoodScannerService";
import CommonSkeleton from "components/CommonSkeleton/CommonSkeleton";
import ScanFoodSkeleton from "components/CommonSkeleton/ScanFoodSkeleton";

const { width,height } = Dimensions.get("window");

export default function FoodScannerScreen({ navigation }) {
    const [hasPermission,setHasPermission] = useState(null);
    const [facing,setFacing] = useState("back");
    const [permission,requestPermission] = useCameraPermissions();
    const [capturedImage,setCapturedImage] = useState(null);
    const [isAnalyzing,setIsAnalyzing] = useState(false);
    const [analysisResult,setAnalysisResult] = useState(null);
    const [showResults,setShowResults] = useState(false);
    const [showGroupModal,setShowGroupModal] = useState(false);
    const [groups,setGroups] = useState([]);
    const [selectedGroup,setSelectedGroup] = useState(null);
    const [searchTerm,setSearchTerm] = useState("");
    const [allGroups,setAllGroups] = useState([]);

    const cameraRef = useRef(null);
    const viewShotRef = useRef(null);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;
    const scaleAnim = useRef(new Animated.Value(0.8)).current;
    const [scrollY,setScrollY] = useState(0);

    const handleScroll = (event) => {
        const offsetY = event.nativeEvent.contentOffset.y;
        setScrollY(offsetY);
    };

    const flipCamera = () => {
        setFacing(facing === "back" ? "front" : "back");
    };

    useEffect(() => {
        (async () => {
            if (!permission) {
                await requestPermission();
            }
            setHasPermission(permission?.granted);
        })();
    },[permission]);

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
            ]).start();
        }
    },[showResults]);

    const takePicture = async () => {
        if (!cameraRef.current) return;

        try {
            const photo = await cameraRef.current.takePictureAsync({
                quality: 0.8,
                base64: false,
            });

            setCapturedImage(photo.uri);
            setIsAnalyzing(true);

            const imageFile = {
                uri: photo.uri,
                type: 'image/jpeg',
                name: 'photo.jpg',
            };

            try {
                const response = await apiFoodScannerService.analyzeFoodByGeminiBase64(imageFile);

                if (response?.is_food_image && Array.isArray(response.predictions)) {
                    const prediction = response.predictions[0] || {};

                    setAnalysisResult({
                        name: response.food_name || 'Unknown',
                        icon: getFoodIcon(response.food_name),
                        calories: Number((prediction.calories || 0).toFixed(2)),
                        weight: `${Number((prediction.total_weight || 0).toFixed(2))}g`,
                        ingredients: [
                            {
                                name: 'Fat',
                                calories: Number((prediction.fat || 0).toFixed(2)),
                                weight: '-',
                                icon: { name: 'local-drink',type: 'MaterialIcons' },
                            },
                            {
                                name: 'Carbs',
                                calories: Number((prediction.carbs || 0).toFixed(2)),
                                weight: '-',
                                icon: { name: 'bakery-dining',type: 'MaterialIcons' },
                            },
                            {
                                name: 'Protein',
                                calories: Number((prediction.protein || 0).toFixed(2)),
                                weight: '-',
                                icon: { name: 'kebab-dining',type: 'MaterialIcons' },
                            },
                        ],
                    });

                    setShowResults(true);
                } else {
                    showErrorMessage('No food detected in the image');
                    setCapturedImage(null);
                }
            } catch (error) {
                showErrorFetchAPI(error);
                setCapturedImage(null);
            } finally {
                setIsAnalyzing(false);
            }
        } catch (error) {
            showErrorFetchAPI(error);
            setIsAnalyzing(false);
        }
    };

    const pickImageFromGallery = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (status !== 'granted') {
                Alert.alert(
                    'Permission Required',
                    'To select images, please grant access to your photo library in your device settings.',
                    [
                        { text: 'Cancel',style: 'cancel' },
                        {
                            text: 'Open Settings',
                            onPress: () => Linking.openSettings(),
                        },
                    ],
                );
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4,3],
                quality: 0.8,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                setCapturedImage(result.assets[0].uri);
                setIsAnalyzing(true);

                const imageFile = {
                    uri: result.assets[0].uri,
                    type: 'image/jpeg',
                    name: 'photo.jpg',
                };

                try {
                    const response = await apiFoodScannerService.analyzeFoodByGeminiBase64(imageFile);
                    if (response?.is_food_image && Array.isArray(response.predictions)) {
                        const prediction = response.predictions[0] || {};

                        setAnalysisResult({
                            name: response.food_name || 'Unknown',
                            icon: getFoodIcon(response.food_name),
                            calories: Number((prediction.calories || 0).toFixed(2)),
                            weight: `${Number((prediction.total_weight || 0).toFixed(2))}g`,
                            ingredients: [
                                {
                                    name: 'Fat',
                                    calories: Number((prediction.fat || 0).toFixed(2)),
                                    weight: '-',
                                    icon: { name: 'local-drink',type: 'MaterialIcons' },
                                },
                                {
                                    name: 'Carbs',
                                    calories: Number((prediction.carbs || 0).toFixed(2)),
                                    weight: '-',
                                    icon: { name: 'bakery-dining',type: 'MaterialIcons' },
                                },
                                {
                                    name: 'Protein',
                                    calories: Number((prediction.protein || 0).toFixed(2)),
                                    weight: '-',
                                    icon: { name: 'kebab-dining',type: 'MaterialIcons' },
                                },
                            ],
                        });
                        setShowResults(true);
                    } else {
                        showErrorMessage('No food detected in the image');
                        setCapturedImage(null);
                    }
                } catch (error) {
                    showErrorFetchAPI(error);
                    setCapturedImage(null);
                }
            }
        } catch (error) {
            showErrorFetchAPI(error);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const getFoodIcon = (foodName) => {
        const iconMap = {
            banana: { name: 'nutrition',type: 'Ionicons' },
            apple: { name: 'apple',type: 'MaterialIcons' },
            pizza: { name: 'pizza',type: 'MaterialIcons' },
            salad: { name: 'leaf',type: 'Ionicons' },
            chicken: { name: 'kebab-dining',type: 'MaterialIcons' },
            fish: { name: 'fish',type: 'Ionicons' },
            rice: { name: 'rice-bowl',type: 'MaterialIcons' },
            default: { name: 'restaurant',type: 'Ionicons' },
        };
        return iconMap[foodName.toLowerCase()] || iconMap.default;
    };

    const renderIcon = (icon,size = 24,color = '#1F2937') => {
        const IconComponent = icon.type === 'Ionicons' ? Ionicons : MaterialIcons;
        return <IconComponent name={icon.name} size={size} color={color} />;
    };

    const retakePhoto = () => {
        setCapturedImage(null);
        setAnalysisResult(null);
        setShowResults(false);
        setShowGroupModal(false);
        setSelectedGroup(null);
        setSearchTerm("");
        fadeAnim.setValue(0);
        slideAnim.setValue(50);
        scaleAnim.setValue(0.8);
    };

    const fetchGroups = async () => {
        try {
            const response = await getMyGroupFilter();
            const groupData = response.data.groups || [];
            setAllGroups(groupData);
            setGroups(groupData);
        } catch (error) {
            console.log(error);
            showErrorFetchAPI(error);
        }
    };

    const handleSharePress = () => {
        fetchGroups();
        setShowGroupModal(true);
    };

    const handleGroupSelect = (group) => {
        setSelectedGroup(group);
    };

    const removeVietnameseTones = (str) => {
        return str
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g,"")
            .replace(/đ/g,"d")
            .replace(/Đ/g,"D");
    };

    const handleSearch = (text) => {
        setSearchTerm(text);
        const search = removeVietnameseTones(text.toLowerCase());
        const filtered = allGroups.filter((group) => {
            const name = removeVietnameseTones(group.groupName.toLowerCase());
            return name.includes(search);
        });
        setGroups(filtered);
    };

    const shareToFeed = async () => {
        if (!selectedGroup) {
            showErrorFetchAPI("Please select a group to share to.");
            return;
        }
        try {
            if (viewShotRef.current) {
                const cacheDir = FileSystem.cacheDirectory + "screenshots/";
                await FileSystem.makeDirectoryAsync(cacheDir,{ intermediates: true });
                const timestamp = new Date().getTime();
                const cachePath = `${cacheDir}screenshot_${timestamp}.png`;
                const uri = await viewShotRef.current.capture();
                await FileSystem.copyAsync({
                    from: uri,
                    to: cachePath,
                });
                navigation.navigate("CreatePostFromScreenshotScreen",{
                    screenshotUri: cachePath,
                    groupId: selectedGroup.groupId,
                });
                showSuccessMessage("Screenshot captured and navigating to PostScreen!");
                setShowGroupModal(false);
                setSelectedGroup(null);
                setSearchTerm("");
            }
        } catch (error) {
            console.error('Error capturing screenshot:',error);
            showErrorFetchAPI("Failed to capture screenshot.");
        }
    };

    if (hasPermission === null) {
        return <ScanFoodSkeleton />;
    }

    if (hasPermission === false) {
        return (
            <View style={styles.permissionContainer}>
                <Ionicons name="camera-outline" size={64} color="#6B7280" />
                <Text style={styles.permissionTitle}>Camera Access Required</Text>
                <Text style={styles.permissionText}>
                    Please enable camera access to scan your food and get nutrition information.
                </Text>
                <TouchableOpacity style={styles.settingsButton} onPress={() => Linking.openSettings()}>
                    <Text style={styles.settingsButtonText}>Open Settings</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (showResults && analysisResult) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <DynamicStatusBar backgroundColor="transparent" />
                <LinearGradient
                    colors={["transparent","transparent"]}
                    style={styles.header}
                >
                    <TouchableOpacity onPress={retakePhoto} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#1F2937" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Food Analysis</Text>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
                        <Ionicons name="close" size={24} color="#1F2937" />
                    </TouchableOpacity>
                </LinearGradient>

                <ScrollView
                    style={styles.resultsContainer}
                    showsVerticalScrollIndicator={false}
                    onScroll={handleScroll}
                    scrollEventThrottle={16}
                >
                    <ViewShot ref={viewShotRef} options={{ format: "png",quality: 0.9 }}>
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
                            <View style={styles.watermark}>
                                <Text style={styles.watermarkText}>Analysis by HMS</Text>
                            </View>
                        </Animated.View>
                        <View style={{ flex: 1 }}>
                            <View style={[styles.nutritionCard]}>
                                <View style={styles.foodHeader}>
                                    {renderIcon(analysisResult.icon,32)}
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

                                <Text style={styles.ingredientsTitle}>Nutritional Breakdown</Text>
                                <ScrollView
                                    style={styles.ingredientsScroll}
                                    contentContainerStyle={{ flexGrow: 1 }}
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
                                                {renderIcon(ingredient.icon,20)}
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
                            </View>
                        </View>
                    </ViewShot>

                    <View style={styles.bottomPadding} />
                </ScrollView>

                <View style={styles.fixedActionButtons}>
                    <TouchableOpacity style={styles.retakeButton} onPress={retakePhoto}>
                        <Ionicons name="camera-outline" size={20} color="#6B7280" />
                        <Text style={styles.retakeButtonText}>Retake</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.shareButton} onPress={handleSharePress}>
                        <Ionicons name="share-outline" size={20} color="#FFFFFF" />
                        <Text style={styles.shareButtonText}>Share</Text>
                    </TouchableOpacity>
                </View>

                <Modal
                    animationType="slide"
                    transparent={true}
                    visible={showGroupModal}
                    onRequestClose={() => setShowGroupModal(false)}
                >
                    <View style={styles.modalContainer}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Share to Group</Text>
                                <TouchableOpacity onPress={() => setShowGroupModal(false)}>
                                    <Ionicons name="close" size={24} color="#1F2937" />
                                </TouchableOpacity>
                            </View>
                            <View style={styles.searchContainer}>
                                <Ionicons name="search" size={20} color="#6B7280" style={styles.searchIcon} />
                                <TextInput
                                    style={styles.searchInput}
                                    placeholder="Search groups..."
                                    value={searchTerm}
                                    onChangeText={handleSearch}
                                />
                            </View>
                            <FlatList
                                data={groups}
                                keyExtractor={(item) => item.groupId.toString()}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={[
                                            styles.groupItem,
                                            selectedGroup?.groupId === item.groupId && styles.groupItemSelected,
                                        ]}
                                        onPress={() => handleGroupSelect(item)}
                                    >
                                        <View style={styles.groupItemContent}>
                                            <Ionicons
                                                name={item.IsPrivate ? "lock-closed" : "people"}
                                                size={24}
                                                color={selectedGroup?.groupId === item.groupId ? "#0056d2" : "#6B7280"}
                                                style={styles.groupIcon}
                                            />
                                            <View style={styles.groupInfo}>
                                                <Text style={styles.groupName}>{item.groupName}</Text>
                                                <RenderHTML
                                                    contentWidth={width - 100}
                                                    source={{
                                                        html: item.description
                                                            ? `<div>${item.description.substring(0,50)}...</div>`
                                                            : "<div>No description</div>",
                                                    }}
                                                    baseStyle={styles.groupDescription}
                                                />
                                            </View>
                                            {selectedGroup?.groupId === item.groupId && (
                                                <Ionicons name="checkmark-circle" size={24} color="#0056d2" />
                                            )}
                                        </View>
                                    </TouchableOpacity>
                                )}
                                style={styles.groupList}
                            />
                            <View style={styles.modalButtons}>
                                <TouchableOpacity
                                    style={styles.cancelButton}
                                    onPress={() => setShowGroupModal(false)}
                                >
                                    <Text style={styles.cancelButtonText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.goButton,!selectedGroup && styles.goButtonDisabled]}
                                    onPress={shareToFeed}
                                    disabled={!selectedGroup}
                                >
                                    <Text style={styles.goButtonText}>Go</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            </SafeAreaView>
        );
    }

    if (isAnalyzing) {
        return <ScanFoodSkeleton />;
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
            <View style={styles.cameraContainer}>
                <CameraView ref={cameraRef} style={styles.camera} facing={facing} />
                <View style={styles.cameraOverlay}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                    <View style={styles.scanFrame}>
                        <View style={[styles.corner,styles.topLeft]} />
                        <View style={[styles.corner,styles.topRight]} />
                        <View style={[styles.corner,styles.bottomLeft]} />
                        <View style={[styles.corner,styles.bottomRight]} />
                    </View>
                    <Text style={styles.scanInstruction}>Position your food within the frame</Text>
                </View>
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
                <Ionicons name="bulb-outline" size={20} color="#0056d2" />
                <Text style={styles.tipText}>
                    For best results, ensure good lighting and place food on a plain background
                </Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: "#F9FAFB",
    },
    permissionContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#F9FAFB",
        paddingHorizontal: 32,
    },
    permissionTitle: {
        fontSize: 24,
        fontWeight: "700",
        color: "#1F2937",
        marginTop: 16,
        marginBottom: 8,
    },
    permissionText: {
        fontSize: 16,
        color: "#6B7280",
        textAlign: "center",
        lineHeight: 24,
        marginBottom: 24,
    },
    settingsButton: {
        backgroundColor: "#0056d2",
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
        justifyContent: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        paddingTop: Platform.OS === "android" ? StatusBar.currentHeight + 12 : 12,
    },
    backButton: {
        padding: 8,
        position: "absolute",
        top: Platform.OS === "android" ? StatusBar.currentHeight + 8 : 8,
        left: 8,
        zIndex: 1,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#1F2937",
        textAlign: "center",
        flex: 1,
    },
    closeButton: {
        padding: 8,
        position: "absolute",
        top: Platform.OS === "android" ? StatusBar.currentHeight + 8 : 8,
        right: 8,
        zIndex: 1,
    },
    cameraContainer: {
        flex: 1,
        position: "relative",
    },
    camera: {
        flex: 1,
    },
    cameraOverlay: {
        ...StyleSheet.absoluteFillObject,
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
        borderColor: "#0056d2",
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
        backgroundColor: "#0056d2",
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
        backgroundColor: "#F3F4F6",
        marginHorizontal: 16,
        marginBottom: 16,
        marginTop: 16,
        padding: 12,
        borderRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: "#0056d2",
    },
    tipText: {
        flex: 1,
        fontSize: 14,
        color: "#1F2937",
        marginLeft: 8,
        lineHeight: 20,
    },
    resultsContainer: {
        flex: 1,
        backgroundColor: "#F9FAFB",
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
    watermark: {
        position: "absolute",
        bottom: 10,
        right: 10,
        backgroundColor: "rgba(0,0,0,0.5)",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    watermarkText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#FFFFFF",
    },
    nutritionCard: {
        backgroundColor: "#FFFFFF",
        marginHorizontal: 16,
        borderRadius: 12,
        padding: 24,
        marginBottom: 16,
        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOffset: { width: 0,height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    ingredientsScroll: {
        height: 320,
        maxHeight: 400,
    },
    foodHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 16,
    },
    foodInfo: {
        flex: 1,
        marginLeft: 12,
    },
    foodName: {
        fontSize: 20,
        fontWeight: "600",
        color: "#1F2937",
        marginBottom: 2,
    },
    foodWeight: {
        fontSize: 14,
        color: "#6B7280",
    },
    caloriesBadge: {
        backgroundColor: "#0056d2",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        alignItems: "center",
    },
    caloriesText: {
        fontSize: 18,
        fontWeight: "600",
        color: "#FFFFFF",
    },
    caloriesLabel: {
        fontSize: 12,
        color: "#FFFFFF",
        opacity: 0.8,
    },
    divider: {
        height: 1,
        backgroundColor: "#E5E7EB",
        marginBottom: 16,
    },
    ingredientsTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1F2937",
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
    ingredientInfo: {
        marginLeft: 12,
    },
    ingredientName: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1F2937",
    },
    ingredientWeight: {
        fontSize: 14,
        color: "#6B7280",
    },
    ingredientRight: {
        flexDirection: "row",
        alignItems: "center",
    },
    ingredientCalories: {
        fontSize: 14,
        fontWeight: "600",
        color: "#0056d2",
        marginRight: 8,
    },
    checkmark: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: "#0056d2",
        justifyContent: "center",
        alignItems: "center",
    },
    fixedActionButtons: {
        position: "absolute",
        bottom: 16,
        left: 16,
        right: 16,
        flexDirection: "row",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        backgroundColor: "transparent",
    },
    retakeButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#FFFFFF",
        paddingVertical: 14,
        borderRadius: 12,
        marginRight: 8,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOffset: { width: 0,height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    retakeButtonText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#6B7280",
        marginLeft: 6,
    },
    shareButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#0056d2",
        paddingVertical: 14,
        borderRadius: 12,
        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOffset: { width: 0,height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    shareButtonText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#FFFFFF",
        marginLeft: 6,
    },
    bottomPadding: {
        height: 100,
    },
    modalContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0,0,0,0.5)",
    },
    modalContent: {
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 20,
        width: width * 0.9,
        maxHeight: height * 0.7,
        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOffset: { width: 0,height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 6,
            },
            android: {
                elevation: 6,
            },
        }),
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#1F2937",
    },
    searchContainer: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderRadius: 12,
        paddingHorizontal: 12,
        marginBottom: 16,
        backgroundColor: "#F9FAFB",
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        paddingVertical: 12,
        fontSize: 16,
        color: "#1F2937",
    },
    groupList: {
        maxHeight: height * 0.4,
    },
    groupItem: {
        padding: 16,
        borderRadius: 12,
        marginBottom: 8,
        backgroundColor: "#F9FAFB",
    },
    groupItemSelected: {
        backgroundColor: "#E6F0FA",
        borderWidth: 1,
        borderColor: "#0056d2",
    },
    groupItemContent: {
        flexDirection: "row",
        alignItems: "center",
    },
    groupIcon: {
        marginRight: 12,
    },
    groupInfo: {
        flex: 1,
    },
    groupName: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1F2937",
        marginBottom: 4,
    },
    groupDescription: {
        fontSize: 14,
        color: "#6B7280",
    },
    modalButtons: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 16,
    },
    cancelButton: {
        flex: 1,
        alignItems: "center",
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        marginRight: 8,
        backgroundColor: "#FFFFFF",
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#6B7280",
    },
    goButton: {
        flex: 1,
        alignItems: "center",
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: "#0056d2",
    },
    goButtonDisabled: {
        backgroundColor: "#A0AEC0",
    },
    goButtonText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#FFFFFF",
    },
});