import React,{ useState,useEffect,useRef } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Image,
    ScrollView,
    Animated,
    Platform,
    Modal,
    KeyboardAvoidingView,
    Keyboard,
    TouchableWithoutFeedback,
    PanResponder,
    Dimensions,
    ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons,Feather,MaterialIcons } from "@expo/vector-icons";
import { createPost,getAllTags } from "services/apiCommunityService";
import { apiUploadImageCloudService } from "services/apiUploadImageCloudService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { showErrorFetchAPI,showErrorMessage,showSuccessMessage } from "utils/toastUtil";
import { WebView } from "react-native-webview";
import apiUserService from "services/apiUserService";

const { width,height } = Dimensions.get("window");

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
    if (typeof thumb !== "string") return null;
    if ((thumb.startsWith("http://") || thumb.startsWith("https://")) && thumb.length > 255) {
        return "Thumbnail URL cannot exceed 255 characters.";
    }
    return null;
};

const validateContent = (html) => {
    if (!html || !html.trim()) return "Content is required.";
    const plainText = html.replace(/<[^>]*>/g,"").trim();
    if (plainText.length < 1 || plainText.length > 500) return "Content must be between 1 and 500 characters.";
    return null;
};

const validateStatus = (status) => {
    if (!status) return null;
    if (status.length > 20) return "Status cannot exceed 20 characters.";
    if (!/^(active|inactive)$/.test(status)) return "Status must be 'active' or 'inactive'.";
    return null;
};

const CreatePostFromScreenshotScreen = ({ route,navigation }) => {
    const { screenshotUri,groupId } = route.params || {};
    const [content,setContent] = useState("");
    const [thumbnail,setThumbnail] = useState(screenshotUri || "");
    const [tags,setTags] = useState([]);
    const [selectedTags,setSelectedTags] = useState([]);
    const [contentLength,setContentLength] = useState(0);
    const [loading,setLoading] = useState(false);
    const [imageUploading,setImageUploading] = useState(false);
    const [tagLoading,setTagLoading] = useState(true);
    const [error,setError] = useState("");
    const [showTagModal,setShowTagModal] = useState(false);
    const [showImagePreviewModal,setShowImagePreviewModal] = useState(false);
    const [keyboardHeight,setKeyboardHeight] = useState(0);
    const [isKeyboardVisible,setIsKeyboardVisible] = useState(false);
    const [currentUser,setCurrentUser] = useState(null);
    const [hmsTagId,setHmsTagId] = useState(null);
    const [cloudImageUrl,setCloudImageUrl] = useState("");

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;
    const scaleAnim = useRef(new Animated.Value(0.95)).current;
    const progressAnim = useRef(new Animated.Value(0)).current;
    const webViewRef = useRef(null);
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
            initialData: ''
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

    const createFormDataFromUri = (uri,fileName = `image-${Date.now()}.jpg`) => {
        const formData = new FormData();
        formData.append("file",{
            uri,
            type: "image/jpeg",
            name: fileName,
        });
        return formData;
    };

    const uploadScreenshot = async () => {
        if (!screenshotUri) return null;

        setImageUploading(true);
        setError("");

        try {
            const formData = createFormDataFromUri(screenshotUri);
            const result = await apiUploadImageCloudService.uploadImage(formData);
            if (result.isError) {
                setError(result.message);
                showErrorMessage(result.message);
                return null;
            } else {
                showSuccessMessage("Image uploaded successfully!");
                setCloudImageUrl(result.imageUrl);
                return result.imageUrl;
            }
        } catch (error) {
            setError(error.message || "Failed to upload image");
            showErrorMessage(error.message || "Failed to upload image");
            return null;
        } finally {
            setImageUploading(false);
        }
    };

    const loadInitialData = async () => {
        try {
            const userStr = await AsyncStorage.getItem("user");
            if (userStr) {
                const userJoin = JSON.parse(userStr);
                const userRes = await apiUserService.getUserById(userJoin?.userId);
                setCurrentUser(userRes?.data);
            }
            const tagsData = await getAllTags();
            setTags(tagsData || []);
            const hmsTag = tagsData?.find((tag) => tag.tagName.toLowerCase() === "hms-analysis");
            if (hmsTag) {
                setHmsTagId(hmsTag.tagId);
                setSelectedTags([hmsTag.tagId]);
            }
        } catch (error) {
            showErrorFetchAPI(error);
        } finally {
            setTagLoading(false);
        }
    };

    const handleViewImage = () => {
        if (thumbnail && thumbnail !== DEFAULT_IMAGE) {
            setShowImagePreviewModal(true);
        } else if (screenshotUri) {
            setThumbnail(screenshotUri); // Display local image if not yet uploaded
            setShowImagePreviewModal(true);
        }
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
        const contentError = validateContent(content);
        const statusError = validateStatus(statusValue);

        if (userIdError || groupIdError || contentError || statusError) {
            setError(userIdError || groupIdError || contentError || statusError);
            return;
        }

        if (imageUploading) {
            setError("Image is still uploading. Please wait.");
            return;
        }

        setLoading(true);
        setError("");

        try {
            let thumbnailUrl = cloudImageUrl || thumbnail;
            if (screenshotUri && !cloudImageUrl) {
                thumbnailUrl = await uploadScreenshot();
                if (!thumbnailUrl) {
                    throw new Error("Image upload failed");
                }
                setThumbnail(thumbnailUrl);
            }

            const thumbError = validateThumbnail(thumbnailUrl);
            if (thumbError) {
                setError(thumbError);
                return;
            }

            const postDto = {
                postId: 0,
                userId,
                groupId,
                thumbnail: thumbnailUrl || null,
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
                navigation.navigate("GroupDetails",{ groupId: groupId });
            },1000);
        } catch (error) {
            showErrorFetchAPI(error);
        } finally {
            setLoading(false);
        }
    };

    const toggleTag = (tagId) => {
        if (tagId === hmsTagId) {
            showErrorMessage("The 'hms-analysis' tag cannot be removed.");
            return;
        }
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

    const canPublish = content.trim().length > 0 && contentLength <= 500 && !loading && !imageUploading;

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

                                {/* Content Input Section with CKEditor */}
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
                                        <WebView
                                            ref={webViewRef}
                                            originWhitelist={["*"]}
                                            source={{ html: ckEditorHtml }}
                                            style={styles.richEditor}
                                            onMessage={(event) => {
                                                const message = JSON.parse(event.nativeEvent.data);
                                                if (message.type === "content") {
                                                    handleContentChange(message.data);
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
                                {(thumbnail || screenshotUri) && (
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
                                            {imageUploading ? (
                                                <View style={styles.imageUploadingContainer}>
                                                    <ActivityIndicator size="large" color="#0056d2" />
                                                    <Text style={styles.imageUploadingText}>Uploading image...</Text>
                                                </View>
                                            ) : (
                                                <>
                                                    <Image source={{ uri: thumbnail || screenshotUri }} style={styles.imagePreview} />
                                                    <LinearGradient colors={["transparent","rgba(0,0,0,0.3)"]} style={styles.imageOverlay} />
                                                    <TouchableOpacity style={styles.viewImageButton} onPress={handleViewImage}>
                                                        <View style={styles.viewImageButtonInner}>
                                                            <Ionicons name="search" size={16} color="#FFFFFF" />
                                                        </View>
                                                    </TouchableOpacity>
                                                    <View style={styles.imageLabel}>
                                                        <Ionicons name="image" size={14} color="#FFFFFF" />
                                                        <Text style={styles.imageLabelText}>Post Image</Text>
                                                    </View>
                                                </>
                                            )}
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

            {/* Image Preview Modal */}
            <Modal
                visible={showImagePreviewModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowImagePreviewModal(false)}
            >
                <TouchableWithoutFeedback onPress={() => setShowImagePreviewModal(false)}>
                    <View style={styles.modalOverlay}>
                        <TouchableWithoutFeedback onPress={() => { }}>
                            <Animated.View style={[styles.imagePreviewModal,{ transform: [{ scale: scaleAnim }] }]}>
                                <TouchableOpacity
                                    style={styles.modalCloseButton}
                                    onPress={() => setShowImagePreviewModal(false)}
                                >
                                    <Ionicons name="close" size={24} color="#000" />
                                </TouchableOpacity>
                                <Image source={{ uri: thumbnail || screenshotUri }} style={styles.fullImagePreview} />
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
                                                    disabled={tag.tagId === hmsTagId}
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
    borderRadius: 20
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
    marginHorizontal: 20,
  },
  headerTitle: {
    fontWeight: "600",
    textAlign: "center",
    letterSpacing: 0.3,
    fontSize: 16
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
    richEditor: {
        height: 180,
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
    imageUploadingContainer: {
        width: "100%",
        height: 220,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#F9FAFB",
    },
    imageUploadingText: {
        fontSize: 16,
        color: "#6B7280",
        marginTop: 8,
        fontWeight: "500",
    },
    imageOverlay: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: 100,
    },
    viewImageButton: {
        position: "absolute",
        top: 16,
        right: 16,
    },
    viewImageButtonInner: {
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
    imagePreviewModal: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.9)",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    fullImagePreview: {
        width: "100%",
        height: "80%",
        resizeMode: "contain",
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

export default CreatePostFromScreenshotScreen;