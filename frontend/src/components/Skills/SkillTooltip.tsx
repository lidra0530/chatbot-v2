import React from 'react';
import type { SkillNode as SkillNodeType } from './SkillTreeVisualization';

export interface SkillTooltipProps {
  skill: SkillNodeType | null;
  x: number;
  y: number;
  visible: boolean;
  theme?: 'light' | 'dark';
  maxWidth?: number;
  showDetailedInfo?: boolean;
  showPrerequisites?: boolean;
  showEffects?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const SkillTooltip: React.FC<SkillTooltipProps> = ({
  skill,
  x,
  y,
  visible,
  theme = 'light',
  maxWidth = 300,
  showDetailedInfo = true,
  showPrerequisites = true,
  showEffects = true,
  className,
  style,
}) => {
  // Color schemes for themes
  const colors = React.useMemo(() => {
    const base = {
      light: {
        background: '#FFFFFF',
        border: '#CCCCCC',
        shadow: 'rgba(0, 0, 0, 0.15)',
        text: {
          primary: '#333333',
          secondary: '#666666',
          accent: '#2196F3',
          success: '#4CAF50',
          warning: '#FF9800',
          error: '#f44336',
        },
        divider: '#E0E0E0',
        progressBg: '#F5F5F5',
        progressFill: '#4CAF50',
      },
      dark: {
        background: '#2A2A2A',
        border: '#555555',
        shadow: 'rgba(0, 0, 0, 0.3)',
        text: {
          primary: '#FFFFFF',
          secondary: '#CCCCCC',
          accent: '#42A5F5',
          success: '#66BB6A',
          warning: '#FFB74D',
          error: '#EF5350',
        },
        divider: '#444444',
        progressBg: '#404040',
        progressFill: '#66BB6A',
      },
    };
    return base[theme];
  }, [theme]);

  // Calculate progress values
  const progressData = React.useMemo(() => {
    if (!skill) return null;
    
    if (!skill.isUnlocked) {
      return {
        percentage: 0,
        currentExp: 0,
        totalExp: 0,
        expToNext: 0,
        status: 'locked',
      };
    }

    if (skill.level >= skill.maxLevel) {
      return {
        percentage: 100,
        currentExp: skill.experience,
        totalExp: skill.experience,
        expToNext: 0,
        status: 'maxLevel',
      };
    }

    const totalExp = skill.experience + skill.experienceToNext;
    const percentage = totalExp > 0 ? (skill.experience / totalExp) * 100 : 0;

    return {
      percentage,
      currentExp: skill.experience,
      totalExp,
      expToNext: skill.experienceToNext,
      status: 'progress',
    };
  }, [skill]);

  // Position tooltip to avoid screen edges
  const tooltipPosition = React.useMemo(() => {
    const padding = 10;
    const tooltipWidth = maxWidth;
    const tooltipHeight = 200; // Estimated height

    let adjustedX = x;
    let adjustedY = y;

    // Adjust horizontal position
    if (adjustedX + tooltipWidth > window.innerWidth - padding) {
      adjustedX = x - tooltipWidth - padding;
    }

    // Adjust vertical position
    if (adjustedY + tooltipHeight > window.innerHeight - padding) {
      adjustedY = y - tooltipHeight - padding;
    }

    return { x: Math.max(padding, adjustedX), y: Math.max(padding, adjustedY) };
  }, [x, y, maxWidth]);

  if (!visible || !skill) {
    return null;
  }

  const tooltipStyles: React.CSSProperties = {
    position: 'fixed',
    left: tooltipPosition.x,
    top: tooltipPosition.y,
    maxWidth,
    backgroundColor: colors.background,
    border: `1px solid ${colors.border}`,
    borderRadius: '8px',
    padding: '12px',
    fontSize: '12px',
    color: colors.text.primary,
    boxShadow: `0 4px 12px ${colors.shadow}`,
    zIndex: 10000,
    pointerEvents: 'none',
    opacity: visible ? 1 : 0,
    transition: 'opacity 0.2s ease-in-out',
    ...style,
  };

  return (
    <div className={`skill-tooltip ${className || ''}`} style={tooltipStyles}>
      {/* Header */}
      <div style={{ marginBottom: '8px' }}>
        <div
          style={{
            fontSize: '14px',
            fontWeight: 'bold',
            color: colors.text.primary,
            marginBottom: '2px',
          }}
        >
          {skill.name}
        </div>
        <div
          style={{
            fontSize: '10px',
            color: colors.text.secondary,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>Category: {skill.category}</span>
          <span
            style={{
              color: skill.isUnlocked
                ? skill.isActive
                  ? colors.text.accent
                  : colors.text.success
                : colors.text.secondary,
              fontWeight: 'bold',
            }}
          >
            {skill.isUnlocked
              ? skill.isActive
                ? 'Active'
                : 'Unlocked'
              : 'Locked'}
          </span>
        </div>
      </div>

      {/* Divider */}
      <div
        style={{
          height: '1px',
          backgroundColor: colors.divider,
          margin: '8px 0',
        }}
      />

      {/* Level and Progress */}
      <div style={{ marginBottom: '8px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '4px',
          }}
        >
          <span style={{ fontWeight: 'bold' }}>
            Level: {skill.level}/{skill.maxLevel}
          </span>
          {progressData && progressData.status !== 'locked' && (
            <span
              style={{
                color: progressData.status === 'maxLevel' ? colors.text.warning : colors.text.accent,
                fontSize: '10px',
              }}
            >
              {progressData.status === 'maxLevel'
                ? 'MAX'
                : `${Math.round(progressData.percentage)}%`}
            </span>
          )}
        </div>

        {/* Progress bar */}
        {progressData && progressData.status !== 'locked' && (
          <div
            style={{
              width: '100%',
              height: '6px',
              backgroundColor: colors.progressBg,
              borderRadius: '3px',
              overflow: 'hidden',
              marginBottom: '4px',
            }}
          >
            <div
              style={{
                width: `${progressData.percentage}%`,
                height: '100%',
                backgroundColor: progressData.status === 'maxLevel' ? colors.text.warning : colors.progressFill,
                borderRadius: '3px',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        )}

        {/* Experience details */}
        {progressData && showDetailedInfo && (
          <div style={{ fontSize: '10px', color: colors.text.secondary }}>
            {progressData.status === 'locked' && 'Skill is locked'}
            {progressData.status === 'maxLevel' && `Total XP: ${progressData.currentExp}`}
            {progressData.status === 'progress' && (
              <>
                XP: {progressData.currentExp}/{progressData.totalExp}
                {progressData.expToNext > 0 && ` (${progressData.expToNext} to next level)`}
              </>
            )}
          </div>
        )}
      </div>

      {/* Description */}
      <div style={{ marginBottom: '8px' }}>
        <div
          style={{
            fontSize: '11px',
            color: colors.text.primary,
            lineHeight: '1.4',
            fontStyle: 'italic',
          }}
        >
          {skill.description}
        </div>
      </div>

      {/* Prerequisites */}
      {showPrerequisites && skill.prerequisites.length > 0 && (
        <div style={{ marginBottom: '8px' }}>
          <div
            style={{
              fontSize: '10px',
              fontWeight: 'bold',
              color: colors.text.secondary,
              marginBottom: '2px',
            }}
          >
            Prerequisites:
          </div>
          <div style={{ fontSize: '10px', color: colors.text.error }}>
            {skill.prerequisites.join(', ')}
          </div>
        </div>
      )}

      {/* Skill Effects (if available) */}
      {showEffects && showDetailedInfo && skill.isUnlocked && (
        <div style={{ marginBottom: '8px' }}>
          <div
            style={{
              fontSize: '10px',
              fontWeight: 'bold',
              color: colors.text.secondary,
              marginBottom: '2px',
            }}
          >
            Effects:
          </div>
          <div style={{ fontSize: '10px', color: colors.text.primary }}>
            {/* This would be populated with actual skill effects */}
            {skill.level > 0 && (
              <div>
                • Skill level bonus: +{skill.level * 10}%
                {skill.isActive && <div>• Currently active skill</div>}
                {skill.level === skill.maxLevel && (
                  <div style={{ color: colors.text.warning }}>• Maximum potential reached!</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Status hints */}
      {!skill.isUnlocked && (
        <div
          style={{
            fontSize: '10px',
            color: colors.text.error,
            fontStyle: 'italic',
            marginTop: '4px',
          }}
        >
          Complete prerequisites to unlock this skill
        </div>
      )}

      {skill.isUnlocked && skill.level < skill.maxLevel && !skill.isActive && (
        <div
          style={{
            fontSize: '10px',
            color: colors.text.accent,
            fontStyle: 'italic',
            marginTop: '4px',
          }}
        >
          Click to set as active skill
        </div>
      )}

      {/* Tooltip arrow */}
      <div
        style={{
          position: 'absolute',
          top: '-6px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 0,
          height: 0,
          borderLeft: '6px solid transparent',
          borderRight: '6px solid transparent',
          borderBottom: `6px solid ${colors.background}`,
        }}
      />
    </div>
  );
};

export default SkillTooltip;