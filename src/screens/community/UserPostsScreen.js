"use client"

import { useEffect,useState } from "react"
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  StyleSheet,
  RefreshControl,
  Modal,
  Dimensions,
} from "react-native"
import { getPostsByOwner,deletePost } from "services/apiCommunityService"
import { Ionicons,Feather } from "@expo/vector-icons"
import { useNavigation } from "@react-navigation/native"
import DynamicStatusBar from "screens/statusBar/DynamicStatusBar"
import { theme } from "theme/color"
import { SafeAreaView } from "react-native-safe-area-context"
import { StatusBar } from "expo-status-bar"

const { width: screenWidth } = Dimensions.get("window")

const UserPostsScreen = ({ route }) => {
  const { ownerId,currentUserId } = route.params
  const navigation = useNavigation()
  const [posts,setPosts] = useState([])
  const [loading,setLoading] = useState(true)
  const [refreshing,setRefreshing] = useState(false)
  const [showMenu,setShowMenu] = useState(null)

  const fetchPosts = async () => {
    setLoading(true)
    try {
      const data = await getPostsByOwner(ownerId)
      setPosts(data.filter((p) => p.status === "active"))
    } catch (e) {
      Alert.alert("Error",e.message || "Failed to load posts")
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchPosts()
  },[])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchPosts()
    setRefreshing(false)
  }

  const handleDelete = async (postId) => {
    setShowMenu(null)
    Alert.alert("Delete Post","Are you sure you want to delete this post?",[
      { text: "Cancel",style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deletePost(postId)
            fetchPosts()
          } catch (e) {
            Alert.alert("Error",e.message || "Failed to delete post")
          }
        },
      },
    ])
  }

  const handleEdit = (item) => {
    setShowMenu(null)
    navigation.navigate("EditPostScreen",{ post: item })
  }

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
        <Ionicons name="arrow-back" size={24} color="#1f2937" />
      </TouchableOpacity>
      <View style={styles.headerContent}>
        <Text style={styles.headerTitle}>User Posts</Text>
        <Text style={styles.headerSubtitle}>
          {posts.length} {posts.length === 1 ? "post" : "posts"} found
        </Text>
      </View>
    </View>
  )

  const renderActionMenu = (item) => (
    <Modal
      visible={showMenu === item.postId}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowMenu(null)}
    >
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowMenu(null)}>
        <View style={styles.menuContainer}>
          <View style={styles.menuContent}>
            <TouchableOpacity style={styles.menuItem} onPress={() => handleEdit(item)} activeOpacity={0.7}>
              <View style={styles.menuIconContainer}>
                <Feather name="edit-2" size={20} color="#3b82f6" />
              </View>
              <Text style={styles.menuText}>Edit Post</Text>
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity style={styles.menuItem} onPress={() => handleDelete(item.postId)} activeOpacity={0.7}>
              <View style={styles.menuIconContainer}>
                <Feather name="trash-2" size={20} color="#ef4444" />
              </View>
              <Text style={[styles.menuText,styles.deleteText]}>Delete Post</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  )

  const renderItem = ({ item }) => (
    <>
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.95}
        onPress={() => navigation.navigate("PostDetailScreen",{ post: item })}
      >
        <View style={styles.cardHeader}>
          <View style={styles.userInfo}>
            <Image
              source={{
                uri:
                  item.user?.avatar ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(item.user?.fullName || "U")}&background=3b82f6&color=fff`,
              }}
              style={styles.avatar}
            />
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{item.user?.fullName || "Anonymous"}</Text>
              <Text style={styles.postTime}>
                {new Date(item.createdAt).toLocaleDateString("en-US",{
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </View>
          </View>

          {item.userId === currentUserId && (
            <TouchableOpacity style={styles.moreButton} onPress={() => setShowMenu(item.postId)} activeOpacity={0.7}>
              <Ionicons name="ellipsis-horizontal" size={20} color="#6b7280" />
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.postContent} numberOfLines={4}>
          {item.content}
        </Text>

        {item.thumbnail && item.thumbnail !== "DEFAULT_IMAGE" && (
          <Image source={{ uri: item.thumbnail }} style={styles.postImage} />
        )}

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Ionicons name="heart-outline" size={18} color="#ef4444" />
            <Text style={styles.statText}>
              {item.reactions?.length || 0} {item.reactions?.length === 1 ? "reaction" : "reactions"}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="chatbubble-ellipses-outline" size={18} color="#3b82f6" />
            <Text style={styles.statText}>
              {item.totalComment || 0} {item.totalComment === 1 ? "comment" : "comments"}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
      {renderActionMenu(item)}
    </>
  )

  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="document-text-outline" size={64} color="#9ca3af" />
      <Text style={styles.emptyTitle}>No Posts Found</Text>
      <Text style={styles.emptySubtitle}>This user hasn't shared any posts yet.</Text>
    </View>
  )

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <DynamicStatusBar backgroundColor={theme.primaryColor} />
        {renderHeader()}
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading posts...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      {renderHeader()}
      <FlatList
        data={posts}
        keyExtractor={(item) => item.postId.toString()}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={["#3b82f6"]} tintColor="#3b82f6" />
        }
        ListEmptyComponent={renderEmptyComponent}
        contentContainerStyle={posts.length === 0 ? styles.emptyList : styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  loadingContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6b7280",
    fontWeight: "500",
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
    borderRadius: 20,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f2937",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 2,
  },
  listContent: {
    padding: 16,
  },
  emptyList: {
    flexGrow: 1,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
    backgroundColor: "#e5e7eb",
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 2,
  },
  postTime: {
    fontSize: 13,
    color: "#6b7280",
  },
  moreButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    alignItems: "center",
  },
  postContent: {
    fontSize: 15,
    lineHeight: 22,
    color: "#374151",
    marginBottom: 12,
  },
  postImage: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: "#e5e7eb",
  },
  statsContainer: {
    flexDirection: "row",
    gap: 24,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statText: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#374151",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 24,
  },
  // Modal and Menu Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  menuContainer: {
    width: screenWidth * 0.8,
    maxWidth: 280,
  },
  menuContent: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    paddingVertical: 8,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  menuIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  menuText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#374151",
  },
  deleteText: {
    color: "#ef4444",
  },
  menuDivider: {
    height: 1,
    backgroundColor: "#f1f5f9",
    marginHorizontal: 20,
  },
})

export default UserPostsScreen
