import { View, Text, TextInput, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const API_BASE = 'https://www.bijakbeli.app/api';

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    setSearched(true);
    
    try {
      const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults(data.products || []);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Search Input */}
      <View className="bg-white px-4 py-3 border-b border-gray-200">
        <View className="flex-row items-center bg-gray-100 rounded-lg px-3">
          <Ionicons name="search" size={20} color="#9ca3af" />
          <TextInput
            className="flex-1 py-3 px-2"
            placeholder="Cari produk..."
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            autoFocus
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={20} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Results */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563eb" />
          <Text className="text-gray-500 mt-2">Mencari...</Text>
        </View>
      ) : !searched ? (
        <View className="flex-1 items-center justify-center px-4">
          <Ionicons name="search" size={64} color="#d1d5db" />
          <Text className="text-gray-400 text-lg mt-4">Cari produk favorit Anda</Text>
          <Text className="text-gray-400 text-sm mt-1 text-center">
            Bandingkan harga dari 6 marketplace Indonesia
          </Text>
        </View>
      ) : results.length === 0 ? (
        <View className="flex-1 items-center justify-center px-4">
          <Ionicons name="sad-outline" size={64} color="#d1d5db" />
          <Text className="text-gray-500 text-lg mt-4">Produk tidak ditemukan</Text>
          <Text className="text-gray-400 text-sm mt-1 text-center">
            Coba kata kunci lain
          </Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          contentContainerClassName="p-4"
          renderItem={({ item }) => (
            <TouchableOpacity
              className="bg-white rounded-lg p-4 mb-3 shadow-sm"
              onPress={() => router.push(`/product/${item.id}`)}
            >
              <View className="flex-row">
                <Image
                  source={{ uri: item.image_url || 'https://via.placeholder.com/100' }}
                  className="w-24 h-24 rounded-lg"
                  resizeMode="cover"
                />
                <View className="flex-1 ml-3">
                  <Text className="font-medium" numberOfLines={2}>
                    {item.name}
                  </Text>
                  <Text className="text-blue-600 font-bold text-lg mt-1">
                    Rp {(item.lowest_price || 0).toLocaleString('id-ID')}
                  </Text>
                  <View className="flex-row items-center mt-2">
                    <View className="bg-blue-100 rounded px-2 py-0.5 mr-2">
                      <Text className="text-blue-600 text-xs">
                        {item.category}
                      </Text>
                    </View>
                    <View className="flex-row items-center">
                      <Ionicons name="star" size={12} color="#f59e0b" />
                      <Text className="text-xs text-gray-500 ml-1">
                        {item.deal_score || 0}/100
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}
