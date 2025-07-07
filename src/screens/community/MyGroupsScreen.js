"use client"

import React, { useEffect, useState, useRef } from "react"
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
  Animated,
  Platform,
  Dimensions,
  RefreshControl,
} from "react-native"
import { useNavigation, useFocusEffect } from "@react-navigation/native"
import { getGroupsByCreator, deleteGroup } from "services/apiCommunityService"
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import { SafeAreaView } from "react-native-safe-area-context"
import { ScrollView } from "react-native-gesture-handler"

const { width } = Dimensions.get("window")

const MyGroupsScreen = () => {
  const navigation = useNavigation()
  const [groups, setGroups] = useState([])
  const [filteredGroups, setFilteredGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [showFilterModal, setShowFilterModal] = useState(false)
  const [filters, setFilters] = useState({
    status: "all",
    privacy: "all",
    sortBy: "newest",
  })
  const [tempFilters, setTempFilters] = useState(filters)

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(30)).current
  const scaleAnim = useRef(new Animated.Value(0.95)).current

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
        tension: 120,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start()
  }, [])

  const fetchGroups = async () => {
    try {
      if (!refreshing) setLoading(true)
      const data = await getGroupsByCreator()
      const filteredGroups = (Array.isArray(data.groups) ? data.groups : []).filter((g) => g.status !== "deleted")
      setGroups(filteredGroups)
      applyFiltersAndSearch(filteredGroups, searchTerm, filters)
    } catch (e) {
      Alert.alert("Error", e.message || "Failed to fetch your groups")
      setGroups([])
      setFilteredGroups([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useFocusEffect(
    React.useCallback(() => {
      fetchGroups()
    }, []),
  )

  const applyFiltersAndSearch = (groupList, search, currentFilters) => {
    let filtered = [...groupList]

    // Apply search
    if (search.trim()) {
      filtered = filtered.filter(
        (group) =>
          group.groupName?.toLowerCase().includes(search.toLowerCase()) ||
          group.description?.toLowerCase().includes(search.toLowerCase()),
      )
    }

    // Apply status filter
    if (currentFilters.status !== "all") {
      filtered = filtered.filter((group) => group.status?.toLowerCase() === currentFilters.status)
    }

    // Apply privacy filter
    if (currentFilters.privacy !== "all") {
      if (currentFilters.privacy === "private") {
        filtered = filtered.filter((group) => group.isPrivate === true)
      } else if (currentFilters.privacy === "public") {
        filtered = filtered.filter((group) => group.isPrivate === false)
      }
    }

    // Apply sorting
    switch (currentFilters.sortBy) {
      case "newest":
        filtered.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
        break
      case "oldest":
        filtered.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0))
        break
      case "name":
        filtered.sort((a, b) => (a.groupName || "").localeCompare(b.groupName || ""))
        break
      case "members":
        filtered.sort((a, b) => (b.memberCount || 0) - (a.memberCount || 0))
        break
      default:
        break
    }

    setFilteredGroups(filtered)
  }

  const handleSearch = (text) => {
    setSearchTerm(text)
    applyFiltersAndSearch(groups, text, filters)
  }

  const applyTempFilters = () => {
    setFilters(tempFilters)
    setShowFilterModal(false)
    applyFiltersAndSearch(groups, searchTerm, tempFilters)
  }

  const resetTempFilters = () => {
    const resetFilters = {
      status: "all",
      privacy: "all",
      sortBy: "newest",
    }
    setTempFilters(resetFilters)
    setFilters(resetFilters)
    applyFiltersAndSearch(groups, searchTerm, resetFilters)
  }

  const handleDelete = (groupId, groupName) => {
    Alert.alert("Delete Group", `Are you sure you want to delete "${groupName}"? This action cannot be undone.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteGroup(groupId)
            Alert.alert("Success", "Group deleted successfully")
            fetchGroups()
          } catch (e) {
            Alert.alert("Error", e.message || "Failed to delete group")
          }
        },
      },
    ])
  }

  const handleEdit = (group) => {
    navigation.navigate("EditGroupScreen", { groupId: group.groupId })
  }

  const handleGroupPress = (group) => {
    navigation.navigate("MyGroupDetailScreen", { groupId: group.groupId })
  }

  const getStatusInfo = (status) => {
    switch (status?.toLowerCase()) {
      case "active":
        return { color: "#22C55E", bgColor: "#DCFCE7", icon: "checkmark-circle", label: "Active" }
      case "pending":
        return { color: "#F59E0B", bgColor: "#FEF3C7", icon: "time", label: "Pending" }
      case "inactive":
        return { color: "#EF4444", bgColor: "#FEE2E2", icon: "pause-circle", label: "Inactive" }
      default:
        return { color: "#6B7280", bgColor: "#F1F5F9", icon: "help-circle", label: "Unknown" }
    }
  }

  const formatMemberCount = (count) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`
    return count?.toString() || "0"
  }

  const formatDate = (dateString) => {
    if (!dateString) return "Unknown"
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    } catch {
      return "Unknown"
    }
  }

  const renderGroupCard = ({ item, index }) => {
    const statusInfo = getStatusInfo(item.status)

    return (
      <Animated.View
        style={[
          styles.groupCard,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
          },
        ]}
      >
        <TouchableOpacity activeOpacity={0.9} onPress={() => handleGroupPress(item)}>
          <View style={styles.cardContainer}>
            {/* Header Section */}
            <View style={styles.cardHeader}>
              <View style={styles.headerLeft}>
                <View style={styles.avatarContainer}>
                  <Image
                    source={{
                      uri:
                        item.thumbnail && item.thumbnail !== "string"
                          ? item.thumbnail
                          : "https://via.placeholder.com/60",
                    }}
                    style={styles.groupAvatar}
                  />
                  {item.isPrivate && (
                    <View style={styles.privateBadge}>
                      <Ionicons name="lock-closed" size={10} color="#FFFFFF" />
                    </View>
                  )}
                </View>

                <View style={styles.groupDetails}>
                  <Text style={styles.groupName} numberOfLines={1}>
                    {item.groupName || "Unnamed Group"}
                  </Text>
                  <View style={styles.statsRow}>
                    <View style={styles.memberStat}>
                      <Ionicons name="people" size={14} color="#22C55E" />
                      <Text style={styles.memberCount}>{formatMemberCount(item.memberCount)} members</Text>
                    </View>
                    <View style={styles.dateStat}>
                      <Ionicons name="calendar" size={14} color="#64748B" />
                      <Text style={styles.dateText}>Created {formatDate(item.createdAt)}</Text>
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.headerRight}>
                <View style={[styles.statusBadge, { backgroundColor: statusInfo.bgColor }]}>
                  <Ionicons name={statusInfo.icon} size={12} color={statusInfo.color} />
                  <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
                </View>
              </View>
            </View>

            {/* Description */}
            <View style={styles.descriptionSection}>
              <Text style={styles.description} numberOfLines={2}>
                {item.description || "No description available for this group."}
              </Text>
            </View>

            {/* Footer */}
            <View style={styles.cardFooter}>
              <View style={styles.footerLeft}>
                <View style={styles.privacyBadge}>
                  <Ionicons name={item.isPrivate ? "lock-closed" : "globe"} size={12} color="#3B82F6" />
                  <Text style={styles.privacyText}>{item.isPrivate ? "Private" : "Public"}</Text>
                </View>
              </View>

              <View style={styles.footerRight}>
                <TouchableOpacity style={styles.actionButton} onPress={() => handleEdit(item)}>
                  <Ionicons name="pencil" size={16} color="#3B82F6" />
                  <Text style={styles.actionButtonText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => handleDelete(item.groupId, item.groupName)}
                >
                  <Ionicons name="trash" size={16} color="#EF4444" />
                  <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    )
  }

  const renderCreateGroupHeader = () => (
    <Animated.View
      style={[
        styles.createGroupSection,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
        <LinearGradient
           colors={["#4F46E5","#6366F1","#818CF8"]}
           style={styles.createGroupCard}
           start={{ x: 0, y: 0 }}
           end={{ x: 1, y: 1 }}
         >
           <View style={styles.createGroupContent}>
             <View style={styles.createGroupLeft}>
               <View style={styles.createGroupIcon}>
                 <Ionicons name="add-circle" size={32} color="#FFFFFF" />
               </View>
               <View style={styles.createGroupText}>
                 <Text style={styles.createGroupTitle}>Start Your Community</Text>
                 <Text style={styles.createGroupSubtitle}>Create a health group and connect with others</Text>
               </View>
             </View>
             <TouchableOpacity
               style={styles.createGroupButton}
               onPress={() => navigation.navigate("CreateGroupScreen")}
               activeOpacity={0.8}
             >
               <Text style={styles.createGroupButtonText}>Create</Text>
               <Ionicons name="arrow-forward" size={16} color="#4F46E5" />
             </TouchableOpacity>
           </View>
         </LinearGradient>
    </Animated.View>
  )

  const renderEmpty = () => (
    <Animated.View
      style={[
        styles.emptyContainer,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <View style={styles.emptyIconContainer}>
        <MaterialCommunityIcons name="account-group-outline" size={80} color="#CBD5E1" />
      </View>
      <Text style={styles.emptyTitle}>No Groups Found</Text>
      <Text style={styles.emptyText}>
        {searchTerm || filters.status !== "all" || filters.privacy !== "all"
          ? "No groups match your current search or filters. Try adjusting your criteria."
          : "You haven't created any groups yet. Start building your first community!"}
      </Text>
      <TouchableOpacity
        style={styles.emptyActionButton}
        onPress={() => {
          if (searchTerm || filters.status !== "all" || filters.privacy !== "all") {
            setSearchTerm("")
            resetTempFilters()
          } else {
            navigation.navigate("CreateGroupScreen")
          }
        }}
      >
        <Ionicons
          name={searchTerm || filters.status !== "all" || filters.privacy !== "all" ? "refresh" : "add-circle"}
          size={20}
          color="#FFFFFF"
        />
        <Text style={styles.emptyActionText}>
          {searchTerm || filters.status !== "all" || filters.privacy !== "all" ? "Clear Filters" : "Create Group"}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  )

  const renderFilterModal = () => (
    <Modal
      visible={showFilterModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => {
        setShowFilterModal(false)
        setTempFilters(filters)
      }}
    >
      <View style={styles.modalOverlay}>
        <Animated.View style={[styles.filterModalContent, { transform: [{ scale: scaleAnim }] }]}>
          <View style={styles.modalHandle} />

          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter Groups</Text>
            <TouchableOpacity
              onPress={() => {
                setShowFilterModal(false)
                setTempFilters(filters)
              }}
              style={styles.modalCloseBtn}
            >
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Status Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Status</Text>
              <View style={styles.filterOptions}>
                {[
                  { key: "all", label: "All Status", icon: "apps", color: "#6B7280" },
                  { key: "active", label: "Active", icon: "checkmark-circle", color: "#22C55E" },
                  { key: "pending", label: "Pending", icon: "time", color: "#F59E0B" },
                  { key: "inactive", label: "Inactive", icon: "pause-circle", color: "#EF4444" },
                ].map((status) => (
                  <TouchableOpacity
                    key={status.key}
                    style={[styles.filterOption, tempFilters.status === status.key && styles.selectedFilterOption]}
                    onPress={() => setTempFilters({ ...tempFilters, status: status.key })}
                  >
                    <Ionicons
                      name={status.icon}
                      size={18}
                      color={tempFilters.status === status.key ? "#FFFFFF" : status.color}
                    />
                    <Text
                      style={[
                        styles.filterOptionText,
                        tempFilters.status === status.key && styles.selectedFilterOptionText,
                      ]}
                    >
                      {status.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Privacy Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Privacy</Text>
              <View style={styles.filterOptions}>
                {[
                  { key: "all", label: "All Types", icon: "apps", color: "#6B7280" },
                  { key: "public", label: "Public", icon: "globe", color: "#3B82F6" },
                  { key: "private", label: "Private", icon: "lock-closed", color: "#A855F7" },
                ].map((privacy) => (
                  <TouchableOpacity
                    key={privacy.key}
                    style={[styles.filterOption, tempFilters.privacy === privacy.key && styles.selectedFilterOption]}
                    onPress={() => setTempFilters({ ...tempFilters, privacy: privacy.key })}
                  >
                    <Ionicons
                      name={privacy.icon}
                      size={18}
                      color={tempFilters.privacy === privacy.key ? "#FFFFFF" : privacy.color}
                    />
                    <Text
                      style={[
                        styles.filterOptionText,
                        tempFilters.privacy === privacy.key && styles.selectedFilterOptionText,
                      ]}
                    >
                      {privacy.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Sort By */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Sort By</Text>
              <View style={styles.filterOptions}>
                {[
                  { key: "newest", label: "Newest First", icon: "time", color: "#3B82F6" },
                  { key: "oldest", label: "Oldest First", icon: "time-outline", color: "#6B7280" },
                  { key: "name", label: "Name A-Z", icon: "text", color: "#8B5CF6" },
                  { key: "members", label: "Most Members", icon: "people", color: "#22C55E" },
                ].map((sort) => (
                  <TouchableOpacity
                    key={sort.key}
                    style={[styles.filterOption, tempFilters.sortBy === sort.key && styles.selectedFilterOption]}
                    onPress={() => setTempFilters({ ...tempFilters, sortBy: sort.key })}
                  >
                    <Ionicons
                      name={sort.icon}
                      size={18}
                      color={tempFilters.sortBy === sort.key ? "#FFFFFF" : sort.color}
                    />
                    <Text
                      style={[
                        styles.filterOptionText,
                        tempFilters.sortBy === sort.key && styles.selectedFilterOptionText,
                      ]}
                    >
                      {sort.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.resetButton} onPress={resetTempFilters}>
              <Ionicons name="refresh" size={16} color="#64748B" />
              <Text style={styles.resetButtonText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyButton} onPress={applyTempFilters}>
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  )

  if (loading) {
    return (
      <LinearGradient colors={["#4F46E5","#6366F1","#818CF8"]} style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>Loading your groups...</Text>
        </View>
      </LinearGradient>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient colors={["#4F46E5","#6366F1","#818CF8"]} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>My Groups</Text>
            <Text style={styles.headerSubtitle}>
              {filteredGroups.length > 0 ? `${filteredGroups.length} groups found` : "Manage your communities"}
            </Text>
          </View>

          <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilterModal(true)}>
            <Ionicons name="options-outline" size={24} color="#FFFFFF" />
            {(searchTerm || filters.status !== "all" || filters.privacy !== "all" || filters.sortBy !== "newest") && (
              <View style={styles.filterBadge} />
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Search Bar */}
      <Animated.View
        style={[
          styles.searchSection,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#64748B" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search your groups..."
            value={searchTerm}
            onChangeText={handleSearch}
            placeholderTextColor="#94A3B8"
          />
          {searchTerm ? (
            <TouchableOpacity onPress={() => handleSearch("")} style={styles.clearSearch}>
              <Ionicons name="close-circle" size={20} color="#94A3B8" />
            </TouchableOpacity>
          ) : null}
        </View>
      </Animated.View>

      {/* Content */}
      <FlatList
        data={filteredGroups}
        keyExtractor={(item) => item.groupId?.toString() || Math.random().toString()}
        renderItem={renderGroupCard}
        ListHeaderComponent={renderCreateGroupHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true)
              fetchGroups()
            }}
            colors={["#3B82F6"]}
            tintColor="#3B82F6"
          />
        }
        showsVerticalScrollIndicator={false}
      />

      {renderFilterModal()}
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
    paddingBottom: 15,
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
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  filterBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#F59E0B",
  },
  searchSection: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 48,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#1E293B",
  },
  clearSearch: {
    padding: 5,
  },
  createGroupSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  createGroupCard: {
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  createGroupContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  createGroupLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  createGroupIcon: {
    marginRight: 15,
  },
  createGroupText: {
    flex: 1,
  },
  createGroupTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  createGroupSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
  },
  createGroupButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
  },
  createGroupButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4F46E5",
  },
  listContainer: {
    paddingBottom: 20,
  },
  groupCard: {
    marginHorizontal: 20,
    marginBottom: 15,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardContainer: {
    padding: 20,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatarContainer: {
    position: "relative",
    marginRight: 15,
  },
  groupAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#F1F5F9",
  },
  privateBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#A855F7",
    justifyContent: "center",
    alignItems: "center",
  },
  groupDetails: {
    flex: 1,
  },
  groupName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: "column",
    gap: 4,
  },
  memberStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  memberCount: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
  },
  dateStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  dateText: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "400",
  },
  headerRight: {
    marginLeft: 15,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  descriptionSection: {
    marginBottom: 15,
  },
  description: {
    fontSize: 14,
    color: "#64748B",
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  footerLeft: {
    flex: 1,
  },
  privacyBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 5,
    alignSelf: "flex-start",
  },
  privacyText: {
    fontSize: 12,
    color: "#3B82F6",
    fontWeight: "600",
  },
  footerRight: {
    flexDirection: "row",
    gap: 10,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  actionButtonText: {
    fontSize: 12,
    color: "#3B82F6",
    fontWeight: "600",
  },
  deleteButton: {
    backgroundColor: "#FEE2E2",
  },
  deleteButtonText: {
    color: "#EF4444",
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
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 25,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 10,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 30,
  },
  emptyActionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#22C55E",
    paddingHorizontal: 25,
    paddingVertical: 15,
    borderRadius: 25,
    gap: 10,
  },
  emptyActionText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  filterModalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    maxHeight: "80%",
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#CBD5E1",
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 10,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  filterSection: {
    marginVertical: 15,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 12,
  },
  filterOptions: {
    gap: 8,
  },
  filterOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 12,
  },
  selectedFilterOption: {
    backgroundColor: "#3B82F6",
    borderColor: "#3B82F6",
  },
  filterOptionText: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
    flex: 1,
  },
  selectedFilterOptionText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  modalActions: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 12,
  },
  resetButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
    paddingVertical: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 8,
  },
  resetButtonText: {
    fontSize: 16,
    color: "#64748B",
    fontWeight: "600",
  },
  applyButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#3B82F6",
    paddingVertical: 15,
    borderRadius: 12,
    gap: 8,
  },
  applyButtonText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
  },
})

export default MyGroupsScreen
