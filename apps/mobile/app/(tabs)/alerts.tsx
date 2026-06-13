import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useQuery } from 'react-query';
import { Ionicons } from '@expo/vector-icons';

const API_BASE = 'https://www.bijakbeli.app/api';

async function fetchAlerts() {
  const res = await fetch(`${API_BASE}/alerts`);
  return res.json();
}

export default function AlertsScreen() {
  const { data, isLoading, refetch } = useQuery('alerts', fetchAlerts);

  const alerts = data?.data || [];

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-4 py-4 border-b border-gray-200">
        <Text className="text-lg font-bold">Price Alerts</Text>
        <Text className="text-gray-500 text-sm">
          Notifikasi saat harga turun
        </Text>
      </View>

      {/* Content */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : alerts.length === 0 ? (
        <View className="flex-1 items-center justify-center px-4">
          <Ionicons name="notifications-off" size={64} color="#d1d5db" />
          <Text className="text-gray-500 text-lg mt-4">Belum ada alert</Text>
          <Text className="text-gray-400 text-sm mt-1 text-center">
            Buat alert untuk mendapat notifikasi saat harga turun
          </Text>
          <TouchableOpacity className="bg-blue-600 rounded-lg px-6 py-3 mt-4">
            <Text className="text-white font-medium">Buat Alert</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={alerts}
          keyExtractor={(item) => item.id}
          contentContainerClassName="p-4"
          refreshing={isLoading}
          onRefresh={refetch}
          renderItem={({ item }) => (
            <View className="bg-white rounded-lg p-4 mb-3 shadow-sm">
              <View className="flex-row items-start justify-between">
                <View className="flex-1">
                  <Text className="font-medium" numberOfLines={2}>
                    {item.product_name || 'Produk'}
                  </Text>
                  <View className="flex-row items-center mt-2">
                    <View className="mr-4">
                      <Text className="text-xs text-gray-500">Target</Text>
                      <Text className="text-blue-600 font-bold">
                        Rp {item.target_price?.toLocaleString('id-ID')}
                      </Text>
                    </View>
                    <View>
                      <Text className="text-xs text-gray-500">Saat Ini</Text>
                      <Text className={`font-bold ${
                        item.current_price <= item.target_price 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}>
                        Rp {item.current_price?.toLocaleString('id-ID')}
                      </Text>
                    </View>
                  </View>
                </View>
                <TouchableOpacity>
                  <Ionicons 
                    name={item.is_active ? "notifications" : "notifications-off"} 
                    size={24} 
                    color={item.is_active ? "#2563eb" : "#9ca3af"} 
                  />
                </TouchableOpacity>
              </View>
              
              {item.triggered_at && (
                <View className="mt-3 bg-green-50 rounded-lg p-2">
                  <Text className="text-green-700 text-xs">
                    ✓ Triggered {new Date(item.triggered_at).toLocaleDateString('id-ID')}
                  </Text>
                </View>
              )}
            </View>
          )}
        />
      )}
    </View>
  );
}
