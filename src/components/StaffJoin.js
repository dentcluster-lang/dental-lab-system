import React, { useState, useEffect, useMemo } from 'react';
import {
    collection, query, where, getDocs, doc, getDoc
} from 'firebase/firestore';
import { db } from '../firebase/config';
import {
    BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    LineChart, Line, Area, AreaChart
} from 'recharts';
import {
    TrendingUp, TrendingDown, Package, AlertTriangle,
    DollarSign, RefreshCw, Download,
    Activity, Award, Users, Calendar
} from 'lucide-react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { ko } from 'date-fns/locale';
import './Statistics.css';

function Statistics({ user }) {
    // 🎯 상태 관리
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState({
        startDate: new Date(new Date().setMonth(new Date().getMonth() - 3)),
        endDate: new Date()
    });
    const [selectedPeriod, setSelectedPeriod] = useState('month');
    const [selectedPartner, setSelectedPartner] = useState('all');

    // 📊 데이터
    const [statements, setStatements] = useState([]);
    const [partners, setPartners] = useState([]);

    // 📈 데이터 로드
    useEffect(() => {
        if (user) {
            loadAllData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, dateRange.startDate, dateRange.endDate]);

    // 🔧 전체 데이터 로드
    const loadAllData = async () => {
        setLoading(true);
        try {
            await Promise.all([
                loadPartners(),
                loadStatements()
            ]);
        } catch (error) {
            console.error('데이터 로드 실패:', error);
            alert('데이터를 불러오는데 실패했습니다: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    // 🏢 거래처 목록 로드
    const loadPartners = async () => {
        try {
            const partnersMap = new Map();
            const connectionsQuery = query(
                collection(db, 'connections'),
                where('status', '==', 'accepted')
            );
            const connectionsSnapshot = await getDocs(connectionsQuery);
            
            for (const docSnap of connectionsSnapshot.docs) {
                const connection = docSnap.data();
                
                if (connection.requesterId === user.uid && connection.receiverId) {
                    try {
                        const userDoc = await getDoc(doc(db, 'users', connection.receiverId));
                        if (userDoc.exists()) {
                            const userData = userDoc.data();
                            partnersMap.set(connection.receiverId, {
                                id: connection.receiverId,
                                name: userData.businessName || userData.companyName || userData.name || '이름 없음'
                            });
                        }
                    } catch (error) {
                        console.error('파트너 정보 조회 실패:', error);
                    }
                }
                
                if (connection.receiverId === user.uid && connection.requesterId) {
                    try {
                        const userDoc = await getDoc(doc(db, 'users', connection.requesterId));
                        if (userDoc.exists()) {
                            const userData = userDoc.data();
                            partnersMap.set(connection.requesterId, {
                                id: connection.requesterId,
                                name: userData.businessName || userData.companyName || userData.name || '이름 없음'
                            });
                        }
                    } catch (error) {
                        console.error('파트너 정보 조회 실패:', error);
                    }
                }
            }
            
            setPartners(Array.from(partnersMap.values()));
            console.log('거래처 목록 로드 완료:', partnersMap.size);
        } catch (error) {
            console.error('거래처 로드 실패:', error);
        }
    };

    // 📈 거래명세서 데이터 로드
    const loadStatements = async () => {
        try {
            console.log('거래명세서 로드 시작...');

            const statementsRef = collection(db, 'transactionStatements');
            
            // 내가 발행한 거래명세서
            const sentQuery = query(statementsRef, where('fromUserId', '==', user.uid));
            // 내가 받은 거래명세서
            const receivedQuery = query(statementsRef, where('toUserId', '==', user.uid));

            const [sentSnapshot, receivedSnapshot] = await Promise.all([
                getDocs(sentQuery),
                getDocs(receivedQuery)
            ]);

            const allStatements = [
                ...sentSnapshot.docs.map(doc => ({ 
                    id: doc.id, 
                    ...doc.data(), 
                    type: 'sent' 
                })),
                ...receivedSnapshot.docs.map(doc => ({ 
                    id: doc.id, 
                    ...doc.data(), 
                    type: 'received' 
                }))
            ];

            console.log('전체 거래명세서 수:', allStatements.length);

            // 날짜 필터링
            const filteredStatements = allStatements.filter(statement => {
                if (!statement.createdAt) return false;
                const statementDate = statement.createdAt.toDate ? 
                    statement.createdAt.toDate() : 
                    new Date(statement.createdAt);
                return statementDate >= dateRange.startDate && statementDate <= dateRange.endDate;
            });

            console.log('날짜 필터링 후:', filteredStatements.length);

            // 날짜순 정렬
            filteredStatements.sort((a, b) => {
                const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
                const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
                return dateB - dateA;
            });

            setStatements(filteredStatements);

        } catch (error) {
            console.error('거래명세서 로드 실패:', error);
            alert('거래명세서를 불러오는데 실패했습니다: ' + error.message);
        }
    };

    // 📊 필터링된 거래명세서 (useMemo로 최적화)
    const filteredStatements = useMemo(() => {
        if (selectedPartner === 'all') return statements;
        
        return statements.filter(statement => {
            const partnerId = statement.type === 'sent' ? statement.toUserId : statement.fromUserId;
            return partnerId === selectedPartner;
        });
    }, [statements, selectedPartner]);

    // 📊 통계 계산 (useMemo로 최적화)
    const stats = useMemo(() => {
        const totalRevenue = filteredStatements.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
        const totalTeeth = filteredStatements.reduce((sum, s) => sum + (s.totalTeeth || 0), 0);
        const totalItems = filteredStatements.reduce((sum, s) => sum + (s.items?.length || 0), 0);

        // 리메이크 통계 계산
        let totalItemsCount = 0;
        let remakeItemsCount = 0;
        
        filteredStatements.forEach(statement => {
            if (statement.items && Array.isArray(statement.items)) {
                statement.items.forEach(item => {
                    totalItemsCount++;
                    if (item.isRemake === true) {
                        remakeItemsCount++;
                    }
                });
            }
        });

        const remakeRate = totalItemsCount > 0 
            ? (remakeItemsCount / totalItemsCount * 100).toFixed(1)
            : 0;

        // 이전 기간 데이터 계산 (성장률)
        const periodLength = dateRange.endDate - dateRange.startDate;
        const previousStart = new Date(dateRange.startDate.getTime() - periodLength);
        const previousEnd = new Date(dateRange.startDate.getTime());

        const previousStatements = statements.filter(s => {
            if (!s.createdAt) return false;
            const date = s.createdAt.toDate ? s.createdAt.toDate() : new Date(s.createdAt);
            return date >= previousStart && date < previousEnd;
        });

        const previousRevenue = previousStatements.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
        const previousCount = previousStatements.length;

        const revenueGrowth = previousRevenue > 0 
            ? ((totalRevenue - previousRevenue) / previousRevenue * 100).toFixed(1)
            : 0;
        
        const countGrowth = previousCount > 0
            ? ((filteredStatements.length - previousCount) / previousCount * 100).toFixed(1)
            : 0;

        return {
            totalRevenue,
            totalStatements: filteredStatements.length,
            totalTeeth,
            totalItems,
            totalItemsCount,
            remakeItemsCount,
            remakeRate: parseFloat(remakeRate),
            avgAmount: filteredStatements.length > 0 ? totalRevenue / filteredStatements.length : 0,
            avgTeethPerStatement: filteredStatements.length > 0 ? totalTeeth / filteredStatements.length : 0,
            revenueGrowth: parseFloat(revenueGrowth),
            countGrowth: parseFloat(countGrowth)
        };
    }, [filteredStatements, statements, dateRange]);

    // 📈 기간별 매출 데이터
    const periodData = useMemo(() => {
        const data = {};

        filteredStatements.forEach(statement => {
            const date = statement.createdAt?.toDate() || new Date();
            let key;

            switch (selectedPeriod) {
                case 'day':
                    key = date.toLocaleDateString('ko-KR');
                    break;
                case 'week':
                    const weekStart = new Date(date);
                    weekStart.setDate(date.getDate() - date.getDay());
                    key = weekStart.toLocaleDateString('ko-KR');
                    break;
                case 'month':
                    key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                    break;
                case 'year':
                    key = String(date.getFullYear());
                    break;
                default:
                    key = date.toLocaleDateString('ko-KR');
            }

            if (!data[key]) {
                data[key] = { 
                    period: key, 
                    revenue: 0, 
                    count: 0,
                    teeth: 0
                };
            }

            data[key].revenue += statement.totalAmount || 0;
            data[key].count += 1;
            data[key].teeth += statement.totalTeeth || 0;
        });

        return Object.values(data).sort((a, b) => a.period.localeCompare(b.period));
    }, [filteredStatements, selectedPeriod]);

    // 🏢 거래처별 통계
    const partnerStats = useMemo(() => {
        const stats = {};

        filteredStatements.forEach(statement => {
            const partnerId = statement.type === 'sent' ? statement.toUserId : statement.fromUserId;
            const partnerName = statement.type === 'sent' ? statement.toUserName : statement.fromUserName;

            if (!partnerId) return;

            if (!stats[partnerId]) {
                stats[partnerId] = {
                    id: partnerId,
                    name: partnerName || '미지정',
                    revenue: 0,
                    count: 0,
                    teeth: 0,
                    items: 0,
                    totalItemsCount: 0,
                    remakeItemsCount: 0,
                    remakeRate: 0
                };
            }

            stats[partnerId].revenue += statement.totalAmount || 0;
            stats[partnerId].count += 1;
            stats[partnerId].teeth += statement.totalTeeth || 0;
            stats[partnerId].items += statement.items?.length || 0;

            // 리메이크 카운트
            if (statement.items && Array.isArray(statement.items)) {
                statement.items.forEach(item => {
                    stats[partnerId].totalItemsCount++;
                    if (item.isRemake === true) {
                        stats[partnerId].remakeItemsCount++;
                    }
                });
            }
        });

        // 리메이크율 계산
        Object.values(stats).forEach(stat => {
            if (stat.totalItemsCount > 0) {
                stat.remakeRate = parseFloat((stat.remakeItemsCount / stat.totalItemsCount * 100).toFixed(1));
            }
        });

        return Object.values(stats)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10);
    }, [filteredStatements]);

    // 🔄 리메이크 사유 분석
    const remakeAnalysis = useMemo(() => {
        const reasonStats = {};
        let totalRemakes = 0;

        filteredStatements.forEach(statement => {
            if (statement.items && Array.isArray(statement.items)) {
                statement.items.forEach(item => {
                    if (item.isRemake === true) {
                        totalRemakes++;
                        const reason = item.remakeReason || '사유 미기재';
                        reasonStats[reason] = (reasonStats[reason] || 0) + 1;
                    }
                });
            }
        });

        const reasonList = Object.entries(reasonStats)
            .map(([reason, count]) => ({
                reason,
                count,
                percentage: totalRemakes > 0 ? (count / totalRemakes * 100).toFixed(1) : 0
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        return reasonList;
    }, [filteredStatements]);

    // 🏆 업체별 리메이크율 순위 (높은 순)
    const partnerRemakeRanking = useMemo(() => {
        return [...partnerStats]
            .filter(p => p.totalItemsCount >= 5) // 최소 5건 이상만
            .sort((a, b) => b.remakeRate - a.remakeRate)
            .slice(0, 10);
    }, [partnerStats]);

    // 📊 발행/수신 통계
    const typeStats = useMemo(() => {
        const sent = filteredStatements.filter(s => s.type === 'sent');
        const received = filteredStatements.filter(s => s.type === 'received');

        return [
            { 
                name: '발행', 
                value: sent.length,
                revenue: sent.reduce((sum, s) => sum + (s.totalAmount || 0), 0),
                color: '#6366f1' 
            },
            { 
                name: '수신', 
                value: received.length,
                revenue: received.reduce((sum, s) => sum + (s.totalAmount || 0), 0),
                color: '#10b981' 
            }
        ];
    }, [filteredStatements]);

    // 💾 엑셀 다운로드
    const exportToExcel = () => {
        try {
            let csv = '날짜,발행/수신,상대방,항목수,치아개수,금액,메모\n';
            
            filteredStatements.forEach(statement => {
                const date = statement.createdAt?.toDate().toLocaleDateString('ko-KR') || '-';
                const type = statement.type === 'sent' ? '발행' : '수신';
                const partnerName = statement.type === 'sent' ? 
                    (statement.toUserName || '-') : 
                    (statement.fromUserName || '-');
                const itemCount = statement.items?.length || 0;
                const teethCount = statement.totalTeeth || 0;
                const amount = statement.totalAmount || 0;
                const notes = (statement.notes || '').replace(/,/g, ';');

                csv += `${date},${type},${partnerName},${itemCount},${teethCount},${amount},"${notes}"\n`;
            });

            // 통계 요약 추가
            csv += '\n통계 요약\n';
            csv += `총 거래명세서,${stats.totalStatements}건\n`;
            csv += `총 매출,${stats.totalRevenue}원\n`;
            csv += `총 치아 개수,${stats.totalTeeth}개\n`;
            csv += `평균 금액,${Math.round(stats.avgAmount)}원\n`;

            const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `거래통계_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('엑셀 다운로드 실패:', error);
            alert('엑셀 다운로드에 실패했습니다.');
        }
    };

    // 🎨 숫자 포맷팅
    const formatNumber = (num) => {
        return new Intl.NumberFormat('ko-KR').format(Math.round(num));
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('ko-KR', {
            style: 'currency',
            currency: 'KRW'
        }).format(Math.round(amount));
    };

    // 🎨 커스텀 툴팁
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="custom-tooltip">
                    <p className="label">{label}</p>
                    {payload.map((entry, index) => (
                        <p key={index} style={{ color: entry.color }}>
                            {entry.name}: {entry.name.includes('매출') || entry.name.includes('금액') ?
                                formatCurrency(entry.value) :
                                formatNumber(entry.value) + (entry.name.includes('치아') ? '개' : '건')}
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    // 🎨 색상 팔레트
    const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#fbbf24', '#84cc16', '#10b981'];

    return (
        <div className="statistics-container">
            {/* 헤더 */}
            <div className="statistics-header">
                <div className="header-content">
                    <h1>📊 거래 통계</h1>
                    <p>거래명세서 기반 매출 및 거래 현황 분석</p>
                </div>

                <div className="header-actions">
                    <button onClick={loadAllData} className="btn-refresh" disabled={loading}>
                        <RefreshCw size={18} />
                        새로고침
                    </button>
                    <button 
                        onClick={exportToExcel} 
                        className="btn-export" 
                        disabled={loading || filteredStatements.length === 0}
                    >
                        <Download size={18} />
                        엑셀 다운로드
                    </button>
                </div>
            </div>

            {/* 필터 섹션 */}
            <div className="filter-section">
                <div className="filter-group">
                    <label>📅 기간 선택</label>
                    <div className="date-range-picker">
                        <DatePicker
                            selected={dateRange.startDate}
                            onChange={date => setDateRange(prev => ({ ...prev, startDate: date }))}
                            selectsStart
                            startDate={dateRange.startDate}
                            endDate={dateRange.endDate}
                            locale={ko}
                            dateFormat="yyyy-MM-dd"
                            className="date-input"
                        />
                        <span>~</span>
                        <DatePicker
                            selected={dateRange.endDate}
                            onChange={date => setDateRange(prev => ({ ...prev, endDate: date }))}
                            selectsEnd
                            startDate={dateRange.startDate}
                            endDate={dateRange.endDate}
                            minDate={dateRange.startDate}
                            locale={ko}
                            dateFormat="yyyy-MM-dd"
                            className="date-input"
                        />
                    </div>
                </div>

                <div className="filter-group">
                    <label>📈 집계 단위</label>
                    <select
                        value={selectedPeriod}
                        onChange={(e) => setSelectedPeriod(e.target.value)}
                        className="filter-select"
                    >
                        <option value="day">일별</option>
                        <option value="week">주별</option>
                        <option value="month">월별</option>
                        <option value="year">년별</option>
                    </select>
                </div>

                <div className="filter-group">
                    <label>🏢 거래처 필터</label>
                    <select
                        value={selectedPartner}
                        onChange={(e) => setSelectedPartner(e.target.value)}
                        className="filter-select"
                    >
                        <option value="all">전체 거래처 ({partners.length})</option>
                        {partners.map(partner => (
                            <option key={partner.id} value={partner.id}>
                                {partner.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p>데이터를 불러오는 중...</p>
                </div>
            ) : filteredStatements.length === 0 ? (
                <div className="empty-state">
                    <Package size={64} color="#cbd5e1" />
                    <h3>데이터가 없습니다</h3>
                    <p>선택한 기간에 거래명세서가 없습니다.</p>
                    <button onClick={() => {
                        setDateRange({
                            startDate: new Date(new Date().setMonth(new Date().getMonth() - 3)),
                            endDate: new Date()
                        });
                        setSelectedPartner('all');
                    }} className="btn-reset">
                        필터 초기화
                    </button>
                </div>
            ) : (
                <>
                    {/* 📊 핵심 지표 카드 */}
                    <div className="stats-cards">
                        <div className="stat-card revenue">
                            <div className="stat-icon">
                                <DollarSign size={24} />
                            </div>
                            <div className="stat-content">
                                <div className="stat-label">총 매출</div>
                                <div className="stat-value">{formatCurrency(stats.totalRevenue)}</div>
                                <div className="stat-sub">
                                    {stats.revenueGrowth !== 0 && (
                                        <span className={stats.revenueGrowth > 0 ? 'growth-up' : 'growth-down'}>
                                            {stats.revenueGrowth > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                            {Math.abs(stats.revenueGrowth)}% (전 기간 대비)
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="stat-card statements">
                            <div className="stat-icon">
                                <Package size={24} />
                            </div>
                            <div className="stat-content">
                                <div className="stat-label">거래명세서</div>
                                <div className="stat-value">{formatNumber(stats.totalStatements)}건</div>
                                <div className="stat-sub">
                                    평균 {formatCurrency(stats.avgAmount)}
                                </div>
                            </div>
                        </div>

                        <div className="stat-card teeth">
                            <div className="stat-icon">
                                <Activity size={24} />
                            </div>
                            <div className="stat-content">
                                <div className="stat-label">총 치아 개수</div>
                                <div className="stat-value">{formatNumber(stats.totalTeeth)}개</div>
                                <div className="stat-sub">
                                    명세서당 평균 {stats.avgTeethPerStatement.toFixed(1)}개
                                </div>
                            </div>
                        </div>

                        <div className="stat-card remake">
                            <div className="stat-icon">
                                <RefreshCw size={24} />
                            </div>
                            <div className="stat-content">
                                <div className="stat-label">리메이크율</div>
                                <div className="stat-value">{stats.remakeRate}%</div>
                                <div className="stat-sub">
                                    {stats.remakeItemsCount}건 / {stats.totalItemsCount}건
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 차트 섹션 */}
                    <div className="charts-grid">
                        {/* 매출 추이 차트 */}
                        <div className="chart-card full-width">
                            <div className="chart-header">
                                <h3>📈 매출 추이</h3>
                                <div className="chart-legend">
                                    <span className="legend-item">
                                        <span className="legend-dot revenue"></span>매출
                                    </span>
                                    <span className="legend-item">
                                        <span className="legend-dot orders"></span>거래 건수
                                    </span>
                                </div>
                            </div>
                            <ResponsiveContainer width="100%" height={300}>
                                <AreaChart data={periodData}>
                                    <defs>
                                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="period" />
                                    <YAxis yAxisId="left" />
                                    <YAxis yAxisId="right" orientation="right" />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Area
                                        yAxisId="left"
                                        type="monotone"
                                        dataKey="revenue"
                                        stroke="#6366f1"
                                        fillOpacity={1}
                                        fill="url(#colorRevenue)"
                                        name="매출"
                                    />
                                    <Line
                                        yAxisId="right"
                                        type="monotone"
                                        dataKey="count"
                                        stroke="#ec4899"
                                        strokeWidth={2}
                                        name="거래 건수"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>

                        {/* 발행/수신 비율 */}
                        <div className="chart-card">
                            <div className="chart-header">
                                <h3>📊 발행/수신 현황</h3>
                            </div>
                            <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                    <Pie
                                        data={typeStats}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {typeStats.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="type-stats-details">
                                {typeStats.map((stat, idx) => (
                                    <div key={idx} className="type-stat-item">
                                        <span style={{ color: stat.color }}>● {stat.name}</span>
                                        <span>{stat.value}건</span>
                                        <span>{formatCurrency(stat.revenue)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 거래처별 매출 TOP 10 */}
                        {partnerStats.length > 0 && (
                            <div className="chart-card">
                                <div className="chart-header">
                                    <h3>🏆 거래처별 매출 TOP 10</h3>
                                </div>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart
                                        data={partnerStats}
                                        layout="vertical"
                                        margin={{ left: 20, right: 20 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis type="number" />
                                        <YAxis dataKey="name" type="category" width={100} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Bar 
                                            dataKey="revenue" 
                                            fill="#6366f1" 
                                            radius={[0, 8, 8, 0]}
                                            name="매출"
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}

                        {/* 거래처별 거래 건수 */}
                        {partnerStats.length > 0 && (
                            <div className="chart-card">
                                <div className="chart-header">
                                    <h3>📦 거래처별 거래 건수</h3>
                                </div>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={partnerStats.slice(0, 10)}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis 
                                            dataKey="name" 
                                            angle={-45}
                                            textAnchor="end"
                                            height={100}
                                        />
                                        <YAxis />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Bar 
                                            dataKey="count" 
                                            fill="#10b981" 
                                            radius={[8, 8, 0, 0]}
                                            name="거래 건수"
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>

                    {/* 상세 통계 테이블 */}
                    <div className="detailed-stats">
                        <h3>📋 거래처별 상세 통계</h3>
                        <div className="stats-table-container">
                            <table className="stats-table">
                                <thead>
                                    <tr>
                                        <th>순위</th>
                                        <th>거래처명</th>
                                        <th>거래 건수</th>
                                        <th>총 매출</th>
                                        <th>평균 금액</th>
                                        <th>총 치아 개수</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {partnerStats.map((partner, idx) => (
                                        <tr key={partner.id}>
                                            <td className="rank">#{idx + 1}</td>
                                            <td className="partner-name">{partner.name}</td>
                                            <td>{formatNumber(partner.count)}건</td>
                                            <td className="revenue">{formatCurrency(partner.revenue)}</td>
                                            <td>{formatCurrency(partner.revenue / partner.count)}</td>
                                            <td>{formatNumber(partner.teeth)}개</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* 인사이트 섹션 */}
                    <div className="insights-section">
                        <h3>💡 비즈니스 인사이트</h3>
                        <div className="insights-grid">
                            <div className="insight-card">
                                <Award className="insight-icon" />
                                <div className="insight-content">
                                    <h4>최우수 거래처</h4>
                                    <p>{partnerStats[0]?.name || '없음'}</p>
                                    <span className="insight-value">
                                        {formatCurrency(partnerStats[0]?.revenue || 0)}
                                    </span>
                                </div>
                            </div>

                            <div className="insight-card success">
                                <TrendingUp className="insight-icon" />
                                <div className="insight-content">
                                    <h4>기간 내 총 거래</h4>
                                    <p>{formatNumber(stats.totalStatements)}건</p>
                                    <span className="insight-value">
                                        {stats.countGrowth !== 0 && (
                                            <>
                                                {stats.countGrowth > 0 ? '+' : ''}{stats.countGrowth}% (전 기간 대비)
                                            </>
                                        )}
                                    </span>
                                </div>
                            </div>

                            <div className="insight-card info">
                                <Calendar className="insight-icon" />
                                <div className="insight-content">
                                    <h4>일평균 매출</h4>
                                    <p>
                                        {formatCurrency(
                                            stats.totalRevenue / Math.max(1, Math.ceil((dateRange.endDate - dateRange.startDate) / (1000 * 60 * 60 * 24)))
                                        )}
                                    </p>
                                    <span className="insight-value">
                                        일평균 {(stats.totalStatements / Math.max(1, Math.ceil((dateRange.endDate - dateRange.startDate) / (1000 * 60 * 60 * 24)))).toFixed(1)}건
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

export default Statistics;