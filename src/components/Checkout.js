import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { db } from '../firebase/config';
import { doc, getDoc, updateDoc, increment, setDoc } from 'firebase/firestore';
import { Package, MapPin, CreditCard, ShoppingBag, AlertCircle, ChevronRight, Check, Search, Trash2, Star, ArrowLeft, User, Phone } from 'lucide-react';
import {
    loadIamportScript,
    initializeIamport,
    requestUnifiedPayment,
    createMarketplaceOrder,
    getServicePrice
} from '../services/UnifiedPaymentService';

const Checkout = ({ user, userInfo }) => {
    const location = useLocation();
    const navigate = useNavigate();
    
    const { items = [], shippingAddress: cartShippingAddress, buyNow = false } = location.state || {};
    
    const [cartItems, setCartItems] = useState(items);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [paymentProcessing, setPaymentProcessing] = useState(false);

    const currentUser = userInfo || user;

    // 배송지 정보
    const [shippingInfo, setShippingInfo] = useState({
        name: '',
        phone: '',
        address: '',
        detailAddress: '',
        zipcode: '',
        message: ''
    });

    const [savedAddresses, setSavedAddresses] = useState([]);
    const [selectedAddressId, setSelectedAddressId] = useState(null);
    const [showAddressModal, setShowAddressModal] = useState(false);
    const [showPostcodeModal, setShowPostcodeModal] = useState(false);
    const [saveAsNew, setSaveAsNew] = useState(false);
    const [setAsDefault, setSetAsDefault] = useState(false);

    const [paymentMethod, setPaymentMethod] = useState('card');
    const [marketplaceSettings, setMarketplaceSettings] = useState(null);
    const [errors, setErrors] = useState({});

    // 🎯 개선: 에러 토스트 메시지 상태 추가
    const [errorToast, setErrorToast] = useState('');
    const [successToast, setSuccessToast] = useState('');

    // 🎯 개선: 토스트 메시지 자동 숨김
    useEffect(() => {
        if (errorToast) {
            const timer = setTimeout(() => setErrorToast(''), 5000);
            return () => clearTimeout(timer);
        }
    }, [errorToast]);

    useEffect(() => {
        if (successToast) {
            const timer = setTimeout(() => setSuccessToast(''), 5000);
            return () => clearTimeout(timer);
        }
    }, [successToast]);

    // 🎯 개선: 아임포트 초기화 에러 처리 강화
    useEffect(() => {
        const initPayment = async () => {
            try {
                await loadIamportScript();
                initializeIamport();
                console.log('✅ 아임포트 초기화 완료');
            } catch (error) {
                console.error('❌ 아임포트 초기화 실패:', error);
                setErrorToast('결제 시스템 초기화에 실패했습니다. 페이지를 새로고침해주세요.');
            }
        };
        initPayment();
    }, []);

    // 🎯 개선: 마켓플레이스 설정 로드 에러 처리
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const settings = await getServicePrice('marketplace');
                setMarketplaceSettings(settings);
            } catch (error) {
                console.error('❌ 설정 로드 실패:', error);
                setErrorToast('가격 정보를 불러오는데 실패했습니다.');
            }
        };
        loadSettings();
    }, []);

    // 저장된 배송지 불러오기
    const loadSavedAddresses = useCallback(async () => {
        if (!currentUser) return;
        
        try {
            const userRef = doc(db, 'users', currentUser.uid);
            const userDoc = await getDoc(userRef);
            
            if (userDoc.exists()) {
                const userData = userDoc.data();
                const addresses = userData.addresses || userData.shippingAddresses || [];
                setSavedAddresses(addresses);
                
                if (cartShippingAddress) {
                    const matchingAddress = addresses.find(addr => addr.id === cartShippingAddress.id);
                    if (matchingAddress) {
                        setSelectedAddressId(matchingAddress.id);
                        setShippingInfo({
                            name: matchingAddress.name,
                            phone: matchingAddress.phone,
                            address: matchingAddress.address,
                            detailAddress: matchingAddress.detailAddress || '',
                            zipcode: matchingAddress.zipCode || matchingAddress.zipcode,
                            message: matchingAddress.message || ''
                        });
                    } else {
                        setShippingInfo({
                            name: cartShippingAddress.name,
                            phone: cartShippingAddress.phone,
                            address: cartShippingAddress.address,
                            detailAddress: cartShippingAddress.detailAddress || '',
                            zipcode: cartShippingAddress.zipCode || cartShippingAddress.zipcode,
                            message: ''
                        });
                    }
                } else {
                    const defaultAddress = addresses.find(addr => addr.isDefault);
                    if (defaultAddress) {
                        setSelectedAddressId(defaultAddress.id);
                        setShippingInfo({
                            name: defaultAddress.name,
                            phone: defaultAddress.phone,
                            address: defaultAddress.address,
                            detailAddress: defaultAddress.detailAddress || '',
                            zipcode: defaultAddress.zipcode || defaultAddress.zipCode,
                            message: defaultAddress.message || ''
                        });
                    }
                }
            }
        } catch (error) {
            console.error('배송지 로드 실패:', error);
            setErrorToast('배송지 정보를 불러오는데 실패했습니다.');
        }
    }, [currentUser, cartShippingAddress]);

    const autoFillShippingInfo = useCallback(async () => {
        if (cartShippingAddress) return;
        
        try {
            if (currentUser.companyId) {
                const companyRef = doc(db, 'users', currentUser.companyId);
                const companyDoc = await getDoc(companyRef);
                
                if (companyDoc.exists()) {
                    const companyData = companyDoc.data();
                    setShippingInfo({
                        name: companyData.companyName || '',
                        phone: companyData.phone || '',
                        address: companyData.address || '',
                        detailAddress: '',
                        zipcode: companyData.zipcode || '',
                        message: ''
                    });
                }
            } else if (currentUser.businessType) {
                setShippingInfo({
                    name: currentUser.companyName || currentUser.clinicName || currentUser.labName || '',
                    phone: currentUser.phone || '',
                    address: currentUser.address || '',
                    detailAddress: '',
                    zipcode: currentUser.zipcode || '',
                    message: ''
                });
            } else {
                setShippingInfo({
                    name: currentUser.name || '',
                    phone: currentUser.phone || '',
                    address: currentUser.address || '',
                    detailAddress: '',
                    zipcode: currentUser.zipcode || '',
                    message: ''
                });
            }
        } catch (error) {
            console.error('사용자 정보 로드 실패:', error);
        }
    }, [currentUser, cartShippingAddress]);

    const loadCartAndUserInfo = useCallback(async () => {
        try {
            if (items && items.length > 0) {
                setCartItems(items);
            } else {
                const cartUserId = currentUser.companyId || currentUser.uid;
                const cartKey = `dentconnect_cart_${cartUserId}`;
                
                const savedCart = localStorage.getItem(cartKey);
                if (savedCart) {
                    const cartData = JSON.parse(savedCart);
                    setCartItems(cartData);
                } else {
                    navigate('/cart');
                    return;
                }
            }

            if (currentUser) {
                await loadSavedAddresses();
                
                const userRef = doc(db, 'users', currentUser.uid);
                const userDoc = await getDoc(userRef);
                const addresses = userDoc.exists() ? (userDoc.data().addresses || userDoc.data().shippingAddresses || []) : [];
                
                if (addresses.length === 0 && !cartShippingAddress) {
                    await autoFillShippingInfo();
                }
            }
        } catch (error) {
            console.error('데이터 로드 실패:', error);
            setErrorToast('장바구니 정보를 불러오는데 실패했습니다.');
        } finally {
            setLoading(false);
        }
    }, [currentUser, items, cartShippingAddress, autoFillShippingInfo, loadSavedAddresses, navigate]);

    // 다음 우편번호 API 스크립트 로드
    useEffect(() => {
        const script = document.createElement('script');
        script.src = '//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
        script.async = true;
        document.body.appendChild(script);

        return () => {
            if (document.body.contains(script)) {
                document.body.removeChild(script);
            }
        };
    }, []);

    useEffect(() => {
        if (!currentUser) {
            alert('로그인이 필요합니다.');
            navigate('/signin');
            return;
        }
        loadCartAndUserInfo();
    }, [currentUser, loadCartAndUserInfo, navigate]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setShippingInfo(prev => ({
            ...prev,
            [name]: value
        }));
        setSelectedAddressId(null);
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    // 🎯 개선: 유효성 검사 개선
    const validateForm = () => {
        const newErrors = {};

        if (!shippingInfo.name.trim()) {
            newErrors.name = '이름을 입력해주세요';
        }

        // 🎯 전화번호 형식 검사 강화
        const phoneRegex = /^010-?\d{4}-?\d{4}$/;
        if (!shippingInfo.phone.trim()) {
            newErrors.phone = '전화번호를 입력해주세요';
        } else if (!phoneRegex.test(shippingInfo.phone.replace(/-/g, ''))) {
            newErrors.phone = '올바른 전화번호 형식이 아닙니다 (예: 010-1234-5678)';
        }

        if (!shippingInfo.address.trim()) {
            newErrors.address = '주소를 입력해주세요';
        }

        if (!shippingInfo.zipcode.trim()) {
            newErrors.zipcode = '우편번호를 입력해주세요';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleAddressSearch = () => {
        if (window.daum && window.daum.Postcode) {
            new window.daum.Postcode({
                oncomplete: (data) => {
                    setShippingInfo(prev => ({
                        ...prev,
                        address: data.address,
                        zipcode: data.zonecode
                    }));
                    setShowPostcodeModal(false);
                    setErrors(prev => ({
                        ...prev,
                        address: '',
                        zipcode: ''
                    }));
                }
            }).open();
        }
    };

    const selectAddress = (address) => {
        setShippingInfo({
            name: address.name,
            phone: address.phone,
            address: address.address,
            detailAddress: address.detailAddress || '',
            zipcode: address.zipcode || address.zipCode,
            message: ''
        });
        setSelectedAddressId(address.id);
        setShowAddressModal(false);
        setErrors({});
    };

    const calculateTotals = () => {
        const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const shippingFee = subtotal >= 50000 ? 0 : 3000;
        const total = subtotal + shippingFee;
        return { subtotal, shippingFee, total };
    };

    // 🎯 개선: 결제 프로세스 에러 처리 강화
    const handlePayment = async () => {
        if (!validateForm()) {
            setErrorToast('배송 정보를 모두 입력해주세요.');
            return;
        }

        if (cartItems.length === 0) {
            setErrorToast('장바구니가 비어있습니다.');
            return;
        }

        setPaymentProcessing(true);
        setErrorToast('');

        try {
            const { total } = calculateTotals();
            
            // 🎯 결제 데이터 준비
            const paymentData = {
                amount: total,
                buyerName: shippingInfo.name,
                buyerTel: shippingInfo.phone,
                buyerAddr: `${shippingInfo.address} ${shippingInfo.detailAddress}`,
                buyerPostcode: shippingInfo.zipcode,
            };

            // 🎯 결제 요청
            const paymentResult = await requestUnifiedPayment(
                'marketplace',
                paymentData,
                currentUser.uid,
                'marketplace'
            );

            if (paymentResult.success) {
                // 🎯 주문 생성
                const orderData = {
                    items: cartItems,
                    shippingInfo,
                    paymentMethod,
                    ...calculateTotals(),
                    paymentId: paymentResult.imp_uid,
                    merchantUid: paymentResult.merchant_uid,
                    buyNow
                };

                await createMarketplaceOrder(currentUser.uid, orderData);

                // 🎯 장바구니 비우기
                if (!buyNow) {
                    const cartUserId = currentUser.companyId || currentUser.uid;
                    const cartKey = `dentconnect_cart_${cartUserId}`;
                    localStorage.removeItem(cartKey);
                }

                setSuccessToast('결제가 완료되었습니다!');
                
                // 🎯 2초 후 주문 완료 페이지로 이동
                setTimeout(() => {
                    navigate('/order-complete', {
                        state: {
                            orderData,
                            paymentResult
                        }
                    });
                }, 2000);

            } else {
                throw new Error(paymentResult.error || '결제에 실패했습니다.');
            }

        } catch (error) {
            console.error('결제 처리 실패:', error);
            
            // 🎯 구체적인 에러 메시지 제공
            let errorMessage = '결제 처리 중 오류가 발생했습니다.';
            
            if (error.message.includes('사용자가 결제를 취소')) {
                errorMessage = '결제가 취소되었습니다.';
            } else if (error.message.includes('카드')) {
                errorMessage = '카드 결제에 실패했습니다. 카드 정보를 확인해주세요.';
            } else if (error.message.includes('network') || error.message.includes('Network')) {
                errorMessage = '네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.';
            } else if (error.message) {
                errorMessage = error.message;
            }

            setErrorToast(errorMessage);
        } finally {
            setPaymentProcessing(false);
        }
    };

    const { subtotal, shippingFee, total } = calculateTotals();

    // 🎯 개선: 로딩 상태 UI 개선
    if (loading) {
        return (
            <div style={styles.container}>
                <div style={styles.loadingContainer}>
                    <div style={styles.spinner}></div>
                    <p style={styles.loadingText}>주문 정보를 불러오는 중...</p>
                </div>
            </div>
        );
    }

    // 🎯 개선: 장바구니 비었을 때 UI
    if (cartItems.length === 0) {
        return (
            <div style={styles.container}>
                <div style={styles.emptyState}>
                    <ShoppingBag size={64} style={{ color: '#cbd5e1' }} />
                    <p style={styles.emptyText}>장바구니가 비어있습니다</p>
                    <button 
                        onClick={() => navigate('/marketplace')} 
                        style={styles.shopButton}
                    >
                        쇼핑 계속하기
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            {/* 🎯 개선: 토스트 메시지 UI 추가 */}
            {errorToast && (
                <div style={styles.errorToast}>
                    <AlertCircle size={20} />
                    <span>{errorToast}</span>
                </div>
            )}
            
            {successToast && (
                <div style={styles.successToast}>
                    <Check size={20} />
                    <span>{successToast}</span>
                </div>
            )}

            <button onClick={() => navigate(-1)} style={styles.backButton}>
                <ArrowLeft size={20} />
                뒤로 가기
            </button>

            <div style={styles.header}>
                <h1 style={styles.title}>주문/결제</h1>
                <p style={styles.subtitle}>주문 정보를 확인하고 결제를 진행해주세요</p>
            </div>

            <div style={styles.content}>
                <div style={styles.mainColumn}>
                    {/* 배송지 정보 */}
                    <div style={styles.section}>
                        <div style={styles.sectionHeader}>
                            <div style={styles.sectionTitleWrapper}>
                                <MapPin size={24} style={{ color: '#6366f1' }} />
                                <h2 style={styles.sectionTitle}>배송지 정보</h2>
                            </div>
                            {savedAddresses.length > 0 && (
                                <button
                                    onClick={() => setShowAddressModal(true)}
                                    style={styles.addressBookButton}
                                >
                                    <Search size={16} />
                                    배송지 선택
                                </button>
                            )}
                        </div>

                        <div style={styles.formGrid}>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>
                                    <User size={16} />
                                    받는 사람 *
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    value={shippingInfo.name}
                                    onChange={handleInputChange}
                                    placeholder="이름을 입력하세요"
                                    style={{
                                        ...styles.input,
                                        ...(errors.name ? styles.inputError : {})
                                    }}
                                />
                                {errors.name && (
                                    <span style={styles.errorText}>{errors.name}</span>
                                )}
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.label}>
                                    <Phone size={16} />
                                    전화번호 *
                                </label>
                                <input
                                    type="tel"
                                    name="phone"
                                    value={shippingInfo.phone}
                                    onChange={handleInputChange}
                                    placeholder="010-1234-5678"
                                    style={{
                                        ...styles.input,
                                        ...(errors.phone ? styles.inputError : {})
                                    }}
                                />
                                {errors.phone && (
                                    <span style={styles.errorText}>{errors.phone}</span>
                                )}
                            </div>

                            <div style={styles.addressGroup}>
                                <label style={styles.label}>
                                    <MapPin size={16} />
                                    주소 *
                                </label>
                                <div style={styles.addressSearchWrapper}>
                                    <input
                                        type="text"
                                        value={shippingInfo.zipcode}
                                        placeholder="우편번호"
                                        readOnly
                                        style={{
                                            ...styles.input,
                                            flex: 1,
                                            ...(errors.zipcode ? styles.inputError : {})
                                        }}
                                    />
                                    <button
                                        onClick={handleAddressSearch}
                                        style={styles.addressSearchButton}
                                    >
                                        <Search size={16} />
                                        주소 검색
                                    </button>
                                </div>
                                {errors.zipcode && (
                                    <span style={styles.errorText}>{errors.zipcode}</span>
                                )}
                                
                                <input
                                    type="text"
                                    value={shippingInfo.address}
                                    placeholder="주소"
                                    readOnly
                                    style={{
                                        ...styles.input,
                                        marginTop: '8px',
                                        ...(errors.address ? styles.inputError : {})
                                    }}
                                />
                                {errors.address && (
                                    <span style={styles.errorText}>{errors.address}</span>
                                )}
                                
                                <input
                                    type="text"
                                    name="detailAddress"
                                    value={shippingInfo.detailAddress}
                                    onChange={handleInputChange}
                                    placeholder="상세주소를 입력하세요"
                                    style={{
                                        ...styles.input,
                                        marginTop: '8px'
                                    }}
                                />
                            </div>

                            <div style={styles.formGroupFull}>
                                <label style={styles.label}>배송 메모</label>
                                <textarea
                                    name="message"
                                    value={shippingInfo.message}
                                    onChange={handleInputChange}
                                    placeholder="배송 시 요청사항을 입력하세요 (선택사항)"
                                    style={styles.textarea}
                                    rows={3}
                                />
                            </div>
                        </div>
                    </div>

                    {/* 결제 수단 */}
                    <div style={styles.section}>
                        <div style={styles.sectionTitleWrapper}>
                            <CreditCard size={24} style={{ color: '#6366f1' }} />
                            <h2 style={styles.sectionTitle}>결제 수단</h2>
                        </div>

                        <div style={styles.paymentMethods}>
                            <button
                                onClick={() => setPaymentMethod('card')}
                                style={{
                                    ...styles.paymentMethod,
                                    ...(paymentMethod === 'card' ? styles.paymentMethodActive : {})
                                }}
                            >
                                <CreditCard size={20} />
                                신용/체크카드
                                {paymentMethod === 'card' && (
                                    <Check size={20} style={{ marginLeft: 'auto' }} />
                                )}
                            </button>

                            <button
                                onClick={() => setPaymentMethod('trans')}
                                style={{
                                    ...styles.paymentMethod,
                                    ...(paymentMethod === 'trans' ? styles.paymentMethodActive : {})
                                }}
                            >
                                <CreditCard size={20} />
                                실시간 계좌이체
                                {paymentMethod === 'trans' && (
                                    <Check size={20} style={{ marginLeft: 'auto' }} />
                                )}
                            </button>

                            <button
                                onClick={() => setPaymentMethod('vbank')}
                                style={{
                                    ...styles.paymentMethod,
                                    ...(paymentMethod === 'vbank' ? styles.paymentMethodActive : {})
                                }}
                            >
                                <CreditCard size={20} />
                                가상계좌
                                {paymentMethod === 'vbank' && (
                                    <Check size={20} style={{ marginLeft: 'auto' }} />
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* 주문 정보 사이드바 */}
                <div style={styles.sidebar}>
                    <div style={styles.orderSummary}>
                        <h3 style={styles.orderSummaryTitle}>
                            <ShoppingBag size={20} />
                            주문 상품 ({cartItems.length}개)
                        </h3>

                        <div style={styles.orderItems}>
                            {cartItems.map((item) => (
                                <div key={item.id} style={styles.orderItem}>
                                    <img
                                        src={item.imageUrl || '/placeholder.png'}
                                        alt={item.name}
                                        style={styles.orderItemImage}
                                    />
                                    <div style={styles.orderItemInfo}>
                                        <p style={styles.orderItemName}>{item.name}</p>
                                        <p style={styles.orderItemPrice}>
                                            {item.quantity}개 × {item.price.toLocaleString()}원
                                        </p>
                                    </div>
                                    <p style={styles.orderItemTotal}>
                                        {(item.price * item.quantity).toLocaleString()}원
                                    </p>
                                </div>
                            ))}
                        </div>

                        <div style={styles.priceDetails}>
                            <div style={styles.priceRow}>
                                <span>상품금액</span>
                                <span>{subtotal.toLocaleString()}원</span>
                            </div>
                            <div style={styles.priceRow}>
                                <span>배송비</span>
                                <span style={{ color: shippingFee === 0 ? '#10b981' : '#64748b' }}>
                                    {shippingFee === 0 ? '무료' : `${shippingFee.toLocaleString()}원`}
                                </span>
                            </div>
                            <div style={styles.divider}></div>
                            <div style={{ ...styles.priceRow, ...styles.totalRow }}>
                                <span>총 결제금액</span>
                                <span style={styles.totalPrice}>{total.toLocaleString()}원</span>
                            </div>
                        </div>

                        {subtotal < 50000 && (
                            <div style={styles.notice}>
                                <AlertCircle size={16} />
                                50,000원 이상 구매 시 배송비 무료!
                            </div>
                        )}

                        <button
                            onClick={handlePayment}
                            disabled={paymentProcessing || cartItems.length === 0}
                            style={{
                                ...styles.orderButton,
                                ...(paymentProcessing || cartItems.length === 0 ? styles.orderButtonDisabled : {})
                            }}
                        >
                            {paymentProcessing ? (
                                <>
                                    <div style={styles.spinner}></div>
                                    결제 처리 중...
                                </>
                            ) : (
                                <>
                                    <CreditCard size={20} />
                                    {total.toLocaleString()}원 결제하기
                                </>
                            )}
                        </button>

                        <div style={styles.agreement}>
                            <Check size={16} style={{ color: '#6366f1' }} />
                            <span>주문 내용을 확인했으며, 결제에 동의합니다.</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 배송지 선택 모달 */}
            {showAddressModal && (
                <div style={styles.modalOverlay} onClick={() => setShowAddressModal(false)}>
                    <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <h3 style={styles.modalTitle}>배송지 선택</h3>
                            <button
                                onClick={() => setShowAddressModal(false)}
                                style={styles.closeButton}
                            >
                                ×
                            </button>
                        </div>
                        <div style={styles.modalBody}>
                            {savedAddresses.map((address) => (
                                <div
                                    key={address.id}
                                    style={{
                                        ...styles.addressItem,
                                        ...(selectedAddressId === address.id ? { borderColor: '#6366f1', backgroundColor: '#f0f9ff' } : {})
                                    }}
                                >
                                    <div
                                        style={styles.addressItemContent}
                                        onClick={() => selectAddress(address)}
                                    >
                                        <div style={styles.addressItemHeader}>
                                            <span style={styles.addressItemName}>{address.name}</span>
                                            {address.isDefault && (
                                                <span style={styles.defaultBadgeSmall}>
                                                    <Star size={12} />
                                                    기본 배송지
                                                </span>
                                            )}
                                        </div>
                                        <p style={styles.addressItemPhone}>{address.phone}</p>
                                        <p style={styles.addressItemAddress}>
                                            [{address.zipcode || address.zipCode}] {address.address}
                                            {address.detailAddress && ` ${address.detailAddress}`}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// 🎯 개선: 스타일 추가 및 개선
const styles = {
    container: {
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '32px 24px',
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
    },
    // 🎯 토스트 메시지 스타일 추가
    errorToast: {
        position: 'fixed',
        top: '24px',
        right: '24px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '16px 24px',
        backgroundColor: '#fee2e2',
        color: '#dc2626',
        borderRadius: '12px',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
        zIndex: 2000,
        fontSize: '15px',
        fontWeight: '600',
        animation: 'slideInRight 0.3s ease',
    },
    successToast: {
        position: 'fixed',
        top: '24px',
        right: '24px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '16px 24px',
        backgroundColor: '#d1fae5',
        color: '#059669',
        borderRadius: '12px',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
        zIndex: 2000,
        fontSize: '15px',
        fontWeight: '600',
        animation: 'slideInRight 0.3s ease',
    },
    // 🎯 스피너 스타일 개선
    spinner: {
        width: '20px',
        height: '20px',
        border: '3px solid rgba(99, 102, 241, 0.2)',
        borderTop: '3px solid #6366f1',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
    },
    backButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 20px',
        marginBottom: '24px',
        backgroundColor: 'white',
        border: '2px solid #e2e8f0',
        borderRadius: '12px',
        fontSize: '15px',
        fontWeight: '600',
        color: '#475569',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    header: {
        marginBottom: '32px',
    },
    title: {
        fontSize: '32px',
        fontWeight: '700',
        color: '#1e293b',
        margin: '0 0 8px 0',
    },
    subtitle: {
        fontSize: '16px',
        color: '#64748b',
        margin: 0,
    },
    content: {
        display: 'grid',
        gridTemplateColumns: '1fr 400px',
        gap: '32px',
        alignItems: 'start',
    },
    mainColumn: {
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
    },
    section: {
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '32px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
    },
    sectionHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
    },
    sectionTitleWrapper: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
    },
    sectionTitle: {
        fontSize: '20px',
        fontWeight: '700',
        color: '#1e293b',
        margin: 0,
    },
    addressBookButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 20px',
        backgroundColor: '#f8fafc',
        border: '2px solid #e2e8f0',
        borderRadius: '10px',
        fontSize: '14px',
        fontWeight: '600',
        color: '#64748b',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    formGrid: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '20px',
    },
    formGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    formGroupFull: {
        gridColumn: '1 / -1',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    addressGroup: {
        gridColumn: '1 / -1',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    label: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '14px',
        fontWeight: '600',
        color: '#475569',
    },
    input: {
        padding: '12px 16px',
        border: '2px solid #e2e8f0',
        borderRadius: '10px',
        fontSize: '15px',
        outline: 'none',
        transition: 'all 0.2s',
    },
    // 🎯 에러 스타일 추가
    inputError: {
        borderColor: '#ef4444',
    },
    errorText: {
        fontSize: '13px',
        color: '#ef4444',
        marginTop: '4px',
    },
    textarea: {
        padding: '12px 16px',
        border: '2px solid #e2e8f0',
        borderRadius: '10px',
        fontSize: '15px',
        outline: 'none',
        fontFamily: 'inherit',
        resize: 'vertical',
        transition: 'all 0.2s',
    },
    addressSearchWrapper: {
        display: 'flex',
        gap: '12px',
    },
    addressSearchButton: {
        padding: '12px 20px',
        backgroundColor: '#6366f1',
        color: 'white',
        border: 'none',
        borderRadius: '10px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        whiteSpace: 'nowrap',
        transition: 'all 0.2s',
    },
    paymentMethods: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    paymentMethod: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '16px 20px',
        backgroundColor: 'white',
        border: '2px solid #e2e8f0',
        borderRadius: '12px',
        fontSize: '15px',
        fontWeight: '600',
        color: '#64748b',
        cursor: 'pointer',
        transition: 'all 0.2s',
        textAlign: 'left',
    },
    paymentMethodActive: {
        backgroundColor: '#f0f9ff',
        borderColor: '#6366f1',
        color: '#6366f1',
    },
    sidebar: {
        position: 'sticky',
        top: '24px',
    },
    orderSummary: {
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '32px',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
    },
    orderSummaryTitle: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        fontSize: '20px',
        fontWeight: '700',
        color: '#1e293b',
        margin: '0 0 20px 0',
    },
    orderItems: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        marginBottom: '24px',
        paddingBottom: '24px',
        borderBottom: '2px solid #f1f5f9',
        maxHeight: '400px',
        overflowY: 'auto',
    },
    orderItem: {
        display: 'flex',
        gap: '12px',
        alignItems: 'center',
    },
    orderItemImage: {
        width: '60px',
        height: '60px',
        objectFit: 'cover',
        borderRadius: '8px',
        border: '2px solid #f1f5f9',
    },
    orderItemInfo: {
        flex: 1,
    },
    orderItemName: {
        fontSize: '14px',
        fontWeight: '500',
        color: '#1e293b',
        margin: '0 0 4px 0',
    },
    orderItemPrice: {
        fontSize: '13px',
        color: '#64748b',
        margin: 0,
    },
    orderItemTotal: {
        fontSize: '16px',
        fontWeight: '600',
        color: '#1e293b',
    },
    priceDetails: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    priceRow: {
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '15px',
        color: '#475569',
    },
    divider: {
        height: '1px',
        backgroundColor: '#e2e8f0',
        margin: '8px 0',
    },
    totalRow: {
        fontSize: '16px',
        fontWeight: '600',
        color: '#1e293b',
        paddingTop: '8px',
    },
    totalPrice: {
        fontSize: '24px',
        fontWeight: '700',
        color: '#6366f1',
    },
    notice: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginTop: '16px',
        padding: '12px',
        fontSize: '13px',
        color: '#92400e',
        backgroundColor: '#fef3c7',
        borderRadius: '8px',
    },
    orderButton: {
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '18px',
        marginTop: '24px',
        fontSize: '16px',
        fontWeight: '600',
        color: 'white',
        backgroundColor: '#6366f1',
        border: 'none',
        borderRadius: '12px',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    orderButtonDisabled: {
        opacity: 0.6,
        cursor: 'not-allowed',
    },
    agreement: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginTop: '16px',
        padding: '12px',
        fontSize: '13px',
        color: '#64748b',
        backgroundColor: '#f8fafc',
        borderRadius: '8px',
    },
    modalOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
    },
    modal: {
        backgroundColor: 'white',
        borderRadius: '16px',
        maxWidth: '600px',
        width: '100%',
        maxHeight: '80vh',
        overflow: 'auto',
    },
    modalHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '24px',
        borderBottom: '1px solid #e2e8f0',
    },
    modalTitle: {
        fontSize: '20px',
        fontWeight: '700',
        color: '#1e293b',
        margin: 0,
    },
    closeButton: {
        width: '36px',
        height: '36px',
        borderRadius: '8px',
        border: 'none',
        backgroundColor: '#f1f5f9',
        color: '#64748b',
        fontSize: '20px',
        cursor: 'pointer',
    },
    modalBody: {
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
    },
    addressItem: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        padding: '16px',
        border: '2px solid #e2e8f0',
        borderRadius: '12px',
        gap: '16px',
        transition: 'all 0.2s',
    },
    addressItemContent: {
        flex: 1,
        cursor: 'pointer',
    },
    addressItemHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '6px',
    },
    addressItemName: {
        fontSize: '16px',
        fontWeight: '600',
        color: '#1e293b',
    },
    defaultBadgeSmall: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '2px 8px',
        fontSize: '11px',
        fontWeight: '600',
        color: '#f59e0b',
        backgroundColor: '#fef3c7',
        borderRadius: '6px',
    },
    addressItemPhone: {
        fontSize: '14px',
        color: '#64748b',
        marginBottom: '6px',
    },
    addressItemAddress: {
        fontSize: '13px',
        color: '#94a3b8',
        lineHeight: '1.5',
    },
    emptyState: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '100px 24px',
        backgroundColor: 'white',
        borderRadius: '16px',
    },
    emptyText: {
        fontSize: '18px',
        color: '#64748b',
        margin: '24px 0',
    },
    shopButton: {
        padding: '14px 32px',
        fontSize: '16px',
        fontWeight: '600',
        color: 'white',
        backgroundColor: '#6366f1',
        border: 'none',
        borderRadius: '12px',
        cursor: 'pointer',
    },
    loadingContainer: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '400px',
        gap: '16px',
    },
    loadingText: {
        fontSize: '16px',
        color: '#64748b',
    },
};

// 🎯 CSS 애니메이션 추가
const styleSheet = document.createElement('style');
styleSheet.textContent = `
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
    @keyframes slideInRight {
        from {
            opacity: 0;
            transform: translateX(100px);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
`;
if (!document.querySelector('style[data-checkout-styles]')) {
    styleSheet.setAttribute('data-checkout-styles', '');
    document.head.appendChild(styleSheet);
}

export default Checkout;