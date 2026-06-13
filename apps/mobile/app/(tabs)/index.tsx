import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useQuery } from 'react-query';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const API_BASE = 'https://www.bijakbeli.app/api';

async function fetchProducts() {
  const res = await fetch(`${API_BASE}/products?limit=10`);
  return res.json();
}

async function fetchDeals() {
  const res = await fetch(`${API_BASE}/deals?limit=5`);
  return res.json();
}

export default function HomeScreen() {
  const router = useRouter();
  
  const { data: products, isLoading: loadingProducts } = useQuery(
    'products',
    fetchProducts
  );
  
  const { data: deals, isLoading: loadingDeals } = useQuery(
    'deals',
    fetchDeals
  );

  return (
    <ScrollView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-blue-600 px-4 pt-4 pb-6">
        <Text className="text-white text-2xl font-bold mb-2">
          BijakBeli
        </Text>
        <Text className="text-blue-100 mb-4">
          Beli yang Tepat, di Waktu yang Tepat
        </Text>
        
        {/* Search Bar */}
        <TouchableOpacity
          className="bg-white rounded-lg px-4 py-3 flex-row items-center"
          onPress={() => router.push('/search')}
        >
          <Ionicons name="search" size={20} color="#9ca3af" />
          <Text className="text-gray-400 ml-2">Cari produk...</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Actions */}
      <View className="flex-row justify-around px-4 py-4 bg-white">
        {[
          { icon: 'trending-down', label: 'Deals', screen: '/deals' },
          { icon: 'notifications', label: 'Alerts', screen: '/alerts' },
          { icon: 'sparkles', label: 'Rekomendasi', screen: '/recommendations' },
          { icon: 'bar-chart', label: 'Analytics', screen: '/analytics' },
        ].map((item, index) => (
          <TouchableOpacity
            key={index}
            className="items-center"
            onPress={() => router.push(item.screen as any)}
          >
            <View className="bg-blue-100 rounded-full p-3 mb-1">
              <Ionicons name={item.icon as any} size={24} color="#2563eb" />
            </View>
            <Text className="text-xs text-gray-600">{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Hot Deals */}
      <View className="px-4 py-4">
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-lg font-bold">🔥 Hot Deals</Text>
          <TouchableOpacity>
            <Text className="text-blue-600 text-sm">Lihat Semua</Text>
          </TouchableOpacity>
        </View>
        
        {loadingDeals ? (
          <ActivityIndicator size="small" color="#2563eb" />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {(deals?.data || []).map((deal: any, index: number) => (
              <TouchableOpacity
                key={index}
                className="bg-white rounded-lg p-3 mr-3 w-48 shadow-sm"
                onPress={() => router.push(`/product/${deal.id}`)}
              >
                <Image
                  source={{ uri: deal.image_url || 'https://via.placeholder.com/200' }}
                  className="w-full h-32 rounded-lg mb-2"
                  resizeMode="cover"
                />
                <Text className="text-sm font-medium" numberOfLines={2}>
                  {deal.name}
                </Text>
                <Text className="text-blue-600 font-bold mt-1">
                  Rp {(deal.lowest_price || 0).toLocaleString('id-ID')}
                </Text>
                <View className="flex-row items-center mt-1">
                  <Ionicons name="star" size={12} color="#f59e0b" />
                  <Text className="text-xs text-gray-500 ml-1">
                    {deal.deal_score || 0}/100
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Popular Products */}
      <View className="px-4 py-4 pb-8">
        <Text className="text-lg font-bold mb-3">📦 Produk Populer</Text>
        
        {loadingProducts ? (
          <ActivityIndicator size="small" color="#2563eb" />
        ) : (
          (products?.products || []).map((product: any, index: number) => (
            <TouchableOpacity
              key={index}
              className="bg-white rounded-lg p-4 mb-3 shadow-sm flex-row"
              onPress={() => router.push(`/product/${product.id}`)}
            >
              <Image
                source={{ uri: product.image_url || 'https://via.placeholder.com/100' }}
                className="w-20 h-20 rounded-lg"
                resizeMode="cover"
              />
              <View className="flex-1 ml-3">
                <Text className="font-medium" numberOfLines={2}>
                  {product.name}
                </Text>
                <Text className="text-blue-600 font-bold mt-1">
                  Rp {(product.lowest_price || 0).toLocaleString('id-ID')}
                </Text>
                <View className="flex-row items-center mt-1">
                  <View className="bg-blue-100 rounded px-2 py-0.5">
                    <Text className="text-blue-600 text-xs">
                      {product.category}
                    </Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );
}
