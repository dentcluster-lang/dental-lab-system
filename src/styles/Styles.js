// =====================================
// 📌 색상 (Colors)
// =====================================

export const colors = {
    // Primary
    primary: '#6366f1',
    primaryHover: '#4f46e5',
    primaryLight: '#eef2ff',
    primaryDark: '#4338ca',

    // Success
    success: '#10b981',
    successHover: '#059669',
    successLight: '#d1fae5',
    successDark: '#047857',

    // Error
    error: '#ef4444',
    errorHover: '#dc2626',
    errorLight: '#fee2e2',
    errorDark: '#b91c1c',

    // Warning
    warning: '#f59e0b',
    warningHover: '#d97706',
    warningLight: '#fef3c7',
    warningDark: '#b45309',

    // Info
    info: '#3b82f6',
    infoHover: '#2563eb',
    infoLight: '#dbeafe',
    infoDark: '#1e40af',

    // Neutral
    gray50: '#f9fafb',
    gray100: '#f3f4f6',
    gray200: '#e5e7eb',
    gray300: '#d1d5db',
    gray400: '#9ca3af',
    gray500: '#6b7280',
    gray600: '#4b5563',
    gray700: '#374151',
    gray800: '#1f2937',
    gray900: '#111827',

    // Text
    textPrimary: '#1e293b',
    textSecondary: '#64748b',
    textTertiary: '#94a3b8',

    // Background
    bgPrimary: '#ffffff',
    bgSecondary: '#f8fafc',
    bgTertiary: '#f1f5f9',

    // Border
    border: '#e2e8f0',
    borderLight: '#f1f5f9',
    borderDark: '#cbd5e1',
};

// =====================================
// 📌 타이포그래피
// =====================================

export const typography = {
    // Font Family
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',

    // Font Sizes
    fontSize: {
        xs: '12px',
        sm: '14px',
        base: '16px',
        lg: '18px',
        xl: '20px',
        '2xl': '24px',
        '3xl': '30px',
        '4xl': '36px',
    },

    // Font Weights
    fontWeight: {
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
    },

    // Line Heights
    lineHeight: {
        tight: '1.25',
        normal: '1.5',
        relaxed: '1.75',
    }
};

// =====================================
// 📌 간격 (Spacing)
// =====================================

export const spacing = {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    '2xl': '24px',
    '3xl': '32px',
    '4xl': '40px',
    '5xl': '48px',
};

// =====================================
// 📌 Border Radius
// =====================================

export const borderRadius = {
    sm: '6px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '9999px',
};

// =====================================
// 📌 Shadow
// =====================================

export const shadows = {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
};

// =====================================
// 📌 공통 컴포넌트 스타일
// =====================================

export const commonStyles = {
    // 페이지 컨테이너
    container: {
        maxWidth: '1400px',
        margin: '0 auto',
        padding: spacing['3xl'],
        backgroundColor: colors.bgSecondary,
        minHeight: '100vh',
    },

    // 카드
    card: {
        backgroundColor: colors.bgPrimary,
        borderRadius: borderRadius.lg,
        padding: spacing['2xl'],
        boxShadow: shadows.base,
        border: `1px solid ${colors.border}`,
    },

    // 헤더
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: spacing['3xl'],
        gap: spacing.lg,
    },

    // 제목
    title: {
        fontSize: typography.fontSize['3xl'],
        fontWeight: typography.fontWeight.bold,
        color: colors.textPrimary,
        margin: 0,
        display: 'flex',
        alignItems: 'center',
        gap: spacing.md,
    },

    subtitle: {
        fontSize: typography.fontSize.base,
        color: colors.textSecondary,
        margin: `${spacing.sm} 0 0 0`,
    },

    // 섹션
    section: {
        backgroundColor: colors.bgPrimary,
        borderRadius: borderRadius.lg,
        padding: spacing['2xl'],
        marginBottom: spacing['2xl'],
        boxShadow: shadows.base,
    },

    sectionTitle: {
        fontSize: typography.fontSize.xl,
        fontWeight: typography.fontWeight.semibold,
        color: colors.textPrimary,
        marginBottom: spacing.lg,
    },

    sectionDesc: {
        fontSize: typography.fontSize.sm,
        color: colors.textSecondary,
        marginTop: spacing.xs,
    },

    // 버튼 - Primary
    buttonPrimary: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        padding: `${spacing.md} ${spacing.xl}`,
        backgroundColor: colors.primary,
        color: colors.bgPrimary,
        border: 'none',
        borderRadius: borderRadius.md,
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.semibold,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        boxShadow: shadows.sm,
    },

    buttonPrimaryHover: {
        backgroundColor: colors.primaryHover,
        transform: 'translateY(-1px)',
        boxShadow: shadows.md,
    },

    // 버튼 - Secondary
    buttonSecondary: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        padding: `${spacing.md} ${spacing.xl}`,
        backgroundColor: colors.bgPrimary,
        color: colors.primary,
        border: `2px solid ${colors.primary}`,
        borderRadius: borderRadius.md,
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.semibold,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
    },

    buttonSecondaryHover: {
        backgroundColor: colors.primaryLight,
        transform: 'translateY(-1px)',
    },

    // 버튼 - Success
    buttonSuccess: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        padding: `${spacing.md} ${spacing.xl}`,
        backgroundColor: colors.success,
        color: colors.bgPrimary,
        border: 'none',
        borderRadius: borderRadius.md,
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.semibold,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
    },

    // 버튼 - Danger
    buttonDanger: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        padding: `${spacing.md} ${spacing.xl}`,
        backgroundColor: colors.error,
        color: colors.bgPrimary,
        border: 'none',
        borderRadius: borderRadius.md,
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.semibold,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
    },

    // 버튼 - Ghost
    buttonGhost: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        padding: `${spacing.md} ${spacing.xl}`,
        backgroundColor: 'transparent',
        color: colors.textSecondary,
        border: `1px solid ${colors.border}`,
        borderRadius: borderRadius.md,
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.medium,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
    },

    // Input
    input: {
        width: '100%',
        padding: `${spacing.md} ${spacing.lg}`,
        fontSize: typography.fontSize.sm,
        border: `1px solid ${colors.border}`,
        borderRadius: borderRadius.md,
        backgroundColor: colors.bgPrimary,
        color: colors.textPrimary,
        transition: 'all 0.2s ease',
        outline: 'none',
    },

    inputFocus: {
        borderColor: colors.primary,
        boxShadow: `0 0 0 3px ${colors.primaryLight}`,
    },

    // Textarea
    textarea: {
        width: '100%',
        padding: `${spacing.md} ${spacing.lg}`,
        fontSize: typography.fontSize.sm,
        border: `1px solid ${colors.border}`,
        borderRadius: borderRadius.md,
        backgroundColor: colors.bgPrimary,
        color: colors.textPrimary,
        fontFamily: typography.fontFamily,
        resize: 'vertical',
        minHeight: '100px',
        transition: 'all 0.2s ease',
        outline: 'none',
    },

    // Badge
    badge: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: spacing.xs,
        padding: `${spacing.xs} ${spacing.md}`,
        borderRadius: borderRadius.full,
        fontSize: typography.fontSize.xs,
        fontWeight: typography.fontWeight.semibold,
    },

    badgeSuccess: {
        backgroundColor: colors.successLight,
        color: colors.successDark,
    },

    badgeWarning: {
        backgroundColor: colors.warningLight,
        color: colors.warningDark,
    },

    badgeError: {
        backgroundColor: colors.errorLight,
        color: colors.errorDark,
    },

    badgeInfo: {
        backgroundColor: colors.infoLight,
        color: colors.infoDark,
    },

    // 모달
    modal: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 1000,
        padding: spacing['2xl'],
    },

    modalContent: {
        backgroundColor: colors.bgPrimary,
        borderRadius: borderRadius.xl,
        width: '90%',
        maxWidth: '600px',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: shadows.xl,
    },

    modalHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: spacing['2xl'],
        borderBottom: `1px solid ${colors.border}`,
    },

    modalTitle: {
        fontSize: typography.fontSize.xl,
        fontWeight: typography.fontWeight.bold,
        color: colors.textPrimary,
        margin: 0,
    },

    modalBody: {
        padding: spacing['2xl'],
    },

    modalFooter: {
        display: 'flex',
        gap: spacing.md,
        justifyContent: 'flex-end',
        padding: spacing['2xl'],
        borderTop: `1px solid ${colors.border}`,
    },

    // 메시지 박스
    messageBox: {
        display: 'flex',
        alignItems: 'center',
        gap: spacing.md,
        padding: spacing.lg,
        borderRadius: borderRadius.md,
        fontSize: typography.fontSize.sm,
        marginBottom: spacing.lg,
    },

    messageSuccess: {
        backgroundColor: colors.successLight,
        color: colors.successDark,
        border: `1px solid ${colors.success}`,
    },

    messageError: {
        backgroundColor: colors.errorLight,
        color: colors.errorDark,
        border: `1px solid ${colors.error}`,
    },

    messageWarning: {
        backgroundColor: colors.warningLight,
        color: colors.warningDark,
        border: `1px solid ${colors.warning}`,
    },

    messageInfo: {
        backgroundColor: colors.infoLight,
        color: colors.infoDark,
        border: `1px solid ${colors.info}`,
    },

    // 로딩
    loading: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
        gap: spacing.lg,
    },

    spinner: {
        width: '40px',
        height: '40px',
        border: `4px solid ${colors.primaryLight}`,
        borderTop: `4px solid ${colors.primary}`,
        borderRadius: borderRadius.full,
        animation: 'spin 1s linear infinite',
    },

    // 빈 상태
    emptyState: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing['5xl'],
        textAlign: 'center',
        gap: spacing.lg,
    },

    emptyStateText: {
        fontSize: typography.fontSize.lg,
        fontWeight: typography.fontWeight.semibold,
        color: colors.textPrimary,
        margin: 0,
    },

    emptyStateSubtext: {
        fontSize: typography.fontSize.sm,
        color: colors.textSecondary,
        margin: 0,
    },
};

// =====================================
// 📌 애니메이션
// =====================================

export const animations = `
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
    
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    
    @keyframes slideUp {
        from { 
            opacity: 0; 
            transform: translateY(10px); 
        }
        to { 
            opacity: 1; 
            transform: translateY(0); 
        }
    }
    
    @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
    }
`;

// =====================================
// 📌 반응형 브레이크포인트
// =====================================

export const breakpoints = {
    mobile: '640px',
    tablet: '768px',
    desktop: '1024px',
    wide: '1280px',
};

// =====================================
// 📌 Export 기본값
// =====================================

const StylesExport = {
    colors,
    typography,
    spacing,
    borderRadius,
    shadows,
    commonStyles,
    animations,
    breakpoints,
};

export default StylesExport;