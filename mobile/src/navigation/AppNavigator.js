import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Screens
import HomeScreen from '../screens/HomeScreen';
import OrderListScreen from '../screens/OrderListScreen';
import CreateOrderScreen from '../screens/CreateOrderScreen';
import ChatListScreen from '../screens/ChatListScreen';
import ProfileScreen from '../screens/ProfileScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// 홈 스택 네비게이터
function HomeStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="HomeMain"
        component={HomeScreen}
        options={{ title: '홈' }}
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
        options={{ title: '의뢰서 목록' }}
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

// 메인 탭 네비게이터
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Orders') {
            iconName = focused ? 'file-document' : 'file-document-outline';
          } else if (route.name === 'Chat') {
            iconName = focused ? 'chat' : 'chat-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'account' : 'account-outline';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: 'gray',
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
        options={{ title: '의뢰서' }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatStack}
        options={{ title: '채팅' }}
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
export default function AppNavigator({ isAuthenticated }) {
  return (
    <NavigationContainer>
      {isAuthenticated ? (
        <MainTabs />
      ) : (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}
