import React, { useState, useEffect, useMemo } from 'react';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { ArrowLeft, Edit2, Save, X, Printer, Trash2 } from 'lucide-react';

function ViewTransactionStatement({ statementId, user, onBack }) {
    const [statement, setStatement] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [editedItems, setEditedItems] = useState([]);
    const [editedDiscount, setEditedDiscount] = useState(0);
    const [editedDiscountType, setEditedDiscountType] = useState('amount');
    const [editedNotes, setEditedNotes] = useState('');
    const [deleting, setDeleting] = useState(false);

    const isCreator = statement?.fromUserId === user?.uid;
    const canEdit = isCreator;
    const canDelete = isCreator;

    useEffect(() => {
        fetchStatement();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [statementId]);

    const fetchStatement = async () => {
        try {
            setLoading(true);
            const docRef = doc(db, 'transactionStatements', statementId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = { id: docSnap.id, ...docSnap.data() };
                setStatement(data);
                
                let items = (data.items || []).map(item => {
                    const toothCount = item.toothCount || parseToothCount(item.toothInfo);
                    const price = item.price || 0;
                    const pricePerTooth = toothCount > 0 ? Math.round(price / toothCount) : 0;
                    
                    return {
                        ...item,
                        toothCount: toothCount,
                        pricePerTooth: item.pricePerTooth || pricePerTooth,
                        price: price
                    };
                });
                
                setEditedItems(items);
                setEditedDiscount(data.totalDiscount || data.discount || 0);
                setEditedDiscountType(data.discountType || 'amount');
                setEditedNotes(data.notes || '');
            } else {
                alert('거래명세서를 찾을 수 없습니다.');
                onBack();
            }
        } catch (error) {
            console.error('거래명세서 조회 실패:', error);
            alert('거래명세서를 불러오는데 실패했습니다: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const parseToothCount = (toothInfo) => {
        if (!toothInfo) return 0;
        const matches = toothInfo.match(/\d{1,2}/g);
        if (!matches) return 0;
        const uniqueTeeth = [...new Set(matches)];
        return uniqueTeeth.length;
    };

    const handlePricePerToothChange = (index, value) => {
        const newItems = [...editedItems];
        const pricePerTooth = Number(value) || 0;
        
        if (pricePerTooth < 0) return;
        
        newItems[index].pricePerTooth = pricePerTooth;
        newItems[index].price = pricePerTooth * (newItems[index].toothCount || 0);
        setEditedItems(newItems);
    };

    const handleToothInfoChange = (index, value) => {
        const newItems = [...editedItems];
        newItems[index].toothInfo = value;
        const newToothCount = parseToothCount(value);
        newItems[index].toothCount = newToothCount;
        newItems[index].price = (newItems[index].pricePerTooth || 0) * newToothCount;
        setEditedItems(newItems);
    };

    const handleToothCountChange = (index, value) => {
        const newItems = [...editedItems];
        const count = Number(value) || 0;
        
        if (count < 0) return;
        
        newItems[index].toothCount = count;
        newItems[index].price = (newItems[index].pricePerTooth || 0) * count;
        setEditedItems(newItems);
    };

    const totals = useMemo(() => {
        const subtotal = editedItems.reduce((sum, item) => sum + (item.price || 0), 0);
        const totalTeeth = editedItems.reduce((sum, item) => sum + (item.toothCount || 0), 0);

        let discountAmount = 0;
        if (editedDiscountType === 'amount') {
            discountAmount = Number(editedDiscount) || 0;
        } else {
            discountAmount = Math.round(subtotal * (Number(editedDiscount) || 0) / 100);
        }

        const total = subtotal - discountAmount;

        return {
            subtotal,
            discountAmount,
            total,
            totalTeeth
        };
    }, [editedItems, editedDiscount, editedDiscountType]);

    const handleSave = async () => {
        if (!canEdit) {
            alert('수정 권한이 없습니다.');
            return;
        }

        try {
            if (totals.total < 0) {
                alert('할인 금액이 총액보다 클 수 없습니다.');
                return;
            }

            const itemsToSave = editedItems.map(item => ({
                ...item,
                pricePerTooth: item.pricePerTooth || 0,
                price: item.price || 0,
                toothCount: item.toothCount || 0
            }));

            await updateDoc(doc(db, 'transactionStatements', statementId), {
                items: itemsToSave,
                totalDiscount: Number(editedDiscount),
                discountType: editedDiscountType,
                subtotal: totals.subtotal,
                discountAmount: totals.discountAmount,
                totalAmount: totals.total,
                totalTeeth: totals.totalTeeth,
                notes: editedNotes,
                updatedAt: new Date(),
                status: statement.status || 'confirmed'
            });

            alert('저장되었습니다.');
            setEditing(false);
            fetchStatement();
        } catch (error) {
            console.error('저장 실패:', error);
            alert('저장에 실패했습니다: ' + error.message);
        }
    };

    const handleDelete = async () => {
        if (!canDelete) {
            alert('삭제 권한이 없습니다.');
            return;
        }

        if (!window.confirm('⚠️ 거래명세서를 삭제하시겠습니까?\n\n삭제하면 발신자와 수신자 모두에게서 삭제됩니다.\n이 작업은 취소할 수 없습니다.')) {
            return;
        }

        if (!window.confirm('정말로 삭제하시겠습니까?\n\n다시 한번 확인해주세요.')) {
            return;
        }

        try {
            setDeleting(true);
            await deleteDoc(doc(db, 'transactionStatements', statementId));
            alert('✅ 거래명세서가 삭제되었습니다.');
            onBack();
        } catch (error) {
            console.error('삭제 실패:', error);
            alert('삭제에 실패했습니다: ' + error.message);
        } finally {
            setDeleting(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return '-';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('ko-KR');
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('ko-KR', {
            style: 'currency',
            currency: 'KRW'
        }).format(amount || 0);
    };

    if (loading) {
        return (
            <div style={styles.loading}>
                <div style={styles.spinner}></div>
                <p>로딩 중...</p>
            </div>
        );
    }

    if (!statement) {
        return null;
    }

    return (
        <div style={styles.container}>
            <style>
                {`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                    @media print {
                        body * {
                            visibility: hidden;
                        }
                        .print-area, .print-area * {
                            visibility: visible;
                        }
                        .print-area {
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 100%;
                        }
                        .no-print {
                            display: none !important;
                        }
                    }
                `}
            </style>

            <div className="no-print" style={styles.header}>
                <button onClick={onBack} style={styles.button} aria-label="목록으로 돌아가기">
                    <ArrowLeft size={20} />
                    목록으로
                </button>
                <div style={styles.headerActions}>
                    {!editing ? (
                        <>
                            <button onClick={handlePrint} style={styles.button} aria-label="인쇄하기">
                                <Printer size={18} />
                                인쇄
                            </button>
                            {canEdit && (
                                <button 
                                    onClick={() => setEditing(true)} 
                                    style={{...styles.button, ...styles.primaryButton}} 
                                    aria-label="수정하기"
                                >
                                    <Edit2 size={18} />
                                    수정
                                </button>
                            )}
                            {canDelete && (
                                <button 
                                    onClick={handleDelete} 
                                    style={{...styles.button, ...styles.dangerButton}}
                                    disabled={deleting}
                                    aria-label="삭제하기"
                                >
                                    <Trash2 size={18} />
                                    {deleting ? '삭제 중...' : '삭제'}
                                </button>
                            )}
                        </>
                    ) : (
                        <>
                            <button onClick={() => setEditing(false)} style={styles.button} aria-label="취소">
                                <X size={18} />
                                취소
                            </button>
                            <button onClick={handleSave} style={{...styles.button, ...styles.successButton}} aria-label="저장하기">
                                <Save size={18} />
                                저장
                            </button>
                        </>
                    )}
                </div>
            </div>

            {statement.status === 'draft' && (
                <div className="no-print" style={styles.draftBanner}>
                    ⚠️ 임시저장 상태입니다 (거래처에 발송되지 않음)
                </div>
            )}

            {!isCreator && (
                <div className="no-print" style={styles.receiverBanner}>
                    📥 수신한 거래명세서입니다 (수정 불가)
                </div>
            )}

            <div className="print-area" style={styles.statement}>
                <div style={styles.title}>
                    <h1>거 래 명 세 서</h1>
                </div>

                <div style={styles.memoInfo}>
                    <span style={styles.memoText}>
                        작성일: {formatDate(statement.createdAt)} |
                        기간: {formatDate(statement.startDate)} ~ {formatDate(statement.endDate)} |
                        발신: {statement.fromUserName} → 수신: {statement.toUserName}
                    </span>
                </div>

                <div style={styles.itemsSection}>
                    <h3 style={styles.sectionTitle}>
                        거래 내역 ({editedItems.length}건 / 총 {totals.totalTeeth}개)
                    </h3>
                    <table style={styles.table}>
                        <thead>
                            <tr style={styles.tableHeader}>
                                <th style={{ ...styles.th, width: '50px' }}>No.</th>
                                <th style={{ ...styles.th, width: '75px' }}>작성일</th>
                                <th style={{ ...styles.th, width: '75px' }}>마감일</th>
                                <th style={{ ...styles.th, width: '90px' }}>환자명</th>
                                <th style={{ ...styles.th, width: 'auto', minWidth: '220px' }}>치아정보</th>
                                <th style={{ ...styles.th, width: '60px' }}>개수</th>
                                <th style={{ ...styles.th, width: '90px' }}>개당가격</th>
                                <th style={{ ...styles.th, width: '110px' }}>합산가격</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(() => {
                                const groupedItems = [];
                                let currentPatient = null;
                                let currentGroup = [];
                                
                                editedItems.forEach((item, index) => {
                                    const patientKey = `${item.patientName}-${formatDate(item.createdAt)}-${formatDate(item.dueDate)}`;
                                    
                                    if (patientKey !== currentPatient) {
                                        if (currentGroup.length > 0) {
                                            groupedItems.push(currentGroup);
                                        }
                                        currentPatient = patientKey;
                                        currentGroup = [{ item, index }];
                                    } else {
                                        currentGroup.push({ item, index });
                                    }
                                });
                                
                                if (currentGroup.length > 0) {
                                    groupedItems.push(currentGroup);
                                }
                                
                                let globalIndex = 0;
                                return groupedItems.map((group, groupIndex) => {
                                    return group.map(({ item, index }, itemIndex) => {
                                        const pricePerTooth = item.pricePerTooth || 0;
                                        
                                        globalIndex++;
                                        
                                        return (
                                            <tr key={index} style={styles.tableRow}>
                                                {itemIndex === 0 && (
                                                    <td style={styles.td} rowSpan={group.length}>
                                                        {globalIndex}
                                                    </td>
                                                )}
                                                
                                                {itemIndex === 0 && (
                                                    <td style={styles.td} rowSpan={group.length}>
                                                        {item.createdAt ? formatDate(item.createdAt) : '-'}
                                                    </td>
                                                )}
                                                
                                                {itemIndex === 0 && (
                                                    <td style={styles.td} rowSpan={group.length}>
                                                        {item.dueDate ? formatDate(item.dueDate) : '-'}
                                                    </td>
                                                )}
                                                
                                                {itemIndex === 0 && (
                                                    <td style={styles.td} rowSpan={group.length}>
                                                        {item.patientName || '-'}
                                                        {item.isRemake && (
                                                            <span style={styles.remakeBadge}>리메이크</span>
                                                        )}
                                                    </td>
                                                )}
                                                
                                                <td style={styles.td}>
                                                    {editing && canEdit ? (
                                                        <input
                                                            type="text"
                                                            value={item.toothInfo || ''}
                                                            onChange={(e) => handleToothInfoChange(index, e.target.value)}
                                                            style={styles.inputLarge}
                                                            placeholder="#11,21 크라운 지르코니아"
                                                        />
                                                    ) : (
                                                        <span style={styles.toothInfoText}>
                                                            {item.toothInfo || '-'}
                                                        </span>
                                                    )}
                                                </td>
                                                
                                                <td style={styles.tdCenter}>
                                                    {editing && canEdit ? (
                                                        <input
                                                            type="number"
                                                            value={item.toothCount || 0}
                                                            onChange={(e) => handleToothCountChange(index, e.target.value)}
                                                            style={styles.inputSmall}
                                                            placeholder="0"
                                                            min="0"
                                                        />
                                                    ) : (
                                                        <span style={styles.toothCountBadge}>
                                                            {item.toothCount || 0}
                                                        </span>
                                                    )}
                                                </td>
                                                
                                                <td style={styles.tdAmount}>
                                                    {editing && canEdit ? (
                                                        <input
                                                            type="number"
                                                            value={pricePerTooth}
                                                            onChange={(e) => handlePricePerToothChange(index, e.target.value)}
                                                            style={styles.inputMedium}
                                                            placeholder="개당가격"
                                                            min="0"
                                                        />
                                                    ) : (
                                                        formatCurrency(pricePerTooth)
                                                    )}
                                                </td>
                                                
                                                <td style={{...styles.tdAmount, ...styles.tdTotal}}>
                                                    {formatCurrency(item.price)}
                                                </td>
                                            </tr>
                                        );
                                    });
                                });
                            })()}
                        </tbody>
                    </table>
                </div>

                <div style={styles.totalSection}>
                    <div style={styles.totalRow}>
                        <span style={styles.totalLabel}>소계</span>
                        <span style={styles.totalValue}>{formatCurrency(totals.subtotal)}</span>
                    </div>

                    {(editing || totals.discountAmount > 0) && (
                        <div style={styles.discountRow}>
                            <span style={styles.totalLabel}>할인</span>
                            {editing && canEdit ? (
                                <div style={styles.discountInput}>
                                    <input
                                        type="number"
                                        value={editedDiscount}
                                        onChange={(e) => setEditedDiscount(e.target.value)}
                                        style={styles.inputMedium}
                                        placeholder="할인"
                                        min="0"
                                    />
                                    <select
                                        value={editedDiscountType}
                                        onChange={(e) => setEditedDiscountType(e.target.value)}
                                        style={styles.selectSmall}
                                    >
                                        <option value="amount">원</option>
                                        <option value="percent">%</option>
                                    </select>
                                </div>
                            ) : (
                                <span style={styles.discountValue}>
                                    - {formatCurrency(totals.discountAmount)}
                                </span>
                            )}
                        </div>
                    )}

                    <div style={styles.totalRowFinal}>
                        <div>
                            <div style={styles.totalLabelFinal}>총 금액</div>
                            <div style={styles.totalTeethInfo}>총 {totals.totalTeeth}개</div>
                        </div>
                        <div style={styles.totalValueWrapper}>
                            <div style={styles.totalValueFinal}>{formatCurrency(totals.total)}</div>
                            {totals.totalTeeth > 0 && (
                                <div style={styles.avgPerTooth}>
                                    개당 평균: {formatCurrency(Math.round(totals.total / totals.totalTeeth))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div style={styles.notesSection}>
                    <h3 style={styles.sectionTitle}>메모/특이사항</h3>
                    {editing && canEdit ? (
                        <textarea
                            value={editedNotes}
                            onChange={(e) => setEditedNotes(e.target.value)}
                            style={styles.textarea}
                            placeholder="메모나 특이사항을 입력하세요"
                        />
                    ) : (
                        <div style={styles.notesText}>
                            {statement.notes || '없음'}
                        </div>
                    )}
                </div>

                <div style={styles.footer}>
                    <p>본 거래명세서는 전자문서로 생성되었습니다.</p>
                    <p>생성일시: {formatDate(statement.createdAt)}</p>
                    {statement.publishedAt && (
                        <p>발행일시: {formatDate(statement.publishedAt)}</p>
                    )}
                </div>
            </div>
        </div>
    );
}

const styles = {
    container: {
        maxWidth: '1100px',
        margin: '0 auto',
        padding: '20px',
    },
    loading: {
        textAlign: 'center',
        padding: '80px 20px',
        color: '#64748b',
    },
    spinner: {
        width: '50px',
        height: '50px',
        margin: '0 auto 20px',
        border: '3px solid #e2e8f0',
        borderTop: '3px solid #6366f1',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
    },
    headerActions: {
        display: 'flex',
        gap: '12px',
    },
    button: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 16px',
        backgroundColor: '#f1f5f9',
        color: '#64748b',
        border: 'none',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    primaryButton: {
        backgroundColor: '#6366f1',
        color: 'white',
    },
    successButton: {
        backgroundColor: '#059669',
        color: 'white',
    },
    dangerButton: {
        backgroundColor: '#dc2626',
        color: 'white',
    },
    draftBanner: {
        padding: '12px 20px',
        backgroundColor: '#fef3c7',
        color: '#92400e',
        borderRadius: '8px',
        marginBottom: '16px',
        fontSize: '14px',
        fontWeight: '600',
        textAlign: 'center',
        border: '2px solid #fbbf24',
    },
    receiverBanner: {
        padding: '12px 20px',
        backgroundColor: '#dbeafe',
        color: '#1e40af',
        borderRadius: '8px',
        marginBottom: '16px',
        fontSize: '14px',
        fontWeight: '600',
        textAlign: 'center',
        border: '2px solid #3b82f6',
    },
    statement: {
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        padding: '40px',
        border: '1px solid #e2e8f0',
    },
    title: {
        textAlign: 'center',
        paddingBottom: '24px',
        borderBottom: '2px solid #0f172a',
        marginBottom: '16px',
    },
    memoInfo: {
        padding: '12px 16px',
        backgroundColor: '#f8fafc',
        borderRadius: '6px',
        marginBottom: '24px',
        borderLeft: '3px solid #6366f1',
    },
    memoText: {
        fontSize: '13px',
        color: '#64748b',
        lineHeight: '1.6',
    },
    itemsSection: {
        marginBottom: '32px',
    },
    sectionTitle: {
        margin: '0 0 16px 0',
        fontSize: '16px',
        fontWeight: '700',
        color: '#0f172a',
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
        marginBottom: '16px',
    },
    tableHeader: {
        backgroundColor: '#f8fafc',
    },
    th: {
        padding: '12px 8px',
        textAlign: 'left',
        fontSize: '12px',
        fontWeight: '700',
        color: '#64748b',
        borderBottom: '2px solid #e2e8f0',
    },
    tableRow: {
        borderBottom: '1px solid #f1f5f9',
    },
    td: {
        padding: '12px 8px',
        fontSize: '14px',
        color: '#0f172a',
        verticalAlign: 'middle',
    },
    tdCenter: {
        padding: '12px 8px',
        fontSize: '14px',
        color: '#0f172a',
        textAlign: 'center',
        verticalAlign: 'middle',
    },
    tdAmount: {
        padding: '12px 8px',
        fontSize: '14px',
        color: '#0f172a',
        fontWeight: '600',
        textAlign: 'right',
        verticalAlign: 'middle',
    },
    tdTotal: {
        fontSize: '15px',
        color: '#6366f1',
        fontWeight: '700',
    },
    remakeBadge: {
        display: 'block',
        marginTop: '4px',
        padding: '2px 6px',
        backgroundColor: '#fee2e2',
        color: '#dc2626',
        borderRadius: '4px',
        fontSize: '11px',
        fontWeight: '700',
        width: 'fit-content',
    },
    toothCountBadge: {
        display: 'inline-block',
        padding: '4px 10px',
        backgroundColor: '#dbeafe',
        color: '#1d4ed8',
        borderRadius: '12px',
        fontSize: '13px',
        fontWeight: '700',
    },
    toothInfoText: {
        fontSize: '14px',
        color: '#0f172a',
        lineHeight: '1.5',
    },
    inputSmall: {
        width: '60px',
        padding: '6px 8px',
        border: '1px solid #e2e8f0',
        borderRadius: '6px',
        fontSize: '14px',
        boxSizing: 'border-box',
    },
    inputMedium: {
        width: '120px',
        padding: '6px 8px',
        border: '1px solid #e2e8f0',
        borderRadius: '6px',
        fontSize: '14px',
        boxSizing: 'border-box',
    },
    inputLarge: {
        width: '100%',
        padding: '6px 8px',
        border: '1px solid #e2e8f0',
        borderRadius: '6px',
        fontSize: '14px',
        boxSizing: 'border-box',
    },
    totalSection: {
        padding: '24px',
        backgroundColor: '#f8fafc',
        borderRadius: '12px',
        marginBottom: '32px',
    },
    totalRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 0',
        fontSize: '16px',
    },
    discountRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 0',
        fontSize: '16px',
        borderTop: '1px solid #e2e8f0',
        borderBottom: '1px solid #e2e8f0',
    },
    totalLabel: {
        color: '#64748b',
        fontWeight: '600',
    },
    totalValue: {
        color: '#0f172a',
        fontWeight: '600',
    },
    discountValue: {
        color: '#dc2626',
        fontWeight: '700',
    },
    discountInput: {
        display: 'flex',
        gap: '8px',
        alignItems: 'center',
    },
    selectSmall: {
        padding: '6px 8px',
        border: '1px solid #e2e8f0',
        borderRadius: '6px',
        fontSize: '14px',
        boxSizing: 'border-box',
    },
    totalRowFinal: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        padding: '20px 0 0 0',
        borderTop: '2px solid #e2e8f0',
        marginTop: '12px',
    },
    totalLabelFinal: {
        fontSize: '20px',
        color: '#0f172a',
        fontWeight: '700',
    },
    totalTeethInfo: {
        fontSize: '14px',
        color: '#64748b',
        marginTop: '4px',
    },
    totalValueWrapper: {
        textAlign: 'right',
    },
    totalValueFinal: {
        fontSize: '28px',
        color: '#6366f1',
        fontWeight: '700',
    },
    avgPerTooth: {
        fontSize: '13px',
        color: '#64748b',
        marginTop: '6px',
    },
    notesSection: {
        marginBottom: '32px',
    },
    notesText: {
        padding: '16px',
        backgroundColor: '#f8fafc',
        borderRadius: '8px',
        fontSize: '14px',
        color: '#0f172a',
        whiteSpace: 'pre-wrap',
        minHeight: '100px',
    },
    textarea: {
        width: '100%',
        padding: '16px',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        fontSize: '14px',
        minHeight: '100px',
        resize: 'vertical',
        fontFamily: 'inherit',
        boxSizing: 'border-box',
    },
    footer: {
        paddingTop: '24px',
        borderTop: '1px solid #e2e8f0',
        textAlign: 'center',
        fontSize: '12px',
        color: '#94a3b8',
    },
};

export default ViewTransactionStatement;