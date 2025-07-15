import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState('light');

    useEffect(() => {
        const loadTheme = async () => {
            try {
                const savedTheme = await AsyncStorage.getItem('theme');
                if (savedTheme) {
                    setTheme(savedTheme);
                }
            } catch (error) {
                console.error('Failed to load theme:', error);
            }
        };
        loadTheme();
    }, []);

    // Save theme to AsyncStorage when it changes
    useEffect(() => {
        const saveTheme = async () => {
            try {
                await AsyncStorage.setItem('theme', theme);
            } catch (error) {
                console.error('Failed to save theme:', error);
            }
        };
        saveTheme();
    }, [theme]);

    const themes = {
        // ====== General App Colors ======
        light: {
            // --- Base ---
            background: '#F8FAFC',
            textPrimary: '#1E293B',
            textSecondary: '#64748B',
            accent: '#0056d2',
            accentSecondary: '#6366F1',
            accentTertiary: '#818CF8',
            warning: '#F59E0B',
            success: '#10B981',
            error: '#EF4444',
            // --- Buttons & Inputs ---
            buttonBackground: '#F3F4F6',
            buttonText: '#6B7280',
            // --- Cards & Containers ---
            cardBackground: '#FFFFFF',
            cardShadow: '#4F46E5',
            border: '#F3F4F6',
            mealCardBackground: '#FFFFFF',
            mealCardBorder: 'rgba(79, 70, 229, 0.08)',
            mealAddButtonBackground: '#FFFFFF', 
            mealAddButtonIcon: '#4F46E5', 
            mealCardTitle: '#1E293B', 
            mealCardSubtitle: '#64748B', 
            // --- Header ---
            headerBackground: '#fff',
            headerShadow: '#4F46E5',
            headerText: '#1E293B',
            textFilter: '#ffffff',

            // --- Misc ---
            searchBarBackground: '#F9FAFB',
            iconColor: '#6B7280',
            expiredBadge: '#FEF2F2',
            expiredText: '#EF4444',
            unreadDot: '#0056d2',
            modalOverlay: 'rgba(0, 0, 0, 0.5)',
            filterOption: '#F9FAFB',
            selectedOption: '#e6f0fa',
            selectedOptionBorder: '#4F46E5',
            switchTrackFalse: '#E5E7EB',
            switchTrackTrue: '#4F46E5',
            switchThumb: '#FFFFFF',

            // ====== Stats Card Colors ======
            statsGradient: ['#4F46E5', '#6366F1', '#818CF8'],
            statsText: '#FFFFFF',
            statsDivider: 'rgba(255,255,255,0.2)',
            progressBarBackground: '#F1F5F9',
            progressBarActive: '#4F46E5',
            calendarCardBackground: '#FFFFFF',
            calendarCardBorder: 'rgba(0,86,210,0.1)',
            // Calendar Card (Weekly Progress)
            calendarDayText: '#64748B',
            calendarDateCircle: '#F1F5F9',
            calendarDateText: '#1E293B',
            calendarProgressIndicator: '#E2E8F0',
            activeDay: '#0056d2',
            activeDayText: '#0056d2',
            activeDateCircle: '#0056d2',
            activeDateText: '#FFFFFF',
            activeProgressIndicator: '#0056d2',

            // ====== Section Header Colors ======

            // ====== Discover/Quick Access Colors ======
            discoverTitle: '#64748B',
            activeDiscoverTitle: '#4F46E5',

            // ====== Section Header Colors ======
            sectionTitle: '#1E293B',
            sectionAction: '#0056d2',

            // ====== Card Colors ======
            calorieCardBackground: '#FFFFFF',
            calorieCardText: '#1E293B',
            statIconBackground: '#F3F4F6',

            // ====== Trainer Banner Colors ======
            trainerBannerBackground: '#fff',
            trainerBannerShadow: '#0056d2',
            trainerBadgeBackground: '#e6f0fa',
            trainerBadgeText: '#0056d2',
            trainerName: '#0056d2',
            trainerSpecialty: '#1E293B',
            trainerStatText: '#0056d2',
            trainerButtonBackground: '#0056d2',
            trainerButtonText: '#fff',
            trainerIcon: '#0056d2',
              
          
        },
        // ====== General App Colors ======
        dark: {
            // --- Base ---
            background: '#181A20',
            textPrimary: '#F9FAFB',
            textSecondary: '#9CA3AF',
            accent: '#6366F1',
            accentSecondary: '#4F46E5',
            accentTertiary: '#818CF8',
            warning: '#FBBF24',
            success: '#34D399',
            error: '#F87171',
            // --- Buttons & Inputs ---
            buttonBackground: '#23262F',
            buttonText: '#F9FAFB',
            // --- Cards & Containers ---
            cardBackground: '#23262F',
            cardShadow: '#23262F',
            border: '#23262F',
            mealCardBackground: '#23262F',
            mealCardBorder: 'rgba(99,102,241,0.12)',
            mealAddButtonBackground: '#23262F', // Add button background (dark)
            mealAddButtonIcon: '#F9FAFB', // Add button icon color (dark)
            mealCardTitle: '#FFFFFF', 
            mealCardSubtitle: '#FFFFFF', 
            // --- Header ---
            headerBackground: '#23262F',
            headerShadow: '#23262F',
            headerText: '#F9FAFB',
            // --- Misc ---
            searchBarBackground: '#23262F',
            iconColor: '#9CA3AF',
            expiredBadge: '#7F1D1D',
            expiredText: '#FECACA',
            unreadDot: '#6366F1',
            modalOverlay: 'rgba(0, 0, 0, 0.7)',
            filterOption: '#23262F',
            selectedOption: '#23262F',
            selectedOptionBorder: '#6366F1',
            switchTrackFalse: '#23262F',
            switchTrackTrue: '#6366F1',
            switchThumb: '#F9FAFB',

            // ====== Stats Card Colors ======
            statsGradient: ['#23262F', '#6366F1', '#818CF8'],
            statsText: '#F9FAFB',
            statsDivider: 'rgba(255,255,255,0.15)',
            progressBarBackground: '#23262F',
            progressBarActive: '#6366F1',
            calendarCardBackground: '#23262F',
            calendarCardBorder: 'rgba(99,102,241,0.12)',
            // Calendar Card (Weekly Progress)
            calendarDayText: '#9CA3AF',
            calendarDateCircle: '#23262F',
            calendarDateText: '#F9FAFB',
            calendarProgressIndicator: '#23262F',
            activeDay: '#6366F1',
            activeDayText: '#6366F1',
            activeDateCircle: '#6366F1',
            activeDateText: '#F9FAFB',
            activeProgressIndicator: '#6366F1',

            // ====== Section Header Colors ======

            // ====== Discover/Quick Access Colors ======
            discoverTitle: '#F9FAFB',
            activeDiscoverTitle: '#6366F1',

            // ====== Section Header Colors ======
            sectionTitle: '#F9FAFB',
            sectionAction: '#FFFFFF',

            // ====== Card Colors ======
            calorieCardBackground: '#23262F',
            calorieCardText: '#FFFFFF',
            statIconBackground: '#23262F',

            // ====== Trainer Banner Colors ======
            trainerBannerBackground: '#23262F',
            trainerBannerShadow: '#23262F',
            trainerBadgeBackground: '#23262F',
            trainerBadgeText: '#fff',
            trainerName: '#fff',
            trainerSpecialty: '#fff',
            trainerStatText: '#fff',
            trainerButtonBackground: '#fff',
            trainerButtonText: '#23262F',
            trainerIcon: '#fff',
            // ====== Discover/Quick Access Colors ======
            discoverTitle: '#64748B',
            activeDiscoverTitle: '#4F46E5',
            // ====== Discover/Quick Access Colors ======
            discoverTitle: '#F9FAFB',
            activeDiscoverTitle: '#6366F1',
            // ====== Discover/Quick Access Colors ======

        },
    };

    const toggleTheme = () => {
        setTheme(theme === 'light' ? 'dark' : 'light');
    };

    // Defensive: always provide a valid colors object
    let safeTheme = theme;
    if (!theme || !themes[theme]) {
        safeTheme = 'light';
    }
    const colors = themes[safeTheme] || themes['light'];

    return (
        <ThemeContext.Provider value={{ theme: safeTheme, colors, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};