import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, query, collection, where, getDocs } from 'firebase/firestore';

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setCurrentUser(user);
            
            if (user) {
                try {
                    // users 컬렉션에서 사용자 데이터 가져오기
                    const userDocRef = doc(db, 'users', user.uid);
                    const userDoc = await getDoc(userDocRef);
                    
                    if (userDoc.exists()) {
                        const data = userDoc.data();
                        
                        // 회사 정보가 있으면 함께 가져오기
                        if (data.companyId) {
                            try {
                                const companyDoc = await getDoc(doc(db, 'companies', data.companyId));
                                if (companyDoc.exists()) {
                                    setUserData({
                                        ...data,
                                        companyName: companyDoc.data().name || companyDoc.data().companyName,
                                        companyData: companyDoc.data()
                                    });
                                } else {
                                    setUserData(data);
                                }
                            } catch (error) {
                                console.error('회사 정보 로드 실패:', error);
                                setUserData(data);
                            }
                        } else {
                            setUserData(data);
                        }
                    } else {
                        // uid 필드로 쿼리 (문서 ID가 uid가 아닌 경우)
                        const q = query(collection(db, 'users'), where('uid', '==', user.uid));
                        const querySnapshot = await getDocs(q);
                        
                        if (!querySnapshot.empty) {
                            const data = querySnapshot.docs[0].data();
                            setUserData(data);
                        } else {
                            // 기본 데이터 설정
                            setUserData({
                                uid: user.uid,
                                email: user.email,
                                displayName: user.displayName || user.email,
                                name: user.displayName || user.email,
                                userType: 'individual'
                            });
                        }
                    }
                } catch (error) {
                    console.error('사용자 데이터 로드 실패:', error);
                    setUserData({
                        uid: user.uid,
                        email: user.email,
                        displayName: user.displayName || user.email,
                        name: user.displayName || user.email,
                        userType: 'individual'
                    });
                }
            } else {
                setUserData(null);
            }
            
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const value = {
        currentUser,
        userData,
        loading
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}

export default AuthContext;