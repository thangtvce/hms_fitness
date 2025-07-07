import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, TextInput, StyleSheet, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function ReminderPlanFilterModal({ visible, onClose, onApply, initialFilters }) {
  const [pageNumber, setPageNumber] = useState(initialFilters.pageNumber || 1);
  const [pageSize, setPageSize] = useState(initialFilters.pageSize || 10);
  const [validPageSize, setValidPageSize] = useState(initialFilters.validPageSize || 10);
  const [searchTerm, setSearchTerm] = useState(initialFilters.searchTerm || '');
  const [status, setStatus] = useState(initialFilters.status || '');
  const [startDate, setStartDate] = useState(initialFilters.startDate || null);
  const [endDate, setEndDate] = useState(initialFilters.endDate || null);
  const [showStartDate, setShowStartDate] = useState(false);
  const [showEndDate, setShowEndDate] = useState(false);

  const handleApply = () => {
    onApply({ pageNumber, pageSize, validPageSize, searchTerm, status, startDate, endDate });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.header}>Filter & Search</Text>
          <TextInput
            style={styles.input}
            placeholder="Search term"
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
          <TextInput
            style={styles.input}
            placeholder="Status"
            value={status}
            onChangeText={setStatus}
          />
          <TextInput
            style={styles.input}
            placeholder="Page Number"
            value={String(pageNumber)}
            onChangeText={v => setPageNumber(Number(v))}
            keyboardType="numeric"
          />
          <TextInput
            style={styles.input}
            placeholder="Page Size"
            value={String(pageSize)}
            onChangeText={v => setPageSize(Number(v))}
            keyboardType="numeric"
          />
          <TextInput
            style={styles.input}
            placeholder="Valid Page Size"
            value={String(validPageSize)}
            onChangeText={v => setValidPageSize(Number(v))}
            keyboardType="numeric"
          />
          <TouchableOpacity onPress={() => setShowStartDate(true)} style={styles.dateBtn}>
            <Text style={styles.dateBtnText}>{startDate ? `Start: ${new Date(startDate).toLocaleDateString()}` : 'Select Start Date'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowEndDate(true)} style={styles.dateBtn}>
            <Text style={styles.dateBtnText}>{endDate ? `End: ${new Date(endDate).toLocaleDateString()}` : 'Select End Date'}</Text>
          </TouchableOpacity>
          {showStartDate && (
            <DateTimePicker
              value={startDate ? new Date(startDate) : new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(e, d) => {
                setShowStartDate(false);
                if (d) setStartDate(d.toISOString());
              }}
            />
          )}
          {showEndDate && (
            <DateTimePicker
              value={endDate ? new Date(endDate) : new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(e, d) => {
                setShowEndDate(false);
                if (d) setEndDate(d.toISOString());
              }}
            />
          )}
          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.btn} onPress={onClose}>
              <Text style={styles.btnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, { backgroundColor: '#0EA5E9' }]} onPress={handleApply}>
              <Text style={[styles.btnText, { color: '#FFF' }]}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    elevation: 5,
  },
  header: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  dateBtn: {
    backgroundColor: '#E0E7EF',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  dateBtnText: {
    color: '#334155',
    fontWeight: '600',
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  btn: {
    flex: 1,
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  btnText: {
    color: '#0F172A',
    fontWeight: '700',
  },
});
