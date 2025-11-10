import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle, Package, MapPin, CreditCard, Home, List } from 'lucide-react';

const OrderComplete = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { orderId, orderData } = location.state || {};

    if (!orderId || !orderData) {
        return (
            <div style={styles.errorContainer}>
                <Package size={64} color="#cbd5e1" />
                <h2 style={styles.errorTitle}>주문 정보를 찾을 수 없습니다</h2>
                <button 
                    style={styles.homeButton}
                    onClick={() => navigate('/marketplace')}
                >
                    마켓플레이스로 이동
                </button>
            </div>
        );
    }

    const { items, shipping, payment } = orderData;

    return (
        <div style={styles.container}>
            {/* 주문 완료 헤더 */}
            <div style={styles.successHeader}>
                <div style={styles.checkCircle}>
                    <CheckCircle size={64} color="#10b981" />
                </div>
                <h1 style={styles.successTitle}>주문이 완료되었습니다!</h1>
                <p style={styles.successMessage}>
                    주문번호: <strong>{orderId}</strong>
                </p>
                <p style={styles.successSubMessage}>
                    주문 확인 메일이 발송되었습니다.
                </p>
            </div>

            {/* 주문 상세 정보 */}
            <div style={styles.content}>
                {/* 주문 상품 */}
                <div style={styles.section}>
                    <div style={styles.sectionHeader}>
                        <Package size={24} color="#6366f1" />
                        <h2 style={styles.sectionTitle}>주문 상품</h2>
                    </div>
                    <div style={styles.itemsList}>
                        {items.map((item, index) => (
                            <div key={index} style={styles.item}>
                                <img 
                                    src={item.image || '/placeholder-product.png'}
                                    alt={item.productName || item.name}
                                    style={styles.itemImage}
                                />
                                <div style={styles.itemInfo}>
                                    <p style={styles.itemName}>{item.productName || item.name}</p>
                                    <p style={styles.itemDetails}>
                                        {item.price.toLocaleString()}원 × {item.quantity}개
                                    </p>
                                    {item.brand && (
                                        <p style={styles.itemSeller}>
                                            브랜드: {item.brand}
                                        </p>
                                    )}
                                    {item.sellerName && (
                                        <p style={styles.itemSeller}>
                                            판매자: {item.sellerName}
                                        </p>
                                    )}
                                </div>
                                <div style={styles.itemTotal}>
                                    {(item.price * item.quantity).toLocaleString()}원
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 배송 정보 */}
                <div style={styles.section}>
                    <div style={styles.sectionHeader}>
                        <MapPin size={24} color="#6366f1" />
                        <h2 style={styles.sectionTitle}>배송 정보</h2>
                    </div>
                    <div style={styles.infoGrid}>
                        <div style={styles.infoRow}>
                            <span style={styles.infoLabel}>받으실 분</span>
                            <span style={styles.infoValue}>{shipping.name}</span>
                        </div>
                        <div style={styles.infoRow}>
                            <span style={styles.infoLabel}>연락처</span>
                            <span style={styles.infoValue}>{shipping.phone}</span>
                        </div>
                        <div style={styles.infoRow}>
                            <span style={styles.infoLabel}>배송지</span>
                            <span style={styles.infoValue}>
                                {shipping.address}
                                {shipping.detailAddress && `, ${shipping.detailAddress}`}
                                {shipping.zipcode && ` (${shipping.zipcode})`}
                            </span>
                        </div>
                        {shipping.message && (
                            <div style={styles.infoRow}>
                                <span style={styles.infoLabel}>배송 메시지</span>
                                <span style={styles.infoValue}>{shipping.message}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* 결제 정보 */}
                <div style={styles.section}>
                    <div style={styles.sectionHeader}>
                        <CreditCard size={24} color="#6366f1" />
                        <h2 style={styles.sectionTitle}>결제 정보</h2>
                    </div>
                    <div style={styles.paymentDetails}>
                        <div style={styles.paymentRow}>
                            <span>결제 수단</span>
                            <span>
                                {payment.method === 'card' && '신용/체크카드'}
                                {payment.method === 'bank' && '계좌이체'}
                                {payment.method === 'virtual' && '무통장입금'}
                                {payment.method === 'kakaopay' && '카카오페이'}
                                {payment.method === 'naverpay' && '네이버페이'}
                            </span>
                        </div>
                        <div style={styles.paymentRow}>
                            <span>상품 금액</span>
                            <span>{payment.subtotal.toLocaleString()}원</span>
                        </div>
                        <div style={styles.paymentRow}>
                            <span>배송비</span>
                            <span style={payment.shippingFee === 0 ? {color: '#10b981', fontWeight: '600'} : {}}>
                                {payment.shippingFee === 0 ? '무료' : `${payment.shippingFee.toLocaleString()}원`}
                            </span>
                        </div>
                        <div style={styles.divider} />
                        <div style={{...styles.paymentRow, ...styles.totalRow}}>
                            <span>총 결제 금액</span>
                            <span style={styles.totalAmount}>{payment.total.toLocaleString()}원</span>
                        </div>
                    </div>
                </div>

                {/* 안내 사항 */}
                <div style={styles.noticeBox}>
                    <h3 style={styles.noticeTitle}>📦 배송 안내</h3>
                    <ul style={styles.noticeList}>
                        <li>주문하신 상품은 영업일 기준 2-3일 이내 배송됩니다.</li>
                        <li>배송 현황은 마이페이지 {'>'} 주문 내역에서 확인하실 수 있습니다.</li>
                        <li>배송이 시작되면 송장번호가 등록됩니다.</li>
                        <li>배송 관련 문의사항은 고객센터로 연락해주세요.</li>
                    </ul>
                </div>

                {/* 취소/환불 안내 */}
                <div style={styles.refundNotice}>
                    <h3 style={styles.noticeTitle}>💡 취소 및 환불 안내</h3>
                    <ul style={styles.noticeList}>
                        <li>배송 준비 중 상태에서는 주문 취소가 가능합니다.</li>
                        <li>상품 수령 후 7일 이내 교환/반품이 가능합니다.</li>
                        <li>단, 상품의 포장을 개봉한 경우 교환/반품이 제한될 수 있습니다.</li>
                    </ul>
                </div>
            </div>

            {/* 하단 버튼 */}
            <div style={styles.buttonGroup}>
                <button 
                    style={styles.outlineButton}
                    onClick={() => navigate('/my-orders')}
                >
                    <List size={20} />
                    <span>주문 내역 보기</span>
                </button>
                <button 
                    style={styles.primaryButton}
                    onClick={() => navigate('/marketplace')}
                >
                    <Home size={20} />
                    <span>쇼핑 계속하기</span>
                </button>
            </div>
        </div>
    );
};

const styles = {
    container: {
        maxWidth: '800px',
        margin: '0 auto',
        padding: '40px 24px',
    },
    successHeader: {
        textAlign: 'center',
        padding: '40px 24px',
        backgroundColor: 'white',
        borderRadius: '16px',
        marginBottom: '32px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    },
    checkCircle: {
        display: 'inline-flex',
        padding: '16px',
        backgroundColor: '#d1fae5',
        borderRadius: '50%',
        marginBottom: '24px',
        animation: 'bounce 1s ease-in-out',
    },
    successTitle: {
        fontSize: '28px',
        fontWeight: '700',
        color: '#1e293b',
        margin: '0 0 12px 0',
    },
    successMessage: {
        fontSize: '16px',
        color: '#64748b',
        margin: '0 0 8px 0',
    },
    successSubMessage: {
        fontSize: '14px',
        color: '#94a3b8',
        margin: 0,
    },
    content: {
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        marginBottom: '32px',
    },
    section: {
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    },
    sectionHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '20px',
        paddingBottom: '16px',
        borderBottom: '2px solid #f1f5f9',
    },
    sectionTitle: {
        fontSize: '18px',
        fontWeight: '600',
        color: '#1e293b',
        margin: 0,
    },
    itemsList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
    },
    item: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '16px',
        backgroundColor: '#f8fafc',
        borderRadius: '12px',
    },
    itemImage: {
        width: '80px',
        height: '80px',
        objectFit: 'cover',
        borderRadius: '8px',
        flexShrink: 0,
    },
    itemInfo: {
        flex: 1,
    },
    itemName: {
        fontSize: '15px',
        fontWeight: '600',
        color: '#1e293b',
        margin: '0 0 6px 0',
    },
    itemDetails: {
        fontSize: '14px',
        color: '#64748b',
        margin: '0 0 4px 0',
    },
    itemSeller: {
        fontSize: '13px',
        color: '#94a3b8',
        margin: '0 0 2px 0',
    },
    itemTotal: {
        fontSize: '16px',
        fontWeight: '600',
        color: '#1e293b',
        flexShrink: 0,
    },
    infoGrid: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
    },
    infoRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '16px',
    },
    infoLabel: {
        fontSize: '14px',
        fontWeight: '600',
        color: '#64748b',
        minWidth: '100px',
        flexShrink: 0,
    },
    infoValue: {
        fontSize: '15px',
        color: '#1e293b',
        textAlign: 'right',
        flex: 1,
    },
    paymentDetails: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    paymentRow: {
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
    totalAmount: {
        fontSize: '24px',
        fontWeight: '700',
        color: '#6366f1',
    },
    noticeBox: {
        padding: '24px',
        backgroundColor: '#eff6ff',
        borderRadius: '12px',
        border: '2px solid #dbeafe',
    },
    refundNotice: {
        padding: '24px',
        backgroundColor: '#fef3c7',
        borderRadius: '12px',
        border: '2px solid #fde68a',
    },
    noticeTitle: {
        fontSize: '16px',
        fontWeight: '600',
        color: '#1e293b',
        margin: '0 0 16px 0',
    },
    noticeList: {
        margin: 0,
        paddingLeft: '20px',
        fontSize: '14px',
        color: '#64748b',
        lineHeight: '1.8',
    },
    buttonGroup: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '16px',
    },
    outlineButton: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '16px',
        fontSize: '16px',
        fontWeight: '600',
        color: '#6366f1',
        backgroundColor: 'white',
        border: '2px solid #6366f1',
        borderRadius: '12px',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    primaryButton: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '16px',
        fontSize: '16px',
        fontWeight: '600',
        color: 'white',
        backgroundColor: '#6366f1',
        border: 'none',
        borderRadius: '12px',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    errorContainer: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '100px 24px',
        textAlign: 'center',
    },
    errorTitle: {
        fontSize: '24px',
        color: '#64748b',
        margin: '24px 0',
    },
    homeButton: {
        padding: '14px 32px',
        fontSize: '16px',
        fontWeight: '600',
        color: 'white',
        backgroundColor: '#6366f1',
        border: 'none',
        borderRadius: '12px',
        cursor: 'pointer',
    },
};

export default OrderComplete;