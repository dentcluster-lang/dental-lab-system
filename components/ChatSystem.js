import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    collection, query, where, orderBy, onSnapshot, addDoc,
    updateDoc, doc, getDocs, getDoc, deleteDoc, serverTimestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import {
    MessageSquare, Search, Plus, Send, Paperclip, Image as ImageIcon,
    Mic, X, Download, Trash2, MoreVertical, Check, CheckCheck
} from 'lucide-react';
import './ChatSystem.css';

function ChatSystem() {
    const { orderId } = useParams();
    const navigate = useNavigate();
    const { currentUser, userData } = useAuth();

    const [chatRooms, setChatRooms] = useState([]);
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [showNewChatModal, setShowNewChatModal] = useState(false);
    const [connections, setConnections] = useState([]);
    const [selectedConnection, setSelectedConnection] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [uploadFiles, setUploadFiles] = useState([]);
    const [uploadPreviews, setUploadPreviews] = useState([]);
    const [expandedImage, setExpandedImage] = useState(null);

    // 🔔 알림 관련 state
    const [totalUnreadCount, setTotalUnreadCount] = useState(0);
    const [unreadCounts, setUnreadCounts] = useState({});
    const [notificationPermission, setNotificationPermission] = useState('default');

    // 📝 메시지 편집 모드 state
    const [isMessageEditMode, setIsMessageEditMode] = useState(false);
    const [selectedMessages, setSelectedMessages] = useState([]);

    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const imageInputRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const typingTimeoutRef = useRef(null);

    // 🔔 브라우저 알림 권한 요청
    useEffect(() => {
        if ('Notification' in window) {
            setNotificationPermission(Notification.permission);

            if (Notification.permission === 'default') {
                Notification.requestPermission().then(permission => {
                    setNotificationPermission(permission);
                });
            }
        }
    }, []);

    // 🔔 브라우저 알림 표시 함수
    const showBrowserNotification = useCallback((title, body) => {
        if (notificationPermission === 'granted' && document.hidden) {
            const notification = new Notification(title, {
                body: body,
                icon: '/logo192.png',
                badge: '/logo192.png',
                requireInteraction: false
            });

            notification.onclick = () => {
                window.focus();
                notification.close();
            };

            setTimeout(() => notification.close(), 5000);
        }
    }, [notificationPermission]);

    // 채팅방 목록 불러오기
    useEffect(() => {
        if (!currentUser || !userData) return;

        const targetId = userData.companyId || currentUser.uid;

        const q = query(
            collection(db, 'chatRooms'),
            where('participants', 'array-contains', targetId)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const rooms = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                isVirtual: false  // ✅ 실제 채팅방 표시
            }));

            rooms.sort((a, b) => {
                const aTime = a.lastMessageTime?.toMillis() || 0;
                const bTime = b.lastMessageTime?.toMillis() || 0;
                return bTime - aTime;
            });

            setChatRooms(rooms);
        });

        return () => unsubscribe();
    }, [currentUser, userData]);

    // 🔔 채팅방 ID 배열 메모이제이션 (무한 루프 방지)
    const chatRoomIds = useMemo(() => {
        return chatRooms.map(room => room.id).sort().join(',');
    }, [chatRooms]);

    // 🔔 읽지 않은 메시지 개수 계산 (실시간)
    useEffect(() => {
        if (!currentUser || !userData || chatRooms.length === 0) {
            setUnreadCounts({});
            setTotalUnreadCount(0);
            return;
        }

        const targetId = userData.companyId || currentUser.uid;
        const unsubscribers = [];

        chatRooms.forEach(room => {
            const messagesQuery = query(
                collection(db, 'chatRooms', room.id, 'messages'),
                where('senderId', '!=', targetId),
                where('read', '==', false)
            );

            const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
                const count = snapshot.size;

                setUnreadCounts(prev => {
                    if (prev[room.id] === count) {
                        return prev;
                    }

                    const updated = { ...prev, [room.id]: count };
                    const total = Object.values(updated).reduce((sum, c) => sum + c, 0);
                    setTotalUnreadCount(total);

                    return updated;
                });
            });

            unsubscribers.push(unsubscribe);
        });

        return () => {
            unsubscribers.forEach(unsub => unsub());
        };
    }, [currentUser, userData, chatRoomIds]);

    // 거래처 목록 불러오기
    useEffect(() => {
        if (!currentUser || !userData) return;

        const fetchConnections = async () => {
            try {
                const targetId = userData.companyId || currentUser.uid;

                // 1. connections 조회 (간단하게 수정)
                const connectionsRef = collection(db, 'connections');

                // ✅ requesterId로 보낸 연결
                const sentQuery = query(connectionsRef,
                    where('requesterId', '==', targetId),
                    where('status', '==', 'accepted')
                );

                // ✅ receiverId로 받은 연결 (recipientId 제거)
                const receivedQuery = query(connectionsRef,
                    where('receiverId', '==', targetId),
                    where('status', '==', 'accepted')
                );

                const [sentSnapshot, receivedSnapshot] = await Promise.all([
                    getDocs(sentQuery),
                    getDocs(receivedQuery)
                ]);

                // 모든 연결 합치기
                const allConnections = [
                    ...sentSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), direction: 'sent' })),
                    ...receivedSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), direction: 'received' }))
                ];

                // 중복 제거
                const uniqueConnections = allConnections.filter((conn, index, self) =>
                    index === self.findIndex((c) => c.id === conn.id)
                );

                // 2. 각 연결의 파트너 정보 가져오기
                const connectionsWithPartners = await Promise.all(
                    uniqueConnections.map(async (conn) => {
                        let partnerId;
                        if (conn.direction === 'sent') {
                            partnerId = conn.receiverId;
                        } else {
                            partnerId = conn.requesterId;
                        }

                        if (!partnerId) return null;

                        try {
                            const partnerDoc = await getDoc(doc(db, 'users', partnerId));
                            if (partnerDoc.exists()) {
                                const partnerData = partnerDoc.data();
                                return {
                                    ...conn,
                                    partnerId: partnerId,
                                    partnerName: partnerData.businessName || partnerData.companyName || partnerData.name || partnerData.email,
                                    partnerData: partnerData
                                };
                            }
                        } catch (error) {
                            console.error('파트너 정보 조회 실패:', error);
                        }
                        return null;
                    })
                );

                const validConnections = connectionsWithPartners.filter(c => c !== null);
                console.log('✅ 채팅 가능한 거래처:', validConnections);
                setConnections(validConnections);

            } catch (error) {
                console.error('❌ 거래처 목록 조회 실패:', error);
            }
        };


        fetchConnections();
    }, [currentUser, userData]);

    // orderId가 있으면 해당 채팅방 자동 선택 또는 생성
    useEffect(() => {
        if (!orderId || !currentUser || !userData) return;

        const findOrCreateChatRoom = async () => {
            // 기존 채팅방 찾기
            const existingRoom = chatRooms.find(r => r.orderId === orderId);

            if (existingRoom) {
                setSelectedRoom(existingRoom);
            } else {
                // 주문 정보 가져오기
                const orderDoc = await getDoc(doc(db, 'workOrders', orderId));
                if (!orderDoc.exists()) {
                    console.error('주문을 찾을 수 없습니다:', orderId);
                    return;
                }

                const orderData = orderDoc.data();
                const targetId = userData.companyId || currentUser.uid;
                const partnerId = orderData.fromUserId === targetId ?
                    orderData.toUserId : orderData.fromUserId;
                const partnerName = orderData.fromUserId === targetId ?
                    orderData.labName : orderData.dentistName;

                // 채팅방 생성
                try {
                    const chatRoomRef = await addDoc(collection(db, 'chatRooms'), {
                        participants: [targetId, partnerId],
                        participantNames: {
                            [targetId]: userData.businessName || userData.companyName || userData.displayName || '나',
                            [partnerId]: partnerName
                        },
                        orderId: orderId,
                        orderNumber: orderData.orderNumber,
                        lastMessage: '',
                        lastMessageTime: serverTimestamp(),
                        createdAt: serverTimestamp()
                    });

                    // 새로 생성된 채팅방 선택
                    const newRoom = {
                        id: chatRoomRef.id,
                        participants: [targetId, partnerId],
                        participantNames: {
                            [targetId]: userData.businessName || userData.companyName || userData.displayName || '나',
                            [partnerId]: partnerName
                        },
                        orderId: orderId,
                        orderNumber: orderData.orderNumber,
                        isVirtual: false
                    };
                    setSelectedRoom(newRoom);
                } catch (error) {
                    console.error('채팅방 생성 실패:', error);
                }
            }
        };

        if (chatRooms.length > 0) {
            findOrCreateChatRoom();
        }
    }, [orderId, chatRooms, currentUser, userData]);

    // 메시지 불러오기
    useEffect(() => {
        if (!selectedRoom || !selectedRoom.id || selectedRoom.isVirtual) {
            setMessages([]);
            return;
        }

        const q = query(
            collection(db, 'chatRooms', selectedRoom.id, 'messages'),
            orderBy('createdAt', 'asc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // 🔔 새 메시지 감지 및 알림
            const targetId = userData?.companyId || currentUser?.uid;
            snapshot.docChanges().forEach(change => {
                if (change.type === 'added') {
                    const message = change.doc.data();

                    if (message.senderId !== targetId && !message.read) {
                        const senderName = selectedRoom.participantNames?.[message.senderId] || '알 수 없음';
                        showBrowserNotification(
                            `${senderName}님의 새 메시지`,
                            message.text || '파일을 전송했습니다.'
                        );
                    }
                }
            });

            setMessages(msgs);
            scrollToBottom();
        });

        return () => unsubscribe();
    }, [selectedRoom, currentUser, userData, showBrowserNotification]);

    // 메시지를 읽음으로 표시
    useEffect(() => {
        if (!selectedRoom || !currentUser || !userData || selectedRoom.isVirtual) return;

        const targetId = userData.companyId || currentUser.uid;
        const markMessagesAsRead = async () => {
            const unreadQuery = query(
                collection(db, 'chatRooms', selectedRoom.id, 'messages'),
                where('senderId', '!=', targetId),
                where('read', '==', false)
            );

            const snapshot = await getDocs(unreadQuery);
            const updatePromises = snapshot.docs.map(doc =>
                updateDoc(doc.ref, { read: true })
            );

            await Promise.all(updatePromises);
        };

        markMessagesAsRead();
    }, [selectedRoom, currentUser, userData]);

    // 자동 스크롤
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // ✅ 타이핑 중 표시 (가상 채팅방 체크 추가)
    const handleTyping = useCallback(() => {
        if (!selectedRoom || selectedRoom.isVirtual || !selectedRoom.id) {
            console.log('타이핑 업데이트 스킵: 가상 채팅방 또는 ID 없음');
            return;
        }

        try {
            const targetId = userData.companyId || currentUser.uid;
            updateDoc(doc(db, 'chatRooms', selectedRoom.id), {
                [`typing.${targetId}`]: true
            });

            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }

            typingTimeoutRef.current = setTimeout(() => {
                stopTyping();
            }, 3000);
        } catch (error) {
            console.error('타이핑 상태 업데이트 실패:', error);
        }
    }, [selectedRoom, userData, currentUser]);

    // ✅ 타이핑 중지 (가상 채팅방 체크 추가)
    const stopTyping = useCallback(() => {
        if (!selectedRoom || selectedRoom.isVirtual || !selectedRoom.id) {
            console.log('타이핑 중지 스킵: 가상 채팅방 또는 ID 없음');
            return;
        }

        try {
            const targetId = userData.companyId || currentUser.uid;
            updateDoc(doc(db, 'chatRooms', selectedRoom.id), {
                [`typing.${targetId}`]: false
            });
        } catch (error) {
            console.error('타이핑 중지 실패:', error);
        }
    }, [selectedRoom, userData, currentUser]);

    // 메시지 전송
    const handleSendMessage = async () => {
        if ((!newMessage.trim() && uploadFiles.length === 0) || !selectedRoom) return;

        // ✅ 가상 채팅방이면 실제 채팅방 먼저 생성
        let roomToUse = selectedRoom;

        if (selectedRoom.isVirtual) {
            try {
                const targetId = userData.companyId || currentUser.uid;
                const partnerId = selectedRoom.participants.find(id => id !== targetId);

                // 실제 채팅방 생성
                const chatRoomRef = await addDoc(collection(db, 'chatRooms'), {
                    participants: selectedRoom.participants,
                    participantNames: selectedRoom.participantNames,
                    lastMessage: newMessage.trim(),
                    lastMessageTime: serverTimestamp(),
                    createdAt: serverTimestamp()
                });

                // 생성된 채팅방으로 전환
                roomToUse = {
                    ...selectedRoom,
                    id: chatRoomRef.id,
                    isVirtual: false
                };

                setSelectedRoom(roomToUse);
            } catch (error) {
                console.error('채팅방 생성 실패:', error);
                alert('채팅방 생성에 실패했습니다.');
                return;
            }
        }

        try {
            const targetId = userData.companyId || currentUser.uid;
            let fileUrls = [];

            // 파일 업로드
            if (uploadFiles.length > 0) {
                const uploadPromises = uploadFiles.map(async (file) => {
                    const fileRef = ref(storage, `chat/${roomToUse.id}/${Date.now()}_${file.name}`);
                    await uploadBytes(fileRef, file);
                    const url = await getDownloadURL(fileRef);
                    return { url, name: file.name, type: file.type };
                });

                fileUrls = await Promise.all(uploadPromises);
            }

            // 메시지 저장
            await addDoc(collection(db, 'chatRooms', roomToUse.id, 'messages'), {
                text: newMessage.trim(),
                senderId: targetId,
                senderName: userData.businessName || userData.companyName || userData.displayName || '익명',
                files: fileUrls,
                read: false,
                createdAt: serverTimestamp()
            });

            // 채팅방 최근 메시지 업데이트
            await updateDoc(doc(db, 'chatRooms', roomToUse.id), {
                lastMessage: newMessage.trim() || '파일 전송',
                lastMessageTime: serverTimestamp()
            });

            // 입력 초기화
            setNewMessage('');
            setUploadFiles([]);
            setUploadPreviews([]);
            stopTyping();
        } catch (error) {
            console.error('메시지 전송 실패:', error);
            alert('메시지 전송에 실패했습니다.');
        }
    };

    // 새 채팅 시작
    const handleStartNewChat = async () => {
        if (!selectedConnection) return;

        const connection = connections.find(c => c.id === selectedConnection);
        if (!connection) return;

        const targetId = userData.companyId || currentUser.uid;
        const partnerId = connection.partnerId;
        const partnerName = connection.partnerName;

        // 기존 채팅방 확인
        const existingRoom = chatRooms.find(room =>
            room.participants.includes(targetId) &&
            room.participants.includes(partnerId) &&
            !room.orderId
        );

        if (existingRoom) {
            setSelectedRoom(existingRoom);
            setShowNewChatModal(false);
            setSelectedConnection('');
            return;
        }

        // 가상 채팅방 생성 (실제로는 메시지 전송 시 생성됨)
        const virtualRoom = {
            id: `virtual-${Date.now()}`,
            participants: [targetId, partnerId],
            participantNames: {
                [targetId]: userData.businessName || userData.companyName || userData.displayName || '나',
                [partnerId]: partnerName
            },
            lastMessage: '',
            isVirtual: true
        };

        setSelectedRoom(virtualRoom);
        setShowNewChatModal(false);
        setSelectedConnection('');
    };

    // 📝 메시지 편집 모드 토글
    const toggleMessageEditMode = () => {
        setIsMessageEditMode(!isMessageEditMode);
        setSelectedMessages([]);
    };

    // 📝 메시지 선택/해제
    const toggleMessageSelection = (messageId) => {
        setSelectedMessages(prev => {
            if (prev.includes(messageId)) {
                return prev.filter(id => id !== messageId);
            } else {
                return [...prev, messageId];
            }
        });
    };

    // 📝 선택된 메시지 삭제
    const handleDeleteSelectedMessages = async () => {
        if (selectedMessages.length === 0) return;

        if (!window.confirm(`선택한 ${selectedMessages.length}개의 메시지를 삭제하시겠습니까?`)) {
            return;
        }

        try {
            // 선택된 메시지들 삭제
            const deletePromises = selectedMessages.map(messageId =>
                deleteDoc(doc(db, 'chatRooms', selectedRoom.id, 'messages', messageId))
            );

            await Promise.all(deletePromises);

            // 마지막 메시지 업데이트 (남은 메시지 중 가장 최근 메시지로)
            const remainingMessages = messages.filter(msg => !selectedMessages.includes(msg.id));
            if (remainingMessages.length > 0) {
                const lastMsg = remainingMessages[remainingMessages.length - 1];
                await updateDoc(doc(db, 'chatRooms', selectedRoom.id), {
                    lastMessage: lastMsg.text || '파일',
                    lastMessageTime: lastMsg.createdAt
                });
            } else {
                await updateDoc(doc(db, 'chatRooms', selectedRoom.id), {
                    lastMessage: '',
                    lastMessageTime: serverTimestamp()
                });
            }

            // 편집 모드 종료
            setIsMessageEditMode(false);
            setSelectedMessages([]);
        } catch (error) {
            console.error('메시지 삭제 실패:', error);
            alert('메시지 삭제에 실패했습니다.');
        }
    };

    // 파일 선택
    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files);
        setUploadFiles(prev => [...prev, ...files]);

        // 이미지 미리보기
        files.forEach(file => {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    setUploadPreviews(prev => [...prev, {
                        url: e.target.result,
                        file: file
                    }]);
                };
                reader.readAsDataURL(file);
            }
        });
    };

    // 파일 제거
    const handleRemoveFile = (index) => {
        setUploadFiles(prev => prev.filter((_, i) => i !== index));
        setUploadPreviews(prev => prev.filter((_, i) => i !== index));
    };

    // 음성 녹음 시작
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            const audioChunks = [];

            mediaRecorder.ondataavailable = (event) => {
                audioChunks.push(event.data);
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                const audioFile = new File([audioBlob], `voice_${Date.now()}.webm`, { type: 'audio/webm' });
                setUploadFiles(prev => [...prev, audioFile]);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorderRef.current = mediaRecorder;
            mediaRecorder.start();
            setIsRecording(true);
        } catch (error) {
            console.error('녹음 시작 실패:', error);
            alert('마이크 권한을 허용해주세요.');
        }
    };

    // 음성 녹음 중지
    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    // 메시지 삭제
    // 날짜 포맷
    const formatMessageTime = (timestamp) => {
        if (!timestamp) return '';
        const date = timestamp.toDate();
        return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    };

    // 검색 필터
    const filteredRooms = chatRooms.filter(room => {
        if (!searchQuery) return true;
        const targetId = userData?.companyId || currentUser?.uid;
        const partnerId = room.participants.find(id => id !== targetId);
        const partnerName = room.participantNames?.[partnerId] || '';
        const orderNumber = room.orderNumber || '';

        return partnerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            orderNumber.toLowerCase().includes(searchQuery.toLowerCase());
    });

    return (
        <div className="chat-system">
            {/* 채팅방 목록 */}
            <div className="chat-sidebar">
                <div className="sidebar-header">
                    <div className="header-content">
                        <MessageSquare size={24} />
                        <h2>
                            메시지
                            {totalUnreadCount > 0 && (
                                <span className="total-unread-badge">{totalUnreadCount}</span>
                            )}
                        </h2>
                    </div>
                    <button
                        className="btn-new-chat"
                        onClick={() => setShowNewChatModal(true)}
                        title="새 채팅 시작"
                    >
                        <Plus size={20} />
                    </button>
                </div>

                <div className="sidebar-search">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="대화 검색..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="chat-rooms-list">
                    {filteredRooms.map(room => {
                        const targetId = userData?.companyId || currentUser?.uid;
                        const partnerId = room.participants.find(id => id !== targetId);
                        const partnerName = room.participantNames?.[partnerId] || '알 수 없음';
                        const unreadCount = unreadCounts[room.id] || 0;

                        return (
                            <div
                                key={room.id}
                                className={`chat-room-item ${selectedRoom?.id === room.id ? 'active' : ''}`}
                                onClick={() => setSelectedRoom(room)}
                            >
                                <div className="room-avatar">
                                    {partnerName[0]}
                                </div>
                                <div className="room-info">
                                    <div className="room-header">
                                        <h4>{partnerName}</h4>
                                        {room.lastMessageTime && (
                                            <span className="room-time">
                                                {formatMessageTime(room.lastMessageTime)}
                                            </span>
                                        )}
                                    </div>
                                    <div className="room-preview">
                                        <p>{room.lastMessage || '메시지를 시작하세요'}</p>
                                        {unreadCount > 0 && (
                                            <span className="unread-badge">{unreadCount}</span>
                                        )}
                                    </div>
                                    {room.orderNumber && (
                                        <span className="order-tag">주문 #{room.orderNumber}</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {filteredRooms.length === 0 && (
                        <div className="empty-rooms">
                            <MessageSquare size={48} />
                            <p>대화가 없습니다</p>
                            <button onClick={() => setShowNewChatModal(true)}>
                                새 채팅 시작
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* 메시지 영역 */}
            {selectedRoom ? (
                <div className="chat-main">
                    {/* 채팅 헤더 */}
                    <div className="chat-header">
                        <div className="header-info">
                            <div className="partner-avatar">
                                {selectedRoom.participantNames?.[
                                    selectedRoom.participants.find(id => id !== (userData?.companyId || currentUser?.uid))
                                ]?.[0] || '?'}
                            </div>
                            <div>
                                <h3>
                                    {selectedRoom.participantNames?.[
                                        selectedRoom.participants.find(id => id !== (userData?.companyId || currentUser?.uid))
                                    ] || '알 수 없음'}
                                </h3>
                                {selectedRoom.orderNumber && (
                                    <span className="header-order-number">
                                        주문 #{selectedRoom.orderNumber}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="header-actions">
                            {selectedRoom.orderId && (
                                <button
                                    className="btn-view-order"
                                    onClick={() => navigate(`/view-order/${selectedRoom.orderId}`)}
                                >
                                    의뢰서 보기
                                </button>
                            )}
                        </div>
                    </div>

                    {/* 메시지 목록 */}
                    <div className={`chat-messages ${isMessageEditMode ? 'edit-mode' : ''}`}>
                        {messages.map((message) => {
                            const isMyMessage = message.senderId === (userData?.companyId || currentUser?.uid);
                            const isSelected = selectedMessages.includes(message.id);

                            return (
                                <div
                                    key={message.id}
                                    className={`message-group ${isMyMessage ? 'my-messages' : 'other-messages'} ${isSelected ? 'selected' : ''}`}
                                    onClick={() => isMessageEditMode && toggleMessageSelection(message.id)}
                                    style={{ cursor: isMessageEditMode ? 'pointer' : 'default' }}
                                >
                                    {isMessageEditMode && (
                                        <div
                                            className={`message-checkbox ${isSelected ? 'checked' : ''}`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleMessageSelection(message.id);
                                            }}
                                        >
                                            {isSelected && <Check size={16} />}
                                        </div>
                                    )}

                                    {!isMyMessage && (
                                        <div className="message-avatar">
                                            {message.senderName[0]}
                                        </div>
                                    )}

                                    <div className="message-content">
                                        {!isMyMessage && (
                                            <div className="message-sender">{message.senderName}</div>
                                        )}

                                        <div className="message-bubble">
                                            {message.text && <p>{message.text}</p>}

                                            {message.files && message.files.length > 0 && (
                                                <div className="message-files">
                                                    {message.files.map((file, idx) => (
                                                        <div key={idx} className="file-item">
                                                            {file.type?.startsWith('image/') ? (
                                                                <img
                                                                    src={file.url}
                                                                    alt={file.name}
                                                                    onClick={() => setExpandedImage(file.url)}
                                                                    style={{ cursor: 'pointer' }}
                                                                />
                                                            ) : (
                                                                <a href={file.url} download={file.name}>
                                                                    <Paperclip size={16} />
                                                                    {file.name}
                                                                    <Download size={16} />
                                                                </a>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            <div className="message-meta">
                                                <span className="message-time">
                                                    {formatMessageTime(message.createdAt)}
                                                </span>
                                                {isMyMessage && (
                                                    <span className="message-status">
                                                        {message.read ? <CheckCheck size={14} /> : <Check size={14} />}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {/* 타이핑 인디케이터 */}
                        {!selectedRoom.isVirtual && selectedRoom.typing && Object.entries(selectedRoom.typing).some(([id, isTyping]) =>
                            isTyping && id !== (userData?.companyId || currentUser?.uid)
                        ) && (
                                <div className="message-group other-messages">
                                    <div className="message-avatar">...</div>
                                    <div className="typing-indicator">
                                        <div className="typing-dot"></div>
                                        <div className="typing-dot"></div>
                                        <div className="typing-dot"></div>
                                    </div>
                                </div>
                            )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* 메시지 편집 모드 액션 바 */}
                    {isMessageEditMode && (
                        <div className="message-edit-actions">
                            <span className="selected-count">
                                {selectedMessages.length}개 선택됨
                            </span>
                            <button
                                className="btn-delete-selected-messages"
                                onClick={handleDeleteSelectedMessages}
                                disabled={selectedMessages.length === 0}
                            >
                                <Trash2 size={18} />
                                선택 삭제
                            </button>
                        </div>
                    )}

                    {/* 입력창 상단 편집 버튼 */}
                    {!isMessageEditMode && (
                        <div className="chat-input-header">
                            <button
                                className="btn-edit-mode-toggle"
                                onClick={toggleMessageEditMode}
                            >
                                <MoreVertical size={16} />
                                메시지 선택
                            </button>
                        </div>
                    )}

                    {isMessageEditMode && (
                        <div className="chat-input-header">
                            <button
                                className="btn-edit-mode-cancel"
                                onClick={toggleMessageEditMode}
                            >
                                <X size={16} />
                                편집 취소
                            </button>
                        </div>
                    )}

                    {/* 입력 영역 */}
                    {!isMessageEditMode && (
                        <div className="chat-input-container">
                            {uploadPreviews.length > 0 && (
                                <div className="upload-preview">
                                    {uploadPreviews.map((preview, index) => (
                                        <div key={index} className="upload-preview-item">
                                            <img src={preview.url} alt={preview.file.name} />
                                            <button
                                                className="btn-remove-upload"
                                                onClick={() => handleRemoveFile(index)}
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', width: '100%' }}>
                                <div className="chat-input-actions">
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        multiple
                                        style={{ display: 'none' }}
                                        onChange={handleFileSelect}
                                    />
                                    <input
                                        ref={imageInputRef}
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        style={{ display: 'none' }}
                                        onChange={handleFileSelect}
                                    />
                                    <button
                                        className="btn-attachment"
                                        onClick={() => fileInputRef.current?.click()}
                                        title="파일 첨부"
                                    >
                                        <Paperclip size={18} />
                                    </button>
                                    <button
                                        className="btn-attachment"
                                        onClick={() => imageInputRef.current?.click()}
                                        title="이미지 첨부"
                                    >
                                        <ImageIcon size={18} />
                                    </button>
                                    <button
                                        className={`btn-attachment ${isRecording ? 'recording' : ''}`}
                                        onClick={isRecording ? stopRecording : startRecording}
                                        title="음성 메시지"
                                    >
                                        <Mic size={18} />
                                    </button>
                                </div>

                                <div className="chat-input-wrapper">
                                    <textarea
                                        className="chat-input"
                                        placeholder="메시지를 입력하세요..."
                                        value={newMessage}
                                        onChange={(e) => {
                                            setNewMessage(e.target.value);
                                            handleTyping();
                                        }}
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSendMessage();
                                            }
                                        }}
                                        rows={1}
                                    />
                                </div>

                                <button
                                    className="btn-send"
                                    onClick={handleSendMessage}
                                    disabled={!newMessage.trim() && uploadFiles.length === 0}
                                    title="전송"
                                >
                                    <Send size={18} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="chat-empty">
                    <div className="empty-icon">
                        <MessageSquare size={64} />
                    </div>
                    <h3>메시지를 선택해주세요</h3>
                    <p>왼쪽에서 대화를 선택하거나 새로운 채팅을 시작하세요</p>
                </div>
            )}

            {/* 새 채팅 모달 */}
            {showNewChatModal && (
                <div className="modal-overlay" onClick={() => setShowNewChatModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>새 채팅 시작</h3>
                            <button
                                className="btn-close-modal"
                                onClick={() => setShowNewChatModal(false)}
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>
                                    <MessageSquare size={16} />
                                    채팅할 업체 선택
                                </label>
                                <select
                                    className="form-select"
                                    value={selectedConnection}
                                    onChange={(e) => setSelectedConnection(e.target.value)}
                                >
                                    <option value="">업체를 선택하세요</option>
                                    {connections.map(conn => (
                                        <option key={conn.id} value={conn.id}>
                                            {conn.partnerName}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button
                                className="btn-cancel"
                                onClick={() => setShowNewChatModal(false)}
                            >
                                취소
                            </button>
                            <button
                                className="btn-primary"
                                onClick={handleStartNewChat}
                                disabled={!selectedConnection}
                            >
                                채팅 시작
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 이미지 확대 모달 */}
            {expandedImage && (
                <div className="image-modal" onClick={() => setExpandedImage(null)}>
                    <button
                        className="btn-close-image"
                        onClick={() => setExpandedImage(null)}
                    >
                        <X size={24} />
                    </button>
                    <img src={expandedImage} alt="확대 이미지" />
                </div>
            )}
        </div>
    );
}

export default ChatSystem;