import { useState,useRef,useEffect,useContext } from "react"
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Animated,
  Dimensions,
  Keyboard,
  Linking,
} from "react-native"
import Loading from "components/Loading";
import { showErrorFetchAPI,showErrorMessage,showSuccessMessage } from "utils/toastUtil";
import { Ionicons } from "@expo/vector-icons"
import * as ImagePicker from "expo-image-picker"
import { LinearGradient } from "expo-linear-gradient"
import { useFonts,Inter_400Regular,Inter_600SemiBold,Inter_700Bold } from "@expo-google-fonts/inter"
import DateTimePicker from "@react-native-community/datetimepicker"
import apiUserService from "services/apiUserService"
import { apiUploadImageCloudService } from 'services/apiUploadImageCloudService';
import Header from "components/Header"
import { ThemeContext } from "components/theme/ThemeContext"
import { StatusBar } from "expo-status-bar"
import { SafeAreaView } from "react-native-safe-area-context"
import { AuthContext } from "context/AuthContext"
import CommonSkeleton from "components/CommonSkeleton/CommonSkeleton";

const { width,height } = Dimensions.get("window")
const ALLOWED_TYPES = ['image/jpeg','image/png','image/gif','image/bmp'];


const GENDER_OPTIONS = ["Male","Female","Other"]

export default function EditUserScreen({ navigation = { goBack: () => { } },route = { params: {} } }) {
  const mockUser = {
    userId: 0,
    fullName: "HMS_3DO",
    email: "3docorp@gmail.com",
    phone: "0865341745",
    avatar: "https://st3.depositphotos.com/9998432/13335/v/450/depositphotos_133351928-stock-illustration-default-placeholder-man-and-woman.jpg",
    status: "active",
    createdAt: new Date().toISOString(),
    roles: ["User"],
    gender: "Male",
    birthDate: new Date(1990,0,1).toISOString(),
  }

  const { user } = useContext(AuthContext);
  const { colors } = useContext(ThemeContext);
  const [formData,setFormData] = useState({
    userId: route.params?.user?.userId || mockUser.userId,
    fullName: route.params?.user?.fullName || mockUser.fullName,
    email: route.params?.user?.email || mockUser.email,
    phone: route.params?.user?.phone || mockUser.phone,
    avatar: route.params?.user?.avatar || mockUser.avatar,
    status: route.params?.user?.status || mockUser.status,
    createdAt: route.params?.user?.createdAt || mockUser.createdAt,
    roles: route.params?.user?.roles || mockUser.roles,
    gender: route.params?.user?.gender || mockUser.gender,
    birthDate: route.params?.user?.birthDate ? new Date(route.params.user.birthDate) : new Date(mockUser.birthDate),
  })

  const [loading,setLoading] = useState(false)
  const [imageUploading,setImageUploading] = useState(false)
  const [showImageOptions,setShowImageOptions] = useState(false)
  const [showUrlInput,setShowUrlInput] = useState(false)
  const [showGenderOptions,setShowGenderOptions] = useState(false)
  const [showDatePicker,setShowDatePicker] = useState(false)
  const [tempBirthDate,setTempBirthDate] = useState(null);
  const [imageUrl,setImageUrl] = useState("")
  const [errors,setErrors] = useState({
    fullName: "",
    email: "",
    phone: "",
    imageUrl: "",
    gender: "",
    birthDate: "",
  })
  const [keyboardHeight,setKeyboardHeight] = useState(0)
  const [hasGalleryPermission,setHasGalleryPermission] = useState(null)
  const [hasCameraPermission,setHasCameraPermission] = useState(null)

  const modalAnimation = useRef(new Animated.Value(0)).current
  const urlInputAnimation = useRef(new Animated.Value(0)).current
  const genderModalAnimation = useRef(new Animated.Value(0)).current
  const datePickerAnimation = useRef(new Animated.Value(0)).current

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  })

  useEffect(() => {
    ; (async () => {
      try {
        const galleryStatus = await ImagePicker.getMediaLibraryPermissionsAsync()
        setHasGalleryPermission(galleryStatus.status === "granted")

        const cameraStatus = await ImagePicker.getCameraPermissionsAsync()
        setHasCameraPermission(cameraStatus.status === "granted")
      } catch (error) {
        setHasGalleryPermission(false)
        setHasCameraPermission(false)
      }
    })()
  },[])

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener("keyboardDidShow",(event) => {
      setKeyboardHeight(event.endCoordinates.height)
    })
    const keyboardDidHideListener = Keyboard.addListener("keyboardDidHide",() => {
      setKeyboardHeight(0)
    })

    return () => {
      keyboardDidShowListener.remove()
      keyboardDidHideListener.remove()
    }
  },[])

  useEffect(() => {
    if (showImageOptions) {
      Animated.timing(modalAnimation,{
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start()
    } else {
      Animated.timing(modalAnimation,{
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start()
    }
  },[showImageOptions])

  useEffect(() => {
    if (showUrlInput) {
      Animated.timing(urlInputAnimation,{
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start()
    } else {
      Animated.timing(urlInputAnimation,{
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start()
    }
  },[showUrlInput])

  useEffect(() => {
    if (showGenderOptions) {
      Animated.timing(genderModalAnimation,{
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start()
    } else {
      Animated.timing(genderModalAnimation,{
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start()
    }
  },[showGenderOptions])

  useEffect(() => {
    if (showDatePicker) {
      setTempBirthDate(formData.birthDate || new Date());
      Animated.timing(datePickerAnimation,{
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start()
    } else {
      Animated.timing(datePickerAnimation,{
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start()
    }
  },[showDatePicker])

  if (!fontsLoaded || loading) {
    return <CommonSkeleton />;
  }

  const handleInputChange = (field,value) => {
    setFormData((prev) => ({ ...prev,[field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev,[field]: "" }))
    }
  }

  const formatDate = (date) => {
    if (!date) return ""
    const day = date.getDate().toString().padStart(2,"0")
    const month = (date.getMonth() + 1).toString().padStart(2,"0")
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
  }

  const validateForm = () => {
    const newErrors = {}
    let isValid = true

    if (!formData.fullName.trim()) {
      newErrors.fullName = "Full name is required"
      isValid = false
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!formData.email.trim()) {
      newErrors.email = "Email is required"
      isValid = false
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = "Please enter a valid email address"
      isValid = false
    }

    if (formData.phone && !/^\d{10}$/.test(formData.phone.replace(/\D/g,""))) {
      newErrors.phone = "Please enter a valid 10-digit phone number"
      isValid = false
    }

    if (formData.birthDate) {
      const today = new Date()
      const birthDate = new Date(formData.birthDate)

      if (birthDate > today) {
        newErrors.birthDate = "Birth date cannot be in the future"
        isValid = false
      }

      const age = today.getFullYear() - birthDate.getFullYear()
      const monthDiff = today.getMonth() - birthDate.getMonth()
      const dayDiff = today.getDate() - birthDate.getDate()

      if (age < 13 || (age === 13 && (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)))) {
        newErrors.birthDate = "You must be at least 13 years old"
        isValid = false
      }
    }

    setErrors(newErrors)
    return isValid
  }

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        setHasGalleryPermission(false);
        showErrorMessage('To select images, please grant access to your photo library in your device settings.');
        return;
      }

      setHasGalleryPermission(true);
      setImageUploading(true);

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1,1],
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0];
        const imageType = selectedAsset.type === 'image' ? 'image/jpeg' : (selectedAsset.type || 'image/jpeg');

        if (!ALLOWED_TYPES.includes(imageType)) {
          showErrorMessage(`Invalid image type. Only ${ALLOWED_TYPES.join(', ')} are allowed.`);
          return;
        }

        if (selectedAsset.base64) {
          const base64Image = `data:image/${imageType.split('/')[1]};base64,${selectedAsset.base64}`;
          setFormData((prev) => ({ ...prev,avatar: base64Image }));
        } else {
          setFormData((prev) => ({ ...prev,avatar: selectedAsset.uri }));
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
        setHasCameraPermission(false);
        showErrorMessage('To take photos, please grant access to your camera in your device settings.');
        return;
      }

      setHasCameraPermission(true);
      setImageUploading(true);

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1,1],
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0];
        const imageType = selectedAsset.type === 'image' ? 'image/jpeg' : (selectedAsset.type || 'image/jpeg');

        if (!ALLOWED_TYPES.includes(imageType)) {
          showErrorMessage(`Invalid image type. Only ${ALLOWED_TYPES.join(', ')} are allowed.`);
          return;
        }

        if (selectedAsset.base64) {
          const base64Image = `data:image/${imageType.split('/')[1]};base64,${selectedAsset.base64}`;
          setFormData((prev) => ({ ...prev,avatar: base64Image }));
        } else {
          setFormData((prev) => ({ ...prev,avatar: selectedAsset.uri }));
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

  const confirmUrlImage = () => {
    if (!imageUrl.trim()) {
      setErrors((prev) => ({ ...prev,imageUrl: "Please enter an image URL" }))
      return
    }

    setFormData((prev) => ({ ...prev,avatar: imageUrl }))
    setImageUrl("")
    setShowUrlInput(false)
  }

  const handleGenderSelect = (gender) => {
    setFormData((prev) => ({ ...prev,gender }))
    setShowGenderOptions(false)
    if (errors.gender) {
      setErrors((prev) => ({ ...prev,gender: "" }))
    }
  }

  const handleDateChange = (event,selectedDate) => {
    if (selectedDate) {
      setTempBirthDate(selectedDate);
      if (errors.birthDate) {
        setErrors((prev) => ({ ...prev,birthDate: "" }))
      }
    }
  }

  const handleConfirmBirthDate = () => {
    setFormData((prev) => ({ ...prev,birthDate: tempBirthDate }));
    setShowDatePicker(false);
  }

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      let avatarUrl = formData.avatar;
      if (avatarUrl && (avatarUrl.startsWith('data:image/') || avatarUrl.startsWith('file://'))) {
        const fileType = avatarUrl.startsWith('data:image/')
          ? avatarUrl.split(';')[0].split('/')[1]
          : 'jpeg';
        const fileExtension = fileType === 'jpeg' ? 'jpg' : fileType;

        const formDataForUpload = new FormData();
        formDataForUpload.append('file',{
          uri: avatarUrl.startsWith('data:image/') ? formData.avatar : avatarUrl,
          type: `image/${fileType}`,
          name: `photo.${fileExtension}`,
        });

        const uploadResult = await apiUploadImageCloudService.uploadImage(formDataForUpload);

        if (!uploadResult.isError && uploadResult.imageUrl) {
          avatarUrl = uploadResult.imageUrl;
        } else {
          throw new Error(uploadResult.message || 'Failed to upload image.');
        }
      }

      const userDto = {
        userId: formData.userId,
        fullName: formData.fullName,
        email: formData?.email,
        phone: formData.phone,
        avatar: avatarUrl,
        gender: formData.gender,
        birthDate: formData.birthDate ? formData.birthDate.toISOString().split('T')[0] : null,
      };

      const response = await apiUserService.updateUser(formData.userId,userDto);
      if (response.statusCode === 200) {
        showSuccessMessage('Profile updated successfully.');
        navigation.goBack();
      } else {
        throw new Error(response.message || 'Failed to update profile');
      }
    } catch (error) {
      showErrorFetchAPI(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safeArea,{ backgroundColor: colors.background || '#fff' }]}>
      <Header
        title="Edit Information"
        canGoBack
        onBack={() => navigation.goBack()}
        rightActions={[]}
      />

      <KeyboardAvoidingView
        style={[styles.container,{ backgroundColor: colors.backgroundCard || '#F8FAFC',marginTop: 80 }]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.avatarSection}>
            <View style={styles.avatarContainer}>
              {imageUploading ? (
                <CommonSkeleton />
              ) : (
                <Image
                  source={{ uri: formData.avatar || "https://via.placeholder.com/150?text=User" }}
                  style={styles.avatar}
                  onError={() =>
                    setFormData((prev) => ({ ...prev,avatar: "https://via.placeholder.com/150?text=User" }))
                  }
                />
              )}
              <TouchableOpacity
                style={[styles.changeAvatarButton,{ backgroundColor: '#0056d2' }]}
                onPress={() => setShowImageOptions(true)}
                disabled={imageUploading}
              >
                <Ionicons name="camera" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <Text style={styles.avatarHelpText}>Tap the camera icon to change your profile picture</Text>
          </View>

          <View style={styles.formCard}>
            <View style={styles.formSection}>
              <View style={styles.sectionHeaderContainer}>
                <Ionicons name="person-outline" size={24} color={colors.primary} style={styles.sectionIcon} />
                <Text style={styles.sectionTitle}>Personal Information</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <View style={[styles.inputContainer,errors.fullName ? styles.inputError : null]}>
                  <Ionicons name="person-outline" size={20} color="#64748B" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={formData.fullName}
                    onChangeText={(text) => handleInputChange("fullName",text)}
                    placeholder="Enter your full name"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
                {errors.fullName ? (
                  <Text style={styles.errorMessage}>
                    <Ionicons name="alert-circle-outline" size={14} color="#EF4444" /> {errors.fullName}
                  </Text>
                ) : null}
              </View>

              <View style={styles.inputGroup} >
                <Text style={styles.inputLabel}>Email</Text>
                <View style={[styles.inputContainer,errors.email ? styles.inputError : null]} backgroundColor="#f3f3f3">
                  <Ionicons name="mail-outline" size={20} color="#64748B" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={formData.email}
                    placeholder="Enter your email"
                    placeholderTextColor="#94A3B8"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    readOnly
                  />
                </View>
                {errors.email ? (
                  <Text style={styles.errorMessage}>
                    <Ionicons name="alert-circle-outline" size={14} color="#EF4444" /> {errors.email}
                  </Text>
                ) : null}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone</Text>
                <View style={[styles.inputContainer,errors.phone ? styles.inputError : null]}>
                  <Ionicons name="call-outline" size={20} color="#64748B" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={formData.phone}
                    onChangeText={(text) => handleInputChange("phone",text)}
                    placeholder="Enter your phone number"
                    placeholderTextColor="#94A3B8"
                    keyboardType="phone-pad"
                  />
                </View>
                {errors.phone ? (
                  <Text style={styles.errorMessage}>
                    <Ionicons name="alert-circle-outline" size={14} color="#EF4444" /> {errors.phone}
                  </Text>
                ) : null}
              </View>

              {/* Gender Selection */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Gender</Text>
                <TouchableOpacity
                  style={[styles.selectContainer,formData.gender ? styles.filledSelect : {}]}
                  onPress={() => setShowGenderOptions(true)}
                >
                  <View style={styles.selectContent}>
                    <Ionicons name="person-circle-outline" size={20} color="#64748B" style={styles.inputIcon} />
                    <Text style={[styles.selectText,!formData.gender && styles.placeholderText]}>
                      {formData.gender || "Select gender"}
                    </Text>
                  </View>
                  <Ionicons name="chevron-down" size={20} color="#64748B" />
                </TouchableOpacity>
                {errors.gender ? (
                  <Text style={styles.errorMessage}>
                    <Ionicons name="alert-circle-outline" size={14} color="#EF4444" /> {errors.gender}
                  </Text>
                ) : null}
              </View>

              {/* Birth Date Selection */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Birth Date</Text>
                <TouchableOpacity
                  style={[styles.selectContainer,formData.birthDate ? styles.filledSelect : {}]}
                  onPress={() => setShowDatePicker(true)}
                >
                  <View style={styles.selectContent}>
                    <Ionicons name="calendar-outline" size={20} color="#64748B" style={styles.inputIcon} />
                    <Text style={[styles.selectText,!formData.birthDate && styles.placeholderText]}>
                      {formData.birthDate ? formatDate(formData.birthDate) : "Select birth date"}
                    </Text>
                  </View>
                  <Ionicons name="calendar" size={20} color="#64748B" />
                </TouchableOpacity>
                {errors.birthDate ? (
                  <Text style={styles.errorMessage}>
                    <Ionicons name="alert-circle-outline" size={14} color="#EF4444" /> {errors.birthDate}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.saveButton,{ backgroundColor: '#0056d2' },loading ? styles.saveButtonDisabled : null]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="save-outline" size={20} color="#FFFFFF" style={styles.buttonIcon} />
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.tipContainer}>
            <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
            <Text style={styles.tipText}>
              Keeping your profile information up to date helps us provide better service and ensures we can contact you
              if needed.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Image Options Modal */}
      <Modal
        visible={showImageOptions}
        transparent={true}
        animationType="none"
        onRequestClose={() => setShowImageOptions(false)}
      >
        <Animated.View
          style={[
            styles.modalOverlay,
            {
              opacity: modalAnimation,
            },
          ]}
        >
          <TouchableOpacity style={styles.modalBackground} onPress={() => setShowImageOptions(false)} />
          <Animated.View
            style={[
              styles.modalContainer,
              {
                transform: [
                  {
                    translateY: modalAnimation.interpolate({
                      inputRange: [0,1],
                      outputRange: [300,0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Profile Picture</Text>
              <TouchableOpacity onPress={() => setShowImageOptions(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.modalOption} onPress={handleTakePhoto}>
              <Ionicons name="camera-outline" size={24} color={colors.primary} style={styles.modalOptionIcon} />
              <Text style={[styles.modalOptionText,{ color: colors.primary }]}>Take Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalOption} onPress={handlePickImage}>
              <Ionicons name="image-outline" size={24} color={colors.primary} style={styles.modalOptionIcon} />
              <Text style={[styles.modalOptionText,{ color: colors.primary }]}>Choose from Gallery</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalOption} onPress={handleUrlImage}>
              <Ionicons name="link-outline" size={24} color={colors.primary} style={styles.modalOptionIcon} />
              <Text style={[styles.modalOptionText,{ color: colors.primary }]}>Enter Image URL</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </Modal>

      {/* URL Input Modal - Adjusted to handle keyboard */}
      <Modal
        visible={showUrlInput}
        transparent={true}
        animationType="none"
        onRequestClose={() => setShowUrlInput(false)}
      >
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <Animated.View
            style={[
              styles.modalOverlay,
              {
                opacity: urlInputAnimation,
                justifyContent: "center", // Center the modal instead of at bottom
                paddingBottom: keyboardHeight > 0 ? keyboardHeight : 0,
              },
            ]}
          >
            <TouchableOpacity
              style={styles.modalBackground}
              onPress={() => {
                Keyboard.dismiss()
                setShowUrlInput(false)
              }}
            />
            <Animated.View
              style={[
                styles.modalContainer,
                styles.urlModalContainer, // Additional styles for URL modal
                {
                  transform: [
                    {
                      translateY: urlInputAnimation.interpolate({
                        inputRange: [0,1],
                        outputRange: [100,0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Enter Image URL</Text>
                <TouchableOpacity onPress={() => setShowUrlInput(false)}>
                  <Ionicons name="close" size={24} color="#64748B" />
                </TouchableOpacity>
              </View>

              <View style={styles.urlInputContainer}>
                <TextInput
                  style={styles.urlInput}
                  value={imageUrl}
                  onChangeText={setImageUrl}
                  placeholder="https://example.com/image.jpg"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="none"
                  autoFocus={true}
                />
                {errors.imageUrl ? (
                  <Text style={styles.errorMessage}>
                    <Ionicons name="alert-circle-outline" size={14} color="#EF4444" /> {errors.imageUrl}
                  </Text>
                ) : null}
              </View>

              <TouchableOpacity style={[styles.urlConfirmButton,{ backgroundColor: colors.primary }]} onPress={confirmUrlImage}>
                <Text style={styles.urlConfirmButtonText}>Confirm</Text>
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Gender Options Modal */}
      <Modal
        visible={showGenderOptions}
        transparent={true}
        animationType="none"
        onRequestClose={() => setShowGenderOptions(false)}
      >
        <Animated.View
          style={[
            styles.modalOverlay,
            {
              opacity: genderModalAnimation,
            },
          ]}
        >
          <TouchableOpacity style={styles.modalBackground} onPress={() => setShowGenderOptions(false)} />
          <Animated.View
            style={[
              styles.modalContainer,
              {
                transform: [
                  {
                    translateY: genderModalAnimation.interpolate({
                      inputRange: [0,1],
                      outputRange: [300,0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Gender</Text>
              <TouchableOpacity onPress={() => setShowGenderOptions(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary || "#64748B"} />
              </TouchableOpacity>
            </View>

            {GENDER_OPTIONS.map((gender) => (
              <TouchableOpacity key={gender} style={styles.modalOption} onPress={() => handleGenderSelect(gender)}>
                <Text style={[styles.modalOptionText,{ color: colors.primary }]}>{gender}</Text>
                {formData.gender === gender && <Ionicons name="checkmark" size={20} color={colors.primary} />}
              </TouchableOpacity>
            ))}
          </Animated.View>
        </Animated.View>
      </Modal>

      {/* Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        transparent={true}
        animationType="none"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <Animated.View
          style={[
            styles.modalOverlay,
            {
              opacity: datePickerAnimation,
              justifyContent: "flex-end", // Sát xuống dưới màn hình
            },
          ]}
        >
          <TouchableOpacity style={styles.modalBackground} onPress={() => setShowDatePicker(false)} />
          <Animated.View
            style={[
              styles.modalContainer,
              styles.datePickerModalContainer,
              {
                transform: [
                  {
                    scale: datePickerAnimation.interpolate({
                      inputRange: [0,1],
                      outputRange: [0.8,1],
                    }),
                  },
                ],
                marginBottom: 0, // Sát dưới
                width: '100%', // full width
                maxWidth: '100%',
                marginHorizontal: 0,
                borderRadius: 0,
                alignSelf: 'flex-end',
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Birth Date</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary || "#64748B"} />
              </TouchableOpacity>
            </View>

            <View style={styles.datePickerContainer}>
              <DateTimePicker
                value={tempBirthDate || new Date()}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={handleDateChange}
                maximumDate={new Date()}
                style={styles.datePicker}
              />
            </View>

            <View style={[styles.datePickerActions,{ marginBottom: 10 }]}>
              <TouchableOpacity style={[styles.datePickerCancelButton,{ backgroundColor: colors.card || '#F1F5F9' }]} onPress={() => setShowDatePicker(false)}>
                <Text style={[styles.datePickerCancelText,{ color: colors.textSecondary || '#64748B' }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.datePickerConfirmButton,{ backgroundColor: '#0056d2' }]} onPress={handleConfirmBirthDate}>
                <Text style={styles.datePickerConfirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  headerTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
    color: "#FFFFFF",
    textAlign: "center",
  },
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: 15,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  avatarSection: {
    alignItems: "center",
    marginTop: 24,
    marginBottom: 16,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 12,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  avatarLoading: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
  },
  changeAvatarButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  avatarHelpText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
  },
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0,height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  formSection: {
    padding: 20,
  },
  sectionHeaderContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  sectionIcon: {
    marginRight: 10,
  },
  sectionTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: "#1E293B",
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: "#334155",
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    height: 56,
  },
  inputError: {
    borderColor: "#EF4444",
    backgroundColor: "#FEF2F2",
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 56,
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    color: "#0F172A",
  },
  errorMessage: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "#EF4444",
    marginTop: 6,
  },
  selectContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    height: 56,
  },
  selectContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  filledSelect: {
    borderColor: "#A5B4FC",
    backgroundColor: "#F5F7FF",
  },
  selectText: {
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    color: "#0F172A",
  },
  placeholderText: {
    color: "#94A3B8",
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 24,
    ...Platform.select({
      ios: {
        shadowColor: "#0056d2",
        shadowOffset: { width: 0,height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  saveButtonDisabled: {
    backgroundColor: "#B3D2F7",
    ...Platform.select({
      ios: {
        shadowOpacity: 0.1,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  buttonIcon: {
    marginRight: 8,
  },
  saveButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: "#FFFFFF",
  },
  tipContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
  },
  tipText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "#334155",
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0,height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  urlModalContainer: {
    // Center the URL modal in the screen instead of at the bottom
    borderRadius: 24,
    marginHorizontal: 20,
    maxWidth: 500,
    width: "90%",
    alignSelf: "center",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
    color: "#1E293B",
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  modalOptionIcon: {
    marginRight: 16,
  },
  modalOptionText: {
    fontFamily: "Inter_500Medium",
    fontSize: 16,
  },
  urlInputContainer: {
    marginBottom: 20,
  },
  urlInput: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    color: "#0F172A",
  },
  urlConfirmButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  datePickerModalContainer: {
    borderRadius: 0,
    marginHorizontal: 0,
    maxWidth: '100%',
    width: '100%',
    alignSelf: 'flex-end',
    maxHeight: "80%",
  },
  datePickerContainer: {
    paddingVertical: 20,
    alignItems: "center",
  },
  datePicker: {
    width: "100%",
    height: 200,
  },
  datePickerActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  datePickerCancelButton: {
    flex: 1,
    paddingVertical: 12,
    marginRight: 8,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
  },
  datePickerConfirmButton: {
    flex: 1,
    paddingVertical: 12,
    marginLeft: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  datePickerCancelText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: "#64748B",
  },
  datePickerConfirmText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: "#FFFFFF",
  },
})