import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { TextInput, Button, Card, Title, Picker } from 'react-native-paper';
import trainerService from 'services/apiTrainerService';
import Toast from 'react-native-toast-message';

const EditWorkoutPlanScreen = ({ route, navigation }) => {
  const { planId } = route.params;
  const [planData, setPlanData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    trainerService.getWorkoutPlanById(planId)
      .then((response) => {
        setPlanData(response.data);
      })
      .catch((error) => {
        Toast.show({ type: 'error', text1: 'Error', text2: error.message });
      })
      .finally(() => setLoading(false));
  }, [planId]);

  const handleUpdatePlan = async () => {
    if (!planData.PlanName.trim()) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Plan name is required.' });
      return;
    }
    setLoading(true);
    try {
      await trainerService.updateWorkoutPlan(planId, {
        UserId: planData.UserId,
        TrainerId: planData.TrainerId,
        SubscriptionId: planData.SubscriptionId,
        PlanName: planData.PlanName,
        Description: planData.Description,
        StartDate: planData.StartDate,
        EndDate: planData.EndDate,
        FrequencyPerWeek: planData.FrequencyPerWeek,
        DurationMinutes: planData.DurationMinutes,
      });
      Toast.show({ type: 'success', text1: 'Success', text2: 'Plan updated successfully!' });
      navigation.goBack();
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Error', text2: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePlan = async () => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this plan?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await trainerService.deleteWorkoutPlan(planId);
              Toast.show({ type: 'success', text1: 'Success', text2: 'Plan deleted successfully!' });
              navigation.goBack();
            } catch (error) {
              Toast.show({ type: 'error', text1: 'Error', text2: error.message });
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  if (!planData || loading) return <Text style={styles.container}>Loading...</Text>;

  return (
    <ScrollView style={styles.container}>
      <Title style={styles.title}>Edit Workout Plan</Title>
      <Card style={styles.card}>
        <Card.Title title="Plan Details" />
        <Card.Content>
          <TextInput
            label="Plan Name"
            value={planData.PlanName}
            onChangeText={(text) => setPlanData({ ...planData, PlanName: text })}
            style={styles.input}
          />
          <TextInput
            label="Description"
            value={planData.Description}
            onChangeText={(text) => setPlanData({ ...planData, Description: text })}
            multiline
            numberOfLines={4}
            style={styles.input}
          />
          <TextInput
            label="Start Date (YYYY-MM-DD)"
            value={planData.StartDate.split('T')[0]}
            onChangeText={(text) => setPlanData({ ...planData, StartDate: text })}
            style={styles.input}
          />
          <TextInput
            label="End Date (YYYY-MM-DD)"
            value={planData.EndDate.split('T')[0]}
            onChangeText={(text) => setPlanData({ ...planData, EndDate: text })}
            style={styles.input}
          />
          <Text style={styles.label}>Frequency per Week</Text>
          <Picker
            selectedValue={planData.FrequencyPerWeek}
            onValueChange={(value) => setPlanData({ ...planData, FrequencyPerWeek: value })}
            style={styles.picker}
          >
            {[1, 2, 3, 4, 5, 6, 7].map((num) => (
              <Picker.Item key={num} label={`${num}`} value={num} />
            ))}
          </Picker>
          <TextInput
            label="Duration (minutes)"
            value={planData.DurationMinutes.toString()}
            onChangeText={(text) => setPlanData({ ...planData, DurationMinutes: parseInt(text) || 0 })}
            keyboardType="numeric"
            style={styles.input}
          />
        </Card.Content>
      </Card>
      <Button
        mode="contained"
        onPress={handleUpdatePlan}
        loading={loading}
        disabled={loading}
        style={styles.button}
      >
        Update Plan
      </Button>
      <Button
        mode="contained"
        onPress={handleDeletePlan}
        color="red"
        disabled={loading}
        style={styles.button}
      >
        Delete Plan
      </Button>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#f5f5f5' },
  title: { marginBottom: 20 },
  card: { marginVertical: 10 },
  label: { fontSize: 16, marginTop: 10 },
  picker: { backgroundColor: '#fff', marginVertical: 10 },
  input: { marginVertical: 10 },
  button: { marginTop: 20 },
});

export default EditWorkoutPlanScreen;