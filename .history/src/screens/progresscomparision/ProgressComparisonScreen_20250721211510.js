"use client"
import { useState, useEffect, useCallback, useContext, useRef } from "react"
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
import { showErrorFetchAPI, showErrorMessage, showSuccessMessage } from "utils/toastUtil"
import { apiProgressComparisonService } from "services/apiProgressComparisonService"
import { apiProgressPhotoService } from "services/apiProgressPhotoService"
import { bodyMeasurementService } from "services/apiBodyMeasurementService"
import { apiUploadImageCloudService } from "services/apiUploadImageCloudService"
import { AuthContext } from "context/AuthContext"
import { useFocusEffect } from "@react-navigation/native"
import DynamicStatusBar from "screens/statusBar/DynamicStatusBar"
import Loading from "components/Loading"
import Header from "components/Header"
import { SafeAreaView } from "react-native-safe-area-context"
import * as ImagePicker from "expo-image-picker"

const { width, height } = Dimensions.get("window")

const PhotoPreviewModal = ({ visible, imageUri, onClose, title = "Photo Preview" }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current
  const scaleAnim = useRef(new Animated.Value(0.9)).current

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 120,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start()
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start()
    }
  }, [visible])

  return (
    <Modal visible={visible} transparent={true} animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.photoPreviewModalContainer, { opacity: fadeAnim }]}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.photoPreviewBackdrop} />
        </TouchableWithoutFeedback>
        <Animated.View style={[styles.photoPreviewContent, { transform: [{ scale: scaleAnim }] }]}>
          <View style={styles.photoPreviewHeader}>
            <Text style={styles.photoPreviewTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.photoPreviewCloseButton}>
              <Ionicons name="close" size={20} color="#666" />
            </TouchableOpacity>
          </View>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.photoPreviewImage} resizeMode="contain" />
          ) : (
            <View style={styles.photoPreviewPlaceholder}>
              <Ionicons name="image-outline" size={48} color="#ccc" />
              <Text style={styles.photoPreviewPlaceholderText}>No image available</Text>
            </View>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  )
}

const StepWizard = ({ visible, onClose, onComplete, measurements, user }) => {
  const [currentStep, setCurrentStep] = useState(1)
  const [wizardData, setWizardData] = useState({
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
  const [previewImages, setPreviewImages] = useState({ before: null, after: null })
  const [uploading, setUploading] = useState(false)
  const [keyboardVisible, setKeyboardVisible] = useState(false)
  const [photoPreview, setPhotoPreview] = useState({ visible: false, uri: null, title: "" })

  const slideAnim = useRef(new Animated.Value(0)).current
  const progressAnim = useRef(new Animated.Value(0)).current
  const scrollViewRef = useRef(null)

  const totalSteps = 5

  useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start()
    }
  }, [visible])

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: currentStep / totalSteps,
      duration: 300,
      useNativeDriver: false,
    }).start()
  }, [currentStep])

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener("keyboardDidShow", () => {
      setKeyboardVisible(true)
    })
    const keyboardDidHideListener = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardVisible(false)
    })

    return () => {
      keyboardDidShowListener?.remove()
      keyboardDidHideListener?.remove()
    }
  }, [])

  const dismissKeyboard = () => {
    Keyboard.dismiss()
  }

  const showPhotoPreview = (uri, title) => {
    setPhotoPreview({ visible: true, uri, title })
  }

  const hidePhotoPreview = () => {
    setPhotoPreview({ visible: false, uri: null, title: "" })
  }

  const calculateChanges = (beforeId, afterId) => {
    if (!beforeId || !afterId) return { weightChange: null, bodyFatChange: null }

    const before = measurements.find((m) => m.measurementId === beforeId)
    const after = measurements.find((m) => m.measurementId === afterId)

    if (!before || !after) return { weightChange: null, bodyFatChange: null }

    const weightChange = Number.parseFloat((after.weight - before.weight).toFixed(2))
    const bodyFatChange =
      after.bodyFatPercentage && before.bodyFatPercentage
        ? Number.parseFloat((after.bodyFatPercentage - before.bodyFatPercentage).toFixed(2))
        : null

    return { weightChange, bodyFatChange }
  }

  const handleMeasurementChange = (type, value) => {
    const updatedData = { ...wizardData, [type]: value }
    const { weightChange, bodyFatChange } = calculateChanges(
      updatedData.beforeMeasurementId,
      updatedData.afterMeasurementId,
    )
    setWizardData({ ...updatedData, weightChange, bodyFatChange })
  }

  const handleImagePick = async (type) => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (!permissionResult.granted) {
        Alert.alert("Permission Required", "Please allow access to your photo library to continue.")
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      })

      if (!result.canceled) {
        setPreviewImages((prev) => ({ ...prev, [type]: result.assets[0].uri }))
        setWizardData((prev) => ({ ...prev, [`${type}PhotoUrl`]: result.assets[0].uri }))
      }
    } catch (error) {
      Alert.alert("Error", "Failed to select image. Please try again.")
    }
  }

  const handleCameraCapture = async (type) => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync()
      if (!permissionResult.granted) {
        Alert.alert("Permission Required", "Please allow camera access to take photos.")
        return
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      })

      if (!result.canceled) {
        setPreviewImages((prev) => ({ ...prev, [type]: result.assets[0].uri }))
        setWizardData((prev) => ({ ...prev, [`${type}PhotoUrl`]: result.assets[0].uri }))
      }
    } catch (error) {
      Alert.alert("Error", "Failed to capture image. Please try again.")
    }
  }

  const nextStep = () => {
    dismissKeyboard()
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: true })
      }, 100)
    }
  }

  const prevStep = () => {
    dismissKeyboard()
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: true })
      }, 100)
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
        beforeFormData.append("file", {
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
        afterFormData.append("file", {
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

      showSuccessMessage("Progress comparison created successfully!")
      if (onComplete) onComplete()
      if (onClose) onClose()

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
      setPreviewImages({ before: null, after: null })
    } catch (error) {
      if (error?.message) {
        showErrorMessage(error.message)
      } else {
        showErrorFetchAPI(error)
      }
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
                  <Ionicons name="calendar-outline" size={24} color="#333" />
                </View>
                <Text style={styles.stepTitle}>Select Measurements</Text>
                <Text style={styles.stepDescription}>Choose your starting and ending measurements</Text>
              </View>

              <View style={styles.measurementSection}>
                <Text style={styles.sectionLabel}>Starting Point</Text>
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
                      onPress={() => handleMeasurementChange("beforeMeasurementId", measurement.measurementId)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.measurementCardContent}>
                        <View style={styles.measurementInfo}>
                          <Text style={styles.measurementDate}>
                            {new Date(measurement.measurementDate).toLocaleDateString("en-US", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </Text>
                          <View style={styles.measurementDetails}>
                            <Text style={styles.measurementWeight}>{measurement.weight} kg</Text>
                            {measurement.bodyFatPercentage && (
                              <Text style={styles.measurementBodyFat}>• {measurement.bodyFatPercentage}%</Text>
                            )}
                          </View>
                        </View>
                        {wizardData.beforeMeasurementId === measurement.measurementId && (
                          <View style={styles.selectedIndicator}>
                            <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Ending Point</Text>
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
                      onPress={() => handleMeasurementChange("afterMeasurementId", measurement.measurementId)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.measurementCardContent}>
                        <View style={styles.measurementInfo}>
                          <Text style={styles.measurementDate}>
                            {new Date(measurement.measurementDate).toLocaleDateString("en-US", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </Text>
                          <View style={styles.measurementDetails}>
                            <Text style={styles.measurementWeight}>{measurement.weight} kg</Text>
                            {measurement.bodyFatPercentage && (
                              <Text style={styles.measurementBodyFat}>• {measurement.bodyFatPercentage}%</Text>
                            )}
                          </View>
                        </View>
                        {wizardData.afterMeasurementId === measurement.measurementId && (
                          <View style={styles.selectedIndicator}>
                            <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {wizardData.weightChange !== null && (
                  <View style={styles.changePreview}>
                    <View style={styles.changePreviewHeader}>
                      <Ionicons name="calculator-outline" size={18} color="#333" />
                      <Text style={styles.changeTitle}>Calculated Changes</Text>
                    </View>
                    <View style={styles.changeStats}>
                      <View style={styles.changeStatItem}>
                        <Text style={styles.changeText}>
                          Weight: {wizardData.weightChange > 0 ? "+" : ""}
                          {wizardData.weightChange} kg
                        </Text>
                      </View>
                      {wizardData.bodyFatChange !== null && (
                        <View style={styles.changeStatItem}>
                          <Text style={styles.changeText}>
                            Body Fat: {wizardData.bodyFatChange > 0 ? "+" : ""}
                            {wizardData.bodyFatChange}%
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}
              </View>
            </View>
          </TouchableWithoutFeedback>
        )

      case 2:
        return (
          <TouchableWithoutFeedback onPress={dismissKeyboard}>
            <View style={styles.stepContent}>
              <View style={styles.stepHeader}>
                <View style={styles.stepIconContainer}>
                  <Ionicons name="create-outline" size={24} color="#333" />
                </View>
                <Text style={styles.stepTitle}>Add Description</Text>
                <Text style={styles.stepDescription}>Describe your progress and journey</Text>
              </View>

              <View style={styles.inputContainer}>
                <View style={styles.textAreaContainer}>
                  <TextInput
                    style={styles.textArea}
                    value={wizardData.description}
                    onChangeText={(text) => setWizardData({ ...wizardData, description: text })}
                    placeholder="Describe your progress, workout routine, diet changes, or any other relevant information..."
                    placeholderTextColor="#999"
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

      case 3:
        return (
          <TouchableWithoutFeedback onPress={dismissKeyboard}>
            <View style={styles.stepContent}>
              <View style={styles.stepHeader}>
                <View style={styles.stepIconContainer}>
                  <Ionicons name="camera-outline" size={24} color="#333" />
                </View>
                <Text style={styles.stepTitle}>Progress Photos</Text>
                <Text style={styles.stepDescription}>Add your before and after photos</Text>
              </View>

              <View style={styles.photoSection}>
                <Text style={styles.sectionLabel}>Before Photo</Text>
                {previewImages.before ? (
                  <View style={styles.photoPreview}>
                    <TouchableOpacity
                      onPress={() => showPhotoPreview(previewImages.before, "Before Photo")}
                      activeOpacity={0.8}
                    >
                      <View style={styles.imageContainer}>
                        <Image source={{ uri: previewImages.before }} style={styles.previewImage} />
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.removePhotoButton}
                      onPress={() => {
                        setPreviewImages((prev) => ({ ...prev, before: null }))
                        setWizardData((prev) => ({ ...prev, beforePhotoUrl: "" }))
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="close" size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <Ionicons name="image-outline" size={40} color="#ccc" />
                    <Text style={styles.photoPlaceholderText}>No photo selected</Text>
                  </View>
                )}

                <View style={styles.photoButtons}>
                  <TouchableOpacity
                    style={styles.photoButton}
                    onPress={() => handleCameraCapture("before")}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="camera-outline" size={16} color="#333" />
                    <Text style={styles.photoButtonText}>Take Photo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.photoButton, styles.secondaryButton]}
                    onPress={() => handleImagePick("before")}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="images-outline" size={16} color="#666" />
                    <Text style={[styles.photoButtonText, styles.secondaryButtonText]}>Gallery</Text>
                  </TouchableOpacity>
                </View>

                <Text style={[styles.sectionLabel, { marginTop: 32 }]}>After Photo</Text>
                {previewImages.after ? (
                  <View style={styles.photoPreview}>
                    <TouchableOpacity
                      onPress={() => showPhotoPreview(previewImages.after, "After Photo")}
                      activeOpacity={0.8}
                    >
                      <View style={styles.imageContainer}>
                        <Image source={{ uri: previewImages.after }} style={styles.previewImage} />
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.removePhotoButton}
                      onPress={() => {
                        setPreviewImages((prev) => ({ ...prev, after: null }))
                        setWizardData((prev) => ({ ...prev, afterPhotoUrl: "" }))
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="close" size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <Ionicons name="image-outline" size={40} color="#ccc" />
                    <Text style={styles.photoPlaceholderText}>No photo selected</Text>
                  </View>
                )}

                <View style={styles.photoButtons}>
                  <TouchableOpacity
                    style={styles.photoButton}
                    onPress={() => handleCameraCapture("after")}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="camera-outline" size={16} color="#333" />
                    <Text style={styles.photoButtonText}>Take Photo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.photoButton, styles.secondaryButton]}
                    onPress={() => handleImagePick("after")}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="images-outline" size={16} color="#666" />
                    <Text style={[styles.photoButtonText, styles.secondaryButtonText]}>Gallery</Text>
                  </TouchableOpacity>
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
                  <Ionicons name="create-outline" size={24} color="#333" />
                </View>
                <Text style={styles.stepTitle}>Photo Notes</Text>
                <Text style={styles.stepDescription}>Add any additional notes about your photos</Text>
              </View>

              <View style={styles.inputContainer}>
                <View style={styles.textAreaContainer}>
                  <TextInput
                    style={styles.textArea}
                    value={wizardData.photoNotes}
                    onChangeText={(text) => setWizardData({ ...wizardData, photoNotes: text })}
                    placeholder="Add notes about lighting, pose, time of day, or any other relevant details about your photos..."
                    placeholderTextColor="#999"
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

      case 5:
        return (
          <TouchableWithoutFeedback onPress={dismissKeyboard}>
            <View style={styles.stepContent}>
              <View style={styles.stepHeader}>
                <View style={styles.stepIconContainer}>
                  <Ionicons name="checkmark-circle-outline" size={24} color="#333" />
                </View>
                <Text style={styles.stepTitle}>Review & Confirm</Text>
                <Text style={styles.stepDescription}>Review all information before saving</Text>
              </View>

              <ScrollView style={styles.reviewContent} showsVerticalScrollIndicator={false} nestedScrollEnabled={true}>
                <View style={styles.reviewSection}>
                  <View style={styles.reviewSectionHeader}>
                    <Ionicons name="analytics-outline" size={18} color="#333" />
                    <Text style={styles.reviewSectionTitle}>Comparison Details</Text>
                  </View>
                  {wizardData.weightChange !== null && (
                    <View style={styles.reviewItem}>
                      <Text style={styles.reviewLabel}>Weight Change:</Text>
                      <Text style={styles.reviewValue}>
                        {wizardData.weightChange > 0 ? "+" : ""}
                        {wizardData.weightChange} kg
                      </Text>
                    </View>
                  )}
                  {wizardData.bodyFatChange !== null && (
                    <View style={styles.reviewItem}>
                      <Text style={styles.reviewLabel}>Body Fat Change:</Text>
                      <Text style={styles.reviewValue}>
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
                    <Ionicons name="images-outline" size={18} color="#333" />
                    <Text style={styles.reviewSectionTitle}>Progress Photos</Text>
                  </View>
                  <View style={styles.reviewPhotos}>
                    <View style={styles.reviewPhotoContainer}>
                      <Text style={styles.reviewPhotoLabel}>Before</Text>
                      {previewImages.before ? (
                        <TouchableOpacity
                          onPress={() => showPhotoPreview(previewImages.before, "Before Photo")}
                          activeOpacity={0.8}
                        >
                          <Image source={{ uri: previewImages.before }} style={styles.reviewPhoto} />
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.reviewPhotoPlaceholder}>
                          <Ionicons name="image-outline" size={24} color="#ccc" />
                          <Text style={styles.reviewPhotoPlaceholderText}>No photo</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.reviewPhotoContainer}>
                      <Text style={styles.reviewPhotoLabel}>After</Text>
                      {previewImages.after ? (
                        <TouchableOpacity
                          onPress={() => showPhotoPreview(previewImages.after, "After Photo")}
                          activeOpacity={0.8}
                        >
                          <Image source={{ uri: previewImages.after }} style={styles.reviewPhoto} />
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.reviewPhotoPlaceholder}>
                          <Ionicons name="image-outline" size={24} color="#ccc" />
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
        return wizardData.beforeMeasurementId !== null && wizardData.afterMeasurementId !== null
      case 2:
        return wizardData.description.trim().length > 0
      case 3:
      case 4:
      case 5:
        return true
      default:
        return false
    }
  }

  return (
    <Modal animationType="slide" transparent={false} visible={visible} onRequestClose={onClose}>
      <SafeAreaView style={styles.wizardContainer}>
        <View style={styles.wizardHeader}>
          <Header
            title="Create Comparison"
            subtitle={`Step ${currentStep} of ${totalSteps}`}
            onBack={onClose}
            rightComponent={
              <View style={styles.progressBarContainer}>
                <View style={styles.progressBar}>
                  <Animated.View
                    style={[
                      styles.progressFill,
                      {
                        width: progressAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ["0%", "100%"],
                        }),
                      },
                    ]}
                  />
                </View>
              </View>
            }
            style={{ backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f0f0f0" }}
          />
        </View>

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
            {currentStep === 1 ? (
              <TouchableOpacity
                style={[styles.wizardButton, styles.cancelButton]}
                onPress={onClose}
                activeOpacity={0.8}
              >
                <Text style={[styles.wizardButtonText, styles.cancelButtonText]}>Cancel</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.wizardButton, styles.secondaryWizardButton]}
                onPress={prevStep}
                activeOpacity={0.8}
              >
                <Text style={[styles.wizardButtonText, styles.secondaryButtonText]}>Previous</Text>
              </TouchableOpacity>
            )}

            {currentStep < totalSteps ? (
              <TouchableOpacity
                style={[styles.wizardButton, styles.primaryButton, !canProceed() && styles.disabledButton]}
                onPress={nextStep}
                disabled={!canProceed()}
                activeOpacity={0.8}
              >
                <Text style={[styles.wizardButtonText, styles.primaryButtonText]}>Next</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.wizardButton, styles.primaryButton]}
                onPress={handleComplete}
                disabled={uploading}
                activeOpacity={0.8}
              >
                {uploading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={16} color="#fff" />
                    <Text style={[styles.wizardButtonText, styles.primaryButtonText, { marginLeft: 4 }]}>Save</Text>
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
  const [comparisons, setComparisons] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [measurements, setMeasurements] = useState([])
  const [wizardVisible, setWizardVisible] = useState(false)
  const [photoPreview, setPhotoPreview] = useState({ visible: false, uri: null, title: "" })
  const [filters, setFilters] = useState({
    pageNumber: 1,
    pageSize: 50,
    startDate: null,
    endDate: null,
    searchTerm: "",
  })

  const fadeAnim = useRef(new Animated.Value(0)).current
  const scaleAnim = useRef(new Animated.Value(0.95)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 120,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start()
  }, [])

  const showPhotoPreview = (uri, title) => {
    setPhotoPreview({ visible: true, uri, title })
  }

  const hidePhotoPreview = () => {
    setPhotoPreview({ visible: false, uri: null, title: "" })
  }

  const safeNavigate = (screen, params = {}) => {
    try {
      if (navigation && typeof navigation.navigate === "function") {
        navigation.navigate(screen, params)
      } else {
        Alert.alert("Error", "Navigation is not available")
      }
    } catch (error) {
      console.error("Navigation error:", error)
    }
  }

  const safeGoBack = () => {
    try {
      if (navigation && typeof navigation.goBack === "function") {
        navigation.goBack()
      } else if (navigation && typeof navigation.navigate === "function") {
        navigation.navigate("Home")
      }
    } catch (error) {
      console.error("Navigation error:", error)
    }
  }

  const fetchComparisons = async (showLoading = true, appliedFilters = filters) => {
    try {
      if (showLoading) setLoading(true)
      if (!user) {
        return
      }

      const queryParams = {
        pageNumber: appliedFilters.pageNumber,
        pageSize: appliedFilters.pageSize,
        searchTerm: appliedFilters.searchTerm || undefined,
        startDate: appliedFilters.startDate ? appliedFilters.startDate.toISOString() : undefined,
        endDate: appliedFilters.endDate ? appliedFilters.endDate.toISOString() : undefined,
      }

      const response = await apiProgressComparisonService.getComparisonsByUser(user.userId, queryParams)
      if (response?.statusCode === 200 && response?.data) {
        setComparisons(response.data.comparisons || [])
      }
    } catch (error) {
      Alert.alert("Error", "Failed to load progress comparisons.")
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
      Alert.alert("Error", "Failed to load body measurements.")
    }
  }

  useEffect(() => {
    if (user) {
      fetchComparisons()
      fetchMeasurements()
    }
  }, [user])

  useFocusEffect(
    useCallback(() => {
      fetchComparisons()
    }, []),
  )

  const onRefresh = () => {
    setRefreshing(true)
    fetchComparisons(false)
  }

  const renderComparisonItem = ({ item, index }) => {
    const comparisonDate = item.comparisonDate
      ? new Date(item.comparisonDate).toLocaleDateString("en-US", {
          month: "short",
          day: "2-digit",
          year: "numeric",
        })
      : "N/A"

    const beforePhoto = item.progressPhotos?.[0]?.beforePhotoUrl
    const afterPhoto = item.progressPhotos?.[0]?.afterPhotoUrl
    const photoNotes = item.progressPhotos?.[0]?.notes

    return (
      <Animated.View
        style={[
          styles.comparisonCard,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => safeNavigate("ProgressComparisonDetailScreen", { comparison: item })}
          activeOpacity={0.7}
        >
          <View style={styles.comparisonCardContent}>
            {photoNotes && (
              <View style={styles.notesContainer}>
                <Text style={styles.notesText} numberOfLines={2}>
                  {photoNotes}
                </Text>
              </View>
            )}

            <Text style={styles.comparisonDescription} numberOfLines={2}>
              {item.description || "No description provided"}
            </Text>

            {(beforePhoto || afterPhoto) && (
              <View style={styles.photoComparisonSection}>
                <View style={styles.photoComparisonRow}>
                  <View style={styles.photoComparisonItem}>
                    {beforePhoto ? (
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation()
                          showPhotoPreview(beforePhoto, "Before Photo")
                        }}
                        activeOpacity={0.8}
                      >
                        <Image source={{ uri: beforePhoto }} style={styles.photoThumbnail} />
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.photoThumbnailPlaceholder}>
                        <Ionicons name="image-outline" size={24} color="#ccc" />
                      </View>
                    )}
                    <Text style={styles.photoLabel}>Before</Text>
                  </View>

                  <View style={styles.photoArrow}>
                    <Ionicons name="arrow-forward" size={16} color="#666" />
                  </View>

                  <View style={styles.photoComparisonItem}>
                    {afterPhoto ? (
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation()
                          showPhotoPreview(afterPhoto, "After Photo")
                        }}
                        activeOpacity={0.8}
                      >
                        <Image source={{ uri: afterPhoto }} style={styles.photoThumbnail} />
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.photoThumbnailPlaceholder}>
                        <Ionicons name="image-outline" size={24} color="#ccc" />
                      </View>
                    )}
                    <Text style={styles.photoLabel}>After</Text>
                  </View>
                </View>

                {(item.weightChange !== null || item.bodyFatChange !== null) && (
                  <View style={styles.statsRow}>
                    {item.weightChange !== null && (
                      <Text style={styles.statText}>
                        Weight: {item.weightChange > 0 ? "+" : ""}
                        {item.weightChange} kg
                      </Text>
                    )}
                    {item.bodyFatChange !== null && (
                      <Text style={styles.statText}>
                        Body Fat: {item.bodyFatChange > 0 ? "+" : ""}
                        {item.bodyFatChange}%
                      </Text>
                    )}
                  </View>
                )}
              </View>
            )}

            <Text style={styles.dateText}>Created on {comparisonDate}</Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    )
  }

  if (loading && !refreshing) {
    return <Loading text="Loading your progress..." />
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <DynamicStatusBar backgroundColor="#fff" />
      <Header
        title="Progress Comparisonsssss"
        subtitle="Track your fitness journey"
        onBack={safeGoBack}
        rightComponent={
          <TouchableOpacity
            style={styles.addButtonMinimal}
            onPress={() => {
              if (measurements.length === 0) {
                Alert.alert(
                  "No Measurements Found",
                  "You need at least one body measurement to create a comparison. Please add a measurement first.",
                  [
                    { text: "OK", style: "default" },
                    { text: "Add Measurement", onPress: () => safeNavigate("BodyMeasurements") },
                  ],
                )
                return
              }
              setWizardVisible(true)
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={20} color="#333" />
          </TouchableOpacity>
        }
        style={{ backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f0f0f0" }}
      />

      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#333"]} tintColor="#333" />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.comparisonsSection}>
          {comparisons.length > 0 ? (
            <FlatList
              data={comparisons}
              renderItem={renderComparisonItem}
              keyExtractor={(item) => item.comparisonId.toString()}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyStateContent}>
                <View style={styles.emptyIconContainer}>
                  <Ionicons name="trending-up-outline" size={48} color="#ccc" />
                </View>
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
                          { text: "OK", style: "default" },
                          { text: "Add Measurement", onPress: () => safeNavigate("BodyMeasurement") },
                        ],
                      )
                      return
                    }
                    setWizardVisible(true)
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add-circle-outline" size={16} color="#333" />
                  <Text style={styles.emptyStateButtonText}>Create First Comparison</Text>
                </TouchableOpacity>
              </View>
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

      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          if (measurements.length === 0) {
            Alert.alert(
              "No Measurements Found",
              "You need at least one body measurement to create a comparison. Please add a measurement first.",
              [
                { text: "OK", style: "default" },
                { text: "Add Measurement", onPress: () => safeNavigate("BodyMeasurements") },
              ],
            )
            return
          }
          setWizardVisible(true)
        }}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={24} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  addButtonMinimal: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  comparisonsSection: {
    padding: 16,
    paddingTop: 8,
  },
  comparisonCard: {
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: "#fff",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  comparisonCardContent: {
    padding: 16,
  },
  notesContainer: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#333",
  },
  notesText: {
    fontSize: 14,
    color: "#666",
    fontStyle: "italic",
    lineHeight: 18,
  },
  comparisonDescription: {
    fontSize: 15,
    color: "#333",
    lineHeight: 20,
    marginBottom: 16,
  },
  photoComparisonSection: {
    marginBottom: 12,
    backgroundColor: "#fafafa",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  photoComparisonRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  photoComparisonItem: {
    alignItems: "center",
    flex: 1,
  },
  photoThumbnail: {
    width: 80,
    height: 100,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
  },
  photoThumbnailPlaceholder: {
    width: 80,
    height: 100,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderStyle: "dashed",
  },
  photoLabel: {
    marginTop: 6,
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  photoArrow: {
    width: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  statText: {
    fontSize: 13,
    color: "#666",
    marginHorizontal: 8,
  },
  dateText: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
    marginTop: 4,
  },
  emptyState: {
    alignItems: "center",
    marginTop: 60,
  },
  emptyStateContent: {
    alignItems: "center",
    padding: 32,
    backgroundColor: "#fafafa",
    borderRadius: 16,
    width: "100%",
  },
  emptyIconContainer: {
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyStateButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  emptyStateButtonText: {
    color: "#333",
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 6,
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#333",
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
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
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  photoPreviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  photoPreviewTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  photoPreviewCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f5f5f5",
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
    fontSize: 14,
    color: "#999",
    marginTop: 8,
  },

  // Wizard Styles
  wizardContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  wizardHeader: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  progressBarContainer: {
    width: 80,
  },
  progressBar: {
    height: 3,
    backgroundColor: "#f0f0f0",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#333",
    borderRadius: 2,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  wizardBody: {
    flex: 1,
    backgroundColor: "#fff",
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
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
    marginBottom: 6,
    textAlign: "center",
  },
  stepDescription: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
  },
  measurementSection: {
    flex: 1,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  measurementList: {
    maxHeight: height * 0.25,
    marginBottom: 16,
  },
  measurementCard: {
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#f0f0f0",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  selectedMeasurement: {
    borderColor: "#333",
    backgroundColor: "#f8f9fa",
  },
  measurementCardContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
  },
  measurementInfo: {
    flex: 1,
  },
  measurementDate: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  measurementDetails: {
    flexDirection: "row",
    alignItems: "center",
  },
  measurementWeight: {
    fontSize: 13,
    color: "#666",
  },
  measurementBodyFat: {
    fontSize: 13,
    color: "#666",
    marginLeft: 6,
  },
  selectedIndicator: {
    marginLeft: 12,
  },
  changePreview: {
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  changePreviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  changeTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
    marginLeft: 6,
  },
  changeStats: {
    flexDirection: "column",
  },
  changeStatItem: {
    marginBottom: 6,
  },
  changeText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
  },
  inputContainer: {
    flex: 1,
  },
  textAreaContainer: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    backgroundColor: "#fff",
  },
  textArea: {
    padding: 16,
    fontSize: 14,
    color: "#333",
    minHeight: 120,
    textAlignVertical: "top",
  },
  photoSection: {
    flex: 1,
  },
  photoPreview: {
    position: "relative",
    marginBottom: 16,
    alignSelf: "center",
  },
  imageContainer: {
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#f0f0f0",
  },
  previewImage: {
    width: width - 80,
    height: (width - 80) * 0.75,
  },
  removePhotoButton: {
    position: "absolute",
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#ff4444",
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  photoPlaceholder: {
    width: width - 80,
    height: (width - 80) * 0.75,
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: "#f8f9fa",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#e0e0e0",
    borderStyle: "dashed",
    alignSelf: "center",
  },
  photoPlaceholderText: {
    fontSize: 14,
    color: "#999",
    marginTop: 8,
  },
  photoButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  photoButton: {
    flex: 0.48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#333",
  },
  secondaryButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  photoButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#fff",
    marginLeft: 6,
  },
  secondaryButtonText: {
    color: "#666",
  },
  reviewContent: {
    flex: 1,
    maxHeight: height * 0.5,
  },
  reviewSection: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  reviewSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  reviewSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginLeft: 6,
  },
  reviewItem: {
    marginBottom: 12,
  },
  reviewLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: "#666",
    marginBottom: 4,
  },
  reviewValue: {
    fontSize: 14,
    color: "#333",
    lineHeight: 18,
  },
  reviewPhotos: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  reviewPhotoContainer: {
    flex: 1,
    alignItems: "center",
    marginHorizontal: 6,
  },
  reviewPhotoLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#666",
    marginBottom: 8,
  },
  reviewPhoto: {
    width: (width - 120) / 2,
    height: ((width - 120) / 2) * 0.75,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
  },
  reviewPhotoPlaceholder: {
    width: (width - 120) / 2,
    height: ((width - 120) / 2) * 0.75,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderStyle: "dashed",
  },
  reviewPhotoPlaceholderText: {
    fontSize: 11,
    color: "#999",
    marginTop: 4,
  },
  wizardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    backgroundColor: "#fff",
  },
  wizardButton: {
    flex: 1,
    marginHorizontal: 6,
    borderRadius: 8,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },
  primaryButton: {
    backgroundColor: "#333",
  },
  secondaryWizardButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  cancelButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  disabledButton: {
    opacity: 0.5,
  },
  wizardButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },
  primaryButtonText: {
    color: "#fff",
  },
  cancelButtonText: {
    color: "#666",
  },
})
