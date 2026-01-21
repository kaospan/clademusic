/**
 * Harmonic Analysis Status Badge
 * 
 * Shows confidence level and provisional state for harmonic data.
 * Follows UX requirement: clearly label provisional results.
 */

import { motion } from 'framer-motion';
import { Activity, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { HarmonicFingerprint } from '@/types/harmony';
import { getConfidenceLabel } from '@/services/harmonicAnalysis';

interface AnalysisStatusBadgeProps {
  fingerprint?: HarmonicFingerprint | null;
  isAnalyzing?: boolean;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function AnalysisStatusBadge({
  fingerprint,
  isAnalyzing = false,
  showLabel = true,
  size = 'md',
  className,
}: AnalysisStatusBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-sm px-2.5 py-1 gap-1.5',
    lg: 'text-base px-3 py-1.5 gap-2',
  };

  const iconSize = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  // Analyzing state
  if (isAnalyzing) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          'inline-flex items-center rounded-full font-medium',
          'bg-blue-500/10 text-blue-500 border border-blue-500/20',
          sizeClasses[size],
          className
        )}
      >
        <Loader2 className={cn(iconSize[size], 'animate-spin')} />
        {showLabel && <span>Analyzing…</span>}
      </motion.div>
    );
  }

  // No data
  if (!fingerprint) {
    return (
      <div
        className={cn(
          'inline-flex items-center rounded-full font-medium',
          'bg-muted/50 text-muted-foreground',
          sizeClasses[size],
          className
        )}
      >
        <AlertCircle className={iconSize[size]} />
        {showLabel && <span>No Analysis</span>}
      </div>
    );
  }

  const confidence = fingerprint.confidence_score;
  const isProvisional = fingerprint.is_provisional;
  const label = getConfidenceLabel(confidence);

  // High confidence (verified)
  if (confidence >= 0.7 && !isProvisional) {
    return (
      <div
        className={cn(
          'inline-flex items-center rounded-full font-medium',
          'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20',
          sizeClasses[size],
          className
        )}
      >
        <CheckCircle className={iconSize[size]} />
        {showLabel && <span>{label}</span>}
      </div>
    );
  }

  // Medium confidence or provisional
  if (confidence >= 0.5 || isProvisional) {
    return (
      <div
        className={cn(
          'inline-flex items-center rounded-full font-medium',
          'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20',
          sizeClasses[size],
          className
        )}
      >
        <Activity className={iconSize[size]} />
        {showLabel && (
          <span>
            {isProvisional ? 'Provisional' : label}
          </span>
        )}
      </div>
    );
  }

  // Low confidence
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20',
        sizeClasses[size],
        className
      )}
    >
      <AlertCircle className={iconSize[size]} />
      {showLabel && <span>{label}</span>}
    </div>
  );
}

/**
 * Detailed analysis confidence display
 */
interface AnalysisConfidenceDisplayProps {
  fingerprint: HarmonicFingerprint;
  className?: string;
}

export function AnalysisConfidenceDisplay({
  fingerprint,
  className,
}: AnalysisConfidenceDisplayProps) {
  const confidence = fingerprint.confidence_score;
  const percentage = Math.round(confidence * 100);

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Analysis Confidence</span>
        <span className="font-medium">{percentage}%</span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className={cn(
            'h-full rounded-full',
            confidence >= 0.7
              ? 'bg-green-500'
              : confidence >= 0.5
              ? 'bg-yellow-500'
              : 'bg-red-500'
          )}
        />
      </div>

      {/* Provisional warning */}
      {fingerprint.is_provisional && (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <AlertCircle className="w-3 h-3" />
          This analysis is provisional and may be updated as better data becomes available.
        </p>
      )}

      {/* Model version */}
      <p className="text-xs text-muted-foreground">
        Analysis v{fingerprint.analysis_version} •{' '}
        {new Date(fingerprint.analysis_timestamp).toLocaleDateString()}
      </p>
    </div>
  );
}
