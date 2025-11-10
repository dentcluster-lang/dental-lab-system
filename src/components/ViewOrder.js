import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { ArrowLeft, Printer, Download } from 'lucide-react';

function ViewOrder({ orderId, user, onBack }) {
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [senderInfo, setSenderInfo] = useState(null);
    const [receiverInfo, setReceiverInfo] = useState(null);

    useEffect(() => {
        fetchOrder();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orderId]);

    const fetchOrder = async () => {
        try {
            setLoading(true);
            const orderDoc = await getDoc(doc(db, 'workOrders', orderId));

            if (orderDoc.exists()) {
                const orderData = { id: orderDoc.id, ...orderDoc.data() };
                setOrder(orderData);

                // 발신자 정보 (의뢰 치과)
                const senderDoc = await getDoc(doc(db, 'users', orderData.fromUserId));
                if (senderDoc.exists()) {
                    setSenderInfo(senderDoc.data());
                }

                // 수신자 정보 (기공소)
                const receiverDoc = await getDoc(doc(db, 'users', orderData.toUserId));
                if (receiverDoc.exists()) {
                    setReceiverInfo(receiverDoc.data());
                }
            }
        } catch (error) {
            console.error('의뢰서 조회 실패:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const handleDownload = () => {
        alert('📄 프린트 대화상자에서 "PDF로 저장"을 선택해주세요.');
        window.print();
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return '-';
        let date;
        
        // Firestore Timestamp 객체
        if (timestamp.toDate) {
            date = timestamp.toDate();
        } 
        // Date 객체
        else if (timestamp instanceof Date) {
            date = timestamp;
        } 
        // 문자열 (예: "2025-10-30")
        else if (typeof timestamp === 'string') {
            date = new Date(timestamp);
            // 유효한 날짜인지 확인
            if (isNaN(date.getTime())) {
                return '-';
            }
        } 
        else {
            return '-';
        }
        
        return date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).replace(/\. /g, '.').replace(/\.$/, '');
    };

    // 브릿지와 싱글 정보 텍스트
    const getBridgeAndSingleText = () => {
        // 모든 치아번호 가져오기
        const allTeeth = order.items 
            ? order.items.map(item => item.toothNumber) 
            : (order.selectedTeeth || []);
        
        if (allTeeth.length === 0) return '-';
        
        // 브릿지에 속한 치아번호들
        const bridgeTeeth = new Set();
        const bridgeGroups = order.bridgeGroups || [];
        
        bridgeGroups.forEach(group => {
            const teeth = group.teeth || [];
            teeth.forEach(tooth => bridgeTeeth.add(tooth));
        });
        
        // 싱글 치아 (브릿지에 속하지 않은 치아)
        const singleTeeth = allTeeth.filter(tooth => !bridgeTeeth.has(tooth));
        
        const result = [];
        
        // 싱글 정보 먼저
        if (singleTeeth.length > 0) {
            result.push('싱글: ' + singleTeeth.join(', '));
        }
        
        // 브릿지 정보
        if (bridgeGroups.length > 0) {
            const bridgeTexts = bridgeGroups.map(group => {
                const teeth = group.teeth || [];
                return teeth.join('-');
            });
            result.push('브릿지: ' + bridgeTexts.join(', '));
        }
        
        return result.length > 0 ? result.join(' / ') : '-';
    };

    // 쉐이드 정보 텍스트
    const getShadeText = () => {
        if (!order.items || order.items.length === 0) {
            return order.shade || '-';
        }
        
        // 모든 쉐이드 정보 수집
        const shades = order.items
            .map(item => item.shade)
            .filter(shade => shade && shade !== '-');
        
        if (shades.length === 0) return '-';
        
        // 중복 제거
        const uniqueShades = [...new Set(shades)];
        
        return uniqueShades.join(', ');
    };

    // 폰틱 여부 확인 함수
    const isPonticTooth = (toothNumber) => {
        // ponticGroups 배열에서 해당 치아번호가 있는지 확인
        if (order.ponticGroups && Array.isArray(order.ponticGroups)) {
            for (const group of order.ponticGroups) {
                if (group.teeth && group.teeth.includes(toothNumber)) {
                    return true;
                }
            }
        }
        return false;
    };

    // 보철물 정보를 그룹화하는 함수
    const getGroupedProsthesisInfo = () => {
        if (!order.items || order.items.length === 0) {
            return [];
        }

        // 임플란트 그룹에서 치아별 브랜드 매핑 생성
        const implantBrandMap = {};
        if (order.implantGroups && Array.isArray(order.implantGroups)) {
            order.implantGroups.forEach(group => {
                if (group.teeth && group.brand) {
                    group.teeth.forEach(tooth => {
                        implantBrandMap[tooth] = group.brand;
                    });
                }
            });
        }

        // 보철물 그룹에서 치아별 보철물/재료 매핑 생성
        const prosthesisGroupMap = {};
        if (order.prosthesisGroups && Array.isArray(order.prosthesisGroups)) {
            order.prosthesisGroups.forEach(group => {
                if (group.teeth && group.prosthesis && group.material) {
                    group.teeth.forEach(tooth => {
                        prosthesisGroupMap[tooth] = {
                            prosthesis: group.prosthesis,
                            material: group.material
                        };
                    });
                }
            });
        }

        // 같은 보철물+재료+임플란트 조합으로 그룹화
        const groups = {};

        order.items.forEach((item) => {
            // 보철물 그룹 정보 우선 사용
            const prosthesisInfo = prosthesisGroupMap[item.toothNumber];
            const prosthesisType = prosthesisInfo ? prosthesisInfo.prosthesis : (item.prosthesis || '-');
            const materialType = prosthesisInfo ? prosthesisInfo.material : (item.material || '-');
            
            // 임플란트 정보 확인 (implantGroups 우선, 그 다음 item.implant)
            const implantBrand = implantBrandMap[item.toothNumber] || item.implant;
            const hasImplant = implantBrand && implantBrand !== '없음' && implantBrand !== '';
            
            let displayText;
            if (hasImplant) {
                displayText = `임플란트 ${implantBrand}`;
                // 임플란트가 있어도 보철물이 있으면 함께 표시
                if (prosthesisType && prosthesisType !== '-') {
                    displayText = `${prosthesisType} (임플란트 ${implantBrand})`;
                }
            } else {
                displayText = prosthesisType;
            }
            
            const key = `${displayText}|${materialType}`;

            if (!groups[key]) {
                groups[key] = {
                    displayText: displayText,
                    material: materialType,
                    toothNumbers: [],
                    ponticTeeth: [],
                    isImplant: hasImplant
                };
            }

            if (item.toothNumber) {
                groups[key].toothNumbers.push(item.toothNumber);
                
                // 폰틱 치아 체크
                if (item.isPontic || isPonticTooth(item.toothNumber)) {
                    groups[key].ponticTeeth.push(item.toothNumber);
                }
            }
        });

        // 그룹을 배열로 변환
        return Object.values(groups).map(group => {
            const teeth = group.toothNumbers.length > 0 
                ? `#${group.toothNumbers.join(',')}` 
                : '#-';
            
            // 폰틱 표시
            let ponticInfo = '';
            if (group.ponticTeeth.length > 0) {
                ponticInfo = ` (폰틱: #${group.ponticTeeth.join(',')})`;
            }
            
            return `${teeth} ${group.displayText} ${group.material}${ponticInfo}`;
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

    if (!order) {
        return (
            <div style={styles.error}>
                <p>의뢰서를 찾을 수 없습니다.</p>
                <button onClick={onBack} style={styles.backButton}>
                    목록으로
                </button>
            </div>
        );
    }

    const senderName = senderInfo?.businessName || senderInfo?.companyName || senderInfo?.name || '알 수 없음';
    const receiverName = receiverInfo?.businessName || receiverInfo?.companyName || receiverInfo?.name || '알 수 없음';
    const groupedProsthesis = getGroupedProsthesisInfo();

    return (
        <>
            {/* 프린트 전용 스타일 */}
            <style>
                {`
                    @media print {
                        body {
                            margin: 0;
                            padding: 0;
                        }
                        
                        .no-print {
                            display: none !important;
                        }
                        
                        .print-area {
                            width: 210mm;
                            min-height: 297mm;
                            margin: 0 auto;
                            padding: 15mm;
                            box-shadow: none;
                            background: white;
                        }
                        
                        /* 페이지 나눔 방지 */
                        table, tr, td, th {
                            page-break-inside: avoid;
                        }
                        
                        /* 폰트 최적화 */
                        * {
                            -webkit-print-color-adjust: exact;
                            print-color-adjust: exact;
                        }
                    }
                    
                    @page {
                        size: A4;
                        margin: 0;
                    }
                `}
            </style>

            <div style={styles.container}>
                {/* 프린트 제외 버튼 영역 */}
                <div style={styles.actionBar} className="no-print">
                    <button onClick={onBack} style={styles.backBtn}>
                        <ArrowLeft size={18} />
                        목록으로
                    </button>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={handleDownload} style={styles.downloadBtn}>
                            <Download size={18} />
                            PDF 저장
                        </button>
                        <button onClick={handlePrint} style={styles.printBtn}>
                            <Printer size={18} />
                            인쇄하기
                        </button>
                    </div>
                </div>

                {/* 의뢰서 내용 - A4 용지 크기 */}
                <div style={styles.orderSheet} className="print-area">
                    {/* 문서 제목 */}
                    <div style={styles.header}>
                        <h1 style={styles.title}>({senderName}) 보철물 제작 의뢰서</h1>
                        {order.isRemake && (
                            <div style={styles.remakeBadge}>🔴 리메이크</div>
                        )}
                    </div>

                    {/* 메인 테이블 */}
                    <table style={styles.mainTable}>
                        <tbody>
                            {/* 첫 번째 줄 - 의뢰업체, 제작업체 */}
                            <tr>
                                <td style={styles.labelCell}>의뢰업체</td>
                                <td style={styles.valueCell}>{senderName}</td>
                                <td style={styles.labelCell}>제작업체</td>
                                <td style={styles.valueCell}>{receiverName}</td>
                            </tr>
                            
                            {/* 두 번째 줄 - 의뢰일, 마감일 */}
                            <tr>
                                <td style={styles.labelCell}>의뢰일</td>
                                <td style={styles.valueCell}>{formatDate(order.createdAt)}</td>
                                <td style={styles.labelCell}>마감일</td>
                                <td style={styles.valueCell}>
                                    {formatDate(order.dueDate || order.completionDate || order.deadline)}
                                </td>
                            </tr>
                            
                            {/* 세 번째 줄 - 환자명, 나이 */}
                            <tr>
                                <td style={styles.labelCell}>환자명</td>
                                <td style={styles.valueCell}>{order.patientName || '-'}</td>
                                <td style={styles.labelCell}>나이</td>
                                <td style={styles.valueCell}>{order.patientAge || '-'}</td>
                            </tr>
                            
                            {/* 네 번째 줄 - 싱글,브릿지, 쉐이드 */}
                            <tr>
                                <td style={styles.labelCell}>싱글,브릿지</td>
                                <td style={styles.valueCell}>{getBridgeAndSingleText()}</td>
                                <td style={styles.labelCell}>쉐이드</td>
                                <td style={styles.valueCell}>{getShadeText()}</td>
                            </tr>
                            
                            {/* 다섯 번째 줄 - 특이사항 */}
                            <tr>
                                <td style={styles.labelCell}>특이사항</td>
                                <td style={styles.valueWideCell} colSpan="3">
                                    {order.specialNotes || order.notes || '-'}
                                </td>
                            </tr>
                            
                            {/* 리메이크 사유 (있는 경우) */}
                            {order.isRemake && order.remakeReason && (
                                <tr>
                                    <td style={styles.labelCellRemake}>리메이크 사유</td>
                                    <td style={styles.valueWideCellRemake} colSpan="3">
                                        {order.remakeReason}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    {/* 보철물 정보 - 묶인 형식 */}
                    {groupedProsthesis.length > 0 && (
                        <div style={styles.prosthesisSection}>
                            <div style={styles.sectionTitle}>보철물 정보</div>
                            <div style={styles.prosthesisGrouped}>
                                {groupedProsthesis.map((info, index) => (
                                    <div key={index} style={styles.prosthesisItem}>
                                        {info}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 하단 서명란 */}
                    <div style={styles.footer}>
                        <div style={styles.footerSingleRow}>
                            <span style={styles.footerText}>작성일자 : {formatDate(order.createdAt)}</span>
                            <div style={styles.rightSection}>
                                <span style={styles.footerText}>의뢰 치과 : {senderName}</span>
                                {senderInfo?.sealImageUrl ? (
                                    <img 
                                        src={senderInfo.sealImageUrl} 
                                        alt="인감" 
                                        style={styles.stampImage}
                                    />
                                ) : (
                                    <div style={styles.stampPlaceholder}>
                                        <span style={styles.stampPlaceholderText}>(인)</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

const styles = {
    container: {
        minHeight: '100vh',
        backgroundColor: '#f3f4f6',
        padding: '20px',
    },
    
    // 액션 버튼 영역
    actionBar: {
        maxWidth: '210mm',
        margin: '0 auto 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '15px 20px',
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    },
    backBtn: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 20px',
        backgroundColor: '#6b7280',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
    },
    downloadBtn: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 20px',
        backgroundColor: '#10b981',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
    },
    printBtn: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 20px',
        backgroundColor: '#3b82f6',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
    },
    
    // 의뢰서 용지
    orderSheet: {
        maxWidth: '210mm',
        minHeight: '297mm',
        margin: '0 auto',
        padding: '15mm',
        backgroundColor: 'white',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    },
    
    // 헤더
    header: {
        textAlign: 'center',
        marginBottom: '20px',
        paddingBottom: '15px',
        borderBottom: '3px solid #000',
        position: 'relative',
    },
    title: {
        margin: 0,
        fontSize: '22px',
        fontWeight: '700',
        color: '#000',
    },
    remakeBadge: {
        position: 'absolute',
        top: '0',
        right: '0',
        padding: '8px 16px',
        backgroundColor: '#ffffff',
        color: '#000000',
        border: '2px solid #000000',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '700',
    },
    
    // 메인 정보 테이블
    mainTable: {
        width: '100%',
        borderCollapse: 'collapse',
        marginBottom: '20px',
        border: '2px solid #000',
    },
    labelCell: {
        width: '15%',
        padding: '10px',
        border: '1px solid #000',
        backgroundColor: '#f3f4f6',
        fontWeight: '600',
        fontSize: '14px',
        textAlign: 'center',
    },
    valueCell: {
        width: '35%',
        padding: '10px',
        border: '1px solid #000',
        fontSize: '14px',
    },
    valueWideCell: {
        padding: '10px',
        border: '1px solid #000',
        fontSize: '14px',
    },
    labelCellRemake: {
        width: '15%',
        padding: '10px',
        border: '2px solid #000',
        backgroundColor: '#f3f4f6',
        fontWeight: '700',
        fontSize: '14px',
        textAlign: 'center',
        color: '#000000',
    },
    valueWideCellRemake: {
        padding: '10px',
        border: '2px solid #000',
        fontSize: '14px',
        backgroundColor: '#ffffff',
        color: '#000000',
        fontWeight: '600',
    },
    
    // 보철물 섹션 - 묶인 형식
    prosthesisSection: {
        marginTop: '30px',
        marginBottom: '30px',
        padding: '20px',
        border: '2px solid #000',
        borderRadius: '0px',
    },
    sectionTitle: {
        fontSize: '16px',
        fontWeight: '700',
        marginBottom: '15px',
        paddingBottom: '10px',
        borderBottom: '2px solid #000',
        color: '#000',
    },
    prosthesisGrouped: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    prosthesisItem: {
        padding: '12px 16px',
        backgroundColor: '#ffffff',
        border: '1px solid #000',
        borderRadius: '0px',
        fontSize: '14px',
        fontWeight: '500',
        lineHeight: '1.6',
        color: '#000',
    },
    
    // 푸터 (서명란)
    footer: {
        marginTop: '60px',
    },
    footerSingleRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
    },
    rightSection: {
        display: 'flex',
        alignItems: 'center',
        gap: '15px',
    },
    footerText: {
        fontSize: '18px',
        fontWeight: '600',
    },
    stampImage: {
        width: '3cm',
        height: '3cm',
        objectFit: 'contain',
        border: '2px solid #000',
    },
    stampPlaceholder: {
        width: '3cm',
        height: '3cm',
        border: '2px solid #000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ffffff',
    },
    stampPlaceholderText: {
        fontSize: '24px',
        fontWeight: '700',
        color: '#000000',
    },
    sealMark: {
        fontSize: '18px',
        fontWeight: '700',
        marginLeft: '10px',
    },
    
    // 로딩/에러
    loading: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
        fontSize: '16px',
        color: '#6b7280',
    },
    spinner: {
        width: '40px',
        height: '40px',
        border: '4px solid #e5e7eb',
        borderTop: '4px solid #000000',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
    },
    error: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
        fontSize: '16px',
        color: '#ef4444',
    },
    backButton: {
        marginTop: '20px',
        padding: '10px 20px',
        backgroundColor: '#6b7280',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
    },
};

// 스피너 애니메이션 추가
const styleSheet = document.createElement("style");
styleSheet.textContent = `
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;
document.head.appendChild(styleSheet);

export default ViewOrder;