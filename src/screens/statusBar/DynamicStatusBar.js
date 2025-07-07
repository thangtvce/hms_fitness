import { StatusBar } from "expo-status-bar";
import React from "react";

const DynamicStatusBar = ({ backgroundColor,translucent = false,...props }) => {
    const getLuminance = (color) => {
        if (!color) return 0.5;
        const hex = color.replace("#","");
        const r = parseInt(hex.substr(0,2),16) / 255;
        const g = parseInt(hex.substr(2,2),16) / 255;
        const b = parseInt(hex.substr(4,2),16) / 255;
        return 0.299 * r + 0.587 * g + 0.114 * b;
    };

    const getStatusBarStyle = (bgColor) => {
        const luminance = getLuminance(bgColor);
        return luminance > 0.5 ? "dark-content" : "light-content";
    };

    return (
        <StatusBar
            barStyle={getStatusBarStyle(backgroundColor)}
            backgroundColor={backgroundColor}
            translucent={translucent}
            {...props}
        />
    );
};

export default DynamicStatusBar;