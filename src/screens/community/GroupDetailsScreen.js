import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  Image,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Alert,
  FlatList,
  TextInput,
  Modal,
  Pressable,
  Dimensions,
  Animated,
  Platform,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, Feather } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { AuthContext } from "context/AuthContext";
import { deleteGroup } from "services/apiCommunityService";
import {
  getGroupActiveById,
  joinGroup,
  leaveGroup,
  getGroupPosts,
  getAllReactionTypes,
  getCommentsByPostId,
  addCommentByUser,
  editCommentByUser,
  deleteUserComment,
  deletePost,
  reactToPost,
  unreactToPost,
  getAllActiveReportReasons,
  createReportByUser,
  getGroupJoinRequests,
  updatePostStatus,
  updateCommentStatus,
} from "services/apiCommunityService";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import RenderHtml from "react-native-render-html";
import DynamicStatusBar from "screens/statusBar/DynamicStatusBar";
import { theme } from "theme/color";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { getUserById } from "services/apiUserService";
const { width, height } = Dimensions.get("window");

import { getActivePostByIdForUser } from "services/apiCommunityService";

const GroupDetailsScreen = ({ route }) => {
  const navigation = useNavigation();
  const { groupId } = route.params;
  const { user } = React.useContext(AuthContext);
  // Đảm bảo biến group đã được set trước khi so sánh
const [isOwner, setIsOwner] = useState(false);
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState(null);
  const [posts, setPosts] = useState([]);
  const [postLoading, setPostLoading] = useState(false);
  const [postError, setPostError] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  // Filter states
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filters, setFilters] = useState({
    startDate: null,
    endDate: null,
    status: "active",
    validPageSize: 10,
  });
  const [tempFilters, setTempFilters] = useState(filters);
  const [showCustomStartDatePicker, setShowCustomStartDatePicker] = useState(false);
  const [showCustomEndDatePicker, setShowCustomEndDatePicker] = useState(false);

  // Reaction and comment states
  const [reactionTypes, setReactionTypes] = useState([]);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [reactionPickerPosition, setReactionPickerPosition] = useState({ x: 0, y: 0 });
  const [showCommentsForPost, setShowCommentsForPost] = useState(null);
  const [commentsByPost, setCommentsByPost] = useState({});
  const [loadingComments, setLoadingComments] = useState({});
  const [commentInputs, setCommentInputs] = useState({});
  const [commentSending, setCommentSending] = useState({});
  const [commentError, setCommentError] = useState({});
  const [commentLoading, setCommentLoading] = useState({});
  const [reactionLoading, setReactionLoading] = useState({});
  const [showReactionDetailsModal, setShowReactionDetailsModal] = useState(false);
  const [selectedReactionPost, setSelectedReactionPost] = useState(null);
  const [selectedReactionType, setSelectedReactionType] = useState("all");
const [pendingCount, setPendingCount] = useState(0);
  // Edit and action states
  const [editModal, setEditModal] = useState({ visible: false, comment: null, postId: null });
  const [editInput, setEditInput] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");
  const [actionMenu, setActionMenu] = useState({ visible: false, comment: null, postId: null });
  const [currentUser, setCurrentUser] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [postActionMenu, setPostActionMenu] = useState({ visible: false, post: null });
  const [deletePostLoading, setDeletePostLoading] = useState(false);

  // Report states
  const [reportModal, setReportModal] = useState({ visible: false, post: null });
  const [reportReasons, setReportReasons] = useState([]);
  const [selectedReason, setSelectedReason] = useState(null);
  const [reportDetails, setReportDetails] = useState("");
  const [reportLoading, setReportLoading] = useState(false);
  const [reportStatus, setReportStatus] = useState("");

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const reactionPickerScale = useRef(new Animated.Value(0)).current;
  const reactionPickerOpacity = useRef(new Animated.Value(0)).current;

  // Refs for measuring button position
  const likeButtonRefs = useRef({});

  // Animation setup
  useEffect(() => {
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
    ]).start();

    return () => {
      fadeAnim.setValue(0);
      slideAnim.setValue(30);
      scaleAnim.setValue(0.95);
    };
  }, []);

  // Animate reaction picker when it shows/hides
  useEffect(() => {
    if (showReactionPicker) {
      Animated.parallel([
        Animated.spring(reactionPickerScale, {
          toValue: 1,
          tension: 150,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(reactionPickerOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(reactionPickerScale, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(reactionPickerOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showReactionPicker]);

  // Facebook-style reaction picker handler
  const handleLongPressReaction = (post, event) => {
    if (!reactionTypes || reactionTypes.length === 0) {
      Alert.alert("Error", "No reaction types available. Please try again later.");
      return;
    }

    // Get the button position
    const buttonRef = likeButtonRefs.current[post.postId];
    if (buttonRef) {
      buttonRef.measure((x, y, width, height, pageX, pageY) => {
        // Calculate position above the button
        const pickerWidth = reactionTypes.length * 50 + 20; // Approximate width
        const pickerHeight = 60;
        
        let positionX = pageX - (pickerWidth / 2) + (width / 2);
        let positionY = pageY - pickerHeight - 10;

        // Keep picker within screen bounds
        if (positionX < 10) positionX = 10;
        if (positionX + pickerWidth > Dimensions.get('window').width - 10) {
          positionX = Dimensions.get('window').width - pickerWidth - 10;
        }
        if (positionY < 50) positionY = pageY + height + 10;

        setReactionPickerPosition({ x: positionX, y: positionY });
        setSelectedPostId(post.postId);
        setShowReactionPicker(true);
      });
    }
  };

  const closeReactionPicker = () => {
    setShowReactionPicker(false);
    setSelectedPostId(null);
  };

  const fetchComments = async (postId, groupId) => {
    setLoadingComments((prev) => ({ ...prev, [postId]: true }));
    try {
      const comments = await getCommentsByPostId(postId);
      const normalizedComments = (comments || []).map((c) => {
        const userAvatar = c.userAvatar || null;
        return {
          ...c,
          userFullName: c.userFullName || "Anonymous User",
          userAvatar,
        };
      });
      setCommentsByPost((prev) => ({
        ...prev,
        [postId]: normalizedComments,
      }));
      if (groupId) {
        const groupPosts = await getGroupPosts(groupId);
        const freshPost = groupPosts.find((p) => p.postId === postId);
        if (freshPost) {
          const normalizedPost = {
            ...freshPost,
            user: {
              avatar:
                freshPost.user?.avatar ||
                freshPost.userAvatar ||
                freshPost.avatar ||
                freshPost.user?.avatarUser ||
                null,
              fullName:
                freshPost.user?.fullName ||
                freshPost.userFullName ||
                freshPost.fullName ||
                freshPost.user?.name ||
                "Anonymous User",
            },
            author: freshPost.author
              ? {
                  avatar: freshPost.author.avatar || freshPost.author.avatarUser || null,
                  fullName: freshPost.author.fullName || freshPost.author.name || "Anonymous User",
                }
              : undefined,
          };
          setPosts((prevPosts) =>
            prevPosts.map((p) => (p.postId === postId ? normalizedPost : p))
          );
        }
      }
    } catch (e) {
      setCommentError((prev) => ({
        ...prev,
        [postId]: e.message || "Failed to load comments",
      }));
      setCommentsByPost((prev) => ({
        ...prev,
        [postId]: [],
      }));
    } finally {
      setLoadingComments((prev) => ({ ...prev, [postId]: false }));
    }
  };
const fetchGroupAndPosts = async (page = 1, refresh = false) => {
  try {
    if (refresh) {
      setRefreshing(true);
    } else if (page === 1) {
      setLoading(true);
    }

    const formatDate = (date) => {
      if (!date) return undefined;
      return `${(date.getMonth() + 1).toString().padStart(2, "0")}-${date
        .getDate()
        .toString()
        .padStart(2, "0")}-${date.getFullYear()}`;
    };

    const queryParams = {
      PageNumber: page,
      PageSize: pageSize,
      SearchTerm: searchTerm || undefined,
      StartDate: formatDate(filters.startDate),
      EndDate: formatDate(filters.endDate),
      Status: filters.status || undefined,
      ValidPageSize: filters.validPageSize,
    };

    // Thêm getGroupJoinRequests vào Promise.all nếu user là chủ nhóm
    const promises = [
      getGroupActiveById(groupId),
      getGroupPosts(groupId, queryParams),
      getAllReactionTypes(),
    ];

    let updatedGroupData = null;
    const [groupData, postsResponse, reactionTypesData] = await Promise.all(promises);

    // Kiểm tra quyền chủ nhóm ngay sau khi lấy groupData
    const isGroupOwner = user?.email && groupData?.creator?.email && user.email === groupData.creator.email;

    if (isGroupOwner) {
      promises.push(getGroupJoinRequests(groupId, 'pending'));
    }

    // Xử lý groupData
    updatedGroupData = groupData;
    if (!groupData?.creator?.email && groupData?.creator?.userId) {
      try {
        const userData = await getUserById(groupData.creator.userId);
        updatedGroupData = {
          ...groupData,
          creator: {
            ...groupData.creator,
            email: userData?.email || "unknown@example.com",
          },
        };
      } catch (err) {
        updatedGroupData = {
          ...groupData,
          creator: {
            ...groupData.creator,
            email: "unknown@example.com",
          },
        };
      }
    }
    setGroup(updatedGroupData);

    // Xử lý posts
    if (postsResponse && Array.isArray(postsResponse)) {
      const newPosts = page === 1 ? postsResponse : [...posts, ...postsResponse];
      setPosts(newPosts);
      setTotalCount(newPosts.length);
      setHasMore(newPosts.length === pageSize);
    } else if (postsResponse && postsResponse.posts) {
      const newPosts = page === 1 ? postsResponse.posts : [...posts, ...postsResponse.posts];
      setPosts(newPosts);
      setTotalCount(postsResponse.totalCount || postsResponse.posts.length);
      setTotalPages(postsResponse.totalPages || 1);
      setHasMore(page < postsResponse.totalPages);
    } else {
      setPosts([]);
      setTotalCount(0);
      setTotalPages(1);
      setHasMore(false);
    }

    // Xử lý reaction types
    if (reactionTypesData && Array.isArray(reactionTypesData) && reactionTypesData.length > 0) {
      setReactionTypes(reactionTypesData);
    } else {
      setReactionTypes([]);
    }

    // Xử lý join requests nếu là chủ nhóm
    if (isGroupOwner) {
      const joinRequestsData = await getGroupJoinRequests(groupId, 'pending');
      setPendingCount(joinRequestsData?.totalCount || 0);
    } else {
      setPendingCount(0);
    }
  } catch (err) {
    setError(err.message || "Error loading group details");
    if (err.message.includes("reaction types")) {
      Alert.alert("Error", "Failed to load reaction types. Some features may be unavailable.");
    }
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
};

  useFocusEffect(
    React.useCallback(() => {
      fetchGroupAndPosts(pageNumber);
    }, [groupId, pageNumber, searchTerm, filters])
  );

useEffect(() => {
  if (group && user?.email && group?.creator?.email) {
    const ownerStatus = user.email === group.creator.email;
    setIsOwner(ownerStatus);
  } else {
    setIsOwner(false);
  }
}, [group, user]);

const handleJoinOrDelete = async () => {
  if (!group) return;
  setJoining(true);

  try {
    if (isOwner) {
      Alert.alert(
        "Confirm Delete",
        "Are you sure you want to delete this group? This action cannot be undone.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              try {
                await deleteGroup(group.groupId);
                Alert.alert("Success", "Group deleted successfully.");
                navigation.goBack();
              } catch (err) {
                Alert.alert("Error", err.message || "Unable to delete group");
              }
            },
          },
        ]
      );
    } else if (group.isJoin) {
      await leaveGroup(group.groupId);
      Alert.alert("Success", "You have left the group successfully!");
      setGroup((prev) => ({
        ...prev,
        isJoin: false,
        isRequested: false,
        memberCount: prev.memberCount > 0 ? prev.memberCount - 1 : 0,
      }));
    } else {
      await joinGroup(group.groupId, group.isPrivate);
      Alert.alert(
        "Success",
        group.isPrivate ? "Join request sent! Please wait for approval." : "You have joined the group successfully!"
      );
      setGroup((prev) => ({
        ...prev,
        isJoin: !group.isPrivate,
        isRequested: group.isPrivate ? true : false,
        memberCount: prev.memberCount + 1,
      }));
    }
    await fetchGroupAndPosts(pageNumber);
  } catch (err) {
    Alert.alert("Error", err.message || "Unable to perform this action");
  } finally {
    setJoining(false);
  }
};

  const handleSearch = (text) => {
    setSearchTerm(text);
    setPageNumber(1);
  };

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages && !loading) {
      setPageNumber(page);
    }
  };

  const applyTempFilters = () => {
    setFilters(tempFilters);
    setPageNumber(1);
    setShowFilterModal(false);
    fetchGroupAndPosts(1);
  };

  const resetTempFilters = () => {
    const resetFilters = {
      startDate: null,
      endDate: null,
      status: "active",
      validPageSize: 10,
    };
    setTempFilters(resetFilters);
    setFilters(resetFilters);
    setPageNumber(1);
  };

  const formatDisplayDate = (date) => {
    if (!date) return "Select Date";
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleShowComments = async (postId, groupId) => {
    if (showCommentsForPost === postId) {
      setShowCommentsForPost(null);
      return;
    }
    setShowCommentsForPost(postId);
    await fetchComments(postId, groupId);
  };

  const handleSendComment = async (postId) => {
    const text = commentInputs[postId]?.trim();
    if (!text) return;
    setCommentLoading((prev) => ({ ...prev, [postId]: true }));
    setCommentError((prev) => ({ ...prev, [postId]: "" }));
    const fakeComment = {
      commentId: `temp-${Date.now()}`,
      userId: currentUserId,
      userFullName: "You",
      commentText: text,
      createdAt: new Date().toISOString(),
      userAvatar: null,
    };
    setCommentsByPost((prev) => ({
      ...prev,
      [postId]: [fakeComment, ...(prev[postId] || [])],
    }));
    setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
    try {
      await addCommentByUser(postId, text);
      const comments = await getCommentsByPostId(postId);
      setCommentsByPost((prev) => ({ ...prev, [postId]: comments }));
    } catch (e) {
      setCommentError((prev) => ({ ...prev, [postId]: e.message || "Failed to send comment" }));
    } finally {
      setCommentLoading((prev) => ({ ...prev, [postId]: false }));
    }
  };

  const handleEditComment = async () => {
    if (!editModal.comment || !editModal.postId) return;
    if (!editInput.trim()) {
      setEditError("Content cannot be empty");
      return;
    }
    setEditLoading(true);
    setEditError("");
    try {
      await editCommentByUser(editModal.comment.commentId, editModal.postId, editInput.trim());
      const comments = await getCommentsByPostId(editModal.postId);
      setCommentsByPost((prev) => ({ ...prev, [editModal.postId]: comments }));
      setEditModal({ visible: false, comment: null, postId: null });
      setEditInput("");
    } catch (e) {
      setEditError(e.message || "Failed to edit comment");
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteComment = async () => {
    if (!actionMenu.comment || !actionMenu.postId) return;
    setDeleteLoading(true);
    try {
      await deleteUserComment(actionMenu.comment.commentId);
      const comments = await getCommentsByPostId(actionMenu.postId);
      setCommentsByPost((prev) => ({ ...prev, [actionMenu.postId]: comments }));
      setActionMenu({ visible: false, comment: null, postId: null });
    } catch (e) {
      Alert.alert("Error", e.message || "Failed to delete comment");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDeletePost = async () => {
    if (!postActionMenu.post) return;
    setDeletePostLoading(true);
    try {
      await deletePost(postActionMenu.post.postId);
      await fetchGroupAndPosts(pageNumber);
      setPostActionMenu({ visible: false, post: null });
    } catch (e) {
      Alert.alert("Error", e.message || "Failed to delete post");
    } finally {
      setDeletePostLoading(false);
    }
  };

  const handleReactionPress = async (post, reactionType = null) => {
    if (reactionLoading[post.postId]) return;

    setReactionLoading((prev) => ({ ...prev, [post.postId]: true }));

    try {
      const userReaction = post.reactions?.find((r) => r.userId === currentUserId);
      const updatedPosts = [...posts];
      const postIdx = updatedPosts.findIndex((p) => p.postId === post.postId);

      if (userReaction) {
        if (!reactionType) {
          updatedPosts[postIdx] = {
            ...post,
            reactions: post.reactions.filter((r) => r.userId !== currentUserId),
          };
          setPosts(updatedPosts);
          await unreactToPost(post.postId);
        } else if (userReaction.reactionTypeId !== reactionType.reactionTypeId) {
          updatedPosts[postIdx] = {
            ...post,
            reactions: [
              ...post.reactions.filter((r) => r.userId !== currentUserId),
              {
                userId: currentUserId,
                userFullName: currentUser?.fullName || "You",
                userAvatar: currentUser?.avatar || currentUser?.avatarUser || null,
                reactionTypeId: reactionType.reactionTypeId,
                reactionTypeName: reactionType.reactionName,
                reactionTypeIconUrl: reactionType.iconUrl,
                reactionTypeEmojiUnicode: reactionType.emojiUnicode,
              },
            ],
          };
          setPosts(updatedPosts);
          await reactToPost(post.postId, reactionType.reactionTypeId);
        } else {
          updatedPosts[postIdx] = {
            ...post,
            reactions: post.reactions.filter((r) => r.userId !== currentUserId),
          };
          setPosts(updatedPosts);
          await unreactToPost(post.postId);
        }
      } else {
        const defaultReactionType = reactionType || reactionTypes[0];
        if (defaultReactionType) {
          updatedPosts[postIdx] = {
            ...post,
            reactions: [
              ...(post.reactions || []),
              {
                userId: currentUserId,
                userFullName: currentUser?.fullName || "You",
                userAvatar: currentUser?.avatar || currentUser?.avatarUser || null,
                reactionTypeId: defaultReactionType.reactionTypeId,
                reactionTypeName: defaultReactionType.reactionName,
                reactionTypeIconUrl: defaultReactionType.iconUrl,
                reactionTypeEmojiUnicode: defaultReactionType.emojiUnicode,
              },
            ],
          };
          setPosts(updatedPosts);
          await reactToPost(post.postId, defaultReactionType.reactionTypeId);
        }
      }
    } catch (e) {
      Alert.alert("Error", e.message || "Unable to react to post");
      fetchGroupAndPosts(pageNumber);
    } finally {
      setReactionLoading((prev) => ({ ...prev, [post.postId]: false }));
    }
  };

  const openReportModal = async (post) => {
    setReportModal({ visible: true, post });
    setSelectedReason(null);
    setReportDetails("");
    setReportStatus("");
    setReportLoading(true);
    try {
      const res = await getAllActiveReportReasons();
      setReportReasons(res.reportReasons || res || []);
      if (post.reportStatus === "resolved") setReportStatus("resolved");
      else if (post.reportStatus === "sent") setReportStatus("sent");
      else if (post.reportStatus === "processing") setReportStatus("processing");
      else setReportStatus("");
    } catch (e) {
      setReportReasons([]);
    }
    setReportLoading(false);
  };

  const handleSendReport = async () => {
    if (!selectedReason) return;
    setReportLoading(true);
    try {
      const report = await createReportByUser({
        postId: reportModal.post.postId,
        userId: currentUserId,
        reasonId: selectedReason.reasonId,
        reasonText: selectedReason.reasonName,
        details: reportDetails,
        note: reportDetails || "",
        status: "pending",
      });
      setReportStatus(report.status === "resolved" ? "resolved" : "sent");
      Alert.alert("Success", "Your report has been submitted.");
    } catch (e) {
      Alert.alert("Error", "Failed to submit report.");
    }
    setReportLoading(false);
  };

  const onRefresh = () => {
    setPageNumber(1);
    fetchGroupAndPosts(1, true);
  };

  const renderPaginationDots = () => {
    const dots = [];
    const maxDots = 5;
    let startPage = Math.max(1, pageNumber - Math.floor(maxDots / 2));
    const endPage = Math.min(totalPages, startPage + maxDots - 1);

    if (endPage - startPage + 1 < maxDots) {
      startPage = Math.max(1, endPage - maxDots + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      dots.push(
        <TouchableOpacity
          key={i}
          style={[styles.paginationDot, i === pageNumber && styles.activePaginationDot]}
          onPress={() => goToPage(i)}
          disabled={loading}
        >
          <Text style={[styles.paginationDotText, i === pageNumber && styles.activePaginationDotText]}>{i}</Text>
        </TouchableOpacity>
      );
    }
    return dots;
  };


// --- NEW: Fetch post details and show reaction details modal ---


const handleShowReactionDetails = async (postId) => {
  try {
    setShowReactionDetailsModal(true);
    setSelectedReactionType("all");
    setSelectedReactionPost(null);
    // Fetch latest post data from backend
    const post = await getActivePostByIdForUser(postId);
    setSelectedReactionPost(post);
  } catch (e) {
    setShowReactionDetailsModal(false);
    setSelectedReactionPost(null);
    Alert.alert("Error", "Could not load reaction details.");
  }
};

// Group reactions by reactionTypeId, using backend emojiUnicode
const groupReactionsByType = (reactions) => {
  const grouped = {};
  reactions.forEach((reaction) => {
    const typeId = reaction.reactionTypeId;
    if (!grouped[typeId]) {
      grouped[typeId] = {
        reactionType: {
          reactionTypeId: reaction.reactionTypeId,
          reactionName: reaction.reactionTypeName,
          iconUrl: reaction.reactionTypeIconUrl,
          emojiUnicode: reaction.reactionTypeEmojiUnicode || reaction.emojiUnicode, // always use backend unicode
        },
        users: [],
        count: 0,
      };
    }
    grouped[typeId].users.push({
      userId: reaction.userId,
      userFullName: reaction.userFullName,
      userAvatar: reaction.userAvatar,
    });
    grouped[typeId].count++;
  });
  return Object.values(grouped);
};


const getAllReactionTypesWithCounts = () => {
  if (!selectedReactionPost || !selectedReactionPost.reactions) return [];
  return groupReactionsByType(selectedReactionPost.reactions);
};


const getFilteredUsers = () => {
  if (!selectedReactionPost || !selectedReactionPost.reactions) return [];
  if (selectedReactionType === "all") {
    return selectedReactionPost.reactions.map((reaction) => ({
      userId: reaction.userId,
      userFullName: reaction.userFullName,
      userAvatar: reaction.userAvatar,
      reactionType: {
        reactionTypeId: reaction.reactionTypeId,
        reactionName: reaction.reactionTypeName,
        iconUrl: reaction.reactionTypeIconUrl,
        emojiUnicode: reaction.reactionTypeEmojiUnicode || reaction.emojiUnicode,
      },
    }));
  }
  return selectedReactionPost.reactions
    .filter((reaction) => reaction.reactionTypeName === selectedReactionType)
    .map((reaction) => ({
      userId: reaction.userId,
      userFullName: reaction.userFullName,
      userAvatar: reaction.userAvatar,
      reactionType: {
        reactionTypeId: reaction.reactionTypeId,
        reactionName: reaction.reactionTypeName,
        iconUrl: reaction.reactionTypeIconUrl,
        emojiUnicode: reaction.reactionTypeEmojiUnicode || reaction.emojiUnicode,
      },
    }));
};

  // Facebook-style floating reaction picker component
  const renderFloatingReactionPicker = () => {
    if (!showReactionPicker || !reactionTypes.length) return null;

    return (
      <View style={[styles.floatingReactionPicker, {
        position: 'absolute',
        left: reactionPickerPosition.x,
        top: reactionPickerPosition.y,
        zIndex: 9999,
      }]}>
        <Animated.View
          style={[
            styles.reactionPickerContainer,
            {
              transform: [{ scale: reactionPickerScale }],
              opacity: reactionPickerOpacity,
            },
          ]}
        >
      <ScrollView
  horizontal
  showsHorizontalScrollIndicator={false}
  contentContainerStyle={styles.reactionTypesContainer}
>
  {reactionTypes.map((rt) => (
    <TouchableOpacity
      key={rt.reactionTypeId}
      style={styles.reactionTypeButton}
      onPress={async () => {
        closeReactionPicker();
        const post = posts.find((p) => p.postId === selectedPostId);
        if (post) {
          await handleReactionPress(post, rt);
        }
      }}
      activeOpacity={0.7}
    >
      <Text style={styles.reactionTypeEmoji}>
        {rt.emojiUnicode
          ? (() => {
              try {
                const codePoints = rt.emojiUnicode
                  .replace(/U\+/g, "")
                  .split(/\s+/)
                  .filter(Boolean)
                  .map((u) => Number.parseInt(u, 16));
                if (codePoints.some(isNaN)) throw new Error("Invalid Unicode");
                return String.fromCodePoint(...codePoints);
              } catch {
                return "🙂";
              }
            })()
          : "🙂"}
      </Text>
    </TouchableOpacity>
  ))}
</ScrollView>
        </Animated.View>
      </View>
    );
  };

const renderReactionDetailsModal = () => {
  if (!selectedReactionPost) return null;

  const allReactionTypesWithCounts = getAllReactionTypesWithCounts();
  const filteredUsers = getFilteredUsers();
  const totalReactions = selectedReactionPost.reactions?.length || 0;

 

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
          <Text style={styles.reactionDetailsTitle}>Reactions ({totalReactions})</Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.reactionTabsContainer}
            contentContainerStyle={styles.reactionTabsContent}
          >
            <TouchableOpacity
              style={[styles.reactionTab, selectedReactionType === "all" && styles.reactionTabActive]}
              onPress={() => setSelectedReactionType("all")}
            >
              <Text style={[styles.reactionTabText, selectedReactionType === "all" && styles.reactionTabTextActive]}>
                All {totalReactions}
              </Text>
            </TouchableOpacity>

            {allReactionTypesWithCounts.map((group) => (
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
                    {(() => {
                      try {
                        const codePoints = group.reactionType.emojiUnicode
                          .replace(/U\+/g, "")
                          .split(/\s+/)
                          .filter(Boolean)
                          .map((u) => Number.parseInt(u, 16));
                        if (codePoints.some(isNaN)) throw new Error("Invalid Unicode");
                        return String.fromCodePoint(...codePoints);
                      } catch {
                        return "🙂";
                      }
                    })()}
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
            renderItem={({ item }) => (
              <View style={styles.reactionUserItem}>
                <View style={styles.reactionUserAvatar}>
                  {item.userAvatar ? (
                    <Image source={{ uri: item.userAvatar }} style={styles.reactionUserAvatarImg} />
                  ) : (
                    <View style={styles.reactionUserAvatarPlaceholder}>
                      <Text style={styles.reactionUserAvatarText}>
                        {item.userFullName?.charAt(0)?.toUpperCase() || "U"}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.reactionUserDetails}>
                  <Text style={styles.reactionUserName}>{item.userFullName || `User ${item.userId}`}</Text>
                </View>
                {item.reactionType && (
                  <View style={styles.reactionUserReaction}>
                    <Text style={styles.reactionUserEmoji}>
                      {(() => {
                        try {
                          const codePoints = item.reactionType.emojiUnicode
                            .replace(/U\+/g, "")
                            .split(/\s+/)
                            .filter(Boolean)
                            .map((u) => Number.parseInt(u, 16));
                          if (codePoints.some(isNaN)) throw new Error("Invalid Unicode");
                          return String.fromCodePoint(...codePoints);
                        } catch {
                          return "🙂";
                        }
                      })()}
                    </Text>
                  </View>
                )}
              </View>
            )}
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
  const renderFilterModal = () => (
    <Modal
      visible={showFilterModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => {
        setShowFilterModal(false);
        setTempFilters(filters);
      }}
    >
      <View style={styles.modalOverlay}>
        <Animated.View
          style={[
            styles.filterModalContent,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={styles.dragHandle} />

          <View style={styles.filterHeader}>
            <View style={styles.filterHeaderLeft}>
              <View style={styles.filterIconContainer}>
                <Ionicons name="options" size={24} color="#4F46E5" />
              </View>
              <View>
                <Text style={styles.filterTitle}>Filter Posts</Text>
                <Text style={styles.filterSubtitle}>Customize your feed</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => {
                setShowFilterModal(false);
                setTempFilters(filters);
              }}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.filterScrollView} showsVerticalScrollIndicator={false}>
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>
                <Feather name="calendar" size={16} color="#4F46E5" /> Date Range
              </Text>
              <View style={styles.rangeInputContainer}>
                <TouchableOpacity style={styles.dateInput} onPress={() => setShowCustomStartDatePicker(true)}>
                  <Feather name="calendar" size={16} color="#64748B" />
                  <Text style={styles.dateInputText}>{formatDisplayDate(tempFilters.startDate)}</Text>
                </TouchableOpacity>
                <View style={styles.rangeSeparator}>
                  <Text style={styles.rangeSeparatorText}>to</Text>
                </View>
                <TouchableOpacity style={styles.dateInput} onPress={() => setShowCustomEndDatePicker(true)}>
                  <Feather name="calendar" size={16} color="#64748B" />
                  <Text style={styles.dateInputText}>{formatDisplayDate(tempFilters.endDate)}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>
                <Feather name="activity" size={16} color="#4F46E5" /> Post Status
              </Text>
              <View style={styles.statusGrid}>
                {[
                  { key: "active", label: "Active", icon: "checkmark-circle", color: "#10B981" },
                  { key: "pending", label: "Pending", icon: "time", color: "#F59E0B" },
                  { key: "archived", label: "Archived", icon: "archive", color: "#6B7280" },
                  { key: "all", label: "All Posts", icon: "globe", color: "#4F46E5" },
                ].map((status) => (
                  <TouchableOpacity
                    key={status.key}
                    style={[styles.statusCard, tempFilters.status === status.key && styles.selectedStatusCard]}
                    onPress={() => setTempFilters({ ...tempFilters, status: status.key })}
                  >
                    <Ionicons
                      name={status.icon}
                      size={20}
                      color={tempFilters.status === status.key ? "#FFFFFF" : status.color}
                    />
                    <Text
                      style={[
                        styles.statusCardText,
                        tempFilters.status === status.key && styles.selectedStatusCardText,
                      ]}
                    >
                      {status.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>
                <Feather name="grid" size={16} color="#4F46E5" /> Posts per Page
              </Text>
              <View style={styles.pageSizeGrid}>
                {[5, 10, 20, 50].map((size) => (
                  <TouchableOpacity
                    key={size}
                    style={[styles.pageSizeCard, tempFilters.validPageSize === size && styles.selectedPageSizeCard]}
                    onPress={() => setTempFilters({ ...tempFilters, validPageSize: size })}
                  >
                    <Text
                      style={[
                        styles.pageSizeCardNumber,
                        tempFilters.validPageSize === size && styles.selectedPageSizeCardNumber,
                      ]}
                    >
                      {size}
                    </Text>
                    <Text
                      style={[
                        styles.pageSizeCardLabel,
                        tempFilters.validPageSize === size && styles.selectedPageSizeCardLabel,
                      ]}
                    >
                      posts
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          <View style={styles.filterActions}>
            <TouchableOpacity style={styles.clearFiltersButton} onPress={resetTempFilters}>
              <Feather name="refresh-cw" size={16} color="#4F46E5" />
              <Text style={styles.clearFiltersText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyFiltersButton} onPress={applyTempFilters}>
              <Feather name="check" size={16} color="#FFFFFF" />
              <Text style={styles.applyFiltersText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>

      {showCustomStartDatePicker && (
        <Modal
          visible={showCustomStartDatePicker}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowCustomStartDatePicker(false)}
        >
          <View style={styles.datePickerOverlay}>
            <View style={styles.datePickerModal}>
              <View style={styles.datePickerHeader}>
                <Text style={styles.datePickerTitle}>Select Start Date</Text>
                <TouchableOpacity onPress={() => setShowCustomStartDatePicker(false)}>
                  <Ionicons name="close" size={24} color="#64748B" />
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={tempFilters.startDate || new Date()}
                mode="date"
                display="spinner"
                onChange={(event, selectedDate) => {
                  if (selectedDate) {
                    setTempFilters({ ...tempFilters, startDate: selectedDate });
                  }
                }}
                style={styles.datePickerSpinner}
              />
              <TouchableOpacity style={styles.datePickerConfirm} onPress={() => setShowCustomStartDatePicker(false)}>
                <Text style={styles.datePickerConfirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {showCustomEndDatePicker && (
        <Modal
          visible={showCustomEndDatePicker}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowCustomEndDatePicker(false)}
        >
          <View style={styles.datePickerOverlay}>
            <View style={styles.datePickerModal}>
              <View style={styles.datePickerHeader}>
                <Text style={styles.datePickerTitle}>Select End Date</Text>
                <TouchableOpacity onPress={() => setShowCustomEndDatePicker(false)}>
                  <Ionicons name="close" size={24} color="#64748B" />
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={tempFilters.endDate || new Date()}
                mode="date"
                display="spinner"
                onChange={(event, selectedDate) => {
                  if (selectedDate) {
                    setTempFilters({ ...tempFilters, endDate: selectedDate });
                  }
                }}
                style={styles.datePickerSpinner}
              />
              <TouchableOpacity style={styles.datePickerConfirm} onPress={() => setShowCustomEndDatePicker(false)}>
                <Text style={styles.datePickerConfirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </Modal>
  );

  if (loading && pageNumber === 1) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <DynamicStatusBar backgroundColor="#4F46E5" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loadingText}>Loading community...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <DynamicStatusBar backgroundColor="#4F46E5" />
        <View style={styles.errorContainer}>
          <View style={styles.errorIconContainer}>
            <Ionicons name="alert-circle" size={64} color="#EF4444" />
          </View>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchGroupAndPosts(pageNumber)}>
            <Feather name="refresh-cw" size={16} color="#FFFFFF" />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!group) return null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <DynamicStatusBar backgroundColor={theme.primaryColor} />

      <FlatList
        showsVerticalScrollIndicator={false}
 ListHeaderComponent={
  <Animated.View
    style={[
      styles.headerContainer,
      {
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
      },
    ]}
  >
    <View style={styles.coverSection}>
      <Image
        source={{ uri: group.thumbnail || "https://via.placeholder.com/400x200" }}
        style={styles.coverImage}
        blurRadius={2}
      />
      <LinearGradient
        colors={["rgba(79, 70, 229, 0.3)", "rgba(79, 70, 229, 0.7)"]}
        style={styles.coverOverlay}
      />
      <View style={styles.headerActions}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerRightActions}></View>
      </View>
      <View style={styles.groupAvatarContainer}>
        <View style={styles.groupAvatarWrapper}>
          <Image
            source={{ uri: group.avatarUser || group.thumbnail || "https://via.placeholder.com/120" }}
            style={styles.groupAvatar}
          />
          {group.isPrivate && (
            <View style={styles.privateBadge}>
              <Ionicons name="lock-closed" size={16} color="#FFFFFF" />
            </View>
          )}
        </View>
      </View>
    </View>

    <View style={styles.groupInfoSection}>
      <View style={styles.groupHeader}>
        <Text style={styles.groupName}>{group.groupName}</Text>
        {group.isPrivate && (
          <View style={styles.privateTag}>
            <Ionicons name="lock-closed" size={12} color="#4F46E5" />
            <Text style={styles.privateTagText}>Private Group</Text>
          </View>
        )}
      </View>

      <RenderHtml
        contentWidth={width}
        source={{
          html:
            group.description ||
            "<p>Welcome to our amazing community! Join us to share experiences and connect with like-minded people.</p>",
        }}
        tagsStyles={{
          p: { fontSize: 15, color: "#374151", margin: 0 },
          strong: { fontWeight: "blikely" },
        }}
      />

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Ionicons name="people" size={16} color="#4F46E5" />
          <TouchableOpacity onPress={() => navigation.navigate('ActiveMembersScreen', { groupId: group.groupId })}>
            <Text style={[styles.statText, {  color: '#4F46E5', fontWeight: 'bold' }]}> 
              {group.memberCount?.toLocaleString() || "0"} members
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.statDivider} />
           {isOwner && (
              <View style={{ alignItems: 'center',  }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons
                    name="time"
                    size={16}
                    color={pendingCount > 0 ? '#4F46E5' : '#4F46E5'}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={{ color: pendingCount > 0 ? '#4F46E5' : '#4F46E5', fontWeight: 'bold', fontSize: 13 }}>
                    {pendingCount > 0 ? `Pending Approval (${pendingCount})` : 'No Pending Requests'}
                  </Text>
                  {pendingCount > 0 && (
                    <TouchableOpacity
                      style={{ marginLeft: 8, backgroundColor: '#F59E0B', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 4 }}
                      onPress={() => navigation.navigate('PendingMembersScreen', { groupId: group.groupId })}
                    >
                      <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13 }}>View</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}

      </View>

      <View style={styles.adminSection}>
        <Text style={styles.adminLabel}>
          <Ionicons name="shield-checkmark" size={14} color="#4F46E5" /> Admin
        </Text>
        <View style={styles.adminInfo}>
          <View style={styles.adminAvatar}>
            {group.creator?.avatar ? (
              <Image source={{ uri: group.creator.avatar }} style={styles.adminAvatarImg} />
            ) : (
              <Text style={styles.adminAvatarText}>
                {group.creator?.fullName?.charAt(0)?.toUpperCase() || "A"}
              </Text>
            )}
          </View>
          <View style={styles.adminDetails}>
            <Text style={styles.adminName}>{group.creator?.fullName || "Administrator"}</Text>
            <Text style={styles.adminEmail}>{group.creator?.email || "admin@community.com"}</Text>
            {/* Pending section luôn nằm dưới cùng, căn giữa đẹp */}
        
          </View>
        </View>
      </View>

     <View style={styles.actionButtonsContainer}>
  <TouchableOpacity
    style={[
      styles.primaryActionButton,
      isOwner
        ? styles.deleteButton
        : group.isJoin
        ? styles.leaveButton
        : group.isRequested
        ? styles.pendingButton
        : styles.joinButton,
    ]}
    onPress={handleJoinOrDelete}
    disabled={group.isRequested || joining}
    activeOpacity={0.8}
    accessibilityLabel={
      isOwner
        ? "Delete this group"
        : group.isJoin
        ? "Leave this group"
        : group.isRequested
        ? "Request pending"
        : "Join this group"
    }
    accessibilityHint={isOwner ? "Deletes the group permanently. This action cannot be undone." : undefined}
  >
    {joining ? (
      <ActivityIndicator size="small" color="#FFFFFF" />
    ) : (
      <>
        <Ionicons
          name={
            isOwner
              ? "trash-outline"
              : group.isJoin
              ? "exit-outline"
              : group.isRequested
              ? "time-outline"
              : "add-outline"
          }
          size={18}
          color="#FFFFFF"
        />
        <Text style={styles.primaryActionText}>
          {isOwner
            ? "Delete Group"
            : group.isJoin
            ? "Leave Group"
            : group.isRequested
            ? "Request Pending"
            : "Join Group"}
        </Text>
      </>
    )}
  </TouchableOpacity>
  {isOwner && (
    <Text style={{ color: "#EF4444", marginTop: 4, textAlign: "center", fontSize: 12 }}>
      This action cannot be undone
    </Text>
  )}
  {!group.isJoin && !group.isRequested && !isOwner && (
    <View style={styles.secondaryActionsRow}>
      <TouchableOpacity style={styles.secondaryActionButton}>
        <Ionicons name="notifications-outline" size={16} color="#4F46E5" />
        <Text style={styles.secondaryActionText}>Follow</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.secondaryActionButton}>
        <Ionicons name="bookmark-outline" size={16} color="#4F46E5" />
        <Text style={styles.secondaryActionText}>Save</Text>
      </TouchableOpacity>
    </View>
  )}
</View>
    </View>

    {(group.isJoin || isOwner) && (
      <View style={styles.postsHeaderSection}>
        <View style={styles.postsHeader}>
          <Text style={styles.postsTitle}>
            <Ionicons name="newspaper-outline" size={20} color="#4F46E5" /> Community Posts
          </Text>
          <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilterModal(true)}>
            <Ionicons name="options-outline" size={18} color="#4F46E5" />
            {(searchTerm || filters.status !== "active" || filters.startDate || filters.endDate) && (
              <View style={styles.filterIndicator} />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={18} color="#64748B" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search posts..."
                value={searchInput}
                onChangeText={text => setSearchInput(text)}
                onSubmitEditing={() => handleSearch(searchInput)}
                returnKeyType="search"
                blurOnSubmit={true}
                placeholderTextColor="#94A3B8"
              />
            {searchInput ? (
              <TouchableOpacity onPress={() => {
                setSearchInput("");
                setSearchTerm("");
                handleSearch("");
              }}>
                <Ionicons name="close-circle" size={18} color="#94A3B8" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        <TouchableOpacity
          style={styles.createPostContainer}
          onPress={() => navigation.navigate("CreatePostScreen", { groupId: group.groupId })}
        >
          <Text style={styles.createPostPlaceholder}>What's on your mind?</Text>
          <View style={styles.createPostActions}>
            <Ionicons name="image-outline" size={20} color="#64748B" />
            <Ionicons name="videocam-outline" size={20} color="#64748B" />
          </View>
        </TouchableOpacity>

        {totalCount > 0 && (
          <View style={styles.resultsInfo}>
            <Text style={styles.resultsText}>
              Showing {(pageNumber - 1) * pageSize + 1}-{Math.min(pageNumber * pageSize, totalCount)} of{" "}
              {totalCount} posts
            </Text>
          </View>
        )}
      </View>
    )}
  </Animated.View>
}
      data={(group.isJoin || isOwner) ? posts.filter((post) => post.status !== "deleted") : []}
keyExtractor={(post) => post.postId?.toString() || Math.random().toString()}
renderItem={({ item: post, index }) => {
  if (!post || !post.postId) return null;

  return (
    <Animated.View
      style={[
        styles.postCard,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
        },
      ]}
    >
      <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate("PostDetailScreen", { post })}>
        <View style={styles.postHeader}>
          <View style={styles.postAuthorSection}>
            <View style={styles.authorAvatarContainer}>
              {post.user?.avatar || post.user?.avatarUser ? (
                <Image
                  source={{ uri: post.user.avatar || post.user.avatarUser }}
                  style={styles.authorAvatarImg}
                />
              ) : (
                <View style={styles.authorAvatarPlaceholder}>
                  <Text style={styles.authorAvatarText}>
                    {post.user?.fullName?.charAt(0)?.toUpperCase() ||
                      post.userFullName?.charAt(0)?.toUpperCase() ||
                      post.user?.name?.charAt(0)?.toUpperCase() ||
                      post.author?.fullName?.charAt(0)?.toUpperCase() ||
                      post.author?.name?.charAt(0)?.toUpperCase() ||
                      "U"}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.authorInfo}>
              <Text style={styles.authorName}>
                {post.user?.fullName ||
                  post.userFullName ||
                  post.user?.name ||
                  post.author?.fullName ||
                  post.author?.name ||
                  "Anonymous User"}
              </Text>
              <View style={styles.postMetaInfo}>
                <Text style={styles.postTime}>
                  {new Date(post.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
                <View style={styles.metaDivider} />
                <Ionicons name="globe-outline" size={12} color="#64748B" />
                <Text style={styles.postVisibility}>Public</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity
            style={styles.postMenuButton}
            onPress={() => {
              // Check all possible userId fields for post creator
              const isOwnPost =
                post.userId === currentUserId ||
                post.user?.userId === currentUserId ||
                post.createdBy === currentUserId ||
                post.user?.id === currentUserId;
              const isGroupOwner = group?.creator?.userId && user?.userId && group.creator.userId === user.userId;
              if (isOwnPost && isGroupOwner) {
                setPostActionMenu({ visible: true, post });
              }
              else if (isOwnPost) {
                setPostActionMenu({ visible: true, post });
              }
              else if (isGroupOwner && !isOwnPost) {
                Alert.alert(
                  "Hide Post",
                  "Do you want to hide this post from the group feed?",
                  [
                    { text: "Cancel", style: "cancel" },
                    { text: "Hide Post", style: "destructive", onPress: async () => {
                        try {
                          await updatePostStatus(post.postId, "inactive");
                          await fetchGroupAndPosts(pageNumber, true);
                        } catch (e) {
                          Alert.alert("Error", e.message || "Failed to hide post");
                        }
                      }
                    },
                  ]
                );
              } else {
                openReportModal(post);
              }
            }}
          >
            <Ionicons name="ellipsis-horizontal" size={20} color="#64748B" />
          </TouchableOpacity>
        </View>
        <View style={styles.postContent}>
          <RenderHtml
            contentWidth={width - 32}
            source={{ html: post.content || "<p>No content available</p>" }}
            tagsStyles={{
              p: { fontSize: 16, lineHeight: 24, color: "#374151", margin: 0 },
              strong: { fontWeight: "600" },
              em: { fontStyle: "italic" },
            }}
          />
        </View>
        {post.thumbnail && post.thumbnail !== "DEFAULT_IMAGE" && (
          <TouchableOpacity style={styles.postImageContainer}>
            <Image source={{ uri: post.thumbnail }} style={styles.postImage} />
          </TouchableOpacity>
        )}
        {post.tags && post.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {post.tags.slice(0, 3).map((tag) => (
              <TouchableOpacity key={tag.tagId} style={styles.tagChip}>
                <Text style={styles.tagText}>#{tag.tagName}</Text>
              </TouchableOpacity>
            ))}
            {post.tags.length > 3 && <Text style={styles.moreTagsText}>+{post.tags.length - 3} more</Text>}
          </View>
        )}
        {(post.reactions?.length > 0 || post.totalComment > 0) && (
          <View style={styles.engagementStats}>
            {post.reactions?.length > 0 && (
              <TouchableOpacity
                style={styles.reactionsSummary}
                onPress={() => {
                  if (post.reactions?.length > 0) {
                    handleShowReactionDetails(post.postId);
                  }
                }}
                disabled={post.reactions?.length === 0}
              >
                <View style={styles.reactionsIcons}>
                  {[...new Set(post.reactions.map((r) => r.reactionTypeEmojiUnicode))]
                    .filter(Boolean)
                    .slice(0, 3)
                    .map((unicode, idx) => {
                      try {
                        const codePoints = unicode
                          .replace(/U\+/g, "")
                          .split(/\s+/)
                          .filter(Boolean)
                          .map((u) => Number.parseInt(u, 16));
                        if (codePoints.some(isNaN)) throw new Error("Invalid Unicode");
                        const emoji = String.fromCodePoint(...codePoints);
                        return (
                          <View key={unicode + idx} style={styles.reactionEmojiContainer}>
                            <Text style={styles.reactionEmoji}>{emoji}</Text>
                          </View>
                        );
                      } catch {
                        return (
                          <View key={unicode + idx} style={styles.reactionEmojiContainer}>
                            <Text style={styles.reactionEmoji}>🙂</Text>
                          </View>
                        );
                      }
                    })}
                </View>
                <Text style={styles.reactionsCount}>{post.reactions.length}</Text>
              </TouchableOpacity>
            )}
            <View style={styles.engagementRight}>
              {post.totalComment > 0 && (
                <TouchableOpacity onPress={() => navigation.navigate("PostDetailScreen", { post })}>
                  <Text style={styles.commentsCount}>{post.totalComment} comments</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </TouchableOpacity>
      <View style={styles.reactionBarContainer}>
        <TouchableOpacity
          ref={(ref) => (likeButtonRefs.current[post.postId] = ref)}
          style={styles.reactionBarButton}
          onPress={() => handleReactionPress(post)}
          onLongPress={(event) => handleLongPressReaction(post, event)}
          delayLongPress={500}
          disabled={reactionLoading[post.postId]}
        >
          {reactionLoading[post.postId] ? (
            <ActivityIndicator size="small" color="#1877F2" />
          ) : (
            <>
              {(() => {
                const userReaction = post.reactions?.find((r) => r.userId === currentUserId);
                if (userReaction?.reactionTypeEmojiUnicode) {
                  try {
                    const codePoints = userReaction.reactionTypeEmojiUnicode
                      .replace(/U\+/g, "")
                      .split(/\s+/)
                      .filter(Boolean)
                      .map((u) => Number.parseInt(u, 16));
                    if (codePoints.some(isNaN)) throw new Error("Invalid Unicode");
                    const emoji = String.fromCodePoint(...codePoints);
                    return <Text style={styles.reactionBarEmoji}>{emoji}</Text>;
                  } catch {
                    return <Ionicons name="thumbs-up" size={18} color="#1877F2" />;
                  }
                }
                return <Ionicons name="thumbs-up-outline" size={18} color="#65676B" />;
              })()}
              <Text
                style={[
                  styles.reactionBarText,
                  post.reactions?.find((r) => r.userId === currentUserId) && styles.reactionBarTextActive,
                ]}
                onPress={() => {
                  const userReaction = post.reactions?.find((r) => r.userId === currentUserId);
                  console.log('[GroupDetailsScreen] userReaction:', userReaction);
                }}
              >
                {(() => {
                  const userReaction = post.reactions?.find((r) => {
                    // In ra toàn bộ reaction object để debug
                    console.log('[GroupDetailsScreen] reaction object:', r);
                    return r.userId === currentUserId;
                  });
                  console.log('[GroupDetailsScreen] Render reactionTypeName:', userReaction?.reactionTypeName, userReaction);
                  return userReaction?.reactionTypeName || "ha";
                })()}
              </Text>
            </>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.reactionBarButton}
          onPress={() => handleShowComments(post.postId, post.groupId)}
        >
          <Ionicons name="chatbubble-outline" size={18} color="#65676B" />
          <Text style={styles.reactionBarText}>Comment</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.reactionBarButton}>
          <Ionicons name="arrow-redo-outline" size={18} color="#65676B" />
          <Text style={styles.reactionBarText}>Share</Text>
        </TouchableOpacity>
      </View>
      {showCommentsForPost === post.postId && (
        <View style={styles.commentsSection}>
          <View style={styles.commentInputSection}>
            <View style={styles.commentInputContainer}>
              <TextInput
                style={styles.commentInput}
                placeholder="Write a comment..."
                value={commentInputs[post.postId] || ""}
                onFocus={() => navigation.navigate("PostDetailScreen", { post })}
                onChangeText={(text) => setCommentInputs((prev) => ({ ...prev, [post.postId]: text }))}
                multiline
                maxLength={500}
                placeholderTextColor="#94A3B8"
              />
              <TouchableOpacity
                style={[
                  styles.commentSendButton,
                  (!commentInputs[post.postId]?.trim() || commentLoading[post.postId]) &&
                    styles.commentSendButtonDisabled,
                ]}
                onPress={() => handleSendComment(post.postId)}
                disabled={!commentInputs[post.postId]?.trim() || commentLoading[post.postId]}
              >
                {commentLoading[post.postId] ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="send" size={16} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>
          </View>
          {commentError[post.postId] && (
            <Text style={styles.commentErrorText}>{commentError[post.postId]}</Text>
          )}
          {loadingComments[post.postId] ? (
            <View style={styles.commentsLoading}>
              <ActivityIndicator size="small" color="#1877F2" />
              <Text style={styles.commentsLoadingText}>Loading comments...</Text>
            </View>
          ) : commentsByPost[post.postId] && commentsByPost[post.postId].length > 0 ? (
            <View style={styles.commentsList}>
              {commentsByPost[post.postId].map((comment) => (
                <View key={comment.commentId} style={styles.commentItem}>
                  <View style={styles.commentAvatar}>
                    {comment.userAvatar &&
                    typeof comment.userAvatar === "string" &&
                    comment.userAvatar.startsWith("http") ? (
                      <Image source={{ uri: comment.userAvatar }} style={styles.commentAvatarImg} />
                    ) : (
                      <View style={styles.commentAvatarPlaceholder}>
                        <Text style={styles.commentAvatarText}>
                          {comment.userFullName?.charAt(0)?.toUpperCase() || "U"}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.commentContent}>
                    <View style={styles.commentBubble}>
                      <Text style={styles.commentAuthor}>{comment.userFullName || "Anonymous"}</Text>
                      <Text style={styles.commentText}>{comment.commentText}</Text>
                    </View>
                    <View style={styles.commentActions}>
                      <Text style={styles.commentTime}>
                        {new Date(comment.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Text>
                      <TouchableOpacity>
                        <Text style={styles.commentActionText}>Like</Text>
                      </TouchableOpacity>
                      <TouchableOpacity>
                        <Text style={styles.commentActionText}>Reply</Text>
                      </TouchableOpacity>
                      {/* If group creator is current user and this is NOT their own comment, show hide option */}
                      {group?.creator?.userId && user?.userId && group.creator.userId === user.userId && comment.userId !== user.userId ? (
                        <TouchableOpacity
                          onPress={() => {
                            Alert.alert(
                              "Hide Comment",
                              "Do you want to hide this comment from the group feed?",
                              [
                                { text: "Cancel", style: "cancel" },
                                { text: "Hide Comment", style: "destructive", onPress: async () => {
                                    try {
                                      await updateCommentStatus(comment.commentId, "inactive");
                                      await fetchComments(post.postId, post.groupId);
                                    } catch (e) {
                                      Alert.alert("Error", e.message || "Failed to hide comment");
                                    }
                                  }
                                },
                              ]
                            );
                          }}
                        >
                          <Ionicons name="ellipsis-horizontal" size={14} color="#8A8D91" />
                        </TouchableOpacity>
                      ) : currentUserId && comment.userId === currentUserId ? (
                        <TouchableOpacity
                          onPress={() => setActionMenu({ visible: true, comment, postId: post.postId })}
                        >
                          <Ionicons name="ellipsis-horizontal" size={14} color="#8A8D91" />
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.noComments}>
              <Text style={styles.noCommentsText}>No comments yet</Text>
              <Text style={styles.noCommentsSubtext}>Be the first to comment!</Text>
            </View>
          )}
        </View>
      )}
    </Animated.View>
  );
}}
ListEmptyComponent={
  <Animated.View
    style={[
      styles.emptyStateContainer,
      {
        opacity: fadeAnim,
        transform: [{ scale: scaleAnim }],
      },
    ]}
  >
    {(group.isJoin || isOwner) ? (
      postLoading ? (
        <View style={styles.postsLoading}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.postsLoadingText}>Loading posts...</Text>
        </View>
      ) : (
        <View style={styles.emptyPosts}>
          <View style={styles.emptyPostsIcon}>
            <Ionicons name="newspaper-outline" size={48} color="#CBD5E1" />
          </View>
          <Text style={styles.emptyPostsTitle}>No posts yet</Text>
          <Text style={styles.emptyPostsSubtitle}>
            {searchTerm || filters.status !== "active" || filters.startDate || filters.endDate
              ? "No posts match your current filters. Try adjusting your search criteria."
              : "Be the first to share something with the community!"}
          </Text>
          <TouchableOpacity
            style={styles.emptyPostsAction}
            onPress={() => {
              if (searchTerm || filters.status !== "active" || filters.startDate || filters.endDate) {
                resetTempFilters();
              } else {
                navigation.navigate("CreatePostScreen", { groupId: group.groupId });
              }
            }}
          >
            <Ionicons
              name={
                searchTerm || filters.status !== "active" || filters.startDate || filters.endDate
                  ? "refresh"
                  : "add"
              }
              size={16}
              color="#FFFFFF"
            />
            <Text style={styles.emptyPostsActionText}>
              {searchTerm || filters.status !== "active" || filters.startDate || filters.endDate
                ? "Clear Filters"
                : "Create Post"}
            </Text>
          </TouchableOpacity>
        </View>
      )
    ) : (
      <View style={styles.joinRequired}>
        <View style={styles.joinRequiredIcon}>
          <Ionicons name="lock-closed" size={48} color="#CBD5E1" />
        </View>
        <Text style={styles.joinRequiredTitle}>Join to see posts</Text>
        <Text style={styles.joinRequiredSubtitle}>
          You need to join this group to view and interact with posts
        </Text>
        <TouchableOpacity style={styles.joinRequiredAction} onPress={handleJoinOrDelete}>
          <Ionicons name="add" size={16} color="#FFFFFF" />
          <Text style={styles.joinRequiredActionText}>Join Group</Text>
        </TouchableOpacity>
      </View>
    )}
  </Animated.View>
}
        ListFooterComponent={
          <>
            {totalCount > 0 && totalPages > 1 && (
              <Animated.View
                style={[
                  styles.paginationContainer,
                  {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                  },
                ]}
              >
                <LinearGradient colors={["#FFFFFF", "#F8FAFC"]} style={styles.paginationGradient}>
                  <View style={styles.paginationContent}>
                    <TouchableOpacity
                      style={[styles.paginationNavButton, pageNumber <= 1 && styles.disabledNavButton]}
                      onPress={() => goToPage(pageNumber - 1)}
                      disabled={pageNumber <= 1 || loading}
                    >
                      <Ionicons name="chevron-back" size={20} color={pageNumber <= 1 ? "#CBD5E1" : "#4F46E5"} />
                    </TouchableOpacity>

                    <View style={styles.paginationDots}>{renderPaginationDots()}</View>

                    <TouchableOpacity
                      style={[styles.paginationNavButton, pageNumber >= totalPages && styles.disabledNavButton]}
                      onPress={() => goToPage(pageNumber + 1)}
                      disabled={pageNumber >= totalPages || loading}
                    >
                      <Ionicons
                        name="chevron-forward"
                        size={20}
                        color={pageNumber >= totalPages ? "#CBD5E1" : "#4F46E5"}
                      />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.pageInfoContainer}>
                    <Text style={styles.pageInfo}>
                      Page {pageNumber} of {totalPages}
                    </Text>
                  </View>
                </LinearGradient>
              </Animated.View>
            )}

            {loading && pageNumber > 1 && (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color="#4F46E5" />
                <Text style={styles.footerLoaderText}>Loading more posts...</Text>
              </View>
            )}
          </>
        }
        contentContainerStyle={styles.listContainer}
        refreshing={refreshing}
        onRefresh={onRefresh}
      />

      {renderFilterModal()}
      {renderReactionDetailsModal()}

      {/* Facebook-style floating reaction picker */}
      {renderFloatingReactionPicker()}
      
      {/* Overlay to close reaction picker when tapping outside */}
      {showReactionPicker && (
        <TouchableOpacity
          style={styles.reactionPickerOverlay}
          activeOpacity={1}
          onPress={closeReactionPicker}
        />
      )}

      <Modal visible={editModal.visible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.editModal}>
            <Text style={styles.modalTitle}>✏️ Edit Comment</Text>
            <TextInput
              value={editInput}
              onChangeText={setEditInput}
              style={styles.editInput}
              multiline
              placeholder="Enter comment content..."
              maxLength={500}
            />
            {editError && <Text style={styles.errorText}>{editError}</Text>}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setEditModal({ visible: false, comment: null, postId: null })}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, editLoading && styles.saveButtonDisabled]}
                onPress={handleEditComment}
                disabled={editLoading}
              >
                {editLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={actionMenu.visible} transparent animationType="fade">
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setActionMenu({ visible: false, comment: null, postId: null })}
        >
          <View style={styles.actionMenu}>
            <TouchableOpacity
              style={styles.actionMenuItem}
              onPress={() => {
                setActionMenu({ visible: false, comment: null, postId: null });
                setEditModal({ visible: true, comment: actionMenu.comment, postId: actionMenu.postId });
                setEditInput(actionMenu.comment.commentText);
              }}
            >
              <Text style={styles.actionMenuIcon}>✏️</Text>
              <Text style={styles.actionMenuText}>Edit Comment</Text>
            </TouchableOpacity>
            <View style={styles.actionMenuDivider} />
            <TouchableOpacity
              style={styles.actionMenuItem}
              onPress={() => {
               
                Alert.alert("Confirm Delete", "Are you sure you want to delete this comment?", [
                  { text: "Cancel", style: "cancel" },
                  { text: "Delete", style: "destructive", onPress: handleDeleteComment },
                ]);
              }}
            >
              <Text style={styles.actionMenuIcon}>🗑️</Text>
              <Text style={[styles.actionMenuText, styles.deleteText]}>Delete Comment</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={postActionMenu.visible} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setPostActionMenu({ visible: false, post: null })}>
          <View style={styles.actionMenu}>
            <TouchableOpacity
              style={styles.actionMenuItem}
              onPress={() => {
                setPostActionMenu({ visible: false, post: null });
                navigation.navigate("EditPostScreen", { post: postActionMenu.post });
              }}
            >
              <Text style={styles.actionMenuIcon}>✏️</Text>
              <Text style={styles.actionMenuText}>Edit Post</Text>
            </TouchableOpacity>
            <View style={styles.actionMenuDivider} />
            <TouchableOpacity
              style={styles.actionMenuItem}
              onPress={() => {
                Alert.alert("Confirm Delete", "Are you sure you want to delete this post?", [
                  { text: "Cancel", style: "cancel" },
                  { text: "Delete", style: "destructive", onPress: handleDeletePost },
                ]);
              }}
            >
              <Text style={styles.actionMenuIcon}>🗑️</Text>
              <Text style={[styles.actionMenuText, styles.deleteText]}>Delete Post</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={reportModal.visible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.reportModal}>
            <Text style={styles.modalTitle}>🚨 Report Post</Text>
            {reportLoading ? (
              <ActivityIndicator size="large" color="#4F46E5" />
            ) : reportStatus === "resolved" ? (
              <View style={styles.reportStatusContainer}>
                <Text style={styles.reportStatusIcon}>✅</Text>
                <Text style={styles.reportStatusText}>Report has been resolved</Text>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => setReportModal({ visible: false, post: null })}
                >
                  <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>
              </View>
            ) : reportStatus === "sent" ? (
              <View style={styles.reportStatusContainer}>
                <Text style={styles.reportStatusIcon}>📤</Text>
                <Text style={styles.reportStatusText}>You have already reported this post</Text>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => setReportModal({ visible: false, post: null })}
                >
                  <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={styles.reportLabel}>Select reason for report:</Text>
                <FlatList
                  data={reportReasons}
                  keyExtractor={(item) => item.reasonId.toString()}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.reportReasonItem,
                        selectedReason?.reasonId === item.reasonId && styles.reportReasonSelected,
                      ]}
                      onPress={() => setSelectedReason(item)}
                    >
                      <Text style={styles.reportReasonTitle}>{item.reasonName}</Text>
                      {item.description ? (
                        <RenderHtml
                          contentWidth={width - 64}
                          source={{ html: item.description }}
                          tagsStyles={{ p: { margin: 0 }, strong: { fontWeight: "bold" } }}
                          defaultTextProps={{ selectable: true }}
                        />
                      ) : null}
                    </TouchableOpacity>
                  )}
                  style={styles.reportReasonsList}
                />
                <TextInput
                  placeholder="Additional details (optional)"
                  value={reportDetails}
                  onChangeText={setReportDetails}
                  style={styles.reportDetailsInput}
                  multiline
                  maxLength={500}
                />
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => setReportModal({ visible: false, post: null })}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.reportButton, (!selectedReason || reportLoading) && styles.reportButtonDisabled]}
                    onPress={handleSendReport}
                    disabled={!selectedReason || reportLoading}
                  >
                    {reportLoading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.reportButtonText}>Send Report</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.primaryColor,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    padding: 32,
  },
  loadingText: {
    fontSize: 18,
    color: "#4F46E5",
    marginTop: 16,
    fontWeight: "500",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    padding: 32,
  },
  errorIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 12,
    textAlign: "center",
  },
  errorText: {
    fontSize: 16,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4F46E5",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  retryButtonText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  listContainer: {
    paddingBottom: 24,
  },
  headerContainer: {
    backgroundColor: "#FFFFFF",
  },
  coverSection: {
    position: "relative",
    height: 240,
    width: "100%",
  },
  coverImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  coverOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  headerActions: {
    position: "absolute",
    top: Platform.OS === "android" ? StatusBar.currentHeight + 10 : 50,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    zIndex: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerRightActions: {
    flexDirection: "row",
    gap: 8,
  },
  groupAvatarContainer: {
    position: "absolute",
    bottom: -60,
    left: 20,
    zIndex: 10,
  },
  groupAvatarWrapper: {
    position: "relative",
  },
  groupAvatar: {
    width: 120,
    height: 120,
    borderRadius: 20,
    borderWidth: 4,
    borderColor: "#FFFFFF",
    backgroundColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  privateBadge: {
    position: "absolute",
    top: -8,
    right: -8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#8B5CF6",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  groupInfoSection: {
    paddingTop: 80,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  groupHeader: {
    marginBottom: 16,
  },
  groupName: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1E293B",
    lineHeight: 34,
    marginBottom: 8,
  },
  privateTag: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#F3E8FF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  privateTagText: {
    fontSize: 12,
    color: "#4F46E5",
    fontWeight: "600",
  },
  groupDescription: {
    fontSize: 16,
    lineHeight: 24,
    color: "#64748B",
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    marginTop: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statText: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
  },
  statDivider: {
    width: 1,
    height: 16,
    backgroundColor: "#E2E8F0",
    marginHorizontal: 16,
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#10B981",
  },
  adminSection: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  adminLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4F46E5",
    marginBottom: 12,
  },
  adminInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  adminAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#4F46E5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  adminAvatarImg: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  adminAvatarText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  adminDetails: {
    flex: 1,
  },
  adminName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 2,
  },
  adminEmail: {
    fontSize: 14,
    color: "#4F46E5",
  },
  actionButtonsContainer: {
    gap: 12,
  },
  primaryActionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  joinButton: {
    backgroundColor: "#4F46E5",
  },
  leaveButton: {
    backgroundColor: "#6B7280",
  },
  pendingButton: {
    backgroundColor: "#F59E0B",
  },
  primaryActionText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  secondaryActionsRow: {
    flexDirection: "row",
    gap: 12,
  },
  secondaryActionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 6,
  },
  secondaryActionText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#4F46E5",
  },
  postsHeaderSection: {
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  postsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  postsTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
  },
  filterButton: {
    position: "relative",
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  filterIndicator: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#F59E0B",
  },
  searchContainer: {
    marginBottom: 16,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#1E293B",
  },
  createPostContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  createPostAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  createPostAvatarImg: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  createPostAvatarText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4F46E5",
  },
  createPostPlaceholder: {
    flex: 1,
    fontSize: 16,
    color: "#94A3B8",
  },
  createPostActions: {
    flexDirection: "row",
    gap: 12,
  },
  resultsInfo: {
    alignItems: "center",
  },
  resultsText: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
  },
  postCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    overflow: "hidden",
  },
  postHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    paddingBottom: 12,
  },
  postAuthorSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  authorAvatarContainer: {
    marginRight: 12,
  },
  authorAvatarImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  authorAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#4F46E5",
    justifyContent: "center",
    alignItems: "center",
  },
  authorAvatarText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 4,
  },
  postMetaInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  postTime: {
    fontSize: 12,
    color: "#64748B",
  },
  metaDivider: {
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: "#CBD5E1",
  },
  postVisibility: {
    fontSize: 12,
    color: "#64748B",
  },
  postMenuButton: {
    padding: 8,
    borderRadius: 8,
  },
  postContent: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  postImageContainer: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    overflow: "hidden",
  },
  postImage: {
    width: "100%",
    height: 200,
    resizeMode: "cover",
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  tagChip: {
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    fontSize: 12,
    color: "#4F46E5",
    fontWeight: "500",
  },
  moreTagsText: {
    fontSize: 12,
    color: "#64748B",
    fontStyle: "italic",
    alignSelf: "center",
  },
  // Updated engagement stats - Facebook style
  engagementStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E4E6EA",
  },
  reactionsSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  reactionsIcons: {
    flexDirection: "row",
    alignItems: "center",
  },
  reactionEmojiContainer: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: -2,
    borderWidth: 1,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  reactionEmoji: {
    fontSize: 12,
    textAlign: "center",
  },
  reactionsCount: {
    fontSize: 13,
    color: "#65676B",
    fontWeight: "400",
    marginLeft: 4,
  },
  engagementRight: {
    flexDirection: "row",
    gap: 16,
  },
  commentsCount: {
    fontSize: 13,
    color: "#65676B",
  },
  // Updated reaction bar - Bold text instead of blue background
  reactionBarContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderTopWidth: 1,
    borderTopColor: "#E4E6EA",
  },
  reactionBarButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 6,
    gap: 6,
  },
  reactionBarEmoji: {
    fontSize: 18,
  },
  reactionBarText: {
    fontSize: 14,
    color: "#65676B",
    fontWeight: "600",
  },
  reactionBarTextActive: {
    color: "#1877F2",
    fontWeight: "700", // Bold text for active reactions
  },
  // Simplified comments section
  commentsSection: {
    backgroundColor: "#F7F8FA",
    borderTopWidth: 1,
    borderTopColor: "#E4E6EA",
  },
  commentInputSection: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    backgroundColor: "#FFFFFF",
  },
  commentInputAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E4E6EA",
    justifyContent: "center",
    alignItems: "center",
  },
  commentInputAvatarImg: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  commentInputAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#1877F2",
    justifyContent: "center",
    alignItems: "center",
  },
  commentInputAvatarText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  commentInputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F0F2F5",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 36,
  },
  commentInput: {
    flex: 1,
    fontSize: 14,
    color: "#1C1E21",
    maxHeight: 100,
    paddingVertical: 0,
  },
  commentSendButton: {
    marginLeft: 8,
    padding: 4,
    backgroundColor: "#1877F2",
    borderRadius: 12,
  },
  commentSendButtonDisabled: {
    backgroundColor: "#BCC0C4",
  },
  commentErrorText: {
    fontSize: 12,
    color: "#E41E3F",
    marginBottom: 8,
  },
  commentsLoading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  commentsLoadingText: {
    fontSize: 14,
    color: "#1877F2",
  },
  commentsList: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  commentItem: {
    flexDirection: "row",
    marginBottom: 8,
    alignItems: "flex-start",
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E4E6EA",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  commentAvatarImg: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  commentAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#1877F2",
    justifyContent: "center",
    alignItems: "center",
  },
  commentAvatarText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  commentContent: {
    flex: 1,
  },
  commentBubble: {
    backgroundColor: "#F0F2F5",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 4,
  },
  commentAuthor: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1C1E21",
    marginBottom: 2,
  },
  commentText: {
    fontSize: 14,
    color: "#1C1E21",
    lineHeight: 18,
  },
  commentActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingLeft: 12,
  },
  commentTime: {
    fontSize: 12,
    color: "#65676B",
  },
  commentActionText: {
    fontSize: 12,
    color: "#65676B",
    fontWeight: "600",
  },
  viewMoreComments: {
    paddingVertical: 8,
    alignItems: "center",
  },
  viewMoreCommentsText: {
    fontSize: 14,
    color: "#1877F2",
    fontWeight: "600",
  },
  noComments: {
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  noCommentsText: {
    fontSize: 14,
    color: "#65676B",
    fontWeight: "500",
  },
  noCommentsSubtext: {
    fontSize: 12,
    color: "#8A8D91",
    marginTop: 4,
  },
  emptyStateContainer: {
    flex: 1,
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  postsLoading: {
    alignItems: "center",
    paddingVertical: 32,
  },
  postsLoadingText: {
    fontSize: 16,
    color: "#4F46E5",
    marginTop: 12,
    fontWeight: "500",
  },
  emptyPosts: {
    alignItems: "center",
  },
  emptyPostsIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyPostsTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyPostsSubtitle: {
    fontSize: 16,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
  },
  emptyPostsAction: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4F46E5",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  emptyPostsActionText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  joinRequired: {
    alignItems: "center",
  },
  joinRequiredIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  joinRequiredTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 8,
    textAlign: "center",
  },
  joinRequiredSubtitle: {
    fontSize: 16,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
  },
  joinRequiredAction: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4F46E5",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  joinRequiredActionText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  paginationContainer: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  paginationGradient: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 16,
  },
  paginationContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  paginationNavButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
  },
  disabledNavButton: {
    backgroundColor: "#F1F5F9",
  },
  paginationDots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  paginationDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  activePaginationDot: {
    backgroundColor: "#4F46E5",
  },
  paginationDotText: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "600",
  },
  activePaginationDotText: {
    color: "#FFFFFF",
  },
  pageInfoContainer: {
    alignItems: "center",
  },
  pageInfo: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
  },
  footerLoader: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
    gap: 8,
  },
  footerLoaderText: {
    fontSize: 14,
    backgroundColor: "#CBD5E1",
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 8,
    marginBottom: 8,
  },
  filterHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  filterHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  filterIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  filterTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
  },
  filterSubtitle: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 2,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  filterScrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  filterSection: {
    marginVertical: 16,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rangeInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dateInput: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 8,
  },
  dateInputText: {
    fontSize: 16,
    color: "#1E293B",
    flex: 1,
  },
  rangeSeparator: {
    alignItems: "center",
    justifyContent: "center",
  },
  rangeSeparatorText: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
  },
  statusGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statusCard: {
    flex: 1,
    minWidth: "45%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 8,
  },
  selectedStatusCard: {
    backgroundColor: "#4F46E5",
    borderColor: "#4F46E5",
  },
  statusCardText: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
  },
  selectedStatusCardText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  pageSizeGrid: {
    flexDirection: "row",
    gap: 12,
  },
  pageSizeCard: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  selectedPageSizeCard: {
    backgroundColor: "#4F46E5",
    borderColor: "#4F46E5",
  },
  pageSizeCardNumber: {
    fontSize: 20,
    color: "#1E293B",
    fontWeight: "700",
  },
  selectedPageSizeCardNumber: {
    color: "#FFFFFF",
  },
  pageSizeCardLabel: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 4,
  },
  selectedPageSizeCardLabel: {
    color: "rgba(255, 255, 255, 0.8)",
  },
  filterActions: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 12,
  },
  clearFiltersButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 8,
  },
  clearFiltersText: {
    fontSize: 16,
    color: "#4F46E5",
    fontWeight: "600",
  },
  applyFiltersButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4F46E5",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  applyFiltersText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  datePickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  datePickerModal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    width: "100%",
    maxWidth: 350,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  datePickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
  },
  datePickerSpinner: {
    height: 200,
  },
  datePickerConfirm: {
    backgroundColor: "#4F46E5",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 20,
  },
  datePickerConfirmText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  // New Facebook-style reaction picker styles
  floatingReactionPicker: {
    position: 'absolute',
    zIndex: 9999,
  },
  reactionPickerContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 25,
    paddingHorizontal: 8,
    paddingVertical: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
    borderWidth: 1,
    borderColor: "#E4E6EA",
  },
  reactionTypesContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  reactionTypeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F8F9FA",
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 2,
  },
  reactionTypeEmoji: {
    fontSize: 22,
    textAlign: "center",
  },
  reactionTypeIcon: {
    width: 22,
    height: 22,
    resizeMode: "contain",
  },
  reactionPickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9998,
    backgroundColor: 'transparent',
  },
  // Reaction details modal styles - Updated with tabs
  reactionDetailsModal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    margin: 20,
    maxWidth: 350,
    width: "90%",
    maxHeight: "80%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
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
  // New styles for horizontal tabs
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
  // Updated users list styles
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
  // Edit modal styles
  editModal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    margin: 20,
    maxWidth: 350,
    width: "90%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
    textAlign: "center",
    marginBottom: 16,
  },
  editInput: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: "#1E293B",
    minHeight: 100,
    textAlignVertical: "top",
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    color: "#64748B",
    fontWeight: "600",
  },
  saveButton: {
    flex: 1,
    backgroundColor: "#4F46E5",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  saveButtonDisabled: {
    backgroundColor: "#CBD5E1",
  },
  saveButtonText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  // Action menu styles
  actionMenu: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 8,
    margin: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  actionMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  actionMenuIcon: {
    fontSize: 18,
  },
  actionMenuText: {
    fontSize: 16,
    color: "#1E293B",
    fontWeight: "500",
  },
  deleteText: {
    color: "#EF4444",
  },
  actionMenuDivider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginHorizontal: 8,
  },
  // Report modal styles
  reportModal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    margin: 20,
    maxWidth: 350,
    width: "90%",
    maxHeight: "80%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  reportLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 12,
  },
  reportReasonsList: {
    maxHeight: 200,
    marginBottom: 16,
  },
  reportReasonItem: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 8,
  },
  reportReasonSelected: {
    borderColor: "#4F46E5",
    backgroundColor: "#EEF2FF",
  },
  reportReasonTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 4,
  },
  reportDetailsInput: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: "#1E293B",
    minHeight: 80,
    textAlignVertical: "top",
    marginBottom: 16,
  },
  reportButton: {
    flex: 1,
    backgroundColor: "#EF4444",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  deleteButton: {
  backgroundColor: "#EF4444", // Màu đỏ cho nút xóa
},
  reportButtonDisabled: {
    backgroundColor: "#CBD5E1",
  },
  reportButtonText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  reportStatusContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  reportStatusIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  reportStatusText: {
    fontSize: 16,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 20,
  },
  backButtonText: {
    fontSize: 16,
    color: "#4F46E5",
    fontWeight: "600",
  },
  pendingButtonContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#F59E0B',
  borderRadius: 16,
  paddingHorizontal: 12,
  paddingVertical: 4,
  marginLeft: 10,
},
pendingIcon: {
  marginRight: 4,
},
pendingButtonText: {
  color: '#fff',
  fontWeight: 'bold',
  fontSize: 13,
},
});

export default GroupDetailsScreen;