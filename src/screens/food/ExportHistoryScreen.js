import React,{ useState,useRef } from "react"
import Loading from "components/Loading"
import { View,Text,TouchableOpacity,Alert,ScrollView,Dimensions } from "react-native"
import { showErrorFetchAPI,showSuccessMessage } from "utils/toastUtil"
import ViewShot from "react-native-view-shot"
import * as FileSystem from 'expo-file-system'
import * as MediaLibrary from 'expo-media-library'
import Header from 'components/Header'

const { width: screenWidth } = Dimensions.get('window')

const ExportHistoryScreen = ({ route,logs,navigation }) => {
  const [saving,setSaving] = useState(false)
  const viewShotRef = useRef()

  // Get logs from route params or prop, fallback to empty array
  const logData = (route?.params?.logs) || logs || [];

  // Function to show export confirmation
  const handleExportCSV = () => {
    Alert.alert(
      'Export Confirmation',
      'Do you want to save this nutrition report as an image?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Export',
          onPress: handleSaveImage,
        },
      ]
    )
  }

  // Function to save nutrition report image
  const handleSaveImage = async () => {
    setSaving(true)
    try {
      const uri = await viewShotRef.current.capture()
      const { status } = await MediaLibrary.requestPermissionsAsync()
      if (status !== 'granted') throw new Error('MEDIA_LIBRARY permission is required for this operation.')
      const asset = await MediaLibrary.createAssetAsync(uri)
      await MediaLibrary.createAlbumAsync('NutritionHistory',asset,false)
      showSuccessMessage('Nutrition report has been saved to photo library.')
    } catch (e) {
      showErrorFetchAPI(e.message)
    }
    setSaving(false)
  }

  return (
    <View style={{ flex: 1,backgroundColor: '#f5f5f5',padding: 0 }}>
      {saving && (
        <Loading backgroundColor="rgba(255,255,255,0.8)" logoSize={120} />
      )}
      {!saving && (
        <>
          <Header
            title="Export Nutrition"
            onBack={() => navigation.goBack()}
            rightActions={[]}
          />
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16,marginTop: 120 }}>
            {/* A4 Landscape Document */}
            <ViewShot
              ref={viewShotRef}
              options={{ format: 'png',quality: 0.95 }}
              style={{
                backgroundColor: '#ffffff',
                padding: 12,
                marginHorizontal: 4,
                borderWidth: 1,
                borderColor: '#000000',
                shadowColor: '#000',
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 2,
                minHeight: 350,
                width: screenWidth - 40
              }}
            >
              {/* Document Header */}
              <View style={{
                alignItems: 'center',
                marginBottom: 16,
                borderBottomWidth: 2,
                borderBottomColor: '#000000',
                paddingBottom: 8
              }}>
                <Text style={{
                  fontWeight: 'bold',
                  fontSize: 16,
                  color: '#000000',
                  textAlign: 'center',
                  textTransform: 'uppercase',
                  letterSpacing: 1.2
                }}>
                  NUTRITION REPORT
                </Text>
                <Text style={{
                  fontSize: 10,
                  color: '#000000',
                  marginTop: 4,
                  textAlign: 'center'
                }}>
                  Generated on: {new Date().toLocaleDateString('en-US',{
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </Text>
              </View>

              {/* Table Header */}
              <View style={{
                flexDirection: 'row',
                borderBottomWidth: 2,
                borderBottomColor: '#000000',
                paddingVertical: 6,
                marginBottom: 2,
                backgroundColor: '#f8f8f8'
              }}>
                <Text style={{
                  flex: 1.2,
                  fontWeight: 'bold',
                  color: '#000000',
                  fontSize: 5,
                  textAlign: 'center',
                  textTransform: 'uppercase'
                }}>
                  DATE
                </Text>
                <Text style={{
                  flex: 1,
                  fontWeight: 'bold',
                  color: '#000000',
                  fontSize: 5,
                  textAlign: 'center',
                  textTransform: 'uppercase'
                }}>
                  MEAL
                </Text>
                <Text style={{
                  flex: 2,
                  fontWeight: 'bold',
                  color: '#000000',
                  fontSize: 5,
                  textAlign: 'center',
                  textTransform: 'uppercase'
                }}>
                  FOOD
                </Text>
                <Text style={{
                  flex: 0.8,
                  fontWeight: 'bold',
                  color: '#000000',
                  fontSize: 5,
                  textAlign: 'center',
                  textTransform: 'uppercase'
                }}>
                  PORTION
                </Text>
                <Text style={{
                  flex: 0.8,
                  fontWeight: 'bold',
                  color: '#000000',
                  fontSize: 5,
                  textAlign: 'center',
                  textTransform: 'uppercase'
                }}>
                  SERVING
                </Text>
                <Text style={{
                  flex: 1,
                  fontWeight: 'bold',
                  color: '#000000',
                  fontSize: 5,
                  textAlign: 'center',
                  textTransform: 'uppercase'
                }}>
                  KCAL
                </Text>
                <Text style={{
                  flex: 1,
                  fontWeight: 'bold',
                  color: '#000000',
                  fontSize: 5,
                  textAlign: 'center',
                  textTransform: 'uppercase'
                }}>
                  PROT
                </Text>
                <Text style={{
                  flex: 1,
                  fontWeight: 'bold',
                  color: '#000000',
                  fontSize: 5,
                  textAlign: 'center',
                  textTransform: 'uppercase'
                }}>
                  CARB
                </Text>
                <Text style={{
                  flex: 1,
                  fontWeight: 'bold',
                  color: '#000000',
                  fontSize: 5,
                  textAlign: 'center',
                  textTransform: 'uppercase'
                }}>
                  FAT
                </Text>
              </View>

              {/* Table Data */}
              {Array.isArray(logData) && logData.length > 0 ? (
                logData.map((log,i) => {
                  let dateStr = 'N/A';
                  if (log.consumptionDate) {
                    const d = new Date(log.consumptionDate);
                    if (!isNaN(d.getTime())) {
                      const day = String(d.getDate()).padStart(2,'0');
                      const month = String(d.getMonth() + 1).padStart(2,'0');
                      const year = d.getFullYear();
                      dateStr = `${day}/${month}/${year}`;
                    } else {
                      // Nếu không parse được, giữ nguyên
                      dateStr = log.consumptionDate;
                    }
                  }
                  return (
                    <View key={i} style={{
                      flexDirection: 'row',
                      borderBottomWidth: 0.5,
                      borderBottomColor: '#000000',
                      paddingVertical: 5,
                      backgroundColor: i % 2 === 0 ? '#ffffff' : '#f9f9f9',
                      minHeight: 22
                    }}>
                      <Text style={{
                        flex: 1.2,
                        color: '#000000',
                        fontSize: 8,
                        textAlign: 'center',
                        fontFamily: 'monospace'
                      }}>
                        {dateStr}
                      </Text>
                      <Text style={{
                        flex: 1,
                        color: '#000000',
                        fontSize: 8,
                        textAlign: 'center',
                        fontFamily: 'monospace'
                      }}>
                        {log.mealType || 'N/A'}
                      </Text>
                      <Text style={{
                        flex: 2,
                        color: '#000000',
                        fontSize: 8,
                        textAlign: 'center',
                        fontFamily: 'monospace',
                        paddingHorizontal: 2
                      }}>
                        {log.foodName || 'N/A'}
                      </Text>
                      <Text style={{
                        flex: 0.8,
                        color: '#000000',
                        fontSize: 8,
                        textAlign: 'center',
                        fontFamily: 'monospace'
                      }}>
                        {log.portionSize || 1}
                      </Text>
                      <Text style={{
                        flex: 0.8,
                        color: '#000000',
                        fontSize: 8,
                        textAlign: 'center',
                        fontFamily: 'monospace'
                      }}>
                        {log.servingSize || 1}
                      </Text>
                      <Text style={{
                        flex: 1,
                        color: '#000000',
                        fontSize: 8,
                        textAlign: 'center',
                        fontFamily: 'monospace'
                      }}>
                        {log.calories || 0}
                      </Text>
                      <Text style={{
                        flex: 1,
                        color: '#000000',
                        fontSize: 8,
                        textAlign: 'center',
                        fontFamily: 'monospace'
                      }}>
                        {log.protein || 0}g
                      </Text>
                      <Text style={{
                        flex: 1,
                        color: '#000000',
                        fontSize: 8,
                        textAlign: 'center',
                        fontFamily: 'monospace'
                      }}>
                        {log.carbs || 0}g
                      </Text>
                      <Text style={{
                        flex: 1,
                        color: '#000000',
                        fontSize: 8,
                        textAlign: 'center',
                        fontFamily: 'monospace'
                      }}>
                        {log.fats || 0}g
                      </Text>
                    </View>
                  );
                })
              ) : (
                <View style={{
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: 40
                }}>
                  <Text style={{
                    color: '#000000',
                    fontSize: 12,
                    textAlign: 'center',
                    fontStyle: 'italic'
                  }}>
                    No nutrition data available
                  </Text>
                </View>
              )}

              {/* Summary Section */}
              {Array.isArray(logData) && logData.length > 0 && (
                <View style={{
                  marginTop: 12,
                  paddingTop: 8,
                  borderTopWidth: 2,
                  borderTopColor: '#000000'
                }}>
                  <View style={{ flexDirection: 'row',justifyContent: 'space-between' }}>
                    <Text style={{
                      fontSize: 10,
                      color: '#000000',
                      fontWeight: 'bold'
                    }}>
                      Total Records: {logData.length}
                    </Text>
                    <Text style={{
                      fontSize: 10,
                      color: '#000000',
                      fontWeight: 'bold'
                    }}>
                      Total Calories: {logData.reduce((sum,log) => sum + (parseInt(log.calories) || 0),0)}
                    </Text>
                  </View>
                </View>
              )}

              {/* Document Footer */}
              <View style={{
                marginTop: 16,
                paddingTop: 8,
                borderTopWidth: 1,
                borderTopColor: '#000000',
                alignItems: 'center'
              }}>
                <Text style={{
                  fontSize: 8,
                  color: '#000000',
                  textAlign: 'center',
                  fontStyle: 'italic'
                }}>
                  This document is computer generated and does not require signature
                </Text>
                <Text style={{
                  fontSize: 7,
                  color: '#000000',
                  textAlign: 'center',
                  marginTop: 2,
                  fontStyle: 'italic'
                }}>
                  HEALTH MANAGEMENT SYSTEM - {new Date().getFullYear()}
                </Text>
              </View>
            </ViewShot>

            {/* Export Button */}
            <TouchableOpacity
              style={{
                backgroundColor: '#0056d2',
                paddingVertical: 16,
                paddingHorizontal: 32,
                borderRadius: 12,
                marginTop: 24,
                marginBottom: 20,
                alignItems: 'center',
                shadowColor: '#000',
                shadowOpacity: 0.2,
                shadowRadius: 4,
                elevation: 4
              }}
              onPress={handleExportCSV}
              disabled={saving}
            >
              <Text style={{
                color: '#fff',
                fontWeight: 'bold',
                fontSize: 18
              }}>
                {saving ? 'Saving Report...' : 'Export CSV Report'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </>
      )}
    </View>
  )
}

export default ExportHistoryScreen