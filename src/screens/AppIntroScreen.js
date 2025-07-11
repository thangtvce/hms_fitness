import React, { useRef, useState } from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { ScrollView } from "react-native-gesture-handler";

const { width, height } = Dimensions.get("window");

const slides = [
  {
    image: { uri: 'https://tse1.explicit.bing.net/th/id/OIP.3onH7mEnlGZYvbc71Z70PgHaGM?w=1280&h=1072&rs=1&pid=ImgDetMain&o=7&rm=3' },
    title: "Welcome to HMS Fitness",
    desc: "Start your journey to a healthier and stronger you with us."
  },
  {
    image: { uri: 'https://tse2.mm.bing.net/th/id/OIP.QHLXgoG0zfYi2PBZHrdK5QHaHa?rs=1&pid=ImgDetMain&o=7&rm=3' },
    title: "Personalize Your Goals",
    desc: "Choose workout and nutrition plans that fit your lifestyle."
  },
  {
    image: { uri: 'https://uploads-ssl.webflow.com/63aee670917c0c612e425f44/63ed3c4ae0981e021542d743_fitness-girl-with-headphones-in-her-ears-plays-mu-2022-02-01-22-37-26-utc.webp' },
    title: "Stay Motivated Every Day",
    desc: "Enjoy music, track your progress, and keep moving forward with HMS Fitness."
  }
];

export default function AppIntroScreen() {
  const navigation = useNavigation();
  const scrollRef = useRef();
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleScroll = (event) => {
    const x = event.nativeEvent.contentOffset.x;
    const idx = Math.round(x / width);
    setCurrentIndex(idx);
  };

  return (
    <View style={styles.rootBg}>
      <StatusBar style="light" backgroundColor="#000" />
      <View style={styles.fullScreenWrapper}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          style={styles.fullScreenCarousel}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          {slides.map((slide, idx) => (
            <View key={idx} style={styles.fullScreenSlide}>
              <Image source={slide.image} style={styles.fullScreenImage} resizeMode="cover" />
              {/* Đã xoá overlay Welcome to HMS Fitness */}
              <View style={styles.slideTextOverlay}>
                <Text style={styles.slideTitleFull}>{slide.title}</Text>
                <Text style={styles.slideDescFull}>{slide.desc}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
        {/* Indicator dots */}
        <View style={styles.dotsContainerFull}>
          {slides.map((_, idx) => (
            <View
              key={idx}
              style={[styles.dotFull, currentIndex === idx ? styles.dotActiveFull : null]}
            />
          ))}
        </View>
      </View>
      <View style={styles.buttonContainerFull}>
        <TouchableOpacity style={styles.signupButton} onPress={() => navigation.navigate("RegisterScreen")}> 
          <Text style={styles.signupText}>Sign up for free</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.loginButton} onPress={() => navigation.navigate("Login")}> 
          <Text style={styles.loginText}>Log In</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rootBg: {
    flex: 1,
    backgroundColor: '#fff',
  },
  fullScreenWrapper: {
    flex: 1,
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  fullScreenCarousel: {
    flex: 1,
  },
  fullScreenSlide: {
    width: width,
    height: '100%',
    position: 'relative',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: '100%',
    height: height * 0.6,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    backgroundColor: '#eee',
    zIndex: 1,
  },
  headerOverlayFull: {
    position: 'absolute',
    top: 40,
    left: 0,
    width: '100%',
    alignItems: 'center',
    zIndex: 2,
    backgroundColor: 'rgba(0,0,0,0.18)',
    paddingTop: 16,
    paddingBottom: 12,
  },
  welcomeFull: {
    fontSize: 17,
    color: "#fff",
    fontWeight: "600",
    marginBottom: 2,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 2,
  },
  titleFull: {
    fontSize: 32,
    color: "#fff",
    fontWeight: "bold",
    marginBottom: 18,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 2,
  },
  slideTextOverlay: {
    marginTop: 24,
    width: '100%',
    alignItems: 'center',
    zIndex: 2,
    paddingHorizontal: 24,
  },
  slideTitleFull: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#111",
    marginBottom: 6,
    textAlign: "center",
    // fontFamily removed to avoid expo-font dependency
    letterSpacing: 2,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0,0,0,0.10)',
    textShadowOffset: {width: 0, height: 2},
    textShadowRadius: 4,
  },
  slideDescFull: {
    fontSize: 16,
    color: "#111", // black
    textAlign: "center",
    marginBottom: 10,
    // textShadowColor: 'rgba(0,0,0,0.4)',
    // textShadowOffset: {width: 0, height: 1},
    // textShadowRadius: 2,
  },
  dotsContainerFull: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 50,
    marginTop: 2,
    zIndex: 3,
  },
  dotFull: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#d1d5db',
    marginHorizontal: 5,
  },
  dotActiveFull: {
    backgroundColor: '#0056d2',
  },
  buttonContainerFull: {
    width: "100%",
    alignItems: "center",
    marginTop: 0,
    marginBottom: 40,
    zIndex: 4,
  },
  signupButton: {
    backgroundColor: "#0056d2",
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 60,
    marginBottom: 12,
  },
  signupText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "bold",
  },
  loginButton: {
    backgroundColor: "#fff",
    paddingVertical: 10,
    paddingHorizontal: 60,
  },
  loginText: {
    color: "#0056d2",
    fontSize: 17,
    fontWeight: "bold",
  },
});
