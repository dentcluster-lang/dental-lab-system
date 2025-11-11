import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export default function MarketplaceScreen({ navigation }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('전체');

  const categories = ['전체', '보철물', '교정', '임플란트', '의료기기', '소모품'];

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      // Firebase에서 제품 데이터 가져오기
      // const productsData = await fetchProducts();
      // setProducts(productsData);

      // 임시 데이터
      setProducts([
        {
          id: '1',
          name: '지르코니아 크라운',
          price: 45000,
          image: 'https://via.placeholder.com/150',
          category: '보철물',
          rating: 4.5,
          soldCount: 123,
        },
        {
          id: '2',
          name: '세라믹 인레이',
          price: 35000,
          image: 'https://via.placeholder.com/150',
          category: '보철물',
          rating: 4.8,
          soldCount: 89,
        },
        // 더 많은 제품...
      ]);
    } catch (error) {
      console.error('제품 로딩 실패:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadProducts();
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === '전체' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const renderProduct = ({ item }) => (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
    >
      <Image source={{ uri: item.image }} style={styles.productImage} />
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>
          {item.name}
        </Text>
        <View style={styles.ratingContainer}>
          <Icon name="star" size={14} color="#f59e0b" />
          <Text style={styles.ratingText}>{item.rating}</Text>
          <Text style={styles.soldText}>• {item.soldCount}개 판매</Text>
        </View>
        <Text style={styles.productPrice}>
          {item.price.toLocaleString()}원
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderCategory = (category) => (
    <TouchableOpacity
      key={category}
      style={[
        styles.categoryChip,
        selectedCategory === category && styles.categoryChipActive,
      ]}
      onPress={() => setSelectedCategory(category)}
    >
      <Text
        style={[
          styles.categoryText,
          selectedCategory === category && styles.categoryTextActive,
        ]}
      >
        {category}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>제품을 불러오는 중...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 검색바 */}
      <View style={styles.searchContainer}>
        <Icon name="magnify" size={20} color="#94a3b8" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="제품 검색..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#94a3b8"
        />
        <TouchableOpacity onPress={() => navigation.navigate('Cart')}>
          <Icon name="cart-outline" size={24} color="#64748b" />
        </TouchableOpacity>
      </View>

      {/* 카테고리 필터 */}
      <View style={styles.categoriesContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={categories}
          keyExtractor={(item) => item}
          renderItem={({ item }) => renderCategory(item)}
          contentContainerStyle={styles.categoriesList}
        />
      </View>

      {/* 제품 리스트 */}
      <FlatList
        data={filteredProducts}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.productsList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Icon name="package-variant" size={64} color="#cbd5e1" />
            <Text style={styles.emptyText}>제품이 없습니다</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 14,
    color: '#0f172a',
  },
  categoriesContainer: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  categoriesList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: '#6366f1',
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  categoryTextActive: {
    color: '#ffffff',
  },
  productsList: {
    padding: 12,
  },
  productCard: {
    flex: 1,
    margin: 6,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  productImage: {
    width: '100%',
    height: 150,
    backgroundColor: '#f1f5f9',
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 6,
    height: 38,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingText: {
    fontSize: 12,
    color: '#64748b',
    marginLeft: 4,
    fontWeight: '500',
  },
  soldText: {
    fontSize: 11,
    color: '#94a3b8',
    marginLeft: 4,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6366f1',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
  },
});
