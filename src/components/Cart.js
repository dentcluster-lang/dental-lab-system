import React, { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, updateDoc, } from 'firebase/firestore';
import { db } from '../firebase/config';
import { 
    ShoppingCart, Trash2, Plus, Minus, ArrowRight, 
    Package, ShoppingBag, CreditCard, MapPin, Edit2, X, Search
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function Cart({ user }) {
    const navigate = useNavigate();
    const [cartItems, setCartItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userData, setUserData] = useState(null);
    
    // 🎯 배송지 관련 상태 추가
    const [shippingAddresses, setShippingAddresses] = useState([]);
    const [selectedAddressId, setSelectedAddressId] = useState(null);
    const [showAddressModal, setShowAddressModal] = useState(false);
    const [showPostcodeModal, setShowPostcodeModal] = useState(false);
    const [addressForm, setAddressForm] = useState({
        name: '',
        phone: '',
        zipCode: '',
        address: '',
        detailAddress: '',
        isDefault: false
    });

    // 장바구니 키 생성 함수 (직원이면 회사 ID, 아니면 본인 ID)
    const getCartKey = useCallback((userDataToUse) => {
        if (!user?.uid) return 'dentconnect_cart_temp';
        const cartUserId = userDataToUse?.companyId || user.uid;
        return `dentconnect_cart_${cartUserId}`;
    }, [user]);

    // 🎯 Daum Postcode API 스크립트 로드
    useEffect(() => {
        const script = document.createElement('script');
        script.src = '//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
        script.async = true;
        document.body.appendChild(script);

        return () => {
            document.body.removeChild(script);
        };
    }, []);

    // 사용자 데이터 로드
    useEffect(() => {
        const loadUserData = async () => {
            if (!user?.uid) {
                setLoading(false);
                return;
            }
            
            try {
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (userDoc.exists()) {
                    const data = userDoc.data();
                    setUserData(data);
                    
                    // 🎯 배송지 목록 로드
                    if (data.shippingAddresses) {
                        setShippingAddresses(data.shippingAddresses);
                        // 기본 배송지 선택
                        const defaultAddress = data.shippingAddresses.find(addr => addr.isDefault);
                        if (defaultAddress) {
                            setSelectedAddressId(defaultAddress.id);
                        }
                    }
                    
                    // 사용자 데이터 로드 후 바로 장바구니 로드
                    const cartKey = getCartKey(data);
                    const savedCart = localStorage.getItem(cartKey);
                    if (savedCart) {
                        try {
                            setCartItems(JSON.parse(savedCart));
                        } catch (error) {
                            console.error('장바구니 파싱 실패:', error);
                            localStorage.removeItem(cartKey);
                        }
                    }
                }
            } catch (error) {
                console.error('사용자 데이터 로드 실패:', error);
            } finally {
                setLoading(false);
            }
        };
        
        loadUserData();
    }, [user, getCartKey]);

    // 🎯 주소 검색 모달 열기
    const openPostcodeModal = () => {
        setShowPostcodeModal(true);
    };

    // 🎯 주소 검색 완료 핸들러
    const handlePostcodeComplete = (data) => {
        setAddressForm(prev => ({
            ...prev,
            zipCode: data.zonecode,
            address: data.address
        }));
        setShowPostcodeModal(false);
    };

    // 🎯 주소 검색 실행
    useEffect(() => {
        if (showPostcodeModal && window.daum && window.daum.Postcode) {
            new window.daum.Postcode({
                oncomplete: handlePostcodeComplete,
                width: '100%',
                height: '100%'
            }).embed(document.getElementById('daum-postcode'));
        }
    }, [showPostcodeModal]);

    // 🎯 배송지 추가/수정 모달 열기
    const openAddressModal = (address = null) => {
        if (address) {
            setAddressForm(address);
        } else {
            setAddressForm({
                id: Date.now().toString(),
                name: '',
                phone: '',
                zipCode: '',
                address: '',
                detailAddress: '',
                isDefault: shippingAddresses.length === 0
            });
        }
        setShowAddressModal(true);
    };

    // 🎯 배송지 저장
    const saveAddress = async () => {
        if (!addressForm.name || !addressForm.phone || !addressForm.zipCode || 
            !addressForm.address || !addressForm.detailAddress) {
            alert('모든 필드를 입력해주세요.');
            return;
        }

        try {
            let updatedAddresses = [...shippingAddresses];
            
            // 기본 배송지로 설정하는 경우, 다른 주소의 기본 설정 해제
            if (addressForm.isDefault) {
                updatedAddresses = updatedAddresses.map(addr => ({
                    ...addr,
                    isDefault: false
                }));
            }

            const existingIndex = updatedAddresses.findIndex(addr => addr.id === addressForm.id);
            
            if (existingIndex >= 0) {
                // 기존 주소 수정
                updatedAddresses[existingIndex] = addressForm;
            } else {
                // 새 주소 추가
                updatedAddresses.push({
                    ...addressForm,
                    id: Date.now().toString()
                });
            }

            // Firestore 업데이트
            await updateDoc(doc(db, 'users', user.uid), {
                shippingAddresses: updatedAddresses
            });

            setShippingAddresses(updatedAddresses);
            
            // 기본 배송지면 선택
            if (addressForm.isDefault) {
                setSelectedAddressId(addressForm.id);
            }
            
            setShowAddressModal(false);
            alert('배송지가 저장되었습니다.');
        } catch (error) {
            console.error('배송지 저장 실패:', error);
            alert('배송지 저장에 실패했습니다.');
        }
    };

    // 🎯 배송지 삭제
    const deleteAddress = async (addressId) => {
        if (!window.confirm('이 배송지를 삭제하시겠습니까?')) return;

        try {
            const updatedAddresses = shippingAddresses.filter(addr => addr.id !== addressId);
            
            await updateDoc(doc(db, 'users', user.uid), {
                shippingAddresses: updatedAddresses
            });

            setShippingAddresses(updatedAddresses);
            
            if (selectedAddressId === addressId) {
                setSelectedAddressId(null);
            }
            
            alert('배송지가 삭제되었습니다.');
        } catch (error) {
            console.error('배송지 삭제 실패:', error);
            alert('배송지 삭제에 실패했습니다.');
        }
    };

    // 장바구니 저장
    const saveCart = useCallback((items) => {
        if (!user?.uid) return;
        
        const cartKey = getCartKey(userData);
        localStorage.setItem(cartKey, JSON.stringify(items));
        setCartItems(items);
    }, [user, userData, getCartKey]);

    // 수량 증가
    const increaseQuantity = (productId) => {
        const updatedCart = cartItems.map(item => {
            if (item.id === productId) {
                const newQuantity = (item.quantity || 1) + 1;
                if (item.stock && newQuantity > item.stock) {
                    alert('재고가 부족합니다.');
                    return item;
                }
                return { ...item, quantity: newQuantity };
            }
            return item;
        });
        saveCart(updatedCart);
    };

    // 수량 감소
    const decreaseQuantity = (productId) => {
        const updatedCart = cartItems.map(item => {
            if (item.id === productId) {
                const newQuantity = (item.quantity || 1) - 1;
                if (newQuantity >= 1) {
                    return { ...item, quantity: newQuantity };
                }
            }
            return item;
        });
        saveCart(updatedCart);
    };

    // 상품 삭제
    const removeItem = (productId) => {
        if (window.confirm('장바구니에서 삭제하시겠습니까?')) {
            const updatedCart = cartItems.filter(item => item.id !== productId);
            saveCart(updatedCart);
        }
    };

    // 전체 삭제
    const clearCart = () => {
        if (window.confirm('장바구니를 비우시겠습니까?')) {
            saveCart([]);
        }
    };

    // 총 금액 계산
    const calculateTotal = () => {
        return cartItems.reduce((total, item) => {
            return total + ((item.price || 0) * (item.quantity || 1));
        }, 0);
    };

    // 결제 페이지로 이동
    const handleCheckout = () => {
        if (!user) {
            alert('로그인이 필요합니다.');
            navigate('/signin');
            return;
        }

        if (cartItems.length === 0) {
            alert('장바구니가 비어있습니다.');
            return;
        }

        // 🎯 배송지 선택 확인
        if (!selectedAddressId) {
            alert('배송지를 선택해주세요.');
            return;
        }

        // 직원인 경우 결제 권한 체크
        if (userData?.isEmployee && !userData?.isBusinessOwner) {
            alert('결제는 사업주만 가능합니다.');
            return;
        }

        const selectedAddress = shippingAddresses.find(addr => addr.id === selectedAddressId);

        navigate('/checkout', {
            state: {
                items: cartItems,
                shippingAddress: selectedAddress,
                buyNow: false
            }
        });
    };

    if (loading) {
        return (
            <div style={styles.loading}>
                <div style={styles.spinner}></div>
                <p>로딩 중...</p>
            </div>
        );
    }

    if (!user) {
        return (
            <div style={styles.container}>
                <div style={styles.emptyState}>
                    <ShoppingCart size={80} color="#cbd5e1" />
                    <p style={styles.emptyText}>로그인이 필요합니다</p>
                    <button
                        onClick={() => navigate('/signin')}
                        style={styles.shopButton}
                    >
                        로그인하기
                    </button>
                </div>
            </div>
        );
    }

    if (cartItems.length === 0) {
        return (
            <div style={styles.container}>
                <div style={styles.header}>
                    <h1 style={styles.title}>
                        <ShoppingCart size={32} />
                        장바구니
                    </h1>
                </div>

                <div style={styles.emptyState}>
                    <ShoppingBag size={80} color="#cbd5e1" />
                    <p style={styles.emptyText}>장바구니가 비어있습니다</p>
                    <p style={styles.emptySubtext}>마켓플레이스에서 필요한 제품을 담아보세요</p>
                    <button
                        onClick={() => navigate('/marketplace')}
                        style={styles.shopButton}
                    >
                        <Package size={20} />
                        쇼핑 계속하기
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            {/* 헤더 */}
            <div style={styles.header}>
                <div>
                    <h1 style={styles.title}>
                        <ShoppingCart size={32} />
                        장바구니
                    </h1>
                    <p style={styles.subtitle}>
                        {cartItems.length}개의 상품
                        {userData?.companyId && ' (회사 공유 장바구니)'}
                    </p>
                </div>
                <button onClick={clearCart} style={styles.clearButton}>
                    전체 삭제
                </button>
            </div>

            <div style={styles.content}>
                {/* 장바구니 아이템 목록 */}
                <div style={styles.itemsSection}>
                    {cartItems.map(item => (
                        <CartItem
                            key={item.id}
                            item={item}
                            onIncrease={increaseQuantity}
                            onDecrease={decreaseQuantity}
                            onRemove={removeItem}
                        />
                    ))}
                </div>

                {/* 주문 요약 */}
                <div style={styles.summarySection}>
                    {/* 🎯 배송지 섹션 추가 */}
                    <div style={styles.summaryCard}>
                        <div style={styles.addressHeader}>
                            <h3 style={styles.summaryTitle}>
                                <MapPin size={20} />
                                배송지
                            </h3>
                            <button
                                onClick={() => openAddressModal()}
                                style={styles.addAddressButton}
                            >
                                <Plus size={16} />
                                새 배송지
                            </button>
                        </div>

                        {shippingAddresses.length === 0 ? (
                            <div style={styles.noAddress}>
                                <p>등록된 배송지가 없습니다</p>
                                <button
                                    onClick={() => openAddressModal()}
                                    style={styles.addFirstAddressButton}
                                >
                                    배송지 추가하기
                                </button>
                            </div>
                        ) : (
                            <div style={styles.addressList}>
                                {shippingAddresses.map(address => (
                                    <div
                                        key={address.id}
                                        style={{
                                            ...styles.addressItem,
                                            ...(selectedAddressId === address.id ? styles.selectedAddress : {})
                                        }}
                                        onClick={() => setSelectedAddressId(address.id)}
                                    >
                                        <div style={styles.addressInfo}>
                                            <div style={styles.addressName}>
                                                {address.name}
                                                {address.isDefault && (
                                                    <span style={styles.defaultBadge}>기본</span>
                                                )}
                                            </div>
                                            <div style={styles.addressPhone}>{address.phone}</div>
                                            <div style={styles.addressText}>
                                                [{address.zipCode}] {address.address}
                                            </div>
                                            <div style={styles.addressDetail}>
                                                {address.detailAddress}
                                            </div>
                                        </div>
                                        <div style={styles.addressActions}>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    openAddressModal(address);
                                                }}
                                                style={styles.editAddressButton}
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    deleteAddress(address.id);
                                                }}
                                                style={styles.deleteAddressButton}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* 가격 요약 */}
                    <div style={styles.summaryCard}>
                        <h3 style={styles.summaryTitle}>주문 요약</h3>
                        
                        <div style={styles.summaryItem}>
                            <span>상품 금액</span>
                            <span style={styles.amount}>
                                {calculateTotal().toLocaleString()}원
                            </span>
                        </div>
                        
                        <div style={styles.summaryItem}>
                            <span>배송비</span>
                            <span style={styles.amount}>
                                {calculateTotal() >= 50000 ? '무료' : '3,000원'}
                            </span>
                        </div>
                        
                        <div style={styles.divider}></div>
                        
                        <div style={styles.summaryTotal}>
                            <span>총 결제금액</span>
                            <span style={styles.totalAmount}>
                                {(calculateTotal() + (calculateTotal() >= 50000 ? 0 : 3000)).toLocaleString()}원
                            </span>
                        </div>

                        {calculateTotal() < 50000 && (
                            <p style={styles.freeShippingNotice}>
                                {(50000 - calculateTotal()).toLocaleString()}원 더 담으면 무료배송!
                            </p>
                        )}

                        <button
                            onClick={handleCheckout}
                            style={{
                                ...styles.checkoutButton,
                                ...((!selectedAddressId || (userData?.isEmployee && !userData?.isBusinessOwner)) 
                                    ? styles.disabledButton : {})
                            }}
                            disabled={!selectedAddressId || (userData?.isEmployee && !userData?.isBusinessOwner)}
                        >
                            <CreditCard size={20} />
                            {!selectedAddressId 
                                ? '배송지를 선택해주세요'
                                : userData?.isEmployee && !userData?.isBusinessOwner 
                                ? '사업주만 결제 가능' 
                                : '주문하기'}
                        </button>

                        <button
                            onClick={() => navigate('/marketplace')}
                            style={styles.continueButton}
                        >
                            <ArrowRight size={20} />
                            쇼핑 계속하기
                        </button>
                    </div>
                </div>
            </div>

            {/* 🎯 배송지 추가/수정 모달 */}
            {showAddressModal && (
                <div style={styles.modalOverlay} onClick={() => setShowAddressModal(false)}>
                    <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <h3 style={styles.modalTitle}>
                                {addressForm.id && shippingAddresses.find(a => a.id === addressForm.id) 
                                    ? '배송지 수정' : '새 배송지 추가'}
                            </h3>
                            <button
                                onClick={() => setShowAddressModal(false)}
                                style={styles.closeButton}
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div style={styles.modalBody}>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>받는 사람</label>
                                <input
                                    type="text"
                                    value={addressForm.name}
                                    onChange={(e) => setAddressForm({...addressForm, name: e.target.value})}
                                    style={styles.input}
                                    placeholder="이름을 입력하세요"
                                />
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.label}>연락처</label>
                                <input
                                    type="tel"
                                    value={addressForm.phone}
                                    onChange={(e) => setAddressForm({...addressForm, phone: e.target.value})}
                                    style={styles.input}
                                    placeholder="010-0000-0000"
                                />
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.label}>주소</label>
                                <div style={styles.addressInputGroup}>
                                    <input
                                        type="text"
                                        value={addressForm.zipCode}
                                        readOnly
                                        style={{...styles.input, flex: 1}}
                                        placeholder="우편번호"
                                    />
                                    <button
                                        onClick={openPostcodeModal}
                                        style={styles.searchButton}
                                    >
                                        <Search size={16} />
                                        주소 검색
                                    </button>
                                </div>
                                <input
                                    type="text"
                                    value={addressForm.address}
                                    readOnly
                                    style={{...styles.input, marginTop: '8px'}}
                                    placeholder="주소"
                                />
                                <input
                                    type="text"
                                    value={addressForm.detailAddress}
                                    onChange={(e) => setAddressForm({...addressForm, detailAddress: e.target.value})}
                                    style={{...styles.input, marginTop: '8px'}}
                                    placeholder="상세주소를 입력하세요"
                                />
                            </div>

                            <div style={styles.checkboxGroup}>
                                <label style={styles.checkboxLabel}>
                                    <input
                                        type="checkbox"
                                        checked={addressForm.isDefault}
                                        onChange={(e) => setAddressForm({...addressForm, isDefault: e.target.checked})}
                                        style={styles.checkbox}
                                    />
                                    기본 배송지로 설정
                                </label>
                            </div>
                        </div>

                        <div style={styles.modalFooter}>
                            <button
                                onClick={() => setShowAddressModal(false)}
                                style={styles.cancelButton}
                            >
                                취소
                            </button>
                            <button
                                onClick={saveAddress}
                                style={styles.saveButton}
                            >
                                저장
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 🎯 주소 검색 모달 */}
            {showPostcodeModal && (
                <div style={styles.modalOverlay} onClick={() => setShowPostcodeModal(false)}>
                    <div style={styles.postcodeModal} onClick={(e) => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <h3 style={styles.modalTitle}>주소 검색</h3>
                            <button
                                onClick={() => setShowPostcodeModal(false)}
                                style={styles.closeButton}
                            >
                                <X size={24} />
                            </button>
                        </div>
                        <div id="daum-postcode" style={styles.postcodeContainer}></div>
                    </div>
                </div>
            )}
        </div>
    );
}

// CartItem 컴포넌트
function CartItem({ item, onIncrease, onDecrease, onRemove }) {
    return (
        <div style={styles.cartItem}>
            <div style={styles.itemImage}>
                {item.images && item.images[0] ? (
                    <img
                        src={item.images[0]}
                        alt={item.name}
                        style={styles.productImage}
                    />
                ) : (
                    <div style={styles.noImage}>
                        <Package size={40} color="#cbd5e1" />
                    </div>
                )}
            </div>

            <div style={styles.itemInfo}>
                <h3 style={styles.itemName}>{item.name}</h3>
                {item.brand && <p style={styles.itemBrand}>{item.brand}</p>}
                <p style={styles.itemPrice}>
                    {(item.price || 0).toLocaleString()}원
                </p>
                {item.stock && (
                    <p style={styles.stockInfo}>
                        재고: {item.stock}개
                    </p>
                )}
            </div>

            <div style={styles.itemActions}>
                <div style={styles.quantityControl}>
                    <button
                        onClick={() => onDecrease(item.id)}
                        style={styles.quantityButton}
                        disabled={(item.quantity || 1) <= 1}
                    >
                        <Minus size={16} />
                    </button>
                    <span style={styles.quantity}>{item.quantity || 1}</span>
                    <button
                        onClick={() => onIncrease(item.id)}
                        style={styles.quantityButton}
                        disabled={item.stock && (item.quantity || 1) >= item.stock}
                    >
                        <Plus size={16} />
                    </button>
                </div>

                <div style={styles.itemTotal}>
                    {((item.price || 0) * (item.quantity || 1)).toLocaleString()}원
                </div>

                <button
                    onClick={() => onRemove(item.id)}
                    style={styles.removeButton}
                >
                    <Trash2 size={20} />
                </button>
            </div>
        </div>
    );
}

// 스타일
const styles = {
    container: {
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '32px 20px',
    },
    loading: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        gap: '16px',
    },
    spinner: {
        width: '48px',
        height: '48px',
        border: '4px solid #e2e8f0',
        borderTop: '4px solid #6366f1',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '32px',
        paddingBottom: '24px',
        borderBottom: '2px solid #e2e8f0',
    },
    title: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        fontSize: '28px',
        fontWeight: '700',
        color: '#0f172a',
        margin: 0,
    },
    subtitle: {
        fontSize: '14px',
        color: '#64748b',
        margin: '8px 0 0 0',
    },
    clearButton: {
        padding: '10px 20px',
        backgroundColor: '#f1f5f9',
        color: '#64748b',
        border: 'none',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    content: {
        display: 'grid',
        gridTemplateColumns: '1fr 450px',
        gap: '32px',
    },
    itemsSection: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
    },
    cartItem: {
        display: 'flex',
        gap: '16px',
        padding: '20px',
        backgroundColor: 'white',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
    },
    itemImage: {
        width: '120px',
        height: '120px',
        flexShrink: 0,
    },
    productImage: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        borderRadius: '8px',
    },
    noImage: {
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8fafc',
        borderRadius: '8px',
    },
    itemInfo: {
        flex: 1,
    },
    itemName: {
        margin: '0 0 8px 0',
        fontSize: '18px',
        fontWeight: '600',
        color: '#0f172a',
    },
    itemBrand: {
        margin: '0 0 12px 0',
        fontSize: '14px',
        color: '#64748b',
    },
    itemPrice: {
        margin: '0 0 8px 0',
        fontSize: '16px',
        fontWeight: '700',
        color: '#6366f1',
    },
    stockInfo: {
        margin: 0,
        fontSize: '13px',
        color: '#64748b',
    },
    itemActions: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: '12px',
    },
    quantityControl: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '8px',
        backgroundColor: '#f8fafc',
        borderRadius: '8px',
    },
    quantityButton: {
        width: '32px',
        height: '32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1px solid #e2e8f0',
        borderRadius: '6px',
        backgroundColor: 'white',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    quantity: {
        minWidth: '32px',
        textAlign: 'center',
        fontSize: '16px',
        fontWeight: '600',
        color: '#0f172a',
    },
    itemTotal: {
        fontSize: '20px',
        fontWeight: '700',
        color: '#0f172a',
    },
    removeButton: {
        padding: '8px',
        backgroundColor: 'transparent',
        border: 'none',
        color: '#ef4444',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    summarySection: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        position: 'sticky',
        top: '24px',
    },
    summaryCard: {
        padding: '24px',
        backgroundColor: 'white',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
    },
    summaryTitle: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        margin: '0 0 20px 0',
        fontSize: '18px',
        fontWeight: '700',
        color: '#0f172a',
    },
    // 🎯 배송지 관련 스타일
    addressHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
    },
    addAddressButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '8px 12px',
        backgroundColor: '#f8fafc',
        color: '#6366f1',
        border: '1px solid #e2e8f0',
        borderRadius: '6px',
        fontSize: '13px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    noAddress: {
        padding: '32px 20px',
        textAlign: 'center',
        color: '#64748b',
    },
    addFirstAddressButton: {
        marginTop: '12px',
        padding: '10px 20px',
        backgroundColor: '#6366f1',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    addressList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    addressItem: {
        display: 'flex',
        justifyContent: 'space-between',
        padding: '16px',
        backgroundColor: '#f8fafc',
        borderRadius: '8px',
        border: '2px solid transparent',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    selectedAddress: {
        backgroundColor: '#eef2ff',
        borderColor: '#6366f1',
    },
    addressInfo: {
        flex: 1,
    },
    addressName: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '15px',
        fontWeight: '600',
        color: '#0f172a',
        marginBottom: '4px',
    },
    defaultBadge: {
        padding: '2px 8px',
        backgroundColor: '#6366f1',
        color: 'white',
        borderRadius: '4px',
        fontSize: '11px',
        fontWeight: '700',
    },
    addressPhone: {
        fontSize: '13px',
        color: '#64748b',
        marginBottom: '8px',
    },
    addressText: {
        fontSize: '13px',
        color: '#475569',
        marginBottom: '4px',
    },
    addressDetail: {
        fontSize: '13px',
        color: '#64748b',
    },
    addressActions: {
        display: 'flex',
        gap: '8px',
        alignItems: 'flex-start',
    },
    editAddressButton: {
        padding: '6px',
        backgroundColor: 'white',
        border: '1px solid #e2e8f0',
        borderRadius: '6px',
        color: '#6366f1',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    deleteAddressButton: {
        padding: '6px',
        backgroundColor: 'white',
        border: '1px solid #e2e8f0',
        borderRadius: '6px',
        color: '#ef4444',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    summaryItem: {
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '12px',
        fontSize: '15px',
        color: '#64748b',
    },
    amount: {
        fontWeight: '600',
        color: '#0f172a',
    },
    divider: {
        height: '1px',
        backgroundColor: '#e2e8f0',
        margin: '16px 0',
    },
    summaryTotal: {
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '16px',
        fontSize: '16px',
        fontWeight: '700',
        color: '#0f172a',
    },
    totalAmount: {
        fontSize: '24px',
        color: '#6366f1',
    },
    freeShippingNotice: {
        padding: '12px',
        backgroundColor: '#fef3c7',
        color: '#92400e',
        borderRadius: '8px',
        fontSize: '13px',
        fontWeight: '600',
        textAlign: 'center',
        margin: '16px 0',
    },
    checkoutButton: {
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '16px',
        backgroundColor: '#6366f1',
        color: 'white',
        border: 'none',
        borderRadius: '10px',
        fontSize: '16px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s',
        marginBottom: '12px',
    },
    disabledButton: {
        backgroundColor: '#cbd5e1',
        cursor: 'not-allowed',
    },
    continueButton: {
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '16px',
        backgroundColor: '#f8fafc',
        color: '#64748b',
        border: '1px solid #e2e8f0',
        borderRadius: '10px',
        fontSize: '16px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    emptyState: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px 20px',
        textAlign: 'center',
    },
    emptyText: {
        fontSize: '20px',
        fontWeight: '600',
        color: '#64748b',
        margin: '16px 0 8px 0',
    },
    emptySubtext: {
        fontSize: '15px',
        color: '#94a3b8',
        margin: '0 0 24px 0',
    },
    shopButton: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '12px 32px',
        backgroundColor: '#6366f1',
        color: 'white',
        border: 'none',
        borderRadius: '10px',
        fontSize: '16px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    // 🎯 모달 스타일
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
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: '16px',
        width: '90%',
        maxWidth: '600px',
        maxHeight: '90vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
    },
    modalHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px 24px',
        borderBottom: '1px solid #e2e8f0',
    },
    modalTitle: {
        margin: 0,
        fontSize: '20px',
        fontWeight: '700',
        color: '#0f172a',
    },
    closeButton: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '8px',
        backgroundColor: 'transparent',
        border: 'none',
        color: '#64748b',
        cursor: 'pointer',
        borderRadius: '6px',
        transition: 'all 0.2s',
    },
    modalBody: {
        padding: '24px',
        overflowY: 'auto',
        flex: 1,
    },
    formGroup: {
        marginBottom: '20px',
    },
    label: {
        display: 'block',
        marginBottom: '8px',
        fontSize: '14px',
        fontWeight: '600',
        color: '#0f172a',
    },
    input: {
        width: '100%',
        padding: '12px',
        border: '2px solid #e2e8f0',
        borderRadius: '8px',
        fontSize: '14px',
        outline: 'none',
        transition: 'border-color 0.2s',
        boxSizing: 'border-box',
    },
    addressInputGroup: {
        display: 'flex',
        gap: '8px',
    },
    searchButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '12px 16px',
        backgroundColor: '#6366f1',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s',
        whiteSpace: 'nowrap',
    },
    checkboxGroup: {
        marginTop: '20px',
    },
    checkboxLabel: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '14px',
        color: '#0f172a',
        cursor: 'pointer',
    },
    checkbox: {
        width: '18px',
        height: '18px',
        cursor: 'pointer',
    },
    modalFooter: {
        display: 'flex',
        gap: '12px',
        padding: '20px 24px',
        borderTop: '1px solid #e2e8f0',
        justifyContent: 'flex-end',
    },
    cancelButton: {
        padding: '12px 24px',
        backgroundColor: '#f1f5f9',
        color: '#64748b',
        border: 'none',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    saveButton: {
        padding: '12px 24px',
        backgroundColor: '#6366f1',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    // 🎯 주소 검색 모달 스타일
    postcodeModal: {
        backgroundColor: 'white',
        borderRadius: '16px',
        width: '90%',
        maxWidth: '600px',
        height: '600px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
    },
    postcodeContainer: {
        flex: 1,
        overflow: 'hidden',
    },
};

export default Cart;