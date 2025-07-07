import React, { useContext } from 'react';
import { View, Text, Switch, StyleSheet, SafeAreaView } from 'react-native';
import { ThemeContext } from '../../components/theme/ThemeContext';

const ThemeSettingsScreen = () => {
  const { theme, toggleTheme, colors } = useContext(ThemeContext);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background || '#fff' }]}> 
      <Text style={[styles.title, { color: colors.text || '#000' }]}>Cài đặt giao diện</Text>
      <View style={styles.row}>
        <Text style={[styles.label, { color: colors.text || '#000' }]}>Chế độ tối</Text>
        <Switch
          value={theme === 'dark'}
          onValueChange={toggleTheme}
          thumbColor={theme === 'dark' ? '#2563EB' : '#ccc'}
          trackColor={{ false: '#ccc', true: '#2563EB' }}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'flex-start',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 32,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: 'transparent',
    borderRadius: 8,
  },
  label: {
    fontSize: 18,
  },
});

export default ThemeSettingsScreen;
