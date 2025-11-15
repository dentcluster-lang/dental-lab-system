import React, { useState } from 'react';
import { FileText, Shield, AlertCircle, CheckCircle } from 'lucide-react';

function TermsOfService() {
    const [activeTab, setActiveTab] = useState('terms');

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h1 style={styles.title}>약관 및 정책</h1>
                <p style={styles.subtitle}>법적 보호와 투명한 서비스 운영을 위한 약관입니다</p>
            </div>

            {/* 탭 메뉴 */}
            <div style={styles.tabs}>
                <button
                    style={activeTab === 'terms' ? {...styles.tab, ...styles.tabActive} : styles.tab}
                    onClick={() => setActiveTab('terms')}
                >
                    <FileText size={18} />
                    이용약관
                </button>
                <button
                    style={activeTab === 'privacy' ? {...styles.tab, ...styles.tabActive} : styles.tab}
                    onClick={() => setActiveTab('privacy')}
                >
                    <Shield size={18} />
                    개인정보처리방침
                </button>
                <button
                    style={activeTab === 'advertising' ? {...styles.tab, ...styles.tabActive} : styles.tab}
                    onClick={() => setActiveTab('advertising')}
                >
                    <AlertCircle size={18} />
                    광고 가이드라인
                </button>
            </div>

            {/* 내용 */}
            <div style={styles.content}>
                {activeTab === 'terms' && <TermsContent />}
                {activeTab === 'privacy' && <PrivacyContent />}
                {activeTab === 'advertising' && <AdvertisingContent />}
            </div>
        </div>
    );
}

// 이용약관
function TermsContent() {
    return (
        <div style={styles.section}>
            <h2 style={styles.sectionTitle}>이용약관</h2>
            <p style={styles.updateDate}>최종 업데이트: 2024년 10월 16일</p>

            <div style={styles.article}>
                <h3 style={styles.articleTitle}>제1조 (목적)</h3>
                <p style={styles.articleContent}>
                    본 약관은 [서비스명] (이하 "플랫폼")이 제공하는 치과-치과기공소 간 업무 관리 서비스의 이용과 관련하여 
                    플랫폼과 이용자 간의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.
                </p>
            </div>

            <div style={styles.article}>
                <h3 style={styles.articleTitle}>제2조 (정의)</h3>
                <div style={styles.articleContent}>
                    <p><strong>1. "플랫폼"</strong>이란 치과와 치과기공소 간의 의뢰서 관리, 거래명세서 작성 등을 지원하는 온라인 서비스를 의미합니다.</p>
                    <p><strong>2. "회원"</strong>이란 플랫폼에 가입하여 서비스를 이용하는 치과 또는 치과기공소를 의미합니다.</p>
                    <p><strong>3. "광고주"</strong>란 플랫폼 내 광고 서비스를 이용하는 재료업체, 장비업체 등을 의미합니다.</p>
                </div>
            </div>

            <div style={styles.article}>
                <h3 style={styles.articleTitle}>제3조 (서비스의 제공)</h3>
                <div style={styles.articleContent}>
                    <p>플랫폼은 다음과 같은 서비스를 제공합니다:</p>
                    <ul style={styles.list}>
                        <li>치과 기공 의뢰서 작성 및 관리</li>
                        <li>거래명세서 생성 및 관리</li>
                        <li>거래처 연결 및 관리</li>
                        <li>통계 및 분석 기능</li>
                        <li>광고 게재 서비스</li>
                        <li>마켓플레이스 서비스</li>
                    </ul>
                </div>
            </div>

            <div style={styles.warningBox}>
                <AlertCircle size={20} color="#d97706" />
                <div>
                    <h4 style={styles.warningTitle}>중요 고지사항</h4>
                    <p style={styles.warningContent}>
                        본 플랫폼은 의료행위를 중개하거나 의료기관을 추천하지 않습니다. 
                        플랫폼은 단순히 업무 관리 도구를 제공할 뿐이며, 실제 진료나 기공물 제작의 품질에 대해서는 
                        각 치과 및 기공소가 전적인 책임을 집니다.
                    </p>
                </div>
            </div>

            <div style={styles.article}>
                <h3 style={styles.articleTitle}>제4조 (개인정보보호)</h3>
                <div style={styles.articleContent}>
                    <p>플랫폼은 관련 법령이 정하는 바에 따라 회원의 개인정보를 보호하기 위해 노력합니다.</p>
                    <p>개인정보의 수집, 이용, 제공 등에 관한 사항은 별도의 개인정보처리방침에 따릅니다.</p>
                </div>
            </div>

            <div style={styles.article}>
                <h3 style={styles.articleTitle}>제5조 (회원의 의무)</h3>
                <div style={styles.articleContent}>
                    <p>회원은 다음 행위를 하여서는 안 됩니다:</p>
                    <ul style={styles.list}>
                        <li>타인의 정보 도용</li>
                        <li>플랫폼의 운영을 방해하는 행위</li>
                        <li>허위 정보 기재</li>
                        <li>의료법, 의료기사법 등 관련 법령 위반 행위</li>
                        <li>저작권 등 타인의 권리를 침해하는 행위</li>
                    </ul>
                </div>
            </div>

            <div style={styles.article}>
                <h3 style={styles.articleTitle}>제6조 (플랫폼의 의무와 책임 제한)</h3>
                <div style={styles.articleContent}>
                    <p><strong>1. 플랫폼의 의무</strong></p>
                    <ul style={styles.list}>
                        <li>안정적인 서비스 제공을 위해 노력합니다</li>
                        <li>개인정보보호를 위해 노력합니다</li>
                        <li>회원의 의견을 수렴하여 서비스를 개선합니다</li>
                    </ul>
                    
                    <p style={{marginTop: '20px'}}><strong>2. 책임의 제한</strong></p>
                    <ul style={styles.list}>
                        <li>플랫폼은 회원 간 거래에 직접 관여하지 않으며, 거래 당사자 간 분쟁에 대해 책임을 지지 않습니다</li>
                        <li>기공물의 품질, 진료의 결과에 대해 책임을 지지 않습니다</li>
                        <li>천재지변, 전쟁, 기타 불가항력으로 인한 서비스 중단에 대해 책임을 지지 않습니다</li>
                        <li>회원의 귀책사유로 인한 서비스 이용 장애에 대해 책임을 지지 않습니다</li>
                    </ul>
                </div>
            </div>

            <div style={styles.article}>
                <h3 style={styles.articleTitle}>제7조 (거래 및 정산)</h3>
                <div style={styles.articleContent}>
                    <p>1. 거래명세서는 회원이 직접 작성하며, 플랫폼은 작성 도구만 제공합니다.</p>
                    <p>2. 실제 금전 거래 및 세금계산서 발행은 회원 간 직접 처리하며, 플랫폼은 이에 개입하지 않습니다.</p>
                    <p>3. 자동 정산 기능은 참고용이며, 실제 회계 처리는 회원의 책임입니다.</p>
                </div>
            </div>

            <div style={styles.article}>
                <h3 style={styles.articleTitle}>제8조 (분쟁 해결)</h3>
                <div style={styles.articleContent}>
                    <p>1. 회원 간 분쟁이 발생한 경우, 당사자 간 협의로 해결합니다.</p>
                    <p>2. 협의가 이루어지지 않을 경우, 관련 법령 및 일반 상관례에 따릅니다.</p>
                    <p>3. 소송이 필요한 경우, 플랫폼 소재지 법원을 관할 법원으로 합니다.</p>
                </div>
            </div>
        </div>
    );
}

// 개인정보처리방침
function PrivacyContent() {
    return (
        <div style={styles.section}>
            <h2 style={styles.sectionTitle}>개인정보처리방침</h2>
            <p style={styles.updateDate}>최종 업데이트: 2024년 10월 16일</p>

            <div style={styles.article}>
                <h3 style={styles.articleTitle}>1. 개인정보의 수집 및 이용 목적</h3>
                <div style={styles.articleContent}>
                    <p>플랫폼은 다음의 목적을 위하여 개인정보를 수집 및 이용합니다:</p>
                    <ul style={styles.list}>
                        <li><strong>회원 관리:</strong> 회원가입, 본인 확인, 서비스 제공</li>
                        <li><strong>서비스 제공:</strong> 의뢰서 관리, 거래명세서 작성, 거래처 연결</li>
                        <li><strong>통계 및 분석:</strong> 서비스 개선, 맞춤형 서비스 제공</li>
                        <li><strong>고객 지원:</strong> 문의 응대, 불만 처리</li>
                    </ul>
                </div>
            </div>

            <div style={styles.article}>
                <h3 style={styles.articleTitle}>2. 수집하는 개인정보 항목</h3>
                <div style={styles.articleContent}>
                    <p><strong>필수 항목:</strong></p>
                    <ul style={styles.list}>
                        <li>이메일 주소</li>
                        <li>비밀번호 (암호화 저장)</li>
                        <li>사업자명 (치과/기공소명)</li>
                        <li>사업자 유형 (치과/기공소)</li>
                    </ul>
                    
                    <p style={{marginTop: '16px'}}><strong>선택 항목:</strong></p>
                    <ul style={styles.list}>
                        <li>전화번호</li>
                        <li>주소</li>
                        <li>사업자등록번호</li>
                    </ul>
                </div>
            </div>

            <div style={styles.criticalBox}>
                <Shield size={20} color="#059669" />
                <div>
                    <h4 style={styles.criticalTitle}>환자 정보 보호 원칙</h4>
                    <p style={styles.criticalContent}>
                        <strong>플랫폼은 환자의 개인정보를 수집하거나 저장하지 않습니다.</strong>
                    </p>
                    <ul style={styles.list}>
                        <li>환자명은 의뢰서에 기재되지만, 암호화되어 저장됩니다</li>
                        <li>차트번호는 치과 내부 식별용으로만 사용됩니다</li>
                        <li>환자 정보는 외부로 공유되지 않습니다</li>
                        <li>의뢰서는 관련 당사자(치과-기공소)만 열람 가능합니다</li>
                    </ul>
                </div>
            </div>

            <div style={styles.article}>
                <h3 style={styles.articleTitle}>3. 개인정보의 보유 및 이용 기간</h3>
                <div style={styles.articleContent}>
                    <p>원칙적으로 개인정보의 수집 및 이용 목적이 달성되면 지체 없이 파기합니다. 단, 관련 법령에 따라 보존할 필요가 있는 경우 해당 기간 동안 보관합니다:</p>
                    <ul style={styles.list}>
                        <li><strong>계약 또는 청약철회 등에 관한 기록:</strong> 5년 (전자상거래법)</li>
                        <li><strong>대금결제 및 재화 등의 공급에 관한 기록:</strong> 5년 (전자상거래법)</li>
                        <li><strong>소비자 불만 또는 분쟁처리에 관한 기록:</strong> 3년 (전자상거래법)</li>
                        <li><strong>의료 관련 기록:</strong> 의료법에 따른 보존 기간</li>
                    </ul>
                </div>
            </div>

            <div style={styles.article}>
                <h3 style={styles.articleTitle}>4. 개인정보의 제3자 제공</h3>
                <div style={styles.articleContent}>
                    <p>플랫폼은 원칙적으로 이용자의 동의 없이 개인정보를 외부에 제공하지 않습니다.</p>
                    <p><strong>예외 사항:</strong></p>
                    <ul style={styles.list}>
                        <li>법령에 특별한 규정이 있는 경우</li>
                        <li>수사기관이 법령에 따라 요청하는 경우</li>
                        <li>통계 작성, 학술 연구 등의 목적으로 특정 개인을 식별할 수 없는 형태로 제공하는 경우</li>
                    </ul>
                </div>
            </div>

            <div style={styles.article}>
                <h3 style={styles.articleTitle}>5. 개인정보의 안전성 확보 조치</h3>
                <div style={styles.articleContent}>
                    <p>플랫폼은 다음과 같은 안전성 확보 조치를 취하고 있습니다:</p>
                    <ul style={styles.list}>
                        <li><strong>비밀번호 암호화:</strong> Firebase Authentication을 통한 안전한 암호화</li>
                        <li><strong>접근 통제:</strong> Firestore Security Rules를 통한 데이터 접근 제한</li>
                        <li><strong>개인정보 최소화:</strong> 필요 최소한의 정보만 수집</li>
                        <li><strong>보안 프로그램:</strong> HTTPS를 통한 암호화 통신</li>
                    </ul>
                </div>
            </div>

            <div style={styles.article}>
                <h3 style={styles.articleTitle}>6. 이용자의 권리</h3>
                <div style={styles.articleContent}>
                    <p>이용자는 언제든지 다음의 권리를 행사할 수 있습니다:</p>
                    <ul style={styles.list}>
                        <li>개인정보 열람 요구</li>
                        <li>개인정보 정정 요구</li>
                        <li>개인정보 삭제 요구</li>
                        <li>개인정보 처리 정지 요구</li>
                        <li>회원 탈퇴 (계정 삭제)</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}

// 광고 가이드라인
function AdvertisingContent() {
    return (
        <div style={styles.section}>
            <h2 style={styles.sectionTitle}>광고 게재 가이드라인</h2>
            <p style={styles.updateDate}>최종 업데이트: 2024년 10월 16일</p>

            <div style={styles.warningBox}>
                <AlertCircle size={20} color="#d97706" />
                <div>
                    <h4 style={styles.warningTitle}>의료기기 광고 관련 중요 사항</h4>
                    <p style={styles.warningContent}>
                        의료기기법에 따라 의료기기 광고는 식품의약품안전처의 사전 심의를 받아야 합니다. 
                        광고주는 관련 법령을 준수할 책임이 있으며, 플랫폼은 법령 위반 광고에 대해 게재를 거부하거나 삭제할 수 있습니다.
                    </p>
                </div>
            </div>

            <div style={styles.article}>
                <h3 style={styles.articleTitle}>1. 광고 게재 원칙</h3>
                <div style={styles.articleContent}>
                    <ul style={styles.list}>
                        <li><strong>합법성:</strong> 모든 광고는 관련 법령을 준수해야 합니다</li>
                        <li><strong>진실성:</strong> 허위 또는 과장된 내용을 포함해서는 안 됩니다</li>
                        <li><strong>공정성:</strong> 경쟁사를 비방하거나 부당하게 비교해서는 안 됩니다</li>
                        <li><strong>적절성:</strong> 불쾌감을 주거나 선정적인 내용을 포함해서는 안 됩니다</li>
                    </ul>
                </div>
            </div>

            <div style={styles.article}>
                <h3 style={styles.articleTitle}>2. 금지되는 광고</h3>
                <div style={styles.articleContent}>
                    <p>다음과 같은 광고는 게재가 금지됩니다:</p>
                    <ul style={styles.list}>
                        <li>식약처 심의를 받지 않은 의료기기 광고</li>
                        <li>허가되지 않은 효능·효과를 표방하는 광고</li>
                        <li>의료기관(치과)을 직접 광고하는 내용</li>
                        <li>환자를 직접 유인하는 내용</li>
                        <li>비교 우위를 입증할 수 없는 최상급 표현</li>
                        <li>명확한 근거 없는 비교 광고</li>
                        <li>저작권, 상표권 등을 침해하는 광고</li>
                    </ul>
                </div>
            </div>

            <div style={styles.criticalBox}>
                <CheckCircle size={20} color="#059669" />
                <div>
                    <h4 style={styles.criticalTitle}>허용되는 광고 예시</h4>
                    <ul style={styles.list}>
                        <li>✅ "FDA 승인 지르코니아 블록"</li>
                        <li>✅ "ISO 인증 임플란트 재료"</li>
                        <li>✅ "치과기공사 교육 프로그램"</li>
                        <li>✅ "CAD/CAM 장비 특가 행사"</li>
                        <li>✅ "덴탈 세미나 참가자 모집"</li>
                    </ul>
                </div>
            </div>

            <div style={styles.article}>
                <h3 style={styles.articleTitle}>3. 광고주의 책임</h3>
                <div style={styles.articleContent}>
                    <p>광고주는 다음 사항에 대해 책임을 집니다:</p>
                    <ul style={styles.list}>
                        <li>광고 내용의 진실성 및 합법성</li>
                        <li>필요한 경우 식약처 심의 획득</li>
                        <li>저작권, 상표권 등 권리 침해 여부 확인</li>
                        <li>광고로 인해 발생하는 모든 법적 책임</li>
                    </ul>
                </div>
            </div>

            <div style={styles.article}>
                <h3 style={styles.articleTitle}>4. 플랫폼의 권리</h3>
                <div style={styles.articleContent}>
                    <p>플랫폼은 다음의 권리를 가집니다:</p>
                    <ul style={styles.list}>
                        <li>광고 내용 사전 심사</li>
                        <li>부적절한 광고 게재 거부</li>
                        <li>게재 중인 광고의 즉시 중단 또는 삭제</li>
                        <li>가이드라인 위반 시 광고주 자격 박탈</li>
                    </ul>
                </div>
            </div>

            <div style={styles.article}>
                <h3 style={styles.articleTitle}>5. 심사 프로세스</h3>
                <div style={styles.articleContent}>
                    <p>모든 광고는 다음 프로세스를 거칩니다:</p>
                    <ol style={styles.list}>
                        <li><strong>광고 제출:</strong> 광고주가 광고 소재 및 정보 제출</li>
                        <li><strong>1차 심사:</strong> 자동 시스템을 통한 기본 검증</li>
                        <li><strong>2차 심사:</strong> 관리자의 수동 검토</li>
                        <li><strong>승인/반려:</strong> 심사 결과 통보 (영업일 기준 2~3일)</li>
                        <li><strong>게재:</strong> 승인된 광고 게재 시작</li>
                        <li><strong>모니터링:</strong> 게재 중 지속적인 모니터링</li>
                    </ol>
                </div>
            </div>

            <div style={styles.article}>
                <h3 style={styles.articleTitle}>6. 광고 표시 및 구분</h3>
                <div style={styles.articleContent}>
                    <p>모든 광고는 다음과 같이 명확하게 표시됩니다:</p>
                    <ul style={styles.list}>
                        <li>"광고" 또는 "AD" 표시</li>
                        <li>일반 콘텐츠와 시각적으로 구분</li>
                        <li>광고주 정보 표시</li>
                    </ul>
                </div>
            </div>

            <div style={styles.article}>
                <h3 style={styles.articleTitle}>7. 위반 시 조치</h3>
                <div style={styles.articleContent}>
                    <p>가이드라인 위반 시 다음 조치가 취해집니다:</p>
                    <ul style={styles.list}>
                        <li><strong>경고:</strong> 1차 위반 시 경고 및 수정 요청</li>
                        <li><strong>광고 중단:</strong> 2차 위반 또는 중대한 위반 시 즉시 중단</li>
                        <li><strong>환불 거부:</strong> 고의적 위반의 경우 광고비 환불 불가</li>
                        <li><strong>자격 박탈:</strong> 반복적 위반 시 영구적 광고 금지</li>
                        <li><strong>법적 조치:</strong> 법령 위반이 명백한 경우 관계 기관 신고</li>
                    </ul>
                </div>
            </div>

            <div style={styles.infoBox}>
                <AlertCircle size={20} color="#2563eb" />
                <div>
                    <h4 style={styles.infoTitle}>문의사항</h4>
                    <p style={styles.infoContent}>
                        광고 가이드라인에 대한 문의사항이 있으신 경우, 
                        <strong> ad-support@example.com</strong>으로 연락 주시기 바랍니다.
                    </p>
                </div>
            </div>
        </div>
    );
}

const styles = {
    container: {
        maxWidth: '1000px',
        margin: '0 auto',
        padding: '20px',
    },
    header: {
        marginBottom: '32px',
    },
    title: {
        margin: '0 0 8px 0',
        fontSize: '32px',
        fontWeight: '700',
        color: '#0f172a',
    },
    subtitle: {
        margin: 0,
        fontSize: '15px',
        color: '#64748b',
    },
    tabs: {
        display: 'flex',
        gap: '8px',
        marginBottom: '24px',
        borderBottom: '2px solid #e2e8f0',
    },
    tab: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 24px',
        backgroundColor: 'transparent',
        border: 'none',
        borderBottom: '3px solid transparent',
        fontSize: '15px',
        fontWeight: '600',
        color: '#64748b',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    tabActive: {
        color: '#6366f1',
        borderBottomColor: '#6366f1',
    },
    content: {
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        padding: '32px',
        border: '1px solid #e2e8f0',
    },
    section: {
        lineHeight: '1.8',
    },
    sectionTitle: {
        margin: '0 0 8px 0',
        fontSize: '28px',
        fontWeight: '700',
        color: '#0f172a',
    },
    updateDate: {
        margin: '0 0 32px 0',
        fontSize: '13px',
        color: '#94a3b8',
    },
    article: {
        marginBottom: '32px',
        paddingBottom: '32px',
        borderBottom: '1px solid #f1f5f9',
    },
    articleTitle: {
        margin: '0 0 16px 0',
        fontSize: '18px',
        fontWeight: '700',
        color: '#1e293b',
    },
    articleContent: {
        fontSize: '14px',
        color: '#475569',
    },
    list: {
        margin: '12px 0',
        paddingLeft: '24px',
    },
    warningBox: {
        display: 'flex',
        gap: '16px',
        padding: '20px',
        backgroundColor: '#fffbeb',
        borderRadius: '12px',
        border: '2px solid #fbbf24',
        marginBottom: '32px',
    },
    warningTitle: {
        margin: '0 0 8px 0',
        fontSize: '16px',
        fontWeight: '700',
        color: '#92400e',
    },
    warningContent: {
        margin: 0,
        fontSize: '14px',
        color: '#78350f',
        lineHeight: '1.6',
    },
    criticalBox: {
        display: 'flex',
        gap: '16px',
        padding: '20px',
        backgroundColor: '#f0fdf4',
        borderRadius: '12px',
        border: '2px solid #22c55e',
        marginBottom: '32px',
    },
    criticalTitle: {
        margin: '0 0 8px 0',
        fontSize: '16px',
        fontWeight: '700',
        color: '#14532d',
    },
    criticalContent: {
        margin: '0 0 12px 0',
        fontSize: '14px',
        color: '#15803d',
        lineHeight: '1.6',
    },
    infoBox: {
        display: 'flex',
        gap: '16px',
        padding: '20px',
        backgroundColor: '#eff6ff',
        borderRadius: '12px',
        border: '2px solid #3b82f6',
        marginTop: '32px',
    },
    infoTitle: {
        margin: '0 0 8px 0',
        fontSize: '16px',
        fontWeight: '700',
        color: '#1e3a8a',
    },
    infoContent: {
        margin: 0,
        fontSize: '14px',
        color: '#1e40af',
        lineHeight: '1.6',
    },
};

export default TermsOfService;