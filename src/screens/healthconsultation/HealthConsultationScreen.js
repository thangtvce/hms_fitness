import { useState, useEffect, useRef } from "react"
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useNavigation } from "@react-navigation/native"
import Header from "components/Header"
import AsyncStorage from "@react-native-async-storage/async-storage"
import axios from "axios"
import { GEMINI_API_KEY } from "@env"
import { SafeAreaView } from "react-native-safe-area-context"

const { width, height } = Dimensions.get("window")

const HealthConsultationScreen = () => {
  const navigation = useNavigation()
  const flatListRef = useRef(null)
  const [consultations, setConsultations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [query, setQuery] = useState("")
  const [sendingMessage, setSendingMessage] = useState(false)

  useEffect(() => {
    loadConsultations()
  }, [])

  const loadConsultations = async () => {
    setLoading(true)
    try {
      const storedConsultations = await AsyncStorage.getItem("healthConsultations")
      const consultations = storedConsultations ? JSON.parse(storedConsultations) : []
      setConsultations(Array.isArray(consultations) ? consultations : [])
      setError(null)
    } catch (err) {
      setError("Failed to load consultations")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const saveConsultations = async (newConsultations) => {
    try {
      await AsyncStorage.setItem("healthConsultations", JSON.stringify(newConsultations))
    } catch (err) {
      Alert.alert("Error", "Failed to save consultation")
    }
  }

  const onRefresh = () => {
    setRefreshing(true)
    loadConsultations()
  }

  const handleAskQuestion = async () => {
    if (!query.trim()) {
      Alert.alert("Error", "Please enter a health-related question")
      return
    }

    setSendingMessage(true)
    const userMessage = query
    setQuery("")

    // Immediately add user's message to consultations
    const userConsultation = {
      consultationId: Date.now().toString(),
      UserId: 15, // TODO: Replace with actual user ID from auth context
      ConsultationType: "General",
      ConsultationDetails: userMessage,
      AiResponse: "", // Placeholder until AI responds
      createdAt: new Date().toISOString(),
    }

    const updatedConsultations = [...consultations, userConsultation]
    setConsultations(updatedConsultations)
    await saveConsultations(updatedConsultations)

    // Scroll to bottom after new message
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true })
    }, 100)

    try {
      // Check if the query is asking about previous questions
      const isQueryAboutHistory = userMessage.toLowerCase().includes("what did i ask") ||
                                userMessage.toLowerCase().includes("previous questions") ||
                                userMessage.toLowerCase().includes("past queries")

      let aiResponse = ""
      if (isQueryAboutHistory) {
        // Generate a response listing previous questions
        if (consultations.length === 0) {
          aiResponse = "You haven't asked any questions yet. Feel free to ask a health-related question!"
        } else {
          const previousQuestions = consultations
            .map((c, index) => `${index + 1}. ${c.ConsultationDetails}`)
            .join("\n")
          aiResponse = `Here are your previous questions:\n${previousQuestions}\n\nPlease ask a new health-related question or specify a question number for more details.`
        }
      } else {
        // Construct conversation history for Gemini API
        const conversationHistory = consultations.map((c) => ({
          parts: [
            { text: `User: ${c.ConsultationDetails}` },
            { text: `Assistant: ${c.AiResponse}` },
          ],
        }))

        // Add the current user message
        conversationHistory.push({
          parts: [{ text: `User: ${userMessage}` }],
        })

        // Construct the Gemini API request payload
        const payload = {
          contents: [
            {
              parts: [
                {
                  text: `You are a health assistant. You have access to the following conversation history:\n${conversationHistory.map(c => c.parts.map(p => p.text).join("\n")).join("\n")}\n\nProvide a concise and accurate response to the user's latest health-related question: "${userMessage}". Include a disclaimer that this is not professional medical advice and users should consult a doctor for medical concerns.`,
                },
              ],
            },
          ],
        }

        // Call Gemini API
        const response = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
          payload,
          {
            headers: {
              "Content-Type": "application/json",
            },
          },
        )

        // Validate and parse Gemini API response
        aiResponse = response.data?.candidates?.[0]?.content?.parts?.[0]?.text
        if (!aiResponse) {
          throw new Error("No valid response received from Gemini API")
        }
      }

      // Update the consultation with AI response
      const updatedConsultationsWithAI = updatedConsultations.map((c) =>
        c.consultationId === userConsultation.consultationId
          ? { ...c, AiResponse: aiResponse }
          : c
      )

      setConsultations(updatedConsultationsWithAI)
      await saveConsultations(updatedConsultationsWithAI)

      // Scroll to bottom again after AI response
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true })
      }, 100)
    } catch (err) {
      let errorMessage = err.message || "Failed to process consultation"
      if (err.response) {
        if (err.response.status === 401) {
          errorMessage =
            "Error 401: Unauthorized access to Gemini API. Possible causes: invalid API key, expired key, or restricted access."
        } else if (err.response.status === 400) {
          errorMessage = "Error 400: Invalid request format. Please check the API request structure."
        } else if (err.response.status === 429) {
          errorMessage = "Error 429: Rate limit exceeded. Please try again later."
        }
      }
      Alert.alert("Error", errorMessage)

      // Update the consultation to indicate an error
      const updatedConsultationsWithError = updatedConsultations.map((c) =>
        c.consultationId === userConsultation.consultationId
          ? { ...c, AiResponse: "Error: Unable to get response" }
          : c
      )
      setConsultations(updatedConsultationsWithError)
      await saveConsultations(updatedConsultationsWithError)
    } finally {
      setSendingMessage(false)
    }
  }

  const renderChatMessage = ({ item }) => {
    return (
      <View style={styles.messageContainer}>
        {/* User Question */}
        <View style={[styles.messageBubble, styles.userMessage]}>
          <Text style={styles.userMessageText}>{item.ConsultationDetails || "N/A"}</Text>
          <Text style={styles.messageTime}>
            {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </Text>
        </View>

        {/* AI Response */}
        {item.AiResponse && (
          <View style={[styles.messageBubble, styles.aiMessage]}>
            <View style={styles.aiHeader}>
              <View style={styles.aiAvatar}>
                <Ionicons name="medical" size={16} color="#FFFFFF" />
              </View>
              <Text style={styles.aiName}>Health Assistant</Text>
            </View>
            <Text style={styles.aiMessageText}>{item.AiResponse}</Text>
            <View style={styles.messageActions}>
              <Text style={styles.messageTime}>
                {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </Text>
            </View>
          </View>
        )}
      </View>
    )
  }

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loadingText}>Loading consultations...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: '#fff' }]}> 
      <Header
        title="Health Assistant"
        onBack={() => navigation.goBack()}
        backgroundColor="#fff"
        textColor="#1E293B"
        rightActions={[]}
      />
      <View style={{ alignItems: 'center', marginTop: 8, marginBottom: 8 }}>
        <Text style={{ fontSize: 14, color: '#64748B', fontWeight: '500' }}>Ask me anything about health</Text>
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={{ flex: 1 }}>
          {/* Chat Messages */}
          <View style={styles.chatContainer}>
            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={loadConsultations}>
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            )}

            <FlatList
              ref={flatListRef}
              data={consultations}
              renderItem={renderChatMessage}
              keyExtractor={(item) => item.consultationId}
              contentContainerStyle={styles.chatList}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#4F46E5"]} />}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="chatbubbles-outline" size={64} color="#D1D5DB" />
                  <Text style={styles.emptyTitle}>Start a conversation</Text>
                  <Text style={styles.emptyText}>Ask your first health question below</Text>
                </View>
              }
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            />

            {sendingMessage && (
              <View style={styles.typingIndicator}>
                <View style={styles.typingBubble}>
                  <View style={styles.aiAvatar}>
                    <Ionicons name="medical" size={16} color="#FFFFFF" />
                  </View>
                  <View style={styles.typingDots}>
                    <View style={[styles.dot, styles.dot1]} />
                    <View style={[styles.dot, styles.dot2]} />
                    <View style={[styles.dot, styles.dot3]} />
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* Input Area */}
          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.textInput}
                value={query}
                onChangeText={setQuery}
                placeholder="Ask a health question..."
                multiline
                maxLength={500}
                editable={!sendingMessage}
              />
              <TouchableOpacity
                style={[styles.sendButton, (!query.trim() || sendingMessage) && styles.sendButtonDisabled]}
                onPress={handleAskQuestion}
                disabled={!query.trim() || sendingMessage}
              >
                {sendingMessage ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="send" size={20} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: {
    flex: 1,
  },
  // header styles removed (now handled by Header.js)
  chatContainer: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  chatList: {
    padding: 16,
    paddingBottom: 8,
  },
  messageContainer: {
    marginBottom: 16,
  },
  messageBubble: {
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
    maxWidth: width * 0.8,
  },
  userMessage: {
    backgroundColor: "#E6F0FA", // lighter than #0056d2
    alignSelf: "flex-end",
    borderBottomRightRadius: 4,
    borderWidth: 1,
    borderColor: "#0056d2",
  },
  userMessageText: {
    color: "#0056d2",
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "600",
  },
  aiMessage: {
    backgroundColor: "#FFFFFF",
    alignSelf: "flex-start",
    borderBottomLeftRadius: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  aiHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  aiAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#10B981",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  aiName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#10B981",
  },
  aiMessageText: {
    color: "#1F2937",
    fontSize: 16,
    lineHeight: 22,
  },
  messageTime: {
    fontSize: 12,
    color: "#64748B", // đổi màu thời gian sang xám xanh đậm
    marginTop: 4,
  },
  messageActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
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
    alignItems: "flex-end",
    backgroundColor: "#F3F4F6",
    borderRadius: 24,
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#4F46E5",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
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
    borderRadius: 16,
    padding: 12,
    alignSelf: "flex-start",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  typingDots: {
    flexDirection: "row",
    marginLeft: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#D1D5DB",
    marginHorizontal: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1F2937",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
  },
  errorContainer: {
    alignItems: "center",
    padding: 16,
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    margin: 16,
  },
  errorText: {
    fontSize: 14,
    color: "#EF4444",
    marginBottom: 8,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: "#4F46E5",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    backgroundColor: "#F9FAFB",
  },
  loadingText: {
    fontSize: 16,
    color: "#4F46E5",
    fontWeight: "500",
  },
})

export default HealthConsultationScreen