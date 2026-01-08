// FeatureGate component - Conditional rendering based on feature flags

import { useFeatureEnabled } from '@/stores';
import type { ReactNode } from 'react';

interface FeatureGateProps {
    /** Feature key to check */
    feature: string;

    /** Content to render when feature is enabled */
    children: ReactNode;

    /** Optional fallback content when feature is disabled */
    fallback?: ReactNode;
}

/**
 * Conditionally render content based on feature flag
 * 
 * @example
 * ```tsx
 * <FeatureGate feature="draw_tools">
 *   <DrawToolbar />
 * </FeatureGate>
 * 
 * <FeatureGate feature="experimental_feature" fallback={<ComingSoon />}>
 *   <ExperimentalComponent />
 * </FeatureGate>
 * ```
 */
export function FeatureGate({ feature, children, fallback = null }: FeatureGateProps) {
    const isEnabled = useFeatureEnabled(feature);

    if (!isEnabled) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
}

/**
 * Hook version for more complex conditional logic
 */
export function useFeatureGate(feature: string): boolean {
    return useFeatureEnabled(feature);
}

export default FeatureGate;
