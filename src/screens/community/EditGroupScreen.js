import { useState,useEffect,useRef,useCallback } from "react";
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
  Keyboard,
  TouchableWithoutFeedback,
  PanResponder,
} from "react-native";
import { useNavigation,useRoute } from "@react-navigation/native";
import { updateMyGroup,getMyGroupActiveById } from "services/apiCommunityService";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { apiUploadImageCloudService } from "services/apiUploadImageCloudService";
import { Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { showErrorMessage,showSuccessMessage } from "utils/toastUtil";
import { WebView } from "react-native-webview";
import debounce from "lodash/debounce";
import CommonSkeleton from "components/CommonSkeleton/CommonSkeleton";
import Header from "components/Header";

const { width } = Dimensions.get("window");

const EditGroupScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { groupId } = route.params || {};
  const [groupName,setGroupName] = useState("");
  const [description,setDescription] = useState("");
  const [thumbnail,setThumbnail] = useState("");
  const [cloudImageUrl,setCloudImageUrl] = useState("");
  const [isPrivate,setIsPrivate] = useState(false);
  const [loading,setLoading] = useState(true);
  const [saving,setSaving] = useState(false);
  const [showImageOptions,setShowImageOptions] = useState(false);
  const [showUrlInput,setShowUrlInput] = useState(false);
  const [imageUrl,setImageUrl] = useState("");
  const [urlError,setUrlError] = useState("");
  const [imageUploading,setImageUploading] = useState(false);
  const [errors,setErrors] = useState({});
  const [touched,setTouched] = useState({});
  const [keyboardHeight,setKeyboardHeight] = useState(0);
  const [isKeyboardVisible,setIsKeyboardVisible] = useState(false);
  const [currentInputFocused,setCurrentInputFocused] = useState(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const webViewRef = useRef(null);
  const scrollViewRef = useRef();
  const containerRef = useRef();

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => false,
      onPanResponderGrant: () => {
        if (isKeyboardVisible && !currentInputFocused) {
          Keyboard.dismiss();
        }
      },
    })
  ).current;

  // Debounced function to handle description updates
  const debouncedSetDescription = useCallback(
    debounce((newContent) => {
      setDescription(newContent);
      if (touched.description) {
        const error = validateDescription(newContent);
        setErrors((prev) => ({ ...prev,description: error }));
      }
    },500),
    [touched.description]
  );

  const ckEditorHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <script src="https://cdn.ckeditor.com/ckeditor5/39.0.0/classic/ckeditor.js"></script>
      <style>
        body {
          margin: 0;
          padding: 0;
          background: #FFFFFF;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
        }
        #editor-container {
          width: 100%;
          box-sizing: border-box;
        }
        .ck-editor__top {
          position: sticky;
          top: 0;
          z-index: 1000;
          background: #F9FAFB;
          border-bottom: 1px solid #E5E7EB;
        }
        .ck-editor__editable {
          min-height: 140px;
          padding: 16px;
          background: #FFFFFF;
        }
        .ck-content {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
          font-size: 16px;
          color: #000000;
        }
      </style>
    </head>
    <body>
      <div id="editor-container">
        <div id="editor"></div>
      </div>
      <script>
        ClassicEditor
          .create( document.querySelector( '#editor' ), {
            toolbar: {
              items: [
                'undo', 'redo',
                '|',
                'bold', 'italic', 'underline',
                '|',
                'bulletedList', 'numberedList',
                '|',
                'sourceEditing'
              ]
            },
            language: 'en',
            initialData: '${description.replace(/'/g,"\\'")}'
          } )
          .then( editor => {
            editor.model.document.on( 'change:data', () => {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'content', data: editor.getData() }));
            } );
          } )
          .catch( error => {
            console.error( error );
          } );
      </script>
    </body>
    </html>
  `;

  useEffect(() => {
    if (groupId) {
      getMyGroupActiveById(groupId)
        .then((group) => {
          setGroupName(group.groupName || "");
          setDescription(group.description || "");
          setThumbnail(group.thumbnail || "");
          setCloudImageUrl(group.thumbnail || "");
          setIsPrivate(group.isPrivate || false);
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
        })
        .catch((err) => {
          Alert.alert("Error",err.message || "Failed to load group info");
          navigation.goBack();
        })
        .finally(() => setLoading(false));
    }
  },[groupId]);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener("keyboardDidShow",(e) => {
      setKeyboardHeight(e.endCoordinates.height);
      setIsKeyboardVisible(true);
    });

    const keyboardDidHideListener = Keyboard.addListener("keyboardDidHide",() => {
      setKeyboardHeight(0);
      setIsKeyboardVisible(false);
      setCurrentInputFocused(null);
    });

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  },[]);

  const validateGroupId = (id) => {
    if (id === undefined || id === null) return "GroupId is required.";
    if (!Number.isInteger(id) || id < 1) return "GroupId must be a positive integer.";
    return null;
  };

  const validateGroupName = (name) => {
    if (!name.trim()) return "Group name is required.";
    if (name.trim().length < 3 || name.trim().length > 255) return "Group name must be between 3 and 255 characters.";
    return null;
  };

  const validateDescription = (desc) => {
    if (!desc) return null;
    if (desc.replace(/<[^>]*>/g,"").length > 2000) return "Description cannot exceed 2000 characters.";
    return null;
  };

  const validateStatus = (status) => {
    if (!status) return "Status is required.";
    if (status.length > 20) return "Status cannot exceed 20 characters.";
    if (!/^(active|inactive)$/.test(status)) return "Status must be 'active' or 'inactive'.";
    return null;
  };

  const handleInputChange = useCallback(
    (field,value) => {
      switch (field) {
        case "groupName":
          setGroupName(value);
          if (touched.groupName) {
            const error = validateGroupName(value);
            setErrors((prev) => ({ ...prev,groupName: error }));
          }
          break;
        case "description":
          debouncedSetDescription(value);
          break;
        case "status":
          if (touched.status) {
            const error = validateStatus(value);
            setErrors((prev) => ({ ...prev,status: error }));
          }
          break;
      }
    },
    [touched,debouncedSetDescription]
  );

  const handleInputBlur = useCallback(
    (field) => {
      setTouched((prev) => ({ ...prev,[field]: true }));
      setCurrentInputFocused(null);
      switch (field) {
        case "groupName": {
          const nameError = validateGroupName(groupName);
          setErrors((prev) => ({ ...prev,groupName: nameError }));
          break;
        }
        case "description": {
          const descError = validateDescription(description);
          setErrors((prev) => ({ ...prev,description: descError }));
          break;
        }
        case "status": {
          const statusError = validateStatus("active");
          setErrors((prev) => ({ ...prev,status: statusError }));
          break;
        }
        case "groupId": {
          const idError = validateGroupId(groupId);
          setErrors((prev) => ({ ...prev,groupId: idError }));
          break;
        }
      }
    },
    [groupName,description]
  );

  const handleInputFocus = useCallback((field) => {
    setCurrentInputFocused(field);
  },[]);

  const createFormDataFromBase64 = useCallback((base64String,fileName = `image-${Date.now()}.jpg`) => {
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
  },[]);

  const isValidUrl = useCallback((url) => {
    const urlRegex = /^(https?:\/\/[^\s$.?#].[^\s]*)$/i;
    return urlRegex.test(url);
  },[]);

  const checkImageUrl = useCallback(async (url) => {
    try {
      const response = await fetch(url,{ method: "HEAD" });
      const contentType = response.headers.get("content-type");
      return response.ok && contentType?.startsWith("image/");
    } catch (error) {
      return false;
    }
  },[]);

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
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
          showErrorMessage("Warning","Base64 not available. Using local URI, which may not persist.");
        }
      }
    } catch (error) {
      showErrorMessage("Failed to pick image.");
    } finally {
      setImageUploading(false);
      setShowImageOptions(false);
    }
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
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
      showErrorMessage("Error","Failed to take photo.");
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
        },
      },
    ]);
  };

  const handleSave = async () => {
    const idError = validateGroupId(groupId);
    const nameError = validateGroupName(groupName);
    const descError = validateDescription(description);
    const statusValue = "active";
    const statusError = validateStatus(statusValue);

    setErrors({
      groupId: idError,
      groupName: nameError,
      description: descError,
      status: statusError,
    });

    setTouched({
      groupId: true,
      groupName: true,
      description: true,
      status: true,
    });

    if (idError || nameError || descError || statusError) {
      showErrorMessage("Please fix the errors before saving changes.");
      return;
    }

    setSaving(true);
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
          setSaving(false);
          return;
        }
      }

      // Ensure the latest content is saved
      await new Promise((resolve) => {
        debouncedSetDescription.flush(); // Flush debounce to get latest content
        setTimeout(resolve,100); // Small delay to ensure state update
      });

      await updateMyGroup(groupId,{
        groupId,
        groupName,
        description,
        thumbnail: finalImageUrl,
        status: statusValue,
        isPrivate,
      });

      showSuccessMessage("Group updated successfully!");
      setTimeout(() => {
        navigation.goBack();
      },1000);
    } catch (err) {
      showErrorMessage(err.message || "Failed to update group");
    } finally {
      setSaving(false);
    }
  };

  const dismissKeyboard = () => {
    Keyboard.dismiss();
    setCurrentInputFocused(null);
  };

  const renderLoadingScreen = () => (
    <CommonSkeleton />
  );

  const renderImageSection = useCallback(
    () => (
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
            <LinearGradient colors={["transparent","rgba(0,0,0,0.3)"]} style={styles.imageOverlay} />
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
            <View style={styles.addImageGradient}>
              <View style={styles.addImageIcon}>
                <Ionicons name="camera-outline" size={32} color="#0056d2" />
              </View>
              <Text style={styles.addImageTitle}>Update Cover Photo</Text>
              <Text style={styles.addImageSubtitle}>Change your group's cover image</Text>
            </View>
          </TouchableOpacity>
        )}
      </Animated.View>
    ),
    [thumbnail,fadeAnim,slideAnim]
  );

  const renderFormField = useCallback(
    (label,value,onChangeText,onBlur,placeholder,multiline = false,icon) => {
      let maxLength = 255;
      if (label === "Description") maxLength = 2000;
      if (label === "Group Name") maxLength = 255;

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
              {icon && <Ionicons name={icon} size={16} color="#0056d2" style={styles.fieldIcon} />}
              <Text style={styles.fieldLabel}>{label}</Text>
            </View>
            <Text style={styles.fieldCounter}>
              {value.replace(/<[^>]*>/g,"").length}/{maxLength}
            </Text>
          </View>
          <View style={[styles.inputContainer,errors[onBlur.split(".")[1]] && styles.inputError]}>
            <TextInput
              style={[styles.input,multiline && styles.multilineInput]}
              placeholder={placeholder}
              placeholderTextColor="#9CA3AF"
              value={value}
              onChangeText={onChangeText}
              onFocus={() => handleInputFocus(onBlur.split(".")[1])}
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
      );
    },
    [errors,fadeAnim,slideAnim,handleInputFocus,handleInputBlur]
  );

  const renderRichEditor = useCallback(
    () => (
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
            <Ionicons name="document-text-outline" size={16} color="#0056d2" style={styles.fieldIcon} />
            <Text style={styles.fieldLabel}>Description</Text>
          </View>
          <Text style={styles.fieldCounter}>{description.replace(/<[^>]*>/g,"").length}/2000</Text>
        </View>
        <View style={[styles.richEditorContainer,errors.description && styles.inputError]}>
          <WebView
            ref={webViewRef}
            originWhitelist={["*"]}
            source={{ html: ckEditorHtml }}
            style={styles.richEditor}
            onMessage={(event) => {
              const message = JSON.parse(event.nativeEvent.data);
              if (message.type === "content") {
                handleInputChange("description",message.data);
              }
            }}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
            scrollEnabled={false}
            scalesPageToFit={false}
            automaticallyAdjustContentInsets={false}
            contentInset={{ top: 0,left: 0,bottom: 0,right: 0 }}
          />
        </View>
        {errors.description && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={14} color="#EF4444" />
            <Text style={styles.errorText}>{errors.description}</Text>
          </View>
        )}
      </Animated.View>
    ),
    [description,errors.description,fadeAnim,slideAnim,handleInputChange]
  );

  const renderPrivacySelector = useCallback(
    () => (
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
            <Ionicons name="shield-outline" size={16} color="#0056d2" style={styles.fieldIcon} />
            <Text style={styles.fieldLabel}>Privacy Setting</Text>
          </View>
        </View>
        <View style={styles.privacyOptions}>
          <TouchableOpacity
            style={[styles.privacyOption,!isPrivate && styles.privacyOptionActive]}
            onPress={() => setIsPrivate(false)}
          >
            <View style={styles.privacyOptionHeader}>
              <Ionicons name="globe-outline" size={20} color={!isPrivate ? "#FFFFFF" : "#0056d2"} />
              <Text style={[styles.privacyOptionTitle,!isPrivate && styles.privacyOptionTitleActive]}>Public</Text>
            </View>
            <Text style={[styles.privacyOptionDesc,!isPrivate && styles.privacyOptionDescActive]}>
              Anyone can find and join this group
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.privacyOption,isPrivate && styles.privacyOptionActive]}
            onPress={() => setIsPrivate(true)}
          >
            <View style={styles.privacyOptionHeader}>
              <Ionicons name="lock-closed-outline" size={20} color={isPrivate ? "#FFFFFF" : "#0056d2"} />
              <Text style={[styles.privacyOptionTitle,isPrivate && styles.privacyOptionTitleActive]}>Private</Text>
            </View>
            <Text style={[styles.privacyOptionDesc,isPrivate && styles.privacyOptionDescActive]}>
              Members need approval to join
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    ),
    [isPrivate,fadeAnim,slideAnim]
  );

  if (loading) return renderLoadingScreen();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <Header
        title="Edit Group"
        onBack={() => navigation.goBack()}
        showAvatar={false}
      />


      <View style={styles.mainContainer} ref={containerRef} {...panResponder.panHandlers}>
        <KeyboardAvoidingView
          style={styles.keyboardContainer}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
          <ScrollView
            ref={scrollViewRef}
            style={styles.scrollContainer}
            contentContainerStyle={[
              styles.scrollContent,
              {
                paddingBottom: isKeyboardVisible ? keyboardHeight + 50 : 50,
              },
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
                {renderImageSection()}
                {renderFormField(
                  "Group Name",
                  groupName,
                  (text) => handleInputChange("groupName",text),
                  "field.groupName",
                  "Enter a catchy group name...",
                  false,
                  "people-outline"
                )}
                {renderRichEditor()}
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
                    style={[styles.saveButton,(saving || imageUploading) && styles.saveButtonDisabled]}
                    onPress={handleSave}
                    disabled={saving || imageUploading}
                  >
                    <LinearGradient colors={["#0056d2","#0041a3"]} style={styles.saveButtonGradient}>
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
                  <TouchableOpacity onPress={() => setShowImageOptions(false)} style={styles.modalCloseButton}>
                    <Ionicons name="close" size={24} color="#6B7280" />
                  </TouchableOpacity>
                </View>
                <View style={styles.imageOptionsContainer}>
                  <TouchableOpacity style={styles.imageOption} onPress={handleTakePhoto} disabled={imageUploading}>
                    <LinearGradient colors={["#0056d2","#0041a3"]} style={styles.imageOptionGradient}>
                      <Ionicons name="camera" size={28} color="#FFFFFF" />
                    </LinearGradient>
                    <View style={styles.imageOptionContent}>
                      <Text style={styles.imageOptionTitle}>Take Photo</Text>
                      <Text style={styles.imageOptionSubtitle}>Use your camera</Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.imageOption} onPress={handlePickImage} disabled={imageUploading}>
                    <LinearGradient colors={["#10B981","#059669"]} style={styles.imageOptionGradient}>
                      <Ionicons name="images" size={28} color="#FFFFFF" />
                    </LinearGradient>
                    <View style={styles.imageOptionContent}>
                      <Text style={styles.imageOptionTitle}>Choose from Gallery</Text>
                      <Text style={styles.imageOptionSubtitle}>Select existing photo</Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.imageOption} onPress={handleUrlImage} disabled={imageUploading}>
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
                    style={styles.urlInput}
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
  headerRight: {
    width: 44,
  },
  mainContainer: {
    flex: 1,
    marginTop: 60
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: 16,
    fontWeight: "500",
  },
  imageSection: {
    marginBottom: 32,
  },
  imageContainer: {
    position: "relative",
    borderRadius: 20,
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
  addImageContainer: {
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    borderStyle: "dashed",
    backgroundColor: "#FFFFFF",
  },
  addImageGradient: {
    padding: 48,
    alignItems: "center",
  },
  addImageIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F0F9FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  addImageTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000000",
    marginBottom: 8,
  },
  addImageSubtitle: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 22,
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
  inputContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  inputError: {
    borderColor: "#EF4444",
  },
  input: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    fontSize: 16,
    color: "#000000",
    fontWeight: "400",
  },
  multilineInput: {
    height: 120,
    textAlignVertical: "top",
  },
  richEditorContainer: {
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
  richEditor: {
    height: 180,
    backgroundColor: "#FFFFFF",
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
  privacySection: {
    marginBottom: 28,
  },
  privacyOptions: {
    gap: 16,
  },
  privacyOption: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  privacyOptionActive: {
    borderColor: "#0056d2",
    backgroundColor: "#0056d2",
  },
  privacyOptionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  privacyOptionTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#000000",
    marginLeft: 12,
  },
  privacyOptionTitleActive: {
    color: "#FFFFFF",
  },
  privacyOptionDesc: {
    fontSize: 15,
    color: "#6B7280",
    lineHeight: 22,
  },
  privacyOptionDescActive: {
    color: "rgba(255, 255, 255, 0.9)",
  },
  saveButtonContainer: {
    marginTop: 24,
  },
  saveButton: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonGradient: {
    paddingVertical: 20,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  saveButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
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
  urlInputError: {
    borderColor: "#EF4444",
    borderWidth: 2,
  },
});

export default EditGroupScreen;