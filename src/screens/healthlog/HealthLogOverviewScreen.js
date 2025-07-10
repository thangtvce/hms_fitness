import React, { useEffect, useState, useRef } from "react"
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Modal,
  ScrollView,
  Animated,
  Dimensions,
} from "react-native"
import Header from "../../components/Header"
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons"
import { healthyLogService } from "services/apiHealthyLogService"
import { useNavigation, useFocusEffect } from "@react-navigation/native"
import { SafeAreaView } from "react-native-safe-area-context"
import { WebView } from "react-native-webview"

const { width, height } = Dimensions.get("window")

export default function HealthLogOverviewScreen() {
  const navigation = useNavigation()
  const [logs, setLogs] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingStats, setLoadingStats] = useState(true)
  const [error, setError] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedLog, setSelectedLog] = useState(null)
  const [selectedBodyPart, setSelectedBodyPart] = useState(null)

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(30)).current
  const scaleAnim = useRef(new Animated.Value(0.95)).current
  const pulseAnim = useRef(new Animated.Value(1)).current

  useEffect(() => {
    fetchLogs()
    fetchStats()
    startAnimations()
  }, [])

  // Refetch logs and stats when screen is focused (after add/edit)
  useFocusEffect(
    React.useCallback(() => {
      fetchLogs()
      fetchStats()
    }, [])
  )

  const startAnimations = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 80,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start()

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ]),
    ).start()
  }

  const fetchLogs = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await healthyLogService.getMyHealthLogs({ pageNumber: 1, pageSize: 3 })
      setLogs(data.logs || data.Logs || [])
    } catch (e) {
      setError(e.message || "Error loading health logs")
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    setLoadingStats(true)
    try {
      const data = await healthyLogService.getMyHealthLogStatistics()
      setStats(data)
    } catch (e) {
      setStats(null)
    } finally {
      setLoadingStats(false)
    }
  }

  const handleDelete = async (logId) => {
    try {
      await healthyLogService.deleteHealthLog(logId)
      setShowDeleteModal(false)
      setSelectedLog(null)
      fetchLogs()
      fetchStats()
      Alert.alert("Success", "Health log deleted successfully.")
    } catch (e) {
      Alert.alert("Error", e.message || "Unable to delete health log.")
    }
  }

  const getHealthStatus = (type, value) => {
    switch (type) {
      case "heartRate":
        if (value >= 60 && value <= 100)
          return { status: "normal", color: "#22C55E", bgColor: "#DCFCE7", textColor: "#166534", alert: false }
        if (value < 60)
          return { status: "low", color: "#F59E0B", bgColor: "#FEF3C7", textColor: "#92400E", alert: true }
        return { status: "high", color: "#EF4444", bgColor: "#FEE2E2", textColor: "#DC2626", alert: true }
      case "bloodOxygen":
        if (value >= 95)
          return { status: "normal", color: "#22C55E", bgColor: "#DCFCE7", textColor: "#166534", alert: false }
        if (value >= 90)
          return { status: "low", color: "#F59E0B", bgColor: "#FEF3C7", textColor: "#92400E", alert: true }
        return { status: "critical", color: "#EF4444", bgColor: "#FEE2E2", textColor: "#DC2626", alert: true }
      case "sleep":
        if (value >= 7 && value <= 9)
          return { status: "optimal", color: "#22C55E", bgColor: "#DCFCE7", textColor: "#166534", alert: false }
        if (value >= 6 && value < 7)
          return { status: "insufficient", color: "#F59E0B", bgColor: "#FEF3C7", textColor: "#92400E", alert: true }
        return { status: "poor", color: "#EF4444", bgColor: "#FEE2E2", textColor: "#DC2626", alert: true }
      case "stress":
        if (value <= 3)
          return { status: "low", color: "#22C55E", bgColor: "#DCFCE7", textColor: "#166534", alert: false }
        if (value <= 6)
          return { status: "moderate", color: "#F59E0B", bgColor: "#FEF3C7", textColor: "#92400E", alert: true }
        return { status: "high", color: "#EF4444", bgColor: "#FEE2E2", textColor: "#DC2626", alert: true }
      default:
        return { status: "unknown", color: "#6B7280", bgColor: "#F3F4F6", textColor: "#374151", alert: false }
    }
  }

  // Compact Health Metrics Overview - positioned right under header
  const renderCompactHealthMetrics = () => (
    <Animated.View
      style={[
        styles.compactMetricsContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.metricsHeader}>
        <Text style={styles.compactSectionTitle}>Health Metrics Overview</Text>
        <TouchableOpacity 
          style={styles.addMetricButton}
          onPress={() => navigation.navigate("HealthLogCreateScreen")}
        >
          <Ionicons name="add" size={20} color="#3B82F6" />
        </TouchableOpacity>
      </View>
      
      {loadingStats ? (
        <View style={styles.compactLoadingContainer}>
          <ActivityIndicator size="small" color="#3B82F6" />
          <Text style={styles.compactLoadingText}>Loading...</Text>
        </View>
      ) : stats ? (
        <View style={styles.compactMetricsGrid}>
          {/* Row 1 */}
          <View style={styles.compactMetricsRow}>
            <View style={styles.compactMetricItem}>
              <View style={[styles.compactMetricIcon, { backgroundColor: getHealthStatus("heartRate", Math.round(stats.averageHeartRate)).color }]}>
                <Ionicons name="heart" size={16} color="#FFFFFF" />
              </View>
              <View style={styles.compactMetricContent}>
                <Text style={styles.compactMetricValue}>{Math.round(stats.averageHeartRate)}</Text>
                <Text style={styles.compactMetricLabel}>Heart Rate</Text>
              </View>
              {getHealthStatus("heartRate", Math.round(stats.averageHeartRate)).alert && (
                <View style={styles.compactAlertDot} />
              )}
            </View>
            
            <View style={styles.compactDivider} />
            
            <View style={styles.compactMetricItem}>
              <View style={[styles.compactMetricIcon, { backgroundColor: getHealthStatus("bloodOxygen", Math.round(stats.averageBloodOxygenLevel)).color }]}>
                <MaterialCommunityIcons name="lungs" size={16} color="#FFFFFF" />
              </View>
              <View style={styles.compactMetricContent}>
                <Text style={styles.compactMetricValue}>{Math.round(stats.averageBloodOxygenLevel)}%</Text>
                <Text style={styles.compactMetricLabel}>Blood O₂</Text>
              </View>
              {getHealthStatus("bloodOxygen", Math.round(stats.averageBloodOxygenLevel)).alert && (
                <View style={styles.compactAlertDot} />
              )}
            </View>
          </View>

          {/* Row 2 */}
          <View style={styles.compactMetricsRow}>
            <View style={styles.compactMetricItem}>
              <View style={[styles.compactMetricIcon, { backgroundColor: getHealthStatus("sleep", stats.averageSleepDuration).color }]}>
                <Ionicons name="bed" size={16} color="#FFFFFF" />
              </View>
              <View style={styles.compactMetricContent}>
                <Text style={styles.compactMetricValue}>{stats.averageSleepDuration}h</Text>
                <Text style={styles.compactMetricLabel}>Sleep</Text>
              </View>
              {getHealthStatus("sleep", stats.averageSleepDuration).alert && (
                <View style={styles.compactAlertDot} />
              )}
            </View>
            
            <View style={styles.compactDivider} />
            
            <View style={styles.compactMetricItem}>
              <View style={[styles.compactMetricIcon, { backgroundColor: getHealthStatus("stress", 5).color }]}>
                <MaterialCommunityIcons name="brain" size={16} color="#FFFFFF" />
              </View>
              <View style={styles.compactMetricContent}>
                <Text style={styles.compactMetricValue}>5/10</Text>
                <Text style={styles.compactMetricLabel}>Stress</Text>
              </View>
              {getHealthStatus("stress", 5).alert && (
                <View style={styles.compactAlertDot} />
              )}
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.compactNoDataContainer}>
          <MaterialCommunityIcons name="heart-pulse" size={24} color="#CBD5E1" />
          <Text style={styles.compactNoDataText}>No health data available</Text>
        </View>
      )}
    </Animated.View>
  )

  const renderEnhancedHumanBody = () => {
    if (!stats) return null

    const latestLog = logs && logs.length > 0 ? logs[0] : null
    const heartRate = latestLog ? latestLog.heartRate : Math.round(stats.averageHeartRate)
    const oxygenLevel = latestLog ? latestLog.bloodOxygenLevel : Math.round(stats.averageBloodOxygenLevel)
    const sleepValue = latestLog ? latestLog.sleepDuration : stats.averageSleepDuration
    const stressValue = latestLog && latestLog.stressLevel !== undefined ? latestLog.stressLevel : 5

    const heartHealth = getHealthStatus("heartRate", heartRate)
    const oxygenHealth = getHealthStatus("bloodOxygen", oxygenLevel)
    const sleepHealth = getHealthStatus("sleep", sleepValue)
    const stressHealth = getHealthStatus("stress", stressValue)

    // Highlight chest for heart, stomach for oxygen, head for stress
    let highlightPart = null;
    if (selectedBodyPart) {
      highlightPart = selectedBodyPart;
    } else if (selectedBodyPart === "lungs" || selectedBodyPart === "stomach") {
      highlightPart = "stomach";
    }

    // Enhanced HTML content with metrics positioned around the body
    const htmlContent = `
      <!DOCTYPE html>
      <html lang='en'>
      <head>
        <meta charset='UTF-8'>
        <meta name='viewport' content='width=device-width, initial-scale=1.0'>
        <title>Enhanced Human Body Health Visualization</title>
        <style>
          * { box-sizing: border-box; }
          body {
             margin: 0;
             background: transparent;
             font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            overflow: hidden;
          }
          
          .human-body {
            width: 340px;
            position: relative;
            padding: 60px 80px;
            height: 640px;
            display: block;
            margin: 0 auto;
            perspective: 1000px;
          }
          
          .human-body svg {
            position: absolute;
            left: 50%;
            transition: all 0.3s ease;
            cursor: pointer;
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
          }
          
          .human-body svg:hover {
            transform: scale(1.02);
            filter: drop-shadow(0 4px 8px rgba(0,0,0,0.15));
          }
          
          .human-body svg.selected path {
            fill: #3B82F6 !important;
            stroke: #1D4ED8;
            stroke-width: 1;
          }
          
          /* Body part positioning - centered in the container */
          .human-body svg#head { margin-left: -28.5px; top: 40px; }
          .human-body svg#left-shoulder { margin-left: -53.5px; top: 115px; }
          .human-body svg#right-shoulder { margin-left: 13.5px; top: 115px; }
          .human-body svg#left-arm { margin-left: -78px; top: 158px; }
          .human-body svg#right-arm { margin-left: 38px; top: 158px; z-index: 10001; }
          .human-body svg#chest { margin-left: -43.5px; top: 134px; }
          .human-body svg#stomach { margin-left: -37.5px; top: 176px; }
          .human-body svg#left-leg { margin-left: -46.5px; top: 251px; z-index: 9999; }
          .human-body svg#right-leg { margin-left: 1.5px; top: 251px; z-index: 9999; }
          .human-body svg#left-hand { margin-left: -102.5px; top: 270px; }
          .human-body svg#right-hand { margin-left: 66.5px; top: 270px; z-index: 10000; }
          .human-body svg#left-foot { margin-left: -35.5px; top: 501px; }
          .human-body svg#right-foot { margin-left: 5.5px; top: 501px; }
          
          /* Health status coloring for body parts */
          .human-body svg#chest path { fill: ${heartHealth.color}; opacity: 0.8; }
          .human-body svg#head path { fill: ${stressHealth.color}; opacity: 0.7; }
          .human-body svg#stomach path { fill: ${oxygenHealth.color}; opacity: 0.8; }
          /* Default body part colors */
          .human-body svg:not(#chest):not(#head):not(#stomach) path {
             fill: #64B5F6;
             opacity: 0.85;
          }
          
          /* Enhanced metric cards positioned AROUND the body */
          .metric-card {
            position: absolute;
            z-index: 10002;
            pointer-events: none;
            user-select: none;
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-radius: 16px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
            padding: 12px 16px;
            min-width: 90px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            animation: float 3s ease-in-out infinite;
          }
          
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-4px); }
          }
          
          /* Positioned AROUND the body, not covering it */
          .metric-card.heart {
             top: 190px; /* tăng top để cách xuống dưới hơn */
            left: 20px;
            background: ${heartHealth.bgColor};
            border-left: 4px solid ${heartHealth.color};
          }
          
          .metric-card.lungs {
             top: 200px;
             right: 20px;
            background: ${oxygenHealth.bgColor};
            border-left: 4px solid ${oxygenHealth.color};
          }
          
          .metric-card.sleep {
             top: 60px;
             left: 20px;
            background: ${sleepHealth.bgColor};
            border-left: 4px solid ${sleepHealth.color};
          }
          
          .metric-card.stress {
             top: 60px;
             right: 20px;
            background: ${stressHealth.bgColor};
            border-left: 4px solid ${stressHealth.color};
          }
          
          .metric-header {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 6px;
          }
          
          .metric-icon {
            width: 20px;
            height: 20px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
          }
          
          .metric-label {
            font-size: 12px;
            font-weight: 700;
            margin: 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          .metric-value {
            font-size: 18px;
            font-weight: 900;
            margin: 2px 0;
            display: flex;
            align-items: baseline;
            gap: 4px;
          }
          
          .metric-unit {
            font-size: 12px;
            font-weight: 600;
            opacity: 0.8;
          }
          
          .metric-status {
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-top: 4px;
            padding: 2px 6px;
            border-radius: 8px;
            text-align: center;
          }
          
          .alert-indicator {
            position: absolute;
            top: -6px;
            right: -6px;
            width: 20px;
            height: 20px;
            background: #EF4444;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 12px;
            font-weight: bold;
            border: 2px solid white;
            animation: pulse 2s infinite;
          }
          
          @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); }
          }
          
          .connection-line {
            position: absolute;
            z-index: 10001;
            pointer-events: none;
            opacity: 0.6;
          }
          
          /* Connection lines from metrics to body parts */
          .line-heart {
            top: 185px;
            left: 110px;
            width: 60px;
            height: 2px;
            background: linear-gradient(90deg, ${heartHealth.color}, transparent);
            border-radius: 1px;
          }
          
          .line-lungs {
            top: 225px;
            right: 110px;
            width: 60px;
            height: 2px;
            background: linear-gradient(270deg, ${oxygenHealth.color}, transparent);
            border-radius: 1px;
          }
          
          .line-sleep {
            top: 85px;
            left: 110px;
            width: 50px;
            height: 2px;
            background: linear-gradient(90deg, ${sleepHealth.color}, transparent);
            border-radius: 1px;
          }
          
          .line-stress {
            top: 85px;
            right: 110px;
            width: 50px;
            height: 2px;
            background: linear-gradient(270deg, ${stressHealth.color}, transparent);
            border-radius: 1px;
          }
        </style>
      </head>
      <body>
        <div class='human-body' id='human-body'>
          <!-- Connection lines -->
          <div class="connection-line line-heart"></div>
          <div class="connection-line line-lungs"></div>
          <div class="connection-line line-sleep"></div>
          <div class="connection-line line-stress"></div>
          
          <!-- SVG Human Body -->
          <svg class='part' data-position='head' id='head' xmlns='http://www.w3.org/2000/svg' width='56.594' height='95.031' viewBox='0 0 56.594 95.031'><path d='M15.92 68.5l8.8 12.546 3.97 13.984-9.254-7.38-4.622-15.848zm27.1 0l-8.8 12.546-3.976 13.988 9.254-7.38 4.622-15.848zm6.11-27.775l.108-11.775-21.16-14.742L8.123 26.133 8.09 40.19l-3.24.215 1.462 9.732 5.208 1.81 2.36 11.63 9.72 11.018 10.856-.324 9.56-10.37 1.918-11.952 5.207-1.81 1.342-9.517zm-43.085-1.84l-.257-13.82L28.226 11.9l23.618 15.755-.216 10.37 4.976-17.085L42.556 2.376 25.49 0 10.803 3.673.002 24.415z'/></svg>
          <svg class='part' data-position='left-shoulder' id='left-shoulder' xmlns='http://www.w3.org/2000/svg' width='109.532' height='46.594' viewBox='0 0 109.532 46.594'><path d='m 38.244,-0.004 1.98,9.232 -11.653,2.857 -7.474,-2.637 z M 17.005,10.536 12.962,8.35 0.306,22.35 0.244,27.675 c 0,0 16.52,-17.015 16.764,-17.14 z m 1.285,0.58 C 18.3,11.396 0.528,30.038 0.528,30.038 L -0.01,46.595 6.147,36.045 18.017,30.989 26.374,15.6 Z'/></svg>
          <svg class='part' data-position='right-shoulder' id='right-shoulder' xmlns='http://www.w3.org/2000/svg' width='109.532' height='46.594' viewBox='0 0 109.532 46.594'><path d='m 3.2759972,-0.004 -1.98,9.232 11.6529998,2.857 7.473999,-2.637 z m 21.2379988,10.54 4.044,-2.187 12.656,14 0.07,5.33 c 0,0 -16.524,-17.019 -16.769,-17.144 z m -1.285,0.58 c -0.008,0.28 17.762,18.922 17.762,18.922 l 0.537,16.557 -6.157,-10.55 -11.871,-5.057 L 15.147997,15.6 Z'/></svg>
          <svg class='part' data-position='left-arm' id='left-arm' xmlns='http://www.w3.org/2000/svg' width='156.344' height='119.25' viewBox='0 0 156.344 119.25'><path d='m21.12,56.5a1.678,1.678 0 0 1 -0.427,0.33l0.935,8.224l12.977,-13.89l1.2,-8.958a168.2,168.2 0 0 0 -14.685,14.294zm1.387,12.522l-18.07,48.91l5.757,1.333l19.125,-39.44l3.518,-22.047l-10.33,11.244zm-5.278,-18.96l2.638,18.74l-17.2,46.023l-2.657,-1.775l6.644,-35.518l10.575,-27.47zm18.805,-12.323a1.78,1.78 0 0 1 0.407,-0.24l3.666,-27.345l-7.037,-10.139l-7.258,10.58l-6.16,37.04l0.566,4.973a151.447,151.447 0 0 1 15.808,-14.87l0.008,0.001zm-13.742,-28.906l-3.3,35.276l-2.2,-26.238l5.5,-9.038z'/></svg>
          <svg class='part' data-position='right-arm' id='right-arm' xmlns='http://www.w3.org/2000/svg' width='156.344' height='119.25' viewBox='0 0 156.344 119.25'><path d='m 18.997,56.5 a 1.678,1.678 0 0 0 0.427,0.33 L 18.489,65.054 5.512,51.164 4.312,42.206 A 168.2,168.2 0 0 1 18.997,56.5 Z m -1.387,12.522 18.07,48.91 -5.757,1.333 L 10.798,79.825 7.28,57.778 17.61,69.022 Z m 5.278,-18.96 -2.638,18.74 17.2,46.023 2.657,-1.775 L 33.463,77.532 22.888,50.062 Z M 4.083,37.739 A 1.78,1.78 0 0 0 3.676,37.499 L 0.01,10.154 7.047,0.015 l 7.258,10.58 6.16,37.04 -0.566,4.973 A 151.447,151.447 0 0 0 4.091,37.738 l -0.008,10e-4 z m 13.742,-28.906 3.3,35.276 2.2,-26.238 -5.5,-9.038 z'/></svg>
          <svg class='part' data-position='chest' id='chest' xmlns='http://www.w3.org/2000/svg' width='86.594' height='45.063' viewBox='0 0 86.594 45.063'><path d='M19.32 0l-9.225 16.488-10.1 5.056 6.15 4.836 4.832 14.07 11.2 4.616 17.85-8.828-4.452-34.7zm47.934 0l9.225 16.488 10.1 5.056-6.15 4.836-4.833 14.07-11.2 4.616-17.844-8.828 4.45-34.7z'/></svg>
          <svg class='part' data-position='stomach' id='stomach' xmlns='http://www.w3.org/2000/svg' width='75.25' height='107.594' viewBox='0 0 75.25 107.594'><path d='M19.25 7.49l16.6-7.5-.5 12.16-14.943 7.662zm-10.322 8.9l6.9 3.848-.8-9.116zm5.617-8.732L1.32 2.15 6.3 15.6zm-8.17 9.267l9.015 5.514 1.54 11.028-8.795-5.735zm15.53 5.89l.332 8.662 12.286-2.665.664-11.826zm14.61 84.783L33.28 76.062l-.08-20.53-11.654-5.736-1.32 37.5zM22.735 35.64L22.57 46.3l11.787 3.166.166-16.657zm-14.16-5.255L16.49 35.9l1.1 11.25-8.8-7.06zm8.79 22.74l-9.673-7.28-.84 9.78L-.006 68.29l10.564 14.594 5.5.883 1.98-20.735zM56 7.488l-16.6-7.5.5 12.16 14.942 7.66zm10.32 8.9l-6.9 3.847.8-9.116zm-5.617-8.733L73.93 2.148l-4.98 13.447zm8.17 9.267l-9.015 5.514-1.54 11.03 8.8-5.736zm-15.53 5.89l-.332 8.662-12.285-2.665-.664-11.827zm-14.61 84.783l3.234-31.536.082-20.532 11.65-5.735 1.32 37.5zm13.78-71.957l.166 10.66-11.786 3.168-.166-16.657zm14.16-5.256l-7.915 5.514-1.1 11.25 8.794-7.06zm-8.79 22.743l9.673-7.28.84 9.78 6.862 12.66-10.564 14.597-5.5.883-1.975-20.74z'/></svg>
          <svg class='part' data-position='left-leg' id='left-leg' xmlns='http://www.w3.org/2000/svg' width='93.626' height='250.625' viewBox='0 0 93.626 250.625'><path d='m 18.00179,139.99461 -0.664,5.99 4.647,5.77 1.55,9.1 3.1,1.33 2.655,-13.755 1.77,-4.88 -1.55,-3.107 z m 20.582,0.444 -3.32,9.318 -7.082,13.755 1.77,12.647 5.09,-14.2 4.205,-7.982 z m -26.557,-12.645 5.09,27.29 -3.32,-1.777 -2.656,8.875 z m 22.795,42.374 -1.55,4.88 -3.32,20.634 -0.442,27.51 4.65,26.847 -0.223,-34.39 4.87,-13.754 0.663,-15.087 z m -10.623,12.424 1.106,41.267 c 14.157565,64.57987 -5.846437,10.46082 -16.8199998,-29.07 l 5.5329998,-36.384 z m -9.71,-178.164003 0,22.476 15.71,31.073 9.923,30.850003 -1.033,-21.375 z m 25.49,30.248 0.118,-0.148 -0.793,-2.024 -16.545,-18.16 -1.242,-0.44 10.984,28.378 z m -6.255,10.766 6.812,17.6 2.274,-21.596 -1.344,-3.43 z m -26.4699998,17.82 0.827,25.340003 12.8159998,35.257 -3.928,10.136 -12.6099998,-44.51 z M 31.81879,76.04161 l 0.345,0.826 6.47,15.48 -4.177,38.342 -6.594,-3.526 5.715,-35.7 z m -21.465,-74.697003 0.827,21.373 L 4.1527902,65.02561 0.84679017,30.870607 Z m 2.068,27.323 14.677,32.391 3.307,26.000003 -6.2,36.58 -13.437,-37.241 -0.8269998,-38.342003 z'/></svg>
          <svg class='part' data-position='right-leg' id='right-leg' xmlns='http://www.w3.org/2000/svg' width='80' height='250.625' viewBox='0 0 80 250.625'><path d='m 26.664979,139.7913 0.663,5.99 -4.647,5.77 -1.55,9.1 -3.1,1.33 -2.655,-13.755 -1.77,-4.88 1.55,-3.107 z m -20.5820002,0.444 3.3200005,9.318 7.0799997,13.755 -1.77,12.647 -5.0899997,-14.2 -4.2000005,-7.987 z m 3.7620005,29.73 1.5499997,4.88 3.32,20.633 0.442,27.51 -4.648,26.847 0.22,-34.39 -4.8670002,-13.754 -0.67,-15.087 z m 10.6229997,12.424 -1.107,41.267 -8.852,33.28 9.627,-4.55 16.046,-57.8 -5.533,-36.384 z m -13.9460002,74.991 c -5.157661,19.45233 -2.5788305,9.72616 0,0 z M 30.177979,4.225305 l 0,22.476 -15.713,31.072 -9.9230002,30.850005 1.033,-21.375005 z m -25.4930002,30.249 -0.118,-0.15 0.793,-2.023 16.5450002,-18.16 1.24,-0.44 -10.98,28.377 z m 6.2550002,10.764 -6.8120002,17.6 -2.274,-21.595 1.344,-3.43 z m 26.47,17.82 -0.827,25.342005 -12.816,35.25599 3.927,10.136 12.61,-44.50999 z m -24.565,12.783005 -0.346,0.825 -6.4700002,15.48 4.1780002,38.34199 6.594,-3.527 -5.715,-35.69999 z m 19.792,51.74999 -5.09,27.29 3.32,-1.776 2.655,8.875 z m 1.671,-126.452995 -0.826,21.375 7.03,42.308 3.306,-34.155 z m -2.066,27.325 -14.677,32.392 -3.308,26.000005 6.2,36.57999 13.436,-37.23999 0.827,-38.340005 z'/></svg>
          <svg class='part' data-position='left-hand' id='left-hand' xmlns='http://www.w3.org/2000/svg' width='90' height='38.938' viewBox='0 0 90 38.938'><path d='m 21.255,-0.00198191 2.88,6.90000201 8.412,1.335 0.664,12.4579799 -4.427,17.8 -2.878,-0.22 2.8,-11.847 -2.99,-0.084 -4.676,12.6 -3.544,-0.446 4.4,-12.736 -3.072,-0.584 -5.978,13.543 -4.428,-0.445 6.088,-14.1 -2.1,-1.25 L 4.878,34.934 1.114,34.489 12.4,12.9 11.293,11.12 0.665,15.57 0,13.124 8.635,5.3380201 Z' /></svg>
          <svg class='part' data-position='right-hand' id='right-hand' xmlns='http://www.w3.org/2000/svg' width='90' height='38.938' viewBox='0 0 90 38.938'><path d='m 13.793386,-0.00198533 -2.88,6.90000163 -8.4120002,1.335 -0.664,12.4579837 4.427,17.8 2.878,-0.22 -2.8,-11.847 2.99,-0.084 4.6760002,12.6 3.544,-0.446 -4.4,-12.736 3.072,-0.584 5.978,13.543 4.428,-0.445 -6.088,-14.1 2.1,-1.25 7.528,12.012 3.764,-0.445 -11.286,-21.589 1.107,-1.78 10.628,4.45 0.665,-2.447 -8.635,-7.7859837 z'/></svg>
          <svg class='part' data-position='left-foot' id='left-foot' xmlns='http://www.w3.org/2000/svg' width='30' height='30' viewBox='0 0 30 30'><path d='m 19.558357,1.92821 c -22.1993328,20.55867 -11.0996668,10.27933 0,0 z m 5.975,5.989 -0.664,18.415 -1.55,6.435 -4.647,0 -1.327,-4.437 -1.55,-0.222 0.332,4.437 -5.864,-1.778 -1.5499998,-0.887 -6.64,-1.442 -0.22,-5.214 6.418,-10.87 4.4259998,-5.548 c 9.991542,-3.26362 9.41586,-8.41457 12.836,1.111 z'/></svg>
          <svg class='part' data-position='right-foot' id='right-foot' xmlns='http://www.w3.org/2000/svg' width='90' height='38.938' viewBox='0 0 90 38.938'><path d='m 11.723492,2.35897 c -40.202667,20.558 -20.1013335,10.279 0,0 z m -5.9740005,5.989 0.663,18.415 1.546,6.435 4.6480005,0 1.328,-4.437 1.55,-0.222 -0.333,4.437 5.863,-1.778 1.55,-0.887 6.638,-1.442 0.222,-5.214 -6.418,-10.868 -4.426,-5.547 -10.8440005,-4.437 z'/> </svg>

          <!-- Enhanced Health Metric Cards positioned around the body -->
          <div class="metric-card heart" style="color: ${heartHealth.textColor}">
            <div class="metric-header">
              <div class="metric-icon" style="background: ${heartHealth.color}; color: white;">♥</div>
              <span class="metric-label" style="color: ${heartHealth.textColor};">Heart</span>
              ${heartHealth.alert ? '<div class="alert-indicator">!</div>' : ""}
            </div>
            <div class="metric-value" style="color: ${heartHealth.textColor};">
              <span>${heartRate}</span>
              <span class="metric-unit">BPM</span>
            </div>
            <div class="metric-status" style="background: ${heartHealth.color}; color: white;">
              ${heartHealth.status.toUpperCase()}
            </div>
          </div>

          <div class="metric-card lungs" style="color: ${oxygenHealth.textColor}">
            <div class="metric-header">
              <div class="metric-icon" style="background: ${oxygenHealth.color}; color: white;">O₂</div>
              <span class="metric-label" style="color: ${oxygenHealth.textColor};">Oxygen</span>
              ${oxygenHealth.alert ? '<div class="alert-indicator">!</div>' : ""}
            </div>
            <div class="metric-value" style="color: ${oxygenHealth.textColor};">
              <span>${oxygenLevel}</span>
              <span class="metric-unit">%</span>
            </div>
            <div class="metric-status" style="background: ${oxygenHealth.color}; color: white;">
              ${oxygenHealth.status.toUpperCase()}
            </div>
          </div>

          <div class="metric-card sleep" style="color: ${sleepHealth.textColor}">
            <div class="metric-header">
              <div class="metric-icon" style="background: ${sleepHealth.color}; color: white;">😴</div>
              <span class="metric-label" style="color: ${sleepHealth.textColor};">Sleep</span>
              ${sleepHealth.alert ? '<div class="alert-indicator">!</div>' : ""}
            </div>
            <div class="metric-value" style="color: ${sleepHealth.textColor};">
              <span>${sleepValue}</span>
              <span class="metric-unit">hrs</span>
            </div>
            <div class="metric-status" style="background: ${sleepHealth.color}; color: white;">
              ${sleepHealth.status.toUpperCase()}
            </div>
          </div>

          <div class="metric-card stress" style="color: ${stressHealth.textColor}">
            <div class="metric-header">
              <div class="metric-icon" style="background: ${stressHealth.color}; color: white;">🧠</div>
              <span class="metric-label" style="color: ${stressHealth.textColor};">Stress</span>
              ${stressHealth.alert ? '<div class="alert-indicator">!</div>' : ""}
            </div>
            <div class="metric-value" style="color: ${stressHealth.textColor};">
              <span>${stressValue}</span>
              <span class="metric-unit">/10</span>
            </div>
            <div class="metric-status" style="background: ${stressHealth.color}; color: white;">
              ${stressHealth.status.toUpperCase()}
            </div>
          </div>
        </div>

        <script>
          (function() {
            function postPosition(pos) {
              if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
                window.ReactNativeWebView.postMessage(pos);
              }
            }

            function highlightSelected(part) {
              var all = document.querySelectorAll('.human-body svg');
              all.forEach(function(s) { s.classList.remove('selected'); });
              if (part === 'lungs') part = 'stomach'; // highlight stomach for oxygen
              if (part) {
                var el = document.getElementById(part);
                if (el) el.classList.add('selected');
              }
            }

            window.onload = function () {
              var pieces = document.getElementsByClassName('part');
              for (var i = 0; i < pieces.length; i++) {
                let _piece = pieces[i];
                _piece.onclick = function(t) {
                  let pos = t.target.getAttribute('data-position') || t.target.parentElement.getAttribute('data-position');
                  if (pos) {
                    if (pos === 'lungs') pos = 'stomach'; // treat lungs as stomach for highlight
                    postPosition(pos);
                    highlightSelected(pos);
                  }
                }
              }
              if (window.selectedBodyPart) highlightSelected(window.selectedBodyPart);
            }

            document.addEventListener('message', function(e) {
              try {
                var data = e.data;
                if (data) highlightSelected(data);
              } catch(err){}
            });
          })();
        </script>
      </body>
      </html>
    `

    return (
      <Animated.View
        style={[
          styles.body3DWrapper,
          {
            opacity: fadeAnim,
            transform: [{ scale: pulseAnim }],
          },
        ]}
      >
        <WebView
          originWhitelist={["*"]}
          source={{ html: htmlContent }}
          style={styles.body3DSvg}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          scrollEnabled={false}
          onMessage={(event) => {
            if (event.nativeEvent && event.nativeEvent.data) {
              setSelectedBodyPart(event.nativeEvent.data)
            }
          }}
          injectedJavaScript={
            selectedBodyPart
              ? `window.selectedBodyPart = '${selectedBodyPart}'; if(window.highlightSelected) window.highlightSelected('${selectedBodyPart}'); true;`
              : ""
          }
        />
      </Animated.View>
    )
  }

  const renderRecentLogs = () => (
    <Animated.View
      style={[
        styles.logsContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Health Logs</Text>
        <TouchableOpacity onPress={() => navigation.navigate("HealthLogListScreen")}>
          <Text style={styles.viewAllText}>View All</Text>
        </TouchableOpacity>
      </View>
      {loading ? (
        <ActivityIndicator color="#3B82F6" style={styles.loader} />
      ) : logs.length > 0 ? (
        logs.slice(0, 2).map((item, index) => (
          <View key={item.logId} style={styles.logCard}>
            <View style={styles.logHeader}>
              <Text style={styles.logDate}>
                {new Date(item.recordedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
              <View style={styles.logActions}>
                <TouchableOpacity
                  onPress={() => navigation.navigate("HealthLogEditScreen", { logId: item.logId })}
                  style={styles.editButton}
                >
                  <Ionicons name="pencil" size={16} color="#3B82F6" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setSelectedLog(item)
                    setShowDeleteModal(true)
                  }}
                  style={styles.deleteButton}
                >
                  <Ionicons name="trash" size={16} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.logMetrics}>
              <View style={styles.logMetric}>
                <Ionicons name="heart" size={14} color="#EF4444" />
                <Text style={styles.logMetricText}>{item.heartRate} BPM</Text>
              </View>
              <View style={styles.logMetric}>
                <MaterialCommunityIcons name="lungs" size={14} color="#3B82F6" />
                <Text style={styles.logMetricText}>{item.bloodOxygenLevel}%</Text>
              </View>
              <View style={styles.logMetric}>
                <Ionicons name="bed" size={14} color="#8B5CF6" />
                <Text style={styles.logMetricText}>{item.sleepDuration}h</Text>
              </View>
              {/* Added Stress Level */}
              <View style={styles.logMetric}>
                <MaterialCommunityIcons name="brain" size={14} color="#F59E0B" />
                <Text style={styles.logMetricText}>{item.stressLevel || 5}/10</Text>
              </View>
            </View>
          </View>
        ))
      ) : (
        <View style={styles.noDataContainer}>
          <MaterialCommunityIcons name="heart-pulse" size={48} color="#CBD5E1" />
          <Text style={styles.noDataText}>No health logs yet</Text>
          <Text style={styles.noDataSubtext}>Start tracking your health journey</Text>
        </View>
      )}
    </Animated.View>
  )

  return (
    <View style={[styles.container, { backgroundColor: '#fff' }]}>
      <SafeAreaView style={styles.safeArea}>
        <Header
          title="Health Overview"
          subtitle="Interactive 3D Body Analytics"
          showBack
          onBack={() => navigation.goBack()}
          rightButtonIcon="add"
          onRightButtonPress={() => navigation.navigate("HealthLogCreateScreen")}
        />

        <ScrollView style={[styles.scrollContainer, { marginTop: 50 }]} showsVerticalScrollIndicator={false}>
          {/* Compact Health Metrics Overview - positioned right under header */}
          {renderCompactHealthMetrics()}

          {/* 3D Human Body */}
          {loadingStats ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text style={styles.loadingText}>Loading 3D body analytics...</Text>
            </View>
          ) : stats ? (
            renderEnhancedHumanBody()
          ) : (
            <View style={styles.noDataContainer}>
              <MaterialCommunityIcons name="human-handsup" size={80} color="#CBD5E1" />
              <Text style={styles.noDataText}>No health data available</Text>
              <Text style={styles.noDataSubtext}>Start logging to see your 3D body metrics</Text>
            </View>
          )}

          {/* Recent Health Logs */}
          {renderRecentLogs()}
        </ScrollView>

        <Modal visible={showDeleteModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <Animated.View style={[styles.modalContainer, { transform: [{ scale: scaleAnim }] }]}>
              <View style={styles.modalHeader}>
                <Ionicons name="trash" size={32} color="#EF4444" />
                <Text style={styles.modalTitle}>Delete Health Log</Text>
                <Text style={styles.modalMessage}>
                  Are you sure you want to delete this health log? This action cannot be undone.
                </Text>
              </View>
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setShowDeleteModal(false)}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteModalButton} onPress={() => handleDelete(selectedLog?.logId)}>
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },

  // Compact Health Metrics Overview Styles
  compactMetricsContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  metricsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  compactSectionTitle: {
    fontSize: 16, // Đề mục lớn: 16
    fontWeight: "700",
    color: "#1E293B",
  },
  addMetricButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#EBF4FF",
    justifyContent: "center",
    alignItems: "center",
  },
  compactMetricsGrid: {
    gap: 12,
  },
  compactMetricsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
  },
  compactMetricItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
  },
  compactMetricIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  compactMetricContent: {
    flex: 1,
  },
  compactMetricValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 2,
  },
  compactMetricLabel: {
    fontSize: 14, // Label nhỏ: 14
    color: "#64748B",
    fontWeight: "500",
  },
  compactDivider: {
    width: 1,
    height: 32,
    backgroundColor: "#E2E8F0",
    marginHorizontal: 16,
  },
  compactAlertDot: {
    position: "absolute",
    top: -2,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
  },
  compactLoadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
  },
  compactLoadingText: {
    fontSize: 14,
    color: "#64748B",
    marginLeft: 8,
    fontWeight: "500",
  },
  compactNoDataContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  compactNoDataText: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 8,
    fontWeight: "500",
  },

  // 3D Body Styles
  body3DWrapper: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 20,
    paddingVertical: 20,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    borderRadius: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  body3DSvg: {
    width: 340,
    height: 640,
    backgroundColor: "transparent",
    borderRadius: 20,
  },

  // Recent Logs Styles
  logsContainer: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 16, // Đề mục lớn: 16
    fontWeight: "800",
    color: "#1E293B",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  viewAllText: {
    color: "#3B82F6",
    fontWeight: "700",
    fontSize: 12, // Giá trị/Value: 12
  },
  logCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  logHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  logDate: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
  },
  logActions: {
    flexDirection: "row",
    gap: 10,
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#DBEAFE",
    justifyContent: "center",
    alignItems: "center",
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
  },
  logMetrics: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
  },
  logMetric: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minWidth: "22%",
  },
  logMetricText: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
  },

  // Loading & No Data Styles
  loadingContainer: {
    alignItems: "center",
    paddingVertical: 50,
  },
  loadingText: {
    fontSize: 16,
    color: "#64748B",
    marginTop: 15,
    fontWeight: "600",
  },
  noDataContainer: {
    alignItems: "center",
    paddingVertical: 50,
  },
  noDataText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#64748B",
    marginTop: 15,
  },
  noDataSubtext: {
    fontSize: 14,
    color: "#94A3B8",
    marginTop: 6,
    textAlign: "center",
  },
  loader: {
    marginVertical: 32,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 28,
    width: "100%",
    maxWidth: 360,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  modalHeader: {
    alignItems: "center",
    marginBottom: 28,
  },
  modalTitle: {
    fontSize: 16, // Đề mục lớn: 16
    fontWeight: "800",
    color: "#1E293B",
    marginTop: 15,
    marginBottom: 10,
  },
  modalMessage: {
    fontSize: 16,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 24,
  },
  modalActions: {
    flexDirection: "row",
    gap: 15,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 16,
    alignItems: "center",
    backgroundColor: "#F1F5F9",
  },
  deleteModalButton: {
    flex: 1,
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 16,
    alignItems: "center",
    backgroundColor: "#EF4444",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#64748B",
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
})
