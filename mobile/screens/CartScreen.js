import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export default function CartScreen({ navigation }) {
  const [cartItems, setCartItems] = useState([
    {
      id: '1',
      name: '지르코니아 크라운',
      price: 45000,
      quantity: 2,
      image: 'https://via.placeholder.com/100',
      selected: true,
    },
    {
      id: '2',
      name: '세라믹 인레이',
      price: 35000,
      quantity: 1,
      image: 'https://via.placeholder.com/100',
      selected: true,
    },
  ]);

  const toggleSelect = (id) => {
    setCartItems(
      cartItems.map((item) =>
        item.id === id ? { ...item, selected: !item.selected } : item
      )
    );
  };

  const updateQuantity = (id, delta) => {
    setCartItems(
      cartItems.map((item) => {
        if (item.id === id) {
          const newQuantity = item.quantity + delta;
          return newQuantity > 0 ? { ...item, quantity: newQuantity } : item;
        }
        return item;
      })
    );
  };

  const removeItem = (id) => {
    Alert.alert('삭제 확인', '이 상품을 장바구니에서 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => setCartItems(cartItems.filter((item) => item.id !== id)),
      },
    ]);
  };

  const selectedItems = cartItems.filter((item) => item.selected);
  const totalPrice = selectedItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const deliveryFee = totalPrice > 50000 ? 0 : 3000;
  const finalPrice = totalPrice + deliveryFee;

  const renderCartItem = ({ item }) => (
    <View style={styles.cartItem}>
      <TouchableOpacity
        style={styles.checkbox}
        onPress={() => toggleSelect(item.id)}
      >
        <Icon
          name={item.selected ? 'checkbox-marked' : 'checkbox-blank-outline'}
          size={24}
          color={item.selected ? '#6366f1' : '#cbd5e1'}
        />
      </TouchableOpacity>

      <Image source={{ uri: item.image }} style={styles.itemImage} />

      <View style={styles.itemInfo}>
        <Text style={styles.itemName} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={styles.itemPrice}>{item.price.toLocaleString()}원</Text>

        <View style={styles.quantityContainer}>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => updateQuantity(item.id, -1)}
          >
            <Icon name="minus" size={16} color="#64748b" />
          </TouchableOpacity>
          <Text style={styles.quantityText}>{item.quantity}</Text>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => updateQuantity(item.id, 1)}
          >
            <Icon name="plus" size={16} color="#64748b" />
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => removeItem(item.id)}
      >
        <Icon name="close" size={20} color="#94a3b8" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {cartItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="cart-outline" size={64} color="#cbd5e1" />
          <Text style={styles.emptyText}>장바구니가 비어있습니다</Text>
          <TouchableOpacity
            style={styles.shopButton}
            onPress={() => navigation.navigate('Marketplace')}
          >
            <Text style={styles.shopButtonText}>쇼핑 시작하기</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            data={cartItems}
            renderItem={renderCartItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.cartList}
            ListHeaderComponent={() => (
              <View style={styles.header}>
                <TouchableOpacity
                  style={styles.selectAll}
                  onPress={() => {
                    const allSelected = cartItems.every((item) => item.selected);
                    setCartItems(
                      cartItems.map((item) => ({
                        ...item,
                        selected: !allSelected,
                      }))
                    );
                  }}
                >
                  <Icon
                    name={
                      cartItems.every((item) => item.selected)
                        ? 'checkbox-marked'
                        : 'checkbox-blank-outline'
                    }
                    size={24}
                    color="#6366f1"
                  />
                  <Text style={styles.selectAllText}>전체선택</Text>
                </TouchableOpacity>
              </View>
            )}
          />

          {/* 하단 결제 바 */}
          <View style={styles.bottomBar}>
            <View style={styles.priceInfo}>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>상품 금액</Text>
                <Text style={styles.priceValue}>
                  {totalPrice.toLocaleString()}원
                </Text>
              </View>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>배송비</Text>
                <Text style={styles.priceValue}>
                  {deliveryFee === 0
                    ? '무료'
                    : `${deliveryFee.toLocaleString()}원`}
                </Text>
              </View>
              <View style={[styles.priceRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>총 결제 금액</Text>
                <Text style={styles.totalValue}>
                  {finalPrice.toLocaleString()}원
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[
                styles.checkoutButton,
                selectedItems.length === 0 && styles.checkoutButtonDisabled,
              ]}
              disabled={selectedItems.length === 0}
              onPress={() =>
                navigation.navigate('Checkout', {
                  items: selectedItems,
                  totalPrice: finalPrice,
                })
              }
            >
              <Text style={styles.checkoutButtonText}>
                {selectedItems.length}개 상품 주문하기
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  selectAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  cartList: {
    paddingBottom: 16,
  },
  cartItem: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    alignItems: 'flex-start',
  },
  checkbox: {
    marginRight: 12,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6366f1',
    marginBottom: 8,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  quantityButton: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
    paddingHorizontal: 12,
  },
  deleteButton: {
    padding: 4,
  },
  bottomBar: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    padding: 16,
    paddingBottom: 24,
  },
  priceInfo: {
    marginBottom: 16,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  priceValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#0f172a',
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6366f1',
  },
  checkoutButton: {
    height: 52,
    borderRadius: 8,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkoutButtonDisabled: {
    backgroundColor: '#cbd5e1',
  },
  checkoutButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
  },
  shopButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#6366f1',
  },
  shopButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
});
