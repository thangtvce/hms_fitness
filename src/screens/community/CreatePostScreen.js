import { useState,useEffect,useRef } from "react";
import {
  View,
  Text,
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
  TextInput,
  Keyboard,
  TouchableWithoutFeedback,
  PanResponder,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons,Feather,MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { createPost,getAllTags } from "services/apiCommunityService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiUploadImageCloudService } from "services/apiUploadImageCloudService";
import { Linking } from "react-native";
import { showErrorFetchAPI,showErrorMessage,showSuccessMessage } from "utils/toastUtil";
import { RichEditor,RichToolbar,actions } from "react-native-pell-rich-editor";

const { width,height } = Dimensions.get("window");

const CreatePostScreen = ({ route,navigation }) => {
  const { groupId } = route.params;
  const [content,setContent] = useState("");
  const [thumbnail,setThumbnail] = useState("");
  const [tags,setTags] = useState([]);
  const [selectedTags,setSelectedTags] = useState([]);
  const [contentLength,setContentLength] = useState(0);
  const [loading,setLoading] = useState(false);
  const [tagLoading,setTagLoading] = useState(true);
  const [error,setError] = useState("");
  const [showImageOptions,setShowImageOptions] = useState(false);
  const [showTagModal,setShowTagModal] = useState(false);
  const [keyboardHeight,setKeyboardHeight] = useState(0);
  const [isKeyboardVisible,setIsKeyboardVisible] = useState(false);
  const [currentUser,setCurrentUser] = useState(null);
  const [hasGalleryPermission,setHasGalleryPermission] = useState(null);
  const [hasCameraPermission,setHasCameraPermission] = useState(null);
  const [imageUploading,setImageUploading] = useState(false);
  const [cloudImageUrl,setCloudImageUrl] = useState("");
  const [showUrlInput,setShowUrlInput] = useState(false);
  const [imageUrl,setImageUrl] = useState("");
  const [urlError,setUrlError] = useState("");

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const richText = useRef(null);
  const containerRef = useRef();

  const DEFAULT_IMAGE = "DEFAULT_IMAGE";

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => false,
      onPanResponderGrant: () => {
        if (isKeyboardVisible) {
          Keyboard.dismiss();
        }
      },
    })
  ).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,{
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim,{
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim,{
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
  },[]);

  useEffect(() => {
    const progress = Math.min(contentLength / 500,1);
    Animated.timing(progressAnim,{
      toValue: progress,
      duration: 300,
      useNativeDriver: false,
    }).start();
  },[contentLength]);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener("keyboardDidShow",(e) => {
      setKeyboardHeight(e.endCoordinates.height);
      setIsKeyboardVisible(true);
    });

    const keyboardDidHideListener = Keyboard.addListener("keyboardDidHide",() => {
      setKeyboardHeight(0);
      setIsKeyboardVisible(false);
    });

    const keyboardWillShowListener = Keyboard.addListener("keyboardWillShow",(e) => {
      setKeyboardHeight(e.endCoordinates.height);
      setIsKeyboardVisible(true);
    });

    const keyboardWillHideListener = Keyboard.addListener("keyboardWillHide",() => {
      setKeyboardHeight(0);
      setIsKeyboardVisible(false);
    });

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
      keyboardWillShowListener?.remove();
      keyboardWillHideListener?.remove();
    };
  },[]);

  useEffect(() => {
    loadInitialData();
  },[]);

  const loadInitialData = async () => {
    try {
      const userStr = await AsyncStorage.getItem("user");
      if (userStr) {
        setCurrentUser(JSON.parse(userStr));
      }
      const tagsData = await getAllTags();
      setTags(tagsData || []);
    } catch (error) {
      showErrorFetchAPI(error);
    } finally {
      setTagLoading(false);
    }
  };

  const createFormDataFromBase64 = (base64String,fileName = `image-${Date.now()}.jpg`) => {
    const formData = new FormData();
    const mimeTypeMatch = base64String.match(/^data:(image\/[a-z]+);base64,/);
    const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : "image/jpeg";
    const cleanedBase64 = base64String.replace(/^data:image\/[a-z]+;base64,/,"");

    formData.append("file",{
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
      const response = await fetch(url,{ method: "HEAD" });
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
            { text: "Cancel",style: "cancel" },
            { text: "Open Settings",onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }

      setHasGalleryPermission(true);
      setImageUploading(true);

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16,9],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0];
        if (selectedAsset.base64) {
          const base64Image = `data:image/jpeg;base64,${selectedAsset.base64}`;
          setThumbnail(base64Image);
          setCloudImageUrl("");
        } else {
          setThumbnail(selectedAsset.uri);
          setCloudImageUrl("");
          showErrorMessage("Base64 not available. Using local URI, which may not persist.");
        }
      }
    } catch (error) {
      showErrorFetchAPI(error);
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
            { text: "Cancel",style: "cancel" },
            { text: "Open Settings",onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }

      setHasCameraPermission(true);
      setImageUploading(true);

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [16,9],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0];
        if (selectedAsset.base64) {
          const base64Image = `data:image/jpeg;base64,${selectedAsset.base64}`;
          setThumbnail(base64Image);
          setCloudImageUrl("");
        } else {
          setThumbnail(selectedAsset.uri);
          setCloudImageUrl("");
          showErrorMessage("Base64 not available. Using local URI, which may not persist.");
        }
      }
    } catch (error) {
      showErrorFetchAPI(error);
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
      showErrorMessage("Please enter an image URL.");
      return;
    }

    if (!isValidUrl(imageUrl)) {
      showErrorMessage("Please enter a valid URL starting with http:// or https://.");
      return;
    }

    setImageUploading(true);
    const isImageReachable = await checkImageUrl(imageUrl);
    setImageUploading(false);

    if (!isImageReachable) {
      showErrorMessage("The URL does not point to a valid image or is unreachable.");
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
    Alert.alert("Remove Image","Are you sure you want to remove this image?",[
      { text: "Cancel",style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          setThumbnail("");
          setCloudImageUrl("");
          Animated.sequence([
            Animated.timing(scaleAnim,{ toValue: 0.95,duration: 150,useNativeDriver: true }),
            Animated.timing(scaleAnim,{ toValue: 1,duration: 150,useNativeDriver: true }),
          ]).start();
        },
      },
    ]);
  };

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

  const validateThumbnail = (thumb) => {
    if (!thumb) return null;
    if (thumb.startsWith("data:image")) return null;
    if (thumb.length > 255) return "Thumbnail cannot exceed 255 characters.";
    return null;
  };

  const validateContent = (text) => {
    if (!text || !text.trim()) return "Content is required.";
    const plainText = text.replace(/<[^>]*>/g,"").trim();
    if (plainText.length < 1 || plainText.length > 500) return "Content must be between 1 and 500 characters.";
    return null;
  };

  const validateStatus = (status) => {
    if (!status) return null;
    if (status.length > 20) return "Status cannot exceed 20 characters.";
    if (!/^(active|inactive)$/.test(status)) return "Status must be 'active', 'inactive'.";
    return null;
  };

  const handleContentChange = (html) => {
    setContent(html);
    const plainText = html.replace(/<[^>]*>/g,"");
    setContentLength(plainText.length);
    if (error) setError("");
  };

  const handleSubmit = async () => {
    const userId = currentUser?.userId;
    const statusValue = "active";

    const userIdError = validateUserId(userId);
    const groupIdError = validateGroupId(groupId);
    const thumbError = validateThumbnail(cloudImageUrl || thumbnail);
    const contentError = validateContent(content);
    const statusError = validateStatus(statusValue);

    if (userIdError || groupIdError || thumbError || contentError || statusError) {
      setError(userIdError || groupIdError || thumbError || contentError || statusError);
      return;
    }

    setLoading(true);
    setError("");

    let finalImageUrl = cloudImageUrl;

    try {
      if (thumbnail && thumbnail.startsWith("data:image") && !cloudImageUrl) {
        const formData = createFormDataFromBase64(thumbnail);
        const uploadResult = await apiUploadImageCloudService.uploadImage(formData);
        if (!uploadResult.isError && uploadResult.imageUrl) {
          finalImageUrl = uploadResult.imageUrl;
          setCloudImageUrl(uploadResult.imageUrl);
        } else {
          showErrorMessage("Image upload failed. Please try selecting the image again.");
          setLoading(false);
          return;
        }
      }

      const postDto = {
        postId: 0,
        userId,
        groupId,
        thumbnail: finalImageUrl || DEFAULT_IMAGE,
        content: content.trim(),
        status: statusValue,
        tagIds: selectedTags,
      };

      await createPost(postDto);

      Animated.sequence([
        Animated.timing(scaleAnim,{ toValue: 1.05,duration: 200,useNativeDriver: true }),
        Animated.timing(scaleAnim,{ toValue: 1,duration: 200,useNativeDriver: true }),
      ]).start();

      showSuccessMessage("Your post has been shared with the community!");
      setTimeout(() => {
        navigation.goBack();
      },1000);
    } catch (error) {
      showErrorFetchAPI(error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTag = (tagId) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev,tagId]
    );
  };

  const getProgressColor = () => {
    if (contentLength < 300) return "#0056d2";
    if (contentLength < 400) return "#F59E0B";
    if (contentLength < 450) return "#EF4444";
    return "#DC2626";
  };

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  const canPublish = content.trim().length > 0 && contentLength <= 500 && !loading;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" backgroundColor="#FFFFFF" />
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#0056d2" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Create Post</Text>
            <Text style={styles.headerSubtitle}>Share with your community</Text>
          </View>
          <TouchableOpacity
            style={[styles.publishButton,!canPublish && styles.publishButtonDisabled]}
            onPress={handleSubmit}
            disabled={!canPublish}
          >
            <LinearGradient
              colors={canPublish ? ["#0056d2","#0041a3"] : ["#E5E7EB","#D1D5DB"]}
              style={styles.publishButtonGradient}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <View style={styles.publishButtonContent}>
                  <Feather name="send" size={16} color="#FFFFFF" />
                  <Text style={styles.publishButtonText}>Post</Text>
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.mainContainer} ref={containerRef} {...panResponder.panHandlers}>
        <KeyboardAvoidingView
          style={styles.keyboardContainer}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
          <ScrollView
            style={styles.scrollContainer}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: isKeyboardVisible ? keyboardHeight + 50 : 50 },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            scrollEventThrottle={16}
            bounces={true}
            alwaysBounceVertical={false}
            nestedScrollEnabled={true}
            contentInsetAdjustmentBehavior="automatic"
          >
            <TouchableWithoutFeedback onPress={() => { }}>
              <View style={styles.formContent}>
                {/* User Info Section */}
                <Animated.View
                  style={[styles.fieldContainer,{ opacity: fadeAnim,transform: [{ translateY: slideAnim }] }]}
                >
                  <View style={styles.fieldHeader}>
                    <View style={styles.fieldLabelContainer}>
                      <Ionicons name="person-outline" size={16} color="#0056d2" style={styles.fieldIcon} />
                      <Text style={styles.fieldLabel}>Author</Text>
                    </View>
                  </View>
                  <View style={styles.userInfo}>
                    <View style={styles.userAvatar}>
                      <LinearGradient colors={["#0056d2","#0041a3"]} style={styles.avatarGradient}>
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
                      <Text style={styles.userName}>{currentUser?.fullName || "Community Member"}</Text>
                      <View style={styles.privacyContainer}>
                        <Ionicons name="globe-outline" size={14} color="#0056d2" />
                        <Text style={styles.privacyText}>Sharing publicly</Text>
                      </View>
                    </View>
                  </View>
                </Animated.View>

                {/* Content Input Section with Rich Editor */}
                <Animated.View
                  style={[styles.fieldContainer,{ opacity: fadeAnim,transform: [{ translateY: slideAnim }] }]}
                >
                  <View style={styles.fieldHeader}>
                    <View style={styles.fieldLabelContainer}>
                      <Ionicons name="document-text-outline" size={16} color="#0056d2" style={styles.fieldIcon} />
                      <Text style={styles.fieldLabel}>Content</Text>
                    </View>
                    <Text style={[styles.fieldCounter,{ color: getProgressColor() }]}>
                      {contentLength}/500
                      {contentLength > 400 && <Text style={styles.warningText}> • Almost at limit!</Text>}
                    </Text>
                  </View>
                  <View style={[styles.inputSection,error && styles.inputError]}>
                    <RichToolbar
                      editor={richText}
                      actions={[
                        actions.setBold,
                        actions.setItalic,
                        actions.setUnderline,
                        actions.insertBulletsList,
                        actions.insertOrderedList,
                        actions.undo,
                        actions.redo,
                      ]}
                      iconTint="#374151"
                      selectedIconTint="#0056d2"
                      style={styles.richToolbar}
                      iconSize={18}
                    />
                    <RichEditor
                      ref={richText}
                      onChange={handleContentChange}
                      placeholder="Share your health journey, tips, or ask questions..."
                      style={styles.richEditor}
                      initialContentHTML=""
                      editorStyle={{
                        backgroundColor: "#FFFFFF",
                        color: "#000000",
                        fontSize: 16,
                        fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
                        lineHeight: 24,
                        padding: 16,
                      }}
                    />
                    <View style={styles.progressSection}>
                      <View style={styles.progressBarContainer}>
                        <Animated.View
                          style={[
                            styles.progressBar,
                            {
                              width: progressAnim.interpolate({
                                inputRange: [0,1],
                                outputRange: ["0%","100%"],
                              }),
                              backgroundColor: getProgressColor(),
                            },
                          ]}
                        />
                      </View>
                    </View>
                  </View>
                  {error && (
                    <View style={styles.errorContainer}>
                      <Ionicons name="alert-circle" size={14} color="#EF4444" />
                      <Text style={styles.errorText}>{error}</Text>
                    </View>
                  )}
                </Animated.View>

                {/* Image Preview Section */}
                {thumbnail && thumbnail !== DEFAULT_IMAGE && (
                  <Animated.View
                    style={[styles.fieldContainer,{ opacity: fadeAnim,transform: [{ translateY: slideAnim }] }]}
                  >
                    <View style={styles.fieldHeader}>
                      <View style={styles.fieldLabelContainer}>
                        <Ionicons name="image-outline" size={16} color="#0056d2" style={styles.fieldIcon} />
                        <Text style={styles.fieldLabel}>Image</Text>
                      </View>
                    </View>
                    <View style={styles.imageContainer}>
                      <Image source={{ uri: thumbnail }} style={styles.imagePreview} />
                      <LinearGradient colors={["transparent","rgba(0,0,0,0.3)"]} style={styles.imageOverlay} />
                      <TouchableOpacity style={styles.removeImageButton} onPress={handleRemoveImage}>
                        <View style={styles.removeImageButtonInner}>
                          <Ionicons name="close" size={16} color="#FFFFFF" />
                        </View>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.editImageButton}
                        onPress={() => setShowImageOptions(true)}
                      >
                        <View style={styles.editImageButtonInner}>
                          <Ionicons name="pencil" size={16} color="#FFFFFF" />
                        </View>
                      </TouchableOpacity>
                      <View style={styles.imageLabel}>
                        <Ionicons name="image" size={14} color="#FFFFFF" />
                        <Text style={styles.imageLabelText}>Post Image</Text>
                      </View>
                    </View>
                  </Animated.View>
                )}

                {/* Action Cards Section */}
                <Animated.View
                  style={[styles.fieldContainer,{ opacity: fadeAnim,transform: [{ translateY: slideAnim }] }]}
                >
                  <View style={styles.fieldHeader}>
                    <View style={styles.fieldLabelContainer}>
                      <MaterialIcons name="add-circle-outline" size={16} color="#0056d2" style={styles.fieldIcon} />
                      <Text style={styles.fieldLabel}>Enhance Your Post</Text>
                    </View>
                  </View>
                  <View style={styles.actionCards}>
                    <TouchableOpacity
                      style={[styles.actionCard,thumbnail && styles.actionCardActive]}
                      onPress={() => setShowImageOptions(true)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.actionCardContent}>
                        <View style={styles.actionCardIcon}>
                          <Ionicons
                            name={thumbnail ? "checkmark-circle" : "camera-outline"}
                            size={24}
                            color={thumbnail ? "#0056d2" : "#6B7280"}
                          />
                        </View>
                        <View style={styles.actionCardText}>
                          <Text style={[styles.actionCardTitle,thumbnail && styles.actionCardTitleActive]}>
                            {thumbnail ? "Image Added" : "Add Photo"}
                          </Text>
                          <Text style={[styles.actionCardSubtitle,thumbnail && styles.actionCardSubtitleActive]}>
                            {thumbnail ? "Tap to change" : "Share a moment"}
                          </Text>
                        </View>
                        <Ionicons
                          name="chevron-forward"
                          size={20}
                          color={thumbnail ? "#0056d2" : "#6B7280"}
                        />
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionCard,selectedTags.length > 0 && styles.actionCardActive]}
                      onPress={() => setShowTagModal(true)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.actionCardContent}>
                        <View style={styles.actionCardIcon}>
                          <Ionicons
                            name={selectedTags.length > 0 ? "pricetag" : "pricetags-outline"}
                            size={24}
                            color={selectedTags.length > 0 ? "#0056d2" : "#6B7280"}
                          />
                        </View>
                        <View style={styles.actionCardText}>
                          <Text
                            style={[styles.actionCardTitle,selectedTags.length > 0 && styles.actionCardTitleActive]}
                          >
                            {selectedTags.length > 0 ? `${selectedTags.length} Tags Selected` : "Add Tags"}
                          </Text>
                          <Text
                            style={[styles.actionCardSubtitle,selectedTags.length > 0 && styles.actionCardSubtitleActive]}
                          >
                            {selectedTags.length > 0 ? "Help others find your post" : "Categorize your post"}
                          </Text>
                        </View>
                        <Ionicons
                          name="chevron-forward"
                          size={20}
                          color={selectedTags.length > 0 ? "#0056d2" : "#6B7280"}
                        />
                      </View>
                    </TouchableOpacity>
                  </View>
                </Animated.View>

                {/* Selected Tags Preview */}
                {selectedTags.length > 0 && (
                  <Animated.View
                    style={[styles.fieldContainer,{ opacity: fadeAnim,transform: [{ translateY: slideAnim }] }]}
                  >
                    <View style={styles.fieldHeader}>
                      <View style={styles.fieldLabelContainer}>
                        <Ionicons name="pricetag" size={16} color="#0056d2" style={styles.fieldIcon} />
                        <Text style={styles.fieldLabel}>Selected Tags</Text>
                      </View>
                      <TouchableOpacity onPress={() => setShowTagModal(true)}>
                        <Text style={styles.editTagsText}>Edit</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.selectedTagsContainer}>
                      {selectedTags.slice(0,6).map((tagId) => {
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

                {/* Error Message */}
                {error && (
                  <Animated.View
                    style={[styles.errorSection,{ opacity: fadeAnim,transform: [{ translateY: slideAnim }] }]}
                  >
                    <View style={styles.errorContainer}>
                      <Ionicons name="alert-circle" size={14} color="#EF4444" />
                      <Text style={styles.errorText}>{error}</Text>
                    </View>
                  </Animated.View>
                )}
              </View>
            </TouchableWithoutFeedback>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>

      {/* Keyboard Dismiss Overlay */}
      {isKeyboardVisible && (
        <TouchableWithoutFeedback onPress={dismissKeyboard}>
          <View style={styles.keyboardDismissOverlay} pointerEvents="box-none" />
        </TouchableWithoutFeedback>
      )}

      {/* Image Options Modal */}
      <Modal
        visible={showImageOptions}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowImageOptions(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowImageOptions(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={() => { }}>
              <Animated.View style={[styles.imageOptionsModal,{ transform: [{ scale: scaleAnim }] }]}>
                <View style={styles.modalHandle} />
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Update Photo</Text>
                  <TouchableOpacity
                    onPress={() => setShowImageOptions(false)}
                    style={styles.modalCloseButton}
                  >
                    <Ionicons name="close" size={24} color="#6B7280" />
                  </TouchableOpacity>
                </View>
                <View style={styles.imageOptionsContainer}>
                  <TouchableOpacity
                    style={styles.imageOption}
                    onPress={handleTakePhoto}
                    disabled={imageUploading}
                  >
                    <LinearGradient colors={["#0056d2","#0041a3"]} style={styles.imageOptionGradient}>
                      <Ionicons name="camera" size={28} color="#FFFFFF" />
                    </LinearGradient>
                    <View style={styles.imageOptionContent}>
                      <Text style={styles.imageOptionTitle}>Take Photo</Text>
                      <Text style={styles.imageOptionSubtitle}>Use your camera</Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.imageOption}
                    onPress={handlePickImage}
                    disabled={imageUploading}
                  >
                    <LinearGradient colors={["#10B981","#059669"]} style={styles.imageOptionGradient}>
                      <Ionicons name="images" size={28} color="#FFFFFF" />
                    </LinearGradient>
                    <View style={styles.imageOptionContent}>
                      <Text style={styles.imageOptionTitle}>Choose from Gallery</Text>
                      <Text style={styles.imageOptionSubtitle}>Select existing photo</Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.imageOption}
                    onPress={handleUrlImage}
                    disabled={imageUploading}
                  >
                    <LinearGradient colors={["#F59E0B","#D97706"]} style={styles.imageOptionGradient}>
                      <Ionicons name="link" size={28} color="#FFFFFF" />
                    </LinearGradient>
                    <View style={styles.imageOptionContent}>
                      <Text style={styles.imageOptionTitle}>Enter URL</Text>
                      <Text style={styles.imageOptionSubtitle}>Paste image link</Text>
                    </View>
                  </TouchableOpacity>
                </View>
                {imageUploading && (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#0056d2" />
                    <Text style={styles.loadingText}>Processing image...</Text>
                  </View>
                )}
              </Animated.View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* URL Input Modal */}
      <Modal visible={showUrlInput} transparent={true} animationType="slide" onRequestClose={cancelUrlInput}>
        <TouchableWithoutFeedback onPress={cancelUrlInput}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={() => { }}>
              <Animated.View style={[styles.urlInputModal,{ transform: [{ scale: scaleAnim }] }]}>
                <View style={styles.modalHandle} />
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Enter Image URL</Text>
                  <TouchableOpacity onPress={cancelUrlInput} style={styles.modalCloseButton}>
                    <Ionicons name="close" size={24} color="#6B7280" />
                  </TouchableOpacity>
                </View>
                <View style={styles.urlInputContainer}>
                  <TextInput
                    style={[styles.urlInput,urlError && styles.urlInputError]}
                    placeholder="https://example.com/image.jpg"
                    placeholderTextColor="#9CA3AF"
                    value={imageUrl}
                    onChangeText={(text) => {
                      setImageUrl(text);
                      setUrlError("");
                    }}
                    autoCapitalize="none"
                    keyboardType="url"
                    returnKeyType="done"
                    onSubmitEditing={confirmUrlImage}
                    autoFocus={true}
                  />
                  {urlError && (
                    <View style={styles.errorContainer}>
                      <Ionicons name="alert-circle" size={14} color="#EF4444" />
                      <Text style={styles.errorText}>{urlError}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.urlModalButtons}>
                  <TouchableOpacity style={styles.urlCancelButton} onPress={cancelUrlInput}>
                    <Text style={styles.urlCancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.urlConfirmButton}
                    onPress={confirmUrlImage}
                    disabled={imageUploading}
                  >
                    {imageUploading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.urlConfirmButtonText}>Confirm</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </Animated.View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Tags Modal */}
      <Modal
        visible={showTagModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowTagModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowTagModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={() => { }}>
              <Animated.View style={[styles.tagsModal,{ transform: [{ scale: scaleAnim }] }]}>
                <View style={styles.modalHandle} />
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Select Tags</Text>
                  <TouchableOpacity onPress={() => setShowTagModal(false)} style={styles.modalCloseButton}>
                    <Ionicons name="close" size={24} color="#6B7280" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.tagsDescription}>Choose relevant tags to help others discover your post</Text>
                {tagLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#0056d2" />
                    <Text style={styles.loadingText}>Loading tags...</Text>
                  </View>
                ) : (
                  <ScrollView style={styles.tagsScrollView} showsVerticalScrollIndicator={false}>
                    <View style={styles.tagsGrid}>
                      {tags.map((tag) => (
                        <TouchableOpacity
                          key={tag.tagId}
                          style={[styles.tagItem,selectedTags.includes(tag.tagId) && styles.tagItemSelected]}
                          onPress={() => toggleTag(tag.tagId)}
                          activeOpacity={0.7}
                        >
                          <View
                            style={[
                              styles.tagItemContent,
                              selectedTags.includes(tag.tagId) && styles.tagItemContentSelected,
                            ]}
                          >
                            <Text
                              style={[styles.tagText,selectedTags.includes(tag.tagId) && styles.tagTextSelected]}
                            >
                              #{tag.tagName}
                            </Text>
                            {selectedTags.includes(tag.tagId) && (
                              <Ionicons name="checkmark-circle" size={16} color="#0056d2" />
                            )}
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                )}
                <View style={styles.tagsModalFooter}>
                  <Text style={styles.selectedCount}>
                    {selectedTags.length} tag{selectedTags.length !== 1 ? "s" : ""} selected
                  </Text>
                  <TouchableOpacity style={styles.doneButton} onPress={() => setShowTagModal(false)}>
                    <Text style={styles.doneButtonText}>Done</Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingTop: Platform.OS === "android" ? 10 : 0,
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    zIndex: 1000,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
    marginHorizontal: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000000",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
    marginTop: 4,
  },
  publishButton: {
    borderRadius: 16,
    overflow: "hidden",
  },
  publishButtonDisabled: {
    opacity: 0.7,
  },
  publishButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 6,
  },
  publishButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  publishButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  mainContainer: {
    flex: 1,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  formContent: {
    flex: 1,
  },
  keyboardDismissOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
  },
  fieldContainer: {
    marginBottom: 28,
  },
  fieldHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  fieldLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  fieldIcon: {
    marginRight: 8,
  },
  fieldLabel: {
    fontSize: 17,
    fontWeight: "600",
    color: "#000000",
  },
  fieldCounter: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
  },
  warningText: {
    fontSize: 12,
    color: "#EF4444",
    fontWeight: "500",
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
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
    fontSize: 17,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 4,
  },
  privacyContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  privacyText: {
    fontSize: 14,
    color: "#0056d2",
    fontWeight: "500",
  },
  inputSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  inputError: {
    borderColor: "#EF4444",
  },
  richToolbar: {
    backgroundColor: "#F9FAFB",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  richEditor: {
    minHeight: 140,
    backgroundColor: "#FFFFFF",
  },
  progressSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    borderRadius: 2,
  },
  imageContainer: {
    position: "relative",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  imagePreview: {
    width: "100%",
    height: 220,
    resizeMode: "cover",
  },
  imageOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  removeImageButton: {
    position: "absolute",
    top: 16,
    right: 16,
  },
  removeImageButtonInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(239, 68, 68, 0.9)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  editImageButton: {
    position: "absolute",
    top: 16,
    right: 60,
  },
  editImageButtonInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0, 86, 210, 0.9)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  imageLabel: {
    position: "absolute",
    bottom: 20,
    left: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  imageLabelText: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  actionCards: {
    gap: 16,
  },
  actionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  actionCardActive: {
    borderColor: "#0056d2",
    backgroundColor: "#F0F9FF",
  },
  actionCardContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F9FAFB",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  actionCardText: {
    flex: 1,
  },
  actionCardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 4,
  },
  actionCardTitleActive: {
    color: "#0056d2",
  },
  actionCardSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "400",
  },
  actionCardSubtitleActive: {
    color: "#0056d2",
  },
  selectedTagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  selectedTag: {
    backgroundColor: "#F0F9FF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#0056d2",
  },
  selectedTagText: {
    fontSize: 14,
    color: "#0056d2",
    fontWeight: "500",
  },
  moreTagsIndicator: {
    backgroundColor: "#E5E7EB",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  moreTagsText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  editTagsText: {
    fontSize: 14,
    color: "#0056d2",
    fontWeight: "500",
  },
  errorSection: {
    marginBottom: 28,
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
    fontWeight: "500",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "flex-end",
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#D1D5DB",
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 8,
  },
  imageOptionsModal: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    maxHeight: "75%",
  },
  urlInputModal: {
    position: "absolute",
    top: "20%",
    left: 10,
    right: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    maxHeight: "60%",
  },
  tagsModal: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#000000",
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  urlInputContainer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  urlInput: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    paddingHorizontal: 20,
    paddingVertical: 18,
    marginTop: 10,
    fontSize: 16,
    color: "#000000",
  },
  urlInputError: {
    borderColor: "#EF4444",
  },
  urlModalButtons: {
    flexDirection: "row",
    paddingHorizontal: 24,
    gap: 16,
  },
  urlCancelButton: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
  },
  urlCancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
  },
  urlConfirmButton: {
    flex: 1,
    backgroundColor: "#0056d2",
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
  },
  urlConfirmButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  imageOptionsContainer: {
    padding: 24,
    gap: 20,
  },
  imageOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  imageOptionGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 20,
  },
  imageOptionContent: {
    flex: 1,
  },
  imageOptionTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 4,
  },
  imageOptionSubtitle: {
    fontSize: 14,
    color: "#6B7280",
  },
  tagsDescription: {
    fontSize: 15,
    color: "#6B7280",
    marginBottom: 20,
    paddingHorizontal: 24,
    lineHeight: 22,
  },
  loadingContainer: {
    alignItems: "center",
    paddingVertical: 20,
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "500",
  },
  tagsScrollView: {
    paddingHorizontal: 24,
  },
  tagsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    paddingBottom: 20,
  },
  tagItem: {
    borderRadius: 16,
    overflow: "hidden",
    minWidth: "45%",
    maxWidth: "48%",
  },
  tagItemSelected: {
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  tagItemContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#E5E7EB",
  },
  tagItemContentSelected: {
    backgroundColor: "#F0F9FF",
    borderColor: "#0056d2",
  },
  tagText: {
    fontSize: 14,
    color: "#000000",
    fontWeight: "500",
    flex: 1,
  },
  tagTextSelected: {
    color: "#0056d2",
    fontWeight: "600",
  },
  tagsModalFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  selectedCount: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  doneButton: {
    backgroundColor: "#0056d2",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  doneButtonText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
  },
});

export default CreatePostScreen;