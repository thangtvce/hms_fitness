import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const { width, height } = Dimensions.get("window");

export default function TermsOfServiceScreen({ navigation }) {
  return (
    <View style={styles.overlayContainer}>
      <View style={styles.modalContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Terms of Service</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton} accessibilityLabel="Close">
            <Ionicons name="close" size={28} color="#0056d2" />
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>Welcome to HMS Fitness!</Text>
          <Text style={styles.text}>
            Please read these Terms of Service ("Terms", "Terms of Service") carefully before using the HMS Fitness app (the "Service") operated by us.
          </Text>
          <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
          <Text style={styles.text}>
            By accessing or using our Service, you agree to be bound by these Terms. If you disagree with any part of the terms, you may not access the Service.
          </Text>
          <Text style={styles.sectionTitle}>2. Use of the Service</Text>
          <Text style={styles.text}>
            You agree to use the Service only for lawful purposes and in accordance with these Terms.
          </Text>
          <Text style={styles.sectionTitle}>3. User Accounts</Text>
          <Text style={styles.text}>
            When you create an account, you must provide accurate and complete information. You are responsible for safeguarding your password.
          </Text>
          <Text style={styles.sectionTitle}>4. Intellectual Property</Text>
          <Text style={styles.text}>
            The Service and its original content, features, and functionality are and will remain the exclusive property of HMS Fitness and its licensors.
          </Text>
          <Text style={styles.sectionTitle}>5. Termination</Text>
          <Text style={styles.text}>
            We may terminate or suspend access to our Service immediately, without prior notice or liability, for any reason.
          </Text>
          <Text style={styles.sectionTitle}>6. Changes</Text>
          <Text style={styles.text}>
            We reserve the right to modify or replace these Terms at any time. Changes will be effective immediately upon posting.
          </Text>
          <Text style={styles.sectionTitle}>7. Contact Us</Text>
          <Text style={styles.text}>
            If you have any questions about these Terms, please contact us at support@hmsfitness.com.
          </Text>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlayContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.2)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: height * 0.7,
    maxHeight: height * 0.92,
    paddingBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: "#fff",
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    marginLeft: 8,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: "#0056d2",
    textAlign: "left",
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  sectionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: "#1E293B",
    marginTop: 20,
    marginBottom: 8,
  },
  text: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "#334155",
    marginBottom: 12,
    lineHeight: 20,
  },
});
