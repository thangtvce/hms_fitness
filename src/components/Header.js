import React,{ useContext } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
  Platform,
  StatusBar
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ThemeContext } from "components/theme/ThemeContext";
import { AuthContext } from "context/AuthContext";

const { width: screenWidth,height: screenHeight } = Dimensions.get('window');

// Fixed dimensions - không thay đổi trên mọi thiết bị
const getFixedDimensions = () => {
  return {
    headerHeight: 70, // Chiều cao cố định
    avatarSize: 50,    // Avatar size cố định
    titleFontSize: 16, // Font size nhỏ hơn, hợp lý hơn
    iconSize: 24,      // Icon size cố định  
    buttonSize: 36,    // Button size cố định
    horizontalPadding: 16, // Padding cố định
    statusBarHeight: Platform.OS === 'ios' ? (screenHeight >= 812 ? 44 : 20) : StatusBar.currentHeight || 0,
  };
};

const Header = ({
  title,
  onBack,
  rightActions = [],
  showAvatar = false,
  backgroundColor,
  textColor,
  containerStyle,
}) => {
  const { colors } = useContext(ThemeContext);
  const { user } = useContext(AuthContext);

  const dimensions = getFixedDimensions();
  const bgColor = backgroundColor || colors.headerBackground || "#FFFFFF";
  const txtColor = textColor || colors.headerText || "#1E293B";

  const dynamicStyles = StyleSheet.create({
    headerContainer: {
      height: dimensions.headerHeight + dimensions.statusBarHeight,
      paddingTop: dimensions.statusBarHeight,
    },
    header: {
      height: dimensions.headerHeight,
      paddingHorizontal: dimensions.horizontalPadding,
    },
    headerTitle: {
      fontSize: dimensions.titleFontSize,
    },
    avatar: {
      width: dimensions.avatarSize,
      height: dimensions.avatarSize,
      borderRadius: dimensions.avatarSize / 2,
    },
    headerButton: {
      width: dimensions.buttonSize,
      height: dimensions.buttonSize,
      borderRadius: dimensions.buttonSize / 2,
    },
    onlineIndicator: {
      width: dimensions.avatarSize * 0.28,
      height: dimensions.avatarSize * 0.28,
      borderRadius: dimensions.avatarSize * 0.14,
      bottom: dimensions.avatarSize * 0.04,
      right: dimensions.avatarSize * 0.04,
    },
  });

  return (
    <View style={[
      styles.headerContainer,
      dynamicStyles.headerContainer,
      { backgroundColor: bgColor },
      containerStyle
    ]}>
      <View style={[styles.header,dynamicStyles.header]}>
        {/* Left side - Back button or Avatar */}
        <View style={styles.leftSide}>
          {onBack && !showAvatar && (
            <TouchableOpacity
              onPress={onBack}
              style={styles.backButton}
              hitSlop={{ top: 10,bottom: 10,left: 10,right: 10 }}
            >
              <Ionicons
                name="arrow-back"
                size={dimensions.iconSize}
                color={txtColor}
              />
            </TouchableOpacity>
          )}

          {showAvatar && user && (
            <TouchableOpacity
              style={styles.avatarContainer}
              onPress={() => onBack && onBack()}
              hitSlop={{ top: 5,bottom: 5,left: 5,right: 5 }}
            >
              <Image
                source={{
                  uri: user.avatar ||
                    "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
                }}
                style={[styles.avatar,dynamicStyles.avatar]}
                resizeMode="cover"
              />
              <View style={[
                styles.onlineIndicator,
                dynamicStyles.onlineIndicator,
                { backgroundColor: colors.success || "#10B981" }
              ]} />
            </TouchableOpacity>
          )}
        </View>

        {/* Center - Title */}
        <View style={styles.titleContainer}>
          <Text
            style={[styles.headerTitle,dynamicStyles.headerTitle,{ color: txtColor }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {title}
          </Text>
        </View>

        {/* Right side - Actions */}
        <View style={styles.rightSide}>
          {rightActions.length > 0 && (
            <View style={styles.headerActions}>
              {rightActions.map((action,index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.headerButton,
                    dynamicStyles.headerButton,
                    {
                      backgroundColor: colors.headerButtonBackground || "#F3F4F6",
                      shadowColor: "#000",
                      shadowOffset: { width: 0,height: 1 },
                      shadowOpacity: 0.1,
                      shadowRadius: 2,
                      elevation: 2,
                    }
                  ]}
                  onPress={action.onPress}
                  hitSlop={{ top: 5,bottom: 5,left: 5,right: 5 }}
                >
                  {typeof action.icon === "string" ? (
                    <Ionicons
                      name={action.icon}
                      size={dimensions.iconSize - 2}
                      color={action.color || colors.primary || "#1E293B"}
                    />
                  ) : (
                    action.icon
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  leftSide: {
    flex: 1,
    alignItems: "flex-start",
    justifyContent: "center",
    minWidth: 60,
  },
  titleContainer: {
    flex: 2,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  rightSide: {
    flex: 1,
    alignItems: "flex-end",
    justifyContent: "center",
    minWidth: 60,
  },
  headerTitle: {
    fontWeight: "600",
    textAlign: "center",
    letterSpacing: 0.3,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
  },
  avatarContainer: {
    position: "relative",
    padding: 2,
  },
  avatar: {
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  onlineIndicator: {
    position: "absolute",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerButton: {
    alignItems: "center",
    justifyContent: "center",
  },
});

export default Header;