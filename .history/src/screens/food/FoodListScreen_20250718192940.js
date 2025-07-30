            {/* Serving Size Stepper */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 8, marginBottom: 8 }}>
              <Text style={{ fontSize: 17, color: '#222', fontWeight: '500', marginRight: 8 }}>Serving Size:</Text>
              <TouchableOpacity
                style={{ backgroundColor: '#F3F4F6', borderRadius: 8, padding: 6, marginRight: 8 }}
                onPress={() => setInputValues((prev) => ({ ...prev, servingSize: String(Math.max(1, servingSize - 1)) }))}
              >
                <Text style={{ fontSize: 22, color: '#222', fontWeight: 'bold' }}>-</Text>
