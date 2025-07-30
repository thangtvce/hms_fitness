import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native"

export default function StreakUnlockedModal({ streakDays = 12, onClose, onPostToJournal }) {
  return (
    <View style={styles.overlay}>
      <View style={styles.modalContainer}>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>X</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Streak Unlocked!</Text>
        <Text style={styles.subtitle}>You have unlocked a {streakDays}-day activity streak!</Text>

        <Image
          source={require("./assets/fire-confetti.png")} // Placeholder image
          style={styles.fireConfettiImage}
          resizeMode="contain"
        />

        <TouchableOpacity style={styles.postButton} onPress={onPostToJournal}>
          <Text style={styles.postButtonText}>Post to Journal</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)", // Semi-transparent dark background for the overlay
  },
  modalContainer: {
    width: "90%",
    maxWidth: 400,
    backgroundColor: "#2C2C2E", // Dark background for the modal itself
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    position: "relative",
  },
  closeButton: {
    position: "absolute",
    top: 15,
    right: 15,
    padding: 5,
  },
  closeButtonText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "bold",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "bold",
    marginTop: 30, // Space from the top/close button
    textAlign: "center",
  },
  subtitle: {
    color: "#FFFFFF",
    fontSize: 16,
    textAlign: "center",
    marginTop: 10,
    marginBottom: 20,
  },
  fireConfettiImage: {
    width: "100%",
    height: 200,
    marginVertical: 30,
  },
  postButton: {
    backgroundColor: "#FF4081", // Pink button color
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 30,
    marginTop: 20,
    width: "80%",
    alignItems: "center",
  },
  postButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
  },
})
