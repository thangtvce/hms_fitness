import { useEffect,useState } from "react"
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Image,
  TextInput,
  Modal,
  Platform,
} from "react-native"
import { useNavigation,useRoute } from "@react-navigation/native"
import { getGroupJoinRequests,updateMemberStatus } from "services/apiCommunityService"
import { Ionicons } from "@expo/vector-icons"
import { SafeAreaView } from "react-native-safe-area-context"
import { showErrorFetchAPI,showSuccessMessage } from "utils/toastUtil"
import Header from "components/Header"
import CommonSkeleton from "components/CommonSkeleton/CommonSkeleton"

const BanMembersScreen = () => {
  const navigation = useNavigation()
  const route = useRoute()
  const { groupId } = route.params || {}

  const [loading,setLoading] = useState(true)
  const [members,setMembers] = useState([])
  const [filteredMembers,setFilteredMembers] = useState([])
  const [refreshing,setRefreshing] = useState(false)
  const [sortOrder,setSortOrder] = useState("newest")
  const [searchTerm,setSearchTerm] = useState("")
  const [showSortModal,setShowSortModal] = useState(false)

  const fetchBannedMembers = async () => {
    setLoading(true)
    try {
      const data = await getGroupJoinRequests(groupId,"banned")
      const sortedMembers = [...(data.requests || [])].sort((a,b) =>
        sortOrder === "newest"
          ? new Date(b.bannedAt || b.joinedAt) - new Date(a.bannedAt || a.joinedAt)
          : new Date(a.bannedAt || a.joinedAt) - new Date(b.bannedAt || b.joinedAt),
      )
      setMembers(sortedMembers)
      setFilteredMembers(sortedMembers)
    } catch (e) {
      showErrorFetchAPI(e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchBannedMembers()
  },[groupId])

  useEffect(() => {
    const sortedMembers = [...members].sort((a,b) =>
      sortOrder === "newest"
        ? new Date(b.bannedAt || b.joinedAt) - new Date(a.bannedAt || a.joinedAt)
        : new Date(a.bannedAt || a.joinedAt) - new Date(b.bannedAt || b.joinedAt),
    )
    const filtered = sortedMembers.filter((member) =>
      member.userFullName?.toLowerCase().includes(searchTerm.toLowerCase()),
    )
    setFilteredMembers(filtered)
  },[sortOrder,members,searchTerm])

  const handleUnban = async (member) => {
    Alert.alert("Unban Member",`Are you sure you want to unban ${member.userFullName}?`,[
      { text: "Cancel",style: "cancel" },
      {
        text: "Unban",
        onPress: async () => {
          try {
            await updateMemberStatus(member?.memberId,"approved");
            showSuccessMessage("Member unbanned successfully!")
            fetchBannedMembers()
          } catch (e) {
            showErrorFetchAPI(e)
          }
        },
      },
    ])
  }

  const handleSearch = (text) => {
    setSearchTerm(text)
  }

  const renderSortModal = () => (
    <Modal
      visible={showSortModal}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowSortModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.sortModalContainer}>
          <View style={styles.sortModalHeader}>
            <Text style={styles.sortModalTitle}>Sort Members</Text>
            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setShowSortModal(false)}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.sortOptionsContainer}>
            <TouchableOpacity
              style={[styles.sortOption,sortOrder === "newest" && styles.selectedSortOption]}
              onPress={() => {
                setSortOrder("newest")
                setShowSortModal(false)
              }}
            >
              <Ionicons name="arrow-down" size={20} color={sortOrder === "newest" ? "#0056d2" : "#64748B"} />
              <Text style={[styles.sortOptionText,sortOrder === "newest" && styles.selectedSortOptionText]}>
                Newest First
              </Text>
              {sortOrder === "newest" && <Ionicons name="checkmark" size={20} color="#0056d2" />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.sortOption,sortOrder === "oldest" && styles.selectedSortOption]}
              onPress={() => {
                setSortOrder("oldest")
                setShowSortModal(false)
              }}
            >
              <Ionicons name="arrow-up" size={20} color={sortOrder === "oldest" ? "#0056d2" : "#64748B"} />
              <Text style={[styles.sortOptionText,sortOrder === "oldest" && styles.selectedSortOptionText]}>
                Oldest First
              </Text>
              {sortOrder === "oldest" && <Ionicons name="checkmark" size={20} color="#0056d2" />}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )

  const renderItem = ({ item }) => (
    <View style={styles.memberCard}>
      <View style={styles.memberCardContent}>
        <View style={styles.memberAvatarContainer}>
          {item.avatar ? (
            <Image source={{ uri: item.avatar }} style={styles.memberAvatar} />
          ) : (
            <View style={styles.memberAvatarPlaceholder}>
              <Text style={styles.memberAvatarText}>{item.userFullName?.charAt(0)?.toUpperCase() || "U"}</Text>
            </View>
          )}
          <View style={styles.bannedBadge}>
            <Ionicons name="ban" size={12} color="#FFFFFF" />
          </View>
        </View>

        <View style={styles.memberInfo}>
          <Text style={styles.memberName} numberOfLines={1}>
            {item.userFullName || "Unknown"}
          </Text>
          <View style={styles.memberMeta}>
            <Ionicons name="calendar-outline" size={12} color="#64748B" />
            <Text style={styles.memberMetaText}>
              Banned{" "}
              {new Date(item.bannedAt || item.joinedAt).toLocaleDateString("en-US",{
                month: "short",
                day: "numeric",
              })}
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.unbanButton} onPress={() => handleUnban(item)}>
          <Ionicons name="checkmark-circle-outline" size={18} color="#22C55E" />
          <Text style={styles.unbanButtonText}>Unban</Text>
        </TouchableOpacity>
      </View>
    </View>
  )

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <CommonSkeleton />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <Header
        title="Banned"
        subtitle={`${filteredMembers.length} banned`}
        onBack={() => navigation.goBack()}
        showAvatar={false}
        rightActions={[
          {
            icon: <Ionicons name="options-outline" size={24} color="#0056d2" />,
            onPress: () => setShowSortModal(true),
            backgroundColor: 'transparent',
          },
        ]}
      />

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search-outline" size={20} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search banned members..."
            value={searchTerm}
            onChangeText={handleSearch}
            placeholderTextColor="#9CA3AF"
          />
          {searchTerm ? (
            <TouchableOpacity onPress={() => handleSearch("")} style={styles.clearSearchButton}>
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Members List */}
      <FlatList
        data={filteredMembers}
        keyExtractor={(item) => item.memberId?.toString()}
        renderItem={renderItem}
        refreshing={refreshing}
        onRefresh={() => {
          setRefreshing(true)
          fetchBannedMembers()
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="ban-outline" size={64} color="#D1D5DB" />
            </View>
            <Text style={styles.emptyTitle}>{searchTerm ? "No matching members" : "No banned members"}</Text>
            <Text style={styles.emptySubtitle}>
              {searchTerm ? "Try adjusting your search terms" : "Banned members will appear here"}
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />

      {/* Sort Modal */}
      {renderSortModal()}
    </SafeAreaView>
  )
}

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
  sortButton: {
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
    marginTop: 2,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#000000",
  },
  clearSearchButton: {
    padding: 4,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  memberCard: {
    marginBottom: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  memberCardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  memberAvatarContainer: {
    position: "relative",
    marginRight: 16,
  },
  memberAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  memberAvatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#EF4444",
    justifyContent: "center",
    alignItems: "center",
  },
  memberAvatarText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  bannedBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#EF4444",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 17,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 4,
  },
  memberMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  memberMetaText: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "500",
  },
  unbanButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  unbanButtonText: {
    color: "#22C55E",
    fontSize: 14,
    fontWeight: "600",
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
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#F9FAFB",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000000",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  sortModalContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    width: "100%",
    maxWidth: 320,
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 25,
  },
  sortModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  sortModalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000000",
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  sortOptionsContainer: {
    padding: 24,
  },
  sortOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: "#F8FAFC",
  },
  selectedSortOption: {
    backgroundColor: "#EBF4FF",
    borderWidth: 2,
    borderColor: "#0056d2",
  },
  sortOptionText: {
    fontSize: 16,
    color: "#64748B",
    marginLeft: 12,
    fontWeight: "500",
    flex: 1,
  },
  selectedSortOptionText: {
    color: "#0056d2",
    fontWeight: "600",
  },
})

export default BanMembersScreen
