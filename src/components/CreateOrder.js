import React, { useState, useEffect } from 'react';
import { collection, addDoc, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '../firebase/config';
import { X, Upload, Trash2, Check, Link, Calendar, Building2, Circle, FileText, Plus, Zap, Stethoscope } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createNotification } from '../services/NotificationSystem';

function CreateOrder() {
    const navigate = useNavigate();
    const [patientName, setPatientName] = useState('');
    const [patientGender, setPatientGender] = useState('');
    const [patientAge, setPatientAge] = useState('');
    const [selectedPartnerId, setSelectedPartnerId] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [specialNotes, setSpecialNotes] = useState('');
    const [partners, setPartners] = useState([]);

    // 조건 상태
    const [conditions, setConditions] = useState({
        prosthesis: '',
        material: ''
    });

    const [teethDetails, setTeethDetails] = useState({});
    const [selectedTeeth, setSelectedTeeth] = useState([]);
    const [prosthesisGroups, setProsthesisGroups] = useState([]);
    const [bridgeGroups, setBridgeGroups] = useState([]);
    const [ponticGroups, setPonticGroups] = useState([]);
    const [implantGroups, setImplantGroups] = useState([]);
    const [prosthesisMode, setProsthesisMode] = useState(false);
    const [bridgeMode, setBridgeMode] = useState(false);
    const [ponticMode, setPonticMode] = useState(false);
    const [implantMode, setImplantMode] = useState(false);
    const [tempProsthesisTeeth, setTempProsthesisTeeth] = useState([]);
    const [tempBridgeTeeth, setTempBridgeTeeth] = useState([]);
    const [tempPonticTeeth, setTempPonticTeeth] = useState([]);
    const [tempImplantTeeth, setTempImplantTeeth] = useState([]);
    const [selectedImplantBrand, setSelectedImplantBrand] = useState('');

    // 모달 상태
    const [showShadeModal, setShowShadeModal] = useState(false);
    const [showProsthesisModal, setShowProsthesisModal] = useState(false);
    const [showImplantModal, setShowImplantModal] = useState(false);

    // Shade 관련 상태
    const [shadeType, setShadeType] = useState('');
    const [selectedShade, setSelectedShade] = useState('');

    // 단축어 관련 상태
    const [savedPhrases, setSavedPhrases] = useState([]);
    const [showPhrasesModal, setShowPhrasesModal] = useState(false);
    const [newPhrase, setNewPhrase] = useState('');

    // 리메이크 관련 상태
    const [isRemake, setIsRemake] = useState(false);
    const [remakeReason, setRemakeReason] = useState('');

    const [images, setImages] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [imagePreviewUrls, setImagePreviewUrls] = useState([]);

    // 보철물 옵션들
    const prosthesisOptions = [
        'Inlay',
        'Crown',
        'POST',
        'Denture',
        '교정',
        '장치'
    ];

    // 보철물별 재료 매핑
    const prosthesisMaterialMap = {
        'Inlay': ['레진', '골드', '세라믹', '지르코니아', '하이브리드레진', '기타'],
        'Crown': ['지르코니아', 'PFM', 'PFZ', '메탈', '골드', '세라믹', '기타'],
        'POST': ['메탈', '지르코니아', '기타'],
        'Denture': ['CDO', 'RPD', 'VALPLAST', 'Temp Denture', 'Wire Temporary', '기타'],
        '교정': ['교정장치', '유지장치', '기타'],
        '장치': ['마우스가드', '이갈이장치', '기타']
    };

    // 임플란트 옵션
    const implantOptions = [
        '오스템',
        '네오',
        '덴티스',
        '덴티움',
        '스트라우만',
        '디오',
        '기타',
        '없음'
    ];

    // Vita Shade Guide 옵션들
    const shadeOptions = {
        classic: [
            'A1', 'A2', 'A3', 'A3.5', 'A4',
            'B1', 'B2', 'B3', 'B4',
            'C1', 'C2', 'C3', 'C4',
            'D2', 'D3', 'D4'
        ],
        '3d-master': [
            '0M1', '0M2', '0M3',
            '1M1', '1M2',
            '2L1.5', '2L2.5', '2M1', '2M2', '2M3', '2R1.5', '2R2.5',
            '3L1.5', '3L2.5', '3M1', '3M2', '3M3', '3R1.5', '3R2.5',
            '4L1.5', '4L2.5', '4M1', '4M2', '4M3', '4R1.5', '4R2.5',
            '5M1', '5M2', '5M3'
        ]
    };

    const upperRightTeeth = [18, 17, 16, 15, 14, 13, 12, 11];
    const upperLeftTeeth = [21, 22, 23, 24, 25, 26, 27, 28];
    const lowerRightTeeth = [48, 47, 46, 45, 44, 43, 42, 41];
    const lowerLeftTeeth = [31, 32, 33, 34, 35, 36, 37, 38];

    useEffect(() => {
        console.log('\n====== 🔥 CreateOrder Firebase 진단 시작 ======');
        console.log('1. Firebase DB 객체:', db);
        console.log('2. Firebase Auth 객체:', auth);
        console.log('3. 현재 로그인 사용자:', auth.currentUser);

        if (!auth.currentUser) {
            console.error('❌ 로그인되지 않았습니다!');
            alert('⚠️ 로그인이 필요합니다!');
        } else {
            console.log('✅ 로그인 확인:', {
                uid: auth.currentUser.uid,
                email: auth.currentUser.email
            });

            const testRead = async () => {
                console.log('\n====== 📖 Firestore 읽기 테스트 (connections) ======');
                try {
                    const connectionsRef = collection(db, 'connections');
                    console.log('4. Collection Reference:', connectionsRef);

                    const testQuery = query(connectionsRef, where('requesterId', '==', auth.currentUser.uid));
                    const snapshot = await getDocs(testQuery);

                    console.log('✅ connections 읽기 성공!');
                    console.log('5. 문서 개수:', snapshot.size);

                    if (snapshot.size > 0) {
                        snapshot.forEach((doc) => {
                            console.log(`문서 ID: ${doc.id}`, doc.data());
                        });
                    } else {
                        console.warn('⚠️ connections 컬렉션에 데이터가 없습니다!');
                        console.log('💡 거래처를 먼저 추가해야 의뢰서를 작성할 수 있습니다.');
                    }
                } catch (error) {
                    console.error('❌ connections 읽기 실패!');
                    console.error('에러 코드:', error.code);
                    console.error('에러 메시지:', error.message);
                    console.error('전체 에러:', error);

                    if (error.code === 'permission-denied') {
                        console.error('🔴 권한 문제! Firestore Rules를 확인하세요!');
                        alert('❌ 데이터 읽기 권한이 없습니다!\n\nFirebase Console → Firestore → Rules 확인 필요\nallow read, write: if request.auth != null;');
                    }
                }
            };

            testRead();
        }
        console.log('====== 🔥 Firebase 진단 끝 ======\n');
    }, []);

    useEffect(() => {
        const fetchPartners = async () => {
            if (!auth.currentUser) {
                console.log('로그인되지 않음');
                return;
            }

            try {
                const currentUserId = auth.currentUser.uid;
                const currentUserDoc = await getDoc(doc(db, 'users', currentUserId));
                const currentUserData = currentUserDoc.data();

                let searchUserId = currentUserId;
                if (currentUserData.userType === 'staff' && currentUserData.companyId) {
                    searchUserId = currentUserData.companyId;
                    console.log('✅ 직원의 회사 ID로 거래처 검색:', searchUserId);
                }

                const sentQuery = query(
                    collection(db, 'connections'),
                    where('requesterId', '==', searchUserId),
                    where('status', '==', 'accepted')
                );
                const sentSnapshot = await getDocs(sentQuery);

                const receivedQuery = query(
                    collection(db, 'connections'),
                    where('receiverId', '==', searchUserId),
                    where('status', '==', 'accepted')
                );
                const receivedSnapshot = await getDocs(receivedQuery);

                const partnersList = [];
                const addedIds = new Set();

                for (const docSnap of sentSnapshot.docs) {
                    const data = docSnap.data();
                    const partnerId = data.receiverId;
                    if (!addedIds.has(partnerId)) {
                        const partnerDoc = await getDoc(doc(db, 'users', partnerId));
                        if (partnerDoc.exists()) {
                            const partnerData = partnerDoc.data();
                            partnersList.push({
                                id: partnerId,
                                name: partnerData.businessName || partnerData.companyName || partnerData.name || partnerData.email,
                                type: partnerData.userType
                            });
                            addedIds.add(partnerId);
                        }
                    }
                }

                for (const docSnap of receivedSnapshot.docs) {
                    const data = docSnap.data();
                    const partnerId = data.requesterId;
                    if (!addedIds.has(partnerId)) {
                        const partnerDoc = await getDoc(doc(db, 'users', partnerId));
                        if (partnerDoc.exists()) {
                            const partnerData = partnerDoc.data();
                            partnersList.push({
                                id: partnerId,
                                name: partnerData.businessName || partnerData.companyName || partnerData.name || partnerData.email,
                                type: partnerData.userType
                            });
                            addedIds.add(partnerId);
                        }
                    }
                }

                console.log('거래처 목록:', partnersList);
                setPartners(partnersList);
            } catch (error) {
                console.error('거래처 불러오기 에러:', error);
            }
        };

        fetchPartners();
    }, []);

    useEffect(() => {
        const loadSavedPhrases = async () => {
            if (!auth.currentUser) return;

            try {
                const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    setSavedPhrases(userData.savedPhrases || []);
                }
            } catch (error) {
                console.error('단축어 불러오기 실패:', error);
            }
        };

        loadSavedPhrases();
    }, []);

    const handleToothClick = (tooth) => {
        if (prosthesisMode) {
            if (tempProsthesisTeeth.includes(tooth)) {
                setTempProsthesisTeeth(tempProsthesisTeeth.filter(t => t !== tooth));
                setSelectedTeeth(selectedTeeth.filter(t => t !== tooth));
                const newDetails = { ...teethDetails };
                delete newDetails[tooth];
                setTeethDetails(newDetails);
            } else {
                setTempProsthesisTeeth([...tempProsthesisTeeth, tooth]);
                setSelectedTeeth([...selectedTeeth, tooth]);
                setTeethDetails({
                    ...teethDetails,
                    [tooth]: {
                        prosthesis: conditions.prosthesis,
                        material: conditions.material,
                        implant: '',
                        shade: selectedShade,
                        shadeType: shadeType,
                        isPontic: false
                    }
                });
            }
        }
        else if (bridgeMode) {
            if (tempBridgeTeeth.includes(tooth)) {
                setTempBridgeTeeth(tempBridgeTeeth.filter(t => t !== tooth));
                setSelectedTeeth(selectedTeeth.filter(t => t !== tooth));
                const newDetails = { ...teethDetails };
                delete newDetails[tooth];
                setTeethDetails(newDetails);
            } else {
                setTempBridgeTeeth([...tempBridgeTeeth, tooth]);
                setSelectedTeeth([...selectedTeeth, tooth]);
                setTeethDetails({
                    ...teethDetails,
                    [tooth]: {
                        prosthesis: conditions.prosthesis,
                        material: conditions.material,
                        implant: '',
                        shade: selectedShade,
                        shadeType: shadeType,
                        isPontic: false
                    }
                });
            }
        }
        else if (ponticMode) {
            if (tempPonticTeeth.includes(tooth)) {
                setTempPonticTeeth(tempPonticTeeth.filter(t => t !== tooth));
                setSelectedTeeth(selectedTeeth.filter(t => t !== tooth));
                const newDetails = { ...teethDetails };
                delete newDetails[tooth];
                setTeethDetails(newDetails);
            } else {
                setTempPonticTeeth([...tempPonticTeeth, tooth]);
                setSelectedTeeth([...selectedTeeth, tooth]);
                setTeethDetails({
                    ...teethDetails,
                    [tooth]: {
                        prosthesis: conditions.prosthesis,
                        material: conditions.material,
                        implant: '',
                        shade: selectedShade,
                        shadeType: shadeType,
                        isPontic: true
                    }
                });
            }
        }
        else if (implantMode) {
            if (tempImplantTeeth.includes(tooth)) {
                setTempImplantTeeth(tempImplantTeeth.filter(t => t !== tooth));
                setSelectedTeeth(selectedTeeth.filter(t => t !== tooth));
                const newDetails = { ...teethDetails };
                delete newDetails[tooth];
                setTeethDetails(newDetails);
            } else {
                setTempImplantTeeth([...tempImplantTeeth, tooth]);
                setSelectedTeeth([...selectedTeeth, tooth]);
                setTeethDetails({
                    ...teethDetails,
                    [tooth]: {
                        prosthesis: conditions.prosthesis,
                        material: conditions.material,
                        implant: selectedImplantBrand,
                        shade: selectedShade,
                        shadeType: shadeType,
                        isPontic: false
                    }
                });
            }
        }
        else {
            if (selectedTeeth.includes(tooth)) {
                setSelectedTeeth(selectedTeeth.filter(t => t !== tooth));
                const newDetails = { ...teethDetails };
                delete newDetails[tooth];
                setTeethDetails(newDetails);
            } else {
                setSelectedTeeth([...selectedTeeth, tooth]);
                setTeethDetails({
                    ...teethDetails,
                    [tooth]: {
                        prosthesis: conditions.prosthesis,
                        material: conditions.material,
                        implant: '',
                        shade: selectedShade,
                        shadeType: shadeType,
                        isPontic: false
                    }
                });
            }
        }
    };

    const confirmBridge = () => {
        if (tempBridgeTeeth.length >= 2) {
            const sortedTeeth = [...tempBridgeTeeth].sort((a, b) => a - b);
            setBridgeGroups([...bridgeGroups, sortedTeeth]);
            setTempBridgeTeeth([]);
            setBridgeMode(false);
        } else {
            alert('브릿지는 최소 2개 이상의 치아를 선택해야 합니다.');
        }
    };

    const cancelBridge = () => {
        tempBridgeTeeth.forEach(tooth => {
            setSelectedTeeth(selectedTeeth.filter(t => t !== tooth));
            const newDetails = { ...teethDetails };
            delete newDetails[tooth];
            setTeethDetails(newDetails);
        });
        setTempBridgeTeeth([]);
        setBridgeMode(false);
    };

    const confirmProsthesis = () => {
        if (tempProsthesisTeeth.length >= 1) {
            if (!conditions.prosthesis || !conditions.material) {
                alert('보철물과 재료를 모두 선택해주세요.');
                return;
            }
            const sortedTeeth = [...tempProsthesisTeeth].sort((a, b) => a - b);
            setProsthesisGroups([...prosthesisGroups, { 
                teeth: sortedTeeth, 
                prosthesis: conditions.prosthesis, 
                material: conditions.material 
            }]);
            setTempProsthesisTeeth([]);
            setProsthesisMode(false);
        } else {
            alert('보철물을 적용할 치아를 하나 이상 선택해주세요.');
        }
    };

    const cancelProsthesis = () => {
        tempProsthesisTeeth.forEach(tooth => {
            setSelectedTeeth(selectedTeeth.filter(t => t !== tooth));
            const newDetails = { ...teethDetails };
            delete newDetails[tooth];
            setTeethDetails(newDetails);
        });
        setTempProsthesisTeeth([]);
        setProsthesisMode(false);
    };

    const removeProsthesisGroup = (index) => {
        const groupToRemove = prosthesisGroups[index].teeth;
        groupToRemove.forEach(tooth => {
            setSelectedTeeth(selectedTeeth.filter(t => t !== tooth));
            const newDetails = { ...teethDetails };
            delete newDetails[tooth];
            setTeethDetails(newDetails);
        });
        setProsthesisGroups(prosthesisGroups.filter((_, i) => i !== index));
    };

    const confirmPontic = () => {
        if (tempPonticTeeth.length >= 1) {
            const sortedTeeth = [...tempPonticTeeth].sort((a, b) => a - b);
            setPonticGroups([...ponticGroups, sortedTeeth]);
            setTempPonticTeeth([]);
            setPonticMode(false);
        } else {
            alert('폰틱을 하나 이상 선택해주세요.');
        }
    };

    const cancelPontic = () => {
        tempPonticTeeth.forEach(tooth => {
            setSelectedTeeth(selectedTeeth.filter(t => t !== tooth));
            const newDetails = { ...teethDetails };
            delete newDetails[tooth];
            setTeethDetails(newDetails);
        });
        setTempPonticTeeth([]);
        setPonticMode(false);
    };

    const confirmImplant = () => {
        if (tempImplantTeeth.length >= 1) {
            if (!selectedImplantBrand) {
                alert('임플란트 브랜드를 선택해주세요.');
                return;
            }
            const sortedTeeth = [...tempImplantTeeth].sort((a, b) => a - b);
            setImplantGroups([...implantGroups, { teeth: sortedTeeth, brand: selectedImplantBrand }]);
            setTempImplantTeeth([]);
            setImplantMode(false);
        } else {
            alert('임플란트를 적용할 치아를 하나 이상 선택해주세요.');
        }
    };

    const cancelImplant = () => {
        tempImplantTeeth.forEach(tooth => {
            setSelectedTeeth(selectedTeeth.filter(t => t !== tooth));
            const newDetails = { ...teethDetails };
            delete newDetails[tooth];
            setTeethDetails(newDetails);
        });
        setTempImplantTeeth([]);
        setImplantMode(false);
    };

    const removeBridgeGroup = (index) => {
        const groupToRemove = bridgeGroups[index];
        groupToRemove.forEach(tooth => {
            setSelectedTeeth(selectedTeeth.filter(t => t !== tooth));
            const newDetails = { ...teethDetails };
            delete newDetails[tooth];
            setTeethDetails(newDetails);
        });
        setBridgeGroups(bridgeGroups.filter((_, i) => i !== index));
    };

    const removePonticGroup = (index) => {
        const groupToRemove = ponticGroups[index];
        groupToRemove.forEach(tooth => {
            setSelectedTeeth(selectedTeeth.filter(t => t !== tooth));
            const newDetails = { ...teethDetails };
            delete newDetails[tooth];
            setTeethDetails(newDetails);
        });
        setPonticGroups(ponticGroups.filter((_, i) => i !== index));
    };

    const removeImplantGroup = (index) => {
        const groupToRemove = implantGroups[index].teeth;
        groupToRemove.forEach(tooth => {
            setSelectedTeeth(selectedTeeth.filter(t => t !== tooth));
            const newDetails = { ...teethDetails };
            delete newDetails[tooth];
            setTeethDetails(newDetails);
        });
        setImplantGroups(implantGroups.filter((_, i) => i !== index));
    };

    const handleImageSelect = async (e) => {
        const files = Array.from(e.target.files);
        const newImages = [...images, ...files];
        setImages(newImages);

        const newPreviewUrls = await Promise.all(
            files.map(file => {
                return new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.readAsDataURL(file);
                });
            })
        );
        setImagePreviewUrls([...imagePreviewUrls, ...newPreviewUrls]);
    };

    const removeImage = (index) => {
        setImages(images.filter((_, i) => i !== index));
        setImagePreviewUrls(imagePreviewUrls.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!patientName || !selectedPartnerId || !dueDate) {
            alert('필수 항목을 모두 입력해주세요.\n- 환자명\n- 발송처\n- 완료 예정일');
            return;
        }

        if (selectedTeeth.length === 0) {
            alert('치아를 하나 이상 선택해주세요.');
            return;
        }

        if (isRemake && !remakeReason.trim()) {
            alert('리메이크 사유를 입력해주세요.');
            return;
        }

        try {
            setUploading(true);
            console.log('주문 생성 시작...');

            const currentUserId = auth.currentUser.uid;
            const currentUserDoc = await getDoc(doc(db, 'users', currentUserId));
            const currentUserData = currentUserDoc.data();

            let orderFromUserId = currentUserId;
            let fromUserName = currentUserData.businessName || currentUserData.companyName || currentUserData.name || currentUserData.email;

            if (currentUserData.userType === 'staff' && currentUserData.companyId) {
                orderFromUserId = currentUserData.companyId;
                console.log('✅ 직원이 회사 대신 의뢰서 작성:', orderFromUserId);
                
                const companyDoc = await getDoc(doc(db, 'users', orderFromUserId));
                if (companyDoc.exists()) {
                    fromUserName = companyDoc.data().businessName || companyDoc.data().companyName || companyDoc.data().name || companyDoc.data().email;
                }
            }

            const partnerDoc = await getDoc(doc(db, 'users', selectedPartnerId));
            let toUserName = '알 수 없음';
            if (partnerDoc.exists()) {
                const partnerData = partnerDoc.data();
                toUserName = partnerData.businessName || partnerData.companyName || partnerData.name || partnerData.email;
            }

            const today = new Date();
            const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
            const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
            const orderNumber = `${dateStr}-${randomStr}`;

            const imageUrls = [];
            if (images.length > 0) {
                console.log('이미지 업로드 중...', images.length, '개');
                for (const image of images) {
                    try {
                        const storageRef = ref(storage, `workOrders/${Date.now()}_${image.name}`);
                        await uploadBytes(storageRef, image);
                        const url = await getDownloadURL(storageRef);
                        imageUrls.push(url);
                        console.log('이미지 업로드 성공:', url);
                    } catch (imgError) {
                        console.error('이미지 업로드 실패:', imgError);
                    }
                }
            }

            const items = Object.entries(teethDetails).map(([tooth, details]) => ({
                toothNumber: parseInt(tooth),
                prosthesis: details.prosthesis || '',
                material: details.material || '',
                implant: details.implant || '',
                shade: details.shade || '',
                shadeType: details.shadeType || '',
                isPontic: details.isPontic || false
            }));

            console.log('Items:', items);

            const orderData = {
                orderNumber: orderNumber,
                fromUserId: orderFromUserId,
                fromUserName: fromUserName,
                toUserId: selectedPartnerId,
                toUserName: toUserName,
                patientName: patientName.trim(),
                patientGender: patientGender || '',
                patientAge: patientAge ? parseInt(patientAge) : null,
                dueDate: dueDate,
                items: items,
                prosthesisGroups: prosthesisGroups || [],
                bridgeGroups: bridgeGroups.map(group => ({ teeth: group })) || [],
                ponticGroups: ponticGroups.map(group => ({ teeth: group })) || [],
                implantGroups: implantGroups || [],
                specialNotes: specialNotes.trim(),
                imageUrls: imageUrls,
                isRemake: isRemake,
                remakeReason: isRemake ? remakeReason.trim() : '',
                status: 'pending',
                createdAt: new Date(),
                updatedAt: new Date()
            };

            console.log('✅ 완벽한 orderData:', orderData);

            const docRef = await addDoc(collection(db, 'workOrders'), orderData);
            console.log('주문 생성 성공! 문서 ID:', docRef.id);

            try {
                await createNotification({
                    userId: selectedPartnerId,
                    type: 'order_new',
                    title: '새로운 주문이 도착했습니다',
                    message: `${fromUserName}님으로부터 새로운 주문이 접수되었습니다.\n환자명: ${patientName.trim()}\n주문번호: ${orderNumber}`,
                    orderId: docRef.id,
                    orderNumber: orderNumber
                });
                console.log('✅ 알림 전송 성공');
            } catch (notificationError) {
                console.error('⚠️ 알림 전송 실패 (주문은 성공):', notificationError);
            }

            alert(`주문이 성공적으로 생성되었습니다! ✅\n주문번호: ${orderNumber}`);

            navigate('/orders');
        } catch (error) {
            console.error('주문 생성 중 에러 발생:', error);
            console.error('에러 메시지:', error.message);
            console.error('에러 코드:', error.code);

            let errorMessage = '주문 생성에 실패했습니다.\n\n';

            if (error.code === 'permission-denied') {
                errorMessage += '권한이 없습니다. Firebase 규칙을 확인해주세요.';
            } else if (error.code === 'unavailable') {
                errorMessage += '네트워크 연결을 확인해주세요.';
            } else {
                errorMessage += `에러: ${error.message}`;
            }

            alert(errorMessage);
        } finally {
            setUploading(false);
        }
    };

    const getAvailableMaterials = () => {
        if (!conditions.prosthesis) return [];
        return prosthesisMaterialMap[conditions.prosthesis] || [];
    };

    const getToothGroupType = (tooth) => {
        if (prosthesisMode && tempProsthesisTeeth.includes(tooth)) return 'prosthesis-temp';
        if (bridgeMode && tempBridgeTeeth.includes(tooth)) return 'bridge-temp';
        if (ponticMode && tempPonticTeeth.includes(tooth)) return 'pontic-temp';
        if (implantMode && tempImplantTeeth.includes(tooth)) return 'implant-temp';

        const isInImplant = implantGroups.some(group => group.teeth.includes(tooth));
        if (isInImplant) return 'implant';

        const isInBridge = bridgeGroups.some(group => group.includes(tooth));
        if (isInBridge) return 'bridge';

        const isInPontic = ponticGroups.some(group => group.includes(tooth));
        if (isInPontic) return 'pontic';

        const isInProsthesis = prosthesisGroups.some(group => group.teeth.includes(tooth));
        if (isInProsthesis) return 'prosthesis';

        return null;
    };

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h1 style={styles.title}>새 작업 의뢰</h1>
                <p style={styles.subtitle}>치과 보철물 작업 의뢰서를 작성합니다</p>
            </div>

            <form onSubmit={handleSubmit} style={styles.form}>
                {/* 의뢰 정보 - 6개 입력 필드 */}
                <div style={styles.section}>
                    <h2 style={styles.sectionTitle}>의뢰 정보</h2>

                    {/* 첫 번째 줄: 환자명, 성별, 나이 */}
                    <div style={styles.threeColumnRow}>
                        <div style={styles.inputGroup}>
                            <label style={styles.label}>
                                환자명 <span style={styles.required}>*</span>
                            </label>
                            <input
                                type="text"
                                value={patientName}
                                onChange={(e) => setPatientName(e.target.value)}
                                placeholder="환자 이름"
                                style={styles.input}
                                required
                            />
                        </div>

                        <div style={styles.inputGroup}>
                            <label style={styles.label}>성별</label>
                            <select
                                value={patientGender}
                                onChange={(e) => setPatientGender(e.target.value)}
                                style={styles.select}
                            >
                                <option value="">선택 안함</option>
                                <option value="남">남</option>
                                <option value="여">여</option>
                            </select>
                        </div>

                        <div style={styles.inputGroup}>
                            <label style={styles.label}>나이</label>
                            <input
                                type="number"
                                value={patientAge}
                                onChange={(e) => setPatientAge(e.target.value)}
                                placeholder="나이"
                                style={styles.input}
                                min="0"
                                max="150"
                            />
                        </div>
                    </div>

                    {/* 두 번째 줄: 선택, 완료예정일, 리메이크여부 */}
                    <div style={styles.threeColumnRow}>
                        <div style={styles.inputGroup}>
                            <label style={styles.label}>
                                발송처 <span style={styles.required}>*</span>
                            </label>
                            <select
                                value={selectedPartnerId}
                                onChange={(e) => setSelectedPartnerId(e.target.value)}
                                style={styles.select}
                                required
                            >
                                <option value="">거래처 선택</option>
                                {partners.map(partner => (
                                    <option key={partner.id} value={partner.id}>
                                        {partner.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div style={styles.inputGroup}>
                            <label style={styles.label} htmlFor="orderDueDate">
                                완료 예정일 <span style={styles.required}>*</span>
                            </label>
                            <input
                                id="orderDueDate"
                                type="date"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                style={styles.dateInput}
                                required
                            />
                        </div>

                        <div style={styles.inputGroup}>
                            <label style={styles.label}>리메이크 여부</label>
                            <div style={styles.checkboxWrapper}>
                                <label style={styles.checkboxLabel}>
                                    <input
                                        type="checkbox"
                                        checked={isRemake}
                                        onChange={(e) => {
                                            setIsRemake(e.target.checked);
                                            if (!e.target.checked) setRemakeReason('');
                                        }}
                                        style={styles.checkbox}
                                    />
                                    <span style={styles.checkboxText}>
                                        {isRemake ? '리메이크' : '일반'}
                                    </span>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* 리메이크 사유 입력 */}
                    {isRemake && (
                        <div style={styles.fullWidthRow}>
                            <label style={styles.label}>
                                리메이크 사유 <span style={styles.required}>*</span>
                            </label>
                            <textarea
                                value={remakeReason}
                                onChange={(e) => setRemakeReason(e.target.value)}
                                style={styles.textarea}
                                placeholder="리메이크 사유를 상세히 입력해주세요"
                                rows={3}
                            />
                        </div>
                    )}
                </div>

                {/* 치아 선택 */}
                <div style={styles.section}>
                    <div style={styles.sectionHeader}>
                        <h2 style={styles.sectionTitle}>치아 선택</h2>
                        <div style={styles.buttonGroup}>
                            {!prosthesisMode && !bridgeMode && !ponticMode && !implantMode && (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setProsthesisMode(true);
                                            setShowProsthesisModal(true);
                                        }}
                                        style={styles.actionButton}
                                    >
                                        <Stethoscope size={18} />
                                        <span>보철물</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setImplantMode(true);
                                            setShowImplantModal(true);
                                        }}
                                        style={styles.actionButtonImplant}
                                    >
                                        <Zap size={18} />
                                        <span>임플란트</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setBridgeMode(true)}
                                        style={styles.actionButtonBridge}
                                    >
                                        <Link size={18} />
                                        <span>브릿지</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPonticMode(true)}
                                        style={styles.actionButtonPontic}
                                    >
                                        <Circle size={18} />
                                        <span>폰틱</span>
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* 모드별 안내 바 */}
                    {prosthesisMode && (
                        <div style={styles.modeBar}>
                            <div style={styles.modeInfo}>
                                <span style={styles.modeLabel}>🦷 보철물:</span>
                                <span style={styles.modeValue}>
                                    {conditions.prosthesis && conditions.material 
                                        ? `${conditions.prosthesis} / ${conditions.material}` 
                                        : '선택 필요'}
                                </span>
                            </div>
                            <div style={styles.modeActions}>
                                <button type="button" onClick={() => setShowProsthesisModal(true)} style={styles.selectBtn}>
                                    선택
                                </button>
                                <button type="button" onClick={confirmProsthesis} style={styles.confirmBtn}>
                                    <Check size={16} />
                                    확인
                                </button>
                                <button type="button" onClick={cancelProsthesis} style={styles.cancelBtn}>
                                    <X size={16} />
                                    취소
                                </button>
                            </div>
                        </div>
                    )}

                    {bridgeMode && (
                        <div style={styles.modeBarBridge}>
                            <span style={styles.modeText}>🔗 브릿지로 연결할 치아를 선택하세요 (최소 2개)</span>
                            <div style={styles.modeActions}>
                                <button type="button" onClick={confirmBridge} style={styles.confirmBtn}>
                                    <Check size={16} />
                                    확인
                                </button>
                                <button type="button" onClick={cancelBridge} style={styles.cancelBtn}>
                                    <X size={16} />
                                    취소
                                </button>
                            </div>
                        </div>
                    )}

                    {ponticMode && (
                        <div style={styles.modeBarPontic}>
                            <span style={styles.modeText}>⭕ 폰틱으로 설정할 치아를 선택하세요</span>
                            <div style={styles.modeActions}>
                                <button type="button" onClick={confirmPontic} style={styles.confirmBtn}>
                                    <Check size={16} />
                                    확인
                                </button>
                                <button type="button" onClick={cancelPontic} style={styles.cancelBtn}>
                                    <X size={16} />
                                    취소
                                </button>
                            </div>
                        </div>
                    )}

                    {implantMode && (
                        <div style={styles.modeBarImplant}>
                            <div style={styles.modeInfo}>
                                <span style={styles.modeLabel}>⚡ 임플란트:</span>
                                <span style={styles.modeValue}>{selectedImplantBrand || '브랜드 선택 필요'}</span>
                            </div>
                            <div style={styles.modeActions}>
                                <button type="button" onClick={() => setShowImplantModal(true)} style={styles.selectBtn}>
                                    선택
                                </button>
                                <button type="button" onClick={confirmImplant} style={styles.confirmBtn}>
                                    <Check size={16} />
                                    확인
                                </button>
                                <button type="button" onClick={cancelImplant} style={styles.cancelBtn}>
                                    <X size={16} />
                                    취소
                                </button>
                            </div>
                        </div>
                    )}

                    {/* 그룹 디스플레이 */}
                    {(prosthesisGroups.length > 0 || implantGroups.length > 0 || bridgeGroups.length > 0 || ponticGroups.length > 0) && (
                        <div style={styles.groupsContainer}>
                            {prosthesisGroups.length > 0 && (
                                <div style={styles.groupSection}>
                                    <div style={styles.groupLabel}>🦷 보철물</div>
                                    <div style={styles.groupItems}>
                                        {prosthesisGroups.map((group, idx) => (
                                            <div key={idx} style={styles.groupTag}>
                                                <span>{group.teeth.join(', ')} - {group.prosthesis} / {group.material}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => removeProsthesisGroup(idx)}
                                                    style={styles.removeBtn}
                                                >
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {implantGroups.length > 0 && (
                                <div style={styles.groupSection}>
                                    <div style={styles.groupLabel}>⚡ 임플란트</div>
                                    <div style={styles.groupItems}>
                                        {implantGroups.map((group, idx) => (
                                            <div key={idx} style={styles.groupTag}>
                                                <span>{group.teeth.join(', ')} - {group.brand}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => removeImplantGroup(idx)}
                                                    style={styles.removeBtn}
                                                >
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {bridgeGroups.length > 0 && (
                                <div style={styles.groupSection}>
                                    <div style={styles.groupLabel}>🔗 브릿지</div>
                                    <div style={styles.groupItems}>
                                        {bridgeGroups.map((group, idx) => (
                                            <div key={idx} style={styles.groupTag}>
                                                <span>{group.join(' - ')}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => removeBridgeGroup(idx)}
                                                    style={styles.removeBtn}
                                                >
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {ponticGroups.length > 0 && (
                                <div style={styles.groupSection}>
                                    <div style={styles.groupLabel}>⭕ 폰틱</div>
                                    <div style={styles.groupItems}>
                                        {ponticGroups.map((group, idx) => (
                                            <div key={idx} style={styles.groupTag}>
                                                <span>{group.join(', ')}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => removePonticGroup(idx)}
                                                    style={styles.removeBtn}
                                                >
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* 치아 차트 */}
                    <div style={styles.teethChart}>
                        <div style={styles.teethRow}>
                            <div style={styles.teethHalf}>
                                {upperRightTeeth.map(tooth => {
                                    const isSelected = selectedTeeth.includes(tooth);
                                    const groupType = getToothGroupType(tooth);
                                    return (
                                        <div
                                            key={tooth}
                                            onClick={() => handleToothClick(tooth)}
                                            style={{
                                                ...styles.tooth,
                                                ...(isSelected && styles.toothSelected),
                                                ...(groupType === 'prosthesis' && styles.toothProsthesis),
                                                ...(groupType === 'bridge' && styles.toothBridge),
                                                ...(groupType === 'pontic' && styles.toothPontic),
                                                ...(groupType === 'implant' && styles.toothImplant),
                                                ...(groupType === 'prosthesis-temp' && styles.toothProsthesisTemp),
                                                ...(groupType === 'bridge-temp' && styles.toothBridgeTemp),
                                                ...(groupType === 'pontic-temp' && styles.toothPonticTemp),
                                                ...(groupType === 'implant-temp' && styles.toothImplantTemp)
                                            }}
                                        >
                                            {tooth}
                                            {isSelected && (
                                                <Check size={16} style={styles.toothCheck} />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                            <span style={styles.divider}>|</span>
                            <div style={styles.teethHalf}>
                                {upperLeftTeeth.map(tooth => {
                                    const isSelected = selectedTeeth.includes(tooth);
                                    const groupType = getToothGroupType(tooth);
                                    return (
                                        <div
                                            key={tooth}
                                            onClick={() => handleToothClick(tooth)}
                                            style={{
                                                ...styles.tooth,
                                                ...(isSelected && styles.toothSelected),
                                                ...(groupType === 'prosthesis' && styles.toothProsthesis),
                                                ...(groupType === 'bridge' && styles.toothBridge),
                                                ...(groupType === 'pontic' && styles.toothPontic),
                                                ...(groupType === 'implant' && styles.toothImplant),
                                                ...(groupType === 'prosthesis-temp' && styles.toothProsthesisTemp),
                                                ...(groupType === 'bridge-temp' && styles.toothBridgeTemp),
                                                ...(groupType === 'pontic-temp' && styles.toothPonticTemp),
                                                ...(groupType === 'implant-temp' && styles.toothImplantTemp)
                                            }}
                                        >
                                            {tooth}
                                            {isSelected && (
                                                <Check size={16} style={styles.toothCheck} />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div style={styles.centerLine}></div>

                        <div style={styles.teethRow}>
                            <div style={styles.teethHalf}>
                                {lowerRightTeeth.map(tooth => {
                                    const isSelected = selectedTeeth.includes(tooth);
                                    const groupType = getToothGroupType(tooth);
                                    return (
                                        <div
                                            key={tooth}
                                            onClick={() => handleToothClick(tooth)}
                                            style={{
                                                ...styles.tooth,
                                                ...(isSelected && styles.toothSelected),
                                                ...(groupType === 'prosthesis' && styles.toothProsthesis),
                                                ...(groupType === 'bridge' && styles.toothBridge),
                                                ...(groupType === 'pontic' && styles.toothPontic),
                                                ...(groupType === 'implant' && styles.toothImplant),
                                                ...(groupType === 'prosthesis-temp' && styles.toothProsthesisTemp),
                                                ...(groupType === 'bridge-temp' && styles.toothBridgeTemp),
                                                ...(groupType === 'pontic-temp' && styles.toothPonticTemp),
                                                ...(groupType === 'implant-temp' && styles.toothImplantTemp)
                                            }}
                                        >
                                            {tooth}
                                            {isSelected && (
                                                <Check size={16} style={styles.toothCheck} />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                            <span style={styles.divider}>|</span>
                            <div style={styles.teethHalf}>
                                {lowerLeftTeeth.map(tooth => {
                                    const isSelected = selectedTeeth.includes(tooth);
                                    const groupType = getToothGroupType(tooth);
                                    return (
                                        <div
                                            key={tooth}
                                            onClick={() => handleToothClick(tooth)}
                                            style={{
                                                ...styles.tooth,
                                                ...(isSelected && styles.toothSelected),
                                                ...(groupType === 'prosthesis' && styles.toothProsthesis),
                                                ...(groupType === 'bridge' && styles.toothBridge),
                                                ...(groupType === 'pontic' && styles.toothPontic),
                                                ...(groupType === 'implant' && styles.toothImplant),
                                                ...(groupType === 'prosthesis-temp' && styles.toothProsthesisTemp),
                                                ...(groupType === 'bridge-temp' && styles.toothBridgeTemp),
                                                ...(groupType === 'pontic-temp' && styles.toothPonticTemp),
                                                ...(groupType === 'implant-temp' && styles.toothImplantTemp)
                                            }}
                                        >
                                            {tooth}
                                            {isSelected && (
                                                <Check size={16} style={styles.toothCheck} />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Shade 선택 */}
                <div style={styles.section}>
                    <h2 style={styles.sectionTitle}>Shade 선택</h2>
                    
                    <div style={styles.shadeDisplay}>
                        <div style={styles.shadeValue}>
                            {selectedShade ? (
                                <>
                                    <strong>{shadeType === 'classic' ? 'Vita Classic' : 'Vita 3D Master'}</strong>: {selectedShade}
                                </>
                            ) : '선택 안함'}
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowShadeModal(true)}
                            style={styles.shadeSelectButton}
                        >
                            {selectedShade ? '변경' : 'Shade 선택'}
                        </button>
                    </div>
                </div>

                {/* 특이사항 */}
                <div style={styles.section}>
                    <div style={styles.sectionHeaderRow}>
                        <h2 style={styles.sectionTitle}>특이사항</h2>
                        <button
                            type="button"
                            onClick={() => setShowPhrasesModal(true)}
                            style={styles.phrasesButton}
                        >
                            <FileText size={18} />
                            <span>단축어</span>
                        </button>
                    </div>
                    <textarea
                        value={specialNotes}
                        onChange={(e) => setSpecialNotes(e.target.value)}
                        placeholder="작업 시 주의할 사항을 입력하세요 (선택사항)"
                        style={styles.textarea}
                        rows={4}
                    />
                </div>

                {/* 이미지 첨부 */}
                <div style={styles.section}>
                    <h2 style={styles.sectionTitle}>이미지 첨부</h2>

                    <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageSelect}
                        style={styles.fileInput}
                        id="imageUpload"
                    />
                    <label htmlFor="imageUpload" style={styles.fileLabel}>
                        <Upload size={20} />
                        이미지 선택
                    </label>

                    {imagePreviewUrls.length > 0 && (
                        <div style={styles.imagePreviewContainer}>
                            {imagePreviewUrls.map((url, index) => (
                                <div key={index} style={styles.imagePreviewWrapper}>
                                    <img src={url} alt={`Preview ${index + 1}`} style={styles.imagePreview} />
                                    <button
                                        type="button"
                                        onClick={() => removeImage(index)}
                                        style={styles.removeImageButton}
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* 제출 버튼 */}
                <button
                    type="submit"
                    disabled={uploading}
                    style={{
                        ...styles.submitButton,
                        opacity: uploading ? 0.6 : 1,
                        cursor: uploading ? 'not-allowed' : 'pointer'
                    }}
                >
                    {uploading ? '작업 의뢰 중...' : '작업 의뢰하기'}
                </button>
            </form>

            {/* 보철물 선택 모달 */}
            {showProsthesisModal && (
                <div style={styles.modalOverlay} onClick={() => setShowProsthesisModal(false)}>
                    <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <h3 style={styles.modalTitle}>보철물 선택</h3>
                            <button onClick={() => setShowProsthesisModal(false)} style={styles.modalClose}>
                                <X size={24} />
                            </button>
                        </div>

                        <div style={styles.modalBody}>
                            <div style={styles.modalSection}>
                                <label style={styles.modalLabel}>보철물 종류</label>
                                <div style={styles.optionsGrid}>
                                    {prosthesisOptions.map(option => (
                                        <button
                                            key={option}
                                            type="button"
                                            onClick={() => {
                                                setConditions(prev => ({ ...prev, prosthesis: option, material: '' }));
                                            }}
                                            style={{
                                                ...styles.optionButton,
                                                ...(conditions.prosthesis === option && styles.optionButtonSelected)
                                            }}
                                        >
                                            {option}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {conditions.prosthesis && (
                                <div style={styles.modalSection}>
                                    <label style={styles.modalLabel}>재료</label>
                                    <div style={styles.optionsGrid}>
                                        {getAvailableMaterials().map(material => (
                                            <button
                                                key={material}
                                                type="button"
                                                onClick={() => {
                                                    setConditions(prev => ({ ...prev, material }));
                                                    setShowProsthesisModal(false);
                                                }}
                                                style={{
                                                    ...styles.optionButton,
                                                    ...(conditions.material === material && styles.optionButtonSelected)
                                                }}
                                            >
                                                {material}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* 임플란트 선택 모달 */}
            {showImplantModal && (
                <div style={styles.modalOverlay} onClick={() => setShowImplantModal(false)}>
                    <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <h3 style={styles.modalTitle}>임플란트 브랜드 선택</h3>
                            <button onClick={() => setShowImplantModal(false)} style={styles.modalClose}>
                                <X size={24} />
                            </button>
                        </div>

                        <div style={styles.modalBody}>
                            <div style={styles.optionsGrid}>
                                {implantOptions.map(option => (
                                    <button
                                        key={option}
                                        type="button"
                                        onClick={() => {
                                            setSelectedImplantBrand(option);
                                            setShowImplantModal(false);
                                        }}
                                        style={{
                                            ...styles.optionButton,
                                            ...(selectedImplantBrand === option && styles.optionButtonSelected)
                                        }}
                                    >
                                        {option}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Shade 선택 모달 */}
            {showShadeModal && (
                <div style={styles.modalOverlay} onClick={() => setShowShadeModal(false)}>
                    <div style={styles.shadeModal} onClick={(e) => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <h3 style={styles.modalTitle}>Shade 선택</h3>
                            <button onClick={() => setShowShadeModal(false)} style={styles.modalClose}>
                                <X size={24} />
                            </button>
                        </div>

                        <div style={styles.shadeTabs}>
                            <button
                                type="button"
                                onClick={() => setShadeType('classic')}
                                style={{
                                    ...styles.shadeTab,
                                    ...(shadeType === 'classic' && styles.shadeTabActive)
                                }}
                            >
                                Vita Classic
                            </button>
                            <button
                                type="button"
                                onClick={() => setShadeType('3d-master')}
                                style={{
                                    ...styles.shadeTab,
                                    ...(shadeType === '3d-master' && styles.shadeTabActive)
                                }}
                            >
                                Vita 3D Master
                            </button>
                        </div>

                        {shadeType && (
                            <div style={styles.shadeOptionsGrid}>
                                {shadeOptions[shadeType].map(shade => (
                                    <button
                                        key={shade}
                                        type="button"
                                        onClick={() => {
                                            setSelectedShade(shade);
                                            setShowShadeModal(false);
                                        }}
                                        style={{
                                            ...styles.shadeOptionButton,
                                            ...(selectedShade === shade && {
                                                backgroundColor: '#FEF3C7',
                                                borderColor: '#f59e0b',
                                                color: '#92400e',
                                                fontWeight: '700'
                                            })
                                        }}
                                    >
                                        {shade}
                                    </button>
                                ))}
                            </div>
                        )}

                        {!shadeType && (
                            <div style={{ padding: '50px', textAlign: 'center', color: '#94a3b8', fontSize: '15px' }}>
                                Shade 타입을 선택해주세요
                            </div>
                        )}
                    </div>
                </div>
            )}

            <PhrasesModal
                isOpen={showPhrasesModal}
                onClose={() => setShowPhrasesModal(false)}
                savedPhrases={savedPhrases}
                newPhrase={newPhrase}
                setNewPhrase={setNewPhrase}
                onSave={async () => {
                    if (!newPhrase.trim()) {
                        alert('단축어를 입력해주세요.');
                        return;
                    }
                    try {
                        const userRef = doc(db, 'users', auth.currentUser.uid);
                        const userDoc = await getDoc(userRef);
                        const currentPhrases = userDoc.data()?.savedPhrases || [];
                        const updatedPhrases = [...currentPhrases, newPhrase.trim()];

                        await updateDoc(userRef, { savedPhrases: updatedPhrases });
                        setSavedPhrases(updatedPhrases);
                        setNewPhrase('');
                        alert('단축어가 저장되었습니다.');
                    } catch (error) {
                        console.error('단축어 저장 실패:', error);
                        alert('단축어 저장에 실패했습니다.');
                    }
                }}
                onDelete={async (index) => {
                    try {
                        const updatedPhrases = savedPhrases.filter((_, i) => i !== index);
                        const userRef = doc(db, 'users', auth.currentUser.uid);
                        await updateDoc(userRef, { savedPhrases: updatedPhrases });
                        setSavedPhrases(updatedPhrases);
                    } catch (error) {
                        console.error('단축어 삭제 실패:', error);
                        alert('단축어 삭제에 실패했습니다.');
                    }
                }}
                onSelect={(phrase) => {
                    setSpecialNotes(prev => prev ? `${prev}\n${phrase}` : phrase);
                    setShowPhrasesModal(false);
                }}
            />
        </div>
    );
}

function PhrasesModal({ isOpen, onClose, savedPhrases, newPhrase, setNewPhrase, onSave, onDelete, onSelect }) {
    if (!isOpen) return null;

    return (
        <div style={styles.modalOverlay} onClick={onClose}>
            <div style={styles.phrasesModal} onClick={(e) => e.stopPropagation()}>
                <div style={styles.modalHeader}>
                    <h3 style={styles.modalTitle}>단축어 관리</h3>
                    <button onClick={onClose} style={styles.modalClose}>
                        <X size={24} />
                    </button>
                </div>

                <div style={styles.phrasesModalBody}>
                    <div style={styles.addPhraseSection}>
                        <label style={styles.modalLabel}>새 단축어 추가</label>
                        <div style={styles.addPhraseRow}>
                            <textarea
                                value={newPhrase}
                                onChange={(e) => setNewPhrase(e.target.value)}
                                style={styles.phraseInput}
                                placeholder="자주 쓰는 문구를 입력하세요"
                                rows={3}
                            />
                            <button
                                onClick={onSave}
                                style={styles.saveNewPhraseButton}
                            >
                                <Plus size={20} />
                                저장
                            </button>
                        </div>
                    </div>

                    <div style={styles.phrasesListSection}>
                        <label style={styles.modalLabel}>
                            저장된 단축어 ({savedPhrases.length}개)
                        </label>
                        {savedPhrases.length === 0 ? (
                            <div style={styles.emptyPhrases}>
                                <FileText size={40} color="#cbd5e1" />
                                <p style={styles.emptyPhrasesText}>저장된 단축어가 없습니다</p>
                            </div>
                        ) : (
                            <div style={styles.phrasesList}>
                                {savedPhrases.map((phrase, index) => (
                                    <div key={index} style={styles.phraseItem}>
                                        <div
                                            style={styles.phraseContent}
                                            onClick={() => onSelect(phrase)}
                                        >
                                            {phrase}
                                        </div>
                                        <button
                                            onClick={() => onDelete(index)}
                                            style={styles.deletePhraseButton}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div style={styles.phraseHint}>
                        💡 단축어를 클릭하면 특이사항에 자동으로 입력됩니다
                    </div>
                </div>
            </div>
        </div>
    );
}

const styles = {
    container: { 
        maxWidth: '1200px', 
        margin: '0 auto', 
        padding: '20px'
    },
    header: { 
        marginBottom: '24px' 
    },
    title: { 
        margin: '0 0 8px 0', 
        fontSize: '32px', 
        fontWeight: '700', 
        color: '#0f172a'
    },
    subtitle: { 
        margin: 0, 
        fontSize: '16px', 
        color: '#64748b' 
    },
    form: { 
        backgroundColor: '#ffffff', 
        borderRadius: '16px', 
        padding: '32px', 
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
    },
    
    section: { 
        marginBottom: '32px', 
        paddingBottom: '32px', 
        borderBottom: '1px solid #f1f5f9' 
    },
    sectionTitle: { 
        margin: '0 0 20px 0', 
        fontSize: '20px', 
        fontWeight: '700', 
        color: '#0f172a' 
    },
    sectionHeader: { 
        display: 'flex', 
        flexDirection: 'column',
        gap: '16px',
        marginBottom: '20px'
    },
    sectionHeaderRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px'
    },
    
    threeColumnRow: { 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '16px', 
        marginBottom: '16px'
    },
    fullWidthRow: {
        marginTop: '16px'
    },
    inputGroup: { 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '8px' 
    },
    label: { 
        fontSize: '15px', 
        fontWeight: '600', 
        color: '#475569', 
        display: 'flex', 
        alignItems: 'center' 
    },
    required: { 
        color: '#ef4444', 
        marginLeft: '4px' 
    },
    input: { 
        padding: '12px 14px', 
        border: '1px solid #e2e8f0', 
        borderRadius: '8px', 
        fontSize: '15px', 
        boxSizing: 'border-box', 
        width: '100%',
        transition: 'all 0.2s'
    },
    select: { 
        padding: '12px 14px', 
        border: '1px solid #e2e8f0', 
        borderRadius: '8px', 
        fontSize: '15px', 
        backgroundColor: '#ffffff', 
        boxSizing: 'border-box', 
        width: '100%',
        cursor: 'pointer',
        transition: 'all 0.2s'
    },
    dateInput: {
        width: '100%',
        padding: '12px 14px',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        fontSize: '15px',
        boxSizing: 'border-box',
        transition: 'all 0.2s',
        cursor: 'text'
    },
    checkboxWrapper: {
        display: 'flex',
        alignItems: 'center',
        padding: '12px 14px',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        backgroundColor: '#f8fafc'
    },
    checkboxLabel: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        cursor: 'pointer',
        margin: 0
    },
    checkbox: {
        width: '18px',
        height: '18px',
        cursor: 'pointer',
        accentColor: '#ef4444'
    },
    checkboxText: {
        fontSize: '15px',
        fontWeight: '600',
        color: '#475569'
    },
    textarea: { 
        width: '100%', 
        padding: '12px 14px', 
        border: '1px solid #e2e8f0', 
        borderRadius: '8px', 
        fontSize: '15px', 
        minHeight: '100px', 
        resize: 'vertical', 
        fontFamily: 'inherit', 
        boxSizing: 'border-box',
        transition: 'all 0.2s'
    },
    
    teethChart: { 
        backgroundColor: '#f8fafc', 
        padding: '16px', 
        borderRadius: '12px', 
        border: '1px solid #e2e8f0',
        overflowX: 'auto'
    },
    teethRow: { 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        gap: '4px', 
        marginBottom: '4px'
    },
    teethHalf: { 
        display: 'flex', 
        gap: '4px' 
    },
    divider: { 
        fontSize: '18px', 
        fontWeight: 'bold', 
        color: '#dc2626', 
        padding: '0 8px' 
    },
    centerLine: { 
        height: '2px', 
        backgroundColor: '#dc2626', 
        margin: '8px 0' 
    },
    tooth: { 
        width: '44px', 
        height: '44px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        border: '1px solid #e2e8f0', 
        borderRadius: '8px', 
        cursor: 'pointer', 
        fontSize: '14px', 
        fontWeight: '600', 
        transition: 'all 0.2s', 
        backgroundColor: '#ffffff', 
        color: '#64748b', 
        position: 'relative'
    },
    toothSelected: { 
        border: '2px solid #10b981', 
        backgroundColor: '#d1fae5', 
        color: '#059669' 
    },
    toothProsthesis: { 
        border: '2px solid #10b981', 
        backgroundColor: '#d1fae5', 
        color: '#065f46', 
        boxShadow: '0 0 0 2px rgba(16, 185, 129, 0.2)' 
    },
    toothBridge: { 
        border: '2px solid #f59e0b', 
        backgroundColor: '#fef3c7', 
        color: '#92400e', 
        boxShadow: '0 0 0 2px rgba(245, 158, 11, 0.2)' 
    },
    toothPontic: { 
        border: '2px solid #8b5cf6', 
        backgroundColor: '#ede9fe', 
        color: '#6b21a8', 
        boxShadow: '0 0 0 2px rgba(139, 92, 246, 0.2)' 
    },
    toothImplant: { 
        border: '2px solid #3b82f6', 
        backgroundColor: '#dbeafe', 
        color: '#1e40af', 
        boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.2)' 
    },
    toothProsthesisTemp: { 
        border: '2px solid #34d399', 
        backgroundColor: '#d1fae5', 
        color: '#065f46', 
        boxShadow: '0 0 8px rgba(52, 211, 153, 0.5)', 
        animation: 'pulse 1.5s ease-in-out infinite' 
    },
    toothBridgeTemp: { 
        border: '2px solid #fb923c', 
        backgroundColor: '#fed7aa', 
        color: '#9a3412', 
        boxShadow: '0 0 8px rgba(251, 146, 60, 0.5)', 
        animation: 'pulse 1.5s ease-in-out infinite' 
    },
    toothPonticTemp: { 
        border: '2px solid #a78bfa', 
        backgroundColor: '#ddd6fe', 
        color: '#5b21b6', 
        boxShadow: '0 0 8px rgba(167, 139, 250, 0.5)', 
        animation: 'pulse 1.5s ease-in-out infinite' 
    },
    toothImplantTemp: { 
        border: '2px solid #60a5fa', 
        backgroundColor: '#bfdbfe', 
        color: '#1e3a8a', 
        boxShadow: '0 0 8px rgba(96, 165, 250, 0.5)', 
        animation: 'pulse 1.5s ease-in-out infinite' 
    },
    toothCheck: { 
        position: 'absolute', 
        top: '2px', 
        right: '2px' 
    },
    
    buttonGroup: { 
        display: 'flex', 
        flexWrap: 'wrap',
        gap: '10px'
    },
    actionButton: { 
        display: 'inline-flex', 
        alignItems: 'center', 
        gap: '8px', 
        padding: '10px 16px', 
        backgroundColor: '#10b981', 
        color: 'white', 
        border: 'none', 
        borderRadius: '8px', 
        fontSize: '15px', 
        fontWeight: '600', 
        cursor: 'pointer',
        transition: 'all 0.2s'
    },
    actionButtonImplant: { 
        display: 'inline-flex', 
        alignItems: 'center', 
        gap: '8px', 
        padding: '10px 16px', 
        backgroundColor: '#3b82f6', 
        color: 'white', 
        border: 'none', 
        borderRadius: '8px', 
        fontSize: '15px', 
        fontWeight: '600', 
        cursor: 'pointer',
        transition: 'all 0.2s'
    },
    actionButtonBridge: { 
        display: 'inline-flex', 
        alignItems: 'center', 
        gap: '8px', 
        padding: '10px 16px', 
        backgroundColor: '#f59e0b', 
        color: 'white', 
        border: 'none', 
        borderRadius: '8px', 
        fontSize: '15px', 
        fontWeight: '600', 
        cursor: 'pointer',
        transition: 'all 0.2s'
    },
    actionButtonPontic: { 
        display: 'inline-flex', 
        alignItems: 'center', 
        gap: '8px', 
        padding: '10px 16px', 
        backgroundColor: '#8b5cf6', 
        color: 'white', 
        border: 'none', 
        borderRadius: '8px', 
        fontSize: '15px', 
        fontWeight: '600', 
        cursor: 'pointer',
        transition: 'all 0.2s'
    },
    
    modeBar: { 
        display: 'flex', 
        flexDirection: 'column',
        gap: '12px',
        padding: '14px 16px', 
        backgroundColor: '#d1fae5', 
        borderRadius: '10px', 
        border: '2px solid #10b981', 
        marginBottom: '16px'
    },
    modeBarImplant: { 
        display: 'flex', 
        flexDirection: 'column',
        gap: '12px',
        padding: '14px 16px', 
        backgroundColor: '#dbeafe', 
        borderRadius: '10px', 
        border: '2px solid #3b82f6', 
        marginBottom: '16px'
    },
    modeBarBridge: { 
        display: 'flex', 
        flexDirection: 'column',
        gap: '12px',
        padding: '14px 16px', 
        backgroundColor: '#fef3c7', 
        borderRadius: '10px', 
        border: '2px solid #f59e0b', 
        marginBottom: '16px'
    },
    modeBarPontic: { 
        display: 'flex', 
        flexDirection: 'column',
        gap: '12px',
        padding: '14px 16px', 
        backgroundColor: '#ede9fe', 
        borderRadius: '10px', 
        border: '2px solid #8b5cf6', 
        marginBottom: '16px'
    },
    
    modeInfo: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
    },
    modeLabel: {
        fontSize: '15px',
        fontWeight: '700',
        color: '#065f46'
    },
    modeValue: {
        fontSize: '15px',
        fontWeight: '600',
        color: '#059669'
    },
    modeText: { 
        fontSize: '15px', 
        fontWeight: '600', 
        color: '#065f46' 
    },
    modeActions: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px'
    },
    selectBtn: { 
        padding: '8px 14px', 
        backgroundColor: '#6366f1', 
        color: 'white', 
        border: 'none', 
        borderRadius: '6px', 
        fontSize: '14px', 
        fontWeight: '600', 
        cursor: 'pointer'
    },
    confirmBtn: { 
        padding: '8px 14px', 
        backgroundColor: '#10b981', 
        color: 'white', 
        border: 'none', 
        borderRadius: '6px', 
        fontSize: '14px', 
        fontWeight: '600', 
        cursor: 'pointer', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '6px' 
    },
    cancelBtn: { 
        padding: '8px 14px', 
        backgroundColor: '#ef4444', 
        color: 'white', 
        border: 'none', 
        borderRadius: '6px', 
        fontSize: '14px', 
        fontWeight: '600', 
        cursor: 'pointer', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '6px' 
    },
    
    groupsContainer: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        marginBottom: '16px'
    },
    groupSection: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
    },
    groupLabel: { 
        fontSize: '14px', 
        fontWeight: '600', 
        color: '#475569' 
    },
    groupItems: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px'
    },
    groupTag: { 
        display: 'inline-flex', 
        alignItems: 'center', 
        gap: '8px', 
        padding: '8px 12px', 
        backgroundColor: '#f8fafc', 
        borderRadius: '6px', 
        border: '1px solid #e2e8f0',
        fontSize: '14px',
        fontWeight: '500'
    },
    removeBtn: { 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        width: '20px', 
        height: '20px', 
        backgroundColor: '#fee2e2', 
        color: '#dc2626', 
        border: 'none', 
        borderRadius: '4px', 
        cursor: 'pointer' 
    },
    
    shadeDisplay: { 
        display: 'flex', 
        flexDirection: 'column',
        gap: '12px',
        padding: '14px 16px', 
        backgroundColor: '#f8fafc', 
        borderRadius: '10px', 
        border: '1px solid #e2e8f0'
    },
    shadeValue: { 
        flex: 1, 
        fontSize: '15px', 
        fontWeight: '600', 
        color: '#0f172a' 
    },
    shadeSelectButton: { 
        padding: '10px 18px', 
        backgroundColor: '#6366f1', 
        color: 'white', 
        border: 'none', 
        borderRadius: '8px', 
        fontSize: '15px', 
        fontWeight: '600', 
        cursor: 'pointer', 
        transition: 'all 0.2s',
        alignSelf: 'flex-start'
    },
    
    fileInput: { 
        display: 'none' 
    },
    fileLabel: { 
        display: 'inline-flex', 
        alignItems: 'center', 
        gap: '8px', 
        padding: '10px 18px', 
        backgroundColor: '#6366f1', 
        color: 'white', 
        borderRadius: '8px', 
        cursor: 'pointer', 
        fontSize: '15px', 
        fontWeight: '600',
        transition: 'all 0.2s'
    },
    imagePreviewContainer: { 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
        gap: '12px', 
        marginTop: '16px'
    },
    imagePreviewWrapper: { 
        position: 'relative', 
        borderRadius: '8px', 
        overflow: 'hidden', 
        border: '1px solid #e2e8f0' 
    },
    imagePreview: { 
        width: '100%', 
        height: '120px', 
        objectFit: 'cover', 
        display: 'block' 
    },
    removeImageButton: { 
        position: 'absolute', 
        top: '8px', 
        right: '8px', 
        width: '26px', 
        height: '26px', 
        backgroundColor: '#dc2626', 
        color: 'white', 
        border: 'none', 
        borderRadius: '6px', 
        cursor: 'pointer', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
    },
    
    submitButton: { 
        width: '100%', 
        padding: '14px', 
        backgroundColor: '#6366f1', 
        color: 'white', 
        border: 'none', 
        borderRadius: '10px', 
        fontSize: '16px', 
        fontWeight: '600', 
        cursor: 'pointer', 
        marginTop: '16px', 
        transition: 'all 0.2s' 
    },
    
    modalOverlay: { 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0, 
        backgroundColor: 'rgba(0,0,0,0.5)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        zIndex: 1000, 
        padding: '20px' 
    },
    modal: { 
        backgroundColor: '#FFFFFF', 
        borderRadius: '16px', 
        padding: '24px', 
        maxWidth: '550px', 
        width: '100%', 
        maxHeight: '85vh', 
        overflow: 'auto' 
    },
    shadeModal: { 
        backgroundColor: '#FFFFFF', 
        borderRadius: '16px', 
        padding: '24px', 
        maxWidth: '650px', 
        width: '100%', 
        maxHeight: '85vh', 
        overflow: 'auto' 
    },
    phrasesModal: { 
        backgroundColor: '#FFFFFF', 
        borderRadius: '16px', 
        padding: '24px', 
        maxWidth: '650px', 
        width: '100%', 
        maxHeight: '85vh', 
        overflow: 'auto' 
    },
    modalHeader: { 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '20px' 
    },
    modalTitle: { 
        fontSize: '20px', 
        fontWeight: '700', 
        color: '#2D3748', 
        margin: 0 
    },
    modalClose: { 
        backgroundColor: 'transparent', 
        border: 'none', 
        fontSize: '24px', 
        cursor: 'pointer', 
        color: '#718096', 
        padding: '4px' 
    },
    modalBody: { 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '20px' 
    },
    modalSection: { 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '12px' 
    },
    modalLabel: { 
        fontSize: '15px', 
        fontWeight: '600', 
        color: '#475569' 
    },
    optionsGrid: { 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
        gap: '10px'
    },
    optionButton: { 
        padding: '12px 14px', 
        backgroundColor: '#F7FAFC', 
        border: '2px solid #E2E8F0', 
        borderRadius: '8px', 
        cursor: 'pointer', 
        fontSize: '14px', 
        fontWeight: '600', 
        color: '#2D3748', 
        transition: 'all 0.2s',
        textAlign: 'center'
    },
    optionButtonSelected: {
        backgroundColor: '#FEF3C7',
        borderColor: '#f59e0b',
        color: '#92400e'
    },
    shadeTabs: { 
        display: 'flex', 
        gap: '8px', 
        marginBottom: '20px', 
        borderBottom: '2px solid #e5e7eb'
    },
    shadeTab: { 
        flex: 1, 
        padding: '10px', 
        backgroundColor: 'transparent', 
        border: 'none', 
        borderBottom: '3px solid transparent', 
        cursor: 'pointer', 
        fontSize: '15px', 
        fontWeight: '600', 
        color: '#64748b', 
        transition: 'all 0.2s', 
        marginBottom: '-2px' 
    },
    shadeTabActive: { 
        color: '#f59e0b', 
        borderBottomColor: '#f59e0b' 
    },
    shadeOptionsGrid: { 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(65px, 1fr))',
        gap: '10px', 
        maxHeight: '450px', 
        overflowY: 'auto', 
        padding: '4px'
    },
    shadeOptionButton: { 
        padding: '12px 8px', 
        backgroundColor: '#F7FAFC', 
        border: '2px solid #E2E8F0', 
        borderRadius: '8px', 
        cursor: 'pointer', 
        fontSize: '14px', 
        fontWeight: '600', 
        color: '#2D3748', 
        transition: 'all 0.2s', 
        textAlign: 'center' 
    },
    
    phrasesButton: { 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px', 
        padding: '10px 16px', 
        backgroundColor: '#8b5cf6', 
        color: 'white', 
        border: 'none', 
        borderRadius: '8px', 
        fontSize: '15px', 
        fontWeight: '600', 
        cursor: 'pointer', 
        transition: 'all 0.2s' 
    },
    phrasesModalBody: {
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
    },
    addPhraseSection: { 
        paddingBottom: '20px', 
        borderBottom: '2px solid #e2e8f0' 
    },
    addPhraseRow: { 
        display: 'flex', 
        flexDirection: 'column',
        gap: '12px'
    },
    phraseInput: { 
        padding: '10px 12px', 
        border: '1px solid #e2e8f0', 
        borderRadius: '8px', 
        fontSize: '15px', 
        fontFamily: 'inherit', 
        resize: 'vertical', 
        boxSizing: 'border-box', 
        width: '100%' 
    },
    saveNewPhraseButton: { 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        gap: '8px', 
        padding: '10px 18px', 
        backgroundColor: '#10b981', 
        color: 'white', 
        border: 'none', 
        borderRadius: '8px', 
        fontSize: '15px', 
        fontWeight: '600', 
        cursor: 'pointer', 
        alignSelf: 'flex-start'
    },
    phrasesListSection: {},
    phrasesList: { 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '10px', 
        maxHeight: '350px', 
        overflowY: 'auto', 
        padding: '4px' 
    },
    phraseItem: { 
        display: 'flex', 
        alignItems: 'flex-start', 
        gap: '10px', 
        padding: '12px', 
        backgroundColor: '#f8fafc', 
        border: '1px solid #e2e8f0', 
        borderRadius: '8px', 
        transition: 'all 0.2s' 
    },
    phraseContent: { 
        flex: 1, 
        fontSize: '15px', 
        color: '#0f172a', 
        cursor: 'pointer', 
        lineHeight: '1.5', 
        wordBreak: 'break-word' 
    },
    deletePhraseButton: { 
        padding: '6px', 
        backgroundColor: '#fee2e2', 
        color: '#dc2626', 
        border: 'none', 
        borderRadius: '6px', 
        cursor: 'pointer', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        flexShrink: 0, 
        transition: 'all 0.2s' 
    },
    emptyPhrases: { 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        padding: '40px 20px', 
        textAlign: 'center' 
    },
    emptyPhrasesText: { 
        marginTop: '12px', 
        fontSize: '15px', 
        color: '#94a3b8' 
    },
    phraseHint: { 
        padding: '12px', 
        backgroundColor: '#eff6ff', 
        borderRadius: '8px', 
        fontSize: '14px', 
        color: '#1e40af', 
        textAlign: 'center' 
    }
};

const styleSheet = document.styleSheets[0];
if (styleSheet) {
    try {
        styleSheet.insertRule(`
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.7; }
            }
        `, styleSheet.cssRules.length);
    } catch (e) {}

    try {
        styleSheet.insertRule(`
            input[type="date"]::-webkit-calendar-picker-indicator {
                cursor: pointer;
            }
        `, styleSheet.cssRules.length);
    } catch (e) {}
    
    try {
        styleSheet.insertRule(`
            @media (min-width: 768px) {
                .section-header {
                    flex-direction: row !important;
                }
                .mode-bar, .mode-bar-implant, .mode-bar-bridge, .mode-bar-pontic {
                    flex-direction: row !important;
                    justify-content: space-between !important;
                    align-items: center !important;
                }
                .shade-display {
                    flex-direction: row !important;
                    align-items: center !important;
                }
                .add-phrase-row {
                    flex-direction: row !important;
                    align-items: flex-start !important;
                }
            }
        `, styleSheet.cssRules.length);
    } catch (e) {}
}

export default CreateOrder;