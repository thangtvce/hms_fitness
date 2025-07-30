import React from "react";
import { View, StyleSheet } from "react-native";
import ShimmerPlaceholder from "../ShimmerPlaceholder";

// Kích thước mặc định: dùng cho card, tab, v.v.
export const SHIMMER_CARD_HEIGHT = 42; // giống chiều cao tab
export const SHIMMER_CARD_RADIUS = 8;
export const SHIMMER_CARD_MARGIN = 8;

const ShimmerCard = ({ width = "100%", height = SHIMMER_CARD_HEIGHT, borderRadius = SHIMMER_CARD_RADIUS, style }) => (
  <View style={[{ width, marginBottom: SHIMMER_CARD_MARGIN }, style]}>
    <ShimmerPlaceholder style={{ width: "100%", height, borderRadius }} />
  </View>
);

export default ShimmerCard;
