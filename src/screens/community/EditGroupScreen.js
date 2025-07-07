"use client"

import { useState, useEffect, useRef } from "react"
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  Modal,
  Animated,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
  Dimensions,
} from "react-native"
import { useNavigation, useRoute } from "@react-navigation/native"
import { updateMyGroup, getMyGroupActiveById } from "services/apiCommunityService"
import { LinearGradient } from "expo-linear-gradient"
import { Ionicons } from "@expo/vector-icons"
import * as ImagePicker from "expo-image-picker"
import { apiUploadImageCloudService } from "services/apiUploadImageCloudService"
import { Linking } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

const { width } = Dimensions.get("window")

const EditGroupScreen = () => {
  const navigation = useNavigation()
  const route = useRoute()
  const { groupId } = route.params || {}

  const [groupName, setGroupName] = useState("")
  const [description, setDescription] = useState("")
  const [thumbnail, setThumbnail] = useState("")
  const [cloudImageUrl, setCloudImageUrl] = useState("")
  const [isPrivate, setIsPrivate] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showImageOptions, setShowImageOptions] = useState(false)
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [imageUrl, setImageUrl] = useState("")
  const [urlError, setUrlError] = useState("")
  const [imageUploading, setImageUploading] = useState(false)

  // Validation states
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(30)).current
  const scaleAnim = useRef(new Animated.Value(0.95)).current

  useEffect(() => {
    if (groupId) {
      getMyGroupActiveById(groupId)
        .then((group) => {
          setGroupName(group.groupName || "")
          setDescription(group.description || "")
          setThumbnail(group.thumbnail || "")
          setCloudImageUrl(group.thumbnail || "")
          setIsPrivate(group.isPrivate || false)

          // Start animations after data loads
          Animated.parallel([
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: 800,
              useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
              toValue: 0,
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
        })
        .catch((err) => {
          Alert.alert("Error", err.message || "Failed to load group info")
          navigation.goBack()
        })
        .finally(() => setLoading(false))
    }
  }, [groupId])

  // Validation functions (match backend DataAnnotations)
  const validateGroupId = (id) => {
    if (id === undefined || id === null) return "GroupId is required."
    if (!Number.isInteger(id) || id < 1) return "GroupId must be a positive integer."
    return null
  }

  const validateGroupName = (name) => {
    if (!name.trim()) return "Group name is required."
    if (name.trim().length < 3 || name.trim().length > 255) return "Group name must be between 3 and 255 characters."
    return null
  }

  const validateDescription = (desc) => {
    if (!desc) return null // Optional
    if (desc.trim().length > 2000) return "Description cannot exceed 2000 characters."
    return null
  }

  const validateStatus = (status) => {
    if (!status) return "Status is required."
    if (status.length > 20) return "Status cannot exceed 20 characters."
    if (!/^(active|inactive)$/.test(status)) return "Status must be 'active', 'inactive'."
    return null
  }

  const handleInputChange = (field, value) => {
    switch (field) {
      case "groupName":
        setGroupName(value)
        if (touched.groupName) {
          const error = validateGroupName(value)
          setErrors((prev) => ({ ...prev, groupName: error }))
        }
        break
      case "description":
        setDescription(value)
        if (touched.description) {
          const error = validateDescription(value)
          setErrors((prev) => ({ ...prev, description: error }))
        }
        break
      case "status":
        // Not used in UI, but for completeness
        if (touched.status) {
          const error = validateStatus(value)
          setErrors((prev) => ({ ...prev, status: error }))
        }
        break
    }
  }

  const handleInputBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }))

    switch (field) {
      case "groupName": {
        const nameError = validateGroupName(groupName)
        setErrors((prev) => ({ ...prev, groupName: nameError }))
        break
      }
      case "description": {
        const descError = validateDescription(description)
        setErrors((prev) => ({ ...prev, description: descError }))
        break
      }
      case "status": {
        const statusError = validateStatus("active") // always 'active' for now
        setErrors((prev) => ({ ...prev, status: statusError }))
        break
      }
      case "groupId": {
        const idError = validateGroupId(groupId)
        setErrors((prev) => ({ ...prev, groupId: idError }))
        break
      }
    }
  }

  // Helper function to convert base64 to FormData with dynamic MIME type
  const createFormDataFromBase64 = (base64String, fileName = `image-${Date.now()}.jpg`) => {
    const formData = new FormData()
    const mimeTypeMatch = base64String.match(/^data:(image\/[a-z]+);base64,/)
    const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : "image/jpeg"
    const cleanedBase64 = base64String.replace(/^data:image\/[a-z]+;base64,/, "")

    formData.append("file", {
      uri: `data:${mimeType};base64,${cleanedBase64}`,
      type: mimeType,
      name: fileName,
    })

    return formData
  }

  const isValidUrl = (url) => {
    const urlRegex = /^(https?:\/\/[^\s$.?#].[^\s]*)$/i
    return urlRegex.test(url)
  }

  const checkImageUrl = async (url) => {
    try {
      const response = await fetch(url, { method: "HEAD" })
      const contentType = response.headers.get("content-type")
      return response.ok && contentType?.startsWith("image/")
    } catch (error) {
      return false
    }
  }

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "To select images, please grant access to your photo library in your device settings.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: () => Linking.openSettings() },
          ],
        )
        return
      }

      setImageUploading(true)
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
        base64: true,
      })

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0]
        if (selectedAsset.base64) {
          const base64Image = `data:image/jpeg;base64,${selectedAsset.base64}`
          setThumbnail(base64Image)
          setCloudImageUrl("")
        } else {
          setThumbnail(selectedAsset.uri)
          setCloudImageUrl("")
          Alert.alert("Warning", "Base64 not available. Using local URI, which may not persist.")
        }
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick image.")
    } finally {
      setImageUploading(false)
      setShowImageOptions(false)
    }
  }

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync()
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "To take photos, please grant access to your camera in your device settings.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: () => Linking.openSettings() },
          ],
        )
        return
      }

      setImageUploading(true)
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
        base64: true,
      })

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0]
        if (selectedAsset.base64) {
          const base64Image = `data:image/jpeg;base64,${selectedAsset.base64}`
          setThumbnail(base64Image)
          setCloudImageUrl("")
        } else {
          setThumbnail(selectedAsset.uri)
          setCloudImageUrl("")
          Alert.alert("Warning", "Base64 not available. Using local URI, which may not persist.")
        }
      }
    } catch (error) {
      Alert.alert("Error", "Failed to take photo.")
    } finally {
      setImageUploading(false)
      setShowImageOptions(false)
    }
  }

  const handleUrlImage = () => {
    setShowImageOptions(false)
    setShowUrlInput(true)
    setImageUrl("")
    setUrlError("")
  }

  const confirmUrlImage = async () => {
    if (!imageUrl.trim()) {
      setUrlError("Please enter an image URL.")
      return
    }

    if (!isValidUrl(imageUrl)) {
      setUrlError("Please enter a valid URL starting with http:// or https://.")
      return
    }

    setImageUploading(true)
    const isImageReachable = await checkImageUrl(imageUrl)
    setImageUploading(false)

    if (!isImageReachable) {
      setUrlError("The URL does not point to a valid image or is unreachable.")
      return
    }

    setThumbnail(imageUrl)
    setCloudImageUrl(imageUrl)
    setShowUrlInput(false)
  }

  const cancelUrlInput = () => {
    setShowUrlInput(false)
    setImageUrl("")
    setUrlError("")
  }

  const handleRemoveImage = () => {
    Alert.alert("Remove Image", "Are you sure you want to remove this image?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          setThumbnail("")
          setCloudImageUrl("")
        },
      },
    ])
  }

  const handleSave = async () => {
    // Validate all fields
    const idError = validateGroupId(groupId)
    const nameError = validateGroupName(groupName)
    const descError = validateDescription(description)
    const statusValue = "active" // or allow user to select in future
    const statusError = validateStatus(statusValue)

    setErrors({
      groupId: idError,
      groupName: nameError,
      description: descError,
      status: statusError,
    })

    setTouched({
      groupId: true,
      groupName: true,
      description: true,
      status: true,
    })

    if (idError || nameError || descError || statusError) {
      Alert.alert("Validation Error", "Please fix the errors before saving changes.")
      return
    }

    setSaving(true)
    let finalImageUrl = cloudImageUrl

    try {
      if (thumbnail && thumbnail.startsWith("data:image") && !cloudImageUrl) {
        const formData = createFormDataFromBase64(thumbnail)
        const uploadResult = await apiUploadImageCloudService.uploadImage(formData)

        if (!uploadResult.isError && uploadResult.imageUrl) {
          finalImageUrl = uploadResult.imageUrl
          setCloudImageUrl(uploadResult.imageUrl)
        } else {
          Alert.alert("Upload Error", "Image upload failed. Please try selecting the image again.")
          setSaving(false)
          return
        }
      }

      await updateMyGroup(groupId, {
        groupId,
        groupName,
        description,
        thumbnail: finalImageUrl,
        status: statusValue,
        isPrivate,
      })

      Alert.alert("Success", "Group updated successfully!", [{ text: "OK", onPress: () => navigation.goBack() }])
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to update group")
    } finally {
      setSaving(false)
    }
  }

  const renderLoadingScreen = () => (
    <LinearGradient colors={["#4F46E5", "#7C3AED"]} style={styles.container}>
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFFFFF" />
        <Text style={styles.loadingText}>Loading group data...</Text>
      </View>
    </LinearGradient>
  )

  const renderImageSection = () => (
    <Animated.View
      style={[
        styles.imageSection,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {thumbnail ? (
        <View style={styles.imageContainer}>
          <Image source={{ uri: thumbnail }} style={styles.imagePreview} />
          <LinearGradient colors={["transparent", "rgba(0,0,0,0.4)"]} style={styles.imageOverlay} />
          <TouchableOpacity style={styles.removeImageButton} onPress={handleRemoveImage}>
            <View style={styles.removeImageButtonInner}>
              <Ionicons name="close" size={16} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.editImageButton} onPress={() => setShowImageOptions(true)}>
            <View style={styles.editImageButtonInner}>
              <Ionicons name="pencil" size={16} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
          <View style={styles.imageLabel}>
            <Ionicons name="image" size={14} color="#FFFFFF" />
            <Text style={styles.imageLabelText}>Group Cover</Text>
          </View>
        </View>
      ) : (
        <TouchableOpacity style={styles.addImageContainer} onPress={() => setShowImageOptions(true)}>
          <LinearGradient colors={["#F8FAFC", "#F1F5F9"]} style={styles.addImageGradient}>
            <View style={styles.addImageIcon}>
              <Ionicons name="camera-outline" size={32} color="#64748B" />
            </View>
            <Text style={styles.addImageTitle}>Update Cover Photo</Text>
            <Text style={styles.addImageSubtitle}>Change your group's cover image</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </Animated.View>
  )

  const renderFormField = (label, value, onChangeText, onBlur, placeholder, multiline = false, icon) => {
    // Set max length for counters
    let maxLength = 255
    if (label === "Description") maxLength = 2000
    if (label === "Group Name") maxLength = 255

    return (
      <Animated.View
        style={[
          styles.fieldContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={styles.fieldHeader}>
          <View style={styles.fieldLabelContainer}>
            {icon && <Ionicons name={icon} size={16} color="#4F46E5" style={styles.fieldIcon} />}
            <Text style={styles.fieldLabel}>{label}</Text>
          </View>
          <Text style={styles.fieldCounter}>
            {value.length}/{maxLength}
          </Text>
        </View>
        <View style={[styles.inputContainer, errors[onBlur.split(".")[1]] && styles.inputError]}>
          <TextInput
            style={[styles.input, multiline && styles.multilineInput]}
            placeholder={placeholder}
            placeholderTextColor="#94A3B8"
            value={value}
            onChangeText={onChangeText}
            onBlur={() => handleInputBlur(onBlur.split(".")[1])}
            multiline={multiline}
            textAlignVertical={multiline ? "top" : "center"}
            maxLength={maxLength}
          />
        </View>
        {errors[onBlur.split(".")[1]] && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={14} color="#EF4444" />
            <Text style={styles.errorText}>{errors[onBlur.split(".")[1]]}</Text>
          </View>
        )}
      </Animated.View>
    )
  }

  const renderPrivacySelector = () => (
    <Animated.View
      style={[
        styles.privacySection,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.fieldHeader}>
        <View style={styles.fieldLabelContainer}>
          <Ionicons name="shield-outline" size={16} color="#4F46E5" style={styles.fieldIcon} />
          <Text style={styles.fieldLabel}>Privacy Setting</Text>
        </View>
      </View>
      <View style={styles.privacyOptions}>
        <TouchableOpacity
          style={[styles.privacyOption, !isPrivate && styles.privacyOptionActive]}
          onPress={() => setIsPrivate(false)}
        >
          <View style={styles.privacyOptionHeader}>
            <Ionicons name="globe-outline" size={20} color={!isPrivate ? "#FFFFFF" : "#3B82F6"} />
            <Text style={[styles.privacyOptionTitle, !isPrivate && styles.privacyOptionTitleActive]}>Public</Text>
          </View>
          <Text style={[styles.privacyOptionDesc, !isPrivate && styles.privacyOptionDescActive]}>
            Anyone can find and join this group
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.privacyOption, isPrivate && styles.privacyOptionActive]}
          onPress={() => setIsPrivate(true)}
        >
          <View style={styles.privacyOptionHeader}>
            <Ionicons name="lock-closed-outline" size={20} color={isPrivate ? "#FFFFFF" : "#A855F7"} />
            <Text style={[styles.privacyOptionTitle, isPrivate && styles.privacyOptionTitleActive]}>Private</Text>
          </View>
          <Text style={[styles.privacyOptionDesc, isPrivate && styles.privacyOptionDescActive]}>
            Members need approval to join
          </Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  )

  if (loading) return renderLoadingScreen()

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient colors={["#4F46E5","#6366F1","#818CF8"]} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Edit Group</Text>
            <Text style={styles.headerSubtitle}>Update your community settings</Text>
          </View>
          <View style={styles.headerRight} />
        </View>
      </LinearGradient>

      <KeyboardAvoidingView style={styles.keyboardContainer} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {renderImageSection()}

          {renderFormField(
            "Group Name",
            groupName,
            (text) => handleInputChange("groupName", text),
            "field.groupName",
            "Enter a catchy group name...",
            false,
            "people-outline",
          )}

          {renderFormField(
            "Description",
            description,
            (text) => handleInputChange("description", text),
            "field.description",
            "Describe what your group is about, its goals, and what members can expect...",
            true,
            "document-text-outline",
          )}

          {renderPrivacySelector()}

          {/* Save Button */}
          <Animated.View
            style={[
              styles.saveButtonContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <TouchableOpacity
              style={[styles.saveButton, (saving || imageUploading) && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving || imageUploading}
            >
              <LinearGradient colors={["#F59E0B", "#D97706"]} style={styles.saveButtonGradient}>
                {saving || imageUploading ? (
                  <View style={styles.saveButtonLoading}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.saveButtonText}>
                      {imageUploading ? "Uploading Image..." : "Saving Changes..."}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.saveButtonContent}>
                    <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Image Options Modal */}
      <Modal
        visible={showImageOptions}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowImageOptions(false)}
      >
        <View style={styles.modalOverlay}>
          <Animated.View style={[styles.imageOptionsModal, { transform: [{ scale: scaleAnim }] }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Photo</Text>
              <TouchableOpacity onPress={() => setShowImageOptions(false)} style={styles.modalCloseButton}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.imageOptionsContainer}>
              <TouchableOpacity style={styles.imageOption} onPress={handleTakePhoto} disabled={imageUploading}>
                <LinearGradient colors={["#4F46E5", "#7C3AED"]} style={styles.imageOptionGradient}>
                  <Ionicons name="camera" size={28} color="#FFFFFF" />
                </LinearGradient>
                <Text style={styles.imageOptionTitle}>Take Photo</Text>
                <Text style={styles.imageOptionSubtitle}>Use your camera</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.imageOption} onPress={handlePickImage} disabled={imageUploading}>
                <LinearGradient colors={["#22C55E", "#16A34A"]} style={styles.imageOptionGradient}>
                  <Ionicons name="images" size={28} color="#FFFFFF" />
                </LinearGradient>
                <Text style={styles.imageOptionTitle}>Choose from Gallery</Text>
                <Text style={styles.imageOptionSubtitle}>Select existing photo</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.imageOption} onPress={handleUrlImage} disabled={imageUploading}>
                <LinearGradient colors={["#F59E0B", "#D97706"]} style={styles.imageOptionGradient}>
                  <Ionicons name="link" size={28} color="#FFFFFF" />
                </LinearGradient>
                <Text style={styles.imageOptionTitle}>Enter URL</Text>
                <Text style={styles.imageOptionSubtitle}>Paste image link</Text>
              </TouchableOpacity>
            </View>

            {imageUploading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4F46E5" />
                <Text style={styles.loadingText}>Processing image...</Text>
              </View>
            )}
          </Animated.View>
        </View>
      </Modal>

      {/* URL Input Modal */}
      <Modal visible={showUrlInput} transparent={true} animationType="slide" onRequestClose={cancelUrlInput}>
        <View style={styles.modalOverlay}>
          <Animated.View style={[styles.urlInputModal, { transform: [{ scale: scaleAnim }] }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Enter Image URL</Text>
              <TouchableOpacity onPress={cancelUrlInput} style={styles.modalCloseButton}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.urlInputContainer}>
              <TextInput
                style={styles.urlInput}
                placeholder="https://example.com/image.jpg"
                placeholderTextColor="#94A3B8"
                value={imageUrl}
                onChangeText={(text) => {
                  setImageUrl(text)
                  setUrlError("")
                }}
                autoCapitalize="none"
                keyboardType="url"
                returnKeyType="done"
                onSubmitEditing={confirmUrlImage}
                autoFocus={true}
              />

              {urlError && (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={16} color="#EF4444" />
                  <Text style={styles.errorText}>{urlError}</Text>
                </View>
              )}
            </View>

            <View style={styles.urlModalButtons}>
              <TouchableOpacity style={styles.urlCancelButton} onPress={cancelUrlInput}>
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
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    paddingTop: Platform.OS === "android" ? 15 : 15,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
    marginHorizontal: 20,
  },
  headerTitle: {
    fontSize: 22,
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
  headerRight: {
    width: 40,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    color: "#FFFFFF",
    marginTop: 15,
    fontWeight: "500",
  },
  imageSection: {
    marginVertical: 20,
  },
  imageContainer: {
    position: "relative",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  imagePreview: {
    width: "100%",
    height: 200,
    resizeMode: "cover",
  },
  imageOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  removeImageButton: {
    position: "absolute",
    top: 12,
    right: 12,
  },
  removeImageButtonInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  editImageButton: {
    position: "absolute",
    top: 12,
    right: 52,
  },
  editImageButtonInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  imageLabel: {
    position: "absolute",
    bottom: 16,
    left: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  imageLabelText: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  addImageContainer: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#E2E8F0",
    borderStyle: "dashed",
  },
  addImageGradient: {
    padding: 40,
    alignItems: "center",
  },
  addImageIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  addImageTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 8,
  },
  addImageSubtitle: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
  },
  fieldContainer: {
    marginBottom: 24,
  },
  fieldHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  fieldLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  fieldIcon: {
    marginRight: 8,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
  },
  fieldCounter: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  inputContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  inputError: {
    borderColor: "#EF4444",
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#1E293B",
  },
  multilineInput: {
    height: 100,
    textAlignVertical: "top",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    paddingHorizontal: 4,
  },
  errorText: {
    fontSize: 14,
    color: "#EF4444",
    marginLeft: 6,
    flex: 1,
  },
  privacySection: {
    marginBottom: 24,
  },
  privacyOptions: {
    gap: 12,
  },
  privacyOption: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  privacyOptionActive: {
    borderColor: "#4F46E5",
    backgroundColor: "#4F46E5",
  },
  privacyOptionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  privacyOptionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
    marginLeft: 12,
  },
  privacyOptionTitleActive: {
    color: "#FFFFFF",
  },
  privacyOptionDesc: {
    fontSize: 14,
    color: "#64748B",
    lineHeight: 20,
  },
  privacyOptionDescActive: {
    color: "rgba(255, 255, 255, 0.8)",
  },
  saveButtonContainer: {
    marginTop: 20,
  },
  saveButton: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  saveButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  saveButtonLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "flex-end",
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#CBD5E1",
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 8,
    marginBottom: 8,
  },
  imageOptionsModal: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    maxHeight: "70%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  imageOptionsContainer: {
    padding: 20,
    gap: 16,
  },
  imageOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  imageOptionGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  imageOptionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
    flex: 1,
  },
  imageOptionSubtitle: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 2,
  },
  urlInputModal: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    maxHeight: "50%",
  },
  urlInputContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  urlInput: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#1E293B",
  },
  urlModalButtons: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 12,
  },
  urlCancelButton: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  urlCancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#64748B",
  },
  urlConfirmButton: {
    flex: 1,
    backgroundColor: "#4F46E5",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  urlConfirmButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
})

export default EditGroupScreen
