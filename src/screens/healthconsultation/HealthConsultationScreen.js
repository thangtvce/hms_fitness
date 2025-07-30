import { useState,useEffect,useRef } from "react"
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  ActivityIndicator,
  Animated,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { Ionicons } from "@expo/vector-icons"
import { showErrorFetchAPI,showErrorMessage } from "utils/toastUtil"
import Header from "components/Header"
import apiPersonalRecommendationService from "services/apiPersonalRecommendationService"
import { useNavigation } from "@react-navigation/native"

const { width } = Dimensions.get("window")

const HealthConsultationScreen = () => {
  const navigation = useNavigation()
  const flatListRef = useRef(null)
  const [messages,setMessages] = useState([])
  const [input,setInput] = useState("")
  const [error,setError] = useState("")
  const [isSessionValid,setIsSessionValid] = useState(false)
  const [isLoading,setIsLoading] = useState(false)
  const [sessionId,setSessionId] = useState("")
  const [showDeleteConfirm,setShowDeleteConfirm] = useState(false)
  const [showSuccessNotification,setShowSuccessNotification] = useState(false)

  const dot1Opacity = useRef(new Animated.Value(0)).current
  const dot2Opacity = useRef(new Animated.Value(0)).current
  const dot3Opacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const initializeSession = async () => {
      setIsLoading(true)
      const storedSessionId = await AsyncStorage.getItem("trialSessionId")
      if (storedSessionId) {
        setSessionId(storedSessionId)
        validateSession(storedSessionId)
      } else {
        createNewSession()
      }
    }
    initializeSession()
  },[])

  useEffect(() => {
    if (isLoading && sessionId) {
      const animateDots = () => {
        Animated.sequence([
          Animated.timing(dot1Opacity,{ toValue: 1,duration: 300,useNativeDriver: true }),
          Animated.timing(dot2Opacity,{ toValue: 1,duration: 300,useNativeDriver: true }),
          Animated.timing(dot3Opacity,{ toValue: 1,duration: 300,useNativeDriver: true }),
          Animated.parallel([
            Animated.timing(dot1Opacity,{ toValue: 0,duration: 300,useNativeDriver: true }),
            Animated.timing(dot2Opacity,{ toValue: 0,duration: 300,useNativeDriver: true }),
            Animated.timing(dot3Opacity,{ toValue: 0,duration: 300,useNativeDriver: true }),
          ]),
        ]).start(() => animateDots())
      }
      animateDots()
    } else {
      dot1Opacity.setValue(0)
      dot2Opacity.setValue(0)
      dot3Opacity.setValue(0)
    }
  },[isLoading,sessionId])

  const createNewSession = async () => {
    try {
      const response = await apiPersonalRecommendationService.createRecommendation()
      const newSessionId = response.data.data.sessionId
      await AsyncStorage.setItem("trialSessionId",newSessionId)
      setSessionId(newSessionId)
      setIsSessionValid(true)
      setMessages([])
      await AsyncStorage.setItem("healthConsultations",JSON.stringify([]));
      await fetchChatHistory();
    } catch (err) {
      showErrorFetchAPI(err)
      setIsSessionValid(false)
    } finally {
      setIsLoading(false)
    }
  }

  const validateSession = async (sessionIdToValidate) => {
    if (!sessionIdToValidate) {
      await createNewSession()
      return
    }
    try {
      const storedSessionId = await AsyncStorage.getItem("trialSessionId")
      const response = await apiPersonalRecommendationService.validateSession(storedSessionId)
      if (response.data.status === "Success") {
        setIsSessionValid(true)
        await fetchChatHistory()
      } else {
        await AsyncStorage.removeItem("trialSessionId")
        createNewSession()
      }
    } catch (err) {
      showErrorFetchAPI(err)
      await AsyncStorage.removeItem("trialSessionId")
      createNewSession()
    } finally {
      setIsLoading(false)
    }
  }

  const fetchChatHistory = async () => {
    try {
      const storedSessionId = await AsyncStorage.getItem("trialSessionId")
      const response = await apiPersonalRecommendationService.getChatHistory(storedSessionId)
      if (response.data.status === "Success" && Array.isArray(response.data.data)) {
        const historyMessages = response.data.data.map((msg) => ({
          sessionId: msg.sessionId,
          role: msg.role,
          content: typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content),
          timestamp: msg.timestamp,
          messageId: msg.messageId || `msg-${Date.now() + Math.random()}`,
        }))
        setMessages(historyMessages)
        await AsyncStorage.setItem("healthConsultations",JSON.stringify(historyMessages))
      } else {
        setMessages([])
      }
    } catch (err) {
      showErrorFetchAPI(err)
      setMessages([])
      await AsyncStorage.removeItem("trialSessionId")
    }
  }

  const handleSend = async () => {
    if (!input.trim()) return
    if (!sessionId || !isSessionValid) {
      showErrorMessage("Session is invalid. Please try again.")
      return
    }

    const userMessage = {
      sessionId,
      role: "user",
      content: input,
      timestamp: new Date().toISOString(),
      messageId: `msg-${Date.now()}`,
    }

    setInput("")
    setMessages((prev) => [...prev,userMessage])
    const updatedMessagesAfterUserSend = [...messages,userMessage]
    await AsyncStorage.setItem("healthConsultations",JSON.stringify(updatedMessagesAfterUserSend))

    setIsLoading(true)
    try {
      const response = await apiPersonalRecommendationService.sendMessage(sessionId,userMessage.content)
      const assistantMessage = {
        sessionId,
        role: "assistant",
        content: response.data.data?.content?.message || "No response provided",
        timestamp: new Date().toISOString(),
        messageId: `msg-${Date.now() + 1}`,
      }
      setMessages((prev) => [...prev,assistantMessage])
      await AsyncStorage.setItem(
        "healthConsultations",
        JSON.stringify([...updatedMessagesAfterUserSend,assistantMessage]),
      )
    } catch (err) {
      showErrorFetchAPI(err)
      setMessages((prev) => prev.filter((msg) => msg.messageId !== userMessage.messageId))
      await AsyncStorage.setItem(
        "healthConsultations",
        JSON.stringify(messages.filter((msg) => msg.messageId !== userMessage.messageId)),
      )
    } finally {
      setIsLoading(false)
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }),100)
    }
  }

  const handleDeleteSession = async () => {
    setIsLoading(true)
    try {
      await apiPersonalRecommendationService.deleteSession(sessionId)
      await AsyncStorage.removeItem("trialSessionId")
      await AsyncStorage.removeItem("healthConsultations")
      setSessionId("")
      setIsSessionValid(false)
      setMessages([])
      setError("")
      setInput("")
      setShowSuccessNotification(true)
      setTimeout(() => setShowSuccessNotification(false),3000)
    } catch (err) {
      showErrorFetchAPI(err)
    } finally {
      setIsLoading(false)
      setShowDeleteConfirm(false)
    }
  }

  const parseBoldText = (text) => {
    const parts = text.split(/(\*\*[^\*]+\*\*)/g);

    return parts.map((part,index) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        const boldText = part.slice(2,-2);
        return (
          <Text key={index} style={{ fontWeight: 'bold' }}>
            {boldText}
          </Text>
        );
      } else {
        return <Text key={index}>{part}</Text>;
      }
    });
  };


  const renderMessage = ({ item }) => {

    let displayMessage = "";
    try {
      const parsedContent = JSON.parse(item.content);
      if (parsedContent?.type == "recommendations") {
        return;
      }
      if (parsedContent?.content?.message) {
        displayMessage = parsedContent.content.message;
      } else {
        displayMessage = item.content;
      }
    } catch (err) {
      displayMessage = item.content;
    }
    return (
      <View style={styles.messageContainer}>
        <View style={[
          styles.messageBubble,
          item.role === "user" ? styles.userMessage : styles.aiMessage
        ]}>
          <View style={[
            styles.messageHeader,
            item.role === "user" && styles.messageHeaderUser
          ]}>
            {item.role === "user" ? (
              <>
                <Text style={[styles.messageAuthor,{ paddingRight: 10 }]}>You</Text>
                <View style={[styles.avatar,styles.userAvatar,{ marginRight: 0 }]}>
                  <Ionicons name="person" size={16} color="#FFFFFF" />
                </View>
              </>
            ) : (
              <>
                <View style={[styles.avatar,styles.aiAvatar]}>
                  <Ionicons name="medical" size={16} color="#FFFFFF" />
                </View>
                <Text style={styles.messageAuthor}>HMS 3DO</Text>
              </>
            )}
          </View>
          <View style={styles.messageContent}>
            {item.role === "user" ? (
              <Text style={styles.messageText}>{displayMessage}</Text>
            ) : (
              <View style={styles.messageContent}>
                {item.role === "user" ? (
                  <Text style={styles.messageText}>{displayMessage}</Text>
                ) : (
                  <Text style={styles.messageText}>
                    {parseBoldText(displayMessage)}
                  </Text>
                )}
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="HMS Assistant"
        onBack={() => navigation.goBack()}
        backgroundColor={styles.headerBackground.backgroundColor}
        textColor={styles.headerText?.color}
        rightActions={[
          {
            icon: <Ionicons name="trash" size={20} color={styles.deleteIcon?.color} />,
            onPress: () => setShowDeleteConfirm(true),
          },
        ]}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.chatContainer}>
          {error && (
            <View style={styles.errorContainer}>
              <Ionicons name="warning" size={20} color={styles.errorText?.color} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
          {isLoading && !sessionId ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={styles.primaryAccent?.color} />
              <Text style={styles.loadingText}>Initializing session...</Text>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={(item) => item.messageId}
              contentContainerStyle={styles.chatList}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="chatbubbles-outline" size={64} color={styles.emptyIcon?.color} />
                  <Text style={styles.emptyTitle}>Start a conversation</Text>
                  <Text style={styles.emptyText}>Ask your first health question below</Text>
                </View>
              }
            />
          )}
          {isLoading && sessionId && (
            <View style={styles.typingIndicator}>
              <View style={styles.typingBubble}>
                <View style={styles.aiAvatar}>
                  <Ionicons name="medical" size={16} color="#FFFFFF" />
                </View>
                <View style={styles.typingDots}>
                  <Animated.View style={[styles.dot,{ opacity: dot1Opacity }]} />
                  <Animated.View style={[styles.dot,{ opacity: dot2Opacity }]} />
                  <Animated.View style={[styles.dot,{ opacity: dot3Opacity }]} />
                </View>
              </View>
            </View>
          )}
          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.textInput}
                value={input}
                onChangeText={setInput}
                placeholder="Ask a health question..."
                placeholderTextColor={styles.textSecondary?.color}
                multiline
                maxLength={500}
                editable={!isLoading}
              />
              <TouchableOpacity
                style={[styles.sendButton,(!input.trim() || isLoading) && styles.sendButtonDisabled]}
                onPress={handleSend}
                disabled={!input.trim() || isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="send" size={20} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
      {showDeleteConfirm && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Ionicons name="warning" size={24} color={styles.errorText?.color} />
              <Text style={styles.modalTitle}>Clear Chat Session</Text>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowDeleteConfirm(false)}>
                <Ionicons name="close" size={24} color={styles.textPrimary?.color} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalContent}>
              <Ionicons name="trash" size={32} color={styles.errorText?.color} />
              <Text style={styles.confirmationTitle}>Are you sure?</Text>
              <Text style={styles.confirmationMessage}>
                This will permanently delete your current chat session, including all messages and your health profile
                data.
              </Text>
              <Text style={styles.confirmationWarning}>This action cannot be undone.</Text>
            </View>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowDeleteConfirm(false)}>
                <Ionicons name="close" size={20} color={styles.textPrimary?.color} />
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmDeleteBtn} onPress={handleDeleteSession} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.confirmDeleteBtnText}>Clearing...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="trash" size={20} color="#FFFFFF" />
                    <Text style={styles.confirmDeleteBtnText}>Clear Session</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
      {showSuccessNotification && (
        <View style={styles.successNotification}>
          <Ionicons name="checkmark-circle" size={20} color={styles.successText?.color} />
          <Text style={styles.successNotificationText}>
            Session cleared successfully! You can start a new health journey.
          </Text>
        </View>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  primaryAccent: { color: "#06B6D4" },
  secondaryAccent: { color: "#10B981" },
  backgroundLight: { backgroundColor: "#F8FAFC" },
  cardBackground: { backgroundColor: "#FFFFFF" },
  textPrimary: { color: "#1F2937" },
  textSecondary: { color: "#6B7280" },
  borderLight: { borderColor: "#E5E7EB" },
  errorColor: { color: "#EF4444" },
  successColor: { color: "#10B981" },
  disabledColor: { backgroundColor: "#D1D5DB" },
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  headerBackground: {
    backgroundColor: "#FFFFFF",
  },
  headerText: {
    color: "#1F2937",
  },
  deleteIcon: {
    color: "#EF4444",
  },
  chatContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    marginTop: 70
  },
  chatList: {
    padding: 16,
    paddingBottom: 8,
  },
  messageContainer: {
    marginBottom: 12,
  },
  messageBubble: {
    borderRadius: 12,
    padding: 12,
    maxWidth: width * 0.8,
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  userMessage: {
    backgroundColor: "#E0F7FA",
    alignSelf: "flex-end",
    borderBottomRightRadius: 4,
  },
  aiMessage: {
    backgroundColor: "#FFFFFF",
    alignSelf: "flex-start",
    borderBottomLeftRadius: 4,
  },
  messageHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  messageHeaderUser: {
    justifyContent: "flex-end"
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  userAvatar: {
    backgroundColor: "#06B6D4",
  },
  aiAvatar: {
    backgroundColor: "#10B981",
  },
  messageAuthor: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4B5563",
  },
  messageContent: {
    marginTop: 4,
  },
  messageText: {
    fontSize: 15,
    color: "#1F2937",
    lineHeight: 22,
  },
  inputContainer: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 28,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: "#1F2937",
    maxHeight: 100,
    paddingVertical: 8,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#06B6D4",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },
  sendButtonDisabled: {
    backgroundColor: "#D1D5DB",
  },
  typingIndicator: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  typingBubble: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    alignSelf: "flex-start",
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  typingDots: {
    flexDirection: "row",
    marginLeft: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#D1D5DB",
    marginHorizontal: 3,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 64,
  },
  emptyIcon: {
    color: "#CBD5E1",
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1F2937",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    paddingHorizontal: 20,
  },
  errorContainer: {
    alignItems: "center",
    padding: 12,
    backgroundColor: "#FEF2F2",
    borderRadius: 8,
    margin: 16,
    flexDirection: "row",
  },
  errorText: {
    fontSize: 14,
    color: "#EF4444",
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "#4B5563",
    marginTop: 8,
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    width: width * 0.9,
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
    flex: 1,
    marginLeft: 8,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalContent: {
    alignItems: "center",
    marginBottom: 20,
  },
  confirmationTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginTop: 12,
  },
  confirmationMessage: {
    fontSize: 15,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 22,
  },
  confirmationWarning: {
    fontSize: 15,
    color: "#EF4444",
    marginTop: 8,
    fontWeight: "500",
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  cancelBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingVertical: 14,
    marginRight: 10,
  },
  cancelBtnText: {
    fontSize: 16,
    color: "#1F2937",
    marginLeft: 8,
    fontWeight: "500",
  },
  confirmDeleteBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EF4444",
    borderRadius: 10,
    paddingVertical: 14,
  },
  confirmDeleteBtnText: {
    fontSize: 16,
    color: "#FFFFFF",
    marginLeft: 8,
    fontWeight: "500",
  },
  successNotification: {
    position: "absolute",
    top: Platform.OS === "ios" ? 50 : 16,
    left: 16,
    right: 16,
    backgroundColor: "#ECFDF5",
    borderRadius: 10,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  successNotificationText: {
    fontSize: 14,
    color: "#10B981",
    marginLeft: 8,
    flexShrink: 1,
  },
})

export default HealthConsultationScreen