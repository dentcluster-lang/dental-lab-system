import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { View, Text, StyleSheet } from 'react-native';

// Screens
import HomeScreen from '../screens/HomeScreen';
import OrderListScreen from '../screens/OrderListScreen';
import CreateOrderScreen from '../screens/CreateOrderScreen';
import ChatListScreen from '../screens/ChatListScreen';
import ChatRoomScreen from '../screens/ChatRoomScreen';
import ProfileScreen from '../screens/ProfileScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import MarketplaceScreen from '../screens/MarketplaceScreen';
import ProductDetailScreen from '../screens/ProductDetailScreen';
import CartScreen from '../screens/CartScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// 홈 스택 네비게이터
function HomeStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="HomeMain"
        component={HomeScreen}
        options={{
          title: '홈',
          headerShown: false // 홈 화면은 자체 헤더 사용
        }}
      />
    </Stack.Navigator>
  );
}

// 의뢰서 스택 네비게이터
function OrderStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="OrderList"
        component={OrderListScreen}
        options={{ title: '주문 관리' }}
      />
      <Stack.Screen
        name="CreateOrder"
        component={CreateOrderScreen}
        options={{ title: '의뢰서 작성' }}
      />
    </Stack.Navigator>
  );
}

// 채팅 스택 네비게이터
function ChatStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ChatList"
        component={ChatListScreen}
        options={{ title: '채팅' }}
      />
      <Stack.Screen
        name="ChatRoom"
        component={ChatRoomScreen}
        options={({ route }) => ({
          title: route.params?.partnerName || '채팅방'
        })}
      />
    </Stack.Navigator>
  );
}

// 마켓플레이스 스택 네비게이터
function MarketplaceStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="MarketplaceMain"
        component={MarketplaceScreen}
        options={{ title: '마켓플레이스' }}
      />
      <Stack.Screen
        name="ProductDetail"
        component={ProductDetailScreen}
        options={{ title: '상품 상세' }}
      />
      <Stack.Screen
        name="Cart"
        component={CartScreen}
        options={{ title: '장바구니' }}
      />
    </Stack.Navigator>
  );
}

// 프로필 스택 네비게이터
function ProfileStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ProfileMain"
        component={ProfileScreen}
        options={{ title: '마이페이지' }}
      />
    </Stack.Navigator>
  );
}

// 커스텀 탭 바 아이콘 (배지 지원)
function TabBarIcon({ name, focused, color, size, badge }) {
  return (
    <View style={styles.iconContainer}>
      <Icon name={name} size={size} color={color} />
      {badge > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {badge > 99 ? '99+' : badge}
          </Text>
        </View>
      )}
    </View>
  );
}

// 메인 탭 네비게이터 (5개 탭)
function MainTabs({ unreadCount = 0 }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          let badge = 0;

          if (route.name === 'Home') {
            iconName = focused ? 'view-dashboard' : 'view-dashboard-outline';
          } else if (route.name === 'Orders') {
            iconName = focused ? 'file-document-multiple' : 'file-document-multiple-outline';
          } else if (route.name === 'Chat') {
            iconName = focused ? 'message' : 'message-outline';
            badge = unreadCount; // 채팅 배지
          } else if (route.name === 'Marketplace') {
            iconName = focused ? 'shopping' : 'shopping-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'account-circle' : 'account-circle-outline';
          }

          return (
            <TabBarIcon
              name={iconName}
              focused={focused}
              color={color}
              size={size}
              badge={badge}
            />
          );
        },
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarStyle: {
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
          borderTopWidth: 1,
          borderTopColor: '#e2e8f0',
          backgroundColor: '#ffffff',
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeStack}
        options={{ title: '홈' }}
      />
      <Tab.Screen
        name="Orders"
        component={OrderStack}
        options={{ title: '주문' }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatStack}
        options={{ title: '채팅' }}
      />
      <Tab.Screen
        name="Marketplace"
        component={MarketplaceStack}
        options={{ title: '마켓' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStack}
        options={{ title: '마이' }}
      />
    </Tab.Navigator>
  );
}

// 앱 네비게이터 (인증 포함)
export default function AppNavigator({ isAuthenticated, unreadCount = 0 }) {
  return (
    <NavigationContainer>
      {isAuthenticated ? (
        <MainTabs unreadCount={unreadCount} />
      ) : (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    width: 24,
    height: 24,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
});
