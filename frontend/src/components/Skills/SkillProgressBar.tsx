import React from 'react';
import type { SkillNode as SkillNodeType } from './SkillTreeVisualization';

export interface SkillProgressBarProps {
  skill: SkillNodeType;
  width?: number;
  height?: number;
  theme?: 'light' | 'dark';
  showLabel?: boolean;
  showPercentage?: boolean;
  showExperience?: boolean;
  orientation?: 'horizontal' | 'vertical';
  animated?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const SkillProgressBar: React.FC<SkillProgressBarProps> = ({
  skill,
  width = 200,
  height = 20,
  theme = 'light',
  showLabel = true,
  showPercentage = true,
  showExperience = false,
  orientation = 'horizontal',
  animated = true,
  className,
  style,
}) => {
  // Color schemes for themes
  const colors = React.useMemo(() => {
    const base = {
      light: {
        background: '#E0E0E0',
        progress: {
          unlocked: '#4CAF50',
          active: '#2196F3',
          maxLevel: '#FF9800',
          locked: '#BDBDBD',
        },
        text: '#333333',
        label: '#666666',
        border: '#CCCCCC',
      },
      dark: {
        background: '#424242',
        progress: {
          unlocked: '#66BB6A',
          active: '#42A5F5',
          maxLevel: '#FFB74D',
          locked: '#616161',
        },
        text: '#FFFFFF',
        label: '#CCCCCC',
        border: '#666666',
      },
    };
    return base[theme];
  }, [theme]);

  // Calculate progress values
  const progressData = React.useMemo(() => {
    if (!skill.isUnlocked) {
      return {
        percentage: 0,
        progressColor: colors.progress.locked,
        isMaxLevel: false,
        displayText: 'Locked',
      };
    }

    if (skill.level >= skill.maxLevel) {
      return {
        percentage: 100,
        progressColor: colors.progress.maxLevel,
        isMaxLevel: true,
        displayText: 'Max Level',
      };
    }

    const totalExp = skill.experience + skill.experienceToNext;
    const percentage = totalExp > 0 ? (skill.experience / totalExp) * 100 : 0;

    return {
      percentage,
      progressColor: skill.isActive ? colors.progress.active : colors.progress.unlocked,
      isMaxLevel: false,
      displayText: `${skill.experience}/${totalExp} XP`,
    };
  }, [skill, colors]);

  // Determine dimensions based on orientation
  const isVertical = orientation === 'vertical';
  const barWidth = isVertical ? height : width;
  const barHeight = isVertical ? width : height;
  const progressLength = (barWidth - 4) * (progressData.percentage / 100);

  // Animation styles
  const progressStyles: React.CSSProperties = {
    width: isVertical ? barHeight - 4 : progressLength,
    height: isVertical ? progressLength : barHeight - 4,
    backgroundColor: progressData.progressColor,
    transition: animated ? 'all 0.3s ease-in-out' : 'none',
    borderRadius: '2px',
    position: 'relative',
    overflow: 'hidden',
  };

  // Add shimmer effect for active skills
  if (animated && skill.isActive && !progressData.isMaxLevel) {
    progressStyles.backgroundImage = `linear-gradient(
      90deg,
      transparent 0%,
      rgba(255, 255, 255, 0.3) 50%,
      transparent 100%
    )`;
    progressStyles.backgroundSize = '200% 100%';
    progressStyles.animation = 'shimmer 2s infinite';
  }

  // Container styles
  const containerStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: isVertical ? 'column' : 'row',
    alignItems: 'center',
    gap: '8px',
    ...style,
  };

  // Progress bar container styles
  const barContainerStyles: React.CSSProperties = {
    width: barWidth,
    height: barHeight,
    backgroundColor: colors.background,
    border: `1px solid ${colors.border}`,
    borderRadius: '4px',
    padding: '1px',
    position: 'relative',
    overflow: 'hidden',
  };

  return (
    <div className={`skill-progress-bar ${className || ''}`} style={containerStyles}>
      {/* Skill label */}
      {showLabel && (
        <div
          style={{
            fontSize: '12px',
            fontWeight: 'bold',
            color: colors.text,
            minWidth: isVertical ? 'auto' : '80px',
            textAlign: isVertical ? 'center' : 'left',
          }}
        >
          {skill.name}
        </div>
      )}

      {/* Progress bar */}
      <div style={barContainerStyles}>
        <div style={progressStyles}>
          {/* Glow effect for max level */}
          {progressData.isMaxLevel && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'linear-gradient(45deg, transparent 30%, rgba(255, 255, 255, 0.4) 50%, transparent 70%)',
                animation: animated ? 'glow 1.5s ease-in-out infinite alternate' : 'none',
              }}
            />
          )}
        </div>
        
        {/* Level indicator */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: '10px',
            fontWeight: 'bold',
            color: colors.text,
            textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
            pointerEvents: 'none',
          }}
        >
          {skill.level}/{skill.maxLevel}
        </div>
      </div>

      {/* Percentage display */}
      {showPercentage && (
        <div
          style={{
            fontSize: '11px',
            color: colors.label,
            minWidth: isVertical ? 'auto' : '40px',
            textAlign: 'center',
          }}
        >
          {Math.round(progressData.percentage)}%
        </div>
      )}

      {/* Experience display */}
      {showExperience && (
        <div
          style={{
            fontSize: '10px',
            color: colors.label,
            textAlign: 'center',
          }}
        >
          {progressData.displayText}
        </div>
      )}

      {/* Achievement milestones */}
      {skill.isUnlocked && !progressData.isMaxLevel && (
        <div
          style={{
            position: 'absolute',
            top: isVertical ? '50%' : 0,
            left: isVertical ? 0 : '50%',
            transform: isVertical ? 'translateY(-50%)' : 'translateX(-50%)',
            [isVertical ? 'height' : 'width']: '100%',
            display: 'flex',
            flexDirection: isVertical ? 'column' : 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            pointerEvents: 'none',
          }}
        >
          {/* Milestone markers */}
          {[0.25, 0.5, 0.75].map((milestone, index) => {
            const position = milestone * 100;
            const isPassed = progressData.percentage >= position;
            
            return (
              <div
                key={index}
                style={{
                  position: 'absolute',
                  [isVertical ? 'top' : 'left']: `${position}%`,
                  transform: isVertical ? 'translateY(-50%)' : 'translateX(-50%)',
                  width: '2px',
                  height: isVertical ? '4px' : barHeight,
                  backgroundColor: isPassed ? colors.progress.unlocked : colors.border,
                  opacity: isPassed ? 0.8 : 0.4,
                  transition: animated ? 'all 0.3s ease' : 'none',
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

// CSS animations (should be added to global styles)
export const skillProgressBarStyles = `
  @keyframes shimmer {
    0% {
      background-position: -200% 0;
    }
    100% {
      background-position: 200% 0;
    }
  }
  
  @keyframes glow {
    0% {
      opacity: 0.6;
    }
    100% {
      opacity: 1;
    }
  }
  
  .skill-progress-bar {
    position: relative;
  }
`;

export default SkillProgressBar;