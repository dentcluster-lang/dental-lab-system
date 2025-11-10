import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, addDoc, deleteDoc, doc, orderBy, Timestamp, writeBatch, where, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase/config';
import * as XLSX from 'xlsx';
import {
    ShoppingBag, Plus, Trash2, Package, DollarSign,
    Upload, Image as ImageIcon, Search, Tag, Download,
    FileSpreadsheet, CheckCircle, XCircle, Images, Copy,
    Edit2, Eye, EyeOff, TrendingUp, ChevronLeft, ChevronRight,
    RefreshCw, Filter, User
} from 'lucide-react';

function MarketplaceProductManagement({ user }) {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showExcelModal, setShowExcelModal] = useState(false);
    const [showImageUploadModal, setShowImageUploadModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterSeller, setFilterSeller] = useState('all');
    const [sortBy, setSortBy] = useState('createdAt-desc');
    const [excelData, setExcelData] = useState([]);
    const [excelPreview, setExcelPreview] = useState([]);
    const [uploadingBulk, setUploadingBulk] = useState(false);
    const [uploadedImages, setUploadedImages] = useState([]);
    const [uploadingImages, setUploadingImages] = useState(false);
    const [selectedProducts, setSelectedProducts] = useState([]);
    const [selectAll, setSelectAll] = useState(false);
    
    // 페이지네이션
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);

    const categories = [
        { value: 'all', label: '전체 카테고리' },
        { value: 'dental-materials', label: '치과재료' },
        { value: 'equipment', label: '장비' },
        { value: 'instruments', label: '기구' },
        { value: 'supplies', label: '소모품' },
        { value: 'lab-materials', label: '기공재료' },
        { value: 'implant', label: '임플란트' },
        { value: 'orthodontics', label: '교정' },
        { value: 'endodontics', label: '근관치료' },
        { value: 'prosthetics', label: '보철' },
        { value: 'other', label: '기타' }
    ];

    const sortOptions = [
        { value: 'createdAt-desc', label: '최신순' },
        { value: 'createdAt-asc', label: '오래된순' },
        { value: 'price-asc', label: '낮은 가격순' },
        { value: 'price-desc', label: '높은 가격순' },
        { value: 'views-desc', label: '조회수 높은순' },
        { value: 'sales-desc', label: '판매량 높은순' },
        { value: 'name-asc', label: '이름순(ㄱ-ㅎ)' }
    ];

    useEffect(() => {
        checkAccessAndLoadProducts();
    }, []);

    const checkAccessAndLoadProducts = async () => {
        try {
            setLoading(true);

            if (!user?.uid) {
                alert('로그인이 필요합니다.');
                window.location.href = '/';
                return;
            }

            const isAdmin = user.isAdmin || user.role === 'admin';

            if (!isAdmin) {
                alert('관리자만 접근 가능합니다.');
                window.location.href = '/';
                return;
            }

            await loadProducts();
        } catch (error) {
            console.error('❌ 초기화 실패:', error);
            alert('오류가 발생했습니다.');
            setLoading(false);
        }
    };

    const loadProducts = async () => {
        try {
            const productsRef = collection(db, 'marketplaceProducts');
            const q = query(productsRef, orderBy('createdAt', 'desc'));
            
            const snapshot = await getDocs(q);
            
            const productsList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            console.log(`✅ 전체 상품 ${productsList.length}개 로드 완료`);
            setProducts(productsList);
            setLoading(false);
        } catch (error) {
            console.error('❌ 상품 로딩 실패:', error);
            
            if (error.code === 'failed-precondition') {
                alert('Firestore 인덱스를 생성해야 합니다.');
            } else {
                alert('상품을 불러오는데 실패했습니다: ' + error.message);
            }
            setLoading(false);
        }
    };

    const handleMultipleImageUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        try {
            setUploadingImages(true);

            const uploadPromises = files.map(async (file, index) => {
                const storageRef = ref(storage, `marketplace/${Date.now()}_${index}_${file.name}`);
                await uploadBytes(storageRef, file);
                const url = await getDownloadURL(storageRef);
                return {
                    fileName: file.name,
                    url: url
                };
            });

            const results = await Promise.all(uploadPromises);
            setUploadedImages(results);
            setShowImageUploadModal(true);
            
            alert(`✅ ${results.length}개의 이미지가 업로드되었습니다!`);
        } catch (error) {
            console.error('❌ 이미지 업로드 실패:', error);
            alert('이미지 업로드에 실패했습니다: ' + error.message);
        } finally {
            setUploadingImages(false);
        }
    };

    const downloadImageUrls = () => {
        if (uploadedImages.length === 0) {
            alert('업로드된 이미지가 없습니다.');
            return;
        }

        const data = uploadedImages.map((img, index) => ({
            '번호': index + 1,
            '파일명': img.fileName,
            '이미지URL': img.url
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        ws['!cols'] = [{ wch: 8 }, { wch: 30 }, { wch: 80 }];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '이미지 URL 목록');
        XLSX.writeFile(wb, '이미지_URL_목록.xlsx');
        
        alert('이미지 URL 목록이 다운로드되었습니다!');
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text).then(() => {
            alert('URL이 복사되었습니다!');
        }).catch(err => {
            console.error('복사 실패:', err);
            alert('복사에 실패했습니다.');
        });
    };

    const downloadExcelTemplate = () => {
        const templateData = [
            {
                '상품명': '프리미엄 임플란트 키트',
                '브랜드': 'DentalPro',
                '카테고리': 'implant',
                '상품설명': '고품질 임플란트 수술 키트',
                '판매가': 150000,
                '정가': 200000,
                '할인율': 25,
                '재고': 50,
                '단위': '개',
                '제조사': 'ABC제약',
                '원산지': '대한민국',
                '제품사양': '크기: 10x5cm, 재질: 티타늄',
                '주요특징': '생체 친화적, 장기 내구성',
                '인증정보': 'FDA, CE, KFDA',
                '배송정보': '무료배송, 1-2일 소요',
                '반품정책': '구매일로부터 7일 이내 반품 가능',
                '이미지URL': 'https://example.com/image.jpg'
            }
        ];

        const ws = XLSX.utils.json_to_sheet(templateData);
        ws['!cols'] = [
            { wch: 30 }, { wch: 15 }, { wch: 20 }, { wch: 40 },
            { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 10 },
            { wch: 8 }, { wch: 15 }, { wch: 12 }, { wch: 40 },
            { wch: 40 }, { wch: 20 }, { wch: 30 }, { wch: 40 }, { wch: 50 }
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '상품목록');

        const categorySheet = XLSX.utils.json_to_sheet([
            { '카테고리 값': 'dental-materials', '설명': '치과재료' },
            { '카테고리 값': 'equipment', '설명': '장비' },
            { '카테고리 값': 'instruments', '설명': '기구' },
            { '카테고리 값': 'supplies', '설명': '소모품' },
            { '카테고리 값': 'lab-materials', '설명': '기공재료' },
            { '카테고리 값': 'implant', '설명': '임플란트' },
            { '카테고리 값': 'orthodontics', '설명': '교정' },
            { '카테고리 값': 'endodontics', '설명': '근관치료' },
            { '카테고리 값': 'prosthetics', '설명': '보철' },
            { '카테고리 값': 'other', '설명': '기타' }
        ]);
        XLSX.utils.book_append_sheet(wb, categorySheet, '카테고리 목록');

        XLSX.writeFile(wb, '상품_업로드_템플릿.xlsx');
        alert('엑셀 템플릿이 다운로드되었습니다!');
    };

    const handleExcelUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);

            const validatedData = jsonData.map((row, index) => {
                const errors = [];
                if (!row['상품명']) errors.push('상품명 필수');
                if (!row['카테고리']) errors.push('카테고리 필수');
                if (!row['판매가']) errors.push('판매가 필수');

                const validCategories = categories.filter(c => c.value !== 'all').map(c => c.value);
                if (row['카테고리'] && !validCategories.includes(row['카테고리'])) {
                    errors.push('잘못된 카테고리');
                }

                return {
                    index: index + 1,
                    name: row['상품명'] || '',
                    brand: row['브랜드'] || '',
                    category: row['카테고리'] || 'other',
                    description: row['상품설명'] || '',
                    price: parseInt(row['판매가']) || 0,
                    originalPrice: row['정가'] ? parseInt(row['정가']) : null,
                    discount: row['할인율'] ? parseInt(row['할인율']) : null,
                    stock: row['재고'] ? parseInt(row['재고']) : null,
                    unit: row['단위'] || '개',
                    specifications: row['제품사양'] || '',
                    features: row['주요특징'] || '',
                    imageUrl: row['이미지URL'] || '',
                    manufacturer: row['제조사'] || '',
                    origin: row['원산지'] || '',
                    certifications: row['인증정보'] || '',
                    shippingInfo: row['배송정보'] || '',
                    returnPolicy: row['반품정책'] || '',
                    errors: errors,
                    isValid: errors.length === 0
                };
            });

            setExcelData(validatedData);
            setExcelPreview(validatedData);
            setShowExcelModal(true);

            const invalidCount = validatedData.filter(d => !d.isValid).length;
            if (invalidCount > 0) {
                alert(`${invalidCount}개의 상품에 오류가 있습니다. 미리보기를 확인해주세요.`);
            } else {
                alert(`${validatedData.length}개의 상품을 확인했습니다.`);
            }
        } catch (error) {
            console.error('엑셀 파일 처리 실패:', error);
            alert('엑셀 파일을 읽는데 실패했습니다.');
        }
    };

    const handleBulkUpload = async () => {
        const validProducts = excelData.filter(p => p.isValid);
        
        if (validProducts.length === 0) {
            alert('업로드할 수 있는 유효한 상품이 없습니다.');
            return;
        }

        if (!window.confirm(`${validProducts.length}개의 상품을 등록하시겠습니까?`)) {
            return;
        }

        try {
            setUploadingBulk(true);

            for (const product of validProducts) {
                const productData = {
                    name: product.name,
                    brand: product.brand,
                    category: product.category,
                    description: product.description,
                    price: product.price,
                    originalPrice: product.originalPrice,
                    discount: product.discount,
                    stock: product.stock,
                    unit: product.unit,
                    specifications: product.specifications,
                    features: product.features,
                    // 🔥 이미지 통일: images 배열과 imageUrl 모두 저장
                    images: product.imageUrl ? [product.imageUrl] : [],
                    imageUrl: product.imageUrl,
                    manufacturer: product.manufacturer,
                    origin: product.origin,
                    certifications: product.certifications,
                    shippingInfo: product.shippingInfo,
                    returnPolicy: product.returnPolicy,
                    postedBy: user.uid,
                    postedByName: user.businessName || user.companyName || user.name || user.email,
                    status: 'active',
                    createdAt: Timestamp.now(),
                    updatedAt: Timestamp.now(),
                    views: 0,
                    likes: 0,
                    sales: 0
                };

                await addDoc(collection(db, 'marketplaceProducts'), productData);
            }

            alert(`✅ ${validProducts.length}개의 상품이 성공적으로 등록되었습니다!`);
            setShowExcelModal(false);
            setExcelData([]);
            setExcelPreview([]);
            loadProducts();
        } catch (error) {
            console.error('일괄 업로드 실패:', error);
            alert('상품 등록 중 오류가 발생했습니다: ' + error.message);
        } finally {
            setUploadingBulk(false);
        }
    };

    const handleDelete = async (productId) => {
        if (!window.confirm('정말 이 상품을 삭제하시겠습니까?')) return;

        try {
            await deleteDoc(doc(db, 'marketplaceProducts', productId));
            alert('상품이 삭제되었습니다.');
            loadProducts();
        } catch (error) {
            console.error('상품 삭제 실패:', error);
            alert('상품 삭제에 실패했습니다.');
        }
    };

    const toggleProductStatus = async (productId, currentStatus) => {
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
        
        try {
            await updateDoc(doc(db, 'marketplaceProducts', productId), {
                status: newStatus,
                updatedAt: Timestamp.now()
            });
            
            setProducts(prev => prev.map(p => 
                p.id === productId ? { ...p, status: newStatus } : p
            ));
            
            alert(newStatus === 'active' ? '상품이 활성화되었습니다.' : '상품이 비활성화되었습니다.');
        } catch (error) {
            console.error('상태 변경 오류:', error);
            alert('상태 변경에 실패했습니다.');
        }
    };

    const handleSelectProduct = (productId) => {
        setSelectedProducts(prev => 
            prev.includes(productId) 
                ? prev.filter(id => id !== productId)
                : [...prev, productId]
        );
    };

    const handleSelectAll = () => {
        if (selectAll) {
            setSelectedProducts([]);
        } else {
            setSelectedProducts(currentProducts.map(p => p.id));
        }
        setSelectAll(!selectAll);
    };

    const bulkDelete = async () => {
        if (selectedProducts.length === 0) {
            alert('삭제할 상품을 선택해주세요.');
            return;
        }

        if (!window.confirm(`선택한 ${selectedProducts.length}개의 상품을 삭제하시겠습니까?`)) {
            return;
        }

        try {
            const batch = writeBatch(db);
            selectedProducts.forEach(productId => {
                batch.delete(doc(db, 'marketplaceProducts', productId));
            });
            await batch.commit();

            setProducts(prev => prev.filter(p => !selectedProducts.includes(p.id)));
            setSelectedProducts([]);
            setSelectAll(false);
            alert('선택한 상품이 삭제되었습니다.');
        } catch (error) {
            console.error('일괄 삭제 오류:', error);
            alert('일괄 삭제에 실패했습니다.');
        }
    };

    const bulkUpdateStatus = async (newStatus) => {
        if (selectedProducts.length === 0) {
            alert('상태를 변경할 상품을 선택해주세요.');
            return;
        }

        try {
            const batch = writeBatch(db);
            selectedProducts.forEach(productId => {
                batch.update(doc(db, 'marketplaceProducts', productId), {
                    status: newStatus,
                    updatedAt: Timestamp.now()
                });
            });
            await batch.commit();

            setProducts(prev => prev.map(p => 
                selectedProducts.includes(p.id) ? { ...p, status: newStatus } : p
            ));
            setSelectedProducts([]);
            setSelectAll(false);
            alert('선택한 상품의 상태가 변경되었습니다.');
        } catch (error) {
            console.error('일괄 상태 변경 오류:', error);
            alert('일괄 상태 변경에 실패했습니다.');
        }
    };

    const filteredProducts = products.filter(product => {
        const matchesSearch = !searchTerm || 
            product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.postedByName?.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesCategory = filterCategory === 'all' || product.category === filterCategory;
        const matchesStatus = filterStatus === 'all' || product.status === filterStatus;
        const matchesSeller = filterSeller === 'all' || product.postedBy === filterSeller;
        
        return matchesSearch && matchesCategory && matchesStatus && matchesSeller;
    }).sort((a, b) => {
        const [field, order] = sortBy.split('-');
        let comparison = 0;

        if (field === 'name') {
            comparison = (a.name || '').localeCompare(b.name || '', 'ko');
        } else if (field === 'price' || field === 'views' || field === 'sales') {
            comparison = (a[field] || 0) - (b[field] || 0);
        } else if (field === 'createdAt') {
            const aTime = a.createdAt?.toDate?.() || new Date(a.createdAt);
            const bTime = b.createdAt?.toDate?.() || new Date(b.createdAt);
            comparison = aTime - bTime;
        }

        return order === 'desc' ? -comparison : comparison;
    });

    // 판매자 목록 추출
    const sellers = Array.from(new Set(products.map(p => p.postedBy)))
        .map(sellerId => {
            const product = products.find(p => p.postedBy === sellerId);
            return {
                id: sellerId,
                name: product?.postedByName || '알 수 없음'
            };
        });

    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentProducts = filteredProducts.slice(startIndex, endIndex);

    const goToPage = (page) => {
        setCurrentPage(Math.max(1, Math.min(page, totalPages)));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const getCategoryLabel = (value) => {
        const category = categories.find(c => c.value === value);
        return category ? category.label : value;
    };

    const formatPrice = (price) => {
        return new Intl.NumberFormat('ko-KR').format(price);
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return '-';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit' });
    };

    const getStatusBadge = (status) => {
        const styles = {
            active: { bg: '#dcfce7', color: '#166534', text: '판매중' },
            inactive: { bg: '#f3f4f6', color: '#4b5563', text: '판매중지' },
            soldout: { bg: '#fee2e2', color: '#991b1b', text: '품절' }
        };
        const style = styles[status] || styles.inactive;
        
        return (
            <span style={{
                padding: '4px 8px',
                fontSize: '11px',
                fontWeight: '700',
                backgroundColor: style.bg,
                color: style.color,
                borderRadius: '4px',
                whiteSpace: 'nowrap'
            }}>
                {style.text}
            </span>
        );
    };

    // 🔥 이미지 URL 가져오기 함수 - images 배열과 imageUrl 모두 지원
    const getProductImageUrl = (product) => {
        // 1. images 배열이 있고 첫 번째 요소가 있으면 사용
        if (product.images && Array.isArray(product.images) && product.images.length > 0) {
            return product.images[0];
        }
        // 2. imageUrl 문자열이 있으면 사용
        if (product.imageUrl && typeof product.imageUrl === 'string') {
            return product.imageUrl;
        }
        // 3. 둘 다 없으면 null
        return null;
    };

    const isAdmin = user?.isAdmin || user?.role === 'admin';

    if (loading) {
        return (
            <div style={styles.loading}>
                <div style={styles.spinner}></div>
                <p>로딩 중...</p>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            {/* 헤더 */}
            <div style={styles.header}>
                <div style={styles.headerLeft}>
                    <ShoppingBag size={32} color="#6366f1" />
                    <div>
                        <h1 style={styles.title}>
                            마켓플레이스 상품 관리
                            <span style={styles.adminBadge}>관리자</span>
                        </h1>
                        <p style={styles.subtitle}>
                            전체 {products.length}개 상품
                            {selectedProducts.length > 0 && ` · ${selectedProducts.length}개 선택됨`}
                        </p>
                    </div>
                </div>
                <div style={styles.headerButtons}>
                    <button onClick={downloadExcelTemplate} style={styles.templateButton}>
                        <Download size={18} />
                        엑셀 양식
                    </button>
                    
                    <label style={styles.imageUploadButton}>
                        <Images size={18} />
                        {uploadingImages ? '업로드 중...' : '이미지 업로드'}
                        <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleMultipleImageUpload}
                            style={{ display: 'none' }}
                            disabled={uploadingImages}
                        />
                    </label>
                    
                    <label style={styles.excelUploadButton}>
                        <FileSpreadsheet size={18} />
                        엑셀 일괄등록
                        <input
                            type="file"
                            accept=".xlsx, .xls"
                            onChange={handleExcelUpload}
                            style={{ display: 'none' }}
                        />
                    </label>

                    <button 
                        style={styles.refreshButton}
                        onClick={loadProducts}
                    >
                        <RefreshCw size={18} />
                    </button>
                </div>
            </div>

            {/* 일괄 작업 바 */}
            {selectedProducts.length > 0 && (
                <div style={styles.bulkActionsBar}>
                    <span style={styles.bulkActionsText}>{selectedProducts.length}개 선택됨</span>
                    <div style={styles.bulkActions}>
                        <button 
                            style={styles.bulkActionButton}
                            onClick={() => bulkUpdateStatus('active')}
                        >
                            <Eye size={16} />
                            판매시작
                        </button>
                        <button 
                            style={styles.bulkActionButton}
                            onClick={() => bulkUpdateStatus('inactive')}
                        >
                            <EyeOff size={16} />
                            판매중지
                        </button>
                        <button 
                            style={{...styles.bulkActionButton, ...styles.bulkDeleteButton}}
                            onClick={bulkDelete}
                        >
                            <Trash2 size={16} />
                            삭제
                        </button>
                        <button 
                            style={styles.bulkCancelButton}
                            onClick={() => {
                                setSelectedProducts([]);
                                setSelectAll(false);
                            }}
                        >
                            취소
                        </button>
                    </div>
                </div>
            )}

            {/* 필터 & 검색 */}
            <div style={styles.filterSection}>
                <div style={styles.filterRow}>
                    <div style={styles.searchBox}>
                        <Search size={18} color="#64748b" />
                        <input
                            type="text"
                            placeholder="상품명, 브랜드, 판매자 검색..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={styles.searchInput}
                        />
                    </div>

                    <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        style={styles.select}
                    >
                        {categories.map(cat => (
                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                        ))}
                    </select>

                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        style={styles.select}
                    >
                        <option value="all">전체 상태</option>
                        <option value="active">판매중</option>
                        <option value="inactive">판매중지</option>
                        <option value="soldout">품절</option>
                    </select>

                    <select
                        value={filterSeller}
                        onChange={(e) => setFilterSeller(e.target.value)}
                        style={styles.select}
                    >
                        <option value="all">전체 판매자</option>
                        {sellers.map(seller => (
                            <option key={seller.id} value={seller.id}>{seller.name}</option>
                        ))}
                    </select>

                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        style={styles.select}
                    >
                        {sortOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>

                    <select
                        value={itemsPerPage}
                        onChange={(e) => {
                            setItemsPerPage(parseInt(e.target.value));
                            setCurrentPage(1);
                        }}
                        style={styles.select}
                    >
                        <option value="20">20개씩</option>
                        <option value="50">50개씩</option>
                        <option value="100">100개씩</option>
                    </select>
                </div>
            </div>

            {/* 테이블 */}
            {filteredProducts.length === 0 ? (
                <div style={styles.emptyState}>
                    <Package size={64} color="#cbd5e1" />
                    <h3 style={styles.emptyTitle}>등록된 상품이 없습니다</h3>
                    <p style={styles.emptyText}>
                        {searchTerm || filterCategory !== 'all' || filterStatus !== 'all' || filterSeller !== 'all'
                            ? '검색 결과가 없습니다.'
                            : '등록된 상품이 없습니다'}
                    </p>
                </div>
            ) : (
                <>
                    <div style={styles.tableContainer}>
                        <table style={styles.table}>
                            <thead>
                                <tr style={styles.tableHeader}>
                                    <th style={{...styles.th, width: '40px'}}>
                                        <input
                                            type="checkbox"
                                            checked={selectAll && currentProducts.length > 0}
                                            onChange={handleSelectAll}
                                            style={styles.checkbox}
                                        />
                                    </th>
                                    <th style={{...styles.th, width: '60px'}}>이미지</th>
                                    <th style={{...styles.th, width: 'auto'}}>상품명</th>
                                    <th style={{...styles.th, width: '100px'}}>카테고리</th>
                                    <th style={{...styles.th, width: '120px'}}>판매자</th>
                                    <th style={{...styles.th, width: '100px'}}>판매가</th>
                                    <th style={{...styles.th, width: '70px'}}>재고</th>
                                    <th style={{...styles.th, width: '80px'}}>상태</th>
                                    <th style={{...styles.th, width: '80px'}}>조회/판매</th>
                                    <th style={{...styles.th, width: '90px'}}>등록일</th>
                                    <th style={{...styles.th, width: '150px'}}>작업</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentProducts.map(product => {
                                    const imageUrl = getProductImageUrl(product);
                                    
                                    return (
                                        <tr key={product.id} style={styles.tableRow}>
                                            <td style={styles.td}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedProducts.includes(product.id)}
                                                    onChange={() => handleSelectProduct(product.id)}
                                                    style={styles.checkbox}
                                                />
                                            </td>
                                            <td style={styles.td}>
                                                <div style={styles.thumbnail}>
                                                    {imageUrl ? (
                                                        <img 
                                                            src={imageUrl} 
                                                            alt={product.name}
                                                            style={styles.thumbnailImg}
                                                            onError={(e) => {
                                                                console.error('이미지 로딩 실패:', imageUrl);
                                                                e.target.onerror = null;
                                                                e.target.style.display = 'none';
                                                                const parent = e.target.parentElement;
                                                                if (parent) {
                                                                    parent.innerHTML = `
                                                                        <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 4px;">
                                                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="2">
                                                                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                                                                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                                                                <polyline points="21 15 16 10 5 21"></polyline>
                                                                            </svg>
                                                                            <span style="font-size: 9px; color: #94a3b8;">로딩실패</span>
                                                                        </div>
                                                                    `;
                                                                }
                                                            }}
                                                        />
                                                    ) : (
                                                        <div style={styles.noThumbnail}>
                                                            <Package size={20} color="#cbd5e1" />
                                                            <span style={{fontSize: '9px', color: '#94a3b8', marginTop: '2px'}}>이미지없음</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td style={styles.td}>
                                                <div style={styles.productNameCell}>
                                                    <div style={styles.productNameText}>{product.name}</div>
                                                    {product.brand && (
                                                        <div style={styles.productBrand}>{product.brand}</div>
                                                    )}
                                                </div>
                                            </td>
                                            <td style={styles.td}>
                                                <span style={styles.categoryTag}>
                                                    {getCategoryLabel(product.category)}
                                                </span>
                                            </td>
                                            <td style={styles.td}>
                                                <div style={styles.sellerCell}>
                                                    <User size={12} color="#64748b" />
                                                    <span style={styles.sellerName}>
                                                        {product.postedByName || '알 수 없음'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td style={styles.td}>
                                                <span style={styles.price}>{formatPrice(product.price)}원</span>
                                            </td>
                                            <td style={styles.td}>
                                                <span style={product.stock > 0 ? styles.stockAvailable : styles.stockOut}>
                                                    {product.stock || 0}
                                                </span>
                                            </td>
                                            <td style={styles.td}>
                                                {getStatusBadge(product.status || 'active')}
                                            </td>
                                            <td style={styles.td}>
                                                <div style={styles.statsCell}>
                                                    <div style={styles.statItem}>
                                                        <Eye size={12} />
                                                        {product.views || 0}
                                                    </div>
                                                    <div style={styles.statItem}>
                                                        <TrendingUp size={12} />
                                                        {product.sales || 0}
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={styles.td}>
                                                <span style={styles.dateText}>
                                                    {formatDate(product.createdAt)}
                                                </span>
                                            </td>
                                            <td style={styles.td}>
                                                <div style={styles.actionButtons}>
                                                    <button
                                                        style={{
                                                            ...styles.actionBtn,
                                                            ...(product.status === 'active' ? styles.actionBtnWarning : styles.actionBtnSuccess)
                                                        }}
                                                        onClick={() => toggleProductStatus(product.id, product.status || 'inactive')}
                                                        title={product.status === 'active' ? '판매중지' : '판매시작'}
                                                    >
                                                        {product.status === 'active' ? (
                                                            <EyeOff size={14} />
                                                        ) : (
                                                            <Eye size={14} />
                                                        )}
                                                    </button>

                                                    <button
                                                        style={{...styles.actionBtn, ...styles.actionBtnDanger}}
                                                        onClick={() => handleDelete(product.id)}
                                                        title="삭제"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* 페이지네이션 */}
                    <div style={styles.paginationContainer}>
                        <div style={styles.paginationInfo}>
                            {startIndex + 1}-{Math.min(endIndex, filteredProducts.length)} / 총 {filteredProducts.length}개
                        </div>
                        
                        {totalPages > 1 && (
                            <div style={styles.pagination}>
                                <button
                                    style={styles.pageButton}
                                    onClick={() => goToPage(currentPage - 1)}
                                    disabled={currentPage === 1}
                                >
                                    <ChevronLeft size={18} />
                                </button>

                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                                    if (
                                        page === 1 ||
                                        page === totalPages ||
                                        (page >= currentPage - 2 && page <= currentPage + 2)
                                    ) {
                                        return (
                                            <button
                                                key={page}
                                                style={{
                                                    ...styles.pageButton,
                                                    ...(page === currentPage ? styles.activePageButton : {})
                                                }}
                                                onClick={() => goToPage(page)}
                                            >
                                                {page}
                                            </button>
                                        );
                                    } else if (page === currentPage - 3 || page === currentPage + 3) {
                                        return <span key={page} style={styles.pageEllipsis}>...</span>;
                                    }
                                    return null;
                                })}

                                <button
                                    style={styles.pageButton}
                                    onClick={() => goToPage(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                >
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* 이미지 URL 목록 모달 */}
            {showImageUploadModal && (
                <div style={styles.modalOverlay} onClick={() => setShowImageUploadModal(false)}>
                    <div style={styles.imageModalContent} onClick={(e) => e.stopPropagation()}>
                        <div style={styles.imageModalHeader}>
                            <h2 style={styles.modalTitle}>업로드된 이미지 URL</h2>
                            <button onClick={downloadImageUrls} style={styles.downloadUrlButton}>
                                <Download size={18} />
                                엑셀로 다운로드
                            </button>
                        </div>
                        
                        <p style={styles.imageModalSubtitle}>
                            총 {uploadedImages.length}개의 이미지 | URL을 복사하여 엑셀에 붙여넣으세요
                        </p>

                        <div style={styles.imageList}>
                            {uploadedImages.map((img, index) => (
                                <div key={index} style={styles.imageItem}>
                                    <div style={styles.imagePreviewSmall}>
                                        <img src={img.url} alt={img.fileName} style={styles.imagePreviewImg} />
                                    </div>
                                    <div style={styles.imageInfo}>
                                        <div style={styles.imageFileName}>{img.fileName}</div>
                                        <div style={styles.imageUrl}>{img.url}</div>
                                    </div>
                                    <button onClick={() => copyToClipboard(img.url)} style={styles.copyButton}>
                                        <Copy size={16} />
                                        복사
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div style={styles.imageModalActions}>
                            <button onClick={() => setShowImageUploadModal(false)} style={styles.closeButton}>
                                닫기
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 엑셀 미리보기 모달 */}
            {showExcelModal && (
                <div style={styles.modalOverlay} onClick={() => setShowExcelModal(false)}>
                    <div style={styles.excelModalContent} onClick={(e) => e.stopPropagation()}>
                        <h2 style={styles.excelModalTitle}>엑셀 데이터 미리보기</h2>
                        <p style={styles.modalSubtitle}>
                            총 {excelPreview.length}개 상품 | 
                            유효: <span style={{ color: '#10b981' }}>{excelPreview.filter(p => p.isValid).length}</span> | 
                            오류: <span style={{ color: '#ef4444' }}>{excelPreview.filter(p => !p.isValid).length}</span>
                        </p>

                        <div style={styles.previewTable}>
                            <table style={styles.table}>
                                <thead>
                                    <tr>
                                        <th style={styles.th}>번호</th>
                                        <th style={styles.th}>상태</th>
                                        <th style={styles.th}>상품명</th>
                                        <th style={styles.th}>카테고리</th>
                                        <th style={styles.th}>판매가</th>
                                        <th style={styles.th}>재고</th>
                                        <th style={styles.th}>오류</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {excelPreview.map((product, idx) => (
                                        <tr key={idx} style={product.isValid ? {} : styles.errorRow}>
                                            <td style={styles.td}>{product.index}</td>
                                            <td style={styles.td}>
                                                {product.isValid ? (
                                                    <CheckCircle size={18} color="#10b981" />
                                                ) : (
                                                    <XCircle size={18} color="#ef4444" />
                                                )}
                                            </td>
                                            <td style={styles.td}>{product.name}</td>
                                            <td style={styles.td}>{getCategoryLabel(product.category)}</td>
                                            <td style={styles.td}>{product.price.toLocaleString()}원</td>
                                            <td style={styles.td}>{product.stock || '-'}</td>
                                            <td style={styles.td}>
                                                {product.errors.length > 0 ? (
                                                    <span style={styles.errorText}>
                                                        {product.errors.join(', ')}
                                                    </span>
                                                ) : (
                                                    '-'
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div style={styles.excelModalActions}>
                            <button
                                onClick={() => {
                                    setShowExcelModal(false);
                                    setExcelData([]);
                                    setExcelPreview([]);
                                }}
                                style={styles.cancelButton}
                            >
                                취소
                            </button>
                            <button
                                onClick={handleBulkUpload}
                                style={styles.submitButton}
                                disabled={uploadingBulk || excelPreview.filter(p => p.isValid).length === 0}
                            >
                                {uploadingBulk ? '업로드 중...' : `${excelPreview.filter(p => p.isValid).length}개 상품 등록`}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}

const styles = {
    container: {
        padding: '24px',
        maxWidth: '1600px',
        margin: '0 auto',
        backgroundColor: '#f8fafc',
    },
    loading: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
        gap: '16px',
    },
    spinner: {
        width: '40px',
        height: '40px',
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
        padding: '20px',
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        flexWrap: 'wrap',
        gap: '16px',
    },
    headerLeft: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
    },
    title: {
        fontSize: '24px',
        fontWeight: '700',
        color: '#1e293b',
        margin: 0,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
    },
    adminBadge: {
        padding: '4px 12px',
        fontSize: '13px',
        fontWeight: '600',
        backgroundColor: '#ef4444',
        color: 'white',
        borderRadius: '6px',
    },
    subtitle: {
        fontSize: '13px',
        color: '#64748b',
        margin: '4px 0 0 0',
    },
    headerButtons: {
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap',
    },
    templateButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 16px',
        backgroundColor: 'white',
        color: '#10b981',
        border: '2px solid #10b981',
        borderRadius: '8px',
        fontSize: '13px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    imageUploadButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 16px',
        backgroundColor: '#f59e0b',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '13px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    excelUploadButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 16px',
        backgroundColor: '#10b981',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '13px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    refreshButton: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '36px',
        height: '36px',
        backgroundColor: 'white',
        color: '#64748b',
        border: '2px solid #e2e8f0',
        borderRadius: '8px',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    bulkActionsBar: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 20px',
        marginBottom: '16px',
        backgroundColor: '#eef2ff',
        borderRadius: '10px',
        border: '2px solid #c7d2fe',
    },
    bulkActionsText: {
        fontSize: '14px',
        fontWeight: '600',
        color: '#6366f1',
    },
    bulkActions: {
        display: 'flex',
        gap: '8px',
    },
    bulkActionButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '6px 12px',
        fontSize: '13px',
        fontWeight: '600',
        color: '#6366f1',
        backgroundColor: 'white',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    bulkDeleteButton: {
        color: '#ef4444',
    },
    bulkCancelButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '6px 12px',
        fontSize: '13px',
        fontWeight: '600',
        color: '#64748b',
        backgroundColor: 'white',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
    },
    filterSection: {
        marginBottom: '16px',
        padding: '16px',
        backgroundColor: 'white',
        borderRadius: '10px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    },
    filterRow: {
        display: 'flex',
        gap: '12px',
        flexWrap: 'wrap',
        alignItems: 'center',
    },
    searchBox: {
        flex: 1,
        minWidth: '200px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '0 12px',
        backgroundColor: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        height: '36px',
    },
    searchInput: {
        flex: 1,
        border: 'none',
        outline: 'none',
        fontSize: '13px',
        backgroundColor: 'transparent',
    },
    select: {
        padding: '8px 12px',
        fontSize: '13px',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        backgroundColor: 'white',
        cursor: 'pointer',
        outline: 'none',
        height: '36px',
    },
    tableContainer: {
        backgroundColor: 'white',
        borderRadius: '10px',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '13px',
    },
    tableHeader: {
        backgroundColor: '#f8fafc',
        borderBottom: '2px solid #e2e8f0',
    },
    th: {
        padding: '12px',
        textAlign: 'left',
        fontWeight: '600',
        color: '#475569',
        whiteSpace: 'nowrap',
    },
    tableRow: {
        borderBottom: '1px solid #f1f5f9',
        transition: 'background-color 0.2s',
    },
    td: {
        padding: '12px',
        verticalAlign: 'middle',
    },
    checkbox: {
        width: '16px',
        height: '16px',
        cursor: 'pointer',
        accentColor: '#6366f1',
    },
    thumbnail: {
        width: '50px',
        height: '50px',
        borderRadius: '6px',
        overflow: 'hidden',
        backgroundColor: '#f8fafc',
        border: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    thumbnailImg: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
    },
    noThumbnail: {
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '2px',
    },
    productNameCell: {
        maxWidth: '300px',
    },
    productNameText: {
        fontWeight: '600',
        color: '#1e293b',
        marginBottom: '2px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
    productBrand: {
        fontSize: '11px',
        color: '#94a3b8',
    },
    categoryTag: {
        display: 'inline-block',
        padding: '4px 8px',
        fontSize: '11px',
        fontWeight: '600',
        color: '#6366f1',
        backgroundColor: '#eef2ff',
        borderRadius: '4px',
        whiteSpace: 'nowrap',
    },
    sellerCell: {
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
    },
    sellerName: {
        fontSize: '12px',
        color: '#475569',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
    price: {
        fontWeight: '700',
        color: '#1e293b',
        whiteSpace: 'nowrap',
    },
    stockAvailable: {
        color: '#059669',
        fontWeight: '600',
    },
    stockOut: {
        color: '#dc2626',
        fontWeight: '600',
    },
    statsCell: {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
    },
    statItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '11px',
        color: '#64748b',
    },
    dateText: {
        fontSize: '12px',
        color: '#64748b',
    },
    actionButtons: {
        display: 'flex',
        gap: '4px',
    },
    actionBtn: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '32px',
        height: '32px',
        backgroundColor: '#f8fafc',
        color: '#6366f1',
        border: '1px solid #e2e8f0',
        borderRadius: '6px',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    actionBtnSuccess: {
        color: '#10b981',
    },
    actionBtnWarning: {
        color: '#f59e0b',
    },
    actionBtnDanger: {
        color: '#ef4444',
    },
    paginationContainer: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: '20px',
        padding: '16px 20px',
        backgroundColor: 'white',
        borderRadius: '10px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    },
    paginationInfo: {
        fontSize: '13px',
        color: '#64748b',
        fontWeight: '500',
    },
    pagination: {
        display: 'flex',
        gap: '4px',
    },
    pageButton: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: '32px',
        height: '32px',
        padding: '0 8px',
        fontSize: '13px',
        fontWeight: '600',
        color: '#64748b',
        backgroundColor: 'white',
        border: '1px solid #e2e8f0',
        borderRadius: '6px',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    activePageButton: {
        color: 'white',
        backgroundColor: '#6366f1',
        borderColor: '#6366f1',
    },
    pageEllipsis: {
        padding: '0 8px',
        color: '#94a3b8',
        display: 'flex',
        alignItems: 'center',
    },
    emptyState: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px 24px',
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    },
    emptyTitle: {
        margin: '20px 0 8px',
        fontSize: '20px',
        fontWeight: '700',
        color: '#1e293b',
    },
    emptyText: {
        margin: 0,
        fontSize: '14px',
        color: '#64748b',
    },
    // 모달 스타일
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
    imageModalContent: {
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        maxWidth: '900px',
        width: '100%',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
    },
    imageModalHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '24px',
        borderBottom: '1px solid #e2e8f0',
    },
    modalTitle: {
        margin: 0,
        fontSize: '20px',
        fontWeight: '700',
        color: '#0f172a',
    },
    downloadUrlButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 16px',
        backgroundColor: '#10b981',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '13px',
        fontWeight: '600',
        cursor: 'pointer',
    },
    imageModalSubtitle: {
        margin: '0',
        padding: '12px 24px',
        fontSize: '13px',
        color: '#64748b',
        backgroundColor: '#f8fafc',
    },
    imageList: {
        flex: 1,
        overflow: 'auto',
        padding: '16px 24px',
    },
    imageItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px',
        backgroundColor: '#f8fafc',
        borderRadius: '8px',
        marginBottom: '8px',
    },
    imagePreviewSmall: {
        width: '60px',
        height: '60px',
        borderRadius: '6px',
        overflow: 'hidden',
        backgroundColor: '#e2e8f0',
        flexShrink: 0,
    },
    imagePreviewImg: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
    },
    imageInfo: {
        flex: 1,
        minWidth: 0,
    },
    imageFileName: {
        fontSize: '13px',
        fontWeight: '600',
        color: '#1e293b',
        marginBottom: '4px',
    },
    imageUrl: {
        fontSize: '11px',
        color: '#64748b',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
    copyButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '6px 12px',
        backgroundColor: '#6366f1',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        fontSize: '12px',
        fontWeight: '600',
        cursor: 'pointer',
        flexShrink: 0,
    },
    imageModalActions: {
        padding: '16px 24px',
        borderTop: '1px solid #e2e8f0',
        display: 'flex',
        justifyContent: 'center',
    },
    closeButton: {
        padding: '8px 24px',
        backgroundColor: '#f1f5f9',
        color: '#64748b',
        border: 'none',
        borderRadius: '8px',
        fontSize: '13px',
        fontWeight: '600',
        cursor: 'pointer',
    },
    excelModalContent: {
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        maxWidth: '1200px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
    },
    excelModalTitle: {
        margin: '0 0 8px 0',
        fontSize: '20px',
        fontWeight: '700',
        color: '#0f172a',
        padding: '24px 24px 0',
    },
    modalSubtitle: {
        margin: '0 0 16px 0',
        fontSize: '13px',
        color: '#64748b',
        padding: '0 24px',
    },
    previewTable: {
        flex: 1,
        overflow: 'auto',
        padding: '0 24px',
    },
    errorRow: {
        backgroundColor: '#fef2f2',
    },
    errorText: {
        color: '#dc2626',
        fontSize: '11px',
    },
    excelModalActions: {
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '8px',
        padding: '16px 24px',
        borderTop: '1px solid #e2e8f0',
    },
    cancelButton: {
        padding: '8px 20px',
        backgroundColor: '#f1f5f9',
        color: '#64748b',
        border: 'none',
        borderRadius: '8px',
        fontSize: '13px',
        fontWeight: '600',
        cursor: 'pointer',
    },
    submitButton: {
        padding: '8px 20px',
        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '13px',
        fontWeight: '600',
        cursor: 'pointer',
    },
};

export default MarketplaceProductManagement;