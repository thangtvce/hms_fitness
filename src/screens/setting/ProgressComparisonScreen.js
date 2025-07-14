import { useState,useEffect,useCallback,useContext,useRef } from "react"
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    RefreshControl,
    Dimensions,
    Platform,
    Modal,
    TextInput,
    ScrollView,
    Image,
    Animated,
    KeyboardAvoidingView,
    TouchableWithoutFeedback,
    Keyboard,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { apiProgressComparisonService } from "services/apiProgressComparisonService"
import { apiProgressPhotoService } from "services/apiProgressPhotoService"
import { bodyMeasurementService } from "services/apiBodyMeasurementService"
import { apiUploadImageCloudService } from "services/apiUploadImageCloudService"
import { AuthContext } from "context/AuthContext"
import { useFocusEffect } from "@react-navigation/native"
import DynamicStatusBar from "screens/statusBar/DynamicStatusBar"
import { theme } from "theme/color"
import { LinearGradient } from "expo-linear-gradient"
import FloatingMenuButton from "components/FloatingMenuButton"
import { StatusBar } from "expo-status-bar"
import { SafeAreaView } from "react-native-safe-area-context"
import * as ImagePicker from "expo-image-picker"

const { width,height } = Dimensions.get("window")

const PhotoPreviewModal = ({ visible,imageUri,onClose,title = "Photo Preview" }) => {
    return (
        <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
            <View style={styles.photoPreviewModalContainer}>
                <TouchableWithoutFeedback onPress={onClose}>
                    <View style={styles.photoPreviewBackdrop} />
                </TouchableWithoutFeedback>
                <View style={styles.photoPreviewContent}>
                    <View style={styles.photoPreviewHeader}>
                        <Text style={styles.photoPreviewTitle}>{title}</Text>
                        <TouchableOpacity onPress={onClose} style={styles.photoPreviewCloseButton}>
                            <Ionicons name="close" size={24} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>
                    {imageUri ? (
                        <Image source={{ uri: imageUri }} style={styles.photoPreviewImage} resizeMode="contain" />
                    ) : (
                        <View style={styles.photoPreviewPlaceholder}>
                            <Ionicons name="image-outline" size={64} color="#9CA3AF" />
                            <Text style={styles.photoPreviewPlaceholderText}>No image available</Text>
                        </View>
                    )}
                </View>
            </View>
        </Modal>
    )
}

const StepWizard = ({ visible,onClose,onComplete,measurements,user }) => {
    const [currentStep,setCurrentStep] = useState(1)
    const [wizardData,setWizardData] = useState({
        userId: user?.userId,
        beforeMeasurementId: null,
        afterMeasurementId: null,
        comparisonDate: new Date(),
        weightChange: null,
        bodyFatChange: null,
        description: "",
        beforePhotoUrl: "",
        afterPhotoUrl: "",
        photoNotes: "",
    })
    const [previewImages,setPreviewImages] = useState({ before: null,after: null })
    const [uploading,setUploading] = useState(false)
    const [keyboardVisible,setKeyboardVisible] = useState(false)
    const [photoPreview,setPhotoPreview] = useState({ visible: false,uri: null,title: "" })
    const slideAnim = new Animated.Value(0)
    const scrollViewRef = useRef(null)

    const totalSteps = 7

    useEffect(() => {
        if (visible) {
            Animated.timing(slideAnim,{
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }).start()
        }
    },[visible])

    useEffect(() => {
        const keyboardDidShowListener = Keyboard.addListener("keyboardDidShow",() => {
            setKeyboardVisible(true)
        })
        const keyboardDidHideListener = Keyboard.addListener("keyboardDidHide",() => {
            setKeyboardVisible(false)
        })

        return () => {
            keyboardDidShowListener?.remove()
            keyboardDidHideListener?.remove()
        }
    },[])

    const dismissKeyboard = () => {
        Keyboard.dismiss()
    }

    const showPhotoPreview = (uri,title) => {
        setPhotoPreview({ visible: true,uri,title })
    }

    const hidePhotoPreview = () => {
        setPhotoPreview({ visible: false,uri: null,title: "" })
    }

    const calculateChanges = (beforeId,afterId) => {
        if (!beforeId || !afterId) return { weightChange: null,bodyFatChange: null }
        const before = measurements.find((m) => m.measurementId === beforeId)
        const after = measurements.find((m) => m.measurementId === afterId)
        if (!before || !after) return { weightChange: null,bodyFatChange: null }

        const weightChange = Number.parseFloat((after.weight - before.weight).toFixed(2))
        const bodyFatChange =
            after.bodyFatPercentage && before.bodyFatPercentage
                ? Number.parseFloat((after.bodyFatPercentage - before.bodyFatPercentage).toFixed(2))
                : null
        return { weightChange,bodyFatChange }
    }

    const handleMeasurementChange = (type,value) => {
        const updatedData = { ...wizardData,[type]: value }
        const { weightChange,bodyFatChange } = calculateChanges(
            updatedData.beforeMeasurementId,
            updatedData.afterMeasurementId,
        )
        setWizardData({ ...updatedData,weightChange,bodyFatChange })
    }

    const handleImagePick = async (type) => {
        try {
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync()
            if (!permissionResult.granted) {
                Alert.alert("Permission Required","Please allow access to your photo library to continue.")
                return
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4,3],
                quality: 0.8,
            })

            if (!result.canceled) {
                setPreviewImages((prev) => ({ ...prev,[type]: result.assets[0].uri }))
                setWizardData((prev) => ({ ...prev,[`${type}PhotoUrl`]: result.assets[0].uri }))
            }
        } catch (error) {
            console.error("Image pick error:",error.message)
            Alert.alert("Error","Failed to select image. Please try again.")
        }
    }

    const handleCameraCapture = async (type) => {
        try {
            const permissionResult = await ImagePicker.requestCameraPermissionsAsync()
            if (!permissionResult.granted) {
                Alert.alert("Permission Required","Please allow camera access to take photos.")
                return
            }

            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4,3],
                quality: 0.8,
            })

            if (!result.canceled) {
                setPreviewImages((prev) => ({ ...prev,[type]: result.assets[0].uri }))
                setWizardData((prev) => ({ ...prev,[`${type}PhotoUrl`]: result.assets[0].uri }))
            }
        } catch (error) {
            console.error("Camera capture error:",error.message)
            Alert.alert("Error","Failed to capture image. Please try again.")
        }
    }

    const nextStep = () => {
        dismissKeyboard()
        if (currentStep < totalSteps) {
            setCurrentStep(currentStep + 1)
            setTimeout(() => {
                scrollViewRef.current?.scrollTo({ y: 0,animated: true })
            },100)
        }
    }

    const prevStep = () => {
        dismissKeyboard()
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1)
            setTimeout(() => {
                scrollViewRef.current?.scrollTo({ y: 0,animated: true })
            },100)
        }
    }

    const handleComplete = async () => {
        try {
            setUploading(true)
            dismissKeyboard()

            let beforePhotoUrl = wizardData.beforePhotoUrl
            let afterPhotoUrl = wizardData.afterPhotoUrl

            if (previewImages.before) {
                const beforeFormData = new FormData()
                beforeFormData.append("file",{
                    uri: previewImages.before,
                    type: "image/jpeg",
                    name: `before_${Date.now()}.jpg`,
                })
                const beforeUpload = await apiUploadImageCloudService.uploadImage(beforeFormData)
                if (beforeUpload.isError) {
                    throw new Error(beforeUpload.message)
                }
                beforePhotoUrl = beforeUpload.imageUrl
            }

            if (previewImages.after) {
                const afterFormData = new FormData()
                afterFormData.append("file",{
                    uri: previewImages.after,
                    type: "image/jpeg",
                    name: `after_${Date.now()}.jpg`,
                })
                const afterUpload = await apiUploadImageCloudService.uploadImage(afterFormData)
                if (afterUpload.isError) {
                    throw new Error(afterUpload.message)
                }
                afterPhotoUrl = afterUpload.imageUrl
            }

            const comparisonResponse = await apiProgressComparisonService.addComparisons([
                {
                    userId: wizardData.userId,
                    beforeMeasurementId: wizardData.beforeMeasurementId,
                    afterMeasurementId: wizardData.afterMeasurementId,
                    comparisonDate: wizardData.comparisonDate,
                    weightChange: wizardData.weightChange,
                    bodyFatChange: wizardData.bodyFatChange,
                    description: wizardData.description,
                },
            ])

            if (comparisonResponse?.statusCode !== 201 && comparisonResponse?.statusCode !== 207) {
                throw new Error("Failed to create progress comparison.")
            }

            const comparisonId = comparisonResponse.data.createdComparisons[0]?.comparisonId

            if (comparisonId && (beforePhotoUrl || afterPhotoUrl)) {
                const photoData = {
                    comparisonId,
                    beforePhotoUrl,
                    afterPhotoUrl,
                    photoDate: wizardData.comparisonDate,
                    notes: wizardData.photoNotes,
                }
                const photoResponse = await apiProgressPhotoService.createProgressPhoto(photoData)
                if (photoResponse?.statusCode !== 201) {
                    throw new Error("Failed to create progress photo.")
                }
            }

            Alert.alert("Success","Progress comparison created successfully!")
            onComplete()
            onClose()

            // Reset wizard
            setCurrentStep(1)
            setWizardData({
                userId: user?.userId,
                beforeMeasurementId: null,
                afterMeasurementId: null,
                comparisonDate: new Date(),
                weightChange: null,
                bodyFatChange: null,
                description: "",
                beforePhotoUrl: "",
                afterPhotoUrl: "",
                photoNotes: "",
            })
            setPreviewImages({ before: null,after: null })
        } catch (error) {
            console.error("Save comparison error:",error.message)
            Alert.alert("Error","Failed to save progress comparison. Please try again.")
        } finally {
            setUploading(false)
        }
    }

    const renderStepContent = () => {
        switch (currentStep) {
            case 1:
                return (
                    <TouchableWithoutFeedback onPress={dismissKeyboard}>
                        <View style={styles.stepContent}>
                            <View style={styles.stepHeader}>
                                <View style={styles.stepIconContainer}>
                                    <Ionicons name="fitness-outline" size={28} color="#FFFFFF" />
                                </View>
                                <Text style={styles.stepTitle}>Select Starting Point</Text>
                                <Text style={styles.stepDescription}>Choose your first measurement for comparison</Text>
                            </View>
                            <ScrollView
                                style={styles.measurementList}
                                showsVerticalScrollIndicator={false}
                                nestedScrollEnabled={true}
                            >
                                {measurements.map((measurement) => (
                                    <TouchableOpacity
                                        key={measurement.measurementId}
                                        style={[
                                            styles.measurementCard,
                                            wizardData.beforeMeasurementId === measurement.measurementId && styles.selectedMeasurement,
                                        ]}
                                        onPress={() => handleMeasurementChange("beforeMeasurementId",measurement.measurementId)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={styles.measurementCardContent}>
                                            <View style={styles.measurementIconContainer}>
                                                <Ionicons name="calendar" size={20} color="#4F46E5" />
                                            </View>
                                            <View style={styles.measurementInfo}>
                                                <Text style={styles.measurementDate}>
                                                    {new Date(measurement.measurementDate).toLocaleDateString("en-US",{
                                                        weekday: "short",
                                                        month: "short",
                                                        day: "numeric",
                                                        year: "numeric",
                                                    })}
                                                </Text>
                                                <View style={styles.measurementDetails}>
                                                    <View style={styles.measurementDetailItem}>
                                                        <Ionicons name="fitness" size={14} color="#6B7280" />
                                                        <Text style={styles.measurementWeight}>{measurement.weight} kg</Text>
                                                    </View>
                                                    {measurement.bodyFatPercentage && (
                                                        <View style={styles.measurementDetailItem}>
                                                            <Ionicons name="analytics" size={14} color="#6B7280" />
                                                            <Text style={styles.measurementBodyFat}>{measurement.bodyFatPercentage}%</Text>
                                                        </View>
                                                    )}
                                                </View>
                                            </View>
                                            {wizardData.beforeMeasurementId === measurement.measurementId && (
                                                <View style={styles.selectedIndicator}>
                                                    <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                                                </View>
                                            )}
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    </TouchableWithoutFeedback>
                )

            case 2:
                return (
                    <TouchableWithoutFeedback onPress={dismissKeyboard}>
                        <View style={styles.stepContent}>
                            <View style={styles.stepHeader}>
                                <View style={styles.stepIconContainer}>
                                    <Ionicons name="trending-up" size={28} color="#FFFFFF" />
                                </View>
                                <Text style={styles.stepTitle}>Select End Point</Text>
                                <Text style={styles.stepDescription}>Choose your second measurement for comparison</Text>
                            </View>
                            <ScrollView
                                style={styles.measurementList}
                                showsVerticalScrollIndicator={false}
                                nestedScrollEnabled={true}
                            >
                                {measurements.map((measurement) => (
                                    <TouchableOpacity
                                        key={measurement.measurementId}
                                        style={[
                                            styles.measurementCard,
                                            wizardData.afterMeasurementId === measurement.measurementId && styles.selectedMeasurement,
                                        ]}
                                        onPress={() => handleMeasurementChange("afterMeasurementId",measurement.measurementId)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={styles.measurementCardContent}>
                                            <View style={styles.measurementIconContainer}>
                                                <Ionicons name="calendar" size={20} color="#4F46E5" />
                                            </View>
                                            <View style={styles.measurementInfo}>
                                                <Text style={styles.measurementDate}>
                                                    {new Date(measurement.measurementDate).toLocaleDateString("en-US",{
                                                        weekday: "short",
                                                        month: "short",
                                                        day: "numeric",
                                                        year: "numeric",
                                                    })}
                                                </Text>
                                                <View style={styles.measurementDetails}>
                                                    <View style={styles.measurementDetailItem}>
                                                        <Ionicons name="fitness" size={14} color="#6B7280" />
                                                        <Text style={styles.measurementWeight}>{measurement.weight} kg</Text>
                                                    </View>
                                                    {measurement.bodyFatPercentage && (
                                                        <View style={styles.measurementDetailItem}>
                                                            <Ionicons name="analytics" size={14} color="#6B7280" />
                                                            <Text style={styles.measurementBodyFat}>{measurement.bodyFatPercentage}%</Text>
                                                        </View>
                                                    )}
                                                </View>
                                            </View>
                                            {wizardData.afterMeasurementId === measurement.measurementId && (
                                                <View style={styles.selectedIndicator}>
                                                    <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                                                </View>
                                            )}
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                            {wizardData.weightChange !== null && (
                                <View style={styles.changePreview}>
                                    <View style={styles.changePreviewHeader}>
                                        <Ionicons name="calculator" size={20} color="#4F46E5" />
                                        <Text style={styles.changeTitle}>Calculated Changes</Text>
                                    </View>
                                    <View style={styles.changeStats}>
                                        <View style={styles.changeStatItem}>
                                            <Ionicons name="fitness" size={16} color="#6B7280" />
                                            <Text
                                                style={[
                                                    styles.changeText,
                                                    wizardData.weightChange >= 0 ? styles.positiveChange : styles.negativeChange,
                                                ]}
                                            >
                                                {wizardData.weightChange > 0 ? "+" : ""}
                                                {wizardData.weightChange} kg
                                            </Text>
                                        </View>
                                        {wizardData.bodyFatChange !== null && (
                                            <View style={styles.changeStatItem}>
                                                <Ionicons name="analytics" size={16} color="#6B7280" />
                                                <Text
                                                    style={[
                                                        styles.changeText,
                                                        wizardData.bodyFatChange >= 0 ? styles.positiveChange : styles.negativeChange,
                                                    ]}
                                                >
                                                    {wizardData.bodyFatChange > 0 ? "+" : ""}
                                                    {wizardData.bodyFatChange}%
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            )}
                        </View>
                    </TouchableWithoutFeedback>
                )

            case 3:
                return (
                    <TouchableWithoutFeedback onPress={dismissKeyboard}>
                        <View style={styles.stepContent}>
                            <View style={styles.stepHeader}>
                                <View style={styles.stepIconContainer}>
                                    <Ionicons name="document-text" size={28} color="#FFFFFF" />
                                </View>
                                <Text style={styles.stepTitle}>Add Description</Text>
                                <Text style={styles.stepDescription}>Describe your progress and journey</Text>
                            </View>
                            <View style={styles.inputContainer}>
                                <View style={styles.inputGroup}>
                                    <View style={styles.inputLabelContainer}>
                                        <Ionicons name="create" size={16} color="#4F46E5" />
                                        <Text style={styles.inputLabel}>Progress Description</Text>
                                    </View>
                                    <TextInput
                                        style={styles.textArea}
                                        value={wizardData.description}
                                        onChangeText={(text) => setWizardData({ ...wizardData,description: text })}
                                        placeholder="Describe your progress, workout routine, diet changes, or any other relevant information..."
                                        placeholderTextColor="#9CA3AF"
                                        multiline
                                        numberOfLines={6}
                                        textAlignVertical="top"
                                        returnKeyType="done"
                                        blurOnSubmit={true}
                                    />
                                </View>
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                )

            case 4:
                return (
                    <TouchableWithoutFeedback onPress={dismissKeyboard}>
                        <View style={styles.stepContent}>
                            <View style={styles.stepHeader}>
                                <View style={styles.stepIconContainer}>
                                    <Ionicons name="camera" size={28} color="#FFFFFF" />
                                </View>
                                <Text style={styles.stepTitle}>Before Photo</Text>
                                <Text style={styles.stepDescription}>Capture or select your starting point photo</Text>
                            </View>
                            <View style={styles.photoSection}>
                                {previewImages.before ? (
                                    <View style={styles.photoPreview}>
                                        <TouchableOpacity
                                            onPress={() => showPhotoPreview(previewImages.before,"Before Photo")}
                                            activeOpacity={0.8}
                                        >
                                            <Image source={{ uri: previewImages.before }} style={styles.previewImage} />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.removePhotoButton}
                                            onPress={() => {
                                                setPreviewImages((prev) => ({ ...prev,before: null }))
                                                setWizardData((prev) => ({ ...prev,beforePhotoUrl: "" }))
                                            }}
                                            activeOpacity={0.7}
                                        >
                                            <Ionicons name="close-circle" size={24} color="#EF4444" />
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    <View style={styles.photoPlaceholder}>
                                        <Ionicons name="image-outline" size={48} color="#9CA3AF" />
                                        <Text style={styles.photoPlaceholderText}>No photo selected</Text>
                                    </View>
                                )}
                                <View style={styles.photoButtons}>
                                    <TouchableOpacity
                                        style={styles.photoButton}
                                        onPress={() => handleCameraCapture("before")}
                                        activeOpacity={0.8}
                                    >
                                        <Ionicons name="camera" size={18} color="#FFFFFF" />
                                        <Text style={styles.photoButtonText}>Take Photo</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.photoButton,styles.secondaryButton]}
                                        onPress={() => handleImagePick("before")}
                                        activeOpacity={0.8}
                                    >
                                        <Ionicons name="images" size={18} color="#4F46E5" />
                                        <Text style={[styles.photoButtonText,styles.secondaryButtonText]}>Gallery</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                )

            case 5:
                return (
                    <TouchableWithoutFeedback onPress={dismissKeyboard}>
                        <View style={styles.stepContent}>
                            <View style={styles.stepHeader}>
                                <View style={styles.stepIconContainer}>
                                    <Ionicons name="camera" size={28} color="#FFFFFF" />
                                </View>
                                <Text style={styles.stepTitle}>After Photo</Text>
                                <Text style={styles.stepDescription}>Capture or select your current progress photo</Text>
                            </View>
                            <View style={styles.photoSection}>
                                {previewImages.after ? (
                                    <View style={styles.photoPreview}>
                                        <TouchableOpacity
                                            onPress={() => showPhotoPreview(previewImages.after,"After Photo")}
                                            activeOpacity={0.8}
                                        >
                                            <Image source={{ uri: previewImages.after }} style={styles.previewImage} />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.removePhotoButton}
                                            onPress={() => {
                                                setPreviewImages((prev) => ({ ...prev,after: null }))
                                                setWizardData((prev) => ({ ...prev,afterPhotoUrl: "" }))
                                            }}
                                            activeOpacity={0.7}
                                        >
                                            <Ionicons name="close-circle" size={24} color="#EF4444" />
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    <View style={styles.photoPlaceholder}>
                                        <Ionicons name="image-outline" size={48} color="#9CA3AF" />
                                        <Text style={styles.photoPlaceholderText}>No photo selected</Text>
                                    </View>
                                )}
                                <View style={styles.photoButtons}>
                                    <TouchableOpacity
                                        style={styles.photoButton}
                                        onPress={() => handleCameraCapture("after")}
                                        activeOpacity={0.8}
                                    >
                                        <Ionicons name="camera" size={18} color="#FFFFFF" />
                                        <Text style={styles.photoButtonText}>Take Photo</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.photoButton,styles.secondaryButton]}
                                        onPress={() => handleImagePick("after")}
                                        activeOpacity={0.8}
                                    >
                                        <Ionicons name="images" size={18} color="#4F46E5" />
                                        <Text style={[styles.photoButtonText,styles.secondaryButtonText]}>Gallery</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                )
            case 6:
                return (
                    <TouchableWithoutFeedback onPress={dismissKeyboard}>
                        <View style={styles.stepContent}>
                            <View style={styles.stepHeader}>
                                <Ionicons name="create-outline" size={32} color="#4F46E5" />
                                <Text style={styles.stepTitle}>Add Photo Notes</Text>
                                <Text style={styles.stepDescription}>Add any additional notes about your photos or progress</Text>
                            </View>
                            <View style={styles.inputContainer}>
                                <Text style={styles.inputLabel}>Photo Notes (Optional)</Text>
                                <TextInput
                                    style={styles.textArea}
                                    value={wizardData.photoNotes}
                                    onChangeText={(text) => setWizardData({ ...wizardData,photoNotes: text })}
                                    placeholder="Add notes about lighting, pose, time of day, or any other relevant details about your photos..."
                                    placeholderTextColor="#9CA3AF"
                                    multiline
                                    numberOfLines={6}
                                    textAlignVertical="top"
                                    returnKeyType="done"
                                    blurOnSubmit={true}
                                />
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                )

            case 7:
                return (
                    <TouchableWithoutFeedback onPress={dismissKeyboard}>
                        <View style={styles.stepContent}>
                            <View style={styles.stepHeader}>
                                <View style={styles.stepIconContainer}>
                                    <Ionicons name="checkmark-circle" size={28} color="#FFFFFF" />
                                </View>
                                <Text style={styles.stepTitle}>Review & Confirm</Text>
                                <Text style={styles.stepDescription}>Review all information before saving</Text>
                            </View>
                            <ScrollView style={styles.reviewContent} showsVerticalScrollIndicator={false} nestedScrollEnabled={true}>
                                <View style={styles.reviewSection}>
                                    <View style={styles.reviewSectionHeader}>
                                        <Ionicons name="analytics" size={20} color="#4F46E5" />
                                        <Text style={styles.reviewSectionTitle}>Comparison Details</Text>
                                    </View>
                                    {wizardData.weightChange !== null && (
                                        <View style={styles.reviewItem}>
                                            <Text style={styles.reviewLabel}>Weight Change:</Text>
                                            <Text
                                                style={[
                                                    styles.reviewValue,
                                                    styles.reviewValueBold,
                                                    wizardData.weightChange >= 0 ? styles.positiveChange : styles.negativeChange,
                                                ]}
                                            >
                                                {wizardData.weightChange > 0 ? "+" : ""}
                                                {wizardData.weightChange} kg
                                            </Text>
                                        </View>
                                    )}
                                    {wizardData.bodyFatChange !== null && (
                                        <View style={styles.reviewItem}>
                                            <Text style={styles.reviewLabel}>Body Fat Change:</Text>
                                            <Text
                                                style={[
                                                    styles.reviewValue,
                                                    styles.reviewValueBold,
                                                    wizardData.bodyFatChange >= 0 ? styles.positiveChange : styles.negativeChange,
                                                ]}
                                            >
                                                {wizardData.bodyFatChange > 0 ? "+" : ""}
                                                {wizardData.bodyFatChange}%
                                            </Text>
                                        </View>
                                    )}
                                    <View style={styles.reviewItem}>
                                        <Text style={styles.reviewLabel}>Description:</Text>
                                        <Text style={styles.reviewValue}>{wizardData.description || "No description provided"}</Text>
                                    </View>
                                </View>

                                <View style={styles.reviewSection}>
                                    <View style={styles.reviewSectionHeader}>
                                        <Ionicons name="images" size={20} color="#4F46E5" />
                                        <Text style={styles.reviewSectionTitle}>Progress Photos</Text>
                                    </View>
                                    <View style={styles.reviewPhotos}>
                                        <View style={styles.reviewPhotoContainer}>
                                            <Text style={styles.reviewPhotoLabel}>Before</Text>
                                            {previewImages.before ? (
                                                <TouchableOpacity
                                                    onPress={() => showPhotoPreview(previewImages.before,"Before Photo")}
                                                    activeOpacity={0.8}
                                                >
                                                    <Image source={{ uri: previewImages.before }} style={styles.reviewPhoto} />
                                                </TouchableOpacity>
                                            ) : (
                                                <View style={styles.reviewPhotoPlaceholder}>
                                                    <Ionicons name="image-outline" size={32} color="#9CA3AF" />
                                                    <Text style={styles.reviewPhotoPlaceholderText}>No photo</Text>
                                                </View>
                                            )}
                                        </View>
                                        <View style={styles.reviewPhotoContainer}>
                                            <Text style={styles.reviewPhotoLabel}>After</Text>
                                            {previewImages.after ? (
                                                <TouchableOpacity
                                                    onPress={() => showPhotoPreview(previewImages.after,"After Photo")}
                                                    activeOpacity={0.8}
                                                >
                                                    <Image source={{ uri: previewImages.after }} style={styles.reviewPhoto} />
                                                </TouchableOpacity>
                                            ) : (
                                                <View style={styles.reviewPhotoPlaceholder}>
                                                    <Ionicons name="image-outline" size={32} color="#9CA3AF" />
                                                    <Text style={styles.reviewPhotoPlaceholderText}>No photo</Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                    <View style={styles.reviewItem}>
                                        <Text style={styles.reviewLabel}>Photo Notes:</Text>
                                        <Text style={styles.reviewValue}>{wizardData.photoNotes || "No notes provided"}</Text>
                                    </View>
                                </View>
                            </ScrollView>
                        </View>
                    </TouchableWithoutFeedback>
                )

            default:
                return null
        }
    }

    const canProceed = () => {
        switch (currentStep) {
            case 1:
                return wizardData.beforeMeasurementId !== null
            case 2:
                return wizardData.afterMeasurementId !== null
            case 3:
                return wizardData.description.trim().length > 0
            case 4:
            case 5:
                return true
            case 6:
                return true
            case 7:
                return true
            default:
                return false
        }
    }

    return (
        <Modal animationType="slide" transparent={false} visible={visible} onRequestClose={onClose}>
            <SafeAreaView style={styles.wizardContainer}>
                <LinearGradient colors={["#4F46E5","#6366F1"]} style={styles.wizardHeader}>
                    <View style={styles.wizardHeaderContent}>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton} activeOpacity={0.7}>
                            <Ionicons name="close" size={20} color="#FFFFFF" />
                        </TouchableOpacity>
                        <Text style={styles.wizardTitle}>Create Comparison</Text>
                        <Text style={styles.wizardStepIndicator}>
                            {currentStep} of {totalSteps}
                        </Text>
                    </View>
                    <View style={styles.progressBar}>
                        <View style={[styles.progressFill,{ width: `${(currentStep / totalSteps) * 100}%` }]} />
                    </View>
                </LinearGradient>

                <KeyboardAvoidingView
                    style={styles.keyboardAvoidingView}
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
                >
                    <ScrollView
                        ref={scrollViewRef}
                        style={styles.wizardBody}
                        contentContainerStyle={styles.wizardBodyContent}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        {renderStepContent()}
                    </ScrollView>
                </KeyboardAvoidingView>

                {!keyboardVisible && (
                    <View style={styles.wizardFooter}>
                        <TouchableOpacity
                            style={[styles.wizardButton,styles.secondaryWizardButton,currentStep === 1 && styles.disabledButton]}
                            onPress={prevStep}
                            disabled={currentStep === 1}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="chevron-back" size={16} color={currentStep === 1 ? "#9CA3AF" : "#4F46E5"} />
                            <Text
                                style={[
                                    styles.wizardButtonText,
                                    styles.secondaryWizardButtonText,
                                    currentStep === 1 && styles.disabledButtonText,
                                ]}
                            >
                                Previous
                            </Text>
                        </TouchableOpacity>

                        {currentStep < totalSteps ? (
                            <TouchableOpacity
                                style={[styles.wizardButton,styles.primaryWizardButton,!canProceed() && styles.disabledButton]}
                                onPress={nextStep}
                                disabled={!canProceed()}
                                activeOpacity={0.8}
                            >
                                <Text
                                    style={[
                                        styles.wizardButtonText,
                                        styles.primaryWizardButtonText,
                                        !canProceed() && styles.disabledButtonText,
                                    ]}
                                >
                                    Next
                                </Text>
                                <Ionicons name="chevron-forward" size={16} color={!canProceed() ? "#9CA3AF" : "#FFFFFF"} />
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity
                                style={[styles.wizardButton,styles.primaryWizardButton]}
                                onPress={handleComplete}
                                disabled={uploading}
                                activeOpacity={0.8}
                            >
                                {uploading ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <>
                                        <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                                        <Text style={[styles.wizardButtonText,styles.primaryWizardButtonText]}>Save</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                <PhotoPreviewModal
                    visible={photoPreview.visible}
                    imageUri={photoPreview.uri}
                    title={photoPreview.title}
                    onClose={hidePhotoPreview}
                />
            </SafeAreaView>
        </Modal>
    )
}

export default function ProgressComparisonScreen({ navigation }) {
    const { user } = useContext(AuthContext)
    const [comparisons,setComparisons] = useState([])
    const [loading,setLoading] = useState(true)
    const [refreshing,setRefreshing] = useState(false)
    const [measurements,setMeasurements] = useState([])
    const [wizardVisible,setWizardVisible] = useState(false)
    const [photoPreview,setPhotoPreview] = useState({ visible: false,uri: null,title: "" })
    const [filters,setFilters] = useState({
        pageNumber: 1,
        pageSize: 50,
        startDate: null,
        endDate: null,
        searchTerm: "",
    })

    const showPhotoPreview = (uri,title) => {
        setPhotoPreview({ visible: true,uri,title })
    }

    const hidePhotoPreview = () => {
        setPhotoPreview({ visible: false,uri: null,title: "" })
    }

    const safeNavigate = (screen,params = {}) => {
        try {
            if (navigation && typeof navigation.navigate === "function") {
                navigation.navigate(screen,params)
            } else {
                console.error("Navigation not available")
                Alert.alert("Error","Navigation is not available")
            }
        } catch (error) {
            console.error("Navigation error:",error)
        }
    }

    const safeGoBack = () => {
        try {
            if (navigation && typeof navigation.goBack === "function") {
                navigation.goBack()
            } else if (navigation && typeof navigation.navigate === "function") {
                navigation.navigate("Home")
            } else {
                console.error("Navigation not available")
            }
        } catch (error) {
            console.error("Navigation error:",error)
        }
    }

    const fetchComparisons = async (showLoading = true,appliedFilters = filters) => {
        try {
            if (showLoading) setLoading(true)
            if (!user) {
                console.warn("No user")
                return
            }

            const queryParams = {
                pageNumber: appliedFilters.pageNumber,
                pageSize: appliedFilters.pageSize,
                searchTerm: appliedFilters.searchTerm || undefined,
                startDate: appliedFilters.startDate ? appliedFilters.startDate.toISOString() : undefined,
                endDate: appliedFilters.endDate ? appliedFilters.endDate.toISOString() : undefined,
            }

            const response = await apiProgressComparisonService.getComparisonsByUser(user.userId,queryParams)
            if (response?.statusCode === 200 && response?.data) {
                setComparisons(response.data.comparisons || [])
            }
        } catch (error) {
            console.error("Fetch comparisons error:",error.message)
            Alert.alert("Error","Failed to load progress comparisons.")
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }

    const fetchMeasurements = async () => {
        try {
            const response = await bodyMeasurementService.getMyMeasurements()
            if (response?.statusCode === 200 && response?.data) {
                setMeasurements(response.data.records || [])
            }
        } catch (error) {
            console.error("Fetch measurements error:",error.message)
            Alert.alert("Error","Failed to load body measurements.")
        }
    }

    useEffect(() => {
        if (user) {
            fetchComparisons()
            fetchMeasurements()
        }
    },[user])

    useFocusEffect(
        useCallback(() => {
            fetchComparisons()
        },[]),
    )

    const onRefresh = () => {
        setRefreshing(true)
        fetchComparisons(false)
    }

    const renderComparisonItem = ({ item }) => {
        const comparisonDate = item.comparisonDate
            ? new Date(item.comparisonDate).toLocaleDateString("en-US",{
                month: "short",
                day: "2-digit",
                year: "numeric",
            })
            : "N/A"

        const beforePhoto = item.progressPhotos?.[0]?.beforePhotoUrl
        const afterPhoto = item.progressPhotos?.[0]?.afterPhotoUrl

        return (
            <TouchableOpacity
                style={styles.comparisonCard}
                onPress={() => safeNavigate("ProgressComparisonDetail",{ comparison: item })}
                activeOpacity={0.7}
            >
                <LinearGradient colors={["#FFFFFF","#F8FAFC"]} style={styles.comparisonCardGradient}>
                    <View style={styles.comparisonHeader}>
                        <View style={styles.comparisonDateContainer}>
                            <Ionicons name="calendar" size={14} color="#6B7280" />
                            <Text style={styles.comparisonDate}>{comparisonDate}</Text>
                        </View>
                        <View style={styles.comparisonActions}>
                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={(e) => {
                                    e.stopPropagation()
                                    Alert.alert("Edit Comparison","Edit functionality will be available soon.")
                                }}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="pencil" size={14} color="#4F46E5" />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={(e) => {
                                    e.stopPropagation()
                                    Alert.alert("Delete Comparison","Are you sure you want to delete this comparison?",[
                                        { text: "Cancel",style: "cancel" },
                                        {
                                            text: "Delete",
                                            style: "destructive",
                                            onPress: async () => {
                                                try {
                                                    await apiProgressComparisonService.deleteComparison(item.comparisonId)
                                                    fetchComparisons()
                                                    Alert.alert("Success","Comparison deleted successfully.")
                                                } catch (error) {
                                                    Alert.alert("Error","Failed to delete comparison.")
                                                }
                                            },
                                        },
                                    ])
                                }}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="trash-outline" size={14} color="#EF4444" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <Text style={styles.comparisonDescription} numberOfLines={2}>
                        {item.description || "No description provided"}
                    </Text>

                    <View style={styles.comparisonStats}>
                        {item.weightChange !== null && (
                            <View style={styles.statItem}>
                                <Ionicons name="fitness" size={14} color="#4F46E5" />
                                <Text style={[styles.statText,item.weightChange >= 0 ? styles.positiveChange : styles.negativeChange]}>
                                    {item.weightChange > 0 ? "+" : ""}
                                    {item.weightChange} kg
                                </Text>
                            </View>
                        )}
                        {item.bodyFatChange !== null && (
                            <View style={styles.statItem}>
                                <Ionicons name="analytics" size={14} color="#4F46E5" />
                                <Text
                                    style={[styles.statText,item.bodyFatChange >= 0 ? styles.positiveChange : styles.negativeChange]}
                                >
                                    {item.bodyFatChange > 0 ? "+" : ""}
                                    {item.bodyFatChange}%
                                </Text>
                            </View>
                        )}
                    </View>

                    {(beforePhoto || afterPhoto) && (
                        <View style={styles.photoPreviewContainer}>
                            <View style={styles.photoComparisonContainer}>
                                <View style={styles.photoComparisonItem}>
                                    <Text style={styles.photoComparisonLabel}>Before</Text>
                                    {beforePhoto ? (
                                        <TouchableOpacity
                                            onPress={(e) => {
                                                e.stopPropagation()
                                                showPhotoPreview(beforePhoto,"Before Photo")
                                            }}
                                            activeOpacity={0.8}
                                        >
                                            <Image source={{ uri: beforePhoto }} style={styles.photoThumbnail} />
                                        </TouchableOpacity>
                                    ) : (
                                        <View style={styles.photoThumbnailPlaceholder}>
                                            <Ionicons name="image-outline" size={20} color="#9CA3AF" />
                                        </View>
                                    )}
                                </View>
                                <View style={styles.photoComparisonDivider}>
                                    <Ionicons name="arrow-forward" size={16} color="#6B7280" />
                                </View>
                                <View style={styles.photoComparisonItem}>
                                    <Text style={styles.photoComparisonLabel}>After</Text>
                                    {afterPhoto ? (
                                        <TouchableOpacity
                                            onPress={(e) => {
                                                e.stopPropagation()
                                                showPhotoPreview(afterPhoto,"After Photo")
                                            }}
                                            activeOpacity={0.8}
                                        >
                                            <Image source={{ uri: afterPhoto }} style={styles.photoThumbnail} />
                                        </TouchableOpacity>
                                    ) : (
                                        <View style={styles.photoThumbnailPlaceholder}>
                                            <Ionicons name="image-outline" size={20} color="#9CA3AF" />
                                        </View>
                                    )}
                                </View>
                            </View>
                        </View>
                    )}
                </LinearGradient>
            </TouchableOpacity>
        )
    }

    if (loading && !refreshing) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <DynamicStatusBar backgroundColor={theme.primaryColor} />
                <View style={styles.loadingContent}>
                    <ActivityIndicator size="large" color="#4F46E5" />
                    <Text style={styles.loadingText}>Loading your progress...</Text>
                </View>
            </SafeAreaView>
        )
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <DynamicStatusBar backgroundColor={theme.primaryColor} />
            <LinearGradient colors={["#4F46E5","#6366F1","#818CF8"]} style={styles.header}>
                <View style={styles.headerContent}>
                    <TouchableOpacity onPress={safeGoBack} style={styles.backButton} activeOpacity={0.7}>
                        <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                    <View style={styles.headerTitleContainer}>
                        <Text style={styles.headerTitle}>Progress Comparisons</Text>
                        <Text style={styles.headerSubtitle}>Track your fitness journey</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.addButton}
                        onPress={() => {
                            if (measurements.length === 0) {
                                Alert.alert(
                                    "No Measurements Found",
                                    "You need at least one body measurement to create a comparison. Please add a measurement first.",
                                    [
                                        { text: "OK",style: "default" },
                                        { text: "Add Measurement",onPress: () => safeNavigate("BodyMeasurements") },
                                    ],
                                )
                                return
                            }
                            setWizardVisible(true)
                        }}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="add" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            <ScrollView
                style={styles.container}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#4F46E5"]} tintColor="#4F46E5" />
                }
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.comparisonsSection}>
                    {comparisons.length > 0 ? (
                        <>
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>Your Progress</Text>
                                <Text style={styles.sectionSubtitle}>
                                    {comparisons.length} comparison{comparisons.length !== 1 ? "s" : ""}
                                </Text>
                            </View>
                            <FlatList
                                data={comparisons}
                                renderItem={renderComparisonItem}
                                keyExtractor={(item) => item.comparisonId.toString()}
                                scrollEnabled={false}
                                showsVerticalScrollIndicator={false}
                            />
                        </>
                    ) : (
                        <View style={styles.emptyState}>
                            <LinearGradient colors={["#F0F9FF","#E0F2FE"]} style={styles.emptyStateGradient}>
                                <Ionicons name="trending-up-outline" size={64} color="#0EA5E9" />
                                <Text style={styles.emptyTitle}>Start Your Progress Journey</Text>
                                <Text style={styles.emptyText}>
                                    Create your first progress comparison to track your fitness transformation over time.
                                </Text>
                                <TouchableOpacity
                                    style={styles.emptyStateButton}
                                    onPress={() => {
                                        if (measurements.length === 0) {
                                            Alert.alert(
                                                "No Measurements Found",
                                                "You need at least one body measurement to create a comparison. Please add a measurement first.",
                                                [
                                                    { text: "OK",style: "default" },
                                                    { text: "Add Measurement",onPress: () => safeNavigate("BodyMeasurement") },
                                                ],
                                            )
                                            return
                                        }
                                        setWizardVisible(true)
                                    }}
                                    activeOpacity={0.8}
                                >
                                    <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
                                    <Text style={styles.emptyStateButtonText}>Create First Comparison</Text>
                                </TouchableOpacity>
                            </LinearGradient>
                        </View>
                    )}
                </View>
            </ScrollView>

            <StepWizard
                visible={wizardVisible}
                onClose={() => setWizardVisible(false)}
                onComplete={() => fetchComparisons()}
                measurements={measurements}
                user={user}
            />

            <PhotoPreviewModal
                visible={photoPreview.visible}
                imageUri={photoPreview.uri}
                title={photoPreview.title}
                onClose={hidePhotoPreview}
            />

            <FloatingMenuButton
                initialPosition={{ x: width - 70,y: height - 180 }}
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
        backgroundColor: "#4F46E5",
    },
    container: {
        flex: 1,
        backgroundColor: "#F9FAFB",
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: "#F9FAFB",
    },
    loadingContent: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: "#4F46E5",
        fontWeight: "500",
        fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
    },
    header: {
        paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
        paddingBottom: 20,
    },
    headerContent: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingTop: 16,
    },
    backButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        justifyContent: "center",
        alignItems: "center",
    },
    headerTitleContainer: {
        flex: 1,
        alignItems: "center",
        marginHorizontal: 16,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#FFFFFF",
        textAlign: "center",
        fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
    },
    headerSubtitle: {
        fontSize: 13,
        color: "rgba(255, 255, 255, 0.8)",
        marginTop: 2,
        textAlign: "center",
        fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
    },
    addButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        justifyContent: "center",
        alignItems: "center",
    },
    comparisonsSection: {
        padding: 20,
    },
    sectionHeader: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 24,
        fontWeight: "700",
        color: "#1F2937",
        marginBottom: 4,
        fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
    },
    sectionSubtitle: {
        fontSize: 16,
        color: "#6B7280",
        fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
    },
    comparisonCard: {
        marginBottom: 16,
        borderRadius: 16,
        overflow: "hidden",
        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOffset: { width: 0,height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 12,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    comparisonCardGradient: {
        padding: 20,
    },
    comparisonHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    comparisonDateContainer: {
        flexDirection: "row",
        alignItems: "center",
    },
    comparisonDate: {
        fontSize: 14,
        fontWeight: "600",
        color: "#1F2937",
        marginLeft: 6,
        fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
    },
    comparisonActions: {
        flexDirection: "row",
        alignItems: "center",
    },
    actionButton: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: "#F3F4F6",
        justifyContent: "center",
        alignItems: "center",
        marginLeft: 8,
    },
    comparisonDescription: {
        fontSize: 14,
        color: "#6B7280",
        lineHeight: 20,
        marginBottom: 16,
        fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
    },
    comparisonStats: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 16,
    },
    statItem: {
        flexDirection: "row",
        alignItems: "center",
        marginRight: 20,
    },
    statText: {
        fontSize: 13,
        fontWeight: "600",
        marginLeft: 6,
        fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
    },
    positiveChange: {
        color: "#10B981",
    },
    negativeChange: {
        color: "#EF4444",
    },
    photoPreviewContainer: {
        marginTop: 8,
    },
    photoComparisonContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    photoComparisonItem: {
        flex: 1,
        alignItems: "center",
    },
    photoComparisonLabel: {
        fontSize: 12,
        fontWeight: "600",
        color: "#6B7280",
        marginBottom: 8,
        fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
    },
    photoThumbnail: {
        width: 80,
        height: 80,
        borderRadius: 12,
    },
    photoThumbnailPlaceholder: {
        width: 80,
        height: 80,
        borderRadius: 12,
        backgroundColor: "#F3F4F6",
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderStyle: "dashed",
    },
    photoComparisonDivider: {
        paddingHorizontal: 16,
    },
    emptyState: {
        alignItems: "center",
        marginTop: 40,
    },
    emptyStateGradient: {
        alignItems: "center",
        padding: 40,
        borderRadius: 20,
        width: "100%",
    },
    emptyTitle: {
        fontSize: 24,
        fontWeight: "700",
        color: "#1F2937",
        marginTop: 20,
        marginBottom: 12,
        textAlign: "center",
        fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
    },
    emptyText: {
        fontSize: 16,
        color: "#6B7280",
        textAlign: "center",
        lineHeight: 24,
        marginBottom: 32,
        fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
    },
    emptyStateButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#4F46E5",
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 10,
    },
    emptyStateButtonText: {
        color: "#FFFFFF",
        fontSize: 14,
        fontWeight: "600",
        marginLeft: 8,
        fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
    },
    // Photo Preview Modal Styles
    photoPreviewModalContainer: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.9)",
        justifyContent: "center",
        alignItems: "center",
    },
    photoPreviewBackdrop: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    photoPreviewContent: {
        width: width * 0.9,
        height: height * 0.8,
        backgroundColor: "#000000",
        borderRadius: 16,
        overflow: "hidden",
    },
    photoPreviewHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 16,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
    },
    photoPreviewTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#FFFFFF",
        fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
    },
    photoPreviewCloseButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        justifyContent: "center",
        alignItems: "center",
    },
    photoPreviewImage: {
        flex: 1,
        width: "100%",
    },
    photoPreviewPlaceholder: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    photoPreviewPlaceholderText: {
        fontSize: 16,
        color: "#9CA3AF",
        marginTop: 8,
        fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
    },
    // Wizard Styles
    wizardContainer: {
        flex: 1,
        backgroundColor: "#F9FAFB",
    },
    wizardHeader: {
        paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
        paddingBottom: 0,
    },
    wizardHeaderContent: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 16,
    },
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        justifyContent: "center",
        alignItems: "center",
    },
    wizardTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#FFFFFF",
        flex: 1,
        textAlign: "center",
        fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
    },
    wizardStepIndicator: {
        fontSize: 13,
        color: "rgba(255, 255, 255, 0.8)",
        fontWeight: "500",
        width: 60,
        textAlign: "right",
        fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
    },
    progressBar: {
        height: 4,
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        marginHorizontal: 20,
    },
    progressFill: {
        height: "100%",
        backgroundColor: "#FFFFFF",
        borderRadius: 2,
    },
    keyboardAvoidingView: {
        flex: 1,
    },
    wizardBody: {
        flex: 1,
        backgroundColor: "#F9FAFB",
    },
    wizardBodyContent: {
        flexGrow: 1,
        paddingBottom: 20,
    },
    stepContent: {
        flex: 1,
        padding: 20,
        minHeight: height * 0.6,
    },
    stepHeader: {
        alignItems: "center",
        marginBottom: 32,
    },
    stepIconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: "#4F46E5",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 16,
        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOffset: { width: 0,height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
            },
            android: {
                elevation: 3,
            },
        }),
    },
    stepTitle: {
        fontSize: 22,
        fontWeight: "700",
        color: "#1F2937",
        marginTop: 16,
        marginBottom: 8,
        textAlign: "center",
        fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
    },
    stepDescription: {
        fontSize: 15,
        color: "#6B7280",
        textAlign: "center",
        lineHeight: 22,
        fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
    },
    measurementList: {
        flex: 1,
        maxHeight: height * 0.5,
    },
    measurementCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 2,
        borderColor: "transparent",
        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOffset: { width: 0,height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    selectedMeasurement: {
        borderColor: "#4F46E5",
        backgroundColor: "#F0F9FF",
    },
    measurementCardContent: {
        flexDirection: "row",
        alignItems: "center",
    },
    measurementIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#F0F9FF",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    measurementInfo: {
        flex: 1,
    },
    measurementDate: {
        fontSize: 15,
        fontWeight: "600",
        color: "#1F2937",
        marginBottom: 4,
        fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
    },
    measurementDetails: {
        flexDirection: "row",
        alignItems: "center",
    },
    measurementDetailItem: {
        flexDirection: "row",
        alignItems: "center",
        marginRight: 16,
    },
    measurementWeight: {
        fontSize: 13,
        color: "#6B7280",
        marginLeft: 4,
        fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
    },
    measurementBodyFat: {
        fontSize: 13,
        color: "#6B7280",
        marginLeft: 4,
        fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
    },
    selectedIndicator: {
        marginLeft: 12,
    },
    changePreview: {
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        padding: 16,
        marginTop: 20,
        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOffset: { width: 0,height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    changePreviewHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
    },
    changeTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1F2937",
        marginLeft: 8,
        fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
    },
    changeStats: {
        flexDirection: "row",
        alignItems: "center",
    },
    changeStatItem: {
        flexDirection: "row",
        alignItems: "center",
        marginRight: 20,
    },
    changeText: {
        fontSize: 14,
        fontWeight: "600",
        marginLeft: 6,
        fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
    },
    inputContainer: {
        flex: 1,
    },
    inputGroup: {
        marginBottom: 20,
    },
    inputLabelContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 8,
    },
    inputLabel: {
        fontSize: 15,
        fontWeight: "600",
        color: "#1F2937",
        marginLeft: 8,
        fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
    },
    textArea: {
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        padding: 16,
        fontSize: 15,
        color: "#1F2937",
        borderWidth: 1,
        borderColor: "#E5E7EB",
        minHeight: 120,
        fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOffset: { width: 0,height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 2,
            },
            android: {
                elevation: 1,
            },
        }),
    },
    photoSection: {
        flex: 1,
        alignItems: "center",
    },
    photoPreview: {
        position: "relative",
        marginBottom: 24,
    },
    previewImage: {
        width: width - 80,
        height: (width - 80) * 0.75,
        borderRadius: 16,
    },
    removePhotoButton: {
        position: "absolute",
        top: -8,
        right: -8,
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOffset: { width: 0,height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    photoPlaceholder: {
        width: width - 80,
        height: (width - 80) * 0.75,
        backgroundColor: "#F3F4F6",
        borderRadius: 16,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 24,
        borderWidth: 2,
        borderColor: "#E5E7EB",
        borderStyle: "dashed",
    },
    photoPlaceholderText: {
        fontSize: 15,
        color: "#9CA3AF",
        marginTop: 8,
        fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
    },
    photoButtons: {
        width: "100%",
        flexDirection: "row",
        justifyContent: "space-between",
    },
    photoButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#4F46E5",
        borderRadius: 10,
        paddingVertical: 12,
        paddingHorizontal: 16,
        flex: 0.48,
        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOffset: { width: 0,height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    secondaryButton: {
        backgroundColor: "#FFFFFF",
        borderWidth: 2,
        borderColor: "#4F46E5",
    },
    photoButtonText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#FFFFFF",
        marginLeft: 6,
        fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
    },
    secondaryButtonText: {
        color: "#4F46E5",
    },
    reviewContent: {
        flex: 1,
        maxHeight: height * 0.5,
    },
    reviewSection: {
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        padding: 20,
        marginBottom: 16,
        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOffset: { width: 0,height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    reviewSectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 16,
    },
    reviewSectionTitle: {
        fontSize: 17,
        fontWeight: "700",
        color: "#1F2937",
        marginLeft: 8,
        fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
    },
    reviewItem: {
        marginBottom: 12,
    },
    reviewLabel: {
        fontSize: 13,
        fontWeight: "600",
        color: "#6B7280",
        marginBottom: 4,
        fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
    },
    reviewValue: {
        fontSize: 15,
        color: "#1F2937",
        lineHeight: 22,
        fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
    },
    reviewValueBold: {
        fontWeight: "600",
    },
    reviewPhotos: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 16,
    },
    reviewPhotoContainer: {
        flex: 1,
        alignItems: "center",
        marginHorizontal: 8,
    },
    reviewPhotoLabel: {
        fontSize: 13,
        fontWeight: "600",
        color: "#6B7280",
        marginBottom: 8,
        fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
    },
    reviewPhoto: {
        width: (width - 120) / 2,
        height: ((width - 120) / 2) * 0.75,
        borderRadius: 8,
    },
    reviewPhotoPlaceholder: {
        width: (width - 120) / 2,
        height: ((width - 120) / 2) * 0.75,
        backgroundColor: "#F3F4F6",
        borderRadius: 8,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderStyle: "dashed",
    },
    reviewPhotoPlaceholderText: {
        fontSize: 11,
        color: "#9CA3AF",
        marginTop: 4,
        fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
    },
    wizardFooter: {
        flexDirection: "row",
        justifyContent: "space-between",
        padding: 16,
        backgroundColor: "#FFFFFF",
        borderTopWidth: 1,
        borderTopColor: "#E5E7EB",
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
    wizardButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 10,
        flex: 1,
        marginHorizontal: 6,
        minHeight: 40,
    },
    primaryWizardButton: {
        backgroundColor: "#4F46E5",
    },
    secondaryWizardButton: {
        backgroundColor: "#FFFFFF",
        borderWidth: 2,
        borderColor: "#4F46E5",
    },
    disabledButton: {
        backgroundColor: "#F3F4F6",
        borderColor: "#E5E7EB",
    },
    wizardButtonText: {
        fontSize: 14,
        fontWeight: "600",
        marginHorizontal: 6,
        fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
    },
    primaryWizardButtonText: {
        color: "#FFFFFF",
    },
    secondaryWizardButtonText: {
        color: "#4F46E5",
    },
    disabledButtonText: {
        color: "#9CA3AF",
    },
})
