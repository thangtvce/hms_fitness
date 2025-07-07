
import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
  Dimensions,
  Animated,
  Platform,
  Modal,
  KeyboardAvoidingView,
  Linking,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, Feather, MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { updatePost, getAllTags } from "services/apiCommunityService";
import { apiUploadImageCloudService } from "services/apiUploadImageCloudService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DynamicStatusBar from "screens/statusBar/DynamicStatusBar";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

const { width, height } = Dimensions.get("window");
  // Validation functions (match backend DataAnnotations)
  const validateUserId = (id) => {
    if (id === undefined || id === null) return "UserId is required.";
    if (!Number.isInteger(id) || id < 1) return "UserId must be a positive integer.";
    return null;
  };

  const validateGroupId = (id) => {
    if (id === undefined || id === null || id === "") return null;
    if (!Number.isInteger(id) || id < 1) return "GroupId must be a positive integer if provided.";
    return null;
  };

  // Only validate thumbnail length for the final URL (cloudImageUrl or direct URL), not for base64
  const validateThumbnail = (thumb) => {
    if (!thumb) return null;
    if (typeof thumb !== "string") return null;
    if (thumb.startsWith("data:image")) return null;
    if ((thumb.startsWith("http://") || thumb.startsWith("https://")) && thumb.length > 255) {
      return "Thumbnail URL cannot exceed 255 characters.";
    }
    return null;
  };

  const validateContent = (text) => {
    if (!text || !text.trim()) return "Content is required.";
    if (text.trim().length < 1 || text.trim().length > 500) return "Content must be between 1 and 500 characters.";
    return null;
  };

  const validateStatus = (status) => {
    if (!status) return null;
    if (status.length > 20) return "Status cannot exceed 20 characters.";
    if (!/^(active|inactive)$/.test(status)) return "Status must be 'active', 'inactive'.";
    return null;
  };
const EditPostScreen = ({ route, navigation }) => {
  const { post } = route.params || {};

  if (!post || !post.postId) {
    Alert.alert("Error", "Invalid post data. Please try again.", [
      {
        text: "OK",
        onPress: () => navigation.goBack(),
      },
    ]);
    return null;
  }

  const [content, setContent] = useState(post.content || "");
  const [thumbnail, setThumbnail] = useState(post.thumbnail || "");
  const [tags, setTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState(post.tagIds || []);
  const [contentLength, setContentLength] = useState(post.content?.length || 0);
  const [loading, setLoading] = useState(false);
  const [tagLoading, setTagLoading] = useState(true);
  const [error, setError] = useState("");
  const [showImageOptions, setShowImageOptions] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [hasGalleryPermission, setHasGalleryPermission] = useState(true);
  const [hasCameraPermission, setHasCameraPermission] = useState(true);
  const [imageUploading, setImageUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [urlError, setUrlError] = useState("");
  const [cloudImageUrl, setCloudImageUrl] = useState("");

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  const DEFAULT_IMAGE = "DEFAULT_IMAGE";

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    return () => {
      fadeAnim.setValue(0);
      slideAnim.setValue(30);
      scaleAnim.setValue(0.95);
    };
  }, []);

  useEffect(() => {
    const progress = Math.min(contentLength / 2000, 1);
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [contentLength]);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const userStr = await AsyncStorage.getItem("user");
      if (userStr) {
        setCurrentUser(JSON.parse(userStr));
      }
      const tagsData = await getAllTags();
      setTags(tagsData || []);
    } catch (error) {
    } finally {
      setTagLoading(false);
    }
  };

  const createFormDataFromBase64 = (base64String, fileName = `image-${Date.now()}.jpg`) => {
    const formData = new FormData();
    const mimeTypeMatch = base64String.match(/^data:(image\/[a-z]+);base64,/);
    const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : "image/jpeg";
    const cleanedBase64 = base64String.replace(/^data:image\/[a-z]+;base64,/, "");

    formData.append("file", {
      uri: `data:${mimeType};base64,${cleanedBase64}`,
      type: mimeType,
      name: fileName,
    });

    return formData;
  };

  const isValidUrl = (url) => {
    const urlRegex = /^(https?:\/\/[^\s$.?#].[^\s]*)$/i;
    return urlRegex.test(url);
  };

  const checkImageUrl = async (url) => {
    try {
      const response = await fetch(url, { method: "HEAD" });
      const contentType = response.headers.get("content-type");
      return response.ok && contentType?.startsWith("image/");
    } catch (error) {
      return false;
    }
  };

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        setHasGalleryPermission(false);
        Alert.alert(
          "Permission Required",
          "To select images, please grant access to your photo library in your device settings.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }
      setHasGalleryPermission(true);
      setImageUploading(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
        base64: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0];
        if (selectedAsset.base64) {
          const base64Image = `data:image/jpeg;base64,${selectedAsset.base64}`;
          setThumbnail(base64Image); // chỉ preview base64
          setCloudImageUrl(""); // reset url cloud, sẽ upload khi submit
        } else {
          setThumbnail(selectedAsset.uri);
          setCloudImageUrl("");
          Alert.alert("Warning", "Base64 not available. Using local URI, which may not persist.");
        }
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick image.");
    } finally {
      setImageUploading(false);
      setShowImageOptions(false);
    }
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        setHasCameraPermission(false);
        Alert.alert(
          "Permission Required",
          "To take photos, please grant access to your camera in your device settings.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }
      setHasCameraPermission(true);
      setImageUploading(true);
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
        base64: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0];
        if (selectedAsset.base64) {
          const base64Image = `data:image/jpeg;base64,${selectedAsset.base64}`;
          setThumbnail(base64Image); // chỉ preview base64
          setCloudImageUrl(""); // reset url cloud, sẽ upload khi submit
        } else {
          setThumbnail(selectedAsset.uri);
          setCloudImageUrl("");
          Alert.alert("Warning", "Base64 not available. Using local URI, which may not persist.");
        }
      }
    } catch (error) {
      Alert.alert("Error", "Failed to take photo.");
    } finally {
      setImageUploading(false);
      setShowImageOptions(false);
    }
  };

  const handleUrlImage = () => {
    setShowImageOptions(false);
    setShowUrlInput(true);
    setImageUrl("");
    setUrlError("");
  };

  const confirmUrlImage = async () => {
    if (!imageUrl.trim()) {
      setUrlError("Please enter an image URL.");
      return;
    }
    if (!isValidUrl(imageUrl)) {
      setUrlError("Please enter a valid URL starting with http:// or https://.");
      return;
    }

    setImageUploading(true);
    const isImageReachable = await checkImageUrl(imageUrl);
    setImageUploading(false);

    if (!isImageReachable) {
      setUrlError("The URL does not point to a valid image or is unreachable.");
      return;
    }

    setThumbnail(imageUrl);
    setCloudImageUrl(imageUrl);
    setShowUrlInput(false);
  };

  const cancelUrlInput = () => {
    setShowUrlInput(false);
    setImageUrl("");
    setUrlError("");
  };

  const handleRemoveImage = () => {
    Alert.alert("Remove Image", "Are you sure you want to remove this image?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          setThumbnail("");
          setCloudImageUrl("");
          Animated.sequence([
            Animated.timing(scaleAnim, { toValue: 0.95, duration: 150, useNativeDriver: true }),
            Animated.timing(scaleAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
          ]).start();
        },
      },
    ]);
  };

  const handleContentChange = (text) => {
    setContent(text);
    setContentLength(text.length);
    if (error) setError("");
  };

  const handleSubmit = async () => {
    // Validate all fields before submit
    const userId = currentUser?.userId;
    const statusValue = "active";
    const userIdError = validateUserId(userId);
    const groupIdError = validateGroupId(post.groupId);
    const thumbError = validateThumbnail(cloudImageUrl || thumbnail);
    const contentError = validateContent(content);
    const statusError = validateStatus(statusValue);

    if (userIdError) {
      setError(userIdError);
      return;
    }
    if (groupIdError) {
      setError(groupIdError);
      return;
    }
    if (thumbError) {
      setError(thumbError);
      return;
    }
    if (contentError) {
      setError(contentError);
      return;
    }
    if (statusError) {
      setError(statusError);
      return;
    }

    setLoading(true);
    setError("");
    let finalImageUrl = cloudImageUrl;
    try {
      // Nếu thumbnail là base64 và chưa upload thì upload tại đây
      if (thumbnail && typeof thumbnail === "string" && thumbnail.startsWith("data:image") && !cloudImageUrl) {
        const formData = createFormDataFromBase64(thumbnail);
        // Debug: log base64 length before upload
        console.log('Uploading base64 thumbnail, length:', thumbnail.length);
        const uploadResult = await apiUploadImageCloudService.uploadImage(formData);
        // Debug: log returned imageUrl after upload
        console.log('Cloud imageUrl after upload:', uploadResult.imageUrl);
        if (!uploadResult.isError && uploadResult.imageUrl) {
          finalImageUrl = uploadResult.imageUrl;
          setCloudImageUrl(uploadResult.imageUrl);
        } else {
          setError("Image upload failed. Please try selecting the image again.");
          setLoading(false);
          return;
        }
      }
      const postDto = {
        postId: post.postId,
        userId,
        groupId: post.groupId,
        thumbnail: finalImageUrl || DEFAULT_IMAGE,
        content: content.trim(),
        status: statusValue,
        tagIds: selectedTags,
      };
      await updatePost(post.postId, postDto);
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.05, duration: 200, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
      Alert.alert("Success! 🎉", "Your post has been updated successfully!", [
        {
          text: "Great!",
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      let errorMessage = "Failed to update post. Please try again.";
      try {
        const parsedErrors = JSON.parse(error.message);
        errorMessage = Object.values(parsedErrors)
          .flat()
          .join("; ") || error.message;
      } catch {
        errorMessage = error.message;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const toggleTag = (tagId) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const getProgressColor = () => {
    if (contentLength < 1000) return "#10B981";
    if (contentLength < 1500) return "#F59E0B";
    if (contentLength < 1800) return "#EF4444";
    return "#DC2626";
  };

  const canPublish = content.trim().length > 0 && contentLength <= 2000 && !loading;

  return (
    <SafeAreaView style={styles.safeArea}>
      <DynamicStatusBar backgroundColor="#4F46E5" />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {loading && !tagLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4F46E5" />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : (
          <>
            <Animated.View
              style={{
                ...styles.header,
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              }}
            >
              <LinearGradient colors={["#4F46E5", "#7C3AED"]} style={styles.headerGradient}>
                <View style={styles.headerContent}>
                  <TouchableOpacity
                    style={styles.headerButton}
                    onPress={() => navigation.goBack()}
                    accessibilityLabel="Cancel"
                    accessibilityRole="button"
                  >
                    <Ionicons name="close" size={24} color="#FFFFFF" />
                  </TouchableOpacity>

                  <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>Edit Your Post</Text>
                    <Text style={styles.headerSubtitle}>Update your community story</Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.publishButton, !canPublish && styles.publishButtonDisabled]}
                    onPress={handleSubmit}
                    disabled={!canPublish}
                    accessibilityLabel="Save Post"
                    accessibilityRole="button"
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Feather name="save" size={16} color="#FFFFFF" />
                        <Text style={styles.publishButtonText}>Save</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </Animated.View>

            <ScrollView
              style={styles.content}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Animated.View
                style={{
                  ...styles.userSection,
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
                }}
              >
                <View style={styles.userInfo}>
                  <View style={styles.userAvatar}>
                    <LinearGradient colors={["#4F46E5", "#7C3AED"]} style={styles.avatarGradient}>
                      {currentUser?.avatar ? (
                        <Image source={{ uri: currentUser.avatar }} style={styles.avatarImage} />
                      ) : (
                        <Text style={styles.avatarText}>
                          {currentUser?.fullName?.charAt(0)?.toUpperCase() || "U"}
                        </Text>
                      )}
                    </LinearGradient>
                  </View>
                  <View style={styles.userDetails}>
                    <Text style={styles.userName}>
                      {currentUser?.fullName || "Health Community Member"}
                    </Text>
                    <View style={styles.privacyContainer}>
                      <Ionicons name="globe-outline" size={14} color="#10B981" />
                      <Text style={styles.privacyText}>Sharing publicly</Text>
                    </View>
                  </View>
                </View>
              </Animated.View>

              <Animated.View
                style={{
                  ...styles.inputSection,
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
                }}
              >
                <TextInput
                  style={styles.contentInput}
                  placeholder="Update your health journey, tips, or questions..."
                  placeholderTextColor="#94A3B8"
                  value={content}
                  onChangeText={handleContentChange}
                  multiline
                  maxLength={2000}
                  textAlignVertical="top"
                  autoFocus={false}
                  accessibilityLabel="Post Content"
                  accessibilityRole="textbox"
                />

                <View style={styles.progressSection}>
                  <View style={styles.progressBarContainer}>
                    <Animated.View
                      style={{
                        ...styles.progressBar,
                        width: progressAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ["0%", "100%"],
                        }),
                        backgroundColor: getProgressColor(),
                      }}
                    />
                  </View>
                  <Text style={[styles.characterCount, { color: getProgressColor() }]}> 
                    {contentLength}/2000
                    {contentLength > 1800 && (
                      <Text style={styles.warningText}> • Almost at limit!</Text>
                    )}
                  </Text>
                </View>
              </Animated.View>

              {thumbnail && thumbnail !== DEFAULT_IMAGE && (
                <Animated.View
                  style={{
                    ...styles.imageSection,
                    opacity: fadeAnim,
                    transform: [{ scale: scaleAnim }],
                  }}
                >
                  <TouchableOpacity
                    style={styles.imageContainer}
                    onPress={() => setShowImageOptions(true)}
                    accessibilityLabel="Edit Image"
                    accessibilityRole="button"
                  >
                    <Image source={{ uri: thumbnail }} style={styles.imagePreview} />
                    <LinearGradient
                      colors={["transparent", "rgba(0,0,0,0.3)"]}
                      style={styles.imageOverlay}
                    />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={handleRemoveImage}
                      accessibilityLabel="Remove Image"
                      accessibilityRole="button"
                    >
                      <View style={styles.removeImageButtonInner}>
                        <Ionicons name="close" size={18} color="#FFFFFF" />
                      </View>
                    </TouchableOpacity>
                    <View style={styles.imageLabel}>
                      <Ionicons name="image" size={16} color="#FFFFFF" />
                      <Text style={styles.imageLabelText}>Tap to edit</Text>
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              )}

              <Animated.View
                style={{
                  ...styles.actionsSection,
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                }}
              >
                <Text style={styles.sectionTitle}>
                  <MaterialIcons name="add-circle-outline" size={20} color="#4F46E5" /> Enhance Your
                  Post
                </Text>

                <View style={styles.actionCards}>
                  <TouchableOpacity
                    style={[styles.actionCard, thumbnail && styles.actionCardActive]}
                    onPress={() => setShowImageOptions(true)}
                    activeOpacity={0.7}
                    accessibilityLabel="Add or Edit Photo"
                    accessibilityRole="button"
                  >
                    <LinearGradient
                      colors={thumbnail ? ["#10B981", "#059669"] : ["#F8FAFC", "#F1F5F9"]}
                      style={styles.actionCardGradient}
                    >
                      <View style={styles.actionCardIcon}>
                        <Ionicons
                          name={thumbnail ? "checkmark-circle" : "camera"}
                          size={24}
                          color={thumbnail ? "#FFFFFF" : "#4F46E5"}
                        />
                      </View>
                      <View style={styles.actionCardContent}>
                        <Text
                          style={[styles.actionCardTitle, thumbnail && styles.actionCardTitleActive]}
                        >
                          {thumbnail ? "Image Added" : "Add Photo"}
                        </Text>
                        <Text
                          style={[
                            styles.actionCardSubtitle,
                            thumbnail && styles.actionCardSubtitleActive,
                          ]}
                        >
                          {thumbnail ? "Tap to change" : "Share a moment"}
                        </Text>
                      </View>
                      <Ionicons
                        name="chevron-forward"
                        size={20}
                        color={thumbnail ? "#FFFFFF" : "#64748B"}
                      />
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionCard, selectedTags.length > 0 && styles.actionCardActive]}
                    onPress={() => setShowTagModal(true)}
                    activeOpacity={0.7}
                    accessibilityLabel="Add or Edit Tags"
                    accessibilityRole="button"
                  >
                    <LinearGradient
                      colors={
                        selectedTags.length > 0 ? ["#8B5CF6", "#7C3AED"] : ["#F8FAFC", "#F1F5F9"]
                      }
                      style={styles.actionCardGradient}
                    >
                      <View style={styles.actionCardIcon}>
                        <Ionicons
                          name={selectedTags.length > 0 ? "pricetag" : "pricetags-outline"}
                          size={24}
                          color={selectedTags.length > 0 ? "#FFFFFF" : "#4F46E5"}
                        />
                      </View>
                      <View style={styles.actionCardContent}>
                        <Text
                          style={[
                            styles.actionCardTitle,
                            selectedTags.length > 0 && styles.actionCardTitleActive,
                          ]}
                        >
                          {selectedTags.length > 0
                            ? `${selectedTags.length} Tags Selected`
                            : "Add Tags"}
                        </Text>
                        <Text
                          style={[
                            styles.actionCardSubtitle,
                            selectedTags.length > 0 && styles.actionCardSubtitleActive,
                          ]}
                        >
                          {selectedTags.length > 0
                            ? "Help others find your post"
                            : "Categorize your post"}
                        </Text>
                      </View>
                      <Ionicons
                        name="chevron-forward"
                        size={20}
                        color={selectedTags.length > 0 ? "#FFFFFF" : "#64748B"}
                      />
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </Animated.View>

              {selectedTags.length > 0 && (
                <Animated.View
                  style={{
                    ...styles.selectedTagsSection,
                    opacity: fadeAnim,
                    transform: [{ scale: scaleAnim }],
                  }}
                >
                  <View style={styles.selectedTagsHeader}>
                    <Text style={styles.selectedTagsTitle}>
                      <Ionicons name="pricetag" size={16} color="#8B5CF6" /> Selected Tags
                    </Text>
                    <TouchableOpacity
                      onPress={() => setShowTagModal(true)}
                      accessibilityLabel="Edit Tags"
                      accessibilityRole="button"
                    >
                      <Text style={styles.editTagsText}>Edit</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.selectedTagsContainer}>
                    {selectedTags.slice(0, 6).map((tagId) => {
                      const tag = tags.find((t) => t.tagId === tagId);
                      return (
                        <View key={tagId} style={styles.selectedTag}>
                          <Text style={styles.selectedTagText}>#{tag?.tagName}</Text>
                        </View>
                      );
                    })}
                    {selectedTags.length > 6 && (
                      <View style={styles.moreTagsIndicator}>
                        <Text style={styles.moreTagsText}>+{selectedTags.length - 6}</Text>
                      </View>
                    )}
                  </View>
                </Animated.View>
              )}

              {error && (
                <Animated.View
                  style={{
                    ...styles.errorSection,
                    opacity: fadeAnim,
                    transform: [{ scale: scaleAnim }],
                  }}
                >
                  <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle" size={20} color="#EF4444" />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                </Animated.View>
              )}

              <Animated.View
                style={{
                  ...styles.tipsSection,
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                }}
              >
                <View style={styles.tipsContainer}>
                  <View style={styles.tipsHeader}>
                    <Ionicons name="bulb" size={20} color="#F59E0B" />
                    <Text style={styles.tipsTitle}>Editing Tips</Text>
                  </View>
                  <Text style={styles.tipsText}>
                    • Update your health experiences{"\n"}• Refine questions for community support
                    {"\n"}• Adjust tags to reach the right audience{"\n"}• Keep your message clear
                    and respectful
                  </Text>
                </View>
              </Animated.View>

              <View style={styles.bottomSpacing} />
            </ScrollView>

            <Modal
              visible={showImageOptions}
              transparent={true}
              animationType="slide"
              onRequestClose={() => setShowImageOptions(false)}
            >
              <View style={styles.modalOverlay}>
                <Animated.View
                  style={{
                    ...styles.imageOptionsModal,
                    transform: [{ scale: scaleAnim }],
                  }}
                >
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Add Photo</Text>
                    <TouchableOpacity
                      onPress={() => setShowImageOptions(false)}
                      accessibilityLabel="Close Modal"
                      accessibilityRole="button"
                    >
                      <Ionicons name="close" size={24} color="#64748B" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.imageOptionsContainer}>
                    <TouchableOpacity
                      style={styles.imageOption}
                      onPress={handleTakePhoto}
                      accessibilityLabel="Take Photo"
                      accessibilityRole="button"
                    >
                      <LinearGradient
                        colors={["#4F46E5", "#7C3AED"]}
                        style={styles.imageOptionGradient}
                      >
                        <Ionicons name="camera" size={32} color="#FFFFFF" />
                      </LinearGradient>
                      <Text style={styles.imageOptionTitle}>Take Photo</Text>
                      <Text style={styles.imageOptionSubtitle}>Use your camera</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.imageOption}
                      onPress={handlePickImage}
                      accessibilityLabel="Choose from Gallery"
                      accessibilityRole="button"
                    >
                      <LinearGradient
                        colors={["#10B981", "#059669"]}
                        style={styles.imageOptionGradient}
                      >
                        <Ionicons name="images" size={32} color="#FFFFFF" />
                      </LinearGradient>
                      <Text style={styles.imageOptionTitle}>Choose from Gallery</Text>
                      <Text style={styles.imageOptionSubtitle}>Select existing photo</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.imageOption}
                      onPress={handleUrlImage}
                      accessibilityLabel="Add from URL"
                      accessibilityRole="button"
                    >
                      <LinearGradient
                        colors={["#F59E0B", "#D97706"]}
                        style={styles.imageOptionGradient}
                      >
                        <Ionicons name="link" size={32} color="#FFFFFF" />
                      </LinearGradient>
                      <Text style={styles.imageOptionTitle}>Add from URL</Text>
                      <Text style={styles.imageOptionSubtitle}>Paste an image link</Text>
                    </TouchableOpacity>
                  </View>
                </Animated.View>
              </View>
            </Modal>

            <Modal
              visible={showUrlInput}
              transparent={true}
              animationType="slide"
              onRequestClose={cancelUrlInput}
            >
              <View style={styles.modalOverlay}>
                <Animated.View
                  style={{
                    ...styles.imageOptionsModal,
                    transform: [{ scale: scaleAnim }],
                  }}
                >
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Add Image from URL</Text>
                    <TouchableOpacity
                      onPress={cancelUrlInput}
                      accessibilityLabel="Close URL Input"
                      accessibilityRole="button"
                    >
                      <Ionicons name="close" size={24} color="#64748B" />
                    </TouchableOpacity>
                  </View>

                  <TextInput
                    style={styles.urlInput}
                    placeholder="Enter image URL (e.g., https://example.com/image.jpg)"
                    placeholderTextColor="#94A3B8"
                    value={imageUrl}
                    onChangeText={setImageUrl}
                    autoCapitalize="none"
                    keyboardType="url"
                    accessibilityLabel="Image URL"
                    accessibilityRole="textbox"
                  />

                  {urlError ? (
                    <View style={styles.errorContainer}>
                      <Ionicons name="alert-circle" size={20} color="#EF4444" />
                      <Text style={styles.errorText}>{urlError}</Text>
                    </View>
                  ) : null}

                  <View style={styles.urlButtonContainer}>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={cancelUrlInput}
                      accessibilityLabel="Cancel URL Input"
                      accessibilityRole="button"
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.confirmButton, imageUploading && styles.confirmButtonDisabled]}
                      onPress={confirmUrlImage}
                      disabled={imageUploading}
                      accessibilityLabel="Confirm URL"
                      accessibilityRole="button"
                    >
                      {imageUploading ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.confirmButtonText}>Confirm</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </Animated.View>
              </View>
            </Modal>

            <Modal
              visible={showTagModal}
              transparent={true}
              animationType="slide"
              onRequestClose={() => setShowTagModal(false)}
            >
              <View style={styles.modalOverlay}>
                <Animated.View
                  style={{
                    ...styles.tagsModal,
                    transform: [{ scale: scaleAnim }],
                  }}
                >
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Select Tags</Text>
                    <TouchableOpacity
                      onPress={() => setShowTagModal(false)}
                      accessibilityLabel="Close Tags Modal"
                      accessibilityRole="button"
                    >
                      <Ionicons name="close" size={24} color="#64748B" />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.tagsDescription}>
                    Choose relevant tags to help others discover your post
                  </Text>

                  {tagLoading ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="large" color="#4F46E5" />
                      <Text style={styles.loadingText}>Loading tags...</Text>
                    </View>
                  ) : (
                    <ScrollView
                      style={styles.tagsScrollView}
                      showsVerticalScrollIndicator={false}
                      contentContainerStyle={{ paddingBottom: 20 }}
                    >
                      <View style={styles.tagsGrid}>
                        {tags.map((tag) => (
                          <TouchableOpacity
                            key={tag.tagId}
                            style={[
                              styles.tagItem,
                              selectedTags.includes(tag.tagId) && styles.tagItemSelected,
                            ]}
                            onPress={() => toggleTag(tag.tagId)}
                            activeOpacity={0.7}
                            accessibilityLabel={`Tag ${tag.tagName}`}
                            accessibilityRole="button"
                          >
                            <LinearGradient
                              colors={
                                selectedTags.includes(tag.tagId)
                                  ? ["#8B5CF6", "#7C3AED"]
                                  : ["#F8FAFC", "#F1F5F9"]
                              }
                              style={styles.tagItemGradient}
                            >
                              <Text
                                style={[
                                  styles.tagText,
                                  selectedTags.includes(tag.tagId) && styles.tagTextSelected,
                                ]}
                              >
                                #{tag.tagName}
                              </Text>
                              {selectedTags.includes(tag.tagId) && (
                                <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                              )}
                            </LinearGradient>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                  )}

                  <View style={styles.tagsModalFooter}>
                    <Text style={styles.selectedCount}>
                      {selectedTags.length} tag{selectedTags.length !== 1 ? "s" : ""} selected
                    </Text>
                    <TouchableOpacity
                      style={styles.doneButton}
                      onPress={() => setShowTagModal(false)}
                      accessibilityLabel="Done Selecting Tags"
                      accessibilityRole="button"
                    >
                      <Text style={styles.doneButtonText}>Done</Text>
                    </TouchableOpacity>
                  </View>
                </Animated.View>
              </View>
            </Modal>
          </>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#4F46E5",
  },
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  headerGradient: {
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
    marginHorizontal: 16,
  },
  headerTitle: {
    fontSize: 20,
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
  publishButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    gap: 6,
  },
  publishButtonDisabled: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    opacity: 0.6,
  },
  publishButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  content: {
    flex: 1,
  },
  userSection: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  userAvatar: {
    marginRight: 16,
  },
  avatarGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 4,
  },
  privacyContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  privacyText: {
    fontSize: 14,
    color: "#10B981",
    fontWeight: "500",
  },
  inputSection: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  contentInput: {
    fontSize: 18,
    lineHeight: 26,
    color: "#1E293B",
    minHeight: 120,
    textAlignVertical: "top",
    paddingVertical: 0,
    marginBottom: 16,
  },
  progressSection: {
    gap: 8,
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: "#E2E8F0",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    borderRadius: 2,
  },
  characterCount: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: "right",
  },
  warningText: {
    fontSize: 12,
    fontWeight: "600",
  },
  imageSection: {
    marginHorizontal: 16,
    marginTop: 12,
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
    height: 240,
    resizeMode: "cover",
  },
  imageOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  removeImageButton: {
    position: "absolute",
    top: 12,
    right: 12,
  },
  removeImageButtonInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  imageLabel: {
    position: "absolute",
    bottom: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  imageLabelText: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "500",
  },
  actionsSection: {
    marginHorizontal: 16,
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionCards: {
    gap: 12,
  },
  actionCard: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  actionCardActive: {
    shadowColor: "#10B981",
    shadowOpacity: 0.2,
  },
  actionCardGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
  },
  actionCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  actionCardContent: {
    flex: 1,
  },
  actionCardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 4,
  },
  actionCardTitleActive: {
    color: "#FFFFFF",
  },
  actionCardSubtitle: {
    fontSize: 14,
    color: "#64748B",
  },
  actionCardSubtitleActive: {
    color: "rgba(255, 255, 255, 0.8)",
  },
  selectedTagsSection: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  selectedTagsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  selectedTagsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
  },
  editTagsText: {
    fontSize: 14,
    color: "#8B5CF6",
    fontWeight: "500",
  },
  selectedTagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  selectedTag: {
    backgroundColor: "#F3E8FF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E9D5FF",
  },
  selectedTagText: {
    fontSize: 14,
    color: "#8B5CF6",
    fontWeight: "500",
  },
  moreTagsIndicator: {
    backgroundColor: "#E2E8F0",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  moreTagsText: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
  },
  errorSection: {
    marginHorizontal: 16,
    marginTop: 12,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FECACA",
    gap: 8,
  },
  errorText: {
    fontSize: 14,
    color: "#DC2626",
    fontWeight: "500",
    flex: 1,
  },
  tipsSection: {
    marginHorizontal: 16,
    marginTop: 12,
  },
  tipsContainer: {
    backgroundColor: "#FFFBEB",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  tipsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#92400E",
  },
  tipsText: {
    fontSize: 14,
    color: "#92400E",
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  imageOptionsModal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  tagsModal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    maxHeight: "90%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
  },
  imageOptionsContainer: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  imageOption: {
    flex: 1,
    alignItems: "center",
    padding: 20,
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    minWidth: 120,
  },
  imageOptionGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  imageOptionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
    textAlign: "center",
    marginBottom: 4,
  },
  imageOptionSubtitle: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
  },
  urlInput: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: "#1E293B",
    marginBottom: 16,
  },
  urlButtonContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cancelButtonText: {
    fontSize: 16,
    color: "#64748B",
    fontWeight: "600",
  },
  confirmButton: {
    backgroundColor: "#4F46E5",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 100,
    alignItems: "center",
  },
  confirmButtonDisabled: {
    backgroundColor: "#A5B4FC",
    opacity: 0.6,
  },
  confirmButtonText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  tagsDescription: {
    fontSize: 16,
    color: "#64748B",
    marginBottom: 20,
    lineHeight: 22,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
  loadingText: {
    fontSize: 16,
    color: "#4F46E5",
    marginTop: 12,
    fontWeight: "500",
  },
  tagsScrollView: {
    maxHeight: 300,
    marginBottom: 20,
  },
  tagsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "space-between",
  },
  tagItem: {
    borderRadius: 16,
    overflow: "hidden",
    flex: 1,
    minWidth: "48%",
    maxWidth: "48%",
  },
  tagItemSelected: {
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  tagItemGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  tagText: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
    flex: 1,
  },
  tagTextSelected: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  tagsModalFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  selectedCount: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
  },
  doneButton: {
    backgroundColor: "#4F46E5",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  doneButtonText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  bottomSpacing: {
    height: 40,
  },
});

export default EditPostScreen;