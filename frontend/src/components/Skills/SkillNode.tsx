import React from 'react';
import type { SkillNode as SkillNodeType } from './SkillTreeVisualization';

export interface SkillNodeProps {
  skill: SkillNodeType;
  x: number;
  y: number;
  theme?: 'light' | 'dark';
  isHovered?: boolean;
  isSelected?: boolean;
  onClick?: (skill: SkillNodeType) => void;
  onMouseEnter?: (skill: SkillNodeType) => void;
  onMouseLeave?: () => void;
  scale?: number;
}

export const SkillNode: React.FC<SkillNodeProps> = ({
  skill,
  x,
  y,
  theme = 'light',
  isHovered = false,
  isSelected = false,
  onClick,
  onMouseEnter,
  onMouseLeave,
  scale = 1,
}) => {
  // Color schemes for themes
  const colors = React.useMemo(() => {
    const base = {
      light: {
        node: {
          unlocked: '#4CAF50',
          locked: '#E0E0E0',
          active: '#2196F3',
          maxLevel: '#FF9800',
          hover: '#81C784',
          selected: '#1976D2',
        },
        text: '#333333',
        border: '#666666',
        progress: '#4CAF50',
        progressBg: '#E8F5E8',
      },
      dark: {
        node: {
          unlocked: '#66BB6A',
          locked: '#424242',
          active: '#42A5F5',
          maxLevel: '#FFB74D',
          hover: '#81C784',
          selected: '#1E88E5',
        },
        text: '#FFFFFF',
        border: '#999999',
        progress: '#66BB6A',
        progressBg: '#2E2E2E',
      },
    };
    return base[theme];
  }, [theme]);

  // Calculate node state and colors
  const nodeState = React.useMemo(() => {
    if (!skill.isUnlocked) return 'locked';
    if (skill.isActive) return 'active';
    if (skill.level === skill.maxLevel) return 'maxLevel';
    return 'unlocked';
  }, [skill]);

  const nodeColor = React.useMemo(() => {
    if (isSelected) return colors.node.selected;
    if (isHovered) return colors.node.hover;
    return colors.node[nodeState];
  }, [isSelected, isHovered, nodeState, colors]);

  // Calculate progress for unlocked skills
  const progress = React.useMemo(() => {
    if (!skill.isUnlocked || skill.level >= skill.maxLevel) return 1;
    return skill.experience / (skill.experience + skill.experienceToNext);
  }, [skill]);

  // Node radius based on level and state
  const nodeRadius = React.useMemo(() => {
    const baseRadius = 20;
    const levelBonus = skill.level * 2;
    const stateBonus = skill.isActive ? 5 : 0;
    const hoverBonus = isHovered ? 3 : 0;
    return (baseRadius + levelBonus + stateBonus + hoverBonus) * scale;
  }, [skill.level, skill.isActive, isHovered, scale]);

  // Progress arc path
  const progressArcPath = React.useMemo(() => {
    if (!skill.isUnlocked || skill.level >= skill.maxLevel) return '';
    
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + (2 * Math.PI * progress);
    const innerRadius = nodeRadius + 2;
    const outerRadius = nodeRadius + 5;
    
    const x1 = Math.cos(startAngle) * innerRadius;
    const y1 = Math.sin(startAngle) * innerRadius;
    const x2 = Math.cos(endAngle) * innerRadius;
    const y2 = Math.sin(endAngle) * innerRadius;
    const x3 = Math.cos(endAngle) * outerRadius;
    const y3 = Math.sin(endAngle) * outerRadius;
    const x4 = Math.cos(startAngle) * outerRadius;
    const y4 = Math.sin(startAngle) * outerRadius;
    
    const largeArcFlag = endAngle - startAngle > Math.PI ? 1 : 0;
    
    return `
      M ${x1} ${y1}
      A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 1 ${x2} ${y2}
      L ${x3} ${y3}
      A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 0 ${x4} ${y4}
      Z
    `;
  }, [skill, progress, nodeRadius]);

  // Event handlers
  const handleClick = React.useCallback(() => {
    if (onClick) {
      onClick(skill);
    }
  }, [onClick, skill]);

  const handleMouseEnter = React.useCallback(() => {
    if (onMouseEnter) {
      onMouseEnter(skill);
    }
  }, [onMouseEnter, skill]);

  const handleMouseLeave = React.useCallback(() => {
    if (onMouseLeave) {
      onMouseLeave();
    }
  }, [onMouseLeave]);

  return (
    <g
      className={`skill-node skill-node--${nodeState} ${isHovered ? 'skill-node--hovered' : ''} ${isSelected ? 'skill-node--selected' : ''}`}
      transform={`translate(${x}, ${y})`}
      style={{ cursor: 'pointer' }}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Background circle for progress */}
      {skill.isUnlocked && skill.level < skill.maxLevel && (
        <circle
          r={nodeRadius + 5}
          fill={colors.progressBg}
          stroke="none"
          opacity={0.3}
        />
      )}
      
      {/* Progress arc */}
      {skill.isUnlocked && skill.level < skill.maxLevel && progress > 0 && (
        <path
          d={progressArcPath}
          fill={colors.progress}
          opacity={0.8}
        />
      )}
      
      {/* Main node circle */}
      <circle
        r={nodeRadius}
        fill={nodeColor}
        stroke={colors.border}
        strokeWidth={isSelected ? 3 : 2}
        opacity={skill.isUnlocked ? 1 : 0.5}
        style={{
          filter: isHovered ? 'brightness(1.1)' : 'none',
          transition: 'all 0.2s ease',
        }}
      />
      
      {/* Level indicator */}
      {skill.level > 0 && (
        <text
          dy={4}
          textAnchor="middle"
          fill={colors.text}
          fontSize={`${12 * scale}px`}
          fontWeight="bold"
          style={{ pointerEvents: 'none' }}
        >
          {skill.level}
        </text>
      )}
      
      {/* Lock icon for locked skills */}
      {!skill.isUnlocked && (
        <g>
          <rect
            x={-6 * scale}
            y={-2 * scale}
            width={12 * scale}
            height={8 * scale}
            fill="none"
            stroke={colors.text}
            strokeWidth={1.5 * scale}
            rx={2 * scale}
          />
          <circle
            cy={-6 * scale}
            r={4 * scale}
            fill="none"
            stroke={colors.text}
            strokeWidth={1.5 * scale}
          />
        </g>
      )}
      
      {/* Active indicator */}
      {skill.isActive && (
        <circle
          r={nodeRadius + 8}
          fill="none"
          stroke={colors.node.active}
          strokeWidth={2}
          opacity={0.6}
          style={{
            animation: 'pulse 2s infinite',
          }}
        />
      )}
      
      {/* Skill name */}
      <text
        dy={nodeRadius + 15}
        textAnchor="middle"
        fill={colors.text}
        fontSize={`${8 * scale}px`}
        style={{ pointerEvents: 'none' }}
      >
        {skill.name}
      </text>
      
      {/* Max level indicator */}
      {skill.level === skill.maxLevel && skill.maxLevel > 0 && (
        <circle
          r={nodeRadius + 3}
          fill="none"
          stroke={colors.node.maxLevel}
          strokeWidth={2}
          opacity={0.8}
        />
      )}
      
      {/* Selection ring */}
      {isSelected && (
        <circle
          r={nodeRadius + 6}
          fill="none"
          stroke={colors.node.selected}
          strokeWidth={3}
          opacity={0.8}
          strokeDasharray="5,5"
          style={{
            animation: 'rotate 3s linear infinite',
          }}
        />
      )}
    </g>
  );
};

// CSS animations (should be added to global styles)
export const skillNodeStyles = `
  @keyframes pulse {
    0% {
      opacity: 0.6;
      transform: scale(1);
    }
    50% {
      opacity: 0.3;
      transform: scale(1.1);
    }
    100% {
      opacity: 0.6;
      transform: scale(1);
    }
  }
  
  @keyframes rotate {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
  
  .skill-node {
    transition: all 0.2s ease;
  }
  
  .skill-node--hovered {
    filter: brightness(1.1);
  }
  
  .skill-node--selected {
    filter: drop-shadow(0 0 8px rgba(33, 150, 243, 0.6));
  }
  
  .skill-node--locked {
    opacity: 0.6;
  }
`;

export default SkillNode;