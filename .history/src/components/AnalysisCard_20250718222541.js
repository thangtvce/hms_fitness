import { TouchableOpacity, Text, StyleSheet, Platform, View, Image } from "react-native"
import { useNavigation } from "@react-navigation/native"

const AnalysisCard = ({ title, image, targetScreen, targetParams }) => {
  const navigation = useNavigation()
  const handlePress = () => {
    if (targetScreen) {
      navigation.navigate(targetScreen, targetParams)
    } else {
      console.warn(`No target screen defined for ${title}`)
    }
  }
  return (
    <TouchableOpacity style={styles.cardContainer} onPress={handlePress} activeOpacity={0.8}>
      <View style={styles.cardContent}>
        {image && <Image source={image} style={styles.cardImage} resizeMode="contain" />}
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
    </TouchableOpacity>
  )
}
const styles = StyleSheet.create({
  cardContainer: {
    width: "47%", 
    marginBottom: 16,
    borderRadius: 20, 
    overflow: "hidden", 
    backgroundColor: '#F5F6FA', // Light gray for card background
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 }, 
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 10, 
      },
    }),
  },
  cardContent: {
    flex: 1,
    paddingVertical: 24,
    paddingHorizontal: 16,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: 'transparent',
  },
  cardImage: {
    width: 48,
    height: 48,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#222", 
    textAlign: "center",
  },
})

export default AnalysisCard
