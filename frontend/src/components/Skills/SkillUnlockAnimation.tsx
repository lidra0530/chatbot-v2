import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import type { SkillNode as SkillNodeType } from './SkillTreeVisualization';

export interface SkillUnlockAnimationProps {
  skill: SkillNodeType;
  trigger: boolean;
  onComplete?: () => void;
  width?: number;
  height?: number;
  theme?: 'light' | 'dark';
  duration?: number;
  className?: string;
}

export const SkillUnlockAnimation: React.FC<SkillUnlockAnimationProps> = ({
  skill,
  trigger,
  onComplete,
  width = 300,
  height = 200,
  theme = 'light',
  duration = 2000,
  className,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Color schemes for themes
  const colors = React.useMemo(() => {
    const base = {
      light: {
        background: 'rgba(255, 255, 255, 0.95)',
        particle: '#FFD700',
        glow: '#4CAF50',
        text: '#333333',
        accent: '#2196F3',
        success: '#4CAF50',
      },
      dark: {
        background: 'rgba(26, 26, 26, 0.95)',
        particle: '#FFD700',
        glow: '#66BB6A',
        text: '#FFFFFF',
        accent: '#42A5F5',
        success: '#66BB6A',
      },
    };
    return base[theme];
  }, [theme]);

  // Particle data for explosion effect
  const generateParticles = (count: number) => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      angle: (i / count) * 2 * Math.PI,
      speed: 50 + Math.random() * 100,
      size: 2 + Math.random() * 4,
      life: 1,
      color: Math.random() > 0.5 ? colors.particle : colors.glow,
    }));
  };

  // Animation effect
  useEffect(() => {
    if (!trigger || !svgRef.current || isAnimating) return;

    setIsAnimating(true);
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const centerX = width / 2;
    const centerY = height / 2;

    // Create main group
    const g = svg.append('g').attr('class', 'unlock-animation');

    // Background overlay
    const background = g.append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', colors.background)
      .attr('opacity', 0);

    // Skill icon container
    const iconGroup = g.append('g')
      .attr('class', 'skill-icon')
      .attr('transform', `translate(${centerX}, ${centerY})`);

    // Main skill circle
    const skillCircle = iconGroup.append('circle')
      .attr('r', 0)
      .attr('fill', colors.success)
      .attr('stroke', colors.glow)
      .attr('stroke-width', 3)
      .attr('opacity', 0);

    // Glow effect
    const glowCircle = iconGroup.append('circle')
      .attr('r', 0)
      .attr('fill', 'none')
      .attr('stroke', colors.glow)
      .attr('stroke-width', 2)
      .attr('opacity', 0);

    // Skill level text
    const levelText = iconGroup.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', 4)
      .attr('fill', colors.text)
      .attr('font-size', '16px')
      .attr('font-weight', 'bold')
      .attr('opacity', 0)
      .text(skill.level.toString());

    // Skill name
    const nameText = g.append('text')
      .attr('x', centerX)
      .attr('y', centerY + 50)
      .attr('text-anchor', 'middle')
      .attr('fill', colors.text)
      .attr('font-size', '18px')
      .attr('font-weight', 'bold')
      .attr('opacity', 0)
      .text(`${skill.name} Unlocked!`);

    // Create particles
    const particles = generateParticles(20);
    const particleGroup = g.append('g').attr('class', 'particles');

    const particleElements = particleGroup.selectAll('.particle')
      .data(particles)
      .enter()
      .append('circle')
      .attr('class', 'particle')
      .attr('cx', centerX)
      .attr('cy', centerY)
      .attr('r', (d) => d.size)
      .attr('fill', (d) => d.color)
      .attr('opacity', 0);

    // Animation sequence
    const timeline = d3.transition().duration(duration);

    // Phase 1: Background fade in
    background.transition(timeline.transition().duration(200))
      .attr('opacity', 1);

    // Phase 2: Skill circle grows with bounce effect
    skillCircle.transition(timeline.transition().delay(200).duration(600).ease(d3.easeBounce))
      .attr('r', 30)
      .attr('opacity', 1);

    // Phase 3: Glow effect
    glowCircle.transition(timeline.transition().delay(300).duration(400))
      .attr('r', 50)
      .attr('opacity', 0.6)
      .transition()
      .duration(400)
      .attr('r', 80)
      .attr('opacity', 0);

    // Phase 4: Level text appears
    levelText.transition(timeline.transition().delay(500).duration(300))
      .attr('opacity', 1);

    // Phase 5: Name text appears
    nameText.transition(timeline.transition().delay(700).duration(400))
      .attr('opacity', 1);

    // Phase 6: Particle explosion
    particleElements.transition(timeline.transition().delay(800).duration(800))
      .attr('cx', (d) => centerX + Math.cos(d.angle) * d.speed)
      .attr('cy', (d) => centerY + Math.sin(d.angle) * d.speed)
      .attr('opacity', 1)
      .transition()
      .duration(600)
      .attr('opacity', 0)
      .attr('r', 0);

    // Phase 7: Additional glow waves
    const waveCount = 3;
    for (let i = 0; i < waveCount; i++) {
      iconGroup.append('circle')
        .attr('r', 30)
        .attr('fill', 'none')
        .attr('stroke', colors.glow)
        .attr('stroke-width', 2)
        .attr('opacity', 0.8)
        .transition(timeline.transition().delay(900 + i * 200).duration(600))
        .attr('r', 60 + i * 20)
        .attr('opacity', 0)
        .remove();
    }

    // Phase 8: Pulse effect on main circle
    const pulseAnimation = () => {
      skillCircle.transition()
        .duration(800)
        .attr('r', 35)
        .transition()
        .duration(800)
        .attr('r', 30)
        .on('end', () => {
          if (isAnimating) {
            pulseAnimation();
          }
        });
    };

    setTimeout(() => {
      pulseAnimation();
    }, 1200);

    // Phase 9: Fade out
    setTimeout(() => {
      g.transition()
        .duration(500)
        .attr('opacity', 0)
        .on('end', () => {
          setIsAnimating(false);
          if (onComplete) {
            onComplete();
          }
        });
    }, duration - 500);

    // Cleanup function
    return () => {
      setIsAnimating(false);
      svg.selectAll('*').remove();
    };
  }, [trigger, colors, width, height, duration, skill, isAnimating, onComplete]);

  if (!trigger && !isAnimating) {
    return null;
  }

  return (
    <div
      className={`skill-unlock-animation ${className || ''}`}
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 10000,
        pointerEvents: 'none',
      }}
    >
      <svg
        ref={svgRef}
        width={width}
        height={height}
        style={{
          overflow: 'visible',
          filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.3))',
        }}
      />
    </div>
  );
};

// Level up animation component
export interface SkillLevelUpAnimationProps {
  skill: SkillNodeType;
  trigger: boolean;
  onComplete?: () => void;
  theme?: 'light' | 'dark';
  duration?: number;
}

export const SkillLevelUpAnimation: React.FC<SkillLevelUpAnimationProps> = ({
  skill,
  trigger,
  onComplete,
  theme = 'light',
  duration = 1500,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    if (trigger) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        if (onComplete) {
          onComplete();
        }
      }, duration);
      
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [trigger, duration, onComplete]);

  if (!isVisible) return null;

  const colors = theme === 'dark' 
    ? { text: '#FFFFFF', glow: '#66BB6A', background: 'rgba(26, 26, 26, 0.9)' }
    : { text: '#333333', glow: '#4CAF50', background: 'rgba(255, 255, 255, 0.9)' };

  return (
    <div
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 10000,
        pointerEvents: 'none',
        background: colors.background,
        padding: '20px 30px',
        borderRadius: '10px',
        textAlign: 'center',
        boxShadow: `0 0 20px ${colors.glow}`,
        animation: isVisible ? 'levelUpBounce 1.5s ease-out' : 'none',
      }}
    >
      <div
        style={{
          fontSize: '24px',
          fontWeight: 'bold',
          color: colors.glow,
          marginBottom: '8px',
          textShadow: `0 0 10px ${colors.glow}`,
        }}
      >
        LEVEL UP!
      </div>
      <div
        style={{
          fontSize: '16px',
          color: colors.text,
          marginBottom: '4px',
        }}
      >
        {skill.name}
      </div>
      <div
        style={{
          fontSize: '20px',
          fontWeight: 'bold',
          color: colors.glow,
        }}
      >
        Level {skill.level}
      </div>
    </div>
  );
};

// CSS animations (should be added to global styles)
export const skillAnimationStyles = `
  @keyframes levelUpBounce {
    0% {
      opacity: 0;
      transform: translate(-50%, -50%) scale(0.5);
    }
    50% {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1.2);
    }
    100% {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1);
    }
  }
  
  @keyframes unlockGlow {
    0% {
      box-shadow: 0 0 5px rgba(76, 175, 80, 0.5);
    }
    50% {
      box-shadow: 0 0 20px rgba(76, 175, 80, 0.8);
    }
    100% {
      box-shadow: 0 0 5px rgba(76, 175, 80, 0.5);
    }
  }
`;

export default SkillUnlockAnimation;