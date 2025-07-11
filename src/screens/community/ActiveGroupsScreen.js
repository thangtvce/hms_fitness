import React from "react"
import { useState,useEffect,useRef,useContext } from "react"
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  Platform,
  Dimensions,
  Image,
  RefreshControl,
} from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { Ionicons,MaterialCommunityIcons } from "@expo/vector-icons"
import DateTimePicker from "@react-native-community/datetimepicker"
import RenderHtml from "react-native-render-html"
import { AuthContext } from "context/AuthContext"
import { getAllActiveGroups,joinGroup,deleteGroup,getMyGroupJoined } from "services/apiCommunityService"
import DynamicStatusBar from "screens/statusBar/DynamicStatusBar"
import { useNavigation,useFocusEffect } from "@react-navigation/native"
import { SafeAreaView } from "react-native-safe-area-context"
import { StatusBar } from "expo-status-bar"
import { ScrollView } from "react-native-gesture-handler"
import { showErrorFetchAPI,showSuccessMessage } from "utils/toastUtil"

const { width } = Dimensions.get("window")

const ActiveGroupsScreenModern = () => {
  const navigation = useNavigation()
  const { user } = useContext(AuthContext)
  const searchTimeout = useRef(null);
  const [groups,setGroups] = useState([])
  const [loading,setLoading] = useState(true)
  const [refreshing,setRefreshing] = useState(false)
  const [showFilterModal,setShowFilterModal] = useState(false)
  const [pageNumber,setPageNumber] = useState(1)
  const [pageSize,setPageSize] = useState(10);
  const [totalPages,setTotalPages] = useState(1)
  const [totalCount,setTotalCount] = useState(0)
  const [hasMore,setHasMore] = useState(true)
  const [searchTerm,setSearchTerm] = useState("")
  const [joiningGroups,setJoiningGroups] = useState(new Set())
  const [debouncedSearchTerm,setDebouncedSearchTerm] = useState("");
  const [filters,setFilters] = useState({
    startDate: null,
    endDate: null,
    status: "public",
    validPageSize: 10,
  })
  const [tempFilters,setTempFilters] = useState(filters)
  const [showStartDatePicker,setShowStartDatePicker] = useState(false)
  const [showEndDatePicker,setShowEndDatePicker] = useState(false)
  const [showCustomStartDatePicker,setShowCustomStartDatePicker] = useState(false)
  const [showCustomEndDatePicker,setShowCustomEndDatePicker] = useState(false)
  const [activeTab,setActiveTab] = useState('all');

  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(30)).current
  const scaleAnim = useRef(new Animated.Value(0.95)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,{
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim,{
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim,{
        toValue: 1,
        tension: 120,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start()
  },[])

  const fetchGroups = async (page = 1,refresh = false) => {
    try {
      if (refresh) {
        setRefreshing(true)
      } else if (page === 1) {
        setLoading(true)
      }

      const formatDate = (date) => {
        if (!date) return undefined
        return `${(date.getMonth() + 1).toString().padStart(2,"0")}-${date
          .getDate()
          .toString()
          .padStart(2,"0")}-${date.getFullYear()}`
      }

      const queryParams = {
        PageNumber: page,
        PageSize: pageSize,
        SearchTerm: searchTerm || undefined,
        StartDate: formatDate(filters.startDate),
        EndDate: formatDate(filters.endDate),
        Status: filters.status || undefined,
        ValidPageSize: filters.validPageSize,
      }
      let response = null;
      if (activeTab == "all") {
        response = await getAllActiveGroups(queryParams);
      } else {
        response = await getMyGroupJoined(0,queryParams);
      }

      const dataGroup = response.data;
      const newGroups = dataGroup.groups || [];
      const validGroups = newGroups.filter(g => g.groupId);

      if (page === 1 || refresh) {
        const uniqueGroups = Array.from(
          new Map(validGroups.map(g => [g.groupId,g])).values()
        );
        setGroups(uniqueGroups);
      } else {
        setGroups(prev => {
          const combined = [...prev,...validGroups];
          const uniqueGroups = Array.from(
            new Map(combined.map(g => [g.groupId,g])).values()
          );

          return uniqueGroups;
        });
      }

      setTotalCount(dataGroup.totalCount)
      setHasMore((page * pageSize) < dataGroup.totalCount)
      setTotalPages(dataGroup?.totalPages)
    } catch (error) {
      showErrorFetchAPI(error);
      setGroups([])
      setTotalPages(1)
      setTotalCount(0)
      setHasMore(false)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useFocusEffect(
    React.useCallback(() => {
      fetchGroups(pageNumber)
    },[pageNumber,pageSize,debouncedSearchTerm,filters,activeTab]),
  )

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setGroups([]);
    setPageNumber(1);
  };

  const loadMoreGroups = () => {
    if (!loading && hasMore) {
      goToPage(pageNumber + 1)
    }
  }

  const onRefresh = () => {
    setPageNumber(1)
    fetchGroups(1,true)
  }

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    },500);

    return () => {
      clearTimeout(handler);
    };
  },[searchTerm]);

  useEffect(() => {
    if (debouncedSearchTerm.trim() === "") {
      fetchGroups({ page: 1 });
      return;
    }

    setPageNumber(1);
    fetchGroups({ keyword: debouncedSearchTerm,page: 1 });
  },[debouncedSearchTerm]);


  const handleSearch = (text) => {
    setSearchTerm(text);
  };

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages && !loading) {
      setPageNumber(page)
    }
  }

  const applyTempFilters = () => {
    setFilters(tempFilters)
    setPageNumber(1)
    setShowFilterModal(false)
    fetchGroups(1)
  }

  const resetTempFilters = () => {
    const resetFilters = {
      startDate: null,
      endDate: null,
      status: "public",
      validPageSize: 10,
    }
    setTempFilters(resetFilters)
    setFilters(resetFilters)
    setPageNumber(1)
  }

  const formatDisplayDate = (date) => {
    if (!date) return "Select Date"
    return date.toLocaleDateString("en-US",{
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const handleJoin = async (groupId,isJoin,isPrivate,isRequested) => {
    if (isJoin) {
      return
    }

    if (isRequested) {
      return
    }

    setJoiningGroups((prev) => new Set([...prev,groupId]))

    try {
      await joinGroup(groupId,isPrivate)
      setGroups((prevGroups) =>
        prevGroups.map((g) => {
          if (g.groupId === groupId) {
            return {
              ...g,
              isJoin: !isPrivate,
              isRequested: isPrivate ? true : false,
              memberCount: isPrivate ? g.memberCount : g.memberCount + 1,
            }
          }
          return g
        }),
      )
    } catch (err) {
      showErrorFetchAPI(err);
    } finally {
      setJoiningGroups((prev) => {
        const newSet = new Set(prev)
        newSet.delete(groupId)
        return newSet
      })
    }
  }

  const handleDeleteGroup = async (groupId) => {
    Alert.alert("Confirm Delete","Are you sure you want to delete this group? This action cannot be undone.",[
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteGroup(groupId)
            setGroups((prevGroups) => prevGroups.filter((g) => g.groupId !== groupId))
            showSuccessMessage("Group deleted successfully.")
          } catch (err) {
            showErrorFetchAPI(err)
          }
        },
      },
    ])
  }

  const getStatusInfo = (status) => {
    switch (status?.toLowerCase()) {
      case "active":
        return { color: "#22C55E",bgColor: "#DCFCE7",icon: "checkmark-circle" }
      case "pending":
        return { color: "#F59E0B",bgColor: "#FEF3C7",icon: "time" }
      case "private":
        return { color: "#A855F7",bgColor: "#F3E8FF",icon: "lock-closed" }
      case "public":
        return { color: "#0056D2",bgColor: "#DBEAFE",icon: "globe" }
      default:
        return { color: "#6B7280",bgColor: "#F1F5F9",icon: "help-circle" }
    }
  }

  const formatMemberCount = (count) => {
    if (!count || isNaN(count)) return "0"
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`
    return count.toString()
  }


  const getJoinButtonStyle = (item) => {
    if (item.isJoin) {
      return {
        backgroundColor: "#22C55E",
      }
    }
    if (item.isRequested) {
      return {
        backgroundColor: "#F59E0B",
      }
    }
    return {
      backgroundColor: "#0056D2",
    }
  }


  const getJoinButtonText = (item) => {
    if (item.isJoin) return "Joined"
    if (item.isRequested) return "Pending"
    return "Join"
  }

  const getJoinButtonIcon = (item) => {
    if (item.isJoin) return "checkmark"
    if (item.isRequested) return "time"
    return "add"
  }

  const renderGroup = ({ item,index }) => {
    const statusInfo = getStatusInfo(item.isPrivate ? "private" : "public")
    const isMine = user?.userId === item.createdBy

    return (
      <Animated.View
        style={[
          styles.groupCard,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim },{ scale: scaleAnim }],
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => {
            navigation.navigate("GroupDetails",{ groupId: item.groupId })
          }}
        >
          <View style={styles.cardContainer}>
            {/* Header Section */}
            <View style={styles.cardHeader}>
              <View style={styles.headerLeft}>
                <View style={styles.avatarContainer}>
                  <Image
                    source={{ uri: item.thumbnail || "https://via.placeholder.com/50" }}
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
                    {item.groupName || "Health Community"}
                  </Text>
                  <View style={styles.statsRow}>
                    <View style={styles.memberStat}>
                      <Ionicons name="people" size={14} color="#22C55E" />
                      <Text style={styles.memberCount}>
                        {formatMemberCount(item.memberCount)} members
                      </Text>
                    </View>
                    <View style={styles.statusIndicator}>
                      <View style={[styles.statusDot,{ backgroundColor: statusInfo.color }]} />
                      <Text style={[styles.statusText,{ color: statusInfo.color }]}>
                        {item.isPrivate ? "Private" : "Public"}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.headerRight}>
                {isMine ? (
                  <View style={styles.ownerSection}>
                    <View style={styles.ownerBadge}>
                      <Ionicons name="home" size={12} color="#FFFFFF" />
                      <Text style={styles.ownerBadgeText}>Owner</Text>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.joinBtn,getJoinButtonStyle(item)]}
                    onPress={() =>
                      handleJoin(item.groupId,item.isJoin,item.isPrivate,item.isRequested)
                    }
                    disabled={joiningGroups.has(item.groupId)}
                  >
                    {joiningGroups.has(item.groupId) ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name={getJoinButtonIcon(item)} size={16} color="#FFFFFF" />
                        <Text style={styles.joinBtnText}>{getJoinButtonText(item)}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Description */}
            <View style={styles.descriptionSection}>
              <RenderHtml
                contentWidth={width - 40}
                source={{
                  html:
                    item.description ||
                    "<p>Join our health community to connect with like-minded individuals and share your wellness journey.</p>",
                }}
                tagsStyles={{
                  p: {
                    fontSize: 14,
                    color: "#64748B",
                    margin: 0,
                    lineHeight: 20,
                    fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
                  },
                }}
              />
            </View>

            {/* Footer */}
            <View style={styles.cardFooter}>
              <View style={styles.categoryBadge}>
                <Ionicons name="fitness" size={12} color="#fff" />
                <Text style={styles.categoryText}>Health & Wellness</Text>
              </View>

              {isMine && (
                <View style={styles.ownerActions}>
                  <TouchableOpacity
                    style={styles.editBtn}
                    onPress={() =>
                      navigation.navigate("EditGroupScreen",{ groupId: item.groupId })
                    }
                  >
                    <Ionicons name="pencil" size={16} color="#0056D2" />
                    <Text style={styles.editBtnText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDeleteGroup(item.groupId)}
                  >
                    <Ionicons name="trash" size={16} color="#EF4444" />
                    <Text style={styles.deleteBtnText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              )}
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
        colors={["#003C9E","#0056D2","#4A90E2"]}
        style={styles.createGroupCard}
        start={{ x: 0,y: 0 }}
        end={{ x: 1,y: 1 }}
      >
        <View style={styles.createGroupContent}>
          <View style={styles.createGroupLeft}>
            <View style={styles.createGroupIcon}>
              <Ionicons name="add-circle" size={32} color="#FFFFFF" />
            </View>
            <View style={styles.createGroupText}>
              <Text style={styles.createGroupTitle}>Start Your Community</Text>
              <Text style={styles.createGroupSubtitle}>Create a health group</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.createGroupButton}
            onPress={() => navigation.navigate("CreateGroupScreen")}
            activeOpacity={0.8}
          >
            <Text style={styles.createGroupButtonText}>Create</Text>
            <Ionicons name="arrow-forward" size={16} color="#0056d2" />
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
      <Text style={styles.emptyTitle}>No Communities Found</Text>
      <Text style={styles.emptyText}>
        {searchTerm || filters.status !== "active" || filters.startDate || filters.endDate
          ? "No communities match your current filters. Try adjusting your search criteria."
          : "Be the first to create a health community and start connecting with others!"}
      </Text>
      <TouchableOpacity
        style={styles.emptyActionButton}
        onPress={() => {
          if (searchTerm || filters.status !== "active" || filters.startDate || filters.endDate) {
            resetTempFilters()
          } else {
            navigation.navigate("CreateGroupScreen")
          }
        }}
      >
        <Ionicons
          name={
            searchTerm || filters.status !== "active" || filters.startDate || filters.endDate ? "refresh" : "add-circle"
          }
          size={20}
          color="#FFFFFF"
        />
        <Text style={styles.emptyActionText}>
          {searchTerm || filters.status !== "active" || filters.startDate || filters.endDate
            ? "Clear Filters"
            : "Create Community"}
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
        <Animated.View style={[styles.filterModalContent,{ transform: [{ scale: scaleAnim }] }]}>
          <View style={styles.modalHandle} />

          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter Communities</Text>
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

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false} >
            {/* Date Range Section */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Date Range</Text>
              <View style={styles.dateRangeContainer}>
                <TouchableOpacity style={styles.dateButton} onPress={() => setShowCustomStartDatePicker(true)}>
                  <Ionicons name="calendar-outline" size={16} color="#3B82F6" />
                  <Text style={styles.dateButtonText}>{formatDisplayDate(tempFilters.startDate)}</Text>
                </TouchableOpacity>
                <Text style={styles.dateRangeSeparator}>to</Text>
                <TouchableOpacity style={styles.dateButton} onPress={() => setShowCustomEndDatePicker(true)}>
                  <Ionicons name="calendar-outline" size={16} color="#3B82F6" />
                  <Text style={styles.dateButtonText}>{formatDisplayDate(tempFilters.endDate)}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Status Section */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Group Status</Text>
              <View style={styles.statusOptions}>
                {[
                  { key: "private",label: "Private",icon: "lock-closed",color: "#A855F7" },
                  { key: "public",label: "Public",icon: "globe",color: "#3B82F6" },
                ].map((status) => (
                  <TouchableOpacity
                    key={status.key}
                    style={[styles.statusOption,tempFilters.status === status.key && styles.selectedStatusOption]}
                    onPress={() => setTempFilters({ ...tempFilters,status: status.key })}
                  >
                    <Ionicons
                      name={status.icon}
                      size={18}
                      color={tempFilters.status === status.key ? "#FFFFFF" : status.color}
                    />
                    <Text
                      style={[
                        styles.statusOptionText,
                        tempFilters.status === status.key && styles.selectedStatusOptionText,
                      ]}
                    >
                      {status.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Page Size Section */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Items per Page</Text>
              <View style={styles.pageSizeOptions}>
                {[5,10,20,50].map((size) => (
                  <TouchableOpacity
                    key={size}
                    style={[styles.pageSizeOption,tempFilters.validPageSize === size && styles.selectedPageSizeOption]}
                    onPress={() => {
                      setTempFilters({ ...tempFilters,validPageSize: size })
                      setPageSize(size);
                    }}
                  >
                    <Text
                      style={[
                        styles.pageSizeOptionText,
                        tempFilters.validPageSize === size && styles.selectedPageSizeOptionText,
                      ]}
                    >
                      {size}
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

      {/* Date Picker Modals */}
      {showCustomStartDatePicker && (
        <Modal visible={showCustomStartDatePicker} transparent={true} animationType="fade">
          <View style={styles.datePickerOverlay}>
            <View style={styles.datePickerContainer}>
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
                onChange={(event,selectedDate) => {
                  if (selectedDate) {
                    setTempFilters({ ...tempFilters,startDate: selectedDate })
                  }
                }}
              />
              <TouchableOpacity style={styles.datePickerConfirm} onPress={() => setShowCustomStartDatePicker(false)}>
                <Text style={styles.datePickerConfirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {showCustomEndDatePicker && (
        <Modal visible={showCustomEndDatePicker} transparent={true} animationType="fade">
          <View style={styles.datePickerOverlay}>
            <View style={styles.datePickerContainer}>
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
                onChange={(event,selectedDate) => {
                  if (selectedDate) {
                    setTempFilters({ ...tempFilters,endDate: selectedDate })
                  }
                }}
              />
              <TouchableOpacity style={styles.datePickerConfirm} onPress={() => setShowCustomEndDatePicker(false)}>
                <Text style={styles.datePickerConfirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </Modal>
  )

  return (
    <SafeAreaView style={styles.container}>
      <DynamicStatusBar backgroundColor="#3B82F6" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#0056d2" />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Community</Text>
          </View>
          <View style={{ flexDirection: 'row',alignItems: 'center' }}>
            <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilterModal(true)}>
              <Ionicons name="options-outline" size={24} color="#0056d2" />
              {(searchTerm || filters.status !== "active" || filters.startDate || filters.endDate) && (
                <View style={styles.filterBadge} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton,{ marginLeft: 8,backgroundColor: '#0056d2' }]}
              onPress={() => navigation.navigate('MyGroupsScreen')}
              activeOpacity={0.8}
            >
              <Ionicons name="people-outline" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem,activeTab === 'all' && styles.tabItemActive]}
          onPress={() => handleTabChange('all')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText,activeTab === 'all' && styles.tabTextActive]}>All Groups</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem,activeTab === 'joined' && styles.tabItemActive]}
          onPress={() => handleTabChange('joined')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText,activeTab === 'joined' && styles.tabTextActive]}>My Groups</Text>
        </TouchableOpacity>
      </View>

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
            placeholder="Search health communities..."
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
      {loading && pageNumber === 1 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading communities...</Text>
        </View>
      ) : (
        <FlatList
          data={groups}
          onEndReached={loadMoreGroups}
          ListFooterComponent={
            loading && pageNumber > 1 ? (
              <View style={{ padding: 20,alignItems: 'center' }}>
                <ActivityIndicator size="small" color="#3B82F6" />
              </View>
            ) : null
          }
          onEndReachedThreshold={0.2}
          keyExtractor={(item,index) => item.groupId ? item.groupId.toString() : `group-${index}`}
          renderItem={renderGroup}
          ListHeaderComponent={renderCreateGroupHeader}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#3B82F6"]} tintColor="#3B82F6" />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

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
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight + 10 : 10,
    paddingBottom: 15,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
  },
  filterButton: {
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
    fontSize: 22,
    fontWeight: "700",
    color: "#1E293B",
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
    paddingBottom: 20,
  },
  createGroupCard: {
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 4 },
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
    color: "#0056d2",
  },
  listContainer: {
    paddingBottom: 50,
    marginBottom: 30
  },
  groupCard: {
    marginHorizontal: 20,
    marginBottom: 15,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 2 },
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
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#F1F5F9",
  },
  privateBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#0056d2",
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
    marginBottom: 6,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
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
  statusIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "500",
  },
  headerRight: {
    marginLeft: 15,
  },
  ownerSection: {
    alignItems: "center",
  },
  ownerBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#8B5CF6",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  ownerBadgeText: {
    fontSize: 12,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  joinBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  joinButton: {
    backgroundColor: "#22C55E",
  },
  joinedButton: {
    backgroundColor: "#059669",
  },
  pendingButton: {
    backgroundColor: "#F59E0B",
  },
  joinBtnText: {
    fontSize: 12,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  descriptionSection: {
    marginBottom: 15,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0056D2",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 5,
  },
  categoryText: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "600",
  },
  ownerActions: {
    flexDirection: "row",
    gap: 10,
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  editBtnText: {
    fontSize: 12,
    color: "#3B82F6",
    fontWeight: "600",
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  deleteBtnText: {
    fontSize: 12,
    color: "#EF4444",
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
    color: "#3B82F6",
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
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    height: "60%",
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
  dateRangeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dateButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 8,
  },
  dateButtonText: {
    fontSize: 14,
    color: "#1E293B",
    flex: 1,
  },
  dateRangeSeparator: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
  },
  statusOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statusOption: {
    flex: 1,
    minWidth: "45%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 10,
  },
  selectedStatusOption: {
    backgroundColor: "#3B82F6",
    borderColor: "#3B82F6",
  },
  statusOptionText: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
  },
  selectedStatusOptionText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  pageSizeOptions: {
    flexDirection: "row",
    gap: 10,
  },
  pageSizeOption: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 15,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    minHeight: 50,
    justifyContent: "center",
  },
  selectedPageSizeOption: {
    backgroundColor: "#3B82F6",
    borderColor: "#3B82F6",
  },
  pageSizeOptionText: {
    fontSize: 16,
    color: "#1E293B",
    fontWeight: "700",
  },
  selectedPageSizeOptionText: {
    color: "#FFFFFF",
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
  datePickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  datePickerContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    width: "100%",
    maxWidth: 350,
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
  datePickerConfirm: {
    backgroundColor: "#3B82F6",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 20,
  },
  datePickerConfirmText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginBottom: 2,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: '#0056d2',
    backgroundColor: '#F1F5F9',
  },
  tabText: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#0056d2',
    fontWeight: '700',
  },
})

export default ActiveGroupsScreenModern