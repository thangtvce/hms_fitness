import React, { useEffect, useState } from "react"
import { showErrorFetchAPI, showSuccessMessage } from "utils/toastUtil"
import { View, Text, ScrollView, Image, TouchableOpacity } from "react-native"
import Header from 'components/Header'
import dayjs from "dayjs"
import Loading from "components/Loading"

const TopFoodsByMealScreen = ({ route, logs, navigation }) => {
  // Get logs from route params or prop, fallback to empty array
  const data = (route?.params?.logs) || logs || [];

  const [topFoodsByMeal, setTopFoodsByMeal] = useState({ Breakfast: [], Lunch: [], Dinner: [] })
  const [selectedMeal, setSelectedMeal] = useState('Breakfast')
  const [loading, setLoading] = useState(false)


  useEffect(() => {
    setLoading(true)
    setTimeout(() => {
      calculateTopFoodsByMeal()
      setLoading(false)
    }, 400)
  }, [data])

  const calculateTopFoodsByMeal = () => {
    const mealTypes = ["Breakfast", "Lunch", "Dinner"]
    const result = {}
    
    mealTypes.forEach(meal => {
      const foods = data.filter(log => log.mealType === meal)
      const foodCount = {}
      
      foods.forEach(log => {
        if (!foodCount[log.foodName]) foodCount[log.foodName] = 0
        foodCount[log.foodName]++
      })
      
      const sorted = Object.entries(foodCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }))
      
      result[meal] = sorted
    })
    
    setTopFoodsByMeal(result)
  }

  const getRankStyle = (index) => {
    const baseStyle = {
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12
    }

    switch(index) {
      case 0: return { ...baseStyle, backgroundColor: '#FFD700' } // Gold
      case 1: return { ...baseStyle, backgroundColor: '#C0C0C0' } // Silver
      case 2: return { ...baseStyle, backgroundColor: '#CD7F32' } // Bronze
      default: return { ...baseStyle, backgroundColor: '#0056d2' } // Blue
    }
  }

  const getRankTextColor = (index) => {
    return index < 3 ? '#000000' : '#FFFFFF'
  }

  if (loading) {
    return <Loading backgroundColor="rgba(255,255,255,0.8)" logoSize={120} text="Loading top foods..." />
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
      <Header
        title="Top Foods by Meal"
        onBack={() => navigation && navigation.goBack && navigation.goBack()}
        rightActions={[]}
      />

      {/* Meal Selection Tabs */}
      <View style={{ 
        flexDirection: 'row', 
        justifyContent: 'space-around', 
        marginTop: 90, 
        marginBottom: 20, 
        paddingHorizontal: 16,
        backgroundColor: '#ffffff',
        marginHorizontal: 16,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2
      }}>
        {['Breakfast', 'Lunch', 'Dinner'].map(meal => (
          <TouchableOpacity 
            key={meal} 
            style={{ flex: 1, alignItems: 'center' }}
            onPress={() => setSelectedMeal(meal)}
          >
            <Text style={{
              fontWeight: 'bold',
              fontSize: 16,
              color: selectedMeal === meal ? '#0056d2' : '#6b7280',
              paddingVertical: 16,
              borderBottomWidth: selectedMeal === meal ? 3 : 0,
              borderBottomColor: '#0056d2',
              textAlign: 'center',
              width: '100%'
            }}>
              {meal}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={{ flex: 1, paddingHorizontal: 16 }}>
        {/* Selected Meal Title */}
        <View style={{ 
          backgroundColor: '#ffffff',
          borderRadius: 12,
          padding: 20,
          marginBottom: 16,
          shadowColor: '#000',
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 2
        }}>
          <Text style={{ 
            fontWeight: 'bold', 
            color: '#0056d2', 
            fontSize: 16, 
            marginBottom: 16,
            textAlign: 'center',
            textTransform: 'uppercase',
            letterSpacing: 1
          }}>
            Top {selectedMeal} Foods
          </Text>

          {topFoodsByMeal[selectedMeal] && topFoodsByMeal[selectedMeal].length > 0 ? (
            topFoodsByMeal[selectedMeal].map((food, idx) => {
              // Find first log of this food to get image and info
              const logItem = data.find(log => log.mealType === selectedMeal && log.foodName === food.name)
              const foodImg = logItem?.foodImage || logItem?.image;
              
              return (
                <TouchableOpacity 
                  key={idx} 
                  style={{ 
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    marginBottom: 16,
                    backgroundColor: '#f8f9fa',
                    borderRadius: 12,
                    padding: 16,
                    borderLeftWidth: 4,
                    borderLeftColor: idx === 0 ? '#FFD700' : idx === 1 ? '#C0C0C0' : idx === 2 ? '#CD7F32' : '#0056d2'
                  }}
                  onPress={() => {
                    if (navigation) {
                      let foodData = logItem;
                      if (logItem && logItem.foodImage && !logItem.image) {
                        foodData = { ...logItem, image: logItem.foodImage };
                      }
                      navigation.navigate('FoodDetails', { food: foodData })
                    }
                  }}
                >
                  {/* Rank Badge */}
                  <View style={getRankStyle(idx)}>
                    <Text style={{ 
                      fontWeight: 'bold', 
                      fontSize: 14, 
                      color: getRankTextColor(idx)
                    }}>
                      {idx + 1}
                    </Text>
                  </View>

                  {/* Food Image */}
                  {foodImg ? (
                    <Image
                      source={{ uri: foodImg }}
                      style={{ 
                        width: 50, 
                        height: 50, 
                        marginRight: 16, 
                        borderRadius: 12, 
                        backgroundColor: '#e5e7eb' 
                      }}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={{ 
                      width: 50, 
                      height: 50, 
                      marginRight: 16, 
                      borderRadius: 12, 
                      backgroundColor: '#e5e7eb', 
                      justifyContent: 'center', 
                      alignItems: 'center' 
                    }}>
                      <Text style={{ color: '#9ca3af', fontSize: 10 }}>No Image</Text>
                    </View>
                  )}

                  {/* Food Info */}
                  <View style={{ flex: 1 }}>
                    <Text style={{ 
                      color: '#374151', 
                      fontSize: 14, 
                      fontWeight: 'bold',
                      marginBottom: 4
                    }}>
                      {food.name}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={{ 
                        color: '#0056d2', 
                        fontSize: 12,
                        fontWeight: '600'
                      }}>
                        {food.count} times consumed
                      </Text>
                    </View>
                  </View>

                  {/* Arrow Indicator */}
                  <View style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: '#0056d2',
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}>
                    <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: 'bold' }}>›</Text>
                  </View>
                </TouchableOpacity>
              )
            })
          ) : (
            <View style={{ 
              alignItems: 'center', 
              justifyContent: 'center', 
              paddingVertical: 40 
            }}>
              <Text style={{ 
                color: '#9ca3af', 
                fontSize: 14, 
                textAlign: 'center',
                fontStyle: 'italic'
              }}>
                No data available for {selectedMeal}
              </Text>
            </View>
          )}
        </View>

        {/* Statistics Summary */}
        {topFoodsByMeal[selectedMeal] && topFoodsByMeal[selectedMeal].length > 0 && (
          <View style={{ 
            backgroundColor: '#ffffff',
            borderRadius: 12,
            padding: 20,
            marginBottom: 20,
            shadowColor: '#000',
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 2
          }}>
            <Text style={{ 
              fontWeight: 'bold', 
              color: '#374151', 
              fontSize: 14, 
              marginBottom: 12,
              textAlign: 'center'
            }}>
              {selectedMeal} Statistics
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 12, color: '#6b7280' }}>Total Foods</Text>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#0056d2' }}>
                  {topFoodsByMeal[selectedMeal].length}
                </Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 12, color: '#6b7280' }}>Most Popular</Text>
                <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#0056d2' }}>
                  {topFoodsByMeal[selectedMeal][0]?.count || 0} times
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  )
}

export default TopFoodsByMealScreen