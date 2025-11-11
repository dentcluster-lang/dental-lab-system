import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export default function ChatRoomScreen({ route }) {
  const { chatId, partnerName } = route.params;
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef(null);

  useEffect(() => {
    // Firebase에서 채팅 메시지 로드
    loadMessages();
  }, [chatId]);

  const loadMessages = () => {
    // 임시 메시지 데이터
    setMessages([
      {
        id: '1',
        text: '안녕하세요. 문의드립니다.',
        timestamp: new Date(Date.now() - 3600000),
        isOwn: true,
      },
      {
        id: '2',
        text: '네, 안녕하세요! 무엇을 도와드릴까요?',
        timestamp: new Date(Date.now() - 3500000),
        isOwn: false,
      },
      {
        id: '3',
        text: '지르코니아 크라운 제작 기간이 얼마나 걸리나요?',
        timestamp: new Date(Date.now() - 3400000),
        isOwn: true,
      },
      {
        id: '4',
        text: '보통 3-5일 정도 소요됩니다. 급하신가요?',
        timestamp: new Date(Date.now() - 3300000),
        isOwn: false,
      },
    ]);
  };

  const sendMessage = () => {
    if (inputText.trim()) {
      const newMessage = {
        id: Date.now().toString(),
        text: inputText,
        timestamp: new Date(),
        isOwn: true,
      };
      setMessages([...messages, newMessage]);
      setInputText('');

      // Firebase에 메시지 저장
      // saveMessage(newMessage);

      // 스크롤을 최하단으로
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const formatTime = (date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? '오후' : '오전';
    const displayHours = hours % 12 || 12;
    return `${ampm} ${displayHours}:${minutes.toString().padStart(2, '0')}`;
  };

  const renderMessage = ({ item, index }) => {
    const showDate =
      index === 0 ||
      new Date(messages[index - 1].timestamp).toDateString() !==
        new Date(item.timestamp).toDateString();

    return (
      <>
        {showDate && (
          <View style={styles.dateContainer}>
            <Text style={styles.dateText}>
              {new Date(item.timestamp).toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
          </View>
        )}
        <View
          style={[
            styles.messageContainer,
            item.isOwn
              ? styles.ownMessageContainer
              : styles.otherMessageContainer,
          ]}
        >
          <View
            style={[
              styles.messageBubble,
              item.isOwn ? styles.ownMessage : styles.otherMessage,
            ]}
          >
            <Text
              style={[
                styles.messageText,
                item.isOwn ? styles.ownMessageText : styles.otherMessageText,
              ]}
            >
              {item.text}
            </Text>
          </View>
          <Text style={styles.timeText}>{formatTime(item.timestamp)}</Text>
        </View>
      </>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: true })
        }
      />

      <View style={styles.inputContainer}>
        <TouchableOpacity style={styles.attachButton}>
          <Icon name="plus-circle-outline" size={24} color="#64748b" />
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          placeholder="메시지를 입력하세요..."
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={500}
          placeholderTextColor="#94a3b8"
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            !inputText.trim() && styles.sendButtonDisabled,
          ]}
          onPress={sendMessage}
          disabled={!inputText.trim()}
        >
          <Icon
            name="send"
            size={20}
            color={inputText.trim() ? '#ffffff' : '#cbd5e1'}
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  messagesList: {
    padding: 16,
  },
  dateContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  dateText: {
    fontSize: 12,
    color: '#94a3b8',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  messageContainer: {
    marginBottom: 12,
    maxWidth: '80%',
  },
  ownMessageContainer: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  otherMessageContainer: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  messageBubble: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    marginBottom: 4,
  },
  ownMessage: {
    backgroundColor: '#6366f1',
    borderBottomRightRadius: 4,
  },
  otherMessage: {
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  ownMessageText: {
    color: '#ffffff',
  },
  otherMessageText: {
    color: '#0f172a',
  },
  timeText: {
    fontSize: 11,
    color: '#94a3b8',
    paddingHorizontal: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 8,
  },
  attachButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    maxHeight: 100,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    fontSize: 14,
    color: '#0f172a',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#f1f5f9',
  },
});
