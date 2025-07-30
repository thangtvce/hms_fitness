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
import { LinearGradient } from "expo-linear-gradient"
import { StatusBar } from "expo-status-bar"
import { SafeAreaView } from "react-native-safe-area-context"
import * as ImagePicker from "expo-image-picker"

const { width, height } = Dimensions.get("window")

const PhotoPreviewModal = ({ visible, imageUri, onClose, title = "Photo Preview" }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current
  const scaleAnim = useRef(new Animated.Value(0.8)).current

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
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
          toValue: 0.8,
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
          <LinearGradient colors={["rgba(0,0,0,0.9)", "rgba(0,0,0,0.7)"]} style={styles.photoPreviewHeader}>
            <Text style={styles.photoPreviewTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.photoPreviewCloseButton}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </LinearGradient>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.photoPreviewImage} resizeMode="contain" />
          ) : (
            <View style={styles.photoPreviewPlaceholder}>
              <Ionicons name="image-outline" size={64} color="#9CA3AF" />
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

  const totalSteps = 5 // Reduced from 7 to 5

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
                <LinearGradient colors={["#0056d2", "#0056d2"]} style={styles.stepIconContainer}>
                  <Ionicons name="calendar" size={28} color="#FFFFFF" />
                </LinearGradient>
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
                      <LinearGradient
                        colors={
                          wizardData.beforeMeasurementId === measurement.measurementId
                            ? ["#0056d2", "#0056d2"]
                            : ["#FFFFFF", "#F8FAFC"]
                        }
                        style={styles.measurementCardGradient}
                      >
                        <View style={styles.measurementCardContent}>
                          <View style={styles.measurementInfo}>
                            <Text
                              style={[
                                styles.measurementDate,
                                wizardData.beforeMeasurementId === measurement.measurementId && styles.selectedText,
                              ]}
                            >
                              {new Date(measurement.measurementDate).toLocaleDateString("en-US", {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </Text>
                            <View style={styles.measurementDetails}>
                              <Text
                                style={[
                                  styles.measurementWeight,
                                  wizardData.beforeMeasurementId === measurement.measurementId &&
                                    styles.selectedDetailText,
                                ]}
                              >
                                {measurement.weight} kg
                              </Text>
                              {measurement.bodyFatPercentage && (
                                <Text
                                  style={[
                                    styles.measurementBodyFat,
                                    wizardData.beforeMeasurementId === measurement.measurementId &&
                                      styles.selectedDetailText,
                                  ]}
                                >
                                  • {measurement.bodyFatPercentage}%
                                </Text>
                              )}
                            </View>
                          </View>
                          {wizardData.beforeMeasurementId === measurement.measurementId && (
                            <View style={styles.selectedIndicator}>
                              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                            </View>
                          )}
                        </View>
                      </LinearGradient>
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
                      <LinearGradient
                        colors={
                          wizardData.afterMeasurementId === measurement.measurementId
                            ? ["#0056d2", "#0056d2"]
                            : ["#FFFFFF", "#F8FAFC"]
                        }
                        style={styles.measurementCardGradient}
                      >
                        <View style={styles.measurementCardContent}>
                          <View style={styles.measurementInfo}>
                            <Text
                              style={[
                                styles.measurementDate,
                                wizardData.afterMeasurementId === measurement.measurementId && styles.selectedText,
                              ]}
                            >
                              {new Date(measurement.measurementDate).toLocaleDateString("en-US", {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </Text>
                            <View style={styles.measurementDetails}>
                              <Text
                                style={[
                                  styles.measurementWeight,
                                  wizardData.afterMeasurementId === measurement.measurementId &&
                                    styles.selectedDetailText,
                                ]}
                              >
                                {measurement.weight} kg
                              </Text>
                              {measurement.bodyFatPercentage && (
                                <Text
                                  style={[
                                    styles.measurementBodyFat,
                                    wizardData.afterMeasurementId === measurement.measurementId &&
                                      styles.selectedDetailText,
                                  ]}
                                >
                                  • {measurement.bodyFatPercentage}%
                                </Text>
                              )}
                            </View>
                          </View>
                          {wizardData.afterMeasurementId === measurement.measurementId && (
                            <View style={styles.selectedIndicator}>
                              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                            </View>
                          )}
                        </View>
                      </LinearGradient>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {wizardData.weightChange !== null && (
                  <LinearGradient colors={["#0056d2", "#0056d2"]} style={styles.changePreview}>
                    <View style={styles.changePreviewHeader}>
                      <Ionicons name="calculator" size={20} color="#FFFFFF" />
                      <Text style={styles.changeTitle}>Calculated Changes</Text>
                    </View>
                    <View style={styles.changeStats}>
                      <View style={styles.changeStatItem}>
                        <Text style={[styles.changeText, styles.changeTextWhite]}>
                          Weight: {wizardData.weightChange > 0 ? "+" : ""}
                          {wizardData.weightChange} kg
                        </Text>
                      </View>
                      {wizardData.bodyFatChange !== null && (
                        <View style={styles.changeStatItem}>
                          <Text style={[styles.changeText, styles.changeTextWhite]}>
                            Body Fat: {wizardData.bodyFatChange > 0 ? "+" : ""}
                            {wizardData.bodyFatChange}%
                          </Text>
                        </View>
                      )}
                    </View>
                  </LinearGradient>
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
                <LinearGradient colors={["#0056d2", "#0056d2"]} style={styles.stepIconContainer}>
                  <Ionicons name="create" size={28} color="#FFFFFF" />
                </LinearGradient>
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

      case 3:
        return (
          <TouchableWithoutFeedback onPress={dismissKeyboard}>
            <View style={styles.stepContent}>
              <View style={styles.stepHeader}>
                <LinearGradient colors={["#0056d2", "#0056d2"]} style={styles.stepIconContainer}>
                  <Ionicons name="camera" size={28} color="#FFFFFF" />
                </LinearGradient>
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
                        <LinearGradient colors={["transparent", "rgba(0,0,0,0.3)"]} style={styles.imageOverlay} />
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
                      <LinearGradient colors={["#ff6b6b", "#ee5a52"]} style={styles.removeButtonGradient}>
                        <Ionicons name="close" size={16} color="#FFFFFF" />
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <LinearGradient colors={["#f8f9fa", "#e9ecef"]} style={styles.placeholderGradient}>
                      <Ionicons name="image-outline" size={48} color="#9CA3AF" />
                      <Text style={styles.photoPlaceholderText}>No photo selected</Text>
                    </LinearGradient>
                  </View>
                )}

                <View style={styles.photoButtons}>
                  <TouchableOpacity
                    style={styles.photoButton}
                    onPress={() => handleCameraCapture("before")}
                    activeOpacity={0.8}
                  >
                    <LinearGradient colors={["#0056d2", "#0056d2"]} style={styles.buttonGradient}>
                      <Ionicons name="camera" size={18} color="#FFFFFF" />
                      <Text style={styles.photoButtonText}>Take Photo</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.photoButton}
                    onPress={() => handleImagePick("before")}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={["#FFFFFF", "#F8FAFC"]}
                      style={[styles.buttonGradient, styles.secondaryButtonGradient]}
                    >
                      <Ionicons name="images" size={18} color="#0056d2" />
                      <Text style={[styles.photoButtonText, styles.secondaryButtonText]}>Gallery</Text>
                    </LinearGradient>
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
                        <LinearGradient colors={["transparent", "rgba(0,0,0,0.3)"]} style={styles.imageOverlay} />
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
                      <LinearGradient colors={["#0056d2", "#0056d2"]} style={styles.removeButtonGradient}>
                        <Ionicons name="close" size={16} color="#FFFFFF" />
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <LinearGradient colors={["#f8f9fa", "#e9ecef"]} style={styles.placeholderGradient}>
                      <Ionicons name="image-outline" size={48} color="#9CA3AF" />
                      <Text style={styles.photoPlaceholderText}>No photo selected</Text>
                    </LinearGradient>
                  </View>
                )}

                <View style={styles.photoButtons}>
                  <TouchableOpacity
                    style={styles.photoButton}
                    onPress={() => handleCameraCapture("after")}
                    activeOpacity={0.8}
                  >
                    <LinearGradient colors={["#0056d2", "#0056d2"]} style={styles.buttonGradient}>
                      <Ionicons name="camera" size={18} color="#FFFFFF" />
                      <Text style={styles.photoButtonText}>Take Photo</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.photoButton}
                    onPress={() => handleImagePick("after")}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={["#FFFFFF", "#F8FAFC"]}
                      style={[styles.buttonGradient, styles.secondaryButtonGradient]}
                    >
                      <Ionicons name="images" size={18} color="#0056d2" />
                      <Text style={[styles.photoButtonText, styles.secondaryButtonText]}>Gallery</Text>
                    </LinearGradient>
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
                <LinearGradient colors={["#0056d2", "#0056d2"]} style={styles.stepIconContainer}>
                  <Ionicons name="create" size={28} color="#FFFFFF" />
                </LinearGradient>
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

      case 5:
        return (
          <TouchableWithoutFeedback onPress={dismissKeyboard}>
            <View style={styles.stepContent}>
              <View style={styles.stepHeader}>
                <LinearGradient colors={["#0056d2", "#0056d2"]} style={styles.stepIconContainer}>
                  <Ionicons name="checkmark-circle" size={28} color="#FFFFFF" />
                </LinearGradient>
                <Text style={styles.stepTitle}>Review & Confirm</Text>
                <Text style={styles.stepDescription}>Review all information before saving</Text>
              </View>
              <ScrollView style={styles.reviewContent} showsVerticalScrollIndicator={false} nestedScrollEnabled={true}>
                <LinearGradient colors={["#0056d2", "#0056d2"]} style={styles.reviewSection}>
                  <View style={styles.reviewSectionHeader}>
                    <Ionicons name="analytics" size={20} color="#FFFFFF" />
                    <Text style={styles.reviewSectionTitle}>Comparison Details</Text>
                  </View>
                  {wizardData.weightChange !== null && (
                    <View style={styles.reviewItem}>
                      <Text style={styles.reviewLabel}>Weight Change:</Text>
                      <Text style={[styles.reviewValue, styles.reviewValueBold, styles.reviewValueWhite]}>
                        {wizardData.weightChange > 0 ? "+" : ""}
                        {wizardData.weightChange} kg
                      </Text>
                    </View>
                  )}
                  {wizardData.bodyFatChange !== null && (
                    <View style={styles.reviewItem}>
                      <Text style={styles.reviewLabel}>Body Fat Change:</Text>
                      <Text style={[styles.reviewValue, styles.reviewValueBold, styles.reviewValueWhite]}>
                        {wizardData.bodyFatChange > 0 ? "+" : ""}
                        {wizardData.bodyFatChange}%
                      </Text>
                    </View>
                  )}
                  <View style={styles.reviewItem}>
                    <Text style={styles.reviewLabel}>Description:</Text>
                    <Text style={[styles.reviewValue, styles.reviewValueWhite]}>
                      {wizardData.description || "No description provided"}
                    </Text>
                  </View>
                </LinearGradient>

                <LinearGradient colors={["#FFFFFF", "#F8FAFC"]} style={styles.reviewSection}>
                  <View style={styles.reviewSectionHeader}>
                    <Ionicons name="images" size={20} color="#0056d2" />
                    <Text style={[styles.reviewSectionTitle, { color: "#1F2937" }]}>Progress Photos</Text>
                  </View>
                  <View style={styles.reviewPhotos}>
                    <View style={styles.reviewPhotoContainer}>
                      <Text style={styles.reviewPhotoLabel}>Before</Text>
                      {previewImages.before ? (
                        <TouchableOpacity
                          onPress={() => showPhotoPreview(previewImages.before, "Before Photo")}
                          activeOpacity={0.8}
                        >
                          <View style={styles.reviewPhotoWrapper}>
                            <Image source={{ uri: previewImages.before }} style={styles.reviewPhoto} />
                            <LinearGradient
                              colors={["transparent", "rgba(0,0,0,0.2)"]}
                              style={styles.reviewPhotoOverlay}
                            />
                          </View>
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
                          onPress={() => showPhotoPreview(previewImages.after, "After Photo")}
                          activeOpacity={0.8}
                        >
                          <View style={styles.reviewPhotoWrapper}>
                            <Image source={{ uri: previewImages.after }} style={styles.reviewPhoto} />
                            <LinearGradient
                              colors={["transparent", "rgba(0,0,0,0.2)"]}
                              style={styles.reviewPhotoOverlay}
                            />
                          </View>
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
                </LinearGradient>
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
        <LinearGradient colors={["#0056d2", "#0056d2"]} style={styles.wizardHeaderGradient}>
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
          />
        </LinearGradient>

        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
          <ScrollView
            ref={scrollViewRef}
            style={[styles.wizardBody, { marginTop: 100 }]}
            contentContainerStyle={styles.wizardBodyContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {renderStepContent()}
          </ScrollView>
        </KeyboardAvoidingView>

        {!keyboardVisible && (
          <LinearGradient colors={["#FFFFFF", "#F8FAFC"]} style={styles.wizardFooter}>
            {currentStep === 1 ? (
              <TouchableOpacity style={styles.wizardButton} onPress={onClose} activeOpacity={0.8}>
                <LinearGradient colors={["#FFFFFF", "#F8FAFC"]} style={styles.buttonGradient}>
                  <Text style={[styles.wizardButtonText, { color: "#0056d2" }]}>Cancel</Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.wizardButton, currentStep === 1 && styles.disabledButton]}
                onPress={prevStep}
                disabled={currentStep === 1}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={currentStep === 1 ? ["#F3F4F6", "#E5E7EB"] : ["#FFFFFF", "#F8FAFC"]}
                  style={styles.buttonGradient}
                >
                  <Text style={[styles.wizardButtonText, { color: currentStep === 1 ? "#9CA3AF" : "#0056d2" }]}>
                    Previous
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            )}

            {currentStep < totalSteps ? (
              <TouchableOpacity
                style={[styles.wizardButton, !canProceed() && styles.disabledButton]}
                onPress={nextStep}
                disabled={!canProceed()}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={!canProceed() ? ["#F3F4F6", "#E5E7EB"] : ["#0056d2", "#0056d2"]}
                  style={styles.buttonGradient}
                >
                  <Text style={[styles.wizardButtonText, { color: !canProceed() ? "#9CA3AF" : "#FFFFFF" }]}>Next</Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.wizardButton}
                onPress={handleComplete}
                disabled={uploading}
                activeOpacity={0.8}
              >
                <LinearGradient colors={["#0056d2", "#0056d2"]} style={styles.buttonGradient}>
                  {uploading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                      <Text style={[styles.wizardButtonText, { color: "#FFFFFF" }]}>Save</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            )}
          </LinearGradient>
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
  const scaleAnim = useRef(new Animated.Value(0.9)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
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
          <LinearGradient colors={["#FFFFFF", "#F8FAFC"]} style={styles.comparisonCardGradient}>
            {/* Photo Notes at the top */}
            {photoNotes && (
              <View style={styles.notesContainer}>
                <Text style={styles.notesText} numberOfLines={2}>
                  {photoNotes}
                </Text>
              </View>
            )}

            {/* Description */}
            <Text style={styles.comparisonDescription} numberOfLines={2}>
              {item.description || "No description provided"}
            </Text>

            {/* Photos Section */}
            {(beforePhoto || afterPhoto) && (
              <View style={styles.photoComparisonSection}>
                <View style={styles.photoComparisonRow}>
                  {/* Before photo */}
                  <View style={styles.photoComparisonItem}>
                    {beforePhoto ? (
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation()
                          showPhotoPreview(beforePhoto, "Before Photo")
                        }}
                        activeOpacity={0.8}
                      >
                        <View style={styles.photoThumbnailContainer}>
                          <Image source={{ uri: beforePhoto }} style={styles.photoThumbnail} />
                        </View>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.photoThumbnailPlaceholder}>
                        <Ionicons name="image-outline" size={28} color="#9CA3AF" />
                      </View>
                    )}
                    <Text style={styles.photoLabel}>Before</Text>
                  </View>

                  {/* Arrow */}
                  <View style={styles.photoArrow}>
                    <View style={styles.arrowContainer}>
                      <Ionicons name="arrow-forward" size={14} color="#0056d2" />
                    </View>
                  </View>

                  {/* After photo */}
                  <View style={styles.photoComparisonItem}>
                    {afterPhoto ? (
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation()
                          showPhotoPreview(afterPhoto, "After Photo")
                        }}
                        activeOpacity={0.8}
                      >
                        <View style={styles.photoThumbnailContainer}>
                          <Image source={{ uri: afterPhoto }} style={styles.photoThumbnail} />
                        </View>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.photoThumbnailPlaceholder}>
                        <Ionicons name="image-outline" size={28} color="#9CA3AF" />
                      </View>
                    )}
                    <Text style={styles.photoLabel}>After</Text>
                  </View>
                </View>

                {/* Stats below photos */}
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

            {/* Date at the bottom */}
            <Text style={styles.dateText}>Created on {comparisonDate}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    )
  }

  if (loading && !refreshing) {
    return (
      <>
        <Loading text="Loading your progress..." />
      </>
    )
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <DynamicStatusBar backgroundColor="#0056d2" />
      <Header
        title="Progress Comparisons"
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
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        }
        style={{ backgroundColor: "#0056d2", paddingTop: Platform.OS === "android" ? 40 : 20, paddingBottom: 10 }}
      />

      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#0056d2"]} tintColor="#0056d2" />
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
              <LinearGradient colors={["#0056d2", "#0056d2"]} style={styles.emptyStateGradient}>
                <View style={styles.emptyIconContainer}>
                  <Ionicons name="trending-up-outline" size={64} color="#FFFFFF" />
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
                  <LinearGradient colors={["#FFFFFF", "#F8FAFC"]} style={styles.emptyButtonGradient}>
                    <Ionicons name="add-circle-outline" size={18} color="#0056d2" />
                    <Text style={styles.emptyStateButtonText}>Create First Comparison</Text>
                  </LinearGradient>
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

      {/* Floating Action Button */}
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
        <LinearGradient colors={["#0056d2", "#0056d2"]} style={styles.fabGradient}>
          <Ionicons name="add" size={32} color="#FFFFFF" />
        </LinearGradient>
      </TouchableOpacity>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  addButtonMinimal: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#003a8c",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  comparisonsSection: {
    padding: 20,
    marginTop: 50,
  },
  comparisonCard: {
    marginBottom: 20,
    borderRadius: 20,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  comparisonCardGradient: {
    padding: 24,
  },
  notesContainer: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: "#f0f9ff",
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#0056d2",
  },
  notesText: {
    fontSize: 14,
    color: "#374151",
    fontStyle: "italic",
    lineHeight: 20,
    fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
  },
  comparisonDescription: {
    fontSize: 15,
    color: "#4B5563",
    lineHeight: 22,
    marginBottom: 20,
    fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
  },
  photoComparisonSection: {
    marginBottom: 16,
    backgroundColor: "#fff",
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    alignItems: "center",
  },
  photoComparisonRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    marginBottom: 12,
  },
  photoComparisonItem: {
    alignItems: "center",
    flex: 1,
  },
  photoThumbnailContainer: {
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#e5e7eb",
    backgroundColor: "#f3f4f6",
  },
  photoThumbnail: {
    width: 90,
    height: 120,
    resizeMode: "cover",
  },
  photoThumbnailPlaceholder: {
    width: 90,
    height: 120,
    borderRadius: 14,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#e5e7eb",
    borderStyle: "dashed",
  },
  photoLabel: {
    marginTop: 8,
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "600",
    fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
  },
  photoArrow: {
    width: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  arrowContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#e5e7eb",
    justifyContent: "center",
    alignItems: "center",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  statText: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "400",
    marginHorizontal: 12,
    fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
  },
  dateText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    fontWeight: "400",
    fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
  },
  emptyState: {
    alignItems: "center",
    marginTop: 60,
  },
  emptyStateGradient: {
    alignItems: "center",
    padding: 48,
    borderRadius: 24,
    width: "100%",
  },
  emptyIconContainer: {
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 12,
    textAlign: "center",
    fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
  },
  emptyText: {
    fontSize: 16,
    color: "rgba(255,255,255,0.9)",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
    fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
  },
  emptyStateButton: {
    borderRadius: 12,
    overflow: "hidden",
  },
  emptyButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  emptyStateButtonText: {
    color: "#0056d2",
    fontSize: 15,
    fontWeight: "700",
    marginLeft: 8,
    fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
  },
  fab: {
    position: "absolute",
    right: 24,
    bottom: 36,
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: "hidden",
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
    zIndex: 100,
  },
  fabGradient: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  // Photo Preview Modal Styles
  photoPreviewModalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.95)",
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
    borderRadius: 20,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  photoPreviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
  },
  photoPreviewTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
  },
  photoPreviewCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
    backgroundColor: "#F8FAFC",
  },
  wizardHeaderGradient: {
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
    paddingBottom: 0,
  },
  progressBarContainer: {
    width: 80,
  },
  progressBar: {
    height: 4,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 2,
    overflow: "hidden",
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
    backgroundColor: "#F8FAFC",
  },
  wizardBodyContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  stepContent: {
    flex: 1,
    padding: 24,
    minHeight: height * 0.6,
  },
  stepHeader: {
    alignItems: "center",
    marginBottom: 40,
  },
  stepIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1F2937",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
    fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
  },
  stepDescription: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 24,
    fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
  },
  measurementSection: {
    flex: 1,
  },
  sectionLabel: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 16,
    fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
  },
  measurementList: {
    maxHeight: height * 0.25,
    marginBottom: 16,
  },
  measurementCard: {
    borderRadius: 16,
    marginBottom: 12,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  measurementCardGradient: {
    padding: 16,
  },
  selectedMeasurement: {
    transform: [{ scale: 1.02 }],
  },
  measurementCardContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  measurementInfo: {
    flex: 1,
  },
  measurementDate: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 4,
    fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
  },
  selectedText: {
    color: "#FFFFFF",
  },
  measurementDetails: {
    flexDirection: "row",
    alignItems: "center",
  },
  measurementWeight: {
    fontSize: 14,
    color: "#6B7280",
    fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
  },
  measurementBodyFat: {
    fontSize: 14,
    color: "#6B7280",
    marginLeft: 8,
    fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
  },
  selectedDetailText: {
    color: "rgba(255, 255, 255, 0.8)",
  },
  selectedIndicator: {
    marginLeft: 16,
  },
  changePreview: {
    borderRadius: 16,
    padding: 20,
    marginTop: 24,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  changePreviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  changeTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FFFFFF",
    marginLeft: 8,
    fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
  },
  changeStats: {
    flexDirection: "column",
  },
  changeStatItem: {
    marginBottom: 8,
  },
  changeText: {
    fontSize: 15,
    fontWeight: "700",
    fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
  },
  changeTextWhite: {
    color: "#FFFFFF",
  },
  inputContainer: {
    flex: 1,
  },
  textAreaContainer: {
    borderRadius: 16,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  textArea: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    fontSize: 15,
    color: "#1F2937",
    minHeight: 140,
    fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
    textAlignVertical: "top",
  },
  photoSection: {
    flex: 1,
  },
  photoPreview: {
    position: "relative",
    marginBottom: 24,
    alignSelf: "center",
  },
  imageContainer: {
    borderRadius: 20,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  previewImage: {
    width: width - 80,
    height: (width - 80) * 0.75,
  },
  imageOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  removePhotoButton: {
    position: "absolute",
    top: -12,
    right: -12,
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: "hidden",
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
  removeButtonGradient: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  photoPlaceholder: {
    width: width - 80,
    height: (width - 80) * 0.75,
    borderRadius: 20,
    marginBottom: 24,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
    alignSelf: "center",
  },
  placeholderGradient: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  photoPlaceholderText: {
    fontSize: 15,
    color: "#9CA3AF",
    marginTop: 12,
    fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
  },
  photoButtons: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  photoButton: {
    flex: 0.48,
    borderRadius: 12,
    overflow: "hidden",
  },
  buttonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  secondaryButtonGradient: {
    borderWidth: 2,
    borderColor: "#0056d2",
  },
  photoButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
    marginLeft: 8,
    fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
  },
  secondaryButtonText: {
    color: "#0056d2",
  },
  reviewContent: {
    flex: 1,
    maxHeight: height * 0.5,
  },
  reviewSection: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  reviewSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  reviewSectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
    marginLeft: 8,
    fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
  },
  reviewItem: {
    marginBottom: 16,
  },
  reviewLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: 6,
    fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
  },
  reviewValue: {
    fontSize: 15,
    color: "#1F2937",
    lineHeight: 22,
    fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
  },
  reviewValueBold: {
    fontWeight: "700",
  },
  reviewValueWhite: {
    color: "#FFFFFF",
  },
  reviewPhotos: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  reviewPhotoContainer: {
    flex: 1,
    alignItems: "center",
    marginHorizontal: 8,
  },
  reviewPhotoLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 12,
    fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
  },
  reviewPhotoWrapper: {
    borderRadius: 12,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  reviewPhoto: {
    width: (width - 120) / 2,
    height: ((width - 120) / 2) * 0.75,
  },
  reviewPhotoOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 30,
  },
  reviewPhotoPlaceholder: {
    width: (width - 120) / 2,
    height: ((width - 120) / 2) * 0.75,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
  },
  reviewPhotoPlaceholderText: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 6,
    fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
  },
  wizardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  wizardButton: {
    flex: 1,
    marginHorizontal: 8,
    borderRadius: 12,
    overflow: "hidden",
    minHeight: 48,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: "#0056d2",
  },
  disabledButton: {
    opacity: 0.6,
  },
  wizardButtonText: {
    fontSize: 15,
    fontWeight: "700",
    marginHorizontal: 8,
    fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
  },
})
