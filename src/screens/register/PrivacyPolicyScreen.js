import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const { width, height } = Dimensions.get("window");

export default function PrivacyPolicyScreen({ navigation }) {
  return (
    <View style={styles.overlayContainer}>
      <View style={styles.modalContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Privacy Policy</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton} accessibilityLabel="Close">
            <Ionicons name="close" size={28} color="#0056d2" />
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>Privacy Policy</Text>
          <Text style={styles.text}>
            This Privacy Policy describes how HMS Fitness ("we", "us", or "our") collects, uses, and protects your information when you use our app.
          </Text>
          <Text style={styles.sectionTitle}>1. Information We Collect</Text>
          <Text style={styles.text}>
            We may collect personal information such as your name, email address, phone number, gender, birth date, and health-related data you provide.
          </Text>
          <Text style={styles.sectionTitle}>2. How We Use Your Information</Text>
          <Text style={styles.text}>
            We use your information to provide and improve our services, personalize your experience, communicate with you, and ensure security.
          </Text>
          <Text style={styles.sectionTitle}>3. Data Sharing</Text>
          <Text style={styles.text}>
            We do not sell or rent your personal information. We may share data with trusted partners who assist us in operating our app, as required by law, or to protect our rights.
          </Text>
          <Text style={styles.sectionTitle}>4. Data Security</Text>
          <Text style={styles.text}>
            We implement reasonable security measures to protect your information. However, no method of transmission over the Internet is 100% secure.
          </Text>
          <Text style={styles.sectionTitle}>5. Your Choices</Text>
          <Text style={styles.text}>
            You may update or delete your information at any time by contacting us. You may also opt out of certain communications.
          </Text>
          <Text style={styles.sectionTitle}>6. Changes to This Policy</Text>
          <Text style={styles.text}>
            We may update this Privacy Policy from time to time. Changes will be posted in the app and are effective immediately.
          </Text>
          <Text style={styles.sectionTitle}>7. Contact Us</Text>
          <Text style={styles.text}>
            If you have any questions about this Privacy Policy, please contact us at support@hmsfitness.com.
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
