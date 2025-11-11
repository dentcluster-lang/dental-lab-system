import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const { width } = Dimensions.get('window');

export default function ProductDetailScreen({ route, navigation }) {
  const { productId } = route.params;
  const [quantity, setQuantity] = useState(1);

  // 임시 제품 데이터
  const product = {
    id: productId,
    name: '지르코니아 크라운',
    price: 45000,
    images: [
      'https://via.placeholder.com/400',
      'https://via.placeholder.com/400',
      'https://via.placeholder.com/400',
    ],
    category: '보철물',
    rating: 4.5,
    reviewCount: 28,
    soldCount: 123,
    description: '고품질 지르코니아 소재를 사용한 크라운입니다. 자연치와 유사한 색상과 강도를 자랑합니다.',
    features: [
      '높은 강도와 내구성',
      '자연스러운 심미성',
      '생체 친화적 소재',
      '정밀한 제작',
    ],
    seller: {
      name: '서울치과기공소',
      rating: 4.8,
      responseTime: '1시간 이내',
    },
  };

  const incrementQuantity = () => setQuantity(quantity + 1);
  const decrementQuantity = () => {
    if (quantity > 1) setQuantity(quantity - 1);
  };

  const addToCart = () => {
    // 장바구니에 추가 로직
    alert(`${product.name} ${quantity}개가 장바구니에 추가되었습니다.`);
  };

  const buyNow = () => {
    // 바로 구매 로직
    navigation.navigate('Checkout', { productId, quantity });
  };

  return (
    <View style={styles.container}>
      <ScrollView>
        {/* 제품 이미지 */}
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          style={styles.imageSlider}
        >
          {product.images.map((image, index) => (
            <Image
              key={index}
              source={{ uri: image }}
              style={styles.productImage}
            />
          ))}
        </ScrollView>

        {/* 제품 정보 */}
        <View style={styles.infoContainer}>
          <Text style={styles.category}>{product.category}</Text>
          <Text style={styles.productName}>{product.name}</Text>

          {/* 평점 및 판매량 */}
          <View style={styles.statsContainer}>
            <View style={styles.ratingContainer}>
              <Icon name="star" size={16} color="#f59e0b" />
              <Text style={styles.ratingText}>{product.rating}</Text>
              <Text style={styles.reviewCount}>({product.reviewCount})</Text>
            </View>
            <Text style={styles.soldCount}>{product.soldCount}개 판매</Text>
          </View>

          <Text style={styles.price}>{product.price.toLocaleString()}원</Text>

          {/* 제품 설명 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>제품 설명</Text>
            <Text style={styles.description}>{product.description}</Text>
          </View>

          {/* 제품 특징 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>제품 특징</Text>
            {product.features.map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <Icon name="check-circle" size={16} color="#10b981" />
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>

          {/* 판매자 정보 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>판매자 정보</Text>
            <View style={styles.sellerCard}>
              <View style={styles.sellerInfo}>
                <Text style={styles.sellerName}>{product.seller.name}</Text>
                <View style={styles.sellerStats}>
                  <Icon name="star" size={14} color="#f59e0b" />
                  <Text style={styles.sellerRating}>{product.seller.rating}</Text>
                  <Text style={styles.sellerDivider}>•</Text>
                  <Text style={styles.sellerResponse}>
                    평균 응답 시간: {product.seller.responseTime}
                  </Text>
                </View>
              </View>
              <TouchableOpacity style={styles.chatButton}>
                <Icon name="message-outline" size={20} color="#6366f1" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* 하단 구매 바 */}
      <View style={styles.bottomBar}>
        <View style={styles.quantityContainer}>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={decrementQuantity}
          >
            <Icon name="minus" size={20} color="#64748b" />
          </TouchableOpacity>
          <Text style={styles.quantityText}>{quantity}</Text>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={incrementQuantity}
          >
            <Icon name="plus" size={20} color="#64748b" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.cartButton} onPress={addToCart}>
          <Icon name="cart-outline" size={20} color="#6366f1" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.buyButton} onPress={buyNow}>
          <Text style={styles.buyButtonText}>구매하기</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  imageSlider: {
    height: 300,
  },
  productImage: {
    width,
    height: 300,
    backgroundColor: '#f1f5f9',
  },
  infoContainer: {
    padding: 20,
  },
  category: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6366f1',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  productName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  reviewCount: {
    fontSize: 13,
    color: '#64748b',
  },
  soldCount: {
    fontSize: 13,
    color: '#64748b',
  },
  price: {
    fontSize: 28,
    fontWeight: '700',
    color: '#6366f1',
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 22,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#0f172a',
  },
  sellerCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
  },
  sellerInfo: {
    flex: 1,
  },
  sellerName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  sellerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sellerRating: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748b',
  },
  sellerDivider: {
    fontSize: 13,
    color: '#cbd5e1',
    marginHorizontal: 4,
  },
  sellerResponse: {
    fontSize: 12,
    color: '#64748b',
  },
  chatButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eef2ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 12,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
  },
  quantityButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    paddingHorizontal: 16,
  },
  cartButton: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#eef2ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buyButton: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buyButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
});
