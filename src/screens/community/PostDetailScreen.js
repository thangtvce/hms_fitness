import { useEffect,useState,useRef,useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Dimensions,
  Animated,
  Alert,
  Modal,
  Pressable,
  Keyboard,
  ScrollView,
  FlatList,
  Share,
} from "react-native";
import { PinchGestureHandler,PanGestureHandler,State,GestureHandlerRootView } from "react-native-gesture-handler";
import {
  getCommentsByPostId,
  addCommentByUser,
  editCommentByUser,
  deleteUserComment,
  getAllReactionTypes,
  reactToPost,
  unreactToPost,
  deletePost,
  getGroupPosts,
  getReactionsByPostId,
  getActivePostByIdForUser,
} from "services/apiCommunityService";
import { Ionicons,Feather,MaterialCommunityIcons } from "@expo/vector-icons";
import RenderHtml from "react-native-render-html";
import { AuthContext,useAuth } from "context/AuthContext";
import FlashMessage,{ showMessage } from "react-native-flash-message";
import DynamicStatusBar from "screens/statusBar/DynamicStatusBar";
import { theme } from "theme/color";
import { showErrorFetchAPI,showErrorMessage,showSuccessMessage } from "utils/toastUtil";
import Header from "components/Header";
import { handleDailyCheckin } from "utils/checkin";

const { width,height } = Dimensions.get("window");

function normalizePost(freshPost,initialPost) {
  return {
    ...freshPost,
    user: {
      avatar:
        freshPost.user?.avatar ||
        freshPost.userAvatar ||
        freshPost.avatar ||
        initialPost.user?.avatar ||
        initialPost.author?.avatar ||
        null,
      fullName:
        freshPost.user?.fullName ||
        freshPost.userFullName ||
        freshPost.fullName ||
        freshPost.user?.name ||
        initialPost.user?.fullName ||
        initialPost.author?.fullName ||
        "Anonymous User",
    },
    author: freshPost.author
      ? {
        avatar: freshPost.author.avatar || initialPost.author?.avatar || null,
        fullName:
          freshPost.author.fullName ||
          freshPost.author.name ||
          initialPost.author?.fullName ||
          "Anonymous User",
      }
      : initialPost.author || undefined,
  };
}

const PostDetailScreen = ({ route,navigation }) => {
  const { post: initialPost } = route.params;
  const { user } = useContext(AuthContext);
  const [post,setPost] = useState(normalizePost(initialPost,initialPost));
  const [comments,setComments] = useState([]);
  const [loading,setLoading] = useState(true);
  const [commentText,setCommentText] = useState("");
  const [sending,setSending] = useState(false);
  const [editCommentId,setEditCommentId] = useState(null);
  const [editCommentText,setEditCommentText] = useState("");
  const [editLoading,setEditLoading] = useState(false);
  const [liked,setLiked] = useState(!!(user && initialPost.reactions?.some((r) => r.userId === user.userId)));
  const [likeCount,setLikeCount] = useState(initialPost.reactions?.length || 0);
  const [reactionTypes,setReactionTypes] = useState([]);
  const [showFullContent,setShowFullContent] = useState(false);
  const [selectedCommentMenu,setSelectedCommentMenu] = useState(null);
  const [showPostMenu,setShowPostMenu] = useState(false);
  const [showReactionPicker,setShowReactionPicker] = useState(false);
  const [keyboardHeight,setKeyboardHeight] = useState(0);
  const [isKeyboardVisible,setIsKeyboardVisible] = useState(false);
  const flatListRef = useRef(null);
  const inputRef = useRef(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const likeAnimation = useRef(new Animated.Value(1)).current;
  const [showImageModal,setShowImageModal] = useState(false);
  const [selectedImage,setSelectedImage] = useState(null);
  const [showReactionDetailsModal,setShowReactionDetailsModal] = useState(false);
  const [selectedReactionType,setSelectedReactionType] = useState("all");

  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const pinchRef = useRef(null);
  const panRef = useRef(null);

  const baseScale = useRef(1);
  const lastScale = useRef(1);
  const lastTranslateX = useRef(0);
  const lastTranslateY = useRef(0);

  const unicodeToEmoji = (unicode) => {
    if (!unicode) return "🙂";
    try {
      if (/^[\p{Emoji}\p{Extended_Pictographic}]+$/u.test(unicode)) return unicode;
      const codePoints = unicode
        .replace(/U\+/g,"")
        .split(/\s+/)
        .filter(Boolean)
        .map((u) => Number.parseInt(u,16));
      if (codePoints.some(isNaN)) throw new Error("Invalid Unicode");
      return String.fromCodePoint(...codePoints);
    } catch {
      return "🙂";
    }
  };

  useEffect(() => {
    fetchComments();
    fetchReactionTypes();

    const keyboardDidShowListener = Keyboard.addListener("keyboardDidShow",(e) => {
      setKeyboardHeight(e.endCoordinates.height);
      setIsKeyboardVisible(true);
      if (!editCommentId) {
        setTimeout(() => {
          flatListRef?.current?.scrollToEnd?.({ animated: true });
        },100);
      }
    });

    const keyboardDidHideListener = Keyboard.addListener("keyboardDidHide",() => {
      setKeyboardHeight(0);
      setIsKeyboardVisible(false);
    });

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  },[editCommentId]);

  const fetchPost = async () => {
    try {
      const freshPost = await getActivePostByIdForUser(post.postId);
      const normalized = normalizePost(freshPost,post);
      setPost(normalized);
      setLikeCount(normalized.reactions?.length || 0);
      setLiked(!!normalized.reactions?.find((r) => r.userId === user?.userId));
    } catch (e) {
      showErrorFetchAPI(e);
    }
  };

  const fetchComments = async () => {
    setLoading(true);
    try {
      const res = await getCommentsByPostId(post.postId);
      setComments(
        (res || []).map((c) => ({
          ...c,
          userFullName: c.userFullName || c.user?.fullName || null,
          userAvatar: c.userAvatar || c.user?.avatar || null,
        }))
      );
      await fetchPost();
    } catch (e) {
      setComments([]);
      showErrorFetchAPI(e);
    }
    setLoading(false);
  };

  const fetchReactionTypes = async () => {
    try {
      const types = await getAllReactionTypes();
      setReactionTypes(types || []);
    } catch {
      showErrorFetchAPI(e);
    }
  };


  const handleSendComment = async () => {
    if (!commentText.trim()) return;
    setSending(true);
    try {
      await addCommentByUser(post.postId,commentText);
      setCommentText("");
      fetchComments();
      showSuccessMessage("Comment successfully!");
      try {
        await handleDailyCheckin(user?.userId,"comment_post");
      } catch (e) {
        console.log(e);
      }
    } catch (e) {
      showErrorFetchAPI(e);
    }
    setSending(false);
  };

  const handleEditComment = (comment) => {
    setSelectedCommentMenu(null);
    setEditCommentId(comment.commentId);
    setEditCommentText(comment.commentText);
  };

  const handleSaveEditComment = async () => {
    if (!editCommentText.trim()) return;
    setEditLoading(true);
    try {
      const result = await editCommentByUser(editCommentId,post.postId,editCommentText);
      if (result && result.commentId) {
        setComments((prev) =>
          prev.map((c) => (c.commentId === result.commentId ? { ...c,commentText: result.commentText } : c))
        );
      } else {
        fetchComments();
      }
      setEditCommentId(null);
      setEditCommentText("");
      showSuccessMessage("Edit comment successfully!");
    } catch (e) {
      showErrorFetchAPI(e);
    }
    setEditLoading(false);
  };

  const handleDeleteComment = (commentId) => {
    setSelectedCommentMenu(null);
    Alert.alert("Delete Comment","You are sure for delete comment?",[
      { text: "Cancel",style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setEditLoading(true);
          try {
            await deleteUserComment(commentId);
            fetchComments();
            showSuccessMessage("Delete comment successfully!",);
          } catch (e) {
            showErrorFetchAPI(e);
          }
          setEditLoading(false);
        },
      },
    ]);
  };

  const handleDeletePost = () => {
    setShowPostMenu(false);
    Alert.alert("Delete Post","Are you sure you want to delete this post?",[
      { text: "Cancel",style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setEditLoading(true);
          try {
            await deletePost(post.postId);
            showSuccessMessage("Post deleted successfully!")
            navigation.goBack();
          } catch (e) {
            showErrorFetchAPI(e);
          }
          setEditLoading(false);
        },
      },
    ]);
  };


  const resetImageTransform = () => {
    scale.setValue(1);
    translateX.setValue(0);
    translateY.setValue(0);
    baseScale.current = 1;
    lastScale.current = 1;
    lastTranslateX.current = 0;
    lastTranslateY.current = 0;
  };

  const onPinchEvent = Animated.event([{ nativeEvent: { scale: scale } }],{ useNativeDriver: true });

  const onPinchStateChange = (event) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      lastScale.current *= event.nativeEvent.scale;
      baseScale.current = lastScale.current;
      scale.setOffset(lastScale.current);
      scale.setValue(1);
    }
  };

  const onPanEvent = Animated.event([{ nativeEvent: { translationX: translateX,translationY: translateY } }],{
    useNativeDriver: true,
  });

  const onPanStateChange = (event) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      lastTranslateX.current += event.nativeEvent.translationX;
      lastTranslateY.current += event.nativeEvent.translationY;
      translateX.setOffset(lastTranslateX.current);
      translateX.setValue(0);
      translateY.setOffset(lastTranslateY.current);
      translateY.setValue(0);
    }
  };

  const handleDoubleTap = () => {
    Animated.parallel([
      Animated.timing(scale,{
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(translateX,{
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(translateY,{
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      resetImageTransform();
    });
  };

  const truncateContent = (content,maxLength = 200) => {
    if (!content) return "";
    const textContent = content.replace(/<[^>]*>/g,"");
    if (textContent.length <= maxLength) return content;
    return textContent.substring(0,maxLength) + "...";
  };

  const groupReactionsByType = (reactions) => {
    const grouped = {};
    reactions.forEach((reaction) => {
      const typeName = reaction.reactionTypeName;
      if (!grouped[typeName]) {
        grouped[typeName] = {
          reactionType: {
            reactionTypeId: reaction.reactionTypeId,
            reactionName: reaction.reactionTypeName,
            iconUrl: reaction.reactionTypeIconUrl,
            emojiUnicode: reaction.reactionTypeEmojiUnicode,
          },
          users: [],
          count: 0,
        };
      }
      grouped[typeName].users.push({
        userId: reaction.userId,
        userFullName: reaction.userFullName,
        userAvatar: reaction.userAvatar,
      });
      grouped[typeName].count++;
    });
    return Object.values(grouped);
  };

  const getFilteredUsers = () => {
    if (!post.reactions) return [];

    if (selectedReactionType === "all") {
      return post.reactions.map((reaction) => ({
        userId: reaction.userId,
        userFullName: reaction.userFullName,
        userAvatar: reaction.userAvatar,
        reactionType: {
          reactionTypeId: reaction.reactionTypeId,
          reactionName: reaction.reactionTypeName,
          iconUrl: reaction.reactionTypeIconUrl,
          emojiUnicode: reaction.reactionTypeEmojiUnicode,
        },
      }));
    }

    return post.reactions
      .filter((reaction) => reaction.reactionTypeName === selectedReactionType)
      .map((reaction) => ({
        userId: reaction.userId,
        userFullName: reaction.userFullName,
        userAvatar: reaction.userAvatar,
        reactionType: {
          reactionTypeId: reaction.reactionTypeId,
          reactionName: reaction.reactionTypeName,
          iconUrl: reaction.reactionTypeIconUrl,
          emojiUnicode: reaction.reactionTypeEmojiUnicode,
        },
      }));
  };

  const handleShareForFriend = async (post) => {
    try {
      if (!post?.groupId || !post?.postId) {
        showErrorMessage("Missing group or post ID");
        return;
      }

      const url = `https://3docorp.vn/groups/${post.groupId}#post-${post.postId}`;

      const message = `${"Take a look at this post!"}
  
  Join us and explore more great posts in the 3DO community.
  
  View now: ${url}`;

      const result = await Share.share({
        title: "Share Post",
        message: message,
        url: url,
      });

      if (result.action === Share.sharedAction) {
        showSuccessMessage("Post shared successfully");
      }
    } catch (error) {
      console.error("Share error:",error);
      showErrorMessage("Unable to share the post.");
    }
  };

  const renderReactionDetailsModal = () => {
    if (!post.reactions || post.reactions.length === 0) return null;

    const groupedReactions = groupReactionsByType(post.reactions);
    const filteredUsers = getFilteredUsers();


    return (
      <Modal
        visible={showReactionDetailsModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowReactionDetailsModal(false);
          setSelectedReactionType("all");
        }}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => {
            setShowReactionDetailsModal(false);
            setSelectedReactionType("all");
          }}
        >
          <View style={styles.reactionDetailsModal}>
            <Text style={styles.reactionDetailsTitle}>Reactions ({post.reactions.length})</Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.reactionTabsContainer}
              contentContainerStyle={styles.reactionTabsContent}
            >
              <TouchableOpacity
                style={[styles.reactionTab,selectedReactionType === "all" && styles.reactionTabActive]}
                onPress={() => setSelectedReactionType("all")}
              >
                <Text style={[styles.reactionTabText,selectedReactionType === "all" && styles.reactionTabTextActive]}>
                  All {post.reactions.length}
                </Text>
              </TouchableOpacity>

              {groupedReactions.map((group) => (
                <TouchableOpacity
                  key={group.reactionType.reactionName}
                  style={[
                    styles.reactionTab,
                    selectedReactionType === group.reactionType.reactionName && styles.reactionTabActive,
                  ]}
                  onPress={() => setSelectedReactionType(group.reactionType.reactionName)}
                >
                  <View style={styles.reactionTabContent}>
                    <Text style={styles.reactionTabEmoji}>
                      {unicodeToEmoji(group.reactionType.emojiUnicode)}
                    </Text>
                    <Text
                      style={[
                        styles.reactionTabCount,
                        selectedReactionType === group.reactionType.reactionName && styles.reactionTabCountActive,
                      ]}
                    >
                      {group.count}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <FlatList
              data={filteredUsers}
              keyExtractor={(item) => `${item.userId}-${item.reactionType?.reactionName || "unknown"}`}
              renderItem={({ item }) => {
                const { avatar,name } = getReactionUserInfo(item);

                return (
                  <View style={styles.reactionUserItem}>
                    <View style={styles.reactionUserAvatar}>
                      {avatar ? (
                        <Image source={{ uri: avatar }} style={styles.reactionUserAvatarImg} />
                      ) : (
                        <View style={styles.reactionUserAvatarPlaceholder}>
                          <Text style={styles.reactionUserAvatarText}>{name.charAt(0).toUpperCase()}</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.reactionUserDetails}>
                      <Text style={styles.reactionUserName}>{name}</Text>
                    </View>
                    {item.reactionType && (
                      <View style={styles.reactionUserReaction}>
                        <Text style={styles.reactionUserEmoji}>
                          {unicodeToEmoji(item.reactionType.emojiUnicode)}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              }}
              ListEmptyComponent={
                <View style={styles.noReactionsContainer}>
                  <Ionicons name="sad-outline" size={32} color="#64748B" />
                  <Text style={styles.noReactionsText}>
                    {selectedReactionType === "all" ? "No reactions yet." : "No one reacted with this reaction."}
                  </Text>
                </View>
              }
              style={styles.reactionUsersList}
            />

            <TouchableOpacity
              style={styles.closeReactionDetailsButton}
              onPress={() => {
                setShowReactionDetailsModal(false);
                setSelectedReactionType("all");
              }}
            >
              <Text style={styles.closeReactionDetailsText}>Close</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    );
  };

  const renderComment = ({ item }) => {
    const isMyComment = user && item.userId === user.userId;
    const isEditing = editCommentId === item.commentId;
    const { avatar,name } = getReactionUserInfo(item);

    return (
      <View style={styles.commentItem}>
        <TouchableOpacity
          onPress={() => {
            if (isMyComment && !isEditing) {
              setSelectedCommentMenu(selectedCommentMenu === item.commentId ? null : item.commentId);
            }
          }}
          activeOpacity={isMyComment ? 0.7 : 1}
        >
          <View style={styles.commentHeader}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.commentAvatar} />
            ) : (
              <View style={[styles.commentAvatar,{ backgroundColor: isMyComment ? "#3b82f6" : "#6b7280" }]}>
                <Text style={styles.commentAvatarText}>{name.charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <View style={styles.commentInfo}>
              <Text style={styles.commentAuthor}>{name}</Text>
              <Text style={styles.commentTime}>{new Date(item.createdAt).toLocaleString()}</Text>
            </View>
          </View>

          {isEditing ? (
            <View style={styles.editContainer}>
              <TextInput
                style={styles.editInput}
                value={editCommentText}
                onChangeText={setEditCommentText}
                multiline
                autoFocus
                placeholder="Enter your comment..."
                placeholderTextColor="#9ca3af"
              />

              <View style={styles.editActions}>
                {/* Cancel button */}
                <TouchableOpacity
                  onPress={() => {
                    setEditCommentId(null);
                    setEditCommentText("");
                  }}
                  style={[styles.editButton,styles.cancelButton]}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                {/* Save button */}
                <TouchableOpacity
                  onPress={handleSaveEditComment}
                  disabled={editLoading || !editCommentText.trim()}
                  style={[
                    styles.editButton,
                    styles.saveButton,
                    (editLoading || !editCommentText.trim()) && styles.saveButtonDisabled,
                  ]}
                >
                  {editLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.saveButtonText}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.commentTextContainer}>
              <Text style={styles.commentText}>{item.commentText}</Text>
            </View>
          )}
        </TouchableOpacity>

        {selectedCommentMenu === item.commentId && isMyComment && !isEditing && (
          <Modal
            transparent
            animationType="fade"
            visible={selectedCommentMenu === item.commentId}
            onRequestClose={() => setSelectedCommentMenu(null)}
          >
            <Pressable style={styles.modalOverlay} onPress={() => setSelectedCommentMenu(null)}>
              <View style={styles.commentMenuPopup}>
                {/* Edit Comment Button */}
                <TouchableOpacity style={styles.menuItem} onPress={() => handleEditComment(item)}>
                  <Ionicons name="pencil-outline" size={20} color="#4CAF50" style={styles.iconStyle} />
                  <Text style={styles.menuItemText}>Edit comment</Text>
                </TouchableOpacity>

                {/* Divider */}
                <View style={styles.menuDivider} />

                {/* Delete Comment Button */}
                <TouchableOpacity style={styles.menuItem} onPress={() => handleDeleteComment(item.commentId)}>
                  <Ionicons name="trash-outline" size={20} color="#EF4444" style={styles.iconStyle} />
                  <Text style={[styles.menuItemText,{ color: "#EF4444" }]}>Delete Comment</Text>
                </TouchableOpacity>

                <View style={styles.menuDivider} />
                {/* Cancel Button */}
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => setSelectedCommentMenu(null)}
                >
                  <Ionicons name="close-circle-outline" size={20} color="#6B7280" style={styles.iconStyle} />
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Modal>
        )}
      </View>
    );
  };

  function getAuthorInfo(post) {
    return {
      avatar:
        post?.user?.avatar ||
        post?.author?.avatar ||
        post?.userAvatar ||
        post?.avatar ||
        null,
      name:
        post?.user?.fullName ||
        post?.author?.fullName ||
        post?.userFullName ||
        post?.fullName ||
        post?.user?.name ||
        post?.author?.name ||
        "Anonymous User",
    };
  }

  const { avatar: authorAvatar,name: authorName } = getAuthorInfo(post);

  return (
    <GestureHandlerRootView style={styles.container}>
      <DynamicStatusBar backgroundColor={theme.primaryColor} />
      <Animated.View style={[styles.header]}>
        <Header
          title="Post detail"
          onBack={() => navigation.goBack()}
        />
      </Animated.View>

      <View style={styles.contentContainer}>
        <Animated.FlatList
          ref={flatListRef}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }],{ useNativeDriver: false })}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingBottom: isKeyboardVisible ? keyboardHeight + 80 : 120,
          }}
          ListHeaderComponent={
            <View style={styles.postContainer}>
              <View style={styles.postHeader}>
                {authorAvatar ? (
                  <Image source={{ uri: authorAvatar }} style={styles.authorAvatar} />
                ) : (
                  <View style={styles.authorAvatar}>
                    <Text style={styles.authorAvatarText}>{authorName.charAt(0).toUpperCase()}</Text>
                  </View>
                )}

                <View style={styles.authorInfo}>
                  <Text style={styles.authorName}>{authorName}</Text>
                  <Text style={styles.postTime}>{new Date(post.createdAt).toLocaleString()}</Text>
                </View>

                {user && post.userId === user.userId && (
                  <TouchableOpacity
                    onPress={() => setShowPostMenu(!showPostMenu)}
                    style={styles.menuButton}
                    activeOpacity={0.7}
                  >
                    <MaterialCommunityIcons name="dots-vertical" size={24} color="#6b7280" />
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.postContentBox}>
                <RenderHtml
                  contentWidth={width - 32}
                  source={{
                    html: showFullContent
                      ? post.content || "<p>No content available</p>"
                      : truncateContent(post.content || "<p>No content available</p>",200),
                  }}
                  tagsStyles={{
                    p: { fontSize: 16,lineHeight: 24,color: "#374151",margin: 0 },
                    strong: { fontWeight: "600",color: "#1f2937" },
                    em: { fontStyle: "italic",color: "#6b7280" },
                  }}
                />

                {!showFullContent && post.content && post.content.replace(/<[^>]*>/g,"").length > 200 && (
                  <TouchableOpacity onPress={() => setShowFullContent(true)} style={styles.readMoreButton}>
                    <Text style={styles.readMoreText}>More</Text>
                  </TouchableOpacity>
                )}

                {showFullContent && post.content && post.content.replace(/<[^>]*>/g,"").length > 200 && (
                  <TouchableOpacity onPress={() => setShowFullContent(false)} style={styles.readMoreButton}>
                    <Text style={styles.readMoreText}>Collapse</Text>
                  </TouchableOpacity>
                )}
              </View>

              {post.thumbnail && post.thumbnail !== "DEFAULT_IMAGE" && (
                <TouchableOpacity
                  style={styles.postImageContainer}
                  onPress={() => {
                    setSelectedImage(post.thumbnail);
                    setShowImageModal(true);
                    resetImageTransform();
                  }}
                  activeOpacity={0.9}
                >
                  <Image source={{ uri: post.thumbnail }} style={styles.postImage} />
                </TouchableOpacity>
              )}

              {post.tags && post.tags.length > 0 && (
                <View style={styles.tagsContainer}>
                  {post.tags.slice(0,3).map((tag) => (
                    <View key={tag.tagId} style={styles.tagChip}>
                      <Text style={styles.tagText}>#{tag.tagName}</Text>
                    </View>
                  ))}
                  {post.tags.length > 3 && <Text style={styles.moreTagsText}>+{post.tags.length - 3} more</Text>}
                </View>
              )}

              <View>
                {post.reactions && post.reactions.length > 0 && (
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      marginBottom: 8,
                      marginTop: 4,
                      paddingLeft: 2,
                    }}
                    onPress={() => {
                      setSelectedReactionType('all');
                      setShowReactionDetailsModal(true);
                    }}
                    activeOpacity={0.85}
                  >
                    <View style={{ flexDirection: 'row',alignItems: 'center',marginRight: 6 }}>
                      {Array.from(new Set(post.reactions.map(r => r.reactionTypeEmojiUnicode)))
                        .filter(Boolean)
                        .slice(0,3)
                        .map((unicode,idx) => (
                          <View
                            key={unicode + idx}
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: 12,
                              backgroundColor: '#fff',
                              justifyContent: 'center',
                              alignItems: 'center',
                              marginLeft: idx === 0 ? 0 : -8,
                              borderWidth: 1,
                              borderColor: '#fff',
                              shadowColor: '#000',
                              shadowOffset: { width: 0,height: 1 },
                              shadowOpacity: 0.08,
                              shadowRadius: 2,
                              elevation: 2,
                            }}
                          >
                            <Text style={{ fontSize: 16 }}>{unicodeToEmoji(unicode)}</Text>
                          </View>
                        ))}
                    </View>
                    <Text style={{ color: '#65676B',fontSize: 14,fontWeight: '500',marginLeft: 2 }}>
                      {post.reactions.length}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.interactionBar}>
                <Animated.View style={{ transform: [{ scale: likeAnimation }] }}>
                  <TouchableOpacity
                    onPress={() => {
                      if (post.reactions && post.reactions.length > 0) {
                        setSelectedReactionType("all");
                        setShowReactionDetailsModal(true);
                      } else {
                        setShowReactionPicker(true);
                      }
                    }}
                    onLongPress={() => setShowReactionPicker(true)}
                    style={styles.interactionButton}
                    delayLongPress={300}
                  >
                    {(() => {
                      const userReaction = post.reactions?.find((r) => r.userId === user?.userId);
                      if (userReaction) {
                        if (userReaction.reactionTypeIconUrl && isValidImageUrl(userReaction.reactionTypeIconUrl)) {
                          return (
                            <Image source={{ uri: userReaction.reactionTypeIconUrl }} style={styles.reactionTypeIcon} />
                          );
                        } else if (userReaction.reactionTypeEmojiUnicode) {
                          const emoji = unicodeToEmoji(userReaction.reactionTypeEmojiUnicode);
                          return <Text style={styles.reactionEmoji}>{emoji}</Text>;
                        }
                      }
                      return (
                        <MaterialCommunityIcons
                          name={liked ? "heart" : "heart-outline"}
                          size={22}
                          color={liked ? "#ef4444" : "#6b7280"}
                        />
                      );
                    })()}
                    <Text style={[styles.interactionText,liked && { color: "#ef4444" }]}>{likeCount}</Text>
                  </TouchableOpacity>
                </Animated.View>

                {showReactionPicker && (
                  <Modal transparent animationType="fade" visible={showReactionPicker}>
                    <Pressable style={styles.modalOverlay} onPress={() => setShowReactionPicker(false)}>
                      <View style={styles.reactionPickerModal}>
                        <Text style={styles.reactionPickerTitle}>Reactions</Text>
                        <View style={styles.reactionTypesContainer}>
                          {reactionTypes.map((rt) => (
                            <TouchableOpacity
                              key={rt.reactionTypeId}
                              style={styles.reactionTypeButton}
                              onPress={async () => {
                                setShowReactionPicker(false);
                                try {
                                  const userReaction = post.reactions?.find((r) => r.userId === user?.userId);
                                  let updatedReactions;
                                  if (userReaction) {
                                    if (userReaction.reactionTypeId !== rt.reactionTypeId) {
                                      updatedReactions = [
                                        ...post.reactions.filter((r) => r.userId !== user.userId),
                                        {
                                          userId: user.userId,
                                          userFullName: user.fullName || "You",
                                          userAvatar: user.avatar || null,
                                          reactionTypeId: rt.reactionTypeId,
                                          reactionTypeName: rt.reactionName,
                                          reactionTypeIconUrl: rt.iconUrl,
                                          reactionTypeEmojiUnicode: rt.emojiUnicode,
                                        },
                                      ];
                                      setLikeCount((prev) => prev);
                                    } else {
                                      updatedReactions = post.reactions.filter((r) => r.userId !== user.userId);
                                      setLikeCount((prev) => prev - 1);
                                      setLiked(false);
                                    }
                                  } else {
                                    updatedReactions = [
                                      ...(post.reactions || []),
                                      {
                                        userId: user.userId,
                                        userFullName: user.fullName || "You",
                                        userAvatar: user.avatar || null,
                                        reactionTypeId: rt.reactionTypeId,
                                        reactionTypeName: rt.reactionName,
                                        reactionTypeIconUrl: rt.iconUrl,
                                        reactionTypeEmojiUnicode: rt.emojiUnicode,
                                      },
                                    ];
                                    setLikeCount((prev) => prev + 1);
                                    setLiked(true);
                                  }
                                  setPost((prev) => ({ ...prev,reactions: updatedReactions }));

                                  await reactToPost(post.postId,rt.reactionTypeId);
                                  await fetchPost();
                                  showSuccessMessage("Reaction successfully");
                                } catch (e) {
                                  showErrorFetchAPI(e);
                                  setPost((prev) => ({ ...prev,reactions: post.reactions }));
                                  setLikeCount(post.reactions?.length || 0);
                                  setLiked(!!post.reactions?.find((r) => r.userId === user?.userId));
                                }
                              }}
                            >
                              <Text style={styles.reactionTypeEmojiLarge}>
                                {unicodeToEmoji(rt.emojiUnicode)}
                              </Text>
                              <Text style={styles.reactionTypeName}>{rt.reactionName}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    </Pressable>
                  </Modal>
                )}

                <Modal visible={showImageModal} transparent animationType="fade">
                  <View style={styles.imageModalOverlay}>
                    <View style={styles.imageModalHeader}>
                      <TouchableOpacity style={styles.imageModalBackButton} onPress={() => setShowImageModal(false)}>
                        <Ionicons name="arrow-back" size={28} color="#fff" />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.imageModalContent}>
                      <PanGestureHandler
                        ref={panRef}
                        onGestureEvent={onPanEvent}
                        onHandlerStateChange={onPanStateChange}
                        simultaneousHandlers={pinchRef}
                        minPointers={1}
                        maxPointers={1}
                      >
                        <Animated.View style={styles.imageContainer}>
                          <PinchGestureHandler
                            ref={pinchRef}
                            onGestureEvent={onPinchEvent}
                            onHandlerStateChange={onPinchStateChange}
                            simultaneousHandlers={panRef}
                          >
                            <Animated.View style={styles.imageContainer}>
                              <TouchableOpacity
                                activeOpacity={1}
                                onPress={handleDoubleTap}
                                style={styles.imageContainer}
                              >
                                <Animated.Image
                                  source={{ uri: selectedImage }}
                                  style={[
                                    styles.imageModalImage,
                                    {
                                      transform: [{ scale: scale },{ translateX: translateX },{ translateY: translateY }],
                                    },
                                  ]}
                                  resizeMode="contain"
                                />
                              </TouchableOpacity>
                            </Animated.View>
                          </PinchGestureHandler>
                        </Animated.View>
                      </PanGestureHandler>
                    </View>

                    <View style={styles.imageModalInstructions}>
                      <Text style={styles.instructionText}>Nhấn đúp để reset zoom</Text>
                    </View>
                  </View>
                </Modal>

                <TouchableOpacity
                  style={styles.interactionButton}
                  onPress={() => {
                    inputRef?.current?.focus();
                  }}
                >
                  <MaterialCommunityIcons name="comment-outline" size={20} color="#6b7280" />
                  <Text style={styles.interactionText}>{comments.length}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.interactionButton} onPress={() => handleShareForFriend(post)}>
                  <Feather name="share" size={18} color="#6b7280" />
                  <Text style={styles.interactionText}>Share</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.commentsHeader}>
                <Text style={styles.commentsTitle}>Comment ({comments.length})</Text>
              </View>
            </View>
          }
          data={comments}
          keyExtractor={(item) => item.commentId?.toString() || Math.random().toString()}
          renderItem={renderComment}
          ListEmptyComponent={
            loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={styles.loadingText}>Loading comment...</Text>
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons name="comment-outline" size={48} color="#d1d5db" />
                <Text style={styles.emptyText}>No comments yet</Text>
                <Text style={styles.emptySubText}>Be the first to comment!</Text>
              </View>
            )
          }
        />

        {!editCommentId && (
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
            style={[
              styles.inputContainer,
              {
                bottom: isKeyboardVisible ? 0 : 0,
                paddingBottom: Platform.OS === "ios" ? (isKeyboardVisible ? 10 : 34) : isKeyboardVisible ? 10 : 24,
              },
            ]}
          >
            <View style={styles.inputWrapper}>
              <TextInput
                ref={inputRef}
                style={[styles.input,{ minHeight: 44,maxHeight: 120 }]}
                placeholder="Enter your comment..."
                placeholderTextColor="#9ca3af"
                value={commentText}
                onChangeText={setCommentText}
                multiline
                maxLength={500}
                onFocus={() => {
                  setTimeout(() => {
                    flatListRef?.current?.scrollToEnd?.({ animated: true });
                  },300);
                }}
              />
              <TouchableOpacity
                onPress={handleSendComment}
                disabled={sending || !commentText.trim()}
                style={[styles.sendButton,(sending || !commentText.trim()) && styles.sendButtonDisabled]}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="send" size={18} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        )}
      </View>

      {showPostMenu && (
        <Modal transparent animationType="fade" visible={showPostMenu} onRequestClose={() => setShowPostMenu(false)}>
          <Pressable style={styles.modalOverlay} onPress={() => setShowPostMenu(false)}>
            <View style={styles.postMenuModal}>
              <TouchableOpacity
                onPress={() => {
                  setShowPostMenu(false);
                  navigation.navigate("EditPostScreen",{ post });
                }}
                style={styles.menuItem}
                activeOpacity={0.7}
              >
                <Feather name="edit-2" size={18} color="#3b82f6" />
                <Text style={styles.menuItemText}>Edit post</Text>
              </TouchableOpacity>
              <View style={styles.menuDivider} />
              <TouchableOpacity onPress={handleDeletePost} style={styles.menuItem} activeOpacity={0.7}>
                <Feather name="trash-2" size={18} color="#ef4444" />
                <Text style={[styles.menuItemText,{ color: "#ef4444" }]}>Delete post</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Modal>
      )}

      {renderReactionDetailsModal()}
      <FlashMessage position="top" />
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  contentContainer: {
    flex: 1,
    marginTop: 20
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.01)",
    zIndex: 1000,
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    zIndex: 1000,
  },

  backButton: {
    marginTop: 45,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    backgroundColor: "#F1F5F9",
  },
  headerTitle: {
    marginTop: 45,
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
    flex: 1,
  },
  postContainer: {
    marginTop: 110,
    backgroundColor: "#fff",
    borderRadius: 16,
    margin: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  authorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#3b82f6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  authorAvatarText: {
    fontWeight: "600",
    fontSize: 18,
    color: "#fff",
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontWeight: "600",
    fontSize: 16,
    color: "#1f2937",
    marginBottom: 2,
  },
  postTime: {
    fontSize: 13,
    color: "#6b7280",
  },
  menuButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f9fafb",
  },
  postMenuModal: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 8,
    minWidth: 180,
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    position: "absolute",
    top: 150,
    right: 30,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    width: "100%",
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#374151",
    marginLeft: 12,
  },
  menuDivider: {
    height: 1,
    backgroundColor: "#f3f4f6",
    width: "100%",
    marginVertical: 4,
  },
  postContentBox: {
    marginBottom: 16,
  },
  readMoreButton: {
    marginTop: 8,
    alignSelf: "flex-start",
  },
  readMoreText: {
    color: "#3b82f6",
    fontSize: 14,
    fontWeight: "500",
  },
  postImageContainer: {
    marginBottom: 16,
  },
  postImage: {
    width: "100%",
    height: 200,
    borderRadius: 12,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 16,
    gap: 8,
  },
  tagChip: {
    backgroundColor: "#f3f4f6",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tagText: {
    color: "#6b7280",
    fontSize: 13,
    fontWeight: "500",
  },
  moreTagsText: {
    color: "#9ca3af",
    fontSize: 13,
    alignSelf: "center",
  },
  interactionBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  interactionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderRadius: 20,
    gap: 2,
  },
  interactionText: {
    color: "#6b7280",
    fontSize: 14,
    fontWeight: "500",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  reactionPickerModal: {
    width: "90%",
    maxWidth: 400,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  reactionPickerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 16,
    textAlign: "center",
  },
  reactionTypesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
  },
  reactionTypeButton: {
    flexDirection: "column",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    minWidth: 70,
    maxWidth: 80,
  },
  reactionTypeIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  reactionTypeIconLarge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginBottom: 6,
  },
  reactionTypeEmoji: {
    fontSize: 18,
    lineHeight: 24,
  },
  reactionTypeEmojiLarge: {
    fontSize: 28,
    lineHeight: 32,
    marginBottom: 6,
  },
  reactionTypeName: {
    fontSize: 12,
    color: "#374151",
    fontWeight: "500",
    textAlign: "center",
    marginTop: 4,
  },
  reactionEmoji: {
    fontSize: 20,
  },
  commentsHeader: {
    marginTop: 20,
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  commentsTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
  },
  commentItem: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  commentAvatarText: {
    fontWeight: "600",
    fontSize: 14,
    color: "#fff",
  },
  commentInfo: {
    flex: 1,
  },
  commentAuthor: {
    fontWeight: "600",
    fontSize: 14,
    color: "#1f2937",
    marginBottom: 2,
  },
  commentTime: {
    fontSize: 12,
    color: "#9ca3af",
  },
  commentTextContainer: {
    marginTop: 4,
  },
  commentText: {
    fontSize: 15,
    lineHeight: 20,
    color: "#374151",
  },
  editContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    width: "100%",
    maxWidth: 400,
    elevation: 10,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0,height: 4 },
    marginVertical: 30,
  },
  editInput: {
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    color: "#111827",
    borderWidth: 1,
    borderColor: "#d1d5db",
    minHeight: 120,
    textAlignVertical: "top",
  },
  editActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 16,
  },
  editButton: {
    paddingHorizontal: 20,
    borderRadius: 8,
    marginLeft: 8,
    justifyContent: "center",
    alignItems: "center",
  },

  cancelButton: {
    backgroundColor: "#f3f4f6",
    borderColor: "#d1d5db",
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 16,
    color: "#6b7280",
  },

  saveButton: {
    backgroundColor: "#0056d2",
  },

  saveButtonDisabled: {
    backgroundColor: "#9ca3af",
  },

  saveButtonText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "bold",
  },
  commentMenuPopup: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 8,
    minWidth: 160,
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: "#6b7280",
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    color: "#6b7280",
    fontWeight: "500",
  },
  emptySubText: {
    fontSize: 14,
    color: "#9ca3af",
    textAlign: "center",
  },
  inputContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    paddingHorizontal: 16,
    paddingTop: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0,height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
    marginBottom: 20,
  },
  input: {
    flex: 1,
    backgroundColor: "#f9fafb",
    borderRadius: 5,
    paddingHorizontal: 16,
    paddingVertical: 20,
    fontSize: 15,
    color: "#374151",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    textAlignVertical: "top",
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#3b82f6",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0,height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
    top: -10,
  },
  sendButtonDisabled: {
    backgroundColor: "#d1d5db",
    shadowOpacity: 0,
    elevation: 0,
  },
  // New styles for zoomable image modal
  imageModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
  },
  imageModalHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    justifyContent: "flex-end",
    paddingBottom: 10,
    paddingHorizontal: 20,
    zIndex: 10,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  imageModalBackButton: {
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 20,
    padding: 8,
    alignSelf: "flex-start",
  },
  imageModalContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  imageContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: width,
    height: height,
  },
  imageModalImage: {
    width: width,
    height: height * 0.8,
  },
  imageModalInstructions: {
    position: "absolute",
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
    paddingVertical: 10,
  },
  instructionText: {
    color: "#fff",
    fontSize: 14,
    opacity: 0.8,
  },
  reactionDetailsModal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    margin: 20,
    maxWidth: 350,
    width: "90%",
    maxHeight: "80%",
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  reactionDetailsTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
    textAlign: "center",
    marginBottom: 16,
  },
  reactionTabsContainer: {
    marginBottom: 16,
    maxHeight: 50,
  },
  reactionTabsContent: {
    paddingHorizontal: 4,
    gap: 8,
  },
  reactionTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F0F2F5",
    borderWidth: 1,
    borderColor: "#E4E6EA",
    minWidth: 60,
    alignItems: "center",
  },
  reactionTabActive: {
    backgroundColor: "#1877F2",
    borderColor: "#1877F2",
  },
  reactionTabContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  reactionTabEmoji: {
    fontSize: 16,
  },
  reactionTabIcon: {
    width: 16,
    height: 16,
  },
  reactionTabText: {
    fontSize: 14,
    color: "#65676B",
    fontWeight: "600",
  },
  reactionTabTextActive: {
    color: "#FFFFFF",
  },
  reactionTabCount: {
    fontSize: 14,
    color: "#65676B",
    fontWeight: "600",
  },
  reactionTabCountActive: {
    color: "#FFFFFF",
  },
  reactionUsersList: {
    maxHeight: height * 0.4,
  },
  reactionUserItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 12,
  },
  reactionUserAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E4E6EA",
    justifyContent: "center",
    alignItems: "center",
  },
  reactionUserAvatarImg: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  reactionUserAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#1877F2",
    justifyContent: "center",
    alignItems: "center",
  },
  reactionUserAvatarText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  reactionUserDetails: {
    flex: 1,
  },
  reactionUserName: {
    fontSize: 14,
    color: "#1C1E21",
    fontWeight: "500",
  },
  reactionUserReaction: {
    alignItems: "center",
    justifyContent: "center",
  },
  reactionUserEmoji: {
    fontSize: 18,
  },
  reactionUserIcon: {
    width: 18,
    height: 18,
  },
  noReactionsContainer: {
    alignItems: "center",
    paddingVertical: 24,
  },
  noReactionsText: {
    fontSize: 16,
    color: "#64748B",
    textAlign: "center",
    marginTop: 8,
    fontWeight: "500",
  },
  closeReactionDetailsButton: {
    backgroundColor: "#4F46E5",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 16,
  },
  closeReactionDetailsText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  commentMenuPopup: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    width: "80%",
    elevation: 10,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0,height: 4 },
  },

  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 10,
    justifyContent: "flex-start",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
    shadowOffset: { width: 0,height: 1 },
  },

  menuItemText: {
    fontSize: 16,
    color: "#333",
    marginLeft: 10,
    fontWeight: "500",
  },

  menuDivider: {
    height: 1,
    backgroundColor: "#e5e7eb",
    marginVertical: 8,
  },

  cancelButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#f3f4f6"
  },

  cancelButtonText: {
    fontSize: 16,
    color: "#6b7280",
    marginLeft: 10,
    fontWeight: "500",
  },

  iconStyle: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
})

export default PostDetailScreen

export function getUserAvatarAndName(obj) {
  return {
    avatar:
      obj?.user?.avatar ||
      obj?.user?.avatarUser ||
      obj?.userAvatar ||
      obj?.avatar ||
      null,
    name:
      obj?.user?.fullName ||
      obj?.userFullName ||
      obj?.user?.name ||
      obj?.author?.fullName ||
      obj?.author?.name ||
      obj?.fullName ||
      obj?.name ||
      null,
  }
}

function getReactionUserInfo(item) {
  return {
    avatar: item.userAvatar || item.user?.avatar || item.avatar || null,
    name: item.userFullName || item.user?.fullName || item.fullName || `User ${item.userId}`,
  }
}

function isValidImageUrl(url) {
  return (
    typeof url === "string" &&
    url.startsWith("http") &&
    /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(url.split(/[?#]/)[0])
  );
}
