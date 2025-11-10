import React, { useState, useEffect, useCallback } from 'react';
import { collection, addDoc, getDocs, query, where, orderBy, deleteDoc, doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase/config';
import { Package, Plus, DollarSign, Image as ImageIcon, Trash2, Building2, Star, X, Phone, RefreshCw, CreditCard, AlertCircle } from 'lucide-react';
import { loadIamportScript, initializeIamport, requestUnifiedPayment, createServicePayment, getServicePrice } from '../services/UnifiedPaymentService';

function NewProducts({ user }) {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentProcessing, setPaymentProcessing] = useState(false);
    const [pendingSaveData, setPendingSaveData] = useState(null);
    const [servicePrice, setServicePrice] = useState(null);
    const [myPendingProducts, setMyPendingProducts] = useState([]);
    
    const [formData, setFormData] = useState({
        productName: '', manufacturer: '', price: '', description: '', features: '', contactInfo: ''
    });

    useEffect(() => {
        const initPayment = async () => {
            try {
                await loadIamportScript();
                initializeIamport();
                console.log('✅ 아임포트 초기화 완료');
            } catch (error) {
                console.error('❌ 아임포트 초기화 실패:', error);
            }
        };
        initPayment();
    }, []);

    useEffect(() => {
        const loadPrice = async () => {
            try {
                const priceInfo = await getServicePrice('new-product');
                setServicePrice(priceInfo);
                console.log('✅ 신제품 등록 가격 로드:', priceInfo);
            } catch (error) {
                console.error('❌ 가격 로드 실패:', error);
            }
        };
        loadPrice();
    }, []);

    const loadProducts = async () => {
        try {
            const productsRef = collection(db, 'newProducts');
            const q = query(productsRef, where('status', '==', 'active'), orderBy('createdAt', 'desc'));
            const querySnapshot = await getDocs(q);
            const productsList = [];
            const now = new Date();
            querySnapshot.forEach((docSnap) => {
                const data = docSnap.data();
                const expiryDate = data.expiryDate?.toDate ? data.expiryDate.toDate() : new Date(data.expiryDate);
                if (expiryDate > now) {
                    const timeDiff = expiryDate - now;
                    const daysLeft = Math.ceil(timeDiff / (24 * 60 * 60 * 1000));
                    productsList.push({ id: docSnap.id, ...data, daysLeft });
                }
            });
            setProducts(productsList);
        } catch (error) {
            console.error('❌ 신제품 로드 실패:', error);
            if (error.code === 'failed-precondition' || error.message.includes('index')) {
                alert('⚠️ Firestore 인덱스가 필요합니다!\n\n콘솔(F12)의 에러 메시지에서 링크를 클릭하여 인덱스를 생성해주세요.');
            }
        } finally {
            setLoading(false);
        }
    };

    const loadMyPendingProducts = useCallback(async () => {
        if (!user?.uid) return;
        try {
            const productsRef = collection(db, 'newProducts');
            const q = query(productsRef, where('userId', '==', user.uid), where('status', 'in', ['pending', 'approved', 'rejected']), orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);
            const pendingList = [];
            snapshot.forEach((docSnap) => {
                pendingList.push({ id: docSnap.id, ...docSnap.data() });
            });
            setMyPendingProducts(pendingList);
        } catch (error) {
            console.error('❌ 대기중 신제품 로드 실패:', error);
        }
    }, [user?.uid]);

    useEffect(() => {
        loadProducts();
        if (user?.uid) {
            loadMyPendingProducts();
        }
        const productsRef = collection(db, 'newProducts');
        const q = query(productsRef, where('status', '==', 'active'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q,
            (snapshot) => {
                const productsList = [];
                const now = new Date();
                snapshot.forEach((docSnap) => {
                    const data = docSnap.data();
                    const expiryDate = data.expiryDate?.toDate ? data.expiryDate.toDate() : new Date(data.expiryDate);
                    if (expiryDate > now) {
                        const timeDiff = expiryDate - now;
                        const daysLeft = Math.ceil(timeDiff / (24 * 60 * 60 * 1000));
                        productsList.push({ id: docSnap.id, ...data, daysLeft });
                    }
                });
                setProducts(productsList);
                setLoading(false);
            },
            (error) => {
                console.error('❌ 신제품 실시간 리스너 에러:', error);
                setLoading(false);
            }
        );
        return () => unsubscribe();
    }, [user?.uid, loadMyPendingProducts]);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                alert('이미지 크기는 5MB 이하여야 합니다.');
                return;
            }
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setImagePreview(reader.result);
            reader.readAsDataURL(file);
        }
    };

    const uploadImage = async () => {
        if (!imageFile) return null;
        try {
            const timestamp = Date.now();
            const storageRef = ref(storage, `products/${user.uid}_${timestamp}`);
            await uploadBytes(storageRef, imageFile);
            return await getDownloadURL(storageRef);
        } catch (error) {
            console.error('이미지 업로드 실패:', error);
            throw error;
        }
    };

    const handleSavePending = async (e) => {
        e.preventDefault();
        if (user.companyId) {
            alert('❌ 직원 계정은 신제품을 등록할 수 없습니다.\n업체 대표에게 문의하세요.');
            return;
        }
        if (!formData.productName || !formData.description) {
            alert('필수 항목을 모두 입력해주세요.');
            return;
        }
        setUploading(true);
        try {
            let imageUrl = null;
            if (imageFile) {
                imageUrl = await uploadImage();
            }
            const productData = {
                ...formData,
                imageUrl,
                userId: user.uid,
                userName: user.name || user.email,
                userType: user.userType || 'business',
                businessType: user.businessType || 'seller',
                businessName: user.businessName || user.companyName || '',
                status: 'pending',
                isPaid: false,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };
            const docRef = await addDoc(collection(db, 'newProducts'), productData);
            setPendingSaveData({ productId: docRef.id, productData });
            setShowForm(false);
            setShowPaymentModal(true);
        } catch (error) {
            console.error('등록 실패:', error);
            alert('등록에 실패했습니다: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    const handlePayment = async () => {
        if (!pendingSaveData || !servicePrice) {
            alert('결제 정보를 불러오는 중입니다. 잠시만 기다려주세요.');
            return;
        }
        try {
            setPaymentProcessing(true);
            const paymentResult = await requestUnifiedPayment({
                serviceType: 'new-product',
                amount: servicePrice.price,
                serviceName: servicePrice.name,
                buyerName: user.name || user.email,
                buyerEmail: user.email,
                buyerPhone: user.phone || '010-0000-0000',
                additionalData: { productId: pendingSaveData.productId, productName: pendingSaveData.productData.productName }
            });
            await createServicePayment({
                userId: user.uid,
                userInfo: user,
                serviceType: 'new-product',
                payment: paymentResult,
                contentId: pendingSaveData.productId,
                contentData: { productName: pendingSaveData.productData.productName, manufacturer: pendingSaveData.productData.manufacturer }
            });
            await updateDoc(doc(db, 'newProducts', pendingSaveData.productId), {
                isPaid: true,
                paymentDate: serverTimestamp(),
                orderNumber: paymentResult.orderNumber
            });
            alert('✅ 결제가 완료되었습니다!\n\n관리자 승인 후 신제품이 게시됩니다.\n승인까지 1-2일 소요될 수 있습니다.');
            setShowPaymentModal(false);
            setPendingSaveData(null);
            resetForm();
            loadMyPendingProducts();
        } catch (error) {
            console.error('❌ 결제 실패:', error);
            alert(error.error_msg || '결제에 실패했습니다. 다시 시도해주세요.');
        } finally {
            setPaymentProcessing(false);
        }
    };

    const handlePayPendingProduct = async (product) => {
        if (!servicePrice) {
            alert('결제 정보를 불러오는 중입니다. 잠시만 기다려주세요.');
            return;
        }
        if (product.isPaid) {
            alert('이미 결제가 완료된 신제품입니다.');
            return;
        }
        const confirmPay = window.confirm(`"${product.productName}" 신제품을 결제하시겠습니까?\n\n금액: ${servicePrice.price.toLocaleString()}원\n기간: ${servicePrice.duration}일`);
        if (!confirmPay) return;
        try {
            setPaymentProcessing(true);
            const paymentResult = await requestUnifiedPayment({
                serviceType: 'new-product',
                amount: servicePrice.price,
                serviceName: servicePrice.name,
                buyerName: user.name || user.email,
                buyerEmail: user.email,
                buyerPhone: user.phone || '010-0000-0000',
                additionalData: { productId: product.id, productName: product.productName }
            });
            await createServicePayment({
                userId: user.uid,
                userInfo: user,
                serviceType: 'new-product',
                payment: paymentResult,
                contentId: product.id,
                contentData: { productName: product.productName, manufacturer: product.manufacturer }
            });
            await updateDoc(doc(db, 'newProducts', product.id), {
                isPaid: true,
                paymentDate: serverTimestamp(),
                orderNumber: paymentResult.orderNumber
            });
            alert('✅ 결제가 완료되었습니다!\n관리자 승인 후 신제품이 게시됩니다.');
            loadMyPendingProducts();
        } catch (error) {
            console.error('❌ 결제 실패:', error);
            alert(error.error_msg || '결제에 실패했습니다.');
        } finally {
            setPaymentProcessing(false);
        }
    };

    const resetForm = () => {
        setFormData({ productName: '', manufacturer: '', price: '', description: '', features: '', contactInfo: '' });
        setImageFile(null);
        setImagePreview(null);
        setShowForm(false);
    };

    const handleDelete = async (productId, e) => {
        if (e) e.stopPropagation();
        if (!window.confirm('정말 삭제하시겠습니까?')) return;
        try {
            await deleteDoc(doc(db, 'newProducts', productId));
            alert('삭제되었습니다.');
            loadProducts();
            loadMyPendingProducts();
            if (showModal && selectedProduct?.id === productId) {
                setShowModal(false);
                setSelectedProduct(null);
            }
        } catch (error) {
            console.error('삭제 실패:', error);
            alert('삭제에 실패했습니다: ' + error.message);
        }
    };

    const canRegister = () => {
        if (user.companyId) return false;
        if (user.businessType === 'seller' && user.sellerStatus === 'approved') return true;
        if (user.businessType === 'dental' || user.businessType === 'clinic' || user.businessType === 'lab') return true;
        return false;
    };

    const handleRowClick = (product) => {
        setSelectedProduct(product);
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setSelectedProduct(null);
    };

    const renderStatusBadge = (status, isPaid) => {
        if (status === 'pending' && !isPaid) return <span style={styles.statusBadgePending}>결제 대기</span>;
        if (status === 'pending' && isPaid) return <span style={styles.statusBadgeWaiting}>승인 대기</span>;
        if (status === 'approved') return <span style={styles.statusBadgeApproved}>승인됨</span>;
        if (status === 'rejected') return <span style={styles.statusBadgeRejected}>반려됨</span>;
        return null;
    };

    const isNew = (createdAt) => {
        if (!createdAt) return false;
        const created = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
        const daysDiff = (new Date() - created) / (1000 * 60 * 60 * 24);
        return daysDiff <= 7;
    };

    if (loading) {
        return (
            <div style={styles.container}>
                <div style={styles.loading}>로딩 중...</div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <div style={styles.content}>
                <div style={styles.header}>
                    <div style={styles.titleSection}>
                        <Package size={32} style={{ color: '#6366f1' }} />
                        <div>
                            <h1 style={styles.title}>신제품 소개</h1>
                            <p style={styles.subtitle}>치과 신제품을 확인하고 등록하세요</p>
                        </div>
                    </div>
                    {canRegister() && (
                        <button onClick={() => setShowForm(true)} style={styles.registerButton}>
                            <Plus size={20} />신제품 등록
                        </button>
                    )}
                </div>

                {user?.companyId && (
                    <div style={styles.staffNotice}>
                        <AlertCircle size={20} />
                        <span>직원 계정은 신제품을 등록할 수 없습니다. 업체 대표에게 문의하세요.</span>
                    </div>
                )}

                {myPendingProducts.length > 0 && (
                    <div style={styles.pendingSection}>
                        <h3 style={styles.pendingSectionTitle}>
                            <RefreshCw size={20} />
                            내 신제품 신청 현황
                        </h3>
                        <div style={styles.pendingList}>
                            {myPendingProducts.map(product => (
                                <div key={product.id} style={styles.pendingCard}>
                                    <div style={styles.pendingCardHeader}>
                                        <h4 style={styles.pendingCardTitle}>{product.productName}</h4>
                                        {renderStatusBadge(product.status, product.isPaid)}
                                    </div>
                                    <div style={styles.pendingCardMeta}>
                                        {product.manufacturer && <span>{product.manufacturer}</span>}
                                        {product.price && (
                                            <>
                                                <span>•</span>
                                                <span>{parseInt(product.price).toLocaleString()}원</span>
                                            </>
                                        )}
                                    </div>
                                    <div style={styles.pendingCardActions}>
                                        {!product.isPaid && product.status === 'pending' && (
                                            <button onClick={() => handlePayPendingProduct(product)} style={styles.payButton} disabled={paymentProcessing}>
                                                <CreditCard size={16} />{paymentProcessing ? '처리 중...' : '결제하기'}
                                            </button>
                                        )}
                                        {product.isPaid && product.status === 'pending' && (
                                            <span style={styles.waitingText}>
                                                <AlertCircle size={16} />
                                                관리자 승인 대기중
                                            </span>
                                        )}
                                        {product.status === 'rejected' && product.rejectionReason && (
                                            <div style={styles.rejectionReason}>
                                                <AlertCircle size={16} />
                                                <span>반려 사유: {product.rejectionReason}</span>
                                            </div>
                                        )}
                                        <button onClick={(e) => handleDelete(product.id, e)} style={styles.deleteButtonSmall}>
                                            <Trash2 size={16} />삭제
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {products.length === 0 ? (
                    <div style={styles.emptyState}>
                        <Package size={64} color="#cbd5e1" />
                        <p style={styles.emptyText}>등록된 신제품이 없습니다</p>
                        {canRegister() && <p style={styles.emptySubtext}>첫 신제품을 등록해보세요!</p>}
                    </div>
                ) : (
                    <div style={styles.tableContainer}>
                        <table style={styles.table}>
                            <thead style={styles.tableHeaderRow}>
                                <tr>
                                    <th style={styles.th}>이미지</th>
                                    <th style={styles.th}>제품명</th>
                                    <th style={styles.th}>제조사</th>
                                    <th style={styles.th}>가격</th>
                                    <th style={styles.th}>등록일</th>
                                    {user && <th style={styles.th}>관리</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {products.map((product) => (
                                    <tr key={product.id} style={styles.tableRow} onClick={() => handleRowClick(product)}>
                                        <td style={styles.td}>
                                            {product.imageUrl ? (
                                                <img src={product.imageUrl} alt={product.productName} style={styles.thumbnail} />
                                            ) : (
                                                <div style={styles.noImage}><ImageIcon size={24} color="#cbd5e1" /></div>
                                            )}
                                        </td>
                                        <td style={styles.td}>
                                            <div style={styles.productNameCell}>
                                                {isNew(product.createdAt) && <span style={styles.newBadge}>NEW</span>}
                                                <span style={styles.productNameText}>{product.productName}</span>
                                                {product.userId === user?.uid && <span style={styles.ownerBadge}>D-{product.daysLeft}</span>}
                                            </div>
                                        </td>
                                        <td style={styles.td}>
                                            {product.manufacturer && (
                                                <div style={styles.manufacturerCell}>
                                                    <Building2 size={16} />{product.manufacturer}
                                                </div>
                                            )}
                                        </td>
                                        <td style={styles.td}>
                                            {product.price ? (
                                                <span style={styles.priceText}>{parseInt(product.price).toLocaleString()}원</span>
                                            ) : (
                                                <span style={styles.noPriceText}>가격 문의</span>
                                            )}
                                        </td>
                                        <td style={styles.td}>
                                            {product.createdAt ? new Date(product.createdAt.toDate ? product.createdAt.toDate() : product.createdAt).toLocaleDateString('ko-KR') : '-'}
                                        </td>
                                        {user && (
                                            <td style={styles.td}>
                                                {product.userId === user.uid && (
                                                    <button onClick={(e) => handleDelete(product.id, e)} style={styles.deleteButton}>
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {showPaymentModal && (
                    <div style={styles.modalOverlay} onClick={() => !paymentProcessing && setShowPaymentModal(false)}>
                        <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                            <div style={styles.modalHeader}>
                                <h2 style={styles.modalTitle}><CreditCard size={24} />신제품 등록 결제</h2>
                                <button onClick={() => { setShowPaymentModal(false); setPendingSaveData(null); }} style={styles.closeButton} disabled={paymentProcessing}>
                                    <X size={24} />
                                </button>
                            </div>
                            <div style={styles.modalBody}>
                                {servicePrice && pendingSaveData && (
                                    <div style={styles.paymentInfo}>
                                        <h4 style={styles.paymentInfoTitle}>{pendingSaveData.productData.productName}</h4>
                                        <div style={styles.paymentInfoGrid}>
                                            <div style={styles.paymentInfoRow}>
                                                <span style={styles.paymentLabel}>등록 비용</span>
                                                <span style={styles.paymentValue}>{servicePrice.price.toLocaleString()}원</span>
                                            </div>
                                            <div style={styles.paymentInfoRow}>
                                                <span style={styles.paymentLabel}>게시 기간</span>
                                                <span style={styles.paymentValue}>{servicePrice.duration}일</span>
                                            </div>
                                            {pendingSaveData.productData.manufacturer && (
                                                <div style={styles.paymentInfoRow}>
                                                    <span style={styles.paymentLabel}>제조사</span>
                                                    <span style={styles.paymentValue}>{pendingSaveData.productData.manufacturer}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                                <div style={styles.paymentNotice}>
                                    <AlertCircle size={20} style={{ color: '#f59e0b', flexShrink: 0 }} />
                                    <div>
                                        <p style={styles.noticeText}>• 결제 후 관리자 승인이 완료되면 신제품이 게시됩니다</p>
                                        <p style={styles.noticeSubtext}>• 승인까지 1-2일 소요될 수 있습니다</p>
                                        <p style={styles.noticeSubtext}>• {servicePrice?.duration || 30}일간 신제품이 게시됩니다</p>
                                    </div>
                                </div>
                                <button onClick={handlePayment} style={styles.payButtonLarge} disabled={paymentProcessing || !servicePrice}>
                                    <CreditCard size={18} />{paymentProcessing ? '처리 중...' : `${servicePrice?.price?.toLocaleString() || '20,000'}원 결제하기`}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {showForm && (
                    <div style={styles.modalOverlay} onClick={() => setShowForm(false)}>
                        <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                            <div style={styles.modalHeader}>
                                <h2 style={styles.modalTitle}>신제품 등록</h2>
                                <button onClick={() => { setShowForm(false); resetForm(); }} style={styles.closeButton}>
                                    <X size={24} />
                                </button>
                            </div>
                            <div style={styles.modalBody}>
                                <form onSubmit={handleSavePending}>
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>제품 이미지</label>
                                        <div style={styles.imageUploadBox}>
                                            <input type="file" accept="image/*" onChange={handleImageChange} style={styles.fileInput} id="product-image" />
                                            <label htmlFor="product-image" style={styles.uploadLabel}>
                                                {imagePreview ? (
                                                    <img src={imagePreview} alt="Preview" style={styles.imagePreview} />
                                                ) : (
                                                    <>
                                                        <ImageIcon size={48} color="#94a3b8" />
                                                        <span style={styles.uploadText}>클릭하여 이미지 선택</span>
                                                    </>
                                                )}
                                            </label>
                                        </div>
                                    </div>
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>제품명 *</label>
                                        <input type="text" value={formData.productName} onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                                            placeholder="제품명을 입력하세요" style={styles.input} required />
                                    </div>
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>제조사</label>
                                        <input type="text" value={formData.manufacturer} onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                                            placeholder="제조사를 입력하세요" style={styles.input} />
                                    </div>
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>가격</label>
                                        <input type="number" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                            placeholder="가격을 입력하세요 (숫자만)" style={styles.input} />
                                    </div>
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>제품 설명 *</label>
                                        <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            placeholder="제품에 대한 상세한 설명을 입력하세요" style={styles.textarea} required />
                                    </div>
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>주요 특징</label>
                                        <textarea value={formData.features} onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                                            placeholder="제품의 주요 특징을 입력하세요" style={styles.textarea} />
                                    </div>
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>연락처</label>
                                        <input type="text" value={formData.contactInfo} onChange={(e) => setFormData({ ...formData, contactInfo: e.target.value })}
                                            placeholder="연락처를 입력하세요" style={styles.input} />
                                    </div>
                                    <button type="submit" style={styles.submitButton} disabled={uploading}>
                                        {uploading ? '처리 중...' : '다음 (결제)'}
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

                {showModal && selectedProduct && (
                    <div style={styles.modalOverlay} onClick={closeModal}>
                        <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                            <div style={styles.modalHeader}>
                                <h2 style={styles.modalTitle}>제품 상세정보</h2>
                                <button onClick={closeModal} style={styles.closeButton}><X size={24} /></button>
                            </div>
                            <div style={styles.modalBody}>
                                {selectedProduct.imageUrl && (
                                    <div style={styles.modalImageContainer}>
                                        <img src={selectedProduct.imageUrl} alt={selectedProduct.productName} style={styles.modalImage} />
                                    </div>
                                )}
                                <div style={styles.modalProductHeader}>
                                    {isNew(selectedProduct.createdAt) && <span style={styles.modalNewBadge}>NEW</span>}
                                    <h3 style={styles.modalProductName}>{selectedProduct.productName}</h3>
                                </div>
                                <div style={styles.modalSection}>
                                    {selectedProduct.manufacturer && (
                                        <div style={styles.modalInfoRow}>
                                            <Building2 size={20} color="#10b981" />
                                            <span style={styles.modalManufacturer}>{selectedProduct.manufacturer}</span>
                                        </div>
                                    )}
                                    {selectedProduct.price && (
                                        <div style={styles.modalInfoRow}>
                                            <DollarSign size={20} color="#6366f1" />
                                            <span style={styles.modalPrice}>{parseInt(selectedProduct.price).toLocaleString()}원</span>
                                        </div>
                                    )}
                                </div>
                                {selectedProduct.description && (
                                    <div style={styles.modalSection}>
                                        <h4 style={styles.modalSectionTitle}>제품 설명</h4>
                                        <p style={styles.modalDescription}>{selectedProduct.description}</p>
                                    </div>
                                )}
                                {selectedProduct.features && (
                                    <div style={styles.modalSection}>
                                        <div style={styles.modalFeatureHeader}>
                                            <Star size={20} color="#f59e0b" />
                                            <h4 style={styles.modalSectionTitle}>주요 특징</h4>
                                        </div>
                                        <p style={styles.modalDescription}>{selectedProduct.features}</p>
                                    </div>
                                )}
                                {selectedProduct.contactInfo && (
                                    <div style={styles.modalContactBox}>
                                        <Phone size={20} color="#166534" />
                                        <div>
                                            <div style={styles.modalContactLabel}>문의하기</div>
                                            <div style={styles.modalContactInfo}>{selectedProduct.contactInfo}</div>
                                        </div>
                                    </div>
                                )}
                                <div style={styles.modalFooter}>
                                    <div style={styles.modalFooterInfo}>
                                        <span style={styles.modalFooterLabel}>등록자</span>
                                        <span style={styles.modalFooterValue}>{selectedProduct.userName}</span>
                                    </div>
                                    <div style={styles.modalFooterInfo}>
                                        <span style={styles.modalFooterLabel}>등록일</span>
                                        <span style={styles.modalFooterValue}>
                                            {selectedProduct.createdAt ? new Date(selectedProduct.createdAt.toDate ? selectedProduct.createdAt.toDate() : selectedProduct.createdAt).toLocaleDateString('ko-KR') : '-'}
                                        </span>
                                    </div>
                                </div>
                                {selectedProduct.userId === user?.uid && (
                                    <div style={styles.modalActionSection}>
                                        <button onClick={(e) => handleDelete(selectedProduct.id, e)} style={styles.modalDeleteButton}>
                                            <Trash2 size={18} />제품 삭제
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

const styles = {
    container: { minHeight: '100vh', backgroundColor: '#f8fafc', padding: '24px' },
    content: { maxWidth: '1200px', margin: '0 auto' },
    loading: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px', fontSize: '16px', color: '#64748b' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' },
    titleSection: { display: 'flex', alignItems: 'center', gap: '16px' },
    title: { margin: 0, fontSize: '28px', fontWeight: '700', color: '#1e293b' },
    subtitle: { margin: '4px 0 0 0', fontSize: '14px', color: '#64748b' },
    registerButton: { display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', backgroundColor: '#6366f1', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
    staffNotice: { display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', backgroundColor: '#fef3c7', border: '2px solid #fde047', borderRadius: '12px', color: '#92400e', fontSize: '14px', fontWeight: '500', marginBottom: '24px' },
    pendingSection: { backgroundColor: '#ffffff', borderRadius: '12px', padding: '24px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' },
    pendingSectionTitle: { display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 20px 0', fontSize: '18px', fontWeight: '600', color: '#1e293b' },
    pendingList: { display: 'flex', flexDirection: 'column', gap: '12px' },
    pendingCard: { padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' },
    pendingCardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' },
    pendingCardTitle: { margin: 0, fontSize: '18px', fontWeight: '600', color: '#1e293b' },
    pendingCardMeta: { display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', color: '#64748b', marginBottom: '16px' },
    pendingCardActions: { display: 'flex', gap: '8px' },
    statusBadgePending: { padding: '4px 12px', backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: '12px', fontSize: '12px', fontWeight: '600' },
    statusBadgeWaiting: { padding: '4px 12px', backgroundColor: '#fef3c7', color: '#d97706', borderRadius: '12px', fontSize: '12px', fontWeight: '600' },
    statusBadgeApproved: { padding: '4px 12px', backgroundColor: '#dcfce7', color: '#16a34a', borderRadius: '12px', fontSize: '12px', fontWeight: '600' },
    statusBadgeRejected: { padding: '4px 12px', backgroundColor: '#f1f5f9', color: '#64748b', borderRadius: '12px', fontSize: '12px', fontWeight: '600' },
    payButton: { display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px', backgroundColor: '#6366f1', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', marginBottom: '8px' },
    waitingText: { display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px', backgroundColor: '#fef3c7', color: '#92400e', borderRadius: '8px', fontSize: '14px', fontWeight: '600' },
    rejectionReason: { display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', backgroundColor: '#fee2e2', borderRadius: '6px', fontSize: '13px', color: '#dc2626', marginTop: '12px' },
    deleteButtonSmall: { display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', backgroundColor: 'transparent', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', width: 'fit-content' },
    tableContainer: { backgroundColor: '#ffffff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' },
    table: { width: '100%', borderCollapse: 'collapse' },
    tableHeaderRow: { backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' },
    th: { padding: '16px', textAlign: 'center', fontSize: '14px', fontWeight: '600', color: '#475569', whiteSpace: 'nowrap' },
    tableRow: { borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background-color 0.2s' },
    td: { padding: '16px', textAlign: 'center', fontSize: '14px', color: '#64748b' },
    thumbnail: { width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px' },
    noImage: { width: '60px', height: '60px', backgroundColor: '#f1f5f9', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    productNameCell: { display: 'flex', alignItems: 'center', gap: '8px' },
    newBadge: { padding: '2px 8px', backgroundColor: '#dbeafe', color: '#2563eb', borderRadius: '10px', fontSize: '11px', fontWeight: '700', flexShrink: 0 },
    ownerBadge: { padding: '2px 8px', backgroundColor: '#dcfce7', color: '#166534', borderRadius: '10px', fontSize: '11px', fontWeight: '700', flexShrink: 0 },
    productNameText: { fontWeight: '600' },
    manufacturerCell: { display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', fontWeight: '500' },
    priceText: { color: '#6366f1', fontWeight: '600' },
    noPriceText: { color: '#94a3b8' },
    deleteButton: { padding: '6px', backgroundColor: 'transparent', color: '#ef4444', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'background-color 0.2s' },
    emptyState: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', textAlign: 'center' },
    emptyText: { marginTop: '16px', fontSize: '14px', color: '#94a3b8' },
    emptySubtext: { marginTop: '8px', fontSize: '13px', color: '#cbd5e1' },
    paymentInfo: { display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '20px' },
    paymentInfoTitle: { margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600', color: '#1e293b' },
    paymentInfoGrid: { display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px' },
    paymentInfoRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    paymentLabel: { fontSize: '14px', color: '#64748b' },
    paymentValue: { fontSize: '14px', fontWeight: '600', color: '#1e293b' },
    paymentAmount: { fontSize: '20px', color: '#6366f1', fontWeight: '700' },
    paymentNotice: { display: 'flex', gap: '12px', padding: '16px', backgroundColor: '#fefce8', border: '1px solid #fde047', borderRadius: '8px', marginBottom: '24px' },
    noticeText: { margin: '4px 0', fontSize: '14px', color: '#854d0e', lineHeight: '1.5', fontWeight: '600' },
    noticeSubtext: { margin: '4px 0', fontSize: '13px', color: '#854d0e', lineHeight: '1.5' },
    payButtonLarge: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '12px', backgroundColor: '#6366f1', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' },
    modalContent: { backgroundColor: '#ffffff', borderRadius: '16px', maxWidth: '800px', width: '100%', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' },
    modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, backgroundColor: '#ffffff', zIndex: 1 },
    modalTitle: { display: 'flex', alignItems: 'center', gap: '12px', margin: 0, fontSize: '20px', fontWeight: '600', color: '#1e293b' },
    closeButton: { padding: '8px', backgroundColor: 'transparent', color: '#64748b', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'background-color 0.2s' },
    modalBody: { padding: '24px' },
    formGroup: { marginBottom: '20px' },
    label: { display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#475569' },
    input: { width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', outline: 'none' },
    textarea: { width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', outline: 'none', resize: 'vertical', fontFamily: 'inherit', minHeight: '100px' },
    imageUploadBox: { position: 'relative' },
    fileInput: { display: 'none' },
    uploadLabel: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '200px', border: '2px dashed #e2e8f0', borderRadius: '12px', backgroundColor: '#f8fafc', cursor: 'pointer', transition: 'all 0.2s' },
    imagePreview: { width: '100%', height: 'auto', maxHeight: '300px', objectFit: 'contain', borderRadius: '8px' },
    uploadText: { marginTop: '12px', fontSize: '14px', color: '#64748b' },
    submitButton: { width: '100%', padding: '12px', backgroundColor: '#6366f1', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
    modalImageContainer: { width: '100%', marginBottom: '24px', backgroundColor: '#f8fafc', borderRadius: '12px', overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center' },
    modalImage: { width: '100%', height: 'auto', objectFit: 'contain' },
    modalSection: { marginBottom: '24px' },
    modalProductHeader: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' },
    modalNewBadge: { padding: '4px 12px', backgroundColor: '#dbeafe', color: '#2563eb', borderRadius: '12px', fontSize: '12px', fontWeight: '700' },
    modalProductName: { margin: 0, fontSize: '24px', fontWeight: '700', color: '#1e293b' },
    modalInfoRow: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' },
    modalManufacturer: { fontSize: '16px', fontWeight: '600', color: '#10b981' },
    modalPrice: { fontSize: '20px', fontWeight: '700', color: '#6366f1' },
    modalSectionTitle: { margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600', color: '#1e293b' },
    modalDescription: { margin: 0, fontSize: '15px', color: '#475569', lineHeight: '1.7', whiteSpace: 'pre-wrap' },
    modalFeatureHeader: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' },
    modalContactBox: { display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px' },
    modalContactLabel: { fontSize: '12px', color: '#166534', fontWeight: '500', marginBottom: '4px' },
    modalContactInfo: { fontSize: '15px', color: '#166534', fontWeight: '600' },
    modalFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderTop: '1px solid #e2e8f0', marginTop: '24px' },
    modalFooterInfo: { display: 'flex', alignItems: 'center', gap: '8px' },
    modalFooterLabel: { fontSize: '13px', color: '#94a3b8', fontWeight: '500' },
    modalFooterValue: { fontSize: '13px', color: '#475569', fontWeight: '600' },
    modalActionSection: { marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' },
    modalDeleteButton: { display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', backgroundColor: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }
};

export default NewProducts;