import React from 'react';
import './ToothChart.css';

// 치아 다이어그램 컴포넌트 (미니 버전 - OrderList용)
function ToothChartMini({ selectedTeeth = [], prosthesisInfo = {} }) {
    // 치아 배열 (1-8 표기)
    // 상악: 8-1 (우측에서 좌측), 1-8 (좌측에서 우측)
    // 하악: 8-1 (우측에서 좌측), 1-8 (좌측에서 우측)
    
    const upperRight = [8, 7, 6, 5, 4, 3, 2, 1]; // 우상
    const upperLeft = [1, 2, 3, 4, 5, 6, 7, 8];  // 좌상
    const lowerLeft = [1, 2, 3, 4, 5, 6, 7, 8];  // 좌하
    const lowerRight = [8, 7, 6, 5, 4, 3, 2, 1]; // 우하

    // 치아가 선택되었는지 확인 (FDI 번호를 1자리로 변환하여 비교)
    const isToothSelected = (displayNum, quadrant) => {
        // quadrant: 1=우상, 2=좌상, 3=좌하, 4=우하
        const fdiNum = (quadrant * 10) + displayNum;
        return selectedTeeth.includes(fdiNum.toString()) || 
               selectedTeeth.includes(fdiNum) ||
               selectedTeeth.includes(displayNum.toString()) ||
               selectedTeeth.includes(displayNum);
    };

    // 치아 렌더링 함수
    const renderTooth = (displayNum, quadrant) => {
        const isSelected = isToothSelected(displayNum, quadrant);
        const fdiNum = (quadrant * 10) + displayNum;
        
        return (
            <div
                key={`${quadrant}-${displayNum}`}
                className={`tooth-mini ${isSelected ? 'selected' : ''}`}
                title={isSelected ? `#${fdiNum} (${displayNum})` : `${displayNum}`}
            >
                {isSelected && (
                    <div className="tooth-number">{displayNum}</div>
                )}
            </div>
        );
    };

    return (
        <div className="tooth-chart-mini">
            {/* 상악 */}
            <div className="jaw-row upper">
                <div className="teeth-row right">
                    {upperRight.map(tooth => renderTooth(tooth, 1))}
                </div>
                <div className="center-line"></div>
                <div className="teeth-row left">
                    {upperLeft.map(tooth => renderTooth(tooth, 2))}
                </div>
            </div>

            {/* 하악 */}
            <div className="jaw-row lower">
                <div className="teeth-row right">
                    {lowerRight.map(tooth => renderTooth(tooth, 4))}
                </div>
                <div className="center-line"></div>
                <div className="teeth-row left">
                    {lowerLeft.map(tooth => renderTooth(tooth, 3))}
                </div>
            </div>
        </div>
    );
}

// 상세 정보와 함께 표시하는 버전 (ViewOrder용)
function ToothChartDetailed({ items = [] }) {
    // 치아 배열 (1-8 표기)
    const upperRight = [8, 7, 6, 5, 4, 3, 2, 1];
    const upperLeft = [1, 2, 3, 4, 5, 6, 7, 8];
    const lowerLeft = [1, 2, 3, 4, 5, 6, 7, 8];
    const lowerRight = [8, 7, 6, 5, 4, 3, 2, 1];

    // 모든 선택된 치아 수집 (FDI 번호 그대로 저장)
    const getAllSelectedTeeth = () => {
        const allTeeth = new Set();
        items.forEach(item => {
            const teeth = item.selectedTeeth || item.teeth || item.toothNumbers || [];
            teeth.forEach(tooth => {
                const toothStr = tooth.toString();
                allTeeth.add(toothStr);
            });
        });
        return Array.from(allTeeth);
    };

    const selectedTeeth = getAllSelectedTeeth();

    // 치아별 정보 맵 생성 (FDI 번호로 인덱싱)
    const toothInfoMap = {};
    items.forEach(item => {
        const teeth = item.selectedTeeth || item.teeth || item.toothNumbers || [];
        teeth.forEach(tooth => {
            const toothStr = tooth.toString();
            if (!toothInfoMap[toothStr]) {
                toothInfoMap[toothStr] = [];
            }
            toothInfoMap[toothStr].push({
                prosthesisType: item.prosthesisType || item.type || '보철물',
                shade: item.shade || '',
                material: item.material || '',
                bridge: item.bridge || null
            });
        });
    });

    // FDI 번호에서 1자리 숫자와 quadrant 추출
    const getFDIComponents = (fdiNum) => {
        const numStr = fdiNum.toString();
        if (numStr.length === 2) {
            const quadrant = parseInt(numStr[0]);
            const displayNum = parseInt(numStr[1]);
            return { quadrant, displayNum };
        }
        // 1자리 숫자인 경우 (레거시 데이터)
        return { quadrant: 0, displayNum: parseInt(fdiNum) };
    };

    const isToothSelected = (displayNum, quadrant) => {
        const fdiNum = (quadrant * 10) + displayNum;
        return selectedTeeth.includes(fdiNum.toString()) || 
               selectedTeeth.includes(displayNum.toString());
    };

    const renderTooth = (displayNum, quadrant) => {
        const isSelected = isToothSelected(displayNum, quadrant);
        const fdiNum = (quadrant * 10) + displayNum;
        const info = toothInfoMap[fdiNum.toString()] || toothInfoMap[displayNum.toString()] || [];
        
        return (
            <div
                key={`${quadrant}-${displayNum}`}
                className={`tooth-detailed ${isSelected ? 'selected' : ''}`}
            >
                <div className="tooth-icon">
                    {isSelected ? (
                        <div className="tooth-number-label">{displayNum}</div>
                    ) : (
                        <div className="tooth-number-gray">{displayNum}</div>
                    )}
                </div>
                
                {isSelected && info.length > 0 && (
                    <div className="tooth-info-popup">
                        <div className="popup-fdi-number">#{fdiNum}</div>
                        {info.map((item, idx) => (
                            <div key={idx} className="info-item">
                                <div className="prosthesis-name">{item.prosthesisType}</div>
                                {item.shade && (
                                    <div className="shade-info">
                                        <span className="shade-label">Shade</span>
                                        <span className="shade-value">{item.shade}</span>
                                    </div>
                                )}
                                {item.material && (
                                    <div className="material-info">{item.material}</div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="tooth-chart-detailed">
            <div className="chart-header">
                <h3>치아 차트</h3>
                <p className="selected-count">선택된 치아: {selectedTeeth.length}개</p>
            </div>

            <div className="chart-body">
                {/* 상악 */}
                <div className="jaw-section upper">
                    <div className="jaw-label">상악 (Upper)</div>
                    <div className="jaw-container">
                        <div className="teeth-row-detailed right">
                            {upperRight.map(tooth => renderTooth(tooth, 1))}
                        </div>
                        <div className="center-divider"></div>
                        <div className="teeth-row-detailed left">
                            {upperLeft.map(tooth => renderTooth(tooth, 2))}
                        </div>
                    </div>
                </div>

                {/* 하악 */}
                <div className="jaw-section lower">
                    <div className="jaw-container">
                        <div className="teeth-row-detailed right">
                            {lowerRight.map(tooth => renderTooth(tooth, 4))}
                        </div>
                        <div className="center-divider"></div>
                        <div className="teeth-row-detailed left">
                            {lowerLeft.map(tooth => renderTooth(tooth, 3))}
                        </div>
                    </div>
                    <div className="jaw-label">하악 (Lower)</div>
                </div>
            </div>

            {/* 선택된 치아 상세 정보 */}
            {selectedTeeth.length > 0 && (
                <div className="selected-teeth-details">
                    <h4>선택된 치아 상세</h4>
                    <div className="teeth-details-grid">
                        {selectedTeeth.map(toothNum => {
                            const info = toothInfoMap[toothNum] || [];
                            // FDI 번호에서 1자리 숫자 추출 (표시용)
                            const displayNum = toothNum.toString().length === 2 
                                ? toothNum.toString()[1] 
                                : toothNum;
                                
                            return (
                                <div key={toothNum} className="tooth-detail-card">
                                    <div className="tooth-detail-header">
                                        <span className="tooth-icon-small">🦷</span>
                                        <span className="tooth-number-big">#{toothNum}</span>
                                        <span className="tooth-display-num">({displayNum})</span>
                                    </div>
                                    {info.map((item, idx) => (
                                        <div key={idx} className="tooth-detail-body">
                                            <div className="detail-row">
                                                <span className="detail-label">보철물:</span>
                                                <span className="detail-value">{item.prosthesisType}</span>
                                            </div>
                                            {item.shade && (
                                                <div className="detail-row">
                                                    <span className="detail-label">Shade:</span>
                                                    <span className="detail-value shade">{item.shade}</span>
                                                </div>
                                            )}
                                            {item.material && (
                                                <div className="detail-row">
                                                    <span className="detail-label">재료:</span>
                                                    <span className="detail-value">{item.material}</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

export { ToothChartMini, ToothChartDetailed };