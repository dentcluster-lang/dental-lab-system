import React, { useState } from 'react';
import { X, Shield, ChevronDown, ChevronUp } from 'lucide-react';

function PrivacyPolicy({ onClose }) {
    const [expandedSections, setExpandedSections] = useState({});

    const toggleSection = (sectionId) => {
        setExpandedSections(prev => ({
            ...prev,
            [sectionId]: !prev[sectionId]
        }));
    };

    return (
        <div style={styles.overlay}>
            <div style={styles.modal}>
                {/* 헤더 */}
                <div style={styles.header}>
                    <div style={styles.headerTitle}>
                        <Shield size={24} color="#6366f1" />
                        <h2 style={styles.title}>개인정보 처리방침</h2>
                    </div>
                    <button onClick={onClose} style={styles.closeButton}>
                        <X size={24} />
                    </button>
                </div>

                {/* 내용 */}
                <div style={styles.content}>
                    {/* 서문 */}
                    <div style={styles.intro}>
                        <p style={styles.introText}>
                            DentConnect(이하 "회사")는 정보주체의 자유와 권리 보호를 위해 
                            「개인정보 보호법」 및 관계 법령이 정한 바를 준수하여, 
                            적법하게 개인정보를 처리하고 안전하게 관리하고 있습니다.
                        </p>
                        <p style={styles.introText}>
                            본 개인정보처리방침은 회사가 제공하는 DentConnect 서비스(웹사이트, 
                            모바일 애플리케이션 등)에 적용되며, 다음과 같은 내용을 담고 있습니다.
                        </p>
                    </div>

                    {/* 목차 */}
                    <div style={styles.tocBox}>
                        <h3 style={styles.tocTitle}>목차</h3>
                        <ul style={styles.tocList}>
                            <li>1. 개인정보의 수집 및 이용 목적</li>
                            <li>2. 수집하는 개인정보의 항목 및 수집 방법</li>
                            <li>3. 개인정보의 보유 및 이용 기간</li>
                            <li>4. 개인정보의 제3자 제공</li>
                            <li>5. 개인정보 처리의 위탁</li>
                            <li>6. 개인정보의 파기 절차 및 방법</li>
                            <li>7. 정보주체의 권리·의무 및 행사 방법</li>
                            <li>8. 개인정보의 안전성 확보 조치</li>
                            <li>9. 개인정보 자동 수집 장치의 설치·운영 및 거부</li>
                            <li>10. 개인정보 보호책임자</li>
                            <li>11. 개인정보 처리방침의 변경</li>
                            <li>12. 아동의 개인정보 보호</li>
                        </ul>
                    </div>

                    {/* 섹션 1 */}
                    <Section
                        id="section1"
                        title="1. 개인정보의 수집 및 이용 목적"
                        expanded={expandedSections.section1}
                        onToggle={() => toggleSection('section1')}
                    >
                        <p style={styles.text}>
                            회사는 수집한 개인정보를 다음의 목적을 위해 활용합니다. 
                            이용자가 제공한 모든 정보는 하기 목적에 필요한 용도 이외로는 사용되지 않으며, 
                            이용 목적이 변경될 시에는 사전 동의를 구할 것입니다.
                        </p>

                        <div style={styles.subSection}>
                            <h4 style={styles.subTitle}>가. 서비스 제공에 관한 계약 이행 및 서비스 제공에 따른 요금정산</h4>
                            <ul style={styles.list}>
                                <li>회원 가입 및 본인 확인</li>
                                <li>치과 및 치과기공소 간 의뢰서 작성 및 관리</li>
                                <li>주문/결제/환불 처리</li>
                                <li>마켓플레이스 상품 구매 및 배송</li>
                                <li>채팅 서비스 제공 및 파일 공유</li>
                                <li>캘린더 일정 관리</li>
                                <li>거래명세서 및 통계 제공</li>
                                <li>콘텐츠 제공 (광고, 세미나, 구인공고, 신제품 정보)</li>
                            </ul>
                        </div>

                        <div style={styles.subSection}>
                            <h4 style={styles.subTitle}>나. 회원 관리</h4>
                            <ul style={styles.list}>
                                <li>회원제 서비스 이용에 따른 본인 확인</li>
                                <li>개인 식별, 불량회원의 부정 이용 방지와 비인가 사용 방지</li>
                                <li>가입 의사 확인, 연령 확인</li>
                                <li>불만 처리 등 민원 처리, 고지사항 전달</li>
                                <li>직원 계정 관리 (업체 오너용)</li>
                            </ul>
                        </div>

                        <div style={styles.subSection}>
                            <h4 style={styles.subTitle}>다. 마케팅 및 광고에 활용</h4>
                            <ul style={styles.list}>
                                <li>신규 서비스(제품) 개발 및 맞춤 서비스 제공</li>
                                <li>이벤트 및 광고성 정보 제공 및 참여 기회 제공</li>
                                <li>접속 빈도 파악 또는 회원의 서비스 이용에 대한 통계</li>
                            </ul>
                        </div>

                        <div style={styles.subSection}>
                            <h4 style={styles.subTitle}>라. 거래 안전성 확보</h4>
                            <ul style={styles.list}>
                                <li>부정거래 방지 및 거래 분쟁 조정</li>
                                <li>결제 사기 탐지 및 예방</li>
                                <li>이용 제한 조치 확인</li>
                            </ul>
                        </div>
                    </Section>

                    {/* 섹션 2 */}
                    <Section
                        id="section2"
                        title="2. 수집하는 개인정보의 항목 및 수집 방법"
                        expanded={expandedSections.section2}
                        onToggle={() => toggleSection('section2')}
                    >
                        <div style={styles.subSection}>
                            <h4 style={styles.subTitle}>가. 수집하는 개인정보 항목</h4>
                            
                            <div style={styles.tableBox}>
                                <table style={styles.table}>
                                    <thead>
                                        <tr style={styles.tableHeaderRow}>
                                            <th style={styles.tableHeader}>구분</th>
                                            <th style={styles.tableHeader}>수집 항목</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr style={styles.tableRow}>
                                            <td style={styles.tableCell}><strong>필수 항목</strong></td>
                                            <td style={styles.tableCell}>
                                                이메일, 비밀번호, 이름, 전화번호
                                            </td>
                                        </tr>
                                        <tr style={styles.tableRow}>
                                            <td style={styles.tableCell}><strong>선택 항목<br/>(업체 회원)</strong></td>
                                            <td style={styles.tableCell}>
                                                업체명, 사업자등록번호, 주소, 업체 유형<br/>
                                                (치과/기공소/판매자)
                                            </td>
                                        </tr>
                                        <tr style={styles.tableRow}>
                                            <td style={styles.tableCell}><strong>서비스 이용 중<br/>생성 정보</strong></td>
                                            <td style={styles.tableCell}>
                                                주문 내역, 결제 정보, 배송 정보, 채팅 내역,<br/>
                                                파일 업로드 정보, 거래명세서, 통계 데이터,<br/>
                                                리뷰 및 평가 내용, 광고/세미나 등록 정보
                                            </td>
                                        </tr>
                                        <tr style={styles.tableRow}>
                                            <td style={styles.tableCell}><strong>자동 수집 항목</strong></td>
                                            <td style={styles.tableCell}>
                                                IP 주소, 쿠키, 서비스 이용 기록,<br/>
                                                접속 로그, 기기 정보, OS 정보,<br/>
                                                브라우저 정보, 위치 정보(선택 시)
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div style={styles.subSection}>
                            <h4 style={styles.subTitle}>나. 개인정보 수집 방법</h4>
                            <ul style={styles.list}>
                                <li>홈페이지 및 모바일 앱을 통한 회원가입, 서비스 이용</li>
                                <li>제휴사로부터의 제공</li>
                                <li>생성정보 수집 툴을 통한 자동 수집</li>
                                <li>고객센터를 통한 전화, 이메일, 팩스 등</li>
                            </ul>
                        </div>
                    </Section>

                    {/* 섹션 3 */}
                    <Section
                        id="section3"
                        title="3. 개인정보의 보유 및 이용 기간"
                        expanded={expandedSections.section3}
                        onToggle={() => toggleSection('section3')}
                    >
                        <p style={styles.text}>
                            회사는 이용자의 개인정보를 <strong>회원 탈퇴 시까지</strong> 보유하며, 
                            관련 법령에 따라 아래와 같이 일정 기간 보관합니다.
                        </p>

                        <div style={styles.tableBox}>
                            <table style={styles.table}>
                                <thead>
                                    <tr style={styles.tableHeaderRow}>
                                        <th style={styles.tableHeader}>보존 항목</th>
                                        <th style={styles.tableHeader}>근거 법령</th>
                                        <th style={styles.tableHeader}>보존 기간</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr style={styles.tableRow}>
                                        <td style={styles.tableCell}>계약 또는 청약철회 등에 관한 기록</td>
                                        <td style={styles.tableCell}>전자상거래법</td>
                                        <td style={styles.tableCell}>5년</td>
                                    </tr>
                                    <tr style={styles.tableRow}>
                                        <td style={styles.tableCell}>대금결제 및 재화 등의 공급에 관한 기록</td>
                                        <td style={styles.tableCell}>전자상거래법</td>
                                        <td style={styles.tableCell}>5년</td>
                                    </tr>
                                    <tr style={styles.tableRow}>
                                        <td style={styles.tableCell}>소비자 불만 또는 분쟁처리에 관한 기록</td>
                                        <td style={styles.tableCell}>전자상거래법</td>
                                        <td style={styles.tableCell}>3년</td>
                                    </tr>
                                    <tr style={styles.tableRow}>
                                        <td style={styles.tableCell}>표시/광고에 관한 기록</td>
                                        <td style={styles.tableCell}>전자상거래법</td>
                                        <td style={styles.tableCell}>6개월</td>
                                    </tr>
                                    <tr style={styles.tableRow}>
                                        <td style={styles.tableCell}>웹사이트 방문 기록</td>
                                        <td style={styles.tableCell}>통신비밀보호법</td>
                                        <td style={styles.tableCell}>3개월</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div style={styles.warningBox}>
                            <p style={styles.warningText}>
                                <strong>※ 중요:</strong> 회원 탈퇴 시 즉시 파기됨이 원칙이나, 
                                위 법령에 따라 보존이 필요한 정보는 별도 저장 후 관리됩니다.
                            </p>
                        </div>
                    </Section>

                    {/* 섹션 4 */}
                    <Section
                        id="section4"
                        title="4. 개인정보의 제3자 제공"
                        expanded={expandedSections.section4}
                        onToggle={() => toggleSection('section4')}
                    >
                        <p style={styles.text}>
                            회사는 원칙적으로 이용자의 개인정보를 외부에 제공하지 않습니다. 
                            다만, 아래의 경우에는 예외로 합니다:
                        </p>

                        <div style={styles.subSection}>
                            <h4 style={styles.subTitle}>가. 이용자가 사전에 동의한 경우</h4>
                            <ul style={styles.list}>
                                <li>치과와 기공소 간 주문서 공유 (상호 간 동의)</li>
                                <li>마켓플레이스 판매자에게 구매자 배송 정보 제공</li>
                                <li>광고/세미나 주최사에게 참가자 정보 제공 (사전 동의 시)</li>
                            </ul>
                        </div>

                        <div style={styles.subSection}>
                            <h4 style={styles.subTitle}>나. 법령의 규정에 의한 경우</h4>
                            <ul style={styles.list}>
                                <li>관계 법령에 의거 적법한 절차에 의한 정부/수사기관의 요청이 있는 경우</li>
                                <li>통계작성, 학술연구, 시장조사를 위해 특정 개인을 식별할 수 없는 형태로 제공하는 경우</li>
                            </ul>
                        </div>
                    </Section>

                    {/* 섹션 5 */}
                    <Section
                        id="section5"
                        title="5. 개인정보 처리의 위탁"
                        expanded={expandedSections.section5}
                        onToggle={() => toggleSection('section5')}
                    >
                        <p style={styles.text}>
                            회사는 원활한 서비스 제공을 위해 다음과 같이 개인정보 처리 업무를 외부 전문업체에 위탁하고 있습니다.
                        </p>

                        <div style={styles.tableBox}>
                            <table style={styles.table}>
                                <thead>
                                    <tr style={styles.tableHeaderRow}>
                                        <th style={styles.tableHeader}>수탁업체</th>
                                        <th style={styles.tableHeader}>위탁 업무 내용</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr style={styles.tableRow}>
                                        <td style={styles.tableCell}>Google Firebase</td>
                                        <td style={styles.tableCell}>데이터 저장, 사용자 인증, 푸시 알림</td>
                                    </tr>
                                    <tr style={styles.tableRow}>
                                        <td style={styles.tableCell}>아임포트(Iamport)</td>
                                        <td style={styles.tableCell}>전자결제 대행 서비스</td>
                                    </tr>
                                    <tr style={styles.tableRow}>
                                        <td style={styles.tableCell}>택배사 (CJ대한통운 등)</td>
                                        <td style={styles.tableCell}>상품 배송</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <p style={styles.text}>
                            회사는 위탁계약 체결 시 개인정보보호법 제26조에 따라 
                            위탁업무 수행목적 외 개인정보 처리금지, 기술적·관리적 보호조치, 
                            재위탁 제한, 수탁자에 대한 관리·감독, 손해배상 등 책임에 관한 사항을 
                            계약서 등 문서에 명시하고, 수탁자가 개인정보를 안전하게 처리하는지를 감독하고 있습니다.
                        </p>
                    </Section>

                    {/* 섹션 6 */}
                    <Section
                        id="section6"
                        title="6. 개인정보의 파기 절차 및 방법"
                        expanded={expandedSections.section6}
                        onToggle={() => toggleSection('section6')}
                    >
                        <div style={styles.subSection}>
                            <h4 style={styles.subTitle}>가. 파기 절차</h4>
                            <p style={styles.text}>
                                이용자가 회원가입 등을 위해 입력한 정보는 목적이 달성된 후 
                                별도의 DB로 옮겨져(종이의 경우 별도의 서류함) 내부 방침 및 
                                기타 관련 법령에 의한 정보보호 사유에 따라(보유 및 이용기간 참조) 
                                일정 기간 저장된 후 파기됩니다.
                            </p>
                        </div>

                        <div style={styles.subSection}>
                            <h4 style={styles.subTitle}>나. 파기 방법</h4>
                            <ul style={styles.list}>
                                <li><strong>전자적 파일:</strong> 복구 및 재생되지 않도록 기술적 방법을 이용하여 완전하게 삭제</li>
                                <li><strong>종이 문서:</strong> 분쇄기로 분쇄하거나 소각</li>
                            </ul>
                        </div>

                        <div style={styles.infoBox}>
                            <p style={styles.infoText}>
                                💡 <strong>장기 미이용 계정 처리:</strong> 1년 이상 서비스를 이용하지 않은 회원의 
                                개인정보는 「개인정보보호법」에 따라 다른 이용자의 개인정보와 분리하여 
                                별도로 저장·관리됩니다. 파기 예정일 30일 전까지 이메일로 안내드립니다.
                            </p>
                        </div>
                    </Section>

                    {/* 섹션 7 */}
                    <Section
                        id="section7"
                        title="7. 정보주체의 권리·의무 및 행사 방법"
                        expanded={expandedSections.section7}
                        onToggle={() => toggleSection('section7')}
                    >
                        <p style={styles.text}>
                            정보주체는 회사에 대해 언제든지 다음 각 호의 개인정보 보호 관련 권리를 행사할 수 있습니다:
                        </p>

                        <div style={styles.rightsList}>
                            <div style={styles.rightItem}>
                                <div style={styles.rightNumber}>1</div>
                                <div style={styles.rightContent}>
                                    <h4 style={styles.rightTitle}>개인정보 열람 요구</h4>
                                    <p style={styles.rightDesc}>
                                        프로필 페이지에서 본인의 개인정보를 열람할 수 있습니다.
                                    </p>
                                </div>
                            </div>

                            <div style={styles.rightItem}>
                                <div style={styles.rightNumber}>2</div>
                                <div style={styles.rightContent}>
                                    <h4 style={styles.rightTitle}>개인정보 정정 요구</h4>
                                    <p style={styles.rightDesc}>
                                        오류가 있는 경우 프로필 페이지에서 직접 정정하거나 고객센터를 통해 요청할 수 있습니다.
                                    </p>
                                </div>
                            </div>

                            <div style={styles.rightItem}>
                                <div style={styles.rightNumber}>3</div>
                                <div style={styles.rightContent}>
                                    <h4 style={styles.rightTitle}>개인정보 삭제 요구</h4>
                                    <p style={styles.rightDesc}>
                                        회원 탈퇴를 통해 개인정보 삭제를 요구할 수 있습니다.
                                    </p>
                                </div>
                            </div>

                            <div style={styles.rightItem}>
                                <div style={styles.rightNumber}>4</div>
                                <div style={styles.rightContent}>
                                    <h4 style={styles.rightTitle}>개인정보 처리정지 요구</h4>
                                    <p style={styles.rightDesc}>
                                        고객센터를 통해 개인정보 처리정지를 요구할 수 있습니다.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div style={styles.warningBox}>
                            <p style={styles.warningText}>
                                <strong>※ 권리 행사 제한 사유:</strong><br/>
                                법률에 특별한 규정이 있거나 법령상 의무를 준수하기 위해 불가피한 경우, 
                                다른 사람의 생명·신체를 해할 우려가 있는 경우에는 권리 행사가 제한될 수 있습니다.
                            </p>
                        </div>

                        <p style={styles.text}>
                            <strong>권리 행사 방법:</strong> 개인정보보호법 시행규칙 별지 제8호 서식에 따라 
                            서면, 전자우편, 모사전송(FAX) 등을 통하여 하실 수 있으며, 
                            회사는 이에 대해 지체없이 조치하겠습니다.
                        </p>
                    </Section>

                    {/* 섹션 8 */}
                    <Section
                        id="section8"
                        title="8. 개인정보의 안전성 확보 조치"
                        expanded={expandedSections.section8}
                        onToggle={() => toggleSection('section8')}
                    >
                        <p style={styles.text}>
                            회사는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다:
                        </p>

                        <div style={styles.securityList}>
                            <div style={styles.securityItem}>
                                <div style={styles.securityIcon}>🔐</div>
                                <div style={styles.securityContent}>
                                    <h4 style={styles.securityTitle}>관리적 조치</h4>
                                    <ul style={styles.list}>
                                        <li>개인정보 취급 직원의 최소화 및 교육</li>
                                        <li>내부관리계획 수립 및 시행</li>
                                        <li>정기적인 자체 감사 실시</li>
                                    </ul>
                                </div>
                            </div>

                            <div style={styles.securityItem}>
                                <div style={styles.securityIcon}>🛡️</div>
                                <div style={styles.securityContent}>
                                    <h4 style={styles.securityTitle}>기술적 조치</h4>
                                    <ul style={styles.list}>
                                        <li>개인정보의 암호화 (비밀번호 등)</li>
                                        <li>해킹 등에 대비한 기술적 대책</li>
                                        <li>백신 프로그램 설치 및 주기적 갱신·점검</li>
                                        <li>접근통제 시스템 설치</li>
                                        <li>개인정보 접속기록 보관 및 위변조 방지</li>
                                        <li>Firebase Security Rules를 통한 데이터 접근 제어</li>
                                    </ul>
                                </div>
                            </div>

                            <div style={styles.securityItem}>
                                <div style={styles.securityIcon}>🔒</div>
                                <div style={styles.securityContent}>
                                    <h4 style={styles.securityTitle}>물리적 조치</h4>
                                    <ul style={styles.list}>
                                        <li>전산실, 자료보관실 등의 접근통제</li>
                                        <li>클라우드 서버 이용 시 보안인증 획득 업체 선정</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </Section>

                    {/* 섹션 9 */}
                    <Section
                        id="section9"
                        title="9. 개인정보 자동 수집 장치의 설치·운영 및 거부"
                        expanded={expandedSections.section9}
                        onToggle={() => toggleSection('section9')}
                    >
                        <div style={styles.subSection}>
                            <h4 style={styles.subTitle}>가. 쿠키(Cookie)란?</h4>
                            <p style={styles.text}>
                                회사는 이용자에게 개인화되고 맞춤화된 서비스를 제공하기 위해 
                                이용자의 정보를 저장하고 수시로 불러오는 '쿠키(cookie)'를 사용합니다. 
                                쿠키는 웹사이트를 운영하는데 이용되는 서버가 이용자의 브라우저에게 보내는 
                                아주 작은 텍스트 파일로 이용자 컴퓨터의 하드디스크에 저장됩니다.
                            </p>
                        </div>

                        <div style={styles.subSection}>
                            <h4 style={styles.subTitle}>나. 쿠키의 사용 목적</h4>
                            <ul style={styles.list}>
                                <li>이용자의 접속 빈도나 방문 시간 등을 분석</li>
                                <li>이용자의 취향과 관심분야를 파악</li>
                                <li>각종 이벤트 참여 정도 및 방문 회수 파악</li>
                                <li>로그인 상태 유지</li>
                            </ul>
                        </div>

                        <div style={styles.subSection}>
                            <h4 style={styles.subTitle}>다. 쿠키의 설치·운영 및 거부</h4>
                            <p style={styles.text}>
                                이용자는 쿠키 설치에 대한 선택권을 가지고 있습니다. 
                                웹브라우저에서 옵션을 설정함으로써 모든 쿠키를 허용하거나, 
                                쿠키가 저장될 때마다 확인을 거치거나, 아니면 모든 쿠키의 저장을 거부할 수도 있습니다.
                            </p>

                            <div style={styles.cookieBox}>
                                <p style={styles.cookieTitle}><strong>쿠키 설정 방법</strong></p>
                                <ul style={styles.list}>
                                    <li><strong>Chrome:</strong> 설정 &gt; 개인정보 및 보안 &gt; 쿠키 및 기타 사이트 데이터</li>
                                    <li><strong>Edge:</strong> 설정 &gt; 쿠키 및 사이트 권한 &gt; 쿠키 및 사이트 데이터 관리</li>
                                    <li><strong>Safari:</strong> 환경설정 &gt; 개인정보 &gt; 쿠키 및 웹 사이트 데이터</li>
                                </ul>
                                <p style={styles.warningText}>
                                    ※ 쿠키 저장을 거부할 경우 맞춤형 서비스 이용에 어려움이 발생할 수 있습니다.
                                </p>
                            </div>
                        </div>
                    </Section>

                    {/* 섹션 10 */}
                    <Section
                        id="section10"
                        title="10. 개인정보 보호책임자"
                        expanded={expandedSections.section10}
                        onToggle={() => toggleSection('section10')}
                    >
                        <p style={styles.text}>
                            회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 
                            개인정보 처리와 관련한 정보주체의 불만처리 및 피해구제 등을 위하여 
                            아래와 같이 개인정보 보호책임자를 지정하고 있습니다.
                        </p>

                        <div style={styles.contactCard}>
                            <h4 style={styles.contactCardTitle}>개인정보 보호책임자</h4>
                            <div style={styles.contactGrid}>
                                <div style={styles.contactItem}>
                                    <span style={styles.contactLabel}>담당 부서:</span>
                                    <span style={styles.contactValue}>DentConnect 운영팀</span>
                                </div>
                                <div style={styles.contactItem}>
                                    <span style={styles.contactLabel}>이메일:</span>
                                    <span style={styles.contactValue}>privacy@dentconnect.com</span>
                                </div>
                                <div style={styles.contactItem}>
                                    <span style={styles.contactLabel}>전화:</span>
                                    <span style={styles.contactValue}>1588-0000</span>
                                </div>
                            </div>
                        </div>

                        <p style={styles.text}>
                            정보주체는 회사의 서비스를 이용하시면서 발생한 모든 개인정보보호 관련 문의, 
                            불만처리, 피해구제 등에 관한 사항을 개인정보 보호책임자에게 문의하실 수 있습니다. 
                            회사는 정보주체의 문의에 대해 지체없이 답변 및 처리해드릴 것입니다.
                        </p>

                        <div style={styles.subSection}>
                            <h4 style={styles.subTitle}>기타 개인정보침해에 대한 신고나 상담이 필요하신 경우</h4>
                            <ul style={styles.list}>
                                <li>개인정보침해신고센터 (privacy.kisa.or.kr / 국번없이 118)</li>
                                <li>대검찰청 사이버범죄수사단 (www.spo.go.kr / 국번없이 1301)</li>
                                <li>경찰청 사이버안전국 (cyberbureau.police.go.kr / 국번없이 182)</li>
                            </ul>
                        </div>
                    </Section>

                    {/* 섹션 11 */}
                    <Section
                        id="section11"
                        title="11. 개인정보 처리방침의 변경"
                        expanded={expandedSections.section11}
                        onToggle={() => toggleSection('section11')}
                    >
                        <p style={styles.text}>
                            이 개인정보 처리방침은 시행일로부터 적용되며, 
                            법령 및 방침에 따른 변경내용의 추가, 삭제 및 정정이 있는 경우에는 
                            변경사항의 시행 <strong>7일 전부터</strong> 공지사항을 통하여 고지할 것입니다. 
                            다만, 개인정보의 수집 및 활용, 제3자 제공 등과 같이 이용자 권리의 
                            중요한 변경이 있을 경우에는 최소 <strong>30일 전에</strong> 고지합니다.
                        </p>

                        <div style={styles.versionBox}>
                            <h4 style={styles.versionTitle}>개인정보 처리방침 버전 정보</h4>
                            <ul style={styles.versionList}>
                                <li><strong>공고일자:</strong> 2025년 1월 1일</li>
                                <li><strong>시행일자:</strong> 2025년 1월 1일</li>
                                <li><strong>버전:</strong> v1.0</li>
                            </ul>
                        </div>
                    </Section>

                    {/* 섹션 12 */}
                    <Section
                        id="section12"
                        title="12. 아동의 개인정보 보호"
                        expanded={expandedSections.section12}
                        onToggle={() => toggleSection('section12')}
                    >
                        <p style={styles.text}>
                            회사는 만 14세 미만 아동의 개인정보를 수집하지 않습니다. 
                            만약 만 14세 미만 아동의 개인정보가 수집된 사실을 확인한 경우, 
                            즉시 해당 정보를 삭제하는 등 필요한 조치를 취합니다.
                        </p>

                        <div style={styles.infoBox}>
                            <p style={styles.infoText}>
                                💡 만 14세 미만 아동이 서비스를 이용하고자 할 경우 
                                법정대리인(부모 등)의 동의를 받아야 합니다.
                            </p>
                        </div>
                    </Section>
                </div>

                {/* 하단 버튼 */}
                <div style={styles.footer}>
                    <p style={styles.footerNote}>
                        본 개인정보 처리방침에 동의하시면 서비스 이용이 가능합니다.
                    </p>
                    <button onClick={onClose} style={styles.confirmButton}>
                        확인했습니다
                    </button>
                </div>
            </div>
        </div>
    );
}

// 접을 수 있는 섹션 컴포넌트
function Section({ id, title, children, expanded, onToggle }) {
    return (
        <div style={styles.section}>
            <button
                onClick={onToggle}
                style={styles.sectionHeader}
            >
                <h3 style={styles.sectionTitle}>{title}</h3>
                {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
            {expanded && (
                <div style={styles.sectionContent}>
                    {children}
                </div>
            )}
        </div>
    );
}

const styles = {
    overlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px',
    },
    modal: {
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '900px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '24px 32px',
        borderBottom: '2px solid #e5e7eb',
        backgroundColor: '#f8fafc',
    },
    headerTitle: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
    },
    title: {
        margin: 0,
        fontSize: '24px',
        fontWeight: '700',
        color: '#1e293b',
    },
    closeButton: {
        background: 'none',
        border: 'none',
        color: '#64748b',
        cursor: 'pointer',
        padding: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '8px',
        transition: 'all 0.2s',
    },
    content: {
        padding: '32px',
        overflowY: 'auto',
        flex: 1,
    },
    intro: {
        marginBottom: '32px',
        padding: '20px',
        backgroundColor: '#f1f5f9',
        borderLeft: '4px solid #6366f1',
        borderRadius: '8px',
    },
    introText: {
        margin: '0 0 12px 0',
        fontSize: '14px',
        color: '#475569',
        lineHeight: '1.7',
    },
    tocBox: {
        marginBottom: '32px',
        padding: '24px',
        backgroundColor: '#ffffff',
        border: '2px solid #e2e8f0',
        borderRadius: '12px',
    },
    tocTitle: {
        margin: '0 0 16px 0',
        fontSize: '18px',
        fontWeight: '600',
        color: '#1e293b',
    },
    tocList: {
        margin: 0,
        paddingLeft: '24px',
        fontSize: '14px',
        color: '#475569',
        lineHeight: '2',
    },
    section: {
        marginBottom: '16px',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        overflow: 'hidden',
    },
    sectionHeader: {
        width: '100%',
        padding: '16px 20px',
        backgroundColor: '#f8fafc',
        border: 'none',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    sectionTitle: {
        margin: 0,
        fontSize: '16px',
        fontWeight: '600',
        color: '#1e293b',
        textAlign: 'left',
    },
    sectionContent: {
        padding: '24px',
        backgroundColor: '#ffffff',
    },
    subSection: {
        marginBottom: '24px',
    },
    subTitle: {
        margin: '0 0 12px 0',
        fontSize: '15px',
        fontWeight: '600',
        color: '#334155',
    },
    text: {
        margin: '0 0 12px 0',
        fontSize: '14px',
        color: '#475569',
        lineHeight: '1.7',
    },
    list: {
        margin: '8px 0',
        paddingLeft: '24px',
        fontSize: '14px',
        color: '#475569',
        lineHeight: '1.8',
    },
    tableBox: {
        overflowX: 'auto',
        marginBottom: '16px',
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '14px',
    },
    tableHeaderRow: {
        backgroundColor: '#f1f5f9',
    },
    tableHeader: {
        padding: '12px',
        textAlign: 'left',
        fontWeight: '600',
        color: '#1e293b',
        borderBottom: '2px solid #e2e8f0',
    },
    tableRow: {
        borderBottom: '1px solid #e2e8f0',
    },
    tableCell: {
        padding: '12px',
        color: '#475569',
        lineHeight: '1.6',
    },
    warningBox: {
        padding: '16px',
        backgroundColor: '#fef2f2',
        border: '1px solid #fecaca',
        borderRadius: '8px',
        marginTop: '16px',
    },
    warningText: {
        margin: 0,
        fontSize: '13px',
        color: '#dc2626',
        lineHeight: '1.6',
    },
    infoBox: {
        padding: '16px',
        backgroundColor: '#eff6ff',
        border: '1px solid #bfdbfe',
        borderRadius: '8px',
        marginTop: '16px',
    },
    infoText: {
        margin: 0,
        fontSize: '13px',
        color: '#1e40af',
        lineHeight: '1.6',
    },
    rightsList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        marginTop: '16px',
    },
    rightItem: {
        display: 'flex',
        gap: '16px',
        padding: '16px',
        backgroundColor: '#f8fafc',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
    },
    rightNumber: {
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        backgroundColor: '#6366f1',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: '600',
        fontSize: '16px',
        flexShrink: 0,
    },
    rightContent: {
        flex: 1,
    },
    rightTitle: {
        margin: '0 0 8px 0',
        fontSize: '15px',
        fontWeight: '600',
        color: '#1e293b',
    },
    rightDesc: {
        margin: 0,
        fontSize: '13px',
        color: '#64748b',
        lineHeight: '1.6',
    },
    securityList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        marginTop: '16px',
    },
    securityItem: {
        display: 'flex',
        gap: '16px',
    },
    securityIcon: {
        fontSize: '32px',
        flexShrink: 0,
    },
    securityContent: {
        flex: 1,
    },
    securityTitle: {
        margin: '0 0 12px 0',
        fontSize: '15px',
        fontWeight: '600',
        color: '#1e293b',
    },
    cookieBox: {
        padding: '16px',
        backgroundColor: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        marginTop: '12px',
    },
    cookieTitle: {
        margin: '0 0 12px 0',
        fontSize: '14px',
        color: '#1e293b',
    },
    contactCard: {
        padding: '24px',
        backgroundColor: '#f8fafc',
        border: '2px solid #e2e8f0',
        borderRadius: '12px',
        marginTop: '16px',
        marginBottom: '24px',
    },
    contactCardTitle: {
        margin: '0 0 16px 0',
        fontSize: '16px',
        fontWeight: '600',
        color: '#1e293b',
    },
    contactGrid: {
        display: 'grid',
        gridTemplateColumns: '1fr',
        gap: '12px',
    },
    contactItem: {
        display: 'flex',
        gap: '12px',
    },
    contactLabel: {
        fontWeight: '600',
        color: '#64748b',
        fontSize: '14px',
        minWidth: '100px',
    },
    contactValue: {
        color: '#1e293b',
        fontSize: '14px',
    },
    versionBox: {
        padding: '20px',
        backgroundColor: '#f1f5f9',
        borderRadius: '8px',
        marginTop: '16px',
    },
    versionTitle: {
        margin: '0 0 12px 0',
        fontSize: '15px',
        fontWeight: '600',
        color: '#1e293b',
    },
    versionList: {
        margin: 0,
        paddingLeft: '20px',
        fontSize: '14px',
        color: '#475569',
        lineHeight: '1.8',
    },
    footer: {
        padding: '24px 32px',
        borderTop: '2px solid #e5e7eb',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
    },
    footerNote: {
        margin: 0,
        fontSize: '13px',
        color: '#64748b',
        textAlign: 'center',
    },
    confirmButton: {
        padding: '12px 48px',
        backgroundColor: '#6366f1',
        color: '#ffffff',
        border: 'none',
        borderRadius: '8px',
        fontSize: '15px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
};

export default PrivacyPolicy;