import { View,Text,StyleSheet,Image,ScrollView,FlatList } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { LineChart,BarChart } from "react-native-chart-kit"
import { Dimensions } from "react-native"

const { width } = Dimensions.get("window")

const UserProfileContent = ({ userProfile,formatDate,onClose }) => {
    if (!userProfile) return <Text style={styles.noDataText}>No user data available.</Text>

    const getAverage = (logs,key) => {
        if (logs.length === 0) return 0
        const sum = logs.reduce((acc,log) => acc + (log[key] || 0),0)
        return Math.round(sum / logs.length)
    }

    const isAbnormal = (key,value,gender) => {
        switch (key) {
            case "heartRate":
                return value < 60 || value > 100
            case "bloodOxygenLevel":
                return value < 95
            case "bodyFatPercentage":
                if (gender === "Male") return value > 25
                if (gender === "Female") return value > 32
                return false
            default:
                return false
        }
    }

    const renderValue = (key,value,gender) => {
        const abnormal = isAbnormal(key,value,gender)
        return (
            <View style={styles.valueContainer}>
                <Text style={[styles.profileValue,abnormal && styles.abnormalValue]}>{value}</Text>
                {abnormal && (
                    <View style={styles.warningBadge}>
                        <Ionicons name="warning" size={12} color="#FFFFFF" />
                    </View>
                )}
            </View>
        )
    }

    const chartConfig = {
        backgroundColor: "#FFFFFF",
        backgroundGradientFrom: "#FFFFFF",
        backgroundGradientTo: "#F8FAFC",
        decimalPlaces: 1,
        color: (opacity = 1) => `rgba(0, 86, 210, ${opacity})`,
        labelColor: (opacity = 1) => `rgba(71, 85, 105, ${opacity})`,
        style: {
            borderRadius: 20,
        },
        propsForDots: {
            r: "5",
            strokeWidth: "3",
            stroke: "#0056D2",
            fill: "#FFFFFF",
        },
        propsForVerticalLabels: {
            fontSize: 12,
        },
        fromZero: true,
    }

    const StatCard = ({ icon,label,value,color = "#0056D2" }) => (
        <View style={styles.modernStatCard}>
            <View style={[styles.statIconContainer,{ backgroundColor: `${color}15` }]}>
                <Ionicons name={icon} size={20} color={color} />
            </View>
            <Text style={styles.statLabel}>{label}</Text>
            <Text style={styles.statValue}>{value}</Text>
        </View>
    )

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
        >
            {/* Header Profile Section */}
            <View style={styles.headerSection}>
                <View style={styles.avatarContainer}>
                    <View style={styles.avatarBorder}>
                        <Image source={{ uri: userProfile.avatar }} style={styles.userAvatar} />
                    </View>
                    <View style={styles.onlineIndicator} />
                </View>

                <View style={styles.userInfo}>
                    <Text style={styles.userName}>{userProfile.fullName}</Text>
                    <Text style={styles.userEmail}>{userProfile.email}</Text>

                    <View style={styles.userDetailsContainer}>
                        <View style={styles.detailItem}>
                            <Ionicons name="call" size={14} color="#64748B" />
                            <Text style={styles.detailText}>{userProfile.phone}</Text>
                        </View>
                        <View style={styles.detailItem}>
                            <Ionicons name="transgender" size={14} color="#64748B" />
                            <Text style={styles.detailText}>{userProfile.gender}</Text>
                        </View>
                        <View style={styles.detailItem}>
                            <Ionicons name="calendar" size={14} color="#64748B" />
                            <Text style={styles.detailText}>{formatDate(userProfile.birthDate)}</Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* Stats Grid */}
            <View style={styles.statsGrid}>
                <StatCard icon="trophy" label="Level" value={userProfile.levelAccount} color="#F59E0B" />
                <StatCard icon="flame" label="Streak" value={`${userProfile.currentStreak} days`} color="#EF4444" />
                <StatCard icon="star" label="Experience" value={userProfile.experience} color="#8B5CF6" />
            </View>

            {/* Profile Information */}
            {userProfile.profiles && userProfile.profiles.length > 0 && (
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionIconContainer}>
                            <Ionicons name="body" size={20} color="#0056D2" />
                        </View>
                        <Text style={styles.sectionTitle}>Physical Profile</Text>
                    </View>

                    <View style={styles.modernCard}>
                        <View style={styles.profileGrid}>
                            <View style={styles.profileItem}>
                                <Text style={styles.profileLabel}>Height</Text>
                                <Text style={styles.profileValue}>{userProfile.profiles[0].height} cm</Text>
                            </View>
                            <View style={styles.profileItem}>
                                <Text style={styles.profileLabel}>Weight</Text>
                                <Text style={styles.profileValue}>{userProfile.profiles[0].weight} kg</Text>
                            </View>
                            <View style={styles.profileItem}>
                                <Text style={styles.profileLabel}>Body Fat</Text>
                                {renderValue("bodyFatPercentage",`${userProfile.profiles[0].bodyFatPercentage}%`,userProfile.gender)}
                            </View>
                            <View style={styles.profileItem}>
                                <Text style={styles.profileLabel}>Activity Level</Text>
                                <Text style={styles.profileValue}>{userProfile.profiles[0].activityLevel}</Text>
                            </View>
                        </View>

                        <View style={styles.separator} />

                        <View style={styles.goalSection}>
                            <View style={styles.goalItem}>
                                <Ionicons name="restaurant" size={16} color="#0056D2" />
                                <Text style={styles.goalText}>{userProfile.profiles[0].dietaryPreference}</Text>
                            </View>
                            <View style={styles.goalItem}>
                                <Ionicons name="fitness" size={16} color="#0056D2" />
                                <Text style={styles.goalText}>{userProfile.profiles[0].fitnessGoal}</Text>
                            </View>
                        </View>
                    </View>
                </View>
            )}

            {/* Body Measurements */}
            {userProfile.bodyMeasurements && userProfile.bodyMeasurements.length > 0 && (
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionIconContainer}>
                            <Ionicons name="scale" size={20} color="#0056D2" />
                        </View>
                        <Text style={styles.sectionTitle}>Body Measurements</Text>
                    </View>

                    <FlatList
                        data={userProfile.bodyMeasurements}
                        keyExtractor={(item,index) => index.toString()}
                        renderItem={({ item,index }) => (
                            <View style={styles.measurementCard}>
                                <View style={styles.cardHeader}>
                                    <Text style={styles.cardTitle}>Measurement {index + 1}</Text>
                                    <View style={styles.cardBadge}>
                                        <Text style={styles.cardBadgeText}>Latest</Text>
                                    </View>
                                </View>

                                <View style={styles.measurementGrid}>
                                    <View style={styles.measurementRow}>
                                        <View style={styles.measurementItem}>
                                            <Text style={styles.measurementLabel}>Weight</Text>
                                            <Text style={styles.measurementValue}>{item.weight} kg</Text>
                                        </View>
                                        <View style={styles.measurementItem}>
                                            <Text style={styles.measurementLabel}>Body Fat</Text>
                                            {renderValue("bodyFatPercentage",`${item.bodyFatPercentage}%`,userProfile.gender)}
                                        </View>
                                    </View>

                                    <View style={styles.measurementRow}>
                                        <View style={styles.measurementItem}>
                                            <Text style={styles.measurementLabel}>Chest</Text>
                                            <Text style={styles.measurementValue}>{item.chestCm} cm</Text>
                                        </View>
                                        <View style={styles.measurementItem}>
                                            <Text style={styles.measurementLabel}>Waist</Text>
                                            <Text style={styles.measurementValue}>{item.waistCm} cm</Text>
                                        </View>
                                    </View>

                                    <View style={styles.measurementRow}>
                                        <View style={styles.measurementItem}>
                                            <Text style={styles.measurementLabel}>Bicep</Text>
                                            <Text style={styles.measurementValue}>{item.bicepCm} cm</Text>
                                        </View>
                                        <View style={styles.measurementItem}>
                                            <Text style={styles.measurementLabel}>Thigh</Text>
                                            <Text style={styles.measurementValue}>{item.thighCm} cm</Text>
                                        </View>
                                    </View>

                                    <View style={styles.measurementRow}>
                                        <View style={styles.measurementItem}>
                                            <Text style={styles.measurementLabel}>Neck</Text>
                                            <Text style={styles.measurementValue}>{item.neckCm} cm</Text>
                                        </View>
                                        <View style={styles.measurementItem}>
                                            <Text style={styles.measurementLabel}>Hip</Text>
                                            <Text style={styles.measurementValue}>{item.hipCm} cm</Text>
                                        </View>
                                    </View>
                                </View>

                                {item.notes && (
                                    <View style={styles.notesContainer}>
                                        <Ionicons name="document-text" size={14} color="#64748B" />
                                        <Text style={styles.notesText}>{item.notes}</Text>
                                    </View>
                                )}
                            </View>
                        )}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.horizontalList}
                        snapToInterval={width - 32}
                        decelerationRate="fast"
                        pagingEnabled
                    />

                    <View style={styles.chartContainer}>
                        <Text style={styles.chartTitle}>Weight Progress</Text>
                        <LineChart
                            data={{
                                labels: userProfile.bodyMeasurements.map((meas,index) => `M${index + 1}`),
                                datasets: [
                                    {
                                        data: userProfile.bodyMeasurements.map((meas) => meas.weight || 0),
                                        strokeWidth: 3,
                                    },
                                ],
                            }}
                            width={width - 64}
                            height={200}
                            chartConfig={chartConfig}
                            bezier
                            style={styles.chart}
                        />
                    </View>
                </View>
            )}

            {/* Health Logs */}
            {userProfile.healthLogs && userProfile.healthLogs.length > 0 && (
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionIconContainer}>
                            <Ionicons name="heart" size={20} color="#EF4444" />
                        </View>
                        <Text style={styles.sectionTitle}>Health Monitoring</Text>
                    </View>

                    <FlatList
                        data={userProfile.healthLogs}
                        keyExtractor={(item) => item.logId.toString()}
                        renderItem={({ item }) => (
                            <View style={styles.healthCard}>
                                <View style={styles.cardHeader}>
                                    <Text style={styles.cardTitle}>{formatDate(item.recordedAt)}</Text>
                                    <View style={[styles.moodIndicator,{ backgroundColor: getMoodColor(item.mood) }]}>
                                        <Text style={styles.moodText}>{item.mood}</Text>
                                    </View>
                                </View>

                                <View style={styles.healthMetrics}>
                                    <View style={styles.metricCard}>
                                        <Ionicons name="heart" size={16} color="#EF4444" />
                                        <Text style={styles.metricLabel}>Heart Rate</Text>
                                        {renderValue("heartRate",`${item.heartRate} bpm`,userProfile.gender)}
                                    </View>

                                    <View style={styles.metricCard}>
                                        <Ionicons name="water" size={16} color="#0EA5E9" />
                                        <Text style={styles.metricLabel}>Blood Oxygen</Text>
                                        {renderValue("bloodOxygenLevel",`${item.bloodOxygenLevel}%`,userProfile.gender)}
                                    </View>

                                    <View style={styles.metricCard}>
                                        <Ionicons name="fitness" size={16} color="#8B5CF6" />
                                        <Text style={styles.metricLabel}>Blood Pressure</Text>
                                        <Text style={styles.metricValue}>{item.bloodPressure}</Text>
                                    </View>

                                    <View style={styles.metricCard}>
                                        <Ionicons name="moon" size={16} color="#64748B" />
                                        <Text style={styles.metricLabel}>Sleep</Text>
                                        <Text style={styles.metricValue}>{item.sleepDuration}h</Text>
                                    </View>
                                </View>

                                <View style={styles.additionalMetrics}>
                                    <View style={styles.additionalMetric}>
                                        <Text style={styles.additionalLabel}>Sleep Quality</Text>
                                        <Text style={styles.additionalValue}>{item.sleepQuality}</Text>
                                    </View>
                                    <View style={styles.additionalMetric}>
                                        <Text style={styles.additionalLabel}>Stress Level</Text>
                                        <Text style={styles.additionalValue}>{item.stressLevel}</Text>
                                    </View>
                                </View>
                            </View>
                        )}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.horizontalList}
                        snapToInterval={width - 32}
                        decelerationRate="fast"
                        pagingEnabled
                    />

                    <View style={styles.chartContainer}>
                        <Text style={styles.chartTitle}>Heart Rate Trend</Text>
                        <LineChart
                            data={{
                                labels: userProfile.healthLogs.map((log,index) => `D${index + 1}`),
                                datasets: [
                                    {
                                        data: userProfile.healthLogs.map((log) => log.heartRate || 0),
                                        strokeWidth: 3,
                                        color: () => "#EF4444",
                                    },
                                ],
                            }}
                            width={width - 64}
                            height={200}
                            chartConfig={{
                                ...chartConfig,
                                color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
                            }}
                            bezier
                            style={styles.chart}
                        />
                    </View>
                </View>
            )}

            {/* Nutrition Logs */}
            {userProfile.nutritionLogs && userProfile.nutritionLogs.length > 0 && (
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionIconContainer}>
                            <Ionicons name="nutrition" size={20} color="#10B981" />
                        </View>
                        <Text style={styles.sectionTitle}>Nutrition Tracking</Text>
                    </View>

                    <FlatList
                        data={userProfile.nutritionLogs}
                        keyExtractor={(item) => item.logId.toString()}
                        renderItem={({ item }) => (
                            <View style={styles.nutritionCard}>
                                <View style={styles.cardHeader}>
                                    <Text style={styles.cardTitle}>{item.foodName}</Text>
                                    <View style={styles.ratingContainer}>
                                        {[...Array(5)].map((_,i) => (
                                            <Ionicons
                                                key={i}
                                                name={i < item.satisfactionRating ? "star" : "star-outline"}
                                                size={12}
                                                color="#F59E0B"
                                            />
                                        ))}
                                    </View>
                                </View>

                                <Text style={styles.consumptionDate}>{formatDate(item.consumptionDate)}</Text>

                                <View style={styles.nutritionMetrics}>
                                    <View style={styles.nutritionMetric}>
                                        <View style={[styles.nutritionIcon,{ backgroundColor: "#EF444415" }]}>
                                            <Ionicons name="flame" size={16} color="#EF4444" />
                                        </View>
                                        <Text style={styles.nutritionLabel}>Calories</Text>
                                        <Text style={styles.nutritionValue}>{item.calories}</Text>
                                    </View>

                                    <View style={styles.nutritionMetric}>
                                        <View style={[styles.nutritionIcon,{ backgroundColor: "#0EA5E915" }]}>
                                            <Ionicons name="fitness" size={16} color="#0EA5E9" />
                                        </View>
                                        <Text style={styles.nutritionLabel}>Protein</Text>
                                        <Text style={styles.nutritionValue}>{item.protein}g</Text>
                                    </View>

                                    <View style={styles.nutritionMetric}>
                                        <View style={[styles.nutritionIcon,{ backgroundColor: "#F59E0B15" }]}>
                                            <Ionicons name="leaf" size={16} color="#F59E0B" />
                                        </View>
                                        <Text style={styles.nutritionLabel}>Carbs</Text>
                                        <Text style={styles.nutritionValue}>{item.carbs}g</Text>
                                    </View>

                                    <View style={styles.nutritionMetric}>
                                        <View style={[styles.nutritionIcon,{ backgroundColor: "#8B5CF615" }]}>
                                            <Ionicons name="water" size={16} color="#8B5CF6" />
                                        </View>
                                        <Text style={styles.nutritionLabel}>Fats</Text>
                                        <Text style={styles.nutritionValue}>{item.fats}g</Text>
                                    </View>
                                </View>

                                <View style={styles.servingInfo}>
                                    <Text style={styles.servingLabel}>Serving Size: </Text>
                                    <Text style={styles.servingValue}>{item.servingSize}</Text>
                                </View>

                                {item.notes && (
                                    <View style={styles.notesContainer}>
                                        <Ionicons name="document-text" size={14} color="#64748B" />
                                        <Text style={styles.notesText}>{item.notes}</Text>
                                    </View>
                                )}
                            </View>
                        )}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.horizontalList}
                        snapToInterval={width - 32}
                        decelerationRate="fast"
                        pagingEnabled
                    />

                    <View style={styles.chartContainer}>
                        <Text style={styles.chartTitle}>Nutrition Overview (Average)</Text>
                        <BarChart
                            data={{
                                labels: ["Cal","Protein","Carbs","Fats"],
                                datasets: [
                                    {
                                        data: [
                                            getAverage(userProfile.nutritionLogs,"calories"),
                                            getAverage(userProfile.nutritionLogs,"protein"),
                                            getAverage(userProfile.nutritionLogs,"carbs"),
                                            getAverage(userProfile.nutritionLogs,"fats"),
                                        ],
                                    },
                                ],
                            }}
                            width={width - 64}
                            height={200}
                            yAxisSuffix=""
                            chartConfig={{
                                ...chartConfig,
                                barPercentage: 0.7,
                                color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
                            }}
                            style={styles.chart}
                        />
                    </View>
                </View>
            )}

            {/* Activities */}
            {userProfile.activities && userProfile.activities.length > 0 && (
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionIconContainer}>
                            <Ionicons name="walk" size={20} color="#F59E0B" />
                        </View>
                        <Text style={styles.sectionTitle}>Activity Tracking</Text>
                    </View>

                    <FlatList
                        data={userProfile.activities}
                        keyExtractor={(item) => item.activityId.toString()}
                        renderItem={({ item }) => (
                            <View style={styles.activityCard}>
                                <View style={styles.cardHeader}>
                                    <View style={styles.activityHeader}>
                                        <Ionicons name={getActivityIcon(item.activityType)} size={20} color="#0056D2" />
                                        <Text style={styles.cardTitle}>{item.activityType}</Text>
                                    </View>
                                    <View style={[styles.statusBadge,{ backgroundColor: getStatusColor(item.status) }]}>
                                        <Text style={styles.statusText}>{item.status}</Text>
                                    </View>
                                </View>

                                <Text style={styles.activityLocation}>{item.location}</Text>
                                <Text style={styles.activityDate}>{formatDate(item.recordedAt)}</Text>

                                <View style={styles.activityMetrics}>
                                    <View style={styles.activityMetric}>
                                        <Ionicons name="footsteps" size={16} color="#0056D2" />
                                        <Text style={styles.activityMetricLabel}>Steps</Text>
                                        <Text style={styles.activityMetricValue}>{item.steps?.toLocaleString()}</Text>
                                    </View>

                                    <View style={styles.activityMetric}>
                                        <Ionicons name="flame" size={16} color="#EF4444" />
                                        <Text style={styles.activityMetricLabel}>Calories</Text>
                                        <Text style={styles.activityMetricValue}>{item.caloriesBurned}</Text>
                                    </View>

                                    <View style={styles.activityMetric}>
                                        <Ionicons name="location" size={16} color="#10B981" />
                                        <Text style={styles.activityMetricLabel}>Distance</Text>
                                        <Text style={styles.activityMetricValue}>{item.distanceKm} km</Text>
                                    </View>

                                    <View style={styles.activityMetric}>
                                        <Ionicons name="time" size={16} color="#8B5CF6" />
                                        <Text style={styles.activityMetricLabel}>Duration</Text>
                                        <Text style={styles.activityMetricValue}>{item.durationMinutes}m</Text>
                                    </View>
                                </View>

                                <View style={styles.additionalInfo}>
                                    <View style={styles.infoItem}>
                                        <Text style={styles.infoLabel}>Heart Rate:</Text>
                                        {renderValue("heartRate",`${item.heartRate} bpm`,userProfile.gender)}
                                    </View>
                                    <View style={styles.infoItem}>
                                        <Text style={styles.infoLabel}>Goal Status:</Text>
                                        <Text style={styles.infoValue}>{item.goalStatus}</Text>
                                    </View>
                                </View>
                            </View>
                        )}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.horizontalList}
                        snapToInterval={width - 32}
                        decelerationRate="fast"
                        pagingEnabled
                    />

                    <View style={styles.chartContainer}>
                        <Text style={styles.chartTitle}>Steps Progress</Text>
                        <LineChart
                            data={{
                                labels: userProfile.activities.map((act,index) => `A${index + 1}`),
                                datasets: [
                                    {
                                        data: userProfile.activities.map((act) => act.steps || 0),
                                        strokeWidth: 3,
                                        color: () => "#F59E0B",
                                    },
                                ],
                            }}
                            width={width - 64}
                            height={200}
                            chartConfig={{
                                ...chartConfig,
                                color: (opacity = 1) => `rgba(245, 158, 11, ${opacity})`,
                            }}
                            bezier
                            style={styles.chart}
                        />
                    </View>
                </View>
            )}

            {/* Workout Sessions */}
            {userProfile.workoutSessions && userProfile.workoutSessions.length > 0 && (
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionIconContainer}>
                            <Ionicons name="fitness" size={20} color="#8B5CF6" />
                        </View>
                        <Text style={styles.sectionTitle}>Workout Sessions</Text>
                    </View>

                    <FlatList
                        data={userProfile.workoutSessions}
                        keyExtractor={(item) => item.sessionId.toString()}
                        renderItem={({ item }) => (
                            <View style={styles.workoutCard}>
                                <View style={styles.cardHeader}>
                                    <Text style={styles.cardTitle}>Session #{item.sessionId}</Text>
                                    <View style={[styles.statusBadge,{ backgroundColor: getStatusColor(item.status) }]}>
                                        <Text style={styles.statusText}>{item.status}</Text>
                                    </View>
                                </View>

                                <View style={styles.workoutTiming}>
                                    <View style={styles.timingItem}>
                                        <Ionicons name="play" size={14} color="#10B981" />
                                        <Text style={styles.timingLabel}>Start:</Text>
                                        <Text style={styles.timingValue}>{formatDate(item.startTime)}</Text>
                                    </View>
                                    <View style={styles.timingItem}>
                                        <Ionicons name="stop" size={14} color="#EF4444" />
                                        <Text style={styles.timingLabel}>End:</Text>
                                        <Text style={styles.timingValue}>{formatDate(item.endTime)}</Text>
                                    </View>
                                </View>

                                <View style={styles.workoutStats}>
                                    <View style={styles.workoutStat}>
                                        <View style={[styles.statIconBg,{ backgroundColor: "#EF444415" }]}>
                                            <Ionicons name="flame" size={20} color="#EF4444" />
                                        </View>
                                        <Text style={styles.workoutStatLabel}>Calories Burned</Text>
                                        <Text style={styles.workoutStatValue}>{item.totalCaloriesBurned}</Text>
                                    </View>

                                    <View style={styles.workoutStat}>
                                        <View style={[styles.statIconBg,{ backgroundColor: "#0056D215" }]}>
                                            <Ionicons name="time" size={20} color="#0056D2" />
                                        </View>
                                        <Text style={styles.workoutStatLabel}>Duration</Text>
                                        <Text style={styles.workoutStatValue}>{item.totalDurationMinutes}m</Text>
                                    </View>
                                </View>

                                {item.notes && (
                                    <View style={styles.notesContainer}>
                                        <Ionicons name="document-text" size={14} color="#64748B" />
                                        <Text style={styles.notesText}>{item.notes}</Text>
                                    </View>
                                )}

                                <Text style={styles.createdDate}>Created: {formatDate(item.createdAt)}</Text>
                            </View>
                        )}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.horizontalList}
                        snapToInterval={width - 32}
                        decelerationRate="fast"
                        pagingEnabled
                    />

                    <View style={styles.chartContainer}>
                        <Text style={styles.chartTitle}>Workout Intensity</Text>
                        <LineChart
                            data={{
                                labels: userProfile.workoutSessions.map((sess,index) => `W${index + 1}`),
                                datasets: [
                                    {
                                        data: userProfile.workoutSessions.map((sess) => sess.totalCaloriesBurned || 0),
                                        strokeWidth: 3,
                                        color: () => "#8B5CF6",
                                    },
                                ],
                            }}
                            width={width - 64}
                            height={200}
                            chartConfig={{
                                ...chartConfig,
                                color: (opacity = 1) => `rgba(139, 92, 246, ${opacity})`,
                            }}
                            bezier
                            style={styles.chart}
                        />
                    </View>
                </View>
            )}

            {/* Health Standards */}
            <View style={styles.healthStandards}>
                <View style={styles.standardsHeader}>
                    <Ionicons name="information-circle" size={20} color="#0056D2" />
                    <Text style={styles.standardsTitle}>Health Reference Standards</Text>
                </View>

                <View style={styles.standardsList}>
                    <View style={styles.standardItem}>
                        <View style={styles.standardIcon}>
                            <Ionicons name="heart" size={16} color="#EF4444" />
                        </View>
                        <Text style={styles.standardText}>Heart Rate: 60-100 bpm (Normal)</Text>
                    </View>

                    <View style={styles.standardItem}>
                        <View style={styles.standardIcon}>
                            <Ionicons name="water" size={16} color="#0EA5E9" />
                        </View>
                        <Text style={styles.standardText}>Blood Oxygen: ≥95% (Normal)</Text>
                    </View>

                    <View style={styles.standardItem}>
                        <View style={styles.standardIcon}>
                            <Ionicons name="body" size={16} color="#F59E0B" />
                        </View>
                        <Text style={styles.standardText}>Body Fat (Male): ≤25% (Normal)</Text>
                    </View>

                    <View style={styles.standardItem}>
                        <View style={styles.standardIcon}>
                            <Ionicons name="body" size={16} color="#EC4899" />
                        </View>
                        <Text style={styles.standardText}>Body Fat (Female): ≤32% (Normal)</Text>
                    </View>
                </View>
            </View>
        </ScrollView>
    )

    // Helper functions
    function getMoodColor(mood) {
        const moodColors = {
            Happy: "#10B981",
            Good: "#0EA5E9",
            Neutral: "#F59E0B",
            Sad: "#EF4444",
            Stressed: "#8B5CF6",
        }
        return moodColors[mood] || "#64748B"
    }

    function getActivityIcon(activityType) {
        const icons = {
            Running: "walk",
            Walking: "walk",
            Cycling: "bicycle",
            Swimming: "water",
            Gym: "fitness",
            Yoga: "leaf",
        }
        return icons[activityType] || "fitness"
    }

    function getStatusColor(status) {
        const colors = {
            Completed: "#10B981",
            "In Progress": "#F59E0B",
            Planned: "#0EA5E9",
            Cancelled: "#EF4444",
        }
        return colors[status] || "#64748B"
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F8FAFC",
    },
    contentContainer: {
        paddingBottom: 32,
    },

    // Header Section
    headerSection: {
        backgroundColor: "#FFFFFF",
        paddingHorizontal: 24,
        paddingVertical: 32,
        marginBottom: 16,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0,height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 8,
    },
    avatarContainer: {
        alignItems: "center",
        marginBottom: 20,
        position: "relative",
    },
    avatarBorder: {
        borderWidth: 4,
        borderColor: "#0056D2",
        borderRadius: 60,
        padding: 4,
        backgroundColor: "#FFFFFF",
        shadowColor: "#0056D2",
        shadowOffset: { width: 0,height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 8,
    },
    userAvatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
    },
    onlineIndicator: {
        position: "absolute",
        bottom: 8,
        right: 8,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: "#10B981",
        borderWidth: 3,
        borderColor: "#FFFFFF",
    },
    userInfo: {
        alignItems: "center",
    },
    userName: {
        fontSize: 28,
        fontWeight: "800",
        color: "#1E293B",
        marginBottom: 4,
        textAlign: "center",
    },
    userEmail: {
        fontSize: 16,
        color: "#64748B",
        marginBottom: 20,
        textAlign: "center",
    },
    userDetailsContainer: {
        alignItems: "center",
        gap: 8,
    },
    detailItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    detailText: {
        fontSize: 14,
        color: "#64748B",
        fontWeight: "500",
    },

    // Stats Grid
    statsGrid: {
        flexDirection: "row",
        paddingHorizontal: 16,
        gap: 12,
        marginBottom: 24,
    },
    modernStatCard: {
        flex: 1,
        backgroundColor: "#FFFFFF",
        borderRadius: 20,
        padding: 20,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0,height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 4,
    },
    statIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 12,
    },
    statLabel: {
        fontSize: 12,
        color: "#64748B",
        fontWeight: "600",
        textTransform: "uppercase",
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    statValue: {
        fontSize: 18,
        fontWeight: "800",
        color: "#1E293B",
    },

    // Section Styles
    section: {
        marginBottom: 32,
        paddingHorizontal: 16,
    },
    sectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 16,
        paddingHorizontal: 8,
    },
    sectionIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#0056D215",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#1E293B",
    },

    // Modern Card Styles
    modernCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 20,
        padding: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0,height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 6,
    },
    profileGrid: {
        gap: 16,
    },
    profileItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 8,
    },
    profileLabel: {
        fontSize: 15,
        color: "#64748B",
        fontWeight: "500",
    },
    profileValue: {
        fontSize: 15,
        color: "#1E293B",
        fontWeight: "700",
    },
    valueContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    warningBadge: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: "#EF4444",
        alignItems: "center",
        justifyContent: "center",
    },
    abnormalValue: {
        color: "#EF4444",
        fontWeight: "800",
    },
    separator: {
        height: 1,
        backgroundColor: "#E2E8F0",
        marginVertical: 20,
    },
    goalSection: {
        gap: 12,
    },
    goalItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 8,
    },
    goalText: {
        fontSize: 15,
        color: "#1E293B",
        fontWeight: "600",
    },

    // Horizontal List
    horizontalList: {
        paddingHorizontal: 8,
        marginBottom: 20,
    },

    // Card Styles
    measurementCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 20,
        padding: 24,
        marginRight: 16,
        width: width - 32,
        shadowColor: "#000",
        shadowOffset: { width: 0,height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 6,
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#F1F5F9",
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1E293B",
    },
    cardBadge: {
        backgroundColor: "#0056D2",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    cardBadgeText: {
        fontSize: 12,
        color: "#FFFFFF",
        fontWeight: "600",
    },
    measurementGrid: {
        gap: 16,
    },
    measurementRow: {
        flexDirection: "row",
        gap: 16,
    },
    measurementItem: {
        flex: 1,
        backgroundColor: "#F8FAFC",
        borderRadius: 12,
        padding: 16,
        alignItems: "center",
    },
    measurementLabel: {
        fontSize: 12,
        color: "#64748B",
        fontWeight: "600",
        marginBottom: 4,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    measurementValue: {
        fontSize: 16,
        color: "#1E293B",
        fontWeight: "800",
    },

    // Health Card
    healthCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 20,
        padding: 24,
        marginRight: 16,
        width: width - 32,
        shadowColor: "#000",
        shadowOffset: { width: 0,height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 6,
    },
    moodIndicator: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    moodText: {
        fontSize: 12,
        color: "#FFFFFF",
        fontWeight: "600",
    },
    healthMetrics: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 12,
        marginBottom: 16,
    },
    metricCard: {
        flex: 1,
        minWidth: "45%",
        backgroundColor: "#F8FAFC",
        borderRadius: 12,
        padding: 16,
        alignItems: "center",
        gap: 8,
    },
    metricLabel: {
        fontSize: 12,
        color: "#64748B",
        fontWeight: "600",
        textAlign: "center",
    },
    metricValue: {
        fontSize: 14,
        color: "#1E293B",
        fontWeight: "700",
        textAlign: "center",
    },
    additionalMetrics: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: "#F1F5F9",
    },
    additionalMetric: {
        alignItems: "center",
    },
    additionalLabel: {
        fontSize: 12,
        color: "#64748B",
        fontWeight: "500",
        marginBottom: 4,
    },
    additionalValue: {
        fontSize: 14,
        color: "#1E293B",
        fontWeight: "700",
    },

    // Nutrition Card
    nutritionCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 20,
        padding: 24,
        marginRight: 16,
        width: width - 32,
        shadowColor: "#000",
        shadowOffset: { width: 0,height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 6,
    },
    ratingContainer: {
        flexDirection: "row",
        gap: 2,
    },
    consumptionDate: {
        fontSize: 14,
        color: "#64748B",
        marginBottom: 16,
        fontWeight: "500",
    },
    nutritionMetrics: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 12,
        marginBottom: 16,
    },
    nutritionMetric: {
        flex: 1,
        minWidth: "45%",
        alignItems: "center",
        gap: 8,
    },
    nutritionIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
    },
    nutritionLabel: {
        fontSize: 12,
        color: "#64748B",
        fontWeight: "600",
    },
    nutritionValue: {
        fontSize: 16,
        color: "#1E293B",
        fontWeight: "800",
    },
    servingInfo: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: "#F1F5F9",
    },
    servingLabel: {
        fontSize: 14,
        color: "#64748B",
        fontWeight: "500",
    },
    servingValue: {
        fontSize: 14,
        color: "#1E293B",
        fontWeight: "700",
    },

    // Activity Card
    activityCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 20,
        padding: 24,
        marginRight: 16,
        width: width - 32,
        shadowColor: "#000",
        shadowOffset: { width: 0,height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 6,
    },
    activityHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 12,
        color: "#FFFFFF",
        fontWeight: "600",
    },
    activityLocation: {
        fontSize: 14,
        color: "#64748B",
        marginBottom: 4,
        fontWeight: "500",
    },
    activityDate: {
        fontSize: 12,
        color: "#94A3B8",
        marginBottom: 16,
    },
    activityMetrics: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 12,
        marginBottom: 16,
    },
    activityMetric: {
        flex: 1,
        minWidth: "45%",
        backgroundColor: "#F8FAFC",
        borderRadius: 12,
        padding: 12,
        alignItems: "center",
        gap: 4,
    },
    activityMetricLabel: {
        fontSize: 11,
        color: "#64748B",
        fontWeight: "600",
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    activityMetricValue: {
        fontSize: 14,
        color: "#1E293B",
        fontWeight: "800",
    },
    additionalInfo: {
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: "#F1F5F9",
        gap: 8,
    },
    infoItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    infoLabel: {
        fontSize: 14,
        color: "#64748B",
        fontWeight: "500",
    },
    infoValue: {
        fontSize: 14,
        color: "#1E293B",
        fontWeight: "700",
    },

    // Workout Card
    workoutCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 20,
        padding: 24,
        marginRight: 16,
        width: width - 32,
        shadowColor: "#000",
        shadowOffset: { width: 0,height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 6,
    },
    workoutTiming: {
        gap: 8,
        marginBottom: 20,
    },
    timingItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    timingLabel: {
        fontSize: 14,
        color: "#64748B",
        fontWeight: "500",
    },
    timingValue: {
        fontSize: 14,
        color: "#1E293B",
        fontWeight: "600",
    },
    workoutStats: {
        flexDirection: "row",
        gap: 16,
        marginBottom: 16,
    },
    workoutStat: {
        flex: 1,
        alignItems: "center",
        gap: 8,
    },
    statIconBg: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: "center",
        justifyContent: "center",
    },
    workoutStatLabel: {
        fontSize: 12,
        color: "#64748B",
        fontWeight: "600",
        textAlign: "center",
    },
    workoutStatValue: {
        fontSize: 18,
        color: "#1E293B",
        fontWeight: "800",
        textAlign: "center",
    },
    createdDate: {
        fontSize: 12,
        color: "#94A3B8",
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: "#F1F5F9",
    },

    // Chart Container
    chartContainer: {
        backgroundColor: "#FFFFFF",
        borderRadius: 20,
        padding: 20,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0,height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 6,
    },
    chartTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#1E293B",
        marginBottom: 16,
    },
    chart: {
        borderRadius: 16,
    },

    // Notes
    notesContainer: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 8,
        backgroundColor: "#F8FAFC",
        borderRadius: 12,
        padding: 12,
        marginTop: 12,
    },
    notesText: {
        flex: 1,
        fontSize: 14,
        color: "#64748B",
        lineHeight: 20,
    },

    // Health Standards
    healthStandards: {
        backgroundColor: "#FFFFFF",
        borderRadius: 20,
        padding: 24,
        marginHorizontal: 16,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0,height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 6,
    },
    standardsHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        marginBottom: 16,
    },
    standardsTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#1E293B",
    },
    standardsList: {
        gap: 12,
    },
    standardItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 8,
    },
    standardIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: "#F8FAFC",
        alignItems: "center",
        justifyContent: "center",
    },
    standardText: {
        fontSize: 14,
        color: "#64748B",
        fontWeight: "500",
        flex: 1,
    },
    noDataText: {
        textAlign: "center",
        fontSize: 16,
        color: "#64748B",
        marginTop: 40,
        fontWeight: "500",
    },
})

export default UserProfileContent
