import { useEffect,useState } from "react";
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
  Platform,
} from "react-native";
import { getPostsByOwner,deletePost } from "services/apiCommunityService";
import { Ionicons,Feather } from "@expo/vector-icons";
import Header from "components/Header";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import HTML from "react-native-render-html";
import { showErrorFetchAPI } from "utils/toastUtil";

const { width: screenWidth } = Dimensions.get("window");

const UserPostsScreen = ({ route }) => {
  const { ownerId,currentUserId } = route.params;
  const navigation = useNavigation();
  const [posts,setPosts] = useState([]);
  const [loading,setLoading] = useState(true);
  const [refreshing,setRefreshing] = useState(false);
  const [showMenu,setShowMenu] = useState(null);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const data = await getPostsByOwner(ownerId);
      setPosts(data.filter((p) => p.status !== "deleted"));
    } catch (e) {
      showErrorFetchAPI(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPosts();
  },[]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPosts();
    setRefreshing(false);
  };

  const handleDelete = async (postId) => {
    setShowMenu(null);
    Alert.alert("Delete Post","Are you sure you want to delete this post?",[
      { text: "Cancel",style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deletePost(postId);
            fetchPosts();
          } catch (e) {
            showErrorFetchAPI(e);
          }
        },
      },
    ]);
  };

  const handleEdit = (item) => {
    setShowMenu(null);
    navigation.navigate("EditPostScreen",{ post: item });
  };

  // Remove custom renderHeader, use Header.js below

  const renderActionMenu = (item) => (
    <Modal
      visible={showMenu === item.postId}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowMenu(null)}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowMenu(null)}
      >
        <View style={styles.menuContainer}>
          <View style={styles.menuContent}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleEdit(item)}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={["#0056d2","#0056d2"]}
                style={styles.menuIconContainer}
              >
                <Feather name="edit-2" size={20} color="#FFFFFF" />
              </LinearGradient>
              <Text style={styles.menuText}>Edit Post</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleDelete(item.postId)}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={["#EF4344","#B91C1C"]}
                style={styles.menuIconContainer}
              >
                <Feather name="trash-2" size={20} color="#FFFFFF" />
              </LinearGradient>
              <Text style={[styles.menuText,styles.deleteText]}>Delete Post</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );

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
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    item.user?.fullName || "U"
                  )}&background=0056d2&color=fff`,
              }}
              style={styles.avatar}
            />
            <View style={styles.userDetails}>
              <Text style={styles.userName}>
                {item.user?.fullName || "Anonymous"}
              </Text>
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
            <TouchableOpacity
              style={styles.moreButton}
              onPress={() => setShowMenu(item.postId)}
              activeOpacity={0.7}
            >
              <Ionicons name="ellipsis-horizontal" size={20} color="#6B7280" />
            </TouchableOpacity>
          )}
        </View>
        <HTML
          source={{ html: item.content || "<p>No content</p>" }}
          contentWidth={screenWidth - 80}
          baseStyle={{
            fontSize: 16,
            lineHeight: 24,
            color: "#000000",
            fontWeight: "400",
            fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
          }}
          tagsStyles={{
            p: { marginVertical: 4 },
            b: { fontWeight: "700" },
            strong: { fontWeight: "700" },
            i: { fontStyle: "italic" },
            em: { fontStyle: "italic" },
            ul: { marginVertical: 8,paddingLeft: 20 },
            ol: { marginVertical: 8,paddingLeft: 20 },
            li: { marginBottom: 4 },
            a: { color: "#0056d2",textDecorationLine: "underline" },
          }}
          renderersProps={{
            a: {
              onPress: (event,href) => {
                Linking.openURL(href).catch(() =>
                  Alert.alert("Error","Unable to open link")
                );
              },
            },
          }}
        />
        {item.thumbnail && item.thumbnail !== "DEFAULT_IMAGE" && (
          <Image
            source={{ uri: item.thumbnail }}
            style={styles.postImage}
            resizeMode="cover"
          />
        )}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Ionicons name="heart-outline" size={18} color="#EF4444" />
            <Text style={styles.statText}>
              {item.reactions?.length || 0}{" "}
              {item.reactions?.length === 1 ? "reaction" : "reactions"}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="chatbubble-ellipses-outline" size={18} color="#0056d2" />
            <Text style={styles.statText}>
              {item.totalComment || 0}{" "}
              {item.totalComment === 1 ? "comment" : "comments"}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
      {renderActionMenu(item)}
    </>
  );

  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="document-text-outline" size={64} color="#6B7280" />
      <Text style={styles.emptyTitle}>No Posts Found</Text>
      <Text style={styles.emptySubtitle}>
        This user hasn't shared any posts yet.
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar style="dark" backgroundColor="#FFFFFF" />
        <Header
          title="History Posts"
          onBack={() => navigation.goBack()}
          rightActions={[]}
          style={{ backgroundColor: '#FFFFFF' }}
        />
        <View style={[styles.loadingContent, { marginTop: 50 }]}> 
          <ActivityIndicator size="large" color="#0056d2" />
          <Text style={styles.loadingText}>Loading posts...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" backgroundColor="#FFFFFF" />
      <Header
        title="History Posts"
        onBack={() => navigation.goBack()}
        rightActions={[]}
        style={{ backgroundColor: '#FFFFFF' }}
      />
      <FlatList
        data={posts}
        keyExtractor={(item) => item.postId.toString()}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={["#0056d2"]}
            tintColor="#0056d2"
          />
        }
        ListEmptyComponent={renderEmptyComponent}
        contentContainerStyle={posts.length === 0 ? [styles.emptyList, { marginTop: 50 }] : [styles.listContent, { marginTop: 50 }]}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  loadingContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "500",
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
  headerRight: {
    width: 44,
  },
  listContent: {
    padding: 5,
  },
  emptyList: {
    flexGrow: 1,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 5,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    backgroundColor: "#E5E7EB",
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
  postTime: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
  },
  moreButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  postImage: {
    width: "100%",
    height: 220,
    borderRadius: 12,
    marginVertical: 16,
    backgroundColor: "#E5E7EB",
  },
  statsContainer: {
    flexDirection: "row",
    gap: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statText: {
    fontSize: 14,
    color: "#6B7280",
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
    fontWeight: "700",
    color: "#000000",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 24,
    fontWeight: "400",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  menuContainer: {
    width: screenWidth * 0.8,
    maxWidth: 280,
  },
  menuContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  menuText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
  },
  deleteText: {
    color: "#EF4444",
  },
  menuDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 20,
  },
});

export default UserPostsScreen;