import { useState,useEffect,useCallback,useContext,useRef } from "react"
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Linking,
  TextInput,
  Dimensions,
  PanResponder,
  Animated,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import ShimmerPlaceholder from "../../components/shimmer/ShimmerPlaceholder"
import { AuthContext } from "context/AuthContext"
import { profileService } from "services/apiProfileService"
import { apiUploadImageCloudService } from 'services/apiUploadImageCloudService';
import AsyncStorage from "@react-native-async-storage/async-storage"
import * as ImagePicker from "expo-image-picker"
import apiUserService from "services/apiUserService"
import { theme } from "theme/color"
import DynamicStatusBar from "screens/statusBar/DynamicStatusBar"
import { StatusBar } from "expo-status-bar"
import { SafeAreaView } from "react-native-safe-area-context"
import { showErrorFetchAPI,showErrorMessage,showSuccessMessage } from "utils/toastUtil"

const { width: screenWidth,height: screenHeight } = Dimensions.get("window")

const ALLOWED_TYPES = ['image/jpeg','image/png','image/gif','image/bmp'];
const menuItemsCommon = [
  { id: "1",title: "Profile",icon: "person-outline",description: "View and edit your profile" },
  { id: "4",title: "My Subscriptions",icon: "card-outline",description: "View your active and past subscriptions" },
  { id: "5",title: "Workout",icon: "barbell-outline",description: "View workout plans" },

  // Progress Comparison menu
  { id: "23",title: "Progress Comparison",icon: "stats-chart-outline",description: "Compare your before/after progress" },

  { id: "8",title: "Leaderboard",icon: "trophy-outline",description: "View user rankings and achievements" },
  { id: "9",title: "Saved Packages",icon: "bookmark-outline",description: "View your saved fitness packages" },
  { id: "10",title: "History Report",icon: "document-text-outline",description: "View your report history" },
  { id: "11",title: "History Post",icon: "document-text-outline",description: "View your post history" },
  { id: "12",title: "Health Log Overview",icon: "nutrition-outline",description: "View your health log overview" },
  { id: "13",title: "Workout Plan List",icon: "nutrition-outline",description: "View your workout plan list" },
  { id: "14",title: "Workout History",icon: "barbell-outline",description: "View your workout history" },
  { id: "15",title: "User Activity",icon: "barbell-outline",description: "View your user activity" },
  { id: "16",title: "Nutrition Target",icon: "nutrition-outline",description: "Set your daily nutrition targets" },
  { id: "17",title: "Food Log History",icon: "analytics-outline",description: "View your food log history" },
  { id: "18",title: "Ticket List",icon: "list-outline",description: "View your tickets" },
  { id: "20",title: "Reminder Plan List",icon: "alarm-outline",description: "View your reminder plans" },
  { id: "21",title: "My Trainer Applications",icon: "document-text-outline",description: "View your trainer applications" },
  { id: "22",title: "Theme Settings",icon: "color-palette-outline",description: "Change app theme" },

  { id: "19",title: "Logout",icon: "log-out-outline",description: "Sign out of your account" },
];

const menuItemsTrainerOnly = [
  { id: "34",title: "Trainer Dashboard",icon: "speedometer-outline",description: "Go to trainer dashboard" },
  { id: "38",title: "Trainee",icon: "people-outline",description: "View and manage your active trainees and their progress" },
  { id: "37",title: "Subscription",icon: "card-outline",description: "Manage user subscriptions and plans" },

  { id: "30",title: "Service Packages",icon: "cube-outline",description: "Manage your service packages" },
  { id: "31",title: "Exercise",icon: "barbell-outline",description: "Manage your exercises" },
  { id: "32",title: "Workout Plan",icon: "clipboard-outline",description: "Manage your workout plans" },

  { id: "33",title: "Payment History",icon: "cash-outline",description: "View your payment history" },
  { id: "35",title: "Trainer Rating",icon: "star-outline",description: "View and manage trainer ratings" },

  { id: "19",title: "Logout",icon: "log-out-outline",description: "Sign out of your account" },
];

const ImageZoomViewer = ({ visible,imageUri,onClose,onDelete,showDeleteButton = false }) => {
  const scale = useRef(new Animated.Value(1)).current
  const translateX = useRef(new Animated.Value(0)).current
  const translateY = useRef(new Animated.Value(0)).current
  const [isZoomed,setIsZoomed] = useState(false)
  const [lastTap,setLastTap] = useState(null)

  const resetTransform = () => {
    Animated.parallel([
      Animated.spring(scale,{ toValue: 1,useNativeDriver: true }),
      Animated.spring(translateX,{ toValue: 0,useNativeDriver: true }),
      Animated.spring(translateY,{ toValue: 0,useNativeDriver: true }),
    ]).start()
    setIsZoomed(false)
  }



  const handleDoubleTap = () => {
    const now = Date.now()
    const DOUBLE_PRESS_DELAY = 300

    if (lastTap && now - lastTap < DOUBLE_PRESS_DELAY) {
      if (isZoomed) {
        resetTransform()
      } else {
        Animated.spring(scale,{ toValue: 2,useNativeDriver: true }).start()
        setIsZoomed(true)
      }
    } else {
      setLastTap(now)
    }
  }

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt,gestureState) => {
        return isZoomed || Math.abs(gestureState.dx) > 2 || Math.abs(gestureState.dy) > 2
      },
      onMoveShouldSetPanResponderCapture: () => false,
      onPanResponderGrant: () => {
        translateX.setOffset(translateX._value)
        translateY.setOffset(translateY._value)
        scale.setOffset(scale._value)
      },
      onPanResponderMove: (evt,gestureState) => {
        if (evt.nativeEvent.touches.length === 2) {
          const touch1 = evt.nativeEvent.touches[0]
          const touch2 = evt.nativeEvent.touches[1]
          const distance = Math.sqrt(
            Math.pow(touch2.pageX - touch1.pageX,2) + Math.pow(touch2.pageY - touch1.pageY,2),
          )
          const newScale = Math.min(Math.max(distance / 200,0.5),5)
          scale.setValue(newScale)
          setIsZoomed(newScale > 1.1)
        } else if (isZoomed && evt.nativeEvent.touches.length === 1) {
          const maxTranslate = 100
          translateX.setValue(Math.min(Math.max(gestureState.dx,-maxTranslate),maxTranslate))
          translateY.setValue(Math.min(Math.max(gestureState.dy,-maxTranslate),maxTranslate))
        }
      },
      onPanResponderRelease: () => {
        translateX.flattenOffset()
        translateY.flattenOffset()
        scale.flattenOffset()

        const currentScale = scale._value
        if (currentScale < 1.1 && currentScale > 0.9) {
          resetTransform()
        }
      },
    }),
  ).current

  const handleClose = () => {
    resetTransform()
    onClose()
  }

  const handleDelete = () => {
    Alert.alert("Delete Image","Are you sure you want to delete this profile picture?",[
      { text: "Cancel",style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          onDelete?.()
          handleClose()
        },
      },
    ])
  }

  if (!visible) return null

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent={true}
    >
      <StatusBar barStyle="light-content" backgroundColor="rgba(0,0,0,0.9)" />
      <View style={zoomStyles.container}>
        <View style={zoomStyles.overlay}>
          {/* Header */}
          <View style={zoomStyles.header}>
            <TouchableOpacity style={zoomStyles.headerButton} onPress={handleClose}>
              <Ionicons name="close" size={28} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={zoomStyles.headerTitle}>Profile Picture</Text>
            {showDeleteButton && (
              <TouchableOpacity style={zoomStyles.headerButton} onPress={handleDelete}>
                <Ionicons name="trash-outline" size={24} color="#FF4444" />
              </TouchableOpacity>
            )}
          </View>

          {/* Image Container */}
          <View style={zoomStyles.imageContainer}>
            <Animated.View
              style={[
                zoomStyles.imageWrapper,
                {
                  transform: [{ scale },{ translateX },{ translateY }],
                },
              ]}
              {...panResponder.panHandlers}
            >
              <TouchableOpacity activeOpacity={1} onPress={handleDoubleTap} style={zoomStyles.imageTouchable}>
                <Image
                  source={{ uri: imageUri }}
                  style={zoomStyles.image}
                  resizeMode="contain"
                  onError={() => {
                    Alert.alert("Error","Failed to load image")
                    handleClose()
                  }}
                />
              </TouchableOpacity>
            </Animated.View>
          </View>

          {/* Footer with zoom info */}
          <View style={zoomStyles.footer}>
            <View style={zoomStyles.zoomInfo}>
              <Ionicons name="search-outline" size={16} color="#FFFFFF" />
              <Text style={zoomStyles.zoomText}>
                {isZoomed ? "Pinch to zoom • Double tap to reset" : "Pinch to zoom • Double tap to zoom in"}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  )
}

export default function SettingsScreen({ navigation }) {
  const { user,logout,loading: authLoading } = useContext(AuthContext)
  const [profile,setProfile] = useState(null)
  const [loading,setLoading] = useState(true)
  const [isLoggingOut,setIsLoggingOut] = useState(false)
  const [showLogoutModal,setShowLogoutModal] = useState(false)
  const [avatar,setAvatar] = useState(null)
  const [dataResponse,setDataResponse] = useState(null)
  const [refreshing,setRefreshing] = useState(false)
  const [error,setError] = useState(null)
  const [showImageOptions,setShowImageOptions] = useState(false)
  const [showUrlInput,setShowUrlInput] = useState(false)
  const [imageUrl,setImageUrl] = useState("")
  const [imageUploading,setImageUploading] = useState(false)
  const [errors,setErrors] = useState({
    imageUrl: "",
  })
  const [menuItems,setMenuItems] = useState([]);
  useEffect(() => {
    if (user?.roles.includes("Trainer")) {
      setMenuItems(menuItemsTrainerOnly);
    } else {
      setMenuItems(menuItemsCommon);
    }
  },[user]);

  const [showImageViewer,setShowImageViewer] = useState(false)

  const updateAvatar = async (userId,avatarUrl) => {
    try {
      const response = await apiUserService.updateAvatar(userId,avatarUrl)
      return response
    } catch (error) {
      throw error
    }
  }

  const handlePickImage = async () => {
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

      setImageUploading(true);

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4,3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0];
        const imageType = selectedAsset.type === 'image' ? 'image/jpeg' : (selectedAsset.type || 'image/jpeg');

        if (!ALLOWED_TYPES.includes(imageType)) {
          throw new Error(`Invalid image type. Only ${ALLOWED_TYPES.join(', ')} are allowed.`);
        }

        const formData = new FormData();
        formData.append('file',{
          uri: selectedAsset.uri,
          type: imageType,
          name: selectedAsset.fileName || `photo.${imageType.split('/')[1]}`,
        });

        const uploadResult = await apiUploadImageCloudService.uploadImage(formData);

        if (!uploadResult.isError && uploadResult.imageUrl) {
          setAvatar(uploadResult.imageUrl);
          await AsyncStorage.setItem('userAvatar',uploadResult.imageUrl);

          if (user && user.userId) {
            const dataResponse = await updateAvatar(user.userId,uploadResult.imageUrl);
            if (dataResponse.statusCode !== 200) {
              throw new Error(dataResponse.message || 'Failed to update profile picture.');
            }
            showSuccessMessage('Profile picture updated successfully');
          }
        } else {
          throw new Error(uploadResult.message || 'Failed to upload image.');
        }
      }
    } catch (error) {
      showErrorFetchAPI(error);
    } finally {
      setImageUploading(false);
      setShowImageOptions(false);
    }
  }

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'To take photos, please grant access to your camera in your device settings.',
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

      setImageUploading(true);

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1,1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0];
        const imageType = selectedAsset.type === 'image' ? 'image/jpeg' : (selectedAsset.type || 'image/jpeg');

        if (!ALLOWED_TYPES.includes(imageType)) {
          throw new Error(`Invalid image type. Only ${ALLOWED_TYPES.join(', ')} are allowed.`);
        }

        const formData = new FormData();
        formData.append('file',{
          uri: selectedAsset.uri,
          type: imageType,
          name: selectedAsset.fileName || `photo.${imageType.split('/')[1]}`,
        });

        const uploadResult = await apiUploadImageCloudService.uploadImage(formData);

        if (!uploadResult.isError && uploadResult.imageUrl) {
          setAvatar(uploadResult.imageUrl);
          await AsyncStorage.setItem('userAvatar',uploadResult.imageUrl);

          if (user && user.userId) {
            const dataResponse = await updateAvatar(user.userId,uploadResult.imageUrl);
            if (dataResponse.statusCode !== 200) {
              throw new Error(dataResponse.message || 'Failed to update profile picture.');
            }
            showSuccessMessage('Profile picture updated successfully');
          }
        } else {
          throw new Error(uploadResult.message || 'Failed to upload image.');
        }
      }
    } catch (error) {
      showErrorFetchAPI(error);
    } finally {
      setImageUploading(false);
      setShowImageOptions(false);
    }
  }

  const handleUrlImage = () => {
    setShowImageOptions(false)
    setShowUrlInput(true)
    setImageUrl("")
    setErrors((prev) => ({ ...prev,imageUrl: "" }))
  }

  const confirmUrlImage = async () => {
    if (!imageUrl.trim()) {
      showErrorMessage((prev) => ({ ...prev,imageUrl: "Please enter an image URL" }))
      return
    }

    const urlPattern = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/
    if (!urlPattern.test(imageUrl.trim())) {
      showErrorMessage((prev) => ({ ...prev,imageUrl: "Please enter a valid URL" }))
      return
    }

    try {
      setImageUploading(true)
      setAvatar(imageUrl.trim())

      if (user && user.userId) {
        const dataResponse = await updateAvatar(user.userId,imageUrl.trim())
        if (dataResponse.statusCode !== 200) {
          throw new Error(dataResponse.message || "Failed to update profile picture.")
        }
        await AsyncStorage.setItem("userAvatar",imageUrl.trim())
        showSuccessMessage("Profile picture updated successfully")
      }

      setImageUrl("")
      setShowUrlInput(false)
    } catch (error) {
      showErrorFetchAPI(error);
    } finally {
      setImageUploading(false)
    }
  }

  const handleDeleteAvatar = async () => {
    try {
      setAvatar(null)
      await AsyncStorage.removeItem("userAvatar")

      if (user && user.userId) {
        await updateAvatar(user.userId,"")
        showSuccessMessage("Profile picture removed successfully")
      }
    } catch (error) {
      showErrorFetchAPI(error);
    }
  }

  const fetchData = async (isRefresh = false) => {
    if (!isRefresh) {
      setLoading(true)
    }
    setError(null)

    try {
      if (!user || !user.userId) {
        return;
      }

      const response = await profileService.getLatestProfile(user.userId)
      if (response.statusCode === 200 && response.data) {
        setProfile(response.data.profile)
        setDataResponse(response.data)
        const storedAvatar = await AsyncStorage.getItem("userAvatar")
        if (storedAvatar) setAvatar(storedAvatar)
      } else {
        showErrorMessage(response.message || "Failed to load profile.")
      }
    } catch (error) {
      showErrorFetchAPI(error);
    } finally {
      if (!isRefresh) {
        setLoading(false)
      }
      if (isRefresh) {
        setRefreshing(false)
      }
    }
  }

  useEffect(() => {
    if (!authLoading) {
      fetchData()
    }
  },[user,authLoading,navigation])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    fetchData(true)
  },[user])

  const handleLogout = async () => {
    if (isLoggingOut) return
    setShowLogoutModal(true)
  }

  const confirmLogout = async () => {
    setIsLoggingOut(true)
    try {
      await logout()
      navigation.replace("Login");
    } catch (error) {
      showErrorFetchAPI(error);
    } finally {
      setIsLoggingOut(false)
      setShowLogoutModal(false)
    }
  }

  const cancelLogout = () => {
    setShowLogoutModal(false)
  }

  const handleMenuItemPress = (item) => {
    switch (item.title) {
      case "Profile":
        navigation.navigate("Profile")
        break
      case "Weight History":
        navigation.navigate("WeightHistory")
        break
      case "Body Measurements":
        navigation.navigate("BodyMeasurements")
        break
      case "My Subscriptions":
        navigation.navigate("MySubscriptionScreen")
        break
      case "Workout":
        navigation.navigate("WorkoutListScreen")
        break
      case "Progress Comparison":
        navigation.navigate("ProgressComparisonScreen")
        break
      case "Leaderboard":
        navigation.navigate("LeaderboardScreen")
        break;
      case "Saved Packages":
        navigation.navigate("SavedPackagesScreen")
        break;
      case "History Report":
        navigation.navigate("MyReportsScreen");
        break;
      case "History Post":
        navigation.navigate("UserPostsScreen",{ ownerId: user.userId,currentUserId: user.userId });
        break;
      case "Health Log Overview":
        navigation.navigate("HealthLogOverviewScreen");
        break;
      case "Workout Plan List":
        navigation.navigate("WorkoutPlanListScreen");
        break;
      case "Workout History":
        navigation.navigate("WorkoutHistoryScreen");
        break;
      case "User Activity":
        navigation.navigate("UserActivityScreen");
        break;
      case "Nutrition Target":
        navigation.navigate("NutritionTargetScreen");
        break;
      case "Food Log History":
        navigation.navigate("FoodLogHistoryScreen");
        break;
      case "Ticket List":
        navigation.navigate("TicketList");
        break;
      case "Trainer Application":
        navigation.navigate("TrainerApplicationScreen");
        break;
      case "Service Packages":
        navigation.navigate("TrainerServiceManagement");
        break;
      case "Exercise Management":
        navigation.navigate("TrainerExerciseManagement");
        break;
      case "Workout Plan Management":
        navigation.navigate("TrainerWorkoutPlanManagement");
        break;
      case "Payment History":
        navigation.navigate("TrainerPayoutManagement");
        break;
      case "Trainer Dashboard":
        navigation.navigate("TrainerDashboard");
        break;
      case "Trainer Rating":
        navigation.navigate("TrainerRatingDetailScreen");
        break;
      case "Subscription":
        navigation.navigate("TrainerSubscriptionManagement");
        break;
      case "Reminder Plan List":
        navigation.navigate("ReminderPlanListScreen");
        break;
      case "Trainee":
        navigation.navigate("TrainerUserManagementScreen");
        break;
      case "My Trainer Applications":
        navigation.navigate("TrainerApplicationListScreen");
        break;
      case "Theme Settings":
        navigation.navigate("ThemeSettingsScreen");
        break;
      case "Logout":
        handleLogout();
        break;
      default:
        break;
    }
  }

  const renderMenuItem = (item) => (
    <TouchableOpacity
      key={item.id}
      style={[styles.menuItem,item.title === "Logout" && styles.logoutMenuItem]}
      onPress={() => handleMenuItemPress(item)}
      disabled={isLoggingOut}
      activeOpacity={0.8}
    >
      <View style={item.title === "Logout" ? styles.menuIconCircleLogout : styles.menuIconCircle}>
        <Ionicons name={item.icon} size={20} color={item.title === "Logout" ? "#fff" : "#2563EB"} />
      </View>
      <View style={styles.menuTextContainer}>
        <Text style={[styles.menuText,item.title === "Logout" && { color: "#DC2626" }]}>{item.title}</Text>
        <Text style={styles.menuDescription}>{item.description}</Text>
      </View>
      <Ionicons name="chevron-forward-outline" size={18} color="#B6C2D2" />
    </TouchableOpacity>
  )

  // --- Auto shimmer height & width states ---
  const [profileCardHeight, setProfileCardHeight] = useState(120);
  const [premiumHeight, setPremiumHeight] = useState(60);
  const [menuItemHeight, setMenuItemHeight] = useState(44);
  const [versionHeight, setVersionHeight] = useState(20);
  const [sectionWidth, setSectionWidth] = useState(screenWidth * 0.9);
  // Only measure once per session
  const [measured, setMeasured] = useState(false);

  if (loading && !refreshing) {
    // Render invisible real sections to measure height
    if (!measured) {
      return (
        <SafeAreaView style={styles.safeArea}>
          <DynamicStatusBar backgroundColor={theme.primaryColor} />
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff", padding: 20 }}>
            <View
              style={{ width: "90%", maxWidth: 400 }}
              onLayout={e => setSectionWidth(e.nativeEvent.layout.width)}
            >
              {/* Measure Profile Card */}
              <View style={{ opacity: 0, position: 'absolute', left: 0, top: 0, width: '100%' }}
                onLayout={e => setProfileCardHeight(e.nativeEvent.layout.height)}>
                <View style={styles.profileCardWrapper}>
                  <View style={styles.profileCardAccent} />
                  <View style={styles.profileCard}>
                    <View style={styles.avatarContainer}>
                      <View style={styles.avatarLoading} />
                      <TouchableOpacity style={styles.changeAvatarButton} />
                    </View>
                    <View style={[styles.profileInfoBox,{ flexDirection: 'row',alignItems: 'center' }]}> 
                      <View style={{ flex: 1 }}>
                        <Text style={styles.profileName}>User</Text>
                        <Text style={styles.profileEmail}>N/A</Text>
                        <View style={styles.profileBadge}>
                          <Ionicons name="fitness" size={12} color="#2563EB" />
                          <Text style={styles.profileBadgeText}>Health Enthusiast</Text>
                        </View>
                      </View>
                      <TouchableOpacity style={styles.editButton} />
                    </View>
                  </View>
                </View>
              </View>

              {/* Measure Menu Item */}
              <TouchableOpacity style={[styles.menuItem, { opacity: 0, position: 'absolute', left: 0, top: 0, width: '100%' }]} onLayout={e => setMenuItemHeight(e.nativeEvent.layout.height)}>
                <View style={styles.menuIconCircle} />
                <View style={styles.menuTextContainer}>
                  <Text style={styles.menuText}>Menu</Text>
                  <Text style={styles.menuDescription}>Desc</Text>
                </View>
                <Ionicons name="chevron-forward-outline" size={18} color="#B6C2D2" />
              </TouchableOpacity>
              {/* Measure Version */}
              <View style={[styles.versionContainer, { opacity: 0, position: 'absolute', left: 0, top: 0, width: '100%' }]} onLayout={e => { setVersionHeight(e.nativeEvent.layout.height); setMeasured(true); }}>
                <Text style={styles.versionText}>HMS App v1.0.0</Text>
              </View>
            </View>
          </View>
        </SafeAreaView>
      );
    }
    // Render shimmer with measured heights
    return (
      <SafeAreaView style={styles.safeArea}>
        <DynamicStatusBar backgroundColor={theme.primaryColor} />
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff", padding: 20 }}>
          <View style={{ width: sectionWidth }}>
            <ShimmerPlaceholder style={{ width: sectionWidth, height: profileCardHeight, borderRadius: 16, marginBottom: 24 }} />
            <ShimmerPlaceholder style={{ width: sectionWidth, height: premiumHeight, borderRadius: 14, marginBottom: 24 }} />
            <ShimmerPlaceholder style={{ width: sectionWidth, height: menuItemHeight, borderRadius: 12, marginBottom: 12 }} />
            <ShimmerPlaceholder style={{ width: sectionWidth, height: menuItemHeight, borderRadius: 12, marginBottom: 12 }} />
            <ShimmerPlaceholder style={{ width: sectionWidth, height: menuItemHeight, borderRadius: 12, marginBottom: 12 }} />
            <ShimmerPlaceholder style={{ width: sectionWidth, height: menuItemHeight, borderRadius: 12, marginBottom: 12 }} />
            <ShimmerPlaceholder style={{ width: sectionWidth, height: menuItemHeight, borderRadius: 12, marginBottom: 12 }} />
            <ShimmerPlaceholder style={{ width: sectionWidth, height: menuItemHeight, borderRadius: 12, marginBottom: 24 }} />
            <ShimmerPlaceholder style={{ width: sectionWidth, height: versionHeight, borderRadius: 8, marginBottom: 0 }} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !refreshing) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchData()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#2563EB"]}
            tintColor="#2563EB"
            progressBackgroundColor="#FFFFFF"
            progressViewOffset={0}
          />
        }
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
        initialNumToRender={5}
      >
        {/* Header removed as requested */}

        {/* Profile Card with edit button */}
        <View style={styles.profileCardWrapper}>
          <View style={styles.profileCardAccent} />
          <View style={styles.profileCard}>
            <View style={styles.avatarContainer}>
              {imageUploading ? (
                <View style={styles.avatarLoading}>
                  <ActivityIndicator size="large" color="#2563EB" />
                </View>
              ) : avatar ? (
                <TouchableOpacity onPress={() => setShowImageViewer(true)}>
                  <Image
                    source={{ uri: avatar }}
                    style={styles.profileAvatar}
                  />
                </TouchableOpacity>
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarFallbackText}>
                    {dataResponse?.fullName ? dataResponse.fullName.charAt(0).toUpperCase() : "U"}
                  </Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.changeAvatarButton}
                onPress={() => setShowImageOptions(true)}
                disabled={imageUploading}
              >
                <Ionicons name="camera" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <View style={[styles.profileInfoBox,{ flexDirection: 'row',alignItems: 'center' }]}> 
              <View style={{ flex: 1 }}>
                <Text style={styles.profileName}>{dataResponse?.fullName || "User"}</Text>
                <Text style={styles.profileEmail}>{dataResponse?.email || "N/A"}</Text>
                <View style={styles.profileBadge}>
                  <Ionicons name="fitness" size={12} color="#2563EB" />
                  <Text style={styles.profileBadgeText}>Health Enthusiast</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.editButton} onPress={() => navigation.navigate("Profile")}> 
                <Ionicons name="create-outline" size={20} color="#2563EB" />
              </TouchableOpacity>
            </View>
          </View>
        </View>



        {/* Menu List */}
        <View style={styles.menuSection}>
          <Text style={styles.menuSectionTitle}>Settings</Text>
          {menuItems.map(renderMenuItem)}
        </View>

        {/* App Version */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>HMS App v1.0.0</Text>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Image Zoom Viewer Modal - OUTSIDE ScrollView */}
      {avatar && (
        <ImageZoomViewer
          visible={showImageViewer}
          imageUri={avatar}
          onClose={() => setShowImageViewer(false)}
          onDelete={handleDeleteAvatar}
          showDeleteButton={true}
        />
      )}

      {/* Logout Modal - OUTSIDE ScrollView */}
      <Modal visible={showLogoutModal} transparent={true} animationType="fade" onRequestClose={cancelLogout}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="log-out-outline" size={40} color="#DC2626" style={styles.modalIcon} />
            <Text style={styles.modalTitle}>Confirm Logout</Text>
            <Text style={styles.modalMessage}>Are you sure you want to log out?</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalButton,styles.cancelButton]} onPress={cancelLogout}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton,styles.logoutButton]} onPress={confirmLogout}>
                {isLoggingOut ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.logoutButtonText}>Logout</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Image Options Modal - OUTSIDE ScrollView */}
      <Modal
        visible={showImageOptions}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowImageOptions(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.imageModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Profile Picture</Text>
              <TouchableOpacity onPress={() => setShowImageOptions(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.modalOption} onPress={handleTakePhoto}>
              <Ionicons name="camera-outline" size={24} color="#2563EB" style={styles.modalOptionIcon} />
              <Text style={styles.modalOptionText}>Take Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalOption} onPress={handlePickImage}>
              <Ionicons name="image-outline" size={24} color="#2563EB" style={styles.modalOptionIcon} />
              <Text style={styles.modalOptionText}>Choose from Gallery</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalOption} onPress={handleUrlImage}>
              <Ionicons name="link-outline" size={24} color="#2563EB" style={styles.modalOptionIcon} />
              <Text style={styles.modalOptionText}>Enter Image URL</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* URL Input Modal - OUTSIDE ScrollView */}
      <Modal
        visible={showUrlInput}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowUrlInput(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.urlModalContent}>
            <View style={styles.urlModalHeader}>
              <Text style={styles.urlModalTitle}>Enter Image URL</Text>
              <TouchableOpacity onPress={() => setShowUrlInput(false)}>
                <Ionicons name="close" size={28} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.urlInputContainer}>
              <TextInput
                style={styles.urlInput}
                value={imageUrl}
                onChangeText={(text) => {
                  setImageUrl(text)
                  if (errors.imageUrl) {
                    setErrors((prev) => ({ ...prev,imageUrl: "" }))
                  }
                }}
                placeholder="https://example.com/image.jpg"
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
                autoFocus={true}
                multiline={true}
                numberOfLines={3}
                textAlignVertical="top"
              />
              {errors.imageUrl ? (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle-outline" size={16} color="#EF4444" />
                  <Text style={styles.errorMessage}>{errors.imageUrl}</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.urlModalButtons}>
              <TouchableOpacity style={styles.urlCancelButton} onPress={() => setShowUrlInput(false)}>
                <Text style={styles.urlCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.urlConfirmButton} onPress={confirmUrlImage} disabled={imageUploading}>
                {imageUploading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.urlConfirmButtonText}>Confirm</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

// Zoom Viewer Styles
const zoomStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.95)",
    justifyContent: "space-between",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  imageContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  imageWrapper: {
    width: screenWidth,
    height: screenHeight * 0.7,
    justifyContent: "center",
    alignItems: "center",
  },
  imageTouchable: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: screenWidth - 40,
    height: screenWidth - 40,
    borderRadius: 20,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  zoomInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  zoomText: {
    fontSize: 14,
    color: "#FFFFFF",
    marginLeft: 8,
    opacity: 0.8,
  },
})

// Keep all existing styles - they remain the same
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.primaryColor,
  },
  container: {
    flex: 1,
    backgroundColor: "#F6F8FB",
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
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1E293B",
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 20,
  },
  loadingText: {
    fontSize: 18,
    color: "#2563EB",
    fontWeight: "600",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
  },
  errorText: {
    fontSize: 16,
    color: "#EF4444",
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: "#2563EB",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  profileCardWrapper: {
    marginHorizontal: 0,
    marginBottom: 20,
    position: "relative",
    alignItems: "center",
    width: '100%',
  },
  profileCardAccent: {
    position: "absolute",
    top: 18,
    left: 0,
    right: 0,
    height: 60,
    borderRadius: 0,
    backgroundColor: "#E0E7FF",
    opacity: 0.5,
    zIndex: 0,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 0,
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0,height: 4 },
    elevation: 4,
    zIndex: 1,
    width: "100%",
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#E5E7EB",
    marginRight: 18,
    borderWidth: 2,
    borderColor: "#2563EB",
  },
  avatarFallback: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#2563EB",
    marginRight: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarFallbackText: {
    fontSize: 32,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  profileInfoBox: {
    flex: 1,
  },
  profileName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1E293B",
  },
  profileEmail: {
    fontSize: 15,
    color: "#64748B",
    marginTop: 2,
  },
  profileBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
    alignSelf: "flex-start",
  },
  profileBadgeText: {
    fontSize: 12,
    color: "#2563EB",
    fontWeight: "600",
    marginLeft: 4,
  },
  premiumButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fffbe6",
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    borderRadius: 14,
    marginBottom: 20,
    shadowColor: "#FFD700",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0,height: 2 },
    elevation: 2,
  },
  premiumIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFF9C4",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  premiumTextContainer: {
    flex: 1,
  },
  premiumText: {
    fontSize: 16,
    color: "#B8860B",
    fontWeight: "600",
  },
  premiumDescription: {
    fontSize: 12,
    color: "#D4A72C",
    marginTop: 2,
  },
  menuSection: {
    backgroundColor: "#fff",
    borderRadius: 18,
    marginHorizontal: 16,
    marginBottom: 24,
    paddingVertical: 8,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0,height: 2 },
    elevation: 1,
  },
  menuSectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1E293B",
    marginHorizontal: 18,
    marginTop: 10,
    marginBottom: 8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F6FA",
    backgroundColor: "transparent",
  },
  menuTextContainer: {
    flex: 1,
  },
  logoutMenuItem: {
    borderTopWidth: 1,
    borderTopColor: "#F3F6FA",
    marginTop: 8,
  },
  menuIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E0E7FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  menuIconCircleLogout: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  menuText: {
    fontSize: 16,
    color: "#1E293B",
    fontWeight: "500",
  },
  menuDescription: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  versionContainer: {
    alignItems: "center",
  },
  versionText: {
    fontSize: 12,
    color: "#94A3B8",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    padding: 24,
    borderRadius: 14,
    width: "80%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0,height: 4 },
    elevation: 3,
  },
  modalIcon: {
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: "700",
    marginBottom: 10,
    color: "#1E293B",
  },
  modalMessage: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
    color: "#64748B",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    marginHorizontal: 5,
    borderRadius: 10,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#f0f0f0",
  },
  cancelButtonText: {
    fontSize: 16,
    color: "#64748B",
    fontWeight: "600",
  },
  logoutButton: {
    backgroundColor: "#DC2626",
  },
  logoutButtonText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  bottomPadding: {
    height: 80,
  },
  avatarContainer: {
    position: "relative",
    marginRight: 18,
  },
  avatarLoading: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
  },
  changeAvatarButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#2563EB",
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  imageModalContent: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 14,
    width: "80%",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0,height: 4 },
    elevation: 3,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F6FA",
  },
  modalOptionIcon: {
    marginRight: 16,
  },
  modalOptionText: {
    fontSize: 16,
    color: "#1E293B",
    fontWeight: "500",
  },
  // Enhanced URL Modal Styles
  urlModalContent: {
    backgroundColor: "#fff",
    padding: 24,
    borderRadius: 16,
    width: screenWidth * 0.9,
    maxWidth: 400,
    maxHeight: screenHeight * 0.6,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0,height: 6 },
    elevation: 5,
  },
  urlModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  urlModalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
  },
  urlInputContainer: {
    marginBottom: 24,
  },
  urlInputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  urlInput: {
    borderWidth: 2,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: "#0F172A",
    backgroundColor: "#FAFBFC",
    minHeight: 50,
    textAlignVertical: "top",
  },
  urlModalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  urlCancelButton: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  urlCancelButtonText: {
    fontSize: 16,
    color: "#64748B",
    fontWeight: "600",
  },
  urlConfirmButton: {
    flex: 1,
    backgroundColor: "#2563EB",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  urlConfirmButtonText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  errorMessage: {
    fontSize: 14,
    color: "#EF4444",
    marginLeft: 4,
  },
})
